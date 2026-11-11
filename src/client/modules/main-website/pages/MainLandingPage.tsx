import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ShieldCheckIcon,
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
import { Reveal } from '../../../components/ui/Reveal';

/** Foto representatif per fakultas sesuai desain referensi mockup UNUSU. */
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

/** Ikon spesifik representatif tiap bidang program studi. */
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

/** Banner hero portal. Murni gambar banner utuh: layout split teks/grafis di satu sisi & foto mahasiswa/kampus di sisi lain. */
const HERO_SLIDES = [
  { id: 1, image: '/hero-slide-split-1.png', alt: 'Penerimaan Mahasiswa Baru Kampus Unggul Berkarakter UNUSU' },
  { id: 2, image: '/hero-slide-split-2.png', alt: 'Ekosistem Digital Multi-Prodi Universitas Nahdlatul Ulama Sumatera Utara' },
  { id: 3, image: '/hero-slide-split-3.png', alt: 'Kampus Inovatif dan Religius UNUSU' },
];

interface PublicHeroSlide {
  imageUrl: string;
  alt: string;
  linkUrl: string;
}

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

  // Banner hero dibaca dari widget hero_slider milik scope yang sedang dibuka:
  // pada portal pusat (`prodi.unusu.ac.id`) endpoint ini mengembalikan banner
  // portal pusat, pada website prodi mengembalikan banner prodi tersebut.
  // Bila belum ada slide atau API gagal, tampilan memakai HERO_SLIDES statis
  // sebagai cadangan sehingga beranda tidak pernah kosong.
  const heroQuery = useQuery({
    queryKey: ['public', 'hero-slides'],
    queryFn: () =>
      api.get<{ slides: PublicHeroSlide[] }>('/public/hero-slides').then((res) => res.data.slides),
    staleTime: 60_000,
  });

  const slides = useMemo(() => {
    const remote = heroQuery.data ?? [];
    if (remote.length === 0) {
      return HERO_SLIDES.map((slide) => ({
        id: `fallback-${slide.id}`,
        image: slide.image,
        alt: slide.alt,
        linkUrl: null as string | null,
      }));
    }
    return remote.map((slide, index) => ({
      id: `remote-${index}`,
      image: slide.imageUrl,
      alt: slide.alt || 'Banner Program Studi UNUSU',
      linkUrl: slide.linkUrl ? slide.linkUrl : null,
    }));
  }, [heroQuery.data]);

  const totalSlides = slides.length;

  const goTo = useCallback(
    (index: number) => {
      if (totalSlides === 0) return;
      setCurrentSlide(((index % totalSlides) + totalSlides) % totalSlides);
    },
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

  // Jumlah slide dapat berubah setelah data termuat; jepit indeks agar tidak
  // menunjuk slide yang sudah tidak ada.
  useEffect(() => {
    if (currentSlide > totalSlides - 1) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

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
  // Kelompokkan per fakultas lalu urutkan dari fakultas dengan jumlah prodi paling sedikit ke paling banyak
  const faculties = useMemo(() => {
    const list = groupByFaculty(prodis);
    return list.slice().sort((a, b) => a.prodis.length - b.prodis.length);
  }, [prodis]);
  const news = newsQuery.data?.items ?? [];

  return (
    <div className="pb-20 font-sans">
      {/* 1. Hero slider penuh (Full Height Layar Layar / Viewport), tanpa teks dan tanpa tombol */}
      <section
        className="relative w-full select-none overflow-hidden bg-slate-900"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        aria-roledescription="carousel"
        aria-label="Sorotan kampus"
      >
        <div className="relative w-full h-[calc(100vh-120px)] min-h-[480px] max-h-[860px]">
          {slides.map((slide, index) => {
            const image = (
              <img
                src={slide.image}
                alt={slide.alt}
                aria-hidden={index !== currentSlide}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              />
            );

            if (slide.linkUrl) {
              return (
                <a
                  key={slide.id}
                  href={slide.linkUrl}
                  className="block h-full w-full"
                  aria-hidden={index !== currentSlide}
                  tabIndex={index === currentSlide ? 0 : -1}
                >
                  {image}
                </a>
              );
            }

            return <React.Fragment key={slide.id}>{image}</React.Fragment>;
          })}

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

      {/* 2. Sekilas Tentang Program Studi di UNUSU (Sesuai Referensi Gambar) */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:pt-14 lg:pt-16 sm:px-6 pb-12 sm:pb-16 lg:pb-20">
        <div className="relative bg-gradient-to-r from-white via-[#F0FDF4]/85 to-white px-6 pt-2 pb-6 sm:px-10 sm:pt-3 sm:pb-8 lg:px-12 lg:pt-3 lg:pb-10 text-slate-900">
          {/* Latar Belakang 1: Halftone Dot Matrix di belakang duo mahasiswa & kanan */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 select-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.45) 2px, transparent 2px)',
              backgroundSize: '20px 20px',
              maskImage: 'radial-gradient(circle at 48% 50%, black 20%, transparent 65%)',
              WebkitMaskImage: 'radial-gradient(circle at 48% 50%, black 20%, transparent 65%)',
            }}
          />

          {/* Latar Belakang 2: Halftone Corner Terpisah (Kiri Bawah & Kanan Atas) dengan Gradasi Masking 4 Sisi */}
          <img
            src="/assets/tentang/halftone-kiri-bawah.png"
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-44 sm:w-56 lg:w-64 h-auto object-contain pointer-events-none select-none z-0"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 70%, transparent 100%), linear-gradient(to top, transparent 0%, black 18%, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 70%, transparent 100%), linear-gradient(to top, transparent 0%, black 18%, black 70%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          />
          <img
            src="/assets/tentang/halftone-kanan-atas.png"
            alt=""
            aria-hidden="true"
            className="absolute top-0 right-0 w-48 sm:w-64 lg:w-72 h-auto object-contain pointer-events-none select-none z-0"
            style={{
              maskImage: 'linear-gradient(to left, transparent 0%, black 18%, black 70%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 18%, black 70%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 70%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          />

          {/* Latar Belakang 3: Ambient Mint Glow Terpisah (Kiri Bawah & Kanan Atas) dengan Gradasi Tepi Pudar Total */}
          <img
            src="/assets/tentang/mint-glow-kiri-bawah.png"
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-80 sm:w-96 lg:w-[460px] h-auto object-contain opacity-60 pointer-events-none select-none z-0 mix-blend-multiply"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 65%, transparent 100%), linear-gradient(to top, transparent 0%, black 25%, black 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 65%, transparent 100%), linear-gradient(to top, transparent 0%, black 25%, black 65%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          />
          <img
            src="/assets/tentang/mint-glow-kanan-atas.png"
            alt=""
            aria-hidden="true"
            className="absolute top-0 right-0 w-80 sm:w-96 lg:w-[460px] h-auto object-contain opacity-60 pointer-events-none select-none z-0 mix-blend-multiply"
            style={{
              maskImage: 'linear-gradient(to left, transparent 0%, black 25%, black 65%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 25%, black 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 25%, black 65%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 25%, black 65%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          />

          {/* Tiga Kolom: [Kiri: Teks] [Tengah: Foto Duo Mahasiswa + Circular Arch] [Kanan: 3 Kartu Vertikal] */}
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Kolom 1 (Kiri): Judul & Deskripsi */}
            <div className="relative z-40 space-y-6 lg:col-span-4 xl:col-span-4">
              <Reveal direction="right" delayMs={100}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-700" />
                  <span>PROGRAM STUDI TERAKREDITASI</span>
                </span>
              </Reveal>

              <Reveal direction="up" delayMs={200}>
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-slate-900 leading-[1.2] !mb-14">
                  Tentang Program Studi <br className="hidden sm:inline" />
                  <span className="text-emerald-700">di UNUSU</span>
                </h2>
              </Reveal>

              <Reveal direction="right" delayMs={250}>
                <div className="w-16 h-1 bg-emerald-600 rounded-full !mb-6" />
              </Reveal>

              <Reveal direction="up" delayMs={300}>
                <div className="relative">
                  {/* Soft White Radial Glow Backdrop */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-6 -z-10 rounded-3xl pointer-events-none select-none backdrop-blur-[1px]"
                    style={{
                      background: 'radial-gradient(ellipse at 40% 50%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.8) 35%, rgba(255,255,255,0.35) 65%, transparent 100%)',
                      maskImage: 'radial-gradient(ellipse at 40% 50%, black 30%, rgba(0,0,0,0.5) 60%, transparent 95%)',
                      WebkitMaskImage: 'radial-gradient(ellipse at 40% 50%, black 30%, rgba(0,0,0,0.5) 60%, transparent 95%)',
                    }}
                  />
                  <p className="relative text-xs sm:text-[13px] leading-relaxed text-slate-800 font-medium">
                    Universitas Nahdlatul Ulama Sumatera Utara (UNUSU) menaungi 14 program studi unggulan
                    pada 6 fakultas. Setiap program studi dirancang memadukan keilmuan modern,
                    teknologi tepat guna, serta pondasi nilai keislaman Ahlussunnah wal Jama&apos;ah
                    An-Nahdliyah untuk mencetak lulusan berakhlak mulia, kompeten, dan siap berkontribusi
                    secara nyata di dunia kerja maupun masyarakat.
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Kolom 2 (Tengah): Foto Duo Mahasiswa UNUSU */}
            <div className="relative z-0 flex justify-center items-end lg:col-span-5 xl:col-span-5 self-stretch min-h-[320px] sm:min-h-[360px] lg:min-h-[380px]">
              {/* Green Circular Arch di Belakang Kepala/Bahu Mahasiswa */}
              <Reveal direction="zoom" delayMs={150} durationMs={900} className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none">
                <img
                  src="/assets/tentang/circular-arch.png"
                  alt=""
                  aria-hidden="true"
                  className="w-[420px] sm:w-[490px] lg:w-[540px] max-w-none object-contain opacity-95 select-none"
                />
              </Reveal>

              {/* Foto Utama Duo Mahasiswa UNUSU */}
              <Reveal direction="up" delayMs={250} durationMs={800} className="relative z-10">
                <img
                  src="/assets/tentang/students-duo.png"
                  alt="Mahasiswa dan Mahasiswi Berprestasi Universitas Nahdlatul Ulama Sumatera Utara"
                  className="w-[330px] sm:w-[400px] lg:w-[450px] xl:w-[480px] max-w-none h-auto -mb-6 sm:-mb-8 lg:-mb-10 object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.18)] select-none transition-transform duration-500 hover:scale-[1.02]"
                />
              </Reveal>
            </div>

            {/* Kolom 3 (Kanan): 3 Kartu Vertikal */}
            <div className="relative z-40 flex flex-col gap-2.5 lg:col-span-3 xl:col-span-3 max-w-[270px] sm:max-w-none lg:max-w-[260px] lg:ml-auto w-full">
              {/* Kartu 1: Kurikulum MBKM */}
              <Reveal direction="left" delayMs={200}>
                <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Kurikulum <br />
                      MBKM
                    </h3>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <AcademicCapIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="my-2 h-0.5 w-6 rounded-full bg-emerald-500" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    Adaptif dengan kebutuhan industri dan kewirausahaan modern.
                  </p>
                </div>
              </Reveal>

              {/* Kartu 2: Dosen Berkualitas */}
              <Reveal direction="left" delayMs={350}>
                <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Dosen <br />
                      Berkualitas
                    </h3>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                      <UserGroupIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="my-2 h-0.5 w-6 rounded-full bg-emerald-500" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    Praktisi dan akademisi berpengalaman di bidangnya.
                  </p>
                </div>
              </Reveal>

              {/* Kartu 3: Website Mandiri */}
              <Reveal direction="left" delayMs={500}>
                <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Website <br />
                      Mandiri
                    </h3>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <BookOpenIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="my-2 h-0.5 w-6 rounded-full bg-emerald-500" />
                  <p className="text-xs leading-relaxed text-slate-600">
                    14 portal independen dengan pembaruan informasi berkala.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Emerald Wave Banner di Depan (z-30) Menutupi Potongan Bawah Foto Mahasiswa (Tampil Utuh Bebas Tanpa Terpotong Overflow) */}
          <div
            className="absolute -bottom-10 sm:-bottom-13 lg:-bottom-16 left-0 right-0 z-30 pointer-events-none select-none flex items-end"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            }}
          >
            <img
              src="/assets/tentang/wave-banner.png"
              alt=""
              aria-hidden="true"
              className="w-full h-auto object-contain object-bottom"
            />
          </div>
        </div>
      </section>

      {/* 3. Direktori fakultas & program studi (Desain Sesuai Referensi Gambar Mockup UNUSU) */}
      <section id="fakultas-prodi" className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24 lg:pt-28">
        {/* Banner Header: Bersih Latar Putih dengan Tekstur Halftone Dot Matrix & Corner di Kiri-Kanan */}
        <div className="relative mb-8 overflow-hidden bg-white">
          {/* Tekstur 1: Halftone Dot Matrix di Latar Kiri (Fade Out Mulus di Tepi Kiri, Kanan, Atas, & Bawah) */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-2/3 opacity-30 select-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.45) 2.5px, transparent 2.5px)',
              backgroundSize: '22px 22px',
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 65%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 65%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          />

          {/* Tekstur 2: Halftone Dot Matrix Melingkar di Pojok Kanan Atas dengan Fade Out ke Segala Sisi */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-64 w-64 opacity-40 select-none sm:h-80 sm:w-80 lg:h-96 lg:w-96"
            style={{
              backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.5) 2.5px, transparent 2.5px)',
              backgroundSize: '20px 20px',
              maskImage: 'radial-gradient(circle at 80% 20%, black 15%, transparent 70%), linear-gradient(to left, transparent 0%, black 15%), linear-gradient(to bottom, transparent 0%, black 15%)',
              WebkitMaskImage: 'radial-gradient(circle at 80% 20%, black 15%, transparent 70%), linear-gradient(to left, transparent 0%, black 15%), linear-gradient(to bottom, transparent 0%, black 15%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          />

          {/* Tekstur 3: Corner Asset Tekstur Halftone Asli dengan Radial & Multi-Directional Gradient Masking agar Tepi Luar & Dalam Memudar 100% Lembut ke Putih */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-48 w-48 overflow-hidden select-none sm:h-64 sm:w-64 lg:h-80 lg:w-80"
            style={{
              maskImage: 'radial-gradient(circle at 100% 0%, black 20%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.3) 70%, transparent 95%), linear-gradient(to left, transparent 0%, black 18%, black 72%, transparent 98%), linear-gradient(to bottom, transparent 0%, black 18%, black 72%, transparent 98%)',
              WebkitMaskImage: 'radial-gradient(circle at 100% 0%, black 20%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.3) 70%, transparent 95%), linear-gradient(to left, transparent 0%, black 18%, black 72%, transparent 98%), linear-gradient(to bottom, transparent 0%, black 18%, black 72%, transparent 98%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'destination-in',
            }}
          >
            <img
              src="/assets/tentang/halftone-kanan-atas.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain opacity-35"
            />
            {/* Overlay Gradient Tambahan: Gradasi Lembut ke Arah Kiri dan Bawah */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/70" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/70" />
          </div>

          {/* Tekstur 4: Ambient Glow Hijau Mint Lembut Memudar di Belakang Gedung */}
          <div className="pointer-events-none absolute right-12 top-10 -z-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

          <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            {/* Teks di Sisi Kiri */}
            <div className="z-10 space-y-3 pb-8 lg:col-span-6 xl:col-span-7">
              <Reveal direction="right" delayMs={100}>
                <div className="flex items-center gap-3">
                  <span className="h-0.5 w-7 rounded-full bg-[#166534]" />
                  <span className="text-xs font-black uppercase tracking-widest text-[#166534]">
                    EKOSISTEM WEBSITE MULTI-PRODI
                  </span>
                  <span className="h-0.5 w-7 rounded-full bg-[#166534]" />
                </div>
              </Reveal>
              <Reveal direction="up" delayMs={200}>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl lg:leading-tight">
                  Fakultas &amp; Portal Mandiri Program Studi
                </h2>
              </Reveal>
              <Reveal direction="up" delayMs={300}>
                <p className="max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                  Masing-masing program studi UNUSU memiliki identitas website independen dengan domain
                  terpisah.
                </p>
              </Reveal>
            </div>

            {/* Gambar Gedung UNUSU Megah Dibesarkan & Dicrop Bagian Bawahnya di Balik Strip Flat */}
            <div className="relative z-10 flex justify-center lg:col-span-6 xl:col-span-5 lg:justify-end -mb-16 sm:-mb-24 lg:-mb-32">
              <Reveal direction="zoom" delayMs={250} durationMs={850}>
                <img
                  src="/tentang-custom.png"
                  alt="Gedung Kampus UNUSU"
                  className="h-72 sm:h-[380px] lg:h-[460px] xl:h-[500px] w-auto max-w-sm sm:max-w-md lg:max-w-xl object-contain object-bottom drop-shadow-2xl"
                />
              </Reveal>
            </div>
          </div>

          {/* Bar Flat Pembatas: Garis Emas & Strip Hijau UNUSU (#166534) Memotong Rapi Dasar Foto Gedung */}
          <div className="relative z-20 w-full mt-2 sm:mt-4 shadow-xs">
            <div className="h-1.5 w-full bg-[#fbbf24]" />
            <div className="h-3.5 w-full bg-[#166534]" />
          </div>
        </div>

        {/* Header Seksi Daftar: "Daftar Fakultas & Program Studi" */}
        <div id="daftar-fakultas" className="mb-10 text-center scroll-mt-24">
          <div className="flex items-center justify-center gap-3">
            <span className="h-0.5 w-10 rounded-full bg-[#166534]" />
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Daftar Fakultas &amp; Program Studi
            </h2>
            <span className="h-0.5 w-10 rounded-full bg-[#166534]" />
          </div>
          <p className="mt-2 text-xs text-slate-500 sm:text-sm">
            Pilih fakultas untuk melihat program studi dan mengakses portal mandirinya.
          </p>
        </div>

        {directoryQuery.isLoading && <LoadingState label="Memuat direktori program studi" />}

        {directoryQuery.isError && <ErrorState message={toApiError(directoryQuery.error).message} />}

        {directoryQuery.isSuccess && prodis.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">Belum ada program studi yang terdaftar.</p>
          </div>
        )}

        {/* Grid Kartu 6 Fakultas Sesuai Desain Mockup Gambar (Ketinggian Ringkas & Proporsional) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {faculties.map((faculty, idx) => {
            const facultyImg = getFakultasImage(faculty.code);
            const delay = (idx % 3) * 120; // Stagger per baris (0ms, 120ms, 240ms)

            return (
              <Reveal key={faculty.id} direction="up" delayMs={delay} className="flex">
                <div className="group flex flex-col flex-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
                  {/* Bagian Atas: 2 Kolom (Kiri: Panel Hijau Foto | Kanan: Daftar List Prodi) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
                    {/* Kolom Kiri Card: Panel Hijau Tua Navbar (#166534) dengan Gambar Menjorok Halus ke Bawah Teks */}
                    <div className="relative flex flex-col justify-between overflow-hidden bg-[#166534] p-4 text-white sm:col-span-5 min-h-[165px] sm:min-h-[175px]">
                      {/* Header Panel Kiri: Badge Kode & Nama Fakultas */}
                      <div className="relative z-10 space-y-2">
                        <span className="inline-flex items-center rounded-md bg-amber-400 px-2.5 py-0.5 text-[11px] font-black tracking-wider text-slate-950 shadow-xs">
                          {faculty.code}
                        </span>
                        <h3 className="text-base font-black leading-tight text-white drop-shadow-xs">
                          {faculty.name}
                        </h3>
                      </div>

                      {/* Foto Ilustrasi Representatif Fakultas */}
                      <div className="relative z-0 -mx-4 -mb-4 -mt-3 h-20 sm:h-24 w-[calc(100%+2rem)] overflow-hidden bg-[#166534]">
                        <img
                          src={facultyImg}
                          alt={faculty.name}
                          loading="lazy"
                          className="h-full w-full object-cover object-center transition-transform duration-500 will-change-transform group-hover:scale-105"
                        />
                        <div className="pointer-events-none absolute -top-1 inset-x-0 h-12 bg-gradient-to-b from-[#166534] via-[#166534]/85 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/35 to-transparent" />
                      </div>
                    </div>

                    {/* Kolom Kanan Card: Header "Program Studi" + List Bullet Prodi + Tombol "Lihat Detail Fakultas" */}
                    <div className="flex flex-col justify-between p-4 sm:col-span-7 bg-white">
                      <div>
                        {/* Sub-Header Program Studi */}
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 mb-2.5">
                          <AcademicCapIcon className="h-3.5 w-3.5 text-[#166534]" />
                          <span>Program Studi</span>
                        </div>

                        {/* List Program Studi dengan Bullet Point Hijau */}
                        <ul className="space-y-1.5">
                          {faculty.prodis.map((prodi) => {
                            const href = prodi.primaryHostname ? `https://${prodi.primaryHostname}/` : null;
                            return (
                              <li key={prodi.id} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-slate-800 hover:text-emerald-700 hover:underline transition-colors"
                                    title={`Buka portal ${prodi.name}`}
                                  >
                                    {prodi.name} <span className="font-semibold text-slate-500">({prodi.degree})</span>
                                  </a>
                                ) : (
                                  <span className="font-medium text-slate-600">
                                    {prodi.name} ({prodi.degree})
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Tombol Aksi di Bawah: "Lihat Detail Fakultas" */}
                      <div className="mt-4 pt-2.5 border-t border-slate-100">
                        <Link
                          to={`/fakultas?faculty=${faculty.id}`}
                          className="inline-flex w-full items-center justify-between rounded-lg bg-emerald-50/80 px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition-all hover:bg-emerald-100/90 group-hover:bg-[#166534] group-hover:text-white"
                        >
                          <span>Lihat Detail Fakultas</span>
                          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 3. Berita terbaru dari seluruh program studi */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal direction="up" delayMs={50}>
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
          </Reveal>
          <Reveal direction="left" delayMs={150}>
            <Link
              to="/berita"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-emerald-600 hover:text-emerald-800"
            >
              Lihat Selengkapnya
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Reveal>
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
              {news.map((item, idx) => {
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
                const delay = (idx % 3) * 120;

                return (
                  <Reveal key={item.id} direction="up" delayMs={delay} className="flex">
                    <Card
                      {...cardProps}
                      className="group flex flex-1 min-h-[44px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-lg"
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
                  </Reveal>
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
