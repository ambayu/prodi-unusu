import React, { useEffect, useState, useRef } from 'react';
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
  ChevronDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useTenant } from '../../../hooks/useSite';
import { api } from '../../../services/api';
import { buildNavbarTree } from '../../../../shared/utils/navbarTree';

export interface PublicMenu {
  id: number;
  parentId?: number | null;
  title: string;
  url: string;
  sortOrder: number;
  children?: PublicMenu[];
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

/** Ikon ditentukan dari URL karena database hanya menyimpan label dan tautan. */
const ICON_BY_PATH: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': HomeIcon,
  '/profil': AcademicCapIcon,
  '/visi-misi': InformationCircleIcon,
  '/kurikulum': BookOpenIcon,
  '/dokumen': DocumentCheckIcon,
  '/dosen': UserGroupIcon,
  '/sarana-prasarana': BuildingOfficeIcon,
  '/berita': NewspaperIcon,
  '/galeri': PhotoIcon,
  '/kontak': PhoneIcon,
  '/prodi': AcademicCapIcon,
};

export const ProdiWebsiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Website fakultas memakai layout yang sama tetapi dengan penanda sendiri.
   *
   * Sebelumnya seluruh label ditulis untuk prodi ("PRODI FIK", "Hubungi Prodi",
   * "Sekretariat Prodi"), sehingga domain fakultas tampil seolah-olah program
   * studi. Semua label di bawah kini mengikuti jenis tenant.
   */
  const adalahFakultas = tenant?.tenantType === 'faculty';
  const labelUnit = adalahFakultas ? 'FAKULTAS' : 'PRODI';
  const labelHubungi = adalahFakultas ? 'Hubungi Fakultas' : 'Hubungi Prodi';
  const labelKode = adalahFakultas ? tenant?.code || 'FIK' : tenant?.code || 'SIN';
  const labelGelar = adalahFakultas ? 'Fakultas' : tenant?.degree || 'S1';

  // Ambil warna tema tenant (fallback ke identitas default UNUSU)
  const primaryColor = tenant?.theme?.primaryColor || '#1e3a8a';
  const secondaryColor = tenant?.theme?.secondaryColor || '#0f172a';
  const accentColor = tenant?.theme?.accentColor || '#fbbf24';

  /**
   * Navigasi diambil dari database tenant, bukan ditulis di komponen.
   * Urutan dan labelnya dapat diubah admin prodi tanpa mengubah kode.
   */
  const menusQuery = useQuery({
    queryKey: ['public', 'menus'],
    queryFn: () => api.get<{ menus: PublicMenu[] }>('/public/menus').then((res) => res.data.menus),
  });

  // Query halaman terbitan dari Page Builder untuk dimasukkan ke navbar dinamis
  const publishedPagesQuery = useQuery({
    queryKey: ['public', 'published-pages'],
    queryFn: () =>
      api
        .get<{ pages: Array<{ id: number; slug: string; title: string; isSystem: boolean }> }>(
          '/public/pages',
        )
        .then((res) => res.data.pages),
  });

  const rawLinks = (menusQuery.data ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((menu) => ({
      label: menu.title,
      path: menu.url,
      icon: ICON_BY_PATH[menu.url] ?? DocumentCheckIcon,
    }));

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  /**
   * Struktur navbar disusun oleh fungsi bersama `buildNavbarTree`.
   *
   * Fungsi yang sama dipakai Page Builder, sehingga urutan dan hierarki yang
   * dilihat admin identik dengan yang tampil di navbar pengunjung. Grup datang
   * dari `parentId` pada tabel menus; pengelompokan bawaan hanya dipakai bila
   * database masih datar.
   */
  const groupedNavItems: NavItem[] = React.useMemo(() => {
    const pohon = buildNavbarTree(menusQuery.data ?? [], adalahFakultas ? 'fakultas' : 'prodi');

    /**
     * Kontak & Lokasi diwakili tombol "Hubungi Prodi" di sisi kanan navbar agar
     * tidak tampil dua kali. Bila admin memasukkannya ke dalam grup, item tetap
     * ditampilkan karena sudah menjadi bagian dropdown.
     */
    const tanpaKontakGanda = pohon.filter(
      (node) => !(node.path === '/kontak' && !node.children?.length),
    );

    return tanpaKontakGanda.map((node) => ({
      label: node.label,
      path: node.path,
      icon: ICON_BY_PATH[node.path] ?? DocumentCheckIcon,
      children: node.children?.map((anak) => ({
        label: anak.label,
        path: anak.path,
        icon: ICON_BY_PATH[anak.path] ?? DocumentCheckIcon,
      })),
    }));
  }, [menusQuery.data, adalahFakultas]);

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFDFA] font-sans text-slate-950">
      {/* Top bar kuning emas: identitas institusi dan tautan portal universitas */}
      <div className="border-b border-amber-500/60 bg-[#fbbf24] px-4 py-2 text-[13px] text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2 font-extrabold sm:justify-start">
            <span className="uppercase tracking-wider">{tenant?.name ?? 'Program Studi'} UNUSU</span>
            <span aria-hidden="true">&bull;</span>
            <span className="font-bold text-slate-900">
              {tenant?.websiteSetting.facultyName ?? 'Fakultas'}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline font-semibold text-slate-900">
              Universitas Nahdlatul Ulama Sumatera Utara
            </span>
          </div>
          <div className="flex items-center gap-4 text-[13px] font-bold text-slate-950">
            <a
              href="https://unusu.ac.id"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-extrabold underline decoration-2 underline-offset-2 transition-colors hover:text-black"
            >
              <span>Portal Universitas</span>
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Navbar utama dengan warna tema spesifik prodi/fakultas — Teks 15px & Target Klik Lega */}
      <nav
        className="sticky top-0 z-30 text-white shadow-md transition-colors duration-200 border-b-2"
        style={{ backgroundColor: primaryColor, borderBottomColor: accentColor }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-24 items-center justify-between gap-3 py-2.5">
            <Link to="/" className="group flex items-center gap-3.5 min-w-0">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl p-2 shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                <img src="/logo-unusu.jpg" alt="UNUSU" className="h-full w-full rounded-xl object-contain" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 leading-tight">
                  <span
                    className="font-extrabold text-lg sm:text-xl tracking-tight"
                    style={{ color: accentColor }}
                  >
                    {labelUnit} {labelKode}
                  </span>
                  <span
                    className="text-[12px] bg-white font-extrabold px-2 py-0.5 rounded-md shadow-xs"
                    style={{ color: primaryColor }}
                  >
                    {labelGelar}
                  </span>
                </div>
                <p className="text-[13px] text-white font-semibold mt-0.5 leading-snug truncate">
                  {tenant?.name || 'Sistem Informasi'} UNUSU
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div ref={navContainerRef} className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {groupedNavItems.map((item, idx) => {
                const hasChildren = item.children && item.children.length > 0;
                const isDirectActive = location.pathname === item.path;
                const isChildActive = hasChildren && item.children!.some((c) => location.pathname === c.path);
                const isActive = isDirectActive || isChildActive;
                const Icon = item.icon;
                const isDropdownOpen = openDropdown === item.label;

                if (hasChildren) {
                  return (
                    <div
                      key={idx}
                      className="relative group py-2"
                      onMouseEnter={() => setOpenDropdown(item.label)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(isDropdownOpen ? null : item.label)}
                        className={`relative min-h-[46px] flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[15px] font-bold transition-colors ${
                          isActive
                            ? 'bg-white/15 text-amber-300'
                            : 'text-white hover:bg-white/10 hover:text-amber-200'
                        }`}
                        aria-expanded={isDropdownOpen}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span>{item.label}</span>
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-0 left-3 right-3 h-[3px] rounded-full transition-all duration-200 ${
                            isActive
                              ? 'opacity-100 scale-x-100'
                              : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'
                          }`}
                          style={{ backgroundColor: accentColor }}
                        />
                      </button>

                      {/* Dropdown Menu Desktop */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 w-64 z-50 pt-1 animate-fadeIn">
                          <div
                            className="rounded-xl overflow-hidden bg-white shadow-xl border-t-[3px] border-slate-200 ring-1 ring-black/10"
                            style={{ borderTopColor: accentColor }}
                          >
                            {item.children!.map((child, cIdx) => {
                              const ChildIcon = child.icon;
                              const isSubActive = location.pathname === child.path;
                              return (
                                <Link
                                  key={cIdx}
                                  to={child.path}
                                  className={`flex min-h-[46px] items-center space-x-3 px-4 py-3 text-[15px] font-bold border-b border-slate-100 last:border-b-0 transition-colors ${
                                    isSubActive
                                      ? 'bg-slate-100'
                                      : 'text-slate-800 hover:bg-slate-50 hover:text-slate-950'
                                  }`}
                                  style={isSubActive ? { color: primaryColor } : {}}
                                >
                                  <span style={isSubActive ? { color: primaryColor } : { color: '#475569' }}>
                                    <ChildIcon className="w-5 h-5 shrink-0" />
                                  </span>
                                  <span>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={idx}
                    to={item.path}
                    className={`relative min-h-[46px] flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[15px] font-bold transition-colors group ${
                      isActive
                        ? 'bg-white/15 text-amber-300'
                        : 'text-white hover:bg-white/10 hover:text-amber-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-3 right-3 h-[3px] rounded-full transition-all duration-200 ${
                        isActive
                          ? 'opacity-100 scale-x-100'
                          : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'
                      }`}
                      style={{ backgroundColor: accentColor }}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Sisi Kanan: tombol aksi utama kontak prodi */}
            <div className="hidden sm:flex items-center shrink-0">
              <Link
                to="/kontak"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-5 text-[15px] font-extrabold shadow-sm ring-1 ring-black/10 transition-all hover:bg-amber-300 hover:text-slate-950 hover:shadow-md active:scale-[0.98]"
                style={{ color: primaryColor }}
              >
                {labelHubungi}
              </Link>
            </div>

            {/* Mobile Hamburger — Target sentuh 48px */}
            <div className="lg:hidden flex items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={mobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
              >
                {mobileMenuOpen ? <XMarkIcon className="w-7 h-7" /> : <Bars3Icon className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border-t border-white/15 px-4 pt-3 pb-6 space-y-2"
            style={{ backgroundColor: secondaryColor }}
          >
            {groupedNavItems.map((item, idx) => {
              const hasChildren = item.children && item.children.length > 0;
              const isDirectActive = location.pathname === item.path;
              const isChildActive = hasChildren && item.children!.some((c) => location.pathname === c.path);
              const isActive = isDirectActive || isChildActive;
              const Icon = item.icon;

              if (hasChildren) {
                return (
                  <div key={idx} className="space-y-1.5 pt-2 pb-1">
                    <p className="px-3 pt-1 pb-1 text-[13px] font-extrabold uppercase tracking-wider text-amber-300">
                      {item.label}
                    </p>
                    <div className="space-y-1.5 pl-2">
                      {item.children!.map((child, cIdx) => {
                        const ChildIcon = child.icon;
                        const isSubActive = location.pathname === child.path;
                        return (
                          <Link
                            key={cIdx}
                            to={child.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex min-h-[48px] items-center space-x-3 px-4 rounded-xl text-[15px] font-bold transition-colors ${
                              isSubActive
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <ChildIcon className="w-5 h-5 shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex min-h-[48px] items-center space-x-3 px-4 rounded-xl text-[15px] font-bold transition-colors ${
                    isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-4 border-t border-white/15 mt-3 space-y-2.5">
              <a
                href="https://unusu.ac.id"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[48px] items-center justify-center space-x-2 rounded-xl border border-white/30 text-[15px] font-bold text-white"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                <span>Website Utama Universitas</span>
              </a>
              <Link
                to="/kontak"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-amber-400 px-5 text-[16px] font-extrabold text-slate-950 shadow-sm active:scale-[0.98]"
              >
                {labelHubungi}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Konten Halaman */}
      <div className="flex-1 bg-[#FCFDFA]">
        {children}
      </div>

      {/* Footer Bersih Terstandarisasi — Teks Besar & Kontras Tinggi */}
      <footer className="bg-slate-900 text-slate-100 border-t-4" style={{ borderTopColor: accentColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            <div className="space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-full bg-white p-1.5 flex items-center justify-center shadow-sm shrink-0">
                  <img src="/logo-unusu.jpg" alt="UNUSU" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-lg leading-tight">
                    {labelUnit} {tenant?.name}
                  </p>
                  <p className="text-[13px] font-bold leading-snug text-amber-300">
                    Universitas Nahdlatul Ulama Sumatera Utara
                  </p>
                </div>
              </div>
              <p className="text-slate-200 leading-relaxed text-[15px]">
                {tenant?.description || 'Pusat pendidikan tinggi Nahdlatul Ulama yang mencetak sarjana kompeten, berakhlak mulia, dan unggul di bidang keilmuannya.'}
              </p>
            </div>

            <div>
              <p className="font-bold text-amber-300 text-lg mb-4">Tautan Cepat</p>
              <ul className="space-y-2.5 text-[15px]">
                <li>
                  <Link to="/profil" className="text-slate-100 hover:text-amber-300 transition-colors">
                    {adalahFakultas ? 'Profil Fakultas' : 'Profil Program Studi'}
                  </Link>
                </li>
                {adalahFakultas ? (
                  <li>
                    <Link to="/prodi" className="text-slate-100 hover:text-amber-300 transition-colors">
                      Program Studi
                    </Link>
                  </li>
                ) : (
                  <li>
                    <Link to="/kurikulum" className="text-slate-100 hover:text-amber-300 transition-colors">
                      Struktur Kurikulum &amp; RPS
                    </Link>
                  </li>
                )}
                <li>
                  <Link to="/dosen" className="text-slate-100 hover:text-amber-300 transition-colors">
                    Direktori Tenaga Pengajar
                  </Link>
                </li>
                <li>
                  <Link to="/dokumen" className="text-slate-100 hover:text-amber-300 transition-colors">
                    Bank Dokumen &amp; SOP
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-amber-300 text-lg mb-4">Layanan Terpadu</p>
              <ul className="space-y-2.5 text-[15px]">
                <li>
                  <a href="https://unusu.ac.id" className="text-slate-100 hover:text-amber-300 transition-colors">
                    Portal Utama Kampus
                  </a>
                </li>
                <li>
                  <Link to="/berita" className="text-slate-100 hover:text-amber-300 transition-colors">
                    Berita &amp; Pengumuman
                  </Link>
                </li>
                <li>
                  <Link to="/sarpras" className="text-slate-100 hover:text-amber-300 transition-colors">
                    Laboratorium &amp; Fasilitas
                  </Link>
                </li>
                <li>
                  <Link to="/kontak" className="text-slate-100 hover:text-amber-300 transition-colors">
                    Layanan Aspirasi &amp; Kontak
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-amber-300 text-lg mb-4">
                {adalahFakultas ? 'Sekretariat Fakultas' : 'Sekretariat Prodi'}
              </p>
              <div className="space-y-2.5 text-[15px] text-slate-200 leading-relaxed">
                <p>
                  {tenant?.contact?.address || 'Jl. H.A. Manaf Lubis No.2, Gaperta Ujung, Helvetia, Medan, Sumatera Utara'}
                </p>
                <p>
                  <strong className="text-white">Telepon / WA:</strong>{' '}
                  {tenant?.contact?.phone || '(061) 8451234'}
                </p>
                <p>
                  <strong className="text-white">Surel Resmi:</strong>{' '}
                  {tenant?.contact?.email || `${tenant?.slug || 'prodi'}@unusu.ac.id`}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-700/80 text-center text-slate-300 text-[14px] font-medium">
            &copy; {new Date().getFullYear()} {adalahFakultas ? tenant?.name : `Program Studi ${tenant?.name || 'Sistem Informasi'}`} &bull; Universitas Nahdlatul Ulama Sumatera Utara
          </div>
        </div>
      </footer>
    </div>
  );
};

