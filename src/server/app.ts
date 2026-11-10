import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config } from './config/index.js';
import { prisma } from './prisma.js';
import { hostnameResolver, tenantContextLoader } from './middlewares/tenantResolver.js';
import { asyncHandler } from './utils/validation.js';
import { AppError } from './utils/errors.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import websiteRoutes from './modules/admin/website.routes.js';
import portalRoutes from './modules/admin/portal.routes.js';
import builderRoutes from './modules/admin/builder.routes.js';
import contentRoutes from './modules/admin/content.routes.js';
import publicationRoutes from './modules/admin/publication.routes.js';
import mediaRoutes from './modules/admin/media.routes.js';
import usersRoutes from './modules/admin/users.routes.js';
import organizationRoutes from './modules/admin/organization.routes.js';
import rbacRoutes from './modules/admin/rbac.routes.js';

import { authenticate, csrfProtection } from './middlewares/auth.js';
import { attachScopedTenant } from './middlewares/tenantScope.js';
import { resolveScopedTenantId } from './middlewares/tenantScope.js';
import { prisma as db } from './prisma.js';

/**
 * Menyusun aplikasi Express lengkap.
 *
 * Dipisahkan dari `server.ts` agar dapat diuji tanpa membuka port.
 */
export function createApp() {
  const app = express();

  // Di belakang Nginx, aplikasi menerima koneksi dari loopback sehingga
  // X-Forwarded-* hanya dipercaya dari sana. Nilai jumlah hop dapat diatur
  // lewat TRUST_PROXY bila proxy berlapis.
  if (config.trustProxy) {
    app.set('trust proxy', config.isProduction ? 'loopback' : true);
  }
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Permintaan tanpa Origin (server-to-server, curl) tetap dilayani.
        if (!origin) return callback(null, true);
        try {
          const parsed = new URL(origin);
          if (
            parsed.hostname === 'unusu.ac.id' ||
            parsed.hostname.endsWith('.unusu.ac.id') ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            config.cors.origins.includes(origin)
          ) {
            return callback(null, true);
          }
        } catch {
          // ignore parsing error
        }
        return callback(new Error(`Origin ${origin} tidak diizinkan.`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  app.use(hostnameResolver);

  // Berkas publik hasil upload. File privat tidak dilayani lewat jalur ini.
  const uploadRoot = path.join(process.cwd(), config.upload.dir);
  fs.mkdirSync(path.join(uploadRoot, 'media'), { recursive: true });
  fs.mkdirSync(path.join(uploadRoot, 'documents'), { recursive: true });
  fs.mkdirSync(path.join(uploadRoot, 'rps'), { recursive: true });

  app.use(
    '/uploads/media',
    express.static(path.join(uploadRoot, 'media'), {
      fallthrough: true,
      maxAge: config.isProduction ? '30d' : 0,
    }),
  );
  app.use(express.static(path.join(process.cwd(), 'public')));

  app.use(tenantContextLoader);

  // ---------------------------------------------------------
  // API
  // ---------------------------------------------------------

  app.get(
    '/api/health',
    asyncHandler(async (req, res) => {
      const [facultyCount, tenantCount, domainCount] = await Promise.all([
        db.faculty.count(),
        db.studyProgram.count(),
        db.domain.count(),
      ]);

      res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        surface: req.surface,
        hostname: req.requestHostname,
        tenant: req.tenant ? { id: req.tenant.id, name: req.tenant.name } : null,
        database: { facultyCount, tenantCount, domainCount },
      });
    }),
  );

  app.get(
    '/api/v1/site-resolution',
    asyncHandler(async (req, res) => {
      res.json({ success: true, surface: req.surface, hostname: req.requestHostname, tenant: req.tenant });
    }),
  );

  // Auth: login lokal, tukar tiket SSO, profil, refresh, logout.
  app.use('/api/v1/auth', authRoutes);

  // Publik: dibaca tanpa login, selalu terikat tenant dari hostname.
  app.use('/api/v1/public', publicRoutes);

  // Admin: seluruh endpoint mewajibkan sesi, CSRF, dan permission.
  const adminRouter = express.Router();
  adminRouter.use(authenticate);
  adminRouter.use(csrfProtection);

  adminRouter.get(
    '/access-context',
    asyncHandler(async (req, res) => {
      const studyProgramId = await resolveScopedTenantId(req);
      res.json({ success: true, user: req.authUser, activeTenantId: studyProgramId });
    }),
  );

  adminRouter.use(attachScopedTenant);

  adminRouter.use('/', websiteRoutes);
  adminRouter.use('/', portalRoutes);
  adminRouter.use('/', builderRoutes);
  adminRouter.use('/', contentRoutes);
  adminRouter.use('/', publicationRoutes);
  adminRouter.use('/media', mediaRoutes);
  adminRouter.use('/users', usersRoutes);
  adminRouter.use('/', organizationRoutes);
  adminRouter.use('/', rbacRoutes);

  app.use('/api/v1/admin', adminRouter);

  app.use('/api', notFoundHandler);

  // ---------------------------------------------------------
  // Frontend build (production)
  // ---------------------------------------------------------

  if (config.isProduction) {
    // Vite menulis hasil build ke `dist/` (lihat vite.config.ts tanpa opsi
    // outDir khusus), sedangkan server dikompilasi ke `dist/server/`.
    // `dist/client` dipertahankan sebagai cadangan bila kelak outDir diubah.
    const candidates = [
      path.join(process.cwd(), 'dist'),
      path.join(process.cwd(), 'dist', 'client'),
    ];

    const clientDist = candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

    if (clientDist) {
      app.use(express.static(clientDist));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      console.warn(
        '[UNUSU Multi-Prodi] Hasil build frontend tidak ditemukan. Jalankan `npm run build:client`.',
      );
    }
  }

  app.use(errorHandler);

  return app;
}

export { AppError, prisma };

