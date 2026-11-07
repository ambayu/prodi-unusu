import { NextFunction, Request, Response } from 'express';
import { classifySurface, normalizeHostname, resolveSite } from '../services/tenantService.js';
import { AppError } from '../utils/errors.js';
import type { SiteSurface, TenantContext } from '../../shared/types/index.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Hostname yang sudah dinormalisasi dari header Host. */
      requestHostname: string;
      /** Permukaan aplikasi: website utama, website prodi, atau portal admin. */
      surface: SiteSurface;
      /** Konteks tenant hasil resolusi backend. Tidak pernah berasal dari body. */
      tenant: TenantContext | null;
    }
  }
}

/**
 * Middleware resolusi hostname.
 *
 * Di belakang Nginx, proxy menuliskan `Host` sesuai `proxy_set_header Host $host`
 * sehingga header `Host` itu sendiri sudah benar. `X-Forwarded-Host` hanya menjadi
 * cadangan bila proxy dikonfigurasi menulis ke header tersebut. Keduanya hanya
 * dipercaya ketika aplikasi memang dijalankan di belakang proxy tepercaya;
 * kalau tidak, siapa pun dapat mengarang tenant dengan mengirim header sendiri.
 *
 * Hasil normalisasi disimpan di `requestHostname`, bukan menimpa `req.hostname`
 * milik Express yang bersifat read-only.
 */
export function hostnameResolver(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawHost = req.headers.host;
    const forwarded = req.headers['x-forwarded-host'];
    const forwardedHost = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    // `Host` didahulukan karena itulah yang ditetapkan Nginx. Nilai forwarded
    // hanya dipakai bila `Host` tidak ada.
    const candidate = normalizeHostname(rawHost) || normalizeHostname(forwardedHost);

    req.requestHostname = candidate;
    req.surface = classifySurface(candidate);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Memuat tenant ke `req.tenant`.
 *
 * Untuk permukaan prodi, tenant wajib ada. Untuk permukaan admin dan website
 * utama, tenant bersifat opsional karena portal admin memilih tenant dari
 * assignment pengguna, bukan dari domain yang sedang dibuka.
 */
export function tenantContextLoader(req: Request, _res: Response, next: NextFunction) {
  resolveSite(req.requestHostname, req.surface)
    .then((resolution) => {
      req.tenant = resolution.tenant;
      next();
    })
    .catch((error) => {
      next(error);
    });
}

/**
 * Menolak request yang tidak memiliki tenant.
 *
 * Dipakai pada endpoint publik yang isinya memang milik satu program studi,
 * sehingga tidak ada jalan untuk membaca data tanpa tenant yang jelas.
 */
export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenant) {
    next(
      AppError.badRequest(
        'Endpoint ini memerlukan domain website program studi yang terdaftar.',
        'TENANT_REQUIRED',
      ),
    );
    return;
  }
  next();
}
