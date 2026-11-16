import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { GambarTentang } from '../../components/ui/GambarTentang';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { profileApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/**
 * Gambar pendukung bawaan halaman visi & misi.
 *
 * Sama dengan halaman profil: memakai gambar gedung portal `/tentang` agar
 * seluruh halaman fakultas/prodi memiliki identitas visual yang seragam.
 */
const DEFAULT_VISION_IMAGE = '/tentang-custom.png';

/** Halaman publik visi dan misi. */
export const VisionMissionPage: React.FC = () => {
  const { tenant } = useTenant();
  const isFaculty = tenant?.tenantType === 'faculty';
  const unitLabel = isFaculty ? 'Fakultas' : 'Program Studi';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  useSeo({
    tenant,
    title: 'Visi dan Misi',
    description: `Visi, misi, dan sasaran strategis ${unitLabel.toLowerCase()}.`,
  });

  const profileQuery = useQuery({
    queryKey: ['public', 'profile'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const profileRaw = profileQuery.data?.profile as Record<string, unknown> | null;
  const visionMission = profileQuery.data?.visionMission as Record<string, unknown> | null;

  const vision = typeof visionMission?.vision === 'string' ? visionMission.vision : '';
  const missions = typeof visionMission?.missions === 'string' ? visionMission.missions : '';
  const objectives = typeof visionMission?.objectives === 'string' ? visionMission.objectives : '';
  const goals = typeof visionMission?.strategicGoals === 'string' ? visionMission.strategicGoals : '';

  const missionList = missions
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);

  const hasContent = vision || missionList.length > 0 || objectives || goals;

  const heroGambar =
    (typeof profileRaw?.heroImageUrl === 'string' && profileRaw.heroImageUrl.trim()) ||
    DEFAULT_VISION_IMAGE;

  return (
    <>
      <PageHeader
        eyebrow="Informasi"
        title="Visi & Misi"
        description={`Arah pengembangan dan komitmen ${unitLabel.toLowerCase()} dalam penyelenggaraan Tridharma Perguruan Tinggi.`}
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
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
            description={`${unitLabel} belum mengisi konten visi dan misi.`}
          />
        ) : (
          /*
           * Tata letak dua kolom: gambar di kiri (menempel saat digulir), seluruh
           * uraian visi-misi di kanan. Di layar kecil gambar tampil lebih dahulu.
           */
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            <aside className="lg:col-span-5">
              <figure className="overflow-hidden rounded-2xl bg-slate-100 lg:sticky lg:top-28">
                <GambarTentang
                  src={heroGambar}
                  alt={`Foto pendukung ${unitLabel.toLowerCase()}`}
                  className="h-72 w-full object-cover object-center sm:h-96 lg:h-[520px]"
                />
                <figcaption className="bg-slate-50 px-4 py-3 text-[11px] font-semibold text-slate-500">
                  {tenant?.name ?? unitLabel} &bull; Universitas Nahdlatul Ulama Sumatera Utara
                </figcaption>
              </figure>
            </aside>

            <div className="space-y-6 lg:col-span-7">
              {vision ? (
                <div className="rounded-2xl p-8" style={{ backgroundColor: accent }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900/70">Visi</p>
                  <p className="mt-3 text-base font-semibold leading-relaxed text-slate-950 sm:text-lg">
                    {vision}
                  </p>
                </div>
              ) : null}

              {missionList.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Misi</p>
                  <ol className="mt-4 space-y-3">
                    {missionList.map((mission, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
                        <span className="text-sm leading-relaxed text-slate-700">{mission}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {objectives ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tujuan</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {objectives}
                  </p>
                </div>
              ) : null}

              {goals ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Sasaran Strategis
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{goals}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default VisionMissionPage;
