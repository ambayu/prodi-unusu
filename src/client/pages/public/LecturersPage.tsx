import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { lecturerApi, type PublicLecturer } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/**
 * Kartu satu dosen.
 *
 * Foto ditampilkan besar (papan atas kartu) agar wajah dosen benar-benar
 * terlihat, bukan ikon kecil di samping teks. Bila foto belum tersedia,
 * ditampilkan inisial nama di atas gradien warna tema — bukan gambar rusak.
 */
const LecturerCard: React.FC<{ dosen: PublicLecturer; primary: string; accent: string }> = ({
  dosen,
  primary,
  accent,
}) => {
  /** Inisial maksimal dua huruf dari nama, untuk pengganti foto. */
  const inisial = useMemo(() => {
    const bagian = dosen.name
      .replace(/^[^A-Za-z]+/, '')
      .split(/\s+/)
      .filter(Boolean);
    if (bagian.length === 0) return '?';
    const awal = bagian[0]?.[0] ?? '';
    const akhir = bagian.length > 1 ? bagian[bagian.length - 1]?.[0] ?? '' : '';
    return (awal + akhir).toUpperCase();
  }, [dosen.name]);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      {/* Foto besar */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100">
        {dosen.photoUrl ? (
          <img
            src={dosen.photoUrl}
            alt={`Foto ${dosen.name}`}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage: `linear-gradient(150deg, ${primary} 0%, ${primary}cc 55%, ${accent}aa 100%)`,
            }}
          >
            <span className="text-5xl font-black tracking-tight text-white/95">{inisial}</span>
          </div>
        )}

        {/* Pita jabatan akademik menempel di bawah foto */}
        {dosen.academicRank ? (
          <span
            className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm"
            style={{ backgroundColor: accent }}
          >
            {dosen.academicRank}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-sm font-extrabold leading-snug text-slate-900">{dosen.name}</h3>

        {dosen.expertise ? (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{dosen.expertise}</p>
        ) : null}

        <div className="mt-3 space-y-1 text-[11px] text-slate-500">
          {dosen.nidn ? (
            <p className="font-mono">
              <span className="font-sans font-bold text-slate-400">NIDN</span> {dosen.nidn}
            </p>
          ) : null}
          {dosen.education ? <p className="truncate">{dosen.education}</p> : null}
        </div>

        {dosen.email ? (
          <a
            href={`mailto:${dosen.email}`}
            className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-bold hover:underline"
            style={{ color: primary }}
          >
            <EnvelopeIcon className="h-3.5 w-3.5" />
            <span className="truncate">{dosen.email}</span>
          </a>
        ) : null}
      </div>
    </article>
  );
};

/** Halaman publik direktori dosen. */
export const LecturersPage: React.FC = () => {
  const { tenant } = useTenant();
  const isFaculty = tenant?.tenantType === 'faculty';
  const unitLabel = isFaculty ? 'fakultas' : 'program studi';

  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  useSeo({
    tenant,
    title: 'Dosen',
    description: isFaculty
      ? 'Direktori tenaga pengajar fakultas, dikelompokkan menurut program studi.'
      : 'Direktori tenaga pengajar dan bidang keahlian program studi.',
  });

  const [search, setSearch] = useState('');

  const lecturersQuery = useQuery({
    queryKey: ['public', 'lecturers'],
    queryFn: () => lecturerApi.public().then((res) => res.data),
  });

  const data = lecturersQuery.data;
  const keyword = search.trim().toLowerCase();

  /** Penyaring pencarian yang dipakai kedua mode tampilan. */
  const cocok = (dosen: PublicLecturer) =>
    keyword === '' ||
    dosen.name.toLowerCase().includes(keyword) ||
    (dosen.expertise ?? '').toLowerCase().includes(keyword) ||
    (dosen.nidn ?? '').toLowerCase().includes(keyword);

  const semuaDosen = data?.lecturers ?? [];
  const adaData = semuaDosen.length > 0;

  /**
   * Untuk fakultas, dosen dikelompokkan per prodi. Kelompok tanpa anggota
   * disembunyikan agar halaman tidak penuh judul kosong, kecuali saat sedang
   * mencari — kelompok kosong tetap tidak ditampilkan.
   */
  const kelompok = (data?.groups ?? [])
    .map((grup) => ({ ...grup, lecturers: grup.lecturers.filter(cocok) }))
    .filter((grup) => grup.lecturers.length > 0);

  const totalTampil = isFaculty && data?.grouped
    ? kelompok.reduce((n, g) => n + g.lecturers.length, 0)
    : semuaDosen.filter(cocok).length;

  return (
    <>
      <PageHeader
        eyebrow="Direktori"
        title="Tenaga Pengajar"
        description={
          isFaculty
            ? 'Dosen tetap fakultas beserta bidang keahlian dan jabatan akademiknya, dikelompokkan menurut program studi.'
            : 'Dosen tetap program studi beserta bidang keahlian dan jabatan akademiknya.'
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {lecturersQuery.isLoading ? (
          <LoadingState label="Memuat data dosen" rows={3} />
        ) : lecturersQuery.isError ? (
          <ErrorState
            message={toApiError(lecturersQuery.error).message}
            onRetry={() => void lecturersQuery.refetch()}
          />
        ) : !adaData ? (
          <EmptyState
            title="Belum ada data dosen"
            description={`${isFaculty ? 'Fakultas' : 'Program studi'} belum menambahkan data dosen ke website publik.`}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIDN, atau bidang keahlian"
                  aria-label="Cari dosen"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
                  style={{ borderColor: `${primary}55` }}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {totalTampil} dosen{keyword ? ' cocok dengan pencarian' : ''}
                {isFaculty && data?.grouped ? ` di ${kelompok.length} program studi` : ''}
              </p>
            </div>

            {totalTampil === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="Tidak ada hasil"
                  description="Tidak ada dosen yang cocok dengan pencarian Anda."
                />
              </div>
            ) : isFaculty && data?.grouped ? (
              /*
               * Tampilan FAKULTAS: satu blok per program studi.
               *
               * Setiap blok memiliki kepala berisi kode prodi, nama, jumlah
               * dosen, dan tautan ke website prodi — sehingga pengunjung tahu
               * dosen yang dibaca berasal dari prodi mana.
               */
              <div className="mt-10 space-y-14">
                {kelompok.map((grup) => (
                  <div key={grup.prodi.id} id={`prodi-${grup.prodi.code.toLowerCase()}`}>
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${primary}14` }}
                        >
                          <AcademicCapIcon className="h-6 w-6" style={{ color: primary }} />
                        </span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {grup.prodi.code} &bull; {grup.prodi.degree}
                          </p>
                          <h2 className="text-lg font-extrabold leading-tight text-slate-900">
                            {grup.prodi.name}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                          {grup.lecturers.length} dosen
                        </span>
                        {grup.prodi.hostname ? (
                          <a
                            href={`https://${grup.prodi.hostname}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold hover:underline"
                            style={{ color: primary }}
                          >
                            Website prodi
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                      {grup.lecturers.map((dosen) => (
                        <LecturerCard
                          key={`${grup.prodi.id}-${dosen.id}`}
                          dosen={dosen}
                          primary={primary}
                          accent={accent}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Tampilan PROGRAM STUDI: satu daftar datar. */
              <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {semuaDosen.filter(cocok).map((dosen) => (
                  <LecturerCard key={dosen.id} dosen={dosen} primary={primary} accent={accent} />
                ))}
              </div>
            )}

            {/* Catatan data yang belum lengkap — hanya relevan untuk fakultas. */}
            {isFaculty && data?.grouped && (data.tanpaHomebase ?? 0) > 0 ? (
              <p className="mt-10 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
                <BuildingOffice2Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Sebanyak {data.tanpaHomebase} dosen belum memiliki homebase program studi pada data SIAKAD,
                  sehingga belum dapat ditampilkan pada {unitLabel} ini.
                </span>
              </p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
};

export default LecturersPage;
