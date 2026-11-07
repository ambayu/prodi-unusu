import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

/** Mengubah error Prisma yang dapat diprediksi menjadi respons yang jelas. */
function normalizePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(', ') : typeof target === 'string' ? target : 'kolom unik';

  switch (error.code) {
    case 'P2002':
      return AppError.conflict(`Nilai pada ${fields} sudah dipakai. Gunakan nilai lain.`);
    case 'P2003':
      return AppError.conflict(
        'Data masih direferensikan record lain. Hapus atau pindahkan relasinya lebih dulu.',
      );
    case 'P2025':
      return AppError.notFound('Record yang diminta tidak ditemukan.');
    default:
      return AppError.internal(`Kesalahan database (${error.code}).`);
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
      message: 'Struktur data tidak sesuai dengan skema database.',
      code: 'PRISMA_VALIDATION',
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Kesalahan tidak diketahui.';
  console.error('[UNHANDLED_ERROR]', `${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    success: false,
    message: config.isProduction ? 'Terjadi kesalahan pada server.' : message,
    code: 'INTERNAL_ERROR',
  });
}
