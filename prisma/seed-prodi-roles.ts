/**
 * Seeder Idempotent untuk 14 Peran Admin Program Studi di UNUSU.
 *
 * Menambahkan peran spesifik untuk tiap-tiap program studi UNUSU:
 * - ADMIN_PRODI_TIF: Admin Prodi Teknik Informatika
 * - ADMIN_PRODI_IKO: Admin Prodi Ilmu Komputer
 * - ADMIN_PRODI_SIN: Admin Prodi Sistem Informasi
 * - ADMIN_PRODI_PGSD: Admin Prodi Pendidikan Guru Sekolah Dasar
 * - ADMIN_PRODI_MAN: Admin Prodi Manajemen
 * - ADMIN_PRODI_AGB: Admin Prodi Agribisnis
 * - ADMIN_PRODI_ITP: Admin Prodi Ilmu dan Teknologi Pangan
 * - ADMIN_PRODI_BDP: Admin Prodi Budidaya Pertanian
 * - ADMIN_PRODI_GIZ: Admin Prodi Ilmu Gizi
 * - ADMIN_PRODI_ANK: Admin Prodi D3 Analis Kesehatan
 * - ADMIN_PRODI_PIAUD: Admin Prodi Pendidikan Islam Anak Usia Dini
 * - ADMIN_PRODI_PAI: Admin Prodi Pendidikan Agama Islam
 * - ADMIN_PRODI_HKI: Admin Prodi Hukum Keluarga Islam
 * - ADMIN_PRODI_STI: Admin Prodi Studi Islam
 *
 * Serta memasangkan baseline permission Admin Prodi ke tiap-tiap peran tersebut.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../src/shared/constants/organization.js';
import { PERMISSIONS } from '../src/shared/constants/permissions.js';

const prisma = new PrismaClient();

export const PRODI_ROLES_CATALOG = [
  { code: 'ADMIN_PRODI_TIF', name: 'Admin Prodi Teknik Informatika', prodiCode: 'TIF', faculty: 'FIK' },
  { code: 'ADMIN_PRODI_IKO', name: 'Admin Prodi Ilmu Komputer', prodiCode: 'IKO', faculty: 'FIK' },
  { code: 'ADMIN_PRODI_SIN', name: 'Admin Prodi Sistem Informasi', prodiCode: 'SIN', faculty: 'FIK' },
  { code: 'ADMIN_PRODI_PGSD', name: 'Admin Prodi Pendidikan Guru Sekolah Dasar', prodiCode: 'PGSD', faculty: 'FIP' },
  { code: 'ADMIN_PRODI_MAN', name: 'Admin Prodi Manajemen', prodiCode: 'MAN', faculty: 'FE' },
  { code: 'ADMIN_PRODI_AGB', name: 'Admin Prodi Agribisnis', prodiCode: 'AGB', faculty: 'FAPERTA' },
  { code: 'ADMIN_PRODI_ITP', name: 'Admin Prodi Ilmu dan Teknologi Pangan', prodiCode: 'ITP', faculty: 'FAPERTA' },
  { code: 'ADMIN_PRODI_BDP', name: 'Admin Prodi Budidaya Pertanian', prodiCode: 'BDP', faculty: 'FAPERTA' },
  { code: 'ADMIN_PRODI_GIZ', name: 'Admin Prodi Ilmu Gizi', prodiCode: 'GIZ', faculty: 'FIKES' },
  { code: 'ADMIN_PRODI_ANK', name: 'Admin Prodi D3 Analis Kesehatan', prodiCode: 'ANK', faculty: 'FIKES' },
  { code: 'ADMIN_PRODI_PIAUD', name: 'Admin Prodi Pendidikan Islam Anak Usia Dini', prodiCode: 'PIAUD', faculty: 'FAI' },
  { code: 'ADMIN_PRODI_PAI', name: 'Admin Prodi Pendidikan Agama Islam', prodiCode: 'PAI', faculty: 'FAI' },
  { code: 'ADMIN_PRODI_HKI', name: 'Admin Prodi Hukum Keluarga Islam', prodiCode: 'HKI', faculty: 'FAI' },
  { code: 'ADMIN_PRODI_STI', name: 'Admin Prodi Studi Islam', prodiCode: 'STI', faculty: 'FAI' },
];

export async function seedProdiRoles() {
  console.log('Menyiapkan peran untuk 14 Admin Program Studi UNUSU...');

  // 1. Ambil seluruh permission dari database
  const allPermissions = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permissionIdByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  // Ambil baseline permission untuk Admin Prodi
  const baselineCodes = ROLE_PERMISSIONS['ADMIN_PRODI'] ?? [];

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of PRODI_ROLES_CATALOG) {
    const existing = await prisma.role.findUnique({ where: { code: item.code } });
    const description = `Pengelolaan penuh website, kurikulum, dosen, dokumen, dan konten ${item.name} (${item.faculty}).`;

    const role = await prisma.role.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        description,
      },
      update: {
        name: item.name,
        description,
      },
    });

    if (existing) {
      updatedCount++;
    } else {
      createdCount++;
    }

    // Pasangkan permissions baseline
    for (const code of baselineCodes) {
      const permId = permissionIdByCode.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          create: {
            roleId: role.id,
            permissionId: permId,
          },
          update: {},
        });
      }
    }
  }

  console.log(`Selesai: ${createdCount} peran prodi dibuat, ${updatedCount} peran diperbarui.`);
}

// Eksekusi jika dijalankan langsung via node/tsx
if (process.argv[1]?.includes('seed-prodi-roles')) {
  seedProdiRoles()
    .catch((err) => {
      console.error('Gagal menjalankan seeder peran prodi:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
