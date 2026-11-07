import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { useSeo } from '../../hooks/useSeo';
import { useTenant } from '../../hooks/useSite';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { curriculumApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

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
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all');

  const curriculumQuery = useQuery({
    queryKey: ['public', 'curriculum'],
    queryFn: () => curriculumApi.public().then((res) => res.data),
  });

  const summary = curriculumQuery.data?.summary;
  const curriculums = curriculumQuery.data?.curriculums ?? [];
  const activeCurriculum = curriculums[0] ?? null;

  const courses = useMemo(() => {
    if (!activeCurriculum) return [];
    return activeCurriculum.semesters.flatMap((semester) =>
      semester.courses.map((course) => ({ ...course, semesterNumber: semester.semesterNumber })),
    );
  }, [activeCurriculum]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchSemester = semesterFilter === 'all' || course.semesterNumber === semesterFilter;
      const matchKeyword =
        keyword === '' ||
        course.name.toLowerCase().includes(keyword) ||
        course.code.toLowerCase().includes(keyword);
      return matchSemester && matchKeyword;
    });
  }, [courses, search, semesterFilter]);

  return (
    <>
      <PageHeader
        eyebrow="Data Akademik"
        title="Kurikulum Program Studi"
        description="Struktur mata kuliah per semester beserta bobot SKS dan dokumen RPS yang tersedia."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {curriculumQuery.isLoading ? (
          <LoadingState label="Memuat kurikulum" rows={4} />
        ) : curriculumQuery.isError ? (
          <ErrorState
            message={toApiError(curriculumQuery.error).message}
            onRetry={() => void curriculumQuery.refetch()}
          />
        ) : !activeCurriculum ? (
          <EmptyState
            title="Kurikulum belum tersedia"
            description="Program studi belum mempublikasikan data kurikulum. Silakan hubungi admin prodi atau periksa kembali nanti."
          />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{activeCurriculum.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tahun kurikulum {activeCurriculum.year}
                {activeCurriculum.description ? ` â€¢ ${activeCurriculum.description}` : ''}
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
                onChange={(event) =>
                  setSemesterFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
                }
                aria-label="Saring berdasarkan semester"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua semester</option>
                {activeCurriculum.semesters.map((semester) => (
                  <option key={semester.id} value={semester.semesterNumber}>
                    {semester.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Kode MK</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Nama MK</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      SKS
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Smt
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Jenis</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      RPS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                        Tidak ada mata kuliah yang cocok dengan pencarian Anda.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((course) => (
                      <tr key={course.id} className="border-b border-slate-100 last:border-0">
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
                          {course.code}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{course.name}</td>
                        <td className="px-4 py-2.5 text-center text-slate-700">{course.credits}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500">{course.semesterNumber}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {course.courseType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {course.rpsDocuments && course.rpsDocuments.length > 0 ? (
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
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

