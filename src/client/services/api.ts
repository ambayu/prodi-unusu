import axios, { AxiosError } from 'axios';
import type { ApiError } from '../../shared/types/index';

/**
 * Instance axios tunggal untuk seluruh client.
 *
 * Sesi berupa JWT di cookie httpOnly, sehingga tidak ada token yang disimpan
 * atau dibaca JavaScript. Karena itu setiap permintaan tulis wajib membawa
 * header `X-CSRF-Token` yang nilainya diambil dari cookie CSRF yang memang
 * dapat dibaca klien (pola double-submit).
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Membaca cookie CSRF yang ditulis server. */
export function readCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)unusu_prodi_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const csrf = readCsrfToken();
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }

  // Kirimkan tenant ID aktif jika disimpan di sessionStorage/localStorage
  const activeTenantId = sessionStorage.getItem('active_tenant_id');
  if (activeTenantId) {
    config.headers['X-Tenant-Id'] = activeTenantId;
  }

  return config;
});

/** Menandai bahwa sesi sudah berakhir agar UI dapat mengalihkan ke login. */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    // 401 pada endpoint admin berarti sesi berakhir, bukan kesalahan data.
    const url = error.config?.url ?? '';
    if (status === 401 && !url.includes('/auth/')) {
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

/**
 * Menerjemahkan error axios menjadi pesan yang layak ditampilkan.
 *
 * Pesan dari backend dipakai apa adanya karena sudah ditulis dalam bahasa
 * Indonesia dan tidak membocorkan detail internal.
 */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiError> | undefined;

    if (data?.message) {
      return {
        message: data.message,
        code: data.code,
        fieldErrors: data.fieldErrors,
      };
    }

    if (!error.response) {
      return {
        message: 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: `Permintaan gagal dengan status ${error.response.status}.`,
      code: 'HTTP_ERROR',
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Terjadi kesalahan yang tidak diketahui.' };
}

/** Mengambil pesan pertama dari fieldErrors untuk ditampilkan di form. */
export function firstFieldError(error: ApiError): string | null {
  if (!error.fieldErrors) return null;
  for (const messages of Object.values(error.fieldErrors)) {
    if (messages.length > 0) return messages[0];
  }
  return null;
}
