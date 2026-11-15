const tes = [
  ['public/site-resolution', '/api/v1/public/site-resolution'],
  ['arsip-dokumen', '/api/v1/public/arsip-dokumen'],
  ['arsip-dokumen (tanpa prefix publik)', '/api/v1/arsip-dokumen'],
];

for (const [label, path] of tes) {
  for (const host of ['tif.prodi.unusu.ac.id', 'localhost:5010']) {
    const res = await fetch(`http://localhost:5010${path}`, { headers: { Host: host } });
    const teks = await res.text();
    console.log(`${label} [${host}] -> ${res.status}: ${teks.slice(0, 160)}`);
  }
}

const unlock = await fetch('http://localhost:5010/api/v1/public/arsip-dokumen/unlock', {
  method: 'POST',
  headers: { Host: 'tif.prodi.unusu.ac.id', 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'x' }),
});
console.log('unlock ->', unlock.status, (await unlock.text()).slice(0, 200));
