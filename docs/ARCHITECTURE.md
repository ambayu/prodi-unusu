# Arsitektur

Dokumen ini menjelaskan bagaimana aplikasi disusun dan bagaimana permintaan
diproses. Sifatnya teknis dan mengikat: perubahan struktur wajib memperbarui
dokumen ini.

## 1. Prinsip

- **Satu codebase, satu deployment.** Frontend React dan backend Express berada
  di repository yang sama. Express menyajikan API sekaligus hasil build client.
- **Modular monolith.** Modul dipisahkan secara logis di folder, bukan sebagai
  layanan terpisah.
- **Tenant ditentukan backend.** Tenant publik berasal dari hostname yang
  terdaftar di database. Tenant admin berasal dari penugasan peran pengguna.
  Tidak ada tenant yang diterima dari body atau query tanpa verifikasi.
- **Tidak ada fallback tenant.** Domain yang tidak terdaftar ditolak dengan 404,
  bukan diarahkan ke prodi lain.
- **Dua ekosistem tampilan.** Website utama universitas dan website program
  studi memiliki layout, navbar, dan landing page masing-masing.

## 2. Susunan folder

```text
src/
  client/
    app/          store situs, penjaga rute
    components/   komponen bersama, termasuk ui/ dasar
    hooks/        useSite, useSeo
    modules/
      main-website/   layout, navbar, footer, landing page universitas
      prodi-website/  layout, navbar, footer, landing page prodi
    pages/
      admin/      halaman portal administrasi
      public/     halaman publik prodi
    services/     lapisan akses API
  server/
    config/       pembacaan environment terpusat
    middlewares/  auth, csrf, tenant resolver, tenant scope, error handler
    modules/
      auth/       login lokal, tukar tiket SSO, refresh, logout
      public/     endpoint baca publik
      admin/      endpoint kelola: website, builder, konten, publikasi,
                  media, pengguna, organisasi
    services/     logika lintas modul: tenant, auth, halaman, kurikulum, audit
    utils/        error aplikasi dan validasi
    app.ts        perakitan aplikasi Express
    server.ts     titik masuk proses
  shared/
    constants/    katalog permission, data organisasi, registry widget
    schemas/      skema Zod
    types/        tipe yang dipakai server dan client
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  builder-validation.test.ts
  tenant-isolation.test.ts
  smoke-api.ts
  e2e-crud.ts
```

## 3. Alur permintaan publik

1. Browser membuka `https://sin.unusu.ac.id`.
2. Nginx meneruskan permintaan ke Express dengan header `Host` asli.
3. `hostnameResolver` menormalkan hostname menjadi huruf kecil tanpa port.
4. `classifySurface` menentukan permukaan: `main`, `prodi`, atau `admin`.
5. `tenantContextLoader` mencari hostname di tabel `domains`. Bila tidak ada
   atau nonaktif, permintaan ditolak dengan kode `DOMAIN_NOT_REGISTERED`.
6. Endpoint publik memakai `req.tenant.id` sebagai satu-satunya sumber cakupan.
7. Client menerima `surface` dan `site`, lalu merender ekosistem yang sesuai.

Hostname yang dianggap website utama dan portal admin ditentukan konfigurasi
`MAIN_SITE_HOSTS` dan `ADMIN_HOST`, bukan pencocokan pola string.

Landing page bersifat publik: pengunjung tidak perlu login. Login hanya
diperlukan untuk `/admin`. Karena itu host loopback (`localhost`, `127.0.0.1`,
`::1`) diperlakukan sebagai website prodi pada pengembangan, dengan tenant dari
`PREVIEW_HOST`, atau tenant aktif pertama bila variabel itu kosong. Host publik
yang tidak terdaftar tetap ditolak dan tidak pernah mendapat tenant cadangan.

## 4. Alur permintaan admin

1. `authenticate` membaca cookie httpOnly, memverifikasi JWT, lalu memastikan
   baris `sessions` masih aktif dan belum dicabut.
2. Permission efektif dimuat ulang dari database pada setiap permintaan,
   sehingga pencabutan hak berlaku seketika tanpa menunggu token kedaluwarsa.
3. `csrfProtection` mewajibkan header `X-CSRF-Token` pada setiap permintaan
   tulis, dicocokkan dengan cookie CSRF sesi tersebut.
4. `resolveScopedTenantId` menentukan tenant yang boleh dikelola dari penugasan
   peran. Super Admin boleh memilih tenant lewat query; Admin Prodi dan Editor
   hanya boleh pada tenant yang ditugaskan.
5. `requirePermission` memeriksa izin per endpoint.
6. Setiap operasi baca dan tulis memakai tenant hasil langkah 4, bukan nilai
   dari body.
7. Aksi sensitif dicatat ke `audit_logs` lewat `recordAudit`.

## 5. Autentikasi

Dua jalur masuk, satu jenis sesi.

**SSO ONE UNUSU (jalur utama).**

```text
Pengguna klik Masuk dengan ONE UNUSU
        v
Portal ONE UNUSU menerbitkan tiket sekali pakai
        v
Portal mengarahkan ke /sso/callback?client_id=...&token=...
        v
Client memanggil POST /api/v1/auth/sso
        v
Server memverifikasi tiket server-ke-server memakai client_key
        v
Server membuat atau menyelaraskan akun lokal, lalu membuat sesi
        v
Cookie httpOnly dan cookie CSRF ditulis
```

**Kata sandi lokal (jalur darurat).** `POST /api/v1/auth/login` membandingkan
kata sandi dengan hash bcrypt. Dipakai untuk akun bootstrap dan ketika portal
SSO tidak dapat dihubungi. Dibatasi 10 percobaan per 15 menit per alamat IP.

**Isi sesi.**

- JWT berumur pendek di cookie `httpOnly`, `Secure` pada production, `SameSite=Lax`.
- Baris `sessions` menyimpan `tokenId`, `csrfToken`, waktu kedaluwarsa, dan
  waktu pencabutan. Satu baris per perangkat.
- Logout mencabut baris sesi, bukan sekadar menghapus cookie.
- Menonaktifkan akun mencabut seluruh sesinya.
- Maksimum 10 sesi aktif per pengguna; sesi terlama dicabut otomatis.

## 6. Website builder

- Halaman disimpan sebagai data terstruktur: `pages` lalu `page_sections` lalu
  `section_widgets`.
- Setiap instance widget menyimpan `widgetId`, `variantCode`, `configJson`, dan
  `sortOrder`.
- Registry di `src/shared/constants/organization.ts` menentukan widget yang
  tersedia. Setiap tipe memiliki skema konfigurasi Zod di
  `src/shared/schemas/builder.ts`.
- Konfigurasi divalidasi sebelum disimpan. HTML dan script bebas tidak dapat
  masuk karena field hanya menerima teks dan angka dengan batas panjang.
- Publikasi memvalidasi seluruh konfigurasi widget terlebih dahulu. Halaman
  tanpa section aktif atau tanpa widget ditolak.
- Setiap perubahan metadata dan publikasi membuat snapshot di `page_versions`,
  sehingga versi lama dapat dipulihkan.
- Website publik hanya membaca halaman dengan `isPublished = true`. Draft tidak
  pernah tampil.

## 7. Pemisahan website utama dan program studi

| Aspek | Website utama | Website prodi |
|---|---|---|
| Layout | `MainWebsiteLayout` | `ProdiWebsiteLayout` |
| Navigasi | `MainNavbar` | Menu dari tabel `menus` tenant |
| Landing page | `MainLandingPage` | `ProdiLandingPage` plus widget |
| Tenant | Tidak ada | Dari tabel `domains` |
| Theme | Global | Per tenant di tabel `themes` |

Aturan yang dijaga: komponen kedua ekosistem tidak saling impor. Perubahan pada
satu ekosistem tidak boleh mengubah yang lain. Komponen dasar seperti tombol,
input, modal, dan toast boleh dipakai bersama.

## 8. File dan media

- Unggahan memakai multer dengan batas ukuran dan daftar MIME yang diizinkan.
- Nama file dibuat acak dan ekstensi diturunkan dari MIME yang lolos, bukan dari
  nama kiriman client, sehingga path traversal tidak mungkin.
- Metadata disimpan di `media_assets` dengan pemilik tenant.
- File disajikan dari `/uploads/media`. Dokumen dan RPS berada di
  `uploads/documents` dan `uploads/rps` dan tidak disajikan sebagai berkas
  statis bebas, sehingga aksesnya dapat dikendalikan.

## 9. Kesalahan dan validasi

- Handler dibungkus `asyncHandler` agar penolakan promise sampai ke pemusat error.
- `validate` memeriksa body, query, dan params dengan Zod, lalu menulis hasil
  bersih ke `req.validated`.
- Kesalahan validasi menghasilkan 422 dengan `fieldErrors` per field.
- `AppError` membawa status dan kode yang eksplisit.
- Kesalahan Prisma diterjemahkan: `P2002` menjadi 409, `P2025` menjadi 404.
- Pada production, pesan internal tidak dikirim ke client.

## 10. Kualitas

Isolasi tenant, least privilege, ketersediaan, performa, aksesibilitas,
responsif, SEO per domain, observability, dan kemudahan pemeliharaan merupakan
persyaratan lintas modul yang diuji di `tests/`.
