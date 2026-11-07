import React from 'react';

interface AnimatedFlatSsoLogoProps {
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const AnimatedFlatSsoLogo: React.FC<AnimatedFlatSsoLogoProps> = ({
  size = 210,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Logo Identitas ONE UNUSU"
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-700 rounded-full transition-transform duration-200 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Cincin Orbit Statis & Titik Satelit */}
      <div className="absolute inset-2 rounded-full border border-emerald-700/25 animate-spin [animation-duration:14s]">
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-800 shadow-sm" />
      </div>

      {/* Cincin Lingkar Tengah */}
      <div className="absolute inset-6 rounded-full border border-emerald-600/30 border-dashed animate-spin [animation-duration:22s] [animation-direction:reverse]" />

      {/* Emblem Pusat UNUSU */}
      <div className="relative z-10 w-28 h-28 rounded-full bg-white shadow-md border-2 border-emerald-800/20 p-2.5 flex items-center justify-center overflow-hidden">
        <img
          src="/logo-unusu.jpg"
          alt="Emblem UNUSU"
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span className="text-emerald-900 font-extrabold text-sm tracking-tighter text-center">
          UNUSU
        </span>
      </div>
    </div>
  );
};
