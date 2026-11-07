import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { profileApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Halaman publik profil program studi. */
export const ProfilePage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Profil', description: 'Sejarah, tujuan, dan sasaran program studi.' });

  const profileQuery = useQuery({
    queryKey: ['public', 'profile'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const profile = profileQuery.data?.profile as Record<string, unknown> | null;

  const sections = [
    { key: 'overview', label: 'Deskripsi Program Studi' },
    { key: 'history', label: 'Sejarah' },
    { key: 'objectives', label: 'Tujuan' },
    { key: 'targets', label: 'Sasaran' },
    { key: 'organization', label: 'Struktur Organisasi' },
  ] as const;

  const filled = sections.filter((section) => {
    const value = profile?.[section.key];
    return typeof value === 'string' && value.trim() !== '';
  });

  return (
    <>
      <PageHeader
        eyebrow="Profil"
        title="Tentang Program Studi"
        description="Sejarah, deskripsi, tujuan, sasaran, dan struktur organisasi program studi."
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {profileQuery.isLoading ? (
          <LoadingState label="Memuat profil" rows={3} />
        ) : profileQuery.isError ? (
          <ErrorState message={toApiError(profileQuery.error).message} onRetry={() => void profileQuery.refetch()} />
        ) : filled.length === 0 ? (
          <EmptyState
            title="Profil belum tersedia"
            description="Program studi belum mengisi konten profil. Silakan periksa kembali nanti."
          />
        ) : (
          <div className="space-y-8">
            {typeof profile?.heroImageUrl === 'string' && profile.heroImageUrl ? (
              <img
                src={profile.heroImageUrl}
                alt="Foto pendukung program studi"
                className="w-full rounded-2xl border border-slate-200 object-cover"
              />
            ) : null}

            {filled.map((section) => (
              <article key={section.key}>
                <h2 className="border-l-2 border-[#fbbf24] pl-3 text-lg font-extrabold tracking-tight text-slate-900">
                  {section.label}
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {profile?.[section.key] as string}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default ProfilePage;

