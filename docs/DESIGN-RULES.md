# Aturan Desain

Pedoman ini mengikat untuk seluruh halaman publik maupun portal administrasi.

## 1. Arah visual

Modern, minimalis, profesional, dan akademik. Yang dihindari secara eksplisit:

- Tampilan generik hasil AI, misalnya gradien ungu-biru berlebihan, kartu
  melayang tanpa alasan, dan ilustrasi dekoratif yang tidak membawa informasi.
- Efek neon dan glassmorphism berlebihan.
- Emoji sebagai pengganti ikon antarmuka.

## 2. Palet

| Token | Nilai | Pemakaian |
|---|---|---|
| Biru utama | `#1e3a8a` | Navbar, judul, tombol utama, tautan aktif |
| Biru gelap | `#172f6e` | Keadaan hover tombol utama |
| Kuning emas | `#fbbf24` | Top bar, aksen, penanda aktif, garis eyebrow |
| Kuning gelap | `#f59e0b` | Aksen sekunder |
| Latar terang | `#e8eefb` | Latar lembut, badge, kartu informasi |
| Netral | skala `slate` | Teks, garis, latar halaman |

Warna status tidak boleh menjadi satu-satunya pembeda. Setiap status selalu
disertai teks, misalnya "Terbit", "Draft", "Aktif".

## 3. Tipografi

- Font tunggal: **Plus Jakarta Sans**, bobot 400 sampai 800.
- Judul halaman: 800 dengan `tracking-tight`.
- Judul bagian: 700.
- Isi: 400 dengan `leading-relaxed`.
- Label formulir: 700 huruf kecil 11px, sering dengan `uppercase tracking-wide`.

## 4. Ikon

Hanya Heroicons. Ukuran baku: 4 (16px) untuk dalam tombol dan tabel, 5 untuk
aksi mandiri, 6 untuk kartu metrik. Tidak memakai Lucide agar tidak ada dua
keluarga ikon bercampur.

## 5. Portal administrasi

- Dashboard memakai layout dashboard khusus: kartu metrik ringkas, daftar
  aktivitas, dan status website. Bukan halaman generik dengan satu paragraf.
- Halaman selain dashboard memakai pola yang sama: judul dan deskripsi di atas,
  tombol aksi di kanan, lalu kartu atau tabel.
- Keadaan wajib tersedia di setiap halaman data: memuat, kosong, gagal.
- Aksi destruktif selalu memakai dialog konfirmasi. `alert()` dan `confirm()`
  bawaan browser dilarang.
- Formulir memakai label eksplisit, pesan bantuan di bawah field, dan validasi
  inline yang menampilkan pesan asli dari server.
- Tabel mendukung pencarian atau penyaringan bila isinya lebih dari sepuluh
  baris, dan tetap terbaca pada layar kecil dengan penggulungan horizontal.

## 6. Website program studi

- Setiap tenant memiliki tema sendiri di tabel `themes`: warna, font, radius,
  bayangan, gaya tombol, layout header dan footer, lebar konten.
- Tema diterapkan melalui token, bukan komponen berbeda per prodi.
- Navigasi berasal dari tabel `menus`, sehingga label dan urutannya dapat
  diubah tanpa menyentuh kode.
- Halaman publik memiliki kepala halaman yang konsisten: eyebrow beraksen,
  judul, dan deskripsi.
- Konten kosong ditampilkan sebagai keadaan kosong yang menjelaskan, bukan
  halaman rusak atau data contoh palsu.

## 7. Website utama universitas

- Memiliki navbar, footer, dan landing page sendiri.
- Tidak boleh memakai komponen khusus prodi.
- Perubahan pada website utama tidak boleh mengubah tampilan seluruh prodi.

## 8. Builder

- Setiap widget memiliki varian yang terdefinisi dan konfigurasi tervalidasi.
- Pratinjau wajib tersedia sebelum publikasi.
- Draft tidak boleh terlihat publik.
- Konfigurasi widget tidak boleh menyimpan markup atau script bebas.

## 9. Aksesibilitas

- Kontras teks memenuhi minimal WCAG AA.
- Seluruh kontrol dapat dijangkau dengan keyboard dan memiliki cincin fokus yang
  terlihat.
- Setiap gambar memiliki `alt` yang bermakna.
- Setiap input memiliki `label` yang terhubung.
- Struktur heading berurutan, tidak melompat tingkat.
- Gunakan elemen semantik: `nav`, `main`, `article`, `figure`, `button`.

## 10. Responsif

Seluruh halaman wajib layak pada desktop, laptop, tablet, dan ponsel.
Pendekatan: mulai dari tata letak satu kolom, tambahkan kolom pada breakpoint
yang lebih besar. Tidak ada konten yang hanya dapat diakses dengan tetikus.

## 11. Performa

- Gambar aset besar dimuat dengan `loading="lazy"` bila berada di bawah lipatan.
- Bundel dipecah per vendor agar halaman publik tidak mengunduh kode admin.
- Hindari animasi yang berjalan terus-menerus tanpa kaitan dengan interaksi.

## 12. Kualitas komponen

Komponen yang dapat dipakai ulang wajib dipakai ulang. Namun komponen dengan
kebutuhan desain dan perilaku berbeda tidak boleh dipaksa menjadi satu komponen
generik hanya demi menghindari duplikasi. Komponen dasar seperti tombol, input,
modal, toast, dan keadaan kosong boleh dipakai bersama kedua ekosistem.
