import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import {
  curriculumApi,
  curriculumItemApi,
  type Curriculum,
  type CurriculumItem,
} from '../../services/contentApi';
import { toApiError } from '../../services/api';

/**
 * Halaman Kurikulum (`/admin/kurikulum`).
 *
 * Menampilkan:
 * 1. Daftar kurikulum ringkas di bagian atas dengan aksi Ubah & Hapus.
 * 2. Tombol utama header "Tambah Kurikulum" -> halaman form create kurikulum.
 * 3. Tombol sekunder di filter bar "Tambah Mata Kuliah" -> halaman form create penawaran.
 * 4. Tabel penawaran mata kuliah per kurikulum.
 */
export const AdminCurriculum: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const { has } = usePermission();

  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CurriculumItem | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['admin', 'curriculum-items'],
    queryFn: () => curriculumItemApi.list().then((res) => res.data.items),
  });

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: () => curriculumApi.list().then((res) => res.data.curriculums),
  });

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const curriculums: Curriculum[] = useMemo(() => curriculumsQuery.data ?? [], [curriculumsQuery.data]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter(
      (item) =>
        item.course.code.toLowerCase().includes(keyword) ||
        item.course.name.toLowerCase().includes(keyword),
    );
  }, [items, search]);

  const totalCredits = filtered.reduce((sum, item) => sum + item.credits, 0);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum-items'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'curriculums'] });
  };

  const removeMutation = useMutation({
    mutationFn: (id: number) => curriculumItemApi.remove(id),
    onSuccess: () => {
      toast.success('Mata kuliah berhasil dihapus dari kurikulum.');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <AdminLayout
      title="Kurikulum"
      description={`${filtered.length} penawaran mata kuliah • ${totalCredits} SKS`}
      actions={
        <div className="flex gap-2">
          {has('curriculum.create') ? (
            <Link to="/admin/kurikulum/baru" className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Tambah Kurikulum
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Baris Pencarian */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="field-input pl-9"
            placeholder="Cari kode atau nama mata kuliah..."
            aria-label="Cari kode atau nama mata kuliah"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {/* Tabel Penawaran */}
        <DataTable<CurriculumItem>
          rows={filtered}
          rowKey={(item) => String(item.id)}
          loading={itemsQuery.isLoading}
          loadingLabel="Memuat penawaran kurikulum"
          error={itemsQuery.isError ? toApiError(itemsQuery.error).message : null}
          onRetry={() => void itemsQuery.refetch()}
          emptyTitle={
            curriculumsQuery.isLoading || curriculums.length === 0
              ? 'Belum ada kurikulum'
              : items.length === 0
                ? 'Belum ada kurikulum'
                : 'Tidak ada kurikulum yang cocok'
          }
          emptyDescription={
            curriculumsQuery.isLoading || curriculums.length === 0
              ? 'Klik tombol "Tambah Kurikulum" di atas untuk membuat kurikulum pertama.'
              : items.length === 0
                ? 'Klik tombol "Tambah Kurikulum" di atas untuk menambahkan kurikulum.'
                : 'Ubah kata kunci pencarian untuk menemukan kurikulum lainnya.'
          }
          emptyAction={
            curriculumsQuery.isLoading || curriculums.length === 0 || items.length === 0 ? (
              has('curriculum.create') ? (
                <Link to="/admin/kurikulum/baru" className="btn-primary">
                  <PlusIcon className="h-4 w-4" />
                  Tambah Kurikulum
                </Link>
              ) : null
            ) : (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="btn-secondary"
              >
                Kosongkan pencarian
              </button>
            )
          }
          minWidth={1180}
          footer={
            <p className="text-[11px] text-slate-500">
              Menampilkan {filtered.length} dari {items.length} penawaran • {totalCredits} SKS
            </p>
          }
          columns={
            [
              {
                key: 'kode',
                header: 'Kode',
                width: 96,
                cellClassName: 'font-mono font-bold text-slate-700',
                render: (item) => item.course.code,
              },
              {
                key: 'nama',
                header: 'Nama Mata Kuliah',
                cellClassName: 'font-semibold text-slate-800',
                render: (item) => item.course.name,
              },
              {
                key: 'kurikulum',
                header: 'Kurikulum',
                width: 160,
                cellClassName: 'text-slate-600',
                render: (item) => (item.curriculum ? `${item.curriculum.name}` : '-'),
              },
              {
                key: 'sks',
                header: 'SKS',
                width: 64,
                align: 'center',
                cellClassName: 'font-bold',
                render: (item) => item.credits,
              },
              {
                key: 'semester',
                header: 'Semester',
                width: 112,
                cellClassName: 'text-slate-600',
                render: (item) => item.academicSemester?.name ?? '-',
              },
              {
                key: 'keterangan',
                header: 'Keterangan',
                width: 140,
                cellClassName: 'text-slate-600',
                render: (item) => (
                  <span className="block max-w-[130px] truncate" title={item.description ?? ''}>
                    {item.description || '-'}
                  </span>
                ),
              },
              {
                key: 'dosen',
                header: 'Dosen Pengampu',
                render: (item) => {
                  const lecturers = item.lecturersData ?? [];
                  return lecturers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {lecturers.map((lecturer) => (
                        <span
                          key={String(lecturer.id)}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800"
                          title={lecturer.nidn ? `NIDN: ${lecturer.nidn}` : undefined}
                        >
                          <UserGroupIcon className="h-3 w-3 text-slate-500" />
                          {lecturer.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs italic text-slate-400">Belum ditentukan</span>
                  );
                },
              },
              {
                key: 'rps',
                header: 'RPS',
                width: 80,
                align: 'center',
                render: (item) => {
                  const rps = item.rpsDocuments ?? [];
                  return rps.length > 0 ? (
                    <a
                      href={rps[0].fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      title={rps[0].title}
                    >
                      <DocumentTextIcon className="h-3 w-3" />
                      Lihat
                    </a>
                  ) : (
                    <span className="text-xs italic text-slate-400">-</span>
                  );
                },
              },
              {
                key: 'aksi',
                header: 'Aksi',
                width: 110,
                align: 'right',
                render: (item) => (
                  <RowActions>
                    {has('curriculum.update') ? (
                      <EditRowButton
                        label="Ubah mata kuliah kurikulum"
                        konteks={item.course.name}
                        onClick={() => navigate(`/admin/kurikulum/${item.id}/ubah`)}
                      />
                    ) : null}
                    {has('curriculum.delete') ? (
                      <DeleteRowButton
                        label="Hapus mata kuliah dari kurikulum"
                        konteks={item.course.name}
                        onClick={() => setDeleteTarget(item)}
                      />
                    ) : null}
                  </RowActions>
                ),
              },
            ] satisfies Array<DataTableColumn<CurriculumItem>>
          }
        />
      </div>

      {/* Dialog Konfirmasi Hapus Penawaran */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus mata kuliah dari kurikulum"
        description={`"${deleteTarget?.course.code ?? ''} ${deleteTarget?.course.name ?? ''}" akan dihapus dari kurikulum ini beserta RPS-nya. Master mata kuliah di menu Mata Kuliah tidak terpengaruh.`}
        busy={removeMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
};

export default AdminCurriculum;
