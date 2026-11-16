/**
 * Seeder Idempotent untuk data konten awal 6 Fakultas UNUSU.
 *
 * Melengkapi `seed-prodi-content.ts`: program studi sudah punya profil, visi &
 * misi, kontak, dan berita; fakultas belum. Tanpa data ini website fakultas
 * (fasilkom, fip, fe, faperta, fikes, fai) tampil kosong, karena halaman
 * Profil / Visi & Misi / Berita membaca baris yang `faculty_id`-nya terisi.
 *
 * Prinsip yang dipegang (sama dengan seeder prodi):
 *   - Idempotent: memakai `upsert` berkunci `facultyId` (kolom itu @unique).
 *   - Tidak pernah `deleteMany()` data operasional.
 *   - Hanya MENGISI kolom yang masih kosong; konten hasil suntingan admin
 *     tidak pernah ditimpa ketika seeder dijalankan ulang.
 *   - Menu fakultas sengaja TIDAK disalin dari prodi. Fakultas tidak memiliki
 *     kurikulum maupun sarana-prasarana sendiri — keduanya milik prodi.
 *
 * Jalankan:
 *   npx tsx prisma/seed-faculty-content.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gambar pendukung profil bawaan per fakultas.
 *
 * Seluruh berkas ini sudah tersedia di folder `public`, sehingga seeder tidak
 * membuat berkas baru. Admin dapat menggantinya lewat menu Profil.
 */
const PROFILE_HERO_BY_FACULTY: Record<string, string> = {
  FIK: '/rektorat-unusu.jpg',
  FIP: '/gedung-unusu.jpg',
  FE: '/rektorat-unusu.jpg',
  FAPERTA: '/gedung-unusu.jpg',
  FIKES: '/assets/campus-login.png',
  FAI: '/rektorat-unusu.jpg',
};

const PROFILE_HERO_DEFAULT = '/rektorat-unusu.jpg';

/**
 * Hostname resmi tiap fakultas.
 *
 * Catatan: kode fakultas FIK memakai hostname `fasilkom`, bukan `fik`. Nilai
 * ini harus sama dengan `server_name` di Nginx dan baris pada tabel `domains`,
 * jika tidak `resolveSite()` menolak permintaan dengan DOMAIN_NOT_REGISTERED.
 */
const HOSTNAME_BY_FACULTY: Record<string, string> = {
  FIK: 'fasilkom.unusu.ac.id',
  FIP: 'fip.unusu.ac.id',
  FE: 'fe.unusu.ac.id',
  FAPERTA: 'faperta.unusu.ac.id',
  FIKES: 'fikes.unusu.ac.id',
  FAI: 'fai.unusu.ac.id',
};

/** Warna tema per fakultas agar tiap website punya ciri visual sendiri. */
const THEME_BY_FACULTY: Record<string, { primary: string; secondary: string; accent: string }> = {
  FIK: { primary: '#1e3a8a', secondary: '#0f172a', accent: '#38bdf8' },
  FIP: { primary: '#14532d', secondary: '#0d2818', accent: '#fbbf24' },
  FE: { primary: '#7c2d12', secondary: '#1c1917', accent: '#fbbf24' },
  FAPERTA: { primary: '#166534', secondary: '#0f2a1a', accent: '#facc15' },
  FIKES: { primary: '#0e7490', secondary: '#083344', accent: '#fbbf24' },
  FAI: { primary: '#3b0764', secondary: '#1e1b4b', accent: '#fbbf24' },
};

/**
 * Struktur menu navbar website fakultas.
 *
 * Disimpan bertingkat karena navbar membaca `parentId`: item tanpa `parent`
 * tampil sebagai tautan utama, sedangkan item dalam `children` menjadi dropdown.
 *
 * Perbedaan penting dengan menu prodi:
 *   - Tidak ada "Kurikulum" dan "Sarana & Prasarana" — keduanya milik prodi.
 *   - Ada "Program Studi" yang menuju `/prodi` dan menautkan ke website tiap
 *     prodi di bawah fakultas.
 *   - Grup Profil + Visi & Misi dinamai "Tentang Fakultas", bukan
 *     "Tentang Prodi" sebagaimana label cadangan untuk website prodi.
 */
interface FacultyMenuNode {
  title: string;
  url: string;
  isRequired: boolean;
  children?: Array<{ title: string; url: string; isRequired: boolean }>;
}

const FACULTY_MENUS: FacultyMenuNode[] = [
  { title: 'Beranda', url: '/', isRequired: true },
  {
    title: 'Tentang Fakultas',
    // Grup wadah: tidak menunjuk halaman sendiri, hanya membuka dropdown.
    url: '#',
    isRequired: true,
    children: [
      { title: 'Profil', url: '/profil', isRequired: true },
      { title: 'Visi & Misi', url: '/visi-misi', isRequired: true },
    ],
  },
  { title: 'Program Studi', url: '/prodi', isRequired: true },
  {
    title: 'Akademik',
    url: '#',
    isRequired: false,
    children: [{ title: 'Dosen', url: '/dosen', isRequired: false }],
  },
  {
    title: 'Informasi & Dokumen',
    url: '#',
    isRequired: false,
    children: [
      { title: 'Berita & Warta', url: '/berita', isRequired: false },
      { title: 'Galeri Kegiatan', url: '/galeri', isRequired: false },
      { title: 'Dokumen & Unduhan', url: '/dokumen', isRequired: false },
    ],
  },
  { title: 'Kontak & Lokasi', url: '/kontak', isRequired: true },
];

/**
 * Butir misi fakultas.
 *
 * Fakultas bergerak di tingkat yang lebih luas daripada prodi: pengelolaan
 * beberapa program studi sekaligus, koordinasi dosen, dan kerja sama
 * antarlembaga — bukan pengajaran satu bidang keilmuan tertentu.
 */
function buildFacultyMissions(name: string): string[] {
  return [
    `Menyelenggarakan dan mengoordinasikan pendidikan tinggi yang bermutu pada program studi di lingkungan ${name}.`,
    'Mengembangkan penelitian dan publikasi ilmiah yang berkontribusi bagi pengembangan ilmu pengetahuan dan teknologi.',
    'Melaksanakan pengabdian kepada masyarakat yang berorientasi pada pemberdayaan umat dan pembangunan daerah.',
    'Menjalin kerja sama strategis dengan perguruan tinggi, dunia usaha, dunia industri, dan lembaga pemerintah.',
    'Membina suasana akademik yang islami, inklusif, dan berlandaskan nilai Ahlussunnah wal Jama’ah An-Nahdliyah.',
  ];
}

/** Ringkasan profil per fakultas, dipakai sebelum data admin tersedia. */
function buildFacultyOverview(name: string, universitas: string): string {
  return (
    `${name} adalah salah satu fakultas di lingkungan ${universitas}. ` +
    'Fakultas menyelenggarakan pendidikan tinggi berbasis Ahlussunnah wal Jama’ah An-Nahdliyah ' +
    'dengan memadukan penguasaan ilmu pengetahuan dan teknologi serta pembentukan karakter mahasiswa. ' +
    'Melalui program studi yang dikelolanya, fakultas menyiapkan lulusan yang kompeten, berintegritas, ' +
    'dan mampu berkontribusi di tingkat nasional maupun internasional.'
  );
}

/**
 * Gambar kartu bawaan per program studi.
 *
 * Dipakai beranda fakultas sebagai penutup kartu Program Studi. Seluruh berkas
 * sudah ada di `public/images/prodi`, sehingga seeder tidak membuat berkas baru.
 * Admin dapat menggantinya kapan saja lewat tombol "Gambar" pada menu Struktur
 * Organisasi — seeder hanya mengisi kolom `logo_url` yang masih kosong.
 */
const PRODI_IMAGE_BY_CODE: Record<string, string> = {
  TIF: '/images/prodi/prodi-coding.png',
  IKO: '/images/prodi/prodi-coding.png',
  SIN: '/images/prodi/prodi-analytics.png',
  PGSD: '/images/prodi/prodi-education.png',
  MAN: '/images/prodi/prodi-finance.png',
  AGB: '/images/prodi/prodi-ai.png',
  ITP: '/images/prodi/prodi-ai.png',
  BDP: '/images/prodi/prodi-ai.png',
  GIZ: '/images/prodi/prodi-analytics.png',
  ANK: '/images/prodi/prodi-analytics.png',
  PIAUD: '/images/prodi/prodi-education.png',
  PAI: '/images/prodi/prodi-education.png',
  HKI: '/images/prodi/prodi-education.png',
  STI: '/images/prodi/prodi-education.png',
};

/**
 * Mengisi gambar kartu untuk program studi milik fakultas yang sedang diproses.
 *
 * Hanya kolom `logo_url` yang kosong yang diisi, sehingga gambar hasil unggahan
 * admin (bersumber dari pustaka media) tidak pernah tertimpa saat seeder
 * dijalankan ulang.
 */
async function seedProdiImages(facultyId: number): Promise<{ diisi: number; dilewati: number }> {
  const prodis = await prisma.studyProgram.findMany({
    where: { facultyId },
    select: { id: true, code: true, logoUrl: true },
  });

  let diisi = 0;
  let dilewati = 0;

  for (const prodi of prodis) {
    if (prodi.logoUrl?.trim()) {
      dilewati += 1;
      continue;
    }

    const gambar = PRODI_IMAGE_BY_CODE[prodi.code];
    if (!gambar) continue;

    await prisma.studyProgram.update({
      where: { id: prodi.id },
      data: { logoUrl: gambar },
    });
    diisi += 1;
  }

  return { diisi, dilewati };
}

async function seedFacultyContents() {
  console.log('Mengisi data konten untuk seluruh Fakultas UNUSU...');

  const faculties = await prisma.faculty.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (faculties.length === 0) {
    console.warn('  ! Tidak ada fakultas aktif. Jalankan seeder organisasi terlebih dahulu.');
    return;
  }

  let count = 0;

  for (const faculty of faculties) {
    count += 1;

    const name = faculty.name;
    const code = faculty.code;
    const universitas = 'Universitas Nahdlatul Ulama Sumatera Utara';
    const heroImageUrl = PROFILE_HERO_BY_FACULTY[code] ?? PROFILE_HERO_DEFAULT;
    const hostname = HOSTNAME_BY_FACULTY[code];
    const theme = THEME_BY_FACULTY[code] ?? { primary: '#1e3a8a', secondary: '#0f172a', accent: '#fbbf24' };

    // ------------------------------------------------------------------
    // 1. Website setting (judul, tagline, SEO)
    // ------------------------------------------------------------------
    const settingExisting = await prisma.websiteSetting.findUnique({
      where: { facultyId: faculty.id },
    });

    const siteTitle = name;
    const siteTagline = `Unggul, Inovatif, dan Berkarakter Aswaja — ${name} UNUSU`;

    await prisma.websiteSetting.upsert({
      where: { facultyId: faculty.id },
      create: {
        facultyId: faculty.id,
        siteTitle,
        siteTagline,
        univName: universitas,
        facultyName: name,
        logoUrl: '/logo-unusu.jpg',
        faviconUrl: '/logo-unusu.jpg',
        seoTitle: name,
        seoDescription: `${name} ${universitas} — informasi program studi, dosen, kurikulum, berita, dan layanan akademik.`,
        copyrightText: `© ${new Date().getFullYear()} ${name} ${universitas}`,
      },
      // Hanya isi yang kosong; suntingan admin tidak ditimpa.
      update: {
        ...(settingExisting?.siteTitle?.trim() ? {} : { siteTitle }),
        ...(settingExisting?.siteTagline?.trim() ? {} : { siteTagline }),
        ...(settingExisting?.seoDescription?.trim() ? {} : {
          seoDescription: `${name} ${universitas} — informasi program studi, dosen, kurikulum, berita, dan layanan akademik.`,
        }),
      },
    });

    // ------------------------------------------------------------------
    // 2. Tema visual
    // ------------------------------------------------------------------
    await prisma.theme.upsert({
      where: { facultyId: faculty.id },
      create: {
        facultyId: faculty.id,
        primaryColor: theme.primary,
        secondaryColor: theme.secondary,
        accentColor: theme.accent,
        fontHeading: 'Plus Jakarta Sans',
        fontBody: 'Plus Jakarta Sans',
      },
      update: {},
    });

    // ------------------------------------------------------------------
    // 3. Profil fakultas
    // ------------------------------------------------------------------
    const profileExisting = await prisma.profileContent.findUnique({
      where: { facultyId: faculty.id },
    });

    await prisma.profileContent.upsert({
      where: { facultyId: faculty.id },
      create: {
        facultyId: faculty.id,
        overview: buildFacultyOverview(name, universitas),
        history:
          `${name} didirikan sebagai bagian dari pengembangan ${universitas} untuk menjawab kebutuhan ` +
          'sumber daya manusia profesional dan berintegritas di Sumatera Utara dan Indonesia.',
        objectives:
          'Menghasilkan lulusan yang kompeten dan berdaya saing, meningkatkan mutu penelitian dan publikasi, ' +
          'serta memperluas dampak pengabdian kepada masyarakat.',
        targets:
          'Terwujudnya tata kelola fakultas yang akuntabel, peningkatan peringkat akreditasi program studi, ' +
          'dan penguatan jejaring kerja sama nasional maupun internasional.',
        organization:
          'Fakultas dipimpin oleh Dekan, dibantu Wakil Dekan Bidang Akademik, Wakil Dekan Bidang Umum dan ' +
          'Keuangan, serta Senat Fakultas dan unit penjaminan mutu. Kegiatan akademik sehari-hari dikoordinasikan ' +
          'oleh ketua program studi di lingkungan fakultas.',
        heroImageUrl,
      },
      update: {
        ...(profileExisting?.overview?.trim()
          ? {}
          : { overview: buildFacultyOverview(name, universitas) }),
        ...(profileExisting?.heroImageUrl?.trim() ? {} : { heroImageUrl }),
      },
    });

    // ------------------------------------------------------------------
    // 4. Visi & Misi
    // ------------------------------------------------------------------
    const visionExisting = await prisma.visionMission.findUnique({
      where: { facultyId: faculty.id },
    });

    const vision =
      `Menjadi fakultas yang unggul dan terpercaya dalam pengembangan ilmu pengetahuan, teknologi, ` +
      `dan pembentukan karakter islami di tingkat nasional pada tahun 2035.`;
    const missions = buildFacultyMissions(name).join('\n');

    await prisma.visionMission.upsert({
      where: { facultyId: faculty.id },
      create: {
        facultyId: faculty.id,
        vision,
        missions,
        objectives:
          'Meningkatkan mutu penyelenggaraan pendidikan, menguatkan budaya riset, dan memperluas kontribusi ' +
          'fakultas bagi masyarakat.',
        strategicGoals:
          'Akreditasi program studi unggul, peningkatan kualifikasi dan kompetensi dosen, serta penguatan ' +
          'kerja sama tri dharma perguruan tinggi.',
      },
      update: {
        ...(visionExisting?.vision?.trim() ? {} : { vision }),
        ...(visionExisting?.missions?.trim() ? {} : { missions }),
      },
    });

    // ------------------------------------------------------------------
    // 5. Kontak fakultas
    // ------------------------------------------------------------------
    const contactExisting = await prisma.contactInfo.findUnique({
      where: { facultyId: faculty.id },
    });

    const email = `${code.toLowerCase()}@unusu.ac.id`;

    await prisma.contactInfo.upsert({
      where: { facultyId: faculty.id },
      create: {
        facultyId: faculty.id,
        address:
          'Gedung Fakultas, Kampus Universitas Nahdlatul Ulama Sumatera Utara, ' +
          'Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan',
        email,
        phone: '(061) 8451234',
        whatsapp: '081260001926',
        instagramUrl: 'https://instagram.com/unusu_official',
      },
      update: {
        ...(contactExisting?.email?.trim() ? {} : { email }),
      },
    });

    // ------------------------------------------------------------------
    // 6. Domain resmi fakultas
    // ------------------------------------------------------------------
    if (hostname) {
      const domainExisting = await prisma.domain.findUnique({ where: { hostname } });

      if (domainExisting && domainExisting.facultyId !== faculty.id) {
        console.warn(
          `  ! Domain ${hostname} sudah dipakai tenant lain (facultyId=${domainExisting.facultyId}). Dilewati.`,
        );
      } else {
        await prisma.domain.upsert({
          where: { hostname },
          create: {
            facultyId: faculty.id,
            hostname,
            isPrimary: true,
            isActive: true,
          },
          update: { facultyId: faculty.id, isActive: true },
        });
      }
    }

    // ------------------------------------------------------------------
    // 7. Menu website fakultas (bertingkat: grup + anak)
    // ------------------------------------------------------------------
    /*
     * Navbar membaca `parentId`, jadi grup harus berupa baris menu sungguhan
     * yang menjadi induk dari anggotanya. Sebelumnya menu fakultas disemai datar
     * dan navbar terpaksa memakai label cadangan "Tentang Prodi" — istilah yang
     * keliru untuk sebuah fakultas.
     *
     * Menu datar lama (mis. "Profil" tanpa induk) tidak dihapus agar konten yang
     * mungkin sudah disunting admin tidak hilang, tetapi dijadikan anak dari grup
     * yang sesuai. Baris "Profil" bertabrak dengan anak grup, sehingga dipakai
     * ulang baris yang sudah ada dan diberikan `parentId`.
     */
    for (const [index, grup] of FACULTY_MENUS.entries()) {
      const urutanGrup = index + 1;

      // ---- Induk / tautan utama ----
      let induk = await prisma.menu.findFirst({
        where: { facultyId: faculty.id, url: grup.url },
        orderBy: { id: 'asc' },
      });

      if (induk) {
        induk = await prisma.menu.update({
          where: { id: induk.id },
          data: {
            title: grup.title,
            sortOrder: urutanGrup,
            isRequired: grup.isRequired,
            isActive: true,
            // Grup tetap berada di akar navbar.
            parentId: null,
          },
        });
      } else {
        induk = await prisma.menu.create({
          data: {
            facultyId: faculty.id,
            title: grup.title,
            url: grup.url,
            sortOrder: urutanGrup,
            isRequired: grup.isRequired,
            isActive: true,
          },
        });
      }

      // ---- Anak (anggota dropdown) ----
      for (const [anakIndex, anak] of (grup.children ?? []).entries()) {
        const anakExisting = await prisma.menu.findFirst({
          where: { facultyId: faculty.id, url: anak.url },
          orderBy: { id: 'asc' },
        });

        if (anakExisting) {
          await prisma.menu.update({
            where: { id: anakExisting.id },
            data: {
              title: anak.title,
              parentId: induk.id,
              sortOrder: anakIndex + 1,
              isRequired: anak.isRequired,
              isActive: true,
            },
          });
        } else {
          await prisma.menu.create({
            data: {
              facultyId: faculty.id,
              parentId: induk.id,
              title: anak.title,
              url: anak.url,
              sortOrder: anakIndex + 1,
              isRequired: anak.isRequired,
              isActive: true,
            },
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // 8. Kategori & berita sambutan
    // ------------------------------------------------------------------
    // `post_categories` hanya punya unik (studyProgramId, slug); untuk fakultas
    // `studyProgramId` bernilai NULL, sehingga dipakai findFirst + create.
    let category = await prisma.postCategory.findFirst({
      where: { facultyId: faculty.id, slug: 'pengumuman' },
    });

    if (!category) {
      category = await prisma.postCategory.create({
        data: { facultyId: faculty.id, name: 'Pengumuman', slug: 'pengumuman' },
      });
    }

    const welcomeSlug = 'selamat-datang-di-website-fakultas';
    const postExisting = await prisma.post.findFirst({
      where: { facultyId: faculty.id, slug: welcomeSlug },
    });

    if (!postExisting) {
      await prisma.post.create({
        data: {
          facultyId: faculty.id,
          categoryId: category.id,
          title: `Selamat Datang di Website Resmi ${name}`,
          slug: welcomeSlug,
          excerpt:
            `Website resmi ${name} ${universitas} sebagai pusat informasi program studi, kegiatan ` +
            'akademik, dan layanan fakultas.',
          content:
            `<p>Selamat datang di portal resmi <strong>${name}</strong>, ${universitas}.</p>` +
            '<p>Melalui portal ini, pengunjung dapat menelusuri profil fakultas, visi dan misi, daftar ' +
            'program studi beserta tautan website masing-masing, informasi dosen, kegiatan, serta kontak ' +
            'sekretariat fakultas.</p>',
          status: 'published',
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }

    // ------------------------------------------------------------------
    // 9. Gambar kartu program studi di bawah fakultas
    // ------------------------------------------------------------------
    const gambarProdi = await seedProdiImages(faculty.id);

    console.log(
      `  + ${code.padEnd(9)} ${name.padEnd(28)} domain=${(hostname ?? '-').padEnd(24)} grup=${FACULTY_MENUS.length} item=${
        FACULTY_MENUS.reduce((n, g) => n + 1 + (g.children?.length ?? 0), 0)
      } gambar_prodi=${gambarProdi.diisi}`,
    );
  }

  console.log(`Berhasil mengisi konten default untuk ${count} fakultas.`);
}

// Jalankan hanya bila berkas ini dieksekusi langsung, bukan saat diimpor.
if (process.argv[1]?.includes('seed-faculty-content')) {
  seedFacultyContents()
    .catch((err) => {
      console.error('Gagal mengisi konten fakultas:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedFacultyContents, FACULTY_MENUS, HOSTNAME_BY_FACULTY };
