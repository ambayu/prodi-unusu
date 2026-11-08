import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';

export const MainNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const mainNavLinks = [
    { label: 'Beranda', path: '/' },
    { label: 'Fakultas & Prodi', path: '/fakultas' },
    { label: 'Berita & Agenda', path: '/berita' },
    { label: 'Kontak', path: '/kontak' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-xs">
      {/* Top Bar Institusi Universitas */}
      <div className="bg-[#14532D] text-white text-xs py-2 px-4 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1">
          <div className="flex items-center space-x-2 font-medium">
            <span className="font-extrabold uppercase tracking-wider text-amber-300">
              PORTAL UTAMA UNIVERSITAS
            </span>
            <span>•</span>
            <span className="text-slate-100">
              Universitas Nahdlatul Ulama Sumatera Utara
            </span>
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
              {mainNavLinks.map((link, idx) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={idx}
                    to={link.path}
                    className={`relative px-3 py-2 text-xs font-bold text-white transition-colors group ${
                      isActive ? 'text-amber-300' : 'hover:text-amber-200'
                    }`}
                  >
                    <span>{link.label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-3 right-3 h-0.5 bg-amber-400 rounded-full transition-all duration-200 ${
                        isActive
                          ? 'opacity-100 scale-x-100'
                          : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

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
          </div>
        )}
      </div>
    </header>
  );
};
