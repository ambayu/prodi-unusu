import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import {
  createDomainSchema,
  createFacultySchema,
  createStudyProgramSchema,
  updateDomainSchema,
  updateFacultySchema,
  updateStudyProgramSchema,
} from '../../../shared/schemas/website.js';
import { idParamSchema } from '../../../shared/schemas/common.js';

const router = Router();

// -------------------------------------------------------------
// Fakultas
// -------------------------------------------------------------

router.get(
  '/faculties',
  requirePermission('organization.view'),
  asyncHandler(async (_req, res) => {
    const faculties = await prisma.faculty.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { studyPrograms: true } } },
    });
    res.json({ success: true, faculties });
  }),
);

router.post(
  '/faculties',
  requirePermission('organization.create'),
  validate({ body: createFacultySchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<Record<string, unknown>>(req);
    const faculty = await prisma.faculty.create({ data: body as never });
    await recordAudit({ req, action: 'CREATE', module: 'ORGANIZATION', targetType: 'faculty', targetId: faculty.id });
    res.status(201).json({ success: true, message: 'Fakultas berhasil dibuat.', faculty });
  }),
);

router.put(
  '/faculties/:id',
  requirePermission('organization.update'),
  validate({ body: updateFacultySchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);
    const faculty = await prisma.faculty.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'ORGANIZATION', targetType: 'faculty', targetId: id });
    res.json({ success: true, message: 'Fakultas berhasil diperbarui.', faculty });
  }),
);

router.delete(
  '/faculties/:id',
  requirePermission('organization.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const programCount = await prisma.studyProgram.count({ where: { facultyId: id } });
    if (programCount > 0) {
      throw AppError.conflict(
        `Fakultas masih memiliki ${programCount} program studi. Pindahkan atau hapus program studi lebih dulu.`,
        'FACULTY_HAS_PROGRAMS',
      );
    }

    await prisma.faculty.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'ORGANIZATION', targetType: 'faculty', targetId: id });
    res.json({ success: true, message: 'Fakultas berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Program Studi (tenant)
// -------------------------------------------------------------

router.get(
  '/study-programs',
  requirePermission('tenant.view'),
  asyncHandler(async (_req, res) => {
    const studyPrograms = await prisma.studyProgram.findMany({
      orderBy: [{ facultyId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        faculty: { select: { id: true, name: true, code: true } },
        domains: { select: { id: true, hostname: true, isPrimary: true, isActive: true } },
        _count: { select: { userRoleAssignments: true, posts: true, lecturers: true } },
      },
    });
    res.json({ success: true, studyPrograms });
  }),
);

router.get(
  '/study-programs/:id',
  requirePermission('tenant.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const studyProgram = await prisma.studyProgram.findUnique({
      where: { id },
      include: {
        faculty: true,
        domains: true,
        websiteSetting: true,
        theme: true,
        _count: {
          select: {
            pages: true,
            posts: true,
            lecturers: true,
            documents: true,
            facilities: true,
            galleries: true,
            curriculums: true,
          },
        },
      },
    });

    if (!studyProgram) {
      throw AppError.notFound('Program studi tidak ditemukan.');
    }

    res.json({ success: true, studyProgram });
  }),
);

/**
 * POST /api/v1/admin/study-programs
 *
 * Membuat tenant baru. Halaman sistem dan menu standar langsung disiapkan agar
 * prodi baru dapat langsung dikelola tanpa menambah aplikasi (docs/PRD.md
 * acceptance criteria 13).
 */
router.post(
  '/study-programs',
  requirePermission('tenant.create'),
  validate({ body: createStudyProgramSchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<{
      facultyId: number;
      code: string;
      name: string;
      slug: string;
      degree: string;
      description?: string | null;
      logoUrl?: string | null;
      status: string;
      sortOrder: number;
    }>(req);

    const faculty = await prisma.faculty.findUnique({ where: { id: body.facultyId } });
    if (!faculty) {
      throw AppError.notFound('Fakultas tidak ditemukan.');
    }

    const { STANDARD_PUBLIC_MENUS } = await import('../../../shared/constants/organization.js');

    const studyProgram = await prisma.$transaction(async (tx) => {
      const created = await tx.studyProgram.create({
        data: {
          facultyId: body.facultyId,
          code: body.code,
          name: body.name,
          slug: body.slug,
          degree: body.degree,
          description: body.description ?? null,
          logoUrl: body.logoUrl ?? null,
          status: body.status,
          sortOrder: body.sortOrder,
        },
      });

      await tx.websiteSetting.create({
        data: {
          studyProgramId: created.id,
          siteTitle: `Program Studi ${created.name}`,
          siteTagline: `Program Studi ${created.name} ${faculty.name}`,
          facultyName: faculty.name,
          seoDescription: created.description,
        },
      });

      await tx.theme.create({ data: { studyProgramId: created.id } });

      await tx.menu.createMany({
        data: STANDARD_PUBLIC_MENUS.map((menu, index) => ({
          studyProgramId: created.id,
          title: menu.title,
          url: menu.url,
          sortOrder: index + 1,
          isRequired: menu.isRequired,
          isActive: true,
        })),
      });

      await tx.page.create({
        data: {
          studyProgramId: created.id,
          slug: 'beranda',
          title: 'Beranda',
          isSystem: true,
          isPublished: false,
        },
      });

      return created;
    });

    await recordAudit({ req, action: 'CREATE', module: 'ORGANIZATION', targetType: 'study_program', targetId: studyProgram.id, studyProgramId: studyProgram.id });
    res.status(201).json({
      success: true,
      message: `Program studi ${studyProgram.name} berhasil dibuat beserta menu dan halaman awal.`,
      studyProgram,
    });
  }),
);

router.put(
  '/study-programs/:id',
  requirePermission('tenant.update'),
  validate({ body: updateStudyProgramSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);
    const studyProgram = await prisma.studyProgram.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'ORGANIZATION', targetType: 'study_program', targetId: id, studyProgramId: id });
    res.json({ success: true, message: 'Program studi berhasil diperbarui.', studyProgram });
  }),
);

router.delete(
  '/study-programs/:id',
  requirePermission('tenant.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const program = await prisma.studyProgram.findUnique({
      where: { id },
      include: { _count: { select: { posts: true, lecturers: true, documents: true, pages: true } } },
    });

    if (!program) {
      throw AppError.notFound('Program studi tidak ditemukan.');
    }

    const hasContent =
      program._count.posts + program._count.lecturers + program._count.documents + program._count.pages > 0;

    if (hasContent) {
      throw AppError.conflict(
        'Program studi masih memiliki konten. Nonaktifkan saja agar data tidak hilang.',
        'TENANT_HAS_CONTENT',
      );
    }

    await prisma.studyProgram.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'ORGANIZATION', targetType: 'study_program', targetId: id });
    res.json({ success: true, message: 'Program studi berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Domain
// -------------------------------------------------------------

router.get(
  '/domains',
  requirePermission('domain.view'),
  asyncHandler(async (_req, res) => {
    const domains = await prisma.domain.findMany({
      orderBy: [{ studyProgramId: 'asc' }, { isPrimary: 'desc' }],
      include: {
        studyProgram: { select: { id: true, name: true, code: true, status: true } },
      },
    });
    res.json({ success: true, domains });
  }),
);

router.post(
  '/domains',
  requirePermission('domain.create'),
  validate({ body: createDomainSchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<{ studyProgramId: number; hostname: string; isPrimary: boolean; isActive: boolean }>(req);

    const studyProgram = await prisma.studyProgram.findUnique({ where: { id: body.studyProgramId } });
    if (!studyProgram) {
      throw AppError.notFound('Program studi tidak ditemukan.');
    }

    const domain = await prisma.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.domain.updateMany({ where: { studyProgramId: body.studyProgramId }, data: { isPrimary: false } });
      }
      return tx.domain.create({
        data: {
          studyProgramId: body.studyProgramId,
          hostname: body.hostname,
          isPrimary: body.isPrimary,
          isActive: body.isActive,
        },
      });
    });

    await recordAudit({ req, action: 'CREATE', module: 'DOMAIN', targetType: 'domain', targetId: domain.id, studyProgramId: body.studyProgramId });
    res.status(201).json({ success: true, message: 'Domain berhasil didaftarkan.', domain });
  }),
);

router.put(
  '/domains/:id',
  requirePermission('domain.update'),
  validate({ body: updateDomainSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{ hostname?: string; isPrimary?: boolean; isActive?: boolean }>(req);

    const existing = await prisma.domain.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Domain tidak ditemukan.');
    }

    const domain = await prisma.$transaction(async (tx) => {
      if (body.isPrimary === true) {
        await tx.domain.updateMany({
          where: { studyProgramId: existing.studyProgramId },
          data: { isPrimary: false },
        });
      }
      return tx.domain.update({ where: { id }, data: body });
    });

    await recordAudit({ req, action: 'UPDATE', module: 'DOMAIN', targetType: 'domain', targetId: id });
    res.json({ success: true, message: 'Domain berhasil diperbarui.', domain });
  }),
);

router.delete(
  '/domains/:id',
  requirePermission('domain.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.domain.findUnique({
      where: { id },
      include: { studyProgram: { select: { _count: { select: { domains: true } } } } },
    });

    if (!existing) {
      throw AppError.notFound('Domain tidak ditemukan.');
    }

    if (existing.studyProgram._count.domains <= 1) {
      throw AppError.conflict(
        'Domain terakhir tidak dapat dihapus. Website prodi akan tidak dapat diakses sama sekali.',
        'LAST_DOMAIN',
      );
    }

    await prisma.domain.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'DOMAIN', targetType: 'domain', targetId: id });
    res.json({ success: true, message: 'Domain berhasil dihapus.' });
  }),
);

/** GET /api/v1/admin/audit-logs: jejak aktivitas, dibatasi tenant bila bukan Super Admin. */
router.get(
  '/audit-logs',
  requirePermission('audit_logs.view'),
  asyncHandler(async (req, res) => {
    const user = req.authUser!;
    const studyProgramId = user.isSuperAdmin ? (req.query.tenantId ? Number(req.query.tenantId) : null) : req.scopedTenantId;

    const logs = await prisma.auditLog.findMany({
      where: studyProgramId ? { studyProgramId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true, username: true } },
        studyProgram: { select: { name: true } },
      },
    });

    res.json({ success: true, logs });
  }),
);

export default router;
