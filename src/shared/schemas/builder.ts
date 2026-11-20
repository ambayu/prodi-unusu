import { z } from 'zod';
import { hexColorSchema, safeUrlSchema, slugSchema } from './common.js';

/**
 * Skema konfigurasi widget.
 *
 * Setiap tipe widget punya skema sendiri supaya konfigurasi yang masuk benar
 * benar tervalidasi. Tidak ada jalur untuk menyimpan HTML atau script bebas
 * (docs/ARCHITECTURE.md bagian 6).
 */

const heroSlideSchema = z.object({
  imageUrl: safeUrlSchema,
  alt: z.string().trim().max(200).default(''),
  linkUrl: safeUrlSchema.optional(),
});

export const heroSliderConfigSchema = z.object({
  slides: z.array(heroSlideSchema).max(12).default([]),
  autoplayMs: z.number().int().min(2000).max(20000).default(6000),
  showDots: z.boolean().default(true),
});

export const aboutProdiConfigSchema = z.object({
  eyebrow: z.string().trim().max(120).default(''),
  title: z.string().trim().max(200).default(''),
  body: z.string().trim().max(4000).default(''),
  imageUrl: safeUrlSchema.default(''),
  alignment: z.enum(['left', 'right']).default('left'),
});

export const visionMissionConfigSchema = z.object({
  vision: z.string().trim().max(2000).default(''),
  missions: z.array(z.string().trim().max(500)).max(20).default([]),
});

export const statisticsConfigSchema = z.object({
  layout: z.enum(['four-columns', 'strip']).default('four-columns'),
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        value: z.number().int().min(0),
        icon: z.string().trim().max(40).default('users'),
      }),
    )
    .max(8)
    .default([]),
});

export const dataWidgetConfigSchema = z.object({
  title: z.string().trim().max(200).default(''),
  limit: z.number().int().min(1).max(24).default(6),
  variant: z.string().trim().max(40).optional(),
});

export const contactWidgetConfigSchema = z.object({
  title: z.string().trim().max(200).default('Hubungi Kami'),
});

export const ctaBannerConfigSchema = z.object({
  title: z.string().trim().max(200).default(''),
  body: z.string().trim().max(1000).default(''),
  buttonLabel: z.string().trim().max(60).default(''),
  buttonUrl: safeUrlSchema.default('/'),
  backgroundImageUrl: safeUrlSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
});

// ---------------------------------------------------------
// Bank Widget Kustom (Custom Layout Rows & Blocks)
// ---------------------------------------------------------

export const customRowLayoutSchema = z.enum([
  '1-col',
  '2-col',
  '2-col-left',
  '2-col-right',
  '3-col',
]);

export const customRowBackgroundSchema = z.enum(['white', 'soft', 'tinted']);

const customTextBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('text'),
  eyebrow: z.string().trim().max(100).default(''),
  title: z.string().trim().max(200).default(''),
  body: z.string().trim().max(4000).default(''),
  align: z.enum(['left', 'center']).default('left'),
});

const customImageBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('image'),
  imageUrl: safeUrlSchema.default(''),
  alt: z.string().trim().max(200).default(''),
  caption: z.string().trim().max(300).default(''),
  ratio: z.enum(['auto', '16:9', '4:3', '1:1']).default('4:3'),
});

const customButtonBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('button'),
  label: z.string().trim().max(80).default('Pelajari Selengkapnya'),
  url: safeUrlSchema.default('/'),
  style: z.enum(['primary', 'outline']).default('primary'),
  align: z.enum(['left', 'center']).default('left'),
});

const customListBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('list'),
  title: z.string().trim().max(160).default(''),
  items: z.array(z.string().trim().max(300)).max(20).default([]),
  style: z.enum(['check', 'number']).default('check'),
});

const customStatBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('stat'),
  value: z.string().trim().max(40).default('100%'),
  label: z.string().trim().max(100).default('Judul Sorotan'),
  description: z.string().trim().max(300).default(''),
});

const customYoutubeBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('youtube'),
  url: safeUrlSchema.default(''),
  caption: z.string().trim().max(240).default(''),
});

/**
 * Daftar modul/widget prodi yang dapat disematkan ke dalam Bank Widget.
 * `custom_layout` sengaja tidak dimasukkan untuk mencegah rekursi tak terbatas.
 */
export const EMBEDDABLE_WIDGET_CODES = [
  'hero_slider',
  'about_prodi',
  'vision_mission',
  'statistics',
  'lecturer_list',
  'curriculum_overview',
  'latest_news',
  'document_list',
  'facility_grid',
  'gallery_grid',
  'contact_information',
  'cta_banner',
] as const;

export const embeddableWidgetCodeSchema = z.enum(EMBEDDABLE_WIDGET_CODES);
export type EmbeddableWidgetCode = z.infer<typeof embeddableWidgetCodeSchema>;

const EMBEDDABLE_WIDGET_CONFIG_SCHEMAS: Record<EmbeddableWidgetCode, z.ZodTypeAny> = {
  hero_slider: heroSliderConfigSchema,
  about_prodi: aboutProdiConfigSchema,
  vision_mission: visionMissionConfigSchema,
  statistics: statisticsConfigSchema,
  lecturer_list: dataWidgetConfigSchema,
  curriculum_overview: dataWidgetConfigSchema,
  latest_news: dataWidgetConfigSchema,
  document_list: dataWidgetConfigSchema,
  facility_grid: dataWidgetConfigSchema,
  gallery_grid: dataWidgetConfigSchema,
  contact_information: contactWidgetConfigSchema,
  cta_banner: ctaBannerConfigSchema,
};

const customWidgetBlockSchema = z.object({
  id: z.string().trim().min(1).max(60),
  type: z.literal('widget'),
  widgetCode: embeddableWidgetCodeSchema,
  config: z.record(z.string(), z.unknown()).default({}),
});

export const customBlockSchema = z.discriminatedUnion('type', [
  customTextBlockSchema,
  customImageBlockSchema,
  customButtonBlockSchema,
  customListBlockSchema,
  customStatBlockSchema,
  customYoutubeBlockSchema,
  customWidgetBlockSchema,
]);

export const customRowSchema = z.object({
  id: z.string().trim().min(1).max(60),
  layout: customRowLayoutSchema.default('1-col'),
  background: customRowBackgroundSchema.default('white'),
  columns: z.array(z.array(customBlockSchema).max(12)).min(1).max(3),
});

export const customLayoutTemplateConfigSchema = z
  .object({
    rows: z.array(customRowSchema).max(12).default([]),
  })
  .superRefine((data, ctx) => {
    data.rows.forEach((row, rowIdx) => {
      row.columns.forEach((col, colIdx) => {
        col.forEach((block, blockIdx) => {
          if (block.type !== 'widget') return;
          const schema = EMBEDDABLE_WIDGET_CONFIG_SCHEMAS[block.widgetCode];
          const parsed = schema.safeParse(block.config ?? {});
          if (!parsed.success) {
            for (const issue of parsed.error.issues) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['rows', rowIdx, 'columns', colIdx, blockIdx, 'config', ...issue.path],
                message: issue.message,
              });
            }
          }
        });
      });
    });
  });

export const createWidgetTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Nama widget minimal 2 karakter.').max(150),
  description: z.string().trim().max(400).nullable().optional(),
  config: customLayoutTemplateConfigSchema,
});

export const updateWidgetTemplateSchema = createWidgetTemplateSchema.partial();

export const customLayoutWidgetConfigSchema = z.object({
  templateId: z.coerce.number().int().positive('Pilih widget dari Bank Widget terlebih dahulu.'),
  templateName: z.string().trim().max(150).optional(),
});

export type CustomRowLayout = z.infer<typeof customRowLayoutSchema>;
export type CustomRowBackground = z.infer<typeof customRowBackgroundSchema>;
export type CustomBlock = z.infer<typeof customBlockSchema>;
export type CustomRow = z.infer<typeof customRowSchema>;
export type CustomLayoutTemplateConfig = z.infer<typeof customLayoutTemplateConfigSchema>;

/** Jumlah kolom yang sesuai untuk tiap pilihan tata letak baris. */
export function columnCountForLayout(layout: CustomRowLayout): 1 | 2 | 3 {
  if (layout === '1-col') return 1;
  if (layout === '3-col') return 3;
  return 2;
}

/**
 * Registry skema konfigurasi per kode widget.
 *
 * Kunci harus sama dengan `WIDGETS[].code` pada constants/organization.ts.
 */
export const WIDGET_CONFIG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  ...EMBEDDABLE_WIDGET_CONFIG_SCHEMAS,
  custom_layout: customLayoutWidgetConfigSchema,
};

export const createPageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  layout: z.enum(['default', 'full-width', 'sidebar']).default('default'),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
});

export const updatePageSchema = createPageSchema.partial();

export const createSectionSchema = z.object({
  sectionKey: z.string().trim().min(1).max(100),
  title: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateSectionSchema = createSectionSchema.partial();

export const reorderSectionsSchema = z.object({
  items: z
    .array(z.object({ id: z.number().int().positive(), sortOrder: z.number().int().min(0) }))
    .min(1),
});

export const createSectionWidgetSchema = z.object({
  widgetCode: z.string().trim().min(1).max(100),
  variantCode: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  config: z.record(z.unknown()).default({}),
});

export const updateSectionWidgetSchema = z.object({
  variantCode: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export const reorderWidgetsSchema = z.object({
  items: z
    .array(z.object({ id: z.number().int().positive(), sortOrder: z.number().int().min(0) }))
    .min(1),
});

/**
 * Validasi konfigurasi widget terhadap skema tipe widgetnya.
 *
 * Mengembalikan hasil terparse atau daftar pesan kesalahan. Dipakai service
 * builder sebelum menyimpan ke database.
 */
export function validateWidgetConfig(
  widgetCode: string,
  config: unknown,
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: string[] } {
  const schema = WIDGET_CONFIG_SCHEMAS[widgetCode];
  if (!schema) {
    return { ok: false, errors: [`Widget "${widgetCode}" tidak terdaftar di registry konfigurasi.`] };
  }

  const parsed = schema.safeParse(config ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      }),
    };
  }

  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
