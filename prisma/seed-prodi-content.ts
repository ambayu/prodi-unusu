/**
 * Seeder Idempotent untuk data konten awal 14 Program Studi UNUSU.
 * Mengisi konten dasar: Visi & Misi, Profil, Berita Contoh, Dosen, Sarpras, dan Kontak.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProdiContents() {
  console.log('Mengisi data konten untuk seluruh Program Studi UNUSU...');
  const studyPrograms = await prisma.studyProgram.findMany({
    include: { faculty: true },
  });

  let count = 0;

  for (const prodi of studyPrograms) {
    count++;
    const code = prodi.code;
    const name = prodi.name;
    const facultyName = prodi.faculty?.name || 'Universitas Nahdlatul Ulama Sumatera Utara';

    // 1. Profil & Gambaran Umum
    await prisma.profileContent.upsert({
      where: { studyProgramId: prodi.id },
      create: {
        studyProgramId: prodi.id,
        overview: `Program Studi ${name} berada di bawah naungan ${facultyName}, berkomitmen menyelenggarakan pendidikan tinggi berbasis Ahlussunnah wal Jama'ah An-Nahdliyah dengan integrasi keilmuan modern dan nilai-nilai keislaman.`,
        history: `Program Studi ${name} didirikan guna menjawab tantangan kebutuhan sumber daya manusia profesional dan berintegritas di tingkat regional Sumatera Utara dan nasional.`,
        objectives: `Menghasilkan lulusan yang kompeten, berdaya saing global, berakhlak mulia, serta mampu berkontribusi aktif dalam pengembangan ilmu pengetahuan dan pengabdian masyarakat.`,
        targets: `Peningkatan akreditasi unggul, publikasi ilmiah bereputasi, serta keterserapan alumni di dunia kerja dalam waktu kurang dari 6 bulan pascakelulusan.`,
      },
      update: {
        overview: `Program Studi ${name} berada di bawah naungan ${facultyName}, berkomitmen menyelenggarakan pendidikan tinggi berbasis Ahlussunnah wal Jama'ah An-Nahdliyah dengan integrasi keilmuan modern dan nilai-nilai keislaman.`,
      },
    });

    // 2. Visi & Misi
    await prisma.visionMission.upsert({
      where: { studyProgramId: prodi.id },
      create: {
        studyProgramId: prodi.id,
        vision: `Menjadi Program Studi ${name} yang unggul, inovatif, dan berdaya saing nasional berlandaskan nilai-nilai Ahlussunnah wal Jama'ah An-Nahdliyah pada tahun 2030.`,
        missions: JSON.stringify([
          `Menyelenggarakan pendidikan dan pembelajaran berkualitas dalam bidang ${name}.`,
          `Melaksanakan penelitian terapan dan inovatif yang bermanfaat bagi masyarakat dan industri.`,
          `Mengembangkan program pengabdian kepada masyarakat yang responsif terhadap kebutuhan umat dan bangsa.`,
          `Menjalin kemitraan strategis dengan institusi akademik, dunia usaha, dan instansi pemerintah.`,
        ]),
        objectives: `Membentuk sarjana yang berintegritas tinggi, berjiwa kewirausahaan, dan menguasai keahlian praktis sesuai standar profesi.`,
      },
      update: {
        vision: `Menjadi Program Studi ${name} yang unggul, inovatif, dan berdaya saing nasional berlandaskan nilai-nilai Ahlussunnah wal Jama'ah An-Nahdliyah pada tahun 2030.`,
      },
    });

    // 3. Kontak Info
    await prisma.contactInfo.upsert({
      where: { studyProgramId: prodi.id },
      create: {
        studyProgramId: prodi.id,
        address: 'Jl. Gaperta Ujung No. 123, Helvetia, Medan, Sumatera Utara',
        email: `${code.toLowerCase()}@unusu.ac.id`,
        phone: '(061) 8451234',
        whatsapp: '081260001926',
        instagramUrl: 'https://instagram.com/unusu_official',
      },
      update: {
        email: `${code.toLowerCase()}@unusu.ac.id`,
      },
    });

    // 4. Kategori Berita Dasar
    const catAkademik = await prisma.postCategory.upsert({
      where: { studyProgramId_slug: { studyProgramId: prodi.id, slug: 'akademik' } },
      create: { studyProgramId: prodi.id, name: 'Akademik', slug: 'akademik' },
      update: {},
    });

    await prisma.postCategory.upsert({
      where: { studyProgramId_slug: { studyProgramId: prodi.id, slug: 'kegiatan' } },
      create: { studyProgramId: prodi.id, name: 'Kegiatan & Event', slug: 'kegiatan' },
      update: {},
    });

    // 5. Berita Selamat Datang / Contoh
    await prisma.post.upsert({
      where: {
        post_tenant_slug_unique: {
          studyProgramId: prodi.id,
          slug: 'selamat-datang-di-website-resmi',
        },
      },
      create: {
        studyProgramId: prodi.id,
        categoryId: catAkademik.id,
        title: `Selamat Datang di Website Resmi Program Studi ${name} UNUSU`,
        slug: 'selamat-datang-di-website-resmi',
        excerpt: `Website resmi Program Studi ${name} Universitas Nahdlatul Ulama Sumatera Utara sebagai portal informasi akademik, riset, dan kegiatan civitas akademika.`,
        content: `<p>Selamat datang di portal resmi Program Studi <strong>${name}</strong>, Fakultas ${facultyName}, Universitas Nahdlatul Ulama Sumatera Utara.</p><p>Portal ini dihadirkan untuk memberikan kemudahan akses informasi terkait kurikulum, profil pengajar, kegiatan kemahasiswaan, fasilitas sarana-prasarana, serta pencapaian tri dharma perguruan tinggi.</p>`,
        status: 'published',
        isPublished: true,
        publishedAt: new Date(),
      },
      update: {
        title: `Selamat Datang di Website Resmi Program Studi ${name} UNUSU`,
        isPublished: true,
      },
    });

    // 6. Sarana & Prasarana Dasar
    const existingLab = await prisma.facility.findFirst({
      where: { studyProgramId: prodi.id, name: `Laboratorium Praktik ${code}` },
    });
    if (!existingLab) {
      await prisma.facility.create({
        data: {
          studyProgramId: prodi.id,
          name: `Laboratorium Praktik ${code}`,
          category: 'Laboratorium',
          location: 'Gedung B Lt. 2 Kampus Terpadu UNUSU',
          description: `Fasilitas ruang praktikum dan simulasi komprehensif bagi mahasiswa Program Studi ${name}.`,
          status: 'aktif',
          sortOrder: 1,
        },
      });
    }

    // 7. Dosen / Staf Pengajar Contoh
    const existingKaprodi = await prisma.lecturer.findFirst({
      where: { studyProgramId: prodi.id, academicRank: 'Ketua Program Studi' },
    });
    if (!existingKaprodi) {
      await prisma.lecturer.create({
        data: {
          studyProgramId: prodi.id,
          name: `Dosen Pembina ${name}, M.Kom.`,
          nidn: `01${String(prodi.id).padStart(2, '0')}019001`,
          academicRank: 'Ketua Program Studi',
          education: 'S2 Magister Terkait',
          expertise: `Keilmuan Bidang ${name}`,
          email: `kaprodi.${code.toLowerCase()}@unusu.ac.id`,
          bio: `Ketua Program Studi ${name} Universitas Nahdlatul Ulama Sumatera Utara.`,
          isActive: true,
          sortOrder: 1,
        },
      });
    }
  }

  console.log(`Berhasil mengisi konten default untuk ${count} Program Studi.`);
}

if (process.argv[1]?.includes('seed-prodi-content')) {
  seedProdiContents()
    .catch((err) => {
      console.error('Gagal mengisi konten prodi:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
