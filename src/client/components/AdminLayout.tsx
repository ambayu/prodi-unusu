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
} from '@heroicons/react/24/outline';
import type { AdminMenuItem } from '../../shared/types/index';
import { useSiteStore } from '../app/siteStore';
import { usePermission, useTenant } from '../hooks/useSite';
import { adminMenuApi, organizationApi } from '../services/adminApi';
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

/**
 * Nilai sentinel pada pemilih "Program Studi Aktif" untuk Portal Utama.
 *
 * Portal utama bukan program studi, sehingga tidak dikirim ke
 * `setActiveTenant` (yang akan memanggil reload halaman dengan tenant prodi).
 * Memilih opsi ini hanya mengarahkan pengguna ke halaman pengelolaannya.
 */
const PORTAL_SCOPE_VALUE = '__portal_utama__';

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
  const activeTenantId = useSiteStore((state) => state.activeTenantId);
  const [availablePrograms, setAvailablePrograms] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      organizationApi.studyPrograms().then((res) => {
        setAvailablePrograms(res.data.studyPrograms);
      }).catch(() => {});
    }
  }, [isSuperAdmin]);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menu, setMenu] = useState<AdminMenuItem[]>(() => adminMenuApi.getCachedMenu() ?? []);
  const [menuLoading, setMenuLoading] = useState(() => !adminMenuApi.getCachedMenu());
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    let active = true;
    adminMenuApi
      .buildMenu()
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
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
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

  // Pisahkan menu berdasarkan section kategori dengan fallback aman
  const utamaMenus = menu.filter((item) => item.section === 'UTAMA' || item.menuKey === 'dashboard');
  const kontenMenus = menu.filter((item) => item.section === 'KONTEN' || item.menuKey.startsWith('content.'));
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
          'group relative w-full flex items-center min-h-[46px] rounded-[12px] text-[13px] font-semibold transition-all duration-150',
          isCollapsedView ? 'justify-center p-2.5' : 'px-3.5 py-2 gap-3',
          isSelected
            ? 'bg-[#DBEAFE] text-slate-900 font-bold shadow-2xs border border-blue-200/80'
            : 'text-slate-700 hover:bg-[#E2EDFB] hover:text-[#1e3a8a]',
        ].join(' ')}
      >
        {/* Ikon Menu */}
        <div
          className={[
            'w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 transition-colors',
            isSelected
              ? 'bg-[#1e3a8a] text-white shadow-2xs'
              : 'bg-[#DBEAFE] text-[#1e3a8a] group-hover:bg-[#bfdbfe]',
          ].join(' ')}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>

        {/* Label & Subtitle Deskripsi */}
        {!isCollapsedView && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate leading-tight text-slate-900 text-[13px] font-bold">
                {item.label}
              </span>
              {isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] shrink-0" />
              )}
            </div>
            {item.desc && (
              <p className="text-[10px] text-slate-500 font-normal leading-tight truncate mt-0.5">
                {item.desc}
              </p>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  const renderSidebarContent = (isCollapsedView: boolean, isMobile = false) => (
    <div className="h-full flex flex-col justify-between bg-[#F0F4FA] text-slate-800 border-r border-[#CBD5E1] relative overflow-hidden select-none">
      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* Header Branding — Height h-[88px] persis dengan Topbar */}
        <div
          className={`h-[88px] border-b border-[#CBD5E1] flex items-center ${
            isCollapsedView ? 'px-3 justify-center' : 'px-5'
          } bg-[#F0F4FA] shrink-0`}
        >
          <Link to="/admin" className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-[14px] bg-white border border-[#CBD5E1] p-1.5 shadow-2xs shrink-0 flex items-center justify-center">
              <img src="/logo-unusu.jpg" alt="UNUSU" className="w-full h-full object-contain" />
            </div>
            {!isCollapsedView && (
              <div className="leading-tight truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[15px] text-slate-900 tracking-tight">PORTAL</span>
                  <span className="font-extrabold text-[15px] text-[#1e3a8a] tracking-tight">PRODI</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold tracking-wide truncate mt-0.5">
                  {isSuperAdmin
                    ? 'Super Administrator'
                    : tenant
                    ? tenant.name
                    : 'Universitas Nahdlatul Ulama'}
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Tenant Scope Card / Pemilih Prodi Aktif */}
        {!isCollapsedView && (
          <div className="px-3 pt-3 shrink-0">
            {isSuperAdmin ? (
              <div className="rounded-[12px] border border-blue-200 bg-blue-50/80 p-2.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                    PROGRAM STUDI AKTIF
                  </span>
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                </div>
                <select
                  value={activeTenantId ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === PORTAL_SCOPE_VALUE) {
                      navigate('/admin/portal');
                      return;
                    }
                    const id = Number(raw);
                    if (id) void setActiveTenant(id);
                  }}
                  className="w-full rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  <optgroup label="Portal Utama (Website Universitas)">
                    <option value={PORTAL_SCOPE_VALUE}>◈ Portal Utama — Website Universitas</option>
                  </optgroup>
                  <optgroup label="Website Program Studi">
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-1 text-[10px] text-blue-700/80 leading-tight">
                  Pilih prodi untuk mengelola kontennya, atau Portal Utama untuk mengatur banner beranda universitas.
                </p>
              </div>
            ) : tenant ? (
              <div className="rounded-[12px] border border-[#CBD5E1] bg-white/80 p-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    {tenant.code || 'PRODI AKTIF'}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-900 truncate">
                  {tenant.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {tenant.facultyName || 'Fakultas UNUSU'}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Navigation Section */}
        <div
          ref={isMobile ? undefined : desktopNavRef}
          onScroll={isMobile ? undefined : handleSidebarScroll}
          className="flex-1 py-4 px-3 space-y-5 overflow-y-auto min-h-0"
        >
          {menuLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-10 animate-pulse rounded-[12px] bg-slate-200/70" />
              ))}
            </div>
          ) : (
            <>
              {/* 1. Menu Utama */}
              {utamaMenus.length > 0 && (
                <div>
                  {!isCollapsedView && (
                    <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      UTAMA
                    </p>
                  )}
                  <nav className="space-y-1" role="navigation" aria-label="Menu Utama">
                    {utamaMenus.map((item) => renderMenuItem(item, isCollapsedView))}
                  </nav>
                </div>
              )}

              {/* 2. Menu Konten & Akademik Prodi */}
              {kontenMenus.length > 0 && (
                <div>
                  {!isCollapsedView && (
                    <button
                      type="button"
                      onClick={() => toggleSection('KONTEN')}
                      className="w-full flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors"
                    >
                      <span>KONTEN &amp; AKADEMIK</span>
                      <ChevronDownIcon
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                          collapsedSections['KONTEN'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                  {!collapsedSections['KONTEN'] && (
                    <nav className="space-y-1 animate-fadeIn" role="navigation" aria-label="Menu Konten & Akademik">
                      {kontenMenus.map((item) => renderMenuItem(item, isCollapsedView))}
                    </nav>
                  )}
                </div>
              )}

              {/* 3. Menu Tata Kelola Website */}
              {websiteMenus.length > 0 && (
                <div>
                  {!isCollapsedView && (
                    <button
                      type="button"
                      onClick={() => toggleSection('WEBSITE')}
                      className="w-full flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors"
                    >
                      <span>PENGATURAN WEBSITE</span>
                      <ChevronDownIcon
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                          collapsedSections['WEBSITE'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                  {!collapsedSections['WEBSITE'] && (
                    <nav className="space-y-1 animate-fadeIn" role="navigation" aria-label="Menu Pengaturan Website">
                      {websiteMenus.map((item) => renderMenuItem(item, isCollapsedView))}
                    </nav>
                  )}
                </div>
              )}

              {/* 4. Menu Tata Kelola Akses RBAC */}
              {tataKelolaMenus.length > 0 && (
                <div>
                  {!isCollapsedView && (
                    <button
                      type="button"
                      onClick={() => toggleSection('TATA KELOLA')}
                      className="w-full flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors"
                    >
                      <span>TATA KELOLA AKSES</span>
                      <ChevronDownIcon
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                          collapsedSections['TATA KELOLA'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                  {!collapsedSections['TATA KELOLA'] && (
                    <nav className="space-y-1 animate-fadeIn" role="navigation" aria-label="Menu Tata Kelola Akses">
                      {tataKelolaMenus.map((item) => renderMenuItem(item, isCollapsedView))}
                    </nav>
                  )}
                </div>
              )}

              {/* 5. Menu Tata Kelola Universitas (Super Admin) */}
              {universitasMenus.length > 0 && (
                <div className="pt-2 border-t border-[#CBD5E1]/80">
                  {!isCollapsedView && (
                    <button
                      type="button"
                      onClick={() => toggleSection('UNIVERSITAS')}
                      className="w-full flex items-center justify-between px-3 pb-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors"
                    >
                      <span>TATA KELOLA UNIVERSITAS</span>
                      <ChevronDownIcon
                        className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                          collapsedSections['UNIVERSITAS'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                  {!collapsedSections['UNIVERSITAS'] && (
                    <nav className="space-y-1 animate-fadeIn" role="navigation" aria-label="Menu Tata Kelola Universitas">
                      {universitasMenus.map((item) => renderMenuItem(item, isCollapsedView))}
                    </nav>
                  )}
                </div>
              )}

              {/* 6. Menu Lainnya (Fallback) */}
              {otherMenus.length > 0 && (
                <div>
                  {!isCollapsedView && (
                    <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      LAINNYA
                    </p>
                  )}
                  <nav className="space-y-1" role="navigation" aria-label="Menu Lainnya">
                    {otherMenus.map((item) => renderMenuItem(item, isCollapsedView))}
                  </nav>
                </div>
              )}

              {menu.length === 0 && (
                <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Akun Anda belum memiliki izin modul aktif. Hubungi administrator universitas.
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer — Desktop Collapse Toggle & Quick Info */}
        <div className="p-3 border-t border-[#CBD5E1] bg-[#F0F4FA] shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Perluas Menu' : 'Perkecil Menu'}
            className="hidden lg:flex w-full min-h-[40px] items-center justify-center gap-2 rounded-[10px] border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-xs font-bold shadow-2xs"
          >
            {collapsed ? (
              <ChevronDoubleRightIcon className="w-4 h-4 text-[#1e3a8a]" />
            ) : (
              <>
                <ChevronDoubleLeftIcon className="w-4 h-4 text-[#1e3a8a]" />
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
          className="fixed inset-0 bg-slate-900/60 z-50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-[280px] bg-[#F0F4FA] transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(false, true)}
      </div>

      {/* 2. Desktop Fixed Sidebar */}
      <div
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 ${
          collapsed ? 'w-[84px]' : 'w-[280px]'
        }`}
      >
        {renderSidebarContent(collapsed, false)}
      </div>

      {/* 3. Main Workspace Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'lg:pl-[84px]' : 'lg:pl-[280px]'
        }`}
      >
        {/* Topbar Header (Tinggi 88px sesuai standar UNUSU) */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#CBD5E1] h-[88px] px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs">
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
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-hidden">
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-slate-600 hover:text-[#1e3a8a] transition-colors p-1 rounded-md"
                title="Dashboard Utama"
              >
                <HomeIcon className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Portal Admin</span>
              </Link>
              <ChevronRightIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="px-2.5 py-1 rounded-[8px] bg-slate-100 border border-[#CBD5E1] text-slate-800 font-bold truncate max-w-[180px] sm:max-w-[280px]">
                {title}
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Action Buttons & Profile Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Quick Switcher Program Studi untuk Admin di Topbar */}
            {isSuperAdmin && availablePrograms.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 shrink-0">
                  Prodi:
                </span>
                <select
                  value={activeTenantId ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === PORTAL_SCOPE_VALUE) {
                      navigate('/admin/portal');
                      return;
                    }
                    const id = Number(raw);
                    if (id) void setActiveTenant(id);
                  }}
                  className="rounded-lg border-0 bg-transparent py-0.5 text-xs font-bold text-blue-950 focus:outline-none cursor-pointer"
                >
                  <optgroup label="Portal Utama">
                    <option value={PORTAL_SCOPE_VALUE}>◈ Portal Utama</option>
                  </optgroup>
                  <optgroup label="Website Prodi">
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Tombol Lihat Website Publik */}
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[10px] border border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-50 hover:text-[#1e3a8a] text-xs font-bold transition-all shadow-2xs min-h-[40px]"
              title="Buka Website Publik"
            >
              <GlobeAltIcon className="w-4 h-4 text-emerald-700" />
              <span>Lihat Website</span>
            </Link>

            {/* Tombol SSO Launcher Central ONE UNUSU */}
            <a
              href="http://localhost:5173/"
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-50 transition-colors shadow-2xs"
              title="Portal SSO & Layanan Terpadu ONE UNUSU"
              aria-label="Portal SSO ONE UNUSU"
            >
              <Squares2X2Icon className="w-5 h-5 text-slate-600" />
            </a>

            {/* User Profile Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-[12px] border border-[#CBD5E1] bg-white hover:bg-slate-50 transition-colors shadow-2xs focus:outline-none"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <div className="w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-300 shadow-2xs shrink-0">
                  {initials}
                </div>
                <div className="text-left hidden md:block max-w-[140px] truncate">
                  <div className="font-bold text-xs text-slate-900 leading-tight truncate">
                    {user?.name ?? 'Pengguna'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight truncate mt-0.5">
                    {isSuperAdmin
                      ? 'Super Admin'
                      : user?.roles?.[0]?.roleName || 'Admin Prodi'}
                  </div>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-[16px] border border-[#CBD5E1] bg-white py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-3 border-b border-[#CBD5E1]/70 bg-slate-50/60">
                    <p className="font-bold text-sm text-slate-900 truncate">
                      {user?.name ?? 'Pengguna'}
                    </p>
                    <p className="text-xs text-slate-500 truncate font-mono mt-0.5">
                      {user?.email ?? ''}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {isSuperAdmin
                          ? 'Super Administrator'
                          : user?.roles?.map((r) => r.roleName).join(', ') || 'Admin Prodi'}
                      </span>
                    </div>
                    {tenant && (
                      <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                        Cakupan: <span className="font-bold text-slate-700">{tenant.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="py-1 text-xs font-semibold text-slate-700">
                    <Link
                      to="/"
                      target="_blank"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 hover:text-[#1e3a8a] transition-colors"
                    >
                      <GlobeAltIcon className="w-4 h-4 text-slate-400" />
                      <span>Halaman Depan Website</span>
                    </Link>
                    <Link
                      to="/admin/profil-saya"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-100 hover:text-[#1e3a8a] transition-colors"
                    >
                      <IdentificationIcon className="w-4 h-4 text-slate-400" />
                      <span>Biodata &amp; Akun Saya</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#CBD5E1]/70">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
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
        <main className="flex-1 p-5 sm:p-7 lg:p-8 bg-[#F1F5F9] min-w-0 max-w-full overflow-x-hidden">
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
