import React from 'react';
import { Link } from 'react-router-dom';

/** Halaman tidak ditemukan pada website program studi. */
export const NotFoundPage: React.FC = () => (
  <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
    <p className="text-6xl font-extrabold tracking-tight text-[#e8eefb]">404</p>
    <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Halaman tidak ditemukan</h1>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
      Alamat yang Anda buka tidak tersedia pada website program studi ini. Silakan kembali ke beranda atau
      gunakan menu navigasi di atas.
    </p>
    <Link
      to="/"
      className="mt-6 inline-flex items-center rounded-xl bg-[#1e3a8a] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#172f6e]"
    >
      Kembali ke Beranda
    </Link>
  </div>
);

export default NotFoundPage;

