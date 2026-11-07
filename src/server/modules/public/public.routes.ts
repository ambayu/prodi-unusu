import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, getQuery, validate } from '../../utils/validation.js';
import { requireTenant } from '../../middlewares/tenantResolver.js';
import { AppError } from '../../utils/errors.js';
import { createContactMessageSchema } from '../../../shared/schemas/content.js';
import { slugParamSchema } from '../../../shared/schemas/public.js';
import { paginationSchema } from '../../../shared/schemas/common.js';
import { getPublishedPageBySlug } from '../../services/pageService.js';
import { buildCurriculumSummary, listPublicCurriculum } from '../../services/curriculumService.js';

const router = Router();

/**
 * GET /api/v1/public/site
 *
 * Identitas lengkap tenant yang sedang dibuka. Untuk website utama dan portal
 * admin tidak ada tenant, sehingga respons menjelaskan itu secara eksplisit
 * alih-alih mengirim tenant palsu.
 */
router.get(
  '/site',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      surface: req.surface,
      site: req.tenant,
    });
  }),
);

/** GET /api/v1/public/menus: navigasi publik tenant, sudah berurutan. */
router.get(
  '/menus',
  requireTenant,
  asyncHandler(async (req, res) => {
    const menus = await prisma.menu.findMany({
      where: { studyProgramId: req.tenant!.id, isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json({ success: true, menus });
  }),
);

/**
 * GET /api/v1/public/pages/:slug
 *
 * Halaman publik hanya membaca konten yang sudah dipublikasikan. Draft tidak
 * pernah tampil di domain publik (docs/DESIGN-RULES.md).
 */
router.get(
  '/pages/:slug',
  requireTenant,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = getParams<{ slug: string }>(req);
    const page = await getPublishedPageBySlug(req.tenant!.id, slug);

    if (!page) {
      throw AppError.notFound('Halaman tidak ditemukan atau belum dipublikasikan.');
    }

    res.json({ success: true, page });
  }),
);

/** GET /api/v1/public/curriculum: kurikulum aktif beserta semester dan mata kuliah. */
router.get(
  '/curriculum',
  requireTenant,
  asyncHandler(async (req, res) => {
    const curriculums = await listPublicCurriculum(req.tenant!.id);
    res.json({
      success: true,
      curriculums,
      summary: buildCurriculumSummary(curriculums),
    });
  }),
);

/** GET /api/v1/public/lecturers: direktori dosen aktif. */
router.get(
  '/lecturers',
  requireTenant,
  asyncHandler(async (req, res) => {
    const lecturers = await prisma.lecturer.findMany({
      where: { studyProgramId: req.tenant!.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, lecturers });
  }),
);

/** GET /api/v1/public/documents: dokumen yang ditandai publik saja. */
router.get(
  '/documents',
  requireTenant,
  asyncHandler(async (req, res) => {
    const documents = await prisma.document.findMany({
      where: { studyProgramId: req.tenant!.id, isPublic: true },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        description: true,
        year: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        downloadCount: true,
        createdAt: true,
      },
    });

    res.json({ success: true, documents });
  }),
);

/** GET /api/v1/public/facilities: sarana dan prasarana tenant. */
router.get(
  '/facilities',
  requireTenant,
  asyncHandler(async (req, res) => {
    const facilities = await prisma.facility.findMany({
      where: { studyProgramId: req.tenant!.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, facilities });
  }),
);

/** GET /api/v1/public/posts: berita yang sudah terbit, dengan pagination. */
router.get(
  '/posts',
  requireTenant,
  validate({ query: paginationSchema }),
  asyncHandler(async (req, res) => {
    const { page, perPage, search } = getQuery<{ page: number; perPage: number; search?: string }>(req);
    const where = {
      studyProgramId: req.tenant!.id,
      status: 'published' as const,
      isPublished: true,
      ...(search ? { title: { contains: search } } : {}),
    };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          thumbnailUrl: true,
          publishedAt: true,
          views: true,
          category: { select: { name: true, slug: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      items: posts,
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  }),
);

/** GET /api/v1/public/posts/:slug: detail satu berita terbit. */
router.get(
  '/posts/:slug',
  requireTenant,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = getParams<{ slug: string }>(req);
    const post = await prisma.post.findFirst({
      where: {
        studyProgramId: req.tenant!.id,
        slug,
        status: 'published',
        isPublished: true,
      },
      include: { category: { select: { name: true, slug: true } } },
    });

    if (!post) {
      throw AppError.notFound('Berita tidak ditemukan atau belum diterbitkan.');
    }

    await prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
    res.json({ success: true, post });
  }),
);

/** GET /api/v1/public/galleries: album galeri yang dipublikasikan. */
router.get(
  '/galleries',
  requireTenant,
  asyncHandler(async (req, res) => {
    const galleries = await prisma.gallery.findMany({
      where: { studyProgramId: req.tenant!.id, isPublished: true },
      orderBy: [{ eventDate: 'desc' }, { id: 'desc' }],
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    res.json({ success: true, galleries });
  }),
);

/** GET /api/v1/public/profile: profil dan visi misi tenant. */
router.get(
  '/profile',
  requireTenant,
  asyncHandler(async (req, res) => {
    const [profile, visionMission] = await Promise.all([
      prisma.profileContent.findUnique({ where: { studyProgramId: req.tenant!.id } }),
      prisma.visionMission.findUnique({ where: { studyProgramId: req.tenant!.id } }),
    ]);

    res.json({ success: true, profile, visionMission });
  }),
);

/** GET /api/v1/public/contact: informasi kontak tenant. */
router.get(
  '/contact',
  requireTenant,
  asyncHandler(async (req, res) => {
    const contact = await prisma.contactInfo.findUnique({
      where: { studyProgramId: req.tenant!.id },
    });
    res.json({ success: true, contact });
  }),
);

/**
 * POST /api/v1/public/contact/messages
 *
 * Formulir pesan pengunjung. Pesan selalu tersimpan pada tenant pemilik domain,
 * bukan pada tenant yang dikirim dari body.
 */
router.post(
  '/contact/messages',
  requireTenant,
  validate({ body: createContactMessageSchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<{ name: string; email: string; subject?: string | null; message: string }>(req);

    const created = await prisma.contactMessage.create({
      data: {
        studyProgramId: req.tenant!.id,
        name: body.name,
        email: body.email,
        subject: body.subject ?? 'Pesan Pengunjung Website',
        message: body.message,
      },
      select: { id: true, createdAt: true },
    });

    res.status(201).json({
      success: true,
      message: 'Pesan Anda sudah kami terima. Terima kasih.',
      id: created.id,
    });
  }),
);

/** GET /api/v1/public/sitemap: daftar URL publik tenant untuk sitemap.xml. */
router.get(
  '/sitemap',
  requireTenant,
  asyncHandler(async (req, res) => {
    const [pages, posts, galleries] = await Promise.all([
      prisma.page.findMany({
        where: { studyProgramId: req.tenant!.id, isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { studyProgramId: req.tenant!.id, status: 'published' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.gallery.findMany({
        where: { studyProgramId: req.tenant!.id, isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const base = `https://${req.requestHostname}`;
    const entries = [
      { url: `${base}/`, lastmod: new Date().toISOString() },
      ...pages.map((page) => ({
        url: page.slug === 'beranda' ? `${base}/` : `${base}/${page.slug}`,
        lastmod: page.updatedAt.toISOString(),
      })),
      ...posts.map((post) => ({ url: `${base}/berita/${post.slug}`, lastmod: post.updatedAt.toISOString() })),
      ...galleries.map((gallery) => ({
        url: `${base}/galeri/${gallery.slug}`,
        lastmod: gallery.updatedAt.toISOString(),
      })),
    ];

    res.json({ success: true, entries });
  }),
);

export default router;
