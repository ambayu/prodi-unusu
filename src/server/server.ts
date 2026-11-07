import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './prisma.js';

/**
 * Titik masuk proses server.
 *
 * Kegagalan koneksi database dilaporkan saat start agar tidak menjadi error
 * 500 yang membingungkan pada request pertama.
 */
async function main() {
  try {
    await prisma.$connect();
    console.log('[DB] Koneksi MySQL berhasil.');
  } catch (error) {
    console.error('[DB] Gagal terhubung ke MySQL. Periksa DATABASE_URL pada .env.');
    console.error(error);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[UNUSU Multi-Prodi] Server aktif di http://localhost:${config.port}`);
    console.log(`[UNUSU Multi-Prodi] Mode: ${config.nodeEnv}`);
    console.log(`[UNUSU Multi-Prodi] Portal admin host: ${config.adminHost}`);
    console.log(`[UNUSU Multi-Prodi] Website utama: ${config.mainSiteHosts.join(', ')}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[UNUSU Multi-Prodi] Menerima ${signal}, menutup server.`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
