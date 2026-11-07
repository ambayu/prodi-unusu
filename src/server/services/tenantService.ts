import { prisma } from '../prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import type { SiteResolution, SiteSurface, TenantContext } from '../../shared/types/index.js';

/**
 * Normalisasi hostname dari header Host.
 *
 * Host yang diterima dari proxy dapat memuat port dan kapitalisasi. Fungsi ini
 * hanya membersihkan bentuk, bukan memutuskan kepercayaan.
 */
export function normalizeHostname(rawHost: string | undefined): string {
  if (!rawHost) return '';
  const withoutPort = rawHost.split(',')[0].trim().split(':')[0].trim().toLowerCase();
  return withoutPort.replace(/\.$/, '');
}

/** Menentukan permukaan aplikasi dari hostname yang sudah dibersihkan. */
export function classifySurface(hostname: string): SiteSurface {
  if (!hostname) return 'main';
  if (config.mainSiteHosts.includes(hostname)) return 'main';

  // Portal admin dilayani dari hostname yang terdaftar di ADMIN_HOST.
  if (hostname === config.adminHost) return 'admin';

  // Mode pratinjau lokal.
  //
  // Tanpa ini, website prodi tidak dapat dibuka sama sekali di mesin
  // pengembang karena localhost bukan hostname tenant. Pratinjau hanya aktif
  // bila ALLOW_LOCAL_PREVIEW=true, dan hanya untuk host loopback. Host asing
  // tetap harus terdaftar di tabel domains, jadi aturan "tolak domain tidak
  // dikenal" pada docs/ARCHITECTURE.md bagian 4 tidak dilonggarkan.
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLoopback) {
    if (config.dev.allowLocalPreview && config.dev.previewHost) return 'prodi';
    return 'admin';
  }

  return 'prodi';
}

/**
 * Hostname yang benar-benar dipakai untuk pencarian tenant.
 *
 * Pada pratinjau lokal, `localhost` dipetakan ke satu hostname tenant yang
 * dipilih pengembang lewat PREVIEW_HOST. Pemetaan ini hanya berlaku bila
 * permukaannya memang prodi.
 */
export function resolveLookupHostname(hostname: string, surface: SiteSurface): string {
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (surface === 'prodi' && isLoopback && config.dev.previewHost) {
    return config.dev.previewHost.toLowerCase();
  }
  return hostname;
}

function toTenantContext(
  studyProgram: {
    id: number;
    facultyId: number;
    code: string;
    name: string;
    slug: string;
    degree: string;
    description: string | null;
    logoUrl: string | null;
    status: string;
    faculty: { name: string; code: string };
    theme: {
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
    } | null;
    websiteSetting: {
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
    } | null;
    contactInfo: {
      address: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      mapsEmbedUrl: string | null;
      instagramUrl: string | null;
      facebookUrl: string | null;
      youtubeUrl: string | null;
    } | null;
  },
  hostname: string,
): TenantContext {
  const theme = studyProgram.theme;
  const setting = studyProgram.websiteSetting;

  return {
    id: studyProgram.id,
    facultyId: studyProgram.facultyId,
    facultyName: studyProgram.faculty.name,
    facultyCode: studyProgram.faculty.code,
    code: studyProgram.code,
    name: studyProgram.name,
    slug: studyProgram.slug,
    degree: studyProgram.degree,
    description: studyProgram.description,
    logoUrl: studyProgram.logoUrl,
    status: studyProgram.status,
    domain: hostname,
    theme: {
      primaryColor: theme?.primaryColor ?? '#1e3a8a',
      secondaryColor: theme?.secondaryColor ?? '#0f172a',
      accentColor: theme?.accentColor ?? '#fbbf24',
      backgroundColor: theme?.backgroundColor ?? '#FFFFFF',
      foregroundColor: theme?.foregroundColor ?? '#111827',
      fontHeading: theme?.fontHeading ?? 'Plus Jakarta Sans',
      fontBody: theme?.fontBody ?? 'Plus Jakarta Sans',
      radius: theme?.radius ?? '0.75rem',
      shadow: theme?.shadow ?? 'sm',
      buttonStyle: theme?.buttonStyle ?? 'solid',
      headerLayout: theme?.headerLayout ?? 'modern',
      footerLayout: theme?.footerLayout ?? 'multi-column',
      containerWidth: theme?.containerWidth ?? '1280px',
    },
    websiteSetting: {
      siteTitle: setting?.siteTitle ?? `Program Studi ${studyProgram.name}`,
      siteTagline: setting?.siteTagline ?? null,
      univName: setting?.univName ?? 'Universitas Nahdlatul Ulama Sumatera Utara',
      facultyName: setting?.facultyName ?? studyProgram.faculty.name,
      logoUrl: setting?.logoUrl ?? studyProgram.logoUrl ?? '/logo-unusu.jpg',
      faviconUrl: setting?.faviconUrl ?? '/logo-unusu.jpg',
      seoTitle: setting?.seoTitle ?? null,
      seoDescription: setting?.seoDescription ?? studyProgram.description,
      seoKeywords: setting?.seoKeywords ?? null,
      seoImageUrl: setting?.seoImageUrl ?? null,
      copyrightText: setting?.copyrightText ?? null,
    },
    contact: studyProgram.contactInfo,
  };
}

const tenantInclude = {
  faculty: { select: { name: true, code: true } },
  theme: true,
  websiteSetting: true,
  contactInfo: true,
} as const;

/**
 * Menyelesaikan permukaan dan tenant dari hostname.
 *
 * Aturan dari docs/ARCHITECTURE.md bagian 4: domain tidak dikenal atau nonaktif
 * harus ditolak, bukan diarahkan ke tenant default. Tidak ada fallback ke prodi
 * tertentu, karena fallback seperti itu membuat satu prodi tampil di semua
 * domain yang salah konfigurasi.
 */
export async function resolveSite(hostname: string, surface: SiteSurface): Promise<SiteResolution> {
  if (surface !== 'prodi') {
    return { surface, hostname, tenant: null };
  }

  const lookupHostname = resolveLookupHostname(hostname, surface);

  const domain = await prisma.domain.findUnique({
    where: { hostname: lookupHostname },
    include: {
      studyProgram: { include: tenantInclude },
    },
  });

  if (!domain || !domain.isActive) {
    throw AppError.notFound(
      `Domain "${lookupHostname}" belum terdaftar sebagai website program studi. Hubungi administrator universitas.`,
      'DOMAIN_NOT_REGISTERED',
    );
  }

  if (domain.studyProgram.status !== 'active') {
    throw AppError.forbidden(
      `Website "${domain.studyProgram.name}" sedang tidak aktif.`,
      'TENANT_INACTIVE',
    );
  }

  return {
    surface,
    hostname,
    tenant: toTenantContext(domain.studyProgram, lookupHostname),
  };
}

/** Mengambil tenant berdasarkan ID untuk operasi backend yang sudah terotorisasi. */
export async function getTenantContextById(studyProgramId: number): Promise<TenantContext> {
  const studyProgram = await prisma.studyProgram.findUnique({
    where: { id: studyProgramId },
    include: tenantInclude,
  });

  if (!studyProgram) {
    throw AppError.notFound('Program studi tidak ditemukan.', 'TENANT_NOT_FOUND');
  }

  const primaryDomain = await prisma.domain.findFirst({
    where: { studyProgramId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
    select: { hostname: true },
  });

  return toTenantContext(studyProgram, primaryDomain?.hostname ?? '');
}
