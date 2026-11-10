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
};

export const ProdiWebsiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

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

  // Mengelompokkan menu agar ringkas & dinamis (Mendukung Dropdown Hirarki Database & Fallback Cerdas)
  const groupedNavItems: NavItem[] = React.useMemo(() => {
    const apiMenus = menusQuery.data ?? [];
    if (apiMenus.length === 0) return [];

    // Jika database sudah memiliki struktur anak (children) dari menu parent
    const hasDbChildren = apiMenus.some((m) => m.children && m.children.length > 0);

    if (hasDbChildren) {
      return apiMenus
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((parent) => ({
          label: parent.title,
          path: parent.url,
          icon: ICON_BY_PATH[parent.url] ?? DocumentCheckIcon,
          children:
            parent.children && parent.children.length > 0
              ? parent.children
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((child) => ({
                    label: child.title,
                    path: child.url,
                    icon: ICON_BY_PATH[child.url] ?? DocumentCheckIcon,
                  }))
              : undefined,
        }));
    }

    // Fallback cerdas: grup standar 10 menu universitas
    const homeItem = rawLinks.find((l) => l.path === '/');
    const profilItems = rawLinks.filter((l) => l.path === '/profil' || l.path === '/visi-misi');
    const akademikItems = rawLinks.filter(
      (l) => l.path === '/kurikulum' || l.path === '/dosen' || l.path === '/sarana-prasarana'
    );
    const publikasiItems = rawLinks.filter(
      (l) => l.path === '/berita' || l.path === '/galeri' || l.path === '/dokumen'
    );
    const kontakItem = rawLinks.find((l) => l.path === '/kontak');

    // Masukkan halaman terbitan kustom dari Page Builder yang bukan beranda dan bukan rute modul standar
    const standardPageSlugs = new Set([
      'beranda',
      'profil',
      'visi-misi',
      'kurikulum',
      'dokumen',
      'dosen',
      'sarana-prasarana',
      'sarpras',
      'berita',
      'galeri',
      'kontak',
    ]);

    const customPages = (publishedPagesQuery.data ?? [])
      .filter((p) => !standardPageSlugs.has(p.slug))
      .map((p) => ({
        label: p.title,
        path: `/halaman/${p.slug}`,
        icon: DocumentCheckIcon,
      }));

    // Item lain yang tidak masuk grup standar
    const standardPaths = new Set([
      '/',
      '/profil',
      '/visi-misi',
      '/kurikulum',
      '/dosen',
      '/sarana-prasarana',
      '/berita',
      '/galeri',
      '/dokumen',
      '/kontak',
    ]);
    const extraItems = [...rawLinks.filter((l) => !standardPaths.has(l.path)), ...customPages];

    const result: NavItem[] = [];

    if (homeItem) {
      result.push(homeItem);
    }

    if (profilItems.length > 0) {
      result.push({
        label: 'Tentang Prodi',
        path: '/profil',
        icon: AcademicCapIcon,
        children: profilItems,
      });
    }

    if (akademikItems.length > 0) {
      result.push({
        label: 'Akademik',
        path: '/kurikulum',
        icon: BookOpenIcon,
        children: akademikItems,
      });
    }

    if (publikasiItems.length > 0) {
      result.push({
        label: 'Informasi & Dokumen',
        path: '/berita',
        icon: NewspaperIcon,
        children: publikasiItems,
      });
    }

    // Kelompokkan halaman kustom & tautan tambahan ke dalam dropdown "Halaman" jika ada lebih dari 1
    if (extraItems.length > 1) {
      result.push({
        label: 'Halaman & Lainnya',
        path: extraItems[0].path,
        icon: DocumentCheckIcon,
        children: extraItems,
      });
    } else {
      // Sisipkan langsung jika hanya 1
      extraItems.forEach((extra) => result.push(extra));
    }

    if (kontakItem) {
      result.push(kontakItem);
    }

    return result;
  }, [rawLinks, menusQuery.data, publishedPagesQuery.data]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900">
      {/* Top bar kuning emas: identitas institusi dan tautan portal universitas. */}
      <div className="border-b border-amber-400 bg-[#fbbf24] px-4 py-1.5 text-xs text-slate-950">
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

      {/* Navbar utama dengan warna tema spesifik prodi/fakultas */}
      <nav
        className="sticky top-0 z-30 text-white shadow-md transition-colors duration-200"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-20 items-center justify-between py-2.5">
            <Link to="/" className="group flex items-center gap-3.5">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl p-2 shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                <img src="/logo-unusu.jpg" alt="UNUSU" className="h-full w-full rounded-xl object-contain" />
              </span>
              <div>
                <div className="flex items-center space-x-1.5 leading-none">
                  <span
                    className="font-extrabold text-base tracking-tight"
                    style={{ color: accentColor }}
                  >
                    PRODI {tenant?.code || 'SIN'}
                  </span>
                  <span
                    className="text-[10px] bg-white font-extrabold px-1.5 py-0.5 rounded shadow-xs"
                    style={{ color: primaryColor }}
                  >
                    {tenant?.degree || 'S1'}
                  </span>
                </div>
                <p className="text-[11px] text-white/90 font-medium mt-1 leading-tight">
                  {tenant?.name || 'Sistem Informasi'} UNUSU
                </p>
              </div>
            </Link>

            {/* Desktop Navigation (Dikelompokkan dengan Dropdown Bersih) */}
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
                      className="relative"
                      onMouseEnter={() => setOpenDropdown(item.label)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(isDropdownOpen ? null : item.label)}
                        className={`relative flex items-center space-x-1.5 px-3 py-2 text-xs font-bold transition-colors rounded-lg ${
                          isActive ? 'text-amber-300' : 'text-white hover:text-amber-200 hover:bg-white/10'
                        }`}
                        aria-expanded={isDropdownOpen}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                        <ChevronDownIcon
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-200 ${
                            isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                          }`}
                          style={{ backgroundColor: accentColor }}
                        />
                      </button>

                      {/* Dropdown Menu Desktop */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 pt-2 w-56 z-50 animate-fadeIn">
                          <div className="rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 border border-slate-100">
                            {item.children!.map((child, cIdx) => {
                              const ChildIcon = child.icon;
                              const isSubActive = location.pathname === child.path;
                              return (
                                <Link
                                  key={cIdx}
                                  to={child.path}
                                  className={`flex items-center space-x-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                                    isSubActive
                                      ? 'bg-slate-100 font-bold'
                                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                                  }`}
                                  style={isSubActive ? { color: primaryColor } : {}}
                                >
                                  <span style={isSubActive ? { color: primaryColor } : { color: '#64748b' }}>
                                    <ChildIcon className="w-4 h-4 shrink-0" />
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

                // Menu tunggal tanpa dropdown
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    className={`relative flex items-center space-x-1.5 px-3 py-2 text-xs font-bold transition-colors rounded-lg group ${
                      isActive ? 'text-amber-300' : 'text-white hover:text-amber-200 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-200 ${
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

            {/* Sisi Kanan: tautan publik ke portal universitas dan kontak prodi. */}
            <div className="hidden sm:flex items-center space-x-3">
              <a
                href="https://unusu.ac.id"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 text-xs text-white/90 hover:text-white font-semibold px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-white" />
                <span className="hidden xl:inline">Portal Kampus</span>
              </a>

              <Link
                to="/kontak"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-slate-950 font-extrabold text-xs shadow-md transition-all active:scale-95 hover:brightness-105"
                style={{ backgroundColor: accentColor }}
              >
                Hubungi Prodi
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <div className="lg:hidden flex items-center">
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
          <div
            className="lg:hidden border-t border-white/15 px-4 pt-3 pb-6 space-y-1"
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
                  <div key={idx} className="space-y-1 pt-1 pb-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                      {item.label}
                    </p>
                    <div className="space-y-1 pl-2">
                      {item.children!.map((child, cIdx) => {
                        const ChildIcon = child.icon;
                        const isSubActive = location.pathname === child.path;
                        return (
                          <Link
                            key={cIdx}
                            to={child.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                              isSubActive
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-white/90 hover:bg-white/10'
                            }`}
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
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
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
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
                to="/kontak"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-slate-950 font-extrabold text-xs shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                Hubungi Prodi
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
                <li><Link to="/berita" className="hover:text-[#007aff] transition-colors">Berita &amp; Pengumuman</Link></li>
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

