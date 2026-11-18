import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { EmptyState, ErrorState, LoadingState } from './States';

/**
 * DataTable: tabel data standar ONE UNUSU dengan dukungan pagination otomatis.
 *
 * Kolom didefinisikan sebagai data (`columns`) sehingga lebar kolom bersifat
 * tetap dan tidak lagi ditentukan oleh panjang isi. Mendukung pagination
 * klien bawaan yang otomatis menghitung nomor urut dan menyajikan navigasi.
 */

export interface DataTableColumn<T> {
  /** Kunci unik kolom; dipakai sebagai React key. */
  key: string;
  /** Judul kolom pada header tabel. */
  header: React.ReactNode;
  /** Isi sel. Menerima baris dan indeksnya (indeks global dalam data). */
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
  /**
   * Tampilkan kolom nomor urut paling kiri. Bawaan `true` agar seluruh tabel
   * di aplikasi konsisten. Matikan hanya bila tabel memang tidak berurutan.
   */
  showRowNumber?: boolean;
  /**
   * Jumlah baris per halaman untuk pagination otomatis.
   * Setel `null` atau `0` untuk mematikan pagination (tampilkan semua baris).
   * Bawaan: 10 baris per halaman.
   */
  pageSize?: number | null;
  /** Opsi ukuran halaman yang bisa dipilih pengguna. Bawaan [10, 25, 50]. */
  pageSizeOptions?: number[];
  /** Isi tambahan di bawah tabel, mis. ringkasan data. */
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
  showRowNumber = true,
  pageSize = 20,
  pageSizeOptions = [20, 50, 100],
  footer,
  className = '',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState<number>(pageSize && pageSize > 0 ? pageSize : 10);

  const enablePagination = pageSize !== null && pageSize > 0;
  const totalRows = rows.length;
  const totalPages = enablePagination ? Math.max(1, Math.ceil(totalRows / limit)) : 1;

  // Jaga agar current page tidak melampaui totalPages saat filter/pencarian berubah
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage && totalPages > 0) {
    setCurrentPage(safePage);
  }

  const paginatedRows = useMemo(() => {
    if (!enablePagination) return rows;
    const start = (safePage - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, enablePagination, safePage, limit]);

  const startIndex = (safePage - 1) * limit;

  if (loading) return <LoadingState label={loadingLabel} rows={loadingRows} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs">
        <table className="table-base w-full" style={{ minWidth }}>
          <colgroup>
            {showRowNumber ? <col style={{ width: '56px' }} /> : null}
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
              {showRowNumber ? (
                <th scope="col" className="text-center">
                  No
                </th>
              ) : null}
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
            {paginatedRows.map((row, localIndex) => {
              const globalIndex = enablePagination ? startIndex + localIndex : localIndex;
              return (
                <tr key={rowKey(row, globalIndex)} className="transition-colors hover:bg-slate-50/70">
                  {showRowNumber ? (
                    <td className="text-center font-semibold tabular-nums text-slate-500">
                      {globalIndex + 1}
                    </td>
                  ) : null}
                  {/*
                   * Pemutusan paksa teks panjang ditangani aturan
                   * `.table-base tbody td` di index.css, sehingga berlaku untuk
                   * semua tabel tanpa bergantung pada kelas Tailwind.
                   */}
                  {columns.map((kolom) => (
                    <td
                      key={kolom.key}
                      className={[
                        PERATAAN[kolom.align ?? 'left'],
                        kolom.className ?? '',
                        kolom.cellClassName ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {kolom.render(row, globalIndex)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer Bar: Pagination Controls & Info */}
        {enablePagination && totalRows > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#CBD5E1]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-b-[14px]">
            {/* Sisi Kiri: Info Jumlah Data & Pilihan Limit */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Menampilkan{' '}
                <span className="font-bold text-slate-900">{startIndex + 1}</span>–
                <span className="font-bold text-slate-900">{Math.min(startIndex + limit, totalRows)}</span> dari{' '}
                <span className="font-bold text-slate-900">{totalRows}</span> data
              </span>

              {pageSizeOptions.length > 1 && totalRows > pageSizeOptions[0] && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <span className="text-[11px] text-slate-500">Tampilkan:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 focus:border-[#1e3a8a] focus:outline-none"
                    aria-label="Pilih jumlah data per halaman"
                  >
                    {pageSizeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Tombol Navigasi Halaman */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>

                {/* Nomor Halaman */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Selalu tampilkan halaman pertama, terakhir, dan yang berada di sekitar safePage
                      return p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
                    })
                    .reduce<Array<number | string>>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) => {
                      if (typeof item === 'string') {
                        return (
                          <span key={`dots-${idx}`} className="px-1 text-xs text-slate-400">
                            ...
                          </span>
                        );
                      }
                      const active = item === safePage;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors ${
                            active
                              ? 'bg-[#1e3a8a] text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

export default DataTable;
