import { useNotifier } from './Notifier';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Resolve `true` bila pengguna menyetujui. */
  confirm: (message: string, options?: { title?: string; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
}

/**
 * Nama lama untuk `useNotifier()`.
 *
 * Seluruh pemanggilan `toast.success/error/info` yang sudah tersebar di halaman
 * admin kini bermuara ke modal notifikasi terpusat, sehingga tidak perlu diubah
 * satu per satu. Kode baru sebaiknya memakai `useNotifier()` langsung.
 */
export function useToast(): ToastApi {
  return useNotifier();
}

export { useNotifier };
