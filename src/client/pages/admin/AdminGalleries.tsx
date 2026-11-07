import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { galleryApi, type Gallery } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/** Pengelolaan album galeri kegiatan. */
export const AdminGalleries: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Gallery | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Gallery | null>(null);
  const [itemTarget, setItemTarget] = useState<Gallery | null>(null);
  const [itemDraft, setItemDraft] = useState({ caption: '', mediaUrl: '', mediaType: 'image' });
  const [draft, setDraft] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    coverImageUrl: '',
    eventDate: '',
    isPublished: true,
  });

  const listQuery = useQuery({
    queryKey: ['admin', 'galleries'],
    queryFn: () => galleryApi.list().then((res) => res.data.galleries),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'galleries'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        title: draft.title,
        slug: draft.slug,
        description: draft.description || null,
        category: draft.category || null,
        coverImageUrl: draft.coverImageUrl || null,
        eventDate: draft.eventDate ? new Date(draft.eventDate).toISOString() : null,
        isPublished: draft.isPublished,
      };
      return editing ? galleryApi.update(editing.id, body) : galleryApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Album berhasil diperbarui.' : 'Album berhasil dibuat.');
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

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

  const openCreate = () => {
    setEditing(null);
    setDraft({
      title: '',
      slug: '',
      description: '',
      category: '',
      coverImageUrl: '',
      eventDate: '',
      isPublished: true,
    });
    setFormOpen(true);
  };

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
            <article key={gallery.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                        onClick={() => {
                          setEditing(gallery);
                          setDraft({
                            title: gallery.title,
                            slug: gallery.slug,
                            description: gallery.description ?? '',
                            category: gallery.category ?? '',
                            coverImageUrl: gallery.coverImageUrl ?? '',
                            eventDate: gallery.eventDate ? gallery.eventDate.slice(0, 10) : '',
                            isPublished: gallery.isPublished,
                          });
                          setFormOpen(true);
                        }}
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
        open={formOpen}
        title={editing ? 'Ubah Album' : 'Album Galeri Baru'}
        busy={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <Field label="Judul album" htmlFor="gallery-title" required>
          <input
            id="gallery-title"
            className="field-input"
            required
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value;
              setDraft({ ...draft, title, slug: editing ? draft.slug : toSlug(title) });
            }}
          />
        </Field>

        <Field label="Slug URL" htmlFor="gallery-slug" required>
          <input
            id="gallery-slug"
            className="field-input font-mono"
            required
            value={draft.slug}
            onChange={(event) => setDraft({ ...draft, slug: toSlug(event.target.value) })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="gallery-category">
            <input
              id="gallery-category"
              className="field-input"
              placeholder="Kegiatan Mahasiswa"
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            />
          </Field>
          <Field label="Tanggal kegiatan" htmlFor="gallery-date">
            <input
              id="gallery-date"
              type="date"
              className="field-input"
              value={draft.eventDate}
              onChange={(event) => setDraft({ ...draft, eventDate: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Gambar sampul" htmlFor="gallery-cover" hint="URL gambar, contoh /uploads/media/sampul.jpg">
          <input
            id="gallery-cover"
            className="field-input"
            value={draft.coverImageUrl}
            onChange={(event) => setDraft({ ...draft, coverImageUrl: event.target.value })}
          />
        </Field>

        <Field label="Deskripsi" htmlFor="gallery-description">
          <textarea
            id="gallery-description"
            className="field-textarea"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </Field>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
          />
          Tampilkan pada website publik
        </label>
      </FormModal>

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
        <Field label="URL media" htmlFor="gallery-item-url" required hint="Alamat gambar atau video di dalam aplikasi.">
          <input
            id="gallery-item-url"
            className="field-input"
            required
            value={itemDraft.mediaUrl}
            onChange={(event) => setItemDraft({ ...itemDraft, mediaUrl: event.target.value })}
          />
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
