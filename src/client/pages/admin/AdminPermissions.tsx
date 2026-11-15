import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  KeyIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { rbacApi, type RolePermission } from '../../services/rbacApi';
import { toApiError } from '../../services/api';

export const AdminPermissions: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  const permissionsQuery = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => rbacApi.getPermissions().then((res) => res.data),
  });

  const allPermissions = permissionsQuery.data?.permissions ?? [];
  const modules = permissionsQuery.data?.modules ?? [];

  // Filter izin berdasarkan teks pencarian dan modul yang dipilih
  const filtered = useMemo(() => {
    let list = allPermissions;
    if (selectedModule !== 'ALL') {
      list = list.filter((p) => p.module === selectedModule);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPermissions, selectedModule, search]);

  /**
   * Definisi kolom katalog izin. Kolom "Nama Deskriptif" dibiarkan tanpa `width`
   * agar menyerap sisa ruang, kolom lain lebarnya tetap.
   */
  const permissionColumns: Array<DataTableColumn<RolePermission>> = [
    {
      key: 'nomor',
      header: '#',
      width: 64,
      align: 'center',
      cellClassName: 'font-mono text-slate-400',
      render: (_item, index) => index + 1,
    },
    {
      key: 'kode',
      header: 'Kode Izin (Permission Code)',
      width: 300,
      render: (item) => (
        <div className="flex items-center gap-2">
          <KeyIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-[#1e3a8a] break-all">{item.code}</span>
        </div>
      ),
    },
    {
      key: 'nama',
      header: 'Nama Deskriptif',
      render: (item) => <span className="text-xs font-semibold text-slate-800">{item.name}</span>,
    },
    {
      key: 'modul',
      header: 'Kategori Modul',
      width: 180,
      render: (item) => (
        <span className="inline-block rounded-[6px] bg-slate-100 border border-[#CBD5E1]/60 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
          {item.module}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Katalog Izin (Permissions)"
      description="Daftar seluruh butir izin akses otorisasi yang terdaftar pada sistem backend multi-prodi UNUSU."
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-[#1e3a8a]">
            <KeyIcon className="h-4 w-4" />
            <span>Total: {allPermissions.length} Izin Terdaftar</span>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-[12px] border border-[#CBD5E1] bg-white p-3 shadow-2xs">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau nama izin (misal: users.view, posts.create)..."
              className="w-full rounded-[8px] border border-[#CBD5E1] bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1e3a8a] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Modul:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="rounded-[8px] border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#1e3a8a]"
            >
              <option value="ALL">Semua Modul ({allPermissions.length})</option>
              {modules.map((m) => (
                <option key={m.module} value={m.module}>
                  {m.module} ({m.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/*
         * Keadaan loading/galat/kosong ditangani DataTable. Keadaan kosong di
         * sini bisa berarti filter tidak cocok atau katalog memang belum berisi.
         */}
        <DataTable<RolePermission>
          rows={filtered}
          rowKey={(item) => String(item.id)}
          loading={permissionsQuery.isLoading}
          loadingLabel="Memuat katalog izin"
          loadingRows={6}
          error={permissionsQuery.isError ? toApiError(permissionsQuery.error).message : null}
          onRetry={() => void permissionsQuery.refetch()}
          emptyTitle="Tidak ada izin yang sesuai"
          emptyDescription="Tidak ditemukan izin dengan kriteria pencarian yang Anda masukkan."
          minWidth={780}
          columns={permissionColumns}
        />
      </div>
    </AdminLayout>
  );
};
