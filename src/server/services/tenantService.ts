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

/**
 * Menentukan permukaan aplikasi dari hostname yang sudah dibersihkan.
 *
 * Landing page program studi bersifat publik: pengunjung tidak perlu login.
 * Login hanya diperlukan untuk halaman `/admin`. Karena itu hostname loopback
 * diperlakukan sebagai permukaan prodi pada mode pengembangan, bukan sebagai
 * portal admin, supaya `http://localhost:5180` menampilkan website seperti
 * domain aslinya.
 *
 * Portal admin tetap dapat dibuka dari host mana pun lewat path `/login` dan
 * `/admin`, jadi pemetaan ini tidak menghilangkan akses ke portal.
 */
export function classifySurface(hostname: string): SiteSurface {
  if (!hostname) return 'main';
  if (config.mainSiteHosts.includes(hostname)) return 'main';

  // Portal admin dilayani dari hostname yang terdaftar di ADMIN_HOST.
  if (hostname === config.adminHost) return 'admin';

  // Host loopback memakai permukaan pilihan pengembang.
  //
  // PREVIEW_SURFACE memungkinkan `http://localhost:5180` menampilkan portal,
  // website utama, atau website prodi tanpa menyunting berkas `hosts`.
  // Pemaksaan ini hanya berlaku bila ALLOW_LOCAL_PREVIEW=true dan host
  // benar-benar loopback, sehingga tidak melonggarkan aturan "tolak domain
  // tidak dikenal" pada host publik mana pun.
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLoopback && config.dev.allowLocalPreview) {
    const forced = config.dev.previewSurface;
    if (forced === 'portal' || forced === 'admin') return 'admin';
    if (forced === 'main') return 'main';
    if (forced === 'prodi') return 'prodi';
  }

  if (isLoopback) return 'prodi';

  return 'prodi';
}

/**
 * Hostname yang benar-benar dipakai untuk pencarian tenant.
 *
 * Pada host loopback, `localhost` dipetakan ke hostname tenant yang dipilih
 * pengembang lewat `PREVIEW_HOST`. Bila variabel itu kosong, dipakai tenant
 * aktif pertama sebagai cadangan pada mode pengembangan saja, sehingga
 * `npm run dev` langsung menampilkan website tanpa konfigurasi tambahan.
 */
export function resolveLookupHostname(hostname: string, surface: SiteSurface): string {
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (surface === 'prodi' && isLoopback && config.dev.previewHost) {
    // `localhost` tidak pernah menjadi hostname tenant, jadi tanpa pemetaan ini
    // pencarian selalu gagal dan sistem jatuh ke tenant pertama. Nilai yang
    // berisi nama pendek (mis. "tif") dilengkapi menjadi hostname penuh.
    const target = config.dev.previewHost.toLowerCase();
    return target.includes('.') ? target : `${target}.unusu.ac.id`;
  }
  return hostname;
}

/** Apakah hostname ini loopback dan perlu tenant cadangan. */
export function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
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
 * Aturan dari docs/ARCHITECTURE.md bagian 4: domain publik yang tidak dikenal
 * atau nonaktif harus ditolak, bukan diarahkan ke tenant default. Fallback
 * seperti itu akan membuat satu prodi tampil di semua domain yang salah
 * konfigurasi.
 *
 * Pengecualian hanya berlaku untuk host loopback pada mode pengembangan: di
 * sana tidak ada domain yang bisa dicocokkan, sehingga dipakai PREVIEW_HOST,
 * atau tenant aktif pertama bila variabel itu kosong. Pengecualian ini tidak
 * pernah menyentuh hostname publik.
 */
export async function resolveSite(hostname: string, surface: SiteSurface): Promise<SiteResolution> {
  if (surface !== 'prodi') {
    return { surface, hostname, tenant: null };
  }

  const loopback = isLoopbackHostname(hostname);
  const lookupHostname = resolveLookupHostname(hostname, surface);

  const domain = await prisma.domain.findUnique({
    where: { hostname: lookupHostname },
    include: {
      studyProgram: { include: tenantInclude },
    },
  });

  if (domain && domain.isActive && domain.studyProgram.status === 'active') {
    return {
      surface,
      hostname,
      tenant: toTenantContext(domain.studyProgram, lookupHostname),
    };
  }

  // Cadangan khusus pengembangan lokal.
  if (loopback) {
    const fallback = await prisma.studyProgram.findFirst({
      where: { status: 'active' },
      orderBy: { id: 'asc' },
      include: tenantInclude,
    });

    if (fallback) {
      const primaryDomain = await prisma.domain.findFirst({
        where: { studyProgramId: fallback.id, isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        select: { hostname: true },
      });

      return {
        surface,
        hostname,
        tenant: toTenantContext(fallback, primaryDomain?.hostname ?? hostname),
      };
    }
  }

  if (!domain) {
    throw AppError.notFound(
      `Domain "${lookupHostname}" belum terdaftar sebagai website program studi. Hubungi administrator universitas.`,
      'DOMAIN_NOT_REGISTERED',
    );
  }

  if (!domain.isActive) {
    throw AppError.notFound(
      `Domain "${lookupHostname}" sedang nonaktif. Hubungi administrator universitas.`,
      'DOMAIN_NOT_REGISTERED',
    );
  }

  throw AppError.forbidden(
    `Website "${domain.studyProgram.name}" sedang tidak aktif.`,
    'TENANT_INACTIVE',
  );
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
