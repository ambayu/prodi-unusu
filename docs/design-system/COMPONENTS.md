# Registry Komponen Bersama

Hanya komponen yang **benar-benar ada** di `src/client/components/ui/` dan telah
dibaca sumbernya. Jangan menambahkan entri untuk komponen yang belum diimplementasi.

## Layout dan halaman

| Komponen | Berkas | Tanggung jawab | Props penting |
|---|---|---|---|
| `AdminLayout` | `components/AdminLayout.tsx` | Sidebar + topbar + slot konten admin; membungkus `AdminPanelTemplate` kecuali `rawContent` | `title`, `description`, `actions`, `rawContent` |
| `AdminPanelTemplate` | `components/ui/AdminPanelTemplate.tsx` | Panel putih ber-border `#CBD5E1`, radius 16px, header judul + deskripsi + slot aksi | `title`, `description`, `badge`, `actions`, `bodyClassName` |
| `PageHeader` | `components/ui/PageHeader.tsx` | Kepala halaman **publik** dengan latar warna tema tenant, eyebrow, judul, deskripsi | `eyebrow`, `title`, `description` |

> `PageHeader` **bukan** untuk halaman admin. Halaman admin memakai header dari
> `AdminPanelTemplate` (via `AdminLayout`).

## Formulir

| Komponen | Berkas | Tanggung jawab | Props penting |
|---|---|---|---|
| `FormPageTemplate` | `components/ui/FormPageTemplate.tsx` | Halaman formulir tambah/ubah pada **rute tersendiri**; satu kartu per section, action bar di luar kartu. Di dalam `AdminLayout` pakai `showHeader={false}` agar judul tidak ganda | `mode`, `title`, `showHeader`, `sections`, `busy`, `error`, `cancelTo`, `cancelLabel`, `onCancel`, `onSubmit` |
| `FormModal` | `components/ui/FormModal.tsx` | Modal formulir tambah/ubah untuk formulir pendek pada halaman daftar; fokus field pertama, tutup dengan Escape | `open`, `title`, `description`, `submitLabel`, `busy`, `onSubmit`, `onClose`, `wide` |
| `Field` | `components/ui/FormModal.tsx` (named export) | Label + tanda wajib + pesan bantuan untuk satu field. **Dipakai juga di dalam `FormPageTemplate`** | `label`, `htmlFor`, `hint`, `required`, `children` |

**Status migrasi:** `FormPageTemplate` tersedia sejak 2026-11-16 (ADR-004) dan
sudah dipakai form mata kuliah di modul Kurikulum. Formulir baru yang panjang
(lebih dari sekitar 4 field atau memuat unggah berkas) **wajib** memakai
`FormPageTemplate`; `FormModal` dipertahankan untuk formulir pendek pada halaman
daftar sampai halaman tersebut dimigrasikan. Lihat `PAGE_TEMPLATES.md`.

## Umpan balik dan status

| Komponen | Berkas | Tanggung jawab | Props penting |
|---|---|---|---|
| `ToastProvider` / `useToast()` | `components/ui/Toast.tsx` | Notifikasi ringkas pengganti `alert()` | `success()`, `error()`, `info()` |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | Dialog konfirmasi aksi destruktif pengganti `confirm()` | `open`, `title`, `description`, `tone`, `busy`, `onConfirm`, `onCancel` |
| `LoadingState` | `components/ui/States.tsx` | Skeleton memuat data | `label`, `rows` |
| `EmptyState` | `components/ui/States.tsx` | Keadaan kosong yang menjelaskan langkah berikutnya | `title`, `description`, `action` |
| `ErrorState` | `components/ui/States.tsx` | Keadaan gagal dengan pesan asli backend + "Coba lagi" | `message`, `onRetry` |

## Tabel data

| Komponen | Berkas | Tanggung jawab | Props penting |
|---|---|---|---|
| `DataTable` | `components/ui/DataTable.tsx` | Tabel data standar: kolom didefinisikan sebagai data, lebar tetap lewat `colgroup`, nomor urut otomatis, pembungkus scroll, dan tiga keadaan (memuat, kosong, galat) sekaligus | `columns`, `rows`, `rowKey`, `loading`, `error`, `onRetry`, `emptyTitle`, `emptyDescription`, `emptyAction`, `minWidth`, `showRowNumber`, `footer` |
| `DataTableColumn<T>` | `components/ui/DataTable.tsx` (named export) | Bentuk satu definisi kolom | `key`, `header`, `render`, `width`, `align`, `cellClassName`, `headerClassName` |
| `RetryButton` | `components/ui/DataTable.tsx` (named export) | Tombol "Coba lagi" mandiri untuk galat di luar tabel | `onClick`, `label` |
| `RowActions` | `components/ui/RowActions.tsx` | Pembungkus deret tombol aksi di kolom "Aksi" | `children` |
| `EditRowButton` | `components/ui/RowActions.tsx` (named export) | Tombol ikon pensil untuk mengubah satu baris | `label`, `konteks`, `onClick`, `disabled` |
| `DeleteRowButton` | `components/ui/RowActions.tsx` (named export) | Tombol ikon tempat sampah untuk menghapus satu baris | `label`, `konteks`, `onClick`, `disabled` |

**Tombol aksi baris wajib memakai ikon.** Tombol teks "Ubah"/"Hapus" berukuran
10px di dalam baris tabel terlalu kecil dan mendorong tinggi baris tidak rata.
Gunakan `EditRowButton`/`DeleteRowButton` dengan `label` berbahasa Indonesia dan
`konteks` berisi nama baris. Ukurannya 34px persegi dengan ikon 17px — sepadan
dengan huruf isi tabel 13px. Ikon di atas 20px akan mendominasi baris.

**Kolom nomor urut otomatis.** `DataTable` menambahkan kolom "No" di paling kiri
dengan lebar tetap 56px. Nomornya mengikuti urutan baris setelah penyaringan,
bukan ID data, sehingga selalu berurutan 1, 2, 3. Karena sudah otomatis, **jangan**
menambahkan kolom `#`/`nomor` sendiri — akan tampil dobel. Matikan lewat
`showRowNumber={false}` hanya untuk tabel pasangan kunci-nilai yang tidak
berurutan.

**Mengapa lebar kolom wajib eksplisit.** `DataTable` memakai `table-fixed`
bersama `<colgroup>`. Tanpa keduanya peramban menghitung lebar kolom dari isi,
sehingga sel panjang (judul dokumen, daftar dosen) mendorong kolom lain sampai
badge dan tombol aksi saling menimpa. Sisakan **paling banyak satu** kolom tanpa
`width`; kolom itulah yang menyerap sisa ruang.

**Kolom tanpa `width` lebih dari satu** hanya boleh bila keduanya memang berisi
teks bebas yang panjang dan tidak ada tombol/badge di dalamnya — misalnya
`AdminCurriculum` (Nama Mata Kuliah dan Dosen Pengampu). Selain kasus itu,
tetapkan `width`.

**Jangan** menulis `<table>` baru dengan kelas `table-base` secara langsung untuk
daftar data. `.table-base` tetap ada sebagai lapisan gaya, tetapi struktur,
keadaan, dan lebar kolom wajib lewat `DataTable`.

## Formulir opsi (select)

`.field-select` di `src/client/index.css` adalah gaya baku untuk `<select>`.
Tetap memakai elemen `<select>` asli agar perilaku keyboard, pembaca layar, dan
pemilih bawaan ponsel tidak perlu ditulis ulang; yang diseragamkan hanya
tampilannya (`appearance-none`, tinggi 44px, ruang untuk ikon panah).

## Dialog satu-field

Dialog yang isinya **satu input** dengan tombol kirim/batal (contoh: permintaan
kata sandi arsip di `/dokumen`) tetap memakai **`FormModal` + `Field`**, bukan
dialog buatan sendiri. Alasannya bukan soal tata letak, melainkan perilaku yang
sudah teruji di `FormModal`: fokus otomatis ke field pertama, penutupan dengan
`Escape`, klik latar untuk menutup, dan pasangan tombol `Batal`/kirim yang
konsisten.

Jangan menulis `fixed inset-0 ... role="dialog"` sendiri untuk keperluan ini.
Dialog buatan sendiri akan kehilangan penanganan fokus dan `Escape` kecuali
ditulis ulang, dan memperbanyak variasi perilaku yang harus dijaga.

## Kelas komponen CSS (bukan komponen React)

Didefinisikan di `src/client/index.css` dan wajib dipakai alih-alih menulis ulang
class Tailwind panjang:

`.field-label`, `.field-input`, `.field-textarea`, `.field-select`, `.btn-primary`,
`.btn-secondary`, `.btn-danger`, `.btn-icon-neutral`, `.btn-icon-danger`, `.card`,
`.table-base`

## Aturan pemakaian

1. Setiap halaman data **wajib** menangani tiga keadaan. Untuk daftar berbentuk
   tabel, ketiganya sudah ditangani `DataTable` lewat `loading`, `error`, dan
   `emptyTitle`/`emptyDescription`; jangan menulis percabangan sendiri.
2. `alert()` dan `confirm()` bawaan browser **dilarang**; gunakan `useToast()` dan
   `ConfirmDialog`.
3. Pembungkus `overflow-x-auto` sudah disediakan `DataTable`. Hanya bungkus
   manual bila menampilkan tabel di luar `DataTable`.
4. Komponen dengan kebutuhan perilaku berbeda tidak boleh dipaksa menjadi satu
   komponen generik (`docs/DESIGN-RULES.md` §12).

## Belum ada (jangan dirujuk sebelum dibuat)

`Pagination`, `SearchInput`, `PageSizeSelector`, `ExportButton`, `StatusBadge`,
`ListPageTemplate`, `DetailPageTemplate`, `DashboardPageTemplate`.

> `DataTable` sudah dibuat pada 2026-11-16 dan tidak lagi termasuk daftar ini.
