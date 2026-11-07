import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VARIANT_STYLE: Record<ToastVariant, { wrapper: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircleIcon },
  error: { wrapper: 'border-rose-200 bg-rose-50 text-rose-900', icon: ExclamationTriangleIcon },
  info: { wrapper: 'border-blue-200 bg-blue-50 text-blue-900', icon: InformationCircleIcon },
};

/**
 * Penyedia notifikasi ringkas.
 *
 * Menggantikan `alert()` yang memblokir halaman dan tidak dapat digayakan.
 * Setiap notifikasi hilang sendiri setelah beberapa detik, tetapi bisa ditutup
 * lebih cepat oleh pengguna.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), variant === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => {
          const style = VARIANT_STYLE[item.variant];
          const Icon = style.icon;
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${style.wrapper}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus dipakai di dalam ToastProvider.');
  }
  return context;
}
