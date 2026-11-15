import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * Satu kelompok field di dalam formulir.
 *
 * Setiap section wajib punya `title` karena dirender sebagai heading kartu.
 * Aturan ini menegakkan `docs/design-system/DESIGN_RULES.md` bagian formulir:
 * label dan input tidak boleh berdiri langsung di latar halaman.
 */
export interface FormSection {
  /** Kunci unik untuk React; juga dipakai sebagai anchor `id`. */
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

interface FormPageTemplateProps {
  /** Mode dibedakan lewat konfigurasi, bukan lewat duplikasi komponen. */
  mode: 'create' | 'edit';
  /**
   * Judul halaman. Wajib, tetapi **tidak dirender** bila `showHeader={false}`.
   *
   * Alasannya: pada halaman admin, judul sudah dimiliki `AdminPanelTemplate`
   * (lewat `AdminLayout`). Merendernya lagi di sini menghasilkan dua `<h1>`
   * dengan teks yang sama — cacat tampilan yang dilaporkan pemilik sistem
   * 2026-11-16. Judul tetap wajib karena dipakai sebagai `aria-label` formulir.
   */
  title: string;
  description?: string;
  /**
   * Bawaan `true` agar template tetap mandiri saat dipakai tanpa panel admin.
   *
   * Setel `false` ketika formulir berada di dalam `AdminLayout` — panel sudah
   * menampilkan judul, deskripsi, dan `actions`, sehingga header template akan
   * menggandakannya.
   */
  showHeader?: boolean;
  /** Label tombol simpan; bawaan mengikuti `mode`. */
  submitLabel?: string;
  /** Label tombol batal/kembali; bawaan "Batal". */
  cancelLabel?: string;
  busy?: boolean;
  /** Pesan galat tingkat formulir (bukan per field). */
  error?: string | null;
  sections: FormSection[];
  /** Tujuan tombol batal; bila kosong tombol hanya memanggil `onCancel`. */
  cancelTo?: string;
  onCancel?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Template halaman formulir tambah/ubah data.
 *
 * Dipakai untuk halaman form pada rute tersendiri (`/baru` dan `/:id/ubah`),
 * bukan modal. Struktur yang dijamin template ini:
 *
 * 1. Header halaman: judul, deskripsi, dan tombol kembali ke daftar.
 * 2. Satu kartu per section, masing-masing dengan heading.
 * 3. Action bar terpisah di bawah seluruh kartu berisi `Simpan` dan `Batal`.
 *
 * Template tidak mengurus fetching data, validasi, atau navigasi setelah sukses.
 * Itu tanggung jawab halaman pemanggil, sehingga perilaku API tetap sama dengan
 * formulir sebelumnya.
 *
 * **Kepemilikan judul halaman.** Halaman admin sudah punya judul dari
 * `AdminPanelTemplate` (dipasang `AdminLayout`). Template ini karenanya
 * mendukung `showHeader={false}` agar tidak menjadi `<h1>` kedua — bug ganda
 * judul yang dilaporkan 2026-11-16. Saat `showHeader` dimatikan, **tidak ada**
 * tombol `Kembali` yang dirender template: pemanggil wajib menaruhnya di slot
 * `actions` milik `AdminLayout`, supaya tidak muncul dua tombol keluar. Action
 * bar `Batal`/`Simpan` tetap dirender dalam kedua kasus.
 */
export const FormPageTemplate: React.FC<FormPageTemplateProps> = ({
  mode,
  title,
  description,
  showHeader = true,
  submitLabel,
  cancelLabel = 'Batal',
  busy = false,
  error = null,
  sections,
  cancelTo,
  onCancel,
  onSubmit,
}) => {
  const submitText = submitLabel ?? (mode === 'create' ? 'Simpan' : 'Simpan Perubahan');

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate aria-label={title}>
      {showHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {description ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p> : null}
          </div>
          {cancelTo ? (
            <Link to={cancelTo} className="btn-secondary">
              <ArrowLeftIcon className="h-4 w-4" />
              Kembali
            </Link>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="rounded-[14px] border border-[#CBD5E1] bg-white shadow-2xs"
        >
          <div className="border-b border-[#CBD5E1]/70 px-5 py-3.5 rounded-t-[14px]">
            <h2 className="text-sm font-bold text-slate-800">{section.title}</h2>
            {section.description ? (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{section.description}</p>
            ) : null}
          </div>
          <div className="px-5 py-4 space-y-4">{section.content}</div>
        </section>
      ))}

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-[14px] border border-[#CBD5E1] bg-white px-5 py-3.5 shadow-2xs">
        {cancelTo ? (
          <Link to={cancelTo} className="btn-secondary">
            {cancelLabel}
          </Link>
        ) : (
          <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary">
            {cancelLabel}
          </button>
        )}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Menyimpan...' : submitText}
        </button>
      </div>
    </form>
  );
};

export default FormPageTemplate;
