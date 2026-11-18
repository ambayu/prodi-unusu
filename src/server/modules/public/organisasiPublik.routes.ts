import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler } from '../../utils/validation.js';

const router = Router();

/**
 * Penjaga endpoint yang dipanggil aplikasi lain (server-ke-server).
 *
 * Nilai yang dibandingkan adalah `PRODI_API_KEY` pada `.env` aplikasi ini.
 * Bila variabel itu belum diisi, endpoint langsung menolak seluruh permintaan
 * (fail-closed) — jauh lebih aman daripada diam-diam terbuka untuk umum.
 */
function wajibApiKeyProdi(req: Request, res: Response, next: NextFunction) {
  const kunciSah = (process.env.PRODI_API_KEY ?? '').trim();
  if (!kunciSah) {
    return res.status(503).json({
      success: false,
      message: 'PRODI_API_KEY belum dikonfigurasi pada server Portal Prodi.',
    });
  }

  const header = req.header('authorization') ?? '';
  const dariHeader = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : '';
  const kunciDikirim = dariHeader || (req.header('x-api-key') ?? '').trim();

  if (!kunciDikirim || kunciDikirim !== kunciSah) {
    return res.status(401).json({
      success: false,
      message: 'API key tidak valid.',
    });
  }

  return next();
}

/**
 * POST /api/v1/public/organisasi
 *
 * Memberikan hierarki fakultas beserta program studi di dalamnya kepada
 * aplikasi lain di lingkungan UNUSU. ONE UNUSU memakainya sebagai sumber
 * tunggal data organisasi, sehingga aplikasi cabang tidak perlu tahu Portal
 * Prodi ada.
 *
 * Sumber datanya tabel `faculties` dan `study_programs` milik Portal Prodi —
 * yang memang diisi lewat menu Organisasi, sedangkan tabel `fakultas`/`prodi`
 * bawaan ONE UNUSU masih kosong.
 *
 * Hanya fakultas dan prodi yang aktif yang dikirim. Kolom internal seperti
 * `hostname`, `logo_url`, dan `external_prodi_code` sengaja tidak disertakan
 * karena tidak dibutuhkan pemanggil dan bisa membocorkan topologi tenant.
 */
router.post(
  '/organisasi',
  wajibApiKeyProdi,
  asyncHandler(async (_req, res) => {
    const daftarFakultas = await prisma.faculty.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        sortOrder: true,
        studyPrograms: {
          where: { status: 'active' },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            code: true,
            name: true,
            slug: true,
            degree: true,
            sortOrder: true,
          },
        },
      },
    });

    const data = daftarFakultas.map((fakultas) => ({
      id: fakultas.id,
      kode: fakultas.code,
      nama: fakultas.name,
      slug: fakultas.slug,
      urutan: fakultas.sortOrder,
      prodi: fakultas.studyPrograms.map((prodi) => ({
        id: prodi.id,
        kode: prodi.code,
        nama: prodi.name,
        slug: prodi.slug,
        jenjang: prodi.degree,
        urutan: prodi.sortOrder,
      })),
    }));

    const totalProdi = data.reduce((jumlah, fakultas) => jumlah + fakultas.prodi.length, 0);

    res.json({
      success: true,
      data,
      meta: {
        totalFakultas: data.length,
        totalProdi,
        sumber: 'Portal Prodi UNUSU',
      },
    });
  }),
);

/**
 * GET /api/v1/public/lms-kurikulum
 *
 * Katalog perkuliahan untuk LMS: setiap penawaran mata kuliah pada kurikulum
 * aktif beserta kelas (rombel), jadwal, dosen pengampu, berkas RPS, dan daftar
 * peserta. LMS memakainya untuk menyusun kelas, menu "Mata Kuliah & RPS",
 * serta tombol "Tarik Data Mahasiswa" — sehingga Portal Prodi tetap menjadi
 * satu-satunya sumber data perkuliahan.
 *
 * Filter opsional `nidn` mempersempit hasil ke kelas yang diampu dosen
 * tersebut; tanpa filter, seluruh kelas prodi dikirim (dipakai LMS untuk
 * menarik semua kelas sekaligus saat sinkronisasi).
 */
router.get(
  '/lms-kurikulum',
  wajibApiKeyProdi,
  asyncHandler(async (req, res) => {
    const nidn = typeof req.query.nidn === 'string' ? req.query.nidn.trim() : '';

    const programs = await prisma.studyProgram.findMany({
      where: { status: 'active' },
      orderBy: [{ id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        faculty: { select: { code: true, name: true } },
        curriculums: {
          where: { isActive: true },
          orderBy: [{ year: 'desc' }, { id: 'asc' }],
          select: {
            id: true,
            name: true,
            year: true,
            items: {
              orderBy: [{ semesterNumber: 'asc' }, { sortOrder: 'asc' }],
              select: {
                id: true,
                semesterNumber: true,
                credits: true,
                description: true,
                lecturersData: true,
                course: { select: { code: true, name: true } },
                rpsDocuments: {
                  where: { isPublic: true },
                  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                  select: { id: true, title: true, fileUrl: true, revision: true, createdAt: true },
                },
                classrooms: {
                  orderBy: { id: 'asc' },
                  select: {
                    id: true,
                    group: true,
                    day: true,
                    startTime: true,
                    endTime: true,
                    room: true,
                    lecturerNidn: true,
                    lecturerName: true,
                    students: { orderBy: { nim: 'asc' }, select: { nim: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const semesterAktif = await prisma.academicSemester.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true, code: true, name: true, startDate: true, endDate: true },
    });

    const data = programs.map((program) => ({
      prodiId: program.id,
      kodeProdi: program.code,
      namaProdi: program.name,
      fakultas: program.faculty ? `${program.faculty.code} — ${program.faculty.name}` : null,
      kurikulum: program.curriculums.map((kurikulum) => ({
        id: kurikulum.id,
        nama: kurikulum.name,
        tahun: kurikulum.year,
        mataKuliah: kurikulum.items.map((item) => ({
          id: item.id,
          kodeMk: item.course.code,
          namaMk: item.course.name,
          sks: item.credits,
          semester: item.semesterNumber,
          keterangan: item.description,
          dosenPengampu: item.lecturersData,
          rps: item.rpsDocuments,
          kelas: item.classrooms
            .filter((kelas) => (nidn ? kelas.lecturerNidn === nidn : true))
            .map((kelas) => ({
              id: kelas.id,
              rombel: kelas.group,
              hari: kelas.day,
              jamMulai: kelas.startTime,
              jamSelesai: kelas.endTime,
              ruang: kelas.room,
              dosenNidn: kelas.lecturerNidn,
              dosenNama: kelas.lecturerName,
              peserta: kelas.students,
            })),
        })),
      })),
    }));

    res.json({
      success: true,
      semesterAktif,
      data,
      meta: {
        totalProdi: data.length,
        totalMataKuliah: data.reduce(
          (jumlah, prodi) =>
            jumlah + prodi.kurikulum.reduce((sub, kur) => sub + kur.mataKuliah.length, 0),
          0,
        ),
        sumber: 'Portal Prodi UNUSU',
      },
    });
  }),
);

export default router;
