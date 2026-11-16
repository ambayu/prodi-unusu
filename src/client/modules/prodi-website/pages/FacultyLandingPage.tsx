import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../../services/api';
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

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

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
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden px-4 py-20 text-white" style={{ backgroundColor: primary }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20"
          style={{ backgroundColor: accent }}
        />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: accent }}>
            Universitas Nahdlatul Ulama Sumatera Utara
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {namaFakultas}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            {tenant?.websiteSetting?.siteTagline ??
              `Menyelenggarakan pendidikan, penelitian, dan pengabdian masyarakat di lingkungan ${namaFakultas}.`}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/prodi"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold text-slate-950 shadow-md transition-all hover:brightness-105 active:scale-95"
              style={{ backgroundColor: accent }}
            >
              Lihat Program Studi
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              to="/profil"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-xs font-extrabold text-white transition-colors hover:bg-white/10"
            >
              Profil Fakultas
            </Link>
          </div>

          {/* Ringkasan angka */}
          <dl className="mt-12 grid max-w-lg grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Program Studi</dt>
              <dd className="mt-1 text-2xl font-extrabold">
                {directoryQuery.isLoading ? '—' : prodis.length}
              </dd>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Jenjang</dt>
              <dd className="mt-1 text-2xl font-extrabold">
                {prodis.length > 0
                  ? [...new Set(prodis.map((p) => p.degree))].join(', ')
                  : 'S1'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------- PROGRAM STUDI ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: primary }}>
              Program Studi
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Yang diselenggarakan {namaFakultas}
            </h2>
          </div>
          <Link
            to="/prodi"
            className="inline-flex items-center gap-1.5 text-xs font-bold"
            style={{ color: primary }}
          >
            Lihat semua
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {directoryQuery.isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : prodis.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Belum ada program studi aktif pada fakultas ini.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {prodis.map((prodi) => (
              <div
                key={prodi.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${primary}14` }}
                  >
                    <AcademicCapIcon className="h-5 w-5" style={{ color: primary }} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {prodi.code} &bull; {prodi.degree}
                    </p>
                    <h3 className="truncate text-sm font-extrabold text-slate-900">{prodi.name}</h3>
                  </div>
                </div>

                {prodi.primaryHostname ? (
                  <a
                    href={`https://${prodi.primaryHostname}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: primary }}
                  >
                    Kunjungi website
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="mt-5 text-xs font-semibold text-slate-400">Website belum tersedia</span>
                )}
              </div>
            ))}
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
