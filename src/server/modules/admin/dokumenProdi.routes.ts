import { Router, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../prisma.js';
import { config } from '../../config/index.js';
import { asyncHandler, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId, resolveContentOwner } from '../../middlewares/tenantScope.js';
import { requireTenant } from '../../middlewares/tenantResolver.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { dokumenProdiSchema } from '../../../shared/schemas/content.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import { assertArsipPassword } from './arsipDokumen.routes.js';

/**
 * Dokumen buatan prodi sendiri (bank dokumen / arsip surat).
 *
 * Terpisah dari dokumen kiriman pusat (`arsipDokumen.routes.ts`) yang hanya
 * dapat dibaca. Hanya dokumen di sini yang dapat ditambah, diubah, dan dihapus.
 *
 * Status Publish = `is_public` true: tampil di halaman publik dan landing.
 * Draft = hanya terlihat di panel admin. Berkas tetap dilindungi kata sandi
 * arsip prodi bagi pengunjung publik (ADR-002 bagian 3).
 */

const DIR = path.join(process.cwd(), config.upload.dir, 'documents');

// shortcut: hanya PDF agar pratinjau dan unduhan konsisten; tambah Word/Excel
// bila kebutuhan nyata muncul beserta cara pratinjaunya.
const MIME_DIIZINKAN = ['application/pdf'];

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(DIR, { recursive: true });
    cb(null, DIR);
  },
  // Nama acak + ekstensi tetap: nama asli klien tidak pernah menyentuh disk.
  filename(_req, _file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxBytes, files: 1 },
  fileFilter(_req, file, cb) {
    if (!MIME_DIIZINKAN.includes(file.mimetype)) {
      cb(AppError.unprocessable('Berkas dokumen wajib berformat PDF.'));
      return;
    }
    cb(null, true);
  },
});

const berkasPath = (nama: string) => path.join(DIR, path.basename(nama));

/** Kegagalan hapus berkas fisik tidak menggagalkan permintaan. */
function hapusBerkas(nama: string) {
  fs.rm(berkasPath(nama), { force: true }, () => undefined);
}

/**
 * Memvalidasi body multipart. Berkas sudah ditulis multer sebelum validasi,
 * jadi bila gagal berkas itu dibuang agar tidak menjadi yatim di disk.
 */
function parseBody(raw: unknown, file: Express.Multer.File | undefined) {
  const hasil = dokumenProdiSchema.safeParse(raw);
  if (hasil.success) return hasil.data;

  if (file) hapusBerkas(file.filename);
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of hasil.error.issues) {
    const key = issue.path.join('.') || '_';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw AppError.unprocessable('Data yang dikirim tidak valid.', fieldErrors);
}

function kirimBerkas(res: Response, dokumen: { title: string; fileUrl: string }, unduh: boolean) {
  const target = berkasPath(dokumen.fileUrl);
  if (!fs.existsSync(target)) {
    throw AppError.notFound('Berkas dokumen tidak ditemukan.');
  }
  const nama = `${dokumen.title.replace(/[^A-Za-z0-9 _.-]/g, '').slice(0, 80) || 'dokumen'}.pdf`;
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `${unduh ? 'attachment' : 'inline'}; filename="${nama}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.sendFile(target);
}

const dataAdmin = (d: {
  id: number;
  code: string | null;
  title: string;
  category: string;
  description: string | null;
  year: number;
  mimeType: string | null;
  fileSize: number | null;
  isPublic: boolean;
  updatedAt: Date;
}) => ({
  id: d.id,
  nomor: d.code,
  judul: d.title,
  kategori: d.category,
  deskripsi: d.description,
  tahun: d.year,
  mimeType: d.mimeType,
  fileSize: d.fileSize,
  isPublic: d.isPublic,
  status: d.isPublic ? 'Publish' : 'Draft',
  updatedAt: d.updatedAt.toISOString(),
});

const SELECT_ADMIN = {
  id: true,
  code: true,
  title: true,
  category: true,
  description: true,
  year: true,
  mimeType: true,
  fileSize: true,
  isPublic: true,
  updatedAt: true,
} as const;

// -------------------------------------------------------------
// Admin prodi
// -------------------------------------------------------------

const router = Router();

/** GET /api/v1/admin/dokumen-prodi: seluruh dokumen milik prodi/fakultas aktif (Publish & Draft). */
router.get(
  '/dokumen-prodi',
  requirePermission('documents.view'),
  asyncHandler(async (req, res) => {
    const owner = await resolveContentOwner(req);
    const rows = await prisma.document.findMany({
      where: owner,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      select: SELECT_ADMIN,
    });
    res.json({ success: true, items: rows.map(dataAdmin) });
  }),
);

/** GET /api/v1/admin/dokumen-prodi/:id/file: pratinjau/unduh lewat sesi admin. */
router.get(
  '/dokumen-prodi/:id/file',
  requirePermission('documents.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const owner = await resolveContentOwner(req);
    const { id } = getParams<{ id: number }>(req);
    const dokumen = await prisma.document.findFirst({
      where: { id, ...owner },
      select: { title: true, fileUrl: true },
    });
    if (!dokumen) throw AppError.notFound('Dokumen tidak ditemukan pada unit ini.');
    kirimBerkas(res, dokumen, req.query.download === '1');
  }),
);

/** POST /api/v1/admin/dokumen-prodi: menambah dokumen beserta berkas PDF. */
router.post(
  '/dokumen-prodi',
  requirePermission('documents.create'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const owner = await resolveContentOwner(req);
    const file = req.file;
    const body = parseBody(req.body, file);
    if (!file) throw AppError.badRequest('Berkas dokumen belum dipilih.', 'FILE_REQUIRED');

    const dokumen = await prisma.document.create({
      data: {
        ...owner,
        title: body.title,
        code: body.code || null,
        category: body.category,
        year: body.year,
        description: body.description || null,
        isPublic: body.isPublic,
        fileUrl: file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      select: SELECT_ADMIN,
    });

    await recordAudit({ req, action: 'CREATE', module: 'DOCUMENTS', targetType: 'document', targetId: dokumen.id });
    res.status(201).json({ success: true, message: 'Dokumen berhasil ditambahkan.', item: dataAdmin(dokumen) });
  }),
);

/** PUT /api/v1/admin/dokumen-prodi/:id: mengubah data; berkas opsional (mengganti yang lama). */
router.put(
  '/dokumen-prodi/:id',
  requirePermission('documents.update'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const owner = await resolveContentOwner(req);
    const file = req.file;
    const id = Number(req.params.id);

    const lama = Number.isInteger(id) && id > 0
      ? await prisma.document.findFirst({ where: { id, ...owner }, select: { fileUrl: true } })
      : null;
    if (!lama) {
      if (file) hapusBerkas(file.filename);
      throw AppError.notFound('Dokumen tidak ditemukan pada unit ini.');
    }

    const body = parseBody(req.body, file);
    const dokumen = await prisma.document.update({
      where: { id },
      data: {
        title: body.title,
        code: body.code || null,
        category: body.category,
        year: body.year,
        description: body.description || null,
        isPublic: body.isPublic,
        ...(file ? { fileUrl: file.filename, fileSize: file.size, mimeType: file.mimetype } : {}),
      },
      select: SELECT_ADMIN,
    });
    if (file) hapusBerkas(lama.fileUrl);

    await recordAudit({ req, action: 'UPDATE', module: 'DOCUMENTS', targetType: 'document', targetId: id });
    res.json({ success: true, message: 'Dokumen berhasil diperbarui.', item: dataAdmin(dokumen) });
  }),
);

/** DELETE /api/v1/admin/dokumen-prodi/:id: menghapus dokumen beserta berkas fisiknya. */
router.delete(
  '/dokumen-prodi/:id',
  requirePermission('documents.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const owner = await resolveContentOwner(req);
    const { id } = getParams<{ id: number }>(req);

    const dokumen = await prisma.document.findFirst({ where: { id, ...owner }, select: { fileUrl: true } });
    if (!dokumen) throw AppError.notFound('Dokumen tidak ditemukan pada unit ini.');

    await prisma.document.delete({ where: { id } });
    hapusBerkas(dokumen.fileUrl);

    await recordAudit({ req, action: 'DELETE', module: 'DOCUMENTS', targetType: 'document', targetId: id });
    res.json({ success: true, message: 'Dokumen berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Publik (tanpa login, terikat tenant dari hostname)
// -------------------------------------------------------------

/**
 * Router PUBLIK dokumen prodi. Dipasang sebelum `adminRouter` di app.ts.
 *
 * Hanya dokumen berstatus Publish yang pernah dikirim. Seperti arsip pusat,
 * daftar terbuka tetapi isi berkas wajib kata sandi arsip prodi, dan nama
 * berkas di disk tidak pernah dikirim ke klien.
 */
export const publicDokumenProdiRouter = Router();

function tenantScope(tenant: { id: number; tenantType?: string | undefined }) {
  return tenant.tenantType === 'faculty'
    ? { facultyId: tenant.id, studyProgramId: null }
    : { studyProgramId: tenant.id, facultyId: null };
}

publicDokumenProdiRouter.get(
  '/public/dokumen-prodi',
  requireTenant,
  asyncHandler(async (req, res) => {
    const scope = tenantScope(req.tenant!);
    const rows = await prisma.document.findMany({
      where: { ...scope, isPublic: true },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, code: true, title: true, category: true, year: true, mimeType: true },
    });
    res.json({
      success: true,
      items: rows.map((d) => ({
        id: d.id,
        judul: d.title,
        nomor: d.code,
        kategori: d.category,
        tahun: d.year,
        status: 'Publish',
        fileTersedia: true,
        mimeType: d.mimeType,
      })),
    });
  }),
);

for (const [aksi, unduh] of [['preview', false], ['download', true]] as const) {
  publicDokumenProdiRouter.post(
    `/public/dokumen-prodi/:id/${aksi}`,
    requireTenant,
    validate({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const scope = tenantScope(req.tenant!);
      await assertArsipPassword(scope, req);

      const { id } = getParams<{ id: number }>(req);
      const dokumen = await prisma.document.findFirst({
        where: { id, ...scope, isPublic: true },
        select: { title: true, fileUrl: true },
      });
      if (!dokumen) throw AppError.notFound('Dokumen tidak ditemukan pada unit ini.');
      kirimBerkas(res, dokumen, unduh);
    }),
  );
}

export default router;
