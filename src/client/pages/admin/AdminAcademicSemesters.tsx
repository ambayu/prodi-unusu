import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { academicSemesterApi, type AcademicSemester } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

const EMPTY_SEMESTER: { code: string; name: string; startDate: string; endDate: string; isActive: boolean } = {
  code: '',
  name: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isActive: true,
};

export const AdminAcademicSemesters: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicSemester | null>(null);
  const [draft, setDraft] = useState(EMPTY_SEMESTER);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSemester | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'academic-semesters'],
    queryFn: () => academicSemesterApi.list().then((res) => res.data.semesters),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return academicSemesterApi.update(editing.id, draft);
      }
      return academicSemesterApi.create(draft);
    },
    onSuccess: () => {
      toast.success(editing ? 'Semester akademik berhasil diperbarui.' : 'Semester akademik baru berhasil ditambahkan.');
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'academic-semesters'] });
    },
    onError: (err) => {
      const apiError = toApiError(err);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => academicSemesterApi.remove(id),
    onSuccess: () => {
      toast.success('Semester akademik berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'academic-semesters'] });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_SEMESTER);
    setFormOpen(true);
  };

  const openEdit = (semester: AcademicSemester) => {
    setEditing(semester);
    setDraft({
      code: semester.code,
      name: semester.name,
      startDate: semester.startDate ? semester.startDate.slice(0, 10) : '',
      endDate: semester.endDate ? semester.endDate.slice(0, 10) : '',
      isActive: semester.isActive,
    });
    setFormOpen(true);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AdminLayout
      title="Master Semester Akademik"
      description="Kelola daftar semester dan rentang tanggal kalender akademik universitas."
      actions={
        has('organization.manage') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Semester
          </button>
        ) : null
      }
    >
      {/*
       * Keadaan loading/galat/kosong ditangani DataTable, sehingga tidak ada
       * lagi percabangan if-else di sini.
       */}
      <DataTable<AcademicSemester>
        rows={listQuery.data ?? []}
        rowKey={(sem) => String(sem.id)}
        loading={listQuery.isLoading}
        loadingLabel="Memuat semester akademik..."
        error={listQuery.isError ? toApiError(listQuery.error).message : null}
        onRetry={() => void listQuery.refetch()}
        emptyTitle="Belum ada semester akademik"
        emptyDescription="Tambahkan semester akademik beserta rentang tanggal untuk menjadi acuan kalender perkuliahan program studi."
        emptyAction={
          has('organization.manage') ? (
            <button type="button" onClick={openCreate} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tambah Semester
            </button>
          ) : null
        }
        minWidth={760}
        columns={[
          {
            key: 'kode',
            header: 'Kode Semester',
            width: 128,
            cellClassName: 'font-mono font-bold text-slate-800',
            render: (sem) => sem.code,
          },
          {
            key: 'nama',
            header: 'Nama Semester',
            /* Satu-satunya kolom tanpa lebar tetap: nama semester bisa panjang. */
            render: (sem) => <div className="font-semibold text-slate-900">{sem.name}</div>,
          },
          {
            key: 'rentang',
            header: 'Rentang Tanggal',
            width: 256,
            render: (sem) => (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                <span>{formatDate(sem.startDate)}</span>
                <span className="text-slate-400">—</span>
                <span>{formatDate(sem.endDate)}</span>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            width: 112,
            align: 'center',
            render: (sem) => (
              <span
                className={[
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                  sem.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {sem.isActive ? 'Aktif' : 'Non-aktif'}
              </span>
            ),
          },
          {
            key: 'aksi',
            header: 'Aksi',
            width: 110,
            align: 'right',
            render: (sem) => (
              <RowActions>
                {has('organization.manage') ? (
                  <>
                    <EditRowButton
                      label="Ubah semester"
                      konteks={sem.name}
                      onClick={() => openEdit(sem)}
                    />
                    <DeleteRowButton
                      label="Hapus semester"
                      konteks={sem.name}
                      onClick={() => setDeleteTarget(sem)}
                    />
                  </>
                ) : null}
              </RowActions>
            ),
          },
        ]}
      />

      <FormModal
        open={formOpen}
        title={editing ? 'Ubah Semester Akademik' : 'Tambah Semester Akademik'}
        busy={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kode Semester" htmlFor="semester-code" required>
            <input
              id="semester-code"
              className="field-input font-mono"
              required
              placeholder="Contoh: 20261"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </Field>
          <Field label="Status Aktif" htmlFor="semester-status">
            <select
              id="semester-status"
              className="field-input"
              value={draft.isActive ? 'true' : 'false'}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.value === 'true' })}
            >
              <option value="true">Aktif</option>
              <option value="false">Tidak Aktif</option>
            </select>
          </Field>
        </div>

        <Field label="Nama Semester" htmlFor="semester-name" required>
          <input
            id="semester-name"
            className="field-input"
            required
            placeholder="Contoh: Semester Ganjil 2026/2027"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tanggal Mulai" htmlFor="semester-start" required>
            <input
              id="semester-start"
              type="date"
              className="field-input"
              required
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
          </Field>
          <Field label="Tanggal Selesai" htmlFor="semester-end" required>
            <input
              id="semester-end"
              type="date"
              className="field-input"
              required
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </Field>
        </div>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Semester Akademik"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name ?? ''}"? Data semester ini akan dihapus dari kalender.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminAcademicSemesters;
