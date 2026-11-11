-- Jejak profil SSO pada tabel users.
--
-- Tujuan: admin perlu melihat peran mentah dari portal ONE UNUSU sebelum
-- memberi peran aplikasi. Tanpa kolom ini, admin hanya melihat akun tanpa
-- peran tanpa tahu apakah pemiliknya administrator universitas atau dosen.
--
-- Seluruh kolom nullable sehingga data lama tidak berubah.
--
-- Catatan MariaDB: versi yang dipakai proyek ini menolak
-- `ADD COLUMN IF NOT EXISTS` (galat 1064), sehingga migrasi ditulis sekali
-- jalan. Bila dijalankan ulang, abaikan galat "Duplicate column name" atau
-- periksa lebih dulu lewat INFORMATION_SCHEMA.

ALTER TABLE `users`
  ADD COLUMN `sso_role` VARCHAR(100) NULL COMMENT 'Peran utama dari portal SSO' AFTER `phone`,
  ADD COLUMN `sso_roles` TEXT NULL COMMENT 'JSON seluruh peran SSO' AFTER `sso_role`,
  ADD COLUMN `sso_access` TEXT NULL COMMENT 'JSON keputusan akses SSO' AFTER `sso_roles`,
  ADD COLUMN `sso_synced_at` DATETIME(3) NULL COMMENT 'Waktu sinkronisasi profil SSO' AFTER `sso_access`;

-- Catatan penerapan:
--   1. Jalankan `npx prisma migrate deploy`, atau jalankan SQL di atas langsung.
--   2. Lanjutkan dengan `npx prisma generate` agar tipe Prisma ikut terbarui.
--
-- Rollback (jalankan hanya bila memang ingin membatalkan):
--   ALTER TABLE `users`
--     DROP COLUMN `sso_synced_at`,
--     DROP COLUMN `sso_access`,
--     DROP COLUMN `sso_roles`,
--     DROP COLUMN `sso_role`;
