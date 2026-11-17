import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const allC = await prisma.curriculum.findMany({
    include: {
      studyProgram: true,
      semesters: {
        include: { courses: true }
      }
    }
  });
  console.log('Semua kurikulum:', allC.map(c => ({
    id: c.id,
    prodi: c.studyProgram.code,
    name: c.name,
    semesters: c.semesters.map(s => ({
      num: s.semesterNumber,
      coursesCount: s.courses.length
    }))
  })));
}
main().finally(() => prisma.$disconnect());
