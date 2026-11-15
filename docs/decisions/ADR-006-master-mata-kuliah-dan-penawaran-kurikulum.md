# ADR-006: Master Mata Kuliah dan Penawaran Kurikulum Dipisah

- **Tanggal:** 2026-11-16
- **Status:** Diterima
- **Menggantikan sebagian:** ADR-005 (kepemilikan prodi tetap berlaku; struktur tabel berubah)

## Konteks

Sebelum ADR ini, `curriculum_courses` menyimpan **semuanya dalam satu baris**: kode,
nama, bobot SKS, semester, keterangan, dosen pengampu, dan RPS. Mata kuliah juga
ditautkan ke `curriculum_semesters` (posisi 1..14) sehingga keberadaannya bergantung
pada kurikulum.

Pemilik sistem mengoreksi model ini dengan dua pernyataan:

> "mata kuliah isinya input nama mata kuliah dan kodenya"

> "table kurikulum dengan id matakuliah"

Artinya:

1. Menu **Mata Kuliah** hanya mengelola **identitas**: kode dan nama.
2. Menu **Kurikulum** menyimpan baris yang **menautkan id mata kuliah** ke sebuah
   kurikulum, lalu melengkapi SKS, semester, dosen, dan RPS.

Pemilik sistem juga memilih varian **B1**: satu mata kuliah boleh ditawarkan di
beberapa kurikulum dengan detail berbeda.

## Keputusan

Pisahkan menjadi tiga tabel:

### 1. `courses` — master mata kuliah

| Kolom | Keterangan |
|---|---|
| `id` | |
| `study_program_id` | Milik prodi, **selalu dari sesi** |
| `code` | Unik per prodi: `@@unique([studyProgramId, code])` |
| `name` | |

Hanya identitas. Tidak ada SKS, semester, dosen, atau RPS.

### 2. `curriculum_items` — penawaran mata kuliah pada kurikulum

| Kolom | Keterangan |
|---|---|
| `curriculum_id` | FK → `curriculums`, cascade |
| `course_id` | FK → `courses`, cascade — **inilah "id matakuliah"** |
| `academic_semester_id` | FK → `academic_semesters`, `SetNull` |
| `credits` | Bobot SKS penawaran ini |
| `description` | Keterangan teks bebas |
| `lecturers_data` | JSON `[{ id, name, nidn }]` |
| `sort_order` | |

`@@unique([curriculumId, courseId])` — satu mata kuliah sekali per kurikulum.

### 3. `curriculum_rps` — dokumen RPS per penawaran

FK → `curriculum_items`, cascade. RPS **tidak** menempel pada master.

### Tabel lama

`curriculum_courses`, `curriculum_semesters`, dan `rps_documents` **dibiarkan utuh**
sebagai data warisan. UI baru tidak menulis ke sana, tetapi dashboard
(`website.routes.ts`) dan halaman publik masih membacanya sehingga angka statistik dan
data lama tidak hilang.

## Alasan

1. **Tanpa duplikasi.** Sebelumnya, menawarkan mata kuliah yang sama di dua kurikulum
   berarti dua baris dengan nama yang bisa berbeda. Sekarang nama hanya ada di satu
   tempat; perubahan nama otomatis berlaku di semua kurikulum.
2. **SKS berbeda per kurikulum itu wajar.** Kurikulum 2020 dan 2024 sering memberi bobot
   berbeda untuk mata kuliah yang sama. Memisahkan penawaran membuat ini mungkin tanpa
   mengubah master.
3. **RPS melekat pada penawaran.** Dosen dapat merevisi RPS untuk periode tertentu tanpa
   menimpa RPS periode lain.
4. **Sesuai permintaan pemilik sistem** ("table kurikulum dengan id matakuliah").

## Konsekuensi

### Positif
- Nama/kode mata kuliah konsisten di seluruh kurikulum.
- Bobot SKS dan pengampu dapat berbeda per kurikulum.
- Form Mata Kuliah menjadi sangat sederhana (2 field).

### Negatif / risiko
- **Dua tabel untuk satu konsep.** Pengembang harus tahu bahwa `courses` adalah
  identitas dan `curriculum_items` adalah penawaran. Kekeliruan paling mudah adalah
  menulis SKS ke `courses`.
- **Menghapus master bersifat destruktif.** Cascade menghapus seluruh penawaran dan
  RPS-nya di semua kurikulum. `ConfirmDialog` menyebutkan akibat ini.
- **Halaman publik membaca dua sumber** (`items` dan `semesters[].courses`) selama
  migrasi belum tuntas. Setelah migrasi selesai, jalur warisan dapat dihapus.
- **Belum ada UI CRUD kurikulum.** `curriculum_items` membutuhkan `curriculum_id`,
  sehingga kurikulum harus sudah ada sebelum mata kuliah dapat ditawarkan.

## Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|---|---|
| **Menambah `course_id` ke `curriculum_courses`** | Tabel itu sudah dipakai dashboard dan halaman publik lewat relasi semester; mengubahnya sekaligus berisiko merusak statistik. |
| **Menyimpan semuanya di `courses`** (SKS/dosen di master) | Tidak memenuhi B1: satu mata kuliah tidak bisa punya SKS berbeda di dua kurikulum. |
| **Tabel pivot polos `curriculum_courses` (curriculum_id, course_id)** | Tidak cukup; penawaran butuh SKS, semester, dosen, dan RPS sendiri. |

## Verifikasi yang dilakukan

1. Master dibuat → penawaran dibuat dengan `courseId` → RPS dibuat. ✅
2. Master yang sama ditawarkan di **dua kurikulum** dengan SKS 3 dan 4. ✅ (bukti B1)
3. Penawaran duplikat pada kurikulum yang sama ditolak `P2002`. ✅
4. Master milik prodi 1 tidak terlihat dari prodi 2. ✅ (isolasi tenant)
5. Menghapus master menghapus penawaran dan RPS-nya (sisa 0 dan 0). ✅

## Rujukan

- `docs/routes/kurikulum/RULES.md`
- `docs/decisions/ADR-003-master-semester-and-lecturer-api-hub.md` — pola JSON dosen
- `docs/decisions/ADR-005-mata-kuliah-milik-prodi.md` — kepemilikan prodi
- `prisma/schema.prisma` — model `Course`, `CurriculumItem`, `CurriculumRps`
