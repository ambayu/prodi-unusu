import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  arsipDownloadApi,
  arsipPreviewApi,
  type ArsipBerkasMode,
  type DokumenAsal,
} from '../services/contentApi';

interface DokumenPreviewModalProps {
  open: boolean;
  /** Diabaikan bila `ambilBerkas` diisi (dipakai RPS yang punya jalur sendiri). */
  arsipId?: number;
  judul: string;
  /**
   * Kata sandi arsip prodi; dikirim lewat header, tidak pernah di URL.
   * Tidak dipakai bila `sumber` bernilai `admin` (sesi login sudah cukup).
   */
  password?: string;
  /** Jalur pengambilan berkas: sesi admin prodi atau kata sandi publik. */
  sumber?: ArsipBerkasMode;
  /** Dokumen kiriman pusat (`arsip`, bawaan) atau buatan prodi (`prodi`). */
  asal?: DokumenAsal;
  /** Pengambil berkas pengganti untuk dokumen yang bukan arsip, seperti RPS. */
  ambilBerkas?: (mode: 'preview' | 'download') => Promise<Blob>;
  onClose: () => void;
}

/**
 * Pratinjau dokumen (kiriman pusat maupun buatan prodi).
 *
 * Alur yang diminta: dokumen MELIHAT lebih dulu, baru dapat diunduhnya lewat
 * tombol Download. Berkas diambil sebagai blob lalu ditampilkan pada
 * `<iframe>` ber-`src` `blob:` sehingga kata sandi tidak pernah muncul pada
 * URL, riwayat peramban, atau log akses.
 */
export const DokumenPreviewModal: React.FC<DokumenPreviewModalProps> = ({
  open,
  arsipId = 0,
  judul,
  password = '',
  sumber = 'publik',
  asal = 'arsip',
  ambilBerkas,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Memuat berkas pratinjau setiap kali dokumen berganti.
  useEffect(() => {
    if (!open) return;

    let dibatalkan = false;
    let urlSementara: string | null = null;

    setLoading(true);
    setError(null);
    setBlobUrl(null);

    const muatPratinjau = ambilBerkas
      ? ambilBerkas('preview')
      : arsipPreviewApi(arsipId, password, sumber, asal);

    muatPratinjau
      .then((blob) => {
        if (dibatalkan) return;
        urlSementara = URL.createObjectURL(blob);
        setBlobUrl(urlSementara);
      })
      .catch((err: unknown) => {
        if (dibatalkan) return;
        setError(err instanceof Error ? err.message : 'Berkas dokumen tidak dapat dibuka.');
      })
      .finally(() => {
        if (!dibatalkan) setLoading(false);
      });

    return () => {
      dibatalkan = true;
      // Membebaskan memori blob agar tidak menumpuk saat membuka banyak dokumen.
      if (urlSementara) URL.revokeObjectURL(urlSementara);
    };
  }, [open, arsipId, password, sumber, asal, ambilBerkas]);

  // Menutup dengan tombol Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  /** Mengunduh berkas setelah pratinjau terbuka. */
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = ambilBerkas
        ? await ambilBerkas('download')
        : await arsipDownloadApi(arsipId, password, sumber, asal);
      const url = URL.createObjectURL(blob);
      const tautan = document.createElement('a');
      tautan.href = url;
      tautan.download = `${judul.replace(/[^A-Za-z0-9 _.-]/g, '').slice(0, 80) || 'dokumen'}.pdf`;
      document.body.appendChild(tautan);
      tautan.click();
      tautan.remove();
      // Beri jeda singkat agar peramban selesai membaca blob sebelum dibebaskan.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Berkas dokumen tidak dapat diunduh.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau ${judul}`}
      onMouseDown={(event) => {
        // Klik pada latar (bukan isi dialog) menutup pratinjau.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] border border-slate-200/90 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.3)]">
        <header className="relative overflow-hidden border-b border-slate-200/90 bg-slate-50/70 px-5 py-3.5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 select-none bg-cover bg-right opacity-55"
            style={{ backgroundImage: "url('/assets/admin-header-texture.png')" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold tracking-tight text-slate-900">{judul}</h2>
              <p className="text-[11px] text-slate-500">
                Pratinjau dokumen. Gunakan tombol Download untuk menyimpan berkas.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading || loading || !blobUrl}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloading ? 'Mengunduh...' : 'Download'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup pratinjau"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden bg-slate-100">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <p className="text-xs font-semibold">Memuat dokumen…</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <DocumentIcon className="h-8 w-8 text-rose-400" />
              <p className="text-sm font-bold text-slate-800">Dokumen tidak dapat ditampilkan</p>
              <p className="max-w-md text-xs text-slate-500">{error}</p>
            </div>
          ) : blobUrl ? (
            <iframe src={blobUrl} title={`Pratinjau ${judul}`} className="h-full w-full border-0" />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DokumenPreviewModal;
