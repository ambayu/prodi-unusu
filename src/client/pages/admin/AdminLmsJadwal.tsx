import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  BookOpenIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ArrowsRightLeftIcon,
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

interface MeetingDraft {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  lecturerName: string;
  isRescheduled: boolean;
  rescheduleReason: string;
  status: string;
}

const EMPTY_MEETING_DRAFT: MeetingDraft = {
  day: 'Senin',
  date: '',
  startTime: '08:00',
  endTime: '09:40',
  room: '',
  lecturerName: '',
  isRescheduled: false,
  rescheduleReason: '',
  status: 'planned',
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
  const [search, setSearch] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [expandedDosenClassId, setExpandedDosenClassId] = useState<number | null>(null);

  const [editingCourse, setEditingCourse] = useState<LmsCourseOffering | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingMeeting, setEditingMeeting] = useState<{
    classroomId: number;
    courseName: string;
    meeting: LmsMeeting;
  } | null>(null);
  const [meetingDraft, setMeetingDraft] = useState<MeetingDraft>(EMPTY_MEETING_DRAFT);
  const [meetingFormError, setMeetingFormError] = useState<string | null>(null);

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

  const totalCredits = useMemo(
    () => courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0),
    [courses],
  );

  const semesterCards = useMemo(
    () =>
      SEMESTERS.map((number) => {
        const list = courses.filter((c) => c.semesterNumber === number);
        return {
          number,
          courseCount: list.length,
          totalCredits: list.reduce((sum, c) => sum + (Number(c.credits) || 0), 0),
        };
      }),
    [courses],
  );

  // Filter semester 1-8 & pencarian kode/nama/dosen
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (selectedSemester !== 'all' && c.semesterNumber !== selectedSemester) {
        return false;
      }
      if (!q) return true;
      const lecturer = (c.classroom?.lecturerName ?? '').toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        lecturer.includes(q)
      );
    });
  }, [courses, selectedSemester, search]);

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

  const openEditMeetingModal = (
    classroomId: number,
    courseName: string,
    meeting: LmsMeeting,
    defaultRoom?: string | null,
    defaultLecturer?: string | null,
  ) => {
    const sched = meeting.schedule;
    setEditingMeeting({ classroomId, courseName, meeting });
    setMeetingDraft({
      day: sched?.day || 'Senin',
      date: sched?.date || '',
      startTime: sched?.startTime || '08:00',
      endTime: sched?.endTime || '09:40',
      room: sched?.room || defaultRoom || '',
      lecturerName: sched?.lecturerName || defaultLecturer || '',
      isRescheduled: Boolean(sched?.isRescheduled),
      rescheduleReason: sched?.rescheduleReason || '',
      status: meeting.status || 'planned',
    });
    setMeetingFormError(null);
  };

  const saveMeetingScheduleMutation = useMutation({
    mutationFn: (resetToRegular: boolean) => {
      if (!editingMeeting) throw new Error('Pertemuan belum dipilih.');
      return lmsAdminApi.saveMeetingSchedule(
        editingMeeting.classroomId,
        editingMeeting.meeting.number,
        resetToRegular
          ? { isRescheduled: false, status: 'planned' }
          : {
              day: meetingDraft.day || null,
              date: meetingDraft.date || null,
              startTime: meetingDraft.startTime || null,
              endTime: meetingDraft.endTime || null,
              room: meetingDraft.room.trim() || null,
              lecturerName: meetingDraft.lecturerName.trim() || null,
              isRescheduled: meetingDraft.isRescheduled,
              rescheduleReason: meetingDraft.isRescheduled ? meetingDraft.rescheduleReason.trim() : null,
              status: meetingDraft.status || null,
            },
      );
    },
    onSuccess: (_, resetToRegular) => {
      toast.success(
        resetToRegular
          ? 'Jadwal pertemuan berhasil dikembalikan ke reguler.'
          : 'Jadwal pertemuan berhasil disimpan dan diperbarui.',
      );
      setEditingMeeting(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-meetings', expandedDosenClassId] });
    },
    onError: (error) =>
      setMeetingFormError(firstFieldError(toApiError(error)) ?? toApiError(error).message),
  });

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
      description={`${courses.length} penawaran mata kuliah • ${assignedCount} sudah ada dosen`}
    >
      <div className="space-y-5">
        <section
          className="rounded-2xl border border-slate-200/90 bg-slate-50/45 p-4 shadow-2xs sm:p-5"
          aria-label="Filter perkuliahan dan jadwal"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#1e3a8a] shadow-2xs ring-1 ring-slate-200/80">
                <FunnelIcon className="h-3.5 w-3.5" />
              </span>
              Pilih tahun kurikulum, semester, atau cari mata kuliah
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
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
                placeholder="Tahun kurikulum..."
                noResultLabel="Belum ada tahun kurikulum."
                clearable={false}
                searchPlaceholder="Cari tahun kurikulum..."
                icon={<CalendarDaysIcon className="h-4 w-4" />}
                dropdownMinWidth={240}
                className="w-full sm:w-48"
                aria-label="Filter berdasarkan tahun kurikulum"
              />
              <div className="relative sm:w-72">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  className="field-input pl-9"
                  placeholder="Cari kode atau nama..."
                  aria-label="Cari kode, nama mata kuliah, atau dosen"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
            <button
              type="button"
              onClick={() => setSelectedSemester('all')}
              className={`group rounded-xl border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] ${
                selectedSemester === 'all'
                  ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-[0_6px_16px_-6px_rgba(30,58,138,0.5)]'
                  : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:border-[#1e3a8a]/40 hover:bg-[#eff6ff]/70'
              }`}
            >
              <span className="block text-sm font-bold tracking-tight">Semua</span>
              <span
                className={`mt-1 block text-[11px] tabular-nums ${
                  selectedSemester === 'all' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                {courses.length} MK · {totalCredits} SKS
              </span>
              <span
                className={`mt-2.5 block h-1 rounded-full transition-colors ${
                  selectedSemester === 'all'
                    ? 'bg-[#fbbf24]'
                    : 'bg-slate-200/90 group-hover:bg-[#1e3a8a]/25'
                }`}
              />
            </button>
            {semesterCards.map((semester) => {
              const selected = selectedSemester === semester.number;
              return (
                <button
                  key={semester.number}
                  type="button"
                  onClick={() => setSelectedSemester(semester.number)}
                  className={`group rounded-xl border p-3 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] ${
                    selected
                      ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-[0_6px_16px_-6px_rgba(30,58,138,0.5)]'
                      : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:border-[#1e3a8a]/40 hover:bg-[#eff6ff]/70'
                  }`}
                >
                  <span className="block text-sm font-bold tracking-tight">
                    Semester {semester.number}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] tabular-nums ${
                      selected ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {semester.courseCount} MK · {semester.totalCredits} SKS
                  </span>
                  <span
                    className={`mt-2.5 block h-1 rounded-full transition-colors ${
                      selected
                        ? 'bg-[#fbbf24]'
                        : 'bg-slate-200/90 group-hover:bg-[#1e3a8a]/25'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {coursesQuery.isLoading ? (
          <LoadingState label="Memuat penawaran mata kuliah kurikulum..." />
        ) : coursesQuery.isError ? (
          <ErrorState message={toApiError(coursesQuery.error).message} onRetry={() => void coursesQuery.refetch()} />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title="Tidak ada mata kuliah"
            description={
              search.trim()
                ? 'Tidak ada mata kuliah yang cocok dengan pencarian Anda.'
                : selectedSemester === 'all'
                ? 'Belum ada mata kuliah pada kurikulum saat ini.'
                : `Tidak ada mata kuliah yang ditawarkan untuk Semester ${selectedSemester}.`
            }
            action={
              search.trim() || selectedSemester !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedSemester('all');
                  }}
                  className="btn-secondary"
                >
                  Reset filter & pencarian
                </button>
              ) : undefined
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
                          className="mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                            <div>
                              <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <ClockIcon className="h-4 w-4 text-[#1e3a8a]" />
                                Rincian 16 Pertemuan Perkuliahan (LMS)
                              </h5>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Menampilkan jadwal tersendiri per pertemuan, materi, tugas, presensi, kuis, dan status pergantian jadwal.
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
                              16 Pertemuan Semester
                            </span>
                          </div>

                          {meetingsQuery.isLoading ? (
                            <div className="py-8 text-center text-xs text-slate-500">
                              Memuat data 16 pertemuan dari LMS...
                            </div>
                          ) : (meetingsQuery.data ?? []).length === 0 ? (
                            <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500 italic">
                              Belum ada daftar pertemuan. Simpan jadwal ulang untuk menyinkronkan 16 pertemuan ke LMS.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                              {(meetingsQuery.data ?? []).map((m: LmsMeeting) => {
                                const isRescheduled = Boolean(m.schedule?.isRescheduled);
                                const isCompleted = m.status === 'completed' || m.status === 'done';
                                const isOngoing = m.status === 'ongoing';

                                return (
                                  <div
                                    key={m.id}
                                    className={`flex flex-col justify-between rounded-xl border p-4 transition-all shadow-2xs ${
                                      isRescheduled
                                        ? 'border-amber-300/80 bg-amber-50/15 ring-1 ring-amber-300/30'
                                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                                    }`}
                                  >
                                    <div>
                                      {/* Baris Atas: Nomor, Judul, Status & Aksi Edit */}
                                      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#1e3a8a] px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                                              P{m.number}
                                            </span>
                                            <h6 className="truncate text-sm font-bold text-slate-900" title={m.title}>
                                              {m.title || `Pertemuan ${m.number}`}
                                            </h6>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {/* Status Pelaksanaan */}
                                          <span
                                            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                              isCompleted
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : isOngoing
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {isCompleted ? 'Selesai' : isOngoing ? 'Berjalan' : 'Rencana'}
                                          </span>

                                          {/* Status Pergantian Jadwal */}
                                          {isRescheduled ? (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs">
                                              <ArrowsRightLeftIcon className="h-3 w-3 text-amber-700" />
                                              Jadwal Diganti
                                            </span>
                                          ) : (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                              <CheckCircleIcon className="h-3 w-3 text-emerald-600" />
                                              Sesuai Jadwal
                                            </span>
                                          )}

                                          {/* Tombol Edit Jadwal Pertemuan */}
                                          {canEdit ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openEditMeetingModal(
                                                  classroom.id,
                                                  course.name,
                                                  m,
                                                  classroom.room,
                                                  dosenName,
                                                )
                                              }
                                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                              title={`Edit jadwal khusus Pertemuan ${m.number}`}
                                            >
                                              <PencilSquareIcon className="h-3.5 w-3.5 text-[#1e3a8a]" />
                                              Edit
                                            </button>
                                          ) : null}
                                        </div>
                                      </div>

                                      {/* Baris Jadwal & Dosen Tersendiri per Pertemuan */}
                                      <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 text-xs text-slate-700 space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <CalendarDaysIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                                            <span>
                                              <strong>Jadwal:</strong>{' '}
                                              {m.schedule?.day || classroom?.day || 'Senin'},{' '}
                                              {m.schedule?.startTime && m.schedule?.endTime
                                                ? `${m.schedule.startTime} - ${m.schedule.endTime}`
                                                : classroom?.startTime && classroom?.endTime
                                                ? `${classroom.startTime} - ${classroom.endTime}`
                                                : '08:00 - 09:40'}
                                            </span>
                                            {m.schedule?.date ? (
                                              <span className="font-mono text-[11px] text-slate-500">
                                                ({m.schedule.date})
                                              </span>
                                            ) : null}
                                          </div>

                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPinIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                                            <span>
                                              <strong>Ruang:</strong> {m.schedule?.room || classroom?.room || 'Belum diatur'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1.5 border-t border-slate-200/50">
                                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                                            <AcademicCapIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                                            <span className="truncate">
                                              <strong>Dosen:</strong> {m.schedule?.lecturerName || dosenName}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <UserGroupIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                            <span>
                                              <strong>Peserta:</strong> {classroom?._count.students ?? 0} Mhs
                                            </span>
                                          </div>
                                        </div>

                                        {/* Keterangan Pergantian Jadwal jika ada */}
                                        {isRescheduled && (
                                          <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 space-y-0.5">
                                            <p className="font-bold flex items-center gap-1 text-amber-950">
                                              <ArrowsRightLeftIcon className="h-3 w-3 text-amber-700" />
                                              Informasi Pergantian Jadwal
                                            </p>
                                            {m.schedule?.rescheduleReason ? (
                                              <p>
                                                <strong>Alasan:</strong> {m.schedule.rescheduleReason}
                                              </p>
                                            ) : null}
                                            {m.schedule?.originalSchedule ? (
                                              <p className="text-[10px] text-amber-800/80">
                                                Jadwal Semula: {m.schedule.originalSchedule}
                                                {m.schedule.originalRoom ? ` (Ruang: ${m.schedule.originalRoom})` : ''}
                                              </p>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>

                                      {/* Detail Pembelajaran LMS: Materi, Tugas, Kuis, Presensi */}
                                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {/* Materi */}
                                        <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                              <BookOpenIcon className="h-3.5 w-3.5 text-emerald-600" />
                                              Materi ({m.materi?.length ?? 0})
                                            </span>
                                          </div>
                                          {(m.materi ?? []).length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic">Belum ada materi</p>
                                          ) : (
                                            <ul className="space-y-1">
                                              {m.materi!.map((mat) => (
                                                <li key={mat.id} className="flex items-start justify-between gap-1 text-[11px]">
                                                  <span className="truncate text-slate-800 font-medium" title={mat.title}>
                                                    {mat.title}
                                                  </span>
                                                  {mat.fileName ? (
                                                    <span className="shrink-0 text-[10px] text-emerald-700 font-semibold" title={mat.fileName}>
                                                      Lampiran
                                                    </span>
                                                  ) : null}
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>

                                        {/* Tugas */}
                                        <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                              <DocumentTextIcon className="h-3.5 w-3.5 text-amber-600" />
                                              Tugas ({m.tugas?.length ?? 0})
                                            </span>
                                          </div>
                                          {(m.tugas ?? []).length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic">Belum ada tugas</p>
                                          ) : (
                                            <ul className="space-y-1">
                                              {m.tugas!.map((tug) => (
                                                <li key={tug.id} className="text-[11px]">
                                                  <p className="truncate font-medium text-slate-800" title={tug.title}>
                                                    {tug.title}
                                                  </p>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                                                    <span>{tug.submissionCount ?? 0} kumpul</span>
                                                    {tug.deadline ? <span className="truncate">Tenggat: {tug.deadline}</span> : null}
                                                  </div>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>

                                        {/* Kuis */}
                                        <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                              <LightBulbIcon className="h-3.5 w-3.5 text-indigo-600" />
                                              Kuis ({m.kuis?.length ?? 0})
                                            </span>
                                          </div>
                                          {(m.kuis ?? []).length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic">Belum ada kuis</p>
                                          ) : (
                                            <ul className="space-y-1">
                                              {m.kuis!.map((kui) => (
                                                <li key={kui.id} className="text-[11px]">
                                                  <p className="truncate font-medium text-slate-800" title={kui.title}>
                                                    {kui.title}
                                                  </p>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                                                    <span>{kui.questionsCount ?? 0} soal</span>
                                                    <span>{kui.submissionCount ?? 0} responden</span>
                                                  </div>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>

                                        {/* Presensi */}
                                        <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-blue-600" />
                                              Presensi
                                            </span>
                                          </div>
                                          {m.presensi?.recorded ? (
                                            <div className="space-y-0.5 text-[11px]">
                                              <p className="font-semibold text-emerald-700">
                                                {m.presensi.attended} hadir dari {m.presensi.totalStudents} mhs
                                              </p>
                                              <p className="text-[10px] text-slate-500">
                                                Tingkat kehadiran: {m.presensi.totalStudents > 0 ? Math.round((m.presensi.attended / m.presensi.totalStudents) * 100) : 0}%
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-[11px] text-slate-400 italic">Presensi belum dicatat dosen</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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

      {/* MODAL EDIT JADWAL PERTEMUAN KHUSUS */}
      <FormModal
        open={editingMeeting !== null}
        title={
          editingMeeting
            ? `Edit Jadwal Pertemuan ${editingMeeting.meeting.number} - ${editingMeeting.courseName}`
            : 'Edit Jadwal Pertemuan'
        }
        busy={saveMeetingScheduleMutation.isPending}
        error={meetingFormError}
        onClose={() => {
          setEditingMeeting(null);
          setMeetingFormError(null);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          setMeetingFormError(null);
          if (meetingDraft.isRescheduled && !meetingDraft.rescheduleReason.trim()) {
            setMeetingFormError('Alasan pergantian jadwal wajib diisi jika status pergantian aktif.');
            return;
          }
          if (meetingDraft.startTime && meetingDraft.endTime && meetingDraft.startTime >= meetingDraft.endTime) {
            setMeetingFormError('Jam selesai harus lebih lambat dari jam mulai.');
            return;
          }
          saveMeetingScheduleMutation.mutate(false);
        }}
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Perubahan ini hanya berlaku untuk <strong>Pertemuan {editingMeeting?.meeting.number}</strong>. Jadwal perkuliahan reguler pertemuan lainnya tetap sesuai jadwal utama.
          </p>

          {/* Toggle Status Pergantian Jadwal */}
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                id="meeting-is-rescheduled"
                checked={meetingDraft.isRescheduled}
                onChange={(event) =>
                  setMeetingDraft((prev) => ({
                    ...prev,
                    isRescheduled: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
              />
              <div className="min-w-0">
                <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                  <ArrowsRightLeftIcon className="h-4 w-4 text-amber-700" />
                  Tandai Sebagai Jadwal Pengganti (Rescheduled)
                </span>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Aktifkan penanda ini jika dosen melakukan pergantian waktu, hari, tanggal, atau ruang perkuliahan.
                </p>
              </div>
            </label>
          </div>

          {meetingDraft.isRescheduled && (
            <Field label="Alasan Pergantian Jadwal" htmlFor="meeting-reschedule-reason" required>
              <textarea
                id="meeting-reschedule-reason"
                rows={2}
                className="field-input"
                value={meetingDraft.rescheduleReason}
                onChange={(event) =>
                  setMeetingDraft((prev) => ({ ...prev, rescheduleReason: event.target.value }))
                }
                placeholder="Contoh: Dosen berhalangan hadir karena dinas luar kota / ujian proposal skripsi"
              />
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hari Perkuliahan" htmlFor="meeting-day">
              <SearchableSelect
                id="meeting-day"
                value={meetingDraft.day}
                onChange={(val) => setMeetingDraft((prev) => ({ ...prev, day: val }))}
                options={dayOptions}
                placeholder="Pilih hari"
                clearable={false}
                searchPlaceholder="Cari hari..."
              />
            </Field>

            <Field label="Tanggal Pelaksanaan (Opsional)" htmlFor="meeting-date">
              <input
                id="meeting-date"
                type="date"
                className="field-input"
                value={meetingDraft.date}
                onChange={(event) => setMeetingDraft((prev) => ({ ...prev, date: event.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Jam Mulai" htmlFor="meeting-start">
              <input
                id="meeting-start"
                type="time"
                className="field-input"
                value={meetingDraft.startTime}
                onChange={(event) => setMeetingDraft((prev) => ({ ...prev, startTime: event.target.value }))}
              />
            </Field>

            <Field label="Jam Selesai" htmlFor="meeting-end">
              <input
                id="meeting-end"
                type="time"
                className="field-input"
                value={meetingDraft.endTime}
                onChange={(event) => setMeetingDraft((prev) => ({ ...prev, endTime: event.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ruang Perkuliahan" htmlFor="meeting-room">
              <input
                id="meeting-room"
                placeholder="Contoh: Ruang A.201 / Lab Komputer"
                className="field-input"
                value={meetingDraft.room}
                onChange={(event) => setMeetingDraft((prev) => ({ ...prev, room: event.target.value }))}
              />
            </Field>

            <Field label="Dosen Pengampu / Pengganti" htmlFor="meeting-lecturer">
              <input
                id="meeting-lecturer"
                placeholder="Nama dosen pengajar sesi ini"
                className="field-input"
                value={meetingDraft.lecturerName}
                onChange={(event) => setMeetingDraft((prev) => ({ ...prev, lecturerName: event.target.value }))}
              />
            </Field>
          </div>

          <Field label="Status Pelaksanaan Pertemuan" htmlFor="meeting-status">
            <select
              id="meeting-status"
              className="field-input"
              value={meetingDraft.status}
              onChange={(event) => setMeetingDraft((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="planned">Rencana (Terjadwal)</option>
              <option value="ongoing">Sedang Berjalan</option>
              <option value="completed">Selesai Terlaksana</option>
            </select>
          </Field>

          {editingMeeting?.meeting.schedule?.isRescheduled ? (
            <button
              type="button"
              disabled={saveMeetingScheduleMutation.isPending}
              onClick={() => saveMeetingScheduleMutation.mutate(true)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Kembalikan ke Jadwal Reguler
            </button>
          ) : null}
        </div>
      </FormModal>
    </AdminLayout>
  );
};

export default AdminLmsJadwal;
