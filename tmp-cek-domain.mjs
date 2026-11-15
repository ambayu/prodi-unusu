import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'prodi_unusu_db' });
const [rows] = await conn.query(
  `SELECT d.id, d.hostname, d.is_primary, d.is_active, sp.code, sp.name
   FROM domains d JOIN study_programs sp ON sp.id = d.study_program_id ORDER BY d.id`,
);
console.log(JSON.stringify(rows, null, 1));
await conn.end();
