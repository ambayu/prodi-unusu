import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
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

  // ---- Hero slider ----
  const slides = HERO_IMAGES_BY_FACULTY[tenant?.code ?? ''] ?? HERO_DEFAULT;
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

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
    <div className="bg-white">
      {/* ---------- HERO SLIDER (sama dengan desain website prodi) ---------- */}
      <section className="relative w-full overflow-hidden bg-slate-900 select-none">
        <div className="relative w-full aspect-[21/9] min-h-[300px] sm:min-h-[420px] lg:min-h-[500px] xl:min-h-[540px]">
          {slides.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt={`${namaFakultas} — gambar ${idx + 1}`}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                idx === slideIdx ? 'opacity-100' : 'opacity-0'
              }`}
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          ))}

          {/*
            Titik navigasi mengikuti hero slider program studi: dot putih tipis,
            dot aktif memanjang dan berwarna emas. Gambar tetap bersih tanpa
            judul maupun tombol di atasnya.
          */}
          {slides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center space-x-2 sm:bottom-6">
              {slides.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === slideIdx ? 'w-8 bg-[#fbbf24] shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- TENTANG FAKULTAS ---------- */}
      <section className="bg-gradient-to-b from-slate-50 via-white to-white px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Teks */}
            <div className="space-y-5 lg:col-span-7">
              <div className="space-y-2">
                <span
                  className="inline-block rounded-full px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest"
                  style={{ backgroundColor: `${primary}15`, color: primary }}
                >
                  Tentang Fakultas
                </span>
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                  {namaFakultas}
                </h2>
              </div>

              {tentangQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-9/12 animate-pulse rounded bg-slate-200" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                  {overview ??
                    `${namaFakultas} merupakan bagian dari Universitas Nahdlatul Ulama Sumatera Utara yang ` +
                      'menyelenggarakan pendidikan tinggi berbasis nilai Ahlussunnah wal Jama’ah An-Nahdliyah, ' +
                      'dengan memadukan penguasaan ilmu pengetahuan dan teknologi serta pembentukan karakter mahasiswa.'}
                </p>
              )}

              {/* Ringkasan angka */}
              <dl className="flex flex-wrap gap-4 pt-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Program Studi</dt>
                  <dd className="text-xl font-extrabold" style={{ color: primary }}>
                    {directoryQuery.isLoading ? '—' : prodis.length}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenjang</dt>
                  <dd className="text-xl font-extrabold" style={{ color: primary }}>
                    {prodis.length > 0 ? [...new Set(prodis.map((p) => p.degree))].join(', ') : 'S1'}
                  </dd>
                </div>
              </dl>

              <div className="pt-1">
                <Link
                  to="/profil"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-extrabold text-white shadow-md transition-all hover:shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  Lihat Profil Lengkap
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/*
              Gambar profil tanpa bingkai kartu.
              
              Dulu gambar dibatasi `rounded-3xl` + border putih + rasio tetap,
              sehingga terasa seperti kotak kecil di samping teks. Sekarang
              dibiarkan mengalir bebas mengikuti tinggi kolomnya, dengan sudut
              membulat tipis saja agar tetap menyatu dengan tata letak.
            */}
            <div className="relative lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                <GambarTentang
                  src={heroGambar}
                  alt={`Gambar ${namaFakultas}`}
                  className="h-72 w-full object-cover object-center sm:h-96 lg:h-full lg:min-h-[480px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PROGRAM STUDI ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="max-w-2xl">
            <p
              className="inline-block rounded-full px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest"
              style={{ backgroundColor: `${accent}25`, color: primary }}
            >
              Program Studi
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              Yang diselenggarakan {namaFakultas}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {directoryQuery.isLoading
                ? 'Memuat daftar program studi…'
                : `${prodis.length} program studi aktif, masing-masing memiliki website resmi sendiri.`}
            </p>
          </div>
          <Link
            to="/prodi"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-95"
          >
            Lihat semua
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {directoryQuery.isLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : prodis.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Belum ada program studi aktif pada fakultas ini.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {prodis.map((prodi) => {
              const url = prodi.primaryHostname ? `https://${prodi.primaryHostname}` : null;

              return (
                <article
                  key={prodi.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                >
                  {/*
                    Gambar penutup kartu. Sumbernya `study_programs.logo_url` yang
                    diunggah admin lewat menu Struktur Organisasi. Bila belum ada,
                    ditampilkan bidang gradien warna tema fakultas dengan huruf kode
                    prodi, agar kartu tetap rapi tanpa gambar rusak.
                  */}
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
                          <AcademicCapIcon className="mx-auto h-11 w-11 text-white/90" />
                          <p className="mt-2 text-lg font-black uppercase tracking-[0.25em] text-white">
                            {prodi.code}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Gradien tipis di bawah agar label selalu terbaca */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                    {/* Jenjang menempel di sudut kiri atas */}
                    <span
                      className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm ring-1 ring-black/5"
                      style={{ backgroundColor: accent }}
                    >
                      {prodi.degree}
                    </span>

                    {/* Kode prodi di sudut kanan atas */}
                    <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur-sm">
                      {prodi.code}
                    </span>

                    {/* Nama prodi di atas gambar */}
                    <h3 className="absolute bottom-0 left-0 right-0 px-4 pb-3 text-base font-extrabold leading-snug text-white drop-shadow-sm">
                      {prodi.name}
                    </h3>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <BuildingOffice2Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{namaFakultas}</span>
                    </p>

                    <div className="mt-auto pt-4">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md active:scale-[0.98]"
                          style={{ backgroundColor: accent }}
                        >
                          Kunjungi Website
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400">
                          <GlobeAltIcon className="h-4 w-4" />
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
      <section className="border-t border-slate-200 bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: primary }}>
                Warta
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Berita Fakultas
              </h2>
            </div>
            <Link
              to="/berita"
              className="inline-flex items-center gap-1.5 text-xs font-bold"
              style={{ color: primary }}
            >
              Semua berita
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {beritaQuery.isLoading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200/60" />
              ))}
            </div>
          ) : (beritaQuery.data ?? []).length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
              Belum ada berita yang diterbitkan fakultas ini.
            </p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(beritaQuery.data ?? []).map((post) => (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.title}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex h-40 w-full items-center justify-center"
                      style={{ backgroundColor: `${primary}10` }}
                    >
                      <BookOpenIcon className="h-8 w-8" style={{ color: primary }} />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-900">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{post.excerpt}</p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- KONTAK ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl px-6 py-12 text-white sm:px-12" style={{ backgroundColor: primary }}>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
                Sekretariat
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Hubungi {namaFakultas}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
                Silakan hubungi sekretariat fakultas untuk informasi akademik, kerja sama, maupun
                layanan administrasi.
              </p>
              <Link
                to="/kontak"
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold text-slate-950 shadow-md transition-all hover:brightness-105 active:scale-95"
                style={{ backgroundColor: accent }}
              >
                Buka halaman kontak
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
                <span className="text-white/85">
                  {kontak?.address ??
                    'Gedung Fakultas, Kampus UNUSU, Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan'}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 shrink-0" style={{ color: accent }} />
                <span className="text-white/85">{kontak?.email ?? '—'}</span>
              </li>
              <li className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 shrink-0" style={{ color: accent }} />
                <span className="text-white/85">{kontak?.phone ?? '—'}</span>
              </li>
              <li className="flex items-center gap-3">
                <BuildingOffice2Icon className="h-5 w-5 shrink-0" style={{ color: accent }} />
                <span className="text-white/85">
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
