import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  EyeIcon,
  FlagIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { GambarTentang } from '../../components/ui/GambarTentang';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { profileApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

const DEFAULT_VISION_IMAGE = '/tentang-custom.png';

/**
 * Mengubah isi kolom `missions` menjadi daftar butir misi.
 * Mendukung teks biasa per baris maupun JSON array string dari editor lama.
 */
function uraikanMisi(missions: string): string[] {
  if (!missions.trim()) return [];

  const teks = missions.trim();

  if (teks.startsWith('[')) {
    try {
      const parsed = JSON.parse(teks);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
          .map((item) => item.replace(/^[-•*\d.)\s]+/, '').trim())
          .filter(Boolean);
      }
    } catch {
      // Bukan JSON valid — lanjut ke pemecahan per baris di bawah.
    }
  }

  return teks
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

/** Halaman publik visi dan misi. */
export const VisionMissionPage: React.FC = () => {
  const { tenant } = useTenant();
  const isFaculty = tenant?.tenantType === 'faculty';
  const unitLabel = isFaculty ? 'Fakultas' : 'Program Studi';
  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
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

  const missionList = uraikanMisi(missions);
  const hasContent = Boolean(vision || missionList.length > 0 || objectives || goals);

  const heroGambar =
    (typeof profileRaw?.heroImageUrl === 'string' && profileRaw.heroImageUrl.trim()) ||
    DEFAULT_VISION_IMAGE;

  return (
    <div className="min-h-[70vh] bg-[#FCFDFA]">
      <PageHeader
        eyebrow="Informasi"
        title="Visi & Misi"
        description={`Arah pengembangan dan komitmen ${unitLabel.toLowerCase()} dalam penyelenggaraan Tridharma Perguruan Tinggi.`}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {profileQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs sm:p-12">
            <LoadingState label="Memuat visi dan misi" rows={2} />
          </div>
        ) : profileQuery.isError ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs sm:p-12">
            <ErrorState
              message={toApiError(profileQuery.error).message}
              onRetry={() => void profileQuery.refetch()}
            />
          </div>
        ) : !hasContent ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs sm:p-12">
            <EmptyState
              title="Visi dan misi belum tersedia"
              description={`${unitLabel} belum mengisi konten visi dan misi.`}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
            {/* Kolom Kiri: Kartu Visual & Identitas */}
            <aside className="lg:sticky lg:top-28 lg:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
                <div
                  className="h-1.5 w-full"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${primary} 0%, ${primary}cc 68%, ${accent} 100%)`,
                  }}
                />
                <div className="bg-slate-50/70 p-4 sm:p-5">
                  <figure className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
                    <GambarTentang
                      src={heroGambar}
                      alt={`Foto pendukung ${unitLabel.toLowerCase()}`}
                      className="h-auto w-full object-contain"
                    />
                  </figure>
                </div>

                <div className="border-t border-slate-100 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${primary}10`,
                        borderColor: `${primary}26`,
                        color: primary,
                      }}
                    >
                      <AcademicCapIcon className="h-3.5 w-3.5" />
                      <span>{isFaculty ? 'Fakultas' : `Program ${tenant?.degree || 'S1'}`}</span>
                    </span>
                    {missionList.length > 0 ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 tabular-nums">
                        {missionList.length} Poin Misi
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
                    {isFaculty ? tenant?.name : `${unitLabel} ${tenant?.name || ''}`.trim()}
                  </p>
                  <p className="mt-1 text-[13.5px] font-medium text-slate-500">
                    {tenant?.websiteSetting?.facultyName || tenant?.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                  </p>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <Link
                      to="/profil"
                      className="group inline-flex items-center gap-1.5 text-[13px] font-bold transition hover:opacity-80"
                      style={{ color: primary }}
                    >
                      <span>Lihat Profil &amp; Sejarah {unitLabel}</span>
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

            {/* Kolom Kanan: Visi, Misi, Tujuan & Sasaran Strategis */}
            <div className="space-y-6 lg:col-span-7">
              {vision ? (
                <article className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
                  <div
                    className="h-1.5 w-full"
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${primary} 0%, ${primary}cc 68%, ${accent} 100%)`,
                    }}
                  />
                  <div
                    className="relative p-7 sm:p-9"
                    style={{
                      backgroundImage: `linear-gradient(180deg, ${primary}08 0%, #ffffff 48%)`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none select-none absolute right-6 top-2 font-heading text-[96px] font-black leading-none"
                      style={{ color: `${primary}12` }}
                    >
                      &ldquo;
                    </span>

                    <div className="relative">
                      <span
                        className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest"
                        style={{
                          backgroundColor: `${primary}10`,
                          borderColor: `${primary}24`,
                          color: primary,
                        }}
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        <span>Visi {unitLabel}</span>
                      </span>

                      <blockquote className="mt-5 text-lg font-extrabold leading-[1.6] tracking-tight text-slate-950 sm:text-[22px]">
                        &ldquo;{vision}&rdquo;
                      </blockquote>

                      <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: primary }}
                        />
                        <p className="text-[12.5px] font-semibold text-slate-500">
                          Arah Pengembangan &amp; Komitmen Mutu {tenant?.name || unitLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ) : null}

              {missionList.length > 0 ? (
                <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14`, color: primary }}
                    >
                      <CheckBadgeIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                        Misi {unitLabel}
                      </h2>
                    </div>
                  </div>
                  <ol className="divide-y divide-slate-100">
                    {missionList.map((mission, index) => (
                      <li key={index} className="flex items-start gap-4 px-6 py-4 sm:px-7">
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-extrabold tabular-nums"
                          style={{
                            backgroundColor: `${primary}12`,
                            color: primary,
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[15px] leading-relaxed text-slate-700">{mission}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ) : null}

              {objectives ? (
                <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14`, color: primary }}
                    >
                      <FlagIcon className="h-5 w-5" />
                    </span>
                    <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                      Tujuan
                    </h2>
                  </div>
                  <div className="px-6 py-5 sm:px-7 sm:py-6">
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
                      {objectives}
                    </p>
                  </div>
                </article>
              ) : null}

              {goals ? (
                <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14`, color: primary }}
                    >
                      <SparklesIcon className="h-5 w-5" />
                    </span>
                    <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                      Sasaran Strategis
                    </h2>
                  </div>
                  <div className="px-6 py-5 sm:px-7 sm:py-6">
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
                      {goals}
                    </p>
                  </div>
                </article>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default VisionMissionPage;
