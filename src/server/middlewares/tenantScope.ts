import { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';
import type { AuthUser } from '../../shared/types/index.js';

/**
 * Penentuan tenant yang boleh dikelola sebuah request.
 *
 * Sumber kebenaran adalah assignment role di database. Super Admin boleh
 * memilih tenant lewat query, sedangkan Admin Prodi dan Editor hanya boleh
 * bekerja pada tenant yang ditugaskan. Nilai `studyProgramId` dari body tidak
 * pernah dipakai sebagai dasar otorisasi (docs/DATABASE.md bagian 4).
 */
export async function resolveScopedTenantId(req: Request): Promise<number> {
  const user = req.authUser;
  if (!user) {
    throw AppError.unauthorized();
  }

  const requested = req.query.tenantId ? Number(req.query.tenantId) : null;

  if (user.isSuperAdmin) {
    if (requested && Number.isInteger(requested) && requested > 0) {
      const exists = await prisma.studyProgram.count({ where: { id: requested } });
      if (exists === 0) {
        throw AppError.notFound('Program studi yang diminta tidak ditemukan.', 'TENANT_NOT_FOUND');
      }
      return requested;
    }

    if (user.tenantIds.length > 0) {
      return user.tenantIds[0];
    }

    // Super Admin tanpa assignment memakai tenant pertama yang aktif agar
    // dashboard tetap dapat dibuka sebelum penugasan dibuat.
    const firstTenant = await prisma.studyProgram.findFirst({
      where: { status: 'active' },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    if (!firstTenant) {
      throw AppError.notFound('Belum ada program studi di database.', 'NO_TENANT');
    }

    return firstTenant.id;
  }

  if (user.tenantIds.length === 0) {
    throw AppError.forbidden(
      'Akun Anda belum ditugaskan ke program studi mana pun.',
      'NO_TENANT_ASSIGNMENT',
    );
  }

  if (requested && !user.tenantIds.includes(requested)) {
    throw AppError.forbidden(
      'Anda tidak berwenang mengelola program studi tersebut.',
      'TENANT_SCOPE_DENIED',
    );
  }

  if (requested) return requested;
  if (req.tenant && user.tenantIds.includes(req.tenant.id)) return req.tenant.id;

  return user.tenantIds[0];
}

/**
 * Memastikan sebuah record milik tenant yang sedang dikelola.
 *
 * Dipakai pada operasi update dan delete agar ID dari URL tidak dapat dipakai
 * membuka data tenant lain (docs/PRD.md bagian 17).
 */
export function assertOwnedByTenant(record: { studyProgramId?: number | null } | null, tenantId: number, label: string) {
  if (!record) {
    throw AppError.notFound(`${label} tidak ditemukan.`);
  }
  if (record.studyProgramId !== tenantId) {
    throw AppError.forbidden(
      `${label} bukan milik program studi yang sedang Anda kelola.`,
      'CROSS_TENANT_DENIED',
    );
  }
}

/** Middleware ringan yang menyimpan tenant terpilih ke `req` agar audit log konsisten. */
export async function attachScopedTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    req.scopedTenantId = await resolveScopedTenantId(req);
    next();
  } catch (error) {
    next(error);
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      scopedTenantId?: number;
      authUser?: AuthUser;
    }
  }
}

/** Mengambil tenant terpilih yang sudah dihitung middleware. */
export function scopedTenantId(req: Request): number {
  if (!req.scopedTenantId) {
    throw AppError.internal('Tenant scope belum dihitung untuk request ini.');
  }
  return req.scopedTenantId;
}
