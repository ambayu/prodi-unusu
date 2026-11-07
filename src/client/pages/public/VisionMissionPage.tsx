import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { profileApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Halaman publik visi dan misi. */
export const VisionMissionPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Visi dan Misi', description: 'Visi, misi, dan sasaran strategis program studi.' });

  const profileQuery = useQuery({
    queryKey: ['public', 'profile'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const visionMission = profileQuery.data?.visionMission as Record<string, unknown> | null;
  const vision = typeof visionMission?.vision === 'string' ? visionMission.vision : '';
  const missions = typeof visionMission?.missions === 'string' ? visionMission.missions : '';
  const objectives = typeof visionMission?.objectives === 'string' ? visionMission.objectives : '';
  const goals = typeof visionMission?.strategicGoals === 'string' ? visionMission.strategicGoals : '';

  const missionList = missions
    .split('\n')
    .map((line) => line.replace(/^[-â€¢*\d.)\s]+/, '').trim())
    .filter(Boolean);

  const hasContent = vision || missionList.length > 0 || objectives || goals;

  return (
    <>
      <PageHeader
        eyebrow="Informasi"
        title="Visi & Misi"
        description="Arah pengembangan dan komitmen program studi dalam penyelenggaraan pendidikan."
      />

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {profileQuery.isLoading ? (
          <LoadingState label="Memuat visi dan misi" rows={2} />
        ) : profileQuery.isError ? (
          <ErrorState
            message={toApiError(profileQuery.error).message}
            onRetry={() => void profileQuery.refetch()}
          />
        ) : !hasContent ? (
          <EmptyState
            title="Visi dan misi belum tersedia"
            description="Program studi belum mengisi konten visi dan misi."
          />
        ) : (
          <div className="space-y-6">
            {vision ? (
              <div className="rounded-2xl bg-[#1e3a8a] p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">Visi</p>
                <p className="mt-3 text-lg font-semibold leading-relaxed text-white">{vision}</p>
              </div>
            ) : null}

            {missionList.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Misi</p>
                <ol className="mt-4 space-y-3">
                  {missionList.map((mission, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#fbbf24]" />
                      <span className="text-sm leading-relaxed text-slate-700">{mission}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {objectives ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Tujuan</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{objectives}</p>
              </div>
            ) : null}

            {goals ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">Sasaran Strategis</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{goals}</p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
};

export default VisionMissionPage;

