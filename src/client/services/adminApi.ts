import { api } from './api';
import type { AdminMenuItem, AuthUser } from '../../shared/types/index';

// ---------------------------------------------------------
// Builder
// ---------------------------------------------------------

export interface BuilderWidgetInstance {
  id: number;
  variantCode: string | null;
  sortOrder: number;
  isActive: boolean;
  configJson: string;
  widget: { code: string; name: string; category: string };
}

export interface BuilderSection {
  id: number;
  sectionKey: string;
  title: string | null;
  sortOrder: number;
  isActive: boolean;
  widgets: BuilderWidgetInstance[];
}

export interface BuilderPage {
  id: number;
  slug: string;
  title: string;
  layout: string;
  isPublished: boolean;
  isSystem: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: BuilderSection[];
  _count?: { sections: number };
}

export interface WidgetDefinition {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string | null;
  defaultJson: string;
  variants: Array<{ code: string; name: string; previewUrl: string | null }>;
}

export const builderApi = {
  pages: () => api.get<{ pages: BuilderPage[] }>('/admin/pages'),
  page: (id: number) => api.get<{ page: BuilderPage }>(`/admin/pages/${id}`),
  createPage: (data: { slug: string; title: string; layout?: string }) => api.post('/admin/pages', data),
  updatePage: (id: number, data: Record<string, unknown>) => api.put(`/admin/pages/${id}`, data),
  deletePage: (id: number) => api.delete(`/admin/pages/${id}`),
  publishPage: (id: number) => api.post(`/admin/pages/${id}/publish`),
  unpublishPage: (id: number) => api.post(`/admin/pages/${id}/unpublish`),
  preview: (id: number) => api.get(`/admin/pages/${id}/preview`),
  versions: (id: number) => api.get(`/admin/pages/${id}/versions`),

  createSection: (pageId: number, data: { sectionKey: string; title?: string | null }) =>
    api.post(`/admin/pages/${pageId}/sections`, data),
  updateSection: (id: number, data: Record<string, unknown>) => api.put(`/admin/sections/${id}`, data),
  deleteSection: (id: number) => api.delete(`/admin/sections/${id}`),
  reorderSections: (pageId: number, items: Array<{ id: number; sortOrder: number }>) =>
    api.put(`/admin/pages/${pageId}/sections/reorder`, { items }),

  addWidget: (sectionId: number, data: { widgetCode: string; variantCode?: string | null; config: Record<string, unknown> }) =>
    api.post(`/admin/sections/${sectionId}/widgets`, data),
  updateWidget: (id: number, data: Record<string, unknown>) => api.put(`/admin/section-widgets/${id}`, data),
  deleteWidget: (id: number) => api.delete(`/admin/section-widgets/${id}`),
  duplicateWidget: (id: number) => api.post(`/admin/section-widgets/${id}/duplicate`),
  reorderWidgets: (sectionId: number, items: Array<{ id: number; sortOrder: number }>) =>
    api.put(`/admin/sections/${sectionId}/widgets/reorder`, { items }),

  widgets: () => api.get<{ widgets: WidgetDefinition[] }>('/admin/widgets'),
};

// ---------------------------------------------------------
// Pengaturan website
// ---------------------------------------------------------

export interface WebsiteSetting {
  siteTitle: string;
  siteTagline: string | null;
  univName: string;
  facultyName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  seoImageUrl: string | null;
  copyrightText: string | null;
}

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  fontHeading: string;
  fontBody: string;
  radius: string;
  shadow: string;
  buttonStyle: string;
  headerLayout: string;
  footerLayout: string;
  containerWidth: string;
}

export interface MenuItem {
  id: number;
  parentId?: number | null;
  title: string;
  url: string;
  target: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  children?: MenuItem[];
}

export const settingsApi = {
  get: () =>
    api.get<{
      setting: WebsiteSetting | null;
      theme: Theme | null;
      studyProgram: {
        id: number;
        name: string;
        code: string;
        slug: string;
        degree: string;
        description: string | null;
        logoUrl: string | null;
        status: string;
        faculty: { name: string };
        domains: Array<{ id: number; hostname: string; isPrimary: boolean; isActive: boolean }>;
      };
    }>('/admin/settings'),
  update: (data: Partial<WebsiteSetting>) => api.put<{ setting: WebsiteSetting }>('/admin/settings', data),
  updateTheme: (data: Partial<Theme>) => api.put<{ theme: Theme }>('/admin/settings/theme', data),

  menus: () => api.get<{ menus: MenuItem[] }>('/admin/menus'),
  createMenu: (data: Partial<MenuItem>) => api.post('/admin/menus', data),
  updateMenu: (id: number, data: Partial<MenuItem>) => api.put(`/admin/menus/${id}`, data),
  deleteMenu: (id: number) => api.delete(`/admin/menus/${id}`),
  reorderMenus: (items: Array<{ id: number; sortOrder: number }>) => api.put('/admin/menus/reorder', { items }),
};

// ---------------------------------------------------------
// Hero Slider Program Studi (dikelola per prodi aktif)
// ---------------------------------------------------------

/** Satu slide banner. Struktur mengikuti `config.slides` widget hero_slider. */
export interface HeroSlide {
  imageUrl: string;
  alt: string;
  linkUrl: string;
}

export interface HeroSliderConfig {
  slides: HeroSlide[];
  autoplayMs: number;
  showDots: boolean;
}

export interface HeroSliderResponse {
  /** `null` saat yang dikelola adalah banner Portal Pusat (bukan prodi). */
  studyProgram: { id: number; code: string; name: string; degree: string } | null;
  /** `null` saat scope portal, karena halaman portal tidak berasal dari Page Builder. */
  page: { id: number; slug: string } | null;
  config: HeroSliderConfig;
}

/** Pilihan banner hero: milik Portal Pusat atau milik satu program studi. */
export type HeroScope = 'portal' | 'prodi';

export const portalApi = {
  /**
   * Slide hero milik scope terpilih.
   *
   * `scope=portal` membaca banner beranda portal pusat; `scope=prodi` membaca
   * banner prodi aktif (tenant ditentukan header/interceptor).
   */
  heroSlides: (scope: HeroScope = 'prodi') =>
    api.get<HeroSliderResponse>('/admin/portal/hero-slides', {
      params: scope === 'portal' ? { scope: 'portal' } : {},
    }),
  /** Menyimpan seluruh daftar slide sekaligus. */
  saveHeroSlides: (
    payload: { slides: HeroSlide[]; autoplayMs?: number; showDots?: boolean },
    scope: HeroScope = 'prodi',
  ) =>
    api.put<{ slides: HeroSlide[] }>(
      '/admin/portal/hero-slides',
      payload,
      { params: scope === 'portal' ? { scope: 'portal' } : {} },
    ),
};

// ---------------------------------------------------------
// Dashboard
// ---------------------------------------------------------

export interface DashboardStats {
  curriculums: number;
  semesters: number;
  courses: number;
  totalCredits: number;
  lecturers: number;
  documents: number;
  facilities: number;
  postsPublished: number;
  postsDraft: number;
  galleries: number;
  pages: number;
  unreadMessages: number;
  mediaAssets: number;
}

export interface AuditEntry {
  id: number;
  action: string;
  module: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  user: { name: string } | null;
  studyProgram?: { name: string } | null;
}

export const dashboardApi = {
  stats: () =>
    api.get<{
      stats: DashboardStats;
      recentPosts: Array<{ id: number; title: string; status: string; updatedAt: string }>;
      recentAudit: AuditEntry[];
    }>('/admin/dashboard'),
  superStats: () =>
    api.get<{
      stats: {
        faculties: number;
        studyPrograms: number;
        activeDomains: number;
        inactiveDomains: number;
        users: number;
        totalPosts: number;
        totalDocuments: number;
      };
      domains: Array<{
        id: number;
        hostname: string;
        isPrimary: boolean;
        isActive: boolean;
        studyProgram: { id: number; name: string; code: string; status: string; faculty: { name: string } };
      }>;
      recentAudit: AuditEntry[];
    }>('/admin/dashboard/super'),
  auditLogs: () => api.get<{ logs: AuditEntry[] }>('/admin/audit-logs'),
};

// ---------------------------------------------------------
// Pengguna & RBAC
// ---------------------------------------------------------

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  username: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  userRoles: Array<{
    id: number;
    scopeType: string;
    role: { code: string; name: string };
    studyProgram: { id: number; name: string } | null;
    faculty: { id: number; name: string } | null;
    UserRolePermissionGroup: Array<{ permissionGroup: { code: string; name: string } }>;
  }>;
}

export const userApi = {
  list: () => api.get<{ users: ManagedUser[] }>('/admin/users'),
  get: (id: number) => api.get<{ user: ManagedUser }>(`/admin/users/${id}`),
  create: (data: { name: string; email: string; username: string; password: string }) =>
    api.post('/admin/users', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  assignRole: (
    id: number,
    data: { roleCode: string; scopeType: string; studyProgramId?: number | null; permissionGroupCodes?: string[] },
  ) => api.post(`/admin/users/${id}/roles`, data),
  revokeRole: (userId: number, assignmentId: number) => api.delete(`/admin/users/${userId}/roles/${assignmentId}`),
  roles: () => api.get<{ roles: Array<{ id: number; code: string; name: string; rolePermissions: Array<{ permission: { code: string; name: string; module: string } }> }> }>('/admin/users/meta/roles'),
  permissionGroups: () =>
    api.get<{ groups: Array<{ id: number; code: string; name: string; items: Array<{ permission: { code: string } }> }> }>(
      '/admin/users/meta/permission-groups',
    ),
};

// ---------------------------------------------------------
// Organisasi (Super Admin)
// ---------------------------------------------------------

export const organizationApi = {
  faculties: () => api.get<{ faculties: Array<{ id: number; code: string; name: string; slug: string; isActive: boolean; _count: { studyPrograms: number } }> }>('/admin/faculties'),
  createFaculty: (data: Record<string, unknown>) => api.post('/admin/faculties', data),
  updateFaculty: (id: number, data: Record<string, unknown>) => api.put(`/admin/faculties/${id}`, data),
  deleteFaculty: (id: number) => api.delete(`/admin/faculties/${id}`),

  studyPrograms: () =>
    api.get<{
      studyPrograms: Array<{
        id: number;
        code: string;
        name: string;
        slug: string;
        degree: string;
        status: string;
        faculty: { id: number; name: string; code: string };
        domains: Array<{ id: number; hostname: string; isPrimary: boolean; isActive: boolean }>;
        _count: { userRoleAssignments: number; posts: number; lecturers: number };
      }>;
    }>('/admin/study-programs'),
  createStudyProgram: (data: Record<string, unknown>) => api.post('/admin/study-programs', data),
  updateStudyProgram: (id: number, data: Record<string, unknown>) => api.put(`/admin/study-programs/${id}`, data),
  deleteStudyProgram: (id: number) => api.delete(`/admin/study-programs/${id}`),

  domains: () =>
    api.get<{
      domains: Array<{
        id: number;
        hostname: string;
        isPrimary: boolean;
        isActive: boolean;
        studyProgram: { id: number; name: string; code: string; status: string };
      }>;
    }>('/admin/domains'),
  createDomain: (data: Record<string, unknown>) => api.post('/admin/domains', data),
  updateDomain: (id: number, data: Record<string, unknown>) => api.put(`/admin/domains/${id}`, data),
  deleteDomain: (id: number) => api.delete(`/admin/domains/${id}`),

  auditLogs: (tenantId?: number) =>
    api.get<{ logs: AuditEntry[] }>('/admin/audit-logs', { params: tenantId ? { tenantId } : {} }),
};

// ---------------------------------------------------------
// Media
// ---------------------------------------------------------

export interface MediaAsset {
  id: number;
  filename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  altText: string | null;
  isPublic: boolean;
  createdAt: string;
  uploadedBy: { name: string } | null;
}

export const mediaApi = {
  list: () => api.get<{ assets: MediaAsset[] }>('/admin/media'),
  upload: (file: File, altText?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (altText) form.append('altText', altText);
    return api.post<{ asset: MediaAsset & { url: string } }>('/admin/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (id: number) => api.delete(`/admin/media/${id}`),
};

// ---------------------------------------------------------
// Menu admin & sesi
// ---------------------------------------------------------

/**
 * Scope panel admin.
 *
 * - `portal` — Portal Utama / website universitas. Tidak punya tenant, jadi
 *   TIDAK boleh menampilkan menu konten program studi (Profil, Visi & Misi,
 *   Kurikulum, Dosen, Sarpras, Berita, Galeri, Kontak, Pesan Masuk), karena
 *   landing page portal tidak memuat konten tersebut.
 * - `prodi` — Satu program studi. Semua menu konten tersedia.
 */
export type AdminMenuScope = 'portal' | 'prodi';

/** Satu baris katalog menu sebelum disusun menjadi hierarki. */
type MenuEntry = Omit<AdminMenuItem, 'children'> & { requiredPermission: string; scopeType: string };

/**
 * Katalog menu scope PORTAL UTAMA.
 *
 * Sengaja hanya berisi modul tata kelola universitas: dashboard portal, banner
 * beranda portal, registri website prodi, domain, struktur organisasi, akses
 * pengguna, dan audit. Tidak ada satu pun menu konten prodi di sini.
 */
const CATALOG_PORTAL: MenuEntry[] = [
  {
    menuKey: 'portal.dashboard',
    label: 'Dashboard Portal',
    desc: 'Ringkasan website universitas',
    route: '/admin/portal-utama',
    icon: 'Squares2X2Icon',
    parentKey: null,
    sortOrder: 1,
    section: 'UTAMA',
    requiredPermission: 'dashboard.view',
    scopeType: 'global',
  },
  {
    menuKey: 'portal.hero',
    label: 'Hero Slider Beranda',
    desc: 'Banner beranda portal pusat',
    route: '/admin/portal',
    icon: 'PhotoIcon',
    parentKey: null,
    sortOrder: 5,
    section: 'WEBSITE',
    requiredPermission: 'website.view',
    scopeType: 'global',
  },
  {
    menuKey: 'super.websites',
    label: 'Website Prodi',
    desc: 'Daftar 14 portal program studi',
    route: '/admin/website-list',
    icon: 'GlobeAltIcon',
    parentKey: null,
    sortOrder: 10,
    section: 'UNIVERSITAS',
    requiredPermission: 'tenant.view',
    scopeType: 'global',
  },
  {
    menuKey: 'super.domains',
    label: 'Domain & Routing',
    desc: 'Hostname tiap subdomain prodi',
    route: '/admin/domain',
    icon: 'LinkIcon',
    parentKey: null,
    sortOrder: 11,
    section: 'UNIVERSITAS',
    requiredPermission: 'domain.view',
    scopeType: 'global',
  },
  {
    menuKey: 'super.organization',
    label: 'Struktur Organisasi',
    desc: 'Fakultas & program studi',
    route: '/admin/organisasi',
    icon: 'BuildingLibraryIcon',
    parentKey: null,
    sortOrder: 12,
    section: 'UNIVERSITAS',
    requiredPermission: 'organization.view',
    scopeType: 'global',
  },
  {
    menuKey: 'management.access',
    label: 'Akses & Pengguna',
    desc: 'Akun, peran & katalog izin',
    route: '/admin/pengguna',
    icon: 'UsersIcon',
    parentKey: null,
    sortOrder: 20,
    section: 'TATA KELOLA',
    requiredPermission: 'users.view',
    scopeType: 'global',
  },
  {
    menuKey: 'super.audit',
    label: 'Audit Aktivitas',
    desc: 'Rekam jejak tindakan admin',
    route: '/admin/audit-logs',
    icon: 'ClipboardDocumentListIcon',
    parentKey: null,
    sortOrder: 21,
    section: 'TATA KELOLA',
    requiredPermission: 'audit_logs.view',
    scopeType: 'global',
  },
];

let cachedMenu: Record<AdminMenuScope, AdminMenuItem[] | null> = { portal: null, prodi: null };
let menuPromise: Record<AdminMenuScope, Promise<AdminMenuItem[]> | null> = { portal: null, prodi: null };

export const adminMenuApi = {
  /** Menu yang sudah dibangun untuk scope tertentu (dipakai agar sidebar tidak berkedip). */
  getCachedMenu(scope: AdminMenuScope = 'prodi'): AdminMenuItem[] | null {
    return cachedMenu[scope];
  },

  clearCache(): void {
    cachedMenu = { portal: null, prodi: null };
    menuPromise = { portal: null, prodi: null };
  },

  /**
   * Menu dibangun dari kombinasi permission pengguna dan katalog scope.
   *
   * Katalog berbeda untuk `portal` dan `prodi`; cache disimpan per scope agar
   * berpindah scope tidak menampilkan menu scope sebelumnya.
   */
  async buildMenu(scope: AdminMenuScope = 'prodi', forceRefresh = false): Promise<AdminMenuItem[]> {
    if (cachedMenu[scope] && !forceRefresh) {
      return cachedMenu[scope];
    }
    if (menuPromise[scope] && !forceRefresh) {
      return menuPromise[scope];
    }

    menuPromise[scope] = (async () => {
      try {
        const res = await api.get<{ user: AuthUser }>('/auth/me');
        const user = res.data.user;
        const codes = new Set(user.permissions);
        const isSuper = user.permissions.includes('*');

        // Katalog menu diambil dari backend lewat endpoint yang sama dengan settings
        // agar isi menu tidak ditulis ulang di dua tempat.
        //
        // Scope portal memakai katalog sendiri (CATALOG_PORTAL) yang tidak memuat
        // menu konten prodi sama sekali.
        const catalog: MenuEntry[] = scope === 'portal' ? CATALOG_PORTAL : [
          // 1. UTAMA
          {
            menuKey: 'dashboard',
            label: 'Dashboard',
            desc: 'Ikhtisar & metrik website',
            route: '/admin',
            icon: 'Squares2X2Icon',
            parentKey: null,
            sortOrder: 1,
            section: 'UTAMA',
            requiredPermission: 'dashboard.view',
            scopeType: 'prodi',
          },

          // 2. KONTEN & AKADEMIK PRODI
          {
            menuKey: 'content.profile',
            label: 'Profil Program Studi',
            desc: 'Sejarah, deskripsi & sasaran',
            route: '/admin/konten/profil',
            icon: 'UserIcon',
            parentKey: null,
            sortOrder: 9,
            section: 'KONTEN',
            requiredPermission: 'profile.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.vision',
            label: 'Visi & Misi Program Studi',
            desc: 'Visi, misi & sasaran strategis',
            route: '/admin/konten/visi-misi',
            icon: 'EyeIcon',
            parentKey: null,
            sortOrder: 9.5,
            section: 'KONTEN',
            requiredPermission: 'vision_mission.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.curriculum',
            label: 'Kurikulum',
            desc: 'Mata kuliah & bobot SKS',
            route: '/admin/kurikulum',
            icon: 'BookOpenIcon',
            parentKey: null,
            sortOrder: 10,
            section: 'KONTEN',
            requiredPermission: 'curriculum.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.lecturers',
            label: 'Dosen',
            desc: 'Profil dosen & staf pengajar',
            route: '/admin/dosen',
            icon: 'UserGroupIcon',
            parentKey: null,
            sortOrder: 11,
            section: 'KONTEN',
            requiredPermission: 'lecturers.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.documents',
            label: 'Dokumen',
            desc: 'Arsip kurikulum & formulir',
            route: '/admin/dokumen',
            icon: 'FolderOpenIcon',
            parentKey: null,
            sortOrder: 12,
            section: 'KONTEN',
            requiredPermission: 'documents.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.facilities',
            label: 'Sarana & Prasarana',
            desc: 'Laboratorium & fasilitas prodi',
            route: '/admin/sarpras',
            icon: 'BuildingOfficeIcon',
            parentKey: null,
            sortOrder: 13,
            section: 'KONTEN',
            requiredPermission: 'facilities.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.posts',
            label: 'Berita',
            desc: 'Warta kegiatan program studi',
            route: '/admin/berita',
            icon: 'NewspaperIcon',
            parentKey: null,
            sortOrder: 14,
            section: 'KONTEN',
            requiredPermission: 'posts.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.galleries',
            label: 'Galeri',
            desc: 'Dokumentasi foto & event',
            route: '/admin/galeri',
            icon: 'PhotoIcon',
            parentKey: null,
            sortOrder: 15,
            section: 'KONTEN',
            requiredPermission: 'galleries.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.contact',
            label: 'Kontak',
            desc: 'Alamat, telepon & media sosial',
            route: '/admin/kontak',
            icon: 'PhoneIcon',
            parentKey: null,
            sortOrder: 16,
            section: 'KONTEN',
            requiredPermission: 'contacts.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'content.messages',
            label: 'Pesan Masuk',
            desc: 'Pesan dari formulir kontak',
            route: '/admin/pesan',
            icon: 'InboxIcon',
            parentKey: null,
            sortOrder: 17,
            section: 'KONTEN',
            requiredPermission: 'contact_messages.view',
            scopeType: 'prodi',
          },

          // 3. TATA KELOLA WEBSITE PRODI
          {
            menuKey: 'builder',
            label: 'Visual Page Builder',
            desc: 'Susun tata letak halaman',
            route: '/admin/builder',
            icon: 'AdjustmentsHorizontalIcon',
            parentKey: null,
            sortOrder: 20,
            section: 'WEBSITE',
            requiredPermission: 'builder.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'portal.hero',
            label: 'Hero Slider',
            desc: 'Banner beranda tiap program studi',
            route: '/admin/portal',
            icon: 'PhotoIcon',
            parentKey: null,
            sortOrder: 22,
            section: 'WEBSITE',
            requiredPermission: 'website.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'website.settings',
            label: 'Identitas, Tema & SEO',
            desc: 'Profil, warna identitas, dan optimasi SEO',
            route: '/admin/pengaturan',
            icon: 'Cog6ToothIcon',
            parentKey: null,
            sortOrder: 21,
            section: 'WEBSITE',
            requiredPermission: 'website.view',
            scopeType: 'prodi',
          },

          // 4. AKSES & TATA KELOLA RBAC
          {
            menuKey: 'management.media',
            label: 'Media Library',
            desc: 'Manajemen berkas & gambar',
            route: '/admin/media',
            icon: 'PhotoIcon',
            parentKey: null,
            sortOrder: 30,
            section: 'TATA KELOLA',
            requiredPermission: 'media.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'management.users',
            label: 'Manajemen Pengguna',
            desc: 'Daftar akun & penugasan peran',
            route: '/admin/pengguna',
            icon: 'UsersIcon',
            parentKey: null,
            sortOrder: 31,
            section: 'TATA KELOLA',
            requiredPermission: 'users.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'management.roles',
            label: 'Peran (Roles)',
            desc: 'Alokasi peran 14 prodi',
            route: '/admin/peran',
            icon: 'ShieldCheckIcon',
            parentKey: null,
            sortOrder: 32,
            section: 'TATA KELOLA',
            requiredPermission: 'users.view',
            scopeType: 'prodi',
          },
          {
            menuKey: 'management.permissions',
            label: 'Katalog Izin',
            desc: 'Hak akses granular modul',
            route: '/admin/izin',
            icon: 'KeyIcon',
            parentKey: null,
            sortOrder: 33,
            section: 'TATA KELOLA',
            requiredPermission: 'users.view',
            scopeType: 'prodi',
          },

          // 5. TATA KELOLA UNIVERSITAS (Hanya Super Admin)
          {
            menuKey: 'super.organization',
            label: 'Struktur Organisasi',
            desc: 'Fakultas & 14 Program Studi',
            route: '/admin/organisasi',
            icon: 'BuildingLibraryIcon',
            parentKey: null,
            sortOrder: 40,
            section: 'UNIVERSITAS',
            requiredPermission: 'organization.view',
            scopeType: 'global',
          },
          {
            menuKey: 'super.domains',
            label: 'Routing & Domain',
            desc: 'Subdomain hostname prodi',
            route: '/admin/domain',
            icon: 'LinkIcon',
            parentKey: null,
            sortOrder: 41,
            section: 'UNIVERSITAS',
            requiredPermission: 'domain.view',
            scopeType: 'global',
          },
          {
            menuKey: 'super.audit',
            label: 'Audit Log Aktivitas',
            desc: 'Rekam jejak tindakan admin',
            route: '/admin/audit-logs',
            icon: 'ClipboardDocumentListIcon',
            parentKey: null,
            sortOrder: 42,
            section: 'UNIVERSITAS',
            requiredPermission: 'audit_logs.view',
            scopeType: 'global',
          },
        ];

        const visible = catalog.filter((item) => {
          const allowed = isSuper || codes.has(item.requiredPermission);
          if (!allowed) return false;
          // Menu global (tata kelola universitas) hanya relevan untuk Super Admin.
          if (item.scopeType === 'global' && !isSuper) return false;
          return true;
        });

        // Menyusun hierarki dan membuang induk yang seluruh anaknya tidak terlihat.
        const byParent = new Map<string | null, AdminMenuItem[]>();
        for (const item of visible) {
          const node: AdminMenuItem = {
            menuKey: item.menuKey,
            label: item.label,
            desc: item.desc,
            section: item.section,
            route: item.route,
            icon: item.icon,
            parentKey: item.parentKey,
            sortOrder: item.sortOrder,
            children: [],
          };
          const list = byParent.get(item.parentKey) ?? [];
          list.push(node);
          byParent.set(item.parentKey, list);
        }

        for (const [parentKey, children] of byParent) {
          if (parentKey === null) continue;
          const parents = byParent.get(null) ?? [];
          const parent = parents.find((node) => node.menuKey === parentKey);
          if (parent) {
            parent.children = children.sort((a, b) => a.sortOrder - b.sortOrder);
          }
        }

        const result = (byParent.get(null) ?? [])
          .filter((node) => node.children.length > 0 || byParent.has(node.menuKey) === false)
          .filter((node) => {
            // Induk tanpa anak dan tanpa halaman sendiri tidak ditampilkan.
            const isLeaf = (byParent.get(node.menuKey) ?? []).length === 0;
            return !isLeaf || !['website', 'content', 'management'].includes(node.menuKey);
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);

        cachedMenu[scope] = result;
        return result;
      } finally {
        menuPromise[scope] = null;
      }
    })();

    return menuPromise[scope];
  },
};
