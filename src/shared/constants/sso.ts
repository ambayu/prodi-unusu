/**
 * Kontrak masuk SSO ONE UNUSU.
 *
 * Portal pusat sudah menghitung keputusan akses sebelum tiket ditukar. Yang
 * dikirim ke aplikasi ini adalah `data.access` berisi `allowed`, `tingkat`, dan
 * `permissions`. Aplikasi cabang hanya membaca hasil itu; peran mentah seperti
 * "ADMIN_PRODI" tidak lagi dipakai sebagai dasar otorisasi karena SSO sendiri
 * sudah menghapus peran admin cabang yang kaku.
 *
 * Peran di aplikasi ini hanya dua dan keduanya diberikan setelah validasi
 * manual oleh admin: Admin Utama dan Admin Prodi.
 */

/**
 * Izin masuk yang diteruskan SSO. Salah satu harus dimiliki agar akun boleh
 * masuk ke Portal Program Studi lalu menunggu validasi admin.
 *
 * - `masuk_admin`  : staf/administrator universitas
 * - `masuk_dosen`  : dosen, dapat mengajukan diri sebagai pengelola prodi
 *
 * `masuk_mahasiswa` sengaja tidak diterima: portal ini bukan untuk mahasiswa.
 */
export const SSO_ENTRY_PERMISSIONS = ['masuk_admin', 'masuk_dosen'] as const;

/** Tingkat akses yang dikirim SSO pada `access.tingkat`. */
export const SSO_ACCEPTED_LEVELS = ['admin', 'dosen'] as const;

/** Label manusia untuk tingkat SSO, dipakai di layar diagnosis. */
export const SSO_LEVEL_LABELS: Record<string, string> = {
  admin: 'Administrator',
  dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

/** Keterangan singkat tiap izin masuk untuk ditampilkan ke admin. */
export const SSO_ENTRY_LABELS: Record<string, string> = {
  masuk_admin: 'Masuk sebagai Administrator',
  masuk_dosen: 'Masuk sebagai Dosen',
  masuk_mahasiswa: 'Masuk sebagai Mahasiswa',
};

/**
 * Peran aplikasi yang boleh diberikan kepada akun SSO.
 *
 * Hanya dua, sesuai keputusan: admin utama mengelola seluruh prodi, sedangkan
 * admin prodi terikat pada satu prodi lewat `studyProgramId` di penugasannya.
 */
export const ASSIGNABLE_ROLE_CODES = ['SUPER_ADMIN', 'ADMIN_PRODI'] as const;

export type AssignableRoleCode = (typeof ASSIGNABLE_ROLE_CODES)[number];

/** Bentuk `access` pada respons verify-token SSO. */
export interface SsoAccess {
  allowed: boolean;
  tingkat: string[];
  permissions: string[];
}

/**
 * Memeriksa apakah akun berhak masuk portal berdasarkan `access` dari SSO.
 *
 * Dipakai server sebagai gerbang sebelum akun lokal dibuat dan sesi diterbitkan,
 * sehingga akun tanpa hak tidak pernah meninggalkan jejak di database.
 */
export function punyaIzinMasuk(access: Pick<SsoAccess, 'permissions' | 'tingkat'>): boolean {
  const izin = access.permissions ?? [];
  if (izin.some((kunci) => (SSO_ENTRY_PERMISSIONS as readonly string[]).includes(kunci))) {
    return true;
  }
  // Cadangan bila portal hanya mengirim tingkat tanpa daftar permission.
  return (access.tingkat ?? []).some((t) => (SSO_ACCEPTED_LEVELS as readonly string[]).includes(t));
}

/** Ringkasan izin masuk untuk ditampilkan di tabel pengguna. */
export function ringkasJalurMasuk(permissions: string[]): string {
  const cocok = permissions.filter((kunci) => (SSO_ENTRY_PERMISSIONS as readonly string[]).includes(kunci));
  if (cocok.length === 0) return 'Tidak ada';
  return cocok.map((kunci) => SSO_ENTRY_LABELS[kunci] ?? kunci).join(', ');
}
