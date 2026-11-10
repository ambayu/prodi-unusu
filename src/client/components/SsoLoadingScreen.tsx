import React, { useEffect, useRef } from 'react';
import { AnimatedFlatSsoLogo } from './AnimatedFlatSsoLogo';

interface SsoLoadingScreenProps {
  title?: string;
  description?: string;
  logoSize?: number;
  delayMs?: number;
  onReady?: () => void;
}

/**
 * Layar tunggu layar penuh saat masuk atau verifikasi SSO ONE UNUSU.
 * Seragam dengan standar ekosistem UNUSU (LPM, Portal Utama).
 */
export const SsoLoadingScreen: React.FC<SsoLoadingScreenProps> = ({
  title = 'Menghubungkan ke ONE UNUSU',
  description = 'Mengalihkan Anda ke Portal Single Sign-On kampus. Jangan tutup halaman ini.',
  logoSize = 180,
  delayMs = 0,
  onReady,
}) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!onReadyRef.current) return;
    const timer = setTimeout(() => {
      onReadyRef.current?.();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-[#F1F5F9] px-4 font-sans select-none"
    >
      <div className="flex flex-col items-center text-center max-w-md">
        {/* Logo Orbit ONE UNUSU */}
        <AnimatedFlatSsoLogo size={logoSize} />

        <h2 className="mt-8 text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-sm">
          {description}
        </p>

        {/* Indikator status loading berdenyut */}
        <div className="mt-6 flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[11px] font-bold text-[#1e3a8a] shadow-xs">
          <span className="h-2 w-2 rounded-full bg-[#1e3a8a] animate-ping" />
          <span>Otorisasi Gateway Terpadu UNUSU</span>
        </div>
      </div>
    </div>
  );
};
