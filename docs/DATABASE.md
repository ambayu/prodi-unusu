# Database

Dokumen ini menggambarkan skema yang benar-benar ada di `prisma/schema.prisma`,
bukan rencana. Setiap perubahan skema wajib memperbarui dokumen ini.

Database: MySQL 8, basis data `prodi_unusu_db`, satu skema bersama dengan data
yang dipisahkan per tenant.

## 1. Aturan isolasi tenant

1. Setiap tabel milik tenant memiliki kolom `study_program_id` atau dapat
   diturunkan secara aman melalui relasi yang tervalidasi.
2. Nilai `study_program_id` selalu berasal dari konteks server: hostname terdaftar
   untuk permintaan publik, penugasan peran untuk permintaan admin.
3. Operasi berantai (mata kuliah, semester, widget, section) memverifikasi
   seluruh rantai kepemilikan sampai tenant, bukan hanya ID langsung.
4. Pengujian di `tests/tenant-isolation.test.ts` membuktikan query dengan filter
   tenant yang salah tidak mengembalikan atau menghapus data apa pun.

## 2. Organisasi dan tenancy

| Tabel | Isi | Catatan |
|---|---|---|
| `faculties` | Fakultas | Data induk. Bukan tenant, tidak memiliki domain. |
| `study_programs` | Program studi | Tenant sebenarnya. Kode dan slug unik global. |
| `domains` | Hostname | `hostname` unik global, huruf kecil tanpa skema. |

Relasi: satu fakultas memiliki banyak program studi. Satu program studi memiliki
satu atau lebih domain. Domain terakhir tidak dapat dihapus.

## 3. Identitas dan akses

| Tabel | Isi |
|---|---|
| `users` | Akun. `password_hash` nullable karena akun SSO tidak memakai kata sandi lokal. |
| `roles` | `SUPER_ADMIN`, `ADMIN_FAKULTAS`, `ADMIN_PRODI`, `EDITOR`. |
| `permissions` | 92 permission dengan format `resource.action`. |
| `role_permissions` | Baseline izin per peran. |
| `user_roles` | Penugasan peran beserta cakupan: `global`, `faculty`, `prodi`. |
| `permission_groups` | Preset izin Editor, misalnya `EDITOR_BERITA`. |
| `permission_group_items` | Isi setiap preset. |
| `user_role_permission_groups` | Preset yang diberikan pada satu penugasan. |
| `sessions` | Sesi aktif: `token_id`, `csrf_token`, `expires_at`, `revoked_at`. |

`user_roles` menyimpan cakupan secara eksplisit. Super Admin memakai
`scope_type = 'global'` dengan kedua kolom tenant bernilai NULL. Admin Prodi dan
Editor memakai `scope_type = 'prodi'` dengan `study_program_id` terisi.

Permission Super Admin tidak disimpan sebagai baris bertanda bintang. Kode
mengembalikan penanda `*` saat peran `SUPER_ADMIN` dimuat, sehingga katalog
permission tetap dapat dibaca manusia.

## 4. Identitas website dan navigasi

| Tabel | Isi |
|---|---|
| `website_settings` | Judul, tagline, logo, favicon, SEO, hak cipta. Satu baris per tenant. |
| `themes` | Token desain: warna, font, radius, bayangan, gaya tombol, layout. |
| `menus` | Navigasi publik. `sort_order`, `parent_id`, `is_required`. |
| `admin_menus` | Katalog menu portal admin beserta permission yang dibutuhkan. |

`menus` diisi seeder dengan 10 menu standar per tenant. Menu bertanda
`is_required` tidak dapat dihapus, hanya dinonaktifkan.

## 5. Builder

| Tabel | Isi |
|---|---|
| `pages` | Slug unik per tenant, status publikasi, kolom SEO, `is_system`. |
| `page_versions` | Snapshot JSON per versi dengan status draft, published, arsip. |
| `page_sections` | Wadah widget, `section_key`, urutan, status aktif. |
| `widgets` | Registry master: kode, kategori, skema konfigurasi, konfigurasi bawaan. |
| `widget_variants` | Varian tampilan per widget. |
| `section_widgets` | Instance widget: `variant_code`, `config_json` tervalidasi, urutan. |

`pages` dan `posts` memiliki kunci unik gabungan (`study_program_id`, `slug`),
sehingga slug yang sama boleh ada di tenant berbeda tetapi tidak boleh ganda di
tenant yang sama.

## 6. Media

| Tabel | Isi |
|---|---|
| `media_assets` | Metadata berkas: `storage_key`, MIME, ukuran, alt text, pemilik tenant. |

Nama file fisik dibuat acak. `storage_key` unik global. Menghapus aset menghapus
metadata dan file fisiknya, dengan pemeriksaan bahwa path berada di dalam folder
media.

## 7. CMS

| Tabel | Isi |
|---|---|
| `curriculums` | Kurikulum. Unik per tenant dan tahun. |
| `curriculum_semesters` | Semester. Unik per kurikulum dan nomor. |
| `curriculum_courses` | Mata kuliah: kode, nama, SKS, jenis, deskripsi. |
| `rps_documents` | Berkas RPS per mata kuliah, dengan status publik. |
| `lecturers` | Dosen: NIDN, jabatan akademik, keahlian, foto, status aktif. |
| `documents` | Repository dokumen: kategori, tahun, berkas, status publik, unduhan. |
| `facilities` | Sarana prasarana: kategori, lokasi, status. |
| `post_categories` | Kategori berita. Unik per tenant dan slug. |
| `posts` | Berita: slug, isi, status draft/terjadwal/terbit/arsip. |
| `galleries` | Album galeri: slug, tanggal kegiatan, sampul, status publik. |
| `gallery_items` | Item album: gambar atau video. |
| `contact_infos` | Alamat, email, telepon, WhatsApp, peta, media sosial. |
| `contact_messages` | Pesan pengunjung beserta status baca. |
| `profile_contents` | Sejarah, deskripsi, tujuan, sasaran, struktur organisasi. |
| `visions_missions` | Visi, misi, tujuan, sasaran strategis. |

## 8. Sistem

| Tabel | Isi |
|---|---|
| `audit_logs` | Aktor, aksi, modul, target, detail, alamat IP, waktu. |
| `notifications` | Notifikasi per pengguna. |
| `system_settings` | Pengaturan global berbentuk pasangan kunci dan nilai. |

## 9. Index

Index dibuat pada kolom yang benar-benar dipakai untuk penyaringan dan
pengurutan:

- `study_programs`: `faculty_id`, `status`
- `domains`: `study_program_id`, `is_active`
- `user_roles`: `user_id`, `study_program_id`, `faculty_id`
- `sessions`: `user_id`, `expires_at`
- `menus`: `study_program_id, is_active, sort_order`, `parent_id`
- `pages`: `study_program_id, is_published`
- `page_sections`: `page_id, is_active, sort_order`
- `section_widgets`: `page_section_id, is_active, sort_order`
- `curriculum_courses`: `semester_id, sort_order`, `code`
- `lecturers`: `study_program_id, is_active, sort_order`, `nidn`
- `documents`: `study_program_id, is_public`, `category`
- `posts`: `study_program_id, status, published_at`, `category_id`
- `audit_logs`: `study_program_id, created_at`, `user_id, created_at`, `module, action`

## 10. Migrasi

- Migrasi dibuat dengan `npx prisma migrate dev --name <nama>`.
- Diterapkan di server dengan `npx prisma migrate deploy`.
- Tidak pernah mengedit database production secara manual.
- Seeder berjalan setelah migrasi, tidak membuat skema.

## 11. Seeder

`prisma/seed.ts` bersifat idempotent dan memakai `upsert` dengan kunci stabil
(`code`, `hostname`, `menu_key`). Seeder tidak pernah menjalankan `deleteMany()`
terhadap data operasional. Bila ditemukan konflik, misalnya hostname yang sudah
menjadi milik prodi lain, seeder berhenti dengan pesan yang jelas.

Urutan seeding: permission, peran dan baseline, permission group, menu admin,
widget dan varian, fakultas dan prodi, akun Super Admin, system settings.
