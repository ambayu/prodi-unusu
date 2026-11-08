import React from 'react';
import { useTenant } from '../../hooks/useSite';

/**
 * Kepala halaman publik.
 *
 * Dipakai seluruh halaman prodi agar hierarki judul, eyebrow, dan deskripsi
 * konsisten. Latar memakai warna primer tenant sehingga tema tetap terbaca.
 */
export const PageHeader: React.FC<{ eyebrow: string; title: string; description?: string }> = ({
  eyebrow,
  title,
  description,
}) => {
  const { tenant } = useTenant();
  const primary = tenant?.theme.primaryColor ?? '#14532D';
  const accent = tenant?.theme.accentColor ?? '#fbbf24';

  return (
    <header className="relative overflow-hidden" style={{ backgroundColor: primary }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <p
          className="inline-block border-l-2 pl-3 text-xs font-bold uppercase tracking-wider"
          style={{ borderColor: accent, color: accent }}
        >
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">{description}</p>
        ) : null}
      </div>
    </header>
  );
};
