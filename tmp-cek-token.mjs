// Mereplikasi pemanggilan endpoint ONE UNUSU untuk melihat error aslinya.
import { createHmac } from 'node:crypto';
import fs from 'node:fs';

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

const envProdi = bacaEnv('D:/Project/Unusu Worksheet/prodi-unusu/.env');
const token = `arsip.${envProdi.SSO_CLIENT_ID}.${createHmac('sha256', envProdi.ARSIP_SERVICE_TOKEN_SECRET)
  .update(`arsip-dokumen|${envProdi.SSO_CLIENT_ID}`)
  .digest('hex')}`;

// Panggil LPM lewat jalur yang sama seperti ambilDokumenAplikasi.
const url = 'http://localhost:5004/api/dokumen?take=50&tujuanPublish=prodi&prodiCode=TIF';
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
console.log('LPM langsung:', res.status, (await res.text()).slice(0, 200));

// Sekarang lewat ONE UNUSU.
const cabang = await fetch('http://localhost:5000/api/v2/website/dokumen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: envProdi.SSO_CLIENT_ID,
    client_key: envProdi.SSO_CLIENT_KEY,
    sumber: 'lpm',
    prodiCode: 'TIF',
    tujuanPublish: 'prodi',
  }),
});
console.log('via ONE UNUSU:', cabang.status, (await cabang.text()).slice(0, 300));
