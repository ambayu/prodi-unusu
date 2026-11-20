import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { useSiteStore } from '../../app/siteStore';
import { dashboardApi, adminMenuApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';

interface PortalDomainRow {
  id: number;
  hostname: string;
  isPrimary: boolean;
  isActive: boolean;
  studyProgram: { id: number; name: string; code: string; status: string; faculty: { name: string } };
}

export const AdminPortalOverview: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isSuperAdmin } = usePermission();
  const enterProdiScope = useSiteStore((state) => state.enterProdiScope);

  const [kataKunci, setKataKunci] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const superQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'super'],
    queryFn: () => dashboardApi.superStats().then((res) => res.data),
    enabled: isSuperAdmin,
  });

  const stats = superQuery.data?.stats;

  const rows = useMemo<PortalDomainRow[]>(() => {
    const domains = superQuery.data?.domains ?? [];
    const byProdi = new Map<number, PortalDomainRow>();
    for (const domain of domains) {
      const prodi = domain.studyProgram;
      if (!prodi) continue;

      const existing = byProdi.get(prodi.id);
      if (!existing || (!existing.isPrimary && domain.isPrimary)) {
        byProdi.set(prodi.id, { ...domain, studyProgram: prodi });
      }
    }
    return Array.from(byProdi.values());
  }, [superQuery.data]);

  const filteredRows = useMemo(() => {
    const kunci = kataKunci.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'active' && !row.isActive) return false;
      if (statusFilter === 'inactive' && row.isActive) return false;
      if (!kunci) return true;
      return [row.studyProgram.name, row.studyProgram.code, row.studyProgram.faculty.name, row.hostname]
        .join(' ')
        .toLowerCase()
        .includes(kunci);
    });
  }, [rows, kataKunci, statusFilter]);

  const handleManage = async (row: PortalDomainRow) => {
    setSwitchingId(row.studyProgram.id);
    try {
      await enterProdiScope(row.studyProgram.id);
      adminMenuApi.clearCache();
      await queryClient.invalidateQueries();
      toast.success(`Beralih ke scope ${row.studyProgram.name}.`);
      navigate('/admin');
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSwitchingId(null);
    }
  };

  const columns: Array<DataTableColumn<PortalDomainRow>> = [
    {
      key: 'kode',
      header: 'Kode',
      width: 96,
      cellClassName: 'font-mono text-xs font-bold text-[#1e3a8a]',
      render: (row) => row.studyProgram.code,
    },
    {
      key: 'prodi',
      header: 'Program Studi',
      cellClassName: 'text-xs font-semibold text-slate-900',
      render: (row) => row.studyProgram.name,
    },
    {
      key: 'fakultas',
      header: 'Fakultas',
      width: 220,
      cellClassName: 'text-xs text-slate-600',
      render: (row) => row.studyProgram.faculty.name,
    },
    {
      key: 'hostname',
      header: 'Domain',
      width: 240,
      cellClassName: 'text-xs text-slate-700',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
          <span>{row.hostname}</span>
          {row.isPrimary ? (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-sans text-[10px] font-bold text-[#1e3a8a]">
              utama
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      render: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            <XCircleIcon className="h-3.5 w-3.5" aria-hidden="true" /> Nonaktif
          </span>
        ),
    },
    {
      key: 'aksi',
      header: 'Aksi',
      width: 145,
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => void handleManage(row)}
          disabled={switchingId !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#1e3a8a] px-3 text-xs font-bold text-white transition-colors hover:bg-[#172f6e] disabled:opacity-60"
        >
          {switchingId === row.studyProgram.id ? 'Beralih…' : 'Kelola Konten'}
        </button>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Dashboard Portal Universitas"
      description="Pantau status seluruh website program studi dan beralih kelola konten dari satu layar."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/portal"
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]"
          >
            <PhotoIcon className="h-4 w-4 text-[#1e3a8a]" aria-hidden="true" />
            <span>Hero Slider</span>
          </Link>
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4 text-[#1e3a8a]" aria-hidden="true" />
            <span>Beranda Portal</span>
          </Link>
        </div>
      }
    >
      {!isSuperAdmin ? (
        <EmptyState
          title="Ringkasan portal hanya untuk Super Admin"
          description="Akun Anda tidak memiliki izin melihat statistik lintas program studi."
        />
      ) : (
        <div className="space-y-5">
          {/* Banner angka kunci universitas */}
          <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#1e3a8a] via-[#1b357d] to-[#13265c] p-5 text-white shadow-sm sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#fbbf24]/15 blur-2xl"
            />
            <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: 'Fakultas',
                  value: stats?.faculties ?? 0,
                  hint: 'Unit fakultas terdaftar',
                  icon: BuildingLibraryIcon,
                },
                {
                  label: 'Program Studi',
                  value: stats?.studyPrograms ?? 0,
                  hint: 'Portal prodi mandiri',
                  icon: AcademicCapIcon,
                },
                {
                  label: 'Domain Aktif',
                  value: stats?.activeDomains ?? 0,
                  hint:
                    stats && stats.inactiveDomains > 0
                      ? `${stats.inactiveDomains} domain nonaktif`
                      : 'Seluruh domain aktif',
                  icon: GlobeAltIcon,
                  warn: Boolean(stats && stats.inactiveDomains > 0),
                },
                {
                  label: 'Pengguna Aktif',
                  value: stats?.users ?? 0,
                  hint: 'Admin & editor portal',
                  icon: UserGroupIcon,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[13px] border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100/85">
                        {item.label}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-[#fbbf24]" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-2xl font-black leading-none tracking-tight tabular-nums text-white">
                      {item.value.toLocaleString('id-ID')}
                    </p>
                    <p
                      className={`mt-1 truncate text-[11px] font-medium ${
                        item.warn ? 'text-[#fbbf24]' : 'text-blue-100/75'
                      }`}
                    >
                      {item.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Daftar website program studi */}
          <section className="overflow-hidden rounded-[16px] border border-[#CBD5E1] bg-white shadow-2xs">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Website Program Studi</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Pilih program studi untuk masuk ke panel pengelolaan kontennya.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-[9px] border border-slate-200 bg-slate-50 p-0.5">
                  {[
                    { value: 'all' as const, label: 'Semua' },
                    { value: 'active' as const, label: 'Aktif' },
                    { value: 'inactive' as const, label: 'Nonaktif' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-[7px] px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        statusFilter === option.value
                          ? 'bg-[#1e3a8a] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="relative sm:w-60">
                  <span className="sr-only">Cari program studi</span>
                  <MagnifyingGlassIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={kataKunci}
                    onChange={(event) => setKataKunci(event.target.value)}
                    placeholder="Cari prodi, fakultas, domain..."
                    className="field-input h-9 pl-9 text-xs"
                  />
                </label>
              </div>
            </div>

            <div className="p-4">
              <DataTable<PortalDomainRow>
                rows={filteredRows}
                rowKey={(row) => String(row.studyProgram.id)}
                loading={superQuery.isLoading}
                loadingLabel="Memuat daftar website program studi"
                loadingRows={4}
                error={superQuery.isError ? toApiError(superQuery.error).message : null}
                onRetry={() => void superQuery.refetch()}
                emptyTitle={
                  kataKunci || statusFilter !== 'all'
                    ? 'Tidak ada program studi yang cocok'
                    : 'Belum ada website program studi'
                }
                emptyDescription={
                  kataKunci || statusFilter !== 'all'
                    ? 'Ubah filter status atau kosongkan kata kunci pencarian.'
                    : 'Tambahkan fakultas dan program studi melalui menu Struktur Organisasi.'
                }
                minWidth={760}
                columns={columns}
              />
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPortalOverview;
