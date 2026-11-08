import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { api, toApiError } from '../services/api';
import { ErrorState, LoadingState } from '../components/ui/States';

/**
 * Beranda portal administrasi program studi.
 *
 * Ditampilkan pada hostname ADMIN_HOST (mis. prodi.unusu.ac.id). Halaman ini
 * bersifat publik: pengunjung dapat melihat direktori seluruh website program
 * studi sebelum memutuskan masuk ke portal pengelolaan.
 *
 * Halaman ini tidak bergantung pada tenant karena permukaan admin memang tidak
 * memiliki tenant tetap; program studi dipilih pengguna setelah masuk.
 */

interface DirectoryProdi {
  id: number;
  code: string;
  name: string;
  degree: string;
  logoUrl: string | null;
  primaryHostname: string | null;
  faculty: { id: number; name: string; code: string };
}

interface DirectoryResponse {
  success: boolean;
  total: number;
  studyPrograms: DirectoryProdi[];
}

const ProdiCard: React.FC<{ prodi: DirectoryProdi }> = ({ prodi }) => {
  const hostname = prodi.primaryHostname;
  const href = hostname ? `https://${hostname}/` : null;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a]">
          {prodi.logoUrl ? (
            <img
              src={prodi.logoUrl}
              alt=""
              className="h-7 w-7 rounded object-contain"
              loading="lazy"
            />
          ) : (
            <AcademicCapIcon className="h-6 w-6" />
          )}
        </div>
        {href && (
          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#1e3a8a]" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-bold leading-snug text-slate-900">{prodi.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{prodi.faculty.name}</p>

      <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
        {prodi.degree} · {prodi.code}
      </p>
    </>
  );

  // Tap target dijaga minimal 44px sesuai standar UI UNUSU.
  const baseClass =
    'group flex min-h-[44px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-colors';

  if (!href) {
    return <div className={`${baseClass} opacity-60`}>{inner}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClass} hover:border-[#1e3a8a] hover:shadow-sm`}
    >
      {inner}
    </a>
  );
};

export const PortalLanding: React.FC = () => {
  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];

  // Dikelompokkan per fakultas agar direktori mudah dipindai.
  const grouped = prodis.reduce<Record<string, DirectoryProdi[]>>((acc, prodi) => {
    const key = prodi.faculty.name;
    acc[key] = acc[key] ? [...acc[key], prodi] : [prodi];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F1F5F2]">
      {/* Kepala halaman */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a8a] text-white">
              <BuildingLibraryIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Portal Program Studi</p>
              <p className="text-[11px] font-medium text-slate-500">
                Universitas Nahdlatul Ulama Sumatera Utara
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 text-sm font-bold text-white transition-colors hover:bg-[#172f6e]"
          >
            Masuk
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Sambutan */}
      <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#1e3a8a] ring-1 ring-blue-100">
          <GlobeAltIcon className="h-4 w-4" />
          {directoryQuery.isSuccess ? `${prodis.length} website prodi aktif` : 'Direktori website'}
        </p>

        <h1 className="mt-4 max-w-2xl text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
          Portal pengelolaan website program studi
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Seluruh website program studi Universitas Nahdlatul Ulama Sumatera Utara dikelola dari
          satu portal terpusat. Pilih website prodi di bawah untuk melihat laman publiknya, atau
          masuk untuk mengelola konten sesuai peran Anda.
        </p>
      </section>

      {/* Direktori */}
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8">
        {directoryQuery.isLoading && <LoadingState label="Memuat direktori program studi" />}

        {directoryQuery.isError && (
          <ErrorState message={toApiError(directoryQuery.error).message} />
        )}

        {directoryQuery.isSuccess && prodis.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">Belum ada program studi yang terdaftar.</p>
          </div>
        )}

        {Object.entries(grouped).map(([facultyName, items]) => (
          <section key={facultyName} className="mt-8 first:mt-0">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1e3a8a]" />
              {facultyName}
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((prodi) => (
                <ProdiCard key={prodi.id} prodi={prodi} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-6 text-center text-xs text-slate-500 sm:px-8">
          © {new Date().getFullYear()} Universitas Nahdlatul Ulama Sumatera Utara
        </div>
      </footer>
    </div>
  );
};

export default PortalLanding;
