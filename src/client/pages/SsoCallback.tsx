import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api, toApiError } from '../services/api';
import { useSiteStore } from '../app/siteStore';

/**
 * Penerima tiket SSO dari portal ONE UNUSU.
 *
 * Portal mengarahkan pengguna ke sini dengan `?client_id=...&token=...`.
 * Tiket bersifat sekali pakai dan berumur pendek, jadi langsung ditukar ke
 * backend lewat `POST /auth/sso`. Backend melakukan verifikasi server-ke-server
 * memakai client_key yang tidak pernah sampai ke browser.
 */
export const SsoCallback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const refreshUser = useSiteStore((state) => state.refreshUser);
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const clientId = params.get('client_id');
    const token = params.get('token');

    if (!clientId || !token) {
      setError(
        'Portal ONE UNUSU tidak mengirimkan tiket login yang lengkap. Silakan mulai login dari halaman masuk.',
      );
      return;
    }

    api
      .post('/auth/sso', { client_id: clientId, token })
      .then(async () => {
        await refreshUser();
        navigate('/admin', { replace: true });
      })
      .catch((requestError) => {
        setError(toApiError(requestError).message);
      });
  }, [params, navigate, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-slate-900">Login SSO gagal</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 w-full rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#172f6e]"
            >
              Kembali ke halaman masuk
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1e3a8a]" />
            <h1 className="mt-4 text-lg font-bold text-slate-900">Memverifikasi tiket SSO</h1>
            <p className="mt-2 text-sm text-slate-600">
              Mohon tunggu, kami sedang menghubungkan sesi ONE UNUSU dengan portal prodi.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SsoCallback;

