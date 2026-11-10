import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpTrayIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, FormModal } from '../../components/ui/FormModal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { mediaApi, portalApi, type PortalHeroSlide } from '../../services/adminApi';
import { firstFieldError, toApiError } from '../../services/api';

/**
 * Pengelolaan Hero Slider Portal Utama (website universitas).
 *
 * Portal utama tidak terikat program studi, sehingga slide di sini bersifat
 * global. Sesuai `RULES_HERO_SLIDER.md`, gambar diunggah langsung sebagai
 * berkas (tanpa input URL manual) dan tersimpan pada Media Library lokal.
 */
export const AdminPortalHero: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PortalHeroSlide | null>(null);
  const [draft, setDraft] = useState<{ imageUrl: string; alt: string; linkUrl: string; isActive: boolean }>({
    imageUrl: '',
    alt: '',
    linkUrl: '',
    isActive: true,
  });
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PortalHeroSlide | null>(null);
  const [reordering, setReordering] = useState(false);

  const slidesQuery = useQuery({
    queryKey: ['admin', 'portal', 'hero-slides'],
    queryFn: () => portalApi.heroSlides().then((res) => res.data.slides),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'portal', 'hero-slides'] });
    void queryClient.invalidateQueries({ queryKey: ['public', 'portal', 'hero-slides'] });
  };

  const openCreate = () => {
    setEditing(null);
    setDraft({ imageUrl: '', alt: '', linkUrl: '', isActive: true });
    setFormOpen(true);
  };

  const openEdit = (slide: PortalHeroSlide) => {
    setEditing(slide);
    setDraft({
      imageUrl: slide.imageUrl,
      alt: slide.alt ?? '',
      linkUrl: slide.linkUrl ?? '',
      isActive: slide.isActive,
    });
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draft.imageUrl) {
        throw new Error('Silakan unggah gambar banner terlebih dahulu.');
      }
      const payload = {
        imageUrl: draft.imageUrl,
        alt: draft.alt.trim() || null,
        linkUrl: draft.linkUrl.trim() || null,
        isActive: draft.isActive,
      };
      return editing ? portalApi.updateHeroSlide(editing.id, payload) : portalApi.createHeroSlide(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Slide banner portal diperbarui.' : 'Slide banner portal ditambahkan.');
      setFormOpen(false);
      setEditing(null);
      refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => portalApi.deleteHeroSlide(id),
    onSuccess: () => {
      toast.success('Slide banner portal dihapus.');
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const toggleActive = async (slide: PortalHeroSlide) => {
    try {
      await portalApi.updateHeroSlide(slide.id, { isActive: !slide.isActive });
      toast.success(`Slide "${slide.alt || slide.imageUrl}" kini ${!slide.isActive ? 'Aktif' : 'Nonaktif'}.`);
      refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  const handleReorder = async (slide: PortalHeroSlide, direction: -1 | 1) => {
    const slides = [...(slidesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = slides.findIndex((s) => s.id === slide.id);
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;

    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setReordering(true);
    try {
      await portalApi.reorderHeroSlides(reordered.map((s, idx) => ({ id: s.id, sortOrder: idx + 1 })));
      toast.success('Urutan slide banner portal diperbarui.');
      refresh();
    } catch (error) {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    } finally {
      setReordering(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await mediaApi.upload(file, draft.alt || undefined);
      setDraft((prev) => ({ ...prev, imageUrl: res.data.asset.url }));
      toast.success('Gambar banner berhasil diunggah.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploading(false);
    }
  };

  const slides = [...(slidesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminLayout
      title="Hero Slider Portal Utama"
      description="Kelola banner beranda website universitas (Portal Utama). Gambar diunggah langsung ke Media Library dan tampil di beranda utama."
      actions={
        has('website.update') ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Slide
          </button>
        ) : null
      }
    >
      {slidesQuery.isLoading ? (
        <LoadingState label="Memuat slide banner" />
      ) : slidesQuery.isError ? (
        <ErrorState
          message={toApiError(slidesQuery.error).message}
          onRetry={() => void slidesQuery.refetch()}
        />
      ) : slides.length === 0 ? (
        <EmptyState
          title="Belum ada banner portal"
          description="Tambahkan slide pertama agar beranda Portal Utama menampilkan banner dinamis dari database."
          action={
            has('website.update') ? (
              <button type="button" onClick={openCreate} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Tambah Slide
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="flex flex-col overflow-hidden rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <img
                  src={slide.imageUrl}
                  alt={slide.alt ?? `Slide banner portal ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                  Urutan {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleActive(slide)}
                  className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs transition-opacity hover:opacity-90 ${
                    slide.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'
                  }`}
                >
                  {slide.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {slide.alt || 'Tanpa teks alternatif'}
                  </p>
                  {slide.linkUrl ? (
                    <a
                      href={slide.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 truncate text-[10px] font-semibold text-[#1e3a8a] hover:underline"
                    >
                      <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{slide.linkUrl}</span>
                    </a>
                  ) : (
                    <p className="text-[10px] text-slate-400">Tanpa tautan</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => void handleReorder(slide, -1)}
                    disabled={index === 0 || reordering}
                    className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                    aria-label="Naikkan slide"
                  >
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReorder(slide, 1)}
                    disabled={index === slides.length - 1 || reordering}
                    className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                    aria-label="Turunkan slide"
                  >
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(slide)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                  >
                    <PencilSquareIcon className="h-3 w-3" /> Atur
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(slide)}
                    className="rounded border border-rose-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                    aria-label="Hapus slide"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        open={formOpen}
        title={editing ? 'Ubah Slide Banner Portal' : 'Tambah Slide Banner Portal'}
        description="Unggah gambar banner. Teks alternatif membantu aksesibilitas dan SEO."
        busy={saveMutation.isPending || uploading}
        onClose={() => setFormOpen(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div>
          <label className="field-label">Gambar Banner</label>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-2xs">
              {draft.imageUrl ? (
                <img src={draft.imageUrl} alt="Pratinjau banner" className="h-full w-full object-cover" />
              ) : (
                <PhotoIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                <span>{uploading ? 'Mengunggah...' : 'Pilih & Unggah Gambar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.target.value = '';
                  }}
                />
              </label>
              <p className="text-[10px] text-slate-500">
                Gunakan gambar lanskap (disarankan 1920×1080 piksel) agar tampil penuh di beranda.
              </p>
            </div>
          </div>
        </div>

        <Field
          label="Teks Alternatif (Alt)"
          htmlFor="portal-slide-alt"
          hint="Deskripsi singkat gambar untuk pembaca layar dan mesin pencari."
        >
          <input
            id="portal-slide-alt"
            type="text"
            className="field-input"
            placeholder="Contoh: Penerimaan Mahasiswa Baru Universitas Nahdlatul Ulama Sumatera Utara"
            value={draft.alt}
            onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
          />
        </Field>

        <Field
          label="Tautan Saat Diklik (Opsional)"
          htmlFor="portal-slide-link"
          hint="Alamat tujuan ketika banner diklik, misalnya /pmb."
        >
          <input
            id="portal-slide-link"
            type="text"
            className="field-input"
            placeholder="Contoh: /pmb"
            value={draft.linkUrl}
            onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })}
          />
        </Field>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tampilkan slide ini di beranda portal
        </label>
      </FormModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus slide banner portal"
        description={`Slide "${deleteTarget?.alt || deleteTarget?.imageUrl || ''}" akan dihapus dari beranda Portal Utama.`}
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminPortalHero;
