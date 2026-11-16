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

export default router;
