import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Penangkap kesalahan render React.
 *
 * Tanpa ini, satu kesalahan di pohon komponen menghasilkan halaman putih tanpa
 * penjelasan apa pun. Selama pengembangan pesan asli ditampilkan agar penyebab
 * sebenarnya langsung terlihat; pada production hanya pesan umum.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[18px] border border-rose-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 select-none bg-cover bg-right-bottom opacity-40"
            style={{ backgroundImage: "url('/assets/admin-card-texture.png')" }}
          />
          <div className="relative flex items-start gap-4 p-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-rose-100 text-rose-600 ring-1 ring-inset ring-rose-200">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Terjadi kesalahan pada antarmuka</h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Halaman gagal dirender. Muat ulang halaman; bila masalah berulang, laporkan detail di
                bawah kepada pengembang.
              </p>

              {isDev ? (
                <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 text-[11px] leading-relaxed text-rose-200">
                  {error.message}
                  {error.stack ? `\n\n${error.stack}` : ''}
                </pre>
              ) : null}

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary mt-5"
              >
                Muat ulang halaman
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
