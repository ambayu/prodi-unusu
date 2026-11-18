import { api } from './api';

/**
 * Klien Manajemen LMS Portal Prodi.
 *
 * Portal Prodi adalah sumber tunggal data kelas perkuliahan: jadwal, ruang,
 * dosen pengampu, dan peserta diatur di sini, lalu ditarik LMS melalui ONE
 * UNUSU API Hub.
 */

export interface LmsCourseOption {
  id: number;
  code: string;
  name: string;
  credits: number;
  semesterNumber: number | null;
  classrooms: Array<{ id: number; group: string }>;
}

export interface LmsClassroom {
  id: number;
  curriculumItemId: number;
  group: string;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  lecturerNidn: string | null;
  lecturerName: string | null;
  curriculumItem: {
    id: number;
    credits: number;
    semesterNumber: number | null;
    course: { code: string; name: string };
  };
  _count: { students: number };
}

export interface LmsClassroomInput {
  curriculumItemId: number;
  group: string;
  day?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  lecturerNidn?: string | null;
  lecturerName?: string | null;
}

export interface LmsStudentRow {
  nim: string;
  name: string;
}

export interface LmsSyncRow {
  prodiClassId: number;
  kodeMk: string;
  status: 'tersinkron' | 'gagal';
  alasan?: string;
  classId?: number;
  pesertaBaru?: number;
  dosenTerhubung?: boolean;
}

export const lmsAdminApi = {
  courses: () => api.get<{ success: boolean; courses: LmsCourseOption[] }>('/admin/lms/courses'),
  classrooms: () => api.get<{ success: boolean; classrooms: LmsClassroom[] }>('/admin/lms/classrooms'),
  createClassroom: (data: LmsClassroomInput) =>
    api.post<{ success: boolean; classroom: LmsClassroom }>('/admin/lms/classrooms', data),
  updateClassroom: (id: number, data: Partial<LmsClassroomInput>) =>
    api.put<{ success: boolean; classroom: LmsClassroom }>(`/admin/lms/classrooms/${id}`, data),
  removeClassroom: (id: number) => api.delete(`/admin/lms/classrooms/${id}`),
  students: (classroomId: number) =>
    api.get<{ success: boolean; students: LmsStudentRow[] }>(`/admin/lms/classrooms/${classroomId}/students`),
  saveStudents: (classroomId: number, students: LmsStudentRow[]) =>
    api.put(`/admin/lms/classrooms/${classroomId}/students`, { students }),
  knownStudents: () => api.get<{ success: boolean; students: LmsStudentRow[] }>('/admin/lms/students'),
  sinkron: () =>
    api.post<{ success: boolean; message: string; hasil: LmsSyncRow[] }>('/admin/lms/sinkron'),
};