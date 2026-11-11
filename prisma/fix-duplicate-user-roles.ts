/**
 * Membersihkan baris `user_roles` yang terduplikasi.
 *
 * Latar belakang
 * --------------
 * MariaDB memperlakukan `NULL` sebagai nilai yang tidak sama dengan `NULL`.
 * Akibatnya unique index `user_role_scope_unique` tetap MELOLOSKAN dua baris
 * yang sama persis bila salah satu kolom pembandingnya (mis. `faculty_id`)
 * bernilai NULL. Sebelum validasi peran memakai pengecekan keberadaan, akun
 * bisa menerima peran ganda — terlihat di UI sebagai "Admin Prodi" dua kali.
 *
 * Aturan pembersihan
 * ------------------
 *   - Baris dikelompokkan dengan kunci yang menyamakan NULL sebagai satu nilai.
 *   - Di setiap kelompok hanya baris ber-id TERKECIL yang dipertahankan.
 *   - Tidak ada peran baru yang dibuat dan tidak ada peran sah yang dihapus.
 *
 * Pemakaian
 * ---------
 *   npx tsx prisma/fix-duplicate-user-roles.ts           # lihat saja (dry run)
 *   npx tsx prisma/fix-duplicate-user-roles.ts --apply   # benar-benar hapus
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

interface BarisPeran {
  id: number;
  userId: number;
  roleId: number;
  scopeType: string;
  studyProgramId: number | null;
  facultyId: number | null;
  roleScopeGroupId: number | null;
}

/**
 * Kunci pembanding yang memperlakukan `null` sebagai nilai biasa.
 *
 * Inilah inti perbaikannya: dua baris dengan seluruh kolom sama, termasuk yang
 * bernilai NULL, akan menghasilkan kunci yang sama dan dikenali sebagai duplikat.
 */
function kunciUnik(baris: BarisPeran): string {
  return [
    baris.userId,
    baris.roleId,
    baris.scopeType,
    baris.studyProgramId ?? 'null',
    baris.facultyId ?? 'null',
    baris.roleScopeGroupId ?? 'null',
  ].join('|');
}

async function main() {
  const semua = (await prisma.userRole.findMany({
    orderBy: { id: 'asc' },
  })) as unknown as BarisPeran[];

  const kelompok = new Map<string, BarisPeran[]>();
  for (const baris of semua) {
    const kunci = kunciUnik(baris);
    const daftar = kelompok.get(kunci) ?? [];
    daftar.push(baris);
    kelompok.set(kunci, daftar);
  }

  const akanDihapus: number[] = [];

  console.log(`Total baris user_roles: ${semua.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY (menghapus)' : 'DRY RUN (tidak mengubah data)'}\n`);

  for (const daftar of kelompok.values()) {
    if (daftar.length <= 1) continue;

    const simpan = daftar[0];
    const buang = daftar.slice(1);
    akanDihapus.push(...buang.map((baris) => baris.id));

    const user = await prisma.user.findUnique({
      where: { id: simpan.userId },
      select: { username: true, name: true },
    });
    const role = await prisma.role.findUnique({
      where: { id: simpan.roleId },
      select: { name: true },
    });
    const prodi = simpan.studyProgramId
      ? await prisma.studyProgram.findUnique({
          where: { id: simpan.studyProgramId },
          select: { code: true },
        })
      : null;

    console.log(
      `Akun "${user?.username ?? simpan.userId}" — peran "${role?.name ?? simpan.roleId}" ` +
        `(${simpan.scopeType}, prodi ${prodi?.code ?? '-'})`,
    );
    console.log(`  dipertahankan : id=${simpan.id}`);
    console.log(`  dihapus       : id=${buang.map((baris) => baris.id).join(', ')}`);
  }

  if (akanDihapus.length === 0) {
    console.log('Tidak ada duplikat. Tidak ada yang perlu diperbaiki.');
    return;
  }

  console.log(`\nTotal baris duplikat: ${akanDihapus.length}`);

  if (!APPLY) {
    console.log('\nJalankan ulang dengan --apply untuk menghapus baris di atas.');
    return;
  }

  const hasil = await prisma.userRole.deleteMany({ where: { id: { in: akanDihapus } } });
  console.log(`\nSelesai. ${hasil.count} baris duplikat dihapus.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
