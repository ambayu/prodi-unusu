import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DocumentCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  NewspaperIcon,
  PhotoIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useTenant } from '../../../hooks/useSite';
import { api } from '../../../services/api';

interface PublicMenu {
  id: number;
  title: string;
  url: string;
  sortOrder: number;
}

/** Ikon ditentukan dari URL karena database hanya menyimpan label dan tautan. */
const ICON_BY_PATH: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': HomeIcon,
  '/profil': AcademicCapIcon,
  '/visi-misi': AcademicCapIcon,
  '/kurikulum': BookOpenIcon,
  '/dokumen': DocumentCheckIcon,
  '/dosen': UserGroupIcon,
  '/sarana-prasarana': BuildingOfficeIcon,
  '/berita': NewspaperIcon,
  '/galeri': PhotoIcon,
  '/kontak': PhoneIcon,
};

export const ProdiWebsiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Navigasi diambil dari database tenant, bukan ditulis di komponen.
   * Urutan dan labelnya dapat diubah admin prodi tanpa mengubah kode.
   */
  const menusQuery = useQuery({
    queryKey: ['public', 'menus'],
    queryFn: () => api.get<{ menus: PublicMenu[] }>('/public/menus').then((res) => res.data.menus),
  });

  const navLinks = (menusQuery.data ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((menu) => ({
      label: menu.title,
      path: menu.url,
      icon: ICON_BY_PATH[menu.url] ?? DocumentCheckIcon,
    }));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900">
      {/* Top bar kuning emas: identitas institusi dan tautan portal universitas. */}
      <div className="border-b border-amber-400 bg-[#fbbf24] px-4 py-2 text-xs text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-1.5 font-bold sm:justify-start">
            <span className="uppercase tracking-wider">{tenant?.name ?? 'Program Studi'} UNUSU</span>
            <span aria-hidden="true">&bull;</span>
            <span className="font-semibold text-slate-900">
              {tenant?.websiteSetting.facultyName ?? 'Fakultas'}
            </span>
            <span aria-hidden="true">&bull;</span>
            <span className="font-medium text-slate-800">Universitas Nahdlatul Ulama Sumatera Utara</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-900">
            {tenant?.contact?.address ? (
              <span className="hidden md:inline">{tenant.contact.address}</span>
            ) : null}
            <a
              href="https://unusu.ac.id"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline transition-colors hover:text-black"
            >
              Portal Universitas
            </a>
          </div>
        </div>
      </div>

      {/* Navbar utama biru tua. */}
      <nav className="sticky top-0 z-30 bg-[#1e3a8a] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-20 items-center justify-between py-2.5">
            <Link to="/" className="group flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbbf24] p-2 shadow-md">
                <img src="/logo-unusu.jpg" alt="UNUSU" className="h-full w-full rounded-xl object-contain" />
              </span>
              <div>
                <div className="flex items-center space-x-1.5 leading-none">
                  <span className="font-extrabold text-[#fbbf24] text-base tracking-tight">
                    PRODI {tenant?.code || 'SIN'}
                  </span>
                  <span className="text-[10px] bg-white text-[#1e3a8a] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                    {tenant?.degree || 'S1'}
                  </span>
                </div>
                <p className="text-[11px] text-white/90 font-medium mt-1 leading-tight">
                  {tenant?.name || 'Sistem Informasi'} UNUSU
                </p>
              </div>
            </Link>

            {/* Desktop Navigation: Item Beranda Aktif Tombol Kuning Sesuai navbar.png */}
            <div className="hidden xl:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link, idx) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={idx}
                    to={link.path}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#fbbf24] text-slate-950 shadow-md font-extrabold'
                        : 'text-white hover:bg-white/15'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-white'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Sisi Kanan: Website Kampus + Tombol Masuk SSO Kuning Sesuai navbar.png */}
            <div className="hidden sm:flex items-center space-x-4">
              <a
                href="https://unusu.ac.id"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 text-xs text-white hover:text-[#fbbf24] font-semibold"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-white" />
                <span>Website Kampus</span>
              </a>

              {/* Tombol Masuk SSO Kuning Emas Sesuai navbar.png */}
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-slate-950 font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                Masuk SSO
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <div className="xl:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Buka Menu"
              >
                {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#0062cc] border-t border-white/15 px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link, idx) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={idx}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-white text-[#007aff]' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="pt-3 border-t border-white/15 mt-3 space-y-2">
              <a
                href="https://unusu.ac.id"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-1.5 py-2 text-xs text-white"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                <span>Website Kampus</span>
              </a>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-white text-[#007aff] font-extrabold text-xs shadow-md"
              >
                Masuk SSO
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Konten Halaman */}
      <div className="flex-1 bg-white">
        {children}
      </div>

      {/* Footer Bersih Terstandarisasi */}
      <footer className="bg-[#f8fafc] text-slate-700 text-xs border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 p-1 flex items-center justify-center">
                  <img src="/logo-unusu.jpg" alt="UNUSU" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="font-extrabold text-black text-sm">PRODI {tenant?.name}</p>
                  <p className="text-[11px] text-slate-500">UNUSU Sumatera Utara</p>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {tenant?.description || 'Pusat pendidikan tinggi Nahdlatul Ulama yang mencetak sarjana kompeten, berakhlak mulia, dan unggul di bidang teknologi.'}
              </p>
            </div>

            <div>
              <p className="font-extrabold text-black text-xs uppercase tracking-wider mb-3">Tautan Cepat</p>
              <ul className="space-y-1.5">
                <li><Link to="/profil" className="hover:text-[#007aff] transition-colors">Profil Program Studi</Link></li>
                <li><Link to="/kurikulum" className="hover:text-[#007aff] transition-colors">Struktur Kurikulum & RPS</Link></li>
                <li><Link to="/dosen" className="hover:text-[#007aff] transition-colors">Direktori Tenaga Pengajar</Link></li>
                <li><Link to="/dokumen" className="hover:text-[#007aff] transition-colors">Bank Dokumen & SOP</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-extrabold text-black text-xs uppercase tracking-wider mb-3">Layanan Terpadu</p>
              <ul className="space-y-1.5">
                <li><a href="https://unusu.ac.id" className="hover:text-[#007aff] transition-colors">Portal Utama Kampus</a></li>
                <li><Link to="/login" className="hover:text-[#007aff] transition-colors">Masuk ONE UNUSU SSO</Link></li>
                <li><Link to="/sarpras" className="hover:text-[#007aff] transition-colors">Laboratorium & Fasilitas</Link></li>
                <li><Link to="/kontak" className="hover:text-[#007aff] transition-colors">Layanan Aspirasi & Kontak</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-extrabold text-black text-xs uppercase tracking-wider mb-3">Sekretariat Prodi</p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Gedung Fakultas, Kampus Universitas Nahdlatul Ulama Sumatera Utara
                <br />Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan
                <br /><strong className="text-black">Email:</strong> {tenant?.slug || 'prodi'}@unusu.ac.id
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 text-center text-slate-500 text-[11px]">
            Â© {new Date().getFullYear()} Program Studi {tenant?.name || 'Sistem Informasi'} â€¢ Universitas Nahdlatul Ulama Sumatera Utara
          </div>
        </div>
      </footer>
    </div>
  );
};

