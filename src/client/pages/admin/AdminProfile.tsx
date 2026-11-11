import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
 * Pengelolaan profil program studi.
 *
 * Visi dan misi memiliki halaman tersendiri (`/admin/konten/visi-misi`) agar
 * setiap menu sidebar membuka formulir yang sesuai dengan namanya.
 */
export const AdminProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [uploadingHero, setUploadingHero] = useState(false);

  const [profile, setProfile] = useState({
    overview: '',
    history: '',
    objectives: '',
    targets: '',
    organization: '',
    heroImageUrl: '',
  });

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
      setProfile((current) => ({ ...current, heroImageUrl: res.data.asset.url }));
      toast.success('Gambar pendukung berhasil diunggah.');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setUploadingHero(false);
    }
  };

  const dataQuery = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => profileApi.get().then((res) => res.data),
  });

  useEffect(() => {
    const storedProfile = dataQuery.data?.profile as Record<string, unknown> | null;
    if (!storedProfile) return;

    setProfile({
      overview: (storedProfile.overview as string) ?? '',
      history: (storedProfile.history as string) ?? '',
      objectives: (storedProfile.objectives as string) ?? '',
      targets: (storedProfile.targets as string) ?? '',
      organization: (storedProfile.organization as string) ?? '',
      heroImageUrl: (storedProfile.heroImageUrl as string) ?? '',
    });
  }, [dataQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () => profileApi.update(profile),
    onSuccess: () => {
      toast.success('Profil program studi berhasil disimpan.');
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
      title="Profil Program Studi"
      description="Konten ini tampil pada halaman Profil website publik program studi."
    >
      {dataQuery.isLoading ? (
        <LoadingState label="Memuat profil" rows={3} />
      ) : dataQuery.isError ? (
        <ErrorState message={toApiError(dataQuery.error).message} onRetry={() => void dataQuery.refetch()} />
      ) : (
        <div className="space-y-4">
          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Profil Program Studi</h2>

            <Field label="Deskripsi singkat" htmlFor="profile-overview" hint="Tampil pada widget About Prodi di beranda.">
              <textarea
                id="profile-overview"
                className="field-textarea"
                value={profile.overview}
                onChange={(event) => setProfile({ ...profile, overview: event.target.value })}
              />
            </Field>

            <Field label="Sejarah" htmlFor="profile-history">
              <textarea
                id="profile-history"
                className="field-textarea"
                value={profile.history}
                onChange={(event) => setProfile({ ...profile, history: event.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tujuan" htmlFor="profile-objectives">
                <textarea
                  id="profile-objectives"
                  className="field-textarea"
                  value={profile.objectives}
                  onChange={(event) => setProfile({ ...profile, objectives: event.target.value })}
                />
              </Field>
              <Field label="Sasaran" htmlFor="profile-targets">
                <textarea
                  id="profile-targets"
                  className="field-textarea"
                  value={profile.targets}
                  onChange={(event) => setProfile({ ...profile, targets: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Struktur organisasi" htmlFor="profile-organization">
              <textarea
                id="profile-organization"
                className="field-textarea"
                value={profile.organization}
                onChange={(event) => setProfile({ ...profile, organization: event.target.value })}
              />
            </Field>

            <Field
              label="Gambar pendukung"
              htmlFor="profile-hero-upload"
              hint="Unggah berkas gambar (JPG, PNG, WebP, atau SVG). Gambar tampil sebagai ilustrasi pada halaman Profil program studi."
            >
              <div className="space-y-3">
                {profile.heroImageUrl ? (
                  <div className="relative inline-block overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={profile.heroImageUrl}
                      alt="Pratinjau gambar pendukung profil"
                      className="h-36 w-64 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, heroImageUrl: '' })}
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
                        : profile.heroImageUrl
                          ? 'Ganti Gambar'
                          : 'Unggah Gambar Pendukung'}
                    </span>
                    <input
                      id="profile-hero-upload"
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
                  {profile.heroImageUrl ? (
                    <p className="mt-1.5 max-w-xs truncate font-mono text-[10px] text-slate-400">
                      {profile.heroImageUrl}
                    </p>
                  ) : null}
                </div>
              </div>
            </Field>

            {has('profile.update') ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => saveProfile.mutate()}
                  disabled={saveProfile.isPending}
                  className="btn-primary"
                >
                  {saveProfile.isPending ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProfile;