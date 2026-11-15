# ADR-001: Ekstensi Tenancy Fakultas Mandiri (Domain, Landing Page, dan Admin Fakultas)

**Tanggal:** 2026-11-15  
**Status:** Diterima (Accepted)  
**Terkait:** `prodi-unusu/docs/DATABASE.md`, `prodi-unusu/docs/DEVELOPMENT-RULES.md`, `prodi-unusu/docs/ARCHITECTURE.md`

---

## 1. Konteks (Context)
Sebelumnya, pada aturan awal proyek `prodi-unusu`, diputuskan bahwa:
* `faculties` hanya merupakan tabel data induk (*Bukan tenant, tidak memiliki domain*).
* Domain dan tenancy mandiri hanya dimiliki secara eksklusif oleh `study_programs`.

Namun seiring perkembangan kebutuhan institusional UNUSU:
1. Setiap Fakultas (6 Fakultas di UNUSU: FIK, FAI, FP, FIKes, FIP, FE) memerlukan landing page publik mandiri dengan domain/subdomain khusus (misal: `fik.unusu.ac.id`, `fai.unusu.ac.id`).
2. Setiap Fakultas membutuhkan media komunikasi resmi yang mencakup:
   - Profil Fakultas (Deskripsi, Sejarah, Struktur Pimpinan Dekanat).
   - Visi, Misi, Sasaran & Tujuan Fakultas.
   - Berita / Publikasi / Pengumuman Fakultas.
   - Galeri Dokumentasi Kegiatan Fakultas.
   - Kontak & Lokasi Dekanat.
   - Direktori Prodi di bawah naungan fakultas tersebut.
3. Peran `ADMIN_FAKULTAS` dengan cakupan `scope_type = 'faculty'` faktanya sudah ada di sistem RBAC, namun belum memiliki portal mandiri untuk mengelola landing page fakultasnya.

---

## 2. Keputusan (Decision)
Diputuskan untuk **meng-upgrade arsitektur tenancy pada platform menjadi Unit-Tenancy (Dwi-Tenant: Prodi & Fakultas)**:

1. **Model Tenancy**:
   - `faculties` diangkat menjadi entitas tenant mandiri (sejajar dengan `study_programs`).
   - Tabel `domains` diperluas dengan kolom relasi opsional `faculty_id` (sehingga sebuah domain dapat diarahkan ke Prodi ATAU ke Fakultas).
   - Konten publik (`website_settings`, `pages`, `posts`, `galleries`, `contacts`, `hero_sliders`) dapat terikat ke `faculty_id` atau `study_program_id`.

2. **Tenant Resolver**:
   - Middleware `tenantResolver` mengidentifikasi tipe tenant dari domain:
     - Jika terikat ke `study_program_id` $\rightarrow$ memuat konteks website Prodi.
     - Jika terikat ke `faculty_id` $\rightarrow$ memuat konteks website Fakultas.
   - Frontend menyajikan komponen dan data dinamis sesuai konteks unit.

3. **Admin Portal**:
   - Pengguna dengan peran `ADMIN_FAKULTAS` secara otomatis diarahkan untuk mengelola data website fakultasnya (Profil, Visi Misi, Berita, Galeri, Kontak Dekanat) menggunakan template standar ekosistem UNUSU.

4. **Kaidah Form & Tata Kelola UI**:
   - Seluruh form input di admin fakultas wajib mematuhi aturan Card Container (`project-docs-governance` Part 10.8): tidak ada label dan input yang mengambang di background kosong.

---

## 3. Konsekuensi (Consequences)
* **Keuntungan**:
  - Tidak perlu membuat repository / codebase baru, menghemat deployment port dan biaya server VPS.
  - Fitur yang sudah matang (Page builder, SEO, Hero Slider, Rich Text, SSO) langsung dapat dinikmati oleh fakultas.
  - Struktur data universitas tetap terintegrasi dalam satu pangkalan data.
* **Tantangan**:
  - Diperlukan migrasi skema database yang hati-hati pada tabel `domains` dan entitas konten agar bersifat *nullable/polymorphic* terhadap `faculty_id`.
  - Aturan lama di `DEVELOPMENT-RULES.md` dan `DATABASE.md` yang menyatakan fakultas bukan tenant harus diperbarui.

---

## 4. Alternatif yang Dipertimbangkan
1. **Membuat repository terpisah `fakultas-unusu`**:
   - *Ditolak* karena terjadi duplikasi besar-besaran (DRY violation) pada modul page builder, auth SSO, dan sistem widget yang sudah stabil di `prodi-unusu`.
2. **Hanya membuat halaman statis di portal pusat ONE UNUSU**:
   - *Ditolak* karena Dekanat/Admin Fakultas membutuhkan otonomi penuh untuk memperbarui berita, galeri, dan profil fakultas secara independen tanpa bergantung pada Superadmin pusat.
