/**
 * Seeder Lengkap Page Builder, Navigasi Navbar & Full Page Multi-Prodi UNUSU.
 *
 * Mengisi:
 * 1. 10 Menu Navigasi Lengkap (Beranda, Profil, Visi-Misi, Kurikulum, Dosen, Sarpras, Berita, Galeri, Dokumen, Kontak)
 * 2. Halaman Beranda Full 6 Seksi & Widget (Hero Slider, Profil & Visi Misi, Akademik & Dosen, Galeri & Sarpras, Warta Berita, Kontak & Lokasi)
 * 3. Halaman-Halaman Khusus Page Builder Terbit (Profil & Sejarah, Kurikulum Unggulan, Dokumen & Akreditasi)
 * 4. Tema Identitas Warna per Fakultas
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Palet warna identitas per Fakultas di UNUSU
const FACULTY_PALETTES: Record<string, { primary: string; accent: string; secondary: string }> = {
  FIK: { primary: '#1e3a8a', accent: '#0284c7', secondary: '#0f172a' }, // Biru Komputer / Tech
  FIP: { primary: '#15803d', accent: '#eab308', secondary: '#14532d' }, // Hijau Pendidikan
  FE: { primary: '#b45309', accent: '#f59e0b', secondary: '#78350f' },  // Amber / Emas Ekonomi
  FAPERTA: { primary: '#166534', accent: '#84cc16', secondary: '#052e16' }, // Hijau Daun Pertanian
  FIKES: { primary: '#0f766e', accent: '#06b6d4', secondary: '#134e4a' }, // Teal / Toska Kesehatan
  FAI: { primary: '#1e3a8a', accent: '#fbbf24', secondary: '#0b1c46' },  // Biru UNUSU & Emas Nahdliyin
};

// 10 Menu navigasi standar universitas
const STANDARD_MENUS = [
  { title: 'Beranda', url: '/', sortOrder: 1, isRequired: true },
  { title: 'Profil', url: '/profil', sortOrder: 2, isRequired: true },
  { title: 'Visi & Misi', url: '/visi-misi', sortOrder: 3, isRequired: true },
  { title: 'Kurikulum', url: '/kurikulum', sortOrder: 4, isRequired: true },
  { title: 'Dosen Pengajar', url: '/dosen', sortOrder: 5, isRequired: true },
  { title: 'Sarana & Prasarana', url: '/sarana-prasarana', sortOrder: 6, isRequired: true },
  { title: 'Berita & Warta', url: '/berita', sortOrder: 7, isRequired: true },
  { title: 'Galeri Kegiatan', url: '/galeri', sortOrder: 8, isRequired: true },
  { title: 'Dokumen & Unduhan', url: '/dokumen', sortOrder: 9, isRequired: true },
  { title: 'Kontak & Lokasi', url: '/kontak', sortOrder: 10, isRequired: true },
];

export async function seedPageBuilderAndThemes() {
  console.log('Menyiapkan Navigasi Lengkap, Full Page Builder, dan Widget untuk 14 Program Studi...');

  const studyPrograms = await prisma.studyProgram.findMany({
    include: { faculty: true },
  });

  // Ambil widget master dari database
  const widgets = await prisma.widget.findMany();
  const widgetByCode = new Map(widgets.map((w) => [w.code, w]));

  for (const prodi of studyPrograms) {
    const code = prodi.code;
    const name = prodi.name;
    const facCode = prodi.faculty?.code || 'FIK';
    const facName = prodi.faculty?.name || 'Fakultas';
    const palette = FACULTY_PALETTES[facCode] || FACULTY_PALETTES.FAI;

    // =========================================================================
    // 1. TEMA VISUAL KHAS PRODI & WEBSITE SETTING LENGKAP DENGAN SEO
    // =========================================================================
    await prisma.theme.upsert({
      where: { studyProgramId: prodi.id },
      create: {
        studyProgramId: prodi.id,
        primaryColor: palette.primary,
        accentColor: palette.accent,
        secondaryColor: palette.secondary,
        backgroundColor: '#FFFFFF',
        foregroundColor: '#0f172a',
        fontHeading: 'Plus Jakarta Sans',
        fontBody: 'Plus Jakarta Sans',
        radius: '0.75rem',
        shadow: 'sm',
        buttonStyle: 'solid',
        headerLayout: 'modern',
        footerLayout: 'multi-column',
        containerWidth: '1280px',
      },
      update: {
        primaryColor: palette.primary,
        accentColor: palette.accent,
        secondaryColor: palette.secondary,
      },
    });

    // Seed SEO & Website Setting Komprehensif
    const seoTitleProdi = `Program Studi ${name} (${prodi.degree}) - UNUSU Medan`;
    const seoDescProdi = `Website Resmi Program Studi ${name} (${prodi.degree}), ${facName}, Universitas Nahdlatul Ulama Sumatera Utara. Pusat keunggulan tridharma perguruan tinggi berkarakter Aswaja.`;
    const seoKeysProdi = `${name}, ${code}, ${facName}, UNUSU, Universitas Nahdlatul Ulama Sumatera Utara, Medan, Kuliah Medan, Prodi ${name}`;
    const seoImageProdi = '/heroslider-full.png';

    await prisma.websiteSetting.upsert({
      where: { studyProgramId: prodi.id },
      create: {
        studyProgramId: prodi.id,
        siteTitle: `Program Studi ${name}`,
        siteTagline: `Unggul, Inovatif, dan Berkarakter Aswaja — ${facName} UNUSU`,
        univName: 'Universitas Nahdlatul Ulama Sumatera Utara',
        facultyName: facName,
        logoUrl: '/logo-unusu.jpg',
        faviconUrl: '/favicon.ico',
        seoTitle: seoTitleProdi,
        seoDescription: seoDescProdi,
        seoKeywords: seoKeysProdi,
        seoImageUrl: seoImageProdi,
        copyrightText: `© ${new Date().getFullYear()} Program Studi ${name} UNUSU. Hak Cipta Dilindungi.`,
      },
      update: {
        siteTitle: `Program Studi ${name}`,
        siteTagline: `Unggul, Inovatif, dan Berkarakter Aswaja — ${facName} UNUSU`,
        facultyName: facName,
        logoUrl: '/logo-unusu.jpg',
        faviconUrl: '/favicon.ico',
        seoTitle: seoTitleProdi,
        seoDescription: seoDescProdi,
        seoKeywords: seoKeysProdi,
        seoImageUrl: seoImageProdi,
        copyrightText: `© ${new Date().getFullYear()} Program Studi ${name} UNUSU. Hak Cipta Dilindungi.`,
      },
    });

    // =========================================================================
    // 2. NAVIGASI NAVBAR LENGKAP (10 Menu Standar)
    // =========================================================================
    for (const menu of STANDARD_MENUS) {
      const existing = await prisma.menu.findFirst({
        where: { studyProgramId: prodi.id, url: menu.url },
      });

      if (existing) {
        await prisma.menu.update({
          where: { id: existing.id },
          data: {
            title: menu.title,
            sortOrder: menu.sortOrder,
            isRequired: menu.isRequired,
            isActive: true,
          },
        });
      } else {
        await prisma.menu.create({
          data: {
            studyProgramId: prodi.id,
            title: menu.title,
            url: menu.url,
            sortOrder: menu.sortOrder,
            isRequired: menu.isRequired,
            isActive: true,
            target: '_self',
          },
        });
      }
    }

    // =========================================================================
    // 3. HALAMAN BERANDA (FULL SEKSI LENGKAP: 6 Seksi Merangkum Seluruh Navbar)
    // =========================================================================
    let beranda = await prisma.page.findFirst({
      where: { studyProgramId: prodi.id, slug: 'beranda' },
    });

    if (!beranda) {
      beranda = await prisma.page.create({
        data: {
          studyProgramId: prodi.id,
          slug: 'beranda',
          title: `Beranda Program Studi ${name}`,
          isSystem: true,
          isPublished: true,
          publishedAt: new Date(),
          seoTitle: `Program Studi ${name} - UNUSU`,
          seoDescription: `Website resmi Program Studi ${name}, ${facName}, Universitas Nahdlatul Ulama Sumatera Utara.`,
        },
      });
    } else {
      await prisma.page.update({
        where: { id: beranda.id },
        data: {
          isPublished: true,
          publishedAt: beranda.publishedAt || new Date(),
        },
      });
    }

    // Hapus seksi lama Beranda lalu bangun ulang agar urut dan lengkap
    await prisma.pageSection.deleteMany({
      where: { pageId: beranda.id },
    });

    // SEKSI 1: Hero Banner (Slider)
    const secHero = await prisma.pageSection.create({
      data: {
        pageId: beranda.id,
        title: 'Hero Banner',
        sectionKey: 'hero',
        sortOrder: 1,
        isActive: true,
      },
    });
    const heroWidget = widgetByCode.get('hero_slider');
    if (heroWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secHero.id,
          widgetId: heroWidget.id,
          variantCode: 'split',
          sortOrder: 1,
          isActive: true,
          configJson: JSON.stringify({
            title: `Program Studi ${name}`,
            subtitle: `${facName} — Universitas Nahdlatul Ulama Sumatera Utara`,
            ctaText: 'Pelajari Kurikulum',
            ctaUrl: '/kurikulum',
            secondaryCtaText: 'Profil Pengajar',
            secondaryCtaUrl: '/dosen',
            // Banner awal memakai gambar yang sama dengan Portal Utama, sebagai
            // isi sementara sebelum admin mengunggah banner khas prodi lewat
            // menu "Hero Slider" (/admin/portal).
            slides: [
              { imageUrl: '/hero-slide-split-1.png', alt: `Penerimaan Mahasiswa Baru — ${name}` },
              { imageUrl: '/hero-slide-split-2.png', alt: `Ekosistem Digital ${name} UNUSU` },
              { imageUrl: '/hero-slide-split-3.png', alt: `Kampus Inovatif dan Religius — ${name}` },
            ],
            autoplayMs: 6000,
            showDots: true,
          }),
        },
      });
    }

    // SEKSI 2: Tentang & Visi Misi
    const secAbout = await prisma.pageSection.create({
      data: {
        pageId: beranda.id,
        title: 'Tentang & Visi Misi',
        sectionKey: 'about',
        sortOrder: 2,
        isActive: true,
      },
    });
    const aboutWidget = widgetByCode.get('about_prodi');
    if (aboutWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secAbout.id,
          widgetId: aboutWidget.id,
          variantCode: 'image-right',
          sortOrder: 1,
          isActive: true,
          // Uraian dan gambar section Profil dibaca dari tabel `profile_contents`
          // (menu Profil Program Studi). Konfigurasi ini hanya menyimpan pilihan
          // tata letak serta gambar cadangan bila tabel prodi masih kosong.
          configJson: JSON.stringify({
            eyebrow: 'Profil Program Studi',
            imageUrl: '', // dikosongkan: gambar berasal dari profile_contents.heroImageUrl
            alignment: 'left',
          }),
        },
      });
    }
    const visionWidget = widgetByCode.get('vision_mission');
    if (visionWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secAbout.id,
          widgetId: visionWidget.id,
          variantCode: 'stacked',
          sortOrder: 2,
          isActive: true,
          // Visi & misi dibaca dari tabel `visions_missions` (menu Visi & Misi).
          // Kolom cadangan sengaja dikosongkan agar data resmi yang dipakai.
          configJson: JSON.stringify({
            vision: '',
            missions: [],
          }),
        },
      });
    }

    // SEKSI 3: Akademik & Pengajar (Kurikulum & Dosen)
    const secAkademik = await prisma.pageSection.create({
      data: {
        pageId: beranda.id,
        title: 'Akademik & Pengajar',
        sectionKey: 'academic',
        sortOrder: 3,
        isActive: true,
      },
    });
    const currWidget = widgetByCode.get('curriculum_overview');
    if (currWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secAkademik.id,
          widgetId: currWidget.id,
          variantCode: 'summary',
          sortOrder: 1,
          isActive: true,
          configJson: JSON.stringify({
            title: 'Struktur Kurikulum Merdeka & OBE',
            limit: 6,
          }),
        },
      });
    }
    const lecturerWidget = widgetByCode.get('lecturer_list');
    if (lecturerWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secAkademik.id,
          widgetId: lecturerWidget.id,
          variantCode: 'card-grid',
          sortOrder: 2,
          isActive: true,
          configJson: JSON.stringify({
            title: 'Dosen Pembina & Pengajar Ahli',
            limit: 4,
          }),
        },
      });
    }

    // SEKSI 4: Fasilitas & Galeri Kegiatan
    const secGaleri = await prisma.pageSection.create({
      data: {
        pageId: beranda.id,
        title: 'Fasilitas & Dokumentasi',
        sectionKey: 'facilities',
        sortOrder: 4,
        isActive: true,
      },
    });
    const facilityWidget = widgetByCode.get('facility_grid');
    if (facilityWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secGaleri.id,
          widgetId: facilityWidget.id,
          variantCode: 'grid',
          sortOrder: 1,
          isActive: true,
          configJson: JSON.stringify({
            title: 'Fasilitas Penunjang Pembelajaran',
            limit: 4,
          }),
        },
      });
    }
    const galleryWidget = widgetByCode.get('gallery_grid');
    if (galleryWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secGaleri.id,
          widgetId: galleryWidget.id,
          variantCode: 'grid',
          sortOrder: 2,
          isActive: true,
          configJson: JSON.stringify({
            title: 'Galeri Aktivitas Mahasiswa',
            limit: 6,
          }),
        },
      });
    }

    // SEKSI 5: Informasi & Warta Berita Terkini
    const secNews = await prisma.pageSection.create({
      data: {
        pageId: beranda.id,
        title: 'Informasi & Warta Berita',
        sectionKey: 'news',
        sortOrder: 5,
        isActive: true,
      },
    });
    const newsWidget = widgetByCode.get('latest_news');
    if (newsWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secNews.id,
          widgetId: newsWidget.id,
          variantCode: 'featured',
          sortOrder: 1,
          isActive: true,
          configJson: JSON.stringify({
            title: `Warta & Pengumuman ${name}`,
            limit: 3,
          }),
        },
      });
    }
    const docWidget = widgetByCode.get('document_list');
    if (docWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secNews.id,
          widgetId: docWidget.id,
          variantCode: 'list',
          sortOrder: 2,
          isActive: true,
          configJson: JSON.stringify({
            title: 'Unduhan Pedoman Akademik & Dokumen Mutu',
            limit: 4,
          }),
        },
      });
    }

    // SEKSI 6: Kontak & Lokasi Kampus
    const secContact = await prisma.pageSection.create({
      data: {
        pageId: beranda.id,
        title: 'Kontak & Sekretariat',
        sectionKey: 'contact',
        sortOrder: 6,
        isActive: true,
      },
    });
    const contactWidget = widgetByCode.get('contact_information');
    if (contactWidget) {
      await prisma.sectionWidget.create({
        data: {
          pageSectionId: secContact.id,
          widgetId: contactWidget.id,
          variantCode: 'split',
          sortOrder: 1,
          isActive: true,
          configJson: JSON.stringify({
            title: `Sekretariat Program Studi ${name}`,
          }),
        },
      });
    }

    // Snapshot versi publikasi beranda (Upsert atau hapus versi lama untuk idempoten)
    const existingVer = await prisma.pageVersion.findFirst({
      where: { pageId: beranda.id, version: 1 },
    });

    if (existingVer) {
      await prisma.pageVersion.update({
        where: { id: existingVer.id },
        data: {
          status: 'published',
          snapshot: JSON.stringify({
            title: beranda.title,
            publishedAt: new Date(),
            totalSections: 6,
            theme: palette,
          }),
          note: 'Publikasi Otomatis Full Page Beranda (Update)',
        },
      });
    } else {
      await prisma.pageVersion.create({
        data: {
          pageId: beranda.id,
          version: 1,
          status: 'published',
          snapshot: JSON.stringify({
            title: beranda.title,
            publishedAt: new Date(),
            totalSections: 6,
            theme: palette,
          }),
          note: 'Publikasi Otomatis Full Page Beranda',
        },
      });
    }

    // =========================================================================
    // 4. SELURUH HALAMAN NAVIGASI DISEDIAKAN LENGKAP PADA PAGE BUILDER
    // =========================================================================
    // Menjadikan seluruh menu navigasi hadir sebagai Page mandiri pada Page Builder
    // sehingga Admin Prodi dapat mengelola seksi & widget untuk setiap halaman navbar.
    const allNavbarPages = [
      {
        slug: 'profil',
        title: 'Profil Program Studi',
        isSystem: true,
        seoTitle: `Profil Program Studi ${name} - UNUSU`,
        seoDescription: `Profil lengkap, sejarah, dan keunggulan Program Studi ${name} Fakultas ${facName} Universitas Nahdlatul Ulama Sumatera Utara.`,
        sectionTitle: 'Profil & Identitas Keilmuan',
        widget: 'about_prodi',
        // Uraian dibaca dari tabel profile_contents (menu Profil Program Studi).
        widgetConfig: {
          eyebrow: 'Profil Program Studi',
          imageUrl: '',
          alignment: 'left',
        },
      },
      {
        slug: 'visi-misi',
        title: 'Visi & Misi',
        isSystem: true,
        seoTitle: `Visi dan Misi Program Studi ${name} - UNUSU`,
        seoDescription: `Visi, misi, dan sasaran strategis Program Studi ${name} Universitas Nahdlatul Ulama Sumatera Utara.`,
        sectionTitle: 'Visi & Misi Utama',
        widget: 'vision_mission',
        // Visi & misi dibaca dari tabel visions_missions (menu Visi & Misi Program Studi).
        widgetConfig: {
          vision: '',
          missions: [],
        },
      },
      {
        slug: 'kurikulum',
        title: 'Kurikulum Pembelajaran',
        isSystem: true,
        seoTitle: `Kurikulum Program Studi ${name} - UNUSU`,
        seoDescription: `Struktur kurikulum, sebaran mata kuliah OBE, dan profil lulusan Program Studi ${name} UNUSU.`,
        sectionTitle: 'Daftar Kurikulum & Matakuliah',
        widget: 'curriculum_overview',
        widgetConfig: {
          title: `Struktur Kurikulum Program Studi ${name}`,
          limit: 12,
        },
      },
      {
        slug: 'dosen',
        title: 'Dosen Pengajar',
        isSystem: true,
        seoTitle: `Dosen Pengajar Program Studi ${name} - UNUSU`,
        seoDescription: `Direktori dosen pengajar, pakar bidang ilmu, dan profil staf pengajar Program Studi ${name} UNUSU.`,
        sectionTitle: 'Dosen Pembina & Pengajar',
        widget: 'lecturer_list',
        widgetConfig: {
          title: `Dosen Pengajar ${name}`,
          limit: 8,
        },
      },
      {
        slug: 'sarana-prasarana',
        title: 'Sarana & Prasarana',
        isSystem: true,
        seoTitle: `Sarana dan Prasarana Program Studi ${name} - UNUSU`,
        seoDescription: `Fasilitas ruang perkuliahan, laboratorium riset, dan sarana pembelajaran Program Studi ${name} UNUSU.`,
        sectionTitle: 'Fasilitas & Sarpras Pembelajaran',
        widget: 'facility_grid',
        widgetConfig: {
          title: `Fasilitas Laboratorium & Ruang Belajar ${name}`,
          limit: 6,
        },
      },
      {
        slug: 'berita',
        title: 'Berita & Pengumuman',
        isSystem: true,
        seoTitle: `Berita & Warta Program Studi ${name} - UNUSU`,
        seoDescription: `Warta kegiatan, seminar, prestasi, dan pengumuman akademik terbaru Program Studi ${name} UNUSU.`,
        sectionTitle: 'Kabar & Pengumuman Terbaru',
        widget: 'latest_news',
        widgetConfig: {
          title: `Kabar Terkini ${name}`,
          limit: 6,
        },
      },
      {
        slug: 'galeri',
        title: 'Galeri Kegiatan',
        isSystem: true,
        seoTitle: `Galeri Dokumentasi Program Studi ${name} - UNUSU`,
        seoDescription: `Dokumentasi foto dan video kegiatan kemahasiswaan, kuliah umum, dan pengabdian Program Studi ${name} UNUSU.`,
        sectionTitle: 'Dokumentasi & Galeri Foto',
        widget: 'gallery_grid',
        widgetConfig: {
          title: `Dokumentasi Kegiatan Mahasiswa ${name}`,
          limit: 8,
        },
      },
      {
        slug: 'dokumen',
        title: 'Dokumen & Unduhan',
        isSystem: true,
        seoTitle: `Dokumen & Unduhan Program Studi ${name} - UNUSU`,
        seoDescription: `Pusat unduhan pedoman akademik, panduan skripsi, silabus, dan dokumen mutu Program Studi ${name} UNUSU.`,
        sectionTitle: 'Pusat Unduhan Pedoman & Dokumen',
        widget: 'document_list',
        widgetConfig: {
          title: `Unduhan Dokumen Akademik ${name}`,
          limit: 6,
        },
      },
      {
        slug: 'kontak',
        title: 'Kontak & Sekretariat',
        isSystem: true,
        seoTitle: `Kontak & Lokasi Program Studi ${name} - UNUSU`,
        seoDescription: `Alamat kantor sekretariat, surel, nomor telepon, dan jam layanan Program Studi ${name} UNUSU.`,
        sectionTitle: 'Sekretariat & Informasi Layanan',
        widget: 'contact_information',
        widgetConfig: {
          title: `Sekretariat Program Studi ${name}`,
        },
      },
      {
        slug: 'sejarah-dan-profil',
        title: 'Sejarah & Perkembangan',
        isSystem: false,
        seoTitle: `Sejarah Program Studi ${name} - UNUSU`,
        seoDescription: `Riwayat pendirian dan perkembangan Program Studi ${name} Universitas Nahdlatul Ulama Sumatera Utara.`,
        sectionTitle: 'Sejarah & Rekam Jejak',
        widget: 'about_prodi',
        widgetConfig: {
          eyebrow: 'Mengenal Lebih Dekat',
          imageUrl: '',
          alignment: 'left',
        },
      },
      {
        slug: 'akreditasi-dan-capaian',
        title: 'Akreditasi & Prestasi',
        isSystem: false,
        seoTitle: `Akreditasi Program Studi ${name} - UNUSU`,
        seoDescription: `Status akreditasi resmi BAN-PT/LAM dan deretan prestasi civitas akademika ${name} UNUSU.`,
        sectionTitle: 'Status Akreditasi & Capaian Unggul',
        widget: 'about_prodi',
        widgetConfig: {
          eyebrow: 'Jaminan Mutu & Prestasi',
          title: `Capaian Akreditasi & Prestasi Mahasiswa ${name}`,
          body: `<p>Program Studi ${name} senantiasa menjaga standar mutu pendidikan tinggi melalui pemenuhan instrumen akreditasi nasional dan keikutsertaan aktif mahasiswa dalam berbagai kompetisi keilmuan.</p>`,
          imageUrl: '/rektorat-unusu.jpg',
          alignment: 'right',
        },
      },
    ];

    for (const np of allNavbarPages) {
      let pageRecord = await prisma.page.findFirst({
        where: { studyProgramId: prodi.id, slug: np.slug },
      });

      if (!pageRecord) {
        pageRecord = await prisma.page.create({
          data: {
            studyProgramId: prodi.id,
            slug: np.slug,
            title: np.title,
            layout: 'default',
            isSystem: np.isSystem,
            isPublished: true,
            publishedAt: new Date(),
            seoTitle: np.seoTitle,
            seoDescription: np.seoDescription,
          },
        });
      } else {
        await prisma.page.update({
          where: { id: pageRecord.id },
          data: {
            title: np.title,
            isPublished: true,
            publishedAt: pageRecord.publishedAt || new Date(),
            seoTitle: np.seoTitle,
            seoDescription: np.seoDescription,
          },
        });
      }

      // Pastikan ada section dan widget awal di setiap halaman jika belum ada
      const existingSections = await prisma.pageSection.count({
        where: { pageId: pageRecord.id },
      });

      if (existingSections === 0) {
        const customSec = await prisma.pageSection.create({
          data: {
            pageId: pageRecord.id,
            title: np.sectionTitle,
            sectionKey: 'main-content',
            sortOrder: 1,
            isActive: true,
          },
        });

        const targetWidget = widgetByCode.get(np.widget);
        if (targetWidget) {
          await prisma.sectionWidget.create({
            data: {
              pageSectionId: customSec.id,
              widgetId: targetWidget.id,
              variantCode: 'default',
              sortOrder: 1,
              isActive: true,
              configJson: JSON.stringify(np.widgetConfig),
            },
          });
        }

        // Publikasikan versi awal halaman
        await prisma.pageVersion.create({
          data: {
            pageId: pageRecord.id,
            version: 1,
            status: 'published',
            snapshot: JSON.stringify({
              title: pageRecord.title,
              publishedAt: new Date(),
              theme: palette,
            }),
            note: `Inisialisasi Seeder Halaman ${np.title}`,
          },
        });
      }
    }
  }

  console.log(`SUKSES: Seluruh 14 Program Studi telah dilengkapi 10 Menu Navigasi, Beranda Full 6 Seksi, dan Custom Page Builder.`);
}

if (process.argv[1]?.includes('seed-page-builder')) {
  seedPageBuilderAndThemes()
    .catch((err) => {
      console.error('Gagal menjalankan seeder page builder:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
