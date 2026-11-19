import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler, getBody, getParams, getQuery, validate } from '../../utils/validation.js';
import { requireTenant } from '../../middlewares/tenantResolver.js';
import { AppError } from '../../utils/errors.js';
import { createContactMessageSchema } from '../../../shared/schemas/content.js';
import { slugParamSchema } from '../../../shared/schemas/public.js';
import { paginationSchema } from '../../../shared/schemas/common.js';
import { getPublishedPageBySlug } from '../../services/pageService.js';
import { buildCurriculumSummary, listPublicCurriculum } from '../../services/curriculumService.js';
import { fetchLecturersFromApiHub } from '../../services/lecturerIntegrationService.js';
import type { InterServiceLecturer } from '../../services/lecturerIntegrationService.js';
import { getSarprasByProdiCode } from '../../services/sarprasService.js';

const router = Router();

/**
 * Filter relasi tenant untuk tabel yang mendukung dua tingkat kepemilikan.
 *
 * Tabel seperti `menus`, `contact_infos`, dan `profile_contents` menyimpan
 * pemiliknya di SALAH SATU kolom: `study_program_id` untuk program studi,
 * atau `faculty_id` untuk fakultas. Kueri lama hanya memakai
 * `studyProgramId: req.tenant.id`, sehingga pada domain fakultas
 * (`studyProgramId` = NULL) hasilnya selalu kosong atau salah sasaran —
 * menu fakultas hilang dan kontak yang tampil justru milik prodi ber-id sama.
 *
 * CATATAN: `id` fakultas dan `id` prodi berasal dari tabel berbeda dan bisa
 * bernilai sama (mis. fakultas 1 = "Fakultas Ilmu Komputer", prodi 1 =
 * "Teknik Informatika"), jadi pencocokan harus lewat jenis tenant.
 */
function tenantScope(tenant: { id: number; tenantType?: string | undefined }) {
  return tenant.tenantType === 'faculty'
    ? { facultyId: tenant.id, studyProgramId: null }
    : { studyProgramId: tenant.id, facultyId: null };
}

/**
 * GET /api/v1/public/site
 *
 * Identitas lengkap tenant yang sedang dibuka. Untuk website utama dan portal
 * admin tidak ada tenant, sehingga respons menjelaskan itu secara eksplisit
 * alih-alih mengirim tenant palsu.
 */
router.get(
  '/site',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      surface: req.surface,
      site: req.tenant,
    });
  }),
);

/** GET /api/v1/public/menus: navigasi publik tenant, sudah berurutan. */
router.get(
  '/menus',
  requireTenant,
  asyncHandler(async (req, res) => {
    const menus = await prisma.menu.findMany({
      where: { ...tenantScope(req.tenant!), isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json({ success: true, menus });
  }),
);

/** GET /api/v1/public/pages: daftar seluruh halaman tenant yang sudah dipublikasikan untuk navigasi. */
router.get(
  '/pages',
  requireTenant,
  asyncHandler(async (req, res) => {
    const pages = await prisma.page.findMany({
      where: { ...tenantScope(req.tenant!), isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        layout: true,
        isSystem: true,
      },
      orderBy: [{ isSystem: 'desc' }, { title: 'asc' }],
    });

    res.json({ success: true, pages });
  }),
);

/**
 * GET /api/v1/public/pages/:slug
 *
 * Halaman publik hanya membaca konten yang sudah dipublikasikan. Draft tidak
 * pernah tampil di domain publik (docs/DESIGN-RULES.md).
 */
router.get(
  '/pages/:slug',
  requireTenant,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = getParams<{ slug: string }>(req);
    const fakultas = req.tenant!.tenantType === 'faculty';
    const page = await getPublishedPageBySlug(
      fakultas ? null : req.tenant!.id,
      slug,
      fakultas ? req.tenant!.id : null,
    );

    if (!page) {
      throw AppError.notFound('Halaman tidak ditemukan atau belum dipublikasikan.');
    }

    res.json({ success: true, page });
  }),
);

/** GET /api/v1/public/curriculum: kurikulum aktif beserta semester dan mata kuliah. */
router.get(
  '/curriculum',
  requireTenant,
  asyncHandler(async (req, res) => {
    const [curriculums, masterSemesters] = await Promise.all([
      listPublicCurriculum(req.tenant!.id),
      prisma.academicSemester.findMany({
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, isActive: true },
      }),
    ]);
    res.json({
      success: true,
      curriculums,
      masterSemesters,
      summary: buildCurriculumSummary(curriculums),
    });
  }),
);

/**
 * Menormalkan nama program studi agar dapat dibandingkan.
 *
 * SIAKAD menuliskan nama prodi dengan variasi yang cukup jauh dari data lokal,
 * misalnya:
 *   lokal : "Pendidikan Agama Islam"
 *   SIAKAD: "S1 Pendidikan Agama Islam (PAI)"
 * Perbandingan literal tidak akan pernah cocok, sehingga nama dibersihkan dari
 * gelar jenjang, teks dalam kurung, dan tanda baca, lalu dibandingkan potongan
 * awalnya.
 */
function normalisasiNamaProdi(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // buang "(PAI)", "(Akhwal Syakhshiyyah)"
    .replace(/\b(s1|s2|s3|d3|d4|diploma|sarjana|magister|doktor)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Singkatan program studi yang ditulis SIAKAD di dalam tanda kurung.
 *
 * SIAKAD menyingkat beberapa prodi dengan nama lain dari data lokal, misalnya
 * `S1 Studi Islam (Dirasah Islamiyah)` — kode prodinya `STI`, bukan "Dirasah".
 */
const ALIAS_KODE_SIAKAD: Record<string, string> = {
  'akhwal syakhshiyyah': 'HKI',
  'dirasah islamiyah': 'STI',
};

/** Menyeragamkan kode program studi agar dapat dibandingkan. */
function normalisasiKodeProdi(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Mengambil petunjuk dari teks dalam kurung pada nama prodi SIAKAD.
 *
 * Contoh keluaran: `{ kode: 'PAI', teks: 'pendidikan agama islam' }` untuk
 * `S1 Pendidikan Agama Islam (PAI)`, atau `{ kode: null, teks: 'akhwal
 * syakhshiyyah' }` untuk `Hukum Keluarga Islam (Akhwal Syakhshiyyah)`.
 * Hasil kosong bila nama tidak memuat tanda kurung yang berguna.
 */
function petunjukKurung(namaSiakad: string | null | undefined): { kode: string | null; teks: string | null } {
  const isi = (namaSiakad ?? '').match(/\(([^)]*)\)/);
  if (!isi) return { kode: null, teks: null };

  const mentah = isi[1].trim();
  if (!mentah) return { kode: null, teks: null };

  const teks = normalisasiNamaProdi(mentah);
  const kodeAlias = ALIAS_KODE_SIAKAD[teks.toLowerCase()] ?? null;
  const kodeLangsung = /^[A-Za-z]{2,6}$/.test(mentah) ? normalisasiKodeProdi(mentah) : null;

  return { kode: kodeAlias ?? kodeLangsung, teks: teks || null };
}

/**
 * Menentukan apakah satu dosen benar-benar berhomebase di sebuah prodi.
 *
 * Pencocokan dilakukan bertingkat, dari yang paling pasti ke yang paling
 * longgar:
 *   1. kode prodi di dalam tanda kurung (`(PIAUD)` → kode `PIAUD`);
 *   2. nama prodi persis setelah dinormalkan;
 *   3. nama prodi berawalan sama, dua arah — hanya bila salah satu nama
 *      memuat seluruh kata nama lainnya.
 *
 * Langkah 3 sengaja ketat. Sebelumnya cukup `startsWith` satu arah, sehingga
 * "Pendidikan Islam Anak Usia Dini" bisa dianggap cocok dengan "Pendidikan
 * Agama Islam" hanya karena sama-sama berawalan "Pendidikan" — dosen PIAUD
 * lalu muncul di prodi PAI. Membandingkan kata membuat pemisahan itu aman.
 */
function dosenDiProdi(
  namaSiakad: string | null | undefined,
  prodi: { name: string; code: string },
): boolean {
  const nama = normalisasiNamaProdi(namaSiakad);
  if (!nama) return false;

  const petunjuk = petunjukKurung(namaSiakad);
  if (petunjuk.kode && petunjuk.kode === normalisasiKodeProdi(prodi.code)) return true;

  const namaProdi = normalisasiNamaProdi(prodi.name);
  if (!namaProdi) return false;
  if (nama === namaProdi) return true;

  const petunjukKurungProdi = petunjukKurung(prodi.name);
  if (petunjukKurungProdi.teks && petunjukKurungProdi.teks === petunjuk.teks) return true;

  const kataDosen = nama.split(' ');
  const kataProdi = namaProdi.split(' ');
  const awalanSama = kataDosen.every((kata, i) => kataProdi[i] === kata);
  const akhiranSama = kataProdi.every((kata, i) => kataDosen[i] === kata);

  return awalanSama || akhiranSama;
}

/**
 * Memeriksa apakah sebuah dosen berhomebase di prodi yang diberikan.
 *
 * Pemeriksaan hanya memakai nama prodi, BUKAN nama fakultas. SIAKAD menempatkan
 * PIAUD & PAI di bawah FIP padahal keduanya milik FAI, sehingga menyamakan nama
 * fakultas akan mencampur dosen antarprodi dalam satu fakultas.
 */
function prodiMilikFakultas(
  lecturer: InterServiceLecturer,
  daftarProdi: Array<{ name: string; code: string }>,
): boolean {
  return daftarProdi.some((prodi) => dosenDiProdi(lecturer.studyProgramName, prodi));
}

/** GET /api/v1/public/lecturers: direktori dosen aktif dari API Hub ONE UNUSU. */
router.get(
  '/lecturers',
  requireTenant,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant!;

    /*
     * Mengambil daftar prodi milik fakultas beserta hostname website-nya.
     *
     * Dipakai bersama oleh jalur API Hub maupun jalur cadangan, sehingga
     * pengelompokan dosen selalu mengikuti data prodi yang benar.
     */
    const ambilProdiFakultas = async () => {
      const prodi = await prisma.studyProgram.findMany({
        where: { facultyId: tenant.facultyId ?? tenant.id, status: 'active' },
        select: { id: true, name: true, code: true, degree: true, sortOrder: true, logoUrl: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      const domain = await prisma.domain.findMany({
        where: { studyProgramId: { in: prodi.map((p) => p.id) }, isActive: true },
        select: { studyProgramId: true, hostname: true, isPrimary: true },
        orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
      });

      const hostname = new Map<number, string>();
      for (const d of domain) {
        if (d.studyProgramId == null) continue;
        if (!hostname.has(d.studyProgramId)) hostname.set(d.studyProgramId, d.hostname);
      }

      return prodi.map((p) => ({ ...p, hostname: hostname.get(p.id) ?? null }));
    };

    try {
      const allLecturers = await fetchLecturersFromApiHub();

      /*
       * Website FAKULTAS mengelompokkan dosen per program studi.
       *
       * Sumber homebase adalah SIAKAD (`studyProgramName` pada API Hub), bukan
       * tabel `lecturers` lokal — tabel itu hanya berisi data contoh seeder dan
       * tidak mencerminkan dosen sungguhan. Dosen tanpa homebase tidak
       * dimasukkan ke kelompok mana pun; jumlahnya dilaporkan terpisah agar
       * admin tahu datanya masih perlu dilengkapi.
       */
      if (tenant.tenantType === 'faculty') {
        const prodiFakultas = await ambilProdiFakultas();

        /*
         * SIAKAD dapat menempatkan prodi di bawah fakultas yang berbeda dari
         * struktur resmi, misalnya PIAUD & PAI yang tercatat di Fakultas Ilmu
         * Pendidikan padahal keduanya berada di Fakultas Agama Islam.
         *
         * Prodi seperti itu HANYA ditampilkan pada fakultas pemiliknya. Bila
         * ditampilkan di kedua fakultas, nama dosen yang sama muncul dua kali
         * di dua menu berbeda dan pengunjung tidak tahu mana yang benar.
         * Akibatnya FIP hanya menampilkan PGSD — sesuai struktur resmi.
         */
        const prodiTambahan: Array<{
          id: number; name: string; code: string; degree: string;
          sortOrder: number; logoUrl: string | null; hostname: string | null;
        }> = [];

        const tanpaHomebase = allLecturers.filter((l) => {
          const nama = (l.studyProgramName ?? '').trim();
          return nama === '' || nama === '-';
        }).length;

        const kelompok = [...prodiFakultas, ...prodiTambahan].map((prodi) => {
          const anggota = allLecturers.filter((dosen) => dosenDiProdi(dosen.studyProgramName, prodi));

          return {
            prodi: {
              id: prodi.id,
              name: prodi.name,
              code: prodi.code,
              degree: prodi.degree,
              logoUrl: prodi.logoUrl,
              hostname: prodi.hostname,
            },
            lecturers: anggota.map((dosen) => ({
              id: dosen.id,
              name: dosen.name,
              nidn: dosen.nidn,
              email: dosen.email,
              academicRank: dosen.academicRank,
              education: dosen.education,
              expertise: dosen.expertise ?? null,
              sintaId: dosen.sintaId ?? null,
              sintaUrl: dosen.sintaUrl ?? null,
              googleScholar: dosen.googleScholar ?? null,
              scopusId: dosen.scopusId ?? null,
              orcid: dosen.orcid ?? null,
              bio: dosen.bio ?? null,
              photoUrl: dosen.photoUrl,
              studyProgramName: prodi.name,
              facultyName: tenant.name,
            })),
          };
        });

        res.json({
          success: true,
          grouped: true,
          groups: kelompok,
          tanpaHomebase,
          // Daftar datar tetap dikirim demi kompatibilitas klien lama.
          lecturers: kelompok.flatMap((g) => g.lecturers),
        });
        return;
      }

      /*
       * ---- Website program studi: hanya dosen dengan homebase prodi ini ----
       *
       * `tenant.name` adalah nama prodi (mis. "Pendidikan Agama Islam"), bukan
       * nama fakultas. Nama fakultas sengaja tidak diikutkan: SIAKAD menempatkan
       * PIAUD & PAI di bawah FIP, sehingga menyamakan nama fakultas akan
       * mencampur dosen antarprodi dalam satu fakultas.
       */
      const lecturers = allLecturers.filter((l) =>
        prodiMilikFakultas(l, [{ name: tenant.name, code: tenant.code ?? '' }]),
      );

      res.json({
        success: true,
        grouped: false,
        // Tidak ada fallback "tampilkan semua": dosen prodi lain tidak boleh muncul.
        lecturers,
      });
    } catch {
      // Fallback ke tabel lokal jika API Hub belum tersambung.
      if (tenant.tenantType === 'faculty') {
        const prodiFakultas = await ambilProdiFakultas();

        const dosenLokal = await prisma.lecturer.findMany({
          where: { studyProgramId: { in: prodiFakultas.map((p) => p.id) }, isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        const kelompok = prodiFakultas.map((prodi) => ({
          prodi: {
            id: prodi.id,
            name: prodi.name,
            code: prodi.code,
            degree: prodi.degree,
            logoUrl: prodi.logoUrl,
            hostname: prodi.hostname,
          },
          lecturers: dosenLokal
            .filter((d) => d.studyProgramId === prodi.id)
            .map((d) => ({
              id: d.id,
              name: d.name,
              nidn: d.nidn,
              email: d.email,
              academicRank: d.academicRank,
              education: d.education,
              photoUrl: d.photoUrl,
              studyProgramName: prodi.name,
              facultyName: tenant.name,
            })),
        }));

        res.json({
          success: true,
          grouped: true,
          groups: kelompok,
          tanpaHomebase: 0,
          lecturers: kelompok.flatMap((g) => g.lecturers),
        });
        return;
      }

      // Lecturer & facility belum menyimpan `faculty_id`, jadi hanya dibatasi
      // untuk tenant prodi.
      const lecturers = await prisma.lecturer.findMany({
        where: { studyProgramId: tenant.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      res.json({ success: true, grouped: false, lecturers });
    }
  }),
);

/**
 * GET /api/v1/public/lecturers/:id
 * Detail satu dosen publik berdasarkan ID (atau NIDN).
 */
router.get(
  '/lecturers/:id',
  asyncHandler(async (req, res) => {
    const rawId = req.params.id;
    const numId = Number(rawId);

    try {
      const allLecturers = await fetchLecturersFromApiHub();
      const dosen = allLecturers.find((d) => (Number.isInteger(numId) && d.id === numId) || d.nidn === rawId);

      if (dosen) {
        return res.json({
          success: true,
          lecturer: {
            id: dosen.id,
            name: dosen.name,
            nidn: dosen.nidn,
            nip: dosen.nip ?? null,
            email: dosen.email,
            gender: dosen.gender ?? null,
            studyProgramName: dosen.studyProgramName,
            facultyName: dosen.facultyName,
            academicRank: dosen.academicRank,
            education: dosen.education,
            expertise: dosen.expertise ?? null,
            sintaId: dosen.sintaId ?? null,
            sintaUrl: dosen.sintaUrl ?? null,
            googleScholar: dosen.googleScholar ?? null,
            scopusId: dosen.scopusId ?? null,
            orcid: dosen.orcid ?? null,
            bio: dosen.bio ?? null,
            placeOfBirth: dosen.placeOfBirth ?? null,
            dateOfBirth: dosen.dateOfBirth ?? null,
            address: dosen.address ?? null,
            photoUrl: dosen.photoUrl,
            isActive: dosen.isActive,
          },
        });
      }
    } catch {
      // lanjut ke pencarian lokal jika API Hub gagal
    }

    if (Number.isInteger(numId)) {
      const local = await prisma.lecturer.findUnique({
        where: { id: numId },
      });
      if (local && local.isActive) {
        return res.json({
          success: true,
          lecturer: local,
        });
      }
    }

    res.status(404).json({
      success: false,
      message: 'Dosen tidak ditemukan.',
    });
  }),
);

/*
 * GET /api/v1/public/documents sudah DIHAPUS.
 *
 * Dokumen publik kini dibaca dari arsip LPM/LPPM melalui
 * `GET /api/v1/public/arsip-dokumen` (lihat `modules/admin/arsipDokumen.routes.ts`)
 * dan dilindungi kata sandi dokumen milik masing-masing program studi.
 */

/** GET /api/v1/public/facilities: sarana dan prasarana tenant. */
router.get(
  '/facilities',
  requireTenant,
  asyncHandler(async (req, res) => {
    const isProdi = req.tenant!.tenantType !== 'faculty';
    const studyProgramId = isProdi ? req.tenant!.id : -1;

    const [facilities, sarprasHub] = await Promise.all([
      prisma.facility.findMany({
        where: { studyProgramId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      isProdi && req.tenant!.code ? getSarprasByProdiCode(req.tenant!.code) : Promise.resolve([]),
    ]);

    res.json({ success: true, facilities: [...facilities, ...sarprasHub] });
  }),
);

/**
 * GET /api/v1/public/facilities/:id
 * Detail sarana prasarana publik berdasarkan ID lokal atau ID dari UNUSU Sarpras Hub.
 */
router.get(
  '/facilities/:id',
  requireTenant,
  asyncHandler(async (req, res) => {
    const rawId = req.params.id;
    const numId = Number(rawId);
    const isProdi = req.tenant!.tenantType !== 'faculty';
    const studyProgramId = isProdi ? req.tenant!.id : -1;

    // 1. Cari di fasilitas lokal terlebih dahulu
    if (Number.isInteger(numId)) {
      const local = await prisma.facility.findFirst({
        where: { id: numId, studyProgramId },
      });
      if (local) {
        return res.json({ success: true, facility: local });
      }
    }

    // 2. Jika tidak ada di lokal dan tenant adalah prodi, cari di sarpras hub
    if (isProdi && req.tenant!.code) {
      try {
        const sarprasHub = await getSarprasByProdiCode(req.tenant!.code);
        const item = sarprasHub.find((f) => String(f.id) === String(rawId));
        if (item) {
          return res.json({ success: true, facility: item });
        }
      } catch {
        // abaikan galat eksternal
      }
    }

    res.status(404).json({
      success: false,
      message: 'Fasilitas sarana dan prasarana tidak ditemukan.',
    });
  }),
);

/** GET /api/v1/public/posts: berita yang sudah terbit, dengan pagination. */
router.get(
  '/posts',
  requireTenant,
  validate({ query: paginationSchema }),
  asyncHandler(async (req, res) => {
    const { page, perPage, search } = getQuery<{ page: number; perPage: number; search?: string }>(req);
    const where = {
      ...tenantScope(req.tenant!),
      status: 'published' as const,
      isPublished: true,
      ...(search ? { title: { contains: search } } : {}),
    };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          thumbnailUrl: true,
          publishedAt: true,
          views: true,
          category: { select: { name: true, slug: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      items: posts,
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  }),
);

/** GET /api/v1/public/posts/:slug: detail satu berita terbit. */
router.get(
  '/posts/:slug',
  requireTenant,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = getParams<{ slug: string }>(req);
    const post = await prisma.post.findFirst({
      where: {
        ...tenantScope(req.tenant!),
        slug,
        status: 'published',
        isPublished: true,
      },
      include: { category: { select: { name: true, slug: true } } },
    });

    if (!post) {
      throw AppError.notFound('Berita tidak ditemukan atau belum diterbitkan.');
    }

    await prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
    res.json({ success: true, post });
  }),
);

/** GET /api/v1/public/galleries: album galeri yang dipublikasikan. */
router.get(
  '/galleries',
  requireTenant,
  asyncHandler(async (req, res) => {
    const galleries = await prisma.gallery.findMany({
      where: { ...tenantScope(req.tenant!), isPublished: true },
      orderBy: [{ eventDate: 'desc' }, { id: 'desc' }],
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    res.json({ success: true, galleries });
  }),
);

/** GET /api/v1/public/profile: profil dan visi misi tenant. */
router.get(
  '/profile',
  requireTenant,
  asyncHandler(async (req, res) => {
    const [profile, visionMission] = await Promise.all([
      prisma.profileContent.findFirst({ where: tenantScope(req.tenant!) }),
      prisma.visionMission.findFirst({ where: tenantScope(req.tenant!) }),
    ]);

    res.json({ success: true, profile, visionMission });
  }),
);

/** GET /api/v1/public/contact: informasi kontak tenant. */
router.get(
  '/contact',
  requireTenant,
  asyncHandler(async (req, res) => {
    const contact = await prisma.contactInfo.findFirst({
      where: tenantScope(req.tenant!),
    });
    res.json({ success: true, contact });
  }),
);

/**
 * POST /api/v1/public/contact/messages
 *
 * Formulir pesan pengunjung. Pesan selalu tersimpan pada tenant pemilik domain,
 * bukan pada tenant yang dikirim dari body.
 */
router.post(
  '/contact/messages',
  requireTenant,
  validate({ body: createContactMessageSchema }),
  asyncHandler(async (req, res) => {
    const body = getBody<{ name: string; email: string; subject?: string | null; message: string }>(req);

    const created = await prisma.contactMessage.create({
      data: {
        studyProgramId: req.tenant!.id,
        name: body.name,
        email: body.email,
        subject: body.subject ?? 'Pesan Pengunjung Website',
        message: body.message,
      },
      select: { id: true, createdAt: true },
    });

    res.status(201).json({
      success: true,
      message: 'Pesan Anda sudah kami terima. Terima kasih.',
      id: created.id,
    });
  }),
);

/**
 * GET /api/v1/public/directory
 *
 * Direktori seluruh program studi beserta domain publiknya. Dipakai halaman
 * beranda portal administrasi (ADMIN_HOST) untuk menampilkan daftar website
 * prodi kepada pengunjung.
 *
 * Endpoint ini sengaja TIDAK memakai `requireTenant`: justru pada permukaan
 * admin tidak ada tenant, dan seluruh data yang dikirim sudah bersifat publik
 * (nama program studi, fakultas, dan hostname). Draft dan data internal tidak
 * pernah ikut dikirim.
 */
router.get(
  '/directory',
  asyncHandler(async (_req, res) => {
    const studyPrograms = await prisma.studyProgram.findMany({
      where: { status: 'active' },
      orderBy: [{ facultyId: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        degree: true,
        logoUrl: true,
        faculty: { select: { id: true, name: true, code: true, slug: true, description: true } },
        domains: {
          where: { isActive: true },
          orderBy: { isPrimary: 'desc' },
          select: { hostname: true, isPrimary: true },
        },
      },
    });

    /*
     * Hostname website resmi fakultas.
     *
     * Kartu fakultas pada beranda portal harus dapat diklik menuju domain
     * fakultas (`fasilkom.unusu.ac.id`), bukan hanya menuju halaman internal
     * portal. Domain fakultas disimpan terpisah pada kolom `faculty_id`.
     */
    const domainFakultas = await prisma.domain.findMany({
      where: { facultyId: { not: null }, isActive: true },
      select: { facultyId: true, hostname: true, isPrimary: true },
      orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
    });

    const hostnameFakultas = new Map<number, string>();
    for (const domain of domainFakultas) {
      if (domain.facultyId == null) continue;
      if (!hostnameFakultas.has(domain.facultyId)) {
        hostnameFakultas.set(domain.facultyId, domain.hostname);
      }
    }

    res.json({
      success: true,
      total: studyPrograms.length,
      studyPrograms: studyPrograms.map((prodi) => ({
        ...prodi,
        // Hostname utama dipakai untuk tautan keluar ke website prodi.
        primaryHostname:
          prodi.domains.find((domain) => domain.isPrimary)?.hostname ??
          prodi.domains[0]?.hostname ??
          null,
        faculty: {
          ...prodi.faculty,
          // Hostname website fakultas, untuk tautan kartu fakultas.
          hostname: hostnameFakultas.get(prodi.faculty.id) ?? null,
        },
      })),
    });
  }),
);

/**
 * GET /api/v1/public/academic-hierarchy
 *
 * Endpoint publik untuk struktur hierarki Fakultas dan Program Studi aktif.
 * Digunakan oleh SSO ONE UNUSU dan modul eksternal untuk sinkronisasi dropdown akun.
 */
router.get(
  '/academic-hierarchy',
  asyncHandler(async (_req, res) => {
    const faculties = await prisma.faculty.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        studyPrograms: {
          where: { status: 'active' },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            slug: true,
            degree: true,
          },
        },
      },
    });

    res.json({
      success: true,
      total: faculties.length,
      faculties,
    });
  }),
);

/**
 * GET /api/v1/public/news
 *
 * Berita terbit dari SELURUH program studi, dipakai beranda portal.
 *
 * Berbeda dengan `/posts` yang mensyaratkan tenant, endpoint ini justru tidak
 * memakai `requireTenant` karena portal tidak memiliki tenant tetap. Setiap
 * butir membawa identitas prodi asalnya agar tautan "Lihat selengkapnya" dapat
 * mengarah ke domain prodi yang benar.
 *
 * `slug` hanya unik di dalam satu prodi, jadi kombinasi prodi+slug dipakai
 * untuk membentuk kunci tautan yang unik.
 */
router.get(
  '/news',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 24);

    const posts = await prisma.post.findMany({
      where: { status: 'published', isPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        thumbnailUrl: true,
        publishedAt: true,
        views: true,
        category: { select: { name: true, slug: true } },
        studyProgram: {
          select: {
            id: true,
            code: true,
            name: true,
            faculty: { select: { name: true } },
            domains: {
              where: { isActive: true },
              orderBy: { isPrimary: 'desc' },
              select: { hostname: true },
            },
          },
        },
        faculty: {
          select: {
            id: true,
            code: true,
            name: true,
            domains: {
              where: { isActive: true },
              orderBy: { isPrimary: 'desc' },
              select: { hostname: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      items: posts.map((post) => {
        const isFaculty = !post.studyProgram && Boolean(post.faculty);
        const targetHostname =
          post.studyProgram?.domains[0]?.hostname ?? post.faculty?.domains[0]?.hostname ?? null;
        const targetCode = post.studyProgram?.code ?? post.faculty?.code ?? null;
        const targetName = post.studyProgram?.name ?? post.faculty?.name ?? null;

        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          thumbnailUrl: post.thumbnailUrl,
          publishedAt: post.publishedAt,
          views: post.views,
          category: post.category,
          studyProgramId: post.studyProgram?.id ?? null,
          studyProgramCode: targetCode,
          studyProgramName: targetName,
          facultyId: post.faculty?.id ?? null,
          facultyName: post.studyProgram?.faculty.name ?? (isFaculty ? post.faculty?.name : null),
          prodiHostname: targetHostname,
          // Tautan absolut ke domain prodi atau fakultas asal agar langsung membuka detail beritanya.
          url: targetHostname ? `https://${targetHostname}/berita/${post.slug}` : null,
        };
      }),
    });
  }),
);

/** GET /api/v1/public/sitemap: daftar URL publik tenant untuk sitemap.xml. */
router.get(
  '/sitemap',
  requireTenant,
  asyncHandler(async (req, res) => {
    const [pages, posts, galleries] = await Promise.all([
      prisma.page.findMany({
        where: { studyProgramId: req.tenant!.id, isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { studyProgramId: req.tenant!.id, status: 'published' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.gallery.findMany({
        where: { studyProgramId: req.tenant!.id, isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const base = `https://${req.requestHostname}`;
    const entries = [
      { url: `${base}/`, lastmod: new Date().toISOString() },
      ...pages.map((page) => ({
        url: page.slug === 'beranda' ? `${base}/` : `${base}/${page.slug}`,
        lastmod: page.updatedAt.toISOString(),
      })),
      ...posts.map((post) => ({ url: `${base}/berita/${post.slug}`, lastmod: post.updatedAt.toISOString() })),
      ...galleries.map((gallery) => ({
        url: `${base}/galeri/${gallery.slug}`,
        lastmod: gallery.updatedAt.toISOString(),
      })),
    ];

    res.json({ success: true, entries });
  }),
);

/**
 * GET /api/v1/public/hero-slides
 *
 * Hero slider untuk beranda.
 *
 * - Bila hostname adalah website prodi, yang dibaca adalah widget `hero_slider`
 *   milik prodi tersebut, sehingga banner selalu sesuai prodi yang dibuka.
 * - Bila hostname adalah portal pusat / website utama (tidak ada tenant), yang
 *   dibaca adalah banner Portal Pusat: widget `hero_slider` pada halaman sistem
 *   `__portal_hero__`. Banner itu diatur melalui
 *   `/admin/portal/hero-slides?scope=portal`.
 *
 * Mengembalikan array kosong bila belum ada slide; pemanggil bertanggung jawab
 * menyiapkan tampilan cadangan.
 */
router.get(
  '/hero-slides',
  asyncHandler(async (req, res) => {
    const widget = await prisma.sectionWidget.findFirst({
      where: req.tenant?.tenantType === 'faculty'
        ? {
            widget: { code: 'hero_slider' },
            pageSection: { page: { facultyId: req.tenant.id, slug: 'beranda' } },
          }
        : req.tenant
          ? {
              widget: { code: 'hero_slider' },
              pageSection: { page: { studyProgramId: req.tenant.id } },
            }
          : {
              widget: { code: 'hero_slider' },
              pageSection: { page: { studyProgramId: null, slug: '__portal_hero__' } },
            },
      orderBy: { id: 'asc' },
      select: { configJson: true },
    });

    let slides: Array<{ imageUrl: string; alt: string; linkUrl: string }> = [];
    let autoplayMs = 6000;
    let showDots = true;
    if (widget?.configJson) {
      try {
        const config = JSON.parse(widget.configJson) as {
          slides?: Array<{ imageUrl?: string; alt?: string; linkUrl?: string }>;
          autoplayMs?: unknown;
          showDots?: unknown;
        };
        if (
          typeof config.autoplayMs === 'number' &&
          Number.isInteger(config.autoplayMs) &&
          config.autoplayMs >= 1000 &&
          config.autoplayMs <= 60000
        ) {
          autoplayMs = config.autoplayMs;
        }
        if (typeof config.showDots === 'boolean') {
          showDots = config.showDots;
        }
        if (Array.isArray(config.slides)) {
          slides = config.slides
            .filter((slide) => typeof slide?.imageUrl === 'string' && slide.imageUrl.trim())
            .map((slide) => ({
              imageUrl: slide.imageUrl as string,
              alt: slide.alt ?? '',
              linkUrl: slide.linkUrl ?? '',
            }));
        }
      } catch {
        slides = [];
      }
    }

    res.json({
      success: true,
      scope: req.tenant?.tenantType === 'faculty' ? 'faculty' : req.tenant ? 'prodi' : 'portal',
      studyProgramId: req.tenant?.tenantType === 'faculty' ? null : req.tenant?.id ?? null,
      facultyId: req.tenant?.tenantType === 'faculty' ? req.tenant.id : null,
      slides,
      autoplayMs,
      showDots,
    });
  }),
);

/**
 * GET /api/v1/public/all-curriculums
 *
 * Endpoint API publik/inter-service lintas prodi untuk mengambil seluruh data kurikulum
 * dan mata kuliah dari semua program studi aktif di UNUSU.
 * Digunakan oleh ONE UNUSU API Hub (`/api/v1/inter-service/kurikulum-prodi`).
 *
 * Filter query yang didukung:
 * - prodi: kode (mis. "TIF") atau nama prodi
 * - year: tahun kurikulum (angka)
 * - semester: kode semester (mis. "2025-2026-GANJIL") atau nama semester
 * - search: kata kunci pencarian kode atau nama mata kuliah
 * - isActive: boolean (hanya kurikulum aktif atau semua)
 */
router.get(
  '/all-curriculums',
  asyncHandler(async (req, res) => {
    const prodiQuery = typeof req.query.prodi === 'string' ? req.query.prodi.trim().toLowerCase() : undefined;
    const yearQuery = req.query.year ? Number(req.query.year) : undefined;
    const semesterQuery = typeof req.query.semester === 'string' ? req.query.semester.trim().toLowerCase() : undefined;
    const searchQuery = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : undefined;
    const isActiveQuery =
      req.query.isActive !== undefined
        ? req.query.isActive === 'true' || req.query.isActive === '1'
        : undefined;

    // Filter kurikulum dasar
    const curriculumWhere: any = {};
    if (isActiveQuery !== undefined) {
      curriculumWhere.isActive = isActiveQuery;
    }
    if (yearQuery && !isNaN(yearQuery)) {
      curriculumWhere.year = yearQuery;
    }

    if (prodiQuery) {
      curriculumWhere.studyProgram = {
        OR: [
          { code: { contains: prodiQuery } },
          { name: { contains: prodiQuery } },
        ],
      };
    }

    const curriculums = await prisma.curriculum.findMany({
      where: curriculumWhere,
      orderBy: [{ year: 'desc' }, { id: 'desc' }],
      include: {
        studyProgram: {
          select: {
            id: true,
            code: true,
            name: true,
            degree: true,
            faculty: { select: { id: true, code: true, name: true } },
          },
        },
        items: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: {
            course: { select: { id: true, code: true, name: true } },
            academicSemester: { select: { id: true, name: true, code: true, isActive: true } },
            rpsDocuments: {
              where: { isPublic: true },
              orderBy: { createdAt: 'desc' },
              select: { id: true, title: true, fileUrl: true, revision: true },
            },
          },
        },
        semesters: {
          orderBy: { semesterNumber: 'asc' },
          include: {
            courses: {
              orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
              include: {
                academicSemester: { select: { id: true, name: true, code: true, isActive: true } },
                rpsDocuments: {
                  where: { isPublic: true },
                  orderBy: { createdAt: 'desc' },
                  select: { id: true, title: true, fileUrl: true, revision: true },
                },
              },
            },
          },
        },
      },
    });

    // Format dan gabungkan items (ADR-006) dan legacy courses
    const results = curriculums.map((c) => {
      // Normalisasi mata kuliah
      let coursesList: any[] = [];

      // 1. Dari items baru
      for (const it of c.items) {
        coursesList.push({
          id: it.id,
          source: 'curriculum_items',
          courseId: it.course.id,
          code: it.course.code,
          name: it.course.name,
          credits: it.credits,
          description: it.description,
          semesterNumber: it.semesterNumber ?? null,
          academicSemester: it.academicSemester
            ? {
                id: it.academicSemester.id,
                code: it.academicSemester.code,
                name: it.academicSemester.name,
                isActive: it.academicSemester.isActive,
              }
            : null,
          lecturers: (it.lecturersData as any[]) ?? [],
          rpsDocuments: it.rpsDocuments.map((rps) => ({
            id: rps.id,
            title: rps.title,
            fileUrl: rps.fileUrl,
            revision: rps.revision,
          })),
        });
      }

      // 2. Dari legacy courses
      for (const sem of c.semesters) {
        for (const legacy of sem.courses) {
          coursesList.push({
            id: legacy.id,
            source: 'curriculum_courses',
            courseId: null,
            code: legacy.code,
            name: legacy.name,
            credits: legacy.credits,
            description: legacy.description,
            semesterNumber: sem.semesterNumber,
            academicSemester: legacy.academicSemester
              ? {
                  id: legacy.academicSemester.id,
                  code: legacy.academicSemester.code,
                  name: legacy.academicSemester.name,
                  isActive: legacy.academicSemester.isActive,
                }
              : null,
            lecturers: (legacy.lecturersData as any[]) ?? [],
            rpsDocuments: legacy.rpsDocuments.map((rps) => ({
              id: rps.id,
              title: rps.title,
              fileUrl: rps.fileUrl,
              revision: rps.revision,
            })),
          });
        }
      }

      // Filter mata kuliah jika ada query semester atau search
      if (semesterQuery) {
        coursesList = coursesList.filter((crs) => {
          if (!crs.academicSemester) return semesterQuery === 'none' || semesterQuery === 'tanpa';
          return (
            crs.academicSemester.code.toLowerCase().includes(semesterQuery) ||
            crs.academicSemester.name.toLowerCase().includes(semesterQuery)
          );
        });
      }

      if (searchQuery) {
        coursesList = coursesList.filter(
          (crs) =>
            crs.code.toLowerCase().includes(searchQuery) ||
            crs.name.toLowerCase().includes(searchQuery),
        );
      }

      const totalCredits = coursesList.reduce((acc, crs) => acc + crs.credits, 0);

      return {
        id: c.id,
        name: c.name,
        year: c.year,
        description: c.description,
        isActive: c.isActive,
        studyProgram: {
          id: c.studyProgram.id,
          code: c.studyProgram.code,
          name: c.studyProgram.name,
          degree: c.studyProgram.degree,
          faculty: c.studyProgram.faculty ? c.studyProgram.faculty.name : null,
        },
        totalCourses: coursesList.length,
        totalCredits,
        courses: coursesList,
      };
    });

    // Bila ada pencarian mata kuliah atau semester, jangan tampilkan kurikulum yang daftar matkulnya 0
    const filteredResults = (semesterQuery || searchQuery)
      ? results.filter((r) => r.totalCourses > 0)
      : results;

    res.json({
      success: true,
      totalCurriculums: filteredResults.length,
      curriculums: filteredResults,
    });
  }),
);

export default router;
