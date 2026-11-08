import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { api, toApiError } from '../../../services/api';
import { groupByFaculty, type DirectoryResponse } from '../../../services/directory';
import { ErrorState, LoadingState } from '../../../components/ui/States';

/** Banner hero portal. Murni gambar: tanpa teks dan tanpa tombol di atasnya. */
const HERO_SLIDES = [
  { id: 1, image: '/heroslider-full.png', alt: 'Kampus Universitas Nahdlatul Ulama Sumatera Utara' },
  { id: 2, image: '/hero-slide-generated.png', alt: 'Gedung dan fasilitas kampus UNUSU' },
  { id: 3, image: '/hero-campus.png', alt: 'Suasana kampus UNUSU' },
];

/** Jeda perpindahan slide otomatis. */
const SLIDE_INTERVAL_MS = 6000;

/**
 * Beranda portal utama program studi.
 *
 * Dipakai pada permukaan `main` (unusu.ac.id) dan `admin`
 * (prodi.unusu.ac.id). Direktori fakultas dan program studi diambil dari
 * database sehingga penambahan prodi tidak memerlukan perubahan kode.
 *
 * Hero berupa slider gambar penuh tanpa teks maupun tombol aksi; satu-satunya
 * kendali adalah panah kiri dan kanan agar banner tetap bersih. Fakultas hanya
 * tampil sebagai judul kelompok, sedangkan yang dapat diklik adalah program
 * studi dan tautannya membuka domain prodi di tab baru.
 */
export const MainLandingPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = HERO_SLIDES.length;

  const goTo = useCallback(
    (index: number) => setCurrentSlide(((index % totalSlides) + totalSlides) % totalSlides),
    [totalSlides],
  );
  const next = useCallback(() => goTo(currentSlide + 1), [currentSlide, goTo]);
  const prev = useCallback(() => goTo(currentSlide - 1), [currentSlide, goTo]);

  // Perpindahan otomatis berhenti sementara saat pengarahkan kursor atau fokus
  // berada di slider, supaya pengunjung sempat melihat gambar yang diminati.
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => goTo(currentSlide + 1), SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [currentSlide, isPaused, goTo]);

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = groupByFaculty(prodis);

  return (
    <div className="pb-20 font-sans">
      {/* 1. Hero slider penuh, tanpa teks dan tanpa tombol */}
      <section
        className="relative w-full select-none overflow-hidden bg-slate-900"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        aria-roledescription="carousel"
        aria-label="Sorotan kampus"
      >
        <div className="relative aspect-[21/9] max-h-[560px] w-full min-h-[240px] sm:min-h-[340px]">
          {HERO_SLIDES.map((slide, index) => (
            <img
              key={slide.id}
              src={slide.image}
              alt={slide.alt}
              aria-hidden={index !== currentSlide}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}

          {/* Panah kiri */}
          <button
            type="button"
            onClick={prev}
            aria-label="Slide sebelumnya"
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-4 sm:h-12 sm:w-12"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>

          {/* Panah kanan */}
          <button
            type="button"
            onClick={next}
            aria-label="Slide berikutnya"
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:h-12 sm:w-12"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
      </section>

      {/* 2. Direktori fakultas & program studi */}
      <section id="fakultas-prodi" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            EKOSISTEM WEBSITE MULTI-PRODI
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
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
