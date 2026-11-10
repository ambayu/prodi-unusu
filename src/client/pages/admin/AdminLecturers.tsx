import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { lecturerApi, type Lecturer } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

const EMPTY: Partial<Lecturer> = {
  name: '',
  nidn: '',
  academicRank: '',
  education: '',
  expertise: '',
  email: '',
  bio: '',
  photoUrl: '',
  isActive: true,
  sortOrder: 0,
};

/** Pengelolaan direktori dosen program studi. */
export const AdminLecturers: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lecturer | null>(null);
  const [draft, setDraft] = useState<Partial<Lecturer>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Lecturer | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const listQuery = useQuery({
    queryKey: ['admin', 'lecturers'],
    queryFn: () => lecturerApi.list().then((res) => res.data.lecturers),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Lecturer>) => {
      const body = {
        ...payload,
        nidn: payload.nidn || null,
        academicRank: payload.academicRank || null,
        education: payload.education || null,
        expertise: payload.expertise || null,
        email: payload.email || null,
        bio: payload.bio || null,
        photoUrl: payload.photoUrl || null,
        sortOrder: Number(payload.sortOrder) || 0,
      };
      return editing ? lecturerApi.update(editing.id, body) : lecturerApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Data dosen berhasil diperbarui.' : 'Data dosen berhasil ditambahkan.');
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lecturers'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Mohon pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    setUploadingPhoto(true);
    try {
      const res = await mediaApi.upload(file);
      setDraft((curr) => ({ ...curr, photoUrl: res.data.asset.url }));
      toast.success('Foto dosen berhasil diunggah.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => lecturerApi.remove(id),
    onSuccess: () => {
      toast.success('Data dosen berhasil dihapus.');
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'lecturers'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (lecturer: Lecturer) => {
    setEditing(lecturer);
    setDraft({ ...lecturer });
    setFormOpen(true);
  };

  const activeCount = useMemo(
    () => (listQuery.data ?? []).filter((lecturer) => lecturer.isActive).length,
    [listQuery.data],
  );

  return (
    <AdminLayout
      title="Direktori Dosen"
      description={`${listQuery.data?.length ?? 0} dosen terdaftar, ${activeCount} berstatus aktif.`}
      actions={
        has('lecturers.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Dosen
          </button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label="Memuat data dosen" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada data dosen"
          description="Tambahkan dosen pertama agar halaman publik Dosen dan widget direktori dosen dapat menampilkannya."
          action={
            has('lecturers.create') ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Tambah Dosen
              </button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-14">Foto</th>
                <th>Nama &amp; Gelar</th>
                <th>NIDN</th>
                <th>Jabatan Akademik</th>
                <th>Bidang Keahlian</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((lecturer) => (
                <tr key={lecturer.id}>
                  <td>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {lecturer.photoUrl ? (
                        <img
                          src={lecturer.photoUrl}
                          alt={lecturer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="block font-bold text-slate-900">{lecturer.name}</span>
                    <span className="block text-[11px] text-slate-500">{lecturer.email ?? 'Email belum diisi'}</span>
                  </td>
                  <td className="font-mono text-[11px]">{lecturer.nidn ?? '-'}</td>
                  <td>{lecturer.academicRank ?? '-'}</td>
                  <td>{lecturer.expertise ?? '-'}</td>
                  <td>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        lecturer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lecturer.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      {has('lecturers.update') ? (
                        <button
                          type="button"
                          onClick={() => openEdit(lecturer)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
                          aria-label={`Ubah data ${lecturer.name}`}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                      {has('lecturers.delete') ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lecturer)}
                          className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                          aria-label={`Hapus data ${lecturer.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
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

      <FormModal
        open={formOpen}
        title={editing ? 'Ubah Data Dosen' : 'Tambah Data Dosen'}
        description="Data ini tampil pada halaman publik Dosen dan widget direktori dosen."
        busy={saveMutation.isPending || uploadingPhoto}
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate(draft);
        }}
      >
        {/* Upload Foto Dosen */}
        <Field label="Foto Profil Dosen" htmlFor="lecturer-photo" hint="Format JPG, PNG, atau WebP. Maksimal 5 MB.">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
              {draft.photoUrl ? (
                <>
                  <img
                    src={draft.photoUrl}
                    alt="Preview Foto"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, photoUrl: '' })}
                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white shadow-xs hover:bg-rose-700"
                    title="Hapus foto"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <UserCircleIcon className="h-10 w-10 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploadingPhoto ? 'Mengunggah...' : 'Pilih & Unggah Foto'}</span>
                <input
                  id="lecturer-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePhotoUpload(file);
                  }}
                />
              </label>

              {draft.photoUrl && (
                <input
                  type="url"
                  className="field-input text-xs font-mono"
                  placeholder="URL Foto..."
                  value={draft.photoUrl}
                  onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
                />
              )}
            </div>
          </div>
        </Field>

        <Field label="Nama lengkap dan gelar" htmlFor="lecturer-name" required>
          <input
            id="lecturer-name"
            className="field-input"
            required
            value={draft.name ?? ''}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIDN / NIDK" htmlFor="lecturer-nidn">
            <input
              id="lecturer-nidn"
              className="field-input"
              value={draft.nidn ?? ''}
              onChange={(event) => setDraft({ ...draft, nidn: event.target.value })}
            />
          </Field>
          <Field label="Jabatan akademik" htmlFor="lecturer-rank">
            <input
              id="lecturer-rank"
              className="field-input"
              placeholder="Asisten Ahli, Lektor, Lektor Kepala"
              value={draft.academicRank ?? ''}
              onChange={(event) => setDraft({ ...draft, academicRank: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pendidikan terakhir" htmlFor="lecturer-education">
            <input
              id="lecturer-education"
              className="field-input"
              placeholder="S2 Ilmu Komputer"
              value={draft.education ?? ''}
              onChange={(event) => setDraft({ ...draft, education: event.target.value })}
            />
          </Field>
          <Field label="Bidang keahlian" htmlFor="lecturer-expertise">
            <input
              id="lecturer-expertise"
              className="field-input"
              value={draft.expertise ?? ''}
              onChange={(event) => setDraft({ ...draft, expertise: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Email" htmlFor="lecturer-email" hint="Kosongkan bila email tidak dipublikasikan.">
          <input
            id="lecturer-email"
            type="email"
            className="field-input"
            value={draft.email ?? ''}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          />
        </Field>

        <Field label="Profil singkat" htmlFor="lecturer-bio">
          <textarea
            id="lecturer-bio"
            className="field-textarea"
            value={draft.bio ?? ''}
            onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
          />
        </Field>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={draft.isActive ?? true}
            onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
          />
          Tampilkan pada website publik
        </label>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus data dosen"
        description={`Data dosen "${deleteTarget?.name ?? ''}" akan dihapus permanen dan hilang dari website publik.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminLecturers;
