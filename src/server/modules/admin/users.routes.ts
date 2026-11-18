import { Router } from 'express';
import { config } from '../../config/index.js';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { revokeAllSessions } from '../../services/authService.js';
import { assignRoleSchema, createUserSchema, updateUserSchema } from '../../../shared/schemas/auth.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import { ROLES } from '../../../shared/constants/permissions.js';
import { ASSIGNABLE_ROLE_CODES } from '../../../shared/constants/sso.js';

const router = Router();

/**
 * Rute `meta/*` harus didaftarkan SEBELUM `/:id`.
 *
 * Express mencocokkan rute sesuai urutan pendaftaran. Bila `/:id` didahulukan,
 * permintaan ke `/meta/roles` tertangkap sebagai id bernilai "meta" lalu gagal
 * validasi sehingga daftar peran selalu kosong di formulir.
 */

/** GET /api/v1/admin/users/meta/kandidat: cari kandidat pengguna dari direktori ONE UNUSU (seperti LPPM). */
router.get(
  '/meta/kandidat',
  requirePermission('users.view'),
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? '').trim();
    const role = String(req.query.role ?? '').trim();
    const fakultas = String(req.query.fakultas ?? '').trim();
    const prodi = String(req.query.prodi ?? '').trim();

    if (search.length === 1) {
      throw AppError.unprocessableCode('Ketik minimal 2 karakter untuk mencari pengguna.', 'SEARCH_TOO_SHORT');
    }

    const apiKey = config.sso.apiKey;
    if (!apiKey) {
      throw AppError.badGateway('ONE_UNUSU_API_KEY belum dikonfigurasi di server.', 'SSO_API_KEY_MISSING');
    }

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(`${config.sso.baseUrl.replace(/\/$/, '')}/api/v2/website/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          ...(search.length >= 2 ? { search: search.slice(0, 100) } : {}),
          ...(role ? { role } : {}),
          excludeRole: 'MAHASISWA',
          ...(fakultas ? { fakultas } : {}),
          ...(prodi ? { prodi } : {}),
        }),
      });
    } catch {
      throw AppError.badGateway('Gagal menghubungi portal ONE UNUSU.', 'UPSTREAM_UNREACHABLE');
    }

    const payload = (await upstreamRes.json().catch(() => null)) as {
      status?: boolean;
      data?: Array<{
        id: number;
        username: string;
        nama: string;
        email: string | null;
        role: string;
        fakultas: string | null;
        prodi: string | null;
      }>;
      message?: string;
    } | null;

    if (!upstreamRes.ok || !payload?.status) {
      throw AppError.badGateway(payload?.message || 'ONE UNUSU mengembalikan respon gagal.', 'UPSTREAM_ERROR');
    }

    const daftar = Array.isArray(payload.data) ? payload.data : [];
    const terdaftarUsers = await prisma.user.findMany({
      where: {
        OR: [
          { ssoId: { in: daftar.map((d) => String(d.id)) } },
          { username: { in: daftar.map((d) => d.username) } },
        ],
      },
      select: { ssoId: true, username: true },
    });

    const setTerdaftar = new Set<string>();
    terdaftarUsers.forEach((u) => {
      if (u.ssoId) setTerdaftar.add(u.ssoId);
      if (u.username) setTerdaftar.add(u.username);
    });

    res.json({
      success: true,
      data: daftar.map((u) => ({
        ...u,
        sudahTerdaftar: setTerdaftar.has(String(u.id)) || setTerdaftar.has(u.username),
      })),
      meta: { total: daftar.length, search, role, fakultas, prodi },
    });
  }),
);

/** GET /api/v1/admin/roles: daftar peran sistem. */
router.get(
  '/meta/roles',
  requirePermission('roles.view'),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        rolePermissions: { include: { permission: { select: { code: true, name: true, module: true } } } },
      },
    });
    res.json({ success: true, roles });
  }),
);

/** GET /api/v1/admin/permissions: katalog permission. */
router.get(
  '/meta/permissions',
  requirePermission('permissions.view'),
  asyncHandler(async (_req, res) => {
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
    res.json({ success: true, permissions });
  }),
);

/** GET /api/v1/admin/permission-groups: preset hak akses Editor. */
router.get(
  '/meta/permission-groups',
  requirePermission('permission_groups.view'),
  asyncHandler(async (_req, res) => {
    const groups = await prisma.permissionGroup.findMany({
      orderBy: { code: 'asc' },
      include: { items: { include: { permission: { select: { code: true } } } } },
    });
    res.json({ success: true, groups });
  }),
);

/**
 * GET /api/v1/admin/users
 *
 * Super Admin melihat seluruh akun. Admin Prodi hanya melihat akun yang
 * ditugaskan pada prodi yang dikelolanya.
 */
router.get(
  '/',
  requirePermission('users.view'),
  asyncHandler(async (req, res) => {
    const user = req.authUser!;
    const isSuper = user.isSuperAdmin;
    const studyProgramId = isSuper ? null : scopedTenantId(req);

    const users = await prisma.user.findMany({
      where: isSuper
        ? {}
        : {
            userRoles: { some: { studyProgramId: studyProgramId ?? -1 } },
          },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        // Jejak SSO dipakai admin untuk menilai akun sebelum memberi peran.
        ssoId: true,
        ssoRole: true,
        ssoRoles: true,
        ssoAccess: true,
        ssoSyncedAt: true,
        userRoles: {
          select: {
            id: true,
            scopeType: true,
            role: { select: { code: true, name: true } },
            studyProgram: { select: { id: true, name: true } },
            faculty: { select: { id: true, name: true } },
            UserRolePermissionGroup: {
              select: { permissionGroup: { select: { code: true, name: true } } },
            },
          },
        },
      },
    });

    res.json({ success: true, users });
  }),
);

/** GET /api/v1/admin/users/:id */
router.get(
  '/:id',
  requirePermission('users.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        ssoId: true,
        ssoRole: true,
        ssoRoles: true,
        ssoAccess: true,
        ssoSyncedAt: true,
        userRoles: {
          select: {
            id: true,
            scopeType: true,
            role: { select: { code: true, name: true } },
            studyProgram: { select: { id: true, name: true } },
            faculty: { select: { id: true, name: true } },
            UserRolePermissionGroup: { select: { permissionGroup: { select: { code: true, name: true } } } },
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('Pengguna tidak ditemukan.');
    }

    res.json({ success: true, user });
  }),
);

/**
 * POST /api/v1/admin/users
 * Mendaftarkan pengguna dari direktori ONE UNUSU (seperti skema LPPM).
 */
router.post(
  '/',
  requirePermission('users.create'),
  asyncHandler(async (req, res) => {
    const { userIds, kandidat } = req.body ?? {};

    let listKandidat: Array<{ id: number; username: string; nama: string; email?: string | null; role?: string }> = [];

    if (Array.isArray(kandidat) && kandidat.length > 0) {
      listKandidat = kandidat;
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      // Ambil detail kandidat dari ONE UNUSU
      const apiKey = config.sso.apiKey;
      const upstreamRes = await fetch(`${config.sso.baseUrl.replace(/\/$/, '')}/api/v2/website/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ limit: 100 }),
      });
      const payload = (await upstreamRes.json().catch(() => null)) as {
        status?: boolean;
        data?: Array<{ id: number; username: string; nama: string; email: string | null; role: string }>;
      } | null;

      if (payload?.status && Array.isArray(payload.data)) {
        const targetIds = new Set(userIds.map(Number));
        listKandidat = payload.data.filter((u) => targetIds.has(Number(u.id)));
      }
    }

    if (listKandidat.length === 0) {
      throw AppError.badRequest('Pilih minimal satu pengguna dari direktori ONE UNUSU.', 'EMPTY_USER_SELECTION');
    }

    const hasil = [];
    for (const k of listKandidat) {
      const email = (k.email ?? `${k.username}@unusu.ac.id`).toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { OR: [{ ssoId: String(k.id) }, { username: k.username }, { email }] },
      });

      if (existing) {
        hasil.push(existing);
        continue;
      }

      const roleStr = k.role ? [k.role] : [];
      const created = await prisma.user.create({
        data: {
          ssoId: String(k.id),
          name: k.nama,
          email,
          username: k.username,
          isActive: true,
          ssoRole: k.role || null,
          ssoRoles: JSON.stringify(roleStr),
          ssoSyncedAt: new Date(),
        },
      });
      hasil.push(created);
    }

    res.json({
      success: true,
      message: `${hasil.length} pengguna berhasil didaftarkan.`,
      users: hasil,
    });
  }),
);

/** PUT /api/v1/admin/users/:id */
router.put(
  '/:id',
  requirePermission('users.update'),
  validate({ body: updateUserSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Pengguna tidak ditemukan.');
    }

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, name: true, email: true, username: true, isActive: true, avatarUrl: true, phone: true },
    });

    if (body.isActive === false) {
      await revokeAllSessions(id);
    }

    await recordAudit({ req, action: 'UPDATE', module: 'USERS', targetType: 'user', targetId: id });
    res.json({ success: true, message: 'Data pengguna berhasil diperbarui.', user });
  }),
);

/** POST /api/v1/admin/users/:id/roles: memberikan assignment role beserta scope. */
router.post(
  '/:id/roles',
  requirePermission('users.assign_role'),
  validate({ body: assignRoleSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{
      roleCode: string;
      scopeType: 'global' | 'faculty' | 'prodi';
      studyProgramId?: number | null;
      facultyId?: number | null;
      permissionGroupCodes: string[];
    }>(req);

    // Admin Prodi tidak boleh memberikan peran global atau lintas prodi.
    if (!actor.isSuperAdmin) {
      if (body.scopeType !== 'prodi') {
        throw AppError.forbidden('Anda hanya dapat memberikan akses pada tingkat program studi.', 'SCOPE_ESCALATION');
      }
      const allowedTenant = scopedTenantId(req);
      if (body.studyProgramId !== allowedTenant) {
        throw AppError.forbidden('Anda hanya dapat memberikan akses pada prodi Anda sendiri.', 'SCOPE_ESCALATION');
      }
      if (body.roleCode !== ROLES.EDITOR) {
        throw AppError.forbidden('Anda hanya dapat memberikan peran Editor.', 'ROLE_ESCALATION');
      }
    }

    /*
     * Peran yang boleh diberikan hanya dua: Admin Utama dan Admin Prodi.
     * Pembatasan ini menjaga agar daftar peran tidak kembali melebar seperti
     * sebelumnya (14 peran prodi) dan setiap akses dapat ditelusuri ke satu
     * penanggung jawab prodi.
     */
    if (!(ASSIGNABLE_ROLE_CODES as readonly string[]).includes(body.roleCode)) {
      throw AppError.badRequest(
        `Peran "${body.roleCode}" tidak dapat diberikan. Pilih Admin Utama atau Admin Prodi.`,
        'ROLE_NOT_ASSIGNABLE',
      );
    }

    // Admin Prodi wajib terikat pada satu prodi agar batas kewenangannya jelas.
    if (body.roleCode === ROLES.ADMIN_PRODI) {
      if (body.scopeType !== 'prodi' || !body.studyProgramId) {
        throw AppError.badRequest(
          'Admin Prodi harus ditugaskan pada satu program studi.',
          'PRODI_SCOPE_REQUIRED',
        );
      }
    }

    // Admin Fakultas wajib terikat pada satu fakultas.
    if (body.roleCode === ROLES.ADMIN_FAKULTAS) {
      if (body.scopeType !== 'faculty' || !body.facultyId) {
        throw AppError.badRequest(
          'Admin Fakultas harus ditugaskan pada satu fakultas.',
          'FACULTY_SCOPE_REQUIRED',
        );
      }
    }

    // Admin Utama berlaku lintas prodi, sehingga cakupannya harus global.
    if (body.roleCode === ROLES.SUPER_ADMIN && body.scopeType !== 'global') {
      throw AppError.badRequest('Admin Utama harus memakai cakupan global.', 'GLOBAL_SCOPE_REQUIRED');
    }

    const role = await prisma.role.findUnique({ where: { code: body.roleCode } });
    if (!role) {
      throw AppError.badRequest(`Peran "${body.roleCode}" tidak dikenal.`, 'ROLE_UNKNOWN');
    }

    const assignment = await prisma.userRole.create({
      data: {
        userId: id,
        roleId: role.id,
        scopeType: body.scopeType,
        studyProgramId: body.scopeType === 'prodi' ? body.studyProgramId ?? null : null,
        facultyId: body.scopeType === 'faculty' ? body.facultyId ?? null : null,
      },
    });

    if (body.permissionGroupCodes.length > 0) {
      const groups = await prisma.permissionGroup.findMany({
        where: { code: { in: body.permissionGroupCodes } },
        select: { id: true },
      });

      await prisma.userRolePermissionGroup.createMany({
        data: groups.map((group) => ({ userRoleId: assignment.id, permissionGroupId: group.id })),
        skipDuplicates: true,
      });
    }

    await recordAudit({
      req,
      action: 'ASSIGN',
      module: 'USERS',
      targetType: 'user_role',
      targetId: assignment.id,
      details: { userId: id, roleCode: body.roleCode, scopeType: body.scopeType },
    });

    res.status(201).json({ success: true, message: 'Peran berhasil diberikan.', assignment });
  }),
);

/**
 * DELETE /api/v1/admin/users/:id
 *
 * Menonaktifkan akun beserta seluruh sesinya. Baris pengguna sengaja tidak
 * dihapus agar riwayat audit, penulis berita, dan jejak perubahan tetap utuh
 * serta tidak melanggar foreign key.
 *
 * Karena akun hanya berasal dari SSO, akun yang dinonaktifkan akan tetap
 * ditolak saat mencoba masuk kembali walau portal pusat mengizinkannya.
 */
router.delete(
  '/:id',
  requirePermission('users.disable'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    const { id } = getParams<{ id: number }>(req);

    if (actor.id === id) {
      throw AppError.badRequest(
        'Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan.',
        'CANNOT_DISABLE_SELF',
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        userRoles: { select: { role: { select: { code: true } }, studyProgramId: true } },
      },
    });

    if (!target) {
      throw AppError.notFound('Pengguna tidak ditemukan.');
    }

    // Admin Prodi hanya boleh mengelola akun pada prodi yang dikelolanya.
    if (!actor.isSuperAdmin) {
      const tenantId = scopedTenantId(req);
      const relevan = target.userRoles.some((assignment) => assignment.studyProgramId === tenantId);
      if (!relevan) {
        throw AppError.forbidden('Akun ini bukan bagian dari program studi Anda.', 'SCOPE_ESCALATION');
      }
    }

    // Menonaktifkan Admin Utama terakhir akan mengunci seluruh portal.
    const targetIsSuperAdmin = target.userRoles.some((a) => a.role.code === ROLES.SUPER_ADMIN);
    if (targetIsSuperAdmin) {
      const superAdminAktif = await prisma.user.count({
        where: {
          isActive: true,
          id: { not: id },
          userRoles: { some: { role: { code: ROLES.SUPER_ADMIN } } },
        },
      });
      if (superAdminAktif === 0) {
        throw AppError.conflict(
          'Akun Admin Utama terakhir tidak dapat dinonaktifkan. Tunjuk Admin Utama lain lebih dulu.',
          'LAST_SUPER_ADMIN',
        );
      }
    }

    if (!target.isActive) {
      res.json({ success: true, message: 'Akun sudah dalam keadaan nonaktif.', user: { id, isActive: false } });
      return;
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await revokeAllSessions(id);
    await recordAudit({
      req,
      action: 'DELETE',
      module: 'USERS',
      targetType: 'user',
      targetId: id,
      details: { softDelete: true, name: target.name },
    });

    res.json({
      success: true,
      message: `Akun ${target.name} dinonaktifkan dan tidak dapat masuk lagi.`,
      user: { id, isActive: false },
    });
  }),
);

/**
 * POST /api/v1/admin/users/:id/activate
 *
 * Mengaktifkan kembali akun yang sebelumnya dinonaktifkan. Peran yang pernah
 * diberikan tetap berlaku sehingga admin tidak perlu menugaskan ulang.
 */
router.post(
  '/:id/activate',
  requirePermission('users.disable'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
    if (!target) {
      throw AppError.notFound('Pengguna tidak ditemukan.');
    }

    if (target.isActive) {
      res.json({ success: true, message: 'Akun sudah aktif.', user: { id, isActive: true } });
      return;
    }

    await prisma.user.update({ where: { id }, data: { isActive: true } });
    await recordAudit({ req, action: 'UPDATE', module: 'USERS', targetType: 'user', targetId: id, details: { activated: true } });

    res.json({ success: true, message: `Akun ${target.name} diaktifkan kembali.`, user: { id, isActive: true } });
  }),
);

/** DELETE /api/v1/admin/users/:id/roles/:assignmentId: mencabut satu assignment. */
router.delete(
  '/:id/roles/:assignmentId',
  requirePermission('users.assign_role'),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const assignmentId = Number(req.params.assignmentId);

    const assignment = await prisma.userRole.findFirst({ where: { id: assignmentId, userId } });
    if (!assignment) {
      throw AppError.notFound('Assignment peran tidak ditemukan.');
    }

    await prisma.userRole.delete({ where: { id: assignmentId } });
    await revokeAllSessions(userId);
    await recordAudit({ req, action: 'DELETE', module: 'USERS', targetType: 'user_role', targetId: assignmentId });

    res.json({ success: true, message: 'Peran berhasil dicabut. Pengguna perlu masuk ulang.' });
  }),
);

export default router;


