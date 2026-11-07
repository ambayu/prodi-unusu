import { z } from 'zod';
import { emailSchema } from './common.js';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const createCurriculumSchema = z.object({
  name: z.string().trim().min(3).max(200),
  year: z.number().int().min(1990).max(2100),
  description: optionalText(5000),
  isActive: z.boolean().default(true),
});

export const updateCurriculumSchema = createCurriculumSchema.partial();

export const createSemesterSchema = z.object({
  curriculumId: z.number().int().positive(),
  semesterNumber: z.number().int().min(1).max(14),
  title: z.string().trim().min(1).max(100),
});

export const updateSemesterSchema = z.object({
  semesterNumber: z.number().int().min(1).max(14).optional(),
  title: z.string().trim().min(1).max(100).optional(),
});

export const createCourseSchema = z.object({
  semesterId: z.number().int().positive(),
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(2).max(200),
  credits: z.number().int().min(0).max(12),
  courseType: z.enum(['Wajib', 'Pilihan', 'Praktikum', 'MBKM']).default('Wajib'),
  description: optionalText(5000),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCourseSchema = createCourseSchema.partial().omit({ semesterId: true });

export const createRpsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  fileUrl: z.string().trim().min(1).max(500),
  revision: z.string().trim().max(50).nullable().optional(),
  isPublic: z.boolean().default(true),
});

export const createLecturerSchema = z.object({
  name: z.string().trim().min(3).max(200),
  nidn: optionalText(30),
  academicRank: optionalText(100),
  education: optionalText(200),
  expertise: optionalText(200),
  email: z.union([emailSchema, z.literal(''), z.null()]).optional(),
  photoUrl: optionalText(500),
  bio: optionalText(5000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateLecturerSchema = createLecturerSchema.partial();

export const createDocumentSchema = z.object({
  code: optionalText(50),
  title: z.string().trim().min(3).max(255),
  category: z.string().trim().min(2).max(100),
  description: optionalText(5000),
  year: z.number().int().min(1990).max(2100).default(new Date().getFullYear()),
  fileUrl: z.string().trim().min(1).max(500),
  fileSize: z.number().int().min(0).nullable().optional(),
  mimeType: optionalText(120),
  isPublic: z.boolean().default(true),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export const createFacilitySchema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100).default('Laboratorium'),
  location: optionalText(200),
  description: optionalText(5000),
  imageUrl: optionalText(500),
  status: z.enum(['aktif', 'renovasi', 'tidak aktif']).default('aktif'),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateFacilitySchema = createFacilitySchema.partial();

export const createPostSchema = z.object({
  title: z.string().trim().min(3).max(255),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya huruf kecil, angka, dan tanda hubung.'),
  categoryId: z.number().int().positive().nullable().optional(),
  excerpt: optionalText(1000),
  content: z.string().min(1).max(200000),
  thumbnailUrl: optionalText(500),
  seoTitle: optionalText(200),
  seoDescription: optionalText(500),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  scheduledAt: z.coerce.date().nullable().optional(),
});

export const updatePostSchema = createPostSchema.partial();

export const createPostCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const createGallerySchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalText(5000),
  category: optionalText(100),
  eventDate: z.coerce.date().nullable().optional(),
  coverImageUrl: optionalText(500),
  isPublished: z.boolean().default(true),
});

export const updateGallerySchema = createGallerySchema.partial();

export const createGalleryItemSchema = z.object({
  caption: optionalText(255),
  mediaType: z.enum(['image', 'video']).default('image'),
  mediaUrl: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateContactSchema = z.object({
  address: optionalText(2000),
  email: z.union([emailSchema, z.literal(''), z.null()]).optional(),
  phone: optionalText(50),
  whatsapp: optionalText(50),
  mapsEmbedUrl: optionalText(2000),
  instagramUrl: optionalText(500),
  facebookUrl: optionalText(500),
  youtubeUrl: optionalText(500),
});

export const updateProfileSchema = z.object({
  history: optionalText(20000),
  overview: optionalText(20000),
  objectives: optionalText(20000),
  targets: optionalText(20000),
  organization: optionalText(20000),
  heroImageUrl: optionalText(500),
});

export const updateVisionMissionSchema = z.object({
  vision: optionalText(5000),
  missions: optionalText(10000),
  objectives: optionalText(10000),
  strategicGoals: optionalText(10000),
});

export const createContactMessageSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: emailSchema,
  subject: optionalText(200),
  message: z.string().trim().min(10).max(5000),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateLecturerInput = z.infer<typeof createLecturerSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
