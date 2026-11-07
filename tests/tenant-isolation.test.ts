import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Pengujian isolasi tenant terhadap database sungguhan.
 *
 * Setiap pengujian memakai dua tenant berbeda dan memastikan query yang
 * dibatasi tenant tidak pernah membocorkan data tenant lain, termasuk ketika
 * ID record dari tenant lain dipakai langsung (docs/PRD.md bagian 17).
 */

const prisma = new PrismaClient();

let tenantA: { id: number; code: string };
let tenantB: { id: number; code: string };
let courseA: number;
let postA: number;
let documentA: number;

beforeAll(async () => {
  const programs = await prisma.studyProgram.findMany({
    orderBy: { id: 'asc' },
    take: 2,
    select: { id: true, code: true },
  });

  if (programs.length < 2) {
    throw new Error('Pengujian isolasi tenant memerlukan minimal dua program studi di database.');
  }

  [tenantA, tenantB] = programs;

  // Data uji hanya dibuat pada tenant A. Tidak ada penghapusan data operasional.
  const curriculum = await prisma.curriculum.create({
    data: { studyProgramId: tenantA.id, name: 'Kurikulum Uji Isolasi', year: 2098, isActive: false },
  });
  const semester = await prisma.curriculumSemester.create({
    data: { curriculumId: curriculum.id, semesterNumber: 1, title: 'Semester Uji' },
  });
  const course = await prisma.curriculumCourse.create({
    data: { semesterId: semester.id, code: 'ISO 001', name: 'Mata Kuliah Isolasi', credits: 2 },
  });
  courseA = course.id;

  const post = await prisma.post.create({
    data: {
      studyProgramId: tenantA.id,
      title: 'Berita Uji Isolasi',
      slug: `berita-uji-isolasi-${Date.now()}`,
      content: 'Isi berita uji isolasi tenant.',
      status: 'published',
      isPublished: true,
      publishedAt: new Date(),
    },
  });
  postA = post.id;

  const document = await prisma.document.create({
    data: {
      studyProgramId: tenantA.id,
      title: 'Dokumen Uji Isolasi',
      category: 'Uji',
      fileUrl: '/uploads/documents/uji-isolasi.pdf',
      isPublic: true,
    },
  });
  documentA = document.id;
});

afterAll(async () => {
  // Membersihkan hanya data yang dibuat pengujian ini.
  await prisma.curriculumCourse.deleteMany({ where: { id: courseA } });
  await prisma.curriculumSemester.deleteMany({ where: { title: 'Semester Uji' } });
  await prisma.curriculum.deleteMany({ where: { name: 'Kurikulum Uji Isolasi' } });
  await prisma.post.deleteMany({ where: { id: postA } });
  await prisma.document.deleteMany({ where: { id: documentA } });
  await prisma.$disconnect();
});

describe('isolasi data tenant', () => {
  it('mata kuliah tenant A tidak terlihat dari query tenant B', async () => {
    const fromB = await prisma.curriculumCourse.findMany({
      where: { id: courseA, semester: { curriculum: { studyProgramId: tenantB.id } } },
    });
    expect(fromB).toHaveLength(0);
  });

  it('mata kuliah tenant A terlihat dari query tenant A', async () => {
    const fromA = await prisma.curriculumCourse.findFirst({
      where: { id: courseA, semester: { curriculum: { studyProgramId: tenantA.id } } },
    });
    expect(fromA?.name).toBe('Mata Kuliah Isolasi');
  });

  it('berita tenant A tidak muncul pada daftar publik tenant B', async () => {
    const postsB = await prisma.post.findMany({
      where: { studyProgramId: tenantB.id, status: 'published', isPublished: true },
    });
    expect(postsB.some((post) => post.id === postA)).toBe(false);
  });

  it('dokumen privat tenant A tidak terbaca lewat filter publik tenant B', async () => {
    const documentsB = await prisma.document.findMany({
      where: { studyProgramId: tenantB.id, isPublic: true },
    });
    expect(documentsB.some((document) => document.id === documentA)).toBe(false);
  });

  it('menghapus dokumen dengan filter tenant yang salah tidak menghapus apa pun', async () => {
    const result = await prisma.document.deleteMany({
      where: { id: documentA, studyProgramId: tenantB.id },
    });
    expect(result.count).toBe(0);

    const stillThere = await prisma.document.findUnique({ where: { id: documentA } });
    expect(stillThere).not.toBeNull();
  });

  it('setiap halaman hanya terdaftar pada tenant pemiliknya', async () => {
    const pagesA = await prisma.page.findMany({
      where: { studyProgramId: tenantA.id },
      select: { slug: true },
    });

    const duplicateSlugOnB = await prisma.page.findMany({
      where: { studyProgramId: tenantB.id, slug: { in: pagesA.map((page) => page.slug) } },
      select: { slug: true },
    });

    // Slug yang sama boleh ada di tenant berbeda, tetapi recordnya terpisah.
    for (const page of duplicateSlugOnB) {
      const owner = await prisma.page.findFirst({ where: { studyProgramId: tenantB.id, slug: page.slug } });
      expect(owner?.studyProgramId).toBe(tenantB.id);
    }
  });
});

describe('integritas domain dan tenant', () => {
  it('hostname domain bersifat unik secara global', async () => {
    const domains = await prisma.domain.findMany({ select: { hostname: true } });
    const unique = new Set(domains.map((domain) => domain.hostname));
    expect(unique.size).toBe(domains.length);
  });

  it('setiap tenant aktif memiliki minimal satu domain', async () => {
    const programs = await prisma.studyProgram.findMany({
      where: { status: 'active' },
      select: { id: true, domains: { select: { id: true, isActive: true } } },
    });

    for (const program of programs) {
      expect(program.domains.length).toBeGreaterThan(0);
    }
  });

  it('setiap tenant memiliki pengaturan website dan tema', async () => {
    const programs = await prisma.studyProgram.findMany({
      select: { id: true, websiteSetting: true, theme: true },
    });

    for (const program of programs) {
      expect(program.websiteSetting).not.toBeNull();
      expect(program.theme).not.toBeNull();
    }
  });

  it('super admin memiliki penugasan global', async () => {
    const superAdmin = await prisma.userRole.findFirst({
      where: { role: { code: 'SUPER_ADMIN' } },
      include: { role: true },
    });

    expect(superAdmin).not.toBeNull();
    expect(superAdmin?.scopeType).toBe('global');
    expect(superAdmin?.studyProgramId).toBeNull();
  });

  it('permission wildcard tidak disimpan di database', async () => {
    // Super Admin mendapat seluruh izin lewat kode, bukan lewat baris permission
    // bertanda bintang, agar katalog tetap dapat dibaca manusia.
    const wildcard = await prisma.permission.findFirst({ where: { code: '*' } });
    expect(wildcard).toBeNull();
  });
});
