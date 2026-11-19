# Aturan Modul Portal

## Hero Slider

- Endpoint admin `GET` dan `PUT /api/v1/admin/portal/hero-slides` mengelola banner berdasarkan scope `portal`, `faculty`, atau `prodi`.
- Scope `faculty` hanya memakai `X-Faculty-Id`; server memvalidasi aksesnya dengan `resolveContentOwner`. ID fakultas tidak boleh dikirim dalam body.
- Banner fakultas disimpan pada widget `hero_slider` di halaman `beranda` dengan `Page.facultyId`. Banner prodi tetap menggunakan `Page.studyProgramId`.
- Endpoint publik `GET /api/v1/public/hero-slides` menentukan scope dari hostname tenant. Domain fakultas membaca `Page.facultyId`, bukan `Page.studyProgramId`.
- `FacultyLandingPage` memakai respons endpoint publik sebagai sumber utama. Gambar bawaan fakultas hanya fallback ketika belum ada slide yang dikonfigurasi.
- Halaman admin memakai `AdminLayout`, serta menyediakan keadaan memuat, gagal, kosong, dan interaktif sesuai aturan proyek.
