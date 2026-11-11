import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../prisma.js';
import { config } from '../../config/index.js';
import { asyncHandler, getBody, validate } from '../../utils/validation.js';
import { AppError } from '../../utils/errors.js';
import { loginSchema, ssoExchangeSchema } from '../../../shared/schemas/auth.js';
import {
  clearSessionCookies,
  readSessionToken,
  setSessionCookies,
} from '../../middlewares/auth.js';
import { authenticate } from '../../middlewares/auth.js';
import {
  createSession,
  loadAuthUser,
  readTokenIdFromJwt,
  revokeSessionByTokenId,
  touchLastLogin,
} from '../../services/authService.js';
import { recordAudit } from '../../services/auditService.js';
import { SSO_ENTRY_PERMISSIONS, punyaIzinMasuk } from '../../../shared/constants/sso.js';

const router = Router();

/** Batas percobaan login per alamat IP, sesuai docs/PRD.md bagian 13 poin 7. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.',
    code: 'RATE_LIMITED',
  },
});

interface SsoUserPayload {
  id: number | string;
  username: string;
  nama: string;
  email: string | null;
  role: string;
  /** Seluruh kode peran dari portal pusat. Dikirim sebagai array pada kontrak v2. */
  roles?: string[];
  avatar?: string | null;
  prodi?: string | null;
  fakultas?: string | null;
  nim?: string | null;
  nidn?: string | null;
}

/**
 * Keputusan akses yang dihitung portal pusat.
 *
 * `permissions` hanya salinan untuk sesi berjalan dan tidak disimpan sebagai
 * sumber otorisasi. Otorisasi fitur tetap memakai RBAC lokal.
 */
interface SsoAccessPayload {
  allowed: boolean;
  tingkat: string[];
  permissions: string[];
}

interface SsoExchangeResult {
  user: SsoUserPayload;
  access: SsoAccessPayload;
  app: { clientId: string; nameApp: string } | null;
}

/**
 * Menukar tiket SSO sekali pakai ke portal ONE UNUSU menjadi sesi lokal.
 *
 * Pola ini sama dengan aplikasi satelit UNUSU lain: verifikasi dilakukan
 * server-ke-server memakai client_key yang tidak pernah dikirim ke browser.
 */
async function exchangeSsoTicket(token: string): Promise<SsoExchangeResult> {
  if (!config.sso.clientKey) {
    throw AppError.internal(
      'SSO_CLIENT_KEY belum dikonfigurasi di server. Login SSO tidak dapat diproses.',
      'SSO_NOT_CONFIGURED',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${config.sso.baseUrl}/api/v2/website/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.sso.clientId,
        client_key: config.sso.clientKey,
        token,
      }),
    });
  } catch {
    throw AppError.badRequest(
      'Portal ONE UNUSU tidak dapat dihubungi. Gunakan login lokal sementara atau coba lagi nanti.',
      'SSO_UNREACHABLE',
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        status?: boolean;
        message?: string;
        reason?: string;
        data?: { user?: SsoUserPayload; access?: SsoAccessPayload; app?: { clientId: string; nameApp: string } };
      }
    | null;

  const ssoUser = payload?.data?.user;
  if (!response.ok || !payload?.status || !ssoUser) {
    // Portal pusat menolak dengan 403 ketika akun tidak memiliki izin masuk ke
    // aplikasi ini. Pesannya diteruskan apa adanya agar pengguna memahami bahwa
    // masalahnya ada pada peran di portal pusat, bukan pada tiket yang rusak.
    if (response.status === 403) {
      throw AppError.forbidden(
        payload?.message || 'Akses ditolak. Anda tidak memiliki akses ke aplikasi ini.',
        'SSO_ACCESS_DENIED',
        {
          appAccess: {
            allowed: false,
            reason: payload?.reason ?? null,
            ssoRole: null,
            ssoRoles: [],
          },
        },
      );
    }
    throw AppError.unauthorized(
      payload?.message || 'Verifikasi tiket SSO gagal.',
      'SSO_VERIFY_FAILED',
    );
  }

  // Portal lama belum tentu mengirim `access`. Bila tidak ada, izin masuk
  // diperiksa dari `tingkat` yang kosong sehingga akun ditolak, bukan diterima
  // diam-diam. Menolak lebih aman daripada memberi akses tanpa dasar.
  const access: SsoAccessPayload = payload.data?.access ?? { allowed: false, tingkat: [], permissions: [] };

  return { user: ssoUser, access, app: payload.data?.app ?? null };
}

/**
 * Menyelaraskan akun lokal dengan profil SSO yang sudah terverifikasi.
 *
 * Akun baru sengaja dibuat TANPA peran. Peran hanya diberikan admin melalui
 * Manajemen Pengguna setelah akun ditinjau, sehingga pemilik akun tidak pernah
 * memperoleh akses otomatis hanya karena berhasil masuk lewat portal pusat.
 */
async function upsertUserFromSso(ssoUser: SsoUserPayload, access: SsoAccessPayload) {
  const email = (ssoUser.email ?? `${ssoUser.username}@unusu.ac.id`).toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ ssoId: String(ssoUser.id) }, { username: ssoUser.username }, { email }] },
  });

  // Jejak profil portal disimpan agar admin dapat menilai akun sebelum memberi
  // peran. `ssoRole` memakai peran utama, `ssoRoles` menyimpan seluruhnya.
  const ssoRoles = ssoUser.roles ?? (ssoUser.role ? [ssoUser.role] : []);
  const profilSso = {
    ssoRole: ssoUser.role || null,
    ssoRoles: JSON.stringify(ssoRoles),
    ssoAccess: JSON.stringify(access),
    ssoSyncedAt: new Date(),
  };

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          ssoId: String(ssoUser.id),
          name: ssoUser.nama,
          email,
          avatarUrl: ssoUser.avatar ?? existing.avatarUrl,
          lastLoginAt: new Date(),
          ...profilSso,
        },
      })
    : await prisma.user.create({
        data: {
          ssoId: String(ssoUser.id),
          name: ssoUser.nama,
          email,
          username: ssoUser.username,
          avatarUrl: ssoUser.avatar ?? null,
          lastLoginAt: new Date(),
          ...profilSso,
        },
      });

  return user;
}

/**
 * POST /api/v1/auth/login
 *
 * Login lokal. Jalur utama aplikasi tetap SSO; endpoint ini disediakan untuk
 * akun bootstrap Super Admin dan sebagai jalur darurat bila portal SSO mati.
 */
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { username, password } = getBody<{ username: string; password: string }>(req);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
      },
    });

    // Pesan yang sama untuk akun tidak ada dan kata sandi salah agar tidak
    // dapat dipakai menebak daftar akun yang valid.
    const invalid = AppError.unauthorized('Nama pengguna atau kata sandi salah.', 'INVALID_CREDENTIALS');

    if (!user || !user.passwordHash) {
      throw invalid;
    }
    if (!user.isActive) {
      throw AppError.forbidden('Akun Anda sedang dinonaktifkan.', 'USER_INACTIVE');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw invalid;
    }

    const session = await createSession(user.id, {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip,
    });

    setSessionCookies(res, session.token, session.csrfToken, session.expiresAt);
    await touchLastLogin(user.id);
    await recordAudit({ req, action: 'LOGIN', module: 'AUTH', targetType: 'user', targetId: user.id });

    res.json({
      success: true,
      message: 'Login berhasil.',
      user: session.user,
    });
  }),
);

/**
 * POST /api/v1/auth/sso
 *
 * Menukar tiket SSO menjadi sesi lokal. Dipanggil dari halaman /sso/callback
 * setelah portal ONE UNUSU mengembalikan `client_id` dan `token`.
 */
router.post(
  '/sso',
  loginLimiter,
  validate({ body: ssoExchangeSchema }),
  asyncHandler(async (req, res) => {
    const { client_id, token } = getBody<{ client_id: string; token: string }>(req);

    if (client_id !== config.sso.clientId) {
      throw AppError.badRequest('Client ID tidak sesuai dengan aplikasi ini.', 'SSO_CLIENT_MISMATCH');
    }

    const { user: ssoUser, access, app } = await exchangeSsoTicket(token);

    /*
     * Gerbang masuk: hanya akun dengan izin `masuk_admin` atau `masuk_dosen`
     * yang boleh melanjutkan. Pemeriksaan dilakukan SEBELUM akun lokal dibuat
     * dan sebelum sesi diterbitkan, sehingga mahasiswa atau peran lain tidak
     * meninggalkan jejak dan tidak pernah menerima sesi.
     */
    if (!punyaIzinMasuk(access)) {
      await recordAudit({
        req,
        action: 'LOGIN',
        module: 'AUTH',
        targetType: 'user',
        details: {
          channel: 'sso',
          result: 'denied',
          reason: 'entry_permission_denied',
          ssoRole: ssoUser.role,
          ssoRoles: ssoUser.roles ?? [ssoUser.role],
          tingkat: access.tingkat,
        },
      });
      throw AppError.forbidden(
        'Akun Anda tidak memiliki izin masuk ke Portal Program Studi. ' +
          'Portal ini hanya untuk administrator dan dosen yang akan mengelola konten program studi.',
        'SSO_NO_ENTRY_PERMISSION',
        {
          appAccess: {
            allowed: false,
            reason: 'no_entry_permission',
            ssoRole: ssoUser.role ?? null,
            ssoRoles: ssoUser.roles ?? (ssoUser.role ? [ssoUser.role] : []),
            tingkat: access.tingkat,
            permissions: access.permissions,
            allowedPermissions: SSO_ENTRY_PERMISSIONS,
            appName: app?.nameApp ?? null,
          },
        },
      );
    }

    const user = await upsertUserFromSso(ssoUser, access);

    if (!user.isActive) {
      throw AppError.forbidden(
        'Akun Anda sedang dinonaktifkan oleh administrator.',
        'USER_INACTIVE',
      );
    }

    const session = await createSession(user.id, {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip,
    });

    setSessionCookies(res, session.token, session.csrfToken, session.expiresAt);
    await recordAudit({
      req,
      action: 'LOGIN',
      module: 'AUTH',
      targetType: 'user',
      targetId: user.id,
      details: { channel: 'sso' },
    });

    const belumDivalidasi = session.user.roles.length === 0;
    res.json({
      success: true,
      message: belumDivalidasi
        ? 'Akun Anda berhasil terverifikasi dan sedang menunggu validasi administrator.'
        : 'Login SSO berhasil.',
      user: session.user,
      needsValidation: belumDivalidasi,
    });
  }),
);

/** GET /api/v1/auth/me: profil sesi aktif beserta permission efektif. */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.authUser!;
    const refreshed = await loadAuthUser(user.id);
    res.json({ success: true, user: refreshed });
  }),
);

/**
 * POST /api/v1/auth/refresh
 *
 * Memperpanjang sesi dengan menerbitkan token akses baru. Token CSRF dirotasi
 * juga sehingga token lama tidak dapat dipakai ulang.
 */
router.post(
  '/refresh',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.authUser!;
    const currentToken = readSessionToken(req);

    if (currentToken) {
      const tokenId = readTokenIdFromJwt(currentToken);
      if (tokenId) {
        await revokeSessionByTokenId(tokenId);
      }
    }

    const session = await createSession(user.id, {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip,
    });

    setSessionCookies(res, session.token, session.csrfToken, session.expiresAt);
    res.json({ success: true, message: 'Sesi diperpanjang.', user: session.user });
  }),
);

/** POST /api/v1/auth/logout: mencabut sesi aktif dan menghapus cookie. */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = readSessionToken(req);
    if (token) {
      const tokenId = readTokenIdFromJwt(token);
      if (tokenId) {
        await revokeSessionByTokenId(tokenId);
      }
    }
    clearSessionCookies(res);
    res.json({ success: true, message: 'Anda sudah keluar dari akun.' });
  }),
);

export default router;
