/**
 * Konfigurasi terpusat aplikasi.
 *
 * Semua nilai yang bergantung environment dibaca di sini satu kali. Modul lain
 * tidak membaca `process.env` langsung agar tidak ada secret yang tersebar dan
 * supaya kegagalan konfigurasi terdeteksi saat start, bukan saat request.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Konfigurasi wajib "${name}" belum diisi. Salin .env.example menjadi .env lalu lengkapi nilainya.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

const nodeEnv = optional('NODE_ENV', 'development');

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(optional('PORT', '5010')),

  database: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    /**
     * Masa berlaku access token di httpOnly cookie. Pendek karena ada endpoint
     * rotasi; sesi panjang ditopang tabel Session, bukan token panjang.
     */
    accessTtlSeconds: Number(optional('JWT_ACCESS_TTL_SECONDS', '1800')),
    refreshTtlDays: Number(optional('JWT_REFRESH_TTL_DAYS', '7')),
    issuer: optional('JWT_ISSUER', 'prodi-unusu'),
  },

  cookie: {
    name: optional('COOKIE_NAME', 'unusu_prodi_session'),
    csrfName: optional('CSRF_COOKIE_NAME', 'unusu_prodi_csrf'),
    /**
     * Domain cookie induk. Di production diisi `.unusu.ac.id` agar satu sesi
     * berlaku lintas subdomain portal. Di lokal dikosongkan.
     */
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: nodeEnv === 'production',
    sameSite: 'lax' as const,
  },

  cors: {
    /**
     * Daftar origin diizinkan. Wajib eksplisit karena cookie tidak boleh
     * dikirim lintas origin sembarang.
     */
    origins: optional('CORS_ORIGINS', 'http://localhost:5180')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  },

  portAdmin: Number(optional('ADMIN_PORTAL_PORT', '5181')),
  mainSitePort: Number(optional('MAIN_SITE_PORT', '5182')),

  upload: {
    dir: optional('UPLOAD_DIR', 'uploads'),
    maxBytes: Number(optional('UPLOAD_MAX_BYTES', String(10 * 1024 * 1024))),
    allowedMime: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ] as string[],
  },

  sso: {
    baseUrl: optional('SSO_BASE_URL', 'http://localhost:5000'),
    clientId: optional('SSO_CLIENT_ID', 'prodi-unusu'),
    clientKey: process.env.SSO_CLIENT_KEY || '',
    portalUrl: optional('SSO_PORTAL_URL', 'http://localhost:5173'),
  },

  /**
   * Hostname portal administrasi pusat. Dipakai untuk memisahkan permukaan
   * admin dari permukaan publik tanpa menebak dari path.
   */
  adminHost: optional('ADMIN_HOST', 'prodi.unusu.ac.id'),

  /**
   * Hostname website utama universitas. Deklarasi eksplisit, bukan pola
   * pencocokan string yang bisa salah tangkap.
   */
  mainSiteHosts: optional('MAIN_SITE_HOSTS', 'unusu.ac.id,www.unusu.ac.id')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),

  logLevel: optional('LOG_LEVEL', 'info'),

  /**
   * Mempercayai header X-Forwarded-* dari proxy.
   *
   * Wajib `true` bila aplikasi di belakang Nginx, supaya alamat IP pengunjung
   * dan protokol asli terbaca benar (rate limit per IP, cookie Secure, dan
   * audit log bergantung pada ini). Biarkan `false` bila port aplikasi dapat
   * diakses langsung dari internet, karena header dapat dipalsukan.
   */
  trustProxy: optional('TRUST_PROXY', nodeEnv === 'production' ? 'true' : 'false') === 'true',

  /**
   * Mode pratinjau lokal.
   *
   * Saat domain asli belum aktif, pengembang dapat membuka website prodi dari
   * localhost. `PREVIEW_HOST` menentukan tenant mana yang dipratinjau, misalnya
   * sin.unusu.ac.id. Nilai ini hanya dipakai untuk host loopback sehingga tidak
   * melonggarkan aturan "tolak domain tidak terdaftar" pada host publik.
   */
  dev: {
    allowLocalPreview: optional('ALLOW_LOCAL_PREVIEW', 'false') === 'true',
    previewHost: process.env.PREVIEW_HOST || '',
    /**
     * Permukaan yang dipaksakan pada host loopback (localhost / 127.0.0.1).
     *
     * Sengaja dipisah dari PREVIEW_HOST agar pengembang cukup menulis satu kata
     * di `.env` tanpa menyunting berkas `hosts`:
     *   - `portal` -> portal administrasi (landing + login + panel admin)
     *   - `main`   -> website utama universitas
     *   - `prodi`  -> website program studi, tenant dipilih PREVIEW_HOST
     * Kosong berarti perilaku bawaan: host loopback dianggap website prodi.
     */
    previewSurface: (process.env.PREVIEW_SURFACE || '').trim().toLowerCase(),
  },
} as const;

export type AppConfig = typeof config;
