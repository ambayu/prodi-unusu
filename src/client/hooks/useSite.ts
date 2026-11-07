import { useEffect, useRef } from 'react';
import { useSiteStore } from '../app/siteStore';

let bootstrapped = false;

/**
 * Memuat konteks situs dan sesi satu kali untuk seluruh aplikasi.
 *
 * Tanpa penjaga `bootstrapped`, React 18 StrictMode akan memanggil efek dua
 * kali dan memicu dua permintaan identitas sekaligus.
 */
export function useBootstrap() {
  const bootstrap = useSiteStore((state) => state.bootstrap);
  const started = useRef(false);

  useEffect(() => {
    if (bootstrapped || started.current) return;
    started.current = true;
    bootstrapped = true;
    void bootstrap();
  }, [bootstrap]);
}

/** Mengambil tenant aktif. Melempar tidak dilakukan di sini agar render tetap aman. */
export function useTenant() {
  const tenant = useSiteStore((state) => state.tenant);
  const loading = useSiteStore((state) => state.siteLoading);
  const error = useSiteStore((state) => state.siteError);
  const surface = useSiteStore((state) => state.surface);

  return {
    tenant,
    loading,
    error,
    surface,
    isMainUniversityWebsite: surface === 'main',
    isAdminSurface: surface === 'admin',
  };
}

/** Memeriksa permission pada komponen. Backend tetap penentu akhir. */
export function usePermission() {
  const user = useSiteStore((state) => state.user);
  const hasPermission = useSiteStore((state) => state.hasPermission);
  const canAny = useSiteStore((state) => state.canAny);

  return {
    user,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    has: hasPermission,
    canAny,
  };
}
