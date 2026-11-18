/**
 * Seeder Master Semester Akademik (Academic Semesters) UNUSU.
 *
 * Menyiapkan master semester per semester (Semester 1 s/d 8 2026),
 * bukan sekadar periode Ganjil/Genap.
 */
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

const prisma = new PrismaClient();

const MASTER_SEMESTERS = [
  {
    code: 'SMT-1-2026',
    name: 'Semester-1-2026',
    startDate: new Date('2026-09-01'),
    endDate: new Date('2027-01-31'),
    isActive: true,
  },
  {
    code: 'SMT-2-2026',
    name: 'Semester-2-2026',
    startDate: new Date('2027-02-01'),
    endDate: new Date('2027-06-30'),
    isActive: false,
  },
  {
    code: 'SMT-3-2026',
    name: 'Semester-3-2026',
    startDate: new Date('2027-09-01'),
    endDate: new Date('2028-01-31'),
    isActive: false,
  },
  {
    code: 'SMT-4-2026',
    name: 'Semester-4-2026',
    startDate: new Date('2028-02-01'),
    endDate: new Date('2028-06-30'),
    isActive: false,
  },
  {
    code: 'SMT-5-2026',
    name: 'Semester-5-2026',
    startDate: new Date('2028-09-01'),
    endDate: new Date('2029-01-31'),
    isActive: false,
  },
  {
    code: 'SMT-6-2026',
    name: 'Semester-6-2026',
    startDate: new Date('2029-02-01'),
    endDate: new Date('2029-06-30'),
    isActive: false,
  },
  {
    code: 'SMT-7-2026',
    name: 'Semester-7-2026',
    startDate: new Date('2029-09-01'),
    endDate: new Date('2030-01-31'),
    isActive: false,
  },
  {
    code: 'SMT-8-2026',
    name: 'Semester-8-2026',
    startDate: new Date('2030-02-01'),
    endDate: new Date('2030-06-30'),
    isActive: false,
  },
];

export async function seedAcademicSemesters() {
  console.log('Menyemai Master Semester Akademik (Semester 1 s/d 8 2026)...');

  for (const item of MASTER_SEMESTERS) {
    await prisma.academicSemester.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
        isActive: item.isActive,
      },
      create: item,
    });
  }

  // Update semester aktif lama (misal: '2025/2026 Ganjil') agar bermigrasi ke 'Semester 1 2026'
  const targetAktif = await prisma.academicSemester.findUnique({
    where: { code: 'SMT-1-2026' },
  });

  if (targetAktif) {
    // Cari semester lama yang namanya mengandung '2025/2026 Ganjil' atau '2024-2025'
    const lamaSemua = await prisma.academicSemester.findMany({
      where: {
        OR: [
          { name: { contains: 'Ganjil' } },
          { name: { contains: 'Genap' } },
          { code: { contains: 'GANJIL' } },
          { code: { contains: 'GENAP' } },
        ],
      },
    });

    for (const lama of lamaSemua) {
      await prisma.curriculumItem.updateMany({
        where: { academicSemesterId: lama.id },
        data: { academicSemesterId: targetAktif.id },
      });
      await prisma.curriculumCourse.updateMany({
        where: { academicSemesterId: lama.id },
        data: { academicSemesterId: targetAktif.id },
      });
      // Hapus atau nonaktifkan semester lama
      try {
        await prisma.academicSemester.delete({ where: { id: lama.id } });
      } catch {
        await prisma.academicSemester.update({
          where: { id: lama.id },
          data: { isActive: false, name: `Arsip (${lama.name})` },
        });
      }
    }
  }

  console.log('SUKSES: Master Semester-1-2026 s/d Semester-8-2026 berhasil disemai.');
}

/*
 * Skrip dapat dijalankan langsung (`npx tsx prisma/seed-academic-semesters.ts`)
 * maupun diimpor oleh `seed.ts`; eksekusi otomatis di bawah hanya berlaku untuk
 * jalur langsung agar seeder utama tidak menyemai dua kali.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAcademicSemesters()
    .catch((err) => {
      console.error('Gagal menyemai master semester:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
