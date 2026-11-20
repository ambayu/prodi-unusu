import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  GlobeAltIcon,
  IdentificationIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  NewspaperIcon,
  PhotoIcon,
  PhoneIcon,
  AdjustmentsHorizontalIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  FolderOpenIcon,
  InboxIcon,
  UsersIcon,
  LinkIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  SwatchIcon,
  UserIcon,
  EyeIcon,
  KeyIcon,
  Squares2X2Icon,
  ArrowTopRightOnSquareIcon,
  AcademicCapIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { AdminMenuItem } from '../../shared/types/index';
import { useSiteStore } from '../app/siteStore';
import { usePermission, useTenant } from '../hooks/useSite';
import { adminMenuApi, organizationApi, type AdminMenuScope } from '../services/adminApi';
import { useToast } from './ui/Toast';
import { AdminPanelTemplate } from './ui/AdminPanelTemplate';

/** Peta nama ikon ke komponen Heroicons. */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  BookOpenIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  NewspaperIcon,
  PhotoIcon,
  PhoneIcon,
  AdjustmentsHorizontalIcon,
  Cog6ToothIcon,
  FolderOpenIcon,
  InboxIcon,
  UsersIcon,
  LinkIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  SwatchIcon,
  UserIcon,
  EyeIcon,
  GlobeAltIcon,
  IdentificationIcon,
  Bars3Icon,
  Squares2X2Icon,
  KeyIcon,
};

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Opsional: jika true, tidak otomatis membungkus konten dengan AdminPanelTemplate */
  rawContent?: boolean;
}

// ---------------------------------------------------------
// Inisialisasi awal posisi scroll sidebar
// ---------------------------------------------------------
let savedSidebarScrollTop = 0;

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  description,
  actions,
  rawContent = false,
}) => {
  const { tenant } = useTenant();
  const { user, isSuperAdmin } = usePermission();
  const logout = useSiteStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const setActiveTenant = useSiteStore((state) => state.setActiveTenant);
  const enterPortalScope = useSiteStore((state) => state.enterPortalScope);
  const [availablePrograms, setAvailablePrograms] = useState<
    Array<{ id: number; name: string; code: string; faculty?: { id?: number; name: string; code?: string } }>
  >([]);
  /** Fakultas aktif yang dapat dipilih sebagai scope website fakultas. */
  const [availableFaculties, setAvailableFaculties] = useState<
    Array<{ id: number; name: string; code: string }>
  >([]);

  /**
   * Scope panel admin: `portal` (website universitas) atau `prodi`.
   *
   * Nilainya berasal dari store (bukan `useState` lokal) supaya bertahan saat
   * halaman dimuat ulang.
   *
   * CATATAN PENTING — jangan menganggap `activeTenantId === null` sebagai portal.
   *
   * Saat pertama kali masuk lewat SSO, `bootstrap` baru selesai memuat profil
   * lalu `activeTenantId` masih `null` sampai `/admin/access-context` dijawab.
   * Bila kondisi itu langsung dianggap "portal", sidebar membangun katalog
   * portal (tanpa menu konten prodi), lalu MENYIMPANNYA di cache. Cache itu
   * bertahan sampai halaman dimuat ulang — itulah sebabnya menu prodi baru
   * muncul setelah refresh, dan sebelum itu tampil pesan
   * "Akun Anda belum memiliki izin modul aktif".
   *
   * Sekarang scope baru dipastikan portal bila pengguna memang memilih portal
   * (`portalScope`) atau ketika tenant sudah selesai dimuat dan hasilnya kosong
   * (`tenantResolved`). Selama masih memuat, sidebar menunggu.
   */
  const portalScope = useSiteStore((state) => state.portalScope);
  const activeTenantId = useSiteStore((state) => state.activeTenantId);
  const activeFacultyId = useSiteStore((state) => state.activeFacultyId);
  const userLoading = useSiteStore((state) => state.userLoading);
  const setActiveFaculty = useSiteStore((state) => state.setActiveFaculty);

  /**
   * Status penentuan scope:
   * - 'portal': Portal Utama (website universitas)
   * - 'faculty': Website Fakultas (Dekanat)
   * - 'prodi': Website Program Studi
   */
  const tenantResolved = !userLoading;
  const menuScope: AdminMenuScope = activeFacultyId
    ? 'faculty'
    : portalScope || (tenantResolved && activeTenantId === null)
    ? 'portal'
    : 'prodi';

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    organizationApi
      .faculties()
      .then((res) => setAvailableFaculties(res.data.faculties.filter((f) => f.isActive)))
      .catch(() => {});

    if (isSuperAdmin) {
      organizationApi.studyPrograms().then((res) => {
        setAvailablePrograms(res.data.studyPrograms);
      }).catch(() => {});
    }
  }, [isSuperAdmin]);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  /** Dropdown pemilih unit/prodi di topbar kanan. */
  const [prodiOpen, setProdiOpen] = useState(false);
  const [prodiSearch, setProdiSearch] = useState('');
  const [menu, setMenu] = useState<AdminMenuItem[]>(() => adminMenuApi.getCachedMenu(menuScope) ?? []);
  const [menuLoading, setMenuLoading] = useState(() => !adminMenuApi.getCachedMenu(menuScope));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prodiDropdownRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);

  // State collapse untuk tiap grup kategori menu
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'WEBSITE': false,
    'TATA KELOLA': false,
    'UNIVERSITAS': false,
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Restore scroll posisi sidebar desktop saat mount/render
  useLayoutEffect(() => {
    if (desktopNavRef.current && savedSidebarScrollTop > 0) {
      desktopNavRef.current.scrollTop = savedSidebarScrollTop;
    }
  }, [menu]);

  // Simpan posisi scroll sidebar sebelum unmount atau saat user scroll
  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    savedSidebarScrollTop = e.currentTarget.scrollTop;
  };

  // Katalog menu dibangun ulang setiap kali scope berubah (portal ↔ prodi).
  //
  // Sebelumnya efek ini hanya berjalan sekali saat mount dengan dependensi `[]`,
  // sehingga memilih Portal Utama tidak mengubah isi sidebar.
  //
  // Efek tidak dijalankan selama profil pengguna belum siap. Menu diturunkan
  // dari `permissions` dan kepemilikan cache, sehingga membangunnya lebih awal
  // hanya menghasilkan sidebar kosong yang harus diulang setelah data tiba.
  useEffect(() => {
    let active = true;
    const cached = adminMenuApi.getCachedMenu(menuScope);
    if (cached) {
      setMenu(cached);
      setMenuLoading(false);
    } else {
      setMenuLoading(true);
    }

    adminMenuApi
      .buildMenu(menuScope)
      .then((items) => {
        if (active) setMenu(items);
      })
      .catch(() => {
        if (active) setMenu([]);
      })
      .finally(() => {
        if (active) setMenuLoading(false);
      });
    return () => {
      active = false;
    };
  }, [menuScope, activeTenantId, activeFacultyId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (prodiDropdownRef.current && !prodiDropdownRef.current.contains(event.target as Node)) {
        setProdiOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      adminMenuApi.clearCache();
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Gagal mengakhiri sesi. Coba lagi.');
    }
  };

  const initials = (user?.name ?? 'AD')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  /**
   * Label unit yang sedang aktif untuk chip di topbar kanan.
   *
   * Ditampilkan sebagai "kode — nama" agar super admin tahu persis prodi mana
   * yang sedang dikelola tanpa harus membuka dropdown. Bila datanya belum
   * termuat, chip jatuh ke label generik alih-alih kosong.
   */
  const activeScopeLabel = (() => {
    if (menuScope === 'portal') return 'Portal Utama';
    if (menuScope === 'faculty') {
      const fac = availableFaculties.find((f) => f.id === activeFacultyId);
      if (fac) return fac.name;
      return activeFacultyId ? `Fakultas #${activeFacultyId}` : 'Fakultas';
    }
    const program = availablePrograms.find((p) => p.id === activeTenantId);
    if (program) return `${program.code} — ${program.name}`;
    if (tenant?.name) return tenant.name;
    return 'Belum dipilih';
  })();

  // Pisahkan menu berdasarkan section kategori dengan fallback aman.
  //
  // Saat scope portal, katalog menu tidak memiliki entri `content.*` maupun
  // section 'KONTEN', sehingga grup "Konten & Akademik" otomatis tidak dirender.
  const isPortalMenuScope = menuScope === 'portal';
  const utamaMenus = menu.filter((item) => item.section === 'UTAMA' || item.menuKey === 'dashboard');
  const kontenMenus = isPortalMenuScope
    ? []
    : menu.filter((item) => item.section === 'KONTEN' || item.menuKey.startsWith('content.'));
  const websiteMenus = menu.filter((item) => item.section === 'WEBSITE' || item.menuKey.startsWith('website.') || item.menuKey === 'builder');
  const tataKelolaMenus = menu.filter((item) => item.section === 'TATA KELOLA' || item.menuKey.startsWith('management.'));
  const universitasMenus = menu.filter((item) => item.section === 'UNIVERSITAS' || item.menuKey.startsWith('super.'));
  // Menu lain yang belum terpetakan agar tidak hilang
  const otherMenus = menu.filter(
    (item) =>
      !utamaMenus.includes(item) &&
      !kontenMenus.includes(item) &&
      !websiteMenus.includes(item) &&
      !tataKelolaMenus.includes(item) &&
      !universitasMenus.includes(item)
  );

  const renderMenuItem = (item: AdminMenuItem, isCollapsedView: boolean) => {
    const Icon = ICONS[item.icon ?? ''] ?? DocumentTextIcon;
    const isSelected =
      location.pathname === item.route ||
      (item.route !== '/admin' && location.pathname.startsWith(`${item.route}/`));

    return (
      <NavLink
        key={item.menuKey}
        to={item.route}
        end={item.route === '/admin'}
        onClick={() => setMobileOpen(false)}
        title={isCollapsedView ? `${item.label}${item.desc ? ` — ${item.desc}` : ''}` : undefined}
        className={[
          'group relative flex w-full items-center rounded-[11px] transition-all duration-150',
          isCollapsedView ? 'justify-center p-2' : 'min-h-[44px] gap-2.5 px-2.5 py-2',
          isSelected
            ? 'bg-gradient-to-r from-[#1e3a8a] to-[#172f6e] text-white shadow-[0_6px_16px_-8px_rgba(30,58,138,0.65)]'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950',
        ].join(' ')}
      >
        {/* Bilah aksen emas di sisi kiri item aktif */}
        {isSelected && !isCollapsedView && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#fbbf24]"
          />
        )}

        {/* Ikon Menu */}
        <div
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors',
            isSelected
              ? 'bg-white/15 text-[#fbbf24]'
              : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#1e3a8a]',
          ].join(' ')}
        >
          <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
        </div>

        {/* Label & Subtitle Deskripsi */}
        {!isCollapsedView && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span
                className={`truncate text-[13.5px] leading-snug ${
                  isSelected ? 'font-bold text-white' : 'font-semibold text-slate-800 group-hover:text-slate-950'
                }`}
              >
                {item.label}
              </span>
              {isSelected && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#fbbf24]" aria-hidden="true" />
              )}
            </div>
            {item.desc && (
              <p
                className={`mt-0.5 truncate text-[11px] leading-tight ${
                  isSelected ? 'text-blue-100/85' : 'text-slate-500 group-hover:text-slate-600'
                }`}
              >
                {item.desc}
              </p>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  const renderSection = (
    sectionKey: string,
    heading: string,
    ariaLabel: string,
    items: AdminMenuItem[],
    isCollapsedView: boolean,
    options?: { collapsible?: boolean; dividerTop?: boolean },
  ) => {
    if (items.length === 0) return null;
    const collapsible = options?.collapsible ?? true;
    const isSectionCollapsed = !isCollapsedView && collapsible && Boolean(collapsedSections[sectionKey]);

    return (
      <div
        key={sectionKey}
        className={options?.dividerTop ? 'border-t border-slate-200/80 pt-3.5' : undefined}
      >
        {isCollapsedView ? (
          options?.dividerTop ? null : (
            <div className="mx-2 mb-2 border-t border-slate-100 first:hidden" aria-hidden="true" />
          )
        ) : collapsible ? (
          <button
            type="button"
            onClick={() => toggleSection(sectionKey)}
            aria-expanded={!isSectionCollapsed}
            className="group mb-1.5 flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] text-slate-400 transition-colors hover:text-[#1e3a8a]"
          >
            <span>{heading}</span>
            <ChevronDownIcon
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-[#1e3a8a] ${
                isSectionCollapsed ? '-rotate-90' : 'rotate-0'
              }`}
            />
          </button>
        ) : (
          <p className="mb-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] text-slate-400">
            {heading}
          </p>
        )}
        {!isSectionCollapsed && (
          <nav className="space-y-1" role="navigation" aria-label={ariaLabel}>
            {items.map((item) => renderMenuItem(item, isCollapsedView))}
          </nav>
        )}
      </div>
    );
  };

  const renderSidebarContent = (isCollapsedView: boolean, isMobile = false) => (
    <div className="relative flex h-full flex-col justify-between overflow-hidden border-r border-slate-200/90 bg-white text-slate-800 shadow-[1px_0_14px_-8px_rgba(15,23,42,0.12)] select-none">
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {/* Header Branding — Height h-[88px] persis dengan Topbar */}
        <div
          className={`flex h-[88px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white ${
            isCollapsedView ? 'justify-center px-3' : 'px-4'
          }`}
        >
          <Link to="/admin" className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-slate-200/90 bg-white p-1.5 shadow-xs ring-2 ring-[#1e3a8a]/5">
              <img src="/logo-unusu.jpg" alt="UNUSU" className="h-full w-full object-contain" />
            </div>
            {!isCollapsedView && (
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-extrabold tracking-tight text-slate-900">PORTAL</span>
                  <span className="rounded-md bg-[#1e3a8a] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#fbbf24]">
                    {menuScope === 'portal' ? 'UNUSU' : menuScope === 'faculty' ? 'FAKULTAS' : 'PRODI'}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11.5px] font-semibold text-slate-500">
                  {menuScope === 'portal'
                    ? 'Portal Utama Universitas'
                    : isSuperAdmin
                    ? 'Super Administrator'
                    : tenant
                    ? tenant.name
                    : 'Universitas Nahdlatul Ulama'}
                </p>
              </div>
            )}
          </Link>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu navigasi"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/*
          Kartu "UNIT / PRODI AKTIF" DIHAPUS atas permintaan pemilik sistem
          (2026-11-16): "disini juga hapus, nanti pilihnya dari atas saja".
          Pemilihan scope (Portal Utama / Fakultas / Prodi) kini hanya ada di
          topbar (`Quick Switcher Program Studi`), sehingga tidak ada dua
          kontrol untuk satu tujuan yang sama di layar.
        */}

        {/* Navigation Section */}
        <div
          ref={isMobile ? undefined : desktopNavRef}
          onScroll={isMobile ? undefined : handleSidebarScroll}
          className="select2-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4"
        >
          {menuLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-11 animate-pulse rounded-[11px] bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              {renderSection('UTAMA', 'Utama', 'Menu Utama', utamaMenus, isCollapsedView, {
                collapsible: false,
              })}
              {renderSection('KONTEN', 'Konten & Akademik', 'Menu Konten & Akademik', kontenMenus, isCollapsedView)}
              {renderSection('WEBSITE', 'Pengaturan Website', 'Menu Pengaturan Website', websiteMenus, isCollapsedView)}
              {renderSection('TATA KELOLA', 'Tata Kelola Akses', 'Menu Tata Kelola Akses', tataKelolaMenus, isCollapsedView)}
              {renderSection(
                'UNIVERSITAS',
                'Tata Kelola Universitas',
                'Menu Tata Kelola Universitas',
                universitasMenus,
                isCollapsedView,
                { dividerTop: true },
              )}
              {renderSection('LAINNYA', 'Lainnya', 'Menu Lainnya', otherMenus, isCollapsedView, {
                collapsible: false,
              })}

              {/*
                Pesan ini hanya boleh muncul setelah pemuatan selesai. Sebelumnya
                ia ikut tampil selama menu masih dibangun, sehingga pengguna
                membaca "belum memiliki izin" padahal izinnya justru sedang dimuat.
              */}
              {menu.length === 0 && !menuLoading && (
                <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Akun Anda belum memiliki izin modul aktif. Hubungi administrator universitas.
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer — Desktop Collapse Toggle */}
        <div className="hidden shrink-0 border-t border-slate-200/80 bg-slate-50/70 p-2.5 lg:block">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Perluas Menu' : 'Perkecil Menu'}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-slate-200/90 bg-white text-[12px] font-bold text-slate-700 shadow-2xs transition-colors hover:border-[#1e3a8a]/30 hover:bg-blue-50/50 hover:text-[#1e3a8a]"
          >
            {collapsed ? (
              <ChevronDoubleRightIcon className="h-4 w-4 text-[#1e3a8a]" />
            ) : (
              <>
                <ChevronDoubleLeftIcon className="h-4 w-4 text-[#1e3a8a]" />
                <span>Ciutkan Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] font-sans antialiased text-slate-900">
      {/* 1. Mobile Off-Canvas Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-[280px] bg-white transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(false, true)}
      </div>

      {/* 2. Desktop Fixed Sidebar */}
      <div
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 ${
          collapsed ? 'w-[78px]' : 'w-[272px]'
        }`}
      >
        {renderSidebarContent(collapsed, false)}
      </div>

      {/* 3. Main Workspace Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'lg:pl-[78px]' : 'lg:pl-[272px]'
        }`}
      >
        {/* Topbar Header (Tinggi 88px sesuai standar UNUSU) */}
        <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.08)] backdrop-blur-md sm:px-6 lg:px-8">
          {/* Sisi Kiri: Toggle Mobile & Breadcrumb */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-[10px] border border-[#CBD5E1] text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Buka menu navigasi"
            >
              <Bars3Icon className="w-6 h-6" aria-hidden="true" />
            </button>

            {/* Breadcrumb Path */}
            <div className="flex items-center gap-2 text-[14px] font-semibold overflow-hidden">
              <Link
                to={menuScope === 'portal' ? '/admin/portal-utama' : '/admin'}
                className="flex items-center gap-1.5 text-slate-700 hover:text-[#1e3a8a] transition-colors p-1 rounded-md"
                title={menuScope === 'portal' ? 'Dashboard Portal' : 'Dashboard Prodi'}
              >
                <HomeIcon className="w-5 h-5 text-slate-600" />
                <span className="hidden sm:inline">
                  {menuScope === 'portal' ? 'Portal Utama' : 'Portal Admin'}
                </span>
              </Link>
              <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="px-1 py-1 text-slate-950 font-extrabold truncate max-w-[180px] sm:max-w-[320px]">
                {title}
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Action Buttons & Profile Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Quick Switcher Program Studi untuk Admin di Topbar */}
            {isSuperAdmin && availablePrograms.length > 0 && (
              <div className="relative hidden sm:block" ref={prodiDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProdiOpen((prev) => {
                      const next = !prev;
                      if (!next) setProdiSearch('');
                      return next;
                    });
                  }}
                  className={`flex min-h-[44px] items-center gap-2 rounded-[11px] border px-2.5 py-1.5 text-left transition-all focus:outline-none ${
                    prodiOpen
                      ? 'border-[#1e3a8a] bg-blue-50/50 ring-2 ring-blue-100'
                      : 'border-slate-200/90 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                  }`}
                  aria-expanded={prodiOpen}
                  aria-haspopup="true"
                  title="Ganti unit / program studi aktif"
                >
                  {menuScope === 'portal' ? (
                    <BuildingLibraryIcon className="h-4 w-4 shrink-0 text-slate-500" />
                  ) : (
                    <AcademicCapIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                  )}
                  <span className="min-w-0 hidden lg:block">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 leading-none">
                      {menuScope === 'portal' ? 'Unit' : menuScope === 'faculty' ? 'Fakultas' : 'Prodi'}
                    </span>
                    <span className="mt-1 block max-w-[190px] truncate text-[13px] font-bold text-slate-950 leading-none">
                      {activeScopeLabel}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
                      prodiOpen ? 'rotate-180 text-[#1e3a8a]' : ''
                    }`}
                  />
                </button>

                {prodiOpen && (() => {
                  const keyword = prodiSearch.trim().toLowerCase();
                  const cocokPortal = !keyword || 'portal utama universitas'.includes(keyword);
                  const fakultasTersaring = availableFaculties
                    .map((fakultas) => {
                      const semuaProdi = availablePrograms.filter(
                        (program) => program.faculty?.id === fakultas.id,
                      );
                      const fakultasCocok =
                        !keyword ||
                        fakultas.name.toLowerCase().includes(keyword) ||
                        (fakultas.code ?? '').toLowerCase().includes(keyword);
                      const prodiCocok = fakultasCocok
                        ? semuaProdi
                        : semuaProdi.filter(
                            (p) =>
                              p.name.toLowerCase().includes(keyword) ||
                              p.code.toLowerCase().includes(keyword),
                          );
                      return { fakultas, prodiCocok, tampil: fakultasCocok || prodiCocok.length > 0 };
                    })
                    .filter((item) => item.tampil);

                  const tanpaFakultas = availablePrograms.filter(
                    (program) =>
                      (!program.faculty?.id ||
                        !availableFaculties.some((f) => f.id === program.faculty?.id)) &&
                      (!keyword ||
                        program.name.toLowerCase().includes(keyword) ||
                        program.code.toLowerCase().includes(keyword)),
                  );

                  const adaHasil = cocokPortal || fakultasTersaring.length > 0 || tanpaFakultas.length > 0;

                  return (
                    <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-[14px] border border-slate-200/95 bg-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="border-b border-slate-100 bg-slate-50/80 p-2.5">
                        <div className="relative">
                          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            autoFocus
                            value={prodiSearch}
                            onChange={(e) => setProdiSearch(e.target.value)}
                            placeholder="Cari fakultas atau program studi..."
                            className="w-full rounded-[9px] border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                          {prodiSearch ? (
                            <button
                              type="button"
                              onClick={() => setProdiSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Hapus kata kunci unit"
                            >
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="select2-scroll max-h-[340px] overflow-y-auto py-1.5">
                        {!adaHasil ? (
                          <p className="px-4 py-6 text-center text-xs text-slate-500">
                            Tidak ditemukan unit yang cocok dengan &ldquo;{prodiSearch}&rdquo;.
                          </p>
                        ) : null}

                        {cocokPortal ? (
                          <>
                            <p className="px-4 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Portal Universitas
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                enterPortalScope();
                                adminMenuApi.clearCache();
                                setProdiOpen(false);
                                setProdiSearch('');
                                navigate('/admin/portal-utama');
                              }}
                              className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors hover:bg-slate-100 ${
                                menuScope === 'portal' ? 'bg-blue-50/70 font-bold text-[#1e3a8a]' : 'text-slate-700'
                              }`}
                            >
                              <BuildingLibraryIcon className="h-4 w-4 shrink-0 text-slate-500" />
                              <span className="min-w-0 flex-1 truncate">Portal Utama</span>
                              {menuScope === 'portal' ? <CheckIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" /> : null}
                            </button>
                            {(fakultasTersaring.length > 0 || tanpaFakultas.length > 0) ? (
                              <div className="my-1.5 border-t border-slate-100" />
                            ) : null}
                          </>
                        ) : null}

                        {fakultasTersaring.map(({ fakultas, prodiCocok }) => {
                          const fakultasAktif = activeFacultyId === fakultas.id;
                          return (
                            <div key={fakultas.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  adminMenuApi.clearCache();
                                  setProdiOpen(false);
                                  setProdiSearch('');
                                  void setActiveFaculty(fakultas.id);
                                  navigate('/admin');
                                }}
                                title={`Kelola website ${fakultas.name}`}
                                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[12px] font-bold uppercase tracking-wide transition-colors hover:bg-blue-50 ${
                                  fakultasAktif ? 'bg-blue-50/70 text-[#1e3a8a]' : 'text-slate-600'
                                }`}
                              >
                                <BuildingOfficeIcon
                                  className={`h-4 w-4 shrink-0 ${
                                    fakultasAktif ? 'text-[#1e3a8a]' : 'text-slate-400'
                                  }`}
                                />
                                <span className="min-w-0 flex-1 truncate">{fakultas.name}</span>
                                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-500">
                                  {prodiCocok.length} prodi
                                </span>
                                {fakultasAktif ? (
                                  <CheckIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" />
                                ) : null}
                              </button>

                              {prodiCocok.map((program) => {
                                const active = activeTenantId === program.id && menuScope === 'prodi';
                                return (
                                  <button
                                    key={program.id}
                                    type="button"
                                    onClick={() => {
                                      adminMenuApi.clearCache();
                                      setProdiOpen(false);
                                      setProdiSearch('');
                                      void setActiveTenant(program.id);
                                    }}
                                    className={`flex w-full items-center gap-2.5 py-2 pl-9 pr-4 text-left text-[13px] transition-colors hover:bg-slate-100 ${
                                      active ? 'bg-blue-50/70 font-bold text-[#1e3a8a]' : 'text-slate-700'
                                    }`}
                                  >
                                    <AcademicCapIcon
                                      className={`h-4 w-4 shrink-0 ${active ? 'text-[#1e3a8a]' : 'text-slate-400'}`}
                                    />
                                    <span className="w-12 shrink-0 font-mono text-xs font-bold text-slate-500">
                                      {program.code}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{program.name}</span>
                                    {active ? <CheckIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}

                        {tanpaFakultas.length > 0 ? (
                          <div>
                            <p className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Fakultas lain
                            </p>
                            {tanpaFakultas.map((program) => {
                              const active = activeTenantId === program.id && menuScope === 'prodi';
                              return (
                                <button
                                  key={program.id}
                                  type="button"
                                  onClick={() => {
                                    adminMenuApi.clearCache();
                                    setProdiOpen(false);
                                    setProdiSearch('');
                                    void setActiveTenant(program.id);
                                  }}
                                  className={`flex w-full items-center gap-2.5 py-2 pl-9 pr-4 text-left text-[13px] transition-colors hover:bg-slate-100 ${
                                    active ? 'bg-blue-50/70 font-bold text-[#1e3a8a]' : 'text-slate-700'
                                  }`}
                                >
                                  <AcademicCapIcon
                                    className={`h-4 w-4 shrink-0 ${active ? 'text-[#1e3a8a]' : 'text-slate-400'}`}
                                  />
                                  <span className="w-12 shrink-0 font-mono text-xs font-bold text-slate-500">
                                    {program.code}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate">{program.name}</span>
                                  {active ? <CheckIcon className="h-4 w-4 shrink-0 text-[#1e3a8a]" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tombol Lihat Website Publik */}
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-slate-800 hover:bg-slate-100 hover:text-[#1e3a8a] text-[13px] font-bold transition-colors min-h-[44px]"
              title="Buka Website Publik"
            >
              <GlobeAltIcon className="w-[18px] h-[18px] text-emerald-700" />
              <span>Lihat Website</span>
            </Link>

            {/* User Profile Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-[12px] hover:bg-slate-100 transition-colors focus:outline-none"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <div className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-300 shadow-2xs shrink-0">
                  {initials}
                </div>
                <div className="text-left hidden md:block max-w-[150px] truncate">
                  <div className="font-bold text-[13px] text-slate-900 leading-tight truncate">
                    {user?.name ?? 'Pengguna'}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium leading-tight truncate mt-0.5">
                    {isSuperAdmin
                      ? 'Super Admin'
                      : user?.roles?.[0]?.roleName || 'Admin Prodi'}
                  </div>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-[14px] border border-slate-200/95 bg-white pb-2 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="relative overflow-hidden border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 select-none bg-cover bg-right opacity-55"
                      style={{ backgroundImage: "url('/assets/admin-header-texture.png')" }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent"
                    />
                    <div className="relative flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-bold text-white ring-2 ring-blue-100">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-slate-900">
                          {user?.name ?? 'Pengguna'}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {user?.email ?? ''}
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200/80">
                        {isSuperAdmin
                          ? 'Super Administrator'
                          : user?.roles?.map((r) => r.roleName).join(', ') || 'Admin Prodi'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1 text-[13px] font-semibold text-slate-700">
                    <Link
                      to="/"
                      target="_blank"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 hover:text-[#1e3a8a] transition-colors"
                    >
                      <GlobeAltIcon className="w-4 h-4 text-slate-500" />
                      <span>Halaman Depan Website</span>
                    </Link>
                    <Link
                      to="/admin/profil-saya"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 hover:text-[#1e3a8a] transition-colors"
                    >
                      <IdentificationIcon className="w-4 h-4 text-slate-600" />
                      <span>Biodata &amp; Akun Saya</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#CBD5E1]/70">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] font-bold text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4 text-rose-600" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 4. Canvas Content Area */}
        {/*
         * Padding kanvas dibuat sepadan dengan padding body panel (`p-4 sm:p-5`).
         * Sebelumnya `p-5 sm:p-7 lg:p-8` menyisakan ruang kosong lebar di
         * sekeliling panel sehingga konten terlihat renggang.
         */}
        <main className="flex-1 p-4 sm:p-5 bg-[#F1F5F9] min-w-0 max-w-full overflow-x-hidden">
          {rawContent ? (
            children
          ) : (
            <AdminPanelTemplate
              title={title}
              description={description}
              actions={actions}
            >
              {children}
            </AdminPanelTemplate>
          )}
        </main>
      </div>
    </div>
  );
};
