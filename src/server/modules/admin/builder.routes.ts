import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import {
  createPageSchema,
  createSectionSchema,
  createSectionWidgetSchema,
  reorderSectionsSchema,
  reorderWidgetsSchema,
  updatePageSchema,
  updateSectionSchema,
  updateSectionWidgetSchema,
  validateWidgetConfig,
} from '../../../shared/schemas/builder.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import {
  createPageVersion,
  getPageForEditing,
  listPages,
  validatePageForPublish,
} from '../../services/pageService.js';

const router = Router();

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

    const widget = await prisma.widget.findUnique({ where: { code: body.widgetCode } });
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
        configJson: JSON.stringify(validated.data),
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
      const validated = validateWidgetConfig(instance.widget.code, body.config);
      if (!validated.ok) {
        throw AppError.unprocessable('Konfigurasi widget tidak valid.', { config: validated.errors });
      }
      data.configJson = JSON.stringify(validated.data);
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

/** GET /api/v1/admin/widgets: katalog widget dan variannya untuk library builder. */
router.get(
  '/widgets',
  requirePermission('widgets.view'),
  asyncHandler(async (_req, res) => {
    const widgets = await prisma.widget.findMany({
      where: { isActive: true },
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

export default router;
