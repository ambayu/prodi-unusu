import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, getQuery, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import {
  createGalleryItemSchema,
  createGallerySchema,
  createPostCategorySchema,
  createPostSchema,
  updateContactSchema,
  updateGallerySchema,
  updatePostSchema,
  updateProfileSchema,
  updateVisionMissionSchema,
} from '../../../shared/schemas/content.js';
import { idParamSchema, paginationSchema } from '../../../shared/schemas/common.js';

const router = Router();

// -------------------------------------------------------------
// Berita
// -------------------------------------------------------------

router.get(
  '/posts',
  requirePermission('posts.view'),
  validate({ query: paginationSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { page, perPage, search } = getQuery<{ page: number; perPage: number; search?: string }>(req);

    const where = {
      studyProgramId,
      ...(search ? { title: { contains: search } } : {}),
    };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({ success: true, items: posts, page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) });
  }),
);

router.get(
  '/posts/:id',
  requirePermission('posts.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const post = await prisma.post.findFirst({ where: { id, studyProgramId } });
    if (!post) {
      throw AppError.notFound('Berita tidak ditemukan pada program studi ini.');
    }

    res.json({ success: true, post });
  }),
);

router.post(
  '/posts',
  requirePermission('posts.create'),
  validate({ body: createPostSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const status = body.status as string;
    const isPublished = status === 'published';

    const post = await prisma.post.create({
      data: {
        studyProgramId,
        title: body.title as string,
        slug: body.slug as string,
        categoryId: (body.categoryId as number | null) ?? null,
        excerpt: (body.excerpt as string | null) ?? null,
        content: body.content as string,
        thumbnailUrl: (body.thumbnailUrl as string | null) ?? null,
        seoTitle: (body.seoTitle as string | null) ?? null,
        seoDescription: (body.seoDescription as string | null) ?? null,
        status,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        scheduledAt: (body.scheduledAt as Date | null) ?? null,
        authorId: req.authUser?.id ?? null,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'POSTS', targetType: 'post', targetId: post.id });
    res.status(201).json({ success: true, message: 'Berita berhasil disimpan.', post });
  }),
);

router.put(
  '/posts/:id',
  requirePermission('posts.update'),
  validate({ body: updatePostSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.post.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Berita tidak ditemukan pada program studi ini.');
    }

    const data: Record<string, unknown> = { ...body };
    if (body.status !== undefined) {
      const status = body.status as string;
      data.isPublished = status === 'published';
      if (status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    const post = await prisma.post.update({ where: { id }, data });
    await recordAudit({ req, action: 'UPDATE', module: 'POSTS', targetType: 'post', targetId: id });
    res.json({ success: true, message: 'Berita berhasil diperbarui.', post });
  }),
);

router.delete(
  '/posts/:id',
  requirePermission('posts.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.post.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Berita tidak ditemukan pada program studi ini.');
    }

    await prisma.post.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'POSTS', targetType: 'post', targetId: id });
    res.json({ success: true, message: 'Berita berhasil dihapus.' });
  }),
);

/** POST /api/v1/admin/posts/:id/publish: menerbitkan atau menarik berita. */
router.post(
  '/posts/:id/publish',
  requirePermission('posts.publish'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const publish = req.body?.publish !== false;

    const existing = await prisma.post.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Berita tidak ditemukan pada program studi ini.');
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        status: publish ? 'published' : 'draft',
        isPublished: publish,
        publishedAt: publish ? existing.publishedAt ?? new Date() : existing.publishedAt,
      },
    });

    await recordAudit({ req, action: 'PUBLISH', module: 'POSTS', targetType: 'post', targetId: id, details: { publish } });
    res.json({
      success: true,
      message: publish ? 'Berita berhasil diterbitkan.' : 'Berita dikembalikan ke draft.',
      post,
    });
  }),
);

router.get(
  '/post-categories',
  requirePermission('posts.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const categories = await prisma.postCategory.findMany({
      where: { studyProgramId },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, categories });
  }),
);

router.post(
  '/post-categories',
  requirePermission('posts.create'),
  validate({ body: createPostCategorySchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{ name: string; slug: string }>(req);

    const category = await prisma.postCategory.create({
      data: { studyProgramId, name: body.name, slug: body.slug },
    });

    res.status(201).json({ success: true, message: 'Kategori berita berhasil dibuat.', category });
  }),
);

// -------------------------------------------------------------
// Galeri
// -------------------------------------------------------------

router.get(
  '/galleries',
  requirePermission('galleries.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const galleries = await prisma.gallery.findMany({
      where: { studyProgramId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
    res.json({ success: true, galleries });
  }),
);

router.post(
  '/galleries',
  requirePermission('galleries.create'),
  validate({ body: createGallerySchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const gallery = await prisma.gallery.create({
      data: { studyProgramId, ...(body as object) } as never,
    });

    await recordAudit({ req, action: 'CREATE', module: 'GALLERIES', targetType: 'gallery', targetId: gallery.id });
    res.status(201).json({ success: true, message: 'Album galeri berhasil dibuat.', gallery });
  }),
);

router.put(
  '/galleries/:id',
  requirePermission('galleries.update'),
  validate({ body: updateGallerySchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.gallery.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Album galeri tidak ditemukan pada program studi ini.');
    }

    const gallery = await prisma.gallery.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'GALLERIES', targetType: 'gallery', targetId: id });
    res.json({ success: true, message: 'Album galeri berhasil diperbarui.', gallery });
  }),
);

router.delete(
  '/galleries/:id',
  requirePermission('galleries.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.gallery.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Album galeri tidak ditemukan pada program studi ini.');
    }

    await prisma.gallery.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'GALLERIES', targetType: 'gallery', targetId: id });
    res.json({ success: true, message: 'Album galeri berhasil dihapus.' });
  }),
);

router.post(
  '/galleries/:id/items',
  requirePermission('galleries.update'),
  validate({ body: createGalleryItemSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{ caption?: string | null; mediaType: string; mediaUrl: string; sortOrder: number }>(req);

    const gallery = await prisma.gallery.findFirst({ where: { id, studyProgramId } });
    if (!gallery) {
      throw AppError.notFound('Album galeri tidak ditemukan pada program studi ini.');
    }

    const item = await prisma.galleryItem.create({
      data: {
        galleryId: id,
        caption: body.caption ?? null,
        mediaType: body.mediaType,
        mediaUrl: body.mediaUrl,
        sortOrder: body.sortOrder,
      },
    });

    res.status(201).json({ success: true, message: 'Item galeri berhasil ditambahkan.', item });
  }),
);

router.delete(
  '/gallery-items/:id',
  requirePermission('galleries.update'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const item = await prisma.galleryItem.findFirst({
      where: { id, gallery: { studyProgramId } },
    });
    if (!item) {
      throw AppError.notFound('Item galeri tidak ditemukan pada program studi ini.');
    }

    await prisma.galleryItem.delete({ where: { id } });
    res.json({ success: true, message: 'Item galeri berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Kontak & Profil
// -------------------------------------------------------------

router.get(
  '/contact',
  requirePermission('contacts.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const contact = await prisma.contactInfo.findUnique({ where: { studyProgramId } });
    res.json({ success: true, contact });
  }),
);

router.put(
  '/contact',
  requirePermission('contacts.update'),
  validate({ body: updateContactSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const contact = await prisma.contactInfo.upsert({
      where: { studyProgramId },
      create: { studyProgramId, ...(body as object) } as never,
      update: body,
    });

    await recordAudit({ req, action: 'UPDATE', module: 'CONTACTS', targetType: 'contact', targetId: contact.id });
    res.json({ success: true, message: 'Informasi kontak berhasil diperbarui.', contact });
  }),
);

router.get(
  '/contact-messages',
  requirePermission('contact_messages.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const messages = await prisma.contactMessage.findMany({
      where: { studyProgramId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, messages });
  }),
);

router.put(
  '/contact-messages/:id/read',
  requirePermission('contact_messages.manage'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const message = await prisma.contactMessage.findFirst({ where: { id, studyProgramId } });
    if (!message) {
      throw AppError.notFound('Pesan tidak ditemukan pada program studi ini.');
    }

    const updated = await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, message: 'Pesan ditandai sudah dibaca.', data: updated });
  }),
);

router.get(
  '/profile',
  requirePermission('profile.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const [profile, visionMission] = await Promise.all([
      prisma.profileContent.findUnique({ where: { studyProgramId } }),
      prisma.visionMission.findUnique({ where: { studyProgramId } }),
    ]);
    res.json({ success: true, profile, visionMission });
  }),
);

router.put(
  '/profile',
  requirePermission('profile.update'),
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const profile = await prisma.profileContent.upsert({
      where: { studyProgramId },
      create: { studyProgramId, ...(body as object) } as never,
      update: body,
    });

    await recordAudit({ req, action: 'UPDATE', module: 'PROFILE', targetType: 'profile', targetId: profile.id });
    res.json({ success: true, message: 'Profil program studi berhasil diperbarui.', profile });
  }),
);

router.put(
  '/vision-mission',
  requirePermission('vision_mission.update'),
  validate({ body: updateVisionMissionSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const visionMission = await prisma.visionMission.upsert({
      where: { studyProgramId },
      create: { studyProgramId, ...(body as object) } as never,
      update: body,
    });

    await recordAudit({ req, action: 'UPDATE', module: 'VISION_MISSION', targetType: 'vision_mission', targetId: visionMission.id });
    res.json({ success: true, message: 'Visi dan misi berhasil diperbarui.', visionMission });
  }),
);

export default router;
