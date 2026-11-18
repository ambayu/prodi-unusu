import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import { lecturerApi, type Lecturer } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/** Endpoint admin ikut mengirim nama prodi homebase bila dosen berasal dari pusat. */
type DosenBaris = Lecturer & { studyProgramName?: string | null };

/**
 * Direktori Dosen Program Studi.
 *
 * Data dosen ditarik otomatis dari pusat dan bersifat read-only: tidak ada
 * penambahan atau pengubahan manual di halaman ini.
 */
export const AdminLecturers: React.FC = () => {
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'lecturers', search],
    queryFn: () => lecturerApi.list(search ? { search } : undefined).then((res) => res.data.lecturers),
  });

  const lecturers = listQuery.data ?? [];
  const activeCount = lecturers.filter((lecturer) => lecturer.isActive).length;

  return (
    <AdminLayout
      title="Direktori Dosen"
      description={`${lecturers.length} dosen terdaftar, ${activeCount} berstatus aktif.`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari nama, NIDN, atau prodi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-input pl-9"
          />
        </div>
      </div>

      <DataTable<DosenBaris>
        rows={lecturers}
        rowKey={(lecturer) => String(lecturer.id)}
        loading={listQuery.isLoading}
        loadingLabel="Memuat data dosen..."
        error={listQuery.isError ? toApiError(listQuery.error).message : null}
        onRetry={() => void listQuery.refetch()}
        emptyTitle="Tidak ada data dosen"
        emptyDescription={
          search
            ? 'Tidak ada dosen yang cocok dengan kata kunci pencarian.'
            : 'Belum ada data dosen aktif yang terhubung dari pusat.'
        }
        minWidth={1180}
        columns={[
          {
            key: 'nama',
            header: 'Nama & Gelar',
            width: 260,
            render: (lecturer) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {lecturer.photoUrl ? (
                    <img src={lecturer.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircleIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  )}
                </div>
                <span className="block min-w-0 text-xs font-semibold text-slate-900">
                  {lecturer.name}
                </span>
              </div>
            ),
          },
          {
            key: 'email',
            header: 'Email',
            width: 220,
            cellClassName: 'font-mono text-xs text-slate-600',
            render: (lecturer) => lecturer.email ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'nidn',
            header: 'NIDN',
            width: 130,
            cellClassName: 'font-mono text-xs font-semibold text-slate-700',
            render: (lecturer) => lecturer.nidn ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'homebase',
            header: 'Homebase / Prodi',
            width: 200,
            cellClassName: 'text-xs text-slate-700',
            render: (lecturer) => lecturer.studyProgramName ?? lecturer.expertise ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'jabatan',
            header: 'Jabatan Fungsional',
            width: 160,
            cellClassName: 'text-xs text-slate-700',
            render: (lecturer) => lecturer.academicRank ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'pendidikan',
            header: 'Pendidikan',
            width: 120,
            align: 'center',
            cellClassName: 'text-xs text-slate-700',
            render: (lecturer) => lecturer.education ?? <span className="italic text-slate-400">—</span>,
          },
          {
            key: 'status',
            header: 'Status',
            width: 100,
            align: 'center',
            render: (lecturer) => (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  lecturer.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {lecturer.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            ),
          },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminLecturers;
