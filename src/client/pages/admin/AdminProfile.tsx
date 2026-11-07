import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/FormModal';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { profileApi } from '../../services/contentApi';
import { toApiError, firstFieldError } from '../../services/api';

/** Pengelolaan profil dan visi misi program studi. */
export const AdminProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [profile, setProfile] = useState({
    overview: '',
    history: '',
    objectives: '',
    targets: '',
    organization: '',
    heroImageUrl: '',
  });

  const [vision, setVision] = useState({
    vision: '',
    missions: '',
    objectives: '',
    strategicGoals: '',
  });

  const dataQuery = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => profileApi.get().then((res) => res.data),
  });

  useEffect(() => {
    const storedProfile = dataQuery.data?.profile as Record<string, unknown> | null;
    const storedVision = dataQuery.data?.visionMission as Record<string, unknown> | null;

    if (storedProfile) {
      setProfile({
        overview: (storedProfile.overview as string) ?? '',
        history: (storedProfile.history as string) ?? '',
        objectives: (storedProfile.objectives as string) ?? '',
        targets: (storedProfile.targets as string) ?? '',
        organization: (storedProfile.organization as string) ?? '',
        heroImageUrl: (storedProfile.heroImageUrl as string) ?? '',
      });
    }

    if (storedVision) {
      setVision({
        vision: (storedVision.vision as string) ?? '',
        missions: (storedVision.missions as string) ?? '',
        objectives: (storedVision.objectives as string) ?? '',
        strategicGoals: (storedVision.strategicGoals as string) ?? '',
      });
    }
  }, [dataQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () => profileApi.update(profile),
    onSuccess: () => {
      toast.success('Profil program studi berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(firstFieldError(apiError) ?? apiError.message);
    },
  });

  const saveVision = useMutation({
    mutationFn: () => profileApi.updateVisionMission(vision),
    onSuccess: () => {
      toast.success('Visi dan misi berhasil disimpan.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <AdminLayout
      title="Profil & Visi Misi"
      description="Konten ini tampil pada halaman Profil dan Visi & Misi website publik program studi."
    >
      {dataQuery.isLoading ? (
        <LoadingState label="Memuat profil" rows={3} />
      ) : dataQuery.isError ? (
        <ErrorState message={toApiError(dataQuery.error).message} onRetry={() => void dataQuery.refetch()} />
      ) : (
        <>
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

            <Field label="Gambar pendukung" htmlFor="profile-hero" hint="URL gambar, contoh /uploads/media/gedung.jpg">
              <input
                id="profile-hero"
                className="field-input"
                value={profile.heroImageUrl}
                onChange={(event) => setProfile({ ...profile, heroImageUrl: event.target.value })}
              />
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

          <section className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Visi &amp; Misi</h2>

            <Field label="Visi" htmlFor="vision-text">
              <textarea
                id="vision-text"
                className="field-textarea"
                value={vision.vision}
                onChange={(event) => setVision({ ...vision, vision: event.target.value })}
              />
            </Field>

            <Field label="Misi" htmlFor="vision-missions" hint="Tulis satu misi per baris.">
              <textarea
                id="vision-missions"
                className="field-input min-h-[160px] resize-y leading-relaxed"
                value={vision.missions}
                onChange={(event) => setVision({ ...vision, missions: event.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tujuan" htmlFor="vision-objectives">
                <textarea
                  id="vision-objectives"
                  className="field-textarea"
                  value={vision.objectives}
                  onChange={(event) => setVision({ ...vision, objectives: event.target.value })}
                />
              </Field>
              <Field label="Sasaran strategis" htmlFor="vision-goals">
                <textarea
                  id="vision-goals"
                  className="field-textarea"
                  value={vision.strategicGoals}
                  onChange={(event) => setVision({ ...vision, strategicGoals: event.target.value })}
                />
              </Field>
            </div>

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
          </section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminProfile;
