/**
 * Kesalahan aplikasi dengan status HTTP eksplisit.
 *
 * Route handler melempar `AppError` dan pemusat error mengubahnya menjadi
 * respons JSON konsisten. Ini menghindari try/catch berulang di setiap route.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  /**
   * Data pendukung yang aman dikirim ke client. Dipakai misalnya oleh proses
   * masuk SSO untuk menyertakan detail peran yang ditolak agar layar diagnosis
   * dapat menjelaskan penyebabnya, bukan hanya pesan umum.
   */
  readonly extras?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code = 'APP_ERROR',
    fieldErrors?: Record<string, string[]>,
    extras?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.extras = extras;
  }

  static badRequest(message: string, code = 'BAD_REQUEST', fieldErrors?: Record<string, string[]>) {
    return new AppError(400, message, code, fieldErrors);
  }

  static unauthorized(message = 'Sesi tidak valid atau sudah berakhir.', code = 'UNAUTHORIZED') {
    return new AppError(401, message, code);
  }

  static forbidden(
    message = 'Anda tidak berwenang pada operasi ini.',
    code = 'FORBIDDEN',
    extras?: Record<string, unknown>,
  ) {
    return new AppError(403, message, code, undefined, extras);
  }

  static notFound(message = 'Data tidak ditemukan.', code = 'NOT_FOUND') {
    return new AppError(404, message, code);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, message, code);
  }

  static unprocessable(message: string, fieldErrors?: Record<string, string[]>) {
    return new AppError(422, message, 'VALIDATION_ERROR', fieldErrors);
  }

  static tooMany(message = 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.', code = 'RATE_LIMITED') {
    return new AppError(429, message, code);
  }

  static internal(message = 'Terjadi kesalahan pada server.', code = 'INTERNAL_ERROR') {
    return new AppError(500, message, code);
  }
}
