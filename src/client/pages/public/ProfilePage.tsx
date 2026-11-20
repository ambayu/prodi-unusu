import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  ClockIcon,
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

const DEFAULT_PROFILE_IMAGE = '/tentang-custom.png';

/** Halaman publik profil program studi / fakultas. */
export const ProfilePage: React.FC = () => {
  const { tenant } = useTenant();
  const isFaculty = tenant?.tenantType === 'faculty';
  const unitLabel = isFaculty ? 'Fakultas' : 'Program Studi';
  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  useSeo({
    tenant,
    title: 'Profil',
    description: `Sejarah, tujuan, dan sasaran ${unitLabel.toLowerCase()}.`,
  });

  const profileQuery = useQuery({
    queryKey: ['public', 'profile'],
    queryFn: () => profileApi.public().then((res) => res.data),
  });

  const profile = profileQuery.data?.profile as Record<string, unknown> | null;

  const sections = [
    { key: 'overview', label: `Deskripsi ${unitLabel}`, icon: BookOpenIcon },
    { key: 'history', label: 'Sejarah', icon: ClockIcon },
    { key: 'objectives', label: 'Tujuan', icon: FlagIcon },
    { key: 'targets', label: 'Sasaran', icon: SparklesIcon },
    {
      key: 'organization',
      label: isFaculty ? 'Struktur Dekanat & Pimpinan' : 'Struktur Organisasi',
      icon: BuildingOffice2Icon,
    },
  ] as const;

  const filled = sections.filter((section) => {
    const value = profile?.[section.key];
    return typeof value === 'string' && value.trim() !== '';
  });

  const heroGambar =
    (typeof profile?.heroImageUrl === 'string' && profile.heroImageUrl.trim()) || DEFAULT_PROFILE_IMAGE;

  return (
    <div className="min-h-[70vh] bg-[#FCFDFA]">
      <PageHeader
        eyebrow="Profil"
        title={`Tentang ${unitLabel}`}
        description={`Sejarah, deskripsi, tujuan, sasaran, dan struktur organisasi ${unitLabel.toLowerCase()}.`}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {profileQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs sm:p-12">
            <LoadingState label="Memuat profil" rows={3} />
          </div>
        ) : profileQuery.isError ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs sm:p-12">
            <ErrorState
              message={toApiError(profileQuery.error).message}
              onRetry={() => void profileQuery.refetch()}
            />
          </div>
        ) : filled.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-10 shadow-xs sm:p-12">
            <EmptyState
              title="Profil belum tersedia"
              description={`${unitLabel} belum mengisi konten profil. Silakan periksa kembali nanti.`}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
            {/* Kolom Kiri: Kartu Visual & Identitas Singkat */}
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
                    {tenant?.code ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600">
                        {tenant.code}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
                    {isFaculty ? tenant?.name : `${unitLabel} ${tenant?.name || ''}`.trim()}
                  </p>
                  <p className="mt-1 text-[13.5px] font-medium text-slate-500">
                    {tenant?.websiteSetting?.facultyName || tenant?.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                  </p>

                  {filled.length > 1 ? (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Ringkasan Bagian
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {filled.map((section) => (
                          <a
                            key={section.key}
                            href={`#profil-${section.key}`}
                            className="rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                          >
                            {section.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>

            {/* Kolom Kanan: Uraian Profil Terstruktur */}
            <div className="space-y-6 lg:col-span-7">
              {filled.map((section) => {
                const Icon = section.icon;
                return (
                  <article
                    key={section.key}
                    id={`profil-${section.key}`}
                    className="scroll-mt-28 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${primary}14`, color: primary }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                        {section.label}
                      </h2>
                    </div>
                    <div className="px-6 py-5 sm:px-7 sm:py-6">
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
                        {profile?.[section.key] as string}
                      </p>
                    </div>
                  </article>
                );
              })}

              {/* Tautan lanjutan ke halaman Visi & Misi */}
              <div
                className="relative overflow-hidden rounded-3xl p-6 text-white shadow-sm sm:p-7"
                style={{ backgroundColor: primary }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.15]"
                  style={{
                    backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                  aria-hidden="true"
                />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      Arah Pengembangan
                    </p>
                    <p className="mt-1 text-base font-bold text-white">
                      Pelajari Visi, Misi &amp; Sasaran Strategis {unitLabel}
                    </p>
                  </div>
                  <Link
                    to="/visi-misi"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-extrabold shadow-xs transition hover:bg-slate-50"
                    style={{ color: primary }}
                  >
                    <span>Lihat Visi &amp; Misi</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProfilePage;
