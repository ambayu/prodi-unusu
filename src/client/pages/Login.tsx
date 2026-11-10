import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AnimatedFlatSsoLogo } from '../components/AnimatedFlatSsoLogo';
import { SsoLoadingScreen } from '../components/SsoLoadingScreen';
import { useTenant } from '../hooks/useSite';
import { useSiteStore } from '../app/siteStore';
import { api, toApiError } from '../services/api';

const ONE_UNUSU_URL = import.meta.env.VITE_ONE_UNUSU_URL || 'http://localhost:5173';
const SSO_CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID || '70c76ea9b5d5d3a8';

/**
 * Halaman masuk portal program studi.
 *
 * Jalur utama adalah SSO ONE UNUSU. Login kata sandi lokal tersedia sebagai
 * jalur darurat untuk akun bootstrap dan ketika portal SSO tidak dapat
 * dihubungi, sehingga administrator tidak terkunci dari sistemnya sendiri.
 */
export const Login: React.FC = () => {
  const { tenant } = useTenant();
  const user = useSiteStore((state) => state.user);
  const refreshUser = useSiteStore((state) => state.refreshUser);
  const navigate = useNavigate();

  const [localOpen, setLocalOpen] = useState(false);
  const [ssoRedirecting, setSsoRedirecting] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pengguna yang sesinya masih berlaku tidak perlu melihat form lagi.
  useEffect(() => {
    if (user) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleSsoLogin = () => {
    setSsoRedirecting(true);
    const target = `${ONE_UNUSU_URL}/authorize?client_id=${encodeURIComponent(SSO_CLIENT_ID)}`;
    window.location.href = target;
  };

  const handleLocalLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api.post('/auth/login', { username, password });
      await refreshUser();
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(toApiError(requestError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {ssoRedirecting && (
        <SsoLoadingScreen
          title="Menghubungkan ke ONE UNUSU"
          description="Mengalihkan Anda ke Portal Single Sign-On kampus. Jangan tutup halaman ini."
        />
      )}
      <div className="flex min-h-screen w-full flex-col bg-white font-sans lg:flex-row">
      <div className="z-10 flex w-full flex-col justify-between p-6 sm:p-12 lg:w-1/2 lg:p-16 xl:p-20">
        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#1e3a8a]"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>

        <div className="mx-auto my-auto w-full max-w-md space-y-7 py-6">
          <div className="space-y-2">
            <p className="inline-block border-l-2 border-[#fbbf24] pl-3 text-xs font-semibold uppercase tracking-wider text-[#1e3a8a]">
              Portal Administrasi Program Studi
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Masuk ke <span className="text-[#1e3a8a]">Portal Prodi UNUSU</span>
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              Satu portal untuk mengelola website, kurikulum, dokumen, dosen, berita, dan desain
              landing page setiap program studi.
              {tenant ? (
                <>
                  {' '}
                  Anda sedang membuka <span className="font-semibold text-slate-700">{tenant.name}</span>.
                </>
              ) : null}
            </p>
          </div>

          {/* Logo ONE UNUSU — Ikonik Resmi Hijau Emas UNUSU dengan Orbit 6 Satelit */}
          <div className="flex flex-col items-center space-y-3">
            <AnimatedFlatSsoLogo
              size={210}
              onClick={handleSsoLogin}
            />
            <div className="text-center">
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                ONE <span className="text-[#166534]">UNUSU</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSsoLogin}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-full bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer group"
            aria-label="Masuk dengan ONE UNUSU"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-white shrink-0" />
            <span className="font-bold">Masuk dengan ONE UNUSU</span>
            <ChevronRightIcon className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
            >
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-xs leading-relaxed text-rose-800">{error}</p>
            </div>
          ) : null}

          {/* Wrapper Rapat: Divider 'atau' & Opsi Masuk Alternatif */}
          <div className="!mt-4 space-y-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative bg-white px-3 text-xs text-slate-400">atau</div>
            </div>

            <div className="text-center pt-0.5">
              <a
                href={ONE_UNUSU_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:text-[#14532D] hover:underline transition-colors cursor-pointer"
              >
                <span>Kunjungi Website ONE UNUSU</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setLocalOpen((open) => !open)}
              className="inline-flex w-full items-center justify-center gap-1.5 pt-1 text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              <KeyIcon className="h-3.5 w-3.5" />
              {localOpen ? 'Tutup login kata sandi' : 'Login kata sandi lokal (jalur darurat)'}
            </button>

            {localOpen ? (
              <form
                onSubmit={handleLocalLogin}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Dipakai administrator bila portal ONE UNUSU tidak dapat dihubungi. Akun dibuat oleh
                  Super Admin universitas.
                </p>

                <div>
                  <label htmlFor="username" className="mb-1 block text-[11px] font-bold text-slate-700">
                    Nama pengguna atau email
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#166534] focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-[11px] font-bold text-slate-700">
                    Kata sandi
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#166534] focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-[#166534] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#14532D] disabled:opacity-60"
                >
                  {busy ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            ) : null}
          </div>

          <div className="text-xs text-slate-500 text-center font-normal pt-1">
            &copy; {new Date().getFullYear()} Portal Prodi &bull; Universitas Nahdlatul Ulama Sumatera Utara
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[420px] w-full flex-col justify-end overflow-hidden bg-[#1e3a8a] p-8 text-white sm:p-14 lg:min-h-screen lg:w-1/2 lg:p-16">
        <img
          src="/assets/campus-login.png"
          alt="Gedung kampus Universitas Nahdlatul Ulama Sumatera Utara"
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.82]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1c46]/95 via-[#0b1c46]/45 to-transparent" />

        <div className="relative z-10 max-w-lg space-y-3">
          <p className="inline-block border-l-2 border-[#fbbf24] pl-3 text-xs font-semibold uppercase tracking-wider text-[#fbbf24]">
            Satu Aplikasi, Banyak Website Program Studi
          </p>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-4xl">
            Setiap Prodi Mengelola Websitenya Sendiri
          </h2>
          <p className="text-sm leading-relaxed text-slate-200 drop-shadow">
            Kurikulum, dosen, dokumen, berita, dan susunan landing page setiap program studi
            terisolasi satu sama lain. Perubahan pada satu prodi tidak pernah memengaruhi prodi lainnya.
          </p>
        </div>
      </div>
    </div>
  </>
  );
};

export default Login;
