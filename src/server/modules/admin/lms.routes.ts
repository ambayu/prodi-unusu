import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';
import { idParamSchema } from '../../../shared/schemas/common.js';
import { config } from '../../config/index.js';
import { fetchLecturersFromApiHub } from '../../services/lecturerIntegrationService.js';
import { findCurrentCurriculum } from '../../services/curriculumService.js';

const router = Router();
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:MM.');

const classroomSchema = z.object({
  curriculumItemId: z.coerce.number().int().positive(),
  day: z.string().trim().max(20).nullish(),
  startTime: hhmm.nullish(),
  endTime: hhmm.nullish(),
  room: z.string().trim().max(100).nullish(),
  lecturerNidn: z.string().trim().max(30).nullish(),
  lecturerName: z.string().trim().max(200).nullish(),
});

const studentsSchema = z.object({
  students: z.array(z.object({
    nim: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(200),
  })).max(500),
});

type ClassroomInput = z.infer<typeof classroomSchema>;
type OneUnusuStudent = {
  nim?: string | null;
  username?: string | null;
  nama?: string | null;
  role?: string | null;
  isActive?: boolean;
};

async function findOwnedItem(itemId: number, tenantId: number) {
  const item = await prisma.curriculumItem.findFirst({
    where: { id: itemId, curriculum: { studyProgramId: tenantId } },
    select: { id: true },
  });
  if (!item) throw AppError.notFound('Mata kuliah tidak ditemukan pada kurikulum program studi ini.');
  return item;
}

async function findOwnedClassroom(id: number, tenantId: number) {
  const classroom = await prisma.lmsClassroom.findFirst({
    where: { id, group: 'Utama', curriculumItem: { curriculum: { studyProgramId: tenantId } } },
    select: { id: true },
  });
  if (!classroom) throw AppError.notFound('Kelas perkuliahan tidak ditemukan pada program studi ini.');
  return classroom;
}

async function fetchOneUnusuStudents(): Promise<Array<{ nim: string; name: string }>> {
  if (!config.sso.apiKey) {
    throw AppError.badGateway('ONE_UNUSU_API_KEY belum dikonfigurasi di server.', 'SSO_API_KEY_MISSING');
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.sso.baseUrl.replace(/\/$/, '')}/api/v2/website/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.sso.apiKey}` },
      body: JSON.stringify({ role: 'MAHASISWA' }),
    });
  } catch {
    throw AppError.badGateway('Gagal menghubungi portal ONE UNUSU.', 'UPSTREAM_UNREACHABLE');
  }

  const payload = (await upstream.json().catch(() => null)) as {
    status?: boolean; data?: OneUnusuStudent[]; message?: string;
  } | null;
  if (!upstream.ok || !payload?.status || !Array.isArray(payload.data)) {
    throw AppError.badGateway(payload?.message || 'ONE UNUSU mengembalikan respons gagal.', 'UPSTREAM_ERROR');
  }

  const students = new Map<string, string>();
  for (const user of payload.data) {
    if (user.isActive === false || user.role?.toUpperCase() !== 'MAHASISWA') continue;
    const nim = (user.nim || user.username || '').trim();
    if (nim) students.set(nim, user.nama?.trim() || nim);
  }
  return [...students.entries()]
    .map(([nim, name]) => ({ nim, name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'id'));
}

async function syncClassroomToLms(classroomId: number, tenantId: number) {
  const url = (process.env.LMS_SYNC_URL ?? '').trim().replace(/\/$/, '');
  const apiKey = (process.env.LMS_SYNC_API_KEY ?? '').trim();
  if (!url || !apiKey) throw AppError.badRequest('Konfigurasi koneksi LMS belum lengkap.');

  const classroom = await prisma.lmsClassroom.findFirst({
    where: {
      id: classroomId,
      group: 'Utama',
      curriculumItem: { curriculum: { studyProgramId: tenantId } },
    },
    select: {
      id: true,
      day: true,
      startTime: true,
      endTime: true,
      room: true,
      lecturerNidn: true,
      curriculumItem: {
        select: {
          credits: true,
          semesterNumber: true,
          curriculum: { select: { year: true } },
          course: { select: { code: true, name: true } },
        },
      },
      students: { orderBy: { nim: 'asc' }, select: { nim: true, name: true } },
    },
  });
  if (!classroom) throw AppError.notFound('Kelas perkuliahan tidak ditemukan pada program studi ini.');

  const semesterNumber = classroom.curriculumItem.semesterNumber;
  if (!semesterNumber) {
    throw AppError.badRequest('Semester kurikulum mata kuliah belum diatur.');
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${url}/api/internal/sinkron-kelas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        semester: `Kurikulum ${classroom.curriculumItem.curriculum.year} - Semester ${semesterNumber}`,
        kelas: [{
          prodiClassId: classroom.id,
          kodeMk: classroom.curriculumItem.course.code,
          namaMk: classroom.curriculumItem.course.name,
          sks: classroom.curriculumItem.credits,
          semester: semesterNumber,
          rombel: 'Utama',
          hari: classroom.day,
          jamMulai: classroom.startTime,
          jamSelesai: classroom.endTime,
          ruang: classroom.room,
          dosenNidn: classroom.lecturerNidn,
          peserta: classroom.students,
        }],
      }),
    });
  } catch {
    throw AppError.badGateway('LMS tidak dapat dihubungi. Periksa koneksi LMS.', 'LMS_UNREACHABLE');
  }

  const result = (await upstream.json().catch(() => null)) as { message?: string } | null;
  if (!upstream.ok) {
    throw new AppError(upstream.status === 401 ? 502 : upstream.status, result?.message ?? 'LMS menolak sinkronisasi kelas.', 'LMS_SYNC_FAILED');
  }
}

/** GET /api/v1/admin/lms/courses: seluruh penawaran pada kurikulum berlaku atau tahun yang dipilih, dikelompokkan UI berdasarkan semester kurikulum. */
router.get(
  '/lms/courses',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const yearParam = req.query.year ? Number(req.query.year) : undefined;
    const curriculumIdParam = req.query.curriculumId ? Number(req.query.curriculumId) : undefined;
    const isAll = req.query.all === 'true' || req.query.all === '1';

    const curriculumWhere: { studyProgramId: number; id?: number; year?: number } = {
      studyProgramId: tenantId,
    };

    if (curriculumIdParam && !Number.isNaN(curriculumIdParam)) {
      curriculumWhere.id = curriculumIdParam;
    } else if (yearParam && !Number.isNaN(yearParam)) {
      curriculumWhere.year = yearParam;
    } else if (!isAll) {
      const current = await findCurrentCurriculum(tenantId);
      if (!current) {
        return res.json({ success: true, courses: [] });
      }
      curriculumWhere.id = current.id;
    }

    const items = await prisma.curriculumItem.findMany({
      where: { curriculum: curriculumWhere },
      orderBy: [{ semesterNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        credits: true,
        semesterNumber: true,
        lecturersData: true,
        course: { select: { code: true, name: true } },
        classrooms: {
          where: { group: 'Utama' },
          select: {
            id: true,
            day: true,
            startTime: true,
            endTime: true,
            room: true,
            lecturerNidn: true,
            lecturerName: true,
            _count: { select: { students: true } },
          },
          take: 1,
        },
      },
    });

    res.json({
      success: true,
      courses: items.map((item) => {
        const assignedLecturers = Array.isArray(item.lecturersData) ? item.lecturersData : [];
        return {
          id: item.id,
          code: item.course.code,
          name: item.course.name,
          credits: item.credits,
          semesterNumber: item.semesterNumber,
          lecturers: assignedLecturers,
          classroom: item.classrooms[0] ?? null,
        };
      }),
    });
  }),
);

/** GET /api/v1/admin/lms/classrooms: hanya kelas Utama milik kurikulum aktif. */
router.get(
  '/lms/lecturers',
  requirePermission('curriculum.view'),
  asyncHandler(async (_req, res) => {
    const lecturers = await fetchLecturersFromApiHub();
    res.json({
      success: true,
      lecturers: lecturers
        .filter((lecturer) => Boolean(lecturer.nidn))
        .map((lecturer) => ({ id: lecturer.id, name: lecturer.name, nidn: lecturer.nidn }))
        .sort((left, right) => left.name.localeCompare(right.name, 'id')),
    });
  }),
);

/** GET /api/v1/admin/lms/classrooms: hanya kelas Utama milik kurikulum berlaku. */
router.get(
  '/lms/classrooms',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const current = await findCurrentCurriculum(tenantId);
    if (!current) {
      return res.json({ success: true, classrooms: [] });
    }
    const classrooms = await prisma.lmsClassroom.findMany({
      where: { group: 'Utama', curriculumItem: { curriculumId: current.id } },
      orderBy: { id: 'asc' },
      include: {
        curriculumItem: {
          select: {
            id: true,
            credits: true,
            semesterNumber: true,
            course: { select: { code: true, name: true } },
          },
        },
        _count: { select: { students: true } },
      },
    });
    res.json({ success: true, classrooms });
  }),
);

/** POST /api/v1/admin/lms/classrooms: upsert konfigurasi perkuliahan satu mata kuliah. */
router.post(
  '/lms/classrooms',
  requirePermission('curriculum.update'),
  validate({ body: classroomSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const body = getBody<ClassroomInput>(req);
    await findOwnedItem(body.curriculumItemId, tenantId);

    const classroom = await prisma.lmsClassroom.upsert({
      where: { curriculumItemId_group: { curriculumItemId: body.curriculumItemId, group: 'Utama' } },
      create: {
        curriculumItemId: body.curriculumItemId,
        group: 'Utama',
        day: body.day ?? null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        room: body.room ?? null,
        lecturerNidn: body.lecturerNidn ?? null,
        lecturerName: body.lecturerName ?? null,
      },
      update: {
        day: body.day ?? null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        room: body.room ?? null,
        lecturerNidn: body.lecturerNidn ?? null,
        lecturerName: body.lecturerName ?? null,
      },
    });

    await syncClassroomToLms(classroom.id, tenantId);
    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'lms_classroom', targetId: classroom.id });
    res.json({ success: true, message: 'Perkuliahan berhasil disimpan dan dikirim ke LMS.', classroom });
  }),
);

/** GET /api/v1/admin/lms/classrooms/:id/students: daftar peserta kelas. */
router.get(
  '/lms/classrooms/:id/students',
  requirePermission('curriculum.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    await findOwnedClassroom(id, tenantId);
    const students = await prisma.lmsClassroomStudent.findMany({ where: { classroomId: id }, orderBy: { nim: 'asc' } });
    res.json({ success: true, students });
  }),
);

/** PUT /api/v1/admin/lms/classrooms/:id/students: ganti peserta lalu sinkron otomatis ke LMS. */
router.put(
  '/lms/classrooms/:id/students',
  requirePermission('curriculum.update'),
  validate({ body: studentsSchema, params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    const { students } = getBody<z.infer<typeof studentsSchema>>(req);
    await findOwnedClassroom(id, tenantId);

    const uniqueStudents = new Map(students.map((student) => [student.nim, student.name]));
    await prisma.$transaction([
      prisma.lmsClassroomStudent.deleteMany({ where: { classroomId: id } }),
      prisma.lmsClassroomStudent.createMany({
        data: [...uniqueStudents.entries()].map(([nim, name]) => ({ classroomId: id, nim, name })),
      }),
    ]);

    await syncClassroomToLms(id, tenantId);
    await recordAudit({ req, action: 'UPDATE', module: 'CURRICULUM', targetType: 'lms_classroom_students', targetId: id });
    res.json({ success: true, message: 'Peserta kelas berhasil disimpan dan dikirim ke LMS.', total: uniqueStudents.size });
  }),
);

/** GET /api/v1/admin/lms/classrooms/:id/meetings: daftar 16 pertemuan dari LMS. */
router.get(
  '/lms/classrooms/:id/meetings',
  requirePermission('curriculum.view'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const { id } = getParams<{ id: number }>(req);
    await findOwnedClassroom(id, tenantId);

    const url = (process.env.LMS_SYNC_URL ?? '').trim().replace(/\/$/, '');
    const apiKey = (process.env.LMS_SYNC_API_KEY ?? '').trim();
    if (!url || !apiKey) {
      return res.json({ success: true, meetings: [] });
    }
    try {
      const response = await fetch(`${url}/api/internal/classes/${id}/meetings`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });
      if (!response.ok) {
        return res.json({ success: true, meetings: [] });
      }
      const data = (await response.json()) as { success: boolean; meetings: Array<{ id: number; number: number; title: string; status: string }> };
      return res.json({ success: true, meetings: data.meetings ?? [] });
    } catch {
      return res.json({ success: true, meetings: [] });
    }
  }),
);

/** GET /api/v1/admin/lms/students: kandidat mahasiswa aktif dari ONE UNUSU. */
router.get(
  '/lms/students',
  requirePermission('curriculum.view'),
  asyncHandler(async (_req, res) => {
    const students = await fetchOneUnusuStudents();
    res.json({ success: true, students });
  }),
);

export default router;
