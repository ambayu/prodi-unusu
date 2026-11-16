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
    const curriculums = await listPublicCurriculum(req.tenant!.id);
    res.json({
      success: true,
      curriculums,
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
 * Memeriksa apakah sebuah prodi milik fakultas yang sedang diakses.
 *
 * Urutan pemeriksaan: nama fakultas persis, lalu awalan nama prodi. Pemeriksaan
 * nama prodi diperlukan karena SIAKAD dapat menempatkan prodi di bawah fakultas
 * yang berbeda dari struktur resmi, sehingga fakultas yang benar tidak boleh
 * kehilangan dosennya.
 */
function prodiMilikFakultas(
  lecturer: InterServiceLecturer,
  namaFakultas: string,
  daftarProdi: string[],
): boolean {
  const fakultasDosen = (lecturer.facultyName ?? '').trim().toLowerCase();
  const fakultasTenant = namaFakultas.trim().toLowerCase();

  if (fakultasTenant && fakultasDosen === fakultasTenant) return true;

  const prodiDosen = normalisasiNamaProdi(lecturer.studyProgramName);
  if (!prodiDosen) return false;

  return daftarProdi.some((nama) => {
    const bersih = normalisasiNamaProdi(nama);
    if (!bersih) return false;
    return prodiDosen === bersih || prodiDosen.startsWith(bersih) || bersih.startsWith(prodiDosen);
  });
}

/** GET /api/v1/public/lecturers: direktori dosen aktif dari API Hub ONE UNUSU. */
router.get(
  '/lecturers',
  requireTenant,
  asyncHandler(async (req, res) => {
    const tenant = req.tenant!;

    try {
      const allLecturers = await fetchLecturersFromApiHub();

      /*
       * Website FAKULTAS mengelompokkan dosen per program studi.
       *
       * Dosen diambil dari homebase resmi tiap prodi (tabel lokal) agar
       * pengelompokannya pasti benar, lalu dicocokkan dengan data API Hub untuk
       * melengkapi NIDN, jabatan akademik, dan foto. Sebelumnya endpoint ini
       * memfilter memakai NAMA saja dan mengembalikan seluruh dosen bila hasil
       * filter kosong — sehingga fakultas bisa menampilkan dosen prodi lain.
       */
      if (tenant.tenantType === 'faculty') {
        const prodiFakultas = await prisma.studyProgram.findMany({
          where: { facultyId: tenant.facultyId ?? tenant.id, status: 'active' },
          select: { id: true, name: true, code: true, degree: true, sortOrder: true, logoUrl: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        const dosenLokal = await prisma.lecturer.findMany({
          where: { studyProgramId: { in: prodiFakultas.map((p) => p.id) }, isActive: true },
          select: { id: true, studyProgramId: true, name: true, nidn: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        // Indeks hasil pencocokan nama: "nama|nidn" dan "nama" saja.
        const petaHub = new Map<string, InterServiceLecturer>();
        for (const dosen of allLecturers) {
          const kunciNama = (dosen.name ?? '').trim().toLowerCase();
          if (!kunciNama) continue;
          petaHub.set(`${kunciNama}|${(dosen.nidn ?? '').trim()}`, dosen);
          if (!petaHub.has(kunciNama)) petaHub.set(kunciNama, dosen);
        }

        /** URL website prodi, dipakai tautan "Lihat website prodi". */
        const domainProdi = await prisma.domain.findMany({
          where: { studyProgramId: { in: prodiFakultas.map((p) => p.id) }, isActive: true },
          select: { studyProgramId: true, hostname: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        });

        const hostnameProdi = new Map<number, string>();
        for (const domain of domainProdi) {
          if (domain.studyProgramId == null) continue;
          if (!hostnameProdi.has(domain.studyProgramId)) {
            hostnameProdi.set(domain.studyProgramId, domain.hostname);
          }
        }

        const kelompok = prodiFakultas.map((prodi) => {
          const angggota = dosenLokal
            .filter((d) => d.studyProgramId === prodi.id)
            .map((d) => {
              const kunciNama = (d.name ?? '').trim().toLowerCase();
              const hub =
                petaHub.get(`${kunciNama}|${(d.nidn ?? '').trim()}`) ?? petaHub.get(kunciNama) ?? null;

              return {
                id: d.id,
                name: d.name,
                // Lengkapi dari API Hub bila tersedia; tetap tampil walau kosong.
                nidn: hub?.nidn ?? d.nidn,
                email: hub?.email ?? null,
                academicRank: hub?.academicRank ?? null,
                education: hub?.education ?? null,
                photoUrl: hub?.photoUrl ?? null,
                studyProgramName: prodi.name,
                facultyName: tenant.name,
              };
            });

          return {
            prodi: {
              id: prodi.id,
              name: prodi.name,
              code: prodi.code,
              degree: prodi.degree,
              logoUrl: prodi.logoUrl,
              hostname: hostnameProdi.get(prodi.id) ?? null,
            },
            lecturers: angggota,
          };
        });

        /*
         * Dosen tanpa homebase tidak dimasukkan ke kelompok prodi mana pun agar
         * tidak salah tempat. Jumlahnya dilaporkan terpisah supaya admin tahu
         * masih ada data SIAKAD yang perlu dilengkapi.
         */
        const tanpaHomebase = allLecturers.filter(
          (l) => !l.studyProgramName || l.studyProgramName.trim() === '-' || l.studyProgramName.trim() === '',
        ).length;

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

      // ---- Website program studi: hanya dosen dengan homebase prodi ini ----
      const lecturers = allLecturers.filter((l) =>
        prodiMilikFakultas(l, tenant.name, [tenant.name]),
      );

      res.json({
        success: true,
        grouped: false,
        // Tidak ada fallback "tampilkan semua": dosen prodi lain tidak boleh muncul.
        lecturers,
      });
    } catch {
      // Fallback ke tabel lokal jika API Hub belum tersambung.
      if (req.tenant!.tenantType === 'faculty') {
        const prodiFakultas = await prisma.studyProgram.findMany({
          where: { facultyId: req.tenant!.facultyId ?? req.tenant!.id, status: 'active' },
          select: { id: true, name: true, code: true, degree: true, sortOrder: true, logoUrl: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        const dosenLokal = await prisma.lecturer.findMany({
          where: { studyProgramId: { in: prodiFakultas.map((p) => p.id) }, isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });

        const kelompok = prodiFakultas.map((prodi) => ({
          prodi: { id: prodi.id, name: prodi.name, code: prodi.code, degree: prodi.degree, logoUrl: prodi.logoUrl, hostname: null },
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
              facultyName: req.tenant!.name,
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
        where: { studyProgramId: req.tenant!.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      res.json({ success: true, grouped: false, lecturers });
    }
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
    const facilities = await prisma.facility.findMany({
      where: { studyProgramId: req.tenant!.tenantType === 'faculty' ? -1 : req.tenant!.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, facilities });
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
      },
    });

    res.json({
      success: true,
      items: posts.map((post) => {
        const hostname = post.studyProgram?.domains[0]?.hostname ?? null;
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
          studyProgramCode: post.studyProgram?.code ?? null,
          studyProgramName: post.studyProgram?.name ?? null,
          facultyName: post.studyProgram?.faculty.name ?? null,
          prodiHostname: hostname,
          // Tautan absolut ke domain prodi asal agar tidak bergantung konteks host.
          url: hostname ? `https://${hostname}/berita/${post.slug}` : null,
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
      where: req.tenant
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
    if (widget?.configJson) {
      try {
        const config = JSON.parse(widget.configJson) as {
          slides?: Array<{ imageUrl?: string; alt?: string; linkUrl?: string }>;
        };
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
      scope: req.tenant ? 'prodi' : 'portal',
      studyProgramId: req.tenant?.id ?? null,
      slides,
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
    const isActiveQuery = req.query.isActive !== undefined ? req.query.isActive === 'true' || req.query.isActive === '1' : true;

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
