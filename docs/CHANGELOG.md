# Changelog

## Unreleased

- Hero Slider: scope fakultas kini menyimpan dan membaca widget `hero_slider` pada halaman fakultas sendiri. Beranda fakultas memakai API hero publik yang sama, sehingga banner editor dan domain fakultas konsisten; gambar bawaan hanya fallback.
- LMS: kandidat plotting peserta kini diambil dari API ONE UNUSU dengan peran `MAHASISWA`; peserta tetap dipilih dan disimpan per kelas sebelum sinkronisasi ke LMS.
- LMS: perbaiki validasi parameter ID pada ubah, hapus, dan plotting peserta kelas.
- LMS: sederhanakan halaman Jadwal & Kelas dengan menghapus tindakan sinkronisasi dan generate kelas massal dari antarmuka; kelas paralel kini dilabeli sebagai rombel.

Semua perubahan penting dicatat di sini. Format tanggal: YYYY-MM-DD.

## 2026-11-18 — Gambar Visi & Misi mengikuti Profil

- Gambar kiri `/visi-misi` mengikuti aturan `/profil`: `object-contain`, tinggi alami pada mobile dan mengikuti kolom konten pada desktop, tanpa crop, radius, atau caption overlay.

## 2026-11-16 - Endpoint Organisasi untuk ONE UNUSU

### Added
- **`POST /api/v1/public/organisasi`** — endpoint server-ke-server yang mengembalikan seluruh fakultas beserta program studi aktif di dalamnya, dalam satu respons bersarang. Dipakai ONE UNUSU sebagai **sumber tunggal** data organisasi, sehingga aplikasi cabang (LPM, LPPM, BAKSI, BAKSA) tidak perlu tahu Portal Prodi ada. Wajib menyertakan `Authorization: Bearer <PRODI_API_KEY>` atau `X-API-Key`.
- **`PRODI_API_KEY`** pada `.env`. Bila variabel ini kosong, endpoint menolak seluruh permintaan dengan 503 (fail-closed) — lebih aman daripada diam-diam terbuka untuk umum.

### Notes
- Endpoint dipasang **sebelum** `publicRoutes` di `app.ts`, karena `publicRoutes` selalu diikat ke tenant dari hostname, sedangkan endpoint ini justru harus mengembalikan seluruh fakultas sekaligus.
- Hanya kolom yang dibutuhkan pemanggil yang dikirim. `hostname`, `logo_url`, dan `external_prodi_code` sengaja tidak disertakan agar topologi tenant tidak bocor.

## 2026-11-19 - Callback SSO Token-Only

### Changed
- Callback SSO beralih ke pola token-only (`/sso/callback?token=...`). Client ID dan Key diambil langsung dari konfigurasi server aplikasi demi keamanan identitas client.
- Parameter token di URL dihapus dari address bar segera setelah dibaca.


## 2026-11-16 - Halaman Penuh Form Kurikulum & Penawaran MK (Governance Compliance)

### Added
- **`AdminCurriculumCreate.tsx`**: halaman form penuh (`FormPageTemplate`) untuk Tambah & Ubah Kurikulum (`/admin/kurikulum/baru` & `/admin/kurikulum/:id/ubah`). Field: Nama, Tahun, Keterangan (textarea), Status (radio Aktif/Nonaktif).
- **`AdminCurriculumItemForm.tsx`**: halaman form penuh untuk Tambah & Ubah Penawaran MK (`/admin/kurikulum/mata-kuliah/baru` & `/admin/kurikulum/mata-kuliah/:id/ubah`). Menggunakan `SearchableSelect` (select2) untuk Kurikulum, MK master, Semester, dan textarea untuk Keterangan.
- Panel ringkasan kartu kurikulum di atas tabel penawaran pada `/admin/kurikulum` lengkap dengan aksi **Ubah** dan **Hapus** kurikulum.

### Changed
- Tombol utama header `/admin/kurikulum` diubah menjadi **"Tambah Kurikulum"** (menuju `/admin/kurikulum/baru`).
- Tombol **"Tambah Mata Kuliah ke Kurikulum"** dipindahkan ke baris filter di atas tabel sebagai tombol sekunder (menuju `/admin/kurikulum/mata-kuliah/baru`).
- Seluruh `FormModal` di `/admin/kurikulum` dihapus; form >2 field kini 100% mematuhi aturan tata kelola (ADR-004 / `FormPageTemplate`).
- Field Keterangan pada tabel dibatasi 1 baris (`truncate`) agar tidak merusak tinggi baris tabel.

## 2026-11-16 - Master Mata Kuliah dan Penawaran Kurikulum Dipisah (ADR-006)

### Added
- **Tabel `courses`**: master mata kuliah berisi **kode + nama** saja, unik per prodi (`study_program_id, code`).
- **Tabel `curriculum_items`**: penawaran mata kuliah pada kurikulum, menautkan `course_id` (**id matakuliah**) dengan `academic_semester_id`, `credits`, `description`, `lecturers_data`. Unik `(curriculum_id, course_id)`.
- **Tabel `curriculum_rps`**: dokumen RPS per penawaran (cascade).
- Endpoint `GET/POST/PUT/DELETE /api/v1/admin/master-courses`.
- Endpoint `GET/POST/PUT/DELETE /api/v1/admin/curriculum-items`.
- Endpoint `POST /api/v1/admin/curriculum-items/:itemId/rps` dan `DELETE /api/v1/admin/curriculum-rps/:id`.
- `findCourseMasterInTenant` dan `findCurriculumItemInTenant` di `curriculumService.ts` sebagai guard isolasi tenant.
- `createCourseMasterSchema` dan `createCurriculumItemSchema` di `shared/schemas/content.ts`.
- `docs/decisions/ADR-006-master-mata-kuliah-dan-penawaran-kurikulum.md`.

### Changed
- **Menu "Mata Kuliah"** (`/admin/mata-kuliah`) kini hanya mengelola **kode dan nama** lewat `FormModal` dua field, dengan tabel Kode · Nama · Aksi.
- **Menu "Kurikulum"** (`/admin/kurikulum`) menjadi tabel **penawaran**: Kode, Nama, Kurikulum, SKS, Semester, Keterangan, Dosen, RPS, Aksi. Formulirnya memakai **select mata kuliah** (`courseId`); kode ditampilkan read-only mengikuti master.
- `listPublicCurriculum` dan `buildCurriculumSummary` membaca `items` (baru) **dan** `semesters[].courses` (warisan), sehingga statistik tidak anjlok ke nol.
- Halaman publik `/kurikulum` menggabungkan kedua sumber dan membangun filter semester dari nilai yang benar-benar ada.

### Removed
- `src/client/pages/admin/AdminCurriculumForm.tsx` **dihapus**; rutenya dialihkan ke `/admin/mata-kuliah`.
- Rute `/admin/mata-kuliah/baru`, `/admin/mata-kuliah/:id/ubah`, `/admin/kurikulum/baru`, dan `/admin/kurikulum/semester/baru` kini berupa pengalihan.

### Known Gaps
- **Belum ada UI CRUD kurikulum.** `curriculum_items` memerlukan `curriculum_id`, sehingga kurikulum harus dibuat lewat API/database sebelum mata kuliah dapat ditawarkan.
- **Belum ada CRUD semester posisi dari UI** (`POST/DELETE /admin/semesters` tersedia tanpa antarmuka).
- **Migrasi `curriculum_courses` → `courses` belum dilakukan.** Tabel lama dibiarkan; keduanya dibaca halaman publik.
- Menghapus master mata kuliah bersifat **destruktif**: seluruh penawaran dan RPS-nya di semua kurikulum ikut terhapus.

## 2026-11-16 - Modul Dipisah: Menu "Mata Kuliah" dan "Kurikulum"

### Added
- **Halaman baru `/admin/mata-kuliah`** (`AdminCourses.tsx`): daftar mata kuliah datar dengan pencarian, filter Semua Semester / Semua Keterangan / Semua Dosen, tabel, dan tombol **"Tambah Mata Kuliah"**. Isi halaman ini dipindahkan dari `/admin/kurikulum`.
- Rute `/admin/mata-kuliah/baru` dan `/admin/mata-kuliah/:id/ubah`.
- Entri menu **"Mata Kuliah"** pada `CATALOG_PRODI` (`src/client/services/adminApi.ts`), muncul sebelum Kurikulum.
- Prop opsional `error` pada `FormModal` untuk menampilkan galat tingkat formulir sebagai alert.

### Changed
- **`/admin/kurikulum` kembali menjadi halaman Kurikulum**, dalam **format tabel**: kolom Nama Kurikulum, Tahun, Semester (badge nomor), jumlah Mata Kuliah, Status, dan Aksi. Tombol "Tambah Kurikulum" kini benar-benar membuat kurikulum lewat `FormModal` pendek.
- `AdminCurriculumForm` kini memakai `listPath = '/admin/mata-kuliah'`.
- Deskripsi menu `content.curriculum` diperbarui menjadi "Struktur kurikulum & semester"; ikonnya `ClipboardDocumentListIcon` agar berbeda dari Mata Kuliah.

### Removed
- Nama tombol lama **"Tambah Kurikulum"** yang sebenarnya membuka form mata kuliah. Tombol pada halaman Mata Kuliah kini bernama "Tambah Mata Kuliah".
- Duplikasi `<Route path="/admin/kurikulum/semester/baru">` pada `App.tsx`.

### Fixed
- `/admin/kurikulum/baru` kini **dialihkan** ke `/admin/mata-kuliah/baru` sehingga tautan lama tidak menjadi 404.

### Documentation
- `docs/routes/kurikulum/RULES.md`: rute dipecah menjadi dua menu, struktur kedua halaman, dan bagian baru **"Sumber katalog menu"** yang mencatat bahwa sidebar dibangun dari `CATALOG_PRODI` di kode, **bukan** dari tabel `admin_menus`.

### Known Gaps
- Tabel `admin_menus` di database **tidak dipakai** untuk membangun sidebar. Entri `content.courses` sudah disisipkan ke tabel itu agar konsisten, tetapi perubahan sidebar yang sesungguhnya ada di `CATALOG_PRODI`. Bila kelak tabel itu dijadikan sumber sebenarnya, perlu pekerjaan tersendiri — belum dilakukan.
- Halaman Kurikulum **menampilkan dan menghapus** kurikulum, tetapi **belum** dapat mengelola semester (tambah/hapus per kurikulum) dari UI. Endpoint `POST/DELETE /admin/semesters` tersedia namun belum punya antarmuka.
- Jumlah "Mata Kuliah" pada tabel Kurikulum umumnya **0** untuk data baru, karena mata kuliah tidak lagi ditautkan ke semester posisi.

## 2026-11-16 - Keterbacaan Sidebar dan Keseragaman Header Admin

### Changed
- `AdminLayout`: label menu sidebar naik dari 13px ke **14px**, deskripsi menu dari 10px ke **12px**, judul grup menu dari 10px ke **11px**. Tinggi item menu naik dari 46px ke 50px, ikon dari 16px ke 18px, dan lebar sidebar dari 280px ke 300px agar teks yang lebih besar tidak terpotong.
- `AdminLayout`: warna teks sekunder sidebar diganti dari `slate-500`/`slate-400` ke `slate-600`; deskripsi pada menu aktif memakai `brand` `#1e3a8a`.
- `AdminLayout`: breadcrumb topbar dinaikkan ke 13px, nama peran pada tombol profil ke 11px, tombol `Lihat Website` dan `Ciutkan Sidebar` ke 44px.
- `AdminPanelTemplate`: deskripsi panel memakai `text-slate-600` dan jarak `mt-1.5`, disamakan dengan topbar `AdminLayout` yang juga memakai border `#CBD5E1` dan latar putih.

### Fixed
- Kontras teks sidebar gagal WCAG AA: judul grup menu `slate-400` pada latar `#F0F4FA` hanya **2.32:1** dan deskripsi menu `slate-500` **4.31:1** (ambang 4.5:1). Setelah perbaikan seluruh teks sidebar berada pada 6.87:1 sampai 16.17:1.

## 2026-11-16 - Tata Kelola Dokumentasi Dirapatkan dan Dialog Kata Sandi Memakai FormModal

### Added
- `docs/PROJECT_RULES.md`: indeks aturan pengikat berisi hierarki prioritas aturan, larangan yang berlaku di mana pun, empat keadaan wajib UI, dan tabel dokumen yang wajib diperbarui saat kode berubah. Dokumen ini menautkan ke sumber aturan, bukan menyalinnya, agar tidak ada dua versi yang bertentangan.
- `docs/routes/dokumen/RULES.md`: aturan modul arsip dokumen (rute, endpoint, sumber data, template, larangan yang dikunci, dan dokumentasi terkait).

### Changed
- Dialog kata sandi arsip pada `/dokumen` kini memakai `FormModal` + `Field` bersama, bukan dialog buatan sendiri. Fokus otomatis, penutupan `Escape`, klik latar, dan pasangan tombol `Batal`/kirim mengikuti perilaku formulir lain di proyek.
- `docs/DEVELOPMENT-RULES.md` §1: rujukan `docs/PRD.md` yang tidak ada diganti `docs/PROJECT_RULES.md`.
- `docs/design-system/COMPONENTS.md`: menambahkan bagian "Dialog satu-field" yang mewajibkan `FormModal` untuk dialog berisi satu input.
- `docs/design-system/PAGE_TEMPLATES.md`: modul `dokumen` dicatat pada peta migrasi.
- `docs/README.md`: `PROJECT_RULES.md` masuk struktur dokumentasi, dan catatan "belum ada" diperbarui.

### Fixed
- `docs/DESIGN-RULES.md` §9: menambahkan aturan target sentuh minimal 44x44 px, penutupan dialog dengan `Escape`, dan `role="alert"` untuk pesan galat. Sebelumnya aturan ini belum tercatat.
- Tombol `Lihat Dokumen` pada `/admin/dokumen` dan `/dokumen` dinaikkan ke `min-h-[44px]` agar memenuhi aturan target sentuh.

## 2026-11-16 - Mata Kuliah Dimiliki Program Studi Secara Langsung (ADR-005)

### Added
- `curriculum_courses.study_program_id` (`NOT NULL`, `ON DELETE CASCADE`) beserta relasi balik `StudyProgram.curriculumCourses`. Mata kuliah kini punya jalur kepemilikan prodi sendiri, tidak lagi bergantung pada rantai `semester -> curriculum`.
- Indeks `(study_program_id, academic_semester_id)` dan `(study_program_id, code)`.
- `docs/decisions/ADR-005-mata-kuliah-milik-prodi.md`.

### Changed
- **`GET /api/v1/admin/courses` memfilter `where: { studyProgramId }`** langsung, bukan lewat `semester.curriculum.studyProgramId`. Konsekuensinya mata kuliah tanpa semester **kini tampil**; sebelumnya ia hilang diam-diam dari daftar padahal tersimpan.
- `findCourseInTenant` memeriksa `{ id, studyProgramId }`. Akses lintas prodi tetap ditolak, dan kini tidak lagi bergantung pada keberadaan semester.
- **`POST /api/v1/admin/courses` tidak lagi mencari/membuat kurikulum dan `Semester 1` sebagai jangkar.** `studyProgramId` diisi server dari sesi; `semesterId` dibiarkan `NULL`. Formulir dapat dipakai tanpa kurikulum.
- Mode ubah pada form mengambil data dari `GET /admin/courses` (daftar datar), bukan menelusuri pohon kurikulum — pohon itu tidak menjangkau mata kuliah tanpa semester.
- **Filter Semester pada halaman daftar memakai master semester (`academicSemester`)**, bukan nomor posisi 1..14, sejalan dengan formulir. Ditambahkan opsi **"Tanpa semester"** untuk mata kuliah yang belum ditautkan agar tidak hilang dari jangkauan filter.
- Kolom Semester pada tabel menampilkan nama master semester, atau `-` bila belum ditautkan.
- `CourseRow.semesterId` dan `CourseRow.semester` menjadi nullable; ditambahkan `studyProgramId`.

### Fixed
- Kesalahan data yang tidak terlihat: mata kuliah tanpa semester sebelumnya dapat disimpan namun tidak pernah muncul di daftar. Kini tersimpan **dan** tampil.
- `removeRps` kini menyegarkan cache daftar mata kuliah, karena daftar datar memuat `rpsDocuments`.

### Removed
- Logika "jangkar semester" pada `POST /admin/courses` (mencari kurikulum aktif, membuat `Semester 1`, menolak dengan `CURRICULUM_REQUIRED` bila prodi belum punya kurikulum).

### Database
- `npx prisma db push` dijalankan. Tabel `curriculum_courses` berisi **0 baris** saat migrasi, sehingga tidak ada data yang perlu di-backfill.

### Verification
- Uji isolasi langsung ke database: dua mata kuliah tanpa semester dibuat pada prodi TIF dan IKO. Daftar masing-masing hanya memuat miliknya (**tidak ada kebocoran dua arah**), mata kuliah tanpa semester **tampil**, dan akses lintas prodi via `findCourseInTenant` **ditolak**. Baris uji dihapus setelahnya.
- `GET /api/v1/admin/courses` tanpa sesi mengembalikan **401**.
- `npm run typecheck` (client + server) **0 error**; `npx vite build` **sukses**; `/admin/kurikulum` dan `/admin/kurikulum/baru` merespons **200**.

### Known Gaps
- **Mata kuliah tanpa semester tidak muncul di halaman publik kurikulum.** `GET /api/v1/public/curriculum` masih memakai `listPublicCurriculum` yang menelusuri `curriculum -> semesters -> courses`. Belum diperbaiki; perlu keputusan tersendiri.
- Tidak ada katalog mata kuliah lintas prodi: kode yang sama dapat muncul di beberapa prodi sebagai record terpisah, sesuai keputusan "input per prodi".
- **Pengaturan Password RPS** masih belum ada.

## 2026-11-16 — Semester Berarti Master Semester dan Judul Form Tidak Lagi Ganda

### Changed
- **"Semester" pada mata kuliah kini berarti master semester (periode kalender)**, bukan posisi `1..14`. Dropdown semester pada form mengambil data dari `GET /api/v1/admin/academic-semesters` (halaman `/admin/semester`) dan menyimpan `academicSemesterId`. Keputusan pemilik sistem: "Ganti total: Semester = periode kalender".
- Semester default dipilih otomatis: entri `isActive`, atau entri terbaru.
- Bila master semester masih kosong, form menampilkan `ErrorState` yang mengarahkan ke `/admin/semester` alih-alih dropdown kosong yang tidak bisa disimpan.
- `createCourseSchema` tidak lagi menerima `semesterId`; yang wajib adalah `academicSemesterId`. `updateCourseSchema` menjadi `createCourseSchema.partial()` dan server memvalidasi keberadaan `academicSemesterId` bila dikirim.

### Removed
- **Field "Kalender Semester" dihapus** dari form mata kuliah. Setelah `Semester` berganti makna menjadi master semester, field tautan terpisah menjadi kontrol kedua untuk data yang sama.

### Fixed
- **Judul dan deskripsi halaman form tampil dua kali** ("Tambah Mata Kuliah / Lengkapi data mata kuliah lalu simpan." muncul ganda, plus "Mata kuliah akan tersimpan pada semester yang dipilih." dan tombol `Kembali` berulang). Penyebabnya `AdminPanelTemplate` (lewat `AdminLayout`) dan `FormPageTemplate` sama-sama merender `<h1>` + deskripsi. Perbaikan: `FormPageTemplate` menerima prop baru `showHeader` (bawaan `true`); halaman form mengirim `showHeader={false}` sehingga template tidak lagi merender judul, deskripsi, **maupun `Kembali`**, dan `Kembali` dipindahkan ke slot `actions` milik `AdminLayout`.
- `curriculumApi.createCourse` pada `contentApi.ts` masih menuntut `semesterId` sehingga tidak cocok dengan kontrak server yang baru; tipe diperbarui.

### Database
- `curriculum_courses.semester_id` dijadikan **nullable** dengan `onDelete: SetNull` (sebelumnya `NOT NULL` + `Cascade`), agar mata kuliah dapat disimpan tanpa semester posisi. Server tetap menautkannya ke `Semester 1` kurikulum aktif tenant demi menjaga isolasi tenant pada `GET /admin/courses`.
- `prisma db push` dijalankan; Prisma Client di-generate ulang.

### Documentation
- `docs/routes/kurikulum/RULES.md`: struktur form diperbarui (semester = master semester, Kalender Semester dihapus), bagian baru **"Kepemilikan judul halaman"**, aturan `semester_id` nullable/otomatis, dan catatan bahwa mata kuliah tanpa `semesterId` sengaja tidak muncul di daftar.
- `docs/design-system/PAGE_TEMPLATES.md` dan `COMPONENTS.md`: prop `showHeader` beserta aturan satu `<h1>` per halaman.
- Peta migrasi template: baris `kurikulum` diperbaiki (daftar sudah tidak memakai `FormModal` untuk mata kuliah).

### Known Gaps
- Mata kuliah yang **belum** tertaut kurikulum tidak dapat ditampilkan tanpa membocorkan data lintas prodi, karena `curriculum_courses` tidak punya `study_program_id`. Bila isolasi langsung dibutuhkan, perlu ADR baru.
- **Pengaturan Password RPS** masih belum ada (tidak ada kolom, endpoint, maupun tombol).
- Nama tombol "Tambah Kurikulum" tetap dipertahankan meski membuka form mata kuliah, sesuai keputusan pemilik sistem.

## 2026-11-16 — Halaman Kurikulum Datar dan Endpoint Daftar Mata Kuliah

### Added
- `GET /api/v1/admin/courses`: daftar mata kuliah **datar** lintas semester (izin `curriculum.view`), memuat potongan `semester` induk dan `rpsDocuments`. Perataan dilakukan di server agar klien tidak menelusuri pohon kurikulum.
- `CourseRow` dan `curriculumApi.courses()` pada `src/client/services/contentApi.ts`.

### Changed
- **Halaman `/admin/kurikulum` dirombak menjadi daftar mata kuliah datar.** Hierarki kurikulum → semester tidak lagi menjadi navigasi. Halaman kini berisi: tombol **"Tambah Kurikulum"** (membuka form mata kuliah), pencarian **"Cari kode atau nama mata kuliah..."**, filter **Semua Semester / Semua Keterangan / Semua Dosen**, tabel mata kuliah dengan kolom RPS, dan ringkasan jumlah serta total SKS.
- Pilihan filter dibangun dari nilai yang benar-benar ada pada data, bukan daftar statis.
- **Form mata kuliah kini menampilkan Semester 1..14 penuh**, tidak lagi bergantung pada semester yang sudah dibuat. Saat menyimpan, semester dengan nomor terpilih dibuat otomatis bila belum ada. Kurikulum induk diambil dari kurikulum aktif pertama; bila belum ada kurikulum, form menolak menyimpan dan menampilkan keadaan gagal.
- Modal "Buat Kurikulum" dan "Tambah Semester" **dihapus** dari halaman daftar. CRUD kurikulum dan semester kini implisit: kurikulum dibuat lewat API, semester dibuat otomatis oleh form.

### Fixed
- Karakter `•` pada deskripsi halaman Kurikulum rusak menjadi mojibake (`â€¢`) karena berkas tersimpan dalam encoding campuran. Berkas ditulis ulang sebagai UTF-8 tanpa BOM.

### Documentation
- `docs/routes/kurikulum/RULES.md`: struktur halaman daftar, aturan semester otomatis, tabel endpoint diperbarui, dan bagian **"Fitur yang belum ada"** yang mencatat eksplisit bahwa **Pengaturan Password RPS belum diimplementasi**, menu dosen "Mata Kuliah & RPS" belum ada, dan `GET /admin/courses/:id` belum ada.

### Known Gaps
- **Pengaturan Password RPS tidak ada.** Fitur ini terlihat pada referensi desain namun tidak memiliki kolom database, endpoint, maupun tombol. Jangan menganggapnya tersedia.
- Menghapus kurikulum atau semester tidak lagi dapat dilakukan dari UI. Bila diperlukan, endpoint `DELETE /admin/curriculums/:id` dan `DELETE /admin/semesters/:id` masih ada tetapi tanpa antarmuka.
- Urutan migrasi template berubah lagi: `FormPageTemplate` kini hanya dipakai form mata kuliah; halaman daftar tetap `AdminLayout` biasa.

## 2026-11-16 — Form Kurikulum Berbasis Rute dan Unggah RPS (ADR-004)

### Added
- `src/client/components/ui/FormPageTemplate.tsx`: template formulir tambah/ubah pada rute tersendiri. Satu kartu per section (heading wajib), action bar `Simpan`/`Batal` di luar kartu, tombol `Kembali` di header, serta state `busy`/`error`. Mode `create`/`edit` dibedakan lewat prop, bukan duplikasi komponen.
- `src/client/pages/admin/AdminCurriculumForm.tsx`: halaman form mata kuliah. Section **Informasi Mata Kuliah** (Semester 1..14, Bobot SKS, Kode, Nama, Keterangan teks bebas, Kalender Semester opsional), **Dosen Pengampu** (kotak pencarian "Cari nama dosen...", badge terpilih, daftar checkbox nama + NIDN), dan **Upload RPS**.
- Rute `/admin/kurikulum/baru` (`curriculum.create`) dan `/admin/kurikulum/:id/ubah` (`curriculum.update`).
- `src/server/modules/admin/rps.routes.ts`: `POST /api/v1/admin/courses/:courseId/rps` (multipart, PDF saja, maks 10 MB), `PUT /api/v1/admin/rps/:id`, `DELETE /api/v1/admin/rps/:id`, serta router publik `GET /api/v1/admin/rps/file/:filename` untuk menyajikan berkas PDF.
- `config.upload.rpsMaxBytes` (`UPLOAD_RPS_MAX_BYTES`, bawaan 10 MB) dan `config.upload.rpsAllowedMime` (`application/pdf`) terpisah dari batas media umum.
- `rpsApi` dan konstanta `RPS_MAX_BYTES` pada `src/client/services/contentApi.ts`.
- Pencarian dosen pada form mata kuliah mencocokkan nama **dan** NIDN.
- `docs/decisions/ADR-004-form-page-template-dan-upload-rps.md`.

### Changed
- Formulir mata kuliah dipindahkan dari `FormModal` pada halaman daftar ke halaman rute tersendiri. Tombol "+ Mata Kuliah" dan "Ubah" kini bernavigasi, bukan membuka modal.
- **Keterangan menjadi teks bebas.** Field "Keterangan" memakai kolom `description` dan menggantikan posisi dropdown `Jenis` serta textarea "Keterangan / Deskripsi" yang sebelumnya terpisah.
- `createCourseSchema`: `courseType` dihapus dari kontrak. Server tidak lagi menulis `course_type` saat membuat mata kuliah.
- Tabel mata kuliah pada `/admin/kurikulum`: kolom "Jenis" diganti "Keterangan", dan tautan "Lihat RPS" muncul bila mata kuliah memiliki berkas RPS.
- `lecturerApi` pada klien kehilangan `create`/`update`/`remove` yang sudah tidak memiliki endpoint sejak ADR-003.

### Fixed
- **Tautan RPS publik tidak dapat dibuka pengunjung.** Rute penyajian berkas RPS awalnya terpasang di `adminRouter` sehingga terkena `authenticate` dan mengembalikan 401 tanpa sesi. Router berkas dipisahkan menjadi `publicRpsFileRouter` dan dipasang pada `app` sebelum `adminRouter`.
- Halaman kurikulum publik kini benar-benar dapat menampilkan RPS; sebelumnya tabel `rps_documents` tidak pernah terisi karena tidak ada endpoint tulis.

### Removed
- Import `createLecturerSchema` yang tidak terpakai di `content.routes.ts`.

### Documentation
- `docs/routes/kurikulum/RULES.md` ditulis ulang: rute baru, struktur tiga section, aturan RPS (PDF, 10 MB, nama acak, rute publik), dan daftar kolom warisan.
- `docs/design-system/PAGE_TEMPLATES.md`: `FormPageTemplate` dipindahkan dari "rencana" ke template tersedia, lengkap dengan tabel props, contoh pemakaian, batasan, dan peta migrasi.
- `docs/design-system/COMPONENTS.md`: entri `FormPageTemplate` ditambahkan; catatan "belum ada" diperbarui.
- `docs/design-system/DESIGN_RULES.md`: aturan formulir diperbarui.
- `docs/DATABASE.md`: status `course_type` sebagai warisan dan cara `rps_documents` ditulis.

### Known Gaps
- Belum ada `GET /api/v1/admin/courses/:id`; mode ubah mengambil data dari `GET /admin/curriculums`.
- CRUD kurikulum dan semester pada halaman daftar **masih memakai `FormModal`**. Satu modul kini memakai dua pola form (rute untuk mata kuliah, modal untuk kurikulum/semester). Ini disengaja agar migrasi tidak mencampur dua pola dalam satu formulir, tetapi harus diselesaikan.
- Urutan migrasi yang disetujui (`semester` → `dosen` → `kurikulum`) berubah pada praktiknya; `kurikulum` (form mata kuliah) dikerjakan lebih dulu.
- Menu dosen "Mata Kuliah & RPS" **belum ada**. Teks bantuan pada section Dosen Pengampu menjelaskan fitur tersebut, sehingga saat ini menjelaskan sesuatu yang belum tersedia.
- Batas 10 MB ditulis di dua tempat (server lewat env, klien lewat konstanta). Bila env diubah, teks bantuan formulir perlu disesuaikan manual.

## 2026-11-16 — Master Semester Global & Dosen Pengampu dari API Hub (ADR-003)

### Added
- `docs/decisions/ADR-003-master-semester-and-lecturer-api-hub.md`: keputusan master semester global dan sumber dosen dari ONE UNUSU API Hub.
- `docs/routes/kurikulum/RULES.md`, `docs/routes/semester/RULES.md`, `docs/routes/dosen/RULES.md`: catatan template, komponen bersama, rute, dan pengecualian tiap modul.
- Tabel `academic_semesters` (`code` unik, `name`, `start_date`, `end_date`, `is_active`) sebagai master semester global tanpa `study_program_id`.
- Kolom `curriculum_courses.academic_semester_id` (nullable, `ON DELETE SET NULL`) dan `curriculum_courses.lecturers_data` (JSON snapshoot `[{ id, name, nidn }]`).
- Halaman `/admin/semester` (`AdminAcademicSemesters.tsx`) untuk CRUD master semester beserta rentang tanggal.
- Menu sidebar `super.semester` pada section UNIVERSITAS, scope `global`.
- Endpoint admin `GET/POST/PUT/DELETE /api/v1/admin/academic-semesters` (izin `organization.view` / `organization.manage`).
- Endpoint `GET /api/v1/admin/lecturers/all` dan `services/lecturerIntegrationService.ts` (proxy ke API Hub, cache 60 detik).
- Endpoint ONE UNUSU `GET /api/v1/inter-service/dosen` (pengguna aktif berperan `DOSEN`) sesuai katalog API Hub.
- Pemilih **dosen pengampu multi-select** pada formulir mata kuliah, bersumber dari API Hub.

### Changed
- Formulir mata kuliah kini memilih tautan semester global (opsional), kode MK, nama MK, SKS, jenis, keterangan, dan dosen pengampu lebih dari satu.
- Tabel mata kuliah menampilkan kolom kalender semester dan badge daftar dosen pengampu.
- `GET /api/v1/admin/lecturers` dan `GET /api/v1/public/lecturers` membaca API Hub; publik memakai fallback tabel lokal bila API Hub gagal.

### Removed
- CRUD dosen lokal: `POST/PUT/DELETE /api/v1/admin/lecturers` dan `createLecturerSchema`/`updateLecturerSchema`.
- Formulir tambah/ubah/hapus dosen pada `/admin/dosen`; halaman kini read-only.

### Documentation
- `docs/DATABASE.md`: menambah `academic_semesters`, memperbarui `curriculum_courses` dan status tabel `lecturers`.
- `docs/design-system/` **dibuat**: `DESIGN_RULES.md`, `COLORS.md`, `TYPOGRAPHY.md`, `COMPONENTS.md`, `PAGE_TEMPLATES.md` — registry dari pembacaan langsung `tailwind.config.js`, `index.css`, dan `src/client/components/ui/*`.
- `docs/routes/kurikulum/RULES.md` mencatat pengecualian proyek-lebar: form create/edit memakai `FormModal` karena `FormPageTemplate` belum ada.
- Keputusan migrasi bertahap ke `FormPageTemplate` dicatat di `docs/design-system/PAGE_TEMPLATES.md` (status: belum dimulai).

### Known Gaps
- Migrasi `FormModal` → `FormPageTemplate` belum dikerjakan. Rencana urutan: `semester` → `dosen` → `kurikulum`.
- `docs/PROJECT_RULES.md` belum ada; aturan implementasi terpusat di `docs/DEVELOPMENT-RULES.md`.
- `docs/DESIGN-RULES.md` §3 (label 11px uppercase) tidak sesuai implementasi `.field-label` (12px, tidak uppercase); implementasi yang berlaku.

## 2026-11-16 — Arsip Dokumen LPM/LPPM (ADR-002)

### Added
- `docs/decisions/ADR-002-dokumen-arsip-lpm-lppm.md`: Keputusan menjadikan `/admin/dokumen` dan `/dokumen` sebagai penampil **read-only** arsip dokumen LPM/LPPM dari ONE UNUSU API Hub, dengan **daftar terbuka** dan kata sandi per prodi saat berkas dibuka.
- `src/client/pages/public/DocumentsPage.tsx`: Halaman publik `/dokumen` menampilkan **seluruh daftar dokumen tanpa kata sandi**, dengan **sidebar kategori di sisi kiri** (jumlah dokumen per kategori), pencarian, dan tombol **"Lihat Dokumen"**.
- `/admin/dokumen`: tombol **"Lihat Dokumen"** per baris yang langsung membuka pratinjau PDF tanpa meminta kata sandi arsip.
- Dialog kata sandi pada halaman publik yang muncul **saat menekan "Lihat Dokumen"**, lalu berkas langsung dipratinjau bila kata sandi benar.
- `src/server/services/arsipDokumenService.ts`: Proxy server-ke-server ke `POST /api/v2/website/dokumen` memakai token layanan `arsip.<clientId>.<hmac>`, ditambah cache singkat, `isAllowedFileUrl` (daftar putih host berkas), dan `ambilBerkasArsip`.
- `src/server/services/dokumenPasswordService.ts`: Kata sandi arsip prodi disimpan sebagai hash **scrypt** (`scrypt$N$r$p$saltHex$hashHex`), tidak pernah plaintext.
- `src/server/modules/admin/arsipDokumen.routes.ts`: Endpoint admin (`GET/PUT /dokumen-password`, `GET /arsip-dokumen`, `GET /arsip-dokumen/:id/file`) dan publik (`GET /public/arsip-dokumen`, `POST /public/arsip-dokumen/unlock`, `POST /public/arsip-dokumen/:id/preview`, `POST /public/arsip-dokumen/:id/download`).
- `src/client/components/DokumenPreviewModal.tsx`: Pratinjau PDF lewat `fetch` → `blob` → `<iframe src="blob:...">`, dengan tombol **Download**.
- Panel **"Kunci Dokumen"** pada `AdminDocuments.tsx` untuk memasang/mengganti kata sandi arsip prodi.
- Kolom `StudyProgram.externalProdiCode` untuk memetakan kode prodi lokal ke `prodiCode` arsip LPM/LPPM.
- Modul `arsipBerkas.ts` + `arsipMigrasi.ts` di LPM dan LPPM: penyimpanan berkas PDF bertanda tangan dan migrasi otomatis dokumen lama.

### Changed
- **Daftar dokumen terbuka, berkas terlindungi**: `GET /api/v1/public/arsip-dokumen` mengembalikan daftar lengkap **tanpa kata sandi**; hanya isi berkas yang dikunci. `fileUrl` tetap **tidak pernah** ikut pada payload agar kata sandi tidak dapat dilewati.
- `POST /api/v1/public/arsip-dokumen/unlock` kini **hanya memverifikasi kata sandi** (`{ valid, meta }`) dan tidak lagi mengirim daftar dokumen.
- **Admin prodi tidak lagi mengetik kata sandi**: `/admin/dokumen` membuka pratinjau dan unduhan lewat rute ber-sesi admin (`GET /admin/arsip-dokumen/:id/file`), sehingga tombol **"Lihat Dokumen"** langsung menampilkan PDF. Dialog kata sandi pada panel admin dihapus.
- `DokumenPreviewModal` menerima prop `sumber` (`'admin' | 'publik'`) untuk memilih rute berkas; halaman publik `/dokumen` tetap memakai kata sandi.
- `/admin/dokumen` kini **sepenuhnya read-only**: admin prodi hanya dapat melihat arsip, tidak menambah, mengubah, menghapus, atau mengunggah.
- Sumber dokumen **100%** dari arsip LPM/LPPM; difilter otomatis `tujuanPublish='prodi'` + `prodiCode` prodi aktif, **tidak digabung** dengan data lokal.
- Izin `documents` tinggal `['view']`; `create/update/delete` dicabut. Peran `EDITOR_DOKUMEN` menjadi "Pengelola Arsip Dokumen".
- PDF **tidak lagi disimpan sebagai base64** di kolom `filePdfUrl`. LPM/LPPM menerima unggahan lewat `POST /api/dokumen/berkas`, menulis berkas ke `uploads/dokumen`, dan menyimpan **URL bertanda tangan** `/api/arsip-berkas/<nama>?t=<hmac>`.
- Formulir dokumen LPM/LPPM (`DokumenBaruForm.tsx`, `DokumenForm.tsx`) mengunggah berkas lebih dulu lalu menampilkan nama & ukuran berkas, bukan isi base64.
- Komentar batas body 10 MB diperbarui: base64 hanya alat transportasi, bukan format penyimpanan.

### Removed
- Tabel `documents` lokal beserta seluruh CRUD `/api/v1/admin/documents` dan `GET /api/v1/public/documents`.
- Tipe `DocumentItem`/`documentApi` pada klien.

### Security
- **Prodi tanpa kata sandi diperlakukan sebagai kata sandi salah**: setiap percobaan pratinjau, unduh, maupun `unlock` ditolak `ARSIP_PASSWORD_INVALID`, sehingga status kunci prodi tidak dapat disimpulkan dari respons dan prodi yang lupa memasang kunci tidak pernah terbuka diam-diam.
- Keterbukaan daftar tidak membocorkan dokumen: judul, kategori, tahun, dan nomor boleh dilihat publik, sedangkan isi berkas tetap memerlukan kata sandi prodi.
- Kata sandi berlaku **kapan saja**, tanpa batas waktu sesi dan tanpa batas percobaan; diverifikasi per-aksi melalui header `X-Arsip-Password`.
- Kata sandi salah dijawab **403** (bukan 401) agar tidak memicu logout otomatis di klien.
- URL berkas LPM/LPPM **tidak** bocor ke payload publik — klien hanya menerima `fileTersedia`; PDF diambil lewat proxy agar kata sandi tetap menjadi syarat.
- Token layanan arsip hanya memberi hak **baca** (`dokumen:view`), tidak pernah menulis.

## 2026-11-15 — Tata Kelola Ekstensi Tenancy Fakultas (ADR-001)

### Added
- `docs/decisions/ADR-001-faculty-tenancy-and-landing-page.md`: Keputusan arsitektur penetapan Fakultas sebagai unit tenant mandiri yang memiliki domain, landing page, dan panel admin sendiri (Profil, Visi Misi, Berita, Galeri, Kontak).
- Model data Prisma diperluas: `Domain`, `WebsiteSetting`, `Theme`, `Menu`, `Page`, `Post`, `PostCategory`, `Gallery`, `ContactInfo`, `ContactMessage`, `ProfileContent`, dan `VisionMission` kini mendukung relasi `faculty_id`.
- Tipe `TenantContext` diperkaya dengan properti diskriminator `tenantType: 'prodi' | 'faculty'`.

### Changed
- `docs/DEVELOPMENT-RULES.md`: Memperbarui klausul tenancy menjadi Dwi-Unit Tenancy (Prodi & Fakultas) sesuai ketetapan ADR-001.
- `docs/DATABASE.md`: Memperbarui tabel relasi organisasi `faculties` dan `domains` untuk mendukung pemetaan hostname fakultas.
- `src/server/services/tenantService.ts`: Menambahkan resolver `toFacultyTenantContext` dan memperluas pencarian `resolveSite` agar memvalidasi domain fakultas secara dinamis.
- `src/client/pages/public/ProfilePage.tsx` & `VisionMissionPage.tsx`: Adaptif terhadap konteks unit (Otomatis menampilkan label Fakultas & Dekanat saat diakses dari domain fakultas).
- `src/client/pages/Login.tsx`: Menghapus form dan tombol "Login kata sandi lokal (jalur darurat)" sehingga autentikasi terpusat 100% via SSO ONE UNUSU resmi.

## 2026-11-08 — Redesain Seksi Tentang Program Studi (Dark Dot-Matrix & Student Showcase)

### Added
- Aset visual promosi di `public/assets/tentang/`: `students-duo.png` (foto pasangan mahasiswa berprestasi UNUSU), `circular-arch.png` (aksen lengkung hijau 3D), `halftone-corners.png` (pola halftone sudut), `mint-glow.png` (pendaran cahaya mint), dan `wave-banner.png` (pita gelombang bawah).

### Changed
- `src/client/modules/main-website/pages/MainLandingPage.tsx`: Redesain total seksi "Sekilas Tentang Program Studi di UNUSU" mengadopsi tema gelap futuristik (*dark obsidian & emerald*) berbasis tekstur *dot-matrix grid*, pendaran *mint glow*, framing *circular arch*, dan kartu pilar akademik *glassmorphism*.
- Penggantian `SparklesIcon` menjadi `ShieldCheckIcon` dan `GlobeAltIcon` sesuai kepatuhan Anti-Sparkles Rule.

## 2026-11-07 — Fondasi data dan portal berfungsi end-to-end

Perubahan besar. Aplikasi sebelumnya hanya tampilan; sekarang tersambung ke
database, memiliki autentikasi nyata, dan seluruh data berasal dari MySQL.

### Database

- Skema Prisma diperluas dari 27 menjadi 38 model. Model baru: `PageVersion`,
  `WidgetVariant`, `MediaAsset`, `PermissionGroup`, `PermissionGroupItem`,
  `UserRolePermissionGroup`, `Session`, `PostCategory`, `RpsDocument`,
  `ProfileContent`, `VisionMission`, `AdminMenu`, `Notification`,
  `SystemSetting`.
- `UserRole` sekarang menyimpan cakupan: `scope_type`, `study_program_id`,
  `faculty_id`.
- Index ditambahkan pada kolom filter dan urutan yang benar-benar dipakai.
- Migrasi awal dibuat: `20261107105550_init_multi_tenant_website`.
- `prisma/seed.ts` dibuat: idempotent, memakai `upsert`, tanpa `deleteMany()`
  terhadap data operasional.

### Backend

- Struktur dirapikan menjadi `config`, `middlewares`, `modules`, `services`,
  `utils`. Folder `src/server/routes` lama dihapus.
- `tenantResolver` ditulis ulang: hostname dinormalisasi, permukaan ditentukan
  dari konfigurasi eksplisit, dan **fallback tenant default dihapus**. Domain
  tidak terdaftar kini ditolak 404 dengan kode `DOMAIN_NOT_REGISTERED`.
- Autentikasi pindah ke JWT di cookie httpOnly dengan sesi tercatat di database.
  Endpoint baru: `POST /auth/sso`, `POST /auth/refresh`, `POST /auth/logout`.
- Proteksi CSRF double-submit cookie untuk seluruh permintaan tulis.
- Rate limit login: 10 percobaan per 15 menit per alamat IP.
- Valilasi Zod terpasang di seluruh endpoint melalui middleware `validate`.
  Hasil bersih ditulis ke `req.validated`.
- RBAC nyata: 92 permission, middleware `requirePermission`, dan
  `resolveScopedTenantId` yang menolak tenant di luar penugasan.
- Endpoint CRUD baru: builder (halaman, section, widget, duplikasi, urutan,
  pratinjau, versi, publikasi), navigasi, konten (kurikulum, semester, mata
  kuliah, dosen, dokumen, sarpras), publikasi (berita, kategori, galeri,
  kontak, pesan, profil, visi misi), media, pengguna dan peran, organisasi
  (fakultas, prodi, domain), audit.
- Unggahan berkas dengan multer: batas 10 MB, daftar MIME dibatasi, nama file
  acak, ekstensi dari MIME.
- Pemusat error: `AppError`, terjemahan kesalahan Prisma, dan penyembunyian
  detail internal pada production.
- Audit log dicatat untuk seluruh aksi tulis penting.

### Frontend

- Seluruh data hardcoded dihapus. `Dashboard`, `CurriculumPage`,
  `DocumentsPage`, `LecturersPage` kini membaca API.
- Lapisan service ditambahkan: `src/client/services/api.ts`,
  `contentApi.ts`, `adminApi.ts`.
- TanStack Query dipakai untuk server state, Zustand untuk konteks situs.
- `AdminLayout` ditulis ulang: menu dibangun dari permission pengguna, bukan
  daftar statis.
- Halaman admin baru yang benar-benar berfungsi: kurikulum, dokumen, dosen,
  sarpras, berita, galeri, kontak dan pesan, media, pengguna, builder,
  pengaturan, navigasi, profil, biodata, organisasi, domain.
- Seluruh `alert()` dan `confirm()` diganti `ToastProvider` dan
  `ConfirmDialog`.
- Halaman publik baru: profil, visi misi, sarpras, berita, galeri, dan 404.
- Navigasi website prodi diambil dari tabel `menus`, bukan daftar hardcode.
- Halaman `/sso/callback` ditambahkan sebagai penerima tiket SSO.
- SEO per domain: `useSeo` menetapkan judul, deskripsi, canonical, Open Graph,
  dan favicon per tenant.
- Bundel dipecah: `react-vendor`, `query-vendor`, dan `index`. Ukuran index turun
  dari 1.012 kB menjadi 542 kB, gzip 226 kB menjadi 77 kB.

### Konfigurasi

- `package.json`: dependensi baru `bcryptjs`, `cookie-parser`,
  `express-rate-limit`, `helmet`, `multer`, `mysql2`, `zustand`,
  `@tanstack/react-query`, `vitest`. Skrip `typecheck`, `test`, dan
  `prisma:deploy` ditambahkan.
- `.env.example` ditulis ulang dengan seluruh variabel yang dibutuhkan.
- `vite.config.ts`: proxy meneruskan header Host agar resolusi domain teruji
  lokal, dan bundel dipecah.
- Mode pratinjau lokal: `ALLOW_LOCAL_PREVIEW` dan `PREVIEW_HOST`.

### Skrip

- `scripts/dev-domain-setup.ts` â€” memeriksa dan menyiapkan pemetaan hostname
  lokal, menjelaskan tiga cara menguji multi-domain.
- `scripts/register-sso-client.ts` â€” mendaftarkan aplikasi sebagai klien SSO di
  database ONE UNUSU dan menulis client key ke `.env`.

### Pengujian

- `tests/builder-validation.test.ts` â€” 17 tes validasi skema.
- `tests/tenant-isolation.test.ts` â€” 11 tes isolasi tenant terhadap database
  sungguhan.
- `tests/smoke-api.ts` â€” 32 pemeriksaan endpoint: login, CSRF, resolusi domain,
  penolakan domain asing, pemisahan website utama, logout.
- `tests/e2e-crud.ts` â€” 32 pemeriksaan alur CRUD lengkap termasuk validasi
  konfigurasi widget dan draft versus terbit. Idempotent pada dua run berturut.

### Perbaikan

- Karakter rusak pada `ProdiWebsiteLayout` (urutan byte UTF-8 yang salah)
  diganti `&bull;`.
- `req.hostname` Express bersifat read-only; hasil normalisasi dipindah ke
  `req.requestHostname`.
- Nama relasi Prisma yang salah (`permissionGroups` menjadi
  `UserRolePermissionGroup`).
- Ketidakcocokan tipe union axios pada mutasi mata kuliah.

### Catatan migrasi

Jalankan pada salinan database terlebih dahulu:

```bash
npx prisma migrate deploy
npm run db:seed
```

Seeder aman dijalankan ulang. Akun Super Admin hanya dibuat bila
`SEED_SUPERADMIN_PASSWORD` diisi dan belum ada akun dengan email atau username
tersebut.

## 2026-11-07 (lanjutan) — Kesiapan deployment VPS

Hostname asli baru diuji di VPS, jadi kode disiapkan agar deployment tidak
menemukan kejutan.

### Perbaikan

- `hostnameResolver` sebelumnya hanya membaca `X-Forwarded-Host` ketika
  `trust proxy` aktif, dan pada production nilainya `loopback`. Nginx
  menulis `Host` asli, bukan forwarded, sehingga urutan pembacaan dibalik:
  `Host` didahulukan, `X-Forwarded-Host` menjadi cadangan. Tanpa perbaikan
  ini seluruh domain di VPS berpotensi terbaca sebagai `localhost`.
- `trust proxy` kini dikendalikan variabel `TRUST_PROXY`, bukan disimpulkan
  dari `NODE_ENV`. Rate limit per IP dan audit log bergantung pada ini.

### Konfigurasi

- `.env` dan `.env.example` mendapat `TRUST_PROXY`,
  `ALLOW_LOCAL_PREVIEW`, dan `PREVIEW_HOST`.

### Berkas deployment

- `deploy/nginx.conf` — satu upstream untuk seluruh domain, penerusan
  `Host` wajib, rate limit terpisah untuk login dan API, cache aset statis,
  dan daftar `server_name` 14 prodi plus portal dan website utama.
- `deploy/ecosystem.config.json` — konfigurasi PM2 mode single instance.
- `docs/DEPLOYMENT.md` — panduan lengkap dari prasyarat server, database,
  migrasi, build, Nginx, SSL certbot, pendaftaran klien SSO produksi,
  verifikasi, backup, sampai daftar periksa go live.

### Catatan

File hosts hanya untuk pengujian lokal. Di VPS, pemisahan domain terjadi
melalui Nginx yang meneruskan header `Host` asli ke satu aplikasi.

## 2026-11-07 (lanjutan) — Landing page publik tanpa login

Landing page program studi adalah halaman publik. Sebelumnya `localhost`
diperlakukan sebagai portal admin sehingga `/` selalu dialihkan ke `/login`.
Itu keliru untuk pengembangan maupun untuk pemahaman produk.

### Perbaikan

- `classifySurface` menganggap host loopback sebagai permukaan prodi, bukan
  admin. Portal admin tetap dapat dibuka dari host mana pun lewat `/login`
  dan `/admin`.
- `resolveSite` memberi tenant cadangan hanya untuk loopback: `PREVIEW_HOST`
  bila diisi, atau tenant aktif pertama bila kosong. Host publik yang tidak
  terdaftar tetap ditolak 404 tanpa cadangan.
- `App.tsx` tidak lagi mengalihkan beranda ke login. Pengalihan hanya terjadi
  pada `/login` saat pengguna sudah punya sesi.

### Pengujian

- Uji asap disesuaikan: localhost kini diharapkan mendapat tenant, sementara
  host publik asing tetap ditolak 404. Total 34 pemeriksaan lulus.
