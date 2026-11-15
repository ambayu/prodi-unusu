# ADR-002 — Arsip Dokumen Prodi dari LPM/LPPM (Read-Only + Kata Sandi)

- **Status:** Diterima
- **Tanggal:** 2026-11-16
- **Konteks aplikasi:** `prodi-unusu`, `one-unusu`, `lpm-unusu`, `lppm-unusu`

## Konteks

Website setiap program studi perlu menampilkan dokumen mutu (SK, panduan,
instrumen akreditasi) yang selama ini dikelola LPM dan LPPM. Sebelumnya
`/admin/dokumen` di prodi-unusu memiliki tabel `documents` **lokal** dengan CRUD
penuh. Akibatnya:

1. Dokumen yang sama tersimpan di tiga tempat (LPM, LPPM, dan tiap prodi),
   sehingga versi yang beredar tidak dapat dipastikan yang terbaru.
2. Admin prodi dapat mengunggah dokumen "mutu" yang tidak pernah diverifikasi
   LPM/LPPM.
3. Tabel `documents` menyimpan PDF sebagai **data URL base64** di kolom
   `filePdfUrl`. PDF 5 MB menjadi ± 6,7 MB teks di dalam baris database; setiap
   daftar dokumen ikut menarik seluruh isi PDF, dan pratinjau tidak mendukung
   HTTP Range.

Prodi tetap membutuhkan pembatas akses: tidak semua dokumen mutu layak dibuka
untuk publik umum (mis. dokumen internal berisi data dosen).

## Keputusan

### 1. Satu sumber kebenaran: arsip LPM/LPPM

`/admin/dokumen` **tidak lagi memiliki data sendiri**. Seluruh isinya dibaca
dari arsip LPM/LPPM melalui ONE UNUSU API Hub (`POST /api/v2/website/dokumen`).
Tidak ada penggabungan dengan data lokal. Filter diterapkan otomatis:
`tujuanPublish = 'prodi'` dan `prodiCode` = kode prodi aktif. Pemetaan kode
prodi memakai kolom baru `StudyProgram.externalProdiCode` (mis. `TIF`).

Konsekuensi: tabel `documents` lokal **dihapus** beserta seluruh CRUD dan
tipenya di klien. Panel prodi menjadi **read-only** secara struktural, bukan
sekadar karena izin.

### 2. Kata sandi per prodi, disimpan sebagai hash scrypt

Setiap prodi **wajib** memasang satu kata sandi yang berlaku untuk seluruh
arsipnya. Kata sandi disimpan di `WebsiteSetting` sebagai hash **scrypt**
berformat `scrypt$N$r$p$saltHex$hashHex` — tidak pernah plaintext, tidak
pernah dikirim balik ke klien.

Kata sandi berlaku **kapan saja**: tanpa batas waktu sesi dan tanpa batas
percobaan. Verifikasinya **stateless per-aksi** — `POST
/api/v1/public/arsip-dokumen/unlock` mengembalikan `{ valid }`, kata sandi
hanya hidup di memori React, lalu dikirim ulang lewat header
`X-Arsip-Password` pada setiap permintaan pratinjau/unduh.

Alasan tidak memakai sesi/cookie: prodi tidak ingin pengunjung "terlanjur
login" dan lupa bahwa arsipnya sensitif; memeriksa ulang setiap aksi membuat
perilaku izin mudah diprediksi dan tidak bergantung pada penyimpanan sesi.

### 3. Daftar terbuka, berkas terlindungi

Halaman publik `/dokumen` menampilkan **daftar dokumen tanpa kata sandi**: siapa
pun boleh melihat judul, kategori, tahun, dan nomor. Kata sandi prodi diminta
saat pengunjung menekan **"Lihat Dokumen"**, lalu berkas dipratinjau lebih dulu
sebelum dapat diunduh.

Alasan: arsip mutu perlu mudah ditemukan (pengunjung tahu dokumen apa yang
tersedia), sementara isi berkas tetap terbatas. Perlindungan diletakkan pada
**isi berkas**, bukan pada keberadaan dokumen. Karena itu `fileUrl` **tidak
pernah** ikut pada payload daftar; kunci hanya membuka akses pratinjau/unduh.

Bila prodi **belum** memasang kata sandi, tidak ada kata sandi yang benar,
sehingga setiap percobaan pratinjau/unduh ditolak dengan
`ARSIP_PASSWORD_INVALID` — diperlakukan sama seperti kata sandi salah agar
status kunci prodi tidak dapat disimpulkan dari respons.

**Pengelola prodi tidak melewati jalur ini.** Admin yang sudah login membuka
berkas lewat rute ber-sesi (`GET /admin/arsip-dokumen/:id/file`); haknya sudah
dibuktikan oleh sesi login, jadi kata sandi arsip tidak perlu diketik ulang.
Kata sandi tetap berlaku penuh untuk pengunjung publik di `/dokumen` — rute
admin tertutup bagi mereka (`NO_SESSION`).

### 4. Kata sandi salah dijawab 403, bukan 401

Interceptor klien (`src/client/services/api.ts`) melakukan logout otomatis pada
respons 401 non-`/auth/`. Bila salah ketik sandi dijawab 401, pengunjung akan
terlempar keluar. Karena itu kegagalan sandi memakai **403** dengan kode
`ARSIP_PASSWORD_INVALID`. Pemeriksaan sandi juga **tidak** dihitung sebagai
insiden keamanan — salah ketik adalah hal biasa.

### 5. Token layanan arsip antar-aplikasi

prodi-unusu memanggil ONE UNUSU sebagai server (tanpa sesi pengguna). Token
ditandatangani `ARSIP_SERVICE_TOKEN_SECRET` dengan format
`arsip.<clientId>.<hmac>` (HMAC-SHA256 atas `arsip-dokumen|<clientId>`), dan
hanya memberi izin **baca** — `dokumen:view` di LPM, `dokumen.view` di LPPM.
Secret harus **sama** di keempat aplikasi; tidak ada jalur tulis lewat token
ini, sehingga portal tidak dapat mengubah arsip lembaga.

### 6. PDF disimpan sebagai berkas + URL bertanda tangan

PDF **tidak lagi base64**. LPM/LPPM menerima unggahan lewat
`POST /api/dokumen/berkas` (JSON `{ nama, data }`; base64 hanya alat
transportasi sekali jalan), menulis berkas ke `uploads/dokumen` dengan nama
acak, lalu menyimpan URL pendek:

```
/api/arsip-berkas/<namaAcak>.pdf?t=<hmac-32hex>
```

Tanda tangan (`ARSIP_FILE_URL_SECRET`) membuat URL tidak dapat ditebak dan
tidak dapat dipakai untuk membaca berkas dokumen lain. Penyajiannya mendukung
**HTTP Range** agar pratinjau PDF tampil bertahap, dan mengirim
`Content-Security-Policy: frame-ancestors` agar berkas hanya boleh dibingkai
aplikasi keluarga UNUSU.

Klien publik **tidak menerima URL ini**. Payload publik hanya memuat
`fileTersedia: true`; PDF diambil melalui proxy prodi-unusu yang memeriksa kata
sandi lebih dulu. Bila URL bocor ke JSON, siapa pun dapat mengunduh PDF tanpa
kata sandi.

### 7. Migrasi otomatis dokumen lama

`arsipMigrasi.ts` dijalankan saat LPM/LPPM start: setiap `filePdfUrl` yang
masih berupa `data:` dikonversi menjadi berkas + URL bertanda tangan. Sifatnya
idempoten dan tidak memblokir server. Baris yang gagal dibiarkan sebagai base64
agar isinya tidak hilang, dan dicatat di log.

## Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|---|---|
| Salin dokumen ke database prodi (sinkronisasi) | Mengembalikan masalah sumber ganda yang justru ingin dihapus. |
| Berkas PDF statis publik (`/uploads/*`) | Siapa pun yang tahu URL dapat mengunduh tanpa kata sandi. |
| Simpan base64 di kolom database | Baris membengkak ± 33%, daftar ikut menarik seluruh PDF, tanpa Range/cache. |
| Sesi cookie untuk membuka arsip | Membuat izin "menempel" pada peramban; perilaku sulit diprediksi dan sulit dicabut. |
| 401 untuk sandi salah | Memicu logout otomatis di klien. |

## Konsekuensi

- Admin prodi **wajib** memasang kata sandi sebelum arsipnya dapat dibuka.
- Bila LPM/LPPM tidak dapat dihubungi, `sumberGagal` dilaporkan pada `meta` dan
  daftar menampilkan sumber yang berhasil saja (bukan galat total).
- Izin `documents` menyusut menjadi `['view']`; peran `EDITOR_DOKUMEN` berubah
  menjadi "Pengelola Arsip Dokumen".
- Menghapus dokumen hanya dapat dilakukan di LPM/LPPM, bukan di portal prodi.
- Secret baru yang harus diselaraskan di beberapa aplikasi:
  `ARSIP_SERVICE_TOKEN_SECRET` (4 aplikasi) dan `ARSIP_FILE_URL_SECRET`
  (LPM + LPPM).

## Verifikasi

Diuji end-to-end terhadap server berjalan:

- Unggah: `POST /api/dokumen/berkas` menolak non-PDF (400) dan tanpa token
  (401); unggahan sah menghasilkan URL bertanda tangan (201). Berkas dapat
  dibaca kembali sebagai `application/pdf`, dan URL tanpa tanda tangan → 403.
- Prodi: **daftar terbuka tanpa kata sandi**; pratinjau tanpa sandi ditolak 403;
  sandi salah → 403 (bukan 401); sandi benar → pratinjau dan unduh
  mengembalikan `application/pdf` dengan isi identik.
- Admin prodi: pratinjau dan unduhan berhasil **tanpa kata sandi arsip** lewat
  sesi login (`200 application/pdf`, unduhan ber-`Content-Disposition:
  attachment`), sedangkan permintaan tanpa sesi ditolak `401 NO_SESSION`.
- Prodi tanpa kata sandi: daftar tetap tampil, tetapi pratinjau dan `unlock`
  sama-sama ditolak `ARSIP_PASSWORD_INVALID` (diperlakukan seperti sandi salah).
- `POST /public/arsip-dokumen/unlock` hanya memverifikasi sandi; ia tidak lagi
  mengirim daftar dokumen.
- Payload publik tidak memuat `fileUrl`.
- `lpm_documents` dan `lppm_documents` tidak lagi menyimpan baris base64.
