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

/** GET /api/v1/public/pages: daftar seluruh halaman tenant yang sudah dipublikasikan untuk navigasi. */
router.get(
  '/pages',
  requireTenant,
  asyncHandler(async (req, res) => {
    const pages = await prisma.page.findMany({
      where: { studyProgramId: req.tenant!.id, isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        layout: true,
        isSystem: true,
      },
      orderBy: [{ isSystem: 'desc' }, { title: 'asc' }],
    });

    res.json({ success: true, pages });
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

/**
 * GET /api/v1/public/directory
 *
 * Direktori seluruh program studi beserta domain publiknya. Dipakai halaman
 * beranda portal administrasi (ADMIN_HOST) untuk menampilkan daftar website
 * prodi kepada pengunjung.
 *
 * Endpoint ini sengaja TIDAK memakai `requireTenant`: justru pada permukaan
 * admin tidak ada tenant, dan seluruh data yang dikirim sudah bersifat publik
 * (nama program studi, fakultas, dan hostname). Draft dan data internal tidak
 * pernah ikut dikirim.
 */
router.get(
  '/directory',
  asyncHandler(async (_req, res) => {
    const studyPrograms = await prisma.studyProgram.findMany({
      where: { status: 'active' },
      orderBy: [{ facultyId: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        degree: true,
        logoUrl: true,
        faculty: { select: { id: true, name: true, code: true } },
        domains: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
          select: { hostname: true, isPrimary: true },
        },
      },
    });

    res.json({
      success: true,
      total: studyPrograms.length,
      studyPrograms: studyPrograms.map((prodi) => ({
        ...prodi,
        // Hostname utama dipakai untuk tautan keluar ke website prodi.
        primaryHostname:
          prodi.domains.find((domain) => domain.isPrimary)?.hostname ??
          prodi.domains[0]?.hostname ??
          null,
      })),
    });
  }),
);

/**
 * GET /api/v1/public/academic-hierarchy
 *
 * Endpoint publik untuk struktur hierarki Fakultas dan Program Studi aktif.
 * Digunakan oleh SSO ONE UNUSU dan modul eksternal untuk sinkronisasi dropdown akun.
 */
router.get(
  '/academic-hierarchy',
  asyncHandler(async (_req, res) => {
    const faculties = await prisma.faculty.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        studyPrograms: {
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            slug: true,
            degree: true,
          },
        },
      },
    });

    res.json({
      success: true,
      total: faculties.length,
      faculties,
    });
  }),
);

/**
 * GET /api/v1/public/news
 *
 * Berita terbit dari SELURUH program studi, dipakai beranda portal.
 *
 * Berbeda dengan `/posts` yang mensyaratkan tenant, endpoint ini justru tidak
 * memakai `requireTenant` karena portal tidak memiliki tenant tetap. Setiap
 * butir membawa identitas prodi asalnya agar tautan "Lihat selengkapnya" dapat
 * mengarah ke domain prodi yang benar.
 *
 * `slug` hanya unik di dalam satu prodi, jadi kombinasi prodi+slug dipakai
 * untuk membentuk kunci tautan yang unik.
 */
router.get(
  '/news',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 24);

    const posts = await prisma.post.findMany({
      where: { status: 'published', isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        thumbnailUrl: true,
        publishedAt: true,
        views: true,
        category: { select: { name: true, slug: true } },
        studyProgram: {
          select: {
            id: true,
            code: true,
            name: true,
            faculty: { select: { name: true } },
            domains: {
              where: { isActive: true },
              orderBy: { isPrimary: 'desc' },
              select: { hostname: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      items: posts.map((post) => {
        const hostname = post.studyProgram.domains[0]?.hostname ?? null;
        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          thumbnailUrl: post.thumbnailUrl,
          publishedAt: post.publishedAt,
          views: post.views,
          category: post.category,
          studyProgramId: post.studyProgram.id,
          studyProgramCode: post.studyProgram.code,
          studyProgramName: post.studyProgram.name,
          facultyName: post.studyProgram.faculty.name,
          prodiHostname: hostname,
          // Tautan absolut ke domain prodi asal agar tidak bergantung konteks host.
          url: hostname ? `https://${hostname}/berita/${post.slug}` : null,
        };
      }),
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

/**
 * GET /api/v1/public/hero-slides
 *
 * Hero slider untuk beranda.
 *
 * - Bila hostname adalah website prodi, yang dibaca adalah widget `hero_slider`
 *   milik prodi tersebut, sehingga banner selalu sesuai prodi yang dibuka.
 * - Bila hostname adalah portal pusat / website utama (tidak ada tenant), yang
 *   dibaca adalah banner Portal Pusat: widget `hero_slider` pada halaman sistem
 *   `__portal_hero__`. Banner itu diatur melalui
 *   `/admin/portal/hero-slides?scope=portal`.
 *
 * Mengembalikan array kosong bila belum ada slide; pemanggil bertanggung jawab
 * menyiapkan tampilan cadangan.
 */
router.get(
  '/hero-slides',
  asyncHandler(async (req, res) => {
    const widget = await prisma.sectionWidget.findFirst({
      where: req.tenant
        ? {
            widget: { code: 'hero_slider' },
            pageSection: { page: { studyProgramId: req.tenant.id } },
          }
        : {
            widget: { code: 'hero_slider' },
            pageSection: { page: { studyProgramId: null, slug: '__portal_hero__' } },
          },
      orderBy: { id: 'asc' },
      select: { configJson: true },
    });

    let slides: Array<{ imageUrl: string; alt: string; linkUrl: string }> = [];
    if (widget?.configJson) {
      try {
        const config = JSON.parse(widget.configJson) as {
          slides?: Array<{ imageUrl?: string; alt?: string; linkUrl?: string }>;
        };
        if (Array.isArray(config.slides)) {
          slides = config.slides
            .filter((slide) => typeof slide?.imageUrl === 'string' && slide.imageUrl.trim())
            .map((slide) => ({
              imageUrl: slide.imageUrl as string,
              alt: slide.alt ?? '',
              linkUrl: slide.linkUrl ?? '',
            }));
        }
      } catch {
        slides = [];
      }
    }

    res.json({
      success: true,
      scope: req.tenant ? 'prodi' : 'portal',
      studyProgramId: req.tenant?.id ?? null,
      slides,
    });
  }),
);

export default router;
