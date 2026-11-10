import { z } from 'zod';
import { hexColorSchema, hostnameSchema, slugSchema } from './common.js';

export const createFacultySchema = z.object({
  code: z.string().trim().min(2).max(20).toUpperCase(),
  name: z.string().trim().min(3).max(150),
  slug: slugSchema,
  description: z.string().trim().max(5000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateFacultySchema = createFacultySchema.partial();

export const createStudyProgramSchema = z.object({
  facultyId: z.number().int().positive(),
  code: z.string().trim().min(2).max(20).toUpperCase(),
  name: z.string().trim().min(3).max(150),
  slug: slugSchema,
  degree: z.string().trim().min(1).max(10).default('S1'),
  description: z.string().trim().max(5000).nullable().optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateStudyProgramSchema = createStudyProgramSchema.partial().omit({ facultyId: true });

export const createDomainSchema = z.object({
  studyProgramId: z.number().int().positive(),
  hostname: hostnameSchema,
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateDomainSchema = z.object({
  hostname: hostnameSchema.optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateWebsiteSettingSchema = z.object({
  siteTitle: z.string().trim().min(1).max(200).optional(),
  siteTagline: z.string().trim().max(255).nullable().optional(),
  univName: z.string().trim().min(1).max(200).optional(),
  facultyName: z.string().trim().max(200).nullable().optional(),
  logoUrl: z.string().trim().max(500).nullable().optional(),
  faviconUrl: z.string().trim().max(500).nullable().optional(),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
  seoKeywords: z.string().trim().max(500).nullable().optional(),
  seoImageUrl: z.string().trim().max(500).nullable().optional(),
  copyrightText: z.string().trim().max(255).nullable().optional(),
});

export const updateThemeSchema = z.object({
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  foregroundColor: hexColorSchema.optional(),
  fontHeading: z.string().trim().min(1).max(100).optional(),
  fontBody: z.string().trim().min(1).max(100).optional(),
  radius: z.enum(['0', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem']).optional(),
  shadow: z.enum(['none', 'xs', 'sm', 'md', 'lg']).optional(),
  buttonStyle: z.enum(['solid', 'outline', 'soft']).optional(),
  headerLayout: z.enum(['modern', 'classic', 'centered']).optional(),
  footerLayout: z.enum(['multi-column', 'simple']).optional(),
  containerWidth: z.enum(['1140px', '1200px', '1280px', '1440px']).optional(),
});

export const menuItemSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(100),
  url: z.string().trim().min(1).max(500),
  target: z.enum(['_self', '_blank']).default('_self'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const reorderMenusSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
export type UpdateWebsiteSettingInput = z.infer<typeof updateWebsiteSettingSchema>;
