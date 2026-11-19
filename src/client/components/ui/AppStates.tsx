import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GlobeAltIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';

/**
 * Kerangka bersama untuk layar galat tingkat aplikasi.
 *
 * Ketiga layar (galat, domain tidak terdaftar, memuat) memakai kerangka yang
 * sama supaya tinggi, lebar, dan jaraknya konsisten dan tidak bergeser saat
 * berpindah keadaan.
 */
const KerangkaGelar: React.FC<{
  children: React.ReactNode;
  aksen?: string;
}> = ({ children, aksen = 'from-[#1e3a8a] via-[#2563eb] to-[#3b82f6]' }) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">
    {/*
     * Latar dekoratif: gradasi lembut dan dua lingkaran kabur. Diberi
     * `aria-hidden` dan `pointer-events-none` agar tidak mengganggu pembaca
     * layar maupun klik.
     */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(30,58,138,0.10),_transparent_60%)]"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl"
    />

    <div className="relative w-full max-w-[34rem]">
      {/* Garis aksen di kepala kartu sebagai penanda visual, bukan teks. */}
      <div className={`h-1.5 w-full rounded-t-[18px] bg-gradient-to-r ${aksen}`} />
      <div className="relative overflow-hidden rounded-b-[18px] border border-t-0 border-[#CBD5E1] bg-white px-6 py-8 shadow-xl shadow-slate-900/5 sm:px-9 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none bg-cover bg-right-bottom opacity-45"
          style={{ backgroundImage: "url('/assets/admin-card-texture.png')" }}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  </div>
);

/** Ditampilkan ketika domain yang dibuka tidak terdaftar sebagai tenant. */
export const DomainNotRegistered: React.FC<{ hostname: string; message: string }> = ({ hostname, message }) => (
  <KerangkaGelar aksen="from-amber-500 via-amber-400 to-amber-300">
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700 ring-1 ring-amber-200">
        <GlobeAltIcon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
        Domain belum terdaftar
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{message}</p>
    </div>

    <div className="mt-6 rounded-[12px] border border-[#CBD5E1] bg-slate-50 px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Domain yang dibuka</p>
      <p className="mt-1 break-all font-mono text-sm font-semibold text-[#1e3a8a]">{hostname}</p>
    </div>

    <p className="mt-5 rounded-[12px] border border-blue-200 bg-blue-50/60 px-4 py-3.5 text-sm leading-relaxed text-blue-900">
      Portal administrasi seluruh program studi berada di{' '}
      <span className="font-bold">prodi.unusu.ac.id</span>. Hubungi administrator universitas untuk
      mendaftarkan domain website program studi.
    </p>

    <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
      <Link
        to="/login"
        className="btn-primary w-full justify-center sm:w-auto"
      >
        Buka Portal Administrasi
      </Link>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-secondary w-full justify-center sm:w-auto"
      >
        <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
        Muat ulang
      </button>
    </div>
  </KerangkaGelar>
);

/**
 * Ditampilkan bila seluruh aplikasi gagal dimuat.
 *
 * `message` berasal dari `toApiError`, sehingga jenis kegagalan dapat dibedakan
 * dan pengguna diberi langkah yang sesuai, bukan sekadar "coba lagi".
 */
export const AppError: React.FC<{ message: string }> = ({ message }) => {
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [sudahCoba, setSudahCoba] = useState(false);

  /**
   * Kegagalan jaringan dan kegagalan server menuntut tindakan berbeda: yang
   * pertama periksa koneksi, yang kedua tunggu lalu coba lagi.
   */
  const masalahJaringan = /koneksi|network|terhubung/i.test(message);

  useEffect(() => {
    if (!sedangMemuat) return;
    /*
     * `reload()` dipanggil setelah satu putaran render agar teks tombol
     * "Memuat ulang..." sempat tampil. Jika pemuatan gagal lagi, halaman tidak
     * memuat ulang otomatis sehingga pengguna tidak terjebak dalam siklus.
     */
    setSudahCoba(true);
    const id = window.setTimeout(() => window.location.reload(), 300);
    return () => window.clearTimeout(id);
  }, [sedangMemuat]);

  const langkah = masalahJaringan
    ? [
        'Periksa sambungan internet perangkat Anda.',
        'Pastikan jaringan kantor atau kampus tidak memblokir situs ini.',
        'Coba muat ulang setelah koneksi kembali normal.',
      ]
    : [
        'Tunggu beberapa saat, lalu muat ulang halaman.',
        'Bila tetap gagal, laporkan ke administrator beserta waktu kejadiannya.',
      ];

  return (
    <KerangkaGelar aksen="from-rose-600 via-rose-500 to-amber-400">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-rose-100 text-rose-600 ring-1 ring-rose-200">
          {masalahJaringan ? (
            <WifiIcon className="h-7 w-7" aria-hidden="true" />
          ) : (
            <ExclamationTriangleIcon className="h-7 w-7" aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
          {masalahJaringan ? 'Tidak dapat terhubung' : 'Aplikasi gagal dimuat'}
        </h1>
        <p
          role="alert"
          className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600"
        >
          {message}
        </p>
      </div>

      <div className="mt-6 rounded-[12px] border border-[#CBD5E1] bg-slate-50 px-4 py-3.5 text-left">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Yang dapat Anda lakukan
        </p>
        <ol className="mt-2.5 space-y-2">
          {langkah.map((teks, indeks) => (
            <li key={teks} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-[11px] font-bold text-white">
                {indeks + 1}
              </span>
              <span>{teks}</span>
            </li>
          ))}
        </ol>
      </div>

      {sudahCoba ? (
        <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-900">
          Halaman sudah dicoba dimuat ulang namun kendala belum teratasi. Layanan mungkin sedang
          dalam pemeliharaan.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => setSedangMemuat(true)}
          disabled={sedangMemuat}
          className="btn-primary w-full justify-center sm:w-auto"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${sedangMemuat ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {sedangMemuat ? 'Memuat ulang...' : 'Muat ulang halaman'}
        </button>
        <Link to="/" className="btn-secondary w-full justify-center sm:w-auto">
          Kembali ke beranda
        </Link>
      </div>
    </KerangkaGelar>
  );
};

/** Layar tunggu saat konteks situs sedang dimuat. */
export const AppLoading: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
    <div className="text-center">
      <div
        className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1e3a8a]"
        role="status"
        aria-label="Sedang memuat"
      />
      <p className="mt-4 text-sm font-medium text-slate-600">Memuat website</p>
      <p className="mt-1 text-[13px] text-slate-500">Menyiapkan tampilan program studi Anda.</p>
    </div>
  </div>
);
