import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

/*
 * Notifikasi terpusat untuk seluruh aplikasi: berhasil, galat, peringatan,
 * informasi, dan konfirmasi tindakan. Satu modal, satu gaya, dipanggil lewat
 * `useNotifier()`.
 *
 * Menggantikan toast yang diletakkan mengambang di pojok layar. Pesan panjang
 * seperti batas ukuran berkas atau galat validasi sulit dibaca pada kartu kecil
 * yang hilang sendiri, sehingga pemilik sistem meminta semuanya berbentuk modal.
 */

type NotifierVariant = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface NotifierOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `primary` untuk aksi yang tidak menghapus; bawaan `danger`. */
  tone?: 'danger' | 'primary';
  /**
   * Modal tidak dapat ditutup (tanpa silang, latar, Escape, Enter) selama
   * `true`. Dipakai saat aksi yang dikonfirmasi sedang berjalan.
   */
  busy?: boolean;
}

interface Request extends NotifierOptions {
  id: number;
  variant: NotifierVariant;
  message: string;
  /** Opsi tampilan yang dapat berubah selama modal terbuka (mis. `busy`). */
  options?: NotifierOptions;
  /** Dijalankan setelah pengguna menyetujui; modal menampilkan keadaan tunggu. */
  action?: () => Promise<unknown> | unknown;
}

interface NotifierApi {
  success: (message: string, options?: NotifierOptions) => void;
  error: (message: string, options?: NotifierOptions) => void;
  warning: (message: string, options?: NotifierOptions) => void;
  info: (message: string, options?: NotifierOptions) => void;
  /** Resolve `true` bila pengguna menekan tombol konfirmasi. */
  confirm: (message: string, options?: NotifierOptions) => Promise<boolean>;
  /**
   * Minta izin sebelum menjalankan `action`.
   *
   * Modal tetap terbuka berstatus "sedang diproses" selama `action` berjalan,
   * sehingga pengguna tidak dapat menekan aksi lain pada saat yang sama.
   * `action` wajib menangani galatnya sendiri (mis. lewat `onError` mutasi).
   */
  confirmAction: (
    message: string,
    options: NotifierOptions | undefined,
    action: () => Promise<unknown> | unknown,
  ) => Promise<boolean>;
}

const NotifierContext = createContext<NotifierApi | null>(null);

const VARIANT: Record<
  NotifierVariant,
  { title: string; icon: React.ComponentType<{ className?: string }>; badge: string; button: string }
> = {
  success: {
    title: 'Berhasil',
    icon: CheckCircleIcon,
    badge: 'bg-emerald-100 text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
  },
  error: {
    title: 'Terjadi Kesalahan',
    icon: ExclamationTriangleIcon,
    badge: 'bg-rose-100 text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300',
  },
  warning: {
    title: 'Perhatian',
    icon: ExclamationTriangleIcon,
    badge: 'bg-amber-100 text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-300',
  },
  info: {
    title: 'Informasi',
    icon: InformationCircleIcon,
    badge: 'bg-blue-100 text-[#1e3a8a]',
    button: 'bg-[#1e3a8a] hover:bg-[#172f6e] focus:ring-blue-300',
  },
  confirm: {
    title: 'Konfirmasi',
    icon: QuestionMarkCircleIcon,
    badge: 'bg-slate-100 text-slate-600',
    button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300',
  },
};

export const NotifierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Request[]>([]);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const queueRef = useRef<Request[]>(queue);
  queueRef.current = queue;
  const confirmRef = useRef<HTMLButtonElement>(null);
  const active = queue[0] ?? null;

  const notify = useCallback(
    (variant: NotifierVariant, message: string, options?: NotifierOptions, action?: Request['action']) => {
      setQueue((current) => [
        ...current,
        { ...options, id: Date.now() + Math.random(), variant, message, action },
      ]);
    },
    [],
  );

  const close = useCallback(() => {
    setQueue((current) => current.slice(1));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(false);
  }, []);

  /**
   * Jawab konfirmasi yang sedang terbuka. Bila disetujui dan permintaan punya
   * `action`, modal tetap tampil bertanda "sedang diproses" sampai aksi selesai
   * lalu menutup sendiri, sehingga pengguna tidak dapat menekan tombol lain.
   */
  const answer = useCallback((setuju: boolean) => {
    const current = queueRef.current[0];
    const resolve = resolverRef.current;

    if (!setuju || !current?.action) {
      resolverRef.current = null;
      resolve?.(setuju);
      if (current) setQueue((items) => items.filter((item) => item.id !== current.id));
      return;
    }

    setQueue((items) =>
      items.map((item) =>
        item.id === current.id
          ? { ...item, message: 'Sedang diproses...', options: { ...item.options, busy: true } }
          : item,
      ),
    );
    void Promise.resolve()
      .then(current.action)
      .finally(() => setQueue((items) => items.filter((item) => item.id !== current.id)));
  }, []);
  const answerRef = useRef(answer);
  answerRef.current = answer;

  const api = useMemo<NotifierApi>(
    () => {
      const mintaIzin = (
        message: string,
        options?: NotifierOptions,
        action?: () => Promise<unknown> | unknown,
      ) =>
        new Promise<boolean>((resolve) => {
          /*
           * Hanya satu konfirmasi yang menunggu jawaban pada satu waktu. Bila
           * permintaan lain datang saat modal masih terbuka, jawaban lama
           * ditutup sebagai "batal" agar pemanggilnya tidak menggantung.
           */
          resolverRef.current?.(false);
          resolverRef.current = resolve;
          notify('confirm', message, options, action);
        });

      return {
        success: (message, options) => notify('success', message, options),
        error: (message, options) => notify('error', message, options),
        warning: (message, options) => notify('warning', message, options),
        info: (message, options) => notify('info', message, options),
        confirm: (message, options) => mintaIzin(message, options),
        confirmAction: (message, options, action) => mintaIzin(message, options, action),
      };
    },
    [notify],
  );

  useEffect(() => {
    if (!active || active.options?.busy) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Enter') {
        event.preventDefault();
        answerRef.current(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active?.id, active?.options?.busy, close]);

  useEffect(() => {
    if (active && !active.options?.busy) confirmRef.current?.focus();
  }, [active?.id, active?.options?.busy]);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active?.id]);

  /* Pesan informatif tertutup sendiri; cukup lama untuk pesan panjang dibaca. */
  useEffect(() => {
    if (!active || active.variant === 'confirm') return;
    const timer = window.setTimeout(() => close(), 6000);
    return () => window.clearTimeout(timer);
  }, [active?.id, active?.variant, close]);

  const block = active ? VARIANT[active.variant] : null;
  const Icon = block?.icon;
  const options = active?.options;
  const busy = options?.busy === true;
  const confirmStyle =
    active?.variant === 'confirm'
      ? options?.tone === 'primary'
        ? 'bg-[#1e3a8a] hover:bg-[#172f6e] focus:ring-blue-300'
        : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300'
      : (block?.button ?? '');

  return (
    <NotifierContext.Provider value={api}>
      {children}
      {active && block && Icon ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => {
              if (!busy) answer(false);
            }}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notifier-title"
            aria-describedby="notifier-message"
            aria-busy={busy}
            className="relative w-full max-w-md overflow-hidden rounded-[16px] border border-slate-200/95 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.28)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 select-none bg-cover bg-right-bottom opacity-45"
              style={{ backgroundImage: "url('/assets/admin-card-texture.png')" }}
            />
            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ring-1 ring-inset ring-black/5 ${block.badge}`}>
                  <Icon className={`h-6 w-6 ${busy ? 'animate-pulse' : ''}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="notifier-title" className="text-base font-bold tracking-tight text-slate-900">
                    {active.title ?? block.title}
                  </h2>
                  <p
                    id="notifier-message"
                    className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600"
                  >
                    {active.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                {active.variant === 'confirm' && !busy ? (
                  <button
                    type="button"
                    onClick={() => answer(false)}
                    className="btn-secondary"
                  >
                    {active.cancelLabel ?? 'Batal'}
                  </button>
                ) : null}
                {busy ? null : (
                  <button
                    ref={confirmRef}
                    type="button"
                    onClick={() => answer(true)}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-white shadow-xs transition-colors focus:outline-none focus:ring-2 ${confirmStyle}`}
                  >
                    {active.confirmLabel ?? (active.variant === 'confirm' ? 'Ya, Lanjutkan' : 'Mengerti')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </NotifierContext.Provider>
  );
};

export function useNotifier(): NotifierApi {
  const context = useContext(NotifierContext);
  if (!context) {
    throw new Error('useNotifier harus dipakai di dalam NotifierProvider.');
  }
  return context;
}
