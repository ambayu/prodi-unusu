import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { recordAudit } from '../../services/auditService.js';
import {
  updateThemeSchema,
  updateWebsiteSettingSchema,
  menuItemSchema,
  reorderMenusSchema,
} from '../../../shared/schemas/website.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import { getParams } from '../../utils/validation.js';
import { AppError } from '../../utils/errors.js';

const router = Router();

/** GET /api/v1/admin/dashboard: statistik nyata untuk tenant aktif. */
router.get(
  '/dashboard',
  requirePermission('dashboard.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);

    const [
      curriculums,
      semesters,
      courses,
      lecturers,
      documents,
      facilities,
      postsPublished,
      postsDraft,
      galleries,
      pages,
      unreadMessages,
      mediaAssets,
    ] = await Promise.all([
      prisma.curriculum.count({ where: { studyProgramId, isActive: true } }),
      prisma.curriculumSemester.count({ where: { curriculum: { studyProgramId } } }),
      prisma.curriculumCourse.count({ where: { semester: { curriculum: { studyProgramId } } } }),
      prisma.lecturer.count({ where: { studyProgramId, isActive: true } }),
      prisma.document.count({ where: { studyProgramId } }),
      prisma.facility.count({ where: { studyProgramId } }),
      prisma.post.count({ where: { studyProgramId, status: 'published' } }),
      prisma.post.count({ where: { studyProgramId, status: 'draft' } }),
      prisma.gallery.count({ where: { studyProgramId } }),
      prisma.page.count({ where: { studyProgramId } }),
      prisma.contactMessage.count({ where: { studyProgramId, isRead: false } }),
      prisma.mediaAsset.count({ where: { studyProgramId } }),
    ]);

    const creditsAggregate = await prisma.curriculumCourse.aggregate({
      where: { semester: { curriculum: { studyProgramId } } },
      _sum: { credits: true },
    });

    const recentPosts = await prisma.post.findMany({
      where: { studyProgramId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, updatedAt: true },
    });

    const recentAudit = await prisma.auditLog.findMany({
      where: { studyProgramId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { name: true } } },
    });

    res.json({
      success: true,
      stats: {
        curriculums,
        semesters,
        courses,
        totalCredits: creditsAggregate._sum.credits ?? 0,
        lecturers,
        documents,
        facilities,
        postsPublished,
        postsDraft,
        galleries,
        pages,
        unreadMessages,
        mediaAssets,
      },
      recentPosts,
      recentAudit,
    });
  }),
);

/** GET /api/v1/admin/dashboard/super: ringkasan lintas tenant untuk Super Admin. */
router.get(
  '/dashboard/super',
  requirePermission('organization.view'),
  asyncHandler(async (req, res) => {
    if (!req.authUser?.isSuperAdmin) {
      throw AppError.forbidden('Ringkasan lintas tenant hanya untuk Super Admin.', 'SUPER_ADMIN_ONLY');
    }

    const [faculties, studyPrograms, activeDomains, inactiveDomains, users, totalPosts, totalDocuments] =
      await Promise.all([
        prisma.faculty.count(),
        prisma.studyProgram.count(),
        prisma.domain.count({ where: { isActive: true } }),
        prisma.domain.count({ where: { isActive: false } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.post.count(),
        prisma.document.count(),
      ]);

    const domains = await prisma.domain.findMany({
      orderBy: [{ isPrimary: 'desc' }, { hostname: 'asc' }],
      include: {
        studyProgram: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            faculty: { select: { name: true } },
          },
        },
      },
    });

    const recentAudit = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: { select: { name: true } },
        studyProgram: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      stats: {
        faculties,
        studyPrograms,
        activeDomains,
        inactiveDomains,
        users,
        totalPosts,
        totalDocuments,
      },
      domains,
      recentAudit,
    });
  }),
);

/** GET /api/v1/admin/settings: identitas website dan tema tenant. */
router.get(
  '/settings',
  requirePermission('website.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const [setting, theme, studyProgram] = await Promise.all([
      prisma.websiteSetting.findUnique({ where: { studyProgramId } }),
      prisma.theme.findUnique({ where: { studyProgramId } }),
      prisma.studyProgram.findUnique({
        where: { id: studyProgramId },
        select: {
          id: true,
          name: true,
          code: true,
          slug: true,
          degree: true,
          description: true,
          logoUrl: true,
          status: true,
          faculty: { select: { name: true } },
          domains: { select: { id: true, hostname: true, isPrimary: true, isActive: true } },
        },
      }),
    ]);

    if (!studyProgram) {
      throw AppError.notFound('Program studi tidak ditemukan.');
    }

    res.json({ success: true, setting, theme, studyProgram });
  }),
);

/** PUT /api/v1/admin/settings: memperbarui identitas website. */
router.put(
  '/settings',
  requirePermission('website.update'),
  validate({ body: updateWebsiteSettingSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const studyProgram = await prisma.studyProgram.findUnique({ where: { id: studyProgramId } });
    if (!studyProgram) {
      throw AppError.notFound('Program studi tidak ditemukan.');
    }

    const setting = await prisma.websiteSetting.upsert({
      where: { studyProgramId },
      create: {
        studyProgramId,
        siteTitle: (body.siteTitle as string) ?? `Program Studi ${studyProgram.name}`,
        ...body,
      },
      update: body,
    });

    await recordAudit({ req, action: 'UPDATE', module: 'WEBSITE_SETTINGS', targetType: 'website_setting', targetId: setting.id, details: body });
    res.json({ success: true, message: 'Identitas website berhasil diperbarui.', setting });
  }),
);

/** PUT /api/v1/admin/settings/theme: memperbarui token desain tenant. */
router.put(
  '/settings/theme',
  requirePermission('theme.update'),
  validate({ body: updateThemeSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const theme = await prisma.theme.upsert({
      where: { studyProgramId },
      create: { studyProgramId, ...body },
      update: body,
    });

    await recordAudit({ req, action: 'UPDATE', module: 'THEME', targetType: 'theme', targetId: theme.id, details: body });
    res.json({ success: true, message: 'Tema website berhasil diperbarui.', theme });
  }),
);

/** GET /api/v1/admin/menus: navigasi publik tenant. */
router.get(
  '/menus',
  requirePermission('navigation.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const menus = await prisma.menu.findMany({
      where: { studyProgramId, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ success: true, menus });
  }),
);

/** POST /api/v1/admin/menus: menambah menu navigasi. */
router.post(
  '/menus',
  requirePermission('navigation.create'),
  validate({ body: menuItemSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{ title: string; url: string; target: string; sortOrder: number; isActive: boolean }>(req);

    const menu = await prisma.menu.create({ data: { studyProgramId, ...body } });
    await recordAudit({ req, action: 'CREATE', module: 'NAVIGATION', targetType: 'menu', targetId: menu.id });
    res.status(201).json({ success: true, message: 'Menu navigasi berhasil ditambahkan.', menu });
  }),
);

/** PUT /api/v1/admin/menus/:id: mengubah satu menu. */
router.put(
  '/menus/:id',
  requirePermission('navigation.update'),
  validate({ body: menuItemSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.menu.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Menu navigasi tidak ditemukan pada program studi ini.');
    }

    const menu = await prisma.menu.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'NAVIGATION', targetType: 'menu', targetId: id, details: body });
    res.json({ success: true, message: 'Menu navigasi berhasil diperbarui.', menu });
  }),
);

/** DELETE /api/v1/admin/menus/:id: menghapus menu non-wajib. */
router.delete(
  '/menus/:id',
  requirePermission('navigation.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.menu.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Menu navigasi tidak ditemukan pada program studi ini.');
    }
    if (existing.isRequired) {
      throw AppError.badRequest(
        'Menu wajib tidak dapat dihapus. Nonaktifkan saja bila tidak ingin ditampilkan.',
        'REQUIRED_MENU',
      );
    }

    await prisma.menu.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'NAVIGATION', targetType: 'menu', targetId: id });
    res.json({ success: true, message: 'Menu navigasi berhasil dihapus.' });
  }),
);

/** PUT /api/v1/admin/menus/reorder: menyimpan urutan menu baru. */
router.put(
  '/menus/reorder',
  requirePermission('navigation.update'),
  validate({ body: reorderMenusSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { items } = getBody<{ items: Array<{ id: number; sortOrder: number }> }>(req);

    const owned = await prisma.menu.findMany({
      where: { id: { in: items.map((item) => item.id) }, studyProgramId },
      select: { id: true },
    });

    if (owned.length !== items.length) {
      throw AppError.forbidden('Ada menu yang bukan milik program studi ini.', 'CROSS_TENANT_DENIED');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.menu.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
      ),
    );

    await recordAudit({ req, action: 'UPDATE', module: 'NAVIGATION', details: { reorder: items } });
    res.json({ success: true, message: 'Urutan menu berhasil disimpan.' });
  }),
);

export default router;
