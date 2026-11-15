# Aturan Proyek (Pengikat)

Dokumen ini adalah **indeks pengikat**, bukan salinan. Setiap aturan tinggal di
sumbernya agar tidak ada dua versi yang bisa saling bertentangan. Bila isi di
sini berbeda dengan sumbernya, **sumber yang berlaku**.

## 1. Hierarki aturan

Saat dua aturan bertentangan, urutan prioritas dari tertinggi:

1. Instruksi agen tingkat akar (`AGENTS.md`/`CLAUDE.md`) bila ada.
2. Dokumen ini (`docs/PROJECT_RULES.md`).
3. `docs/ARCHITECTURE.md` dan `docs/design-system/`.
4. `docs/routes/{modul}/RULES.md` (aturan lokal modul).
5. Konvensi lokal di dalam direktori yang sedang diubah.

Aturan yang lebih spesifik **boleh memperketat** aturan global, tetapi tidak boleh
melanggarnya tanpa keputusan formal (ADR).

## 2. Aturan global halaman dan template

> Setiap halaman wajib memakai template halaman yang sesuai dan komponen bersama
> yang tersedia. Dashboard memakai template dashboard tersendiri. Menggandakan
> struktur UI yang sudah ada di template/komponen bersama adalah pelanggaran.

Rincian dan daftar template: `docs/design-system/PAGE_TEMPLATES.md`.
Daftar komponen bersama: `docs/design-system/COMPONENTS.md`.

- Halaman admin memakai `AdminLayout`. Halaman publik memakai `PageHeader`.
- Formulir tambah/ubah memakai **rute tersendiri** dengan `FormPageTemplate`
  sesuai ADR-004. Modal **bukan** tempat alur create/edit.
- Setiap kelompok field berada di dalam **kartu ber-heading**; tombol
  `Simpan`/`Batal` berada di luar kartu pada action bar terpisah.
- Setiap halaman data wajib menyediakan tiga keadaan: memuat, kosong, gagal.

## 3. Larangan yang berlaku di mana pun

| Larangan | Sumber |
|---|---|
| `alert()` dan `confirm()` bawaan browser | `DEVELOPMENT-RULES.md` §4 |
| Em dash (`—`) pada teks yang tampil ke pengguna | `DEVELOPMENT-RULES.md` §9 |
| Emoji pada kode dan antarmuka | `DEVELOPMENT-RULES.md` §9 |
| Keluarga ikon selain `@heroicons/react` | `DESIGN_RULES.md` |
| Data contoh atau angka statis di komponen | `DEVELOPMENT-RULES.md` §4 |
| Menyimpan token/kata sandi di `localStorage` | `DEVELOPMENT-RULES.md` §4 |
| Memanggil `axios` langsung dari komponen | `DEVELOPMENT-RULES.md` §4 |
| Gradien dekoratif, glassmorphism berlebihan, ilustrasi tanpa informasi | `DESIGN_RULES.md` |

## 4. Empat keadaan wajib untuk pekerjaan UI

1. **Memuat** -> `LoadingState`.
2. **Kosong** -> `EmptyState` yang menjelaskan langkah berikutnya.
3. **Gagal** -> `ErrorState` dengan pesan asli backend dan tombol coba lagi.
4. **Interaktif** -> fokus terlihat, dapat ditutup dengan `Escape`, target sentuh
   memadai untuk tombol aksi utama.

## 5. Kontrak API dan keamanan

Rincian di `docs/DEVELOPMENT-RULES.md` §3, §5, dan §7. Ringkasnya:

- Tenant **selalu** dari `resolveScopedTenantId`, tidak pernah dari body.
- Setiap input divalidasi Zod melalui middleware `validate`.
- Endpoint admin memakai `authenticate`, `csrfProtection`, `requirePermission`.
- Kegagalan kata sandi/sesi tidak boleh memakai status `401` pada permintaan
  non-`/auth/`, karena klien melakukan logout otomatis (ADR-002 §4).
- Rahasia hanya di environment, tidak pernah di repository.

## 6. Dokumentasi wajib saat mengubah kode

| Yang berubah | Dokumen yang diperbarui |
|---|---|
| Perilaku/kontrak modul | `docs/routes/{modul}/RULES.md` |
| Setiap perubahan berarti | `docs/CHANGELOG.md` |
| Skema database | `docs/DATABASE.md` + langkah migrasi |
| Pola arsitektur atau integrasi baru | ADR di `docs/decisions/` |
| Template/komponen baru | `PAGE_TEMPLATES.md` / `COMPONENTS.md` |

Modul yang **belum** punya `docs/routes/{modul}/RULES.md` wajib membuatnya saat
modul itu pertama kali diubah, bukan menunggu semua modul selesai.

## 7. Kondisi dokumentasi yang jujur

Dokumentasi proyek ini mencatat keadaan apa adanya, termasuk kekurangan. Bila
sebuah template belum ada, tulis "belum ada" dan jangan merujuknya seolah sudah
tersedia. Bila implementasi berbeda dari dokumen, catat perbedaannya secara
eksplisit pada bagian "Ketidaksesuaian yang diketahui" seperti di
`docs/design-system/DESIGN_RULES.md`.

## 8. Dokumentasi terkait

- `docs/DEVELOPMENT-RULES.md` — aturan pengembangan mengikat
- `docs/ARCHITECTURE.md` — rancangan sistem
- `docs/DATABASE.md` — skema data
- `docs/DESIGN-RULES.md` dan `docs/design-system/` — aturan visual
- `docs/decisions/` — ADR-001 sampai ADR-004
- `docs/routes/` — aturan per modul
