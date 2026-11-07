import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, ZodTypeAny, z } from 'zod';
import { AppError } from './errors.js';

/**
 * Membungkus handler async agar penolakan promise diteruskan ke pemusat error.
 * Express 4 tidak menangkap error dari handler async secara otomatis.
 */
export function asyncHandler<T extends RequestHandler>(handler: T): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Memvalidasi bagian request terhadap skema Zod.
 *
 * Hasil parse ditulis ke `req.validated` sehingga handler selalu menerima data
 * yang sudah bertipe dan bersih, bukan `req.body` mentah.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated: {
        body: unknown;
        query: unknown;
        params: unknown;
      };
    }
  }
}

type RequestPart = 'body' | 'query' | 'params';

export function validate(schemas: Partial<Record<RequestPart, ZodTypeAny>>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.validated) {
      req.validated = { body: {}, query: {}, params: {} };
    }

    try {
      if (schemas.body) {
        req.validated.body = schemas.body.parse(req.body ?? {});
      }
      if (schemas.query) {
        req.validated.query = schemas.query.parse(req.query ?? {});
      }
      if (schemas.params) {
        req.validated.params = schemas.params.parse(req.params ?? {});
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const key = issue.path.join('.') || '_';
          fieldErrors[key] = fieldErrors[key] ?? [];
          fieldErrors[key].push(issue.message);
        }
        next(AppError.unprocessable('Data yang dikirim tidak valid.', fieldErrors));
        return;
      }
      next(error);
    }
  };
}

/** Mengambil body hasil validasi dengan tipe yang diminta pemanggil. */
export function getBody<T>(req: Request): T {
  return req.validated?.body as T;
}

/** Mengambil query hasil validasi dengan tipe yang diminta pemanggil. */
export function getQuery<T>(req: Request): T {
  return req.validated?.query as T;
}

/** Mengambil params hasil validasi dengan tipe yang diminta pemanggil. */
export function getParams<T>(req: Request): T {
  return req.validated?.params as T;
}

export { z };
