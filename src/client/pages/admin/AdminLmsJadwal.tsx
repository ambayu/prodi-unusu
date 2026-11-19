import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Field, FormModal } from '../../components/ui/FormModal';
import { EditRowButton, RowActions } from '../../components/ui/RowActions';
import { SearchableSelect, type SearchableOption } from '../../components/ui/SearchableSelect';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { firstFieldError, toApiError } from '../../services/api';
import {
  lmsAdminApi,
  type LmsCourseOffering,
  type LmsLecturer,
  type LmsMeeting,
} from '../../services/lmsAdminApi';
import { curriculumApi } from '../../services/contentApi';
import { pickCurrentCurriculum } from '../../../shared/utils/curriculum';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

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

function cleanLecturerName(name?: string | null): string {
  if (!name) return 'Dosen belum ditetapkan';
  return name.replace(/^-\s*/, '').trim();
}

function scheduleLabel(classroom: LmsCourseOffering['classroom']) {
  if (!classroom) return 'Belum diatur';
  const time = classroom.startTime && classroom.endTime
    ? `${classroom.startTime} - ${classroom.endTime}`
    : null;
  return [classroom.day, time].filter(Boolean).join(', ') || 'Belum diatur';
}

export const AdminLmsJadwal: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const canEdit = has('curriculum.update');

  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [expandedDosenClassId, setExpandedDosenClassId] = useState<number | null>(null);

  const [editingCourse, setEditingCourse] = useState<LmsCourseOffering | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: () => curriculumApi.list().then((res) => res.data.curriculums),
  });

  const curriculums = useMemo(() => {
    const list = curriculumsQuery.data ?? [];
    return [...list].sort((a, b) => b.year - a.year);
  }, [curriculumsQuery.data]);

  const currentCurriculum = useMemo(
    () => pickCurrentCurriculum(curriculums),
    [curriculums],
  );

  // Tahun wajib terpilih: default ke kurikulum berlaku begitu daftar tahun tersedia.
  const effectiveYear = selectedYear || (currentCurriculum ? String(currentCurriculum.year) : '');

  const coursesQuery = useQuery({
    queryKey: ['admin', 'lms-courses', effectiveYear],
    queryFn: () => {
      const params: { year?: number; all?: boolean } = {};
      if (effectiveYear === 'all') {
        params.all = true;
      } else if (effectiveYear) {
        params.year = Number(effectiveYear);
      }
      return lmsAdminApi.courses(params).then((res) => res.data.courses);
    },
    enabled: Boolean(effectiveYear),
  });

  const lecturersQuery = useQuery({
    queryKey: ['admin', 'lms-lecturers'],
    queryFn: () => lmsAdminApi.lecturers().then((res) => res.data.lecturers),
  });

  // Query 16 pertemuan saat dosen/kelas tertentu diklik (expand)
  const meetingsQuery = useQuery({
    queryKey: ['admin', 'lms-meetings', expandedDosenClassId],
    queryFn: () => {
      if (!expandedDosenClassId) return Promise.resolve([]);
      return lmsAdminApi.meetings(expandedDosenClassId).then((res) => res.data.meetings);
    },
    enabled: Boolean(expandedDosenClassId),
  });

  const courses = coursesQuery.data ?? [];
  const rawLecturers = lecturersQuery.data ?? [];

  const lecturers = useMemo(() => {
    return rawLecturers.map((l) => ({
      ...l,
      name: cleanLecturerName(l.name),
    }));
  }, [rawLecturers]);

  const yearOptions = useMemo<SearchableOption[]>(
    () =>
      curriculums.map((c) => ({
        value: String(c.year),
        label: `Tahun ${c.year}`,
        description: c.name,
        keywords: `${c.year} ${c.name}`,
      })),
    [curriculums],
  );

  const lecturerOptions = useMemo<SearchableOption[]>(
    () =>
      lecturers
        .filter((lecturer) => lecturer.nidn)
        .map((lecturer) => ({
          value: lecturer.nidn,
          label: lecturer.name,
          meta: lecturer.nidn,
          keywords: `${lecturer.name} ${lecturer.nidn}`,
        })),
    [lecturers],
  );

  const dayOptions = useMemo<SearchableOption[]>(
    () => DAYS.map((day) => ({ value: day, label: day })),
    [],
  );

  const assignedCount = useMemo(
    () => courses.filter((c) => Boolean(c.classroom?.lecturerNidn || c.classroom?.lecturerName)).length,
    [courses],
  );

  // Filter semester 1-8
  const filteredCourses = useMemo(() => {
    if (selectedSemester === 'all') return courses;
    return courses.filter((c) => c.semesterNumber === selectedSemester);
  }, [courses, selectedSemester]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editingCourse) throw new Error('Mata kuliah belum dipilih.');
      const lecturer = lecturers.find((item) => item.nidn === draft.lecturerNidn);
      return lmsAdminApi.saveClassroom({
        curriculumItemId: editingCourse.id,
        day: draft.day || null,
        startTime: draft.startTime || null,
        endTime: draft.endTime || null,
        room: draft.room.trim() || null,
        lecturerNidn: draft.lecturerNidn || null,
        lecturerName: lecturer?.name ?? (draft.lecturerNidn ? draft.lecturerNidn : null),
      });
    },
    onSuccess: () => {
      toast.success('Jadwal perkuliahan berhasil disimpan dan dikirim ke LMS.');
      setEditingCourse(null);
      setDraft(EMPTY_DRAFT);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-meetings'] });
    },
    onError: (error) => setFormError(firstFieldError(toApiError(error)) ?? toApiError(error).message),
  });

  const openEditModal = (course: LmsCourseOffering) => {
    const classroom = course.classroom;
    setEditingCourse(course);
    setDraft({
      day: classroom?.day ?? 'Senin',
      startTime: classroom?.startTime ?? '08:00',
      endTime: classroom?.endTime ?? '09:40',
      room: classroom?.room ?? '',
      lecturerNidn: classroom?.lecturerNidn ?? '',
    });
    setFormError(null);
  };

  const toggleCourse = (courseId: number) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      setExpandedDosenClassId(null);
    } else {
      setExpandedCourseId(courseId);
      setExpandedDosenClassId(null);
    }
  };

  const toggleDosenMeetings = (classId?: number | null) => {
    if (!classId) return;
    if (expandedDosenClassId === classId) {
      setExpandedDosenClassId(null);
    } else {
      setExpandedDosenClassId(classId);
    }
  };

  return (
    <AdminLayout
      title="Perkuliahan & Jadwal LMS"
      description="Navigasi semester kurikulum, mata kuliah, dosen pengampu, edit jadwal, dan daftar 16 pertemuan LMS."
    >
      <div className="space-y-5">
        {/* BARIS PILIHAN TAHUN KURIKULUM & INFO */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5 shadow-2xs sm:flex-row sm:items-center sm:px-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="select-curriculum-year" className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Tahun Kurikulum
            </label>
            <SearchableSelect
              id="select-curriculum-year"
              value={effectiveYear}
              onChange={(val) => {
                setSelectedYear(val);
                setSelectedSemester('all');
                setExpandedCourseId(null);
                setExpandedDosenClassId(null);
              }}
              options={yearOptions}
              clearable={false}
              size="sm"
              searchPlaceholder="Cari tahun..."
              icon={<CalendarDaysIcon className="h-4 w-4" />}
              dropdownMinWidth={240}
              className="w-44"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/70 bg-blue-50/80 px-2.5 py-1 text-[#1e3a8a]">
              {courses.length} Penawaran MK
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/70 bg-blue-50/80 px-2.5 py-1 text-[#1e3a8a]">
              {assignedCount} Sudah Ada Dosen
            </span>
          </div>
        </div>

        {/* TAB FILTER SEMESTER 1 - 8 */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setSelectedSemester('all')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold tabular-nums transition-all ${
              selectedSemester === 'all'
                ? 'bg-[#1e3a8a] text-white shadow-[0_4px_12px_-4px_rgba(30,58,138,0.55)]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Semua Semester ({courses.length})
          </button>
          {SEMESTERS.map((sem) => {
            const count = courses.filter((c) => c.semesterNumber === sem).length;
            return (
              <button
                key={sem}
                type="button"
                onClick={() => setSelectedSemester(sem)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold tabular-nums transition-all ${
                  selectedSemester === sem
                    ? 'bg-[#1e3a8a] text-white shadow-[0_4px_12px_-4px_rgba(30,58,138,0.55)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Semester {sem} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>

        {coursesQuery.isLoading ? (
          <LoadingState label="Memuat penawaran mata kuliah kurikulum..." />
        ) : coursesQuery.isError ? (
          <ErrorState message={toApiError(coursesQuery.error).message} onRetry={() => void coursesQuery.refetch()} />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title="Tidak ada mata kuliah"
            description={
              selectedSemester === 'all'
                ? 'Belum ada mata kuliah pada kurikulum saat ini.'
                : `Tidak ada mata kuliah yang ditawarkan untuk Semester ${selectedSemester}.`
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredCourses.map((course) => {
              const classroom = course.classroom;
              const isExpanded = expandedCourseId === course.id;
              const dosenName = cleanLecturerName(classroom?.lecturerName);
              const hasClassroom = Boolean(classroom);
              const hasLecturer = Boolean(classroom?.lecturerNidn || classroom?.lecturerName);
              const meetingsOpen = Boolean(classroom) && expandedDosenClassId === classroom?.id;

              return (
                <div
                  key={course.id}
                  className={`overflow-hidden rounded-2xl border bg-white transition-all duration-150 ${
                    isExpanded
                      ? 'border-[#1e3a8a]/35 shadow-[0_8px_24px_-12px_rgba(30,58,138,0.22)] ring-1 ring-[#1e3a8a]/10'
                      : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* HEADER MATA KULIAH (LEVEL 2) */}
                  <div
                    onClick={() => toggleCourse(course.id)}
                    className={`flex cursor-pointer flex-wrap items-center justify-between gap-4 p-4 sm:px-5 select-none transition-colors ${
                      isExpanded ? 'bg-[#eff6ff]/45' : 'hover:bg-slate-50/75'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isExpanded
                            ? 'bg-[#1e3a8a] text-white shadow-xs'
                            : 'bg-blue-50 text-[#1e3a8a]'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-slate-200/80 bg-slate-100/90 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                            {course.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 tabular-nums">
                            Semester {course.semesterNumber ?? '-'} · {course.credits} SKS
                          </span>
                        </div>
                        <h3 className="mt-0.5 truncate text-sm font-bold text-slate-900">
                          {course.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1e3a8a] ${
                          hasLecturer ? '' : 'italic'
                        }`}
                      >
                        <AcademicCapIcon className="h-3.5 w-3.5" />
                        {hasLecturer ? dosenName : 'Belum ada dosen'}
                      </span>

                      {isExpanded && canEdit ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(course);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                          Jadwal
                        </button>
                      ) : null}

                      {isExpanded && classroom ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleDosenMeetings(classroom.id);
                          }}
                          title={meetingsOpen ? 'Tutup 16 pertemuan' : 'Lihat 16 pertemuan'}
                          aria-expanded={meetingsOpen}
                          aria-controls={`pertemuan-kelas-${classroom.id}`}
                          aria-label={meetingsOpen ? 'Tutup 16 pertemuan' : 'Lihat 16 pertemuan'}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            meetingsOpen
                              ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                          Pertemuan
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* LEVEL 3: SUB-PANEL DOSEN PENGAMPU & JADWAL */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Dosen Pengampu & Jadwal Kuliah
                            </p>
                            <h4 className="mt-1 text-base font-bold text-slate-900 flex items-center gap-2">
                              <AcademicCapIcon className="h-5 w-5 text-[#1e3a8a]" />
                              {hasLecturer ? dosenName : <span className="italic text-slate-400">Belum ditetapkan</span>}
                              {classroom?.lecturerNidn ? (
                                <span className="font-mono text-xs font-normal text-slate-500">
                                  (NIDN: {classroom.lecturerNidn})
                                </span>
                              ) : null}
                            </h4>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                                <strong>Jadwal:</strong> {scheduleLabel(classroom)}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <MapPinIcon className="h-4 w-4 text-slate-400" />
                                <strong>Ruang:</strong> {classroom?.room || 'Belum diatur'}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <UserGroupIcon className="h-4 w-4 text-slate-400" />
                                <strong>Peserta:</strong> {classroom?._count.students ?? 0} Mahasiswa
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LEVEL 4: DAFTAR 16 PERTEMUAN LMS */}
                      {expandedDosenClassId === classroom?.id && (
                        <div
                          id={`pertemuan-kelas-${classroom.id}`}
                          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <ClockIcon className="h-4 w-4 text-[#1e3a8a]" />
                              Rincian 16 Pertemuan Perkuliahan (LMS)
                            </h5>
                            <span className="text-[11px] text-slate-500">
                              Standar 16 Pertemuan Semester
                            </span>
                          </div>

                          {meetingsQuery.isLoading ? (
                            <div className="py-4 text-center text-xs text-slate-500">
                              Memuat daftar pertemuan dari LMS...
                            </div>
                          ) : (meetingsQuery.data ?? []).length === 0 ? (
                            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 italic">
                              Belum ada daftar pertemuan. Simpan jadwal ulang untuk menyinkronkan 16 pertemuan ke LMS.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              {(meetingsQuery.data ?? []).map((m: LmsMeeting) => (
                                <div
                                  key={m.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800">
                                      Pertemuan {m.number}
                                    </p>
                                    <p className="truncate text-[11px] text-slate-500" title={m.title}>
                                      {m.title}
                                    </p>
                                  </div>
                                  <span
                                    className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                      m.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : m.status === 'ongoing'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {m.status === 'completed'
                                      ? 'Selesai'
                                      : m.status === 'ongoing'
                                      ? 'Berjalan'
                                      : 'Rencana'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EDIT JADWAL & DOSEN PENGAMPU */}
      <FormModal
        open={editingCourse !== null}
        title="Edit Jadwal & Dosen Perkuliahan"
        busy={saveMutation.isPending}
        error={formError}
        onClose={() => {
          setEditingCourse(null);
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
          <strong>{editingCourse?.code}</strong> · {editingCourse?.name} (Semester {editingCourse?.semesterNumber ?? '-'})
        </p>

        <Field label="Dosen Pengampu" htmlFor="lms-lecturer">
          <SearchableSelect
            id="lms-lecturer"
            value={draft.lecturerNidn}
            onChange={(val) => setDraft({ ...draft, lecturerNidn: val })}
            options={lecturerOptions}
            placeholder="Belum ditetapkan"
            emptyLabel="Belum ditetapkan"
            searchPlaceholder="Cari nama atau NIDN dosen..."
            icon={<AcademicCapIcon className="h-4 w-4" />}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Hari" htmlFor="lms-day">
            <SearchableSelect
              id="lms-day"
              value={draft.day}
              onChange={(val) => setDraft({ ...draft, day: val })}
              options={dayOptions}
              placeholder="Belum diatur"
              emptyLabel="Belum diatur"
              searchPlaceholder="Cari hari..."
            />
          </Field>
          <Field label="Jam Mulai" htmlFor="lms-start">
            <input
              id="lms-start"
              type="time"
              className="field-input"
              value={draft.startTime}
              onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
            />
          </Field>
          <Field label="Jam Selesai" htmlFor="lms-end">
            <input
              id="lms-end"
              type="time"
              className="field-input"
              value={draft.endTime}
              onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Ruang Kuliah" htmlFor="lms-room">
          <input
            id="lms-room"
            placeholder="Contoh: Ruang 204 / Lab Komputer"
            className="field-input"
            value={draft.room}
            onChange={(event) => setDraft({ ...draft, room: event.target.value })}
          />
        </Field>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
          Penyimpanan otomatis memperbarui kelas dan memastikan 16 pertemuan aktif di LMS.
        </p>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminLmsJadwal;
