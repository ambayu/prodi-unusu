# Registry Template Halaman

## Kondisi aktual

Proyek memiliki dua lapis kerangka admin dan **satu** template formulir:

1. **`AdminLayout`** — kerangka admin (sidebar + topbar) yang otomatis membungkus
   konten dengan `AdminPanelTemplate`.
2. **`AdminPanelTemplate`** — panel putih berheader: judul, deskripsi, badge, slot
   aksi di kanan, lalu body.
3. **`FormPageTemplate`** — halaman formulir tambah/ubah pada rute tersendiri
   (dibuat 2026-11-16, lihat ADR-004).

`ListPageTemplate`, `DetailPageTemplate`, dan `DashboardPageTemplate` **belum ada**.

## Memilih template

| Jenis halaman | Template | Status |
|---|---|---|
| Daftar data | `AdminLayout` + tabel `table-base` | Tersedia (belum ada template khusus) |
| Form tambah/ubah | `FormPageTemplate` di dalam `AdminLayout` | **Tersedia** |
| Detail satu record | belum ada | Belum tersedia |
| Dashboard | `Dashboard` halaman tersendiri | Belum ada template khusus |

## `FormPageTemplate`

**Berkas:** `src/client/components/ui/FormPageTemplate.tsx`

**Tujuan:** menyediakan struktur formulir tambah/ubah yang seragam untuk halaman
pada rute tersendiri, menggantikan `FormModal` untuk formulir panjang.

**Props:**

| Prop | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `mode` | `'create' \| 'edit'` | ya | Menentukan label tombol simpan bawaan |
| `title` | `string` | ya | Judul halaman. Dirender sebagai `<h1>` **hanya bila `showHeader`**; tetap dipakai sebagai `aria-label` formulir |
| `description` | `string` | tidak | Kalimat penjelas di bawah judul (ikut disembunyikan bila `showHeader={false}`) |
| `showHeader` | `boolean` | tidak | Bawaan `true`. Setel `false` bila formulir berada di dalam `AdminLayout` — panel sudah merender judul **dan** `Kembali` (template tidak lagi merendernya) |
| `submitLabel` | `string` | tidak | Bawaan `Simpan` (create) / `Simpan Perubahan` (edit) |
| `cancelLabel` | `string` | tidak | Bawaan `Batal` |
| `busy` | `boolean` | tidak | Menonaktifkan tombol dan menampilkan `Menyimpan...` |
| `error` | `string \| null` | tidak | Galat tingkat formulir, dirender sebagai alert |
| `sections` | `FormSection[]` | ya | Satu entri = satu kartu |
| `cancelTo` | `string` | tidak | Bila diisi, tombol batal menjadi tautan rute |
| `onCancel` | `() => void` | tidak | Dipakai bila `cancelTo` tidak diisi |
| `onSubmit` | `(event) => void` | ya | Handler submit form |

`FormSection` berisi `{ id, title, description?, content }`. `title` wajib karena
dirender sebagai heading kartu.

**Jaminan struktur:** kartu per section, action bar di luar kartu, tombol
`Kembali` di header bila `cancelTo` diisi, dan state `busy`/`error`.

### Aturan kepemilikan judul (wajib)

Satu halaman hanya boleh punya **satu** `<h1>`. Di halaman admin, judul dimiliki
`AdminPanelTemplate` (dipasang otomatis oleh `AdminLayout`). Karena itu setiap
pemakaian `FormPageTemplate` di dalam `AdminLayout` **wajib** mengirim
`showHeader={false}` dan memindahkan tombol `Kembali` ke prop `actions` milik
`AdminLayout`.

Tanpa aturan ini, judul dan deskripsi dirender dua kali dan muncul dua tombol keluar
(`Kembali` di template, `Batal` di action bar). Cacat ini pernah terjadi pada form
mata kuliah dan diperbaiki 2026-11-16.

Saat `showHeader={false}`, template **tidak merender tombol `Kembali` sama sekali**.
Pemanggil bertanggung jawab menaruhnya di slot `actions` milik `AdminLayout`; bila
tidak, pengguna hanya punya `Batal` di action bar sebagai jalan keluar.

**Yang bukan tanggung jawab template:** fetching data, validasi field, navigasi
setelah sukses, dan pemanggilan API. Semua itu milik halaman pemanggil.

**Contoh pemakaian:** lihat `src/client/pages/admin/AdminCurriculumForm.tsx`.
Rute: `/admin/kurikulum/baru` dan `/admin/kurikulum/:id/ubah`, satu komponen
membedakan mode dari parameter `id`.

**Batasan:**

- Gunakan hanya untuk halaman yang memang punya rute sendiri. Halaman yang masih
  memakai `FormModal` **tidak boleh** dicampur dengan template ini dalam satu modul
  yang sama.
- Jangan menambahkan layout sidebar/panel di dalam template; `AdminLayout` sudah
  menyediakannya.
- Jangan merender judul sendiri di dalam halaman yang sudah memakai `AdminLayout`;
  kirim `showHeader={false}`.

## Peta migrasi

| Modul | Status | Catatan |
|---|---|---|
| `kurikulum` | **Selesai** (form mata kuliah) | Daftar sudah datar tanpa `FormModal` untuk mata kuliah; form lewat `FormPageTemplate` |
| `semester` | Belum | Halaman daftar masih memakai `FormModal` |
| `dosen` | Tidak berlaku | Halaman read-only, tanpa form |
| `dokumen` | Tidak berlaku | Halaman read-only. Dialog kata sandi publik memakai `FormModal` bersama, bukan rute form |
| Halaman admin lain | Belum | 22 halaman lain masih `FormModal` |

## Cara menambah template baru

1. Pastikan template yang ada tidak dapat diperluas (cek `COMPONENTS.md`).
2. Implementasi sebagai komponen bersama di `src/client/components/ui/`.
3. Dokumentasikan di berkas ini: tujuan, props, contoh pemakaian, batasan.
4. Catat di `docs/CHANGELOG.md`.
