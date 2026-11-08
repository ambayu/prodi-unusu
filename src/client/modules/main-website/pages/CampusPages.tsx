import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useSeo } from '../../../hooks/useSeo';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { api, toApiError } from '../../../services/api';
import { groupByFaculty, type DirectoryResponse } from '../../../services/directory';

/**
 * Halaman "Kontak".
 *
 * Portal tidak memiliki alamat sendiri, sehingga yang ditampilkan adalah
 * alamat kampus dan daftar kontak setiap program studi yang diambil dari
 * database. Ini menghindari data kontak ganda yang harus dirawat manual.
 */
export const CampusContactPage: React.FC = () => {
  useSeo({
    tenant: null,
    title: 'Kontak',
    description:
      'Alamat kampus dan kontak resmi fakultas serta program studi Universitas Nahdlatul Ulama Sumatera Utara.',
  });

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = groupByFaculty(prodis);

  return (
    <>
      <PageHeader
        eyebrow="Hubungi Kami"
        title="Kontak & Lokasi"
        description="Sampaikan pertanyaan akademik maupun administrasi kepada kampus atau langsung ke program studi tujuan."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-1">
            <h2 className="text-sm font-extrabold text-slate-900">Kampus UNUSU</h2>
            <ul className="mt-4 space-y-4 text-xs text-slate-600">
              <li className="flex gap-3">
                <MapPinIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>
                  Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan, Sumatera Utara
                </span>
              </li>
              <li className="flex gap-3">
                <PhoneIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>Layanan akademik pada hari kerja, jam 08.00–16.00 WIB</span>
              </li>
              <li className="flex gap-3">
                <EnvelopeIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>Gunakan kontak program studi di samping untuk urusan spesifik prodi</span>
              </li>
              <li className="flex gap-3">
                <GlobeAltIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                <a
                  href="https://unusu.ac.id"
                  className="font-semibold text-emerald-800 hover:underline"
                >
                  unusu.ac.id
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-sm font-extrabold text-slate-900">Kontak Program Studi</h2>
            <p className="mt-1 text-xs text-slate-500">
              Setiap program studi memiliki laman kontak sendiri pada website resminya.
            </p>

            {directoryQuery.isLoading && (
              <div className="mt-4">
                <LoadingState label="Memuat kontak program studi" rows={3} />
              </div>
            )}

            {directoryQuery.isError && (
              <div className="mt-4">
                <ErrorState message={toApiError(directoryQuery.error).message} />
              </div>
            )}

            <div className="mt-4 space-y-6">
              {faculties.map((faculty) => (
                <div key={faculty.id}>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    {faculty.name}
                  </p>
                  <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {faculty.prodis.map((prodi) => (
                      <li
                        key={prodi.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{prodi.name}</p>
                          <p className="font-mono text-[10px] text-slate-500">
                            {prodi.primaryHostname ?? 'domain belum tersedia'}
                          </p>
                        </div>
                        {prodi.primaryHostname && (
                          <a
                            href={`https://${prodi.primaryHostname}/kontak`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            Kontak Prodi
                            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

/** Halaman "Layanan Kampus": pintu masuk layanan digital tanpa memaksa login. */
export const CampusServicesPage: React.FC = () => {
  useSeo({
    tenant: null,
    title: 'Layanan Kampus',
    description:
      'Pusat layanan digital Universitas Nahdlatul Ulama Sumatera Utara: website program studi, informasi pendaftaran, dan kontak.',
  });

  const services = [
    {
      title: 'Website Program Studi',
      body: 'Akses profil, kurikulum, dosen, dokumen, dan berita setiap program studi.',
      href: '/fakultas',
      internal: true,
    },
    {
      title: 'Penerimaan Mahasiswa Baru',
      body: 'Alur pendaftaran, persyaratan, dan informasi penerimaan mahasiswa baru.',
      href: '/pmb',
      internal: true,
    },
    {
      title: 'Riset & Pengabdian',
      body: 'Kegiatan penelitian dan pengabdian dosen bersama mahasiswa lintas prodi.',
      href: '/lppm',
      internal: true,
    },
    {
      title: 'Kontak & Lokasi',
      body: 'Alamat kampus serta kontak resmi fakultas dan program studi.',
      href: '/kontak',
      internal: true,
    },
    {
      title: 'Portal Universitas',
      body: 'Situs utama universitas untuk informasi institusi secara umum.',
      href: 'https://unusu.ac.id',
      internal: false,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Layanan"
        title="Layanan Kampus"
        description="Semua layanan informasi publik Universitas Nahdlatul Ulama Sumatera Utara dalam satu tempat."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const className =
              'group flex min-h-[44px] flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md';

            const body = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-800">
                    {service.title}
                  </h2>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-700" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{service.body}</p>
              </>
            );

            return service.internal ? (
              <a key={service.title} href={service.href} className={className}>
                {body}
              </a>
            ) : (
              <a
                key={service.title}
                href={service.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {body}
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
};
