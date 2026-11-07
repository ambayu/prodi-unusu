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
  title: string;
  url: string;
  target: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
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

export const adminMenuApi = {
  /** Menu dibangun dari kombinasi permission pengguna dan katalog database. */
  async buildMenu(): Promise<AdminMenuItem[]> {
    const res = await api.get<{ user: AuthUser }>('/auth/me');
    const user = res.data.user;
    const codes = new Set(user.permissions);
    const isSuper = user.permissions.includes('*');

    // Katalog menu diambil dari backend lewat endpoint yang sama dengan settings
    // agar isi menu tidak ditulis ulang di dua tempat.
    const catalog: Array<Omit<AdminMenuItem, 'children'> & { requiredPermission: string; scopeType: string }> = [
      { menuKey: 'dashboard', label: 'Dashboard', route: '/admin', icon: 'HomeIcon', parentKey: null, sortOrder: 1, requiredPermission: 'dashboard.view', scopeType: 'prodi' },

      { menuKey: 'website', label: 'Website', route: '/admin/website', icon: 'GlobeAltIcon', parentKey: null, sortOrder: 10, requiredPermission: 'website.view', scopeType: 'prodi' },
      { menuKey: 'website.identity', label: 'Identitas Website', route: '/admin/website/identitas', icon: 'IdentificationIcon', parentKey: 'website', sortOrder: 11, requiredPermission: 'website.view', scopeType: 'prodi' },
      { menuKey: 'website.navigation', label: 'Navigasi', route: '/admin/website/navigasi', icon: 'Bars3Icon', parentKey: 'website', sortOrder: 12, requiredPermission: 'navigation.view', scopeType: 'prodi' },
      { menuKey: 'website.theme', label: 'Tema', route: '/admin/website/tema', icon: 'SwatchIcon', parentKey: 'website', sortOrder: 13, requiredPermission: 'theme.view', scopeType: 'prodi' },
      { menuKey: 'website.seo', label: 'SEO', route: '/admin/website/seo', icon: 'MagnifyingGlassIcon', parentKey: 'website', sortOrder: 14, requiredPermission: 'seo.view', scopeType: 'prodi' },

      { menuKey: 'builder', label: 'Page Builder', route: '/admin/builder', icon: 'AdjustmentsHorizontalIcon', parentKey: null, sortOrder: 20, requiredPermission: 'builder.view', scopeType: 'prodi' },

      { menuKey: 'content', label: 'Konten', route: '/admin/konten', icon: 'DocumentTextIcon', parentKey: null, sortOrder: 30, requiredPermission: 'profile.view', scopeType: 'prodi' },
      { menuKey: 'content.profile', label: 'Profil', route: '/admin/konten/profil', icon: 'UserIcon', parentKey: 'content', sortOrder: 31, requiredPermission: 'profile.view', scopeType: 'prodi' },
      { menuKey: 'content.vision', label: 'Visi & Misi', route: '/admin/konten/visi-misi', icon: 'EyeIcon', parentKey: 'content', sortOrder: 32, requiredPermission: 'vision_mission.view', scopeType: 'prodi' },
      { menuKey: 'content.curriculum', label: 'Kurikulum', route: '/admin/kurikulum', icon: 'BookOpenIcon', parentKey: 'content', sortOrder: 33, requiredPermission: 'curriculum.view', scopeType: 'prodi' },
      { menuKey: 'content.documents', label: 'Dokumen', route: '/admin/dokumen', icon: 'FolderOpenIcon', parentKey: 'content', sortOrder: 34, requiredPermission: 'documents.view', scopeType: 'prodi' },
      { menuKey: 'content.lecturers', label: 'Dosen', route: '/admin/dosen', icon: 'UserGroupIcon', parentKey: 'content', sortOrder: 35, requiredPermission: 'lecturers.view', scopeType: 'prodi' },
      { menuKey: 'content.facilities', label: 'Sarpras', route: '/admin/sarpras', icon: 'BuildingOfficeIcon', parentKey: 'content', sortOrder: 36, requiredPermission: 'facilities.view', scopeType: 'prodi' },
      { menuKey: 'content.posts', label: 'Berita', route: '/admin/berita', icon: 'NewspaperIcon', parentKey: 'content', sortOrder: 37, requiredPermission: 'posts.view', scopeType: 'prodi' },
      { menuKey: 'content.galleries', label: 'Galeri', route: '/admin/galeri', icon: 'PhotoIcon', parentKey: 'content', sortOrder: 38, requiredPermission: 'galleries.view', scopeType: 'prodi' },
      { menuKey: 'content.contact', label: 'Kontak', route: '/admin/kontak', icon: 'PhoneIcon', parentKey: 'content', sortOrder: 39, requiredPermission: 'contacts.view', scopeType: 'prodi' },
      { menuKey: 'content.messages', label: 'Pesan Masuk', route: '/admin/pesan', icon: 'InboxIcon', parentKey: 'content', sortOrder: 40, requiredPermission: 'contact_messages.view', scopeType: 'prodi' },

      { menuKey: 'management', label: 'Pengelolaan', route: '/admin/pengelolaan', icon: 'Cog6ToothIcon', parentKey: null, sortOrder: 50, requiredPermission: 'media.view', scopeType: 'prodi' },
      { menuKey: 'management.media', label: 'Media Library', route: '/admin/media', icon: 'PhotoIcon', parentKey: 'management', sortOrder: 51, requiredPermission: 'media.view', scopeType: 'prodi' },
      { menuKey: 'management.users', label: 'Pengguna & Editor', route: '/admin/pengguna', icon: 'UsersIcon', parentKey: 'management', sortOrder: 52, requiredPermission: 'users.view', scopeType: 'prodi' },

      { menuKey: 'super.organization', label: 'Organisasi', route: '/admin/organisasi', icon: 'BuildingLibraryIcon', parentKey: null, sortOrder: 60, requiredPermission: 'organization.view', scopeType: 'global' },
      { menuKey: 'super.domains', label: 'Domain', route: '/admin/domain', icon: 'LinkIcon', parentKey: null, sortOrder: 61, requiredPermission: 'domain.view', scopeType: 'global' },
      { menuKey: 'super.audit', label: 'Audit Logs', route: '/admin/audit-logs', icon: 'ClipboardDocumentListIcon', parentKey: null, sortOrder: 62, requiredPermission: 'audit_logs.view', scopeType: 'global' },
    ];

    const visible = catalog.filter((item) => {
      const allowed = isSuper || codes.has(item.requiredPermission);
      if (!allowed) return false;
      // Menu global hanya relevan untuk Super Admin.
      if (item.scopeType === 'global' && !isSuper) return false;
      return true;
    });

    // Menyusun hierarki dan membuang induk yang seluruh anaknya tidak terlihat.
    const byParent = new Map<string | null, AdminMenuItem[]>();
    for (const item of visible) {
      const node: AdminMenuItem = {
        menuKey: item.menuKey,
        label: item.label,
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

    return (byParent.get(null) ?? [])
      .filter((node) => node.children.length > 0 || byParent.has(node.menuKey) === false)
      .filter((node) => {
        // Induk tanpa anak dan tanpa halaman sendiri tidak ditampilkan.
        const isLeaf = (byParent.get(node.menuKey) ?? []).length === 0;
        return !isLeaf || !['website', 'content', 'management'].includes(node.menuKey);
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
};
