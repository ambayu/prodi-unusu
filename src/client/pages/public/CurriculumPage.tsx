import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
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

  /** Pilihan filter semester dibangun dari nilai yang benar-benar ada. */
  const semesterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const course of courses) {
      if (course.semesterNumber !== null && course.semesterNumber !== undefined) {
        set.add(String(course.semesterNumber));
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [courses]);

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
      width: 130,
      cellClassName: 'whitespace-nowrap font-mono text-slate-600',
      render: (course) => course.code,
    },
    {
      key: 'nama',
      header: 'Nama MK',
      cellClassName: 'font-medium text-slate-800',
      render: (course) => course.name,
    },
    {
      key: 'sks',
      header: 'SKS',
      width: 70,
      align: 'center',
      cellClassName: 'text-slate-700',
      render: (course) => course.credits,
    },
    {
      key: 'semester',
      header: 'Smt',
      width: 80,
      align: 'center',
      cellClassName: 'text-slate-500',
      render: (course) => course.semesterNumber,
    },
    {
      key: 'keterangan',
      header: 'Keterangan',
      width: 200,
      render: (course) =>
        course.description ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
            {course.description}
          </span>
        ) : (
          <span className="text-[10px] italic text-slate-400">-</span>
        ),
    },
    {
      key: 'rps',
      header: 'RPS',
      width: 130,
      align: 'right',
      render: (course) =>
        course.rpsDocuments && course.rpsDocuments.length > 0 ? (
          <a
            href={course.rpsDocuments[0].fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-[#1e3a8a]/20 px-2 py-1 text-[11px] font-bold text-[#1e3a8a] transition-colors hover:bg-[#e8eefb]"
          >
            <DocumentArrowDownIcon className="h-3.5 w-3.5" />
            Lihat RPS
          </a>
        ) : (
          <span className="text-[11px] text-slate-400">Belum tersedia</span>
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
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
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
                minWidth={760}
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

