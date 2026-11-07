import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

/**
 * Instance Prisma tunggal.
 *
 * Pada development `tsx watch` memuat ulang modul; instance disimpan di
 * `globalThis` agar koneksi tidak menumpuk setiap reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProduction ? ['error'] : ['error', 'warn'],
  });

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}
