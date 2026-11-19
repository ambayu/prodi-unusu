import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
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
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top Bar Institusi Universitas — Kontras Tinggi */}
      <div className="bg-[#0f3d21] text-white text-[13px] py-2.5 px-4 border-b border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="font-extrabold uppercase tracking-wider text-amber-300">
              PORTAL RESMI UNIVERSITAS
            </span>
            <span aria-hidden="true" className="text-emerald-400">•</span>
            <span className="text-white">
              Universitas Nahdlatul Ulama Sumatera Utara
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[13px] font-semibold text-emerald-100">
            <span className="inline-flex items-center gap-1.5">
              <PhoneIcon className="h-4 w-4 text-amber-300" />
              (061) 844-5566
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar Hijau Kelembagaan Khas UNUSU — Teks Besar & Jelas */}
      <div className="bg-[#166534] text-white border-b-2 border-amber-400/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-24">
            {/* Logo UNUSU Utama */}
            <Link to="/" className="flex items-center space-x-3.5 group focus:outline-none">
              <div className="w-14 h-14 rounded-full bg-white p-1.5 flex items-center justify-center shadow-md ring-2 ring-amber-300/60 shrink-0">
                <img src="/logo-unusu.jpg" alt="Logo UNUSU" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-white text-xl sm:text-2xl tracking-tight block leading-tight">
                  UNIVERSITAS NAHDLATUL ULAMA
                </span>
                <span className="text-[13px] text-amber-300 font-bold tracking-widest uppercase block leading-tight mt-0.5">
                  SUMATERA UTARA • UNUSU
                </span>
              </div>
            </Link>

            {/* Navigasi Desktop Universitas — Ukuran Teks 15px, Target Klik Lega */}
            <nav className="hidden lg:flex items-center space-x-2" aria-label="Navigasi Utama">
              {mainNavLinks.map((link, idx) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={idx}
                    to={link.path}
                    className={`relative min-h-[46px] inline-flex items-center px-4 py-2 rounded-xl text-[15px] font-bold transition-all ${
                      isActive
                        ? 'bg-white/15 text-amber-300'
                        : 'text-white hover:bg-white/10 hover:text-amber-200'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-3 right-3 h-[3px] bg-amber-400 rounded-full"
                      />
                    )}
                  </Link>
                );
              })}
              <a
                href="https://pmb.unusu.ac.id"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-[15px] font-extrabold text-slate-950 shadow-sm transition-all hover:bg-amber-300 hover:shadow-md active:scale-[0.98]"
              >
                <span>Daftar PMB</span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            </nav>

            {/* Mobile Hamburger — Besar & Mudah Ditekan */}
            <div className="lg:hidden flex items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
                aria-label={mobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
              >
                {mobileMenuOpen ? <XMarkIcon className="w-7 h-7" /> : <Bars3Icon className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#124f28] border-t border-white/15 px-4 pt-3 pb-6 space-y-2">
            {mainNavLinks.map((link, idx) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={idx}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-[50px] items-center px-4 rounded-xl text-[16px] font-bold transition-colors ${
                    isActive ? 'bg-white text-[#166534]' : 'text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href="https://pmb.unusu.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-[16px] font-extrabold text-slate-950 shadow-sm"
            >
              <span>Daftar Mahasiswa Baru (PMB)</span>
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
