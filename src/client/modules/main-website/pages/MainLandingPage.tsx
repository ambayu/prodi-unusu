import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { api, toApiError } from '../../../services/api';
import { groupByFaculty, type DirectoryResponse } from '../../../services/directory';
import { ErrorState, LoadingState } from '../../../components/ui/States';

/**
 * Beranda portal utama program studi.
 *
 * Dipakai pada permukaan `main` (unusu.ac.id) dan `admin`
 * (prodi.unusu.ac.id). Direktori fakultas dan program studi diambil dari
 * database sehingga penambahan prodi tidak memerlukan perubahan kode.
 *
 * Fakultas hanya tampil sebagai judul kelompok; yang dapat diklik adalah
 * program studi, dan tautannya membuka domain prodi di tab baru agar
 * pengunjung tidak kehilangan halaman portal.
 */
export const MainLandingPage: React.FC = () => {
  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = groupByFaculty(prodis);

  return (
    <div className="space-y-20 pb-20 font-sans">
      {/* 1. Hero portal */}
      <section className="relative overflow-hidden bg-[#14532D] py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] opacity-20 [background-size:24px_24px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <span className="inline-block rounded-full border border-emerald-700 bg-emerald-800/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                PORTAL RESMI UNIVERSITAS NAHDLATUL ULAMA SUMATERA UTARA
              </span>
              <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-5xl">
                Mencetak Cendekia Ahlussunnah wal Jama&apos;ah yang Unggul &amp; Berkarakter
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-emerald-100 sm:text-base">
                Pusat keunggulan pendidikan tinggi terakreditasi nasional dengan 6 fakultas dan 14
                program studi mandiri, memadukan sains modern, teknologi, dan akhlak mulia.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="#fakultas-prodi"
                  className="inline-flex min-h-[44px] items-center rounded-full bg-amber-400 px-6 text-xs font-extrabold text-slate-950 shadow-md transition-all hover:bg-amber-300"
                >
                  Jelajahi Program Studi
                </a>
                <Link
                  to="/login"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/10 px-6 text-xs font-bold text-white transition-all hover:bg-white/20"
                >
                  Portal Administrasi Pusat
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:col-span-5">
              <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xs">
                <h3 className="flex items-center text-lg font-bold text-white">
                  <CheckBadgeIcon className="mr-2 h-5 w-5 text-amber-300" />
                  Statistik Kampus Utama
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-extrabold text-amber-300">{faculties.length || '6'}</p>
                    <p className="text-xs text-emerald-100">Fakultas Aktif</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-extrabold text-amber-300">{prodis.length || '14'}</p>
                    <p className="text-xs text-emerald-100">Program Studi</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-extrabold text-amber-300">100%</p>
                    <p className="text-xs text-emerald-100">Terakreditasi</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-2xl font-extrabold text-amber-300">SSO</p>
                    <p className="text-xs text-emerald-100">Layanan Terpadu</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Direktori fakultas & program studi */}
      <section id="fakultas-prodi" className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            EKOSISTEM WEBSITE MULTI-PRODI
          </p>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Fakultas &amp; Portal Mandiri Program Studi
          </h2>
          <p className="mt-2 text-xs text-slate-500 sm:text-sm">
            Masing-masing program studi UNUSU memiliki identitas website independen dengan domain
            terpisah.
          </p>
        </div>

        {directoryQuery.isLoading && <LoadingState label="Memuat direktori program studi" />}

        {directoryQuery.isError && <ErrorState message={toApiError(directoryQuery.error).message} />}

        {directoryQuery.isSuccess && prodis.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">Belum ada program studi yang terdaftar.</p>
          </div>
        )}

        {/*
          Fakultas adalah judul kelompok, bukan kartu tersendiri. Yang menjadi
          kartu adalah program studi, karena itulah yang memiliki website.
        */}
        <div className="space-y-10">
          {faculties.map((faculty) => (
            <section key={faculty.id}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-9 min-w-[3rem] items-center justify-center rounded-lg bg-emerald-50 px-2 text-[11px] font-extrabold text-emerald-800">
                  {faculty.code}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{faculty.name}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                  {faculty.prodis.length} Program Studi
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {faculty.prodis.map((prodi) => {
                  const href = prodi.primaryHostname
                    ? `https://${prodi.primaryHostname}/`
                    : null;

                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                          {prodi.logoUrl ? (
                            <img
                              src={prodi.logoUrl}
                              alt=""
                              className="h-6 w-6 rounded object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <AcademicCapIcon className="h-5 w-5" />
                          )}
                        </div>
                        {href && (
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-emerald-800" />
                        )}
                      </div>

                      <p className="mt-3 text-sm font-bold leading-snug text-slate-900">
                        {prodi.name}
                      </p>
                      <p className="mt-1 font-mono text-[10px] font-bold text-emerald-800">
                        {prodi.primaryHostname ?? 'domain belum tersedia'}
                      </p>
                    </>
                  );

                  const baseClass =
                    'group flex min-h-[44px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all';

                  if (!href) {
                    return (
                      <div key={prodi.id} className={`${baseClass} opacity-60`}>
                        {body}
                      </div>
                    );
                  }

                  return (
                    <a
                      key={prodi.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${baseClass} hover:border-emerald-700 hover:shadow-md`}
                    >
                      {body}
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* 3. Ajakan masuk portal */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Pengelola website program studi
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Masuk dengan akun ONE UNUSU untuk mengelola konten program studi Anda.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1e3a8a] px-5 text-sm font-bold text-white transition-colors hover:bg-[#172f6e]"
          >
            Masuk ke Portal
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
