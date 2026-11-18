import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { findCourseInTenant, findCourseMasterInTenant, findCurriculumItemInTenant, findSemesterInTenant } from '../../services/curriculumService.js';
import { fetchLecturersFromApiHub } from '../../services/lecturerIntegrationService.js';
import {
  createAcademicSemesterSchema,
  createCurriculumSchema,
  createSemesterSchema,
  createCourseSchema,
  createCourseMasterSchema,
  updateCourseMasterSchema,
  createCurriculumItemSchema,
  upsertCurriculumItemSchema,
  updateCurriculumItemSchema,
  createFacilitySchema,
} from '../../../shared/schemas/content.js';
import { idParamSchema } from '../../../shared/schemas/common.js';

const router = Router();

// -------------------------------------------------------------
// Master Semester (Kalender Akademik Global)
// -------------------------------------------------------------

/** GET /api/v1/admin/academic-semesters: daftar semester akademik universitas. */
router.get(
  '/academic-semesters',
  requirePermission('organization.view'),
  asyncHandler(async (_req, res) => {
    const semesters = await prisma.academicSemester.findMany({
      orderBy: [{ startDate: 'desc' }, { code: 'desc' }],
    });
    res.json({ success: true, semesters });
  }),
);

/** POST /api/v1/admin/academic-semesters: tambah semester akademik baru. */
router.post(
  '/academic-semesters',
  requirePermission('organization.manage'),
  validate({ body: createAcademicSemesterSchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<{
      code: string;
      name: string;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }>(req);

    const existing = await prisma.academicSemester.findUnique({
      where: { code: body.code },
    });
    if (existing) {
      throw AppError.conflict('Kode semester sudah digunakan.');
    }

    const semester = await prisma.academicSemester.create({
      data: {
        code: body.code,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: body.isActive,
      },
    });

    await recordAudit({
      req,
      action: 'CREATE',
      module: 'ORGANIZATION',
      targetType: 'academic_semester',
      targetId: semester.id,
    });
    res.status(201).json({ success: true, message: 'Semester akademik berhasil ditambahkan.', semester });
  }),
);

/** PUT /api/v1/admin/academic-semesters/:id: perbarui semester akademik. */
router.put(
  '/academic-semesters/:id',
  requirePermission('organization.manage'),
  validate({ body: createAcademicSemesterSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<any>(req);

    const existing = await prisma.academicSemester.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Semester akademik tidak ditemukan.');
    }

    const data: any = { ...body };
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);

    const semester = await prisma.academicSemester.update({
      where: { id },
      data,
    });

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'ORGANIZATION',
      targetType: 'academic_semester',
      targetId: id,
    });
    res.json({ success: true, message: 'Semester akademik berhasil diperbarui.', semester });
  }),
);

/** DELETE /api/v1/admin/academic-semesters/:id: hapus semester akademik. */
router.delete(
  '/academic-semesters/:id',
  requirePermission('organization.manage'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = getParams<{ id: number }>(req);
    const existing = await prisma.academicSemester.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Semester akademik tidak ditemukan.');
    }

    await prisma.academicSemester.delete({ where: { id } });
    await recordAudit({
      req,
      action: 'DELETE',
      module: 'ORGANIZATION',
      targetType: 'academic_semester',
      targetId: id,
    });
    res.json({ success: true, message: 'Semester akademik berhasil dihapus.' });
  }),
);

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
              include: {
                academicSemester: true,
                rpsDocuments: true,
              },
            },
          },
        },
      },
    });

    res.json({ success: true, curriculums });
  }),
);

/**
 * GET /api/v1/admin/courses
 *
 * Daftar mata kuliah **datar** milik prodi aktif untuk halaman `/admin/kurikulum`.
 * Halaman itu menampilkan mata kuliah lintas semester tanpa hierarki kurikulum,
 * sehingga perataan dilakukan di server agar klien tidak perlu menelusuri pohon
 * kurikulum setiap kali hanya butuh satu baris tabel.
 *
 * Sejak 2026-11-16 mata kuliah memiliki `study_program_id` langsung (keputusan
 * "matakuliah di input nanti per prodi"), sehingga filter isolasi tenant tidak
 * lagi bergantung pada keberadaan semester. Mata kuliah tanpa semester kini
 * tetap tampil — sebelumnya ia hilang diam-diam dari daftar.
 *
 * Filter semester, keterangan, dan dosen dilakukan di klien karena jumlah mata
 * kuliah satu prodi masih wajar dimuat sekaligus; ini menghindari endpoint
 * filter yang harus disesuaikan setiap kali kolom baru ditambahkan.
 */
router.get(
  '/courses',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    // `scopedTenantId` berasal dari sesi, bukan dari browser.
    const studyProgramId = scopedTenantId(req);
    const courses = await prisma.curriculumCourse.findMany({
      where: { studyProgramId },
      orderBy: [{ academicSemester: { startDate: 'desc' } }, { sortOrder: 'asc' }, { code: 'asc' }],
      include: {
        academicSemester: true,
        semester: { select: { id: true, semesterNumber: true, title: true, curriculumId: true } },
        rpsDocuments: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, fileUrl: true, revision: true },
        },
      },
    });

    res.json({ success: true, courses });
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
      academicSemesterId: number;
      code: string;
      name: string;
      credits: number;
      description?: string | null;
      lecturersData?: any;
      sortOrder: number;
    }>(req);

    // "Semester" pada mata kuliah berarti master semester kalender.
    const academicSemester = await prisma.academicSemester.findUnique({
      where: { id: body.academicSemesterId },
    });
    if (!academicSemester) {
      throw AppError.notFound('Semester akademik tidak ditemukan.');
    }

    /**
     * Mata kuliah kini milik prodi langsung lewat `studyProgramId`, sehingga
     * tidak perlu lagi mencari kurikulum hanya untuk mendapat "jangkar"
     * semester. Kurikulum tetap tidak wajib: admin prodi dapat mengisi mata
     * kuliah tanpa membuat kurikulum lebih dulu.
     */
    const course = await prisma.curriculumCourse.create({
      data: {
        studyProgramId,
        academicSemesterId: body.academicSemesterId,
        code: body.code,
        name: body.name,
        credits: body.credits,
        description: body.description ?? null,
        lecturersData: body.lecturersData ?? null,
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
  validate({ body: createCourseSchema.partial(), params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await findCourseInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    // Bila semester akademik diubah, pastikan id-nya benar-benar ada.
    if (typeof body.academicSemesterId === 'number') {
      const target = await prisma.academicSemester.findUnique({ where: { id: body.academicSemesterId } });
      if (!target) {
        throw AppError.notFound('Semester akademik tidak ditemukan.');
      }
    }

    /*
     * `studyProgramId` sengaja tidak termasuk `createCourseSchema`, sehingga
     * tidak dapat dikirim dari browser dan tidak dapat dipakai untuk
     * memindahkan mata kuliah ke prodi lain. Kepemilikan tetap dari sesi.
     */
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
// Master Mata Kuliah (`courses`)
// -------------------------------------------------------------
//
// Master hanya berisi identitas: kode + nama. Inilah yang diinput di menu
// "Mata Kuliah". Detail penawaran (SKS, semester, dosen, RPS) ada di blok
// "Penawaran Mata Kuliah dalam Kurikulum" di bawah.

/** GET /api/v1/admin/master-courses: seluruh master mata kuliah milik prodi. */
router.get(
  '/master-courses',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const courses = await prisma.course.findMany({
      where: { studyProgramId },
      orderBy: [{ code: 'asc' }],
      select: { id: true, code: true, name: true, createdAt: true },
    });

    res.json({ success: true, courses });
  }),
);

/** POST /api/v1/admin/master-courses: membuat master mata kuliah. */
router.post(
  '/master-courses',
  requirePermission('curriculum.create'),
  validate({ body: createCourseMasterSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{ code: string; name: string }>(req);

    // Kode mata kuliah harus unik per prodi, bukan global antarprodi.
    const duplicate = await prisma.course.findFirst({
      where: { studyProgramId, code: body.code },
      select: { id: true },
    });
    if (duplicate) {
      throw AppError.conflict(`Kode mata kuliah "${body.code}" sudah dipakai pada program studi ini.`);
    }

    const course = await prisma.course.create({
      data: { studyProgramId, code: body.code, name: body.name },
      select: { id: true, code: true, name: true, createdAt: true },
    });

    await recordAudit({ req, action: 'CREATE', module: 'CURRICULUM', targetType: 'course_master', targetId: course.id });
    res.status(201).json({ success: true, message: 'Mata kuliah berhasil ditambahkan.', course });
  }),
);

/** PUT /api/v1/admin/master-courses/:id: memperbarui master mata kuliah. */
router.put(
  '/master-courses/:id',
  requirePermission('curriculum.update'),
  validate({ body: updateCourseMasterSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<{ code?: string; name?: string }>(req);

    const existing = await findCourseMasterInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.course.findFirst({
        where: { studyProgramId, code: body.code, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) {
        throw AppError.conflict(`Kode mata kuliah "${body.code}" sudah dipakai pada program studi ini.`);
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: body,
      select: { id: true, code: true, name: true, createdAt: true },
    });

    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'course_master', targetId: id });
    res.json({ success: true, message: 'Mata kuliah berhasil diperbarui.', course });
  }),
);

/** DELETE /api/v1/admin/master-courses/:id: menghapus master beserta penawarannya. */
router.delete(
  '/master-courses/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await findCourseMasterInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    // `onDelete: Cascade` pada `curriculum_items.course_id` ikut menghapus
    // penawaran mata kuliah ini di seluruh kurikulum, beserta RPS-nya.
    await prisma.course.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'course_master', targetId: id });
    res.json({ success: true, message: 'Mata kuliah berhasil dihapus.' });
  }),
);

// -------------------------------------------------------------
// Penawaran Mata Kuliah dalam Kurikulum (`curriculum_items`)
// -------------------------------------------------------------

/**
 * GET /api/v1/admin/curriculum-items
 *
 * Baris tabel halaman `/admin/kurikulum`. Setiap baris menautkan master mata
 * kuliah (`courseId`) dengan detail penawarannya. `curriculumId` boleh
 * dispesifikasikan lewat query; tanpa itu seluruh penawaran prodi dikembalikan.
 */
router.get(
  '/curriculum-items',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const curriculumId =
      typeof req.query.curriculumId === 'string' && req.query.curriculumId !== ''
        ? Number(req.query.curriculumId)
        : null;

    const items = await prisma.curriculumItem.findMany({
      where: {
        curriculum: { studyProgramId },
        ...(curriculumId && Number.isInteger(curriculumId) ? { curriculumId } : {}),
      },
      orderBy: [{ curriculumId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        curriculum: { select: { id: true, name: true, year: true } },
        course: { select: { id: true, code: true, name: true } },
        academicSemester: true,
        rpsDocuments: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, fileUrl: true, revision: true },
        },
      },
    });

    res.json({ success: true, items });
  }),
);

/** POST /api/v1/admin/curriculum-items: menawarkan mata kuliah pada kurikulum. */
router.post(
  '/curriculum-items',
  requirePermission('curriculum.create'),
  validate({ body: createCurriculumItemSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{
      curriculumId: number;
      courseId: number;
      academicSemesterId?: number | null;
      credits: number;
      description?: string | null;
      lecturersData?: unknown;
      sortOrder: number;
    }>(req);

    const curriculum = await prisma.curriculum.findFirst({
      where: { id: body.curriculumId, studyProgramId },
      select: { id: true },
    });
    if (!curriculum) {
      throw AppError.notFound('Kurikulum tidak ditemukan pada program studi ini.');
    }

    // Master harus milik prodi yang sama — mencegah penautan lintas prodi.
    const course = await findCourseMasterInTenant(body.courseId, studyProgramId);
    if (!course) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    if (body.academicSemesterId) {
      const semester = await prisma.academicSemester.findUnique({ where: { id: body.academicSemesterId } });
      if (!semester) throw AppError.notFound('Semester akademik tidak ditemukan.');
    }

    const duplicate = await prisma.curriculumItem.findFirst({
      where: { curriculumId: body.curriculumId, courseId: body.courseId },
      select: { id: true },
    });
    if (duplicate) {
      throw AppError.conflict('Mata kuliah tersebut sudah ada pada kurikulum ini.');
    }

    const item = await prisma.curriculumItem.create({
      data: {
        curriculumId: body.curriculumId,
        courseId: body.courseId,
        academicSemesterId: body.academicSemesterId ?? null,
        credits: body.credits,
        description: body.description ?? null,
        lecturersData: (body.lecturersData ?? null) as any,
        sortOrder: body.sortOrder,
      },
      include: { course: true, academicSemester: true, rpsDocuments: true },
    });

    await recordAudit({ req, action: 'CREATE', module: 'CURRICULUM', targetType: 'curriculum_item', targetId: item.id });
    res.status(201).json({ success: true, message: 'Mata kuliah berhasil ditambahkan ke kurikulum.', item });
  }),
);

/**
 * POST /api/v1/admin/curriculum-items/upsert
 *
 * Menawarkan mata kuliah dan, bila perlu, menyiapkan wadah kurikulumnya dalam
 * satu permintaan. Dipakai formulir "Tambah Mata Kuliah": prodi yang belum punya
 * kurikulum cukup mengisi nama dan tahun, tanpa berpindah halaman.
 *
 * Pencarian wadah memakai `@@unique([studyProgramId, year])`, sehingga
 * menekan simpan dua kali untuk tahun yang sama tidak membuat duplikat.
 */
router.post(
  '/curriculum-items/upsert',
  requirePermission('curriculum.create'),
  validate({ body: upsertCurriculumItemSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const body = getBody<{
      curriculumId: number;
      curriculumName: string;
      curriculumYear?: number;
      courseId: number;
      academicSemesterId?: number | null;
      credits: number;
      description?: string | null;
      lecturersData?: unknown;
      sortOrder: number;
    }>(req);

    const course = await findCourseMasterInTenant(body.courseId, studyProgramId);
    if (!course) {
      throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }

    if (body.academicSemesterId) {
      const semester = await prisma.academicSemester.findUnique({ where: { id: body.academicSemesterId } });
      if (!semester) throw AppError.notFound('Semester akademik tidak ditemukan.');
    }

    let curriculumId = body.curriculumId;
    if (curriculumId > 0) {
      const owned = await prisma.curriculum.findFirst({
        where: { id: curriculumId, studyProgramId },
        select: { id: true },
      });
      if (!owned) {
        throw AppError.notFound('Kurikulum tidak ditemukan pada program studi ini.');
      }
    } else {
      if (!body.curriculumName || !body.curriculumYear) {
        throw AppError.badRequest(
          'Isi nama dan tahun kurikulum baru terlebih dahulu.',
          'CURRICULUM_REQUIRED',
        );
      }
      const curriculum = await prisma.curriculum.upsert({
        where: { studyProgramId_year: { studyProgramId, year: body.curriculumYear } },
        create: {
          studyProgramId,
          name: body.curriculumName,
          year: body.curriculumYear,
          isActive: true,
        },
        update: { name: body.curriculumName },
        select: { id: true },
      });
      curriculumId = curriculum.id;
    }

    const duplicate = await prisma.curriculumItem.findFirst({
      where: { curriculumId, courseId: body.courseId },
      select: { id: true },
    });
    if (duplicate) {
      throw AppError.conflict('Mata kuliah tersebut sudah ada pada kurikulum ini.');
    }

    const item = await prisma.curriculumItem.create({
      data: {
        curriculumId,
        courseId: body.courseId,
        academicSemesterId: body.academicSemesterId ?? null,
        credits: body.credits,
        description: body.description ?? null,
        lecturersData: (body.lecturersData ?? null) as any,
        sortOrder: body.sortOrder,
      },
      include: { course: true, academicSemester: true, rpsDocuments: true },
    });

    await recordAudit({ req, action: 'CREATE', module: 'CURRICULUM', targetType: 'curriculum_item', targetId: item.id });
    res.status(201).json({ success: true, message: 'Mata kuliah berhasil ditambahkan ke kurikulum.', item });
  }),
);

/** PUT /api/v1/admin/curriculum-items/:id: memperbarui penawaran. */
router.put(
  '/curriculum-items/:id',
  requirePermission('curriculum.update'),
  validate({ body: updateCurriculumItemSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const body = getBody<Record<string, unknown>>(req);

    const existing = await findCurriculumItemInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah pada kurikulum ini tidak ditemukan.');
    }

    if (typeof body.courseId === 'number') {
      const course = await findCourseMasterInTenant(body.courseId, studyProgramId);
      if (!course) throw AppError.notFound('Mata kuliah tidak ditemukan pada program studi ini.');
    }
    if (typeof body.academicSemesterId === 'number') {
      const semester = await prisma.academicSemester.findUnique({ where: { id: body.academicSemesterId } });
      if (!semester) throw AppError.notFound('Semester akademik tidak ditemukan.');
    }

    // `curriculumId` boleh dipindah, tetapi kurikulum tujuan harus milik prodi ini.
    if (typeof body.curriculumId === 'number') {
      const target = await prisma.curriculum.findFirst({
        where: { id: body.curriculumId, studyProgramId },
        select: { id: true },
      });
      if (!target) throw AppError.notFound('Kurikulum tidak ditemukan pada program studi ini.');
    }

    const item = await prisma.curriculumItem.update({
      where: { id },
      data: body as any,
      include: { course: true, academicSemester: true, rpsDocuments: true },
    });

    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'curriculum_item', targetId: id });
    res.json({ success: true, message: 'Mata kuliah pada kurikulum berhasil diperbarui.', item });
  }),
);

/** DELETE /api/v1/admin/curriculum-items/:id: menghapus penawaran beserta RPS-nya. */
router.delete(
  '/curriculum-items/:id',
  requirePermission('curriculum.delete'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);

    const existing = await findCurriculumItemInTenant(id, studyProgramId);
    if (!existing) {
      throw AppError.notFound('Mata kuliah pada kurikulum ini tidak ditemukan.');
    }

    await prisma.curriculumItem.delete({ where: { id } });
    await recordAudit({ req, action: 'DELETE', module: 'CURRICULUM', targetType: 'curriculum_item', targetId: id });
    res.json({ success: true, message: 'Mata kuliah berhasil dihapus dari kurikulum.' });
  }),
);

// -------------------------------------------------------------
// Dosen (Terintegrasi API Hub ONE UNUSU - Read Only)
// -------------------------------------------------------------

router.get(
  '/lecturers',
  requirePermission('lecturers.view'),
  asyncHandler(async (req, res) => {
    const studyProgramId = scopedTenantId(req);
    const studyProgram = await prisma.studyProgram.findUnique({
      where: { id: studyProgramId },
      select: { name: true, code: true },
    });

    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const allLecturers = await fetchLecturersFromApiHub({ search });

    // Filter berdasarkan kecocokan nama atau kode prodi jika prodi ditemukan
    const prodiName = studyProgram?.name?.toLowerCase() || '';
    const filtered = allLecturers.filter((l) => {
      if (!prodiName) return true;
      const homebase = (l.studyProgramName || '').toLowerCase();
      return homebase.includes(prodiName) || prodiName.includes(homebase);
    });

    // Jika filter prodi tidak menemukan hasil, tampilkan semua dosen agar fleksibel untuk penugasan pengampu
    const resultLecturers = filtered.length > 0 ? filtered : allLecturers;

    res.json({ success: true, lecturers: resultLecturers, allLecturers });
  }),
);

router.get(
  '/lecturers/all',
  requirePermission('lecturers.view'),
  asyncHandler(async (_req, res) => {
    const lecturers = await fetchLecturersFromApiHub();
    res.json({ success: true, lecturers });
  }),
);

// -------------------------------------------------------------
// Dokumen
// -------------------------------------------------------------
//
// CRUD dokumen lokal sudah DIHAPUS. Bank dokumen prodi kini sepenuhnya
// berasal dari arsip LPM/LPPM melalui ONE UNUSU API Hub dan hanya dapat
// dibaca (read-only). Lihat `modules/admin/arsipDokumen.routes.ts` dan
// `services/arsipDokumenService.ts`.

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
