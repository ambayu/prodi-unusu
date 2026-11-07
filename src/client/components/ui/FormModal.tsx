import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FormModalProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

/**
 * Modal formulir untuk tambah dan ubah data.
 *
 * Menangani dua hal yang sering terlewat: fokus awal ke field pertama dan
 * penutupan dengan tombol Escape, sehingga formulir tetap dapat dipakai tanpa
 * mouse.
 */
export const FormModal: React.FC<FormModalProps> = ({
  open,
  title,
  description,
  submitLabel = 'Simpan',
  busy = false,
  onSubmit,
  onClose,
  children,
  wide = false,
}) => {
  const firstFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const input = firstFieldRef.current?.querySelector<HTMLElement>('input, textarea, select');
    input?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        className={`relative my-6 w-full rounded-2xl border border-slate-200 bg-white shadow-xl ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="form-modal-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Tutup formulir"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div ref={firstFieldRef} className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
            {children}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Menyimpan...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Field teks dengan label dan pesan bantuan. */
export const Field: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, required, children }) => (
  <div>
    <label htmlFor={htmlFor} className="field-label">
      {label}
      {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
    </label>
    {children}
    {hint ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{hint}</p> : null}
  </div>
);
