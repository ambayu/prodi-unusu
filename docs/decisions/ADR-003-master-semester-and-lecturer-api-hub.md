# Keputusan: Integrasi Master Semester Global & Data Dosen API Hub

**Date:** 2026-11-16
**Status:** Accepted

## Context

Halaman `/admin/kurikulum` sebelumnya hanya memiliki struktur internal kurikulum
(`curriculum_semesters` bernomor 1..14) tanpa acuan kalender akademik nyata, dan
mata kuliah tidak punya dosen pengampu. Sementara itu `/admin/dosen` menyimpan
direktori dosen secara manual di tabel lokal `lecturers`, sehingga data dosen
berpotensi berbeda dengan data induk universitas di ONE UNUSU.

Pemilik sistem menetapkan dua keputusan:

1. Master semester (kode, nama, rentang tanggal) dikelola **satu kali di tingkat
   global** oleh admin portal, bukan per program studi.
2. Dosen pengampu sebuah mata kuliah **boleh lebih dari satu** (tim pengampu), dan
   data dosen **wajib** bersumber dari ONE UNUSU API Hub — input manual dihapus.

## Decision

1. **Master semester global.** Tabel baru `academic_semesters` (`code` unik, `name`,
   `start_date`, `end_date`, `is_active`) tanpa `study_program_id`. Dikelola melalui
   `/admin/semester` pada scope menu portal (izin `organization.view` untuk baca,
   `organization.manage` untuk tulis).
2. **Kurikulum menautkan semester global secara opsional.** `curriculum_courses`
   mendapat `academic_semester_id` (nullable, `ON DELETE SET NULL`) sehingga
   kurikulum tetap sah walau belum ditautkan ke kalender, dan penghapusan semester
   global tidak menghapus mata kuliah.
3. **Dosen pengampu banyak per mata kuliah.** Disimpan pada kolom
   `curriculum_courses.lecturers_data` (JSON) berisi snapshoot minimal
   `[{ id, name, nidn }]`. Relasi tabel pivot ke `lecturers` sengaja tidak dipakai
   karena dosen bersumber dari API eksternal dan tidak memiliki baris lokal yang
   terjamin.
4. **Data dosen read-only dari API Hub.** `GET /api/v1/inter-service/dosen` disediakan
   di ONE UNUSU (membaca pengguna aktif berperan `DOSEN`). prodi-unusu membacanya
   melalui `services/lecturerIntegrationService.ts` (cache 60 detik, fallback cache
   saat gagal). Endpoint CRUD lokal `POST/PUT/DELETE /admin/lecturers` dihapus;
   `/admin/dosen` menjadi direktori read-only.

## Consequences

- Kalender akademik konsisten lintas program studi; prodi memilih nama semester yang
  sama sehingga laporan akademik antreuni dapat dibandingkan.
- Penghapusan dosen dari sistem induk tidak memutus riwayat pengampuan, karena
  `lecturers_data` menyimpan snapshoot nama dan NIDN saat penugasan dibuat.
- Denormalisasi `lecturers_data` berarti perubahan nama/gelar dosen di sistem induk
  **tidak** otomatis memperbarui mata kuliah lama; penyegaran dilakukan saat mata
  kuliah diubah kembali.
- Bila API Hub tidak dapat dihubungi, direktori dosen menampilkan keadaan gagal
  (bukan data contoh), sesuai aturan kejujuran data. Untuk direktori publik,
  tersedia fallback sementara ke tabel lokal lama agar halaman publik tidak kosong.
- Input manual dosen tidak lagi dimungkinkan di prodi-unusu; koreksi data harus
  dilakukan di ONE UNUSU/SIAKAD.

## Alternatives Considered

- **Semester per kurikulum sebagai master tanggal.** Ditolak: setiap prodi akan
  mendefinisikan rentang tanggal berbeda untuk semester yang sama.
- **Tabel pivot `curriculum_course_lecturers` → `lecturers`.** Ditolak: memaksa
  duplikasi baris dosen lokal yang sudah tidak dikelola aplikasi ini.
- **Menyimpan hanya nama dosen sebagai teks bebas.** Ditolak: menghilangkan NIDN
  sebagai kunci identitas yang dibutuhkan untuk pelaporan beban kerja.

## Related

- `docs/DATABASE.md` (tabel `academic_semesters` dan `curriculum_courses`)
- `docs/routes/kurikulum/RULES.md`
- `docs/routes/semester/RULES.md`
