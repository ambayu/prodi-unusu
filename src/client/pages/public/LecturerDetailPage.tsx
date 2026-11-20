import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { lecturerApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatTanggalIndonesia(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = BULAN_ID[Number(dmy[2]) - 1];
    if (month && day >= 1 && day <= 31) return `${day} ${month} ${dmy[3]}`;
  }
  const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const day = Number(ymd[3]);
    const month = BULAN_ID[Number(ymd[2]) - 1];
    if (month && day >= 1 && day <= 31) return `${day} ${month} ${ymd[1]}`;
  }
  return trimmed;
}

function inferEducation(education?: string | null, name?: string): string {
  if (education?.trim()) return education.trim();
  if (!name) return '-';
  if (/\bDr\.|\bPh\.?D/i.test(name)) return 'Doktor (S3)';
  if (/\bM\.[A-Za-z]+|\bM\.Si|\bM\.Kom|\bM\.Pd|\bM\.Ag|\bM\.M\b|\bM\.H\b/i.test(name)) {
    return 'Magister (S2)';
  }
  if (/\bS\.[A-Za-z]+/i.test(name)) return 'Sarjana (S1)';
  return '-';
}

export const LecturerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();
  const [photoFailed, setPhotoFailed] = useState(false);

  const primary = tenant?.theme?.primaryColor ?? '#1e3a8a';
  const accent = tenant?.theme?.accentColor ?? '#0284c7';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public', 'lecturer', id],
    queryFn: () => lecturerApi.publicDetail(id!).then((res) => res.data.lecturer),
    enabled: Boolean(id),
  });

  const dosen = data;

  React.useEffect(() => {
    setPhotoFailed(false);
  }, [id, dosen?.photoUrl]);

  useSeo({
    tenant,
    title: dosen ? `Profil ${dosen.name}` : 'Detail Dosen',
    description: dosen
      ? `Profil dan informasi akademik ${dosen.name}, ${dosen.academicRank ?? 'Dosen'} ${dosen.studyProgramName ?? ''}.`
      : 'Detail profil tenaga pengajar program studi.',
  });

  const namaBersih = dosen?.name ? dosen.name.replace(/^[\s\-._]+/, '').trim() : '';

  const inisial = useMemo(() => {
    if (!namaBersih) return 'DS';
    const bagian = namaBersih
      .replace(/^(Dr\.|Prof\.|Drs\.|Ir\.|H\.|Hj\.)\s+/i, '')
      .split(/\s+/)
      .filter(Boolean);
    if (bagian.length === 0) return 'DS';
    const awal = bagian[0]?.[0] ?? '';
    const akhir = bagian.length > 1 ? bagian[1]?.[0] ?? '' : '';
    return (awal + akhir).toUpperCase() || 'DS';
  }, [namaBersih]);

  const sintaLink =
    dosen?.sintaUrl ||
    (dosen?.sintaId ? `https://sinta.kemdiktisaintek.go.id/authors/profile/${dosen.sintaId}` : null);

  const scopusLink = dosen?.scopusId
    ? `https://www.scopus.com/authid/detail.uri?authorId=${dosen.scopusId}`
    : null;

  const orcidLink = dosen?.orcid ? `https://orcid.org/${dosen.orcid}` : null;

  const pendidikanLabel = useMemo(
    () => inferEducation(dosen?.education, namaBersih),
    [dosen?.education, namaBersih],
  );

  const ttlLabel = useMemo(() => {
    const tanggal = formatTanggalIndonesia(dosen?.dateOfBirth);
    const parts = [dosen?.placeOfBirth?.trim(), tanggal].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  }, [dosen?.placeOfBirth, dosen?.dateOfBirth]);

  const genderLabel =
    dosen?.gender === 'L' || dosen?.gender?.toLowerCase() === 'laki-laki'
      ? 'Laki-laki'
      : dosen?.gender === 'P' || dosen?.gender?.toLowerCase() === 'perempuan'
        ? 'Perempuan'
        : '-';

  const expertiseTags = useMemo(() => {
    if (!dosen?.expertise) return [];
    const items = dosen.expertise
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length > 1 ? items : [];
  }, [dosen?.expertise]);

  const publicationLinks = [
    {
      key: 'sinta',
      label: 'SINTA Kemdiktisaintek',
      shortLabel: 'Profil SINTA',
      value: dosen?.sintaId ? `ID: ${dosen.sintaId}` : sintaLink ? 'Terdaftar' : null,
      href: sintaLink,
    },
    {
      key: 'scholar',
      label: 'Google Scholar',
      shortLabel: 'Google Scholar',
      value: dosen?.googleScholar ? 'Terdaftar' : null,
      href: dosen?.googleScholar || null,
    },
    {
      key: 'scopus',
      label: 'Scopus Author',
      shortLabel: 'Scopus',
      value: dosen?.scopusId ? `ID: ${dosen.scopusId}` : null,
      href: scopusLink,
    },
    {
      key: 'orcid',
      label: 'ORCID iD',
      shortLabel: 'ORCID',
      value: dosen?.orcid || null,
      href: orcidLink,
    },
  ];

  const activePublications = publicationLinks.filter((item) => Boolean(item.href));

  return (
    <div className="bg-editorial-paper min-h-[70vh]">
      {/* Banner Header Bertekstur Arsitektural Adaptif Tema */}
      <header
        className="relative overflow-hidden pb-24 pt-10 sm:pb-28 sm:pt-12"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}e6 58%, #0f172a 100%)`,
        }}
      >
        <img
          src="/assets/visual/lecturer-card-texture.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-30 mix-blend-screen"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] opacity-90"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/dosen"
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Kembali ke Direktori Dosen</span>
            </Link>

            <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-white/80">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
              Profil Tenaga Pendidik
            </span>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <section className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 pb-16 sm:-mt-20 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-12 shadow-lg">
            <LoadingState label="Memuat profil data dosen..." rows={5} />
          </div>
        ) : isError || !dosen ? (
          <div className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-12 shadow-lg">
            <ErrorState
              message={error ? toApiError(error).message : 'Profil dosen tidak ditemukan atau belum aktif.'}
              onRetry={() => void refetch()}
            />
            <div className="pt-2 text-center">
              <Link
                to="/dosen"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
                style={{ backgroundColor: primary }}
              >
                Lihat Seluruh Dosen
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. KARTU HERO PROFIL UTAMA */}
            <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-lg">
              <div className="p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col items-center gap-7 md:flex-row md:items-start md:gap-9">
                  {/* Foto Pas Foto Proporsional 3:4 */}
                  <div className="w-44 shrink-0 sm:w-52">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 p-1.5 shadow-lg ring-1 ring-slate-200/90">
                      {dosen.photoUrl && !photoFailed ? (
                        <img
                          src={dosen.photoUrl}
                          alt={`Foto ${dosen.name}`}
                          className="h-full w-full rounded-xl object-cover object-top"
                          onError={() => setPhotoFailed(true)}
                        />
                      ) : (
                        <div
                          className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl p-5 text-center text-white"
                          style={{
                            background: `linear-gradient(145deg, ${primary} 0%, ${primary}d0 60%, #0f172a 100%)`,
                          }}
                        >
                          <img
                            src="/assets/visual/lecturer-card-texture.png"
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
                          />
                          <span className="relative z-10 text-4xl font-extrabold tracking-wider">
                            {inisial}
                          </span>
                          <span className="relative z-10 mt-2 text-[11px] font-bold uppercase tracking-widest text-white/80">
                            Tenaga Pendidik
                          </span>
                        </div>
                      )}

                      {dosen.academicRank ? (
                        <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/75 px-2.5 py-1.5 text-center text-[11px] font-bold tracking-wide text-white backdrop-blur-md">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                          />
                          <span className="truncate">{dosen.academicRank}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Identitas & Ringkasan Kontak */}
                  <div className="flex min-w-0 flex-1 flex-col text-center md:text-left">
                    {/* Status & Chip Akademik */}
                    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-800">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                        <span>{dosen.isActive !== false ? 'Dosen Aktif' : 'Non-Aktif'}</span>
                      </span>

                      <span
                        className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-bold"
                        style={{
                          backgroundColor: `${primary}10`,
                          borderColor: `${primary}28`,
                          color: primary,
                        }}
                      >
                        {dosen.academicRank || 'Dosen Tetap'}
                      </span>

                      {pendidikanLabel !== '-' ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/90 px-3 py-1 text-[12px] font-semibold text-slate-700">
                          {pendidikanLabel}
                        </span>
                      ) : null}
                    </div>

                    {/* Nama & Afiliasi */}
                    <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-3xl lg:text-[34px]">
                      {dosen.name}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[14.5px] font-semibold text-slate-600 md:justify-start">
                      <span className="font-bold" style={{ color: primary }}>
                        {dosen.studyProgramName || tenant?.name || 'Program Studi'}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        &bull;
                      </span>
                      <span>
                        {dosen.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                      </span>
                    </div>

                    {/* Grid Metadata Ringkas (hanya tampilkan kolom yang informatif) */}
                    <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <IdentificationIcon className="h-3.5 w-3.5" style={{ color: primary }} />
                          NIDN / NUPTK
                        </span>
                        <span className="mt-1 block font-mono text-[14px] font-bold text-slate-950">
                          {dosen.nidn || '-'}
                        </span>
                      </div>

                      {dosen.nip ? (
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <IdentificationIcon className="h-3.5 w-3.5" style={{ color: primary }} />
                            NIP
                          </span>
                          <span className="mt-1 block font-mono text-[14px] font-bold text-slate-950">
                            {dosen.nip}
                          </span>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <EnvelopeIcon className="h-3.5 w-3.5" style={{ color: primary }} />
                          Email Resmi
                        </span>
                        {dosen.email ? (
                          <a
                            href={`mailto:${dosen.email}`}
                            className="mt-1 block truncate text-[13.5px] font-bold hover:underline"
                            style={{ color: primary }}
                            title={dosen.email}
                          >
                            {dosen.email}
                          </a>
                        ) : (
                          <span className="mt-1 block text-[13.5px] font-medium text-slate-400">
                            Belum tersedia
                          </span>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <MapPinIcon className="h-3.5 w-3.5" style={{ color: primary }} />
                          Domisili
                        </span>
                        <span
                          className="mt-1 block truncate text-[13.5px] font-semibold text-slate-800"
                          title={dosen.address || undefined}
                        >
                          {dosen.address || 'Medan, Sumatera Utara'}
                        </span>
                      </div>
                    </div>

                    {/* Aksi Cepat Tautan Publikasi (hanya yang terhubung) */}
                    {activePublications.length > 0 ? (
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
                        {activePublications.map((pub) => (
                          <a
                            key={pub.key}
                            href={pub.href!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold text-white shadow-xs transition hover:-translate-y-0.5 hover:opacity-95"
                            style={{ backgroundColor: primary }}
                          >
                            <span>{pub.shortLabel}</span>
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>

            {/* 2. RINCIAN INFORMASI AKADEMIK & KEPEGAWAIAN */}
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
              {/* Kolom Kiri (4/12): Informasi Kepegawaian */}
              <div className="lg:col-span-4">
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14`, color: primary }}
                    >
                      <BuildingLibraryIcon className="h-4 w-4" />
                    </span>
                    <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-slate-900">
                      Informasi Kepegawaian
                    </h2>
                  </div>

                  <dl className="divide-y divide-slate-100">
                    <div className="px-6 py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Program Studi (Homebase)
                      </dt>
                      <dd className="mt-1 text-[14px] font-bold text-slate-900">
                        {dosen.studyProgramName || tenant?.name || '-'}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Fakultas
                      </dt>
                      <dd className="mt-1 text-[14px] font-semibold text-slate-800">
                        {dosen.facultyName || 'Universitas Nahdlatul Ulama Sumatera Utara'}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Jabatan Fungsional
                      </dt>
                      <dd className="mt-1 text-[14px] font-semibold text-slate-800">
                        {dosen.academicRank || 'Tenaga Pendidik'}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Pendidikan Terakhir
                      </dt>
                      <dd className="mt-1 text-[14px] font-semibold text-slate-800">
                        {pendidikanLabel}
                      </dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Tempat, Tanggal Lahir
                      </dt>
                      <dd className="mt-1 text-[14px] font-semibold text-slate-800">{ttlLabel}</dd>
                    </div>

                    <div className="px-6 py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Jenis Kelamin
                      </dt>
                      <dd className="mt-1 text-[14px] font-semibold text-slate-800">{genderLabel}</dd>
                    </div>

                    {dosen.address ? (
                      <div className="px-6 py-3.5">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Alamat / Domisili
                        </dt>
                        <dd className="mt-1 text-[13.5px] font-semibold text-slate-800">
                          {dosen.address}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>

              {/* Kolom Kanan (8/12): Biografi, Keahlian & Indeks Publikasi */}
              <div className="space-y-6 lg:col-span-8">
                {/* Biografi Akademik */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14`, color: primary }}
                    >
                      <BookOpenIcon className="h-4 w-4" />
                    </span>
                    <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-slate-900">
                      Profil &amp; Biografi Akademik
                    </h2>
                  </div>
                  <div className="p-6 text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">
                    {dosen.bio ? (
                      <p>{dosen.bio}</p>
                    ) : (
                      <p className="text-[13.5px] italic text-slate-400">
                        Biografi akademik belum dilengkapi pada portal ONE UNUSU.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bidang Keahlian (hanya tampil bila tersedia agar tidak menambah blok kosong) */}
                {dosen.expertise ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
                    <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${primary}14`, color: primary }}
                      >
                        <BriefcaseIcon className="h-4 w-4" />
                      </span>
                      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-slate-900">
                        Bidang Keahlian &amp; Fokus Riset
                      </h2>
                    </div>
                    <div className="p-6">
                      {expertiseTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {expertiseTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold"
                              style={{
                                backgroundColor: `${primary}0d`,
                                borderColor: `${primary}24`,
                                color: primary,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[15px] leading-relaxed text-slate-700">
                          {dosen.expertise}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Indeks Riset & Publikasi Ilmiah */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${primary}14`, color: primary }}
                    >
                      <AcademicCapIcon className="h-4 w-4" />
                    </span>
                    <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-slate-900">
                      Indeks Riset &amp; Publikasi Ilmiah
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 p-6 sm:grid-cols-2">
                    {publicationLinks.map((pub) =>
                      pub.href ? (
                        <a
                          key={pub.key}
                          href={pub.href}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                          style={{
                            backgroundColor: `${primary}08`,
                            borderColor: `${primary}28`,
                          }}
                        >
                          <div className="min-w-0">
                            <span
                              className="block truncate text-[11px] font-extrabold uppercase tracking-wider"
                              style={{ color: primary }}
                            >
                              {pub.label}
                            </span>
                            <span className="mt-1 block truncate font-mono text-[13.5px] font-bold text-slate-900">
                              {pub.value}
                            </span>
                          </div>
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-[12px] font-bold text-white transition group-hover:opacity-95"
                            style={{ backgroundColor: primary }}
                          >
                            <span>Buka</span>
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                          </span>
                        </a>
                      ) : (
                        <div
                          key={pub.key}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
                        >
                          <div className="min-w-0">
                            <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              {pub.label}
                            </span>
                            <span className="mt-1 block text-[12.5px] text-slate-400">
                              Belum ditautkan
                            </span>
                          </div>
                          <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                            &mdash;
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default LecturerDetailPage;
