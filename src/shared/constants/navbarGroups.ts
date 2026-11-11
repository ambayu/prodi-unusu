/**
 * Grup navigasi bawaan untuk setiap program studi.
 *
 * Grup kini menjadi data nyata di tabel `menus` (lewat `parentId`), bukan lagi
 * daftar slug yang ditulis di komponen. Konstanta ini hanya dipakai untuk:
 *
 *   1. Menyemai struktur awal setiap prodi baru.
 *   2. Memberi label cadangan bila sebuah grup dibuat tanpa judul.
 *
 * Nama grup dapat diubah admin lewat Page Builder, dan perubahan itu langsung
 * berlaku pada navbar pengunjung karena keduanya membaca sumber yang sama.
 */

/** Satu grup dropdown beserta URL halaman yang menjadi anggotanya. */
export interface NavbarGroupDefinition {
  /** Kunci stabil untuk keperluan seed, bukan untuk ditampilkan. */
  key: string;
  /** Judul awal grup; admin boleh menggantinya kapan saja. */
  label: string;
  /** URL halaman yang masuk grup ini, sesuai nilai `menus.url`. */
  urls: string[];
}

/**
 * Definisi grup awal. Urutan array menentukan urutan grup di navbar.
 *
 * `Beranda` dan `Kontak` sengaja tidak masuk grup mana pun: Beranda tampil
 * sebagai tautan pertama, sedangkan Kontak diwakili tombol ajakan di sisi kanan
 * navbar agar tidak tampil dua kali.
 */
export const NAVBAR_GROUP_DEFINITIONS: NavbarGroupDefinition[] = [
  {
    key: 'tentang',
    label: 'Tentang Prodi',
    urls: ['/profil', '/visi-misi'],
  },
  {
    key: 'akademik',
    label: 'Akademik',
    urls: ['/kurikulum', '/dosen', '/sarana-prasarana', '/sarpras'],
  },
  {
    key: 'informasi',
    label: 'Informasi & Dokumen',
    urls: ['/berita', '/galeri', '/dokumen'],
  },
];

/**
 * Grup penampung. Anggotanya adalah halaman yang tidak termasuk grup mana pun
 * dan bukan Beranda/Kontak — termasuk halaman kustom buatan admin.
 */
export const NAVBAR_CATCHALL_LABEL = 'Halaman Lainnya';

/** URL yang tidak pernah dimasukkan ke grup. */
export const NAVBAR_LOOSE_URLS = ['/', '/kontak'];
