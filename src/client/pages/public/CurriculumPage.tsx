import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
/** Label lengkap untuk dropdown filter di atas. */
function formatSemesterFilter(smt: string | number | null | undefined): string {
  if (smt === null || smt === undefined || smt === '') return '-';
  const str = String(smt).trim();
  if (/^\d+$/.test(str)) return `Semester ${str}`;
  return str.replace(/-/g, ' ');
}

/**
 * Label ringkas untuk kolom tabel agar muat presisi.
 * Contoh: "Semester-1-2026" -> "Semester 1", atau "1" -> "Semester 1".
 */
function formatSemesterTable(smt: string | number | null | undefined): string {
  if (smt === null || smt === undefined || smt === '') return '-';
  const str = String(smt).trim();
  if (/^\d+$/.test(str)) return `Semester ${str}`;
  // Jika "Semester-1-2026" atau "Semester 1 2026", ambil "Semester 1"
  const match = str.match(/^Semester[- ](\d+)/i);
  if (match) return `Semester ${match[1]}`;
  return str;
}

import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { curriculumApi, type CurriculumRpsRow } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Satu baris mata kuliah pada tabel kurikulum. */
type BarisMataKuliah = {
  id: number;
  code: string;
  name: string;
  credits: number;
  description: string | null;
  rpsDocuments: CurriculumRpsRow[];
  semesterNumber: number | string | null;
};

/**
 * Halaman publik kurikulum.
 *
 * Seluruh angka dan daftar mata kuliah berasal dari database. Tidak ada data
 * contoh yang ditulis di kode maupun angka statistik yang dikarang.
 */
export const CurriculumPage: React.FC = () => {
  const { tenant } = useTenant();
  useSeo({ tenant, title: 'Kurikulum', description: 'Struktur kurikulum program studi beserta mata kuliah, SKS, dan dokumen RPS.' });

  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string | 'all'>('all');

  const curriculumQuery = useQuery({
    queryKey: ['public', 'curriculum'],
    queryFn: () => curriculumApi.public().then((res) => res.data),
  });

  const summary = curriculumQuery.data?.summary;
  const curriculums = curriculumQuery.data?.curriculums ?? [];
  const activeCurriculum = curriculums[0] ?? null;

  const courses = useMemo(() => {
    if (!activeCurriculum) return [];

    /*
     * Dua sumber digabung:
     * - `items`  → penawaran baru (ADR-006), membawa `course` (master) dan
     *              `academicSemester` (periode kalender).
     * - `semesters[].courses` → data warisan yang masih memakai posisi 1..14.
     * Menggabungkan keduanya membuat mata kuliah lama tidak hilang dari halaman
     * publik selama migrasi belum tuntas.
     */
    const fromItems = (activeCurriculum.items ?? []).map((item) => {
      // Semester kalender dipakai lebih dulu; bila kosong, jatuh ke posisi
      // warisan agar pengelompokan tetap punya angka.
      const legacyPosition = activeCurriculum.semesters.find((semester) =>
        semester.courses.some((course) => course.id === item.id),
      )?.semesterNumber;

      return {
        id: item.id,
        code: item.course.code,
        name: item.course.name,
        credits: item.credits,
        description: item.description,
        rpsDocuments: item.rpsDocuments,
        semesterNumber: legacyPosition ?? item.academicSemester?.name ?? null,
      };
    });

    const legacyIds = new Set(fromItems.map((course) => course.id));
    const fromLegacy = activeCurriculum.semesters.flatMap((semester) =>
      semester.courses
        .filter((course) => !legacyIds.has(course.id))
        .map((course) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          credits: course.credits,
          description: course.description,
          rpsDocuments: course.rpsDocuments ?? [],
          semesterNumber: semester.semesterNumber,
        })),
    );

    return [...fromItems, ...fromLegacy];
  }, [activeCurriculum]);

  /**
   * Pilihan filter semester: memprioritaskan seluruh master semester dari database
   * (Semester-1-2026 s/d Semester-8-2026), lalu digabung dengan semester dari courses jika ada.
   */
  const semesterOptions = useMemo(() => {
    const list: string[] = [];
    const set = new Set<string>();

    if (curriculumQuery.data?.masterSemesters?.length) {
      for (const ms of curriculumQuery.data.masterSemesters) {
        if (!set.has(ms.name)) {
          set.add(ms.name);
          list.push(ms.name);
        }
      }
    }

    for (const course of courses) {
      if (course.semesterNumber !== null && course.semesterNumber !== undefined) {
        const val = String(course.semesterNumber);
        if (!set.has(val)) {
          set.add(val);
          list.push(val);
        }
      }
    }

    return list.sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [curriculumQuery.data?.masterSemesters, courses]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchSemester =
        semesterFilter === 'all' || String(course.semesterNumber) === String(semesterFilter);
      const matchKeyword =
        keyword === '' ||
        course.name.toLowerCase().includes(keyword) ||
        course.code.toLowerCase().includes(keyword);
      return matchSemester && matchKeyword;
    });
  }, [courses, search, semesterFilter]);

  /*
   * Kolom tabel mata kuliah didefinisikan sebagai data agar lebar kolom tetap
   * dan kolom "Nama MK" saja yang melebar mengikuti panjang nama.
   */
  const columns: Array<DataTableColumn<BarisMataKuliah>> = [
    {
      key: 'kode',
      header: 'Kode MK',
      width: 140,
      cellClassName: 'font-mono text-slate-600',
      render: (course) => course.code,
    },
    {
      /*
       * Lebar nama dibatasi, bukan dibiarkan menyerap seluruh sisa tabel.
       * Judul mata kuliah memang paling panjang, tetapi bila dibiarkan melebar
       * sampai tepi kanan barisnya jadi terlalu jauh untuk dipindai mata dan
       * kolom lain terdorong jauh ke kanan.
       */
      key: 'nama',
      header: 'Nama Mata Kuliah',
      width: 340,
      cellClassName: 'font-medium text-slate-800',
      render: (course) => course.name,
    },
    {
      key: 'sks',
      header: 'SKS',
      width: 64,
      align: 'center',
      cellClassName: 'whitespace-nowrap text-slate-700',
      render: (course) => course.credits,
    },
    {
      key: 'semester',
      header: 'Smt',
      width: 120,
      align: 'center',
      cellClassName: 'whitespace-nowrap',
      render: (course) => {
        const ringkas = formatSemesterTable(course.semesterNumber);
        const lengkap = formatSemesterFilter(course.semesterNumber);
        if (ringkas === '-') return <span className="text-slate-400">—</span>;
        return (
          <span
            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
            title={lengkap}
          >
            {ringkas}
          </span>
        );
      },
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      width: 200,
      render: (course) =>
        course.description ? (
          <span className="text-slate-700">{course.description}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'rps',
      header: 'RPS',
      width: 140,
      align: 'right',
      render: (course) =>
        course.rpsDocuments && course.rpsDocuments.length > 0 ? (
          <a
            href={course.rpsDocuments[0].fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#1e3a8a]/20 px-2 py-1 text-xs font-bold text-[#1e3a8a] transition-colors hover:bg-[#e8eefb]"
          >
            <DocumentArrowDownIcon className="h-3.5 w-3.5 shrink-0" />
            Lihat RPS
          </a>
        ) : (
          <span className="text-xs text-slate-400">Belum tersedia</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Data Akademik"
        title="Kurikulum Program Studi"
        description="Struktur mata kuliah per semester beserta bobot SKS dan dokumen RPS yang tersedia."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/*
         * Keadaan memuat/galat/kosong ditangani DataTable. Header ringkasan dan
         * penyaring hanya tampil bila kurikulum sudah dimuat dan tersedia.
         */}
        {!curriculumQuery.isLoading && !curriculumQuery.isError && !activeCurriculum ? (
          <DataTable<BarisMataKuliah>
            rows={[]}
            rowKey={(course) => String(course.id)}
            columns={columns}
            emptyTitle="Kurikulum belum tersedia"
            emptyDescription="Program studi belum mempublikasikan data kurikulum. Silakan hubungi admin prodi atau periksa kembali nanti."
          />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {activeCurriculum?.name ?? 'Kurikulum Program Studi'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Tahun kurikulum {activeCurriculum?.year ?? '—'}
                {activeCurriculum?.description ? ` • ${activeCurriculum.description}` : ''}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Semester', value: summary?.totalSemesters ?? 0 },
                  { label: 'Mata Kuliah', value: summary?.totalCourses ?? 0 },
                  { label: 'Total SKS', value: summary?.totalCredits ?? 0 },
                  { label: 'RPS Tersedia', value: summary?.totalRps ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 px-4 py-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</dt>
                    <dd className="mt-0.5 text-xl font-extrabold text-[#1e3a8a]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama atau kode mata kuliah"
                  aria-label="Cari mata kuliah"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={semesterFilter}
                onChange={(event) => setSemesterFilter(event.target.value)}
                aria-label="Saring berdasarkan semester"
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs hover:border-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer transition-colors"
              >
                <option value="all">Semua semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    {formatSemesterFilter(semester)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <DataTable<BarisMataKuliah>
                rows={filtered}
                rowKey={(course) => String(course.id)}
                loading={curriculumQuery.isLoading}
                loadingLabel="Memuat kurikulum"
                loadingRows={4}
                error={curriculumQuery.isError ? toApiError(curriculumQuery.error).message : null}
                onRetry={() => void curriculumQuery.refetch()}
                emptyTitle={activeCurriculum ? 'Tidak ada mata kuliah yang cocok' : 'Kurikulum belum tersedia'}
                emptyDescription={
                  activeCurriculum
                    ? 'Tidak ada mata kuliah yang cocok dengan pencarian Anda.'
                    : 'Program studi belum mempublikasikan data kurikulum. Silakan hubungi admin prodi atau periksa kembali nanti.'
                }
                minWidth={980}
                columns={columns}
              />
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Menampilkan {filtered.length} dari {courses.length} mata kuliah.
            </p>
          </>
        )}
      </section>
    </>
  );
};

export default CurriculumPage;

