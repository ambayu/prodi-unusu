import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  EnvelopeIcon,
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  BriefcaseIcon,
  BookOpenIcon,
  CheckCircleIcon,
  SparklesIcon,
  IdentificationIcon,
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
        eyebrow="Direktori Tenaga Pendidik"
        title={dosen?.name || 'Detail Tenaga Pendidik'}
        description={
          dosen
            ? `${dosen.academicRank ?? 'Dosen'} • ${dosen.studyProgramName ?? tenant?.name ?? 'Program Studi'}`
            : 'Profil akademik dan portofolio penelitian sivitas akademika.'
        }
      />

      {/* Main Container dengan Margin Publik Standar Web Kampus */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 shadow-xs">
            <LoadingState label="Memuat profil data dosen..." rows={5} />
          </div>
        ) : isError || !dosen ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 shadow-xs space-y-4">
            <ErrorState
              message={error ? toApiError(error).message : 'Profil dosen tidak ditemukan atau belum aktif.'}
              onRetry={() => void refetch()}
            />
            <div className="text-center pt-2">
              <Link
                to="/dosen"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition hover:opacity-95"
                style={{ backgroundColor: primary }}
              >
                Lihat Seluruh Dosen
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. KARTU HEADER HERO PROFIL MEWAH & ELEGAN */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
              {/* Ornamen Garis Aksen di Paling Atas */}
              <div
                className="h-2.5 w-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${primary} 0%, ${primary}cc 70%, ${accent} 100%)`,
                }}
              />

              <div className="p-6 sm:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                  {/* Foto Profil Pas Foto Berbayang & Bingkai Halus */}
                  <div className="shrink-0">
                    <div className="relative w-44 h-56 sm:w-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-xl ring-1 ring-slate-200/80 flex items-center justify-center">
                      {dosen.photoUrl ? (
                        <img
                          src={dosen.photoUrl}
                          alt={dosen.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white"
                          style={{
                            backgroundImage: `linear-gradient(145deg, ${primary} 0%, ${primary}dd 60%, ${accent} 100%)`,
                          }}
                        >
                          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xs text-white flex items-center justify-center font-black text-3xl mb-2 shadow-inner border border-white/30">
                            {inisial}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                            Tenaga Pendidik
                          </span>
                        </div>
                      )}

                      {/* Badge Gelar / Jabatan di Sudut Bawah Foto */}
                      {dosen.academicRank && (
                        <div
                          className="absolute bottom-2.5 left-2.5 right-2.5 py-1 px-2.5 rounded-lg text-center text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md backdrop-blur-md"
                          style={{ backgroundColor: accent }}
                        >
                          {dosen.academicRank}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uraian Identitas Profil Utama */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Status Pill & Tag Pendidikan */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 shadow-2xs">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                        <span>{dosen.isActive !== false ? 'Dosen Aktif' : 'Non-Aktif'}</span>
                      </span>

                      {dosen.academicRank && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                          {dosen.academicRank}
                        </span>
                      )}

                      {dosen.education && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200/80">
                          Pendidikan: {dosen.education}
                        </span>
                      )}
                    </div>

                    {/* Nama Lengkap & Gelar */}
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        {dosen.name}
                      </h1>
                      <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm font-semibold text-slate-600">
                        <span className="text-blue-700 font-bold">
                          {dosen.studyProgramName || tenant?.name || 'Program Studi'}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-slate-500">
                          {dosen.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                        </span>
                      </div>
                    </div>

                    {/* Ringkasan Biografi / Deskripsi Cepat (Bila Ada) */}
                    {dosen.bio && (
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-slate-50/50 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed text-left shadow-2xs">
                        <span className="block text-[10px] font-extrabold text-blue-900 uppercase tracking-widest mb-1">
                          Sekilas Profil:
                        </span>
                        <p className="line-clamp-3 text-slate-700 font-normal">{dosen.bio}</p>
                      </div>
                    )}

                    {/* Parameter Identitas Cepat (NIDN, NIP, Email) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 text-left">
                      <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          NIDN / NUPTK
                        </span>
                        <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                          {dosen.nidn || '-'}
                        </span>
                      </div>

                      {dosen.nip ? (
                        <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            NIP
                          </span>
                          <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                            {dosen.nip}
                          </span>
                        </div>
                      ) : null}

                      <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Email Resmi
                        </span>
                        {dosen.email ? (
                          <a
                            href={`mailto:${dosen.email}`}
                            className="font-bold text-blue-700 hover:text-blue-900 hover:underline mt-0.5 block truncate text-xs"
                          >
                            {dosen.email}
                          </a>
                        ) : (
                          <span className="font-semibold text-slate-400 mt-0.5 block text-xs">-</span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Profil Publikasi Ilmiah Cepat */}
                    <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                      {sintaLink ? (
                        <a
                          href={sintaLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition-all shadow-xs hover:-translate-y-0.5"
                        >
                          <span>Profil SINTA</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-slate-950" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs border border-slate-200">
                          SINTA Belum Ditautkan
                        </span>
                      )}

                      {dosen.googleScholar && (
                        <a
                          href={dosen.googleScholar}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs hover:-translate-y-0.5"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-all shadow-xs hover:-translate-y-0.5"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs hover:-translate-y-0.5"
                        >
                          <span>ORCID</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. RINCIAN TABULAR 2 KOLOM (MODERN CARDS) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Kolom Kiri (1/3): Informasi Kepegawaian & Verifikasi Data */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 flex items-center gap-2.5">
                    <BuildingLibraryIcon className="w-5 h-5 text-blue-700" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Informasi Kepegawaian
                    </h2>
                  </div>

                  <dl className="divide-y divide-slate-100 text-xs">
                    <div className="px-6 py-3.5">
                      <dt className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Program Studi (Homebase)
                      </dt>
                      <dd className="mt-1 font-bold text-slate-800 text-sm">
                        {dosen.studyProgramName || tenant?.name || '-'}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Fakultas
                      </dt>
                      <dd className="mt-1 font-bold text-slate-800">
                        {dosen.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Jabatan Fungsional
                      </dt>
                      <dd className="mt-1 font-bold text-slate-800">
                        {dosen.academicRank || 'Tenaga Pendidik'}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Pendidikan Terakhir
                      </dt>
                      <dd className="mt-1 font-bold text-slate-800">
                        {dosen.education || '-'}
                      </dd>
                    </div>

                    {dosen.gender && (
                      <div className="px-6 py-3.5">
                        <dt className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          Jenis Kelamin
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {dosen.gender === 'L' ? 'Laki-laki' : dosen.gender === 'P' ? 'Perempuan' : dosen.gender}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Kotak Sinkronisasi Data ONE UNUSU */}
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-5 text-xs text-slate-600 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <SparklesIcon className="w-4 h-4 text-blue-600" />
                    <span>Data Induk Terverifikasi</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    Informasi profil, riwayat pendidikan, dan jabatan akademik ini divalidasi langsung melalui ONE UNUSU API Hub.
                  </p>
                </div>
              </div>

              {/* Kolom Kanan (2/3): Keahlian, Biografi, & Portofolio */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bidang Keahlian */}
                <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 flex items-center gap-2.5">
                    <BriefcaseIcon className="w-5 h-5 text-indigo-700" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Bidang Keahlian &amp; Fokus Riset
                    </h2>
                  </div>
                  <div className="p-6 text-sm text-slate-700 leading-relaxed">
                    {dosen.expertise ? (
                      <p className="font-medium text-slate-800">{dosen.expertise}</p>
                    ) : (
                      <p className="text-slate-400 italic text-xs">Belum ada keterangan bidang keahlian khusus.</p>
                    )}
                  </div>
                </div>

                {/* Deskripsi / Biografi Akademik Lengkap */}
                <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 flex items-center gap-2.5">
                    <BookOpenIcon className="w-5 h-5 text-emerald-700" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Deskripsi / Biografi Akademik
                    </h2>
                  </div>
                  <div className="p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {dosen.bio ? (
                      <p>{dosen.bio}</p>
                    ) : (
                      <p className="text-slate-400 italic text-xs">
                        Belum ada biografi akademik yang dilampirkan untuk dosen ini di portal ONE UNUSU.
                      </p>
                    )}
                  </div>
                </div>

                {/* Tautan Riset & Publikasi Ilmiah */}
                <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-200 flex items-center gap-2.5">
                    <AcademicCapIcon className="w-5 h-5 text-amber-700" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Tautan Riset &amp; Publikasi Ilmiah
                    </h2>
                  </div>

                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between transition hover:bg-amber-50">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                          SINTA Kemdiktisaintek
                        </span>
                        <span className="font-mono text-slate-900 font-bold mt-0.5 block">
                          {dosen.sintaId || '-'}
                        </span>
                      </div>
                      {sintaLink ? (
                        <a
                          href={sintaLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-2xs"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-blue-200/80 bg-blue-50/40 flex items-center justify-between transition hover:bg-blue-50">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                          Google Scholar
                        </span>
                        <span className="text-slate-900 font-bold mt-0.5 block">
                          {dosen.googleScholar ? 'Terdaftar' : '-'}
                        </span>
                      </div>
                      {dosen.googleScholar ? (
                        <a
                          href={dosen.googleScholar}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-orange-200/80 bg-orange-50/40 flex items-center justify-between transition hover:bg-orange-50">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 block">
                          Scopus Author ID
                        </span>
                        <span className="font-mono text-slate-900 font-bold mt-0.5 block">
                          {dosen.scopusId || '-'}
                        </span>
                      </div>
                      {dosen.scopusId ? (
                        <a
                          href={`https://www.scopus.com/authid/detail.uri?authorId=${dosen.scopusId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-2xs"
                        >
                          Buka &rarr;
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 flex items-center justify-between transition hover:bg-emerald-50">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                          ORCID ID
                        </span>
                        <span className="font-mono text-slate-900 font-bold mt-0.5 block">
                          {dosen.orcid || '-'}
                        </span>
                      </div>
                      {dosen.orcid ? (
                        <a
                          href={`https://orcid.org/${dosen.orcid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-2xs"
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
