import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, validate } from '../../utils/validation.js';
import { requirePermission } from '../../middlewares/auth.js';
import { scopedTenantId } from '../../middlewares/tenantScope.js';
import { AppError } from '../../utils/errors.js';
import { recordAudit } from '../../services/auditService.js';

const router = Router();

/**
 * Manajemen LMS Portal Prodi.
 *
 * Portal Prodi adalah SATU-SATUNYA sumber data kelas perkuliahan. LMS tidak
 * menyimpan kelas secara mandiri: ia menarik jadwal, dosen pengampu, dan
 * daftar peserta dari sini lewat ONE UNUSU API Hub
 * (`/api/v1/public/lms-kurikulum`). Karena itu seluruh data operasional
 * perkuliahan (hari, jam, ruang, rombel, peserta) dipisahkan dari master
 * kurikulum dan hanya diubah dari menu "Manajemen LMS".
 */

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:MM.');

const classroomSchema = z.object({
  curriculumItemId: z.coerce.number().int().positive(),
  group: z.string().trim().min(1).max(30).default('Utama'),
  day: z.string().trim().max(20).nullish(),
  startTime: hhmm.nullish(),
  endTime: hhmm.nullish(),
  room: z.string().trim().max(100).nullish(),
  lecturerNidn: z.string().trim().max(30).nullish(),
  lecturerName: z.string().trim().max(200).nullish(),
});

const updateClassroomSchema = classroomSchema.partial();

const studentsSchema = z.object({
  students: z
    .array(
      z.object({
        nim: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(200),
      }),
    )
    .max(500),
});

type ClassroomInput = z.infer<typeof classroomSchema>;

/** Penawaran mata kuliah milik tenant aktif — pilihan pada formulir kelas. */
async function findOwnedItem(itemId: number, tenantId: number) {
  const item = await prisma.curriculumItem.findFirst({
    where: { id: itemId, curriculum: { studyProgramId: tenantId } },
    select: { id: true, credits: true, semesterNumber: true },
  });
  if (!item) {
    throw AppError.notFound('Mata kuliah kurikulum tidak ditemukan pada program studi ini.');
  }
  return item;
}

/** Kelas milik tenant aktif, dipakai sebagai penjaga operasi ubah/hapus. */
async function findOwnedClassroom(id: number, tenantId: number) {
  const classroom = await prisma.lmsClassroom.findFirst({
    where: { id, curriculumItem: { curriculum: { studyProgramId: tenantId } } },
    select: { id: true },
  });
  if (!classroom) {
    throw AppError.notFound('Kelas LMS tidak ditemukan pada program studi ini.');
  }
  return classroom;
}

/** GET /api/v1/admin/lms/courses: penawaran mata kuliah untuk pemilih kelas. */
router.get(
  '/lms/courses',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const items = await prisma.curriculumItem.findMany({
      where: { curriculum: { studyProgramId: tenantId, isActive: true } },
      orderBy: [{ semesterNumber: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        credits: true,
        semesterNumber: true,
        course: { select: { code: true, name: true } },
      },
    });

    const classrooms = await prisma.lmsClassroom.findMany({
      where: { curriculumItemId: { in: items.map((item) => item.id) } },
      select: { id: true, group: true, curriculumItemId: true },
    });

    res.json({
      success: true,
      courses: items.map((item) => ({
        id: item.id,
        code: item.course.code,
        name: item.course.name,
        credits: item.credits,
        semesterNumber: item.semesterNumber,
        classrooms: classrooms
          .filter((kelas) => kelas.curriculumItemId === item.id)
          .map((kelas) => ({ id: kelas.id, group: kelas.group })),
      })),
    });
  }),
);

/** GET /api/v1/admin/lms/classrooms: daftar kelas beserta jumlah peserta. */
router.get(
  '/lms/classrooms',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const classrooms = await prisma.lmsClassroom.findMany({
      where: { curriculumItem: { curriculum: { studyProgramId: tenantId } } },
      orderBy: [{ id: 'asc' }],
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

/** POST /api/v1/admin/lms/classrooms: buka kelas baru pada satu mata kuliah. */
router.post(
  '/lms/classrooms',
  requirePermission('curriculum.update'),
  validate({ body: classroomSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const body = getBody<ClassroomInput>(req);

    await findOwnedItem(body.curriculumItemId, tenantId);

    const duplicate = await prisma.lmsClassroom.findFirst({
      where: { curriculumItemId: body.curriculumItemId, group: body.group },
      select: { id: true },
    });
    if (duplicate) {
      throw AppError.conflict('Nama kelas tersebut sudah dipakai pada mata kuliah ini.');
    }

    const classroom = await prisma.lmsClassroom.create({
      data: {
        curriculumItemId: body.curriculumItemId,
        group: body.group,
        day: body.day ?? null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        room: body.room ?? null,
        lecturerNidn: body.lecturerNidn ?? null,
        lecturerName: body.lecturerName ?? null,
      },
    });

    await recordAudit({
      req,
      action: 'CREATE',
      module: 'CURRICULUM',
      targetType: 'lms_classroom',
      targetId: classroom.id,
    });

    res.status(201).json({ success: true, message: 'Kelas LMS berhasil dibuat.', classroom });
  }),
);

/** PUT /api/v1/admin/lms/classrooms/:id: ubah jadwal, ruang, atau dosen pengampu. */
router.put(
  '/lms/classrooms/:id',
  requirePermission('curriculum.update'),
  validate({ body: updateClassroomSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const params = getParams<{ id: string }>(req);
    const id = Number(params.id);
    const body = getBody<Partial<ClassroomInput>>(req);

    await findOwnedClassroom(id, tenantId);
    if (body.curriculumItemId !== undefined) {
      await findOwnedItem(body.curriculumItemId, tenantId);
    }

    const classroom = await prisma.lmsClassroom.update({
      where: { id },
      data: {
        ...(body.curriculumItemId !== undefined ? { curriculumItemId: body.curriculumItemId } : {}),
        ...(body.group !== undefined ? { group: body.group } : {}),
        ...(body.day !== undefined ? { day: body.day ?? null } : {}),
        ...(body.startTime !== undefined ? { startTime: body.startTime ?? null } : {}),
        ...(body.endTime !== undefined ? { endTime: body.endTime ?? null } : {}),
        ...(body.room !== undefined ? { room: body.room ?? null } : {}),
        ...(body.lecturerNidn !== undefined ? { lecturerNidn: body.lecturerNidn ?? null } : {}),
        ...(body.lecturerName !== undefined ? { lecturerName: body.lecturerName ?? null } : {}),
      },
    });

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'CURRICULUM',
      targetType: 'lms_classroom',
      targetId: classroom.id,
    });

    res.json({ success: true, message: 'Kelas LMS berhasil diperbarui.', classroom });
  }),
);

/** DELETE /api/v1/admin/lms/classrooms/:id: hapus kelas beserta pesertanya. */
router.delete(
  '/lms/classrooms/:id',
  requirePermission('curriculum.update'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const params = getParams<{ id: string }>(req);
    const id = Number(params.id);

    await findOwnedClassroom(id, tenantId);
    await prisma.lmsClassroom.delete({ where: { id } });

    await recordAudit({
      req,
      action: 'DELETE',
      module: 'CURRICULUM',
      targetType: 'lms_classroom',
      targetId: id,
    });

    res.json({ success: true, message: 'Kelas LMS berhasil dihapus.' });
  }),
);

/** GET /api/v1/admin/lms/classrooms/:id/students: daftar peserta kelas. */
router.get(
  '/lms/classrooms/:id/students',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const params = getParams<{ id: string }>(req);
    const id = Number(params.id);

    await findOwnedClassroom(id, tenantId);
    const students = await prisma.lmsClassroomStudent.findMany({
      where: { classroomId: id },
      orderBy: { nim: 'asc' },
    });

    res.json({ success: true, students });
  }),
);

/**
 * PUT /api/v1/admin/lms/classrooms/:id/students: ganti seluruh peserta kelas.
 *
 * Daftar dikirim utuh (bukan tambah/hapus satu per satu) karena administrator
 * memilih peserta dari satu formulir. Seluruh perubahan dijalankan dalam satu
 * transaksi agar kelas tidak pernah tertinggal dengan daftar setengah jadi.
 */
router.put(
  '/lms/classrooms/:id/students',
  requirePermission('curriculum.update'),
  validate({ body: studentsSchema }),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const params = getParams<{ id: string }>(req);
    const id = Number(params.id);
    const body = getBody<z.infer<typeof studentsSchema>>(req);

    await findOwnedClassroom(id, tenantId);

    // NIM ganda pada satu kiriman akan menabrak unique index; buang duplikatnya.
    const unik = new Map<string, string>();
    for (const siswa of body.students) {
      unik.set(siswa.nim, siswa.name);
    }

    await prisma.$transaction([
      prisma.lmsClassroomStudent.deleteMany({ where: { classroomId: id } }),
      prisma.lmsClassroomStudent.createMany({
        data: [...unik.entries()].map(([nim, name]) => ({ classroomId: id, nim, name })),
      }),
    ]);

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'CURRICULUM',
      targetType: 'lms_classroom_students',
      targetId: id,
    });

    res.json({ success: true, message: 'Peserta kelas berhasil disimpan.', total: unik.size });
  }),
);

/**
 * POST /api/v1/admin/lms/sinkron: dorong seluruh kelas prodi aktif ke LMS.
 *
 * Portal Prodi sumber data kelas, tetapi LMS menyimpan salinannya sendiri.
 * Endpoint ini yang menjembatani keduanya: setiap kelas dikirim bersama kode MK,
 * jadwal, dosen, dan pesertanya. LMS memakai `prodiClassId` sebagai kunci, jadi
 * menekan tombol ini berulang kali tidak menggandakan kelas.
 *
 * `LMS_SYNC_URL` dan `LMS_SYNC_API_KEY` dibaca langsung dari lingkungan (bukan
 * dari `config`) karena keduanya bukan syarat berjalannya Portal Prodi — tanpa
 * nilai itu hanya fitur sinkron yang menolak, aplikasi tetap melayani.
 */
router.post(
  '/lms/sinkron',
  requirePermission('curriculum.update'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const urlSah = (process.env.LMS_SYNC_URL ?? '').trim().replace(/\/$/, '');
    const kunciSah = (process.env.LMS_SYNC_API_KEY ?? '').trim();

    if (!urlSah) {
      throw AppError.badRequest('LMS_SYNC_URL belum diatur pada server Portal Prodi.');
    }
    if (!kunciSah) {
      throw AppError.badRequest('LMS_SYNC_API_KEY belum diatur pada server Portal Prodi.');
    }

    const semester = await prisma.academicSemester.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { name: true },
    });
    if (!semester) {
      throw AppError.badRequest('Belum ada semester aktif. Aktifkan satu semester sebelum sinkron.');
    }

    const classrooms = await prisma.lmsClassroom.findMany({
      where: { curriculumItem: { curriculum: { studyProgramId: tenantId, isActive: true } } },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        group: true,
        day: true,
        startTime: true,
        endTime: true,
        room: true,
        lecturerNidn: true,
        curriculumItem: {
          select: {
            credits: true,
            semesterNumber: true,
            course: { select: { code: true, name: true } },
          },
        },
        students: { orderBy: { nim: 'asc' }, select: { nim: true, name: true } },
      },
    });

    if (classrooms.length === 0) {
      throw AppError.badRequest('Belum ada kelas pada kurikulum aktif untuk dikirim.');
    }

    const payload = {
      semester: semester.name,
      kelas: classrooms.map((kelas) => ({
        prodiClassId: kelas.id,
        kodeMk: kelas.curriculumItem.course.code,
        namaMk: kelas.curriculumItem.course.name,
        sks: kelas.curriculumItem.credits,
        semester: kelas.curriculumItem.semesterNumber,
        rombel: kelas.group,
        hari: kelas.day,
        jamMulai: kelas.startTime,
        jamSelesai: kelas.endTime,
        ruang: kelas.room,
        dosenNidn: kelas.lecturerNidn,
        peserta: kelas.students,
      })),
    };

    const upstream = await fetch(`${urlSah}/api/internal/sinkron-kelas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kunciSah}` },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!upstream) {
      throw AppError.badGateway('LMS tidak dapat dihubungi. Periksa LMS_SYNC_URL.');
    }

    const hasil = (await upstream.json().catch(() => null)) as
      | { message?: string; hasil?: unknown[]; gagal?: unknown[] }
      | null;
    if (!upstream.ok) {
      throw new AppError(
        upstream.status === 401 ? 502 : upstream.status,
        hasil?.message ?? `LMS membalas status ${upstream.status}.`,
        'LMS_SYNC_FAILED',
        undefined,
        { gagal: hasil?.gagal },
      );
    }

    await recordAudit({
      req,
      action: 'UPDATE',
      module: 'CURRICULUM',
      targetType: 'lms_sync',
      targetId: tenantId,
    });

    res.json({ success: true, message: hasil?.message ?? 'Sinkron selesai.', hasil: hasil?.hasil ?? [] });
  }),
);

/** GET /api/v1/admin/lms/students: kandidat peserta untuk formulir plotting.
 *
 * Data induk mahasiswa milik SIAKAD, bukan Portal Prodi. Yang tersedia di sini
 * adalah mahasiswa yang SUDAH pernah di-plot ke kelas mana pun pada prodi ini,
 * supaya administrator dapat memakai ulang daftar yang sama tanpa mengetik
 * ulang NIM satu per satu.
 */
router.get(
  '/lms/students',
  requirePermission('curriculum.view'),
  asyncHandler(async (req, res) => {
    const tenantId = scopedTenantId(req);
    const students = await prisma.lmsClassroomStudent.findMany({
      where: { classroom: { curriculumItem: { curriculum: { studyProgramId: tenantId } } } },
      distinct: ['nim'],
      orderBy: { name: 'asc' },
      select: { nim: true, name: true },
    });

    res.json({ success: true, students });
  }),
);

export default router;