# Aturan Pengembangan

Aturan ini mengikat setiap perubahan kode, termasuk perubahan yang dilakukan
alat bantu AI.

## 1. Sebelum menulis kode

1. Baca `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
   `docs/DESIGN-RULES.md`, dan `docs/CHANGELOG.md`.
2. Periksa `package.json`, `prisma/schema.prisma`, migrasi terakhir, dan tes yang
   ada.
3. Jangan mengasumsikan nama tabel, nama field, atau struktur folder sebelum
   memeriksanya.
4. Jangan mengubah struktur folder atau memindahkan modul tanpa persetujuan.

## 2. Keputusan yang sudah dikunci

| Hal | Keputusan |
|---|---|
| Autentikasi | JWT di cookie httpOnly, sesi tercatat di tabel `sessions` |
| Login | SSO ONE UNUSU jalur utama via izin masuk `prodi-unusu:masuk_*` (tidak ada peran ADMIN_PRODI kaku di portal pusat; SUPERADMIN dapat masuk ke semua prodi), kata sandi lokal jalur darurat |
| Database | MySQL lokal `prodi_unusu_db` pada tahap pengembangan |
| Fakultas | Data induk, bukan tenant, tidak memiliki domain |
| Ikon | Heroicons saja |
| Validasi | Zod, satu sumber skema di `src/shared/schemas` |

Keputusan di atas tidak boleh diubah tanpa persetujuan pemilik sistem.

## 3. Implementasi backend

- Pertahankan modular monolith. Jangan membuat layanan terpisah.
- Pisahkan route, layanan, akses data, dan validasi. Logika bisnis tidak boleh
  berada di route handler yang tebal.
- Setiap input divalidasi dengan Zod melalui middleware `validate`.
- Gunakan `asyncHandler` dan lempar `AppError`, jangan menulis try/catch yang
  mengulang penanganan yang sama.
- Setiap endpoint admin wajib memakai `authenticate`, `csrfProtection`, dan
  `requirePermission`.
- Tenant selalu berasal dari `resolveScopedTenantId`, tidak pernah dari body.
- Operasi berantai memverifikasi rantai kepemilikan sampai tenant.
- Operasi yang menyentuh beberapa tabel memakai `prisma.$transaction`.
- Aksi sensitif dicatat lewat `recordAudit`.
- Kegagalan harus menghasilkan pesan berbahasa Indonesia yang dapat ditindaklanjuti
  pengguna, tanpa membocorkan detail internal pada production.

## 4. Implementasi frontend

- Semua akses API melalui lapisan `src/client/services`. Komponen tidak memanggil
  `axios` langsung.
- Server state memakai TanStack Query dengan kunci yang konsisten:
  `['admin', '<modul>']` dan `['public', '<modul>']`.
- Client state memakai Zustand, hanya untuk hal yang benar-benar global.
- Tidak ada data contoh atau angka statis di komponen. Bila data belum ada,
  tampilkan keadaan kosong.
- Tidak memakai `alert()` atau `confirm()`. Gunakan `useToast()` dan
  `ConfirmDialog`.
- Setiap halaman data menyediakan tiga keadaan: memuat, kosong, gagal.
- Menu dan tombol disembunyikan bila pengguna tidak memiliki izin, tetapi
  backend tetap menjadi penentu akhir.
- Token CSRF disisipkan otomatis oleh interceptor; jangan menyalinnya manual.
- Tidak menyimpan token apa pun di `localStorage`.

## 5. Database

- Semua perubahan skema melalui Prisma migration.
- Jangan mengedit database production secara manual.
- Setiap tabel milik tenant wajib memiliki `study_program_id` atau relasi yang
  dapat diverifikasi.
- Tambahkan index pada kolom yang dipakai untuk filter dan pengurutan.
- Seeder harus idempotent dan tidak menjalankan `deleteMany()` pada data
  operasional.

## 6. Pengujian

- Setiap fitur baru wajib memiliki pengujian.
- Minimal yang harus ada: valiasi skema, isolasi tenant, dan alur CRUD utama.
- Pengujian isolasi tenant memakai dua tenant berbeda dan mencoba akses silang
  dengan ID valid dari tenant lain.
- Uji asap endpoint dan uji CRUD end-to-end harus idempotent: dapat dijalankan
  berulang tanpa gagal karena sisa run sebelumnya.
- Sebelum menyatakan selesai, jalankan:

```bash
npm run typecheck
npm test
npm run build
npx tsx tests/smoke-api.ts   # dengan server aktif
npx tsx tests/e2e-crud.ts    # dengan server aktif
```

## 7. Keamanan

- Kata sandi di-hash dengan bcrypt, biaya 12.
- Rahasia hanya di environment, tidak pernah di repository.
- Cookie sesi `httpOnly` dan `Secure` pada production.
- Setiap permintaan tulis wajib lolos pemeriksaan CSRF.
- Rate limit login 10 percobaan per 15 menit per alamat IP.
- Nama file unggahan dibuat acak; ekstensi diturunkan dari MIME yang lolos.
- Batas ukuran unggahan 10 MB dan daftar MIME dibatasi.
- Jangan mencatat kata sandi, token, atau isi cookie ke log.

## 8. Setelah menyelesaikan fitur

1. Perbarui `docs/CHANGELOG.md`.
2. Perbarui dokumentasi terkait bila kontrak API atau skema berubah.
3. Sertakan langkah migrasi bila skema berubah.
4. Laporkan: file yang berubah, perintah yang dijalankan, hasil, risiko, dan
   pekerjaan tersisa.
5. Jangan menghapus fitur yang sudah berjalan tanpa persetujuan.

## 9. Gaya penulisan

- Bahasa komentar dan pesan pengguna: bahasa Indonesia.
- Komentar menjelaskan alasan, bukan mengulang isi kode.
- Nama variabel dan fungsi dalam bahasa Inggris, konsisten dengan tipe Prisma.
- Tidak menggunakan em dash pada teks yang tampil ke pengguna.
- Tidak menambahkan emoji pada kode dan antarmuka.
