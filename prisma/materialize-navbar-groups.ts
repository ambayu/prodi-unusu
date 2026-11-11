/**
 * Membekukan grup navbar bawaan menjadi baris nyata di tabel `menus`.
 *
 * Latar belakang
 * --------------
 * Selama database masih datar (semua menu `parentId = null`), `buildNavbarTree`
 * membentuk grup dropdown di memori memakai `NAVBAR_GROUP_DEFINITIONS`. Grup
 * seperti itu tidak punya id, sehingga:
 *
 *   - tidak bisa diganti namanya secara permanen,
 *   - tidak bisa dipakai sebagai tujuan "Pindahkan ke grup",
 *   - dan yang paling membingungkan, mengubah isinya di Page Builder belum
 *     tentu mengubah navbar pengunjung.
 *
 * Skrip ini menulis grup tersebut sebagai baris `menus` sungguhan (URL `#`),
 * lalu menautkan anggotanya lewat `parentId`. Setelah itu Builder dan navbar
 * publik membaca struktur yang sama persis dari database.
 *
 * Sifat operasi
 * -------------
 * Hanya menyisipkan baris grup dan mengubah `parentId`/`sortOrder` anggota.
 * Tidak ada DROP, TRUNCATE, atau penghapusan data. Prodi yang sudah punya grup
 * (sudah pernah diatur admin) dilewati sepenuhnya.
 *
 * Pemakaian
 * ---------
 *   npx tsx prisma/materialize-navbar-groups.ts            # pratinjau
 *   npx tsx prisma/materialize-navbar-groups.ts --apply    # tulis ke DB
 *   npx tsx prisma/materialize-navbar-groups.ts --apply --prodi sistem-informasi
 */
import { PrismaClient } from '@prisma/client';
import { NAVBAR_GROUP_DEFINITIONS, NAVBAR_LOOSE_URLS } from '../src/shared/constants/navbarGroups.js';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const prodiFilter = (() => {
  const i = process.argv.indexOf('--prodi');
  return i >= 0 ? process.argv[i + 1] : null;
})();

interface RencanaGrup {
  label: string;
  urls: string[];
}

/**
 * Menyusun rencana untuk satu prodi.
 *
 * Mengembalikan `null` bila prodi ini sudah punya grup nyata. Prodi seperti itu
 * sengaja tidak disentuh: strukturnya sudah hasil keputusan admin.
 */
function rencanaGrup(
  menus: Array<{ id: number; title: string; url: string; parentId: number | null }>,
): { grup: Array<RencanaGrup & { sebelumUrl: string }> } | { lewati: string } {
  const akar = menus.filter((m) => m.parentId === null);
  const sudahAdaGrup = menus.some((m) => m.parentId !== null);
  if (sudahAdaGrup) return { lewati: 'sudah memiliki grup di database' };

  const terpakai = new Set<number>();
  const grup: Array<RencanaGrup & { sebelumUrl: string }> = [];

  for (const definisi of NAVBAR_GROUP_DEFINITIONS) {
    const anggota = akar.filter((m) => !terpakai.has(m.id) && definisi.urls.includes(m.url));

    // Grup berisi satu item tidak perlu dropdown; biarkan sebagai tautan biasa
    // agar hasilnya sama dengan yang dilakukan buildNavbarTree.
    if (anggota.length < 2) continue;

    anggota.forEach((m) => terpakai.add(m.id));
    grup.push({
      label: definisi.label,
      urls: anggota.map((m) => m.url),
      sebelumUrl: anggota[0].url,
    });
  }

  // Sisa halaman (bukan Beranda/Kontak) dikumpulkan pada grup penampung agar
  // halaman kustom tetap terjangkau pengunjung.
  const sisa = akar.filter((m) => !terpakai.has(m.id) && !NAVBAR_LOOSE_URLS.includes(m.url));
  if (sisa.length >= 2) {
    grup.push({
      label: 'Halaman Lainnya',
      urls: sisa.map((m) => m.url),
      sebelumUrl: sisa[0].url,
    });
  }

  return { grup };
}

async function main() {
  const prodiList = await prisma.studyProgram.findMany({
    where: prodiFilter ? { slug: prodiFilter } : undefined,
    select: { id: true, name: true, slug: true },
    orderBy: { id: 'asc' },
  });

  if (prodiList.length === 0) {
    console.log('Tidak ada prodi yang cocok dengan filter.');
    return;
  }

  console.log(APPLY ? '=== MODE TULIS (--apply) ===\n' : '=== PRATINJAU (tidak menulis apa pun) ===\n');

  let totalGrup = 0;
  let totalAnggota = 0;
  let dilewati = 0;

  for (const prodi of prodiList) {
    const menus = await prisma.menu.findMany({
      where: { studyProgramId: prodi.id },
      select: { id: true, title: true, url: true, parentId: true, sortOrder: true },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });

    const hasil = rencanaGrup(menus);

    if ('lewati' in hasil) {
      dilewati += 1;
      console.log(`- ${prodi.slug}: dilewati (${hasil.lewati})`);
      continue;
    }

    if (hasil.grup.length === 0) {
      console.log(`- ${prodi.slug}: tidak ada grup yang perlu dibekukan`);
      continue;
    }

    console.log(`+ ${prodi.slug} (id=${prodi.id}) — ${hasil.grup.length} grup`);

    for (const grup of hasil.grup) {
      const anggota = grup.urls
        .map((url) => menus.find((m) => m.url === url))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));

      // Grup diletakkan tepat sebelum anggota pertamanya, sama seperti Builder.
      const patokan = menus.find((m) => m.url === grup.sebelumUrl);
      const sortGrup = patokan ? patokan.sortOrder : menus.length + 1;

      console.log(
        `    ${grup.label} (sebelum ${grup.sebelumUrl}) <- ${anggota.map((a) => a.title).join(', ')}`,
      );

      totalGrup += 1;
      totalAnggota += anggota.length;

      if (!APPLY) continue;

      await prisma.$transaction(async (tx) => {
        const grupBaru = await tx.menu.create({
          data: {
            studyProgramId: prodi.id,
            parentId: null,
            title: grup.label,
            url: '#',
            target: '_self',
            sortOrder: sortGrup,
            isRequired: false,
            isActive: true,
          },
          select: { id: true },
        });

        for (const [index, anggotaMenu] of anggota.entries()) {
          await tx.menu.update({
            where: { id: anggotaMenu.id },
            data: { parentId: grupBaru.id, sortOrder: index + 1 },
          });
        }
      });
    }
  }

  console.log('');
  if (APPLY) {
    console.log(`Selesai: ${totalGrup} grup dibuat, ${totalAnggota} tautan ditautkan, ${dilewati} prodi dilewati.`);
  } else {
    console.log(
      `Pratinjau: ${totalGrup} grup akan dibuat, ${totalAnggota} tautan akan ditautkan, ${dilewati} prodi dilewati.`,
    );
    console.log('Jalankan ulang dengan --apply untuk menyimpan.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
