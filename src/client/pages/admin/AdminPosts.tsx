import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, EyeIcon, EyeSlashIcon, PhotoIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { postApi, type Post } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Membuat slug dari judul agar penulis tidak perlu mengetik slug manual. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Terjadwal',
  published: 'Terbit',
  archived: 'Arsip',
};

/** Pengelolaan berita dan pengumuman program studi. */
export const AdminPosts: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'draft',
    thumbnailUrl: '',
  });

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Mohon pilih file gambar (JPG, PNG, atau WebP).');
      return;
    }
    setUploadingThumb(true);
    try {
      const res = await mediaApi.upload(file);
      setDraft((curr) => ({ ...curr, thumbnailUrl: res.data.asset.url }));
      toast.success('Gambar utama berhasil diunggah.');
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setUploadingThumb(false);
    }
  };

  const listQuery = useQuery({
    queryKey: ['admin', 'posts'],
    queryFn: () => postApi.list({ perPage: 50 }).then((res) => res.data),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt || null,
        content: draft.content,
        thumbnailUrl: draft.thumbnailUrl || null,
        status: draft.status,
      };
      return editing ? postApi.update(editing.id, body) : postApi.create(body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Berita berhasil diperbarui.' : 'Berita berhasil dibuat.');
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) => postApi.publish(id, publish),
    onSuccess: (_data, variables) => {
      toast.success(variables.publish ? 'Berita berhasil diterbitkan.' : 'Berita dikembalikan ke draft.');
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => postApi.remove(id),
    onSuccess: () => {
      toast.success('Berita berhasil dihapus.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft({ title: '', slug: '', excerpt: '', content: '', status: 'draft', thumbnailUrl: '' });
    setFormOpen(true);
  };

  return (
    <AdminLayout
      title="Berita & Pengumuman"
      description="Konten berita hanya tampil di website publik setelah berstatus terbit."
      actions={
        has('posts.create') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tulis Berita
          </button>
        ) : null
      }
    >
      {listQuery.isLoading ? (
        <LoadingState label="Memuat berita" />
      ) : listQuery.isError ? (
        <ErrorState message={toApiError(listQuery.error).message} onRetry={() => void listQuery.refetch()} />
      ) : (listQuery.data?.items ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada berita"
          description="Tulis berita atau pengumuman pertama. Selama masih draft, isinya tidak tampil di website publik."
          action={
            has('posts.create') ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Tulis Berita
              </button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
          <table className="table-base">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Status</th>
                <th>Dilihat</th>
                <th>Diperbarui</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data?.items ?? []).map((post) => (
                <tr key={post.id}>
                  <td>
                    <span className="block font-bold text-slate-900">{post.title}</span>
                    <span className="block font-mono text-[11px] text-slate-500">/{post.slug}</span>
                  </td>
                  <td>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        post.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : post.status === 'draft'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {STATUS_LABEL[post.status] ?? post.status}
                    </span>
                  </td>
                  <td>{post.views}</td>
                  <td className="text-[11px] text-slate-500">
                    {new Date(post.updatedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(post);
                          setDraft({
                            title: post.title,
                            slug: post.slug,
                            excerpt: post.excerpt ?? '',
                            content: post.content,
                            status: post.status,
                            thumbnailUrl: post.thumbnailUrl ?? '',
                          });
                          setFormOpen(true);
                        }}
                        className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Ubah
                      </button>

                      {has('posts.publish') ? (
                        <button
                          type="button"
                          onClick={() =>
                            publishMutation.mutate({ id: post.id, publish: post.status !== 'published' })
                          }
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${
                            post.status === 'published'
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {post.status === 'published' ? (
                            <>
                              <EyeSlashIcon className="h-3 w-3" /> Tarik
                            </>
                          ) : (
                            <>
                              <EyeIcon className="h-3 w-3" /> Terbitkan
                            </>
                          )}
                        </button>
                      ) : null}

                      {has('posts.delete') ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(post)}
                          className="rounded border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                          aria-label={`Hapus ${post.title}`}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
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
        title={editing ? 'Ubah Berita' : 'Tulis Berita'}
        description="Judul akan otomatis membuat slug saat pertama kali diketik."
        busy={saveMutation.isPending}
        wide
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <Field label="Judul berita" htmlFor="post-title" required>
          <input
            id="post-title"
            className="field-input"
            required
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value;
              // Slug hanya diisi otomatis selama belum pernah diubah manual.
              const autoSlug = editing ? draft.slug : draft.slug === toSlug(draft.title) || draft.slug === '';
              setDraft({ ...draft, title, slug: autoSlug ? toSlug(title) : draft.slug });
            }}
          />
        </Field>

        <Field label="Slug URL" htmlFor="post-slug" required hint="Huruf kecil, angka, dan tanda hubung saja.">
          <input
            id="post-slug"
            className="field-input font-mono"
            required
            value={draft.slug}
            onChange={(event) => setDraft({ ...draft, slug: toSlug(event.target.value) })}
          />
        </Field>

        <Field label="Ringkasan Singkat" htmlFor="post-excerpt" hint="Tampil pada daftar cuplikan berita dan kartu beranda.">
          <textarea
            id="post-excerpt"
            className="field-textarea"
            rows={2}
            value={draft.excerpt}
            onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
          />
        </Field>

        <Field label="Isi Berita Lengkap" htmlFor="post-content" required hint="Gunakan toolbar di atas untuk format teks, sub-judul, kutipan, dan sisipkan foto.">
          <RichTextEditor
            value={draft.content}
            onChange={(val) => setDraft({ ...draft, content: val })}
            placeholder="Tuliskan isi warta atau artikel program studi selengkapnya di sini..."
            minHeight="280px"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gambar Utama / Thumbnail" htmlFor="post-thumbnail" hint="Gambar sampul berita pada kartu dan header artikel.">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                  <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                  <span>{uploadingThumb ? 'Mengunggah...' : 'Unggah Sampul'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingThumb}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleThumbnailUpload(file);
                    }}
                  />
                </label>
                {draft.thumbnailUrl && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, thumbnailUrl: '' })}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <input
                id="post-thumbnail"
                className="field-input text-xs font-mono"
                placeholder="URL Gambar Sampul..."
                value={draft.thumbnailUrl}
                onChange={(event) => setDraft({ ...draft, thumbnailUrl: event.target.value })}
              />
            </div>
          </Field>
          <Field label="Status Publikasi" htmlFor="post-status">
            <select
              id="post-status"
              className="field-input"
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="draft">Draft (Disimpan)</option>
              <option value="published">Terbit (Dapat dibaca publik)</option>
              <option value="archived">Arsip</option>
            </select>
          </Field>
        </div>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus berita"
        description={`Berita "${deleteTarget?.title ?? ''}" akan dihapus permanen.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminPosts;
