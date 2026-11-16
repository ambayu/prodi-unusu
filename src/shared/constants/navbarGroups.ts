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
 * Label grup untuk website fakultas.
 *
 * Fakultas bukan program studi, jadi judul grup ditulis dalam istilah fakultas.
 * Hanya grup "tentang" yang berbeda: grup Akademik dan Informasi memakai istilah
 * yang sama untuk kedua jenis tenant. Grup yang isinya satu item tidak pernah
 * menjadi dropdown, sehingga label pada `NAVBAR_GROUP_DEFINITIONS` tetap dipakai
 * apa adanya untuk kasus itu.
 */
const FACULTY_GROUP_LABELS: Record<string, string> = {
  tentang: 'Tentang Fakultas',
};

/**
 * Definisi grup yang sudah disesuaikan dengan jenis tenant.
 *
 * Dipakai oleh navbar pengunjung maupun Page Builder, sehingga admin fakultas
 * melihat nama grup yang sama dengan yang tampil di website.
 */
export function navbarGroupDefinitions(tenantType?: 'prodi' | 'fakultas'): NavbarGroupDefinition[] {
  if (tenantType !== 'fakultas') return NAVBAR_GROUP_DEFINITIONS;

  return NAVBAR_GROUP_DEFINITIONS.map((definisi) => ({
    ...definisi,
    label: FACULTY_GROUP_LABELS[definisi.key] ?? definisi.label,
  }));
}

/**
 * Grup penampung. Anggotanya adalah halaman yang tidak termasuk grup mana pun
 * dan bukan Beranda/Kontak — termasuk halaman kustom buatan admin.
 */
export const NAVBAR_CATCHALL_LABEL = 'Halaman Lainnya';

/** URL yang tidak pernah dimasukkan ke grup. */
export const NAVBAR_LOOSE_URLS = ['/', '/kontak'];
