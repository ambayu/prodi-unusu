import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import {
  EMBEDDABLE_WIDGET_CODES,
  createPageSchema,
  createSectionSchema,
  createSectionWidgetSchema,
  createWidgetTemplateSchema,
  customLayoutTemplateConfigSchema,
  customLayoutWidgetConfigSchema,
  reorderSectionsSchema,
  reorderWidgetsSchema,
  updatePageSchema,
  updateSectionSchema,
  updateSectionWidgetSchema,
  updateWidgetTemplateSchema,
  validateWidgetConfig,
  type CustomLayoutTemplateConfig,
  type EmbeddableWidgetCode,
} from '../../../shared/schemas/builder.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import {
  createPageVersion,
  getPageForEditing,
  listPages,
  validatePageForPublish,
} from '../../services/pageService.js';

const router = Router();

/** Memastikan master widget `custom_layout` tersedia di tabel `widgets`. */
async function ensureCustomLayoutWidget() {
  return prisma.widget.upsert({
    where: { code: 'custom_layout' },
    create: {
      code: 'custom_layout',
      name: 'Bank Widget Kustom',
      category: 'Supporting',
      description: 'Widget susunan kolom buatan sendiri dari Bank Widget program studi.',
      defaultJson: JSON.stringify({ templateId: 0, templateName: '' }),
      isActive: true,
    },
    update: { isActive: true },
  });
}

function parseTemplateConfig(raw: string): CustomLayoutTemplateConfig {
  try {
    const parsed = customLayoutTemplateConfigSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : { rows: [] };
  } catch {
    return { rows: [] };
  }
}

const EMBEDDABLE_SET = new Set<string>(EMBEDDABLE_WIDGET_CODES);

const WIDGET_DISPLAY_LABELS: Record<EmbeddableWidgetCode, string> = {
  hero_slider: 'Hero Slider (Banner Beranda)',
  about_prodi: 'Profil Program Studi',
  vision_mission: 'Visi & Misi Program Studi',
  statistics: 'Statistik Program Studi',
  lecturer_list: 'Daftar Dosen & Pengajar',
  curriculum_overview: 'Struktur Kurikulum',
  latest_news: 'Berita Terbaru',
  document_list: 'Dokumen & Unduhan',
  facility_grid: 'Sarana & Prasarana',
  gallery_grid: 'Galeri Kegiatan',
  contact_information: 'Informasi Kontak',
  cta_banner: 'Banner Ajakan (CTA)',
};

function safeParseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Mengonversi sekumpulan SectionWidget bawaan milik tenant menjadi template di Bank Widget
 * (`widget_templates`) lalu mengarahkan instance-nya ke `custom_layout` secara atomik.
 */
async function convertSectionWidgetsToBank(
  studyProgramId: number,
  instances: Array<{
    id: number;
    configJson: string;
    widget: { code: string; name: string };
  }>,
): Promise<{ convertedCount: number; createdTemplateIds: number[]; firstTemplateId: number | null }> {
  const candidates = instances.filter((inst) => EMBEDDABLE_SET.has(inst.widget.code));
  if (candidates.length === 0) {
    return { convertedCount: 0, createdTemplateIds: [], firstTemplateId: null };
  }

  const customLayoutMaster = await ensureCustomLayoutWidget();
  const existingTemplates = await prisma.widgetTemplate.findMany({
    where: { studyProgramId, isActive: true },
    select: { id: true, name: true, configJson: true },
  });

  // Kunci dedup: configJson identik -> gunakan template yang sama agar tidak dobel.
  const byConfig = new Map<string, { id: number; name: string }>();
  for (const tpl of existingTemplates) {
    byConfig.set(tpl.configJson, { id: tpl.id, name: tpl.name });
  }

  const createdTemplateIds: number[] = [];
  let firstTemplateId: number | null = null;

  await prisma.$transaction(async (tx) => {
    for (const inst of candidates) {
      const widgetCode = inst.widget.code as EmbeddableWidgetCode;
      const rawCfg = safeParseJsonObject(inst.configJson);
      const displayLabel = WIDGET_DISPLAY_LABELS[widgetCode] ?? inst.widget.name;
      const customTitle = typeof rawCfg.title === 'string' && rawCfg.title.trim() ? rawCfg.title.trim() : '';
      const templateName = (customTitle && customTitle.length <= 120 ? customTitle : displayLabel).slice(0, 150);

      const templateConfig: CustomLayoutTemplateConfig = {
        rows: [
          {
            id: `row-${widgetCode}`,
            layout: '1-col',
            background: 'white',
            columns: [
              [
                {
                  id: `mod-${widgetCode}`,
                  type: 'widget',
                  widgetCode,
                  config: rawCfg,
                },
              ],
            ],
          },
        ],
      };

      const configJson = JSON.stringify(templateConfig);
      let target = byConfig.get(configJson);

      if (!target) {
        const created = await tx.widgetTemplate.create({
          data: {
            studyProgramId,
            name: templateName,
            description: `Modul ${displayLabel} — bebas dimodifikasi atau dipadukan kolom di Bank Widget.`,
            configJson,
          },
          select: { id: true, name: true },
        });
        target = created;
        byConfig.set(configJson, created);
        createdTemplateIds.push(created.id);
      }

      if (firstTemplateId === null) firstTemplateId = target.id;

      await tx.sectionWidget.update({
        where: { id: inst.id },
        data: {
          widgetId: customLayoutMaster.id,
          variantCode: null,
          configJson: JSON.stringify({
            templateId: target.id,
            templateName: target.name,
          }),
        },
      });
    }
  });

  return {
    convertedCount: candidates.length,
    createdTemplateIds,
    firstTemplateId,
  };
}

/** Memetakan jumlah dan nama halaman pemakai setiap template Bank Widget milik tenant. */
async function collectTemplateUsage(studyProgramId: number): Promise<Map<number, string[]>> {
  const instances = await prisma.sectionWidget.findMany({
    where: {
      widget: { code: 'custom_layout' },
      pageSection: { page: { studyProgramId } },
    },
    select: {
      configJson: true,
      pageSection: { select: { page: { select: { title: true } } } },
    },
  });

  const usage = new Map<number, Set<string>>();
  for (const inst of instances) {
    try {
      const cfg = JSON.parse(inst.configJson) as { templateId?: unknown };
      const tid = Number(cfg?.templateId);
      if (Number.isInteger(tid) && tid > 0) {
        if (!usage.has(tid)) usage.set(tid, new Set());
        usage.get(tid)!.add(inst.pageSection.page.title);
      }
    } catch {
      // Abaikan configJson yang tidak valid agar listing tidak gagal.
    }
  }

  return new Map([...usage.entries()].map(([tid, pages]) => [tid, [...pages]]));
}

/** Mengambil page dengan verifikasi kepemilikan tenant. */
async function requireOwnedPage(pageId: number, studyProgramId: number) {
  const page = await prisma.page.findFirst({ where: { id: pageId, studyProgramId } });
  if (!page) {
    throw AppError.notFound('Halaman tidak ditemukan pada program studi ini.');
  }
  return page;
}

/** Mengambil section dengan verifikasi rantai kepemilikan sampai tenant. */
async function requireOwnedSection(sectionId: number, studyProgramId: number) {
  const section = await prisma.pageSection.findFirst({
    where: { id: sectionId, page: { studyProgramId } },
    include: { page: { select: { id: true, slug: true } } },
  });
  if (!section) {
    throw AppError.notFound('Section tidak ditemukan pada halaman program studi ini.');
  }
  return section;
}

/** GET /api/v1/admin/pages: daftar halaman tenant. */
router.get(
  '/pages',
  requirePermission('pages.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const pages = await listPages(studyProgramId);
    res.json({ success: true, pages });
  }),
);

/** POST /api/v1/admin/pages: membuat halaman baru sebagai draft. */
router.post(
  '/pages',
  requirePermission('pages.create'),
  validate({ body: createPageSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const page = await prisma.page.create({
      data: {
        studyProgramId,
        slug: body.slug as string,
        title: body.title as string,
        layout: (body.layout as string) ?? 'default',
        seoTitle: (body.seoTitle as string | null) ?? null,
        seoDescription: (body.seoDescription as string | null) ?? null,
        isPublished: false,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'BUILDER', targetType: 'page', targetId: page.id });
    res.status(201).json({ success: true, message: 'Halaman berhasil dibuat sebagai draft.', page });
  }),
);

/** GET /api/v1/admin/pages/:id: detail halaman dengan section dan widget. */
router.get(
  '/pages/:id',
  requirePermission('pages.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    await requireOwnedPage(id, studyProgramId);

    const detail = await prisma.page.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            widgets: {
              orderBy: { sortOrder: 'asc' },
              include: { widget: { select: { code: true, name: true, category: true } } },
            },
          },
        },
      },
    });

    res.json({ success: true, page: detail });
  }),
);

/** PUT /api/v1/admin/pages/:id: memperbarui metadata halaman. */
router.put(
  '/pages/:id',
  requirePermission('pages.update'),
  validate({ body: updatePageSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);
    await requireOwnedPage(id, studyProgramId);

    const page = await prisma.page.update({ where: { id }, data: body });
    await createPageVersion(id, 'draft', req.authUser?.id ?? null, 'Metadata halaman diperbarui');

    await recordAudit({ req, action: 'UPDATE', module: 'BUILDER', targetType: 'page', targetId: id, details: body });
    res.json({ success: true, message: 'Halaman berhasil diperbarui.', page });
  }),
);

/** DELETE /api/v1/admin/pages/:id: menghapus halaman non-sistem. */
router.delete(
  '/pages/:id',
  requirePermission('pages.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const page = await requireOwnedPage(id, studyProgramId);

    if (page.isSystem) {
      throw AppError.badRequest('Halaman sistem tidak dapat dihapus.', 'SYSTEM_PAGE');
    }

    await prisma.page.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'BUILDER', targetType: 'page', targetId: id });
    res.json({ success: true, message: 'Halaman berhasil dihapus.' });
  }),
);

/** POST /api/v1/admin/pages/:id/sections: menambah section pada halaman. */
router.post(
  '/pages/:id/sections',
  requirePermission('builder.create'),
  validate({ body: createSectionSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{ sectionKey: string; title?: string | null; sortOrder: number; isActive: boolean }>(req);
    await requireOwnedPage(id, studyProgramId);

    const lastSection = await prisma.pageSection.findFirst({
      where: { pageId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const section = await prisma.pageSection.create({
      data: {
        pageId: id,
        sectionKey: body.sectionKey,
        title: body.title ?? null,
        sortOrder: lastSection ? lastSection.sortOrder + 1 : body.sortOrder,
        isActive: body.isActive,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'BUILDER', targetType: 'page_section', targetId: section.id });
    res.status(201).json({ success: true, message: 'Section berhasil ditambahkan.', section });
  }),
);

/** PUT /api/v1/admin/sections/:id: mengubah section. */
router.put(
  '/sections/:id',
  requirePermission('builder.update'),
  validate({ body: updateSectionSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);
    await requireOwnedSection(id, studyProgramId);

    const section = await prisma.pageSection.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'BUILDER', targetType: 'page_section', targetId: id });
    res.json({ success: true, message: 'Section berhasil diperbarui.', section });
  }),
);

/** DELETE /api/v1/admin/sections/:id: menghapus section beserta widgetnya. */
router.delete(
  '/sections/:id',
  requirePermission('builder.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    await requireOwnedSection(id, studyProgramId);

    await prisma.pageSection.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'BUILDER', targetType: 'page_section', targetId: id });
    res.json({ success: true, message: 'Section berhasil dihapus.' });
  }),
);

/** PUT /api/v1/admin/pages/:id/sections/reorder: menyimpan urutan section. */
router.put(
  '/pages/:id/sections/reorder',
  requirePermission('builder.update'),
  validate({ body: reorderSectionsSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const { items } = getBody<{ items: Array<{ id: number; sortOrder: number }> }>(req);
    await requireOwnedPage(id, studyProgramId);

    const owned = await prisma.pageSection.count({
      where: { id: { in: items.map((item) => item.id) }, pageId: id },
    });
    if (owned !== items.length) {
      throw AppError.forbidden('Ada section yang bukan milik halaman ini.', 'CROSS_TENANT_DENIED');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.pageSection.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
      ),
    );

    res.json({ success: true, message: 'Urutan section berhasil disimpan.' });
  }),
);

/**
 * POST /api/v1/admin/sections/:id/widgets
 *
 * Menambahkan widget ke section. Konfigurasi divalidasi terhadap skema tipe
 * widget sehingga tidak ada konfigurasi bebas yang tersimpan.
 */
router.post(
  '/sections/:id/widgets',
  requirePermission('builder.create'),
  validate({ body: createSectionWidgetSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{
      widgetCode: string;
      variantCode?: string | null;
      sortOrder: number;
      config: Record<string, unknown>;
    }>(req);
    await requireOwnedSection(id, studyProgramId);

    const widget =
      body.widgetCode === 'custom_layout'
        ? await ensureCustomLayoutWidget()
        : await prisma.widget.findUnique({ where: { code: body.widgetCode } });
    if (!widget || !widget.isActive) {
      throw AppError.badRequest(`Widget "${body.widgetCode}" tidak tersedia di library.`, 'WIDGET_NOT_FOUND');
    }

    if (body.variantCode) {
      const variant = await prisma.widgetVariant.findFirst({
        where: { widgetId: widget.id, code: body.variantCode, isActive: true },
      });
      if (!variant) {
        throw AppError.badRequest(
          `Varian "${body.variantCode}" tidak tersedia untuk widget ${widget.code}.`,
          'VARIANT_NOT_FOUND',
        );
      }
    }

    const validated = validateWidgetConfig(body.widgetCode, body.config);
    if (!validated.ok) {
      throw AppError.unprocessable('Konfigurasi widget tidak valid.', { config: validated.errors });
    }

    const finalConfig: Record<string, unknown> = { ...validated.data };
    if (body.widgetCode === 'custom_layout') {
      const templateId = Number(finalConfig.templateId);
      const ownedTemplate = await prisma.widgetTemplate.findFirst({
        where: { id: templateId, studyProgramId, isActive: true },
        select: { id: true, name: true },
      });
      if (!ownedTemplate) {
        throw AppError.badRequest('Template Bank Widget tidak ditemukan pada program studi ini.', 'TEMPLATE_NOT_FOUND');
      }
      finalConfig.templateId = ownedTemplate.id;
      finalConfig.templateName = ownedTemplate.name;
    }

    const lastWidget = await prisma.sectionWidget.findFirst({
      where: { pageSectionId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const instance = await prisma.sectionWidget.create({
      data: {
        pageSectionId: id,
        widgetId: widget.id,
        variantCode: body.variantCode ?? null,
        sortOrder: lastWidget ? lastWidget.sortOrder + 1 : body.sortOrder,
        configJson: JSON.stringify(finalConfig),
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'BUILDER', targetType: 'section_widget', targetId: instance.id });
    res.status(201).json({ success: true, message: 'Widget berhasil ditambahkan.', widget: instance });
  }),
);

/** PUT /api/v1/admin/section-widgets/:id: mengubah konfigurasi widget. */
router.put(
  '/section-widgets/:id',
  requirePermission('builder.update'),
  validate({ body: updateSectionWidgetSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{
      variantCode?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      config?: Record<string, unknown>;
    }>(req);

    const instance = await prisma.sectionWidget.findFirst({
      where: { id, pageSection: { page: { studyProgramId } } },
      include: { widget: true },
    });

    if (!instance) {
      throw AppError.notFound('Widget tidak ditemukan pada halaman program studi ini.');
    }

    const data: Record<string, unknown> = {};
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    if (body.variantCode !== undefined) {
      if (body.variantCode) {
        const variant = await prisma.widgetVariant.findFirst({
          where: { widgetId: instance.widgetId, code: body.variantCode, isActive: true },
        });
        if (!variant) {
          throw AppError.badRequest(`Varian "${body.variantCode}" tidak tersedia untuk widget ini.`, 'VARIANT_NOT_FOUND');
        }
      }
      data.variantCode = body.variantCode;
    }

    if (body.config !== undefined) {
      // Widget Bank Widget hanya menyimpan referensi template; isinya divalidasi
      // oleh `createWidgetTemplateSchema` agar bentuk lama yang rusak tidak
      // ditimpa nilai bawaan menjadi template kosong.
      const validated =
        instance.widget.code === 'custom_layout'
          ? { ok: true as const, data: body.config }
          : validateWidgetConfig(instance.widget.code, body.config);
      if (!validated.ok) {
        throw AppError.unprocessable('Konfigurasi widget tidak valid.', { config: validated.errors });
      }
      const nextConfig: Record<string, unknown> = { ...validated.data };
      if (instance.widget.code === 'custom_layout') {
        const templateId = Number(nextConfig.templateId);
        const ownedTemplate = await prisma.widgetTemplate.findFirst({
          where: { id: templateId, studyProgramId, isActive: true },
          select: { id: true, name: true },
        });
        if (!ownedTemplate) {
          throw AppError.badRequest('Template Bank Widget tidak ditemukan pada program studi ini.', 'TEMPLATE_NOT_FOUND');
        }
        nextConfig.templateId = ownedTemplate.id;
        nextConfig.templateName = ownedTemplate.name;
      }
      data.configJson = JSON.stringify(nextConfig);
    }

    const updated = await prisma.sectionWidget.update({ where: { id }, data });
    await recordAudit({ req, action: 'UPDATE', module: 'BUILDER', targetType: 'section_widget', targetId: id });

    res.json({ success: true, message: 'Widget berhasil diperbarui.', widget: updated });
  }),
);

/** DELETE /api/v1/admin/section-widgets/:id: menghapus widget dari section. */
router.delete(
  '/section-widgets/:id',
  requirePermission('builder.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const instance = await prisma.sectionWidget.findFirst({
      where: { id, pageSection: { page: { studyProgramId } } },
    });
    if (!instance) {
      throw AppError.notFound('Widget tidak ditemukan pada halaman program studi ini.');
    }

    await prisma.sectionWidget.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'BUILDER', targetType: 'section_widget', targetId: id });
    res.json({ success: true, message: 'Widget berhasil dihapus.' });
  }),
);

/** POST /api/v1/admin/section-widgets/:id/duplicate: menggandakan widget. */
router.post(
  '/section-widgets/:id/duplicate',
  requirePermission('builder.create'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const instance = await prisma.sectionWidget.findFirst({
      where: { id, pageSection: { page: { studyProgramId } } },
    });
    if (!instance) {
      throw AppError.notFound('Widget tidak ditemukan pada halaman program studi ini.');
    }

    const created = await prisma.sectionWidget.create({
      data: {
        pageSectionId: instance.pageSectionId,
        widgetId: instance.widgetId,
        variantCode: instance.variantCode,
        sortOrder: instance.sortOrder + 1,
        configJson: instance.configJson,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'BUILDER', targetType: 'section_widget', targetId: created.id });
    res.status(201).json({ success: true, message: 'Widget berhasil digandakan.', widget: created });
  }),
);

/** PUT /api/v1/admin/sections/:id/widgets/reorder: menyimpan urutan widget. */
router.put(
  '/sections/:id/widgets/reorder',
  requirePermission('builder.update'),
  validate({ body: reorderWidgetsSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const { items } = getBody<{ items: Array<{ id: number; sortOrder: number }> }>(req);
    await requireOwnedSection(id, studyProgramId);

    const owned = await prisma.sectionWidget.count({
      where: { id: { in: items.map((item) => item.id) }, pageSectionId: id },
    });
    if (owned !== items.length) {
      throw AppError.forbidden('Ada widget yang bukan milik section ini.', 'CROSS_TENANT_DENIED');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.sectionWidget.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
      ),
    );

    res.json({ success: true, message: 'Urutan widget berhasil disimpan.' });
  }),
);

/**
 * POST /api/v1/admin/pages/:id/publish
 *
 * Memvalidasi seluruh konfigurasi widget lalu menerbitkan halaman. Snapshot
 * versi publik disimpan agar dapat dikembalikan di kemudian hari.
 */
router.post(
  '/pages/:id/publish',
  requirePermission('pages.publish'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const page = await requireOwnedPage(id, studyProgramId);

    if (page.isPublished) {
      throw AppError.badRequest('Halaman ini sudah dipublikasikan.', 'ALREADY_PUBLISHED');
    }

    const errors = await validatePageForPublish(id);
    if (errors.length > 0) {
      throw AppError.unprocessable('Halaman belum dapat dipublikasikan.', { sections: errors });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pageVersion.updateMany({ where: { pageId: id, status: 'published' }, data: { status: 'archived' } });
      await tx.page.update({ where: { id }, data: { isPublished: true, publishedAt: new Date() } });
    });

    await createPageVersion(id, 'published', req.authUser?.id ?? null, 'Publikasi halaman');
    await recordAudit({ req, action: 'PUBLISH', module: 'BUILDER', targetType: 'page', targetId: id });

    res.json({ success: true, message: 'Halaman berhasil dipublikasikan.' });
  }),
);

/** POST /api/v1/admin/pages/:id/unpublish: menarik halaman dari publik. */
router.post(
  '/pages/:id/unpublish',
  requirePermission('pages.publish'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    await requireOwnedPage(id, studyProgramId);

    await prisma.page.update({ where: { id }, data: { isPublished: false } });
    await recordAudit({ req, action: 'PUBLISH', module: 'BUILDER', targetType: 'page', targetId: id, details: { unpublished: true } });

    res.json({ success: true, message: 'Halaman ditarik dari publikasi.' });
  }),
);

/** GET /api/v1/admin/pages/:id/preview: konten halaman termasuk draft. */
router.get(
  '/pages/:id/preview',
  requirePermission('builder.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const page = await requireOwnedPage(id, studyProgramId);
    const rendered = await getPageForEditing(studyProgramId, page.slug);
    const warnings = await validatePageForPublish(id);

    res.json({ success: true, page: rendered, warnings });
  }),
);

/** GET /api/v1/admin/pages/:id/versions: riwayat versi halaman. */
router.get(
  '/pages/:id/versions',
  requirePermission('builder.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    await requireOwnedPage(id, studyProgramId);

    const versions = await prisma.pageVersion.findMany({
      where: { pageId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, status: true, note: true, createdAt: true },
    });

    res.json({ success: true, versions });
  }),
);

/** POST /api/v1/admin/pages/:id/versions/:versionId/restore: mengembalikan draft ke versi lama. */
router.post(
  '/pages/:id/versions/:versionId/restore',
  requirePermission('builder.rollback'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const pageId = Number(req.params.id);
    const versionId = Number(req.params.versionId);

    await requireOwnedPage(pageId, studyProgramId);

    const version = await prisma.pageVersion.findFirst({ where: { id: versionId, pageId } });
    if (!version) {
      throw AppError.notFound('Versi halaman tidak ditemukan.');
    }

    const snapshot = JSON.parse(version.snapshot) as {
      sections: Array<{
        sectionKey: string;
        title: string | null;
        sortOrder: number;
        widgets: Array<{
          widgetCode: string;
          variantCode: string | null;
          sortOrder: number;
          config: Record<string, unknown>;
        }>;
      }>;
    };

    await prisma.$transaction(async (tx) => {
      await tx.pageSection.deleteMany({ where: { pageId } });

      for (const section of snapshot.sections) {
        const created = await tx.pageSection.create({
          data: {
            pageId,
            sectionKey: section.sectionKey,
            title: section.title,
            sortOrder: section.sortOrder,
            isActive: true,
          },
        });

        for (const widget of section.widgets) {
          const widgetDefinition = await tx.widget.findUnique({ where: { code: widget.widgetCode } });
          if (!widgetDefinition) continue;

          await tx.sectionWidget.create({
            data: {
              pageSectionId: created.id,
              widgetId: widgetDefinition.id,
              variantCode: widget.variantCode,
              sortOrder: widget.sortOrder,
              isActive: true,
              configJson: JSON.stringify(widget.config ?? {}),
            },
          });
        }
      }
    });

    await createPageVersion(pageId, 'draft', req.authUser?.id ?? null, `Restore dari versi ${version.version}`);
    await recordAudit({ req, action: 'UPDATE', module: 'BUILDER', targetType: 'page', targetId: pageId, details: { restoredVersion: version.version } });

    res.json({ success: true, message: 'Halaman berhasil dikembalikan ke versi sebelumnya.' });
  }),
);

/** GET /api/v1/admin/widgets: katalog widget bawaan dan variannya untuk library builder. */
router.get(
  '/widgets',
  requirePermission('widgets.view'),
  asyncHandler(async (_req, res) => {
    const widgets = await prisma.widget.findMany({
      where: { isActive: true, code: { not: 'custom_layout' } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { code: true, name: true, previewUrl: true },
        },
      },
    });

    res.json({ success: true, widgets });
  }),
);

// ---------------------------------------------------------
// Bank Widget Kustom per Program Studi
// ---------------------------------------------------------

/** GET /api/v1/admin/widget-bank: daftar widget kustom milik program studi. */
router.get(
  '/widget-bank',
  requirePermission('builder.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const [templates, usageMap] = await Promise.all([
      prisma.widgetTemplate.findMany({
        where: { studyProgramId, isActive: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      collectTemplateUsage(studyProgramId),
    ]);

    res.json({
      success: true,
      templates: templates.map((tpl) => {
        const usedInPages = usageMap.get(tpl.id) ?? [];
        return {
          id: tpl.id,
          name: tpl.name,
          description: tpl.description,
          config: parseTemplateConfig(tpl.configJson),
          usageCount: usedInPages.length,
          usedInPages,
          createdAt: tpl.createdAt,
          updatedAt: tpl.updatedAt,
        };
      }),
    });
  }),
);

/** POST /api/v1/admin/widget-bank: simpan widget kustom baru ke Bank Widget. */
router.post(
  '/widget-bank',
  requirePermission('builder.create'),
  validate({ body: createWidgetTemplateSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{
      name: string;
      description?: string | null;
      config: CustomLayoutTemplateConfig;
    }>(req);

    await ensureCustomLayoutWidget();

    const created = await prisma.widgetTemplate.create({
      data: {
        studyProgramId,
        name: body.name,
        description: body.description?.trim() || null,
        configJson: JSON.stringify(body.config),
      },
    });

    await recordAudit({
      req,
      action: 'CREATE',
      module: 'BUILDER',
      targetType: 'widget_template',
      targetId: created.id,
      details: { name: created.name },
    });

    res.status(201).json({
      success: true,
      message: 'Widget berhasil disimpan ke Bank Widget.',
      template: {
        id: created.id,
        name: created.name,
        description: created.description,
        config: body.config,
        usageCount: 0,
        usedInPages: [],
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  }),
);

/** PUT /api/v1/admin/widget-bank/:id: perbarui widget kustom di Bank Widget. */
router.put(
  '/widget-bank/:id',
  requirePermission('builder.update'),
  validate({ params: idParamSchema, body: updateWidgetTemplateSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{
      name?: string;
      description?: string | null;
      config?: CustomLayoutTemplateConfig;
    }>(req);

    const existing = await prisma.widgetTemplate.findFirst({
      where: { id, studyProgramId, isActive: true },
    });
    if (!existing) {
      throw AppError.notFound('Widget tidak ditemukan pada Bank Widget program studi ini.');
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.config !== undefined) data.configJson = JSON.stringify(body.config);

    const updated = await prisma.widgetTemplate.update({ where: { id }, data });

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'BUILDER',
      targetType: 'widget_template',
      targetId: id,
      details: { name: updated.name },
    });

    const usageMap = await collectTemplateUsage(studyProgramId);
    const usedInPages = usageMap.get(id) ?? [];

    res.json({
      success: true,
      message: 'Perubahan widget berhasil disimpan.',
      template: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        config: parseTemplateConfig(updated.configJson),
        usageCount: usedInPages.length,
        usedInPages,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  }),
);

/** POST /api/v1/admin/widget-bank/:id/duplicate: menggandakan template di Bank Widget. */
router.post(
  '/widget-bank/:id/duplicate',
  requirePermission('builder.create'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const source = await prisma.widgetTemplate.findFirst({
      where: { id, studyProgramId, isActive: true },
    });
    if (!source) {
      throw AppError.notFound('Widget tidak ditemukan pada Bank Widget program studi ini.');
    }

    const copyName = `${source.name} (Salinan)`.slice(0, 150);
    const created = await prisma.widgetTemplate.create({
      data: {
        studyProgramId,
        name: copyName,
        description: source.description,
        configJson: source.configJson,
      },
    });

    await recordAudit({
      req,
      action: 'CREATE',
      module: 'BUILDER',
      targetType: 'widget_template',
      targetId: created.id,
      details: { duplicatedFrom: source.id },
    });

    res.status(201).json({
      success: true,
      message: 'Widget berhasil digandakan.',
      template: {
        id: created.id,
        name: created.name,
        description: created.description,
        config: parseTemplateConfig(created.configJson),
        usageCount: 0,
        usedInPages: [],
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  }),
);

/** DELETE /api/v1/admin/widget-bank/:id: menghapus template jika tidak sedang terpasang. */
router.delete(
  '/widget-bank/:id',
  requirePermission('builder.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.widgetTemplate.findFirst({
      where: { id, studyProgramId, isActive: true },
    });
    if (!existing) {
      throw AppError.notFound('Widget tidak ditemukan pada Bank Widget program studi ini.');
    }

    const usageMap = await collectTemplateUsage(studyProgramId);
    const usedInPages = usageMap.get(id) ?? [];
    if (usedInPages.length > 0) {
      throw AppError.badRequest(
        `Widget sedang dipakai di halaman: ${usedInPages.join(', ')}. Lepas dari Page Builder terlebih dahulu sebelum menghapus.`,
        'TEMPLATE_IN_USE',
      );
    }

    await prisma.widgetTemplate.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'BUILDER', targetType: 'widget_template', targetId: id });
    res.json({ success: true, message: 'Widget berhasil dihapus dari Bank Widget.' });
  }),
);

/**
 * POST /api/v1/admin/widget-bank/convert-widget/:id
 * Mengonversi 1 widget bawaan pada Page Builder menjadi template di Bank Widget.
 */
router.post(
  '/widget-bank/convert-widget/:id',
  requirePermission('builder.update'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const instance = await prisma.sectionWidget.findFirst({
      where: { id, pageSection: { page: { studyProgramId } } },
      select: {
        id: true,
        configJson: true,
        widget: { select: { code: true, name: true } },
      },
    });
    if (!instance) {
      throw AppError.notFound('Widget tidak ditemukan pada halaman program studi ini.');
    }
    if (instance.widget.code === 'custom_layout') {
      throw AppError.badRequest('Widget ini sudah berasal dari Bank Widget.');
    }

    const result = await convertSectionWidgetsToBank(studyProgramId, [instance]);
    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'BUILDER',
      targetType: 'section_widget_convert',
      targetId: id,
      details: result,
    });

    res.json({
      success: true,
      message: 'Widget berhasil dipindahkan ke Bank Widget.',
      ...result,
    });
  }),
);

/**
 * POST /api/v1/admin/widget-bank/convert-page/:id
 * Mengonversi seluruh widget bawaan pada satu halaman menjadi template Bank Widget.
 */
router.post(
  '/widget-bank/convert-page/:id',
  requirePermission('builder.update'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const page = await prisma.page.findFirst({ where: { id, studyProgramId }, select: { id: true } });
    if (!page) {
      throw AppError.notFound('Halaman tidak ditemukan pada program studi ini.');
    }

    const instances = await prisma.sectionWidget.findMany({
      where: {
        pageSection: { pageId: id, page: { studyProgramId } },
        widget: { code: { not: 'custom_layout' } },
      },
      orderBy: [{ pageSection: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: {
        id: true,
        configJson: true,
        widget: { select: { code: true, name: true } },
      },
    });

    const result = await convertSectionWidgetsToBank(studyProgramId, instances);
    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'BUILDER',
      targetType: 'page_convert_widget_bank',
      targetId: id,
      details: result,
    });

    res.json({
      success: true,
      message:
        result.convertedCount > 0
          ? `${result.convertedCount} widget berhasil dipindahkan ke Bank Widget.`
          : 'Seluruh widget pada halaman ini sudah berasal dari Bank Widget.',
      ...result,
    });
  }),
);

/**
 * POST /api/v1/admin/widget-bank/import-pages
 * Memindahkan seluruh widget bawaan di semua halaman prodi aktif ke Bank Widget.
 */
router.post(
  '/widget-bank/import-pages',
  requirePermission('builder.update'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);

    const instances = await prisma.sectionWidget.findMany({
      where: {
        pageSection: { page: { studyProgramId } },
        widget: { code: { not: 'custom_layout' } },
      },
      orderBy: [{ pageSection: { pageId: 'asc' } }, { pageSection: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: {
        id: true,
        configJson: true,
        widget: { select: { code: true, name: true } },
      },
    });

    const result = await convertSectionWidgetsToBank(studyProgramId, instances);
    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'BUILDER',
      targetType: 'tenant_convert_widget_bank',
      targetId: studyProgramId,
      details: result,
    });

    res.json({
      success: true,
      message:
        result.convertedCount > 0
          ? `${result.convertedCount} widget dari halaman prodi berhasil dipindahkan ke Bank Widget.`
          : 'Semua widget pada seluruh halaman prodi sudah menggunakan Bank Widget.',
      ...result,
    });
  }),
);

export default router;
