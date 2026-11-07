# SEEDER STRATEGY — UNUSU

## Urutan eksekusi

1. Validasi environment dan koneksi database.
2. Jalankan Prisma migrations terlebih dahulu; seeder tidak membuat schema.
3. Seed permission catalog dengan key stabil.
4. Seed roles dan role-permission baseline.
5. Seed permission groups dan item permission.
6. Seed admin menu dan menu-permission mapping.
7. Seed fakultas/prodi yang telah disahkan.
8. Seed tenant dan domain yang telah diverifikasi.
9. Seed widget registry/variants yang implementasinya sudah tersedia.
10. Bootstrap Super Admin melalui proses aman terpisah bila belum ada.

## Perintah yang disarankan

```bash
npx prisma migrate deploy
npx prisma db seed
```

Perintah aktual mengikuti versi Prisma dan konfigurasi package.json yang dipakai repository.

## Idempotency

- Gunakan `upsert` dengan `code`, `key`, atau `hostname` unik.
- Jangan bergantung pada auto-increment ID untuk relasi seeder.
- Gunakan transaction untuk kelompok data yang harus konsisten.
- Jangan mengubah password akun existing pada seed rerun.
- Perubahan permission baseline perlu ditinjau; jangan otomatis mencabut custom assignment tanpa migration/approval.

## Environment policy

- Development: boleh seed tenant demo dan konten dummy yang diberi label.
- Staging: gunakan data sintetis atau data yang disetujui, hindari secret production.
- Production: hanya master data resmi, permission, role, menu, domain/tenant yang disetujui, dan bootstrap admin aman.

## Recovery

Backup sebelum perubahan data master besar. Seeder harus melaporkan konflik dan berhenti pada konflik integritas; jangan mencoba memperbaiki dengan menghapus data.
