import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../prisma.js';
import { config } from '../../config/index.js';
import { asyncHandler, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { idParamSchema } from '../../../shared/schemas/common.js';

const router = Router();

/**
 * Penyimpanan lokal terpusat.
 *
 * Nama file dibuat acak dan ekstensi diturunkan dari MIME yang lolos
 * pemeriksaan, bukan dari nama yang dikirim client. Ini mencegah path
 * traversal dan eksekusi file berbahaya (docs/PRD.md bagian 13 poin 11).
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const target = path.join(process.cwd(), config.upload.dir, 'media');
    fs.mkdirSync(target, { recursive: true });
    cb(null, target);
  },
  filename(_req, file, cb) {
    const extension = EXTENSION_BY_MIME[file.mimetype] ?? '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxBytes, files: 1 },
  fileFilter(_req, file, cb) {
    if (!config.upload.allowedMime.includes(file.mimetype)) {
      cb(AppError.unprocessable(`Tipe file ${file.mimetype} tidak diizinkan.`));
      return;
    }
    cb(null, true);
  },
});

/** GET /api/v1/admin/media: daftar aset media tenant. */
router.get(
  '/',
  requirePermission('media.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const assets = await prisma.mediaAsset.findMany({
      where: { studyProgramId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { name: true } } },
    });
    res.json({ success: true, assets });
  }),
);

/**
 * POST /api/v1/admin/media
 *
 * Mengunggah satu file. Metadata disimpan di database dan file fisik memakai
 * nama acak sehingga tidak dapat ditebak dari luar.
 */
router.post(
  '/',
  requirePermission('media.upload'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const file = req.file;

    if (!file) {
      throw AppError.badRequest('Berkas belum dipilih.', 'FILE_REQUIRED');
    }

    const storageKey = `/uploads/media/${file.filename}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        studyProgramId,
        uploadedById: req.authUser?.id ?? null,
        filename: file.originalname.slice(0, 255),
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        altText: typeof req.body?.altText === 'string' ? req.body.altText.slice(0, 255) : null,
        isPublic: req.body?.isPublic !== 'false',
      },
    });

    await recordAudit({ req, action: 'UPLOAD', module: 'MEDIA', targetType: 'media_asset', targetId: asset.id });
    res.status(201).json({
      success: true,
      message: 'Berkas berhasil diunggah.',
      asset: { ...asset, url: storageKey },
    });
  }),
);

/** DELETE /api/v1/admin/media/:id: menghapus metadata dan file fisiknya. */
router.delete(
  '/:id',
  requirePermission('media.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const asset = await prisma.mediaAsset.findFirst({ where: { id, studyProgramId } });
    if (!asset) {
      throw AppError.notFound('Aset media tidak ditemukan pada program studi ini.');
    }

    await prisma.mediaAsset.delete({ where: { id } });

    // Hapus file fisik hanya bila path-nya memang berada di dalam folder media.
    const absolute = path.join(process.cwd(), asset.storageKey.replace(/^\/+/, ''));
    const mediaRoot = path.join(process.cwd(), config.upload.dir, 'media');
    if (absolute.startsWith(mediaRoot) && fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
    }

    await recordAudit({ req, action: 'DELETE', module: 'MEDIA', targetType: 'media_asset', targetId: id });
    res.json({ success: true, message: 'Aset media berhasil dihapus.' });
  }),
);

export default router;
