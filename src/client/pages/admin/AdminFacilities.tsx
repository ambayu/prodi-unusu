import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { facilityApi, type Facility } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Format berkas gambar yang diterima seluruh unggahan gambar di panel admin. */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

const EMPTY: Partial<Facility> = {
  name: '',
  category: 'Laboratorium',
  location: '',
  description: '',
  status: 'aktif',
  sortOrder: 0,
};

/** Pengelolaan sarana dan prasarana program studi. */
export const AdminFacilities: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [draft, setDraft] = useState<Partial<Facility>>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar valid (JPG, PNG, WebP).');
      return;
    }
    setUploadingImage(true);
    try {
      const res = await mediaApi.upload(file);
      setDraft((prev) => ({ ...prev, imageUrl: res.data.asset.url }));
      toast.success('Foto fasilitas berhasil diunggah.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const listQuery = useQuery({
    queryKey: ['admin', 'facilities'],
    queryFn: () => facilityApi.list().then((res) => res.data.facilities),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name,
        category: draft.category,
        location: draft.location || null,
        description: draft.description || null,
        imageUrl: draft.imageUrl || null,
        status: draft.status,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      return editing ? facilityApi.update(editing.id, body) : facilityApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Fasilitas berhasil diperbarui.' : 'Fasilitas berhasil ditambahkan.');
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => facilityApi.remove(id),
    onSuccess: () => {
      toast.success('Fasilitas berhasil dihapus.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY);
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Sarana & Prasarana"
      description={`${listQuery.data?.length ?? 0} fasilitas terdaftar pada program studi ini.`}
      actions={
        has('facilities.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Fasilitas
          </button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label="Memuat fasilitas" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada fasilitas"
          description="Tambahkan laboratorium, ruang kelas, atau perpustakaan agar tampil pada halaman Sarpras."
          action={
            has('facilities.create') ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Tambah Fasilitas
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(listQuery.data ?? []).map((facility) => (
            <article key={facility.id} className="overflow-hidden rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs flex flex-col">
              <div className="relative h-40 w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                <img
                  src={facility.imageUrl || '/logo-unusu.jpg'}
                  alt={`Foto ${facility.name}`}
                  className={`h-full w-full object-cover transition-transform duration-300 hover:scale-105 ${
                    !facility.imageUrl ? 'opacity-40 grayscale object-contain p-6' : ''
                  }`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/logo-unusu.jpg')) {
                      target.src = '/logo-unusu.jpg';
                      target.className = 'h-full w-full object-contain p-6 opacity-40 grayscale';
                    }
                  }}
                />
                {!facility.imageUrl ? (
                  <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                    Gambar Default
                  </span>
                ) : null}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-900">{facility.name}</h2>
                    <p className="text-[11px] text-slate-500">
                      {facility.category}
                      {facility.location ? ` • ${facility.location}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      facility.status === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {facility.status}
                  </span>
                </div>

                {facility.description ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{facility.description}</p>
                ) : null}

                <div className="mt-auto pt-4 flex justify-end gap-1.5">
                  {has('facilities.update') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(facility);
                        setDraft({ ...facility });
                        setFormOpen(true);
                      }}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
                      aria-label={`Ubah ${facility.name}`}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                  {has('facilities.delete') ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(facility)}
                      className="rounded-lg border border-rose-200 p-1.5 text-rose-600 transition-colors hover:bg-rose-50"
                      aria-label={`Hapus ${facility.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <FormModal
        open={formOpen}
        title={editing ? 'Ubah Fasilitas' : 'Tambah Fasilitas'}
        busy={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <Field label="Nama fasilitas" htmlFor="facility-name" required>
          <input
            id="facility-name"
            className="field-input"
            required
            value={draft.name ?? ''}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="facility-category" required>
            <input
              id="facility-category"
              className="field-input"
              required
              list="facility-categories"
              value={draft.category ?? ''}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            />
            <datalist id="facility-categories">
              <option value="Laboratorium" />
              <option value="Ruang Kelas" />
              <option value="Perpustakaan" />
              <option value="Ruang Dosen" />
              <option value="Aula" />
            </datalist>
          </Field>
          <Field label="Lokasi" htmlFor="facility-location">
            <input
              id="facility-location"
              className="field-input"
              placeholder="Gedung A Lantai 2"
              value={draft.location ?? ''}
              onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Status" htmlFor="facility-status">
          <select
            id="facility-status"
            className="field-input"
            value={draft.status ?? 'aktif'}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          >
            <option value="aktif">Aktif</option>
            <option value="renovasi">Renovasi</option>
            <option value="tidak aktif">Tidak aktif</option>
          </select>
        </Field>

        <Field
          label="Foto Fasilitas"
          htmlFor="facility-image"
          hint="Unggah foto fasilitas (format JPG, PNG, atau WebP). Bila dikosongkan, sistem akan otomatis menggunakan gambar default kampus."
        >
          <div className="space-y-3">
            {draft.imageUrl ? (
              <div className="relative inline-block overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={draft.imageUrl}
                  alt="Pratinjau Fasilitas"
                  className="h-36 w-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, imageUrl: '' })}
                  title="Hapus foto"
                  className="absolute right-2 top-2 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex h-36 w-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center">
                <div className="flex flex-col items-center gap-1.5 text-slate-500">
                  <PhotoIcon className="h-8 w-8 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-600">Belum ada foto</span>
                  <span className="text-[10px] text-slate-400">(Default logo kampus akan dipakai)</span>
                </div>
              </div>
            )}

            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors">
                <ArrowUpTrayIcon className="h-4 w-4 text-[#1e3a8a]" />
                <span>{uploadingImage ? 'Mengunggah...' : draft.imageUrl ? 'Ganti Foto' : 'Unggah Foto Fasilitas'}</span>
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  disabled={uploadingImage}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
        </Field>

        <Field label="Deskripsi" htmlFor="facility-description">
          <textarea
            id="facility-description"
            className="field-textarea"
            value={draft.description ?? ''}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus fasilitas"
        description={`Fasilitas "${deleteTarget?.name ?? ''}" akan dihapus dari daftar sarana dan prasarana.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminFacilities;
