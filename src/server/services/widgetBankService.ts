import { prisma } from '../prisma.js';
import {
  EMBEDDABLE_WIDGET_CODES,
  customLayoutTemplateConfigSchema,
  type CustomBlock,
  type CustomLayoutTemplateConfig,
  type EmbeddableWidgetCode,
} from '../../shared/schemas/builder.js';

const EMBEDDABLE_SET = new Set<string>(EMBEDDABLE_WIDGET_CODES);

export const WIDGET_DISPLAY_LABELS: Record<EmbeddableWidgetCode, string> = {
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

/** Memastikan master widget `custom_layout` tersedia di tabel `widgets`. */
export async function ensureCustomLayoutWidget() {
  return prisma.widget.upsert({
    where: { code: 'custom_layout' },
    create: {
      code: 'custom_layout',
      name: 'Bank Widget',
      category: 'Supporting',
      description: 'Widget bebas dari Bank Widget program studi.',
      defaultJson: JSON.stringify({ templateId: 0 }),
      isActive: true,
    },
    update: {},
  });
}

export function safeParseJsonObject(raw: string | null | undefined): Record<string, unknown> {
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

export function parseTemplateConfig(raw: string): CustomLayoutTemplateConfig {
  try {
    const parsed = customLayoutTemplateConfigSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data : { rows: [] };
  } catch {
    return { rows: [] };
  }
}

function makeUniqueName(baseName: string, usedNames: Set<string>): string {
  const clean = baseName.trim().slice(0, 140) || 'Widget Prodi';
  if (!usedNames.has(clean.toLowerCase())) {
    usedNames.add(clean.toLowerCase());
    return clean;
  }
  let suffix = 2;
  while (usedNames.has(`${clean} (${suffix})`.toLowerCase())) {
    suffix += 1;
  }
  const unique = `${clean} (${suffix})`.slice(0, 150);
  usedNames.add(unique.toLowerCase());
  return unique;
}

/**
 * Mengonversi sekumpulan SectionWidget bawaan milik tenant menjadi template di Bank Widget
 * (`widget_templates`) lalu mengarahkan instance-nya ke `custom_layout` secara atomik.
 */
export async function convertSectionWidgetsToBank(
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
  const usedNames = new Set<string>();
  for (const tpl of existingTemplates) {
    byConfig.set(tpl.configJson, { id: tpl.id, name: tpl.name });
    usedNames.add(tpl.name.toLowerCase());
  }

  const createdTemplateIds: number[] = [];
  let firstTemplateId: number | null = null;

  await prisma.$transaction(async (tx) => {
    for (const inst of candidates) {
      const widgetCode = inst.widget.code as EmbeddableWidgetCode;
      const rawCfg = safeParseJsonObject(inst.configJson);
      const displayLabel = WIDGET_DISPLAY_LABELS[widgetCode] ?? inst.widget.name;
      const customTitle =
        typeof rawCfg.title === 'string' && rawCfg.title.trim() ? rawCfg.title.trim() : '';
      const rawName = customTitle && customTitle.length <= 120 ? customTitle : displayLabel;

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
        const templateName = makeUniqueName(rawName, usedNames);
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

/** Menyiapkan paket awal modul prodi di Bank Widget untuk prodi yang belum punya apa pun. */
async function seedStarterBankWidgets(studyProgramId: number) {
  await ensureCustomLayoutWidget();
  await prisma.widgetTemplate.createMany({
    data: EMBEDDABLE_WIDGET_CODES.map((code) => ({
      studyProgramId,
      name: WIDGET_DISPLAY_LABELS[code],
      description: `Modul ${WIDGET_DISPLAY_LABELS[code]} — bebas dimodifikasi atau dipadukan kolom di Bank Widget.`,
      configJson: JSON.stringify({
        rows: [
          {
            id: `row-${code}`,
            layout: '1-col',
            background: 'white',
            columns: [[{ id: `mod-${code}`, type: 'widget', widgetCode: code, config: {} }]],
          },
        ],
      } satisfies CustomLayoutTemplateConfig),
    })),
  });
}

/**
 * Memastikan seluruh widget bawaan pada halaman program studi sudah bersumber dari
 * Bank Widget (`custom_layout`). Idempoten dan sangat cepat ketika sudah sinkron.
 */
export async function ensureTenantWidgetBankSynced(studyProgramId: number, seedStarter = false) {
  const hasLegacy = await prisma.sectionWidget.findFirst({
    where: {
      pageSection: { page: { studyProgramId } },
      widget: { code: { not: 'custom_layout' } },
    },
    select: { id: true },
  });

  if (hasLegacy) {
    const legacyInstances = await prisma.sectionWidget.findMany({
      where: {
        pageSection: { page: { studyProgramId } },
        widget: { code: { not: 'custom_layout' } },
      },
      orderBy: [
        { pageSection: { pageId: 'asc' } },
        { pageSection: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
      select: {
        id: true,
        configJson: true,
        widget: { select: { code: true, name: true } },
      },
    });
    await convertSectionWidgetsToBank(studyProgramId, legacyInstances);
    return;
  }

  // Prodi baru (tanpa halaman apa pun): siapkan paket awal modul prodi.
  if (!seedStarter) return;
  const [pageCount, templateCount] = await Promise.all([
    prisma.page.count({ where: { studyProgramId } }),
    prisma.widgetTemplate.count({ where: { studyProgramId } }),
  ]);
  if (pageCount === 0 && templateCount === 0) {
    await seedStarterBankWidgets(studyProgramId);
  }
}

/** Menemukan blok `hero_slider` pertama di dalam config template Bank Widget. */
function findHeroBlockInConfig(
  config: CustomLayoutTemplateConfig,
): { rowIdx: number; colIdx: number; blockIdx: number; block: Extract<CustomBlock, { type: 'widget' }> } | null {
  for (let rowIdx = 0; rowIdx < config.rows.length; rowIdx += 1) {
    const row = config.rows[rowIdx];
    for (let colIdx = 0; colIdx < row.columns.length; colIdx += 1) {
      const col = row.columns[colIdx];
      for (let blockIdx = 0; blockIdx < col.length; blockIdx += 1) {
        const block = col[blockIdx];
        if (block.type === 'widget' && block.widgetCode === 'hero_slider') {
          return { rowIdx, colIdx, blockIdx, block };
        }
      }
    }
  }
  return null;
}

export interface ResolvedProdiHero {
  source: 'bank' | 'legacy';
  templateId?: number;
  sectionWidgetId?: number;
  page: { id: number; slug: string } | null;
  config: Record<string, unknown>;
}

/**
 * Membaca konfigurasi `hero_slider` milik program studi, baik yang bersumber dari
 * Bank Widget (`custom_layout`) maupun fallback widget bawaan langsung.
 */
export async function findProdiHeroSlider(studyProgramId: number): Promise<ResolvedProdiHero | null> {
  // 1. Cari widget custom_layout pada halaman prodi (prioritaskan beranda).
  const customWidgets = await prisma.sectionWidget.findMany({
    where: {
      widget: { code: 'custom_layout' },
      pageSection: { page: { studyProgramId } },
    },
    orderBy: [{ pageSection: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: {
      id: true,
      configJson: true,
      pageSection: { select: { page: { select: { id: true, slug: true } } } },
    },
  });

  // Prioritaskan halaman beranda di urutan depan.
  customWidgets.sort((a, b) => {
    const aHome = a.pageSection.page.slug === 'beranda' ? 0 : 1;
    const bHome = b.pageSection.page.slug === 'beranda' ? 0 : 1;
    return aHome - bHome;
  });

  const templateIds: number[] = [];
  const widgetByTemplate = new Map<number, { sectionWidgetId: number; page: { id: number; slug: string } }>();
  for (const cw of customWidgets) {
    const tid = Number(safeParseJsonObject(cw.configJson).templateId);
    if (Number.isInteger(tid) && tid > 0 && !widgetByTemplate.has(tid)) {
      templateIds.push(tid);
      widgetByTemplate.set(tid, { sectionWidgetId: cw.id, page: cw.pageSection.page });
    }
  }

  if (templateIds.length > 0) {
    const templates = await prisma.widgetTemplate.findMany({
      where: { id: { in: templateIds }, studyProgramId, isActive: true },
      select: { id: true, configJson: true },
    });
    const byId = new Map(templates.map((t) => [t.id, t]));
    for (const tid of templateIds) {
      const tpl = byId.get(tid);
      if (!tpl) continue;
      const parsed = parseTemplateConfig(tpl.configJson);
      const found = findHeroBlockInConfig(parsed);
      if (found) {
        const meta = widgetByTemplate.get(tid)!;
        return {
          source: 'bank',
          templateId: tpl.id,
          sectionWidgetId: meta.sectionWidgetId,
          page: meta.page,
          config: found.block.config ?? {},
        };
      }
    }
  }

  // 2. Fallback: cek apakah ada template hero_slider di Bank Widget meski belum dipasang di halaman.
  const bankTemplates = await prisma.widgetTemplate.findMany({
    where: { studyProgramId, isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, configJson: true },
  });
  for (const tpl of bankTemplates) {
    const rawFound = findHeroBlockInConfig(parseTemplateConfig(tpl.configJson));
    if (!rawFound) continue;
    // Hanya template dengan slide nyata yang dianggap sebagai hero; template
    // paket bawaan dengan konfigurasi kosong tidak boleh menutupi hero lama.
    const rawSlides = rawFound.block.config?.slides;
    if (!Array.isArray(rawSlides) || rawSlides.length === 0) continue;
    return {
      source: 'bank',
      templateId: tpl.id,
      page: null,
      config: rawFound.block.config ?? {},
    };
  }

  // 3. Fallback terakhir: widget hero_slider langsung (legacy).
  const direct = await prisma.sectionWidget.findFirst({
    where: {
      widget: { code: 'hero_slider' },
      pageSection: { page: { studyProgramId } },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      configJson: true,
      pageSection: { select: { page: { select: { id: true, slug: true } } } },
    },
  });
  if (direct) {
    return {
      source: 'legacy',
      sectionWidgetId: direct.id,
      page: direct.pageSection.page,
      config: safeParseJsonObject(direct.configJson),
    };
  }

  return null;
}

/**
 * Menyimpan konfigurasi hero_slider milik program studi langsung ke Bank Widget
 * (atau membuat template baru & menautkannya ke beranda bila belum ada).
 */
export async function saveProdiHeroSlider(
  studyProgramId: number,
  updater: (current: Record<string, unknown>) => Record<string, unknown>,
): Promise<{ targetId: number; page: { id: number; slug: string }; config: Record<string, unknown> }> {
  await ensureTenantWidgetBankSynced(studyProgramId);
  const existing = await findProdiHeroSlider(studyProgramId);

  if (existing && existing.source === 'bank' && existing.templateId) {
    const tpl = await prisma.widgetTemplate.findFirst({
      where: { id: existing.templateId, studyProgramId },
      select: { id: true, configJson: true },
    });
    if (tpl) {
      const parsed = parseTemplateConfig(tpl.configJson);
      const found = findHeroBlockInConfig(parsed);
      if (found) {
        const nextConfig = updater(found.block.config ?? {});
        parsed.rows[found.rowIdx].columns[found.colIdx][found.blockIdx] = {
          ...found.block,
          config: nextConfig,
        };
        await prisma.widgetTemplate.update({
          where: { id: tpl.id },
          data: { configJson: JSON.stringify(parsed) },
        });
        const homePage =
          existing.page ??
          (await prisma.page.findFirst({
            where: { studyProgramId, slug: 'beranda' },
            select: { id: true, slug: true },
          })) ?? { id: 0, slug: 'beranda' };
        return { targetId: tpl.id, page: homePage, config: nextConfig };
      }
    }
  }

  // Belum ada template hero_slider sama sekali: buat di Bank Widget & pasang di beranda.
  const customLayoutMaster = await ensureCustomLayoutWidget();
  const nextConfig = updater({ slides: [], autoplayMs: 6000, showDots: true });
  const tplConfig: CustomLayoutTemplateConfig = {
    rows: [
      {
        id: 'row-hero_slider',
        layout: '1-col',
        background: 'white',
        columns: [[{ id: 'mod-hero_slider', type: 'widget', widgetCode: 'hero_slider', config: nextConfig }]],
      },
    ],
  };

  let page = await prisma.page.findFirst({
    where: { studyProgramId, slug: 'beranda' },
    select: { id: true, slug: true },
  });
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
      select: { id: true, slug: true },
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
        title: 'Hero Banner',
        sortOrder: lastSection ? Math.min(lastSection.sortOrder, 0) - 1 : 0,
      },
    });
  }

  const createdTpl = await prisma.widgetTemplate.create({
    data: {
      studyProgramId,
      name: WIDGET_DISPLAY_LABELS.hero_slider,
      description: 'Banner utama halaman beranda program studi.',
      configJson: JSON.stringify(tplConfig),
    },
  });

  await prisma.sectionWidget.create({
    data: {
      pageSectionId: section.id,
      widgetId: customLayoutMaster.id,
      sortOrder: 1,
      isActive: true,
      configJson: JSON.stringify({
        templateId: createdTpl.id,
        templateName: createdTpl.name,
      }),
    },
  });

  return { targetId: createdTpl.id, page, config: nextConfig };
}

/**
 * Merapikan beranda lama: widget `custom_layout` duplikat yang menunjuk template
 * sama (mis. hasil konversi berulang) dipangkas, menyisakan satu per halaman,
 * lalu template yang tidak lagi dipakai halaman mana pun dihapus.
 */
async function pruneDuplicateLayouts(studyProgramId: number) {
  const instances = await prisma.sectionWidget.findMany({
    where: {
      widget: { code: 'custom_layout' },
      pageSection: { page: { studyProgramId } },
    },
    orderBy: [{ pageSection: { pageId: 'asc' } }, { pageSection: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      configJson: true,
      pageSection: { select: { pageId: true } },
    },
  });

  const seen = new Set<string>();
  const redundant: number[] = [];
  const templateIds = new Set<number>();
  for (const inst of instances) {
    const templateId = Number(safeParseJsonObject(inst.configJson).templateId);
    if (Number.isInteger(templateId) && templateId > 0) templateIds.add(templateId);
    const key = `${inst.pageSection.pageId}:${templateId}`;
    if (seen.has(key)) {
      redundant.push(inst.id);
      continue;
    }
    seen.add(key);
  }
  if (redundant.length > 0) {
    await prisma.sectionWidget.deleteMany({ where: { id: { in: redundant } } });
  }

  const stillUsed = await prisma.sectionWidget.findMany({
    where: { widget: { code: 'custom_layout' }, pageSection: { page: { studyProgramId } } },
    select: { configJson: true },
  });
  const usedIds = new Set<number>();
  for (const row of stillUsed) {
    const id = Number(safeParseJsonObject(row.configJson).templateId);
    if (Number.isInteger(id) && id > 0) usedIds.add(id);
  }
  const orphans = [...templateIds].filter((id) => !usedIds.has(id));
  if (orphans.length > 0) {
    await prisma.widgetTemplate.deleteMany({ where: { id: { in: orphans }, studyProgramId } });
  }
}

/**
 * Migrasi sekali jalan seluruh prodi: konversi semua widget bawaan ke Bank
 * Widget lalu rapikan duplikat. Idempoten; aman dipanggil berulang.
 */
export async function migrateAllTenantWidgetBanks() {
  const prodis = await prisma.studyProgram.findMany({ select: { id: true, code: true } });
  const results: Array<{ studyProgramId: number; code: string; result: string }> = [];
  for (const prodi of prodis) {
    try {
      await ensureTenantWidgetBankSynced(prodi.id);
      await pruneDuplicateLayouts(prodi.id);
      results.push({ studyProgramId: prodi.id, code: prodi.code, result: 'ok' });
    } catch (error) {
      results.push({
        studyProgramId: prodi.id,
        code: prodi.code,
        result: error instanceof Error ? error.message : 'gagal',
      });
    }
  }
  return results;
}
