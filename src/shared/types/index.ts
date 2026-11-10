/**
 * Tipe bersama antara server dan client.
 *
 * Hanya tipe yang memang dipakai kedua sisi. Tipe khusus database tetap
 * berasal dari Prisma, tipe khusus UI tetap di modul client.
 */

export interface TenantTheme {
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

export interface TenantWebsiteSetting {
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

export interface TenantContact {
  address: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  mapsEmbedUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
}

export interface TenantContext {
  id: number;
  facultyId: number;
  facultyName: string;
  facultyCode: string;
  code: string;
  name: string;
  slug: string;
  degree: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  domain: string;
  theme: TenantTheme;
  websiteSetting: TenantWebsiteSetting;
  contact: TenantContact | null;
}

/** Permukaan aplikasi yang ditentukan dari hostname terverifikasi. */
export type SiteSurface = 'main' | 'prodi' | 'admin';

export interface SiteResolution {
  surface: SiteSurface;
  hostname: string;
  tenant: TenantContext | null;
}

export interface AuthUserRole {
  roleCode: string;
  roleName: string;
  scopeType: string;
  studyProgramId: number | null;
  facultyId: number | null;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  roles: AuthUserRole[];
  permissions: string[];
  /** Tenant yang boleh dikelola user ini. Kosong berarti tidak terikat tenant. */
  tenantIds: number[];
  isSuperAdmin: boolean;
}

export interface AdminMenuItem {
  menuKey: string;
  label: string;
  route: string;
  icon: string | null;
  parentKey: string | null;
  sortOrder: number;
  section?: 'UTAMA' | 'KONTEN' | 'WEBSITE' | 'TATA KELOLA' | 'UNIVERSITAS';
  desc?: string;
  badge?: string;
  children: AdminMenuItem[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}
