# Modul Kurikulum (`/admin/kurikulum`) dan Mata Kuliah (`/admin/mata-kuliah`)

## Tujuan dan cakupan

Modul ini terbagi menjadi **dua menu** dengan tanggung jawab berbeda. Pemisahan ini
mengikuti keputusan pemilik sistem 2026-11-16 (**ADR-006**):

| Menu | Menyimpan | Isi form |
|---|---|---|
| **Mata Kuliah** (`/admin/mata-kuliah`) | Master identitas mata kuliah (`courses`) | **Hanya Kode + Nama** |
| **Kurikulum** (`/admin/kurikulum`) | Penawaran mata kuliah pada kurikulum (`curriculum_items`) | Pilih mata kuliah (**id matakuliah**), lalu isi Semester, SKS, Keterangan, Dosen, RPS |

Alasan pemisahan: satu mata kuliah sering ditawarkan di beberapa kurikulum dengan bobot
SKS dan dosen pengampu berbeda. Kalau nama dan SKS disimpan di satu record yang sama,
data harus diduplikasi dan nama dapat berbeda-beda antarkurikulum.

Modul ini **tidak** mengelola data induk dosen (bersumber dari ONE UNUSU API Hub) dan
**tidak** mengelola master semester global (dikelola di `/admin/semester`). Menu
"Mata Kuliah & RPS" pada akun dosen **belum ada**. Pengaturan password RPS juga **belum
ada**.

## Model data

```
courses (master)                    curriculum_items (penawaran)
├── id                              ├── id
├── study_program_id  ← sesi        ├── curriculum_id  → curriculums
├── code  ┐                         ├── course_id      → courses   ← "id matakuliah"
└── name  ┘ unik per prodi          ├── academic_semester_id → academic_semesters
                                    ├── credits
curriculum_rps                      ├── description
├── id                              ├── lecturers_data (JSON)
├── curriculum_item_id → items      └── sort_order
├── title
├── file_url                        unik: (curriculum_id, course_id)
└── is_public
```

Konsekuensi yang disengaja:

- **RPS menempel pada penawaran**, bukan pada master. Dua kurikulum dapat memakai RPS
  berbeda untuk mata kuliah yang sama.
- **`(curriculum_id, course_id)` unik** — satu mata kuliah hanya boleh muncul sekali
  dalam satu kurikulum. Menawarkan ulang ditolak dengan `409`.
- **Menghapus master menghapus seluruh penawarannya** (cascade), termasuk RPS-nya.
  `ConfirmDialog` menyebutkan akibat ini secara eksplisit.

## Rute

### Menu "Mata Kuliah" (`/admin/mata-kuliah`)

| Rute | Berkas | Izin | Keterangan |
|---|---|---|---|
| `/admin/mata-kuliah` | `src/client/pages/admin/AdminCourses.tsx` | `curriculum.view` | Tabel master: Kode, Nama, Aksi. Tambah/ubah lewat `FormModal` |

### Menu "Kurikulum" (`/admin/kurikulum`)

| Rute | Berkas | Izin | Keterangan |
|---|---|---|---|
| `/admin/kurikulum` | `src/client/pages/admin/AdminCurriculum.tsx` | `curriculum.view` | Panel daftar kurikulum ringkas + tabel penawaran |
| `/admin/kurikulum/baru` | `src/client/pages/admin/AdminCurriculumCreate.tsx` | `curriculum.create` | Form page: Nama, Tahun, Deskripsi (textarea), Status (radio) |
| `/admin/kurikulum/:id/ubah` | `src/client/pages/admin/AdminCurriculumCreate.tsx` | `curriculum.update` | Form page edit kurikulum |
| `/admin/kurikulum/mata-kuliah/:id/ubah` | `src/client/pages/admin/AdminCurriculumItemForm.tsx` | `curriculum.update` | Form page edit penawaran MK (dari tombol aksi per baris tabel) |

### Pengalihan rute lama

| Rute lama | Dialihkan ke |
|---|---|
| `/admin/mata-kuliah/baru` | `/admin/mata-kuliah` (tetap FormModal 2 field) |
| `/admin/mata-kuliah/:id/ubah` | `/admin/mata-kuliah` |
| `/admin/kurikulum/semester/baru` | `/admin/kurikulum` |

`AdminCurriculumForm.tsx` **sudah dihapus**. Master mata kuliah hanya punya dua field,
sehingga `FormModal` cukup dan halaman form terpisah tidak lagi diperlukan.

## Sumber katalog menu (penting)

Menu sidebar **tidak** dibaca dari tabel `admin_menus`. Katalognya adalah konstanta
`CATALOG_PRODI` di `src/client/services/adminApi.ts`, lalu disaring berdasarkan izin
pengguna. Menambah atau mengubah menu prodi **wajib** di berkas itu; mengubah tabel
`admin_menus` saja tidak berpengaruh ke sidebar.

Urutan menu terkait: `Mata Kuliah` (9.7) → `Kurikulum` (10) → `Dosen` (11).

## Struktur halaman

### Halaman Mata Kuliah

1. Panel penjelas biru: halaman ini hanya menyimpan kode dan nama.
2. Pencarian kode atau nama.
3. **Tabel**: Kode, Nama Mata Kuliah, Aksi (Ubah / Hapus).
4. Ringkasan "Menampilkan N dari M mata kuliah".
5. `FormModal` dua field: **Kode Mata Kuliah**, **Nama Mata Kuliah**.

### Halaman Kurikulum

1. Tombol **"Tambah Mata Kuliah"** membuka `FormModal` lebar.
2. Dua filter: pencarian kode/nama, dan pilihan kurikulum.
3. **Tabel**: Kode, Nama Mata Kuliah, Kurikulum, SKS, Semester, Keterangan, Dosen
   Pengampu, RPS, Aksi.
4. Ringkasan "Menampilkan N dari M penawaran • X SKS".

Isi `FormModal` halaman Kurikulum:

| Urutan | Field | Catatan |
|---|---|---|
| 1 | Kurikulum | select; **dinonaktifkan saat mengubah** |
| 2 | Mata Kuliah | select dari master; saat menambah, yang sudah ditawarkan disembunyikan |
| 3 | Kode Mata Kuliah | **read-only**, mengikuti master |
| 4 | Semester | select master semester; boleh "Tanpa semester" |
| 5 | Bobot SKS | angka 0–12 |
| 6 | Keterangan | teks bebas (Wajib/Pilihan/catatan) |
| 7 | Dosen Pengampu | pencarian + pilih banyak; daftar dari API Hub |
| 8 | Upload RPS | PDF, maks 10 MB; daftar RPS tersimpan dengan tombol Hapus |

Field **"Kalender Semester"** sudah **dihapus**: field `Semester` langsung berarti master
semester, sehingga kontrol kedua untuk data yang sama hanya membingungkan.

## Template dan komponen

- **Template halaman daftar:** `AdminLayout` — dipakai kedua halaman, keduanya berformat
  **tabel**.
- **Formulir:** `FormModal` + `Field`, termasuk prop `error` untuk galat tingkat formulir.
- **Komponen bersama:** `ConfirmDialog`, `useToast`, `EmptyState` / `LoadingState` /
  `ErrorState`, kelas `btn-primary` / `btn-secondary` / `field-input` / `table-base`.

`FormPageTemplate` **tidak lagi** dipakai modul ini. Alasannya: tidak ada lagi formulir
panjang sebagai halaman tersendiri. Bila kelak dibutuhkan, aturan judul tunggal tetap
berlaku (lihat `docs/design-system/PAGE_TEMPLATES.md`).

## Aturan implementasi

- **`study_program_id` selalu dari sesi** (`scopedTenantId`), tidak pernah dari browser.
  Kolom ini tidak ada di `createCourseMasterSchema` maupun `createCurriculumItemSchema`.
- **Penawaran tidak menyimpan `study_program_id`.** Kepemilikannya diturunkan dari
  `curriculum.study_program_id`. Setiap endpoint memverifikasi lewat
  `findCurriculumItemInTenant(itemId, studyProgramId)` sehingga `:id` pada URL tidak
  dapat dipakai menyentuh data prodi lain.
- **`courseId` diverifikasi milik prodi yang sama** (`findCourseMasterInTenant`) sebelum
  penawaran dibuat atau diubah. Ini mencegah penautan lintas prodi lewat id tebakan.
- **Kode mata kuliah unik per prodi**, bukan global. Dua prodi boleh memakai kode yang
  sama; server memeriksa duplikat dengan `study_program_id` sebagai bagian kunci.
- **RPS diunggah setelah penawaran tersimpan.** Pada mode tambah, alur memanggil
  `POST /admin/curriculum-items` lebih dulu untuk mendapat id, lalu
  `POST /admin/curriculum-items/:itemId/rps`.
- **Keterangan adalah teks bebas** (`description`). Dropdown `Jenis`
  (Wajib/Pilihan/Praktikum/MBKM) tidak ada. Kolom `course_type` pada tabel warisan
  dipertahankan semata agar data historis terbaca.
- **Dosen pengampu boleh lebih dari satu**, disimpan sebagai snapshoot
  `[{ id, name, nidn }]` pada `curriculum_items.lecturers_data` (pola ADR-003).
- Daftar dosen dari `GET /api/v1/admin/lecturers` (proxy API Hub). Pencarian dosen
  dilakukan **di sisi klien** atas daftar yang sudah dimuat; nama dan NIDN sama-sama
  dicocokkan. Daftar dibatasi 8 hasil agar formulir tidak memanjang.
- Ringkasan angka (jumlah, SKS) **dihitung dari data tersimpan**, bukan konstanta.
- Aksi destruktif memakai `ConfirmDialog`; `alert()`/`confirm()` dilarang.

## API modul

### Master mata kuliah

| Endpoint | Keterangan |
|---|---|
| `GET /api/v1/admin/master-courses` | Daftar master milik prodi aktif |
| `POST /api/v1/admin/master-courses` | Membuat master (`code`, `name`). Duplikat kode → `409` |
| `PUT /api/v1/admin/master-courses/:id` | Mengubah kode/nama; kode duplikat → `409` |
| `DELETE /api/v1/admin/master-courses/:id` | Menghapus master **beserta seluruh penawaran dan RPS-nya** |

### Penawaran kurikulum

| Endpoint | Keterangan |
|---|---|
| `GET /api/v1/admin/curriculum-items` | Daftar penawaran; `?curriculumId=` opsional |
| `POST /api/v1/admin/curriculum-items` | Menawarkan mata kuliah (`courseId`) pada kurikulum |
| `PUT /api/v1/admin/curriculum-items/:id` | Mengubah detail penawaran |
| `DELETE /api/v1/admin/curriculum-items/:id` | Menghapus penawaran (RPS ikut terhapus) |
| `POST /api/v1/admin/curriculum-items/:itemId/rps` | Unggah RPS (multipart, field `file`) |
| `DELETE /api/v1/admin/curriculum-rps/:id` | Hapus RPS beserta berkas fisiknya |
| `GET /api/v1/admin/rps/file/:filename` | Menyajikan PDF; **tanpa sesi** karena ditautkan halaman publik |

### Data warisan (masih ada, tidak dipakai UI baru)

`GET/POST/PUT/DELETE /admin/courses` dan `/admin/courses/:courseId/rps` tetap ada untuk
melayani `curriculum_courses` lama. Jangan dihapus sebelum migrasi data tuntas.

## Aturan berkas RPS

- **Hanya PDF.** `fileFilter` multer menolak MIME selain `application/pdf`. Klien juga
  memeriksa `file.type` sebelum mengirim.
- **Maksimal 10 MB**, diatur `UPLOAD_RPS_MAX_BYTES` (`config.upload.rpsMaxBytes`). Klien
  memakai konstanta `RPS_MAX_BYTES` di `contentApi.ts`; bila batas server diubah lewat
  env, teks bantuan perlu disesuaikan manual.
- Nama berkas di disk acak (`<timestamp>-<16 hex>.pdf`), bukan nama asli dari klien.
- Berkas disimpan di `uploads/rps/` dan **tidak** dilayani `express.static`. Akses hanya
  lewat `GET /admin/rps/file/:filename` yang memvalidasi pola nama dengan regex.
- Menghapus RPS menghapus baris database **dan** berkas fisiknya.

## Jangan diubah tanpa keputusan formal

- **Jangan menggabungkan master dan penawaran kembali menjadi satu tabel.** Pemisahan
  adalah inti ADR-006; menggabungkannya membuat satu mata kuliah tidak bisa dipakai di
  dua kurikulum dengan SKS berbeda.
- **Jangan memindahkan RPS ke master.** RPS melekat pada penawaran.
- **`curriculum_items` tidak punya `study_program_id`.** Kepemilikan diturunkan dari
  kurikulum induk; menambah kolom itu akan membuat dua sumber kebenaran.
- **Jangan menghidupkan kembali field "Kalender Semester"** maupun dropdown `Jenis`.
- Semantik `curriculum_semesters` (nomor 1..14) adalah **warisan** dan bukan master
  semester nasional. Jangan menautkan tanggal akademik ke tabel itu.
- Kolom `curriculum_courses.*` adalah warisan; UI baru tidak menulis ke sana.

## Fitur yang belum ada

| Fitur | Status | Catatan |
|---|---|---|
| **Pengaturan Password RPS** | Belum diimplementasi | Tidak ada kolom password, endpoint, maupun tombol. |
| **CRUD semester posisi dari UI** | Belum ada | `POST/DELETE /admin/semesters` tersedia tetapi tidak punya antarmuka. |
| **CRUD kurikulum dari UI** | Belum ada | `POST/PUT/DELETE /admin/curriculums` tersedia; halaman Kurikulum hanya menampilkan pilihan kurikulum. Kurikulum dibuat langsung di database atau lewat API. |
| **Migrasi `curriculum_courses` → `courses`** | Belum dilakukan | Tabel lama dibiarkan; halaman publik membaca keduanya. |
| Menu dosen **"Mata Kuliah & RPS"** | Belum ada | Teks bantuan tidak lagi menjanjikan menu ini. |
| **Menghapus RPS dari formulir ubah** | Terbatas | Baris RPS dihapus per item; tidak ada penggantian berkas sekali klik (unggah baru = RPS tambahan, revisi lama dihapus manual). |

## Dependensi

- `/admin/semester` — sumber pilihan semester global.
- ONE UNUSU API Hub `GET /api/v1/inter-service/dosen` — sumber data dosen.
- `docs/decisions/ADR-006-master-mata-kuliah-dan-penawaran-kurikulum.md`
- `docs/decisions/ADR-003-master-semester-and-lecturer-api-hub.md`
- `docs/decisions/ADR-005-mata-kuliah-milik-prodi.md`
- `docs/DATABASE.md` bagian 7
