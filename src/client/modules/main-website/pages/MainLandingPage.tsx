import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { api, toApiError } from '../../../services/api';
import {
  formatTanggalIndonesia,
  groupByFaculty,
  type DirectoryResponse,
  type PortalNewsResponse,
} from '../../../services/directory';
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

  // Berita dari seluruh prodi. Kegagalan endpoint ini tidak boleh merusak
  // tampilan direktori, sehingga galatnya ditangani terpisah di seksinya.
  const newsQuery = useQuery({
    queryKey: ['public', 'news'],
    queryFn: () =>
      api
        .get<PortalNewsResponse>('/public/news', { params: { limit: 6 } })
        .then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = groupByFaculty(prodis);
  const news = newsQuery.data?.items ?? [];

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
                <span className="flex h-9 min-w-[3rem] items-center justify-center rounded-lg bg-emerald-700 px-2 text-[11px] font-extrabold text-white shadow-sm">
                  {faculty.code}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{faculty.name}</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                  {faculty.prodis.length} Program Studi
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {faculty.prodis.map((prodi) => {
                  const href = prodi.primaryHostname ? `https://${prodi.primaryHostname}/` : null;

                  const body = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-800 ring-1 ring-emerald-100">
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
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                          {prodi.degree}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                        {prodi.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="truncate font-mono text-[10px] font-bold text-emerald-700">
                          {prodi.primaryHostname ?? 'domain belum tersedia'}
                        </p>
                        {href && (
                          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-emerald-700" />
                        )}
                      </div>
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
                      className={`${baseClass} hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-lg`}
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

      {/* 3. Berita terbaru dari seluruh program studi */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              KABAR KAMPUS
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Berita Terbaru Program Studi
            </h2>
            <p className="mt-2 max-w-2xl text-xs text-slate-500 sm:text-sm">
              Kegiatan, prestasi, dan pengumuman terbaru yang dikirim dari website setiap program
              studi.
            </p>
          </div>
          <Link
            to="/berita"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-600 hover:text-emerald-800"
          >
            Lihat Selengkapnya
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {newsQuery.isLoading && (
          <div className="mt-8">
            <LoadingState label="Memuat berita program studi" />
          </div>
        )}

        {newsQuery.isError && (
          <div className="mt-8">
            <ErrorState message={toApiError(newsQuery.error).message} />
          </div>
        )}

        {newsQuery.isSuccess && news.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <NewspaperIcon className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Belum ada berita terbit</p>
            <p className="mt-1 text-xs text-slate-500">
              Berita yang dipublikasikan dari website prodi akan tampil di sini.
            </p>
          </div>
        )}

        {newsQuery.isSuccess && news.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => {
                // Seluruh kartu adalah tautan ke detail berita di domain prodi
                // asalnya. Slug berita hanya unik per prodi, sehingga detail
                // memang harus dibuka di sana.
                const detailHref = item.url;
                const Card: React.ElementType = detailHref ? 'a' : 'div';
                const cardProps = detailHref
                  ? {
                      href: detailHref,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      'aria-label': `Baca ${item.title} di website ${item.studyProgramName}`,
                    }
                  : {};

                return (
                  <Card
                    key={item.id}
                    {...cardProps}
                    className="group flex min-h-[44px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-lg"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
                          <NewspaperIcon className="h-10 w-10 text-emerald-700/30" />
                        </div>
                      )}

                      <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                        {item.studyProgramCode}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[11px] font-bold text-emerald-800">
                        {item.studyProgramName}
                      </p>

                      <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                        {item.title}
                      </h3>

                      {item.excerpt && (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {item.excerpt}
                        </p>
                      )}

                      <div className="mt-auto flex items-center gap-3 pt-4 text-[11px] font-medium text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          {formatTanggalIndonesia(item.publishedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <EyeIcon className="h-3.5 w-3.5" />
                          {item.views.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/*
              "Lihat selengkapnya" bukan pembuka detail berita — detail dibuka
              dengan mengklik kartunya. Tautan ini membawa pengunjung ke berita
              lainnya di halaman arsip portal.
            */}
            <div className="mt-8 flex justify-center">
              <Link
                to="/berita"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white transition-colors hover:bg-emerald-800"
              >
                Lihat Selengkapnya
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* 4. Ajakan masuk portal */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14532D] via-emerald-800 to-emerald-900 p-8 text-white sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] opacity-40 [background-size:22px_22px]" />
          <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-white sm:text-xl">
                Pengelola website program studi
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-emerald-100">
                Masuk dengan akun ONE UNUSU untuk mengelola berita, profil, dan konten website
                program studi Anda.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-slate-950 transition-colors hover:bg-amber-300"
            >
              Masuk ke Portal
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
