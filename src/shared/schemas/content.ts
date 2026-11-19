import { z } from 'zod';
import { emailSchema } from './common.js';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const createCurriculumSchema = z.object({
  name: z.string().trim().min(3).max(200),
  year: z.number().int().min(1990).max(2100),
  description: optionalText(5000),
  isActive: z.boolean().default(true),
});

export const cloneCurriculumSchema = z.object({
  year: z.number().int().min(1990).max(2100),
  name: z.string().trim().min(3).max(200).optional(),
  isActive: z.boolean().default(true),
});

export const updateCurriculumSchema = createCurriculumSchema.partial();

export const createAcademicSemesterSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Format tanggal mulai tidak valid.' }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Format tanggal selesai tidak valid.' }),
  isActive: z.boolean().default(true),
});

export const updateAcademicSemesterSchema = createAcademicSemesterSchema.partial();

export const createSemesterSchema = z.object({
  curriculumId: z.number().int().positive(),
  semesterNumber: z.number().int().min(1).max(14),
  title: z.string().trim().min(1).max(100),
});

export const updateSemesterSchema = z.object({
  semesterNumber: z.number().int().min(1).max(14).optional(),
  title: z.string().trim().min(1).max(100).optional(),
});

export const lecturerAssignmentSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().trim().min(1),
  nidn: z.string().nullable().optional(),
});

export const createCourseSchema = z.object({
  /**
   * Master semester (periode kalender akademik). Wajib diisi dari daftar
   * `/admin/semester`. Keputusan pemilik sistem 2026-11-16: "Semester" pada
   * mata kuliah berarti periode kalender, bukan posisi 1..14.
   */
  academicSemesterId: z.number().int().positive(),
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(2).max(200),
  credits: z.number().int().min(0).max(12),
  /**
   * Keterangan berupa teks bebas (contoh "Wajib", "Pilihan", atau catatan
   * kompetensi). Keputusan pemilik sistem 2026-11-16 menghapus dropdown
   * `courseType` dari formulir; kolom `course_type` di database dipertahankan
   * sebagai warisan dan tidak lagi diisi dari UI.
   */
  description: optionalText(5000),
  lecturersData: z.array(lecturerAssignmentSchema).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCourseSchema = createCourseSchema.partial();

/*
 * Master mata kuliah (tabel `courses`).
 *
 * Hanya identitas: kode dan nama. SKS, semester, dosen, dan RPS adalah milik
 * penawaran (`createCurriculumItemSchema`), bukan milik master. Pemisahan ini
 * mengikuti keputusan pemilik sistem 2026-11-16 (ADR-006).
 */
export const createCourseMasterSchema = z.object({
  code: z.string().trim().min(1, 'Kode mata kuliah wajib diisi.').max(30),
  name: z.string().trim().min(2, 'Nama mata kuliah minimal 2 karakter.').max(200),
});

export const updateCourseMasterSchema = createCourseMasterSchema.partial();

/*
 * Penawaran mata kuliah di dalam kurikulum (`curriculum_items`).
 *
 * `courseId` wajib: inilah kolom "id matakuliah" yang menautkan penawaran ke
 * master. `studyProgramId` TIDAK ada di sini dengan sengaja — kepemilikan
 * diturunkan dari sesi dan dari kurikulum induk, tidak pernah dari browser.
 */
export const createCurriculumItemSchema = z.object({
  curriculumId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  /** Semester penawaran 1 s/d 8; pengganti `academic_semester_id`. */
  semesterNumber: z.number().int().min(1).max(8).nullable().optional(),
  academicSemesterId: z.number().int().positive().nullable().optional(),
  credits: z.number().int().min(0).max(12).default(2),
  description: optionalText(5000),
  lecturersData: z.array(lecturerAssignmentSchema).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/*
 * Penawaran sekaligus wadah kurikulumnya.
 *
 * `curriculumId` boleh 0 bila prodi belum punya kurikulum sama sekali: server
 * akan memakai (atau membuat) wadah kurikulum dari `curriculumName` +
 * `curriculumYear`. `studyProgramId` tetap tidak diterima dari browser.
 */
export const upsertCurriculumItemSchema = createCurriculumItemSchema
  .omit({ curriculumId: true })
  .extend({
    curriculumId: z.number().int().min(0),
    curriculumName: z.string().trim().max(200).default(''),
    curriculumYear: z.number().int().min(1990).max(2100).optional(),
  });

export const updateCurriculumItemSchema = createCurriculumItemSchema.partial();

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

/*
 * Skema CRUD dokumen lokal (`createDocumentSchema`/`updateDocumentSchema`)
 * sudah DIHAPUS karena bank dokumen prodi tidak lagi disimpan di aplikasi ini.
 */

/**
 * Kata sandi arsip dokumen prodi.
 *
 * Satu kata sandi berlaku untuk seluruh dokumen mutu prodi. `null` dipakai
 * untuk menghapus kata sandi lama — namun kebijakan sistem mewajibkan setiap
 * prodi memasang kata sandi sebelum arsipnya dapat dibuka publik.
 */
export const dokumenPasswordSchema = z.object({
  password: z.string().trim().min(6, 'Kata sandi minimal 6 karakter.').max(72, 'Kata sandi maksimal 72 karakter.'),
});

export const hapusDokumenPasswordSchema = z.object({
  password: z.null(),
});

/**
 * Dokumen buatan prodi (bank dokumen / arsip surat).
 *
 * Dikirim sebagai multipart, jadi semua nilai tiba sebagai string.
 * `isPublic`: "true" = Publish (tampil di halaman publik), "false" = Draft.
 */
export const dokumenProdiSchema = z.object({
  title: z.string().trim().min(3, 'Judul minimal 3 karakter.').max(255),
  code: z.string().trim().max(50).optional(),
  category: z.string().trim().min(2, 'Kategori wajib diisi.').max(100),
  year: z.coerce.number().int().min(1990).max(2100),
  description: z.string().trim().max(5000).optional(),
  isPublic: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

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
