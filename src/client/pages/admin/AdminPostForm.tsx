import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { FormPageTemplate, type FormSection } from '../../components/ui/FormPageTemplate';
import { Field } from '../../components/ui/FormModal';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { postApi } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { firstFieldError, toApiError } from '../../services/api';
import { toSlug } from '../../utils/slug';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const DAFTAR = '/admin/berita';

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  thumbnailUrl: string;
}

const DRAFT_KOSONG: Draft = { title: '', slug: '', excerpt: '', content: '', status: 'draft', thumbnailUrl: '' };

/** Halaman tulis/ubah berita (`/admin/berita/baru` dan `/admin/berita/:id/ubah`). */
export const AdminPostForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(DRAFT_KOSONG);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const postQuery = useQuery({
    queryKey: ['admin', 'posts', id],
    queryFn: () => postApi.get(Number(id)).then((res) => res.data.post),
    enabled: isEdit,
  });

  useEffect(() => {
    const post = postQuery.data;
    if (!post) return;
    setDraft({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content,
      status: post.status,
      thumbnailUrl: post.thumbnailUrl ?? '',
    });
  }, [postQuery.data]);

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
      return isEdit ? postApi.update(Number(id), body) : postApi.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Berita berhasil diperbarui.' : 'Berita berhasil dibuat.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      navigate(DAFTAR);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setFormError(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const unggahSampul = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Pilih berkas gambar (JPG, PNG, atau WebP).');
      return;
    }
    setUploading(true);
    try {
      const res = await mediaApi.upload(file);
      setDraft((curr) => ({ ...curr, thumbnailUrl: res.data.asset.url }));
      setFormError(null);
    } catch (err) {
      setFormError(toApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const judul = isEdit ? 'Ubah Berita' : 'Tulis Berita';
  const deskripsi = 'Konten hanya tampil di website publik setelah berstatus Terbit.';

  const sections: FormSection[] = [
    {
      id: 'isi',
      title: 'Isi Berita',
      content: (
        <>
          <Field label="Judul berita" htmlFor="post-title" required>
            <input
              id="post-title"
              className="field-input"
              required
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                // Slug mengikuti judul selama belum diubah manual.
                const otomatis = !isEdit && (draft.slug === '' || draft.slug === toSlug(draft.title));
                setDraft({ ...draft, title, slug: otomatis ? toSlug(title) : draft.slug });
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
          <Field label="Isi Berita Lengkap" htmlFor="post-content" required>
            <RichTextEditor
              value={draft.content}
              onChange={(content) => setDraft({ ...draft, content })}
              placeholder="Tuliskan isi berita atau artikel selengkapnya di sini..."
              minHeight="360px"
            />
          </Field>
        </>
      ),
    },
    {
      id: 'publikasi',
      title: 'Sampul & Publikasi',
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gambar Utama" htmlFor="post-thumbnail" hint="Sampul berita pada kartu dan header artikel.">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="btn-secondary cursor-pointer">
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span>{uploading ? 'Mengunggah...' : 'Pilih & Unggah Sampul'}</span>
                  <input
                    id="post-thumbnail"
                    type="file"
                    accept={IMAGE_ACCEPT}
                    disabled={uploading}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void unggahSampul(file);
                    }}
                  />
                </label>
                {draft.thumbnailUrl ? (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, thumbnailUrl: '' })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                ) : null}
              </div>
              {draft.thumbnailUrl ? (
                <img src={draft.thumbnailUrl} alt="Pratinjau sampul" className="h-24 w-40 rounded-lg border border-slate-200 object-cover" />
              ) : null}
            </div>
          </Field>
          <Field label="Status Publikasi" htmlFor="post-status">
            <select
              id="post-status"
              className="field-select"
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="draft">Draft (disimpan)</option>
              <option value="published">Terbit (dapat dibaca publik)</option>
              <option value="archived">Arsip</option>
            </select>
          </Field>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title={judul}
      description={deskripsi}
      actions={
        <Link to={DAFTAR} className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali
        </Link>
      }
    >
      {isEdit && postQuery.isLoading ? (
        <LoadingState label="Memuat berita" />
      ) : isEdit && postQuery.isError ? (
        <ErrorState message={toApiError(postQuery.error).message} onRetry={() => void postQuery.refetch()} />
      ) : (
        <FormPageTemplate
          mode={isEdit ? 'edit' : 'create'}
          title={judul}
          showHeader={false}
          busy={saveMutation.isPending || uploading}
          error={formError}
          sections={sections}
          cancelTo={DAFTAR}
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.title.trim() || !draft.slug || !draft.content.trim()) {
              setFormError('Judul, slug, dan isi berita wajib diisi.');
              return;
            }
            setFormError(null);
            saveMutation.mutate();
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminPostForm;
