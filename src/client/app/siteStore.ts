import { create } from 'zustand';
import { api, toApiError } from '../services/api';
import type { AuthUser, SiteResolution, SiteSurface, TenantContext } from '../../shared/types/index';

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

  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveTenant: (tenantId: number) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
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

    try {
      const meRes = await api.get<{ user: AuthUser }>('/auth/me');
      set({ user: meRes.data.user, userLoading: false });

      const contextRes = await api.get<{ activeTenantId: number }>('/admin/access-context');
      set({ activeTenantId: contextRes.data.activeTenantId });
    } catch {
      set({ user: null, userLoading: false, activeTenantId: null });
    }
  },

  /** Memuat ulang profil setelah perubahan hak akses. */
  refreshUser: async () => {
    try {
      const res = await api.get<{ user: AuthUser }>('/auth/me');
      set({ user: res.data.user });
    } catch {
      set({ user: null, activeTenantId: null });
    }
  },

  /** Mengakhiri sesi di server, bukan hanya membersihkan state klien. */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null, activeTenantId: null });
    }
  },

  /** Mengganti tenant aktif untuk Super Admin yang mengelola banyak prodi. */
  setActiveTenant: async (tenantId: number) => {
    const res = await api.get<{ activeTenantId: number }>('/admin/access-context', {
      params: { tenantId },
    });
    set({ activeTenantId: res.data.activeTenantId });
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
