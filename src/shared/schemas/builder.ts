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

/**
 * Registry skema konfigurasi per kode widget.
 *
 * Kunci harus sama dengan `WIDGETS[].code` pada constants/organization.ts.
 */
export const WIDGET_CONFIG_SCHEMAS: Record<string, z.ZodTypeAny> = {
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
