# UNUSU Multi-Prodi Website Management System

Satu aplikasi modular monolith untuk mengelola seluruh website program studi
Universitas Nahdlatul Ulama Sumatera Utara. Satu codebase, satu backend, satu
database, banyak domain, dan desain landing page independen per program studi.

Versi 1.0.0 | Diperbarui 2026-11-07

## Ringkasan

| Aspek | Keputusan |
|---|---|
| Arsitektur | Modular monolith fullstack |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS |
| Server state | TanStack Query |
| Client state | Zustand |
| Backend | Node.js, Express 4, TypeScript |
| ORM | Prisma 5 |
| Database | MySQL 8 |
| Validasi | Zod |
| Autentikasi | JWT di cookie httpOnly, sesi tercatat di database |
| Login | SSO ONE UNUSU sebagai jalur utama, kata sandi lokal sebagai jalur darurat |
| Ikon | Heroicons |

## Prasyarat

- Node.js 20 atau lebih baru
- MySQL 8 yang berjalan di `localhost:3306`
- Portal ONE UNUSU untuk login SSO (opsional; login lokal tetap tersedia)

## Memulai

```bash
npm install

# Siapkan konfigurasi
copy .env.example .env
# Isi DATABASE_URL, JWT_SECRET, dan SEED_SUPERADMIN_PASSWORD

# Siapkan database
npx prisma migrate deploy
npm run db:seed
```

Seeder bersifat idempotent. Menjalankannya dua kali tidak menggandakan data.
Pada run pertama ia membuat 92 permission, 4 peran, 6 role permission group,
30 menu admin, 12 widget dengan variannya, 6 fakultas, 14 program studi,
14 domain, dan akun Super Admin.

Jalankan aplikasi:

```bash
npm run dev
```

- Vite: `http://localhost:5180`
- Express: `http://localhost:5010`

## Menguji multi-domain di lokal

Karena domain asli belum aktif, ada dua cara menguji.

**Cara 1: pemetaan file hosts (paling mendekati production).**

Jalankan PowerShell sebagai Administrator, lalu:

```bash
npm run dev:domains
```

Buka `http://sin.unusu.ac.id:5180` untuk website Sistem Informasi,
`http://tif.unusu.ac.id:5180` untuk Teknik Informatika, dan
`http://prodi.unusu.ac.id:5180/admin` untuk portal administrasi.

**Cara 2: mode pratinjau lokal.**

Tambahkan ke `.env`:

```
ALLOW_LOCAL_PREVIEW=true
PREVIEW_HOST=sin.unusu.ac.id
```

Lalu buka `http://localhost:5180`. Mode ini memetakan `localhost` ke satu tenant
yang dipilih. Header `Host` tetap `localhost`, sehingga pemisahan domain tidak
teruji, tetapi isolasi tenant tetap teruji.

## Login

**Jalur utama: SSO ONE UNUSU.** Klik "Masuk dengan ONE UNUSU" pada
`http://prodi.unusu.ac.id:5180/login`. Portal mengembalikan tiket sekali pakai ke
`/sso/callback`, lalu aplikasi menukarnya menjadi sesi lokal.

Pendaftaran aplikasi sebagai klien SSO:

```bash
npx tsx scripts/register-sso-client.ts
```

**Jalur darurat: kata sandi lokal.** Buka bagian "Login kata sandi (jalur
darurat)" pada halaman login. Akun dibuat oleh seeder dari
`SEED_SUPERADMIN_PASSWORD`, atau oleh Super Admin melalui menu Pengguna.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dan Vite sekaligus |
| `npm run dev:server` | Hanya Express |
| `npm run dev:client` | Hanya Vite |
| `npm run dev:domains` | Siapkan pemetaan hostname lokal |
| `npm run build` | Build client dan server |
| `npm start` | Jalankan hasil build |
| `npm run typecheck` | Pemeriksaan tipe client dan server |
| `npm test` | Unit test dengan Vitest |
| `npm run db:seed` | Jalankan seeder |
| `npx tsx tests/smoke-api.ts` | Uji asap endpoint terhadap server aktif |
| `npx tsx tests/e2e-crud.ts` | Uji alur CRUD end-to-end |

## Struktur dokumentasi

- `docs/README.md` — dokumen ini
- `docs/PROJECT_RULES.md` — indeks aturan pengikat dan hierarki prioritas
- `docs/PRD.md` — kebutuhan produk (di `prd/docs/PRD.md`)
- `docs/ARCHITECTURE.md` — arsitektur dan alur request
- `docs/DATABASE.md` — model data dan aturan isolasi tenant
- `docs/DESIGN-RULES.md` — pedoman UI
- `docs/DEVELOPMENT-RULES.md` — aturan implementasi
- `docs/CHANGELOG.md` — riwayat perubahan
- `docs/decisions/` — ADR keputusan arsitektural (terbaru: `ADR-004-form-page-template-dan-upload-rps.md`)
- `docs/routes/<modul>/RULES.md` — aturan per modul halaman (`kurikulum`, `semester`, `dosen`, `dokumen`)
- `docs/design-system/` — registry visual dari kode aktual:
  - `DESIGN_RULES.md` — ringkasan aturan pengikat
  - `COLORS.md` — token warna (`tailwind.config.js` + `index.css`)
  - `TYPOGRAPHY.md` — keluarga font dan skala efektif
  - `COMPONENTS.md` — registry komponen bersama
  - `PAGE_TEMPLATES.md` — template halaman (`FormPageTemplate` tersedia; list/detail/dashboard belum)

### Catatan tata kelola dokumentasi

Registry `docs/design-system/` dibuat 2026-11-16 dari pembacaan langsung kode
(`tailwind.config.js`, `index.css`, `components/ui/*`). Isinya hanya komponen dan
token yang terverifikasi ada; komponen yang belum dibuat dicantumkan eksplisit
pada bagian "Belum ada".

Gap yang masih terbuka:

1. `ListPageTemplate`, `DetailPageTemplate`, dan `DashboardPageTemplate` belum ada.
2. `FormPageTemplate` sudah ada dan dipakai form mata kuliah di modul Kurikulum.
   CRUD kurikulum/semester pada halaman daftar masih `FormModal`, dan 22 halaman
   admin lain juga belum dimigrasikan.
3. ~~`docs/PROJECT_RULES.md` belum ada~~ **Sudah dibuat 2026-11-16.** Dokumen itu
   kini menjadi indeks pengikat yang menautkan ke sumber aturan, tanpa menduplikasi
   isinya. `docs/DEVELOPMENT-RULES.md` tetap menjadi rincian aturan implementasi.
4. Sebagian besar modul halaman belum punya `docs/routes/<modul>/RULES.md`. Modul
   yang belum ada wajib membuatnya saat modul itu pertama kali diubah.

## Lisensi

Internal Universitas Nahdlatul Ulama Sumatera Utara.
