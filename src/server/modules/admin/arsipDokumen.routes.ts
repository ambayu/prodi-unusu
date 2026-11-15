import { Router, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { requireTenant } from '../../middlewares/tenantResolver.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { dokumenPasswordSchema } from '../../../shared/schemas/content.js';
import {
  ambilArsipProdi,
  ambilBerkasArsip,
  ambilArsipDokumen,
  isAllowedFileUrl,
  isInlineDataUri,
  parseInlineDataUri,
  resolveProdiCode,
  type ArsipDokumen,
  type ArsipSumber,
} from '../../services/arsipDokumenService.js';
import {
  getDocumentPasswordHash,
  getDocumentPasswordStatus,
  setDocumentPassword,
  verifyDocumentPassword,
} from '../../services/dokumenPasswordService.js';

const router = Router();

const arsipQuerySchema = z.object({
  sumber: z.enum(['lpm', 'lppm']).optional(),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
  tahun: z.coerce.number().int().min(1990).max(2100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

/**
 * Skema pembuka kunci arsip publik.
 *
 * Pesan galat sengaja tidak menyebut apakah kata sandi "hampir benar": hanya
 * benar atau salah. `min(1)` dipakai agar pengguna mendapat pesan yang jelas,
 * bukan galat validasi teknis.
 */
const unlockSchema = z.object({
  password: z.string().min(1, 'Masukkan kata sandi dokumen terlebih dahulu.'),
});

/** Header tempat kata sandi arsip dikirim (tidak pernah lewat URL). */
const PASSWORD_HEADER = 'x-arsip-password';

/** Kata sandi aktif bila prodi sudah memasangnya. Selama kosong -> fail-closed. */
async function assertArsipPassword(studyProgramId: number, req: { header: (name: string) => string | undefined }) {
  const stored = await getDocumentPasswordHash(studyProgramId);
  const submitted = req.header(PASSWORD_HEADER) ?? '';

  if (!submitted) {
    throw AppError.forbidden('Kata sandi dokumen diperlukan untuk membuka arsip ini.', 'ARSIP_PASSWORD_REQUIRED');
  }

  /*
   * Prodi yang belum memasang kata sandi tidak memiliki kata sandi yang benar,
   * sehingga SEMUA percobaan ditolak sebagai "kata sandi salah". Sengaja tidak
   * dibedakan agar klien tidak dapat menyimpulkan status kunci prodi, dan agar
   * prodi yang lupa memasang kunci tidak pernah terbuka secara diam-diam.
   */
  if (!stored || !verifyDocumentPassword(submitted, stored)) {
    throw AppError.forbidden('Kata sandi dokumen salah.', 'ARSIP_PASSWORD_INVALID');
  }
}

/**
 * Menyusun metadata untuk klien.
 *
 * Field internal arsip (tujuan publikasi, keterangan, cap waktu) sengaja tidak
 * dikirim agar halaman publik hanya menerima informasi yang memang untuk
 * pengunjung.
 */
function toPublicDokumen(item: ArsipDokumen) {
  return {
    id: item.id,
    sumber: item.sumber,
    judul: item.judul,
    nomor: item.nomor,
    kategori: item.kategori,
    tahun: item.tahun,
    status: item.status,
    prodiCode: item.prodiCode,
    fileTersedia: Boolean(item.fileUrl),
    mimeType: item.mimeType,
  };
}

/**
 * Memeriksa apakah arsip memiliki berkas yang dapat disajikan.
 *
 * Dua bentuk didukung: URL pada host yang diizinkan, dan data URI base64 yang
 * memang tersimpan di dalam arsip.
 */
function hasFile(item: ArsipDokumen): boolean {
  return isAllowedFileUrl(item.fileUrl) || isInlineDataUri(item.fileUrl);
}

/** Meneruskan berkas arsip sebagai respons, inline untuk pratinjau atau unduhan. */
async function streamBerkas(res: Response, item: ArsipDokumen, download: boolean) {
  const safeName = `${item.judul.replace(/[^A-Za-z0-9 _.-]/g, '').slice(0, 80) || 'dokumen'}.pdf`;
  const disposition = download ? 'attachment' : 'inline';

  let buffer: Buffer;
  let contentType: string;

  if (isInlineDataUri(item.fileUrl)) {
    // Berkas tersimpan di dalam arsip: tidak ada permintaan jaringan keluar.
    const inline = parseInlineDataUri(item.fileUrl);
    buffer = inline.buffer;
    contentType = inline.mimeType;
  } else if (isAllowedFileUrl(item.fileUrl)) {
    const upstream = await ambilBerkasArsip(item.fileUrl);
    contentType = upstream.headers.get('content-type') ?? 'application/pdf';
    buffer = Buffer.from(await upstream.arrayBuffer());
  } else {
    // Tidak ada berkas yang dapat disajikan; menolak lebih baik daripada
    // mengirim respons kosong yang tampak seperti PDF rusak.
    throw AppError.notFound('Berkas PDF dokumen ini tidak tersedia pada arsip.');
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(buffer.length));
  // PDF di-embed pada halaman aplikasi ini saja; mencegah pembingkaian pihak lain.
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.end(buffer);
}

/** Mencari satu dokumen arsip milik prodi berdasarkan ID, lintas sumber LPM/LPPM. */
async function findArsipDokumen(
  prodiCode: string,
  id: number,
  sumber?: ArsipSumber,
): Promise<{ item: ArsipDokumen; sumber: ArsipSumber } | null> {
  const daftarSumber: ArsipSumber[] = sumber ? [sumber] : ['lpm', 'lppm'];

  for (const asal of daftarSumber) {
    const items = await ambilArsipDokumen({ sumber: asal, prodiCode, take: 100 });
    const found = items.find((item) => item.id === id);
    if (found) return { item: found, sumber: asal };
  }

  return null;
}

// -------------------------------------------------------------
// Admin prodi
// -------------------------------------------------------------

/** GET /api/v1/admin/arsip-dokumen: arsip dokumen mutu milik prodi aktif. */
router.get(
  '/arsip-dokumen',
  requirePermission('documents.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { prodiCode, nama } = await resolveProdiCode(studyProgramId);
    const query = arsipQuerySchema.parse(req.query);

    const password = await getDocumentPasswordStatus(studyProgramId);
    const { items, sumberGagal } = await ambilArsipProdi({
      prodiCode,
      search: query.search,
      status: query.status,
      tahun: query.tahun,
      take: 100,
    });

    res.json({
      success: true,
      items,
      meta: {
        prodiCode,
        prodiName: nama,
        total: items.length,
        sumberGagal,
        passwordActive: password.passwordActive,
        passwordSetAt: password.setAt,
      },
    });
  }),
);

/** GET /api/v1/admin/arsip-dokumen/:id/file: pratinjau/unduh untuk admin prodi. */
router.get(
  '/arsip-dokumen/:id/file',
  requirePermission('documents.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { prodiCode } = await resolveProdiCode(studyProgramId);
    const { id } = idParamSchema.parse(req.params);

    const found = await findArsipDokumen(prodiCode, id);
    if (!found || !isAllowedFileUrl(found.item.fileUrl)) {
      throw AppError.notFound('Dokumen arsip tidak ditemukan pada prodi ini.');
    }

    await streamBerkas(res, found.item, req.query.download === '1');
  }),
);

/** GET /api/v1/admin/dokumen-password: status kata sandi arsip prodi. */
router.get(
  '/dokumen-password',
  requirePermission('documents.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const status = await getDocumentPasswordStatus(studyProgramId);
    res.json({ success: true, ...status });
  }),
);

/** PUT /api/v1/admin/dokumen-password: memasang atau mengganti kata sandi arsip. */
router.put(
  '/dokumen-password',
  requirePermission('documents.view'),
  validate({ body: dokumenPasswordSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { password } = getBody<{ password: string }>(req);

    const status = await setDocumentPassword(studyProgramId, password);

    // Nilai kata sandi tidak pernah ditulis ke audit.
    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'DOCUMENTS',
      targetType: 'document_password',
      targetId: studyProgramId,
    });

    res.json({
      success: true,
      message: 'Kata sandi arsip dokumen berhasil disimpan.',
      ...status,
    });
  }),
);

// -------------------------------------------------------------
// Publik (tanpa login, terikat tenant dari hostname)
// -------------------------------------------------------------

/**
 * GET /api/v1/public/arsip-dokumen: daftar arsip prodi untuk pengunjung.
 *
 * Daftar dokumen TERBUKA untuk publik -- siapa pun boleh melihat judul,
 * kategori, tahun, dan nomor dokumen tanpa kata sandi. Yang dilindungi kata
 * sandi adalah ISI BERKAS: `fileUrl` sengaja tidak ikut dikirim, dan pratinjau
 * maupun unduhan tetap mewajibkan kata sandi prodi.
 *
 * Memisahkan "daftar terbuka" dari "berkas terlindungi" membuat arsip mudah
 * ditemukan (pengunjung tahu dokumen apa yang tersedia) tanpa membocorkan isi
 * dokumen yang belum layak dibaca umum.
 */
router.get(
  '/public/arsip-dokumen',
  requireTenant,
  asyncHandler(async (req, res) => {
    const studyProgramId = req.tenant!.id;
    const { prodiCode, nama } = await resolveProdiCode(studyProgramId);
    const password = await getDocumentPasswordStatus(studyProgramId);
    const query = arsipQuerySchema.parse(req.query);

    const { items, sumberGagal } = await ambilArsipProdi({
      prodiCode,
      search: query.search,
      status: query.status,
      tahun: query.tahun,
      take: 200,
    });

    res.json({
      success: true,
      items: items.map(toPublicDokumen),
      meta: {
        prodiCode,
        prodiName: nama,
        total: items.length,
        sumberGagal,
        passwordActive: password.passwordActive,
        // Kata sandi tetap diperlukan untuk membuka berkas, bukan untuk daftar.
        terkunci: password.passwordActive,
      },
    });
  }),
);

/**
 * POST /api/v1/public/arsip-dokumen/unlock
 *
 * Memeriksa kata sandi prodi. Tidak menerbitkan sesi apa pun: kata sandi
 * berlaku kapan saja, tanpa batas waktu dan tanpa batas percobaan, lalu
 * dikirim ulang pada setiap permintaan pratinjau/unduh.
 *
 * Bila prodi belum memasang kata sandi, TIDAK ADA kata sandi yang benar,
 * sehingga setiap percobaan ditolak dengan `ARSIP_PASSWORD_INVALID` -- sama
 * seperti kata sandi salah. Ini mencegah prodi yang lupa memasang kunci
 * menjadi terbuka secara diam-diam.
 */
router.post(
  '/public/arsip-dokumen/unlock',
  requireTenant,
  validate({ body: unlockSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = req.tenant!.id;
    const stored = await getDocumentPasswordHash(studyProgramId);
    const body = getBody<{ password: string }>(req);
    const password = body.password;

    if (!password) {
      throw AppError.badRequest('Masukkan kata sandi dokumen terlebih dahulu.', 'ARSIP_PASSWORD_REQUIRED');
    }

    // `stored` kosong berarti belum ada kata sandi sah sama sekali.
    if (!stored || !verifyDocumentPassword(password, stored)) {
      throw AppError.forbidden('Kata sandi dokumen salah.', 'ARSIP_PASSWORD_INVALID');
    }

    const { prodiCode } = await resolveProdiCode(studyProgramId);

    res.json({
      success: true,
      valid: true,
      meta: { prodiCode, passwordActive: true, terkunci: false },
    });
  }),
);

/** POST /api/v1/public/arsip-dokumen/:id/preview: pratinjau PDF di halaman. */
router.post(
  '/public/arsip-dokumen/:id/preview',
  requireTenant,
  asyncHandler(async (req, res) => {
    const studyProgramId = req.tenant!.id;
    await assertArsipPassword(studyProgramId, req);

    const { prodiCode } = await resolveProdiCode(studyProgramId);
    // Parameter dibaca langsung dari skema: `getParams()` hanya terisi bila
    // rute memasang `validate({ params })`, dan rute ini cukup memerlukan id.
    const { id } = idParamSchema.parse(req.params);
    const found = await findArsipDokumen(prodiCode, id);

    if (!found || !isAllowedFileUrl(found.item.fileUrl)) {
      throw AppError.notFound('Dokumen arsip tidak ditemukan pada prodi ini.');
    }

    await streamBerkas(res, found.item, false);
  }),
);

/** POST /api/v1/public/arsip-dokumen/:id/download: unduh berkas arsip. */
router.post(
  '/public/arsip-dokumen/:id/download',
  requireTenant,
  asyncHandler(async (req, res) => {
    const studyProgramId = req.tenant!.id;
    await assertArsipPassword(studyProgramId, req);

    const { prodiCode } = await resolveProdiCode(studyProgramId);
    const { id } = idParamSchema.parse(req.params);
    const found = await findArsipDokumen(prodiCode, id);

    if (!found || !isAllowedFileUrl(found.item.fileUrl)) {
      throw AppError.notFound('Dokumen arsip tidak ditemukan pada prodi ini.');
    }

    await streamBerkas(res, found.item, true);
  }),
);

export default router;
