import { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { loadAuthUser, verifyAccessToken } from '../services/authService.js';
import type { AuthUser } from '../../shared/types/index.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Identitas terverifikasi hasil pembacaan cookie sesi. */
      authUser?: AuthUser;
      /** ID sesi aktif, dipakai untuk logout dan audit. */
      sessionId?: number;
    }
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Menulis cookie sesi. Token tidak pernah dapat dibaca JavaScript klien. */
export function setSessionCookies(res: Response, token: string, csrfToken: string, expiresAt: Date) {
  res.cookie(config.cookie.name, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
    expires: expiresAt,
  });

  // Cookie CSRF memang dapat dibaca JavaScript: frontend menyalinnya ke header
  // agar server dapat memastikan permintaan tulis berasal dari aplikasi ini.
  res.cookie(config.cookie.csrfName, csrfToken, {
    httpOnly: false,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
    expires: expiresAt,
  });
}

/** Menghapus cookie sesi dan CSRF. */
export function clearSessionCookies(res: Response) {
  const base = {
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: '/',
  };
  res.clearCookie(config.cookie.name, { ...base, httpOnly: true });
  res.clearCookie(config.cookie.csrfName, { ...base, httpOnly: false });
}

/** Membaca token sesi dari cookie httpOnly. */
export function readSessionToken(req: Request): string | null {
  const token = req.cookies?.[config.cookie.name];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/**
 * Middleware autentikasi.
 *
 * Memverifikasi JWT di cookie, memastikan sesi masih hidup di database, lalu
 * memuat permission efektif dari database pada setiap request. Permission tidak
 * pernah diambil dari token agar pencabutan hak berlaku seketika.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readSessionToken(req);
    if (!token) {
      throw AppError.unauthorized('Anda belum masuk. Silakan login terlebih dahulu.', 'NO_SESSION');
    }

    const { userId, sessionId } = await verifyAccessToken(token);
    req.authUser = await loadAuthUser(userId);
    req.sessionId = sessionId;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Perlindungan CSRF berbasis double-submit cookie.
 *
 * Cookie sesi bersifat SameSite=Lax sehingga permintaan lintas situs tidak
 * membawa kredensial. Lapisan kedua: setiap permintaan tulis wajib menyertakan
 * header `X-CSRF-Token` yang nilainya sama dengan cookie CSRF pada sesi itu.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const headerToken = req.header('x-csrf-token');
  const cookieToken = req.cookies?.[config.cookie.csrfName];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      message: 'Token CSRF tidak valid. Muat ulang halaman lalu coba lagi.',
      code: 'CSRF_INVALID',
    });
    return;
  }

  next();
}

/** Memeriksa apakah user memiliki permission yang diminta. */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

/**
 * Middleware otorisasi permission.
 *
 * Semua endpoint admin wajib memakai ini. Menyembunyikan menu di frontend
 * bukan kontrol keamanan (docs/rbac bagian 2).
 */
export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) {
      next(AppError.unauthorized());
      return;
    }

    const missing = required.filter((permission) => !hasPermission(user, permission));
    if (missing.length > 0) {
      next(
        AppError.forbidden(
          `Akun Anda tidak memiliki izin: ${missing.join(', ')}.`,
          'PERMISSION_DENIED',
        ),
      );
      return;
    }

    next();
  };
}
