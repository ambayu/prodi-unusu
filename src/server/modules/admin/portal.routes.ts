import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { resolveContentOwner, scopedTenantId } from '../../middlewares/tenantScope.js';
import { recordAudit } from '../../services/auditService.js';
import { findProdiHeroSlider, saveProdiHeroSlider } from '../../services/widgetBankService.js';
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
 * Banner hero prodi kini bersumber dari Bank Widget (`custom_layout` berisi
 * blok `hero_slider`). `saveProdiHeroSlider` memastikan template tersedia
 * sekaligus menautkannya ke beranda prodi bila belum dipasang.
 */
async function resolveProdiHero(studyProgramId: number) {
  return saveProdiHeroSlider(studyProgramId, (current) => current);
}

async function resolveFacultyHeroWidget(facultyId: number) {
  const widgetMaster = await prisma.widget.findUnique({ where: { code: 'hero_slider' } });
  if (!widgetMaster) {
    throw AppError.badRequest('Widget hero_slider belum terdaftar pada registri widget.');
  }

  const existing = await prisma.sectionWidget.findFirst({
    where: {
      widgetId: widgetMaster.id,
      pageSection: { page: { facultyId, slug: 'beranda' } },
    },
    include: { pageSection: { include: { page: true } } },
  });
  if (existing) return { widget: existing, created: false as const };

  let page = await prisma.page.findFirst({ where: { facultyId, slug: 'beranda' } });
  if (!page) {
    page = await prisma.page.create({
      data: {
        facultyId,
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
    section = await prisma.pageSection.create({
      data: {
        pageId: page.id,
        sectionKey: 'hero',
        title: 'Hero Slider',
        sortOrder: 0,
      },
    });
  }

  const widget = await prisma.sectionWidget.create({
    data: {
      pageSectionId: section.id,
      widgetId: widgetMaster.id,
      sortOrder: 1,
      isActive: true,
      configJson: JSON.stringify({ slides: [], autoplayMs: 6000, showDots: true }),
    },
    include: { pageSection: { include: { page: true } } },
  });
  return { widget, created: true as const };
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
 * Slug halaman & kunci section khusus banner **Portal Pusat**.
 *
 * Portal pusat tidak punya tenant, sehingga banner-nya tidak bisa memakai
 * halaman milik prodi. Sebagai gantinya dibuat satu halaman "sistem" tanpa
 * `studyProgramId` — skema tidak mewajibkan relasi itu untuk portal.
 */
const PORTAL_HERO_PAGE_SLUG = '__portal_hero__';
const PORTAL_HERO_SECTION_KEY = 'hero';

/** Apakah request meminta banner Portal Pusat (`?scope=portal`). */
function heroScope(req: { query: Record<string, unknown> }): 'portal' | 'faculty' | 'prodi' {
  const scope = String(req.query.scope ?? '').toLowerCase();
  return scope === 'portal' || scope === 'faculty' ? scope : 'prodi';
}

/**
 * Pastikan banner Portal Pusat boleh diubah oleh pengguna ini.
 *
 * Hanya Super Admin, karena banner ini tampil untuk seluruh universitas dan
 * tidak terikat pada penugasan prodi mana pun.
 */
function assertPortalHeroAllowed(req: { authUser?: { isSuperAdmin: boolean } }) {
  if (!req.authUser?.isSuperAdmin) {
    throw AppError.forbidden(
      'Hero slider portal pusat hanya dapat diubah oleh Super Admin.',
      'SUPER_ADMIN_ONLY',
    );
  }
}

/**
 * Cari/buat widget `hero_slider` milik Portal Pusat.
 *
 * Halaman dan section dibuat otomatis bila belum ada, dengan pola yang sama
 * seperti banner prodi, hanya saja tanpa tenant.
 */
async function resolvePortalHeroWidget() {
  const widgetMaster = await prisma.widget.findUnique({ where: { code: 'hero_slider' } });
  if (!widgetMaster) {
    throw AppError.badRequest('Widget hero_slider belum terdaftar pada registri widget.');
  }

  const existing = await prisma.sectionWidget.findFirst({
    where: {
      widgetId: widgetMaster.id,
      pageSection: { page: { studyProgramId: null, slug: PORTAL_HERO_PAGE_SLUG } },
    },
    include: { pageSection: { include: { page: true } } },
  });
  if (existing) {
    return { widget: existing, created: false as const };
  }

  let page = await prisma.page.findFirst({
    where: { studyProgramId: null, slug: PORTAL_HERO_PAGE_SLUG },
  });
  if (!page) {
    page = await prisma.page.create({
      data: {
        studyProgramId: null,
        slug: PORTAL_HERO_PAGE_SLUG,
        title: 'Beranda Portal Universitas',
        layout: 'default',
        isPublished: false,
        isSystem: true,
      },
    });
  }

  let section = await prisma.pageSection.findFirst({
    where: { pageId: page.id, sectionKey: PORTAL_HERO_SECTION_KEY },
  });
  if (!section) {
    section = await prisma.pageSection.create({
      data: {
        pageId: page.id,
        sectionKey: PORTAL_HERO_SECTION_KEY,
        title: 'Hero Slider Portal',
        sortOrder: 0,
      },
    });
  }

  const created = await prisma.sectionWidget.create({
    data: {
      pageSectionId: section.id,
      widgetId: widgetMaster.id,
      sortOrder: 1,
      isActive: true,
      configJson: JSON.stringify({ slides: [], autoplayMs: 6000, showDots: true }),
    },
    include: { pageSection: { include: { page: true } } },
  });

  return { widget: created, created: true as const };
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
    const scope = heroScope(req);
    if (scope === 'portal') {
      assertPortalHeroAllowed(req);
      const { widget } = await resolvePortalHeroWidget();
      const config = parseHeroConfig(widget.configJson);

      res.json({
        success: true,
        scope: 'portal',
        studyProgram: null,
        faculty: null,
        page: null,
        config: {
          slides: Array.isArray(config.slides) ? config.slides : [],
          autoplayMs: typeof config.autoplayMs === 'number' ? config.autoplayMs : 6000,
          showDots: config.showDots !== false,
        },
      });
      return;
    }

    if (scope === 'faculty') {
      const owner = await resolveContentOwner(req);
      if (!owner.facultyId) {
        throw AppError.badRequest('Pilih fakultas aktif sebelum mengelola banner.');
      }
      const faculty = await prisma.faculty.findUnique({
        where: { id: owner.facultyId },
        select: { id: true, code: true, name: true },
      });
      if (!faculty) throw AppError.notFound('Fakultas aktif tidak ditemukan.');
      const { widget } = await resolveFacultyHeroWidget(faculty.id);
      const config = parseHeroConfig(widget.configJson);
      res.json({
        success: true,
        scope: 'faculty',
        studyProgram: null,
        faculty,
        page: { id: widget.pageSection.page.id, slug: widget.pageSection.page.slug },
        config: {
          slides: Array.isArray(config.slides) ? config.slides : [],
          autoplayMs: typeof config.autoplayMs === 'number' ? config.autoplayMs : 6000,
          showDots: config.showDots !== false,
        },
      });
      return;
    }

    const studyProgramId = scopedTenantId(req);

    const studyProgram = await prisma.studyProgram.findUnique({
      where: { id: studyProgramId },
      select: { id: true, code: true, name: true, degree: true },
    });
    if (!studyProgram) {
      throw AppError.notFound('Program studi aktif tidak ditemukan.');
    }

    const hero = await resolveProdiHero(studyProgramId);
    const config = hero.config as HeroConfig;

    res.json({
      success: true,
      scope: 'prodi',
      studyProgram,
      faculty: null,
      page: hero.page.slug ? hero.page : null,
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
    const body = getBody<z.infer<typeof slidesPayloadSchema>>(req);
    const scope = heroScope(req);

    const normalizedSlides = body.slides.map((slide) => ({
      imageUrl: slide.imageUrl,
      alt: slide.alt?.trim() || '',
      linkUrl: slide.linkUrl?.trim() || '',
    }));

    if (scope === 'portal') {
      assertPortalHeroAllowed(req);
      const { widget } = await resolvePortalHeroWidget();
      const config = parseHeroConfig(widget.configJson);

      const portalConfig: HeroConfig = {
        ...config,
        slides: normalizedSlides,
        ...(body.autoplayMs !== undefined ? { autoplayMs: body.autoplayMs } : {}),
        ...(body.showDots !== undefined ? { showDots: body.showDots } : {}),
      };

      const updated = await prisma.sectionWidget.update({
        where: { id: widget.id },
        data: { configJson: JSON.stringify(portalConfig) },
      });

      await recordAudit({
        req,
        action: 'UPDATE',
        module: 'NAVIGATION',
        targetType: 'portal_hero_slider',
        targetId: widget.id,
        studyProgramId: null,
        details: { scope: 'portal', slideCount: normalizedSlides.length },
      });

      res.json({
        success: true,
        message: `Hero slider beranda portal berhasil disimpan (${normalizedSlides.length} slide).`,
        widgetId: updated.id,
        slides: normalizedSlides,
      });
      return;
    }

    if (scope === 'faculty') {
      const owner = await resolveContentOwner(req);
      if (!owner.facultyId) {
        throw AppError.badRequest('Pilih fakultas aktif sebelum mengelola banner.');
      }
      const { widget } = await resolveFacultyHeroWidget(owner.facultyId);
      const config = parseHeroConfig(widget.configJson);
      const nextConfig: HeroConfig = {
        ...config,
        slides: normalizedSlides,
        ...(body.autoplayMs !== undefined ? { autoplayMs: body.autoplayMs } : {}),
        ...(body.showDots !== undefined ? { showDots: body.showDots } : {}),
      };
      await prisma.sectionWidget.update({
        where: { id: widget.id },
        data: { configJson: JSON.stringify(nextConfig) },
      });
      await recordAudit({
        req,
        action: 'UPDATE',
        module: 'NAVIGATION',
        targetType: 'faculty_hero_slider',
        targetId: widget.id,
        studyProgramId: null,
        details: {
          scope: 'faculty',
          facultyId: owner.facultyId,
          slideCount: normalizedSlides.length,
        },
      });
      res.json({
        success: true,
        message: `Hero slider fakultas berhasil disimpan (${normalizedSlides.length} slide).`,
        slides: normalizedSlides,
      });
      return;
    }

    const studyProgramId = scopedTenantId(req);
    const saved = await saveProdiHeroSlider(studyProgramId, (config) => ({
      ...config,
      slides: normalizedSlides,
      ...(body.autoplayMs !== undefined ? { autoplayMs: body.autoplayMs } : {}),
      ...(body.showDots !== undefined ? { showDots: body.showDots } : {}),
    }));

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'NAVIGATION',
      targetType: 'widget_template_hero_slider',
      targetId: saved.targetId,
      details: { studyProgramId, slideCount: normalizedSlides.length },
    });

    res.json({
      success: true,
      message: `Hero slider program studi berhasil disimpan (${normalizedSlides.length} slide).`,
      widgetId: saved.targetId,
      slides: normalizedSlides,
    });
  }),
);

export default router;
