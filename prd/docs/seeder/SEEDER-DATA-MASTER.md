# SEEDER DATA MASTER — UNUSU

Status: Draft — validasi terhadap data resmi universitas diperlukan.

## Master organisasi

PRD utama memuat enam kelompok fakultas: Fakultas Ilmu Komputer, Fakultas Ilmu Pendidikan, Fakultas Ekonomi, Fakultas Pertanian, Fakultas Ilmu Kesehatan, dan Fakultas Agama Islam. Dokumen sumber juga mencantumkan inventaris domain berjumlah 20 (6 fakultas dan 14 program studi). Daftar lengkap harus diambil dari lampiran/inventaris sumber dan dikonfirmasi unit universitas sebelum production seed.

## Contoh hostname yang disebut dalam PRD

- Portal administrasi: `prodi.unusu.ac.id`
- Website prodi contoh: `tif.unusu.ac.id`, `sin.unusu.ac.id`, `iko.unusu.ac.id`, `manajemen.unusu.ac.id`, `agribisnis.unusu.ac.id`
- Domain fakultas contoh: `fasilkom.unusu.ac.id`, `fip.unusu.ac.id`, `fe.unusu.ac.id`

Contoh tersebut bukan pengganti validasi daftar domain final. Normalisasi hostname menjadi lowercase dan tanpa skema/path sebelum disimpan.

## Master permission dan menu

Sumber: `docs/rbac/ROLE-PERMISSION-MENU-PRD.md`. Seed hanya permission yang telah diimplementasikan atau masuk sprint aktif; hindari permission yang tidak memiliki handler.

## Widget registry

Seed hanya widget yang memiliki renderer, schema config, dan test. Kelompok widget yang direncanakan pada PRD utama antara lain Hero/Header, Profile/Information, Statistics, Academic, Publication, Facilities, dan Supporting. Daftar implementasi harus diverifikasi dengan kode.

## Konten akademik

PRD utama memberi contoh kebutuhan kurikulum Sistem Informasi: 8 semester, 66 mata kuliah, 148 SKS, dan 66 RPS tersedia. Angka tersebut adalah contoh kebutuhan/data contoh yang diberikan pada dokumen, bukan data master untuk otomatis disebar ke production tanpa verifikasi akademik.

## Sumber kebenaran

Gunakan daftar organisasi, kode prodi, nama resmi, domain, dan data akademik yang disahkan universitas. Setiap dataset seed perlu mencatat sumber, tanggal verifikasi, dan penanggung jawab di dokumentasi internal.
