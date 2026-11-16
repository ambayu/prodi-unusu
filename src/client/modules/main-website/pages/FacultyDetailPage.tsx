import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  CalculatorIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  GlobeAltIcon,
  HeartIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useSeo } from '../../../hooks/useSeo';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { api } from '../../../services/api';
import { groupByFaculty, type DirectoryResponse } from '../../../services/directory';

const FAKULTAS_IMAGES: Record<string, string> = {
  FIK: '/images/fakultas/fik.png',
  FIP: '/images/fakultas/fip.png',
  FE: '/images/fakultas/fe.png',
  FIKES: '/images/fakultas/fikes.png',
  FAPERTA: '/images/fakultas/faperta.png',
  FAI: '/images/fakultas/fai.png',
};

function getFakultasImage(code: string): string {
  const c = code.toUpperCase();
  return FAKULTAS_IMAGES[c] || '/images/fakultas/fik.png';
}

function getProdiThumbnail(code: string): string {
  const c = code.toUpperCase();
  if (['TIF', 'TI'].includes(c)) return '/images/prodi/prodi-coding.png';
  if (['IKOM', 'IKO', 'ILKOM'].includes(c)) return '/images/prodi/prodi-ai.png';
  if (['SI', 'SIN'].includes(c)) return '/images/prodi/prodi-analytics.png';
  if (['PGSD', 'PEND'].includes(c)) return '/images/prodi/prodi-education.png';
  if (['MNJ', 'MAN', 'AKN', 'AKT'].includes(c)) return '/images/prodi/prodi-finance.png';
  return '/images/prodi/campus-building-header.png';
}

function getProdiIcon(code: string) {
  const c = code.toUpperCase();
  if (['TIF', 'TI'].includes(c)) return CodeBracketIcon;
  if (['IKOM', 'IKO', 'ILKOM'].includes(c)) return CpuChipIcon;
  if (['SI', 'SIN'].includes(c)) return PresentationChartLineIcon;
  if (['PGSD', 'PEND'].includes(c)) return BookOpenIcon;
  if (['MNJ', 'MAN'].includes(c)) return BriefcaseIcon;
  if (['AKN', 'AKT'].includes(c)) return CalculatorIcon;
  if (['AGR', 'AGB'].includes(c)) return GlobeAltIcon;
  if (['KES', 'KDM'].includes(c)) return HeartIcon;
  if (['PAI', 'KPI'].includes(c)) return BookOpenIcon;
  return CommandLineIcon;
}

export const FacultyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = groupByFaculty(prodis);

  const currentFaculty = faculties.find((f) => {
    if (!slug) return false;
    const s = slug.toLowerCase();
    return (
      (f.slug && f.slug.toLowerCase() === s) ||
      f.code.toLowerCase() === s ||
      String(f.id) === s
    );
  });

  useSeo({
    tenant: null,
    title: currentFaculty ? `${currentFaculty.name} - Fakultas UNUSU` : 'Detail Fakultas',
    description: currentFaculty?.description || `Informasi fakultas dan program studi di lingkungan ${currentFaculty?.name ?? 'UNUSU'}.`,
  });

  if (directoryQuery.isLoading) {
    return <LoadingState label="Memuat data fakultas..." />;
  }

  if (directoryQuery.isError) {
    return <ErrorState message="Gagal memuat direktori fakultas." onRetry={() => directoryQuery.refetch()} />;
  }

  if (!currentFaculty) {
    return <Navigate to="/fakultas" replace />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Fakultas"
        title={currentFaculty.name}
        description={currentFaculty.description || `Pusat keunggulan akademik dan pengembangan keilmuan ${currentFaculty.name} di Universitas Nahdlatul Ulama Sumatera Utara.`}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <Link
            to="/fakultas"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#14532D] transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Kembali ke Daftar Semua Fakultas
          </Link>
        </div>

        {/* Banner Fakultas */}
        <div className="mb-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="relative h-64 md:h-auto overflow-hidden bg-slate-900">
              <img
                src={getFakultasImage(currentFaculty.code)}
                alt={currentFaculty.name}
                className="h-full w-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/fakultas/fik.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-block rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold tracking-wider text-white shadow">
                  KODE: {currentFaculty.code}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-widest mb-2">
                  <BuildingOffice2Icon className="w-4 h-4 text-emerald-700" />
                  Profil Fakultas
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{currentFaculty.name}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {currentFaculty.description ||
                    `${currentFaculty.name} menaungi program studi unggulan yang berkomitmen mencetak lulusan berkarakter, berdaya saing global, dan berlandaskan nilai-nilai Ahlussunnah wal Jama'ah.`}
                </p>

                {/*
                  Tautan ke website resmi fakultas. Halaman ini adalah detail di
                  dalam portal; pengunjung yang ingin masuk ke portal mandiri
                  fakultas harus punya jalan langsung dari sini, tanpa kembali
                  dulu ke beranda portal.
                */}
                {currentFaculty.hostname ? (
                  <a
                    href={`https://${currentFaculty.hostname}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#166534] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#124f28] hover:shadow-md"
                  >
                    <GlobeAltIcon className="h-4 w-4" />
                    Kunjungi Website Fakultas
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
                <div>
                  <span className="block font-bold text-slate-800 text-sm">{currentFaculty.prodis.length}</span>
                  <span>Program Studi</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800 text-sm">Jenjang Sarjana (S1)</span>
                  <span>Tingkat Pendidikan</span>
                </div>
                <div>
                  <span className="block font-bold text-emerald-700 text-sm">Aktif</span>
                  <span>Status Operasional</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Program Studi di Bawah Fakultas */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-xl font-bold text-slate-900">
              Program Studi di Bawah {currentFaculty.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pilih program studi di bawah ini untuk mengunjungi website resmi dan informasi kurikulum lengkap.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {currentFaculty.prodis.map((prodi) => {
              const Icon = getProdiIcon(prodi.code);
              const prodiUrl = prodi.primaryHostname ? `https://${prodi.primaryHostname}/` : null;

              return (
                <div
                  key={prodi.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-sm transition-all hover:border-[#14532D] hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-900">
                    <img
                      src={getProdiThumbnail(prodi.code)}
                      alt={prodi.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/prodi/campus-building-header.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white border border-white/20">
                        <Icon className="w-3.5 h-3.5 text-amber-300" />
                        {prodi.degree} {prodi.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-[#14532D] transition-colors">
                        {prodi.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Program Studi {prodi.degree} di bawah {currentFaculty.name}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">
                        {prodi.primaryHostname || 'Domain belum aktif'}
                      </span>
                      {prodiUrl ? (
                        <a
                          href={prodiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#14532D] px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-[#0f3d21] transition-all shadow-sm"
                        >
                          Buka Web
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};
