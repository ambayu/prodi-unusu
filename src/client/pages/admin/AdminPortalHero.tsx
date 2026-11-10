import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpTrayIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronUpDownIcon,
  BuildingLibraryIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { usePermission, useTenant } from '../../hooks/useSite';
import { mediaApi, portalApi, type HeroSlide } from '../../services/adminApi';
import { firstFieldError, toApiError } from '../../services/api';

/**
 * Pengelola Hero Slider Program Studi.
 *
 * Satu halaman untuk SEMUA prodi: banner yang dimuat dan disimpan selalu milik
 * program studi aktif (dipilih lewat pemilih "Program Studi Aktif"). Berganti
 * prodi pada pemilih tersebut akan memuat ulang daftar slide prodi tersebut,
 * sehingga tidak ada lagi banner yang dipakai bersama antar-prodi.
 *
 * Sesuai `RULES_HERO_SLIDER.md`, gambar diunggah langsung sebagai berkas
 * (tanpa input URL manual) ke Media Library lokal.
 */
export const AdminPortalHero: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();
  const { tenant } = useTenant();

  const [draftSlides, setDraftSlides] = useState<HeroSlide[]>([]);
  const [autoplayMs, setAutoplayMs] = useState(6000);
  const [showDots, setShowDots] = useState(true);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const canEdit = has('website.update');
  // Ikut berganti saat tenant aktif berubah -> query otomatis memuat prodi lain.
  const tenantKey = tenant?.id ?? 'none';

  const heroQuery = useQuery({
    queryKey: ['admin', 'hero-slides', tenantKey],
    queryFn: () => portalApi.heroSlides().then((res) => res.data),
    enabled: Boolean(tenant?.id),
  });

  // Sinkronkan server -> draft lokal setiap kali data (atau prodi) berganti.
  useEffect(() => {
    if (!heroQuery.data) return;
    const cfg = heroQuery.data.config;
    setDraftSlides(
      (cfg.slides ?? []).map((slide) => ({
        imageUrl: slide.imageUrl ?? '',
        alt: slide.alt ?? '',
        linkUrl: slide.linkUrl ?? '',
      })),
    );
    setAutoplayMs(cfg.autoplayMs ?? 6000);
    setShowDots(cfg.showDots !== false);
    setDirty(false);
  }, [heroQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleaned = draftSlides.filter((slide) => slide.imageUrl.trim());
      if (cleaned.length === 0) {
        throw new Error('Tambahkan minimal satu gambar banner sebelum menyimpan.');
      }
      return portalApi.saveHeroSlides({ slides: cleaned, autoplayMs, showDots });
    },
    onSuccess: () => {
      toast.success(`Hero slider ${tenant?.name ?? 'prodi'} berhasil disimpan.`);
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'hero-slides'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'hero-slides'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'page'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const updateSlide = (index: number, patch: Partial<HeroSlide>) => {
    setDraftSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
    setDirty(true);
  };

  const addSlide = () => {
    setDraftSlides((prev) => [...prev, { imageUrl: '', alt: '', linkUrl: '' }]);
    setDirty(true);
  };

  const removeSlide = (index: number) => {
    setDraftSlides((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftSlides.length) return;
    setDraftSlides((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const handleUpload = async (file: File, index: number) => {
    setUploadingIndex(index);
    try {
      const res = await mediaApi.upload(file);
      updateSlide(index, { imageUrl: res.data.asset.url });
      toast.success('Gambar banner berhasil diunggah.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const hero = heroQuery.data;

  return (
    <AdminLayout
      title="Hero Slider Program Studi"
      description="Kelola banner beranda untuk program studi yang sedang aktif. Ganti prodi pada pemilih Program Studi Aktif untuk mengatur banner prodi lain."
      actions={
        canEdit ? (
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || heroQuery.isLoading}
            className="btn-primary"
          >
            <CheckIcon className="h-4 w-4" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Banner'}
          </button>
        ) : null
      }
    >
      {/* Pita konteks: menegaskan banner milik prodi mana yang sedang diubah */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-blue-200 bg-blue-50/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BuildingLibraryIcon className="h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-900">
              Banner untuk Program Studi
            </p>
            <p className="text-sm font-bold text-slate-900">
              {hero?.studyProgram
                ? `${hero.studyProgram.degree} ${hero.studyProgram.name} (${hero.studyProgram.code})`
                : tenant?.name ?? 'Belum ada prodi aktif'}
            </p>
          </div>
        </div>
        {dirty ? (
          <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">
            Ada perubahan belum disimpan
          </span>
        ) : (
          <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">
            Tersimpan
          </span>
        )}
      </div>

      {!tenant?.id ? (
        <EmptyState
          title="Belum ada program studi aktif"
          description="Pilih salah satu program studi pada pemilih Program Studi Aktif untuk mengelola banner berandanya."
        />
      ) : heroQuery.isLoading ? (
        <LoadingState label="Memuat banner prodi" />
      ) : heroQuery.isError ? (
        <ErrorState
          message={toApiError(heroQuery.error).message}
          onRetry={() => void heroQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          {/* Pengaturan putar otomatis */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Durasi Putar Otomatis</label>
              <select
                className="field-input"
                value={autoplayMs}
                disabled={!canEdit}
                onChange={(event) => {
                  setAutoplayMs(Number(event.target.value));
                  setDirty(true);
                }}
              >
                <option value={3000}>3 Detik (Cepat)</option>
                <option value={5000}>5 Detik (Sedang)</option>
                <option value={6000}>6 Detik (Rekomendasi)</option>
                <option value={8000}>8 Detik (Lambat)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Indikator Titik</label>
              <select
                className="field-input"
                value={showDots ? 'true' : 'false'}
                disabled={!canEdit}
                onChange={(event) => {
                  setShowDots(event.target.value === 'true');
                  setDirty(true);
                }}
              >
                <option value="true">Tampilkan Titik Navigasi</option>
                <option value="false">Sembunyikan</option>
              </select>
            </div>
          </div>

          {/* Daftar slide */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="field-label mb-0">
                Daftar Slide Banner ({draftSlides.length})
              </label>
              {canEdit ? (
                <button
                  type="button"
                  onClick={addSlide}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> Tambah Slide
                </button>
              ) : null}
            </div>

            {draftSlides.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <PhotoIcon className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-700">
                  Prodi ini belum punya banner
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Klik &quot;Tambah Slide&quot; lalu unggah gambar banner beranda prodi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {draftSlides.map((slide, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                  >
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white">
                          Slide #{index + 1}
                        </span>
                        {index === 0 ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            Tampil pertama
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSlide(index, -1)}
                          disabled={index === 0 || !canEdit}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Naikkan slide"
                        >
                          <ArrowUpIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSlide(index, 1)}
                          disabled={index === draftSlides.length - 1 || !canEdit}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
                          aria-label="Turunkan slide"
                        >
                          <ArrowDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSlide(index)}
                          disabled={!canEdit}
                          className="ml-1 inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-30"
                        >
                          <TrashIcon className="h-3 w-3" /> Hapus
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Gambar Banner
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
                            {slide.imageUrl ? (
                              <img
                                src={slide.imageUrl}
                                alt={slide.alt || 'Banner'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <PhotoIcon className="h-6 w-6 text-slate-300" />
                            )}
                          </div>
                          <label
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 ${
                              !canEdit || uploadingIndex === index
                                ? 'pointer-events-none opacity-50'
                                : ''
                            }`}
                          >
                            <ArrowUpTrayIcon className="h-4 w-4 text-slate-500" />
                            <span>
                              {uploadingIndex === index ? 'Mengunggah...' : 'Pilih Gambar'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={!canEdit || uploadingIndex === index}
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void handleUpload(file, index);
                                event.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Disarankan lanskap 1920×1080 piksel.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600">
                            Teks Alternatif (Alt)
                          </span>
                          <input
                            type="text"
                            className="field-input mt-1"
                            placeholder="Contoh: Gedung Fakultas Sains dan Teknologi"
                            value={slide.alt}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateSlide(index, { alt: event.target.value })
                            }
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600">
                            Tautan Saat Diklik (Opsional)
                          </span>
                          <input
                            type="text"
                            className="field-input mt-1 text-xs"
                            placeholder="Contoh: /pmb"
                            value={slide.linkUrl}
                            disabled={!canEdit}
                            onChange={(event) =>
                              updateSlide(index, { linkUrl: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canEdit ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <ChevronUpDownIcon className="h-4 w-4" />
                Perubahan berlaku untuk website prodi {tenant?.name ?? ''} setelah disimpan.
              </p>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !dirty}
                className="btn-primary"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Banner'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPortalHero;
