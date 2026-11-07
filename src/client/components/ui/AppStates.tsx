import React from 'react';
import { Link } from 'react-router-dom';
import { GlobeAltIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/** Ditampilkan ketika domain yang dibuka tidak terdaftar sebagai tenant. */
export const DomainNotRegistered: React.FC<{ hostname: string; message: string }> = ({ hostname, message }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <GlobeAltIcon className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Domain belum terdaftar</h1>
      <p className="mt-2 font-mono text-sm text-[#1e3a8a]">{hostname}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Portal administrasi seluruh program studi berada di{' '}
        <span className="font-semibold text-slate-700">prodi.unusu.ac.id</span>. Hubungi administrator
        universitas untuk mendaftarkan domain website program studi.
      </p>
      <Link
        to="/login"
        className="mt-6 inline-flex rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#172f6e]"
      >
        Buka Portal Administrasi
      </Link>
    </div>
  </div>
);

/** Ditampilkan bila seluruh aplikasi gagal dimuat. */
export const AppError: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <ExclamationTriangleIcon className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Aplikasi gagal dimuat</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#172f6e]"
      >
        Muat ulang halaman
      </button>
    </div>
  </div>
);

/** Layar tunggu saat konteks situs sedang dimuat. */
export const AppLoading: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1e3a8a]" />
      <p className="mt-4 text-sm font-medium text-slate-500">Memuat website</p>
    </div>
  </div>
);
