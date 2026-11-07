import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { ROLES } from '../../shared/constants/permissions.js';
import type { AuthUser, AuthUserRole } from '../../shared/types/index.js';

export interface IssuedSession {
  token: string;
  csrfToken: string;
  expiresAt: Date;
  user: AuthUser;
}

interface SessionTokenPayload {
  sub: string;
  sid: string;
  typ: 'access';
}

const MAX_SESSIONS_PER_USER = 10;

/** Menghapus sesi kedaluwarsa dan yang sudah dicabut agar tabel tidak menggelembung. */
async function pruneSessions(userId: number) {
  await prisma.session.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
    },
  });

  const active = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
    skip: MAX_SESSIONS_PER_USER,
  });

  if (active.length > 0) {
    await prisma.session.updateMany({
      where: { id: { in: active.map((session) => session.id) } },
      data: { revokedAt: new Date() },
    });
  }
}

/**
 * Menyusun daftar permission efektif dan tenant yang boleh dikelola.
 *
 * Super Admin mendapat seluruh permission karena role `SUPER_ADMIN` memakai
 * penanda `*` pada seeder. Editor mendapat gabungan permission group yang
 * diberikan kepadanya.
 */
export async function loadAuthUser(userId: number): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
          studyProgram: { select: { id: true, name: true } },
          faculty: { select: { id: true, name: true } },
          UserRolePermissionGroup: {
            include: {
              permissionGroup: {
                include: { items: { include: { permission: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw AppError.unauthorized('Akun tidak ditemukan.', 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw AppError.forbidden('Akun Anda sedang dinonaktifkan.', 'USER_INACTIVE');
  }

  const roles: AuthUserRole[] = [];
  const permissions = new Set<string>();
  const tenantIds = new Set<number>();
  let isSuperAdmin = false;

  for (const assignment of user.userRoles) {
    roles.push({
      roleCode: assignment.role.code,
      roleName: assignment.role.name,
      scopeType: assignment.scopeType,
      studyProgramId: assignment.studyProgramId,
      facultyId: assignment.facultyId,
    });

    if (assignment.role.code === ROLES.SUPER_ADMIN) {
      isSuperAdmin = true;
    }

    for (const rolePermission of assignment.role.rolePermissions) {
      permissions.add(rolePermission.permission.code);
    }

    for (const grant of assignment.UserRolePermissionGroup) {
      for (const item of grant.permissionGroup.items) {
        permissions.add(item.permission.code);
      }
    }

    if (assignment.studyProgramId) {
      tenantIds.add(assignment.studyProgramId);
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    roles,
    permissions: isSuperAdmin ? ['*'] : Array.from(permissions).sort(),
    tenantIds: Array.from(tenantIds).sort((a, b) => a - b),
    isSuperAdmin,
  };
}

/** Membuat sesi baru: baris Session di database plus token JWT bertanda tangan. */
export async function createSession(
  userId: number,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<IssuedSession> {
  await pruneSessions(userId);

  const tokenId = crypto.randomBytes(24).toString('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenId,
      csrfToken,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ipAddress: meta.ipAddress?.slice(0, 60) ?? null,
      expiresAt,
    },
  });

  const payload: SessionTokenPayload = { sub: String(userId), sid: tokenId, typ: 'access' };
  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessTtlSeconds,
    issuer: config.jwt.issuer,
  });

  const user = await loadAuthUser(userId);

  return { token, csrfToken, expiresAt, user };
}

/** Memverifikasi token JWT dan memastikan sesinya masih hidup di database. */
export async function verifyAccessToken(token: string): Promise<{ userId: number; sessionId: number }> {
  let decoded: SessionTokenPayload;
  try {
    decoded = jwt.verify(token, config.jwt.secret, { issuer: config.jwt.issuer }) as SessionTokenPayload;
  } catch {
    throw AppError.unauthorized('Token sesi tidak valid atau sudah kedaluwarsa.', 'TOKEN_INVALID');
  }

  const session = await prisma.session.findUnique({ where: { tokenId: decoded.sid } });
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized('Sesi sudah berakhir. Silakan masuk kembali.', 'SESSION_ENDED');
  }

  return { userId: session.userId, sessionId: session.id };
}

/** Mencabut satu sesi tertentu. Dipakai pada logout. */
export async function revokeSessionByTokenId(tokenId: string) {
  await prisma.session.updateMany({
    where: { tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Mencabut seluruh sesi seorang pengguna. Dipakai saat akun dinonaktifkan. */
export async function revokeAllSessions(userId: number) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Memperbarui waktu login terakhir tanpa menggagalkan alur bila terjadi error. */
export async function touchLastLogin(userId: number) {
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }).catch(() => undefined);
}

export function readTokenIdFromJwt(token: string): string | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { issuer: config.jwt.issuer }) as SessionTokenPayload;
    return decoded.sid;
  } catch {
    return null;
  }
}



