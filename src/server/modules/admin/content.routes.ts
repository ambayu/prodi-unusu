import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { findCourseInTenant, findSemesterInTenant } from '../../services/curriculumService.js';
import {
  createCurriculumSchema,
  createSemesterSchema,
  createCourseSchema,
  createLecturerSchema,
  createDocumentSchema,
  createFacilitySchema,
} from '../../../shared/schemas/content.js';
import { idParamSchema } from '../../../shared/schemas/common.js';

const router = Router();

// -------------------------------------------------------------
// Kurikulum
// -------------------------------------------------------------

/** GET /api/v1/admin/curriculums: semua kurikulum tenant beserta semester dan mata kuliah. */
router.get(
  '/curriculums',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const curriculums = await prisma.curriculum.findMany({
      where: { studyProgramId },
      orderBy: [{ year: 'desc' }, { id: 'desc' }],
      include: {
        semesters: {
          orderBy: { semesterNumber: 'asc' },
          include: {
            courses: {
              orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
              include: { rpsDocuments: true },
            },
          },
        },
      },
    });

    res.json({ success: true, curriculums });
  }),
);

/** POST /api/v1/admin/curriculums: membuat kurikulum baru. */
router.post(
  '/curriculums',
  requirePermission('curriculum.create'),
  validate({ body: createCurriculumSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{ name: string; year: number; description?: string | null; isActive: boolean }>(req);

    const curriculum = await prisma.curriculum.create({
      data: {
        studyProgramId,
        name: body.name,
        year: body.year,
        description: body.description ?? null,
        isActive: body.isActive,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'CURRICULUM', targetType: 'curriculum', targetId: curriculum.id });
    res.status(201).json({ success: true, message: 'Kurikulum berhasil dibuat.', curriculum });
  }),
);

/** PUT /api/v1/admin/curriculums/:id: memperbarui kurikulum. */
router.put(
  '/curriculums/:id',
  requirePermission('curriculum.update'),
  validate({ body: createCurriculumSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.curriculum.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Kurikulum tidak ditemukan pada program studi ini.');
    }

    const curriculum = await prisma.curriculum.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'curriculum', targetId: id });
    res.json({ success: true, message: 'Kurikulum berhasil diperbarui.', curriculum });
  }),
);

/** DELETE /api/v1/admin/curriculums/:id: menghapus kurikulum beserta isinya. */
router.delete(
  '/curriculums/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.curriculum.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Kurikulum tidak ditemukan pada program studi ini.');
    }

    await prisma.curriculum.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'curriculum', targetId: id });
    res.json({ success: true, message: 'Kurikulum berhasil dihapus.' });
  }),
);

/** POST /api/v1/admin/semesters: menambah semester pada kurikulum. */
router.post(
  '/semesters',
  requirePermission('curriculum.create'),
  validate({ body: createSemesterSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{ curriculumId: number; semesterNumber: number; title: string }>(req);

    const curriculum = await prisma.curriculum.findFirst({
      where: { id: body.curriculumId, studyProgramId },
    });
    if (!curriculum) {
      throw AppError.notFound('Kurikulum tidak ditemukan pada program studi ini.');
    }

    const semester = await prisma.curriculumSemester.create({
      data: {
        curriculumId: body.curriculumId,
        semesterNumber: body.semesterNumber,
        title: body.title,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'CURRICULUM', targetType: 'semester', targetId: semester.id });
    res.status(201).json({ success: true, message: 'Semester berhasil ditambahkan.', semester });
  }),
);

/** DELETE /api/v1/admin/semesters/:id: menghapus semester. */
router.delete(
  '/semesters/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const semester = await findSemesterInTenant(id, studyProgramId);
    if (!semester) {
      throw AppError.notFound('Semester tidak ditemukan pada program studi ini.');
    }

    await prisma.curriculumSemester.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'semester', targetId: id });
    res.json({ success: true, message: 'Semester berhasil dihapus.' });
  }),
);

/** POST /api/v1/admin/courses: menambah mata kuliah. */
router.post(
  '/courses',
  requirePermission('curriculum.create'),
  validate({ body: createCourseSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{
      semesterId: number;
      code: string;
      name: string;
      credits: number;
      courseType: string;
      description?: string | null;
      sortOrder: number;
    }>(req);

    const semester = await findSemesterInTenant(body.semesterId, studyProgramId);
    if (!semester) {
      throw AppError.notFound('Semester tidak ditemukan pada program studi ini.');
    }

    const course = await prisma.curriculumCourse.create({
      data: {
        semesterId: body.semesterId,
        code: body.code,
        name: body.name,
        credits: body.credits,
        courseType: body.courseType,
        description: body.description ?? null,
        sortOrder: body.sortOrder,
      },
    });

    await recordAudit({ req, action: 'CREATE', module: 'CURRICULUM', targetType: 'course', targetId: course.id });
    res.status(201).json({ success: true, message: 'Mata kuliah berhasil ditambahkan.', course });
  }),
);

/** PUT /api/v1/admin/courses/:id: memperbarui mata kuliah. */
router.put(
  '/courses/:id',
  requirePermission('curriculum.update'),
  validate({ body: createCourseSchema.partial().omit({ semesterId: true }), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await findCourseInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    const course = await prisma.curriculumCourse.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'course', targetId: id });
    res.json({ success: true, message: 'Mata kuliah berhasil diperbarui.', course });
  }),
);

/** DELETE /api/v1/admin/courses/:id: menghapus mata kuliah. */
router.delete(
  '/courses/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await findCourseInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    await prisma.curriculumCourse.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'course', targetId: id });
    res.json({ success: true, message: 'Mata kuliah berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Dosen
// -------------------------------------------------------------

router.get(
  '/lecturers',
  requirePermission('lecturers.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const lecturers = await prisma.lecturer.findMany({
      where: { studyProgramId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, lecturers });
  }),
);

router.post(
  '/lecturers',
  requirePermission('lecturers.create'),
  validate({ body: createLecturerSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const lecturer = await prisma.lecturer.create({
      data: { studyProgramId, ...(body as object) } as never,
    });

    await recordAudit({ req, action: 'CREATE', module: 'LECTURERS', targetType: 'lecturer', targetId: lecturer.id });
    res.status(201).json({ success: true, message: 'Data dosen berhasil disimpan.', lecturer });
  }),
);

router.put(
  '/lecturers/:id',
  requirePermission('lecturers.update'),
  validate({ body: createLecturerSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.lecturer.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Data dosen tidak ditemukan pada program studi ini.');
    }

    const lecturer = await prisma.lecturer.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'LECTURERS', targetType: 'lecturer', targetId: id });
    res.json({ success: true, message: 'Data dosen berhasil diperbarui.', lecturer });
  }),
);

router.delete(
  '/lecturers/:id',
  requirePermission('lecturers.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.lecturer.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Data dosen tidak ditemukan pada program studi ini.');
    }

    await prisma.lecturer.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'LECTURERS', targetType: 'lecturer', targetId: id });
    res.json({ success: true, message: 'Data dosen berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Dokumen
// -------------------------------------------------------------

router.get(
  '/documents',
  requirePermission('documents.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const documents = await prisma.document.findMany({
      where: { studyProgramId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, documents });
  }),
);

router.post(
  '/documents',
  requirePermission('documents.create'),
  validate({ body: createDocumentSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const document = await prisma.document.create({
      data: { studyProgramId, ...(body as object) } as never,
    });

    await recordAudit({ req, action: 'CREATE', module: 'DOCUMENTS', targetType: 'document', targetId: document.id });
    res.status(201).json({ success: true, message: 'Dokumen berhasil disimpan.', document });
  }),
);

router.put(
  '/documents/:id',
  requirePermission('documents.update'),
  validate({ body: createDocumentSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.document.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Dokumen tidak ditemukan pada program studi ini.');
    }

    const document = await prisma.document.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'DOCUMENTS', targetType: 'document', targetId: id });
    res.json({ success: true, message: 'Dokumen berhasil diperbarui.', document });
  }),
);

router.delete(
  '/documents/:id',
  requirePermission('documents.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.document.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Dokumen tidak ditemukan pada program studi ini.');
    }

    await prisma.document.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'DOCUMENTS', targetType: 'document', targetId: id });
    res.json({ success: true, message: 'Dokumen berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Sarana & Prasarana
// -------------------------------------------------------------

router.get(
  '/facilities',
  requirePermission('facilities.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const facilities = await prisma.facility.findMany({
      where: { studyProgramId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, facilities });
  }),
);

router.post(
  '/facilities',
  requirePermission('facilities.create'),
  validate({ body: createFacilitySchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<Record<string, unknown>>(req);

    const facility = await prisma.facility.create({
      data: { studyProgramId, ...(body as object) } as never,
    });

    await recordAudit({ req, action: 'CREATE', module: 'FACILITIES', targetType: 'facility', targetId: facility.id });
    res.status(201).json({ success: true, message: 'Fasilitas berhasil disimpan.', facility });
  }),
);

router.put(
  '/facilities/:id',
  requirePermission('facilities.update'),
  validate({ body: createFacilitySchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await prisma.facility.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Fasilitas tidak ditemukan pada program studi ini.');
    }

    const facility = await prisma.facility.update({ where: { id }, data: body });
    await recordAudit({ req, action: 'UPDATE', module: 'FACILITIES', targetType: 'facility', targetId: id });
    res.json({ success: true, message: 'Fasilitas berhasil diperbarui.', facility });
  }),
);

router.delete(
  '/facilities/:id',
  requirePermission('facilities.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await prisma.facility.findFirst({ where: { id, studyProgramId } });
    if (!existing) {
      throw AppError.notFound('Fasilitas tidak ditemukan pada program studi ini.');
    }

    await prisma.facility.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'FACILITIES', targetType: 'facility', targetId: id });
    res.json({ success: true, message: 'Fasilitas berhasil dihapus.' });
  }),
);

export default router;
