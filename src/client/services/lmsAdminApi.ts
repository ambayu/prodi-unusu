import { api } from './api';

/** Klien manajemen perkuliahan yang diteruskan Portal Prodi ke LMS. */
export interface LmsStudentRow {
  nim: string;
  name: string;
}

export interface LmsClassroom {
  id: number;
  curriculumItemId: number;
  group: 'Utama';
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
  day?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  lecturerNidn?: string | null;
  lecturerName?: string | null;
}

export interface LmsLecturer {
  id: number;
  name: string;
  nidn: string;
}

export interface LmsMeeting {
  id: number;
  number: number;
  title: string;
  status: string;
}

export interface LmsCourseOffering {
  id: number;
  code: string;
  name: string;
  credits: number;
  semesterNumber: number | null;
  lecturers?: Array<{ id: number | string; name: string; nidn: string | null }>;
  classroom: Omit<LmsClassroom, 'curriculumItemId' | 'group' | 'curriculumItem'> | null;
}

export const lmsAdminApi = {
  courses: (params?: { curriculumId?: number; year?: number; all?: boolean }) =>
    api.get<{
      success: boolean;
      courses: LmsCourseOffering[];
    }>('/admin/lms/courses', { params }),
  lecturers: () => api.get<{ success: boolean; lecturers: LmsLecturer[] }>('/admin/lms/lecturers'),
  classrooms: () => api.get<{ success: boolean; classrooms: LmsClassroom[] }>('/admin/lms/classrooms'),
  saveClassroom: (data: LmsClassroomInput) =>
    api.post<{ success: boolean; classroom: LmsClassroom }>('/admin/lms/classrooms', data),
  meetings: (classroomId: number) =>
    api.get<{ success: boolean; meetings: LmsMeeting[] }>(`/admin/lms/classrooms/${classroomId}/meetings`),
  students: (classroomId: number) =>
    api.get<{ success: boolean; students: LmsStudentRow[] }>(`/admin/lms/classrooms/${classroomId}/students`),
  saveStudents: (classroomId: number, students: LmsStudentRow[]) =>
    api.put(`/admin/lms/classrooms/${classroomId}/students`, { students }),
  knownStudents: () => api.get<{ success: boolean; students: LmsStudentRow[] }>('/admin/lms/students'),
};
