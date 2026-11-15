import mysql from 'mysql2/promise';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('D:/Project/Unusu Worksheet/prodi-unusu/.env', 'utf8')
    .split(/\r?\n/)
    .filter((b) => b.includes('=') && !b.trim().startsWith('#'))
    .map((b) => {
      const i = b.indexOf('=');
      return [b.slice(0, i).trim(), b.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'one_unusu_db' });
const [rows] = await conn.query('SELECT clientId, nameApp, isActive, LENGTH(clientKey) AS panjangKey FROM sso_apps WHERE clientId = ?', [
  env.SSO_CLIENT_ID,
]);
console.log('prodi client_id:', env.SSO_CLIENT_ID);
console.log('rows:', JSON.stringify(rows));
const [semua] = await conn.query('SELECT clientId, isActive FROM sso_apps WHERE clientId LIKE ?', ['%prodi%']);
console.log('kandidat:', JSON.stringify(semua));
await conn.end();
