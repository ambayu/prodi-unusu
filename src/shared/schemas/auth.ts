import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

/**
 * Login lokal darurat. Jalur utama tetap SSO ONE UNUSU; skema ini hanya
 * dipakai bila portal SSO tidak dapat dihubungi atau untuk akun bootstrap.
 */
export const loginSchema = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(1).max(200),
});

export const ssoExchangeSchema = z.object({
  client_id: z.string().trim().min(1).max(100),
  token: z.string().trim().min(1).max(200),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: emailSchema,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9._-]+$/, 'Username hanya huruf kecil, angka, titik, garis bawah, dan tanda hubung.'),
  password: passwordSchema.optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: emailSchema.optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().trim().max(500).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

export const assignRoleSchema = z.object({
  roleCode: z.string().trim().min(1).max(50),
  scopeType: z.enum(['global', 'faculty', 'prodi']),
  studyProgramId: z.number().int().positive().nullable().optional(),
  facultyId: z.number().int().positive().nullable().optional(),
  permissionGroupCodes: z.array(z.string().trim().min(1).max(50)).default([]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SsoExchangeInput = z.infer<typeof ssoExchangeSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
