import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

/**
 * Label manusia untuk kolom database yang sering muncul di pesan bentrok.
 *
 * Tanpa pemetaan ini pengguna melihat nama kolom mentah seperti
 * "Nilai pada domain, tenantId sudah dipakai."
 */
const LABEL_KOLOM: Record<string, string> = {
  slug: 'Slug',
  domain: 'Domain',
  hostname: 'Domain',
  email: 'Email',
  username: 'Nama pengguna',
  code: 'Kode',
  key: 'Kunci',
  name: 'Nama',
  title: 'Judul',
  ssoId: 'ID SSO',
  username_tenantId: 'Nama pengguna',
  email_tenantId: 'Email',
  domain_tenantId: 'Domain',
  slug_tenantId: 'Slug',
};

/** Mengubah nama kolom Prisma menjadi label yang terbaca pengguna. */
function labelKolom(fields: string): string {
  return fields
    .split(/,\s*/)
    .map((kolom) => {
      const bersih = kolom.trim().replace(/^"(.*)"$/, '$1');
      if (LABEL_KOLOM[bersih]) return LABEL_KOLOM[bersih];
      // Nama indeks gabungan (mis. `slug_tenantId`) diterjemahkan per bagian.
      const bagian = bersih.split('_').map((k) => LABEL_KOLOM[k]).filter(Boolean);
      if (bagian.length > 0) return [...new Set(bagian)].join(' + ');
      return bersih;
    })
    .join(', ');
}

/** Mengubah error Prisma yang dapat diprediksi menjadi respons yang jelas. */
function normalizePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  const target = error.meta?.target;
  const rawFields = Array.isArray(target) ? target.join(', ') : typeof target === 'string' ? target : '';
  const fields = rawFields ? labelKolom(rawFields) : 'data unik';

  switch (error.code) {
    case 'P2002':
      return AppError.conflict(
        `${fields} tersebut sudah dipakai oleh data lain. Gunakan nilai yang berbeda.`,
      );
    case 'P2003':
      return AppError.conflict(
        'Data ini masih dipakai atau terhubung dengan data lain. Lepaskan hubungannya lebih dulu, lalu coba lagi.',
      );
    case 'P2025':
      return AppError.notFound(
        'Data yang Anda maksud tidak ditemukan. Mungkin sudah dihapus orang lain. Muat ulang halaman untuk melihat data terbaru.',
      );
    default:
      return AppError.internal(
        'Terjadi kendala pada penyimpanan data. Coba lagi beberapa saat lagi; bila berulang, hubungi administrator.',
      );
  }
}

/** Middleware 404 untuk rute API yang tidak dikenal. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`, 'ENDPOINT_NOT_FOUND'));
}

/**
 * Pemusat penanganan error.
 *
 * Satu tempat yang memutuskan status, kode, dan bentuk respons. Detail internal
 * tidak dikirim ke client pada production agar tidak membocorkan struktur data.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const normalized = normalizePrismaError(error);
    console.error(`[${normalized.code}]`, error.code, error.meta, `${req.method} ${req.originalUrl}`);
    res.status(normalized.status).json({
      success: false,
      message: normalized.message,
      code: normalized.code,
    });
    return;
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[PRISMA_VALIDATION]', `${req.method} ${req.originalUrl}`);
    res.status(400).json({
      success: false,
      message:
        'Data yang dikirim tidak sesuai dengan struktur penyimpanan. Periksa kembali isian formulir Anda.',
      code: 'PRISMA_VALIDATION',
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui.';
  console.error('[UNHANDLED_ERROR]', `${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    success: false,
    message: config.isProduction
      ? 'Terjadi kendala pada server. Coba lagi beberapa saat lagi; bila berulang, hubungi administrator.'
      : message,
    code: 'INTERNAL_ERROR',
  });
}
