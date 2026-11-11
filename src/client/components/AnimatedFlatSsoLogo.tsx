import React from 'react';

/**
 * AnimatedFlatSsoLogo — Logo identitas resmi ONE UNUSU
 *
 * Angka "1" ikonis statis di pusat squircle hijau UNUSU,
 * dikelilingi 6 satelit berwarna yang mengorbit.
 * Badge pusat TIDAK bergerak agar tulisan tetap jelas terbaca.
 * Desain seragam dengan standar ekosistem LPM dan Portal Utama ONE UNUSU.
 */

const KF_ID = 'one-unusu-sso-kf';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement('style');
  s.id = KF_ID;
  s.textContent = `
    @keyframes onuOrbitCW  { to { transform: rotate(360deg); } }
    @keyframes onuOrbitCCW { to { transform: rotate(-360deg); } }
    @keyframes onuGlow     { 0%,100%{ opacity:.08 } 50%{ opacity:.22 } }
    @keyframes onuPing     { 0%,100%{ transform:scale(1);opacity:1 } 50%{ transform:scale(1.45);opacity:.45 } }
  `;
  document.head.appendChild(s);
}

const SATELLITES = [
  { color: '#3B82F6', angle: 0   },
  { color: '#10B981', angle: 60  },
  { color: '#F59E0B', angle: 120 },
  { color: '#8B5CF6', angle: 180 },
  { color: '#EF4444', angle: 240 },
  { color: '#06B6D4', angle: 300 },
];

interface Props {
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const AnimatedFlatSsoLogo: React.FC<Props> = ({ size = 210, className = '', onClick }) => {
  React.useEffect(() => { ensureKeyframes(); }, []);

  const cx = 100;
  const cy = 100;
  const orbitR = 82;

  return (
    <div
      className={className}
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : undefined, touchAction: 'manipulation' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Logo ONE UNUSU — klik untuk membuka portal' : 'Logo ONE UNUSU'}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {/*
        SVG dijadikan dekoratif penuh.

        Orbit dan satelit di dalamnya beranimasi terus-menerus; tanpa
        `pointerEvents: 'none'` elemen yang bergerak dapat menelan klik sehingga
        logo terasa "tidak bisa ditekan". Dengan pengaturan ini seluruh area
        logo menjadi satu target klik yang utuh, dan pembaca layar hanya
        membacakan `aria-label` milik pembungkusnya.
      */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="onuBadgeFill" x1="55" y1="48" x2="145" y2="152" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#166534" />
            <stop offset="1" stopColor="#14532D" />
          </linearGradient>
          <filter id="onuShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#14532D" floodOpacity="0.30" />
          </filter>
          <filter id="onuNodeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#D4AF37" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Ambient Glow */}
        <circle cx={cx} cy={cy} r="95" fill="#22C55E" opacity="0.12"
          style={{ animation: 'onuGlow 4s ease-in-out infinite' }}
        />

        {/* ===== Orbit Luar — CW (6 Satelit Berputar) ===== */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'onuOrbitCW 24s linear infinite' }}>
          <circle
            cx={cx} cy={cy} r={orbitR}
            stroke="#166534" strokeWidth="1.8"
            strokeDasharray="16 10 6 10"
            strokeLinecap="round" opacity="0.3"
          />
          {SATELLITES.map((sat, i) => {
            const rad = (sat.angle * Math.PI) / 180;
            const sx = cx + orbitR * Math.cos(rad);
            const sy = cy + orbitR * Math.sin(rad);
            return (
              <g key={i}>
                <circle cx={sx} cy={sy} r="6" fill={sat.color} opacity="0.25"
                  style={{ transformOrigin: `${sx}px ${sy}px`, animation: `onuPing ${2.5 + i * 0.3}s ease-in-out infinite ${i * 0.4}s` }}
                />
                <circle cx={sx} cy={sy} r="5.5" fill={sat.color} />
                <circle cx={sx} cy={sy} r="2.5" fill="#FFFFFF" opacity="0.85" />
              </g>
            );
          })}
        </g>

        {/* ===== Orbit Dalam — CCW (3 Gold Connectors) ===== */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'onuOrbitCCW 16s linear infinite' }}>
          <circle
            cx={cx} cy={cy} r="62"
            stroke="#D4AF37" strokeWidth="1.5"
            strokeDasharray="12 8 4 8"
            strokeLinecap="round" opacity="0.40"
          />
          <circle cx={cx} cy={38} r="4" fill="#F59E0B" filter="url(#onuNodeGlow)" />
          <circle cx={154} cy={128} r="3.5" fill="#FBBF24" />
          <circle cx={46} cy={128} r="3.5" fill="#FBBF24" />
        </g>

        {/* ===== Core Badge — STATIS (tidak bergerak, tulisan jelas) ===== */}
        <g>
          <circle cx={cx} cy={cy} r="46" fill="#14532D" opacity="0.10" />

          {/* Squircle */}
          <rect x="54" y="54" width="92" height="92" rx="26"
            fill="url(#onuBadgeFill)" filter="url(#onuShadow)"
          />
          {/* Gold Border */}
          <rect x="57" y="57" width="86" height="86" rx="23"
            fill="none" stroke="#D4AF37" strokeWidth="2.5"
          />
          {/* Inner Light Stroke */}
          <rect x="62" y="62" width="76" height="76" rx="20"
            fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.18"
          />

          {/* Angka "1" */}
          <text
            x={cx} y="95"
            textAnchor="middle" dominantBaseline="central"
            fill="#FFFFFF"
            fontSize="50" fontWeight="900"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
            letterSpacing="-0.04em"
          >
            1
          </text>

          {/* Garis Emas */}
          <rect x="80" y="117" width="40" height="2.5" rx="1.25" fill="#D4AF37" opacity="0.75" />

          {/* ONE UNUSU */}
          <text
            x={cx} y="131"
            textAnchor="middle" dominantBaseline="central"
            fill="#DCFCE7"
            fontSize="9.5" fontWeight="800"
            fontFamily="system-ui, sans-serif"
            letterSpacing="0.15em"
          >
            ONE UNUSU
          </text>
        </g>
      </svg>
    </div>
  );
};
