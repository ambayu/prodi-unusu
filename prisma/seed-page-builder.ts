/**
 * Seeder Idempotent untuk Setup Halaman Page Builder, Sections, Widgets, & Tema Khas 14 Prodi UNUSU.
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

export async function seedPageBuilderAndThemes() {
  console.log('Menyiapkan Page Builder, Halaman Beranda, Widget, dan Tema untuk 14 Program Studi...');

  const studyPrograms = await prisma.studyProgram.findMany({
    include: { faculty: true },
  });

  // Ambil widget master
  const widgets = await prisma.widget.findMany();
  const widgetByCode = new Map(widgets.map((w) => [w.code, w]));

  let count = 0;

  for (const prodi of studyPrograms) {
    count++;
    const code = prodi.code;
    const name = prodi.name;
    const facCode = prodi.faculty?.code || 'FIK';
    const facName = prodi.faculty?.name || 'Fakultas';
    const palette = FACULTY_PALETTES[facCode] || FACULTY_PALETTES.FAI;

    // 1. Setup Tema Visual Khas Prodi
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

    // 2. Setup Halaman Beranda
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

    // 3. Setup Sections & Widgets pada Halaman Beranda jika masih kosong
    const existingSections = await prisma.pageSection.findMany({
      where: { pageId: beranda.id },
    });

    if (existingSections.length === 0) {
      // Seksi 1: Hero Banner
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
            }),
          },
        });
      }

      // Seksi 2: Sekilas Profil & Visi Misi
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
            configJson: JSON.stringify({
              eyebrow: 'Profil Program Studi',
              title: `Unggul & Profesional di Bidang ${name}`,
              body: `Program Studi ${name} UNUSU membekali mahasiswa dengan penguasaan keilmuan mutakhir dan etika profesional berlandaskan nilai-nilai Ahlussunnah wal Jama'ah.`,
              imageUrl: '/assets/campus-login.png',
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
            configJson: JSON.stringify({
              vision: `Menjadi Program Studi ${name} yang unggul, inovatif, dan berdaya saing nasional pada tahun 2030.`,
              missions: [
                `Menyelenggarakan pendidikan sarjana berkualitas berbasis kompetensi industri dan akhlak mulia.`,
                `Mengembangkan riset terapan dan publikasi ilmiah yang relevan dengan perkembangan zaman.`,
                `Melaksanakan pengabdian masyarakat guna penguatan kemandirian umat.`,
              ],
            }),
          },
        });
      }

      // Seksi 3: Ringkasan Kurikulum & Dosen
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
              title: 'Struktur Kurikulum',
              description: 'Kurikulum berbasis OBE (Outcome-Based Education) dengan total 144 SKS.',
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
              title: 'Dosen Pembina & Pengajar',
              limit: 6,
            }),
          },
        });
      }

      // Seksi 4: Berita & Warta Terbaru
      const secNews = await prisma.pageSection.create({
        data: {
          pageId: beranda.id,
          title: 'Warta Kegiatan',
          sectionKey: 'news',
          sortOrder: 4,
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
              title: `Kabar Terkini ${name}`,
              limit: 3,
            }),
          },
        });
      }
    }

    // 4. Buat snapshot versi publikasi pada PageVersion jika belum ada
    const existingVersion = await prisma.pageVersion.findFirst({
      where: { pageId: beranda.id, status: 'published' },
    });

    if (!existingVersion) {
      await prisma.pageVersion.create({
        data: {
          pageId: beranda.id,
          version: 1,
          status: 'published',
          snapshot: JSON.stringify({
            title: beranda.title,
            publishedAt: new Date(),
            theme: palette,
          }),
          note: 'Publikasi Awal Seeder Otomatis',
        },
      });
    }
  }

  console.log(`Selesai: 14 Program Studi telah dilengkapi Tema Khas, Halaman Beranda, Seksi, dan Widget.`);
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
