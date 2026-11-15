# ADR-004: Template Form Berbasis Rute dan Unggah RPS

**Date:** 2026-11-16
**Status:** Accepted

## Context

Formulir mata kuliah sebelumnya berupa `FormModal` di dalam halaman daftar
`/admin/kurikulum`. Pola itu tidak lagi memenuhi kebutuhan:

1. Formulir mata kuliah kini berisi pencarian dosen, daftar checkbox 13+ dosen,
   dan unggah berkas. Konten sepanjang itu tidak nyaman di dalam modal dengan
   area gulir terbatas.
2. `docs/design-system/DESIGN_RULES.md` mewajibkan setiap kelompok field berada
   di dalam kartu dengan heading, sementara modal tidak menyediakan struktur
   section.
3. Tabel `rps_documents` dan skema `createRpsSchema` sudah ada sejak awal, tetapi
   **tidak ada satu pun endpoint** yang menulis ke tabel itu. Akibatnya halaman
   kurikulum publik selalu menampilkan RPS kosong.

Pemilik sistem memutuskan migrasi bertahap dari `FormModal` ke
`FormPageTemplate` dengan rute formulir terpisah, dan menyetujui cakupan
pekerjaan saat ini: **form kurikulum + unggah RPS saja**.

## Decision

1. **`FormPageTemplate` dibuat sebagai komponen bersama**
   (`src/client/components/ui/FormPageTemplate.tsx`) dengan kontrak: `mode`
   (`create`/`edit`), `sections[]`, `busy`, `error`, `cancelTo`, `onSubmit`.
   Template merender satu kartu per section dan action bar `Simpan`/`Batal` di
   luar kartu. Template tidak mengurus fetching, validasi, atau navigasi.
2. **Kurikulum dimigrasikan lebih dulu**, mendahului urutan awal
   (`semester` → `dosen` → `kurikulum`), karena form inilah yang paling butuh
   ruang vertikal.
3. **Rute formulir terpisah:** `/admin/kurikulum/baru` dan
   `/admin/kurikulum/:id/ubah`, keduanya memakai satu komponen
   `AdminCurriculumForm` yang membedakan mode dari parameter `id`.
4. **Keterangan menjadi teks bebas.** Dropdown `Jenis`
   (Wajib/Pilihan/Praktikum/MBKM) dihapus dari formulir dan `courseType`
   dihapus dari `createCourseSchema`. Kolom `course_type` **tidak** dihapus dari
   database; nilainya dibiarkan sebagai warisan.
5. **Endpoint RPS ditambahkan** pada modul baru
   `src/server/modules/admin/rps.routes.ts`: unggah (PDF, maks 10 MB), ubah,
   hapus, dan penyajian berkas.
6. **Berkas RPS disajikan lewat rute publik terpisah** yang dipasang sebelum
   `adminRouter`, sehingga pengunjung tanpa sesi dapat membuka tautan RPS.

## Consequences

- Formulir mata kuliah mendapat ruang vertikal penuh dan struktur section yang
  sesuai aturan desain. Modal tetap dipakai untuk CRUD kurikulum dan semester
  pada halaman daftar.
- Dua pola formulir hidup berdampingan selama migrasi. Ini disengaja dan dibatasi
  per modul: satu modul tidak boleh memakai dua pola sekaligus. Kurikulum kini
  sepenuhnya berbasis rute.
- Menghapus `courseType` dari skema membuat klien lama yang masih mengirim field
  itu **ditolak** bila memakai `strict`; saat ini Zod mengabaikan field tak
  dikenal, jadi payload lama tetap aman. Dropdown UI hilang, sehingga jenis
  mata kuliah tidak lagi dapat difilter dari data baru. Nilai historis masih ada
  di database.
- Rute berkas RPS bersifat publik. Perlindungannya adalah nama berkas acak
  (`<timestamp>-<16 hex>.pdf`) dan validasi regex sebelum menyentuh disk, bukan
  otorisasi. Siapa pun yang mengetahui URL dapat membuka berkas. Ini diterima
  karena RPS memang dokumen yang dibaca mahasiswa.
- Unggah RPS pada mode tambah berjalan **setelah** mata kuliah tersimpan. Bila
  unggah gagal, mata kuliah tetap dibuat tanpa RPS. Kegagalan dilaporkan apa
  adanya, bukan di-rollback diam-diam.

## Alternatives Considered

- **Mempertahankan modal dengan area gulir lebih tinggi.** Ditolak: tidak
  memenuhi aturan section berkartu dan menyulitkan unggah berkas.
- **Menyimpan RPS sebagai kolom di `curriculum_courses`.** Ditolak: satu mata
  kuliah dapat memiliki beberapa revisi RPS, dan tabel `rps_documents` sudah ada.
- **Menyajikan RPS lewat `express.static` seperti media.** Ditolak: direktori RPS
  dapat dienumerasi dan tidak ada validasi nama berkas.
- **Menyimpan RPS lebih dulu di endpoint terpisah lalu menautkan id.** Ditolak
  untuk saat ini: memerlukan berkas yatim bila penyimpanan mata kuliah gagal.

## Related

- `docs/routes/kurikulum/RULES.md`
- `docs/design-system/PAGE_TEMPLATES.md`
- `docs/decisions/ADR-003-master-semester-and-lecturer-api-hub.md`
