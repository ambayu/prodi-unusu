import { create } from 'zustand';
import { api, toApiError, checkOneUnusuSession } from '../services/api';
import type { AuthUser, SiteResolution, SiteSurface, TenantContext } from '../../shared/types/index';

const ONE_UNUSU_URL = import.meta.env.VITE_ONE_UNUSU_URL || 'http://localhost:5173';
const SSO_CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID || '70c76ea9b5d5d3a8';

/**
 * Store sesi dan konteks situs.
 *
 * Menyimpan tiga hal yang dibutuhkan hampir semua halaman: permukaan aplikasi
 * (website utama, website prodi, portal admin), tenant yang sedang dibuka, dan
 * identitas pengguna beserta permission efektifnya.
 */
interface SiteState {
  surface: SiteSurface | null;
  hostname: string;
  tenant: TenantContext | null;
  siteLoading: boolean;
  siteError: string | null;

  user: AuthUser | null;
  userLoading: boolean;
  activeTenantId: number | null;

  /**
   * Scope unit yang sedang aktif di panel admin:
   * - 'portal': Portal Utama (website universitas)
   * - 'faculty': Website Fakultas (Dekanat)
   * - 'prodi': Website Program Studi
   */
  portalScope: boolean;
  activeFacultyId: number | null;

  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveTenant: (tenantId: number) => Promise<void>;
  setActiveFaculty: (facultyId: number) => Promise<void>;
  /** Berpindah ke scope Portal Utama tanpa reload halaman. */
  enterPortalScope: () => void;
  /** Berpindah dari Portal Utama ke scope program studi tertentu. */
  enterProdiScope: (tenantId: number) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
}

/** Kunci `sessionStorage` penanda scope portal dan fakultas. */
const PORTAL_SCOPE_KEY = 'portal_scope_active';
const ACTIVE_FACULTY_KEY = 'active_faculty_id';

function readPortalScope(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(PORTAL_SCOPE_KEY) === '1';
}

function readActiveFacultyId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(ACTIVE_FACULTY_KEY);
  return raw ? Number(raw) : null;
}

export const useSiteStore = create<SiteState>((set, get) => ({
  surface: null,
  hostname: typeof window !== 'undefined' ? window.location.hostname : '',
  tenant: null,
  siteLoading: true,
  siteError: null,

  user: null,
  userLoading: true,
  activeTenantId: null,
  activeFacultyId: readActiveFacultyId(),
  portalScope: readPortalScope(),

  /** Memuat konteks situs dan sesi sekali saat aplikasi dibuka. */
  bootstrap: async () => {
    try {
      const siteRes = await api.get<{ surface: SiteSurface; hostname: string; site: TenantContext | null }>(
        '/public/site',
      );
      set({
        surface: siteRes.data.surface,
        hostname: siteRes.data.hostname,
        tenant: siteRes.data.site,
        siteLoading: false,
        siteError: null,
      });
    } catch (error) {
      // Domain tidak terdaftar adalah kondisi yang harus terlihat oleh pengunjung,
      // bukan disembunyikan dengan data contoh.
      set({
        siteLoading: false,
        siteError: toApiError(error).message,
        tenant: null,
      });
    }

    /*
     * Profil dan konteks tenant dimuat sebagai satu kesatuan.
     *
     * `userLoading` baru dimatikan setelah `activeTenantId` diketahui. Bila
     * dimatikan lebih awal, sidebar membaca `activeTenantId = null` padahal
     * datanya belum tiba lalu menyimpulkan scope "portal" — inilah yang membuat
     * menu prodi kosong setelah login dan baru muncul setelah halaman di-refresh.
     */
    try {
      const meRes = await api.get<{ user: AuthUser }>('/auth/me');
      const currentUser = meRes.data.user;

      // Sinkronisasi status sesi dengan Identity Provider ONE UNUSU
      try {
        const ssoStatus = await checkOneUnusuSession();
        if (ssoStatus?.authenticated === false) {
          // Pertahankan sesi lokal yang valid agar tidak terjadi infinite login loop
          console.warn('[SSO] Sesi ONE UNUSU tidak terdeteksi, mempertahankan sesi lokal Prodi.');
        } else if (
          ssoStatus?.authenticated === true &&
          ssoStatus.user?.username &&
          currentUser?.username &&
          ssoStatus.user.username.toLowerCase() !== currentUser.username.toLowerCase()
        ) {
          try {
            await api.post('/auth/logout');
          } catch {
            // Abaikan kegagalan panggilan logout
          }
          sessionStorage.removeItem(PORTAL_SCOPE_KEY);
          set({ user: null, activeTenantId: null, portalScope: false, userLoading: false });
          window.location.replace(
            `${ONE_UNUSU_URL}/authorize?client_id=${encodeURIComponent(SSO_CLIENT_ID)}`
          );
          return;
        }
      } catch {
        // Abaikan kegagalan jaringan saat offline
      }

      let activeTenantId: number | null = null;
      try {
        const contextRes = await api.get<{ activeTenantId: number }>('/admin/access-context');
        activeTenantId = contextRes.data.activeTenantId;
      } catch {
        // Akun tanpa penugasan prodi memang tidak punya konteks tenant.
        activeTenantId = null;
      }
      set({ user: currentUser, activeTenantId, userLoading: false });
    } catch {
      set({ user: null, userLoading: false, activeTenantId: null });
    }
  },

  /**
   * Memuat ulang profil setelah perubahan hak akses.
   *
   * `activeTenantId` ikut dimuat karena sidebar menyimpulkan scope admin dari
   * nilai itu: `null` berarti Portal Utama. Tanpa penyegaran ini, pengguna yang
   * baru masuk lewat SSO sempat dianggap tidak punya tenant sehingga menu
   * prodi tidak terbangun sampai halaman dimuat ulang.
   */
  refreshUser: async () => {
    try {
      const res = await api.get<{ user: AuthUser }>('/auth/me');
      set({ user: res.data.user, userLoading: false });

      try {
        const contextRes = await api.get<{ activeTenantId: number }>('/admin/access-context');
        set({ activeTenantId: contextRes.data.activeTenantId });
      } catch {
        // Akun tanpa penugasan prodi memang tidak punya konteks tenant.
        set({ activeTenantId: null });
      }
    } catch {
      set({ user: null, userLoading: false, activeTenantId: null });
    }
  },

  /** Mengakhiri sesi di server, bukan hanya membersihkan state klien. */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      sessionStorage.removeItem(PORTAL_SCOPE_KEY);
      sessionStorage.removeItem(ACTIVE_FACULTY_KEY);
      sessionStorage.removeItem('active_tenant_id');
      set({ user: null, activeTenantId: null, activeFacultyId: null, portalScope: false });
    }
  },

  /**
   * Mengganti tenant aktif untuk program studi.
   */
  setActiveTenant: async (tenantId: number) => {
    sessionStorage.setItem('active_tenant_id', String(tenantId));
    sessionStorage.removeItem(PORTAL_SCOPE_KEY);
    sessionStorage.removeItem(ACTIVE_FACULTY_KEY);
    const res = await api.get<{ activeTenantId: number }>('/admin/access-context', {
      params: { tenantId },
    });
    set({ activeTenantId: res.data.activeTenantId, activeFacultyId: null, portalScope: false });
    window.location.reload();
  },

  /**
   * Mengganti unit aktif ke tingkat Fakultas (Dekanat).
   */
  setActiveFaculty: async (facultyId: number) => {
    sessionStorage.setItem(ACTIVE_FACULTY_KEY, String(facultyId));
    sessionStorage.removeItem(PORTAL_SCOPE_KEY);
    sessionStorage.removeItem('active_tenant_id');
    set({ activeFacultyId: facultyId, activeTenantId: null, portalScope: false });
    window.location.reload();
  },

  /**
   * Berpindah ke scope Portal Utama.
   */
  enterPortalScope: () => {
    sessionStorage.setItem(PORTAL_SCOPE_KEY, '1');
    sessionStorage.removeItem(ACTIVE_FACULTY_KEY);
    sessionStorage.removeItem('active_tenant_id');
    set({ portalScope: true, activeFacultyId: null });
  },

  /**
   * Berpindah dari Portal Utama ke satu program studi ("Kelola konten").
   *
   * Berbeda dengan `setActiveTenant`, fungsi ini TIDAK memuat ulang halaman:
   * pengguna dibawa langsung ke dashboard prodi, lalu seluruh query React
   * Query yang ber-key `['admin', ...]` akan di-refetch karena `activeTenantId`
   * berubah.
   */
  enterProdiScope: async (tenantId: number) => {
    sessionStorage.setItem('active_tenant_id', String(tenantId));
    sessionStorage.removeItem(PORTAL_SCOPE_KEY);
    const res = await api.get<{ activeTenantId: number }>('/admin/access-context', {
      params: { tenantId },
    });
    set({ activeTenantId: res.data.activeTenantId, portalScope: false });
  },

  hasPermission: (permission: string) => {
    const user = get().user;
    if (!user) return false;
    return user.permissions.includes('*') || user.permissions.includes(permission);
  },

  canAny: (permissions: string[]) => {
    const user = get().user;
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return permissions.some((permission) => user.permissions.includes(permission));
  },
}));

export async function resolveSite(): Promise<SiteResolution> {
  const res = await api.get<SiteResolution>('/public/site');
  return res.data;
}
