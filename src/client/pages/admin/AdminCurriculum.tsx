import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteRowButton, EditRowButton, RowActions } from '../../components/ui/RowActions';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import {
  adminRpsFileUrl,
  arsipDokumenApi,
  curriculumApi,
  curriculumItemApi,
  academicSemesterApi,
  type Curriculum,
  type CurriculumItem,
} from '../../services/contentApi';
import { useSiteStore } from '../../app/siteStore';
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
  const activeTenantId = useSiteStore((state) => state.activeTenantId);

  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<CurriculumItem | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['admin', 'curriculum-items'],
    queryFn: () => curriculumItemApi.list().then((res) => res.data.items),
  });

  const curriculumsQuery = useQuery({
    queryKey: ['admin', 'curriculums'],
    queryFn: () => curriculumApi.list().then((res) => res.data.curriculums),
  });

  const semestersQuery = useQuery({
    queryKey: ['admin', 'academic-semesters'],
    queryFn: () => academicSemesterApi.list().then((res) => res.data.semesters),
  });

  /*
   * RPS dilindungi sandi prodi yang sama dengan arsip dokumen. Bila sandi belum
   * dipasang, seluruh berkas RPS tertutup bagi pengunjung (fail-closed), sehingga
   * admin perlu diberi tahu sebelum mengunggah. Kegagalan memuat status sandi
   * tidak boleh menggagalkan halaman: peringatan cukup tidak tampil.
   */
  const passwordQuery = useQuery({
    queryKey: ['admin', 'dokumen-password'],
    queryFn: () => arsipDokumenApi.passwordStatus().then((res) => res.data),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  const sandiBelumDipasang = passwordQuery.data?.passwordActive === false;

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const curriculums: Curriculum[] = useMemo(() => curriculumsQuery.data ?? [], [curriculumsQuery.data]);
  const semesters = useMemo(() => semestersQuery.data ?? [], [semestersQuery.data]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      // Filter semester
      if (semesterFilter !== 'ALL') {
        if (semesterFilter === 'NONE') {
          if (item.academicSemesterId !== null) return false;
        } else if (String(item.academicSemesterId) !== semesterFilter) {
          return false;
        }
      }

      // Filter keyword
      if (!keyword) return true;
      return (
        item.course.code.toLowerCase().includes(keyword) ||
        item.course.name.toLowerCase().includes(keyword)
      );
    });
  }, [items, search, semesterFilter]);

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
        has('curriculum.create') ? (
          <Link to="/admin/kurikulum/baru" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Tambah Kurikulum
          </Link>
        ) : null
      }
    >
      <div className="space-y-4">
        {sandiBelumDipasang ? (
          <div className="flex items-start gap-3 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3.5">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 text-sm text-amber-900">
              <p className="font-bold leading-snug">RPS belum dapat dibuka pengunjung.</p>
              <p className="mt-1.5 leading-relaxed">
                Kata sandi dokumen prodi ini belum dipasang. Selama belum ada sandi, seluruh berkas RPS
                tertutup untuk publik. Pasang sandi terlebih dahulu sebelum mengunggah RPS.
              </p>
              <Link to="/admin/dokumen" className="btn-primary mt-3 gap-2 bg-amber-600 hover:bg-amber-700">
                <KeyIcon className="h-4 w-4" />
                Pasang Kata Sandi
              </Link>
            </div>
          </div>
        ) : null}

        {/* Baris Filter & Pencarian */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
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

          <div className="w-full sm:w-64">
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="field-input cursor-pointer"
              aria-label="Filter berdasarkan semester"
            >
              <option value="ALL">Semua Semester</option>
              {semesters.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} ({s.code}){s.isActive ? ' - Aktif' : ''}
                </option>
              ))}
              <option value="NONE">Tanpa Semester</option>
            </select>
          </div>
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
              : 'Belum ada mata kuliah pada kurikulum'
          }
          emptyDescription={
            curriculumsQuery.isLoading || curriculums.length === 0
              ? 'Klik "Tambah Kurikulum": pilih mata kuliah dari menu Mata Kuliah, lalu tentukan semester dan tahunnya.'
              : 'Tawarkan mata kuliah yang sudah terdaftar di menu Mata Kuliah untuk kurikulum ini.'
          }
          emptyAction={
            items.length === 0 && !curriculumsQuery.isLoading ? (
              has('curriculum.create') ? (
                <Link to="/admin/kurikulum/baru" className="btn-primary">
                  <PlusIcon className="h-4 w-4" />
                  Tambah Kurikulum
                </Link>
              ) : null
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSemesterFilter('ALL');
                }}
                className="btn-secondary"
              >
                Reset filter & pencarian
              </button>
            )
          }
          minWidth={1180}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          footer={
            <p className="text-[11px] text-slate-500">
              Total {totalCredits} SKS pada penawaran kurikulum aktif.
            </p>
          }
          columns={
            [
              {
                key: 'kode',
                header: 'Kode',
                width: 96,
                cellClassName: 'text-xs font-medium text-slate-700',
                render: (item) => item.course.code,
              },
              {
                key: 'nama',
                header: 'Nama Mata Kuliah',
                cellClassName: 'text-xs font-medium text-slate-700',
                render: (item) => item.course.name,
              },
              {
                key: 'kurikulum',
                header: 'Kurikulum',
                width: 160,
                cellClassName: 'text-xs font-medium text-slate-700',
                render: (item) =>
                  item.curriculum ? (
                    <span className="cell-nowrap" title={item.curriculum.name}>
                      {item.curriculum.name}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">—</span>
                  ),
              },
              {
                key: 'sks',
                header: 'SKS',
                width: 64,
                align: 'center',
                cellClassName: 'text-xs font-medium text-slate-700',
                render: (item) => item.credits,
              },
              {
                key: 'semester',
                header: 'Semester',
                width: 112,
                cellClassName: 'text-xs font-medium text-slate-700',
                render: (item) =>
                  item.semesterNumber ? (
                    `Semester ${item.semesterNumber}`
                  ) : item.academicSemester?.name ? (
                    item.academicSemester.name
                  ) : (
                    <span className="italic text-slate-400">—</span>
                  ),
              },
              {
                key: 'keterangan',
                header: 'Keterangan',
                width: 140,
                cellClassName: 'text-xs font-medium text-slate-700',
                render: (item) => (
                  <span className="block max-w-[130px] truncate" title={item.description ?? ''}>
                    {item.description || <span className="italic text-slate-400">—</span>}
                  </span>
                ),
              },
              {
                key: 'dosen',
                header: 'Dosen Pengampu',
                width: 220,
                render: (item) => {
                  const lecturers = item.lecturersData ?? [];
                  return lecturers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {lecturers.map((lecturer) => (
                        <span
                          key={String(lecturer.id)}
                          className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                          title={lecturer.nidn ? `${lecturer.name} — NIDN: ${lecturer.nidn}` : lecturer.name}
                        >
                          <UserGroupIcon className="h-3 w-3 shrink-0 text-slate-500" />
                          <span className="cell-nowrap">{lecturer.name}</span>
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
                width: 96,
                align: 'center',
                render: (item) => {
                  const rps = item.rpsDocuments ?? [];
                  return rps.length > 0 ? (
                    <a
                      href={adminRpsFileUrl(rps[0].fileUrl, activeTenantId)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      title={rps[0].title}
                    >
                      <DocumentTextIcon className="h-3 w-3 shrink-0" />
                      Lihat
                    </a>
                  ) : (
                    <span className="text-xs italic text-slate-400">—</span>
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
