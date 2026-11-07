import React from 'react';

/** Keadaan memuat untuk tabel dan daftar. */
export const LoadingState: React.FC<{ label?: string; rows?: number }> = ({ label = 'Memuat data', rows = 4 }) => (
  <div className="space-y-2" role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

/** Keadaan kosong yang menjelaskan langkah berikutnya, bukan sekadar "tidak ada data". */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Keadaan gagal yang menampilkan pesan asli dari backend. */
export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
    <p className="text-sm font-semibold text-rose-900">Data gagal dimuat</p>
    <p className="mt-1 text-sm leading-relaxed text-rose-800">{message}</p>
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
      >
        Coba lagi
      </button>
    ) : null}
  </div>
);
