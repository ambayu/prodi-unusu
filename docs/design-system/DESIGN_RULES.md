# Aturan Desain (Ringkasan Pengikat)

Dokumen ini adalah **ringkasan** yang menautkan ke rincian. Sumber kebenaran visual
ada di `COLORS.md`, `TYPOGRAPHY.md`, `COMPONENTS.md`, dan `PAGE_TEMPLATES.md`.

## Prinsip

Modern, minimalis, profesional, akademik. Yang dilarang:

- Gradien ungu-biru berlebihan, kartu melayang tanpa alasan, ilustrasi dekoratif
  tanpa informasi (tampilan generik hasil AI).
- Efek neon dan glassmorphism berlebihan.
- Emoji sebagai pengganti ikon antarmuka.

## Aturan halaman

1. Halaman admin memakai `AdminLayout`; jangan menyusun ulang sidebar/topbar.
2. Halaman publik memakai `PageHeader`; halaman admin tidak.
3. Setiap halaman data wajib punya tiga keadaan: memuat, kosong, gagal.
4. Aksi destruktif wajib `ConfirmDialog`; `alert()`/`confirm()` dilarang.
5. Tabel dibungkus `overflow-x-auto`; label input wajib terhubung ke field.
6. Dashboard memakai komposisi kartu metrik, bukan satu paragraf.

## Aturan formulir

- Setiap kelompok field berada di dalam **kartu dengan heading**, tidak di latar
  halaman kosong.
- Tombol `Simpan`/`Batal` berada di luar kartu field atau pada action bar terpisah.
- Formulir tambah/ubah yang panjang memakai **`FormPageTemplate` pada rute
  tersendiri** (`/baru`, `/:id/ubah`). `FormModal` tersisa untuk formulir pendek
  pada halaman daftar sampai halamannya dimigrasikan. Lihat `PAGE_TEMPLATES.md`.

## Ikon

Hanya `@heroicons/react`. Tanpa keluarga ikon kedua.

## Aksesibilitas

Kontras minimal WCAG AA, fokus terlihat (`:focus-visible` di `index.css`), setiap
gambar memiliki `alt`, struktur heading tidak melompat tingkat.

## Ketidaksesuaian yang diketahui

`docs/DESIGN-RULES.md` §3 menyebut label formulir 11px uppercase; implementasi
`.field-label` adalah `text-xs` (12px) tanpa uppercase. Implementasi yang berlaku.
