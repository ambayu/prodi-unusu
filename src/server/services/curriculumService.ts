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
      /*
       * Sejak ADR-006 mata kuliah yang ditawarkan pada kurikulum disimpan di
       * `curriculum_items` — menautkan master `courses` dengan detail penawaran.
       * Halaman publik membaca keduanya: `items` untuk data baru, `semesters`
       * untuk data warisan yang belum dimigrasikan.
       */
      items: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          course: { select: { id: true, code: true, name: true } },
          academicSemester: { select: { id: true, name: true, code: true } },
          rpsDocuments: {
            where: { isPublic: true },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, fileUrl: true, revision: true },
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
 *
 * Data baru (`items`) dan data warisan (`semesters[].courses`) sama-sama
 * dihitung agar statistik tidak anjlok ke nol setelah ADR-006.
 */
export function buildCurriculumSummary(curriculums: CurriculumWithSemesters): CurriculumSummary {
  let totalSemesters = 0;
  let totalCourses = 0;
  let totalCredits = 0;
  let totalRps = 0;

  for (const curriculum of curriculums) {
    totalSemesters += curriculum.semesters.length;

    // Penawaran baru (ADR-006).
    for (const item of curriculum.items) {
      totalCourses += 1;
      totalCredits += item.credits;
      totalRps += item.rpsDocuments.length;
    }

    // Data warisan dari skema lama.
    for (const semester of curriculum.semesters) {
      for (const course of semester.courses) {
        totalCourses += 1;
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

/**
 * Memastikan sebuah mata kuliah berada di bawah tenant yang sedang dikelola.
 *
 * Sejak 2026-11-16 `curriculum_courses` punya `study_program_id` eksplisit,
 * sehingga pemeriksaan kepemilikan **tidak lagi bergantung pada semester**.
 * Mata kuliah tanpa semester (kolom warisan) tetap dapat diverifikasi dan
 * dikelola, dan `studyProgramId` tidak pernah dibaca dari browser.
 */
export async function findCourseInTenant(courseId: number, studyProgramId: number) {
  return prisma.curriculumCourse.findFirst({
    where: { id: courseId, studyProgramId },
    include: {
      academicSemester: true,
      semester: { include: { curriculum: { select: { id: true, studyProgramId: true } } } },
    },
  });
}

/**
 * Memastikan sebuah **master mata kuliah** milik prodi yang sedang dikelola.
 *
 * Dipakai sebelum menautkan master ke sebuah penawaran, sehingga admin tidak
 * dapat menautkan mata kuliah milik prodi lain hanya dengan menebak `courseId`.
 */
export async function findCourseMasterInTenant(courseId: number, studyProgramId: number) {
  return prisma.course.findFirst({ where: { id: courseId, studyProgramId } });
}

/**
 * Memastikan sebuah **penawaran mata kuliah** berada di bawah tenant aktif.
 *
 * Penawaran tidak menyimpan `study_program_id` sendiri; kepemilikannya
 * diturunkan dari kurikulum induk. Guard ini menelusuri jalur itu sehingga
 * `:id` pada URL tidak dapat dipakai untuk menyentuh data prodi lain.
 */
export async function findCurriculumItemInTenant(itemId: number, studyProgramId: number) {
  return prisma.curriculumItem.findFirst({
    where: { id: itemId, curriculum: { studyProgramId } },
    include: {
      course: true,
      academicSemester: true,
      rpsDocuments: { orderBy: { createdAt: 'desc' } },
    },
  });
}
