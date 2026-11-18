import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormModal, Field } from '../../components/ui/FormModal';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { courseMasterApi, type CourseMaster } from '../../services/contentApi';
import { firstFieldError, toApiError } from '../../services/api';

/**
 * Master mata kuliah program studi (`/admin/mata-kuliah`).
 *
 * Sesuai keputusan pemilik sistem 2026-11-16 (ADR-006), halaman ini **hanya**
 * mengelola identitas mata kuliah: **kode dan nama**. Bobot SKS, semester,
 * dosen pengampu, dan RPS diisi di menu **Kurikulum**, karena detail itu milik
 * penawaran (`curriculum_items`) dan boleh berbeda antarkurikulum.
 *
 * Pemisahan ini membuat satu mata kuliah dapat ditawarkan pada beberapa
 * kurikulum sekaligus tanpa menduplikasi namanya.
 */
export const AdminCourses: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseMaster | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ code: '', name: '' });
  const [deleteTarget, setDeleteTarget] = useState<CourseMaster | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['admin', 'master-courses'],
    queryFn: () => courseMasterApi.list().then((res) => res.data.courses),
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return courses;
    return courses.filter(
      (course) =>
        course.code.toLowerCase().includes(keyword) || course.name.toLowerCase().includes(keyword),
    );
  }, [courses, search]);

  const resetForm = () => {
    setDraft({ code: '', name: '' });
    setFormError(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (course: CourseMaster) => {
    setDraft({ code: course.code, name: course.name });
    setFormError(null);
    setEditing(course);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? courseMasterApi.update(editing.id, { code: draft.code.trim(), name: draft.name.trim() })
        : courseMasterApi.create({ code: draft.code.trim(), name: draft.name.trim() }),
    onSuccess: () => {
      toast.success(editing ? 'Mata kuliah berhasil diperbarui.' : 'Mata kuliah berhasil ditambahkan.');
      setModalOpen(false);
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'master-courses'] });
      // Daftar penawaran menampilkan kode & nama master, jadi ikut disegarkan.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setFormError(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => courseMasterApi.remove(id),
    onSuccess: () => {
      toast.success('Mata kuliah berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'master-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <AdminLayout
      title="Mata Kuliah"
      description={`${filtered.length} mata kuliah • kode dan nama`}
      actions={
        has('curriculum.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Mata Kuliah
          </button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="field-input pl-9"
            placeholder="Cari kode atau nama mata kuliah..."
            aria-label="Cari kode atau nama mata kuliah"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {/*
         * Keadaan memuat/galat/kosong ditangani DataTable. Keadaan kosong
         * dibedakan menurut penyebabnya: belum ada master sama sekali, atau
         * hasil pencarian yang tidak menemukan apa pun.
         */}
        <DataTable<CourseMaster>
          rows={filtered}
          rowKey={(course) => String(course.id)}
          loading={coursesQuery.isLoading}
          loadingLabel="Memuat mata kuliah"
          error={coursesQuery.isError ? toApiError(coursesQuery.error).message : null}
          onRetry={() => void coursesQuery.refetch()}
          emptyTitle={
            courses.length === 0 ? 'Belum ada mata kuliah' : 'Tidak ada mata kuliah yang cocok'
          }
          emptyDescription={
            courses.length === 0
              ? 'Tambahkan mata kuliah pertama untuk mulai menyusun daftar.'
              : 'Ubah kata kunci pencarian untuk melihat mata kuliah lainnya.'
          }
          emptyAction={
            courses.length === 0 ? (
              has('curriculum.create') ? (
                <button type="button" onClick={openCreate} className="btn-primary">
                  <PlusIcon className="h-4 w-4" />
                  Tambah Mata Kuliah
                </button>
              ) : null
            ) : (
              <button type="button" onClick={() => setSearch('')} className="btn-secondary">
                Kosongkan pencarian
              </button>
            )
          }
          minWidth={640}
          footer={
            <p className="text-[11px] text-slate-500">
              Menampilkan {filtered.length} dari {courses.length} mata kuliah
            </p>
          }
          columns={
            [
              {
                key: 'kode',
                header: 'Kode',
                width: 128,
                cellClassName: 'font-mono text-xs font-semibold text-slate-700',
                render: (course) => course.code,
              },
              {
                key: 'nama',
                header: 'Nama Mata Kuliah',
                cellClassName: 'text-xs font-semibold text-slate-800',
                render: (course) => course.name,
              },
              {
                key: 'aksi',
                header: 'Aksi',
                width: 110,
                align: 'right',
                render: (course) => (
                  <RowActions>
                    {has('curriculum.update') ? (
                      <EditRowButton
                        label="Ubah mata kuliah"
                        konteks={course.name}
                        onClick={() => openEdit(course)}
                      />
                    ) : null}
                    {has('curriculum.delete') ? (
                      <DeleteRowButton
                        label="Hapus mata kuliah"
                        konteks={course.name}
                        onClick={() => setDeleteTarget(course)}
                      />
                    ) : null}
                  </RowActions>
                ),
              },
            ] satisfies Array<DataTableColumn<CourseMaster>>
          }
        />
      </div>

      <FormModal
        open={modalOpen}
        title={editing ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'}
        busy={saveMutation.isPending}
        error={formError}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          if (!draft.code.trim()) {
            setFormError('Kode mata kuliah wajib diisi.');
            return;
          }
          if (draft.name.trim().length < 2) {
            setFormError('Nama mata kuliah minimal 2 karakter.');
            return;
          }
          saveMutation.mutate();
        }}
      >
        <Field label="Kode Mata Kuliah" htmlFor="course-code" required hint="Contoh: SI101">
          <input
            id="course-code"
            className="field-input"
            placeholder="SI101"
            value={draft.code}
            onChange={(event) => setDraft({ ...draft, code: event.target.value })}
          />
        </Field>
        <Field label="Nama Mata Kuliah" htmlFor="course-name" required>
          <input
            id="course-name"
            className="field-input"
            placeholder="Pengantar Sistem Informasi"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus mata kuliah"
        description={`"${deleteTarget?.code ?? ''} ${deleteTarget?.name ?? ''}" akan dihapus permanen beserta seluruh penawarannya di kurikulum dan RPS-nya.`}
        busy={removeMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminCourses;
