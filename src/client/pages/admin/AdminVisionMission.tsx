import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpTrayIcon, PhotoIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { profileApi } from '../../services/contentApi';
import { mediaApi } from '../../services/adminApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Format berkas gambar yang diterima seluruh unggahan gambar di panel admin. */
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

/**
 * Pengelolaan visi, misi, tujuan, dan sasaran strategis program studi.
 *
 * Sumber data resmi adalah tabel `visions_missions`. Halaman ini sengaja
 * dipisahkan dari Profil agar kedua konten tidak lagi berbagi satu formulir
 * panjang, dan agar label menu "Visi & Misi" sesuai dengan isi halaman.
 *
 * Gambar pendukung disimpan pada `profile_contents.hero_image_url` — berkas
 * yang sama dengan halaman Profil — sehingga kedua halaman selalu tampil
 * serasi. Gambar dapat diganti dari sini tanpa membuka halaman Profil.
 */
/**
 * Mengubah isi kolom `missions` menjadi daftar butir misi.
 *
 * Data tersimpan dalam dua bentuk: teks biasa satu butir per baris, atau JSON
 * array string. Bentuk JSON dahulu tidak dikenali sehingga yang tampil di
 * formulir adalah deretan tanda kutip dan koma.
 */
function bacaMisi(mentah: string): string[] {
  if (!mentah.trim()) return [''];

  const teks = mentah.trim();

  if (teks.startsWith('[')) {
    try {
      const parsed = JSON.parse(teks);
      if (Array.isArray(parsed)) {
        const butir = parsed
          .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
          .map((item) => item.replace(/^[-•*\d.)\s]+/, '').trim())
          .filter(Boolean);
        return butir.length > 0 ? butir : [''];
      }
    } catch {
      // Bukan JSON yang sah: jatuh ke pemecahan per baris di bawah.
    }
  }

  const butir = teks
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);

  return butir.length > 0 ? butir : [''];
}

/** Halaman admin visi dan misi. */
export const AdminVisionMission: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [vision, setVision] = useState('');
  const [missions, setMissions] = useState<string[]>(['']);
  const [objectives, setObjectives] = useState('');
  const [strategicGoals, setStrategicGoals] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);

  const dataQuery = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => profileApi.get().then((res) => res.data),
  });

  /**
   * Isi formulir dari database.
   *
   * Kolom `missions` dapat tersimpan dalam dua bentuk: teks satu misi per baris
   * atau JSON array. Keduanya diuraikan di sini agar butir misi tidak tampil
   * sebagai tanda kutip dan koma mentah saat disunting.
   */
  useEffect(() => {
    const stored = dataQuery.data?.visionMission as Record<string, unknown> | null;
    if (!stored) return;

    setVision((stored.vision as string) ?? '');
    setObjectives((stored.objectives as string) ?? '');
    setStrategicGoals((stored.strategicGoals as string) ?? '');

    setMissions(bacaMisi((stored.missions as string) ?? ''));
  }, [dataQuery.data]);

  /**
   * Gambar pendukung diambil dari `heroImageUrl` yang dikirim API, atau dari
   * isi profil bila API versi lama belum menyertakan kolom tersebut.
   */
  useEffect(() => {
    const dariApi = dataQuery.data?.heroImageUrl;
    const dariProfil = (dataQuery.data?.profile as Record<string, unknown> | null)?.heroImageUrl;

    const nilai =
      (typeof dariApi === 'string' && dariApi.trim()) ||
      (typeof dariProfil === 'string' && dariProfil.trim()) ||
      '';

    setHeroImageUrl(nilai);
  }, [dataQuery.data]);

  /**
   * Mengunggah gambar pendukung ke pustaka media lalu menyimpan URL hasilnya.
   * Berkas dibatasi ke format gambar agar pustaka tidak terisi berkas lain.
   */
  const handleHeroUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Pilih berkas gambar (JPG, PNG, WebP, atau SVG).');
      return;
    }
    setUploadingHero(true);
    try {
      const res = await mediaApi.upload(file);
      setHeroImageUrl(res.data.asset.url);
      toast.success('Gambar pendukung berhasil diunggah. Simpan untuk menerapkan.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploadingHero(false);
    }
  };

  const missionCount = useMemo(() => missions.filter((item) => item.trim() !== '').length, [missions]);

  const updateMission = (index: number, value: string) => {
    setMissions((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const addMission = () => setMissions((current) => [...current, '']);

  const removeMission = (index: number) => {
    setMissions((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const saveVision = useMutation({
    mutationFn: async () => {
      /*
       * Dua permintaan dijalankan berurutan: isi visi-misi lebih dulu, baru
       * gambar pendukung. Gambar disimpan terpisah karena berada di tabel
       * `profile_contents`, bukan `visions_missions`.
       */
      await profileApi.updateVisionMission({
        vision,
        missions: missions
          .map((item) => item.trim())
          .filter(Boolean)
          .join('\n'),
        objectives,
        strategicGoals,
      });

      if (has('profile.update')) {
        await profileApi.updateHeroImage(heroImageUrl.trim());
      }
    },
    onSuccess: () => {
      toast.success('Visi dan misi berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'profile'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  return (
    <AdminLayout
      title="Visi & Misi Program Studi"
      description="Rumusan visi, misi, tujuan, dan sasaran strategis yang tampil pada halaman Visi & Misi website publik."
    >
      {dataQuery.isLoading ? (
        <LoadingState label="Memuat visi dan misi" rows={3} />
      ) : dataQuery.isError ? (
        <ErrorState message={toApiError(dataQuery.error).message} onRetry={() => void dataQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Visi Program Studi</h2>
            <Field label="Rumusan visi" htmlFor="vision-text" hint="Satu paragraf utuh, tanpa penomoran.">
              <textarea
                id="vision-text"
                className="field-textarea min-h-[120px]"
                value={vision}
                onChange={(event) => setVision(event.target.value)}
              />
            </Field>
          </section>

          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Misi Program Studi</h2>
                <p className="text-[11px] text-slate-500">{missionCount} butir misi terisi.</p>
              </div>
              <button type="button" onClick={addMission} className="btn-secondary">
                <PlusIcon className="h-3.5 w-3.5" />
                Tambah Misi
              </button>
            </div>

            <div className="space-y-2">
              {missions.map((mission, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-900">
                    {index + 1}
                  </span>
                  <textarea
                    rows={2}
                    aria-label={`Butir misi ke-${index + 1}`}
                    className="field-textarea flex-1 text-xs"
                    placeholder={`Tuliskan butir misi ke-${index + 1}...`}
                    value={mission}
                    onChange={(event) => updateMission(index, event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeMission(index)}
                    className="mt-2 rounded p-1 text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
                    aria-label={`Hapus butir misi ke-${index + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Tujuan &amp; Sasaran Strategis</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tujuan" htmlFor="vision-objectives">
                <textarea
                  id="vision-objectives"
                  className="field-textarea"
                  value={objectives}
                  onChange={(event) => setObjectives(event.target.value)}
                />
              </Field>
              <Field label="Sasaran strategis" htmlFor="vision-goals">
                <textarea
                  id="vision-goals"
                  className="field-textarea"
                  value={strategicGoals}
                  onChange={(event) => setStrategicGoals(event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="card space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Gambar Pendukung</h2>
              <p className="text-[11px] text-slate-500">
                Tampil di samping kiri halaman <strong>Visi &amp; Misi</strong> dan{' '}
                <strong>Profil</strong> website publik. Satu gambar dipakai untuk kedua halaman.
              </p>
            </div>

            <Field
              label="Gambar halaman Visi & Misi dan Profil"
              htmlFor="vision-hero-upload"
              hint="Unggah berkas gambar (JPG, PNG, WebP, atau SVG). Bila dikosongkan, halaman memakai gambar bawaan kampus."
            >
              <div className="space-y-3">
                {heroImageUrl ? (
                  <div className="relative inline-block overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={heroImageUrl}
                      alt="Pratinjau gambar pendukung visi dan misi"
                      className="h-36 w-64 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setHeroImageUrl('')}
                      title="Hapus gambar"
                      className="absolute right-2 top-2 rounded-full bg-rose-600 p-1 text-white shadow-md transition-colors hover:bg-rose-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-36 w-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center">
                    <div className="flex flex-col items-center gap-1.5 text-slate-500">
                      <PhotoIcon className="h-8 w-8 text-slate-400" />
                      <span className="text-[11px] font-medium text-slate-600">Belum ada gambar</span>
                      <span className="text-[10px] text-slate-400">Unggah gambar dari perangkat Anda</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50">
                    <ArrowUpTrayIcon className="h-4 w-4 text-[#1e3a8a]" />
                    <span>
                      {uploadingHero
                        ? 'Mengunggah...'
                        : heroImageUrl
                          ? 'Ganti Gambar'
                          : 'Unggah Gambar Pendukung'}
                    </span>
                    <input
                      id="vision-hero-upload"
                      type="file"
                      accept={IMAGE_ACCEPT}
                      className="hidden"
                      disabled={uploadingHero}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleHeroUpload(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  {heroImageUrl ? (
                    <p className="mt-1.5 max-w-xs truncate font-mono text-[10px] text-slate-400">{heroImageUrl}</p>
                  ) : null}
                </div>
              </div>
            </Field>
          </section>

          {has('vision_mission.update') ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => saveVision.mutate()}
                disabled={saveVision.isPending}
                className="btn-primary"
              >
                {saveVision.isPending ? 'Menyimpan...' : 'Simpan Visi & Misi'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminVisionMission;
