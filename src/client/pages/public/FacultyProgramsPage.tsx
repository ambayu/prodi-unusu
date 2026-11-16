import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AcademicCapIcon, ArrowTopRightOnSquareIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useTenant } from '../../hooks/useSite';
import { useSeo } from '../../hooks/useSeo';
import { LoadingState, ErrorState } from '../../components/ui/States';
import type { DirectoryProdi, DirectoryResponse } from '../../services/directory';

/**
 * Halaman "Program Studi" pada website fakultas.
 *
 * Website fakultas tidak memiliki kurikulum atau sarana-prasarana sendiri;
 * yang dimilikinya adalah program studi di bawahnya. Halaman ini menampilkan
 * daftar prodi tersebut beserta tautan ke masing-masing website prodi.
 */
export const FacultyProgramsPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({
    tenant,
    title: 'Program Studi',
    description: `Program studi yang diselenggarakan oleh ${tenant?.name ?? 'fakultas'} UNUSU.`,
  });

  const query = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24">
        <LoadingState label="Memuat daftar program studi..." />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24">
        <ErrorState
          message="Daftar program studi belum dapat dimuat."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  // Hanya prodi milik fakultas ini yang ditampilkan.
  const semua: DirectoryProdi[] = query.data?.studyPrograms ?? [];
  const prodis = semua.filter((p) => p.faculty?.id === tenant?.facultyId);

  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  return (
    <div className="bg-white">
      {/* Kepala halaman */}
      <section className="border-b border-slate-200 px-4 py-14 text-white" style={{ backgroundColor: primary }}>
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {tenant?.name ?? 'Fakultas'}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Program Studi</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85">
            Program studi yang diselenggarakan oleh {tenant?.name ?? 'fakultas ini'} di lingkungan
            Universitas Nahdlatul Ulama Sumatera Utara.
          </p>
        </div>
      </section>

      {/* Daftar prodi */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        {prodis.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            Belum ada program studi aktif yang terdaftar pada fakultas ini.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {prodis.map((prodi) => {
              const host = prodi.primaryHostname;
              const url = host ? `https://${host}` : null;

              return (
                <article
                  key={prodi.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14` }}
                    >
                      <AcademicCapIcon className="h-6 w-6" style={{ color: primary }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {prodi.code} &bull; {prodi.degree}
                      </p>
                      <h2 className="truncate text-base font-extrabold text-slate-900">{prodi.name}</h2>
                    </div>
                  </div>

                  <p className="mt-4 flex-1 text-xs leading-relaxed text-slate-600">
                    {tenant?.name ?? 'Fakultas'} &bull; Universitas Nahdlatul Ulama Sumatera Utara
                  </p>

                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm transition-all hover:brightness-105 active:scale-95"
                      style={{ backgroundColor: accent }}
                    >
                      Kunjungi Website
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400">
                      <GlobeAltIcon className="h-4 w-4" />
                      Website belum tersedia
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default FacultyProgramsPage;
