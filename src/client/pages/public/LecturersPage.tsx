import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EnvelopeIcon, UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { lecturerApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Halaman publik direktori dosen. */
export const LecturersPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Dosen', description: 'Direktori tenaga pengajar dan bidang keahlian program studi.' });

  const [search, setSearch] = useState('');

  const lecturersQuery = useQuery({
    queryKey: ['public', 'lecturers'],
    queryFn: () => lecturerApi.public().then((res) => res.data.lecturers),
  });

  const keyword = search.trim().toLowerCase();
  const filtered = (lecturersQuery.data ?? []).filter(
    (lecturer) =>
      keyword === '' ||
      lecturer.name.toLowerCase().includes(keyword) ||
      (lecturer.expertise ?? '').toLowerCase().includes(keyword) ||
      (lecturer.nidn ?? '').toLowerCase().includes(keyword),
  );

  return (
    <>
      <PageHeader
        eyebrow="Direktori"
        title="Tenaga Pengajar"
        description="Dosen tetap program studi beserta bidang keahlian dan jabatan akademiknya."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {lecturersQuery.isLoading ? (
          <LoadingState label="Memuat data dosen" rows={3} />
        ) : lecturersQuery.isError ? (
          <ErrorState
            message={toApiError(lecturersQuery.error).message}
            onRetry={() => void lecturersQuery.refetch()}
          />
        ) : (lecturersQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada data dosen"
            description="Program studi belum menambahkan data dosen ke website publik."
          />
        ) : (
          <>
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, NIDN, atau bidang keahlian"
                aria-label="Cari dosen"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="Tidak ada hasil" description="Tidak ada dosen yang cocok dengan pencarian Anda." />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((lecturer) => (
                  <article key={lecturer.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {lecturer.photoUrl ? (
                        <img
                          src={lecturer.photoUrl}
                          alt={`Foto ${lecturer.name}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-10 w-10 text-slate-400" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <h2 className="text-sm font-bold leading-snug text-slate-900">{lecturer.name}</h2>
                      {lecturer.academicRank ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-[#1e3a8a]">{lecturer.academicRank}</p>
                      ) : null}
                      {lecturer.expertise ? (
                        <p className="mt-1 text-xs text-slate-600">{lecturer.expertise}</p>
                      ) : null}
                      {lecturer.nidn ? (
                        <p className="mt-1 font-mono text-[10px] text-slate-500">NIDN {lecturer.nidn}</p>
                      ) : null}
                      {lecturer.email ? (
                        <a
                          href={`mailto:${lecturer.email}`}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e3a8a] hover:underline"
                        >
                          <EnvelopeIcon className="h-3.5 w-3.5" />
                          {lecturer.email}
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default LecturersPage;

