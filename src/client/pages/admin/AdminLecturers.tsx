import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import { lecturerApi, type Lecturer } from '../../services/contentApi';
import { toApiError } from '../../services/api';

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

      <DataTable<Lecturer>
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
        minWidth={900}
        columns={[
          {
            key: 'foto',
            header: 'Foto',
            width: 56,
            render: (lecturer) => (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {lecturer.photoUrl ? (
                  <img
                    src={lecturer.photoUrl}
                    alt={lecturer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-6 w-6 text-slate-400" />
                )}
              </div>
            ),
          },
          {
            key: 'nama',
            header: 'Nama & Gelar',
            width: 220,
            render: (lecturer) => (
              <>
                <span className="block font-bold text-slate-900">{lecturer.name}</span>
                <span className="block text-[11px] text-slate-500">{lecturer.email ?? 'Email belum diisi'}</span>
              </>
            ),
          },
          {
            key: 'nidn',
            header: 'NIDN',
            width: 120,
            cellClassName: 'font-mono font-semibold text-slate-700',
            render: (lecturer) => lecturer.nidn ?? '-',
          },
          {
            key: 'homebase',
            header: 'Homebase / Prodi',
            /* Satu-satunya kolom tanpa lebar tetap: nama prodi bisa panjang. */
            render: (lecturer) => (
              <span className="text-xs font-medium text-slate-800">
                {(lecturer as any).studyProgramName ?? lecturer.expertise ?? '-'}
              </span>
            ),
          },
          {
            key: 'jabatan',
            header: 'Jabatan Fungsional',
            width: 170,
            render: (lecturer) => lecturer.academicRank ?? '-',
          },
          {
            key: 'pendidikan',
            header: 'Pendidikan',
            width: 150,
            render: (lecturer) => lecturer.education ?? '-',
          },
          {
            key: 'status',
            header: 'Status',
            width: 100,
            align: 'center',
            render: (lecturer) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  lecturer.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
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
