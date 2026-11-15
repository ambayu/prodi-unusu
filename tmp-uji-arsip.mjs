// Uji alur arsip dokumen: gerbang kata sandi, kode prodi, dan proxy ONE UNUSU.
const PRODI = 'http://localhost:5010';
const ONE = 'http://localhost:5000';

async function jfetch(url, options) {
  const res = await fetch(url, options);
  const teks = await res.text();
  let json = null;
  try {
    json = JSON.parse(teks);
  } catch {
    // bukan JSON
  }
  return { status: res.status, json, teks: teks.slice(0, 300) };
}

console.log('== 1. Info arsip publik (hostname prodi) ==');
const info = await jfetch(`${PRODI}/api/v1/public/arsip-dokumen`, {
  headers: { Host: 'tif.prodi.unusu.ac.id' },
});
console.log(info.status, JSON.stringify(info.json ?? info.teks));

console.log('\n== 2. Buka kunci sebelum kata sandi dipasang (harus ARSIP_PASSWORD_NOT_SET) ==');
const sebelum = await jfetch(`${PRODI}/api/v1/public/arsip-dokumen/unlock`, {
  method: 'POST',
  headers: { Host: 'tif.prodi.unusu.ac.id', 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'apa-saja' }),
});
console.log(sebelum.status, JSON.stringify(sebelum.json ?? sebelum.teks));

console.log('\n== 3. Token layanan arsip ke ONE UNUSU (kredensial cabang) ==');
const env = Object.fromEntries(
  (await import('node:fs'))
    .readFileSync('D:/Project/Unusu Worksheet/prodi-unusu/.env', 'utf8')
    .split(/\r?\n/)
    .filter((baris) => baris.includes('=') && !baris.trim().startsWith('#'))
    .map((baris) => {
      const i = baris.indexOf('=');
      return [baris.slice(0, i).trim(), baris.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const cabang = await jfetch(`${ONE}/api/v2/website/dokumen`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: env.SSO_CLIENT_ID,
    client_key: env.SSO_CLIENT_KEY,
    sumber: 'lpm',
    prodiCode: 'TIF',
    tujuanPublish: 'prodi',
  }),
});
console.log(cabang.status, JSON.stringify(cabang.json ?? cabang.teks));

console.log('\n== 4. Kredensial salah ditolak ==');
const salah = await jfetch(`${ONE}/api/v2/website/dokumen`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: env.SSO_CLIENT_ID, client_key: 'salah', sumber: 'lpm' }),
});
console.log(salah.status, JSON.stringify(salah.json ?? salah.teks));

console.log('\n== 5. LPM menolak Bearer acak ==');
const acak = await jfetch('http://localhost:5004/api/dokumen?take=1', {
  headers: { Authorization: 'Bearer token-ngawur' },
});
console.log(acak.status, JSON.stringify(acak.json ?? acak.teks));
