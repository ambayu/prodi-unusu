import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';

export const MainNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavLinks = [
    { label: 'Beranda', path: '/' },
    { label: 'Fakultas & Prodi', path: '/fakultas' },
    { label: 'Berita & Agenda', path: '/berita' },
    { label: 'Kontak', path: '/kontak' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white shadow-xs">
      {/* Top Bar Institusi Universitas */}
      <div className="bg-[#14532D] text-white text-xs py-2 px-4 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <div className="flex items-center space-x-2 font-medium">
            <span className="font-extrabold uppercase tracking-wider text-amber-300">
              PORTAL UTAMA UNIVERSITAS
            </span>
            <span>•</span>
            <span className="text-slate-100">
              Universitas Nahdlatul Ulama Sumatera Utara
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-emerald-100">
            <span className="hidden md:inline">Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Medan</span>
            <Link to="/login" className="hover:text-amber-300 transition-colors font-bold underline">
              Masuk
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar Hijau Kelembagaan Khas UNUSU */}
      <div className="bg-[#166534] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo UNUSU Utama */}
            <Link to="/" className="flex items-center space-x-3.5 group">
              <div className="w-12 h-12 rounded-full bg-white p-1.5 flex items-center justify-center shadow-md">
                <img src="/logo-unusu.jpg" alt="Logo UNUSU" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight block leading-tight">
                  UNIVERSITAS NAHDLATUL ULAMA
                </span>
                <span className="text-xs text-amber-300 font-bold tracking-widest uppercase block leading-tight">
                  SUMATERA UTARA • UNUSU
                </span>
              </div>
            </Link>

            {/* Navigasi Desktop Universitas */}
            <nav className="hidden xl:flex items-center space-x-1">
              {mainNavLinks.map((link, idx) => (
                <Link
                  key={idx}
                  to={link.path}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/15 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Tombol Masuk Desktop */}
            <div className="hidden xl:flex items-center space-x-3">
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                Masuk
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <div className="xl:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-white hover:bg-white/10"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#14532D] border-t border-white/15 px-4 pt-2 pb-6 space-y-1">
            {mainNavLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-bold text-white hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/15 mt-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
              >
                Masuk
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
