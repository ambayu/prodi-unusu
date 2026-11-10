/**
 * Seeder data awal UNUSU Multi-Prodi.
 *
 * Prinsip (docs/seeder/SEEDER-STRATEGY.md):
 *   - Idempotent: seluruh penulisan memakai upsert dengan kunci stabil.
 *   - Tidak pernah `deleteMany()` terhadap data operasional.
 *   - Melaporkan created / updated / skipped tanpa mencetak secret.
 *   - Berhenti dengan pesan jelas bila data master konflik.
 *
 * Jalankan: npx prisma db seed   atau   npm run db:seed
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  ADMIN_MENUS,
  FACULTIES,
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  STANDARD_PUBLIC_MENUS,
  WIDGETS,
} from '../src/shared/constants/organization.js';
import { PERMISSIONS, ROLES } from '../src/shared/constants/permissions.js';
import { seedProdiContents } from './seed-prodi-content.js';
import { seedPageBuilderAndThemes } from './seed-page-builder.js';
import { seedProdiRoles } from './seed-prodi-roles.js';

const prisma = new PrismaClient();

const counts = {
  created: 0,
  updated: 0,
  skipped: 0,
};

function report(kind: keyof typeof counts, label: string) {
  counts[kind] += 1;
  if (process.env.SEED_VERBOSE === '1') {
    const mark = kind === 'created' ? '+' : kind === 'updated' ? '~' : '.';
    console.log(`  ${mark} ${label}`);
  }
}

async function seedPermissions() {
  console.log('1. Katalog permission');
  for (const permission of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { code: permission.code } });
    await prisma.permission.upsert({
      where: { code: permission.code },
      create: permission,
      update: { name: permission.name, module: permission.module },
    });
    report(existing ? 'updated' : 'created', permission.code);
  }
}

async function seedRoles() {
  console.log('2. Peran sistem dan baseline permission');

  const roleDefinitions = [
    { code: ROLES.SUPER_ADMIN, name: 'Super Admin', description: 'Akses penuh seluruh tenant dan konfigurasi global.' },
    { code: ROLES.ADMIN_FAKULTAS, name: 'Admin Fakultas', description: 'Pemantauan dan pelaporan terbatas pada fakultas yang ditugaskan.' },
    { code: ROLES.ADMIN_PRODI, name: 'Admin Prodi', description: 'Pengelolaan penuh website dan konten program studi yang ditugaskan.' },
    { code: ROLES.EDITOR, name: 'Editor', description: 'Hak akses berasal dari permission group yang diberikan Admin Prodi.' },
  ];

  const allPermissions = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permissionIdByCode = new Map(allPermissions.map((permission) => [permission.code, permission.id]));

  for (const definition of roleDefinitions) {
    const existing = await prisma.role.findUnique({ where: { code: definition.code } });
    const role = await prisma.role.upsert({
      where: { code: definition.code },
      create: definition,
      update: { name: definition.name, description: definition.description },
    });
    report(existing ? 'updated' : 'created', `role ${definition.code}`);

    const codes = ROLE_PERMISSIONS[definition.code] ?? [];
    const targetCodes = codes.includes('*') ? PERMISSIONS.map((permission) => permission.code) : codes;

    for (const code of targetCodes) {
      const permissionId = permissionIdByCode.get(code);
      if (!permissionId) {
        console.warn(`  ! Permission ${code} belum ada, dilewati untuk role ${definition.code}.`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        create: { roleId: role.id, permissionId },
        update: {},
      });
    }
  }
}

async function seedPermissionGroups() {
  console.log('3. Permission group untuk Editor');

  for (const group of PERMISSION_GROUPS) {
    const existing = await prisma.permissionGroup.findUnique({ where: { code: group.code } });
    const created = await prisma.permissionGroup.upsert({
      where: { code: group.code },
      create: { code: group.code, name: group.name, isSystem: true },
      update: { name: group.name, isSystem: true },
    });
    report(existing ? 'updated' : 'created', `group ${group.code}`);

    const permissions = await prisma.permission.findMany({
      where: { code: { in: group.permissions } },
      select: { id: true },
    });

    for (const permission of permissions) {
      await prisma.permissionGroupItem.upsert({
        where: {
          permissionGroupId_permissionId: {
            permissionGroupId: created.id,
            permissionId: permission.id,
          },
        },
        create: { permissionGroupId: created.id, permissionId: permission.id },
        update: {},
      });
    }
  }
}

async function seedAdminMenus() {
  console.log('4. Menu admin dinamis');

  for (const menu of ADMIN_MENUS) {
    const existing = await prisma.adminMenu.findUnique({ where: { menuKey: menu.menuKey } });
    await prisma.adminMenu.upsert({
      where: { menuKey: menu.menuKey },
      create: {
        menuKey: menu.menuKey,
        label: menu.label,
        route: menu.route,
        icon: menu.icon,
        parentKey: menu.parentKey ?? null,
        sortOrder: menu.sortOrder,
        requiredPermission: menu.requiredPermission,
        scopeType: menu.scopeType,
        isActive: true,
      },
      update: {
        label: menu.label,
        route: menu.route,
        icon: menu.icon,
        parentKey: menu.parentKey ?? null,
        sortOrder: menu.sortOrder,
        requiredPermission: menu.requiredPermission,
        scopeType: menu.scopeType,
      },
    });
    report(existing ? 'updated' : 'created', `menu ${menu.menuKey}`);
  }
}

async function seedWidgets() {
  console.log('5. Widget registry dan varian');

  for (const widget of WIDGETS) {
    const existing = await prisma.widget.findUnique({ where: { code: widget.code } });
    const created = await prisma.widget.upsert({
      where: { code: widget.code },
      create: {
        code: widget.code,
        name: widget.name,
        category: widget.category,
        description: widget.description,
        defaultJson: JSON.stringify(widget.defaultConfig),
        isActive: true,
      },
      update: {
        name: widget.name,
        category: widget.category,
        description: widget.description,
        defaultJson: JSON.stringify(widget.defaultConfig),
      },
    });
    report(existing ? 'updated' : 'created', `widget ${widget.code}`);

    for (const [index, variant] of widget.variants.entries()) {
      const variantExisting = await prisma.widgetVariant.findUnique({
        where: { widgetId_code: { widgetId: created.id, code: variant.code } },
      });
      await prisma.widgetVariant.upsert({
        where: { widgetId_code: { widgetId: created.id, code: variant.code } },
        create: {
          widgetId: created.id,
          code: variant.code,
          name: variant.name,
          sortOrder: index + 1,
          isActive: true,
        },
        update: { name: variant.name, sortOrder: index + 1 },
      });
      report(variantExisting ? 'updated' : 'created', `variant ${widget.code}.${variant.code}`);
    }
  }
}

async function seedOrganization() {
  console.log('6. Fakultas dan program studi');

  let programCount = 0;

  for (const facultySeed of FACULTIES) {
    const existing = await prisma.faculty.findUnique({ where: { code: facultySeed.code } });
    const faculty = await prisma.faculty.upsert({
      where: { code: facultySeed.code },
      create: {
        code: facultySeed.code,
        name: facultySeed.name,
        slug: facultySeed.slug,
        sortOrder: facultySeed.sortOrder,
        isActive: true,
      },
      update: { name: facultySeed.name, slug: facultySeed.slug, sortOrder: facultySeed.sortOrder },
    });
    report(existing ? 'updated' : 'created', `faculty ${facultySeed.code}`);

    for (const programSeed of facultySeed.studyPrograms) {
      programCount += 1;
      const programExisting = await prisma.studyProgram.findUnique({ where: { code: programSeed.code } });
      const program = await prisma.studyProgram.upsert({
        where: { code: programSeed.code },
        create: {
          facultyId: faculty.id,
          code: programSeed.code,
          name: programSeed.name,
          slug: programSeed.slug,
          degree: programSeed.degree,
          status: 'active',
          sortOrder: programSeed.sortOrder,
        },
        update: {
          facultyId: faculty.id,
          name: programSeed.name,
          slug: programSeed.slug,
          degree: programSeed.degree,
          sortOrder: programSeed.sortOrder,
        },
      });
      report(programExisting ? 'updated' : 'created', `study program ${programSeed.code}`);

      const domainExisting = await prisma.domain.findUnique({ where: { hostname: programSeed.hostname } });
      if (domainExisting && domainExisting.studyProgramId !== program.id) {
        throw new Error(
          `Konflik domain: ${programSeed.hostname} sudah terdaftar untuk program studi lain (id ${domainExisting.studyProgramId}). ` +
            'Perbaiki data master sebelum menjalankan seeder lagi.',
        );
      }

      await prisma.domain.upsert({
        where: { hostname: programSeed.hostname },
        create: {
          studyProgramId: program.id,
          hostname: programSeed.hostname,
          isPrimary: true,
          isActive: true,
        },
        update: { studyProgramId: program.id, isActive: true },
      });
      report(domainExisting ? 'updated' : 'created', `domain ${programSeed.hostname}`);

      const settingExisting = await prisma.websiteSetting.findUnique({ where: { studyProgramId: program.id } });
      await prisma.websiteSetting.upsert({
        where: { studyProgramId: program.id },
        create: {
          studyProgramId: program.id,
          siteTitle: `Program Studi ${program.name}`,
          siteTagline: `Program Studi ${program.name} ${faculty.name}`,
          facultyName: faculty.name,
        },
        update: { facultyName: faculty.name },
      });
      report(settingExisting ? 'updated' : 'created', `website setting ${programSeed.code}`);

      const themeExisting = await prisma.theme.findUnique({ where: { studyProgramId: program.id } });
      await prisma.theme.upsert({
        where: { studyProgramId: program.id },
        create: { studyProgramId: program.id },
        update: {},
      });
      report(themeExisting ? 'updated' : 'created', `theme ${programSeed.code}`);

      for (const [index, menu] of STANDARD_PUBLIC_MENUS.entries()) {
        const menuExisting = await prisma.menu.findFirst({
          where: { studyProgramId: program.id, url: menu.url },
        });
        if (menuExisting) {
          await prisma.menu.update({
            where: { id: menuExisting.id },
            data: { title: menu.title, sortOrder: index + 1, isRequired: menu.isRequired },
          });
          report('updated', `menu ${programSeed.code} ${menu.url}`);
        } else {
          await prisma.menu.create({
            data: {
              studyProgramId: program.id,
              title: menu.title,
              url: menu.url,
              sortOrder: index + 1,
              isRequired: menu.isRequired,
              isActive: true,
            },
          });
          report('created', `menu ${programSeed.code} ${menu.url}`);
        }
      }

      const pageExisting = await prisma.page.findFirst({
        where: { studyProgramId: program.id, slug: 'beranda' },
      });
      if (!pageExisting) {
        await prisma.page.create({
          data: {
            studyProgramId: program.id,
            slug: 'beranda',
            title: 'Beranda',
            isSystem: true,
            isPublished: false,
          },
        });
        report('created', `page beranda ${programSeed.code}`);
      } else {
        report('skipped', `page beranda ${programSeed.code}`);
      }
    }
  }

  console.log(`   Total program studi diproses: ${programCount}`);
}

async function seedSuperAdmin() {
  console.log('7. Akun bootstrap Super Admin');

  const email = process.env.SEED_SUPERADMIN_EMAIL || 'admin@unusu.ac.id';
  const username = process.env.SEED_SUPERADMIN_USERNAME || 'admin';
  const password = process.env.SEED_SUPERADMIN_PASSWORD;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    console.log(`   Akun ${username} sudah ada. Kata sandi tidak diubah (sesuai strategi seeder).`);
    report('skipped', `super admin ${username}`);

    const superAdminRole = await prisma.role.findUnique({ where: { code: ROLES.SUPER_ADMIN } });
    if (superAdminRole) {
      const assignment = await prisma.userRole.findFirst({
        where: { userId: existing.id, roleId: superAdminRole.id },
      });
      if (!assignment) {
        await prisma.userRole.create({
          data: { userId: existing.id, roleId: superAdminRole.id, scopeType: 'global' },
        });
        report('created', `assignment super admin ${username}`);
      }
    }
    return;
  }

  if (!password) {
    console.log(
      '   SEED_SUPERADMIN_PASSWORD belum diisi. Akun Super Admin tidak dibuat.\n' +
        '   Isi variabel itu di .env lalu jalankan seeder lagi untuk bootstrap akun pertama.',
    );
    report('skipped', 'super admin bootstrap');
    return;
  }

  if (password.length < 12) {
    throw new Error('SEED_SUPERADMIN_PASSWORD minimal 12 karakter demi keamanan akun administrator.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: 'Administrator Universitas',
      email,
      username,
      passwordHash,
      isActive: true,
    },
  });
  report('created', `super admin ${username}`);

  const superAdminRole = await prisma.role.findUnique({ where: { code: ROLES.SUPER_ADMIN } });
  if (!superAdminRole) {
    throw new Error('Peran SUPER_ADMIN tidak ditemukan setelah seeding peran. Periksa urutan seeder.');
  }

  await prisma.userRole.create({
    data: { userId: user.id, roleId: superAdminRole.id, scopeType: 'global' },
  });
  report('created', `assignment super admin ${username}`);

  console.log(`   Akun Super Admin dibuat: ${username} <${email}>. Ganti kata sandi setelah login pertama.`);
}

async function seedSystemSettings() {
  console.log('8. System settings');

  const settings = [
    { key: 'site.name', value: 'UNUSU Multi-Prodi Website Platform', group: 'general' },
    { key: 'site.university', value: 'Universitas Nahdlatul Ulama Sumatera Utara', group: 'general' },
    { key: 'admin.host', value: process.env.ADMIN_HOST || 'prodi.unusu.ac.id', group: 'domain' },
    { key: 'main.hosts', value: process.env.MAIN_SITE_HOSTS || 'unusu.ac.id,www.unusu.ac.id', group: 'domain' },
    { key: 'upload.max_bytes', value: process.env.UPLOAD_MAX_BYTES || '10485760', group: 'upload' },
  ];

  for (const setting of settings) {
    const existing = await prisma.systemSetting.findUnique({ where: { key: setting.key } });
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value, group: setting.group },
    });
    report(existing ? 'updated' : 'created', `setting ${setting.key}`);
  }
}

async function main() {
  const startedAt = Date.now();
  console.log('=== Seeder UNUSU Multi-Prodi ===');
  console.log(`Database: ${(process.env.DATABASE_URL || '').replace(/\/\/[^@]*@/, '//***@').split('?')[0]}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  await seedPermissions();
  await seedRoles();
  await seedPermissionGroups();
  await seedAdminMenus();
  await seedWidgets();
  await seedOrganization();
  await seedSuperAdmin();
  await seedSystemSettings();

  console.log('9. Peran khusus 14 program studi');
  await seedProdiRoles();

  console.log('10. Konten profil, visi misi, kontak, & dosen 14 prodi');
  await seedProdiContents();

  console.log('11. Tema visual, halaman beranda, & page builder 14 prodi');
  await seedPageBuilderAndThemes();

  const durationMs = Date.now() - startedAt;
  console.log('');
  console.log('=== Ringkasan ===');
  console.log(`Created: ${counts.created}`);
  console.log(`Updated: ${counts.updated}`);
  console.log(`Skipped: ${counts.skipped}`);
  console.log(`Durasi : ${durationMs} ms`);
  console.log('');
  console.log('Seeder selesai. Tidak ada data operasional yang dihapus.');
}

main()
  .catch((error) => {
    console.error('');
    console.error('=== Seeder gagal ===');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
