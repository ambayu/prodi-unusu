import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  BriefcaseIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { lecturerApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

export const LecturerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();
  const [copied, setCopied] = useState(false);

  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#fbbf24';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public', 'lecturer', id],
    queryFn: () => lecturerApi.publicDetail(id!).then((res) => res.data.lecturer),
    enabled: Boolean(id),
  });

  const dosen = data;

  useSeo({
    tenant,
    title: dosen ? `Profil ${dosen.name}` : 'Detail Dosen',
    description: dosen
      ? `Profil dan informasi akademik ${dosen.name}, ${dosen.academicRank ?? 'Dosen'} ${dosen.studyProgramName ?? ''}.`
      : 'Detail profil tenaga pengajar program studi.',
  });

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const namaBersih = dosen?.name ? dosen.name.replace(/^[\s\-._]+/, '').trim() : '';
  const inisial = React.useMemo(() => {
    if (!namaBersih) return 'DS';
    const bagian = namaBersih.split(/\s+/).filter(Boolean);
    if (bagian.length === 0) return 'DS';
    const awal = bagian[0]?.[0] ?? '';
    const akhir = bagian.length > 1 ? bagian[bagian.length - 1]?.[0] ?? '' : '';
    return (awal + akhir).toUpperCase() || 'DS';
  }, [namaBersih]);

  const sintaLink =
    dosen?.sintaUrl ||
    (dosen?.sintaId ? `https://sinta.kemdiktisaintek.go.id/authors/profile/${dosen.sintaId}` : null);

  return (
    <>
      <PageHeader
        eyebrow="Direktori SDM Dosen"
        title={dosen?.name || 'Detail Tenaga Pendidik'}
        description={
          dosen
            ? `${dosen.academicRank ?? 'Tenaga Pendidik'} • ${dosen.studyProgramName ?? tenant?.name ?? 'Program Studi'}`
            : 'Informasi dan biodata lengkap tenaga pendidik.'
        }
      />

      {/* Main Container dengan Margin Standar Publik (max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8) */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Tombol Bar Navigasi Atas */}
        <div className="flex items-center justify-between">
          <Link
            to="/dosen"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
          >
            <ArrowLeftIcon className="w-4 h-4 text-slate-500" />
            <span>Kembali ke Direktori Dosen</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 font-semibold text-xs transition shadow-xs"
          >
            <ShareIcon className="w-4 h-4 text-slate-500" />
            <span>{copied ? 'Tautan Disalin' : 'Bagikan Profil'}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 shadow-xs">
            <LoadingState label="Memuat profil data dosen..." rows={4} />
          </div>
        ) : isError || !dosen ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-xs space-y-4">
            <ErrorState
              message={error ? toApiError(error).message : 'Profil dosen tidak ditemukan atau belum aktif.'}
              onRetry={() => void refetch()}
            />
            <div className="text-center pt-2">
              <Link
                to="/dosen"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white font-semibold text-xs"
              >
                Lihat Seluruh Dosen
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. KARTU HEADER PROFIL RESMI / OFFICE LANDSCAPE (Mirip SDM Sarpras) */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
                  {/* Foto Profil Format Formal Pas Foto */}
                  <div className="w-full sm:w-auto shrink-0 flex justify-center md:justify-start">
                    <div className="relative w-44 h-56 sm:w-48 sm:h-60 rounded-lg overflow-hidden bg-slate-100 border border-slate-300 shadow-xs flex items-center justify-center">
                      {dosen.photoUrl ? (
                        <img
                          src={dosen.photoUrl}
                          alt={dosen.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-4 text-center">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-2 text-white shadow-xs"
                            style={{ backgroundColor: primary }}
                          >
                            {inisial}
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                            Foto Belum Tersedia
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uraian Identitas Profil Pegawai / Dosen */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Baris Status & Jabatan */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                        <span>{dosen.isActive !== false ? 'Dosen Aktif' : 'Non-Aktif'}</span>
                      </span>

                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                        {dosen.academicRank || 'Tenaga Pendidik'}
                      </span>

                      {dosen.education && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          Pendidikan {dosen.education}
                        </span>
                      )}
                    </div>

                    {/* Nama Lengkap & Gelar */}
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
                        {dosen.name}
                      </h1>
                      <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-600">
                        {dosen.studyProgramName || tenant?.name || 'Program Studi'}
                        <span className="mx-2 text-slate-300">&middot;</span>
                        <span className="text-slate-500">
                          {dosen.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                        </span>
                      </p>
                    </div>

                    {/* Deskripsi / Biografi Singkat Jika Ada */}
                    {dosen.bio && (
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed text-left">
                        <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Profil Singkat:
                        </span>
                        <p className="line-clamp-3">{dosen.bio}</p>
                      </div>
                    )}

                    {/* Parameter Identitas Cepat (NIDN, NIP, Email) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs text-slate-700">
                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                        <span className="block text-[11px] text-slate-500 font-medium">NIDN / NUPTK</span>
                        <span className="font-semibold text-slate-900 text-sm font-mono mt-0.5 block">
                          {dosen.nidn || '-'}
                        </span>
                      </div>

                      {dosen.nip && (
                        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                          <span className="block text-[11px] text-slate-500 font-medium">NIP</span>
                          <span className="font-semibold text-slate-900 text-sm font-mono mt-0.5 block">
                            {dosen.nip}
                          </span>
                        </div>
                      )}

                      <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                        <span className="block text-[11px] text-slate-500 font-medium">Email Resmi</span>
                        {dosen.email ? (
                          <a
                            href={`mailto:${dosen.email}`}
                            className="font-semibold text-blue-800 hover:underline mt-0.5 block truncate"
                          >
                            {dosen.email}
                          </a>
                        ) : (
                          <span className="font-semibold text-slate-400 mt-0.5 block">-</span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Profil Publikasi & Riset Eksternal */}
                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                      {sintaLink ? (
                        <a
                          href={sintaLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition"
                        >
                          <span>Profil SINTA</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 font-medium text-xs border border-slate-200">
                          SINTA Belum Ditautkan
                        </span>
                      )}

                      {dosen.googleScholar && (
                        <a
                          href={dosen.googleScholar}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                        >
                          <span>Google Scholar</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {dosen.scopusId && (
                        <a
                          href={`https://www.scopus.com/authid/detail.uri?authorId=${dosen.scopusId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition"
                        >
                          <span>Scopus ID</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {dosen.orcid && (
                        <a
                          href={`https://orcid.org/${dosen.orcid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition"
                        >
                          <span>ORCID</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. TABEL / INFORMASI RINCIAN OFFICE STANDAR (2 Kolom Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sisi Kiri: Ringkasan Data Akademik & Kepegawaian */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <BuildingLibraryIcon className="w-4 h-4 text-slate-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Informasi Kepegawaian
                    </h2>
                  </div>

                  <dl className="divide-y divide-slate-100 text-xs">
                    <div className="px-5 py-3">
                      <dt className="text-slate-500 font-medium">Program Studi (Homebase)</dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {dosen.studyProgramName || tenant?.name || '-'}
                      </dd>
                    </div>

                    <div className="px-5 py-3">
                      <dt className="text-slate-500 font-medium">Fakultas</dt>
                      <dd className="mt-1 font-semibold text-slate-800">{dosen.facultyName || '-'}</dd>
                    </div>

                    <div className="px-5 py-3">
                      <dt className="text-slate-500 font-medium">Jabatan Fungsional</dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {dosen.academicRank || 'Tenaga Pendidik'}
                      </dd>
                    </div>

                    <div className="px-5 py-3">
                      <dt className="text-slate-500 font-medium">Kualifikasi Pendidikan</dt>
                      <dd className="mt-1 font-semibold text-slate-800">{dosen.education || '-'}</dd>
                    </div>

                    {dosen.gender && (
                      <div className="px-5 py-3">
                        <dt className="text-slate-500 font-medium">Jenis Kelamin</dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {dosen.gender === 'L' ? 'Laki-laki' : dosen.gender === 'P' ? 'Perempuan' : dosen.gender}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
                  <p className="font-semibold text-slate-800">Sinkronisasi Data</p>
                  <p className="leading-relaxed">
                    Data profil akademik divalidasi dan disinkronkan langsung melalui ONE UNUSU API Hub sebagai data induk sivitas akademika kampus.
                  </p>
                </div>
              </div>

              {/* Sisi Kanan: Keahlian, Biografi Lengkap, dan Riset */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bidang Keahlian */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <BriefcaseIcon className="w-4 h-4 text-slate-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Bidang Keahlian &amp; Fokus Keilmuan
                    </h2>
                  </div>
                  <div className="p-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {dosen.expertise ? (
                      <p>{dosen.expertise}</p>
                    ) : (
                      <p className="text-slate-400 italic">Belum ada keterangan bidang keahlian.</p>
                    )}
                  </div>
                </div>

                {/* Biografi / Deskripsi Akademik Lengkap */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <BookOpenIcon className="w-4 h-4 text-slate-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Deskripsi / Biografi Akademik
                    </h2>
                  </div>
                  <div className="p-5 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {dosen.bio ? (
                      <p>{dosen.bio}</p>
                    ) : (
                      <p className="text-slate-400 italic">Belum ada biografi akademik yang dilampirkan di portal ONE UNUSU.</p>
                    )}
                  </div>
                </div>

                {/* Portofolio & Basis Data Ilmiah */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4 text-slate-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Tautan Riset &amp; Publikasi Ilmiah
                    </h2>
                  </div>

                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          SINTA Kemdiktisaintek
                        </span>
                        <span className="font-mono text-slate-800 font-medium">{dosen.sintaId || '-'}</span>
                      </div>
                      {sintaLink ? (
                        <a
                          href={sintaLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Google Scholar
                        </span>
                        <span className="text-slate-800 font-medium">
                          {dosen.googleScholar ? 'Terdaftar' : '-'}
                        </span>
                      </div>
                      {dosen.googleScholar ? (
                        <a
                          href={dosen.googleScholar}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Scopus Author ID
                        </span>
                        <span className="font-mono text-slate-800 font-medium">{dosen.scopusId || '-'}</span>
                      </div>
                      {dosen.scopusId ? (
                        <a
                          href={`https://www.scopus.com/authid/detail.uri?authorId=${dosen.scopusId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">ORCID ID</span>
                        <span className="font-mono text-slate-800 font-medium">{dosen.orcid || '-'}</span>
                      </div>
                      {dosen.orcid ? (
                        <a
                          href={`https://orcid.org/${dosen.orcid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default LecturerDetailPage;
