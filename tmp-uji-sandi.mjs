import fs from 'node:fs';

const PRODI = 'http://localhost:5010';
const HOST = 'tif.unusu.ac.id';

function bacaEnv(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((b) => b.includes('=') && !b.trim().startsWith('#'))
      .map((b) => {
        const i = b.indexOf('=');
        return [b.slice(0, i).trim(), b.slice(i + 1).trim().replace(/^"|"$/g, '')];
      }),
  );
}

const env = bacaEnv('D:/Project/Unusu Worksheet/prodi-unusu/.env');

async function jfetch(path, options = {}) {
  const res = await fetch(`${PRODI}${path}`, {
    ...options,
    headers: { Host: HOST, ...(options.headers ?? {}) },
  });
  const teks = await res.text();
  let json = null;
  try {
    json = JSON.parse(teks);
  } catch {
    /* bukan JSON */
  }
  return { status: res.status, json, teks: teks.slice(0, 300), res };
}

console.log('=== 1. Info arsip publik ===');
const info = await jfetch('/api/v1/public/arsip-dokumen');
console.log(info.status, JSON.stringify(info.json ?? info.teks));

console.log('\n=== 2. Unlock sebelum kata sandi dipasang ===');
const belum = await jfetch('/api/v1/public/arsip-dokumen/unlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'apa-saja' }),
});
console.log(belum.status, JSON.stringify(belum.json ?? belum.teks));

console.log('\n=== 3. Login admin ===');
const login = await jfetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: env.SEED_SUPERADMIN_USERNAME, password: env.SEED_SUPERADMIN_PASSWORD }),
});
console.log(login.status, JSON.stringify(login.json ?? login.teks).slice(0, 300));

const cookies = (login.res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const csrf = /unusu_prodi_csrf=([^;]+)/.exec(cookies)?.[1] ?? '';

console.log('\n=== 4. Status kata sandi (admin) ===');
const status = await jfetch('/api/v1/admin/dokumen-password', { headers: { Cookie: cookies } });
console.log(status.status, JSON.stringify(status.json ?? status.teks));

console.log('\n=== 5. Pasang kata sandi arsip ===');
const SANDI = 'ArsipTif#2026';
const pasang = await jfetch('/api/v1/admin/dokumen-password', {
  method: 'PUT',
  headers: { Cookie: cookies, 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
  body: JSON.stringify({ password: SANDI }),
});
console.log(pasang.status, JSON.stringify(pasang.json ?? pasang.teks));

console.log('\n=== 6. Daftar arsip admin (read-only) ===');
const adminList = await jfetch('/api/v1/admin/arsip-dokumen', { headers: { Cookie: cookies } });
console.log(adminList.status, JSON.stringify(adminList.json ?? adminList.teks).slice(0, 400));

console.log('\n=== 7. Unlock publik: kata sandi salah ===');
const salah = await jfetch('/api/v1/public/arsip-dokumen/unlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'salah-banget' }),
});
console.log(salah.status, JSON.stringify(salah.json ?? salah.teks));

console.log('\n=== 8. Unlock publik: kata sandi benar ===');
const benar = await jfetch('/api/v1/public/arsip-dokumen/unlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: SANDI }),
});
console.log(benar.status, JSON.stringify(benar.json ?? benar.teks));

console.log('\n=== 9. Unlock berulang tanpa batas (3x) ===');
for (let i = 1; i <= 3; i += 1) {
  const ulang = await jfetch('/api/v1/public/arsip-dokumen/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: SANDI }),
  });
  console.log(`  percobaan ${i}:`, ulang.status, ulang.json?.meta?.terkunci === false ? 'terbuka' : ulang.teks);
}

console.log('\n=== 10. Pratinjau tanpa header kata sandi ===');
const tanpaHeader = await jfetch('/api/v1/public/arsip-dokumen/1/preview', { method: 'POST' });
console.log(tanpaHeader.status, JSON.stringify(tanpaHeader.json ?? tanpaHeader.teks));
