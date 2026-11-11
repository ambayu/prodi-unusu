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

  /**
   * `true` bila panel admin sedang berada pada **scope Portal Utama**
   * (website universitas), bukan pada scope satu program studi.
   *
   * Portal Utama bukan program studi, sehingga tidak punya tenant. Status ini
   * disimpan terpisah — dan dipersistensi ke `sessionStorage` — supaya pilihan
   * scope bertahan saat halaman dimuat ulang, misalnya ketika menyimpan
   * pengaturan tema atau mengganti prodi lewat `setActiveTenant`.
   */
  portalScope: boolean;

  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveTenant: (tenantId: number) => Promise<void>;
  /** Berpindah ke scope Portal Utama tanpa reload halaman. */
  enterPortalScope: () => void;
  /** Berpindah dari Portal Utama ke scope program studi tertentu. */
  enterProdiScope: (tenantId: number) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
}

/** Kunci `sessionStorage` penanda scope portal. Lihat `portalScope`. */
const PORTAL_SCOPE_KEY = 'portal_scope_active';

function readPortalScope(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(PORTAL_SCOPE_KEY) === '1';
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
      let activeTenantId: number | null = null;
      try {
        const contextRes = await api.get<{ activeTenantId: number }>('/admin/access-context');
        activeTenantId = contextRes.data.activeTenantId;
      } catch {
        // Akun tanpa penugasan prodi memang tidak punya konteks tenant.
        activeTenantId = null;
      }
      set({ user: meRes.data.user, activeTenantId, userLoading: false });
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
      set({ user: null, activeTenantId: null, portalScope: false });
    }
  },

  /**
   * Mengganti tenant aktif untuk Super Admin yang mengelola banyak prodi.
   *
   * Memilih prodi otomatis keluar dari scope portal, karena sidebar harus
   * berganti ke menu konten program studi.
   */
  setActiveTenant: async (tenantId: number) => {
    sessionStorage.setItem('active_tenant_id', String(tenantId));
    sessionStorage.removeItem(PORTAL_SCOPE_KEY);
    const res = await api.get<{ activeTenantId: number }>('/admin/access-context', {
      params: { tenantId },
    });
    set({ activeTenantId: res.data.activeTenantId, portalScope: false });
    // Reload halaman atau trigger invalidasi data global agar seluruh modul membaca tenant baru
    window.location.reload();
  },

  /**
   * Berpindah ke scope Portal Utama.
   *
   * Tidak menyentuh `activeTenantId` di server: portal bukan program studi.
   * Yang berubah hanya tampilan panel admin (katalog menu portal). Pindah ke
   * scope ini juga membuang cache menu agar sidebar tidak memakai menu prodi.
   */
  enterPortalScope: () => {
    sessionStorage.setItem(PORTAL_SCOPE_KEY, '1');
    set({ portalScope: true });
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
