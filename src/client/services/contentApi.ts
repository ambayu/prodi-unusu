import { api } from './api';
import type { Paginated } from '../../shared/types/index';

/** Klien tipe untuk seluruh endpoint. Satu tempat agar bentuk data tidak ditebak. */

// ---------------------------------------------------------
// Akademik
// ---------------------------------------------------------

export interface LecturerAssignment {
  id: number | string;
  name: string;
  nidn: string | null;
}

export interface AcademicSemester {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: number;
  semesterId: number;
  academicSemesterId?: number | null;
  academicSemester?: AcademicSemester | null;
  code: string;
  name: string;
  credits: number;
  /**
   * Kolom warisan `course_type` di database. Tidak lagi diisi dari formulir
   * sejak Keterangan menjadi teks bebas; dipertahankan agar data lama terbaca.
   */
  courseType?: string;
  description: string | null;
  lecturersData?: LecturerAssignment[] | null;
  rpsDocuments?: Array<{ id: number; title: string; fileUrl: string; revision: string | null }>;
}

export interface Semester {
  id: number;
  curriculumId: number;
  semesterNumber: number;
  title: string;
  courses: Course[];
}

/**
 * Satu baris mata kuliah pada daftar datar `/admin/kurikulum`.
 *
 * Memuat potongan semester induknya karena halaman itu tidak menampilkan
 * hierarki kurikulum, hanya nomor dan judul semester.
 */
export interface CourseRow {
  id: number;
  /** Milik prodi langsung sejak 2026-11-16. */
  studyProgramId: number;
  /** Warisan posisi 1..14; `null` untuk mata kuliah yang tidak ditautkan kurikulum. */
  semesterId: number | null;
  academicSemesterId: number | null;
  academicSemester: AcademicSemester | null;
  code: string;
  name: string;
  credits: number;
  description: string | null;
  lecturersData: LecturerAssignment[] | null;
  semester: { id: number; semesterNumber: number; title: string; curriculumId: number } | null;
  rpsDocuments: Array<{ id: number; title: string; fileUrl: string; revision: string | null }>;
}

export interface Curriculum {
  id: number;
  name: string;
  year: number;
  description: string | null;
  isActive: boolean;
  semesters: Semester[];
  /** Penawaran mata kuliah (ADR-006). Sumber utama halaman publik kini ini. */
  items?: CurriculumItem[];
}

export interface CurriculumSummary {
  totalSemesters: number;
  totalCourses: number;
  totalCredits: number;
  totalRps: number;
}

/**
 * Master mata kuliah (`courses`) — hanya identitas.
 *
 * Inilah yang diinput di menu **Mata Kuliah**: kode + nama. Detail seperti SKS,
 * dosen, dan RPS tidak ada di sini; itu milik `CurriculumItem`.
 */
export interface CourseMaster {
  id: number;
  code: string;
  name: string;
  createdAt?: string;
}

/** RPS yang menempel pada satu penawaran mata kuliah. */
export interface CurriculumRpsRow {
  id: number;
  title: string;
  fileUrl: string;
  revision: string | null;
}

/**
 * Penawaran mata kuliah di dalam kurikulum (`curriculum_items`).
 *
 * Inilah baris tabel halaman **Kurikulum**. `courseId` adalah kolom
 * "id matakuliah" yang menautkan ke master — satu master boleh ditawarkan di
 * beberapa kurikulum dengan SKS dan pengampu berbeda (ADR-006).
 */
export interface CurriculumItem {
  id: number;
  curriculumId: number;
  courseId: number;
  academicSemesterId: number | null;
  credits: number;
  description: string | null;
  lecturersData: LecturerAssignment[] | null;
  sortOrder: number;
  course: { id: number; code: string; name: string };
  curriculum?: { id: number; name: string; year: number };
  academicSemester?: AcademicSemester | null;
  rpsDocuments: CurriculumRpsRow[];
}

export const academicSemesterApi = {
  list: () => api.get<{ semesters: AcademicSemester[] }>('/admin/academic-semesters'),
  create: (data: { code: string; name: string; startDate: string; endDate: string; isActive?: boolean }) =>
    api.post('/admin/academic-semesters', data),
  update: (id: number, data: Partial<AcademicSemester>) => api.put(`/admin/academic-semesters/${id}`, data),
  remove: (id: number) => api.delete(`/admin/academic-semesters/${id}`),
};

export const curriculumApi = {
  public: () =>
    api.get<{
      curriculums: Curriculum[];
      masterSemesters?: Array<{ id: number; code: string; name: string; isActive: boolean }>;
      summary: CurriculumSummary;
    }>('/public/curriculum'),
  list: () => api.get<{ curriculums: Curriculum[] }>('/admin/curriculums'),
  /**
   * Daftar mata kuliah datar lintas semester untuk halaman `/admin/kurikulum`.
   * Berbeda dari `list()` yang mengembalikan pohon kurikulum bertingkat.
   */
  courses: () => api.get<{ courses: CourseRow[] }>('/admin/courses'),
  createCurriculum: (data: { name: string; year: number; description?: string | null; isActive?: boolean }) =>
    api.post('/admin/curriculums', data),
  updateCurriculum: (id: number, data: Record<string, unknown>) => api.put(`/admin/curriculums/${id}`, data),
  deleteCurriculum: (id: number) => api.delete(`/admin/curriculums/${id}`),
  createSemester: (data: { curriculumId: number; semesterNumber: number; title: string }) =>
    api.post('/admin/semesters', data),
  deleteSemester: (id: number) => api.delete(`/admin/semesters/${id}`),
  /**
   * Membuat mata kuliah baru.
   *
   * `semesterId` (posisi 1..14) sengaja **tidak** dikirim klien: kolom itu
   * warisan dan kini nullable. Server menautkannya sendiri ke semester pertama
   * kurikulum tenant agar mata kuliah tetap muncul pada daftar yang difilter
   * lewat kurikulum. Yang dipilih admin adalah `academicSemesterId` — master
   * semester kalender (keputusan 2026-11-16).
   */
  createCourse: (data: {
    academicSemesterId: number;
    code: string;
    name: string;
    credits: number;
    description?: string | null;
    lecturersData?: LecturerAssignment[] | null;
  }) => api.post('/admin/courses', data),
  updateCourse: (id: number, data: Record<string, unknown>) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/admin/courses/${id}`),
};

/**
 * Master mata kuliah — menu **Mata Kuliah**.
 *
 * Hanya kode dan nama. Detail penawaran ada di `curriculumItemApi`.
 */
export const courseMasterApi = {
  list: () => api.get<{ courses: CourseMaster[] }>('/admin/master-courses'),
  create: (data: { code: string; name: string }) => api.post<{ course: CourseMaster }>('/admin/master-courses', data),
  update: (id: number, data: { code?: string; name?: string }) =>
    api.put<{ course: CourseMaster }>(`/admin/master-courses/${id}`, data),
  remove: (id: number) => api.delete(`/admin/master-courses/${id}`),
};

/**
 * Penawaran mata kuliah pada kurikulum — halaman **Kurikulum**.
 *
 * `create` menerima `courseId` (id master) plus detail penawaran. Server
 * memverifikasi bahwa master dan kurikulum sama-sama milik prodi aktif.
 */
export const curriculumItemApi = {
  list: (curriculumId?: number) =>
    api.get<{ items: CurriculumItem[] }>('/admin/curriculum-items', {
      params: curriculumId ? { curriculumId } : undefined,
    }),
  create: (data: {
    curriculumId: number;
    courseId: number;
    academicSemesterId?: number | null;
    credits: number;
    description?: string | null;
    lecturersData?: LecturerAssignment[] | null;
  }) => api.post<{ item: CurriculumItem }>('/admin/curriculum-items', data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put<{ item: CurriculumItem }>(`/admin/curriculum-items/${id}`, data),
  remove: (id: number) => api.delete(`/admin/curriculum-items/${id}`),
};

// ---------------------------------------------------------
// RPS (Rencana Pembelajaran Semester)
// ---------------------------------------------------------

/**
 * Unggah berkas RPS untuk satu mata kuliah.
 *
 * Memakai `FormData` sehingga `Content-Type` sengaja dikosongkan agar browser
 * menuliskan sendiri `multipart/form-data` beserta boundary-nya. Header CSRF
 * tetap dipasang oleh interceptor `api`.
 */
export const rpsApi = {
  upload: (courseId: number, file: File, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return api.post<{ rps: { id: number; title: string; fileUrl: string; revision: string | null } }>(
      `/admin/courses/${courseId}/rps`,
      form,
      { headers: { 'Content-Type': undefined } },
    );
  },
  remove: (id: number) => api.delete(`/admin/rps/${id}`),
};

/**
 * RPS untuk penawaran mata kuliah (`curriculum_items`).
 *
 * Dipisahkan dari `rpsApi` karena tujuannya berbeda: `rpsApi` menulis ke record
 * warisan `curriculum_courses`, sedangkan ini menulis ke `curriculum_rps`.
 */
export const curriculumRpsApi = {
  upload: (itemId: number, file: File, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return api.post<{ rps: { id: number; title: string; fileUrl: string; revision: string | null } }>(
      `/admin/curriculum-items/${itemId}/rps`,
      form,
      { headers: { 'Content-Type': undefined } },
    );
  },
  remove: (id: number) => api.delete(`/admin/curriculum-rps/${id}`),
};

/** Batas ukuran berkas RPS, sejalan dengan `config.upload.rpsMaxBytes` di server. */
export const RPS_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Mengambil berkas RPS publik sebagai blob.
 *
 * Kata sandi prodi dikirim lewat header `x-arsip-password` — sama seperti arsip
 * dokumen — sehingga tidak pernah tercatat di URL, riwayat peramban, maupun log
 * akses. `fileUrl` dari API berisi jalur admin; yang dipakai di sini hanya nama
 * berkasnya, karena jalur publiknya berbeda.
 */
export async function rpsBerkasApi(fileUrl: string, password: string): Promise<Blob> {
  const filename = fileUrl.split('/').pop() ?? '';
  const response = await fetch(`/api/v1/public/rps/file/${encodeURIComponent(filename)}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'X-Arsip-Password': password },
  });

  if (!response.ok) {
    let pesan = 'Berkas RPS tidak dapat dibuka.';
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) pesan = payload.message;
    } catch {
      // Respons bukan JSON (mis. HTML galat proxy): pakai pesan umum.
    }
    throw new Error(pesan);
  }

  return response.blob();
}

/**
 * URL pratinjau RPS untuk panel admin.
 *
 * Tautan `<a href>` tidak melewati interceptor axios, sehingga tenant aktif
 * tidak ikut terkirim sebagai header `X-Tenant-Id`. `tenantId` di query membuat
 * server tetap tahu berkas milik prodi mana ketika memeriksa kepemilikan; bila
 * kosong, server jatuh ke tenant pertama pengguna.
 */
export function adminRpsFileUrl(fileUrl: string, tenantId: number | null): string {
  return tenantId ? `${fileUrl}?tenantId=${tenantId}` : fileUrl;
}

// ---------------------------------------------------------
// Dosen
// ---------------------------------------------------------

export interface Lecturer {
  id: number;
  name: string;
  nidn: string | null;
  academicRank: string | null;
  education: string | null;
  expertise: string | null;
  email: string | null;
  photoUrl: string | null;
  bio: string | null;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Dosen sebagaimana disajikan endpoint publik.
 *
 * Endpoint publik menggabungkan data lokal dengan API Hub ONE UNUSU, sehingga
 * sebagian kolom lokal (mis. `expertise`) tidak selalu ada dan beberapa kolom
 * tambahan (`studyProgramName`) ikut dikirim.
 */
export interface PublicLecturer extends Omit<Lecturer, 'isActive' | 'sortOrder' | 'expertise' | 'bio'> {
  expertise?: string | null;
  bio?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  studyProgramName?: string | null;
  facultyName?: string | null;
  sintaId?: string | null;
  sintaUrl?: string | null;
  googleScholar?: string | null;
  scopusId?: string | null;
  orcid?: string | null;
}

/** Satu kelompok dosen pada website fakultas, yaitu dosen milik satu prodi. */
export interface LecturerGroup {
  prodi: {
    id: number;
    name: string;
    code: string;
    degree: string;
    logoUrl?: string | null;
    hostname?: string | null;
  };
  lecturers: PublicLecturer[];
}

export interface PublicLecturersResponse {
  success: boolean;
  /** `true` bila respons dikelompokkan per prodi (website fakultas). */
  grouped?: boolean;
  groups?: LecturerGroup[];
  /** Jumlah dosen SIAKAD yang belum punya homebase prodi. */
  tanpaHomebase?: number;
  lecturers: PublicLecturer[];
}

export const lecturerApi = {
  public: () => api.get<PublicLecturersResponse>('/public/lecturers'),
  publicDetail: (id: number | string) =>
    api.get<{ success: boolean; lecturer: PublicLecturer }>(`/public/lecturers/${id}`),
  list: (params?: { search?: string }) => api.get<{ lecturers: Lecturer[]; allLecturers?: Lecturer[] }>('/admin/lecturers', { params }),
  all: () => api.get<{ lecturers: Lecturer[] }>('/admin/lecturers/all'),
};

// ---------------------------------------------------------
// Arsip Dokumen (LPM/LPPM)
// ---------------------------------------------------------

/*
 * Arsip dokumen mutu TIDAK disimpan di aplikasi ini: sumbernya aplikasi LPM &
 * LPPM yang dibaca lewat ONE UNUSU. Karena itu tidak ada endpoint tulis —
 * prodi hanya dapat melihat, mempratinjau, dan mengunduh.
 */

export type ArsipSumber = 'lpm' | 'lppm';

/** Satu dokumen arsip seperti yang disajikan panel admin prodi. */
export interface ArsipDokumenItem {
  id: number;
  sumber: ArsipSumber;
  judul: string;
  nomor: string | null;
  kategori: string | null;
  tahun: number | null;
  status: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  prodiCode: string | null;
  prodiName: string | null;
  updatedAt: string | null;
}

/** Dokumen arsip pada halaman publik: tanpa URL berkas mentah. */
export interface ArsipDokumenPublik {
  id: number;
  sumber: ArsipSumber;
  judul: string;
  nomor: string | null;
  kategori: string | null;
  tahun: number | null;
  status: string | null;
  fileTersedia: boolean;
  mimeType: string | null;
}

export interface ArsipMeta {
  prodiCode: string;
  prodiName: string;
  total?: number;
  sumberGagal?: ArsipSumber[];
  passwordActive: boolean;
  passwordSetAt?: string | null;
  terkunci?: boolean;
}

export interface ArsipPasswordStatus {
  passwordActive: boolean;
  setAt: string | null;
  version: number;
}

export const arsipDokumenApi = {
  /** Daftar arsip untuk panel admin prodi. */
  adminList: (params?: { search?: string; status?: string; tahun?: number }) =>
    api.get<{ items: ArsipDokumenItem[]; meta: ArsipMeta }>('/admin/arsip-dokumen', { params }),

  /** Status kata sandi arsip prodi aktif. */
  passwordStatus: () => api.get<ArsipPasswordStatus>('/admin/dokumen-password'),

  /** Memasang atau mengganti kata sandi arsip prodi. */
  setPassword: (password: string) => api.put<ArsipPasswordStatus & { message?: string }>('/admin/dokumen-password', { password }),

  /**
   * Metadata arsip publik: daftar dokumen TERBUKA untuk siapa pun.
   *
   * Daftar sengaja tidak dilindungi kata sandi agar pengunjung dapat melihat
   * dokumen apa saja yang tersedia. Yang dilindungi adalah isi berkasnya.
   */
  publicInfo: (params?: { search?: string; status?: string; tahun?: number }) =>
    api.get<{ items: ArsipDokumenPublik[]; meta: ArsipMeta }>('/public/arsip-dokumen', { params }),

  /**
   * Memeriksa kata sandi prodi sebelum membuka berkas.
   *
   * Kata sandi hanya diperiksa, bukan ditukar dengan tiket: setiap pratinjau
   * dan unduhan mengirim ulang kata sandi yang sama, sehingga berlaku kapan
   * saja tanpa batas waktu maupun batas percobaan.
   */
  unlock: (password: string) =>
    api.post<{ valid: boolean; meta: ArsipMeta }>('/public/arsip-dokumen/unlock', {
      password,
    }),
};

/**
 * Sumber pengambilan berkas arsip.
 *
 * - `admin`: memakai sesi login pengelola prodi; tidak perlu kata sandi arsip.
 * - `publik`: memakai kata sandi arsip yang diketik pengunjung.
 */
export type ArsipBerkasMode = 'admin' | 'publik';

/** Asal berkas: arsip kiriman pusat, atau dokumen buatan prodi sendiri. */
export type DokumenAsal = 'arsip' | 'prodi';

/**
 * Mengambil berkas dokumen (pratinjau atau unduhan).
 *
 * Memakai `fetch` + `blob`, bukan URL biasa pada `<iframe>`/`<a>`, agar kata
 * sandi dikirim lewat header dan tidak pernah tercatat di URL, riwayat
 * peramban, maupun log server.
 *
 * Pengelola prodi yang sudah login memakai rute admin: hak membuka berkas
 * sudah dibuktikan oleh sesi login, sehingga kata sandi arsip tidak perlu
 * diketik ulang. Ini tidak melemahkan perlindungan publik — rute admin tetap
 * tertutup bagi pengunjung biasa.
 */
async function ambilBerkasArsip(
  id: number,
  mode: 'preview' | 'download',
  password: string,
  sumber: ArsipBerkasMode = 'publik',
  asal: DokumenAsal = 'arsip',
): Promise<Blob> {
  const segmen = asal === 'prodi' ? 'dokumen-prodi' : 'arsip-dokumen';
  const url =
    sumber === 'admin'
      ? `/api/v1/admin/${segmen}/${id}/file${mode === 'download' ? '?download=1' : ''}`
      : `/api/v1/public/${segmen}/${id}/${mode}`;

  const response =
    sumber === 'admin'
      ? await fetch(url, { method: 'GET', credentials: 'include' })
      : await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Arsip-Password': password },
        });

  if (!response.ok) {
    let pesan = 'Berkas dokumen tidak dapat dibuka.';
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) pesan = payload.message;
    } catch {
      // Respons bukan JSON (mis. HTML galat proxy): pakai pesan umum.
    }
    throw new Error(pesan);
  }

  return response.blob();
}

/** Pratinjau PDF untuk ditampilkan di dalam halaman. */
export const arsipPreviewApi = (
  id: number,
  password: string,
  sumber: ArsipBerkasMode = 'publik',
  asal: DokumenAsal = 'arsip',
) => ambilBerkasArsip(id, 'preview', password, sumber, asal);

/** Unduhan berkas arsip sebagai blob siap simpan. */
export const arsipDownloadApi = (
  id: number,
  password: string,
  sumber: ArsipBerkasMode = 'publik',
  asal: DokumenAsal = 'arsip',
) => ambilBerkasArsip(id, 'download', password, sumber, asal);

// ---------------------------------------------------------
// Dokumen buatan prodi (bank dokumen / arsip surat)
// ---------------------------------------------------------

/** Dokumen milik prodi, seperti disajikan panel admin. `status`: Publish | Draft. */
export interface DokumenProdiItem {
  id: number;
  judul: string;
  nomor: string | null;
  kategori: string;
  deskripsi: string | null;
  tahun: number;
  mimeType: string | null;
  fileSize: number | null;
  isPublic: boolean;
  status: 'Publish' | 'Draft';
  updatedAt: string;
}

/** Isian formulir tambah/ubah dokumen. `file` wajib saat tambah, opsional saat ubah. */
export interface DokumenProdiInput {
  title: string;
  code: string;
  category: string;
  year: number;
  description: string;
  isPublic: boolean;
  file: File | null;
}

/** Batas ukuran berkas dokumen, sejalan dengan `config.upload.maxBytes` di server. */
export const DOKUMEN_MAX_BYTES = 10 * 1024 * 1024;

function toDokumenForm(input: DokumenProdiInput): FormData {
  const form = new FormData();
  form.append('title', input.title);
  form.append('code', input.code);
  form.append('category', input.category);
  form.append('year', String(input.year));
  form.append('description', input.description);
  form.append('isPublic', String(input.isPublic));
  if (input.file) form.append('file', input.file);
  return form;
}

const MULTIPART = { headers: { 'Content-Type': undefined } };

export const dokumenProdiApi = {
  list: () => api.get<{ items: DokumenProdiItem[] }>('/admin/dokumen-prodi'),
  create: (input: DokumenProdiInput) =>
    api.post<{ item: DokumenProdiItem }>('/admin/dokumen-prodi', toDokumenForm(input), MULTIPART),
  update: (id: number, input: DokumenProdiInput) =>
    api.put<{ item: DokumenProdiItem }>(`/admin/dokumen-prodi/${id}`, toDokumenForm(input), MULTIPART),
  remove: (id: number) => api.delete(`/admin/dokumen-prodi/${id}`),
  /** Daftar dokumen Publish untuk halaman publik; berkas tetap wajib kata sandi. */
  publicList: () => api.get<{ items: ArsipDokumenPublik[] }>('/public/dokumen-prodi'),
};

// ---------------------------------------------------------
// Sarana & Prasarana
// ---------------------------------------------------------

export interface Facility {
  id: number | string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  imageUrl: string | null;
  status: string;
  sortOrder: number;
}

export const facilityApi = {
  public: () => api.get<{ facilities: Facility[] }>('/public/facilities'),
  list: () => api.get<{ facilities: Facility[] }>('/admin/facilities'),
  create: (data: Partial<Facility>) => api.post('/admin/facilities', data),
  update: (id: number, data: Partial<Facility>) => api.put(`/admin/facilities/${id}`, data),
  remove: (id: number) => api.delete(`/admin/facilities/${id}`),
};

// ---------------------------------------------------------
// Berita
// ---------------------------------------------------------

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnailUrl: string | null;
  status: string;
  isPublished: boolean;
  views: number;
  publishedAt: string | null;
  updatedAt: string;
  category: { id: number; name: string } | null;
}

export const postApi = {
  publicList: (params?: { page?: number; perPage?: number; search?: string }) =>
    api.get<Paginated<Post>>('/public/posts', { params }),
  list: (params?: { page?: number; perPage?: number; search?: string }) =>
    api.get<Paginated<Post>>('/admin/posts', { params }),
  get: (id: number) => api.get<{ post: Post }>(`/admin/posts/${id}`),
  create: (data: Record<string, unknown>) => api.post('/admin/posts', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/admin/posts/${id}`, data),
  remove: (id: number) => api.delete(`/admin/posts/${id}`),
  publish: (id: number, publish = true) => api.post(`/admin/posts/${id}/publish`, { publish }),
  categories: () => api.get<{ categories: Array<{ id: number; name: string; slug: string }> }>('/admin/post-categories'),
  createCategory: (data: { name: string; slug: string }) => api.post('/admin/post-categories', data),
};

// ---------------------------------------------------------
// Galeri
// ---------------------------------------------------------

export interface Gallery {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  eventDate: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  _count?: { items: number };
  items?: Array<{ id: number; caption: string | null; mediaType: string; mediaUrl: string }>;
}

export const galleryApi = {
  public: () => api.get<{ galleries: Gallery[] }>('/public/galleries'),
  list: () => api.get<{ galleries: Gallery[] }>('/admin/galleries'),
  create: (data: Record<string, unknown>) => api.post('/admin/galleries', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/admin/galleries/${id}`, data),
  remove: (id: number) => api.delete(`/admin/galleries/${id}`),
  addItem: (galleryId: number, data: Record<string, unknown>) => api.post(`/admin/galleries/${galleryId}/items`, data),
  removeItem: (itemId: number) => api.delete(`/admin/gallery-items/${itemId}`),
};

// ---------------------------------------------------------
// Kontak, Profil, Visi Misi
// ---------------------------------------------------------

export interface ContactInfo {
  id?: number;
  address: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  mapsEmbedUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
}

export const contactApi = {
  public: () => api.get<{ contact: ContactInfo | null }>('/public/contact'),
  get: () => api.get<{ contact: ContactInfo | null }>('/admin/contact'),
  update: (data: Partial<ContactInfo>) => api.put('/admin/contact', data),
  sendMessage: (data: { name: string; email: string; subject?: string; message: string }) =>
    api.post('/public/contact/messages', data),
  messages: () => api.get<{ messages: Array<{ id: number; name: string; email: string; subject: string | null; message: string; isRead: boolean; createdAt: string }> }>('/admin/contact-messages'),
  markRead: (id: number) => api.put(`/admin/contact-messages/${id}/read`),
};

export const profileApi = {
  public: () => api.get<{ profile: Record<string, unknown> | null; visionMission: Record<string, unknown> | null }>('/public/profile'),
  get: () =>
    api.get<{
      profile: Record<string, unknown> | null;
      visionMission: Record<string, unknown> | null;
      /** Gambar pendukung bersama halaman Profil & Visi-Misi. */
      heroImageUrl?: string | null;
    }>('/admin/profile'),
  update: (data: Record<string, unknown>) => api.put('/admin/profile', data),
  updateVisionMission: (data: Record<string, unknown>) => api.put('/admin/vision-mission', data),
  /** Menyimpan gambar pendukung tanpa mengubah isi teks profil. */
  updateHeroImage: (heroImageUrl: string) => api.put('/admin/hero-image', { heroImageUrl }),
};

export { api };
