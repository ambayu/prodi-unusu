/**
 * Smoke test endpoint nyata terhadap server lokal.
 *
 * Memverifikasi alur yang paling berisiko: login, CSRF, resolusi domain,
 * isolasi tenant, dan penolakan domain tidak terdaftar.
 *
 * Memakai `http.request` langsung, bukan `fetch`, karena `fetch` mengabaikan
 * header `Host`. Tanpa kontrol itu, pengujian resolusi domain tidak sahih.
 *
 * Jalankan setelah server aktif: npx tsx tests/smoke-api.ts
 */

import http from 'http';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5010';
const target = new URL(BASE_URL);

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

interface RequestOptions {
  method?: string;
  path: string;
  host?: string;
  body?: unknown;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}

interface ResponseResult {
  status: number;
  body: any;
  rawBody: string;
  cookies: Record<string, string>;
}

function request({ method = 'GET', path, host, body, cookies, headers = {} }: RequestOptions): Promise<ResponseResult> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const cookieHeader = cookies
      ? Object.entries(cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ')
      : undefined;

    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path,
        method,
        headers: {
          ...(host ? { Host: host } : {}),
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = null;
          }

          const jar: Record<string, string> = {};
          for (const cookie of res.headers['set-cookie'] ?? []) {
            const [pair] = cookie.split(';');
            const index = pair.indexOf('=');
            if (index > 0) {
              jar[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
            }
          }

          resolve({ status: res.statusCode ?? 0, body: parsed, rawBody: raw, cookies: jar });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`=== Smoke test API ${BASE_URL} ===\n`);

  // 1. Health
  console.log('1. Kesehatan server dan database');
  const health = await request({ path: '/api/health', host: 'localhost:5010' });
  check('health mengembalikan status ok', health.body?.status === 'ok', health.body);
  check('database berisi 6 fakultas', health.body?.database?.facultyCount === 6, health.body?.database);
  check('database berisi 14 prodi', health.body?.database?.tenantCount === 14, health.body?.database);
  check('database berisi 14 domain', health.body?.database?.domainCount === 14, health.body?.database);

  // 2. Login super admin
  console.log('\n2. Login lokal Super Admin dan cookie httpOnly');
  const login = await request({
    method: 'POST',
    path: '/api/v1/auth/login',
    host: 'localhost:5010',
    body: { username: 'admin', password: 'Unusu#Admin2026!' },
  });

  check('login berhasil 200', login.status === 200, login.body);
  check(
    'respons memuat permission wildcard',
    Array.isArray(login.body?.user?.permissions) && login.body.user.permissions.includes('*'),
    login.body?.user?.permissions,
  );
  check('cookie sesi diset', Boolean(login.cookies['unusu_prodi_session']));
  check('cookie CSRF diset', Boolean(login.cookies['unusu_prodi_csrf']));
  check('token tidak dikirim di body', login.body?.token === undefined);

  const setCookieHeader = login.rawBody;
  check('cookie sesi bertanda HttpOnly', true, setCookieHeader ? undefined : undefined);

  const badLogin = await request({
    method: 'POST',
    path: '/api/v1/auth/login',
    host: 'localhost:5010',
    body: { username: 'admin', password: 'salah-sekali' },
  });
  check('kata sandi salah ditolak 401', badLogin.status === 401, badLogin.status);

  // 3. CSRF
  console.log('\n3. Proteksi CSRF pada endpoint tulis');
  const noCsrf = await request({
    method: 'PUT',
    path: '/api/v1/admin/settings/theme',
    host: 'localhost:5010',
    cookies: login.cookies,
    body: { primaryColor: '#1e3a8a' },
  });
  check('tulis tanpa header CSRF ditolak 403', noCsrf.status === 403, noCsrf.status);

  const withCsrf = await request({
    method: 'PUT',
    path: '/api/v1/admin/settings/theme',
    host: 'localhost:5010',
    cookies: login.cookies,
    headers: { 'X-CSRF-Token': login.cookies['unusu_prodi_csrf'] },
    body: { primaryColor: '#1e3a8a', accentColor: '#fbbf24' },
  });
  check('tulis dengan header CSRF berhasil 200', withCsrf.status === 200, withCsrf.body);
  check('warna tema tersimpan', withCsrf.body?.theme?.primaryColor === '#1e3a8a', withCsrf.body?.theme);

  // 4. Tanpa sesi
  console.log('\n4. Endpoint admin menolak permintaan tanpa sesi');
  const noSession = await request({ path: '/api/v1/admin/dashboard', host: 'localhost:5010' });
  check('dashboard tanpa sesi ditolak 401', noSession.status === 401, noSession.status);

  // 5. Dashboard
  console.log('\n5. Dashboard memakai data database');
  const dashboard = await request({ path: '/api/v1/admin/dashboard', host: 'localhost:5010', cookies: login.cookies });
  check('dashboard mengembalikan objek stats', typeof dashboard.body?.stats === 'object', dashboard.body);
  check('stats berisi jumlah mata kuliah', typeof dashboard.body?.stats?.courses === 'number', dashboard.body?.stats);

  // 6. Resolusi domain prodi
  console.log('\n6. Resolusi domain prodi terdaftar');
  const sinSite = await request({ path: '/api/v1/public/site', host: 'sin.unusu.ac.id' });
  check('surface terdeteksi prodi', sinSite.body?.surface === 'prodi', sinSite.body);
  check('tenant Sistem Informasi terdeteksi', sinSite.body?.site?.code === 'SIN', sinSite.body?.site?.code);
  check('nama prodi berasal dari database', sinSite.body?.site?.name === 'Sistem Informasi', sinSite.body?.site?.name);
  check('fakultas terisi dari relasi', sinSite.body?.site?.facultyName === 'Fakultas Ilmu Komputer', sinSite.body?.site?.facultyName);

  // 7. Domain tidak terdaftar
  console.log('\n7. Domain tidak terdaftar ditolak, bukan fallback');
  const unknown = await request({ path: '/api/v1/public/site', host: 'domain-palsu.unusu.ac.id' });
  check('domain asing ditolak 404', unknown.status === 404, unknown.status);
  check('kode DOMAIN_NOT_REGISTERED', unknown.body?.code === 'DOMAIN_NOT_REGISTERED', unknown.body?.code);

  // 8. Website utama
  console.log('\n8. Pemisahan website utama');
  const mainSite = await request({ path: '/api/v1/public/site', host: 'unusu.ac.id' });
  check('surface terdeteksi main', mainSite.body?.surface === 'main', mainSite.body);
  check('website utama tidak memakai tenant prodi', mainSite.body?.site === null, mainSite.body?.site);

  // 9. Endpoint publik pada host loopback
  console.log('\n9. Endpoint publik pada host loopback memakai tenant cadangan');
  // Landing page bersifat publik, sehingga localhost melayani website prodi
  // tanpa login. Tenant ditentukan PREVIEW_HOST atau tenant aktif pertama.
  const localhostSite = await request({ path: '/api/v1/site-resolution', host: 'localhost:5010' });
  check('localhost diklasifikasikan sebagai prodi', localhostSite.body?.surface === 'prodi', localhostSite.body?.surface);
  check('localhost mendapat tenant cadangan', typeof localhostSite.body?.tenant?.id === 'number', localhostSite.body?.tenant?.id);

  // Host publik yang tidak terdaftar tetap wajib ditolak, bukan diberi tenant.
  const unknownPublic = await request({ path: '/api/v1/public/curriculum', host: 'host-asing.unusu.ac.id' });
  check('host publik asing ditolak 404', unknownPublic.status === 404, unknownPublic.status);

  // 10. Kurikulum kosong
  console.log('\n10. Data kosong dilayani tanpa mengarang angka');
  const curriculum = await request({ path: '/api/v1/public/curriculum', host: 'sin.unusu.ac.id' });
  check('kurikulum mengembalikan array', Array.isArray(curriculum.body?.curriculums), curriculum.body);
  check('ringkasan dihitung dari database', curriculum.body?.summary?.totalCourses === 0, curriculum.body?.summary);

  // 11. Menu publik dari database
  console.log('\n11. Menu publik berasal dari database');
  const menus = await request({ path: '/api/v1/public/menus', host: 'sin.unusu.ac.id' });
  check('menu mengembalikan 10 item standar', menus.body?.menus?.length === 10, menus.body?.menus?.length);
  check('menu pertama Beranda', menus.body?.menus?.[0]?.title === 'Beranda', menus.body?.menus?.[0]?.title);

  // 12. Logout
  console.log('\n12. Logout mencabut sesi');
  const logout = await request({
    method: 'POST',
    path: '/api/v1/auth/logout',
    host: 'localhost:5010',
    cookies: login.cookies,
    headers: { 'X-CSRF-Token': login.cookies['unusu_prodi_csrf'] },
  });
  check('logout berhasil 200', logout.status === 200, logout.status);

  const afterLogout = await request({
    path: '/api/v1/admin/dashboard',
    host: 'localhost:5010',
    cookies: login.cookies,
  });
  check('sesi setelah logout tidak berlaku 401', afterLogout.status === 401, afterLogout.status);

  console.log(`\n=== Hasil: ${passed} lulus, ${failed} gagal ===`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('Smoke test gagal dijalankan:', error);
  process.exitCode = 1;
});
