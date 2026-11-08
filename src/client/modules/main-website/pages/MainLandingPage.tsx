import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  EyeIcon,
  GlobeAltIcon,
  HeartIcon,
  NewspaperIcon,
  PresentationChartLineIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { api, toApiError } from '../../../services/api';
import {
  formatTanggalIndonesia,
  groupByFaculty,
  type DirectoryProdi,
  type DirectoryResponse,
  type PortalNewsResponse,
} from '../../../services/directory';
import { ErrorState, LoadingState } from '../../../components/ui/States';

/** Gambar representatif prodi sesuai disiplin ilmu (senada dengan desain referensi). */
const PRODI_THUMBNAILS: Record<string, string> = {
  TIF: '/images/prodi/prodi-coding.png',
  TI: '/images/prodi/prodi-coding.png',
  IKOM: '/images/prodi/prodi-ai.png',
  IKO: '/images/prodi/prodi-ai.png',
  ILKOM: '/images/prodi/prodi-ai.png',
  SI: '/images/prodi/prodi-analytics.png',
  SIN: '/images/prodi/prodi-analytics.png',
  PGSD: '/images/prodi/prodi-education.png',
  PEND: '/images/prodi/prodi-education.png',
  MNJ: '/images/prodi/prodi-finance.png',
  MAN: '/images/prodi/prodi-finance.png',
  AKN: '/images/prodi/prodi-finance.png',
  AKT: '/images/prodi/prodi-finance.png',
  AGR: '/images/prodi/prodi-education.png',
  AGB: '/images/prodi/prodi-finance.png',
  KES: '/images/prodi/prodi-ai.png',
  KDM: '/images/prodi/prodi-ai.png',
  PAI: '/images/prodi/prodi-education.png',
  KPI: '/images/prodi/prodi-education.png',
};

function getProdiThumbnail(code: string) {
  return PRODI_THUMBNAILS[code.toUpperCase()] || '/images/prodi/prodi-coding.png';
}

/** Ikon spesifik representatif tiap bidang program studi. */
function getProdiIcon(code: string) {
  const c = code.toUpperCase();
  if (['TIF', 'TI'].includes(c)) return CodeBracketIcon;
  if (['IKOM', 'IKO', 'ILKOM'].includes(c)) return CpuChipIcon;
  if (['SI', 'SIN'].includes(c)) return PresentationChartLineIcon;
  if (['PGSD', 'PEND'].includes(c)) return BookOpenIcon;
  if (['MNJ', 'MAN'].includes(c)) return BriefcaseIcon;
  if (['AKN', 'AKT'].includes(c)) return CalculatorIcon;
  if (['AGR', 'AGB'].includes(c)) return SparklesIcon;
  if (['KES', 'KDM'].includes(c)) return HeartIcon;
  if (['PAI', 'KPI'].includes(c)) return BookOpenIcon;
  return CommandLineIcon;
}

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

      {/* 2. Sekilas Tentang Program Studi di UNUSU */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <SparklesIcon className="h-4 w-4 text-emerald-700" />
                PROGRAM STUDI TERAKREDITASI
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Tentang Program Studi di UNUSU
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                Universitas Nahdlatul Ulama Sumatera Utara (UNUSU) menaungi 14 program studi unggulan
                pada 6 fakultas. Setiap program studi dirancang memadukan keilmuan modern,
                teknologi tepat guna, serta pondasi nilai keislaman Ahlussunnah wal Jama&apos;ah
                An-Nahdliyah untuk mencetak lulusan berakhlak mulia, kompeten, dan siap berkontribusi
                secara nyata di dunia kerja maupun masyarakat.
              </p>
              <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                Melalui ekosistem digital multi-tenant, setiap prodi memiliki portal mandiri yang
                menyajikan kurikulum, profil dosen, fasilitas praktikum, hingga publikasi ilmiah
                secara transparan dan akuntabel.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-5">
              <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <AcademicCapIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-lg font-extrabold text-slate-900">Kurikulum MBKM</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Adaptif dengan kebutuhan industri dan kewirausahaan modern.
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <UserGroupIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-lg font-extrabold text-slate-900">Dosen Berkualitas</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Praktisi dan akademisi berpengalaman di bidangnya.
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <BookOpenIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-lg font-extrabold text-slate-900">Website Mandiri</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  14 portal independen dengan pembaruan informasi berkala.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Direktori fakultas & program studi (Desain Sesuai Referensi Gambar) */}
      <section id="fakultas-prodi" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
        {/* Banner Header dengan Ilustrasi Gedung Kampus UNUSU & Gelombang Hijau */}
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-emerald-100/80 bg-white p-6 shadow-sm sm:p-10">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-50 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400" />

          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="z-10 space-y-3 lg:col-span-7">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-emerald-600" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-800">
                  EKOSISTEM WEBSITE MULTI-PRODI
                </span>
                <span className="h-px w-8 bg-emerald-600" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Fakultas &amp; Portal Mandiri Program Studi
              </h2>
              <p className="max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                Masing-masing program studi UNUSU memiliki identitas website independen dengan domain
                terpisah.
              </p>
            </div>

            <div className="relative flex justify-center lg:col-span-5 lg:justify-end">
              <div className="relative h-44 w-full max-w-md overflow-hidden rounded-2xl shadow-md sm:h-52">
                <img
                  src="/images/prodi/campus-building-header.png"
                  alt="Gedung Kampus UNUSU"
                  className="h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-transparent" />
                <span className="absolute bottom-2.5 right-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold text-emerald-900 backdrop-blur-xs">
                  Gedung Kampus UNUSU
                </span>
              </div>
            </div>
          </div>
        </div>

        {directoryQuery.isLoading && <LoadingState label="Memuat direktori program studi" />}

        {directoryQuery.isError && <ErrorState message={toApiError(directoryQuery.error).message} />}

        {directoryQuery.isSuccess && prodis.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">Belum ada program studi yang terdaftar.</p>
          </div>
        )}

        {/* Baris per Fakultas: Kolom Kiri Info Fakultas + Kolom Kanan Kartu-Kartu Prodi */}
        <div className="space-y-6">
          {faculties.map((faculty) => (
            <div
              key={faculty.id}
              className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-6"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Kolom Kiri: Panel Fakultas dengan Gelombang Hijau */}
                <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 p-6 lg:col-span-3">
                  <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-2xl" />

                  <div className="space-y-4">
                    <span className="inline-flex items-center rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-black tracking-wider text-white shadow-xs">
                      {faculty.code}
                    </span>
                    <h3 className="text-lg font-black leading-snug text-slate-900">
                      {faculty.name}
                    </h3>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-600">
                    <Square3Stack3DIcon className="h-4 w-4 text-emerald-700" />
                    <span>{faculty.prodis.length} Program Studi</span>
                  </div>
                </div>

                {/* Kolom Kanan: Grid Kartu Prodi dengan Banner Gambar & Ikon Terapung */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-9 lg:grid-cols-3">
                  {faculty.prodis.map((prodi) => {
                    const href = prodi.primaryHostname ? `https://${prodi.primaryHostname}/` : null;
                    const IconComponent = getProdiIcon(prodi.code);
                    const thumbnail = getProdiThumbnail(prodi.code);

                    const cardContent = (
                      <>
                        {/* Banner Gambar Atas Kartu */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                          <img
                            src={thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                          {/* Ikon Terapung Hijau Khas Desain */}
                          <div className="absolute -bottom-3 left-4 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-emerald-700 text-white shadow-md transition-transform duration-300 group-hover:scale-110">
                            <IconComponent className="h-5 w-5" />
                          </div>
                        </div>

                        {/* Konten Teks Bawah */}
                        <div className="flex flex-1 flex-col p-4 pt-6">
                          <h4 className="text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-800">
                            {prodi.name}
                          </h4>

                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <AcademicCapIcon className="h-4 w-4 text-emerald-700" />
                            <span>{prodi.degree}</span>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                              <GlobeAltIcon className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="truncate font-mono text-[11px] font-semibold text-emerald-800">
                                {prodi.primaryHostname ?? 'domain belum tersedia'}
                              </span>
                            </div>

                            {href && (
                              <span className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-all group-hover:bg-emerald-700 group-hover:text-white">
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );

                    const baseClass =
                      'group flex min-h-[44px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all';

                    if (!href) {
                      return (
                        <div key={prodi.id} className={`${baseClass} opacity-60`}>
                          {cardContent}
                        </div>
                      );
                    }

                    return (
                      <a
                        key={prodi.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${baseClass} hover:-translate-y-1 hover:border-emerald-600 hover:shadow-lg`}
                      >
                        {cardContent}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
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
    </div>
  );
};
