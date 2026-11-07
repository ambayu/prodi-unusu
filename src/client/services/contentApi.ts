import { api } from './api';
import type { Paginated } from '../../shared/types/index';

/** Klien tipe untuk seluruh endpoint. Satu tempat agar bentuk data tidak ditebak. */

// ---------------------------------------------------------
// Akademik
// ---------------------------------------------------------

export interface Course {
  id: number;
  semesterId: number;
  code: string;
  name: string;
  credits: number;
  courseType: string;
  description: string | null;
  rpsDocuments?: Array<{ id: number; title: string; fileUrl: string; revision: string | null }>;
}

export interface Semester {
  id: number;
  curriculumId: number;
  semesterNumber: number;
  title: string;
  courses: Course[];
}

export interface Curriculum {
  id: number;
  name: string;
  year: number;
  description: string | null;
  isActive: boolean;
  semesters: Semester[];
}

export interface CurriculumSummary {
  totalSemesters: number;
  totalCourses: number;
  totalCredits: number;
  totalRps: number;
}

export const curriculumApi = {
  public: () => api.get<{ curriculums: Curriculum[]; summary: CurriculumSummary }>('/public/curriculum'),
  list: () => api.get<{ curriculums: Curriculum[] }>('/admin/curriculums'),
  createCurriculum: (data: { name: string; year: number; description?: string | null; isActive?: boolean }) =>
    api.post('/admin/curriculums', data),
  updateCurriculum: (id: number, data: Record<string, unknown>) => api.put(`/admin/curriculums/${id}`, data),
  deleteCurriculum: (id: number) => api.delete(`/admin/curriculums/${id}`),
  createSemester: (data: { curriculumId: number; semesterNumber: number; title: string }) =>
    api.post('/admin/semesters', data),
  deleteSemester: (id: number) => api.delete(`/admin/semesters/${id}`),
  createCourse: (data: {
    semesterId: number;
    code: string;
    name: string;
    credits: number;
    courseType: string;
    description?: string | null;
  }) => api.post('/admin/courses', data),
  updateCourse: (id: number, data: Record<string, unknown>) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/admin/courses/${id}`),
};

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

export const lecturerApi = {
  public: () => api.get<{ lecturers: Lecturer[] }>('/public/lecturers'),
  list: () => api.get<{ lecturers: Lecturer[] }>('/admin/lecturers'),
  create: (data: Partial<Lecturer>) => api.post('/admin/lecturers', data),
  update: (id: number, data: Partial<Lecturer>) => api.put(`/admin/lecturers/${id}`, data),
  remove: (id: number) => api.delete(`/admin/lecturers/${id}`),
};

// ---------------------------------------------------------
// Dokumen
// ---------------------------------------------------------

export interface DocumentItem {
  id: number;
  code: string | null;
  title: string;
  category: string;
  description: string | null;
  year: number;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
}

export const documentApi = {
  public: () => api.get<{ documents: DocumentItem[] }>('/public/documents'),
  list: () => api.get<{ documents: DocumentItem[] }>('/admin/documents'),
  create: (data: Partial<DocumentItem>) => api.post('/admin/documents', data),
  update: (id: number, data: Partial<DocumentItem>) => api.put(`/admin/documents/${id}`, data),
  remove: (id: number) => api.delete(`/admin/documents/${id}`),
};

// ---------------------------------------------------------
// Sarana & Prasarana
// ---------------------------------------------------------

export interface Facility {
  id: number;
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
  get: () => api.get<{ profile: Record<string, unknown> | null; visionMission: Record<string, unknown> | null }>('/admin/profile'),
  update: (data: Record<string, unknown>) => api.put('/admin/profile', data),
  updateVisionMission: (data: Record<string, unknown>) => api.put('/admin/vision-mission', data),
};

export { api };
