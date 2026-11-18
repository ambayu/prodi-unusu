# Aturan Modul LMS

## Sumber data

- Portal Prodi adalah sumber tunggal kelas, jadwal, dosen pengampu, dan daftar peserta.
- LMS menerima hasil sinkronisasi dari Portal Prodi; mata kuliah referensi di LMS dibuat atau diperbarui oleh endpoint sinkron.

## Pembuatan kelas

- `POST /api/v1/admin/lms/classrooms/generate` membuat satu kelas grup `Utama` untuk setiap penawaran pada kurikulum aktif tenant.
- Operasi idempoten: kelas `Utama` yang sudah ada tidak ditimpa dan tidak dibuat ulang.
- Bila `lecturers_data` pada penawaran kurikulum memiliki lebih dari satu dosen, hanya dosen pertama dipasang sebagai pengampu awal. Jadwal, ruang, dan dosen dapat dilengkapi dari halaman Jadwal & Kelas LMS.

## Peserta

- Kandidat peserta diambil langsung dari `POST /api/v2/website/users` pada ONE UNUSU dengan peran `MAHASISWA` dan API key antar-server.
- Tidak dilakukan enrollment massal otomatis. Administrator memilih mahasiswa untuk setiap kelas, lalu menyimpannya melalui endpoint peserta kelas.
- Sinkronisasi berikutnya mendaftarkan peserta terpilih ke LMS menurut NIM. Mahasiswa yang login melalui SSO dengan NIM sama akan melihat kelas yang telah diikutkan.
