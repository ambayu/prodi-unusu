# Aturan Modul LMS

## Sumber data

- Portal Prodi adalah sumber tunggal kelas, jadwal, dosen pengampu, dan daftar peserta.
- LMS menerima hasil sinkronisasi dari Portal Prodi; mata kuliah referensi di LMS dibuat atau diperbarui oleh endpoint sinkron.

## Perkuliahan

- Sumber kelas adalah penawaran `curriculum_items` pada kurikulum aktif. Penawaran dikelompokkan menurut `semester_number` 1 sampai 8, bukan Master Semester Akademik.
- Setiap penawaran hanya memiliki satu kelas operasional bernama `Utama`. Administrator mengatur dosen, hari, jam, ruang, dan peserta melalui aksi **Atur Perkuliahan**.
- Halaman Perkuliahan mengelompokkan mata kuliah berdasarkan dosen pengampu. Mata kuliah tanpa dosen berada dalam kelompok **Dosen belum ditetapkan**.
- Penyimpanan memakai upsert kelas `Utama` lalu langsung menyinkronkan kelas tersebut ke LMS. LMS memastikan 16 pertemuan tersedia secara idempoten.
- Antarmuka tidak menyediakan rombel, hapus kelas, buka kelas baru, generate seluruh kurikulum, atau sinkronisasi manual.

## Peserta

- Kandidat peserta diambil langsung dari `POST /api/v2/website/users` pada ONE UNUSU dengan peran `MAHASISWA` dan API key antar-server.
- Tidak dilakukan enrollment massal otomatis. Administrator memilih mahasiswa dari daftar ONE UNUSU untuk setiap kelas, lalu menyimpannya melalui endpoint peserta kelas.
- Sinkronisasi berikutnya mendaftarkan peserta terpilih ke LMS menurut NIM. Mahasiswa yang login melalui SSO dengan NIM sama akan melihat kelas yang telah diikutkan.
