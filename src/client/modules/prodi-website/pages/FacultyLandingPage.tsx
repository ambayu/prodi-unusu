import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../services/api';
import { GambarTentang } from '../../../components/ui/GambarTentang';
import { useTenant } from '../../../hooks/useSite';
import { useSeo } from '../../../hooks/useSeo';
import type { DirectoryProdi, DirectoryResponse } from '../../../services/directory';

interface HeroSlide {
  imageUrl: string;
  alt: string;
  linkUrl: string;
}

interface HeroSlidesResponse {
  slides: HeroSlide[];
  autoplayMs: number;
  showDots: boolean;
}

interface PublikasiItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

/**
 * Gambar hero bawaan per fakultas.
 *
 * Berkas sudah tersedia di `public/images/fakultas/`. Dipakai sebagai slide
 * bawaan bila admin belum menyusun hero sendiri lewat Page Builder, sehingga
 * setiap fakultas tetap punya wajah visual yang berbeda sejak awal.
 */
const HERO_IMAGES_BY_FACULTY: Record<string, string[]> = {
  FIK: ['/images/fakultas/fik.png', '/images/prodi/prodi-coding.png', '/images/prodi/campus-building-header.png'],
  FIP: ['/images/fakultas/fip.png', '/images/prodi/prodi-education.png', '/images/prodi/campus-building-header.png'],
  FE: ['/images/fakultas/fe.png', '/images/prodi/prodi-finance.png', '/images/prodi/campus-building-header.png'],
  FAPERTA: ['/images/fakultas/faperta.png', '/images/prodi/campus-building-header.png'],
  FIKES: ['/images/fakultas/fikes.png', '/images/prodi/prodi-analytics.png', '/images/prodi/campus-building-header.png'],
  FAI: ['/images/fakultas/fai.png', '/images/prodi/prodi-education.png', '/images/prodi/campus-building-header.png'],
};

const HERO_DEFAULT = ['/heroslider-full.png', '/hero-campus.png'];

/**
 * Beranda website fakultas.
 *
 * Sebelumnya fakultas memakai beranda prodi yang sama persis: hero slider,
 * "Mengenal Program Studi", berita, dan galeri. Akibatnya domain fakultas
 * terasa seperti duplikat prodi dan tidak menjelaskan apa pun tentang
 * fakultas itu sendiri.
 *
 * Beranda ini disusun dari hal yang memang menjadi milik fakultas:
 * identitasnya, program studi di bawahnya, pimpinan, dan kontaknya.
 * Fakultas tidak punya kurikulum maupun sarana-prasarana sendiri — keduanya
 * milik prodi — sehingga tidak ditampilkan di sini.
 */
export const FacultyLandingPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant });

  const namaFakultas = tenant?.name ?? 'Fakultas';
  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  const heroSlidesQuery = useQuery({
    queryKey: ['public', 'hero-slides', tenant?.id ?? null],
    queryFn: () => api.get<HeroSlidesResponse>('/public/hero-slides').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const fallbackSlides = (HERO_IMAGES_BY_FACULTY[tenant?.code ?? ''] ?? HERO_DEFAULT).map((imageUrl, index) => ({
    imageUrl,
    alt: `${namaFakultas} - gambar ${index + 1}`,
    linkUrl: '',
  }));
  const slides = heroSlidesQuery.data?.slides.length ? heroSlidesQuery.data.slides : fallbackSlides;
  const [slideIdx, setSlideIdx] = useState(0);
  const autoplayMs = heroSlidesQuery.data?.autoplayMs ?? 6000;
  const showDots = heroSlidesQuery.data?.showDots ?? true;

  useEffect(() => {
    setSlideIdx(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(timer);
  }, [autoplayMs, slides.length]);

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Profil fakultas dari seeder (`seed-faculty-content.ts`).
   *
   * `overview` dipakai sebagai isi blok "Tentang Fakultas", dan
   * `heroImageUrl` sebagai gambar pendamping. Bila admin belum mengisinya,
   * tampilan memakai teks bawaan dan gambar fakultas yang tersedia.
   */
  const tentangQuery = useQuery({
    queryKey: ['public', 'profile', tenant?.id ?? null],
    queryFn: () =>
      api
        .get<{ profile: { overview?: string | null; heroImageUrl?: string | null } | null }>(
          '/public/profile',
        )
        .then((res) => res.data.profile),
    staleTime: 5 * 60 * 1000,
  });

  const overview =
    typeof tentangQuery.data?.overview === 'string' && tentangQuery.data.overview.trim()
      ? tentangQuery.data.overview.trim()
      : null;

  /**
   * Gambar pendamping blok "Tentang Fakultas".
   *
   * Urutan sumber: gambar hasil unggahan admin (`heroImageUrl`), lalu gambar
   * gedung bawaan portal `/tentang-custom.png`. Gambar hero slider sengaja tidak
   * dipakai lagi agar blok ini punya wajah yang tetap dan tidak ikut berganti
   * setiap kali slider berputar.
   */
  const heroGambar =
    (typeof tentangQuery.data?.heroImageUrl === 'string' && tentangQuery.data.heroImageUrl.trim()) ||
    '/tentang-custom.png';

  const beritaQuery = useQuery({
    queryKey: ['public', 'posts', 3],
    queryFn: () =>
      api
        .get<{ items: PublikasiItem[] }>('/public/posts', { params: { page: 1, perPage: 3 } })
        .then((res) => res.data.items),
    retry: 1,
  });

  const prodis: DirectoryProdi[] = (directoryQuery.data?.studyPrograms ?? []).filter(
    (p) => p.faculty?.id === tenant?.facultyId,
  );

  const kontak = tenant?.contact;

  return (
    <div className="bg-[#FCFDFA]">
      {/* ---------- HERO SLIDER ---------- */}
      <section className="relative w-full overflow-hidden bg-slate-900 select-none">
        <div className="relative w-full aspect-[21/9] min-h-[320px] sm:min-h-[440px] lg:min-h-[520px] xl:min-h-[560px]">
          {slides.map((slide, idx) => (
            <img
              key={`${slide.imageUrl}-${idx}`}
              src={slide.imageUrl}
              alt={slide.alt || `${namaFakultas} - gambar ${idx + 1}`}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                idx === slideIdx ? 'opacity-100' : 'opacity-0'
              }`}
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          ))}

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setSlideIdx((idx) => (idx - 1 + slides.length) % slides.length)}
                aria-label="Slide sebelumnya"
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/60 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-slate-950/90 sm:left-6 sm:h-14 sm:w-14"
              >
                <ChevronLeftIcon className="h-7 w-7 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIdx((idx) => (idx + 1) % slides.length)}
                aria-label="Slide berikutnya"
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/60 bg-slate-950/65 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-slate-950/90 sm:right-6 sm:h-14 sm:w-14"
              >
                <ChevronRightIcon className="h-7 w-7 stroke-[2.5]" />
              </button>
            </>
          )}

          {showDots && slides.length > 1 && (
            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-slate-950/55 px-4 py-2 backdrop-blur-sm">
              {slides.map((slide, idx) => (
                <button
                  key={`${slide.imageUrl}-${idx}`}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    idx === slideIdx ? 'w-10 bg-[#fbbf24] shadow-sm' : 'w-3 bg-white/75 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- TENTANG FAKULTAS ---------- */}
      <section className="bg-editorial-paper px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Teks */}
            <div className="space-y-6 lg:col-span-7">
              <div className="space-y-3">
                <span
                  className="inline-block rounded-full px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-widest"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  Tentang Fakultas
                </span>
                <h2 className="font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl lg:text-[42px]">
                  {namaFakultas}
                </h2>
              </div>

              {tentangQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="h-5 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-11/12 animate-pulse rounded bg-slate-200" />
                  <div className="h-5 w-9/12 animate-pulse rounded bg-slate-200" />
                </div>
              ) : (
                <p className="text-[16px] sm:text-[17px] leading-[1.8] text-slate-800 font-medium">
                  {overview ??
                    `${namaFakultas} merupakan bagian dari Universitas Nahdlatul Ulama Sumatera Utara yang ` +
                      'menyelenggarakan pendidikan tinggi berbasis nilai Ahlussunnah wal Jama’ah An-Nahdliyah, ' +
                      'dengan memadukan penguasaan ilmu pengetahuan dan teknologi serta pembentukan karakter mahasiswa.'}
                </p>
              )}

              {/* Ringkasan angka */}
              <dl className="flex flex-wrap gap-4 pt-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs">
                  <dt className="text-[13px] font-extrabold uppercase tracking-wider text-slate-700">
                    Program Studi
                  </dt>
                  <dd className="font-display text-3xl font-extrabold mt-1" style={{ color: primary }}>
                    {directoryQuery.isLoading ? '—' : prodis.length}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-xs">
                  <dt className="text-[13px] font-extrabold uppercase tracking-wider text-slate-700">
                    Jenjang Pendidikan
                  </dt>
                  <dd className="font-display text-3xl font-extrabold mt-1" style={{ color: primary }}>
                    {prodis.length > 0 ? [...new Set(prodis.map((p) => p.degree))].join(', ') : 'S1'}
                  </dd>
                </div>
              </dl>

              <div className="pt-2">
                <Link
                  to="/profil"
                  className="inline-flex min-h-[52px] items-center gap-2.5 rounded-xl px-7 py-3 text-[15px] font-extrabold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: primary }}
                >
                  Lihat Profil Lengkap
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg">
                <GambarTentang
                  src={heroGambar}
                  alt={`Gambar ${namaFakultas}`}
                  className="h-80 w-full object-cover object-center sm:h-96 lg:h-full lg:min-h-[460px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PROGRAM STUDI ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:py-22">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="max-w-2xl">
            <p
              className="inline-block rounded-full px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-widest"
              style={{ backgroundColor: `${primary}15`, color: primary }}
            >
              Program Studi
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Yang Diselenggarakan {namaFakultas}
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-slate-800 font-medium">
              {directoryQuery.isLoading
                ? 'Memuat daftar program studi…'
                : `${prodis.length} program studi aktif, masing-masing memiliki website resmi sendiri.`}
            </p>
          </div>
          <Link
            to="/prodi"
            className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold text-slate-900 shadow-xs transition-all hover:border-slate-500 hover:bg-slate-50 active:scale-95"
          >
            Lihat Semua
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>

        {directoryQuery.isLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : prodis.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-[16px] text-slate-700">
            Belum ada program studi aktif pada fakultas ini.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {prodis.map((prodi) => {
              const url = prodi.primaryHostname ? `https://${prodi.primaryHostname}` : null;

              return (
                <article
                  key={prodi.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    {prodi.logoUrl ? (
                      <img
                        src={prodi.logoUrl}
                        alt={`Gambar ${prodi.name}`}
                        className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 60%, ${accent}99 100%)`,
                        }}
                      >
                        <div className="text-center">
                          <AcademicCapIcon className="mx-auto h-12 w-12 text-white/90" />
                          <p className="mt-2 text-xl font-black uppercase tracking-[0.25em] text-white">
                            {prodi.code}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                    <span
                      className="absolute left-3.5 top-3.5 rounded-lg px-3 py-1 text-[12px] font-black uppercase tracking-wider text-slate-950 shadow-sm ring-1 ring-black/10"
                      style={{ backgroundColor: accent }}
                    >
                      {prodi.degree}
                    </span>

                    <span className="absolute right-3.5 top-3.5 rounded-lg bg-slate-950/75 px-3 py-1 text-[12px] font-black uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur-sm">
                      {prodi.code}
                    </span>

                    <h3 className="absolute bottom-0 left-0 right-0 px-5 pb-4 text-[19px] font-extrabold leading-snug text-white drop-shadow-sm">
                      {prodi.name}
                    </h3>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-slate-700">
                      <BuildingOffice2Icon className="h-4 w-4 shrink-0 text-slate-600" />
                      <span className="truncate">{namaFakultas}</span>
                    </p>

                    <div className="mt-auto pt-5">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-extrabold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md active:scale-[0.98]"
                          style={{ backgroundColor: primary }}
                        >
                          Kunjungi Website Prodi
                          <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                        </a>
                      ) : (
                        <span className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[14px] font-bold text-slate-600">
                          <GlobeAltIcon className="h-5 w-5" />
                          Website belum tersedia
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- BERITA FAKULTAS ---------- */}
      <section className="border-t border-slate-200 bg-slate-50 px-4 py-16 lg:py-22">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.2em]" style={{ color: primary }}>
                Warta Fakultas
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Berita Fakultas
              </h2>
            </div>
            <Link
              to="/berita"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 text-[15px] font-extrabold transition-colors hover:border-slate-500"
              style={{ color: primary }}
            >
              Semua Berita
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>

          {beritaQuery.isLoading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-60 animate-pulse rounded-2xl bg-slate-200/60" />
              ))}
            </div>
          ) : (beritaQuery.data ?? []).length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-[16px] text-slate-700">
              Belum ada berita yang diterbitkan fakultas ini.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(beritaQuery.data ?? []).map((post) => (
                <Link
                  key={post.id}
                  to={`/berita/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.title}
                      className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex h-48 w-full items-center justify-center"
                      style={{ backgroundColor: `${primary}12` }}
                    >
                      <BookOpenIcon className="h-10 w-10" style={{ color: primary }} />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="line-clamp-2 text-[18px] font-extrabold leading-snug text-slate-950 group-hover:underline">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-slate-800">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <span
                      className="mt-auto pt-4 inline-flex items-center gap-1.5 text-[14px] font-extrabold"
                      style={{ color: primary }}
                    >
                      Baca Selengkapnya
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- KONTAK ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-12 text-white shadow-xl sm:px-12 sm:py-14"
          style={{
            backgroundColor: primary,
            backgroundImage: 'url(/assets/visual/campus-cta-backdrop.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${primary}eb 0%, #0f172ad9 100%)`,
            }}
          />
          <div className="relative z-10 grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.2em]" style={{ color: accent }}>
                Sekretariat Fakultas
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Hubungi {namaFakultas}
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-slate-100 font-medium">
                Silakan hubungi sekretariat fakultas untuk informasi akademik, kerja sama, maupun
                layanan administrasi mahasiswa dan orang tua.
              </p>
              <Link
                to="/kontak"
                className="mt-7 inline-flex min-h-[52px] items-center gap-2.5 rounded-xl px-7 py-3 text-[15px] font-extrabold text-slate-950 shadow-md transition-all hover:brightness-105 active:scale-95"
                style={{ backgroundColor: accent }}
              >
                Buka Halaman Kontak
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>

            <ul className="space-y-4 text-[16px] font-medium">
              <li className="flex items-start gap-3.5">
                <MapPinIcon className="mt-1 h-6 w-6 shrink-0" style={{ color: accent }} />
                <span className="text-white leading-relaxed">
                  {kontak?.address ??
                    'Gedung Fakultas, Kampus UNUSU, Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan'}
                </span>
              </li>
              <li className="flex items-center gap-3.5">
                <EnvelopeIcon className="h-6 w-6 shrink-0" style={{ color: accent }} />
                <span className="text-white">{kontak?.email ?? '—'}</span>
              </li>
              <li className="flex items-center gap-3.5">
                <PhoneIcon className="h-6 w-6 shrink-0" style={{ color: accent }} />
                <span className="text-white">{kontak?.phone ?? '—'}</span>
              </li>
              <li className="flex items-center gap-3.5">
                <BuildingOffice2Icon className="h-6 w-6 shrink-0" style={{ color: accent }} />
                <span className="text-white">
                  {tenant?.websiteSetting?.univName ?? 'Universitas Nahdlatul Ulama Sumatera Utara'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FacultyLandingPage;
