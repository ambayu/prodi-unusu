import React from 'react';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

/**
 * RowActions: kelompok tombol aksi di dalam baris tabel.
 *
 * Menggantikan tombol teks kecil ("Ubah"/"Hapus" 10px) menjadi tombol ikon yang
 * ukurannya sepadan dengan huruf isi tabel. Teks tombol tetap tersedia lewat
 * `aria-label` dan `title`, jadi pembaca layar dan tooltip tidak kehilangan
 * makna meskipun yang terlihat hanya ikon.
 *
 * Urutan tombol dijaga: aksi tidak destruktif lebih dulu, hapus paling kanan.
 */

const UKURAN_IKON = 'h-[17px] w-[17px]';

interface TombolIkonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Keterangan tambahan untuk tooltip, mis. judul baris yang akan diubah. */
  konteks?: string;
}

/** Tombol ikon untuk mengubah satu baris. */
export const EditRowButton: React.FC<TombolIkonProps> = ({ label, onClick, disabled, konteks }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="btn-icon-neutral"
    aria-label={konteks ? `${label}: ${konteks}` : label}
    title={konteks ? `${label}: ${konteks}` : label}
  >
    <PencilSquareIcon className={UKURAN_IKON} aria-hidden="true" />
  </button>
);

/** Tombol ikon untuk menghapus satu baris. */
export const DeleteRowButton: React.FC<TombolIkonProps> = ({ label, onClick, disabled, konteks }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="btn-icon-danger"
    aria-label={konteks ? `${label}: ${konteks}` : label}
    title={konteks ? `${label}: ${konteks}` : label}
  >
    <TrashIcon className={UKURAN_IKON} aria-hidden="true" />
  </button>
);

interface RowActionsProps {
  children: React.ReactNode;
}

/**
 * Pembungkus deret tombol aksi dengan jarak dan perataan konsisten.
 * Dipakai sebagai isi kolom "Aksi" pada `DataTable`.
 */
export const RowActions: React.FC<RowActionsProps> = ({ children }) => (
  <div className="flex items-center justify-end gap-1.5">{children}</div>
);

export default RowActions;
