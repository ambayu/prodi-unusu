import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { curriculumApi, type Course, type Curriculum } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

/**
 * Pengelolaan kurikulum: kurikulum, semester, dan mata kuliah.
 *
 * Seluruh angka ringkasan dihitung dari data yang benar-benar tersimpan,
 * bukan dari konstanta, sesuai aturan bahwa statistik akademik berasal dari
 * database.
 */
export const AdminCurriculum: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [curriculumFormOpen, setCurriculumFormOpen] = useState(false);
  const [curriculumDraft, setCurriculumDraft] = useState<{ name: string; year: number; description: string; isActive: boolean }>({
    name: '',
    year: new Date().getFullYear(),
    description: '',
    isActive: true,
  });

  const [semesterFormOpen, setSemesterFormOpen] = useState(false);
  const [semesterTarget, setSemesterTarget] = useState<Curriculum | null>(null);
  const [semesterDraft, setSemesterDraft] = useState({ semesterNumber: 1, title: 'Semester 1' });

  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseTarget, setCourseTarget] = useState<number | null>(null);
  const [courseEditing, setCourseEditing] = useState<Course | null>(null);
  const [courseDraft, setCourseDraft] = useState({
    code: '',
    name: '',
    credits: 3,
    courseType: 'Wajib',
    description: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'curriculum' | 'course'; id: number; label: string } | null>(
    null,
  );

  const listQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: () => curriculumApi.list().then((res) => res.data.curriculums),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculums'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const createCurriculum = useMutation({
    mutationFn: () =>
      curriculumApi.createCurriculum({
        name: curriculumDraft.name,
        year: curriculumDraft.year,
        description: curriculumDraft.description || null,
        isActive: curriculumDraft.isActive,
      }),
    onSuccess: () => {
      toast.success('Kurikulum berhasil dibuat.');
      setCurriculumFormOpen(false);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const createSemester = useMutation({
    mutationFn: () =>
      curriculumApi.createSemester({
        curriculumId: semesterTarget!.id,
        semesterNumber: semesterDraft.semesterNumber,
        title: semesterDraft.title,
      }),
    onSuccess: () => {
      toast.success('Semester berhasil ditambahkan.');
      setSemesterFormOpen(false);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      // Isian SKS dinormalisasi di sini, bukan saat mengetik, supaya pengguna
      // bebas mengosongkan kolom tanpa angka 0 muncul kembali.
      const credits = Number(courseDraft.credits);
      if (!Number.isInteger(credits) || credits < 0) {
        throw new Error('SKS wajib diisi dengan angka 0 sampai 12.');
      }

      if (courseEditing) {
        await curriculumApi.updateCourse(courseEditing.id, {
          code: courseDraft.code,
          name: courseDraft.name,
          credits,
          courseType: courseDraft.courseType,
          description: courseDraft.description || null,
        });
        return;
      }

      await curriculumApi.createCourse({
        semesterId: courseTarget!,
        code: courseDraft.code,
        name: courseDraft.name,
        credits,
        courseType: courseDraft.courseType,
        description: courseDraft.description || null,
      });
    },
    onSuccess: () => {
      toast.success(courseEditing ? 'Mata kuliah berhasil diperbarui.' : 'Mata kuliah berhasil ditambahkan.');
      setCourseFormOpen(false);
      setCourseEditing(null);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (target: { kind: 'curriculum' | 'course'; id: number }) =>
      target.kind === 'curriculum' ? curriculumApi.deleteCurriculum(target.id) : curriculumApi.deleteCourse(target.id),
    onSuccess: () => {
      toast.success('Data berhasil dihapus.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const summary = useMemo(() => {
    const curriculums = listQuery.data ?? [];
    let semesters = 0;
    let courses = 0;
    let credits = 0;
    for (const curriculum of curriculums) {
      semesters += curriculum.semesters.length;
      for (const semester of curriculum.semesters) {
        courses += semester.courses.length;
        for (const course of semester.courses) credits += course.credits;
      }
    }
    return { semesters, courses, credits };
  }, [listQuery.data]);

  return (
    <AdminLayout
      title="Struktur Kurikulum"
      description={`${listQuery.data?.length ?? 0} kurikulum • ${summary.semesters} semester • ${summary.courses} mata kuliah • ${summary.credits} SKS`}
      actions={
        has('curriculum.create') ? (
          <button
            type="button"
            onClick={() => {
              setCurriculumDraft({ name: '', year: new Date().getFullYear(), description: '', isActive: true });
              setCurriculumFormOpen(true);
            }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Kurikulum Baru
          </button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label="Memuat kurikulum" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada kurikulum"
          description="Buat kurikulum terlebih dahulu, lalu tambahkan semester dan mata kuliah di dalamnya."
          action={
            has('curriculum.create') ? (
              <button type="button" onClick={() => setCurriculumFormOpen(true)} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Kurikulum Baru
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {(listQuery.data ?? []).map((curriculum) => {
            const isOpen = expanded[curriculum.id] ?? true;
            const courseCount = curriculum.semesters.reduce((total, semester) => total + semester.courses.length, 0);
            const creditCount = curriculum.semesters.reduce(
              (total, semester) => total + semester.courses.reduce((sum, course) => sum + course.credits, 0),
              0,
            );

            return (
              <section key={curriculum.id} className="rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CBD5E1]/70 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => ({ ...current, [curriculum.id]: !isOpen }))}
                    className="flex min-w-0 items-center gap-2 text-left"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{curriculum.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        Tahun {curriculum.year} • {curriculum.semesters.length} semester • {courseCount} mata kuliah •{' '}
                        {creditCount} SKS
                        {curriculum.isActive ? '' : ' • tidak aktif'}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    {has('curriculum.create') ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSemesterTarget(curriculum);
                          const nextNumber = curriculum.semesters.length + 1;
                          setSemesterDraft({ semesterNumber: nextNumber, title: `Semester ${nextNumber}` });
                          setSemesterFormOpen(true);
                        }}
                        className="btn-secondary"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Semester
                      </button>
                    ) : null}
                    {has('curriculum.delete') ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ kind: 'curriculum', id: curriculum.id, label: curriculum.name })
                        }
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                        aria-label={`Hapus kurikulum ${curriculum.name}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-4 p-5">
                    {curriculum.semesters.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                        Kurikulum ini belum memiliki semester. Tambahkan semester untuk mulai mengisi mata kuliah.
                      </p>
                    ) : (
                      curriculum.semesters.map((semester) => (
                        <div key={semester.id} className="rounded-xl border border-slate-200">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                            <span className="text-xs font-bold text-slate-800">
                              {semester.title}
                              <span className="ml-2 font-normal text-slate-500">
                                {semester.courses.length} mata kuliah •{' '}
                                {semester.courses.reduce((sum, course) => sum + course.credits, 0)} SKS
                              </span>
                            </span>
                            {has('curriculum.create') ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCourseTarget(semester.id);
                                  setCourseEditing(null);
                                  setCourseDraft({ code: '', name: '', credits: 3, courseType: 'Wajib', description: '' });
                                  setCourseFormOpen(true);
                                }}
                                className="text-[11px] font-bold text-[#1e3a8a] transition-colors hover:underline"
                              >
                                + Mata Kuliah
                              </button>
                            ) : null}
                          </div>

                          {semester.courses.length === 0 ? (
                            <p className="px-4 py-4 text-[11px] text-slate-500">Belum ada mata kuliah pada semester ini.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="table-base">
                                <thead>
                                  <tr>
                                    <th className="w-24">Kode</th>
                                    <th>Nama Mata Kuliah</th>
                                    <th className="w-16 text-center">SKS</th>
                                    <th className="w-28">Jenis</th>
                                    <th className="w-32 text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {semester.courses.map((course) => (
                                    <tr key={course.id}>
                                      <td className="font-mono text-[11px]">{course.code}</td>
                                      <td className="font-medium text-slate-800">{course.name}</td>
                                      <td className="text-center">{course.credits}</td>
                                      <td>
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                          {course.courseType}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="flex justify-end gap-1.5">
                                          {has('curriculum.update') ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setCourseTarget(semester.id);
                                                setCourseEditing(course);
                                                setCourseDraft({
                                                  code: course.code,
                                                  name: course.name,
                                                  credits: course.credits,
                                                  courseType: course.courseType,
                                                  description: course.description ?? '',
                                                });
                                                setCourseFormOpen(true);
                                              }}
                                              className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                                            >
                                              Ubah
                                            </button>
                                          ) : null}
                                          {has('curriculum.delete') ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setDeleteTarget({
                                                  kind: 'course',
                                                  id: course.id,
                                                  label: `${course.code} ${course.name}`,
                                                })
                                              }
                                              className="rounded border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                                            >
                                              Hapus
                                            </button>
                                          ) : null}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <FormModal
        open={curriculumFormOpen}
        title="Kurikulum Baru"
        busy={createCurriculum.isPending}
        onClose={() => setCurriculumFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createCurriculum.mutate();
        }}
      >
        <Field label="Nama kurikulum" htmlFor="curriculum-name" required>
          <input
            id="curriculum-name"
            className="field-input"
            required
            placeholder="Kurikulum OBE 2024"
            value={curriculumDraft.name}
            onChange={(event) => setCurriculumDraft({ ...curriculumDraft, name: event.target.value })}
          />
        </Field>
        <Field label="Tahun" htmlFor="curriculum-year" required>
          <input
            id="curriculum-year"
            type="number"
            min={1990}
            max={2100}
            className="field-input"
            required
            value={curriculumDraft.year}
            onChange={(event) => setCurriculumDraft({ ...curriculumDraft, year: Number(event.target.value) })}
          />
        </Field>
        <Field label="Deskripsi" htmlFor="curriculum-description">
          <textarea
            id="curriculum-description"
            className="field-textarea"
            value={curriculumDraft.description}
            onChange={(event) => setCurriculumDraft({ ...curriculumDraft, description: event.target.value })}
          />
        </Field>
      </FormModal>

      <FormModal
        open={semesterFormOpen}
        title="Tambah Semester"
        description={semesterTarget?.name}
        busy={createSemester.isPending}
        onClose={() => setSemesterFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          createSemester.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nomor semester" htmlFor="semester-number" required>
            <input
              id="semester-number"
              type="number"
              min={1}
              max={14}
              className="field-input"
              required
              value={semesterDraft.semesterNumber}
              onChange={(event) => {
                const number = Number(event.target.value);
                setSemesterDraft({ semesterNumber: number, title: `Semester ${number}` });
              }}
            />
          </Field>
          <Field label="Label tampilan" htmlFor="semester-title" required>
            <input
              id="semester-title"
              className="field-input"
              required
              value={semesterDraft.title}
              onChange={(event) => setSemesterDraft({ ...semesterDraft, title: event.target.value })}
            />
          </Field>
        </div>
      </FormModal>

      <FormModal
        open={courseFormOpen}
        title={courseEditing ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'}
        busy={saveCourse.isPending}
        onClose={() => setCourseFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveCourse.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Kode MK" htmlFor="course-code" required>
            <input
              id="course-code"
              className="field-input"
              required
              placeholder="ILK 110"
              value={courseDraft.code}
              onChange={(event) => setCourseDraft({ ...courseDraft, code: event.target.value })}
            />
          </Field>
          <Field label="SKS" htmlFor="course-credits" required>
            <input
              id="course-credits"
              type="number"
              min={0}
              max={12}
              className="field-input"
              required
              value={courseDraft.credits}
              onChange={(event) => {
                const raw = event.target.value;
                // Biarkan kosong saat pengguna menghapus isi; jangan paksa jadi 0,
                // karena `Number('')` adalah 0 dan angka 0 langsung menempel lagi
                // sehingga kursor terasa melompat. Normalisasi dilakukan saat simpan.
                if (raw === '') {
                  setCourseDraft({ ...courseDraft, credits: ('' as unknown) as number });
                  return;
                }
                setCourseDraft({ ...courseDraft, credits: Number(raw) });
              }}
            />
          </Field>
          <Field label="Jenis" htmlFor="course-type" required>
            <select
              id="course-type"
              className="field-input"
              value={courseDraft.courseType}
              onChange={(event) => setCourseDraft({ ...courseDraft, courseType: event.target.value })}
            >
              <option value="Wajib">Wajib</option>
              <option value="Pilihan">Pilihan</option>
              <option value="Praktikum">Praktikum</option>
              <option value="MBKM">MBKM</option>
            </select>
          </Field>
        </div>
        <Field label="Nama mata kuliah" htmlFor="course-name" required>
          <input
            id="course-name"
            className="field-input"
            required
            value={courseDraft.name}
            onChange={(event) => setCourseDraft({ ...courseDraft, name: event.target.value })}
          />
        </Field>
        <Field label="Deskripsi" htmlFor="course-description">
          <textarea
            id="course-description"
            className="field-textarea"
            value={courseDraft.description}
            onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'curriculum' ? 'Hapus kurikulum' : 'Hapus mata kuliah'}
        description={`"${deleteTarget?.label ?? ''}" akan dihapus permanen beserta data turunannya.`}
        busy={removeMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate({ kind: deleteTarget.kind, id: deleteTarget.id });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminCurriculum;
