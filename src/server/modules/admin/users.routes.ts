import { Router } from 'express';
import bcrypt from 'bcryptjs';
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

const router = Router();

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
 *
 * Membuat akun. Super Admin bebas membuat akun apa pun; Admin Prodi hanya
 * boleh membuat Editor pada prodinya sendiri.
 */
router.post(
  '/',
  requirePermission('users.create'),
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    const body = getBody<{ name: string; email: string; username: string; password?: string; isActive: boolean }>(req);

    if (!body.password) {
      throw AppError.badRequest(
        'Kata sandi wajib diisi untuk akun yang dibuat manual.',
        'PASSWORD_REQUIRED',
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        username: body.username,
        passwordHash,
        isActive: body.isActive,
      },
      select: { id: true, name: true, email: true, username: true, isActive: true },
    });

    // Akun baru tanpa role tidak punya akses apa pun sampai role diberikan.
    if (!actor.isSuperAdmin) {
      const studyProgramId = scopedTenantId(req);
      const editorRole = await prisma.role.findUnique({ where: { code: ROLES.EDITOR } });
      if (!editorRole) {
        throw AppError.internal('Peran EDITOR belum ada di database. Jalankan seeder.');
      }

      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: editorRole.id,
          scopeType: 'prodi',
          studyProgramId,
        },
      });
    }

    await recordAudit({ req, action: 'CREATE', module: 'USERS', targetType: 'user', targetId: user.id });
    res.status(201).json({ success: true, message: 'Akun pengguna berhasil dibuat.', user });
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

export default router;


