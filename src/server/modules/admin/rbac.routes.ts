import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import { ROLES } from '../../../shared/constants/permissions.js';

const router = Router();

/**
 * GET /api/v1/admin/roles
 * Daftar seluruh peran beserta jumlah pemegang peran dan jumlah izinnya.
 */
router.get(
  '/roles',
  requirePermission('users.view'),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                module: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      roles: roles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        userCount: r._count.userRoles,
        permissionCount: r._count.rolePermissions,
        permissions: r.rolePermissions.map((rp) => rp.permission),
        createdAt: r.createdAt,
      })),
    });
  }),
);

/**
 * GET /api/v1/admin/roles/:id
 * Detail peran beserta daftar izin lengkap.
 */
router.get(
  '/roles/:id',
  requirePermission('users.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw AppError.notFound('Peran tidak ditemukan.');
    }

    res.json({
      success: true,
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        userCount: role._count.userRoles,
        permissions: role.rolePermissions.map((rp) => rp.permission),
        createdAt: role.createdAt,
      },
    });
  }),
);

/**
 * POST /api/v1/admin/roles
 * Membuat peran baru (Hanya Super Admin).
 */
router.post(
  '/roles',
  requirePermission('users.create'),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    if (!actor.isSuperAdmin) {
      throw AppError.forbidden('Hanya Super Administrator yang dapat membuat peran baru.');
    }

    const { code, name, description, permissionCodes = [] } = getBody<{
      code: string;
      name: string;
      description?: string;
      permissionCodes?: string[];
    }>(req);

    if (!code || !name) {
      throw AppError.badRequest('Kode peran dan nama peran wajib diisi.');
    }

    const existing = await prisma.role.findUnique({ where: { code } });
    if (existing) {
      throw AppError.conflict(`Peran dengan kode "${code}" sudah ada.`);
    }

    const role = await prisma.role.create({
      data: {
        code,
        name,
        description: description || null,
      },
    });

    if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });

      if (perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    }

    await recordAudit({ req, action: 'CREATE', module: 'ROLES', targetType: 'role', targetId: role.id });
    res.status(201).json({ success: true, message: 'Peran berhasil dibuat.', role });
  }),
);

/**
 * PUT /api/v1/admin/roles/:id
 * Mengubah nama/deskripsi dan daftar izin peran.
 */
router.put(
  '/roles/:id',
  requirePermission('users.update'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    if (!actor.isSuperAdmin) {
      throw AppError.forbidden('Hanya Super Administrator yang dapat mengubah peran.');
    }

    const { id } = getParams<{ id: number }>(req);
    const { name, description, permissionCodes } = getBody<{
      name?: string;
      description?: string;
      permissionCodes?: string[];
    }>(req);

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Peran tidak ditemukan.');
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    if (Array.isArray(permissionCodes)) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      if (permissionCodes.length > 0) {
        const perms = await prisma.permission.findMany({
          where: { code: { in: permissionCodes } },
          select: { id: true },
        });

        if (perms.length > 0) {
          await prisma.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
            skipDuplicates: true,
          });
        }
      }
    }

    await recordAudit({ req, action: 'UPDATE', module: 'ROLES', targetType: 'role', targetId: id });
    res.json({ success: true, message: 'Peran berhasil diperbarui.', role: updated });
  }),
);

/**
 * DELETE /api/v1/admin/roles/:id
 * Menghapus peran (kecuali peran sistem inti).
 */
router.delete(
  '/roles/:id',
  requirePermission('users.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const actor = req.authUser!;
    if (!actor.isSuperAdmin) {
      throw AppError.forbidden('Hanya Super Administrator yang dapat menghapus peran.');
    }

    const { id } = getParams<{ id: number }>(req);
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!existing) {
      throw AppError.notFound('Peran tidak ditemukan.');
    }

    const systemRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN_FAKULTAS, ROLES.ADMIN_PRODI, ROLES.EDITOR];
    if (systemRoles.includes(existing.code as any)) {
      throw AppError.forbidden(`Peran sistem inti "${existing.name}" tidak boleh dihapus.`);
    }

    if (existing._count.userRoles > 0) {
      throw AppError.badRequest(
        `Peran tidak dapat dihapus karena masih digunakan oleh ${existing._count.userRoles} pengguna.`
      );
    }

    await prisma.role.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'ROLES', targetType: 'role', targetId: id });
    res.json({ success: true, message: 'Peran berhasil dihapus.' });
  }),
);

/**
 * GET /api/v1/admin/permissions
 * Mengambil seluruh katalog izin yang dikelompokkan berdasarkan modul.
 */
router.get(
  '/permissions',
  requirePermission('users.view'),
  asyncHandler(async (_req, res) => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    // Kelompokkan per modul
    const modulesMap = new Map<string, typeof permissions>();
    for (const p of permissions) {
      const list = modulesMap.get(p.module) ?? [];
      list.push(p);
      modulesMap.set(p.module, list);
    }

    const modules = Array.from(modulesMap.entries()).map(([moduleName, items]) => ({
      module: moduleName,
      count: items.length,
      permissions: items,
    }));

    res.json({
      success: true,
      total: permissions.length,
      modules,
      permissions,
    });
  }),
);

export default router;
