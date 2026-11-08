import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useSeo } from '../../../hooks/useSeo';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { api, toApiError } from '../../../services/api';
import {
  formatTanggalIndonesia,
  type DirectoryFaculty,
  type DirectoryProdi,
  type DirectoryResponse,
  type PortalNews,
  type PortalNewsResponse,
} from '../../../services/directory';

/**
 * Halaman "Tentang UNUSU".
 *
 * Memakai endpoint publik yang sama dengan beranda portal, sehingga seluruh
 * isinya berasal dari database dan tidak perlu diperbarui manual saat program
 * studi baru ditambahkan.
 */
export const AboutPage: React.FC = () => {
  useSeo({
    tenant: null,
    title: 'Tentang UNUSU',
    description:
      'Sejarah, visi, dan struktur Universitas Nahdlatul Ulama Sumatera Utara beserta fakultas dan program studi yang dikelolanya.',
  });

  const directoryQuery = useQuery({
    queryKey: ['public', 'directory'],
    queryFn: () => api.get<DirectoryResponse>('/public/directory').then((res) => res.data),
  });

  const prodis = directoryQuery.data?.studyPrograms ?? [];
  const faculties = React.useMemo(() => {
    const map = new Map<number, DirectoryFaculty>();
    for (const prodi of prodis) {
      const existing = map.get(prodi.faculty.id);
      if (existing) {
        existing.prodis.push(prodi);
      } else {
        map.set(prodi.faculty.id, {
          id: prodi.faculty.id,
          code: prodi.faculty.code,
          name: prodi.faculty.name,
          prodis: [prodi],
        });
      }
    }
    return Array.from(map.values());
  }, [prodis]);

  return (
    <>
      <PageHeader
        eyebrow="Profil Institusi"
        title="Tentang Universitas Nahdlatul Ulama Sumatera Utara"
        description="Perguruan tinggi Nahdlatul Ulama di Sumatera Utara yang memadukan keunggulan akademik, teknologi, dan akhlak mulia."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <h2 className="text-xl font-extrabold text-slate-900">Identitas Perguruan Tinggi</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Universitas Nahdlatul Ulama Sumatera Utara (UNUSU) adalah perguruan tinggi yang
              berada di bawah naungan Nahdlatul Ulama. UNUSU menyelenggarakan pendidikan tinggi
              melalui fakultas dan program studi mandiri yang masing-masing memiliki website resmi
              sendiri.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Setiap program studi mengelola laman publiknya secara mandiri, sehingga informasi
              akademik, berita, dan prestasi dapat disampaikan langsung oleh pengelola program
              studi kepada masyarakat.
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <AcademicCapIcon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">
                  {directoryQuery.isLoading ? '—' : prodis.length}
                </p>
                <p className="text-xs font-semibold text-slate-500">Program Studi</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <BuildingOffice2Icon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">
                  {directoryQuery.isLoading ? '—' : faculties.length}
                </p>
                <p className="text-xs font-semibold text-slate-500">Fakultas</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <GlobeAltIcon className="h-6 w-6 text-emerald-700" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">1</p>
                <p className="text-xs font-semibold text-slate-500">Portal Terpadu</p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-extrabold text-slate-900">Sekretariat Kampus</h3>
              <ul className="mt-4 space-y-3 text-xs text-slate-600">
                <li className="flex gap-2.5">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan, Sumatera Utara
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <PhoneIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>Layanan akademik dan administrasi pada jam kerja</span>
                </li>
                <li className="flex gap-2.5">
                  <GlobeAltIcon className="h-4 w-4 shrink-0 text-emerald-700" />
                  <a href="https://unusu.ac.id" className="font-semibold text-emerald-800 hover:underline">
                    unusu.ac.id
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
                <CheckBadgeIcon className="h-4 w-4" />
                Program Studi Mandiri
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-emerald-800">
                Seluruh program studi memiliki domain resmi sendiri dan dapat diakses langsung
                dari halaman Fakultas &amp; Prodi.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

/**
 * Halaman "Penerimaan Mahasiswa Baru".
 *
 * Informasi jadwal dan persyaratan dikelola manual karena belum ada modul PMB;
 * tautan pendaftaran diarahkan ke portal universitas.
 */
export const AdmissionPage: React.FC = () => {
  useSeo({
    tenant: null,
    title: 'Penerimaan Mahasiswa Baru',
    description:
      'Informasi alur, persyaratan, dan jalur pendaftaran mahasiswa baru Universitas Nahdlatul Ulama Sumatera Utara.',
  });

  const steps = [
    {
      title: 'Pilih Program Studi',
      body: 'Lihat daftar fakultas dan program studi, lalu buka website prodi tujuan untuk mengenal kurikulum dan profilnya.',
    },
    {
      title: 'Siapkan Dokumen',
      body: 'Siapkan ijazah atau surat keterangan lulus, rapor, kartu identitas, dan pas foto terbaru.',
    },
    {
      title: 'Lakukan Pendaftaran',
      body: 'Pendaftaran dilakukan daring melalui portal penerimaan mahasiswa baru universitas.',
    },
    {
      title: 'Verifikasi dan Registrasi',
      body: 'Setelah dinyatakan diterima, lakukan verifikasi berkas dan registrasi mahasiswa baru sesuai jadwal.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Penerimaan"
        title="Penerimaan Mahasiswa Baru"
        description="Bergabunglah dengan UNUSU melalui program studi yang sesuai dengan minat dan cita-cita Anda."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-extrabold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">{step.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-[#14532D] p-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold">Siap mendaftar?</h2>
            <p className="mt-1 text-xs text-emerald-100">
              Pendaftaran dan informasi resmi tersedia pada portal universitas.
            </p>
          </div>
          <a
            href="https://unusu.ac.id"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-slate-950 transition-colors hover:bg-amber-300"
          >
            Buka Portal Universitas
          </a>
        </div>
      </section>
    </>
  );
};

/**
 * Halaman "Riset & Pengabdian".
 *
 * Menampilkan publikasi terbaru lintas prodi sebagai bukti kegiatan riset,
 * sekaligus menjelaskan fokus LPPM.
 */
export const ResearchPage: React.FC = () => {
  useSeo({
    tenant: null,
    title: 'Riset & Pengabdian',
    description:
      'Fokus penelitian dan pengabdian kepada masyarakat Universitas Nahdlatul Ulama Sumatera Utara beserta publikasi terbaru program studi.',
  });

  const newsQuery = useQuery({
    queryKey: ['public', 'news', 6],
    queryFn: () =>
      api.get<PortalNewsResponse>('/public/news', { params: { limit: 6 } }).then((res) => res.data),
  });

  const items: PortalNews[] = newsQuery.data?.items ?? [];

  const pillars = [
    {
      title: 'Penelitian Terapan',
      body: 'Riset yang diarahkan pada penyelesaian masalah nyata di masyarakat Sumatera Utara.',
    },
    {
      title: 'Pengabdian kepada Masyarakat',
      body: 'Pendampingan desa, pelatihan literasi digital, dan pemberdayaan ekonomi umat.',
    },
    {
      title: 'Kolaborasi Antar Prodi',
      body: 'Kegiatan lintas disiplin yang menghubungkan ilmu keagamaan, sains, dan teknologi.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="LPPM"
        title="Riset & Pengabdian kepada Masyarakat"
        description="Kegiatan penelitian dan pengabdian yang dilaksanakan dosen bersama mahasiswa di seluruh program studi."
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-extrabold text-slate-900">{pillar.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{pillar.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-extrabold text-slate-900">Publikasi Terbaru</h2>
          <p className="mt-1 text-xs text-slate-500">
            Berita kegiatan riset dan pengabdian dari website program studi.
          </p>

          {newsQuery.isLoading && (
            <div className="mt-5">
              <LoadingState label="Memuat publikasi" rows={2} />
            </div>
          )}

          {newsQuery.isError && (
            <div className="mt-5">
              <ErrorState message={toApiError(newsQuery.error).message} />
            </div>
          )}

          {newsQuery.isSuccess && items.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-700">Belum ada publikasi</p>
              <p className="mt-1 text-xs text-slate-500">
                Berita riset yang dipublikasikan program studi akan tampil di sini.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const Card: React.ElementType = item.url ? 'a' : 'div';
                const props = item.url
                  ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
                  : {};

                return (
                  <Card
                    key={item.id}
                    {...props}
                    className="group flex min-h-[44px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md"
                  >
                    <p className="text-[11px] font-bold text-emerald-800">{item.studyProgramCode}</p>
                    <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-800">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {formatTanggalIndonesia(item.publishedAt)}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AboutPage;
