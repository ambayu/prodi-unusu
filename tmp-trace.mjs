import fs from 'node:fs';

// Sisipkan pencatat ke errorHandler sementara untuk menelusuri asal 401.
const path = 'src/server/middlewares/errorHandler.ts';
const teks = fs.readFileSync(path, 'utf8');
if (!teks.includes('__TRACE_401__')) {
  const baru = teks.replace(
    'export function errorHandler',
    `// __TRACE_401__\nexport function errorHandler`,
  );
  console.log('--- isi errorHandler ---');
  console.log(teks.slice(0, 2000));
}
