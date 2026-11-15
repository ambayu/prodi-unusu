# Keputusan: Mata Kuliah Dimiliki Program Studi Secara Langsung

**Date:** 2026-11-16
**Status:** Accepted
**Supersedes (sebagian):** ADR-003 poin penautan semester — lihat "Consequences"

## Context

Sampai keputusan ini, `curriculum_courses` **tidak** memiliki `study_program_id`.
Kepemilikan tenant hanya dapat diturunkan lewat rantai relasi:

```
curriculum_courses -> curriculum_semesters -> curriculums -> study_programs
```

Rantai itu menimbulkan tiga masalah nyata:

1. **Mata kuliah tanpa semester tidak dapat diatribusikan ke prodi.** Ketika
   `semester_id` dijadikan nullable (agar mata kuliah dapat disimpan tanpa posisi
   1..14), tidak ada lagi jalur untuk mengetahui prodi pemiliknya. Endpoint
   `GET /admin/courses` terpaksa memakai filter
   `semester: { curriculum: { studyProgramId } }`, sehingga **mata kuliah tanpa
   semester hilang diam-diam dari daftar**. Pengguna melihat "berhasil disimpan"
   tetapi datanya tidak pernah muncul.
2. **Kurikulum menjadi syarat tersembunyi.** Untuk menampilkan data, server harus
   menautkan setiap mata kuliah baru ke `Semester 1` kurikulum aktif — jangkar
   yang tidak pernah dipilih admin dan tidak bermakna secara akademik.
3. **Isolasi tenant bergantung pada data opsional.** Kolom yang boleh `NULL`
   dipakai sebagai satu-satunya penentu kepemilikan data.

Pemilik sistem menetapkan arah: **"matakuliah di input nanti per prodi"** — mata
kuliah adalah milik program studi, diinput per prodi masing-masing, dan tidak
bergantung pada kurikulum maupun semester untuk eksis.

## Decision

1. **`curriculum_courses.study_program_id` ditambahkan sebagai `NOT NULL`** dengan
   `ON DELETE CASCADE` ke `study_programs`, dan relasi balik
   `StudyProgram.curriculumCourses`. Mata kuliah kini memiliki jalur kepemilikan
   langsung.
2. **`study_program_id` selalu berasal dari sesi**, melalui `scopedTenantId(req)`.
   Nilai ini **tidak** termasuk `createCourseSchema`, sehingga tidak dapat dikirim
   dari browser dan tidak dapat dipakai memindahkan mata kuliah ke prodi lain.
   Ini menegakkan aturan di kepala `prisma/schema.prisma`: *tidak ada query tenant
   yang boleh mempercayai `studyProgramId` dari browser.*
3. **`GET /admin/courses` memfilter `where: { studyProgramId }`** langsung.
   Mata kuliah tanpa semester kini **tampil** dan tetap terisolasi per prodi.
4. **`findCourseInTenant` memeriksa `{ id, studyProgramId }`**, tidak lagi lewat
   semester.
5. **`POST /admin/courses` tidak lagi membuat/mencari kurikulum dan semester
   jangkar.** `academicSemesterId` tetap wajib; `semesterId` dibiarkan `NULL`.
6. **Mode ubah pada UI mengambil data dari `GET /admin/courses`** (daftar datar),
   bukan dengan menelusuri pohon kurikulum — karena pohon itu tidak lagi
   menjangkau semua mata kuliah.

## Consequences

### Menjadi lebih mudah
- Mata kuliah dapat dibuat tanpa kurikulum dan tanpa semester posisi. Tidak ada
  lagi langkah tersembunyi yang harus ditebak pengguna.
- Isolasi tenant menjadi **eksplisit dan wajib terisi**, bukan hasil turunan dari
  kolom nullable. Ini menutup kelas bug yang sebelumnya membuat data hilang.
- Filter daftar dan endpoint tidak lagi bergantung pada keberadaan semester.

### Menjadi lebih sulit / terbatas
- **Duplikasi data diperbolehkan.** Kode mata kuliah yang sama dapat muncul di
  beberapa prodi sebagai record terpisah. Tidak ada tabel katalog global; ini
  konsekuensi langsung dari keputusan "input per prodi". Bila kelak dibutuhkan
  katalog bersama, perlu tabel master baru + ADR tersendiri.
- **Rantai lama menjadi redundan.** `semester_id` tetap ada sebagai kolom warisan
  dan masih ditampilkan pada relasi publik `listPublicCurriculum`
  (`curriculum -> semesters -> courses`). Mata kuliah yang tidak ditautkan ke
  semester **tidak muncul di halaman publik kurikulum**, meskipun muncul di admin.
  Ini kesenjangan yang diketahui dan **belum** diperbaiki.
- `StudyProgram` kini menampung relasi baru; penghapusan prodi akan menghapus
  mata kuliahnya (CASCADE), termasuk berkas RPS lewat `RpsDocument` (CASCADE).
- Migrasi data historis tidak dapat diturunkan otomatis untuk baris yang sudah
  kehilangan semester. Saat keputusan ini dibuat, tabel `curriculum_courses`
  berisi **0 baris**, sehingga tidak ada data yang perlu di-backfill.

### Hubungan dengan ADR-003
ADR-003 tetap berlaku untuk master semester global dan data dosen dari API Hub.
Yang berubah hanyalah **cara kepemilikan prodi ditentukan**: tidak lagi lewat
penautan semester, melainkan lewat kolom `study_program_id` langsung. Penautan
`academic_semester_id` masih dipakai dan masih opsional secara skema, tetapi kini
**wajib diisi dari formulir** (divalidasi `createCourseSchema`).

## Alternatives Considered

1. **Tabel katalog `courses` global + `curriculum_courses` sebagai penautan.**
   Ditolak untuk saat ini: pemilik sistem menegaskan input per prodi, dan migrasi
   datanya jauh lebih besar (memecah satu tabel menjadi dua, memindahkan RPS dan
   dosen, menulis ulang seluruh UI). Tetap menjadi opsi bila duplikasi kode antar
   prodi mulai menimbulkan masalah nyata.

2. **Tetap tanpa `study_program_id`, wajibkan `semester_id`.**
   Ditolak: ini mengembalikan langkah tersembunyi "pilih/ciptakan semester posisi
   1..14" yang tidak dipahami admin, dan bertentangan dengan keputusan bahwa
   "Semester" berarti master semester kalender.

3. **Menampilkan mata kuliah tanpa semester lewat filter `semesterId: null`.**
   Ditolak karena **membocorkan data lintas prodi**: tanpa `study_program_id`,
   daftar `semesterId IS NULL` akan memuat mata kuliah semua program studi.
   Pendekatan ini sempat ditulis lalu dibatalkan sebelum masuk produksi.
