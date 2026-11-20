import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  CheckCircleIcon,
  SparklesIcon,
  BuildingLibraryIcon,
  TagIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { facilityApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

export const FacilityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();

  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public', 'facility', id],
    queryFn: () => facilityApi.publicDetail(id!).then((res) => res.data.facility),
    enabled: Boolean(id),
  });

  const facility = data;

  useSeo({
    tenant,
    title: facility ? `${facility.name} - Sarana & Prasarana` : 'Detail Fasilitas',
    description: facility
      ? `${facility.name} merupakan sarana prasarana ${facility.category} di lingkungan ${tenant?.name || 'Program Studi'}.`
      : 'Detail informasi sarana dan prasarana penunjang akademik.',
  });

  return (
    <>
      <PageHeader
        eyebrow="Sarana & Prasarana"
        title={facility?.name || 'Detail Fasilitas'}
        description={
          facility
            ? `${facility.category} • ${tenant?.name || 'Program Studi'}`
            : 'Fasilitas dan sarana pendukung kegiatan akademik.'
        }
      />

      {/* Main Container dengan Margin Standar Publik */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 shadow-xs">
            <LoadingState label="Memuat informasi fasilitas..." rows={4} />
          </div>
        ) : isError || !facility ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 shadow-xs space-y-4">
            <ErrorState
              message={error ? toApiError(error).message : 'Fasilitas tidak ditemukan.'}
              onRetry={() => void refetch()}
            />
            <div className="text-center pt-2">
              <Link
                to="/sarana-prasarana"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition hover:opacity-95"
                style={{ backgroundColor: primary }}
              >
                Lihat Seluruh Sarpras
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. KARTU HEADER HERO FASILITAS */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <div
                className="h-2.5 w-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${primary} 0%, ${primary}cc 70%, ${accent} 100%)`,
                }}
              />

              <div className="p-6 sm:p-10">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Foto Utama Fasilitas */}
                  <div className="w-full lg:w-96 shrink-0">
                    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md">
                      <img
                        src={facility.imageUrl || '/logo-unusu.jpg'}
                        alt={facility.name}
                        className={`h-full w-full object-cover ${
                          !facility.imageUrl ? 'opacity-40 grayscale object-contain p-8' : ''
                        }`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith('/logo-unusu.jpg')) {
                            target.src = '/logo-unusu.jpg';
                            target.className = 'h-full w-full object-contain p-8 opacity-40 grayscale';
                          }
                        }}
                      />
                      <span
                        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                          facility.status === 'aktif'
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-amber-500/90 text-white'
                        }`}
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span className="capitalize">{facility.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Rincian Identitas Fasilitas */}
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border"
                        style={{
                          backgroundColor: `${primary}12`,
                          borderColor: `${primary}28`,
                          color: primary,
                        }}
                      >
                        <TagIcon className="w-3.5 h-3.5" />
                        <span>{facility.category}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                        <BuildingLibraryIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{tenant?.name || 'Program Studi'}</span>
                      </span>
                    </div>

                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {facility.name}
                      </h1>
                      {facility.location && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                          <MapPinIcon className="w-4 h-4 shrink-0" style={{ color: primary }} />
                          <span>{facility.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Deskripsi Fasilitas */}
                    <div className="pt-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Deskripsi & Fungsi Ruangan / Sarana
                      </h2>
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
                        {facility.description || (
                          <span className="text-slate-400 italic text-xs">
                            Belum ada rincian deskripsi tambahan untuk fasilitas ini.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TABEL RINCIAN DAN INFORMASI LOKASI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <BuildingOffice2Icon className="w-5 h-5" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Kategori Sarana
                  </h3>
                </div>
                <p className="text-base font-bold text-slate-800">{facility.category}</p>
                <p className="text-xs text-slate-500">
                  Sarana penunjang kegiatan praktikum, riset, atau perkuliahan mahasiswa.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <MapPinIcon className="w-5 h-5" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Lokasi Gedung / Ruang
                  </h3>
                </div>
                <p className="text-base font-bold text-slate-800">{facility.location || 'Kampus Utama UNUSU'}</p>
                <p className="text-xs text-slate-500">
                  Terintegrasi di lingkungan kampus Universitas Nahdlatul Ulama Sumatera Utara.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <SparklesIcon className="w-5 h-5" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Status Operasional
                  </h3>
                </div>
                <p className="text-base font-bold text-emerald-700 capitalize">{facility.status}</p>
                <p className="text-xs text-slate-500">
                  Dapat digunakan dan beroperasi untuk sivitas akademika program studi.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default FacilityDetailPage;
