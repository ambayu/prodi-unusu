import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { FormPageTemplate, type FormSection } from '../../components/ui/FormPageTemplate';
import { Field } from '../../components/ui/FormModal';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { galleryApi } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { firstFieldError, toApiError } from '../../services/api';
import { toSlug } from '../../utils/slug';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const DAFTAR = '/admin/galeri';

interface Draft {
  title: string;
  slug: string;
  description: string;
  category: string;
  coverImageUrl: string;
  eventDate: string;
  isPublished: boolean;
}

const DRAFT_KOSONG: Draft = {
  title: '',
  slug: '',
  description: '',
  category: '',
  coverImageUrl: '',
  eventDate: '',
  isPublished: true,
};

/** Halaman buat/ubah album galeri (`/admin/galeri/baru` dan `/admin/galeri/:id/ubah`). */
export const AdminGalleryForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(DRAFT_KOSONG);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Backend belum punya "ambil satu album"; daftar album kecil, jadi dicari dari daftar.
  const listQuery = useQuery({
    queryKey: ['admin', 'galleries'],
    queryFn: () => galleryApi.list().then((res) => res.data.galleries),
    enabled: isEdit,
  });
  const album = isEdit ? listQuery.data?.find((g) => String(g.id) === id) : undefined;

  useEffect(() => {
    if (!album) return;
    setDraft({
      title: album.title,
      slug: album.slug,
      description: album.description ?? '',
      category: album.category ?? '',
      coverImageUrl: album.coverImageUrl ?? '',
      eventDate: album.eventDate ? album.eventDate.slice(0, 10) : '',
      isPublished: album.isPublished,
    });
  }, [album]);

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
      return isEdit ? galleryApi.update(Number(id), body) : galleryApi.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Album berhasil diperbarui.' : 'Album berhasil dibuat.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'galleries'] });
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
      setDraft((curr) => ({ ...curr, coverImageUrl: res.data.asset.url }));
      setFormError(null);
    } catch (err) {
      setFormError(toApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const judul = isEdit ? 'Ubah Album' : 'Album Galeri Baru';

  const sections: FormSection[] = [
    {
      id: 'info',
      title: 'Informasi Album',
      content: (
        <>
          <Field label="Judul album" htmlFor="gallery-title" required>
            <input
              id="gallery-title"
              className="field-input"
              required
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                setDraft({ ...draft, title, slug: isEdit ? draft.slug : toSlug(title) });
              }}
            />
          </Field>
          <Field label="Slug URL" htmlFor="gallery-slug" required hint="Huruf kecil, angka, dan tanda hubung saja.">
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
          <Field label="Deskripsi" htmlFor="gallery-description">
            <textarea
              id="gallery-description"
              className="field-textarea"
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </Field>
        </>
      ),
    },
    {
      id: 'sampul',
      title: 'Sampul & Publikasi',
      content: (
        <>
          <Field label="Gambar Sampul Album" htmlFor="gallery-cover" hint="Format JPG, PNG, atau WebP.">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
                {draft.coverImageUrl ? (
                  <>
                    <img src={draft.coverImageUrl} alt="Sampul album" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, coverImageUrl: '' })}
                      className="absolute right-1 top-1 rounded-full bg-rose-600 p-1 text-white hover:bg-rose-700"
                      aria-label="Hapus sampul"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <PhotoIcon className="h-8 w-8 text-slate-300" aria-hidden="true" />
                )}
              </div>
              <label className="btn-secondary cursor-pointer">
                <ArrowUpTrayIcon className="h-4 w-4" />
                <span>{uploading ? 'Mengunggah...' : 'Pilih & Unggah Sampul'}</span>
                <input
                  id="gallery-cover"
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
            </div>
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
        </>
      ),
    },
  ];

  const memuat = isEdit && listQuery.isLoading;
  const galat = isEdit && listQuery.isError ? toApiError(listQuery.error).message : null;
  const tidakAda = isEdit && listQuery.isSuccess && !album;

  return (
    <AdminLayout
      title={judul}
      description="Album tampil di galeri publik bila diberi tanda tampilkan."
      actions={
        <Link to={DAFTAR} className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali
        </Link>
      }
    >
      {memuat ? (
        <LoadingState label="Memuat album" />
      ) : galat ? (
        <ErrorState message={galat} onRetry={() => void listQuery.refetch()} />
      ) : tidakAda ? (
        <ErrorState message="Album tidak ditemukan pada program studi ini." />
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
            if (!draft.title.trim() || !draft.slug) {
              setFormError('Judul dan slug album wajib diisi.');
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

export default AdminGalleryForm;
