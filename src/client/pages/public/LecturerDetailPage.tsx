import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { lecturerApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

export const LecturerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();

  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public', 'lecturer', id],
    queryFn: () => lecturerApi.publicDetail(id!).then((res) => res.data.lecturer),
    enabled: Boolean(id),
  });

  const dosen = data;

  useSeo({
    tenant,
    title: dosen ? `Profil ${dosen.name}` : 'Detail Dosen',
    description: dosen
      ? `Profil dan informasi akademik ${dosen.name}, ${dosen.academicRank ?? 'Dosen'} ${dosen.studyProgramName ?? ''}.`
      : 'Detail profil tenaga pengajar program studi.',
  });

  const inisial = React.useMemo(() => {
    if (!dosen?.name) return '?';
    const bagian = dosen.name
      .replace(/^[^A-Za-z]+/, '')
      .split(/\s+/)
      .filter(Boolean);
    if (bagian.length === 0) return '?';
    const awal = bagian[0]?.[0] ?? '';
    const akhir = bagian.length > 1 ? bagian[bagian.length - 1]?.[0] ?? '' : '';
    return (awal + akhir).toUpperCase();
  }, [dosen?.name]);

  const sintaLink =
    dosen?.sintaUrl ||
    (dosen?.sintaId ? `https://sinta.kemdiktisaintek.go.id/authors/profile/${dosen.sintaId}` : null);

  return (
    <>
      <PageHeader
        eyebrow="Profil Akademik"
        title={dosen?.name || 'Detail Tenaga Pengajar'}
        description={
          dosen
            ? `${dosen.academicRank ?? 'Dosen'} ${dosen.studyProgramName ? `• ${dosen.studyProgramName}` : ''}`
            : 'Informasi dan biodata lengkap tenaga pendidik.'
        }
      />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <Link
            to="/dosen"
            className="inline-flex items-center gap-2 text-sm font-bold transition hover:underline"
            style={{ color: primary }}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Kembali ke Daftar Dosen</span>
          </Link>
        </div>

        {isLoading ? (
          <LoadingState label="Memuat profil dosen..." rows={4} />
        ) : isError || !dosen ? (
          <ErrorState
            message={error ? toApiError(error).message : 'Dosen tidak ditemukan atau belum aktif.'}
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            {/* Header Profil */}
            <div className="relative border-b border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/70 p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                {/* Foto / Inisial */}
                <div className="relative aspect-[4/5] w-40 sm:w-48 shrink-0 overflow-hidden rounded-2xl border-4 border-white shadow-lg bg-white">
                  {dosen.photoUrl ? (
                    <img
                      src={dosen.photoUrl}
                      alt={dosen.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        backgroundImage: `linear-gradient(150deg, ${primary} 0%, ${primary}cc 55%, ${accent}aa 100%)`,
                      }}
                    >
                      <span className="text-5xl font-black text-white">{inisial}</span>
                    </div>
                  )}

                  {dosen.academicRank && (
                    <span
                      className="absolute bottom-3 left-3 right-3 text-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md"
                      style={{ backgroundColor: accent }}
                    >
                      {dosen.academicRank}
                    </span>
                  )}
                </div>

                {/* Ringkasan */}
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                    {dosen.name}
                  </h1>

                  {dosen.studyProgramName && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3.5 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                      <BuildingLibraryIcon className="h-4 w-4 text-slate-400" />
                      <span>{dosen.studyProgramName}</span>
                      {dosen.facultyName && <span className="text-slate-400">&bull; {dosen.facultyName}</span>}
                    </div>
                  )}

                  {/* Atribut Cepat */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                    {dosen.nidn && (
                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NIDN / NUPTK</p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-slate-800">{dosen.nidn}</p>
                      </div>
                    )}
                    {dosen.education && (
                      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pendidikan Terakhir</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-800">{dosen.education}</p>
                      </div>
                    )}
                  </div>

                  {dosen.email && (
                    <div className="pt-2">
                      <a
                        href={`mailto:${dosen.email}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <EnvelopeIcon className="h-4 w-4 shrink-0" />
                        <span>{dosen.email}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rincian Tabular & Riset */}
            <div className="p-6 sm:p-10 space-y-8">
              {/* Bidang Keahlian */}
              {dosen.expertise && (
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Bidang Keahlian & Fokus Riset
                  </h2>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-800 leading-relaxed font-medium">
                    {dosen.expertise}
                  </div>
                </div>
              )}

              {/* Biografi / Profil Ringkas */}
              {dosen.bio && (
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Biografi & Profil Akademik
                  </h2>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {dosen.bio}
                  </div>
                </div>
              )}

              {/* Profil Riset & Publikasi (SINTA, Scholar, Scopus, ORCID) */}
              {(sintaLink || dosen.googleScholar || dosen.scopusId || dosen.orcid) && (
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Profil Riset & Basis Data Ilmiah
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {sintaLink && (
                      <a
                        href={sintaLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-100/70 hover:shadow-md"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Kemdiktisaintek</p>
                          <h3 className="mt-1 text-sm font-bold text-amber-950">SINTA Profile</h3>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                          <span>Buka profil</span>
                          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    )}

                    {dosen.googleScholar && (
                      <a
                        href={dosen.googleScholar}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-100/70 hover:shadow-md"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Sitasi & Karya</p>
                          <h3 className="mt-1 text-sm font-bold text-blue-950">Google Scholar</h3>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                          <span>Buka profil</span>
                          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    )}

                    {dosen.scopusId && (
                      <a
                        href={`https://www.scopus.com/authid/detail.uri?authorId=${dosen.scopusId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col justify-between rounded-2xl border border-orange-200 bg-orange-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-100/70 hover:shadow-md"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">Internasional</p>
                          <h3 className="mt-1 text-sm font-bold text-orange-950">Scopus ID</h3>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange-800">
                          <span>{dosen.scopusId}</span>
                          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    )}

                    {dosen.orcid && (
                      <a
                        href={`https://orcid.org/${dosen.orcid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100/70 hover:shadow-md"
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Peneliti Terbuka</p>
                          <h3 className="mt-1 text-sm font-bold text-emerald-950">ORCID</h3>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <span>{dosen.orcid}</span>
                          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default LecturerDetailPage;
