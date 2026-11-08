import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  AcademicCapIcon,
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
import { api, toApiError } from '../../../services/api';
import { groupByFaculty, type DirectoryResponse } from '../../../services/directory';

/** Foto representatif per fakultas */
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

/**
 * Halaman "Fakultas & Prodi".
 *
 * Seluruh data diambil dari database sehingga daftar fakultas dan program
 * studi selalu sinkron dengan portal. Fakultas tampil sebagai judul kelompok,
 * sedangkan kartu yang dapat diklik adalah program studi beserta domain
 * resminya (dibuka di tab baru).
 */
export const FacultiesPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedFacultyParam = searchParams.get('faculty');

  useSeo({
    tenant: null,
    title: 'Fakultas & Program Studi',
    description:
      'Daftar fakultas dan program studi Universitas Nahdlatul Ulama Sumatera Utara beserta website resmi masing-masing.',
  });

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = groupByFaculty(prodis);

  // Jika ada query param ?faculty=..., filter hanya fakultas terpilih
  const displayedFaculties = selectedFacultyParam
    ? faculties.filter((f) => String(f.id) === selectedFacultyParam || f.code.toLowerCase() === selectedFacultyParam.toLowerCase())
    : faculties;

  // Jika filter aktif tetapi tidak ditemukan ID-nya, fallback tampilkan semua
  const activeFaculties = displayedFaculties.length > 0 ? displayedFaculties : faculties;

  return (
    <>
      <PageHeader
        eyebrow="Akademik"
        title="Fakultas & Program Studi"
        description="Setiap program studi mengelola website resminya sendiri. Pilih program studi untuk membuka laman publiknya."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Tab / Filter Bar Cepat Antar Fakultas */}
        {faculties.length > 1 && (
          <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
            <Link
              to="/fakultas"
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                !selectedFacultyParam
                  ? 'bg-[#14532D] text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Fakultas ({prodis.length})
            </Link>
            {faculties.map((f) => {
              const isSelected = selectedFacultyParam && (String(f.id) === selectedFacultyParam || f.code.toLowerCase() === selectedFacultyParam.toLowerCase());
              return (
                <Link
                  key={f.id}
                  to={`/fakultas?faculty=${f.id}`}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#14532D] text-amber-300 shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.code}
                </Link>
              );
            })}
          </div>
        )}

        {directoryQuery.isLoading && <LoadingState label="Memuat direktori program studi" />}

        {directoryQuery.isError && <ErrorState message={toApiError(directoryQuery.error).message} />}

        {directoryQuery.isSuccess && prodis.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BuildingOffice2Icon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Belum ada program studi</p>
            <p className="mt-1 text-xs text-slate-500">
              Data program studi belum ditambahkan oleh pengelola portal.
            </p>
          </div>
        )}

        <div className="space-y-16">
          {activeFaculties.map((faculty) => {
            const facultyImg = getFakultasImage(faculty.code);

            return (
              <section key={faculty.id} id={`faculty-${faculty.id}`} className="scroll-mt-24">
                {/* Header Fakultas Banner */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 min-w-[3.5rem] items-center justify-center rounded-xl bg-[#14532D] px-3 text-xs font-black text-amber-300 shadow-sm">
                      {faculty.code}
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">{faculty.name}</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Universitas Nahdlatul Ulama Sumatera Utara
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-xs font-bold text-emerald-800">
                    {faculty.prodis.length} Program Studi
                  </span>
                </div>

                {/* Grid Card Program Studi dengan Image di Atasnya */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {faculty.prodis.map((prodi) => {
                    const href = prodi.primaryHostname ? `https://${prodi.primaryHostname}/` : null;
                    const IconComponent = getProdiIcon(prodi.code);
                    const thumbnail = getProdiThumbnail(prodi.code);

                    const content = (
                      <>
                        {/* Image Header Card di Atas */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                          <img
                            src={thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                          {/* Degree Badge di Pojok Kanan Atas Foto */}
                          <span className="absolute top-3 right-3 rounded-md bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[10px] font-black text-[#14532D] shadow-sm">
                            {prodi.degree}
                          </span>

                          {/* Floating Icon Hijau Emas di Bawah Kiri Foto */}
                          <div className="absolute -bottom-3 left-4 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-[#14532D] text-amber-300 shadow-md transition-transform duration-300 group-hover:scale-110">
                            <IconComponent className="h-5 w-5" />
                          </div>
                        </div>

                        {/* Konten Bawah Card */}
                        <div className="flex flex-1 flex-col p-5 pt-6">
                          <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                            {prodi.name}
                          </h3>

                          <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-slate-100">
                            <p className="truncate font-mono text-[11px] font-bold text-emerald-700">
                              {prodi.primaryHostname ?? 'domain belum tersedia'}
                            </p>
                            {href && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#14532D] group-hover:text-amber-500 transition-colors">
                                Kunjungi
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );

                    const baseClass =
                      'group flex min-h-[44px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300';

                    if (!href) {
                      return (
                        <div key={prodi.id} className={`${baseClass} opacity-60`}>
                          {content}
                        </div>
                      );
                    }

                    return (
                      <a
                        key={prodi.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${baseClass} hover:-translate-y-1 hover:border-emerald-500 hover:shadow-xl`}
                      >
                        {content}
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
};

/** Halaman "Akademik": ringkasan layanan akademik dan tautan ke prodi. */
export const AcademicsPage: React.FC = () => {
  useSeo({
    tenant: null,
    title: 'Akademik',
    description:
      'Layanan akademik Universitas Nahdlatul Ulama Sumatera Utara: kurikulum, dokumen akademik, dosen, dan fasilitas pembelajaran.',
  });

  const services = [
    {
      title: 'Kurikulum Program Studi',
      body: 'Setiap program studi mempublikasikan struktur kurikulum dan capaian pembelajaran pada website resminya.',
    },
    {
      title: 'Bank Dokumen & SOP',
      body: 'Dokumen akademik, panduan tugas akhir, dan standar operasional tersedia di laman prodi.',
    },
    {
      title: 'Direktori Dosen',
      body: 'Profil tenaga pengajar beserta bidang keahlian dan jabatan akademik setiap program studi.',
    },
    {
      title: 'Sarana & Prasarana',
      body: 'Laboratorium, perpustakaan, dan fasilitas pembelajaran pendukung kegiatan akademik.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Layanan"
        title="Layanan Akademik"
        description="Akses informasi kurikulum, dokumen, dosen, dan fasilitas pembelajaran melalui website program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {services.map((service) => (
            <article key={service.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <BookOpenIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-sm font-extrabold text-slate-900">{service.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{service.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-7">
          <h2 className="text-sm font-extrabold text-slate-900">Menuju layanan program studi</h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-600">
            Kurikulum, dokumen, dan direktori dosen dikelola mandiri oleh setiap program studi.
            Buka halaman Fakultas &amp; Prodi untuk memilih program studi tujuan.
          </p>
          <Link
            to="/fakultas"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
          >
            Lihat Fakultas &amp; Prodi
          </Link>
        </div>
      </section>
    </>
  );
};
