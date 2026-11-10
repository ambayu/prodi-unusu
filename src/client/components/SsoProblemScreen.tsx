import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldExclamationIcon,
  ArrowPathIcon,
  HomeIcon,
  EnvelopeIcon,
  ArrowTopRightOnSquareIcon,
  UserCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const ONE_UNUSU_URL = import.meta.env.VITE_ONE_UNUSU_URL || 'http://localhost:5173';

export type SsoProblemDetail = {
  jenis: 'kosong' | 'token' | 'jaringan' | 'peran' | 'umum';
  judul: string;
  penjelasan: string;
  langkah: string[];
  catatan?: string;
  ssoRole?: string;
  ssoRoleLabel?: string;
  appName?: string;
};

interface SsoProblemScreenProps {
  masalah?: SsoProblemDetail | null;
  onCobaLagi?: () => void;
  alamatBantuan?: string;
  tahun?: number;
}

/**
 * SsoProblemScreen - Layar diagnosis penuh jika terjadi kendala login atau penolakan peran SSO.
 * Format tata letak 2 kolom dan gaya visual seragam 100% dengan standar ekosistem LPM UNUSU.
 */
export const SsoProblemScreen: React.FC<SsoProblemScreenProps> = ({
  masalah,
  onCobaLagi,
  alamatBantuan = 'admin@unusu.ac.id',
  tahun = new Date().getFullYear(),
}) => {
  const isDenial = masalah?.jenis === 'peran';

  const judul = masalah?.judul || (isDenial ? 'Akun ini belum memiliki akses Program Studi' : 'Proses masuk belum selesai');
  const penjelasan = masalah?.penjelasan || '';
  const langkah = masalah?.langkah || [];

  return (
    <div className="min-h-screen w-full bg-[#F1F5F2] text-slate-800 font-sans selection:bg-[#fbbf24] selection:text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Kepala halaman: identitas institusi */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-[#166534] text-[#fbbf24] shadow-xs"
            >
              <ShieldExclamationIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-slate-950">
              PORTAL PRODI <span className="text-[#166534]">UNUSU</span>
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
          >
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            <span>Beranda</span>
          </Link>
        </header>

        {/* Isi: 2 kolom di layar desktop, 1 kolom di ponsel */}
        <main
          role="alert"
          className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-12 lg:gap-16 lg:py-16"
        >
          <div className="lg:col-span-7">
            {/* Eyebrow bilah tegak */}
            <p className="border-l-2 border-[#fbbf24] pl-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#166534]">
              {isDenial ? 'Akses panel ditolak' : 'Proses masuk terhenti'}
            </p>

            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
              {judul}
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {penjelasan}
            </p>

            {langkah.length > 0 && (
              <ol className="mt-8 max-w-xl space-y-4">
                {langkah.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-[#166534] text-[11px] font-bold tabular-nums text-white"
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-700">{item}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {isDenial ? (
                <a
                  href={ONE_UNUSU_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 text-sm font-bold text-white transition-colors hover:bg-[#14532D] shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                  <span>Buka Portal ONE UNUSU</span>
                </a>
              ) : (
                onCobaLagi && (
                  <button
                    type="button"
                    onClick={onCobaLagi}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 text-sm font-bold text-white transition-colors hover:bg-[#14532D] shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
                  >
                    <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                    <span>Coba masuk lagi</span>
                  </button>
                )
              )}
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
              >
                <HomeIcon className="h-4 w-4" aria-hidden="true" />
                <span>Kembali ke halaman masuk</span>
              </Link>
            </div>

            {alamatBantuan && (
              <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                <EnvelopeIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>
                  Bila masih terhenti, hubungi tim IT Administrator di{' '}
                  <a
                    href={`mailto:${alamatBantuan}`}
                    className="font-semibold text-[#166534] underline underline-offset-2 hover:text-[#14532D]"
                  >
                    {alamatBantuan}
                  </a>
                  .
                </span>
              </p>
            )}
          </div>

          {/* Panel samping kanan: Rincian akun dan status otorisasi */}
          <aside className="lg:col-span-5">
            <div className="rounded-3xl border border-emerald-950 bg-[#166534] p-7 text-white sm:p-8 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">
                {isDenial ? 'Rincian Akun & Cakupan' : 'Yang Perlu Diketahui'}
              </p>

              {isDenial ? (
                <>
                  <dl className="mt-5 divide-y divide-white/15">
                    <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
                      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                        <UserCircleIcon className="h-4 w-4" aria-hidden="true" />
                        Status Akun
                      </dt>
                      <dd className="text-right text-xs font-semibold text-white">
                        {masalah?.ssoRole || 'Terverifikasi ONE UNUSU'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-3">
                      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                        <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
                        Aplikasi Tujuan
                      </dt>
                      <dd className="text-right text-xs font-semibold text-white">
                        {masalah?.appName || 'Portal Administrasi Program Studi'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-3 last:pb-0">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                        Peran Aktif
                      </dt>
                      <dd className="max-w-[52%] text-right text-xs font-semibold text-white">
                        {masalah?.ssoRoleLabel || 'Belum ditugaskan ke Prodi'}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/20 px-4 py-3 text-[11px] leading-relaxed text-amber-100">
                    Satu akun ONE UNUSU dapat memiliki wewenang di berbagai unit kampus, namun akses ke panel administrasi prodi memerlukan peran Admin Prodi atau Super Admin.
                  </p>
                </>
              ) : (
                <div className="mt-5 space-y-4 text-xs text-emerald-100 leading-relaxed">
                  <p>
                    {masalah?.catatan ||
                      'Akun Anda tetap aman dan tidak terkunci. Seluruh sesi autentikasi dilindungi oleh gerbang otorisasi terpusat ONE UNUSU.'}
                  </p>
                  <div className="rounded-2xl bg-black/20 p-4 border border-white/10">
                    <p className="font-bold text-white mb-1">Butuh bantuan darurat?</p>
                    <p className="text-[11px] text-emerald-200">
                      Anda juga dapat menggunakan opsi masuk darurat kata sandi lokal melalui halaman login jika layanan SSO sedang dalam pemeliharaan berkala.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* Kaki halaman */}
        <footer className="border-t border-[#CBD5E1] pt-4 text-center text-xs text-slate-500">
          &copy; {tahun} Portal Program Studi &bull; Universitas Nahdlatul Ulama Sumatera Utara
        </footer>
      </div>
    </div>
  );
};
export default SsoProblemScreen;
