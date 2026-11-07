import React, { useEffect, useRef, useState } from 'react';
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
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type { AdminMenuItem } from '../../shared/types/index';
import { useSiteStore } from '../app/siteStore';
import { usePermission, useTenant } from '../hooks/useSite';
import { adminMenuApi } from '../services/adminApi';
import { useToast } from './ui/Toast';

/** Peta nama ikon ke komponen, karena ikon tidak dapat disimpan di database. */
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
};

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Kerangka portal administrasi.
 *
 * Menu dibangun dari permission pengguna, bukan daftar statis. Ini memenuhi
 * aturan menu dinamis pada docs/rbac bagian 8, sementara backend tetap menjadi
 * penentu akhir setiap aksi.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, description, actions }) => {
  const { tenant } = useTenant();
  const { user, isSuperAdmin } = usePermission();
  const logout = useSiteStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menu, setMenu] = useState<AdminMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // Menu dibangun ulang ketika identitas pengguna berubah.
  }, [user?.id, user?.permissions.length]);

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
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
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

  const renderMenuItem = (item: AdminMenuItem, depth = 0) => {
    const Icon = ICONS[item.icon ?? ''] ?? DocumentTextIcon;
    const hasChildren = item.children.length > 0;
    const isSelected =
      location.pathname === item.route ||
      (item.route !== '/admin' && location.pathname.startsWith(`${item.route}/`));
    const childSelected = hasChildren && item.children.some((child) => location.pathname === child.route);

    return (
      <div key={item.menuKey}>
        <NavLink
          to={item.route}
          end={item.route === '/admin'}
          className={({ isActive }) =>
            [
              'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors',
              depth > 0 ? 'ml-2' : '',
              isActive || childSelected
                ? 'bg-[#1e3a8a] text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')
          }
        >
          <span className="flex items-center gap-3">
            <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-[#1e3a8a]'}`} />
            <span>{item.label}</span>
          </span>
          {isSelected && !hasChildren ? <ChevronRightIcon className="h-3.5 w-3.5 text-white/80" /> : null}
        </NavLink>

        {hasChildren ? (
          <div className="mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
            {item.children
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((child) => renderMenuItem(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  // Pengelompokan visual: menu prodi, lalu menu global Super Admin.
  const prodiMenus = menu.filter((item) => !item.menuKey.startsWith('super.'));
  const globalMenus = menu.filter((item) => item.menuKey.startsWith('super.'));

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] lg:hidden"
              aria-label={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>

            <Link to="/admin" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-1">
                <img src="/logo-unusu.jpg" alt="Logo UNUSU" className="h-full w-full object-contain" />
              </span>
              <span className="hidden sm:block">
                <span className="flex items-center gap-1.5 text-sm font-extrabold tracking-tight text-slate-900">
                  PORTAL <span className="text-[#1e3a8a]">PRODI UNUSU</span>
                </span>
                <span className="block text-[11px] font-medium text-slate-500">
                  {isSuperAdmin ? 'Super Administrator' : tenant ? `${tenant.name} • ${tenant.facultyName}` : 'Administrator'}
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:flex"
            >
              <GlobeAltIcon className="h-4 w-4 text-slate-500" />
              Lihat Website
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-full border border-transparent p-1.5 transition-colors hover:border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-bold text-white ring-2 ring-blue-200">
                  {initials}
                </span>
                <span className="hidden pr-1 text-left md:block">
                  <span className="block text-xs font-bold leading-tight text-slate-900">{user?.name ?? 'Pengguna'}</span>
                  <span className="block text-[10px] leading-tight text-slate-500">{user?.email ?? ''}</span>
                </span>
                <ChevronDownIcon className="h-4 w-4 text-slate-500" />
              </button>

              {profileOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-4 py-2">
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">{user?.email}</p>
                    <p className="mt-1.5 inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a8a]">
                      {user?.roles.map((role) => role.roleName).join(' • ') || 'Tanpa peran'}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/"
                      target="_blank"
                      role="menuitem"
                      className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#1e3a8a]"
                    >
                      <GlobeAltIcon className="mr-2.5 h-4 w-4 text-slate-500" />
                      Halaman Depan
                    </Link>
                    <Link
                      to="/admin/profil-saya"
                      role="menuitem"
                      className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#1e3a8a]"
                    >
                      <IdentificationIcon className="mr-2.5 h-4 w-4 text-slate-500" />
                      Biodata Saya
                    </Link>
                  </div>

                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                    >
                      <ArrowRightOnRectangleIcon className="mr-2.5 h-4 w-4 text-rose-600" />
                      Keluar dari Akun
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white p-1">
                <img src="/logo-unusu.jpg" alt="UNUSU" className="h-full w-full object-contain" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-extrabold uppercase tracking-tight text-slate-900">
                  {isSuperAdmin ? 'Semua Prodi' : tenant?.name ?? 'Portal Prodi'}
                </span>
                <span className="block truncate text-[10px] font-semibold text-slate-500">
                  {tenant?.domain || 'prodi.unusu.ac.id'}
                </span>
              </span>
            </div>

            {menuLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-9 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : (
              <>
                <nav className="space-y-1" aria-label="Menu administrasi">
                  {prodiMenus.map((item) => renderMenuItem(item))}
                </nav>

                {globalMenus.length > 0 ? (
                  <nav className="space-y-1 border-t border-slate-200 pt-4" aria-label="Menu super admin">
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Administrasi Universitas
                    </p>
                    {globalMenus.map((item) => renderMenuItem(item))}
                  </nav>
                ) : null}

                {prodiMenus.length === 0 && globalMenus.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                    Akun Anda belum memiliki izin modul apa pun. Hubungi administrator universitas.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-200 bg-slate-50/60 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-rose-300 hover:text-rose-700"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Keluar Akun
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
                {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
