import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { settingsApi } from '../../services/adminApi';
import { toApiError } from '../../services/api';

/**
 * Halaman navigasi publik.
 *
 * Menu standar sudah dibuat seeder. Halaman ini menampilkan urutan dan
 * statusnya; pengurutan dan penambahan dilakukan lewat endpoint navigasi.
 */
export const AdminNavigation: React.FC = () => {
  const menusQuery = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: () => settingsApi.menus().then((res) => res.data.menus),
  });

  return (
    <AdminLayout
      title="Navigasi Website"
      description="Sepuluh menu standar website program studi sesuai struktur yang ditetapkan universitas."
    >
      {menusQuery.isLoading ? (
        <LoadingState label="Memuat navigasi" />
      ) : menusQuery.isError ? (
        <ErrorState message={toApiError(menusQuery.error).message} onRetry={() => void menusQuery.refetch()} />
      ) : (menusQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada menu navigasi"
          description="Menu standar dibuat otomatis saat program studi dibuat. Hubungi Super Admin bila menu belum ada."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-16">Urutan</th>
                <th>Judul</th>
                <th>URL</th>
                <th>Wajib</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...(menusQuery.data ?? [])]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((menu) => (
                  <tr key={menu.id}>
                    <td>{menu.sortOrder}</td>
                    <td className="font-bold text-slate-900">{menu.title}</td>
                    <td className="font-mono text-[11px] text-[#1e3a8a]">{menu.url}</td>
                    <td>
                      {menu.isRequired ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          Wajib
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          menu.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {menu.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminNavigation;
