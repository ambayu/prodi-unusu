import {
  NAVBAR_CATCHALL_LABEL,
  NAVBAR_GROUP_DEFINITIONS,
  NAVBAR_LOOSE_URLS,
} from '../constants/navbarGroups.js';

/**
 * Menu navigasi apa adanya dari API.
 *
 * `children` terisi bila baris menu punya `parentId` yang menunjuk ke menu lain.
 * Bentuk ini sengaja tidak bergantung pada tipe Prisma agar dapat dipakai
 * bersama oleh server dan klien.
 */
export interface NavbarMenuRow {
  id: number;
  title: string;
  url: string;
  sortOrder: number;
  parentId?: number | null;
  isActive?: boolean;
  isRequired?: boolean;
  children?: NavbarMenuRow[];
}

export interface NavbarNode {
  id: number;
  label: string;
  path: string;
  sortOrder: number;
  /** Terisi hanya untuk grup dropdown. */
  children?: NavbarNode[];
  /** Penanda bahwa node ini wadah grup, bukan tautan biasa. */
  isGroup?: boolean;
}

/**
 * Meratakan menu menjadi satu daftar berurutan.
 *
 * Godaan yang perlu dihindari: mengurutkan hanya root lalu anak-anaknya.
 * Karena `sortOrder` berlaku per kelompok, dua anak dari grup berbeda dapat
 * memiliki nomor yang sama. Perataan di sini memakai urutan induk lebih dahulu,
 * lalu urutan anak di dalam induknya, sehingga hasilnya selalu deterministik.
 */
export function flattenMenus(menus: NavbarMenuRow[]): NavbarMenuRow[] {
  const hasil: NavbarMenuRow[] = [];

  const akar = [...menus]
    .filter((menu) => menu.parentId == null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  for (const induk of akar) {
    hasil.push(induk);
    const anak = [...(induk.children ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
    );
    hasil.push(...anak);
  }

  return hasil;
}

/** Memeriksa apakah menu adalah wadah grup (tidak menunjuk halaman nyata). */
export function isGroupMenu(menu: NavbarMenuRow): boolean {
  const punyaAnak = (menu.children?.length ?? 0) > 0;
  if (punyaAnak) return true;
  // Grup tanpa anak tetap dikenali dari URL kosong atau "#".
  return menu.url === '' || menu.url === '#';
}

/**
 * Menyusun struktur navbar final.
 *
 * Aturan, berurutan:
 *   1. Menu yang sudah punya anak di database dipakai apa adanya. Ini jalur
 *      utama setelah admin mengatur grup lewat Page Builder.
 *   2. Bila database masih datar (belum ada `parentId`), menu dikelompokkan
 *      memakai definisi bawaan supaya navbar tidak berubah menjadi daftar
 *      panjang tanpa dropdown.
 *   3. Halaman yang tidak masuk grup mana pun dikumpulkan pada satu dropdown
 *      penampung, agar halaman kustom tetap dapat dijangkau pengunjung.
 */
export function buildNavbarTree(menus: NavbarMenuRow[]): NavbarNode[] {
  const aktif = (menus ?? []).filter((menu) => menu.isActive !== false);
  if (aktif.length === 0) return [];

  const akar = aktif
    .filter((menu) => menu.parentId == null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const punyaGrupDb = akar.some((menu) => (menu.children?.length ?? 0) > 0);

  const keNode = (menu: NavbarMenuRow): NavbarNode => ({
    id: menu.id,
    label: menu.title,
    path: menu.url,
    sortOrder: menu.sortOrder,
  });

  if (punyaGrupDb) {
    const hasil: NavbarNode[] = [];

    for (const menu of akar) {
      const anak = [...(menu.children ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
      );

      if (anak.length > 0) {
        hasil.push({ ...keNode(menu), isGroup: true, children: anak.map(keNode) });
        continue;
      }

      // Grup yang seluruh anggotanya dinonaktifkan dibiarkan sebagai wadah
      // kosong agar admin tetap melihatnya di Builder, tetapi tidak dikirim ke
      // navbar: URL-nya "#" sehingga akan menjadi tautan mati bagi pengunjung.
      if (isGroupMenu(menu) && (menu.children?.length ?? 0) === 0) continue;

      hasil.push(keNode(menu));
    }

    return hasil;
  }

  /* ---------- Jalur cadangan: database masih datar ---------- */

  const semua = [...akar];
  const terpakai = new Set<number>();
  const hasil: NavbarNode[] = [];

  // Beranda selalu paling depan agar pola navigasi tetap dikenal pengunjung.
  const beranda = semua.find((menu) => menu.url === '/');
  if (beranda) {
    hasil.push(keNode(beranda));
    terpakai.add(beranda.id);
  }

  for (const definisi of NAVBAR_GROUP_DEFINITIONS) {
    const anggota = semua.filter(
      (menu) => !terpakai.has(menu.id) && definisi.urls.includes(menu.url),
    );
    if (anggota.length === 0) continue;

    anggota.forEach((menu) => terpakai.add(menu.id));

    // Grup berisi satu item tidak perlu dropdown; tampil sebagai tautan biasa.
    if (anggota.length === 1) {
      hasil.push(keNode(anggota[0]));
      continue;
    }

    hasil.push({
      id: -anggota[0].id,
      label: definisi.label,
      path: anggota[0].url,
      sortOrder: anggota[0].sortOrder,
      isGroup: true,
      children: anggota.map(keNode),
    });
  }

  // Kontak diwakili tombol ajakan di sisi kanan navbar, jadi tidak diulang.
  const sisa = semua.filter(
    (menu) => !terpakai.has(menu.id) && !NAVBAR_LOOSE_URLS.includes(menu.url),
  );

  if (sisa.length === 1) {
    hasil.push(keNode(sisa[0]));
  } else if (sisa.length > 1) {
    hasil.push({
      id: -100000 - sisa[0].id,
      label: NAVBAR_CATCHALL_LABEL,
      path: sisa[0].url,
      sortOrder: sisa[0].sortOrder,
      isGroup: true,
      children: sisa.map(keNode),
    });
  }

  void NAVBAR_LOOSE_URLS;
  return hasil;
}

/**
 * Halaman yang terbit tetapi belum punya entri di tabel `menus`.
 *
 * Halaman seperti ini dapat diedit di Page Builder namun tidak pernah muncul di
 * navbar, karena navbar dibaca dari `menus`. Builder memakai fungsi ini untuk
 * menampilkan peringatan sekaligus tombol "Tambahkan ke menu".
 */
export function findOrphanPages(
  pages: Array<{ slug: string; title: string; isPublished?: boolean }>,
  menus: NavbarMenuRow[],
): Array<{ slug: string; title: string }> {
  const urlMenu = new Set<string>();
  for (const menu of flattenMenus(menus)) {
    if (menu.url) urlMenu.add(menu.url);
  }

  return pages
    .filter((page) => {
      const url = page.slug === 'beranda' ? '/' : `/${page.slug}`;
      return !urlMenu.has(url);
    })
    .map((page) => ({ slug: page.slug, title: page.title }));
}

/** Menyamakan bentuk URL halaman dengan URL menu. */
export function pageUrl(slug: string): string {
  return slug === 'beranda' ? '/' : `/${slug}`;
}
