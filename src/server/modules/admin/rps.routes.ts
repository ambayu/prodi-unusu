import { Router, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../prisma.js';
import { config } from '../../config/index.js';
import { asyncHandler, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { requireTenant } from '../../middlewares/tenantResolver.js';
import { assertArsipPassword } from './arsipDokumen.routes.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { findCourseInTenant, findCurriculumItemInTenant } from '../../services/curriculumService.js';
import { createRpsSchema } from '../../../shared/schemas/content.js';
import { idParamSchema } from '../../../shared/schemas/common.js';

const router = Router();

/**
 * Penyimpanan berkas RPS.
 *
 * Nama berkas dibuat acak dan ekstensinya dipaksa `.pdf` karena hanya MIME
 * `application/pdf` yang lolos `fileFilter`. Nama asli dari klien tidak pernah
 * dipakai sebagai nama di disk untuk mencegah path traversal.
 *
 * Berkas ditulis ke `uploads/rps` yang **tidak** dilayani `express.static`
 * secara direktori, melainkan lewat rute unduh terautentikasi di bawah ini.
 * RPS ditujukan untuk dibaca mahasiswa, tetapi isinya dilindungi kata sandi
 * program studi — sama seperti arsip dokumen.
 */
const RPS_DIR_SUFFIX = 'rps';

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const target = path.join(process.cwd(), config.upload.dir, RPS_DIR_SUFFIX);
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename(_req, _file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.rpsMaxBytes, files: 1 },
  fileFilter(_req, file, cb) {
    if (!config.upload.rpsAllowedMime.includes(file.mimetype)) {
      cb(AppError.unprocessable('Berkas RPS wajib berformat PDF.'));
      return;
    }
    cb(null, true);
  },
});

/** Menghapus berkas fisik RPS bila ada. Kegagalan hapus tidak menggagalkan request. */
function removeRpsFile(fileUrl: string) {
  const prefix = `/api/v1/admin/rps/file/`;
  if (!fileUrl.startsWith(prefix)) return;
  const filename = path.basename(fileUrl.slice(prefix.length));
  if (!filename.endsWith('.pdf')) return;
  const target = path.join(process.cwd(), config.upload.dir, RPS_DIR_SUFFIX, filename);
  fs.rm(target, { force: true }, () => undefined);
}

/**
 * Pola nama berkas RPS yang sah: timestamp + 16 karakter hex + `.pdf`.
 *
 * Nama dari klien tidak pernah dipakai, sehingga pola inilah satu-satunya
 * bentuk nama yang boleh menyentuh disk.
 */
const RPS_FILENAME_PATTERN = /^[0-9]+-[a-f0-9]{16}\.pdf$/;

/**
 * Mengirim berkas RPS milik satu program studi.
 *
 * Berkas hanya dilayani bila barisnya memang tercatat milik prodi tersebut,
 * baik pada penawaran (`curriculum_rps`) maupun data warisan (`rps_documents`).
 * Berkas asing yang namanya sah dijawab 404 agar keberadaannya di disk tidak
 * dapat dipetakan dari luar.
 */
async function kirimBerkasRps(res: Response, filename: string, studyProgramId: number) {
  if (!RPS_FILENAME_PATTERN.test(filename)) {
    throw AppError.notFound('Berkas RPS tidak ditemukan.');
  }

  const fileUrl = `/api/v1/admin/rps/file/${filename}`;
  const [penawaran, warisan] = await Promise.all([
    prisma.curriculumRps.findFirst({
      where: { fileUrl, curriculumItem: { curriculum: { studyProgramId } } },
      select: { id: true },
    }),
    prisma.rpsDocument.findFirst({
      where: { fileUrl, course: { semester: { curriculum: { studyProgramId } } } },
      select: { id: true },
    }),
  ]);
  if (!penawaran && !warisan) {
    throw AppError.notFound('Berkas RPS tidak ditemukan.');
  }

  const target = path.join(process.cwd(), config.upload.dir, RPS_DIR_SUFFIX, filename);
  if (!fs.existsSync(target)) {
    throw AppError.notFound('Berkas RPS tidak ditemukan.');
  }

  res.type('application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(target);
}

/**
 * Router PUBLIK berkas RPS.
 *
 * Halaman kurikulum publik menautkan berkas RPS milik prodi, sehingga
 * permintaan datang tanpa sesi login. Yang menjaga berkas bukan lagi
 * kerahasiaan nama acaknya, melainkan kata sandi prodi pada header
 * `x-arsip-password` — satu kata sandi per prodi, dan prodi yang belum
 * memasangnya tertutup untuk semua orang (fail-closed).
 */
export const publicRpsFileRouter = Router();

publicRpsFileRouter.get(
  '/public/rps/file/:filename',
  requireTenant,
  asyncHandler(async (req, res) => {
    const studyProgramId = req.tenant!.id;
    await assertArsipPassword(studyProgramId, req);
    await kirimBerkasRps(res, path.basename(String(req.params.filename)), studyProgramId);
  }),
);

/**
 * GET /api/v1/admin/rps/file/:filename
 *
 * Pratinjau berkas RPS dari panel admin. Hak membuka sudah dibuktikan sesi
 * login prodi, sehingga kata sandi tidak perlu diketik ulang; ini tidak
 * melemahkan perlindungan publik karena rute ini tetap tertutup bagi pengunjung.
 */
router.get(
  '/rps/file/:filename',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    await kirimBerkasRps(res, path.basename(String(req.params.filename)), scopedTenantId(req));
  }),
);

/**
 * POST /api/v1/admin/curriculum-items/:itemId/rps
 *
 * Mengunggah RPS untuk satu **penawaran** mata kuliah pada kurikulum.
 * Berbeda dari `/courses/:courseId/rps` yang melayani data warisan, endpoint
 * ini menulis ke `curriculum_rps` sehingga RPS melekat pada penawaran — sesuai
 * ADR-006. Berkas fisik tetap disimpan di direktori yang sama.
 */
router.post(
  '/curriculum-items/:itemId/rps',
  requirePermission('curriculum.update'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw AppError.badRequest('Mata kuliah pada kurikulum tidak valid.');
    }

    const item = await findCurriculumItemInTenant(itemId, studyProgramId);
    if (!item) {
      throw AppError.notFound('Mata kuliah pada kurikulum ini tidak ditemukan.');
    }

    const file = req.file;
    if (!file) {
      throw AppError.badRequest('Berkas RPS belum dipilih.', 'FILE_REQUIRED');
    }

    const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const title = (rawTitle || `RPS ${item.course.name}`).slice(0, 200);
    const fileUrl = `/api/v1/admin/rps/file/${file.filename}`;

    const rps = await prisma.curriculumRps.create({
      data: { curriculumItemId: itemId, title, fileUrl, isPublic: true },
      select: { id: true, title: true, fileUrl: true, revision: true },
    });

    await recordAudit({
      req,
      action: 'UPLOAD',
      module: 'CURRICULUM',
      targetType: 'curriculum_rps',
      targetId: rps.id,
    });

    res.status(201).json({ success: true, message: 'RPS berhasil diunggah.', rps });
  }),
);

/** DELETE /api/v1/admin/curriculum-rps/:id: menghapus RPS penawaran beserta berkas fisiknya. */
router.delete(
  '/curriculum-rps/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.curriculumRps.findFirst({
      where: { id, curriculumItem: { curriculum: { studyProgramId } } },
    });
    if (!existing) {
      throw AppError.notFound('RPS tidak ditemukan pada program studi ini.');
    }

    await prisma.curriculumRps.delete({ where: { id } });
    removeRpsFile(existing.fileUrl);

    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'curriculum_rps', targetId: id });
    res.json({ success: true, message: 'RPS berhasil dihapus.' });
  }),
);


/**
 * POST /api/v1/admin/courses/:courseId/rps
 *
 * Mengunggah berkas RPS untuk satu mata kuliah. Body multipart berisi `file`
 * (wajib) dan `title` (opsional, default nama mata kuliah). Satu mata kuliah
 * boleh memiliki lebih dari satu RPS karena revisi dokumen lazim terjadi.
 */
router.post(
  '/courses/:courseId/rps',
  requirePermission('curriculum.update'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw AppError.badRequest('Mata kuliah tidak valid.');
    }

    const course = await findCourseInTenant(courseId, studyProgramId);
    if (!course) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    const file = req.file;
    if (!file) {
      throw AppError.badRequest('Berkas RPS belum dipilih.', 'FILE_REQUIRED');
    }

    const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const title = (rawTitle || `RPS ${course.name}`).slice(0, 200);
    const fileUrl = `/api/v1/admin/rps/file/${file.filename}`;

    const rps = await prisma.rpsDocument.create({
      data: {
        courseId,
        title,
        fileUrl,
        isPublic: true,
      },
      select: { id: true, title: true, fileUrl: true, revision: true },
    });

    await recordAudit({
      req,
      action: 'UPLOAD',
      module: 'CURRICULUM',
      targetType: 'rps_document',
      targetId: rps.id,
    });

    res.status(201).json({ success: true, message: 'RPS berhasil diunggah.', rps });
  }),
);

/** PUT /api/v1/admin/rps/:id: memperbarui judul atau status publik RPS. */
router.put(
  '/rps/:id',
  requirePermission('curriculum.update'),
  validate({ body: createRpsSchema.partial().omit({ fileUrl: true }), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.rpsDocument.findFirst({
      where: { id, course: { semester: { curriculum: { studyProgramId } } } },
    });
    if (!existing) {
      throw AppError.notFound('RPS tidak ditemukan pada program studi ini.');
    }

    const body = req.validated?.body as { title?: string; revision?: string | null; isPublic?: boolean };
    const rps = await prisma.rpsDocument.update({
      where: { id },
      data: {
        title: body.title,
        revision: body.revision,
        isPublic: body.isPublic,
      },
    });

    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'rps_document', targetId: id });
    res.json({ success: true, message: 'RPS berhasil diperbarui.', rps });
  }),
);

/** DELETE /api/v1/admin/rps/:id: menghapus RPS beserta berkas fisiknya. */
router.delete(
  '/rps/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.rpsDocument.findFirst({
      where: { id, course: { semester: { curriculum: { studyProgramId } } } },
    });
    if (!existing) {
      throw AppError.notFound('RPS tidak ditemukan pada program studi ini.');
    }

    await prisma.rpsDocument.delete({ where: { id } });
    removeRpsFile(existing.fileUrl);

    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'rps_document', targetId: id });
    res.json({ success: true, message: 'RPS berhasil dihapus.' });
  }),
);

export default router;
