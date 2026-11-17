import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, PhotoIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { galleryApi, type Gallery } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Pengelolaan album galeri kegiatan. */
export const AdminGalleries: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Gallery | null>(null);
  const [itemTarget, setItemTarget] = useState<Gallery | null>(null);
  const [itemDraft, setItemDraft] = useState({ caption: '', mediaUrl: '', mediaType: 'image' });
  const [uploadingItemMedia, setUploadingItemMedia] = useState(false);

  const handleItemMediaUpload = async (file: File) => {
    setUploadingItemMedia(true);
    try {
      const res = await mediaApi.upload(file);
      setItemDraft((curr) => ({ ...curr, mediaUrl: res.data.asset.url }));
      toast.success('Media berhasil diunggah.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploadingItemMedia(false);
    }
  };

  const listQuery = useQuery({
    queryKey: ['admin', 'galleries'],
    queryFn: () => galleryApi.list().then((res) => res.data.galleries),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'galleries'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => galleryApi.remove(id),
    onSuccess: () => {
      toast.success('Album berhasil dihapus.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      galleryApi.addItem(itemTarget!.id, {
        caption: itemDraft.caption || null,
        mediaUrl: itemDraft.mediaUrl,
        mediaType: itemDraft.mediaType,
      }),
    onSuccess: () => {
      toast.success('Item galeri berhasil ditambahkan.');
      setItemTarget(null);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const openCreate = () => navigate('/admin/galeri/baru');

  return (
    <AdminLayout
      title="Galeri Kegiatan"
      description={`${listQuery.data?.length ?? 0} album terdaftar.`}
      actions={
        has('galleries.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Album Baru
          </button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label="Memuat galeri" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada album galeri"
          description="Buat album untuk mendokumentasikan kegiatan program studi."
          action={
            has('galleries.create') ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Album Baru
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(listQuery.data ?? []).map((gallery) => (
            <article key={gallery.id} className="overflow-hidden rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
              <div className="flex h-36 items-center justify-center bg-slate-100">
                {gallery.coverImageUrl ? (
                  <img
                    src={gallery.coverImageUrl}
                    alt={`Sampul album ${gallery.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PhotoIcon className="h-10 w-10 text-slate-400" />
                )}
              </div>

              <div className="p-4">
                <h2 className="truncate text-sm font-bold text-slate-900">{gallery.title}</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {gallery._count?.items ?? 0} item
                  {gallery.eventDate
                    ? ` • ${new Date(gallery.eventDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`
                    : ''}
                </p>

                <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                  {has('galleries.update') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setItemTarget(gallery);
                          setItemDraft({ caption: '', mediaUrl: '', mediaType: 'image' });
                        }}
                        className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        + Item
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/galeri/${gallery.id}/ubah`)}
                        className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Ubah
                      </button>
                    </>
                  ) : null}
                  {has('galleries.delete') ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(gallery)}
                      className="rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                      aria-label={`Hapus album ${gallery.title}`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <FormModal
        open={itemTarget !== null}
        title="Tambah Item Galeri"
        description={itemTarget?.title}
        busy={addItemMutation.isPending}
        onClose={() => setItemTarget(null)}
        onSubmit={(event) => {
          event.preventDefault();
          addItemMutation.mutate();
        }}
      >
        <Field label="Unggah Berkas Media" htmlFor="gallery-item-upload" required hint="Unggah foto atau berkas video dokumentasi kegiatan.">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white shadow-2xs">
              {itemDraft.mediaUrl ? (
                <>
                  <img
                    src={itemDraft.mediaUrl}
                    alt="Media Item"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setItemDraft({ ...itemDraft, mediaUrl: '' })}
                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-0.5 text-white shadow-xs hover:bg-rose-700"
                    title="Hapus media"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <PhotoIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploadingItemMedia ? 'Mengunggah...' : 'Pilih Berkas Media'}</span>
                <input
                  id="gallery-item-upload"
                  type="file"
                  accept="image/*,video/*"
                  disabled={uploadingItemMedia}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleItemMediaUpload(file);
                  }}
                />
              </label>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {itemDraft.mediaUrl || 'Pilih berkas dari perangkat Anda'}
              </p>
            </div>
          </div>
        </Field>

        <Field label="Jenis media" htmlFor="gallery-item-type">
          <select
            id="gallery-item-type"
            className="field-input"
            value={itemDraft.mediaType}
            onChange={(event) => setItemDraft({ ...itemDraft, mediaType: event.target.value })}
          >
            <option value="image">Gambar</option>
            <option value="video">Video</option>
          </select>
        </Field>

        <Field label="Keterangan" htmlFor="gallery-item-caption">
          <input
            id="gallery-item-caption"
            className="field-input"
            value={itemDraft.caption}
            onChange={(event) => setItemDraft({ ...itemDraft, caption: event.target.value })}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus album galeri"
        description={`Album "${deleteTarget?.title ?? ''}" beserta seluruh itemnya akan dihapus permanen.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminGalleries;
