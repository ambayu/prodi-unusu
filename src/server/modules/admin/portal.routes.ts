import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { recordAudit } from '../../services/auditService.js';
import { AppError } from '../../utils/errors.js';

/**
 * Pengelolaan Hero Slider per Program Studi.
 *
 * Slider tinggal di dalam `configJson` widget `hero_slider` pada halaman
 * beranda prodi (Page Builder), sehingga datanya otomatis terikat tenant.
 * Endpoint di sini memakai `scopedTenantId` agar Super Admin dapat berpindah
 * prodi dan mengubah banner prodi tersebut, sementara Admin Prodi hanya bisa
 * menyentuh prodi miliknya sendiri.
 *
 * Slide TIDAK disimpan pada tabel terpisah: satu-satunya sumber kebenaran
 * adalah widget Page Builder, sehingga perubahan di sini langsung tampil di
 * website prodi tanpa sinkronisasi tambahan.
 */
const router = Router();

const slideSchema = z.object({
  imageUrl: z.string().trim().min(1, 'Gambar slide wajib diunggah.').max(500),
  alt: z.string().trim().max(255).optional().nullable(),
  linkUrl: z.string().trim().max(500).optional().nullable(),
});

const slidesPayloadSchema = z.object({
  slides: z.array(slideSchema).max(20, 'Maksimal 20 slide per prodi.'),
  autoplayMs: z.number().int().min(1000).max(60000).optional(),
  showDots: z.boolean().optional(),
});

type HeroConfig = {
  slides?: Array<{ imageUrl: string; alt?: string | null; linkUrl?: string | null }>;
  autoplayMs?: number;
  showDots?: boolean;
  [key: string]: unknown;
};

/**
 * Cari widget hero_slider pada beranda prodi aktif beserta halaman induknya.
 *
 * Bila belum ada, dibuatkan: halaman `beranda` (bila prodi baru belum punya),
 * section pembungkus, lalu widget hero_slider dengan konfigurasi kosong.
 */
async function resolveHeroWidget(studyProgramId: number) {
  const existing = await prisma.sectionWidget.findFirst({
    where: {
      widget: { code: 'hero_slider' },
      pageSection: { page: { studyProgramId } },
    },
    include: { pageSection: { include: { page: true } } },
    orderBy: [{ pageSection: { page: { slug: 'asc' } } }, { id: 'asc' }],
  });

  if (existing) {
    return { widget: existing, created: false as const };
  }

  // Urutkan agar beranda diprioritaskan: ambil halaman beranda lebih dulu.
  const berandaFirst = await prisma.sectionWidget.findFirst({
    where: {
      widget: { code: 'hero_slider' },
      pageSection: { page: { studyProgramId, slug: 'beranda' } },
    },
    include: { pageSection: { include: { page: true } } },
  });
  if (berandaFirst) {
    return { widget: berandaFirst, created: false as const };
  }

  const widgetMaster = await prisma.widget.findUnique({ where: { code: 'hero_slider' } });
  if (!widgetMaster) {
    throw AppError.badRequest('Widget hero_slider belum terdaftar pada registri widget.');
  }

  // Pastikan halaman beranda prodi tersedia.
  let page = await prisma.page.findFirst({ where: { studyProgramId, slug: 'beranda' } });
  if (!page) {
    page = await prisma.page.create({
      data: {
        studyProgramId,
        slug: 'beranda',
        title: 'Beranda',
        layout: 'default',
        isPublished: true,
        isSystem: true,
      },
    });
  }

  let section = await prisma.pageSection.findFirst({
    where: { pageId: page.id, sectionKey: 'hero' },
  });
  if (!section) {
    const lastSection = await prisma.pageSection.findFirst({
      where: { pageId: page.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    section = await prisma.pageSection.create({
      data: {
        pageId: page.id,
        sectionKey: 'hero',
        title: 'Hero Slider',
        // Hero selalu di paling atas halaman beranda.
        sortOrder: lastSection ? Math.min(lastSection.sortOrder, 0) - 1 : 0,
      },
    });
  }

  const lastWidget = await prisma.sectionWidget.findFirst({
    where: { pageSectionId: section.id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const created = await prisma.sectionWidget.create({
    data: {
      pageSectionId: section.id,
      widgetId: widgetMaster.id,
      sortOrder: lastWidget ? lastWidget.sortOrder + 1 : 1,
      isActive: true,
      configJson: JSON.stringify({
        slides: [],
        autoplayMs: 6000,
        showDots: true,
      }),
    },
    include: { pageSection: { include: { page: true } } },
  });

  return { widget: created, created: true as const };
}

function parseHeroConfig(configJson: string | null): HeroConfig {
  try {
    const parsed = JSON.parse(configJson ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as HeroConfig) : {};
  } catch {
    return {};
  }
}

/**
 * GET /api/v1/admin/portal/hero-slides
 *
 * Mengembalikan slide hero milik PROGRAM STUDI AKTIF (tenant dari header/query),
 * beserta nama prodi agar UI dapat menegaskan konteks yang sedang diubah.
 */
router.get(
  '/portal/hero-slides',
  requirePermission('website.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);

    const studyProgram = await prisma.studyProgram.findUnique({
      where: { id: studyProgramId },
      select: { id: true, code: true, name: true, degree: true },
    });
    if (!studyProgram) {
      throw AppError.notFound('Program studi aktif tidak ditemukan.');
    }

    const { widget } = await resolveHeroWidget(studyProgramId);
    const config = parseHeroConfig(widget.configJson);

    res.json({
      success: true,
      studyProgram,
      page: { id: widget.pageSection.page.id, slug: widget.pageSection.page.slug },
      config: {
        slides: Array.isArray(config.slides) ? config.slides : [],
        autoplayMs: typeof config.autoplayMs === 'number' ? config.autoplayMs : 6000,
        showDots: config.showDots !== false,
      },
    });
  }),
);

/**
 * PUT /api/v1/admin/portal/hero-slides
 *
 * Menyimpan SELURUH daftar slide sekaligus (pola "save all"). Ini sengaja
 * dipilih agar pengurutan, penambahan, dan penghapusan slide tidak perlu
 * endpoint terpisah dan selalu konsisten dalam satu transaksi logis.
 */
router.put(
  '/portal/hero-slides',
  requirePermission('website.update'),
  validate({ body: slidesPayloadSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<z.infer<typeof slidesPayloadSchema>>(req);

    const { widget } = await resolveHeroWidget(studyProgramId);
    const config = parseHeroConfig(widget.configJson);

    const normalizedSlides = body.slides.map((slide) => ({
      imageUrl: slide.imageUrl,
      alt: slide.alt?.trim() || '',
      linkUrl: slide.linkUrl?.trim() || '',
    }));

    const nextConfig: HeroConfig = {
      ...config,
      slides: normalizedSlides,
      ...(body.autoplayMs !== undefined ? { autoplayMs: body.autoplayMs } : {}),
      ...(body.showDots !== undefined ? { showDots: body.showDots } : {}),
    };

    const updated = await prisma.sectionWidget.update({
      where: { id: widget.id },
      data: { configJson: JSON.stringify(nextConfig) },
    });

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'NAVIGATION',
      targetType: 'hero_slider',
      targetId: widget.id,
      details: { studyProgramId, slideCount: normalizedSlides.length },
    });

    res.json({
      success: true,
      message: `Hero slider program studi berhasil disimpan (${normalizedSlides.length} slide).`,
      widgetId: updated.id,
      slides: normalizedSlides,
    });
  }),
);

export default router;
