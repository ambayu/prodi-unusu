import { z } from 'zod';

/** Helper: ID numerik dari param atau body, selalu bilangan bulat positif. */
export const idSchema = z.coerce.number().int().positive();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});

/** Slug ramah mesin pencari, huruf kecil, angka, dan tanda hubung. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.');

export const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4)
  .max(255)
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    'Hostname tidak valid. Tulis tanpa skema dan tanpa path, contoh sin.unusu.ac.id.',
  );

/** Warna hex 6 digit. Tema tenant tidak menerima nilai CSS bebas. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{6})$/, 'Warna harus format heksadesimal 6 digit, contoh #1e3a8a.');

/** URL relatif di dalam aplikasi atau URL absolut https/http. */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value),
    'URL harus diawali "/" atau http(s)://',
  );

export const emailSchema = z.string().trim().toLowerCase().email().max(190);
export const passwordSchema = z
  .string()
  .min(10, 'Kata sandi minimal 10 karakter.')
  .max(200)
  .refine((value) => /[a-z]/.test(value), 'Kata sandi harus memuat huruf kecil.')
  .refine((value) => /[A-Z]/.test(value), 'Kata sandi harus memuat huruf besar.')
  .refine((value) => /[0-9]/.test(value), 'Kata sandi harus memuat angka.');
