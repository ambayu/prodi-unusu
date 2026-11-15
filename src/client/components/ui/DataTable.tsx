import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { EmptyState, ErrorState, LoadingState } from './States';

/**
 * DataTable: tabel data standar ONE UNUSU.
 *
 * Sebelumnya setiap halaman menulis ulang struktur tabel, pembungkus scroll,
 * dan percabangan loading/kosong/error sendiri. Akibatnya lebar kolom dan
 * ukuran huruf berbeda-beda antathalaman, dan perbaikan tampilan harus
 * disalin ke belasan berkas. Komponen ini menyatukannya.
 *
 * Kolom didefinisikan sebagai data (`columns`) sehingga lebar kolom bersifat
 * tetap dan tidak lagi ditentukan oleh panjang isi — inilah yang mencegah
 * kolom saling menimpa saat judul dokumen sangat panjang.
 */

export interface DataTableColumn<T> {
  /** Kunci unik kolom; dipakai sebagai React key. */
  key: string;
  /** Judul kolom pada header tabel. */
  header: React.ReactNode;
  /** Isi sel. Menerima baris dan indeksnya. */
  render: (row: T, index: number) => React.ReactNode;
  /**
   * Lebar kolom. Angka dianggap piksel. Kolom tanpa `width` berbagi sisa ruang
   * secara merata, jadi sisakan paling banyak satu kolom tanpa lebar.
   */
  width?: number | string;
  /** Perataan isi dan header. Bawaan `left`. */
  align?: 'left' | 'center' | 'right';
  /** Kelas tambahan untuk sel isi, mis. `font-mono` atau `whitespace-nowrap`. */
  cellClassName?: string;
  /** Kelas tambahan untuk sel header. */
  headerClassName?: string;
  /** Sembunyikan kolom di bawah breakpoint tertentu (mis. `hidden md:table-cell`). */
  className?: string;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  /** Baris data yang sudah siap ditampilkan. */
  rows: T[];
  /** Kunci unik tiap baris. */
  rowKey: (row: T, index: number) => string;
  /** Sedang memuat data. */
  loading?: boolean;
  /** Pesan galat; bila ada, tabel digantikan keadaan galat. */
  error?: string | null;
  /** Coba lagi saat galat. */
  onRetry?: () => void;
  /** Keadaan kosong. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  /** Label untuk skeleton saat memuat. */
  loadingLabel?: string;
  /** Jumlah baris skeleton. */
  loadingRows?: number;
  /**
   * Lebar minimum tabel. Bila layar lebih sempit, tabel digeser horizontal
   * alih-alih meremas kolom. Bawaan 720px.
   */
  minWidth?: number;
  /** Isi tambahan di bawah tabel, mis. keterangan jumlah data. */
  footer?: React.ReactNode;
  className?: string;
}

const PERATAAN: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data akan muncul di sini setelah tersedia.',
  emptyAction,
  loadingLabel = 'Memuat data',
  loadingRows = 4,
  minWidth = 720,
  footer,
  className = '',
}: DataTableProps<T>) {
  if (loading) return <LoadingState label={loadingLabel} rows={loadingRows} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  /**
   * `table-fixed` wajib dipakai bersama `<colgroup>`: tanpa keduanya lebar
   * kolom dihitung dari isi, sehingga sel panjang (judul, uraian) mendorong
   * kolom lain sampai badge dan tombol aksi saling menimpa.
   */
  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
        <table className="table-base table-fixed" style={{ minWidth }}>
          <colgroup>
            {columns.map((kolom) => (
              <col
                key={kolom.key}
                style={
                  kolom.width === undefined
                    ? undefined
                    : { width: typeof kolom.width === 'number' ? `${kolom.width}px` : kolom.width }
                }
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((kolom) => (
                <th
                  key={kolom.key}
                  scope="col"
                  className={[
                    PERATAAN[kolom.align ?? 'left'],
                    kolom.className ?? '',
                    kolom.headerClassName ?? '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {kolom.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              /*
               * Sorotan baris saat kursor melewati memberi umpan balik bahwa
               * baris dapat diinteraksikan. Ditaruh di komponen agar semua
               * tabel berperilaku sama.
               */
              <tr key={rowKey(row, index)} className="transition-colors hover:bg-slate-50/70">
                {columns.map((kolom) => (
                  /*
                   * `break-words` mencegah isi panjang meluber ke kolom
                   * sebelah; tinggi baris menyesuaikan, bukan menimpa.
                   */
                  <td
                    key={kolom.key}
                    className={[
                      'break-words',
                      PERATAAN[kolom.align ?? 'left'],
                      kolom.className ?? '',
                      kolom.cellClassName ?? '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {kolom.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

/**
 * Tombol "Coba lagi" mandiri, untuk halaman yang menaruh galat di luar tabel.
 * Disediakan agar tidak ada halaman yang menulis ulang gayanya.
 */
export const RetryButton: React.FC<{ onClick: () => void; label?: string }> = ({
  onClick,
  label = 'Coba lagi',
}) => (
  <button type="button" onClick={onClick} className="btn-secondary">
    <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
    {label}
  </button>
);

export default DataTable;
