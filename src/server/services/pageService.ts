import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import { validateWidgetConfig } from '../../shared/schemas/builder.js';

/** Struktur satu widget dalam snapshot maupun respons publik. */
export interface RenderedWidget {
  id: number;
  widgetCode: string;
  widgetName: string;
  variantCode: string | null;
  sortOrder: number;
  config: Record<string, unknown>;
}

export interface RenderedSection {
  id: number;
  sectionKey: string;
  title: string | null;
  sortOrder: number;
  widgets: RenderedWidget[];
}

export interface RenderedPage {
  id: number;
  slug: string;
  title: string;
  layout: string;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  sections: RenderedSection[];
}

/** Membaca JSON konfigurasi dengan aman; data rusak tidak boleh mematahkan render. */
function parseConfig(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const pageWithSections = {
  sections: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      widgets: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { widget: { select: { code: true, name: true } } },
      },
    },
  },
} as const;

function mapPage(page: {
  id: number;
  slug: string;
  title: string;
  layout: string;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  sections: Array<{
    id: number;
    sectionKey: string;
    title: string | null;
    sortOrder: number;
    widgets: Array<{
      id: number;
      variantCode: string | null;
      sortOrder: number;
      configJson: string;
      widget: { code: string; name: string };
    }>;
  }>;
}): RenderedPage {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    layout: page.layout,
    isPublished: page.isPublished,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    sections: page.sections.map((section) => ({
      id: section.id,
      sectionKey: section.sectionKey,
      title: section.title,
      sortOrder: section.sortOrder,
      widgets: section.widgets.map((widget) => ({
        id: widget.id,
        widgetCode: widget.widget.code,
        widgetName: widget.widget.name,
        variantCode: widget.variantCode,
        sortOrder: widget.sortOrder,
        config: parseConfig(widget.configJson),
      })),
    })),
  };
}

/**
 * Menyisipkan struktur baris terbaru dari Bank Widget (`widget_templates`)
 * untuk setiap widget bertipe `custom_layout`. Satu query batch per halaman
 * agar tidak ada N+1 query dan perubahan di Bank Widget langsung sinkron.
 */
async function hydrateCustomLayoutWidgets(
  rendered: RenderedPage,
  studyProgramId: number | null,
): Promise<RenderedPage> {
  const templateIds = new Set<number>();
  for (const section of rendered.sections) {
    for (const widget of section.widgets) {
      if (widget.widgetCode !== 'custom_layout') continue;
      const tid = Number(widget.config.templateId);
      if (Number.isInteger(tid) && tid > 0) templateIds.add(tid);
    }
  }

  if (templateIds.size === 0) return rendered;

  const templates = await prisma.widgetTemplate.findMany({
    where: {
      id: { in: [...templateIds] },
      isActive: true,
      ...(studyProgramId !== null ? { studyProgramId } : {}),
    },
    select: { id: true, name: true, description: true, configJson: true },
  });

  const byId = new Map(templates.map((tpl) => [tpl.id, tpl]));

  return {
    ...rendered,
    sections: rendered.sections.map((section) => ({
      ...section,
      widgets: section.widgets.map((widget) => {
        if (widget.widgetCode !== 'custom_layout') return widget;
        const tid = Number(widget.config.templateId);
        const tpl = byId.get(tid);
        if (!tpl) {
          return { ...widget, config: { ...widget.config, rows: [] } };
        }
        const tplConfig = parseConfig(tpl.configJson);
        return {
          ...widget,
          config: {
            ...widget.config,
            templateId: tpl.id,
            templateName: tpl.name,
            rows: Array.isArray(tplConfig.rows) ? tplConfig.rows : [],
          },
        };
      }),
    })),
  };
}

/**
 * Versi publik sebuah halaman. Hanya mengembalikan halaman yang sudah terbit.
 *
 * `facultyId` opsional dipakai website fakultas: halaman milik fakultas tidak
 * punya `studyProgramId`, sehingga pencocokan harus lewat kolom fakultas.
 */
export async function getPublishedPageBySlug(
  studyProgramId: number | null,
  slug: string,
  facultyId: number | null = null,
): Promise<RenderedPage | null> {
  const page = await prisma.page.findFirst({
    where: {
      studyProgramId,
      facultyId,
      slug,
      isPublished: true,
    },
    include: pageWithSections,
  });

  if (!page) return null;
  return hydrateCustomLayoutWidgets(mapPage(page), studyProgramId);
}

/** Versi lengkap termasuk draft. Dipakai builder dan preview. */
export async function getPageForEditing(studyProgramId: number, slug: string): Promise<RenderedPage | null> {
  const page = await prisma.page.findFirst({
    where: { studyProgramId, slug },
    include: pageWithSections,
  });

  if (!page) return null;
  return hydrateCustomLayoutWidgets(mapPage(page), studyProgramId);
}

/** Daftar halaman tenant beserta jumlah section untuk panel admin. */
export async function listPages(studyProgramId: number) {
  return prisma.page.findMany({
    where: { studyProgramId },
    orderBy: [{ isSystem: 'desc' }, { title: 'asc' }],
    include: {
      _count: { select: { sections: true } },
    },
  });
}

/**
 * Menyimpan snapshot versi halaman.
 *
 * Dipanggil saat draft disimpan dan saat halaman dipublikasikan, sehingga
 * riwayat versi dapat ditelusuri dan dikembalikan (docs/ARCHITECTURE.md bagian 6).
 */
export async function createPageVersion(
  pageId: number,
  status: 'draft' | 'published' | 'archived',
  createdById: number | null,
  note?: string,
) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: pageWithSections,
  });

  if (!page) {
    throw AppError.notFound('Halaman tidak ditemukan.');
  }

  const lastVersion = await prisma.pageVersion.findFirst({
    where: { pageId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const snapshot = JSON.stringify(mapPage(page));

  return prisma.pageVersion.create({
    data: {
      pageId,
      version: (lastVersion?.version ?? 0) + 1,
      status,
      snapshot,
      createdById,
      note: note ?? null,
    },
  });
}

/**
 * Memvalidasi seluruh konfigurasi widget pada sebuah halaman.
 *
 * Dipakai sebelum publish supaya halaman tidak pernah terbit dengan
 * konfigurasi widget yang tidak sesuai skemanya.
 */
export async function validatePageForPublish(pageId: number) {
  const sections = await prisma.pageSection.findMany({
    where: { pageId, isActive: true },
    include: {
      widgets: {
        where: { isActive: true },
        include: { widget: { select: { code: true } } },
      },
    },
  });

  const errors: string[] = [];

  if (sections.length === 0) {
    errors.push('Halaman belum memiliki section aktif. Tambahkan minimal satu section sebelum publikasi.');
  }

  for (const section of sections) {
    if (section.widgets.length === 0) {
      errors.push(`Section "${section.title ?? section.sectionKey}" belum memiliki widget.`);
      continue;
    }

    for (const widget of section.widgets) {
      const config = parseConfig(widget.configJson);
      const result = validateWidgetConfig(widget.widget.code, config);
      if (!result.ok) {
        for (const message of result.errors) {
          errors.push(`Widget ${widget.widget.code} pada section "${section.title ?? section.sectionKey}": ${message}`);
        }
      }
    }
  }

  return errors;
}

export { parseConfig };
