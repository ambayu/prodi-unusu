import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSiteStore } from './siteStore';
import { usePermission } from '../hooks/useSite';
import { AppLoading } from '../components/ui/AppStates';

/**
 * Penjaga rute portal administrasi.
 *
 * Ini hanya untuk pengalaman pengguna. Otorisasi sebenarnya tetap dilakukan
 * setiap endpoint backend, sesuai docs/rbac bagian 11.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSiteStore((state) => state.user);
  const userLoading = useSiteStore((state) => state.userLoading);
  const location = useLocation();

  if (userLoading) {
    return <AppLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

/**
 * Penjaga permission per halaman.
 *
 * Bila pengguna tidak berizin, halaman tidak dirender sama sekali sehingga
 * tidak ada permintaan data yang pasti ditolak server.
 */
export const RequirePermission: React.FC<{ anyOf: string[]; children: React.ReactNode }> = ({ anyOf, children }) => {
  const { canAny } = usePermission();

  if (!canAny(anyOf)) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-lg font-bold text-slate-900">Akses ditolak</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi administrator universitas bila
          akses ini memang diperlukan.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
