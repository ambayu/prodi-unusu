/**
 * Mendaftarkan aplikasi ini sebagai klien SSO di portal ONE UNUSU.
 *
 * Tanpa entri di tabel `sso_apps` milik ONE UNUSU, tiket SSO tidak akan pernah
 * diterbitkan untuk aplikasi ini. Skrip ini membuat atau memperbarui entri
 * tersebut langsung di database ONE UNUSU (`one_unusu_db`), pola yang sama
 * dengan aplikasi satelit UNUSU lainnya.
 *
 * Yang ditulis ke database ONE UNUSU:
 *   clientId    : prodi-unusu
 *   clientKey   : dibuat acak bila belum ada
 *   urlRedirect : http://localhost:5180/sso/callback
 *   targetRoles : SUPERADMIN, ADMIN_SSO, DOSEN
 *
 * Keluaran skrip menyalin clientKey ke .env aplikasi ini bila diminta.
 *
 * Jalankan: npx tsx scripts/register-sso-client.ts
 */

import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const ONE_UNUSU_DB = process.env.ONE_UNUSU_DATABASE || 'one_unusu_db';
const CLIENT_ID = process.env.SSO_CLIENT_ID || 'prodi-unusu';
const CALLBACK_URL = process.env.SSO_CALLBACK_URL || 'http://localhost:5180/sso/callback';
const TARGET_ROLES = ['SUPERADMIN', 'ADMIN_SSO', 'DOSEN'];

/**
 * Menurunkan kredensial database ONE UNUSU dari DATABASE_URL aplikasi ini.
 * Keduanya berada di server MySQL lokal yang sama pada tahap pengembangan.
 */
function oneUnusuConnectionConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL belum diisi di .env.');
  }

  const url = new URL(raw.replace(/^mysql:\/\//, 'http://'));
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

async function main() {
  console.log('=== Pendaftaran klien SSO ONE UNUSU ===\n');

  const connection = await mysql.createConnection(oneUnusuConnectionConfig());

  try {
    const [dbRows] = await connection.query('SHOW DATABASES LIKE ?', [ONE_UNUSU_DB]);
    if (Array.isArray(dbRows) && dbRows.length === 0) {
      console.log(`Database "${ONE_UNUSU_DB}" tidak ditemukan.`);
      console.log('Portal ONE UNUSU belum pernah dijalankan atau migrasinya belum diterapkan.');
      return;
    }

    const [existing] = await connection.query(
      `SELECT id, clientId, clientKey, urlRedirect, targetRoles FROM \`${ONE_UNUSU_DB}\`.sso_apps WHERE clientId = ?`,
      [CLIENT_ID],
    );

    const rows = existing as Array<{ id: number; clientKey: string; urlRedirect: string; targetRoles: string }>;

    let clientKey: string;

    if (rows.length > 0) {
      clientKey = rows[0].clientKey;
      await connection.query(
        `UPDATE \`${ONE_UNUSU_DB}\`.sso_apps SET nameApp = ?, urlRedirect = ?, targetRoles = ?, isActive = 1 WHERE clientId = ?`,
        ['Portal Prodi UNUSU', CALLBACK_URL, JSON.stringify(TARGET_ROLES), CLIENT_ID],
      );
      console.log(`Aplikasi ${CLIENT_ID} sudah terdaftar, data diperbarui.`);
      console.log(`URL redirect : ${CALLBACK_URL}`);
      console.log('Client key tidak diubah agar sesi yang sudah berjalan tetap valid.');
    } else {
      clientKey = `prodi_${crypto.randomBytes(24).toString('hex')}`;
      await connection.query(
        `INSERT INTO \`${ONE_UNUSU_DB}\`.sso_apps
          (clientId, clientKey, nameApp, description, icon, badge, urlRedirect, targetRoles, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          CLIENT_ID,
          clientKey,
          'Portal Prodi UNUSU',
          'Portal administrasi multi-tenant website program studi Universitas Nahdlatul Ulama Sumatera Utara.',
          'LayoutGrid',
          'Internal',
          CALLBACK_URL,
          JSON.stringify(TARGET_ROLES),
        ],
      );
      console.log(`Aplikasi ${CLIENT_ID} berhasil didaftarkan.`);
    }

    // Tulis client key ke .env aplikasi ini bila belum terisi.
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const needsUpdate = /^SSO_CLIENT_KEY=\s*$/m.test(envContent) || !/^SSO_CLIENT_KEY=/m.test(envContent);

    if (needsUpdate) {
      const updated = /^SSO_CLIENT_KEY=.*$/m.test(envContent)
        ? envContent.replace(/^SSO_CLIENT_KEY=.*$/m, `SSO_CLIENT_KEY="${clientKey}"`)
        : `${envContent.trimEnd()}\nSSO_CLIENT_KEY="${clientKey}"\n`;
      fs.writeFileSync(envPath, updated, 'utf8');
      console.log('\nSSO_CLIENT_KEY sudah ditulis ke .env. Jalankan ulang server agar berlaku.');
    } else {
      console.log('\nSSO_CLIENT_KEY di .env sudah terisi. Pastikan nilainya sama dengan berikut:');
      console.log(`  ${clientKey}`);
    }

    console.log('\nLangkah berikutnya:');
    console.log('  1. Jalankan portal ONE UNUSU di http://localhost:5173');
    console.log('  2. Jalankan aplikasi ini: npm run dev');
    console.log('  3. Buka http://prodi.unusu.ac.id:5180/login lalu klik "Masuk dengan ONE UNUSU"');
    console.log('  4. Portal mengembalikan tiket ke /sso/callback, aplikasi menukarnya jadi sesi lokal');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Pendaftaran klien SSO gagal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
