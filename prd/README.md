# UNUSU Multi-Website Management System — Documentation Pack

Tanggal konsolidasi: 7 November 2026  
Status: Draft teknis untuk ditinjau sebelum implementasi.

## Isi paket

- `docs/PRD.md` — PRD utama sistem, berdasarkan dokumen kebutuhan yang diberikan.
- `docs/ARCHITECTURE.md` — arsitektur aplikasi modular monolith dan alur multi-domain.
- `docs/DATABASE.md` — model data konseptual dan aturan isolasi tenant; bukan pengganti audit schema aktual.
- `docs/rbac/ROLE-PERMISSION-MENU-PRD.md` — pemetaan role, permission, scope, dan menu.
- `docs/seeder/SEEDER-PRD.md` — kebutuhan seeder.
- `docs/seeder/SEEDER-STRATEGY.md` — urutan dan strategi eksekusi seeder.
- `docs/seeder/SEEDER-DATA-MASTER.md` — data master awal dan aturan sumber data.
- `docs/DESIGN-RULES.md` — pedoman UI/UX dan website builder.
- `docs/DEVELOPMENT-RULES.md` — aturan implementasi dan AI coding agent.
- `docs/CHANGELOG.md` — riwayat konsolidasi dokumen.
- `docs/DECISIONS-OPEN-QUESTIONS.md` — keputusan yang sudah ditetapkan dan hal yang perlu dikonfirmasi.

## Baseline proyek

Satu codebase dan satu aplikasi modular monolith: React + TypeScript + Vite pada frontend; Node.js + Express + TypeScript pada backend; Prisma ORM; MySQL; Tailwind CSS + shadcn/ui; deployment Ubuntu VPS, Nginx, PM2. Satu portal administrasi pusat `prodi.unusu.ac.id` mengelola website publik pada domain-domain tenant.

## Cara menggunakan

1. Baca `docs/PRD.md` sebagai sumber kebutuhan produk.
2. Baca `docs/DECISIONS-OPEN-QUESTIONS.md` sebelum memutuskan hal yang belum final.
3. Gunakan `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, dan PRD RBAC sebagai acuan teknis.
4. Audit repository dan schema Prisma yang sudah ada sebelum membuat tabel atau migration.
5. Jangan menganggap contoh domain, IP, jumlah prodi, atau data akademik sebagai data final tanpa validasi pemilik sistem.

## Catatan penting

Dokumen arsitektur, database, seeder, desain, dan RBAC di paket ini merupakan elaborasi teknis yang disusun untuk melengkapi PRD utama. Bagian yang belum dapat dipastikan ditandai sebagai keputusan terbuka. Tidak ada klaim bahwa migration atau implementasi aplikasi telah dibuat.
