import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

/**
 * Instance Prisma tunggal.
 *
 * Pada development `tsx watch` memuat ulang modul; instance disimpan di
 * `globalThis` agar koneksi tidak menumpuk setiap reload.
 */
interface PrismaBuildCache {
  build?: string;
  client?: PrismaClient;
}

const PRISMA_BUILD = '2026-12-03-lms-classrooms';
const prismaCache = globalThis as unknown as { __prismaBuildCache?: PrismaBuildCache };
const cached = prismaCache.__prismaBuildCache;

export const prisma =
  cached?.build === PRISMA_BUILD && cached.client
    ? cached.client
    : new PrismaClient({
        log: config.isProduction ? ['error'] : ['error', 'warn'],
      });

if (!config.isProduction) {
  prismaCache.__prismaBuildCache = { build: PRISMA_BUILD, client: prisma };
}
