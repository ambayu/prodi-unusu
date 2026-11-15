import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
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

        {/*
         * Keadaan loading/galat/kosong ditangani DataTable. Footer jumlah
         * aktivitas dipasang lewat prop `footer` agar hanya tampil saat ada data.
         */}
        <DataTable<AuditEntry>
          rows={logs}
          rowKey={(entri) => String(entri.id)}
          loading={logsQuery.isLoading}
          loadingLabel="Memuat riwayat aktivitas"
          loadingRows={5}
          error={logsQuery.isError ? toApiError(logsQuery.error).message : null}
          onRetry={() => void logsQuery.refetch()}
          emptyTitle={kataKunci ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas tercatat'}
          emptyDescription={
            kataKunci
              ? 'Coba kata kunci lain, atau kosongkan kolom pencarian untuk melihat seluruh riwayat.'
              : 'Setiap penambahan, perubahan, dan penghapusan data akan muncul di sini secara otomatis.'
          }
          minWidth={640}
          footer={
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <ClipboardDocumentListIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                Menampilkan {logs.length} aktivitas
                {kataKunci ? ` dari hasil pencarian "${kataKunci}"` : ''}.
              </span>
            </p>
          }
          columns={[
            {
              key: 'waktu',
              header: 'Waktu',
              width: 160,
              cellClassName: 'whitespace-nowrap text-slate-600',
              render: (entri) => formatWaktu(entri.createdAt),
            },
            {
              key: 'pengguna',
              header: 'Pengguna',
              width: 160,
              cellClassName: 'font-semibold text-slate-800',
              render: (entri) =>
                entri.user?.name ?? (
                  <span className="font-normal italic text-slate-400">Sistem</span>
                ),
            },
            {
              key: 'aksi',
              header: 'Aksi',
              width: 160,
              render: (entri) => (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                    NADA_AKSI[entri.action] ?? 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {LABEL_AKSI[entri.action] ?? entri.action}
                </span>
              ),
            },
            {
              key: 'modul',
              header: 'Modul',
              width: 140,
              cellClassName: 'text-slate-600',
              render: (entri) => LABEL_MODUL[entri.module] ?? entri.module,
            },
            {
              key: 'objek',
              header: 'Objek',
              /* Satu-satunya kolom tanpa lebar tetap: target bisa berupa nama panjang. */
              cellClassName: 'text-slate-500',
              render: (entri) =>
                entri.targetType ? (
                  <>
                    <span className="font-semibold text-slate-700">{entri.targetType}</span>
                    {entri.targetId ? ` #${entri.targetId}` : ''}
                  </>
                ) : (
                  <span className="italic text-slate-400">—</span>
                ),
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogs;
