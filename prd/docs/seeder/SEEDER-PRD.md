# SEEDER PRD — UNUSU

Versi 1.1 | Draft

## Tujuan

Menyediakan data awal yang repeatable untuk environment development, staging, dan production tanpa membuat akun/tenant duplikat atau menghapus data operasional.

## Prinsip

- Seeder idempotent: dijalankan ulang tidak menggandakan master data.
- Pisahkan master system data, organisasi/tenant, permission, dan akun bootstrap.
- Jangan menyimpan password default production di repository. Bootstrap Super Admin melalui environment/CLI dengan password kuat dan wajib ganti password.
- Seed hanya data yang disetujui dan memiliki sumber resmi.
- Seeder tidak boleh melakukan `deleteMany()` massal terhadap data produksi.
- Gunakan stable unique keys/code untuk `upsert`.
- Catat hasil seed (created/updated/skipped) tanpa mencetak secret.

## Cakupan data

1. Permission catalog.
2. System roles dan role-permission baseline.
3. Permission groups untuk Editor.
4. Menu admin dan mapping permission.
5. Fakultas dan program studi yang telah diverifikasi.
6. Tenant website dan domain yang telah diverifikasi.
7. Widget definitions/variants bawaan yang benar-benar diimplementasikan.
8. Optional bootstrap Super Admin.

## Non-goals

- Mengisi konten berita/dosen/kurikulum palsu untuk production.
- Membuat user admin per prodi dengan password generik.
- Menimpa konfigurasi website atau data tenant yang sudah dikelola.

## Acceptance criteria

- Dapat dijalankan berulang tanpa duplikasi.
- Aman terhadap data existing dan tidak menghapus konten.
- Memiliki mode dry-run atau laporan perubahan jika memungkinkan.
- Gagal dengan pesan jelas bila data master konflik (mis. hostname duplikat).
- Test mencakup idempotensi, konflik, dan environment production.
