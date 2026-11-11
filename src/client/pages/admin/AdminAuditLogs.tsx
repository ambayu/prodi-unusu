import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { toApiError } from '../../services/api';
import { dashboardApi, type AuditEntry } from '../../services/adminApi';

/**
 * Riwayat aktivitas pengguna pada panel administrasi.
 *
 * Halaman ini hanya membaca data (`audit_logs.view`), tidak ada aksi tulis.
 * Menu sidebar menunjuk ke rute `/admin/audit` yang dialihkan ke sini.
 */

/** Label ramah untuk kode aksi audit yang dikirim server. */
const LABEL_AKSI: Record<string, string> = {
  CREATE: 'Menambah data',
  UPDATE: 'Memperbarui data',
  DELETE: 'Menghapus data',
  LOGIN: 'Masuk',
  LOGOUT: 'Keluar',
  PUBLISH: 'Mempublikasikan',
  UNPUBLISH: 'Menarik publikasi',
  UPLOAD: 'Mengunggah berkas',
};

/** Label ramah untuk nama modul audit. */
const LABEL_MODUL: Record<string, string> = {
  AUTH: 'Autentikasi',
  CONTENT: 'Konten',
  BUILDER: 'Page Builder',
  MEDIA: 'Media',
  USERS: 'Pengguna',
  SETTINGS: 'Pengaturan',
  ORGANIZATION: 'Organisasi',
  DOMAIN: 'Domain',
};

const NADA_AKSI: Record<string, string> = {
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  LOGIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOGOUT: 'bg-slate-50 text-slate-700 border-slate-200',
  CREATE: 'bg-blue-50 text-blue-700 border-blue-200',
};

const formatWaktu = (value: string) => {
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return value;
  return tanggal.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AdminAuditLogs: React.FC = () => {
  const [kataKunci, setKataKunci] = useState('');

  const logsQuery = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => dashboardApi.auditLogs().then((res) => res.data.logs),
  });

  /**
   * Penyaringan di sisi klien.
   *
   * Endpoint audit masih mengembalikan seluruh riwayat tenant, sehingga filter
   * teks dikerjakan di peramban agar tidak menambah parameter API baru.
   */
  const logs = useMemo<AuditEntry[]>(() => {
    const semua = logsQuery.data ?? [];
    const kunci = kataKunci.trim().toLowerCase();
    if (!kunci) return semua;

    return semua.filter((entri) => {
      const gabungan = [
        entri.user?.name ?? '',
        entri.action,
        LABEL_AKSI[entri.action] ?? '',
        entri.module,
        LABEL_MODUL[entri.module] ?? '',
        entri.targetType ?? '',
        entri.targetId ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return gabungan.includes(kunci);
    });
  }, [logsQuery.data, kataKunci]);

  return (
    <AdminLayout
      title="Audit Aktivitas"
      description="Catatan siapa melakukan apa dan kapan pada panel administrasi program studi."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1 sm:max-w-xs">
            <span className="sr-only">Cari aktivitas</span>
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={kataKunci}
              onChange={(event) => setKataKunci(event.target.value)}
              placeholder="Cari pengguna, aksi, atau modul..."
              className="field-input pl-9"
            />
          </label>

          <button
            type="button"
            onClick={() => void logsQuery.refetch()}
            disabled={logsQuery.isFetching}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${logsQuery.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Muat ulang</span>
          </button>
        </div>

        {logsQuery.isLoading ? (
          <LoadingState label="Memuat riwayat aktivitas" rows={5} />
        ) : logsQuery.isError ? (
          <ErrorState
            message={toApiError(logsQuery.error).message}
            onRetry={() => void logsQuery.refetch()}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            title={kataKunci ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas tercatat'}
            description={
              kataKunci
                ? 'Coba kata kunci lain, atau kosongkan kolom pencarian untuk melihat seluruh riwayat.'
                : 'Setiap penambahan, perubahan, dan penghapusan data akan muncul di sini secara otomatis.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Waktu</th>
                  <th scope="col" className="px-4 py-3 font-bold">Pengguna</th>
                  <th scope="col" className="px-4 py-3 font-bold">Aksi</th>
                  <th scope="col" className="px-4 py-3 font-bold">Modul</th>
                  <th scope="col" className="px-4 py-3 font-bold">Objek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((entri) => (
                  <tr key={entri.id} className="align-top transition-colors hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {formatWaktu(entri.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                      {entri.user?.name ?? (
                        <span className="font-normal italic text-slate-400">Sistem</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                          NADA_AKSI[entri.action] ?? 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {LABEL_AKSI[entri.action] ?? entri.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {LABEL_MODUL[entri.module] ?? entri.module}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {entri.targetType ? (
                        <>
                          <span className="font-semibold text-slate-700">{entri.targetType}</span>
                          {entri.targetId ? ` #${entri.targetId}` : ''}
                        </>
                      ) : (
                        <span className="italic text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logs.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <ClipboardDocumentListIcon className="h-4 w-4" aria-hidden="true" />
            <span>
              Menampilkan {logs.length} aktivitas
              {kataKunci ? ` dari hasil pencarian "${kataKunci}"` : ''}.
            </span>
          </p>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogs;
