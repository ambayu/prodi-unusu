import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { recordAudit } from '../../services/auditService.js';
import { AppError } from '../../utils/errors.js';
import { idParamSchema } from '../../../shared/schemas/common.js';

/**
 * Pengelolaan Portal Utama (website universitas).
 *
 * Portal bersifat global — tidak terikat program studi — sehingga seluruh
 * endpoint di sini sengaja tidak memakai `scopedTenantId`. Akses dibatasi
 * oleh permission `website.update` agar hanya pengelola website universitas
 * yang dapat mengubah banner beranda utama.
 */
const router = Router();

const heroSlideSchema = z.object({
  imageUrl: z.string().trim().min(1, 'Gambar slide wajib diunggah.').max(500),
  alt: z.string().trim().max(255).optional().nullable(),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const reorderHeroSlidesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'Minimal satu slide harus dikirim.'),
});

/** GET /api/v1/admin/portal/hero-slides: daftar slide banner portal utama. */
router.get(
  '/portal/hero-slides',
  requirePermission('website.view'),
  asyncHandler(async (_req, res) => {
    const slides = await prisma.portalHeroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    res.json({ success: true, slides });
  }),
);

/** POST /api/v1/admin/portal/hero-slides: menambah slide banner portal. */
router.post(
  '/portal/hero-slides',
  requirePermission('website.update'),
  validate({ body: heroSlideSchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<z.infer<typeof heroSlideSchema>>(req);

    const lastSlide = await prisma.portalHeroSlide.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const slide = await prisma.portalHeroSlide.create({
      data: {
        imageUrl: body.imageUrl,
        alt: body.alt ?? null,
        linkUrl: body.linkUrl ?? null,
        sortOrder: body.sortOrder ?? (lastSlide ? lastSlide.sortOrder + 1 : 1),
        isActive: body.isActive ?? true,
      },
    });

    await recordAudit({
      req,
      action: 'CREATE',
      module: 'NAVIGATION',
      targetType: 'portal_hero_slide',
      targetId: slide.id,
    });

    res.status(201).json({
      success: true,
      message: 'Slide banner portal berhasil ditambahkan.',
      slide,
    });
  }),
);

/** PUT /api/v1/admin/portal/hero-slides/:id: mengubah satu slide banner portal. */
router.put(
  '/portal/hero-slides/:id',
  requirePermission('website.update'),
  validate({ body: heroSlideSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Partial<z.infer<typeof heroSlideSchema>>>(req);

    const existing = await prisma.portalHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Slide banner portal tidak ditemukan.');
    }

    const slide = await prisma.portalHeroSlide.update({
      where: { id },
      data: {
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.alt !== undefined ? { alt: body.alt ?? null } : {}),
        ...(body.linkUrl !== undefined ? { linkUrl: body.linkUrl ?? null } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'NAVIGATION',
      targetType: 'portal_hero_slide',
      targetId: id,
      details: body,
    });

    res.json({ success: true, message: 'Slide banner portal berhasil diperbarui.', slide });
  }),
);

/** DELETE /api/v1/admin/portal/hero-slides/:id: menghapus slide banner portal. */
router.delete(
  '/portal/hero-slides/:id',
  requirePermission('website.update'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.portalHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Slide banner portal tidak ditemukan.');
    }

    await prisma.portalHeroSlide.delete({ where: { id } });
    await recordAudit({
      req,
      action: 'DELETE',
      module: 'NAVIGATION',
      targetType: 'portal_hero_slide',
      targetId: id,
    });

    res.json({ success: true, message: 'Slide banner portal berhasil dihapus.' });
  }),
);

/** PUT /api/v1/admin/portal/hero-slides/reorder: menyimpan urutan slide portal. */
router.put(
  '/portal/hero-slides/reorder',
  requirePermission('website.update'),
  validate({ body: reorderHeroSlidesSchema }),
  asyncHandler(async (req, res) => {
    const { items } = getBody<{ items: Array<{ id: number; sortOrder: number }> }>(req);

    const owned = await prisma.portalHeroSlide.findMany({
      where: { id: { in: items.map((item) => item.id) } },
      select: { id: true },
    });

    if (owned.length !== items.length) {
      throw AppError.notFound('Ada slide banner portal yang tidak ditemukan.');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.portalHeroSlide.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'NAVIGATION',
      details: { reorder: items },
    });

    res.json({ success: true, message: 'Urutan slide banner portal berhasil disimpan.' });
  }),
);

export default router;
