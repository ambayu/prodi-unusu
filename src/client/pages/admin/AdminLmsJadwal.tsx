import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Field, FormModal } from '../../components/ui/FormModal';
import { EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { firstFieldError, toApiError } from '../../services/api';
import { lecturerApi } from '../../services/contentApi';
import {
  lmsAdminApi,
  type LmsCourseOffering,
} from '../../services/lmsAdminApi';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface Draft {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  lecturerNidn: string;
}

const EMPTY_DRAFT: Draft = {
  day: 'Senin',
  startTime: '08:00',
  endTime: '09:40',
  room: '',
  lecturerNidn: '',
};

function scheduleLabel(course: LmsCourseOffering) {
  const classroom = course.classroom;
  if (!classroom) return 'Belum diatur';
  const time = classroom.startTime && classroom.endTime
    ? `${classroom.startTime}-${classroom.endTime}`
    : null;
  return [classroom.day, time].filter(Boolean).join(', ') || 'Belum diatur';
}

export const AdminLmsJadwal: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const canEdit = has('curriculum.update');
  const [selectedCourse, setSelectedCourse] = useState<LmsCourseOffering | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['admin', 'lms-courses'],
    queryFn: () => lmsAdminApi.courses().then((res) => res.data.courses),
  });
  const lecturersQuery = useQuery({
    queryKey: ['admin', 'lecturers', 'lms'],
    queryFn: () => lecturerApi.all().then((res) => res.data.lecturers),
  });

  const courses = coursesQuery.data ?? [];
  const lecturers = lecturersQuery.data ?? [];
  const courseGroups = courses.reduce<Map<number, LmsCourseOffering[]>>((groups, course) => {
    const semester = course.semesterNumber ?? 0;
    const entries = groups.get(semester) ?? [];
    entries.push(course);
    groups.set(semester, entries);
    return groups;
  }, new Map());

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedCourse) throw new Error('Mata kuliah belum dipilih.');
      const lecturer = lecturers.find((item) => item.nidn === draft.lecturerNidn);
      return lmsAdminApi.saveClassroom({
        curriculumItemId: selectedCourse.id,
        day: draft.day || null,
        startTime: draft.startTime || null,
        endTime: draft.endTime || null,
        room: draft.room.trim() || null,
        lecturerNidn: draft.lecturerNidn || null,
        lecturerName: lecturer?.name ?? null,
      });
    },
    onSuccess: () => {
      toast.success('Perkuliahan berhasil disimpan dan dikirim ke LMS.');
      setSelectedCourse(null);
      setDraft(EMPTY_DRAFT);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-classrooms'] });
    },
    onError: (error) => setFormError(firstFieldError(toApiError(error)) ?? toApiError(error).message),
  });

  const openConfiguration = (course: LmsCourseOffering) => {
    const classroom = course.classroom;
    setSelectedCourse(course);
    setDraft({
      day: classroom?.day ?? 'Senin',
      startTime: classroom?.startTime ?? '08:00',
      endTime: classroom?.endTime ?? '09:40',
      room: classroom?.room ?? '',
      lecturerNidn: classroom?.lecturerNidn ?? '',
    });
    setFormError(null);
  };

  return (
    <AdminLayout
      title="Perkuliahan LMS"
      description="Atur dosen, jadwal, ruang, dan peserta untuk setiap mata kuliah pada kurikulum aktif."
    >
      {coursesQuery.isLoading ? (
        <LoadingState label="Memuat mata kuliah kurikulum..." />
      ) : coursesQuery.isError ? (
        <ErrorState message={toApiError(coursesQuery.error).message} onRetry={() => void coursesQuery.refetch()} />
      ) : courses.length === 0 ? (
        <EmptyState
          title="Belum ada mata kuliah pada kurikulum aktif"
          description="Tambahkan penawaran mata kuliah dan semester 1 sampai 8 pada Kurikulum terlebih dahulu."
        />
      ) : (
        <div className="space-y-5">
          {[...courseGroups.entries()].map(([semester, semesterCourses]) => (
            <section key={semester} className="card overflow-hidden">
              <header className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">Semester {semester || 'Belum ditentukan'}</h2>
              </header>
              <ul className="divide-y divide-slate-100">
                {semesterCourses.map((course) => {
                  const classroom = course.classroom;
                  return (
                    <li key={course.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {course.code} · {course.credits} SKS
                        </p>
                        <h3 className="truncate text-sm font-bold text-slate-900">{course.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4 text-slate-400" />{scheduleLabel(course)}</span>
                          <span className="inline-flex items-center gap-1.5"><MapPinIcon className="h-4 w-4 text-slate-400" />{classroom?.room || 'Ruang belum diatur'}</span>
                          <span className="inline-flex items-center gap-1.5"><AcademicCapIcon className="h-4 w-4 text-slate-400" />{classroom?.lecturerName || 'Dosen belum ditetapkan'}</span>
                          <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4 text-slate-400" />{classroom?._count.students ?? 0} peserta</span>
                        </div>
                      </div>
                      {canEdit ? (
                        <RowActions>
                          <EditRowButton
                            label="Atur perkuliahan"
                            konteks={`${course.code} ${course.name}`}
                            onClick={() => openConfiguration(course)}
                          />
                        </RowActions>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <FormModal
        open={selectedCourse !== null}
        title="Atur Perkuliahan"
        busy={saveMutation.isPending}
        error={formError}
        onClose={() => {
          setSelectedCourse(null);
          setFormError(null);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (draft.startTime && draft.endTime && draft.startTime >= draft.endTime) {
            setFormError('Jam selesai harus lebih lambat dari jam mulai.');
            return;
          }
          saveMutation.mutate();
        }}
      >
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <strong>{selectedCourse?.code}</strong> · {selectedCourse?.name}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Hari" htmlFor="lms-day"><select id="lms-day" className="field-input" value={draft.day} onChange={(event) => setDraft({ ...draft, day: event.target.value })}><option value="">Belum diatur</option>{DAYS.map((day) => <option key={day} value={day}>{day}</option>)}</select></Field>
          <Field label="Jam Mulai" htmlFor="lms-start"><input id="lms-start" type="time" className="field-input" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field>
          <Field label="Jam Selesai" htmlFor="lms-end"><input id="lms-end" type="time" className="field-input" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></Field>
        </div>
        <Field label="Ruang Kuliah" htmlFor="lms-room"><input id="lms-room" className="field-input" value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} /></Field>
        <Field label="Dosen Pengampu" htmlFor="lms-lecturer"><select id="lms-lecturer" className="field-input" value={draft.lecturerNidn} onChange={(event) => setDraft({ ...draft, lecturerNidn: event.target.value })}><option value="">Belum ditetapkan</option>{lecturers.filter((lecturer) => lecturer.nidn).map((lecturer) => <option key={lecturer.id} value={lecturer.nidn ?? ''}>{lecturer.name} - {lecturer.nidn}</option>)}</select></Field>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><ClockIcon className="h-3.5 w-3.5" />Penyimpanan akan langsung memperbarui kelas dan 16 pertemuan di LMS.</p>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminLmsJadwal;
