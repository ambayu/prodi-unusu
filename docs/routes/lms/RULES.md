# Aturan Modul LMS

## Sumber data

- Portal Prodi adalah sumber tunggal kelas, jadwal, dosen pengampu, dan daftar peserta.
- LMS menerima hasil sinkronisasi dari Portal Prodi; mata kuliah referensi di LMS dibuat atau diperbarui oleh endpoint sinkron.

## Pembuatan kelas

- Kelas dibuat hanya saat ada penawaran nyata yang akan dijalankan. Administrator mengatur jadwal, ruang, dosen pengampu, peserta, dan rombel pada halaman Jadwal & Kelas LMS.
- Kelas paralel untuk mata kuliah yang sama disebut **rombel**. Tombol penambahannya menggunakan label "Tambah Rombel", bukan "Tambah Kelas".
- Antarmuka tidak menyediakan generate seluruh kurikulum atau sinkronisasi massal; keduanya dapat membuat kelas kosong dan memindahkan detail teknis ke administrator.

## Peserta

- Kandidat peserta diambil langsung dari `POST /api/v2/website/users` pada ONE UNUSU dengan peran `MAHASISWA` dan API key antar-server.
- Tidak dilakukan enrollment massal otomatis. Administrator memilih mahasiswa untuk setiap kelas, lalu menyimpannya melalui endpoint peserta kelas.
- Sinkronisasi berikutnya mendaftarkan peserta terpilih ke LMS menurut NIM. Mahasiswa yang login melalui SSO dengan NIM sama akan melihat kelas yang telah diikutkan.
