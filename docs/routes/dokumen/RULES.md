# Modul Arsip Dokumen (`/admin/dokumen` dan `/dokumen`)

## Tujuan dan cakupan

Menampilkan arsip dokumen mutu LPM/LPPM kepada program studi. Sumber data
**100%** dari ONE UNUSU API Hub (arsip LPM dan LPPM), **tidak digabung** dengan
data lokal. Tabel `documents` lokal beserta CRUD-nya sudah dihapus.

Modul ini **tidak** membuat, mengubah, menghapus, atau mengunggah dokumen.
Penerbitan dokumen dilakukan di aplikasi LPM/LPPM; prodi hanya membaca.
Satu-satunya kewenangan tulis prodi adalah memasang kata sandi arsip.

## Rute

| Rute | Berkas | Akses | Izin |
|---|---|---|---|
| `/admin/dokumen` | `src/client/pages/admin/AdminDocuments.tsx` | Admin prodi (login) | `documents.view` |
| `/dokumen` | `src/client/pages/public/DocumentsPage.tsx` | Publik (tanpa login) | kata sandi arsip prodi |

## Sumber data

| Endpoint | Fungsi |
|---|---|
| `GET /api/v1/admin/arsip-dokumen` | Daftar arsip prodi aktif (panel admin) |
| `GET /api/v1/admin/arsip-dokumen/:id/file` | Pratinjau/unduh lewat sesi login admin |
| `GET /api/v1/admin/dokumen-password` | Status kata sandi arsip |
| `PUT /api/v1/admin/dokumen-password` | Memasang/mengganti kata sandi arsip |
| `GET /api/v1/public/arsip-dokumen` | Daftar arsip untuk publik (tanpa kata sandi) |
| `POST /api/v1/public/arsip-dokumen/unlock` | Memeriksa kata sandi (`{ valid, meta }`) |
| `POST /api/v1/public/arsip-dokumen/:id/preview` | Pratinjau berkas (wajib kata sandi) |
| `POST /api/v1/public/arsip-dokumen/:id/download` | Unduh berkas (wajib kata sandi) |

Server memanggil `services/arsipDokumenService.ts` -> ONE UNUSU
`POST /api/v2/website/dokumen` memakai token layanan `arsip.<clientId>.<hmac>`.
Kata sandi dikelola `services/dokumenPasswordService.ts` (hash scrypt).

## Template dan komponen

- `/admin/dokumen`: **`AdminLayout`** (judul, deskripsi, dan slot `actions` untuk
  tombol `Pasang/Ubah Kata Sandi`).
- `/dokumen`: **`PageHeader`** untuk kepala halaman publik, lalu grid dua kolom
  `lg:grid-cols-[260px_minmax(0,1fr)]` (sidebar kategori + daftar dokumen).
- Komponen bersama: `LoadingState`, `EmptyState`, `ErrorState`,
  `DokumenPreviewModal`, `useToast()`.
- Dialog kata sandi publik memakai **`FormModal`** bersama agar fokus awal,
  penutupan `Escape`, dan tombol `Batal` konsisten dengan formulir lain.
- Kelas CSS bersama: `field-input`, `btn-primary`, `btn-secondary`,
  `table-base`, `.card` bila berlaku.

## Aturan implementasi

- **Daftar terbuka, berkas terlindungi.** `GET /public/arsip-dokumen`
  mengembalikan daftar tanpa kata sandi; `fileUrl` **tidak pernah** ikut pada
  payload publik agar kata sandi tidak dapat dilewati.
- **Admin tidak mengetik kata sandi.** Panel admin membuka berkas lewat rute
  ber-sesi `GET /admin/arsip-dokumen/:id/file`. Hak sudah dibuktikan login.
- **Publik wajib kata sandi** saat menekan `Lihat Dokumen`. Kata sandi hanya di
  memori React, dikirim lewat header `X-Arsip-Password`, tidak di URL dan tidak
  di `localStorage`.
- **Alur berkas: pratinjau dulu, baru unduh.** Berkas diambil `fetch` -> `blob`
  -> `<iframe src="blob:...">`, lalu tombol `Download`.
- **Prodi tanpa kata sandi diperlakukan sebagai kata sandi salah**
  (`ARSIP_PASSWORD_INVALID`), bukan pesan "belum dipasang". Status kunci tidak
  boleh dapat disimpulkan dari respons.
- Pemetaan prodi memakai `StudyProgram.externalProdiCode` ke `prodiCode` arsip.
- Filter arsip otomatis: `tujuanPublish='prodi'` + `prodiCode` prodi aktif.
- PDF **tidak** disimpan sebagai base64; LPM/LPPM menyimpan URL bertanda tangan
  ke `uploads/dokumen`.
- Dokumen hasil migrasi BAKSI dengan prefix `/uploads/dokumen/baksi/` tetap
  dibaca dari `uploads/dokumen/baksi`; unggahan baru prodi tetap memakai
  `uploads/documents`.

## Jangan diubah tanpa keputusan formal

- Sifat read-only modul ini dan penghapusan tabel `documents` lokal (ADR-002).
- Pemisahan "daftar terbuka" dan "berkas terlindungi" (ADR-002 bagian 3).
- Status `403` untuk kegagalan kata sandi. `401` akan memicu logout otomatis
  klien pada URL non-`/auth/`.
- Tidak mengirim `fileUrl` pada payload publik.

## Dokumentasi terkait

- `docs/decisions/ADR-002-dokumen-arsip-lpm-lppm.md`
- `docs/DATABASE.md` (kolom kata sandi pada `website_settings`)
- `docs/PROJECT_RULES.md`
