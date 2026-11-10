import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldExclamationIcon,
  ArrowPathIcon,
  HomeIcon,
  EnvelopeIcon,
  ArrowTopRightOnSquareIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

export interface SsoProblemDetail {
  jenis: 'kosong' | 'token' | 'jaringan' | 'peran' | 'umum';
  judul: string;
  penjelasan: string;
  langkah: string[];
  catatan?: string;
}

interface SsoProblemScreenProps {
  masalah: SsoProblemDetail;
  onCobaLagi?: () => void;
  alamatBantuan?: string;
}

const ONE_UNUSU_URL = import.meta.env.VITE_ONE_UNUSU_URL || 'http://localhost:5173';

/**
 * Layar penuh jika terjadi kendala autentikasi SSO (token habis, peran tidak sesuai, atau gangguan jaringan).
 * Memberikan penjelasan ramah pengguna dan aksi yang jelas.
 */
export const SsoProblemScreen: React.FC<SsoProblemScreenProps> = ({
  masalah,
  onCobaLagi,
  alamatBantuan = 'admin@unusu.ac.id',
}) => {
  return (
    <div className="min-h-screen w-full bg-[#F1F5F9] text-slate-800 font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#CBD5E1] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[12px] bg-white border border-[#CBD5E1] p-1 shadow-2xs flex items-center justify-center">
              <img src="/logo-unusu.jpg" alt="UNUSU" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 tracking-tight">PORTAL PRODI UNUSU</p>
              <p className="text-[11px] text-slate-500 font-semibold">Gateway Terpadu ONE UNUSU</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1e3a8a]"
          >
            <HomeIcon className="h-4 w-4" />
            <span>Beranda Utama</span>
          </Link>
        </header>

        {/* Konten Utama */}
        <main className="my-auto py-8">
          <div className="rounded-[16px] border border-[#CBD5E1] bg-white p-6 sm:p-10 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldExclamationIcon className="h-8 w-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider border border-rose-200">
                  Kendala Autentikasi
                </span>
                <h1 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {masalah.judul}
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-700">
              {masalah.penjelasan}
            </p>

            {/* Langkah Penyelesaian */}
            {masalah.langkah.length > 0 && (
              <div className="mt-6 rounded-[12px] border border-[#CBD5E1]/80 bg-slate-50/70 p-4 sm:p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Langkah yang disarankan:
                </p>
                <ul className="mt-3 space-y-2 text-xs sm:text-sm text-slate-600">
                  {masalah.langkah.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-[#1e3a8a]">
                        {idx + 1}
                      </span>
                      <span className="leading-tight">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {masalah.catatan && (
              <p className="mt-4 text-xs italic text-slate-500">
                Catatan: {masalah.catatan}
              </p>
            )}

            {/* Aksi */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {onCobaLagi && (
                <button
                  type="button"
                  onClick={onCobaLagi}
                  className="btn-primary justify-center"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  <span>Coba Masuk Ulang</span>
                </button>
              )}
              <a
                href={ONE_UNUSU_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <span>Buka Portal ONE UNUSU</span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-slate-400" />
              </a>
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2"
              >
                <LockClosedIcon className="h-4 w-4" />
                <span>Masuk Manual (Darurat)</span>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#CBD5E1] pt-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara</p>
          <a
            href={`mailto:${alamatBantuan}`}
            className="inline-flex items-center gap-1.5 font-semibold text-[#1e3a8a] hover:underline"
          >
            <EnvelopeIcon className="h-4 w-4" />
            <span>Pusat Bantuan: {alamatBantuan}</span>
          </a>
        </footer>
      </div>
    </div>
  );
};
