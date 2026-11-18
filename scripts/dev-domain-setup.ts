/**
 * Menyiapkan pengujian multi-domain di mesin lokal tanpa domain asli.
 *
 * Ada tiga cara menguji, dari yang paling mendekati production ke yang paling
 * praktis:
 *
 *   1. Host name mapping  -> palings mendekati production. Browser benar-benar
 *      mengirim Host: sin.unusu.ac.id sehingga seluruh aturan resolusi,
 *      isolasi tenant, dan penolakan domain tidak terdaftar ikut teruji.
 *   2. Tanpa pemetaan, memakai proxy Vite yang menyuntikkan header Host.
 *   3. Mode pratinjau lokal -> localhost dipetakan ke satu tenant lewat
 *      ALLOW_LOCAL_PREVIEW + PREVIEW_HOST. Cepat, tetapi tidak menguji resolusi
 *      hostname karena Host yang diterima tetap localhost.
 *
 * Skrip ini memeriksa prasyarat tiap cara dan menulis panduan siap pakai.
 *
 * Jalankan: npx tsx scripts/dev-domain-setup.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOSTS_FILE = process.env.WINDIR
  ? path.join(process.env.WINDIR, 'System32', 'drivers', 'etc', 'hosts')
  : 'C:\\Windows\\System32\\drivers\\etc\\hosts';

const MARKER_BEGIN = '# === UNUSU Multi-Prodi dev hosts begin ===';
const MARKER_END = '# === UNUSU Multi-Prodi dev hosts end ===';

function isAdmin(): boolean {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== Persiapan pengujian multi-domain lokal ===\n');

  const domains = await prisma.domain.findMany({
    orderBy: { hostname: 'asc' },
    include: { studyProgram: { select: { name: true, code: true } } },
  });

  console.log(`Domain terdaftar di database: ${domains.length}`);
  for (const domain of domains) {
    console.log(`  - ${domain.hostname.padEnd(28)} ${domain.studyProgram.code} ${domain.studyProgram.name}`);
  }
  console.log('');

  // ---------------------------------------------------------
  // Cara 1: pemetaan hosts
  // ---------------------------------------------------------
  console.log('--- CARA 1: pemetaan file hosts (paling mendekati production) ---');

  const hostsContent = fs.existsSync(HOSTS_FILE) ? fs.readFileSync(HOSTS_FILE, 'utf8') : '';
  const alreadyMapped = hostsContent.includes(MARKER_BEGIN);

  const block = [
    MARKER_BEGIN,
    '# Dibuat oleh scripts/dev-domain-setup.ts. Hapus blok ini untuk membersihkan.',
    ...domains.map((domain) => `127.0.0.1 ${domain.hostname}`),
    '127.0.0.1 prodi.unusu.ac.id',
    '127.0.0.1 unusu.ac.id',
    '127.0.0.1 www.unusu.ac.id',
    MARKER_END,
  ].join('\n');

  console.log(`Lokasi file hosts : ${HOSTS_FILE}`);
  console.log(`Sudah dipetakan   : ${alreadyMapped ? 'ya' : 'belum'}`);
  console.log(`Hak administrator  : ${isAdmin() ? 'ya' : 'tidak'}`);

  if (!isAdmin()) {
    console.log('');
    console.log('  Pemetaan hosts memerlukan PowerShell sebagai Administrator.');
    console.log('  Jalankan perintah berikut di jendela Administrator, lalu ulangi skrip ini:');
    console.log('');
    console.log(`  Add-Content -Path "${HOSTS_FILE}" -Value "${block.replace(/\n/g, '`n')}"`);
    console.log('');
  } else if (!alreadyMapped) {
    fs.appendFileSync(HOSTS_FILE, `\n${block}\n`, 'utf8');
    console.log('  Pemetaan hosts berhasil ditambahkan.');
  } else {
    console.log('  Pemetaan hosts sudah ada, tidak ditulis ulang.');
  }

  console.log('');
  console.log('  Setelah hosts dipetakan, akses lewat URL berikut:');
  console.log('    http://sin.unusu.ac.id:5180            -> website Prodi Sistem Informasi');
  console.log('    http://tif.unusu.ac.id:5180            -> website Prodi Teknik Informatika');
  console.log('    http://prodi.unusu.ac.id:5180/admin    -> portal administrasi pusat');
  console.log('    http://unusu.ac.id:5180                -> website utama universitas');
  console.log('');
  console.log('  Catatan: port 5180 adalah server Vite. Permintaan /api diteruskan Vite');
  console.log('  ke Express di port 5010 dengan header Host yang sama.');
  console.log('');

  // ---------------------------------------------------------
  // Cara 2: proxy Vite
  // ---------------------------------------------------------
  console.log('--- CARA 2: proxy Vite tanpa mengubah file hosts ---');
  console.log('  Vite meneruskan Host apa adanya. Tanpa pemetaan hosts, browser tidak');
  console.log('  akan mengetik sin.unusu.ac.id jadi tidak ada yang bisa diuji.');
  console.log('  Cara ini hanya berguna bila Anda memakai ekstensi pengubah header');
  console.log('  seperti ModHeader untuk mengirim Host: sin.unusu.ac.id.');
  console.log('');

  // ---------------------------------------------------------
  // Cara 3: mode pratinjau
  // ---------------------------------------------------------
  console.log('--- CARA 3: mode pratinjau lokal (tanpa file hosts) ---');
  console.log('  Set dua variabel ini di .env lalu jalankan ulang npm run dev:');
  console.log('    ALLOW_LOCAL_PREVIEW=true');
  console.log('    PREVIEW_HOST=sin.unusu.ac.id');
  console.log('');
  console.log('  Lalu buka http://localhost:5180 untuk website Prodi Sistem Informasi.');
  console.log('  Batasannya: header Host yang diterima tetap localhost, sehingga');
  console.log('  pemisahan domain tidak teruji. Isolasi tenant tetap teruji karena');
  console.log('  backend tetap mencari tenant lewat PREVIEW_HOST di database.');
  console.log('');

  // ---------------------------------------------------------
  // Prasyarat SSO
  // ---------------------------------------------------------
  console.log('--- Prasyarat login ---');
  console.log('  1. Login lokal (darurat) aktif sekarang:');
  console.log('       http://prodi.unusu.ac.id:5180/login');
  console.log('       Akun: admin / Unusu#Admin2026!  (ganti setelah dipakai)');
  console.log('  2. Login SSO ONE UNUSU memerlukan langkah tambahan:');
  console.log('       - Portal ONE UNUSU harus hidup di http://localhost:5173');
  console.log('       - Jalankan: npx tsx scripts/register-sso-client.ts');
  console.log('       - Salin client key hasilnya ke SSO_CLIENT_KEY di .env');
  console.log('');
}

main()
  .catch((error) => {
    console.error('Gagal menyiapkan pengujian domain:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
