# DECISIONS & OPEN QUESTIONS — UNUSU

## Keputusan baseline yang konsisten di dokumen

- Satu aplikasi dan satu codebase; arsitektur Modular Monolith.
- Frontend React + TypeScript + Vite.
- Backend Node.js + Express + TypeScript.
- Prisma ORM dan MySQL.
- Tailwind CSS + shadcn/ui.
- Portal administrasi pusat `prodi.unusu.ac.id`.
- Banyak domain publik diarahkan ke aplikasi yang sama.
- Fokus implementasi awal pada website Program Studi; website Fakultas sebagai tenant publik bersifat opsional.
- Tenant resolver harus berdasarkan hostname terdaftar dan diverifikasi backend.
- Permission dicek di backend dan data tenant wajib terisolasi.

## Perlu dikonfirmasi sebelum implementasi final

1. **Tenant granularity**: apakah satu Program Studi tepat satu tenant/website, atau boleh lebih dari satu website per prodi?
2. **Faculty website**: apakah 6 website fakultas akan diaktifkan pada fase awal atau hanya disiapkan di master organisasi?
3. **Domain inventory**: validasi daftar final 20 hostname, status aktif, primary domain, dan kepemilikan DNS.
4. **Portal admin domain**: apakah `prodi.unusu.ac.id` hanya portal admin atau juga memiliki public landing page universitas?
5. **Authentication**: pilih session cookie atau JWT; tetapkan CSRF, refresh, expiry, logout, dan kebijakan multi-device.
6. **Admin Fakultas**: aktif atau nonaktif; jika aktif, apakah dapat mengelola user dan konten prodi atau hanya monitoring/approval?
7. **Editor workflow**: apakah Editor boleh publish langsung atau hanya submit for review? Pisahkan permission create/update/publish.
8. **Content approval**: apakah diperlukan status review/approval selain draft/published?
9. **Storage**: local disk atau object storage; tetapkan backup, public/private access, dan batas ukuran.
10. **Rich text editor**: tentukan library dan sanitasi output.
11. **Website builder**: tetapkan daftar widget MVP, schema config, undo/redo scope, versioning, rollback, dan batasan responsive.
12. **Curriculum**: validasi struktur 8 semester, 66 mata kuliah, 148 SKS, 66 RPS sebagai contoh atau data resmi.
13. **Data dosen**: tetapkan apakah NIDN/NIDK, email, dan foto boleh dipublikasikan sesuai kebijakan privasi kampus.
14. **Contact form**: apakah aktif; jika ya, tetapkan anti-spam, retensi pesan, dan siapa penerimanya.
15. **Backup & monitoring**: tetapkan retensi, target RPO/RTO, jadwal restore test, dan alerting.
16. **Existing repository**: audit schema, modul, dan migration sebelum menyesuaikan dokumen dengan implementasi aktual.

## Ketidaksesuaian yang dicegah

- Jangan menganggap Admin Fakultas pasti aktif; PRD utama menyebutnya opsional.
- Jangan menganggap website Fakultas pasti menjadi tenant aktif; hal ini di luar fokus tahap pertama kecuali diputuskan.
- Jangan membuat schema Prisma baru hanya berdasarkan nama tabel konseptual di `DATABASE.md`.
- Jangan seed data contoh akademik sebagai data production tanpa pengesahan.
- Jangan menyamakan menu yang tersembunyi dengan proteksi endpoint.
