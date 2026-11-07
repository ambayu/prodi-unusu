import { prisma } from '../prisma.js';

export interface CurriculumSummary {
  totalSemesters: number;
  totalCourses: number;
  totalCredits: number;
  totalRps: number;
}

/** Kurikulum aktif tenant dengan semester dan mata kuliahnya, terurut. */
export async function listPublicCurriculum(studyProgramId: number) {
  return prisma.curriculum.findMany({
    where: { studyProgramId, isActive: true },
    orderBy: [{ year: 'desc' }, { id: 'desc' }],
    include: {
      semesters: {
        orderBy: { semesterNumber: 'asc' },
        include: {
          courses: {
            orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
            include: {
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
}

type CurriculumWithSemesters = Awaited<ReturnType<typeof listPublicCurriculum>>;

/**
 * Menghitung statistik akademik dari database.
 *
 * Angka pada docs/PRD.md bagian 8.4 (66 mata kuliah, 148 SKS) adalah contoh
 * referensi, bukan nilai yang ditulis ke kode. Semua angka di sini dihitung
 * dari record yang benar-benar ada.
 */
export function buildCurriculumSummary(curriculums: CurriculumWithSemesters): CurriculumSummary {
  let totalSemesters = 0;
  let totalCourses = 0;
  let totalCredits = 0;
  let totalRps = 0;

  for (const curriculum of curriculums) {
    totalSemesters += curriculum.semesters.length;
    for (const semester of curriculum.semesters) {
      totalCourses += semester.courses.length;
      for (const course of semester.courses) {
        totalCredits += course.credits;
        totalRps += course.rpsDocuments.length;
      }
    }
  }

  return { totalSemesters, totalCourses, totalCredits, totalRps };
}

/** Memastikan sebuah semester berada di bawah tenant yang sedang dikelola. */
export async function findSemesterInTenant(semesterId: number, studyProgramId: number) {
  return prisma.curriculumSemester.findFirst({
    where: { id: semesterId, curriculum: { studyProgramId } },
    include: { curriculum: { select: { id: true, studyProgramId: true } } },
  });
}

/** Memastikan sebuah mata kuliah berada di bawah tenant yang sedang dikelola. */
export async function findCourseInTenant(courseId: number, studyProgramId: number) {
  return prisma.curriculumCourse.findFirst({
    where: { id: courseId, semester: { curriculum: { studyProgramId } } },
    include: {
      semester: { include: { curriculum: { select: { id: true, studyProgramId: true } } } },
    },
  });
}
