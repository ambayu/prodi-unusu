import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  MapPinIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormModal, Field } from '../../components/ui/FormModal';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { firstFieldError, toApiError } from '../../services/api';
import { lecturerApi } from '../../services/contentApi';
import {
  lmsAdminApi,
  type LmsClassroom,
  type LmsStudentRow,
  type LmsSyncRow,
} from '../../services/lmsAdminApi';

/**
 * Manajemen LMS — Jadwal & Kelas (`/admin/lms/jadwal`).
 *
 * Data operasional perkuliahan (hari, jam, ruang, rombel, dosen pengampu)
 * sengaja TIDAK disimpan di master kurikulum: satu penawaran mata kuliah dapat
 * dibuka pada beberapa kelas dengan jadwal berbeda. Seluruh data di halaman ini
 * yang ditarik LMS lewat ONE UNUSU API Hub.
 */

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface Draft {
  curriculumItemId: string;
  group: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  lecturerNidn: string;
}

const DRAFT_KOSONG: Draft = {
  curriculumItemId: '',
  group: 'Utama',
  day: 'Senin',
  startTime: '08:00',
  endTime: '09:40',
  room: '',
  lecturerNidn: '',
};

const labelJadwal = (kelas: LmsClassroom) => {
  const jam = kelas.startTime && kelas.endTime ? `${kelas.startTime}–${kelas.endTime}` : null;
  return [kelas.day, jam].filter(Boolean).join(', ') || 'Belum diatur';
};

export const AdminLmsJadwal: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const canEdit = has('curriculum.update');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LmsClassroom | null>(null);
  const [draft, setDraft] = useState<Draft>(DRAFT_KOSONG);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LmsClassroom | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['admin', 'lms-courses'],
    queryFn: () => lmsAdminApi.courses().then((res) => res.data.courses),
  });

  const classroomsQuery = useQuery({
    queryKey: ['admin', 'lms-classrooms'],
    queryFn: () => lmsAdminApi.classrooms().then((res) => res.data.classrooms),
  });

  // Dosen pengampu diambil dari direktori API Hub, sama seperti halaman Dosen.
  const lecturersQuery = useQuery({
    queryKey: ['admin', 'lecturers', 'lms'],
    queryFn: () => lecturerApi.all().then((res) => res.data.lecturers),
  });

  const courses = coursesQuery.data ?? [];
  const classrooms = classroomsQuery.data ?? [];
  const lecturers = lecturersQuery.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<number, LmsClassroom[]>();
    for (const kelas of classrooms) {
      const list = map.get(kelas.curriculumItem.id) ?? [];
      list.push(kelas);
      map.set(kelas.curriculumItem.id, list);
    }
    return [...map.entries()].map(([, list]) => ({
      mataKuliah: list[0].curriculumItem,
      kelas: list,
    }));
  }, [classrooms]);

  const resetForm = () => {
    setDraft(DRAFT_KOSONG);
    setFormError(null);
    setEditing(null);
  };

  const openCreate = (curriculumItemId?: number) => {
    resetForm();
    setDraft({ ...DRAFT_KOSONG, curriculumItemId: curriculumItemId ? String(curriculumItemId) : '' });
    setModalOpen(true);
  };

  const openEdit = (kelas: LmsClassroom) => {
    setDraft({
      curriculumItemId: String(kelas.curriculumItemId),
      group: kelas.group,
      day: kelas.day ?? '',
      startTime: kelas.startTime ?? '',
      endTime: kelas.endTime ?? '',
      room: kelas.room ?? '',
      lecturerNidn: kelas.lecturerNidn ?? '',
    });
    setFormError(null);
    setEditing(kelas);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const dosen = lecturers.find((d) => (d.nidn ?? '') === draft.lecturerNidn);
      const payload = {
        curriculumItemId: Number(draft.curriculumItemId),
        group: draft.group.trim() || 'Utama',
        day: draft.day || null,
        startTime: draft.startTime || null,
        endTime: draft.endTime || null,
        room: draft.room.trim() || null,
        lecturerNidn: draft.lecturerNidn || null,
        lecturerName: dosen?.name ?? null,
      };
      return editing
        ? lmsAdminApi.updateClassroom(editing.id, payload)
        : lmsAdminApi.createClassroom(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Kelas LMS berhasil diperbarui.' : 'Kelas LMS berhasil dibuat.');
      setModalOpen(false);
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-classrooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-courses'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setFormError(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => lmsAdminApi.removeClassroom(id),
    onSuccess: () => {
      toast.success('Kelas LMS berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-classrooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lms-courses'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  // Hasil sinkron disimpan agar kelas yang gagal (mis. kode MK belum ada di LMS)
  // dapat ditampilkan satu per satu, bukan hilang bersama toast.
  const [syncRows, setSyncRows] = useState<LmsSyncRow[] | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => lmsAdminApi.sinkron(),
    onSuccess: (res) => {
      const gagal = res.data.hasil.filter((row) => row.status === 'gagal');
      setSyncRows(res.data.hasil);
      if (gagal.length === 0) {
        toast.success(res.data.message);
      } else {
        toast.error(`${gagal.length} kelas gagal disinkronkan. Lihat rincian di bawah.`);
      }
    },
    onError: (error) => {
      setSyncRows(null);
      toast.error(toApiError(error).message);
    },
  });

  const loading = classroomsQuery.isLoading || coursesQuery.isLoading;
  const errorMessage = classroomsQuery.isError
    ? toApiError(classroomsQuery.error).message
    : coursesQuery.isError
    ? toApiError(coursesQuery.error).message
    : null;

  return (
    <AdminLayout
      title="Jadwal & Kelas LMS"
      description={`${classrooms.length} kelas • jadwal, ruang, dan dosen pengampu`}
      actions={
        canEdit && courses.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSyncRows(null);
                syncMutation.mutate();
              }}
              disabled={syncMutation.isPending || classrooms.length === 0}
              className="btn-secondary"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              {syncMutation.isPending ? 'Menyinkronkan...' : 'Sinkronkan ke LMS'}
            </button>
            <button type="button" onClick={() => openCreate()} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Buka Kelas Baru
            </button>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {syncRows && syncRows.length > 0 ? (
          <section className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Hasil Sinkronisasi
              </h2>
              <button
                type="button"
                onClick={() => setSyncRows(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Tutup
              </button>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {syncRows.map((row) => (
                <li key={row.prodiClassId} className="flex flex-wrap items-center gap-2">
                  {row.status === 'tersinkron' ? (
                    <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircleIcon className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                  )}
                  <span className="font-mono font-semibold text-slate-800">{row.kodeMk}</span>
                  <span className={row.status === 'tersinkron' ? 'text-emerald-700' : 'text-rose-700'}>
                    {row.status === 'tersinkron'
                      ? `tersinkron${row.pesertaBaru ? ` · ${row.pesertaBaru} peserta baru` : ''}${
                          row.dosenTerhubung === false ? ' · dosen belum terhubung' : ''
                        }`
                      : row.alasan}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {loading ? (
          <div className="card p-6 text-sm text-slate-500">Memuat kelas LMS...</div>
        ) : errorMessage ? (
          <div className="card p-6 text-sm text-rose-700">{errorMessage}</div>
        ) : courses.length === 0 ? (
          <div className="card p-8 text-center space-y-2">
            <p className="font-semibold text-slate-800">Belum ada penawaran mata kuliah</p>
            <p className="text-sm text-slate-500">
              Tambahkan mata kuliah pada menu Kurikulum terlebih dahulu, lalu kembali ke sini untuk
              mengatur jadwal kelasnya.
            </p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="card p-8 text-center space-y-2">
            <p className="font-semibold text-slate-800">Belum ada kelas LMS</p>
            <p className="text-sm text-slate-500">
              Buka kelas baru untuk menetapkan jadwal, ruang, dan dosen pengampu.
            </p>
          </div>
        ) : (
          grouped.map(({ mataKuliah, kelas }) => (
            <section key={mataKuliah.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {mataKuliah.course.code} · Semester {mataKuliah.semesterNumber ?? '-'} ·{' '}
                    {mataKuliah.credits} SKS
                  </p>
                  <h2 className="text-sm font-bold text-slate-900">{mataKuliah.course.name}</h2>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => openCreate(mataKuliah.id)}
                    className="btn-secondary"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Tambah Kelas
                  </button>
                ) : null}
              </header>

              <ul className="divide-y divide-slate-100">
                {kelas.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-700">
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-bold text-blue-900">
                        {item.group}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                        {labelJadwal(item)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4 text-slate-400" />
                        {item.room || 'Ruang belum diatur'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <AcademicCapIcon className="h-4 w-4 text-slate-400" />
                        {item.lecturerName || 'Dosen belum ditetapkan'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserGroupIcon className="h-4 w-4 text-slate-400" />
                        {item._count.students} peserta
                      </span>
                    </div>
                    {canEdit ? (
                      <RowActions>
                        <EditRowButton
                          label="Ubah jadwal kelas"
                          konteks={`${mataKuliah.course.code} ${item.group}`}
                          onClick={() => openEdit(item)}
                        />
                        <DeleteRowButton
                          label="Hapus kelas"
                          konteks={`${mataKuliah.course.code} ${item.group}`}
                          onClick={() => setDeleteTarget(item)}
                        />
                      </RowActions>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <FormModal
        open={modalOpen}
        title={editing ? 'Ubah Kelas LMS' : 'Buka Kelas LMS'}
        busy={saveMutation.isPending}
        error={formError}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!draft.curriculumItemId) {
            setFormError('Pilih mata kuliah terlebih dahulu.');
            return;
          }
          if (draft.startTime && draft.endTime && draft.startTime >= draft.endTime) {
            setFormError('Jam selesai harus lebih lambat dari jam mulai.');
            return;
          }
          saveMutation.mutate();
        }}
      >
        <Field label="Mata Kuliah" htmlFor="lms-item" required>
          <select
            id="lms-item"
            className="field-input"
            value={draft.curriculumItemId}
            disabled={Boolean(editing)}
            onChange={(event) => setDraft({ ...draft, curriculumItemId: event.target.value })}
          >
            <option value="">— Pilih mata kuliah —</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                Semester {course.semesterNumber ?? '-'} · {course.code} — {course.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Nama Kelas / Rombel" htmlFor="lms-group" required hint="Contoh: Utama, A, B, Sore.">
          <input
            id="lms-group"
            className="field-input"
            value={draft.group}
            onChange={(event) => setDraft({ ...draft, group: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Hari" htmlFor="lms-day">
            <select
              id="lms-day"
              className="field-input"
              value={draft.day}
              onChange={(event) => setDraft({ ...draft, day: event.target.value })}
            >
              <option value="">—</option>
              {HARI.map((hari) => (
                <option key={hari} value={hari}>
                  {hari}
                </option>
              ))}
            </select>
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

        <Field label="Ruang Kuliah" htmlFor="lms-room" hint="Contoh: Lab Komputer 1, Ruang 302, Online.">
          <input
            id="lms-room"
            className="field-input"
            value={draft.room}
            onChange={(event) => setDraft({ ...draft, room: event.target.value })}
          />
        </Field>

        <Field label="Dosen Pengampu" htmlFor="lms-lecturer" hint="Daftar dosen berasal dari ONE UNUSU API Hub.">
          <select
            id="lms-lecturer"
            className="field-input"
            value={draft.lecturerNidn}
            onChange={(event) => setDraft({ ...draft, lecturerNidn: event.target.value })}
          >
            <option value="">— Belum ditetapkan —</option>
            {lecturers
              .filter((dosen) => dosen.nidn)
              .map((dosen) => (
                <option key={dosen.id} value={dosen.nidn ?? ''}>
                  {dosen.name} — {dosen.nidn}
                </option>
              ))}
          </select>
        </Field>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ClockIcon className="h-3.5 w-3.5" />
          Jadwal ini tampil pada kartu kelas dan halaman detail kelas di LMS.
        </p>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus kelas LMS"
        description={`Kelas "${deleteTarget?.group ?? ''}" untuk ${deleteTarget?.curriculumItem.course.code ?? ''} akan dihapus beserta daftar pesertanya. Kurikulum tidak terpengaruh.`}
        busy={removeMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMutation.mutate(deleteTarget.id)}
        confirmLabel="Hapus kelas"
      />
    </AdminLayout>
  );
};

export default AdminLmsJadwal;