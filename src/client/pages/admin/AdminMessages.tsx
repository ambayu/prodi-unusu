import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, InboxIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AdminLayout } from '../../components/AdminLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/useSite';
import { contactApi } from '../../services/contentApi';
import { toApiError } from '../../services/api';

/**
 * Kotak masuk pesan pengunjung website.
 *
 * Dipisahkan dari halaman Kontak agar menu "Pesan Masuk" pada sidebar membuka
 * daftar pesan saja, bukan formulir informasi kontak.
 */
export const AdminMessages: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { has } = usePermission();

  const [kataKunci, setKataKunci] = useState('');
  const [hanyaBelumDibaca, setHanyaBelumDibaca] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ['admin', 'messages'],
    queryFn: () => contactApi.messages().then((res) => res.data.messages),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => contactApi.markRead(id),
    onSuccess: () => {
      toast.success('Pesan ditandai sudah dibaca.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const semua = messagesQuery.data ?? [];

  const belumDibaca = useMemo(() => semua.filter((pesan) => !pesan.isRead).length, [semua]);

  /** Filter teks dan status dikerjakan di klien; endpoint belum mendukung pencarian. */
  const pesan = useMemo(() => {
    const kunci = kataKunci.trim().toLowerCase();

    return semua.filter((item) => {
      if (hanyaBelumDibaca && item.isRead) return false;
      if (!kunci) return true;

      return [item.name, item.email, item.subject ?? '', item.message]
        .join(' ')
        .toLowerCase()
        .includes(kunci);
    });
  }, [semua, kataKunci, hanyaBelumDibaca]);

  return (
    <AdminLayout
      title="Pesan Masuk"
      description="Pesan yang dikirim pengunjung melalui formulir kontak website program studi."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex-1 sm:max-w-xs">
            <span className="sr-only">Cari pesan</span>
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={kataKunci}
              onChange={(event) => setKataKunci(event.target.value)}
              placeholder="Cari nama, email, atau isi pesan..."
              className="field-input pl-9"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={hanyaBelumDibaca}
                onChange={(event) => setHanyaBelumDibaca(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1e3a8a]"
              />
              <span>Belum dibaca{belumDibaca > 0 ? ` (${belumDibaca})` : ''}</span>
            </label>

            <button
              type="button"
              onClick={() => void messagesQuery.refetch()}
              disabled={messagesQuery.isFetching}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${messagesQuery.isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Muat ulang</span>
            </button>
          </div>
        </div>

        {messagesQuery.isLoading ? (
          <LoadingState label="Memuat pesan" rows={3} />
        ) : messagesQuery.isError ? (
          <ErrorState
            message={toApiError(messagesQuery.error).message}
            onRetry={() => void messagesQuery.refetch()}
          />
        ) : pesan.length === 0 ? (
          <EmptyState
            title={
              kataKunci || hanyaBelumDibaca
                ? 'Tidak ada pesan yang cocok'
                : 'Belum ada pesan'
            }
            description={
              kataKunci || hanyaBelumDibaca
                ? 'Ubah kata kunci atau matikan filter "Belum dibaca" untuk melihat semua pesan.'
                : 'Pesan yang dikirim pengunjung melalui formulir kontak akan tampil di sini.'
            }
          />
        ) : (
          <ul className="space-y-3">
            {pesan.map((item) => (
              <li
                key={item.id}
                className={`rounded-[14px] border px-5 py-4 transition-colors ${
                  item.isRead
                    ? 'border-slate-200 bg-white'
                    : 'border-blue-200 bg-blue-50/40'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <InboxIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" aria-hidden="true" />
                      <span className="truncate">{item.subject ?? 'Tanpa subjek'}</span>
                      {!item.isRead ? (
                        <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1e3a8a]">
                          Baru
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.name} • {item.email} •{' '}
                      {new Date(item.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  {!item.isRead && has('contact_messages.manage') ? (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(item.id)}
                      disabled={markReadMutation.isPending}
                      className="shrink-0 rounded-[8px] border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                      Tandai dibaca
                    </button>
                  ) : null}
                </div>

                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                  {item.message}
                </p>
              </li>
            ))}
          </ul>
        )}

        {pesan.length > 0 ? (
          <p className="text-xs text-slate-500">
            Menampilkan {pesan.length} dari {semua.length} pesan
            {belumDibaca > 0 ? ` • ${belumDibaca} belum dibaca` : ''}.
          </p>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;
