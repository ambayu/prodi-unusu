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
 * Indonesia dan tidak membocorkan detail internal. Hanya bila backend tidak
 * menyertakan pesan, status HTTP yang diterjemahkan ke kalimat yang dapat
 * ditindaklanjuti pengguna.
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

    const status = error.response.status;

    if (status >= 500) {
      return {
        message: 'Server sedang mengalami kendala. Coba lagi beberapa saat lagi.',
        code: 'SERVER_ERROR',
      };
    }

    const pesanStatus: Record<number, string> = {
      400: 'Permintaan tidak dapat diproses. Periksa kembali data yang dikirim.',
      401: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
      403: 'Anda tidak berwenang melakukan tindakan ini.',
      404: 'Data yang diminta tidak ditemukan.',
      413: 'Ukuran data atau berkas terlalu besar.',
      429: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
    };

    return {
      message: pesanStatus[status] ?? `Permintaan gagal (status ${status}).`,
      code: 'HTTP_ERROR',
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Terjadi kesalahan yang tidak diketahui. Coba muat ulang halaman.' };
}

/**
 * Label manusia untuk kunci field yang biasanya muncul di pesan validasi.
 *
 * Kunci dari Zod berbentuk path (`heroSliderConfig.slides.0.imageUrl`), yang
 * tidak terbaca awam bila ditampilkan mentah di toast.
 */
const LABEL_FIELD: Record<string, string> = {
  name: 'Nama',
  title: 'Judul',
  slug: 'Slug',
  year: 'Tahun',
  email: 'Email',
  username: 'Nama pengguna',
  password: 'Kata sandi',
  currentPassword: 'Kata sandi saat ini',
  newPassword: 'Kata sandi baru',
  roleCode: 'Peran',
  code: 'Kode',
  credits: 'Jumlah SKS',
  semesterNumber: 'Semester',
  sortOrder: 'Urutan',
  imageUrl: 'Gambar',
  photoUrl: 'Foto',
  fileUrl: 'Berkas',
  coverImageUrl: 'Gambar sampul',
  backgroundImageUrl: 'Gambar latar',
  linkUrl: 'Tautan',
  buttonUrl: 'Tautan tombol',
  hostname: 'Domain',
  year_: 'Tahun',
  limit: 'Jumlah tampil',
  autoplayMs: 'Durasi putar',
  page: 'Halaman',
  perPage: 'Jumlah per halaman',
};

/** Mengubah segmen path field menjadi label yang terbaca pengguna. */
function labelField(path: string): string {
  const kunci = path.split('.').filter((bagian) => !/^\d+$/.test(bagian)).pop() ?? path;
  if (LABEL_FIELD[kunci]) return LABEL_FIELD[kunci];
  const dirapikan = kunci
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return dirapikan.charAt(0).toUpperCase() + dirapikan.slice(1);
}

/**
 * Mengambil pesan pertama dari fieldErrors untuk ditampilkan di form.
 *
 * Bila hanya ada satu field bermasalah, pesannya dikembalikan apa adanya karena
 * biasanya sudah menyebut bagian yang salah. Bila lebih dari satu, pesan diberi
 * awalan label field agar pengguna tahu bagian mana yang perlu diperbaiki.
 * Awalan dilewati ketika pesannya sendiri sudah menyebut label tersebut, supaya
 * tidak muncul kalimat berulang seperti "Gambar: Gambar wajib diunggah."
 */
export function firstFieldError(error: ApiError): string | null {
  if (!error.fieldErrors) return null;

  const entri = Object.entries(error.fieldErrors).filter(([, messages]) => messages.length > 0);
  if (entri.length === 0) return null;

  const [path, messages] = entri[0];
  const pesan = messages[0];
  if (entri.length === 1) return pesan;

  const label = labelField(path);
  const sudahMenyebut = pesan.toLowerCase().startsWith(label.toLowerCase());
  return sudahMenyebut ? pesan : `${label}: ${pesan}`;
}

/** Ringkasan seluruh kesalahan field, dipakai saat form panjang perlu dirangkum. */
export function allFieldErrors(error: ApiError): string[] {
  if (!error.fieldErrors) return [];

  return Object.entries(error.fieldErrors)
    .filter(([, messages]) => messages.length > 0)
    .map(([path, messages]) => {
      const pesan = messages[0];
      const label = labelField(path);
      return pesan.toLowerCase().startsWith(label.toLowerCase()) ? pesan : `${label}: ${pesan}`;
    });
}
