/**
 * Perbaikan data sekali jalan: format kolom `visions_missions.missions`.
 *
 * Latar belakang
 * --------------
 * Seeder lama (`seed-prodi-content.ts`) menyimpan misi sebagai JSON array:
 *
 *     ["Menyelenggarakan pendidikan...","Melaksanakan penelitian..."]
 *
 * Padahal halaman admin Visi & Misi dan widget beranda membaca kolom ini
 * dengan pemisah newline (satu butir per baris). Akibatnya seluruh misi tampil
 * sebagai satu butir berisi teks JSON mentah.
 *
 * Skrip ini mengubah baris yang isinya JSON array menjadi teks satu butir per
 * baris. Baris yang sudah berformat baru dilewati, sehingga skrip aman
 * dijalankan berulang.
 *
 * Cara pakai
 * ----------
 *     npx tsx prisma/fix-missions-format.ts           # pratinjau (dry run)
 *     npx tsx prisma/fix-missions-format.ts --apply    # tulis perubahan
 *
 * Tanpa argumen `--apply`, skrip hanya menampilkan rencana perubahan tanpa
 * menyentuh database.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

/**
 * Mengubah isi kolom misi menjadi format satu butir per baris.
 *
 * Mengembalikan `null` bila isi kolom tidak dapat diurai sebagai JSON array,
 * sehingga nilai asli dibiarkan apa adanya (mis. sudah berformat newline atau
 * diisi manual oleh admin).
 */
function normalizeMissions(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return null;

    const items = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    return items.length > 0 ? items.join('\n') : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? 'TERAPKAN PERUBAHAN' : 'pratinjau saja (tambahkan --apply untuk menulis)'}`);

  const rows = await prisma.visionMission.findMany({
    select: {
      id: true,
      studyProgramId: true,
      missions: true,
      studyProgram: { select: { code: true, name: true } },
    },
    orderBy: { studyProgramId: 'asc' },
  });

  let changed = 0;
  let skipped = 0;

  for (const row of rows) {
    const raw = row.missions ?? '';
    const normalized = normalizeMissions(raw);

    if (normalized === null) {
      skipped += 1;
      console.log(`- ${row.studyProgram.code.padEnd(10)} dilewati (bukan JSON array)`);
      continue;
    }

    changed += 1;
    const count = normalized.split('\n').length;
    console.log(`- ${row.studyProgram.code.padEnd(10)} ${count} butir misi akan dirapikan`);

    if (APPLY) {
      await prisma.visionMission.update({
        where: { id: row.id },
        data: { missions: normalized },
      });
    }
  }

  console.log(
    `\nRingkasan: ${changed} baris ${APPLY ? 'diperbarui' : 'perlu diperbarui'}, ${skipped} dilewati.`,
  );

  if (!APPLY && changed > 0) {
    console.log('Jalankan ulang dengan --apply untuk menulis perubahan ke database.');
  }
}

main()
  .catch((error) => {
    console.error('Gagal merapikan format misi:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
