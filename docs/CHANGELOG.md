# Changelog

Semua perubahan penting dicatat di sini. Format tanggal: YYYY-MM-DD.

## 2026-11-07 â€” Fondasi data dan portal berfungsi end-to-end

Perubahan besar. Aplikasi sebelumnya hanya tampilan; sekarang tersambung ke
database, memiliki autentikasi nyata, dan seluruh data berasal dari MySQL.

### Database

- Skema Prisma diperluas dari 27 menjadi 38 model. Model baru: `PageVersion`,
  `WidgetVariant`, `MediaAsset`, `PermissionGroup`, `PermissionGroupItem`,
  `UserRolePermissionGroup`, `Session`, `PostCategory`, `RpsDocument`,
  `ProfileContent`, `VisionMission`, `AdminMenu`, `Notification`,
  `SystemSetting`.
- `UserRole` sekarang menyimpan cakupan: `scope_type`, `study_program_id`,
  `faculty_id`.
- Index ditambahkan pada kolom filter dan urutan yang benar-benar dipakai.
- Migrasi awal dibuat: `20261107105550_init_multi_tenant_website`.
- `prisma/seed.ts` dibuat: idempotent, memakai `upsert`, tanpa `deleteMany()`
  terhadap data operasional.

### Backend

- Struktur dirapikan menjadi `config`, `middlewares`, `modules`, `services`,
  `utils`. Folder `src/server/routes` lama dihapus.
- `tenantResolver` ditulis ulang: hostname dinormalisasi, permukaan ditentukan
  dari konfigurasi eksplisit, dan **fallback tenant default dihapus**. Domain
  tidak terdaftar kini ditolak 404 dengan kode `DOMAIN_NOT_REGISTERED`.
- Autentikasi pindah ke JWT di cookie httpOnly dengan sesi tercatat di database.
  Endpoint baru: `POST /auth/sso`, `POST /auth/refresh`, `POST /auth/logout`.
- Proteksi CSRF double-submit cookie untuk seluruh permintaan tulis.
- Rate limit login: 10 percobaan per 15 menit per alamat IP.
- Valilasi Zod terpasang di seluruh endpoint melalui middleware `validate`.
  Hasil bersih ditulis ke `req.validated`.
- RBAC nyata: 92 permission, middleware `requirePermission`, dan
  `resolveScopedTenantId` yang menolak tenant di luar penugasan.
- Endpoint CRUD baru: builder (halaman, section, widget, duplikasi, urutan,
  pratinjau, versi, publikasi), navigasi, konten (kurikulum, semester, mata
  kuliah, dosen, dokumen, sarpras), publikasi (berita, kategori, galeri,
  kontak, pesan, profil, visi misi), media, pengguna dan peran, organisasi
  (fakultas, prodi, domain), audit.
- Unggahan berkas dengan multer: batas 10 MB, daftar MIME dibatasi, nama file
  acak, ekstensi dari MIME.
- Pemusat error: `AppError`, terjemahan kesalahan Prisma, dan penyembunyian
  detail internal pada production.
- Audit log dicatat untuk seluruh aksi tulis penting.

### Frontend

- Seluruh data hardcoded dihapus. `Dashboard`, `CurriculumPage`,
  `DocumentsPage`, `LecturersPage` kini membaca API.
- Lapisan service ditambahkan: `src/client/services/api.ts`,
  `contentApi.ts`, `adminApi.ts`.
- TanStack Query dipakai untuk server state, Zustand untuk konteks situs.
- `AdminLayout` ditulis ulang: menu dibangun dari permission pengguna, bukan
  daftar statis.
- Halaman admin baru yang benar-benar berfungsi: kurikulum, dokumen, dosen,
  sarpras, berita, galeri, kontak dan pesan, media, pengguna, builder,
  pengaturan, navigasi, profil, biodata, organisasi, domain.
- Seluruh `alert()` dan `confirm()` diganti `ToastProvider` dan
  `ConfirmDialog`.
- Halaman publik baru: profil, visi misi, sarpras, berita, galeri, dan 404.
- Navigasi website prodi diambil dari tabel `menus`, bukan daftar hardcode.
- Halaman `/sso/callback` ditambahkan sebagai penerima tiket SSO.
- SEO per domain: `useSeo` menetapkan judul, deskripsi, canonical, Open Graph,
  dan favicon per tenant.
- Bundel dipecah: `react-vendor`, `query-vendor`, dan `index`. Ukuran index turun
  dari 1.012 kB menjadi 542 kB, gzip 226 kB menjadi 77 kB.

### Konfigurasi

- `package.json`: dependensi baru `bcryptjs`, `cookie-parser`,
  `express-rate-limit`, `helmet`, `multer`, `mysql2`, `zustand`,
  `@tanstack/react-query`, `vitest`. Skrip `typecheck`, `test`, dan
  `prisma:deploy` ditambahkan.
- `.env.example` ditulis ulang dengan seluruh variabel yang dibutuhkan.
- `vite.config.ts`: proxy meneruskan header Host agar resolusi domain teruji
  lokal, dan bundel dipecah.
- Mode pratinjau lokal: `ALLOW_LOCAL_PREVIEW` dan `PREVIEW_HOST`.

### Skrip

- `scripts/dev-domain-setup.ts` â€” memeriksa dan menyiapkan pemetaan hostname
  lokal, menjelaskan tiga cara menguji multi-domain.
- `scripts/register-sso-client.ts` â€” mendaftarkan aplikasi sebagai klien SSO di
  database ONE UNUSU dan menulis client key ke `.env`.

### Pengujian

- `tests/builder-validation.test.ts` â€” 17 tes validasi skema.
- `tests/tenant-isolation.test.ts` â€” 11 tes isolasi tenant terhadap database
  sungguhan.
- `tests/smoke-api.ts` â€” 32 pemeriksaan endpoint: login, CSRF, resolusi domain,
  penolakan domain asing, pemisahan website utama, logout.
- `tests/e2e-crud.ts` â€” 32 pemeriksaan alur CRUD lengkap termasuk validasi
  konfigurasi widget dan draft versus terbit. Idempotent pada dua run berturut.

### Perbaikan

- Karakter rusak pada `ProdiWebsiteLayout` (urutan byte UTF-8 yang salah)
  diganti `&bull;`.
- `req.hostname` Express bersifat read-only; hasil normalisasi dipindah ke
  `req.requestHostname`.
- Nama relasi Prisma yang salah (`permissionGroups` menjadi
  `UserRolePermissionGroup`).
- Ketidakcocokan tipe union axios pada mutasi mata kuliah.

### Catatan migrasi

Jalankan pada salinan database terlebih dahulu:

```bash
npx prisma migrate deploy
npm run db:seed
```

Seeder aman dijalankan ulang. Akun Super Admin hanya dibuat bila
`SEED_SUPERADMIN_PASSWORD` diisi dan belum ada akun dengan email atau username
tersebut.

## 2026-11-07 (lanjutan) — Kesiapan deployment VPS

Hostname asli baru diuji di VPS, jadi kode disiapkan agar deployment tidak
menemukan kejutan.

### Perbaikan

- `hostnameResolver` sebelumnya hanya membaca `X-Forwarded-Host` ketika
  `trust proxy` aktif, dan pada production nilainya `loopback`. Nginx
  menulis `Host` asli, bukan forwarded, sehingga urutan pembacaan dibalik:
  `Host` didahulukan, `X-Forwarded-Host` menjadi cadangan. Tanpa perbaikan
  ini seluruh domain di VPS berpotensi terbaca sebagai `localhost`.
- `trust proxy` kini dikendalikan variabel `TRUST_PROXY`, bukan disimpulkan
  dari `NODE_ENV`. Rate limit per IP dan audit log bergantung pada ini.

### Konfigurasi

- `.env` dan `.env.example` mendapat `TRUST_PROXY`,
  `ALLOW_LOCAL_PREVIEW`, dan `PREVIEW_HOST`.

### Berkas deployment

- `deploy/nginx.conf` — satu upstream untuk seluruh domain, penerusan
  `Host` wajib, rate limit terpisah untuk login dan API, cache aset statis,
  dan daftar `server_name` 14 prodi plus portal dan website utama.
- `deploy/ecosystem.config.json` — konfigurasi PM2 mode single instance.
- `docs/DEPLOYMENT.md` — panduan lengkap dari prasyarat server, database,
  migrasi, build, Nginx, SSL certbot, pendaftaran klien SSO produksi,
  verifikasi, backup, sampai daftar periksa go live.

### Catatan

File hosts hanya untuk pengujian lokal. Di VPS, pemisahan domain terjadi
melalui Nginx yang meneruskan header `Host` asli ke satu aplikasi.
