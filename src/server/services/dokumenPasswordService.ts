import crypto from 'node:crypto';
import { prisma } from '../prisma.js';

/**
 * Pengelolaan kata sandi arsip dokumen prodi.
 *
 * Satu kata sandi berlaku untuk SELURUH dokumen mutu milik satu program studi
 * (bukan per dokumen). Kata sandi disimpan sebagai hash scrypt dengan format
 * `scrypt$N$r$p$saltHex$hashHex`, sehingga tidak pernah dapat dibaca kembali —
 * baik oleh admin aplikasi maupun lewat API.
 *
 * Kebijakan: kata sandi WAJIB dipasang setiap prodi. Selama belum ada, arsip
 * prodi tertutup untuk publik (fail-closed). Kata sandi tidak kedaluwarsa dan
 * dapat dipakai berulang kali tanpa batas.
 */

/** Parameter scrypt: cukup kuat untuk penyimpanan, tetap ringan untuk verifikasi berulang. */
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function hashPasswordSync(password: string, salt: Buffer): string {
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Menghasilkan hash scrypt dari kata sandi mentah. */
export function hashDocumentPassword(password: string): string {
  return hashPasswordSync(password, crypto.randomBytes(16));
}

/**
 * Membandingkan kata sandi dengan hash tersimpan.
 *
 * Selalu memakai `timingSafeEqual` agar lama verifikasi tidak membocorkan
 * seberapa mirip tebakan dengan kata sandi asli.
 */
export function verifyDocumentPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, rawN, rawR, rawP, saltHex, hashHex] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  const derived = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });

  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export interface DocumentPasswordStatus {
  /** `true` bila prodi sudah memasang kata sandi arsip. */
  passwordActive: boolean;
  /** Waktu kata sandi terakhir dipasang/diganti. */
  setAt: string | null;
  /** Dinaikkan setiap kata sandi berubah. */
  version: number;
}

export interface TenantTarget {
  studyProgramId?: number | null;
  facultyId?: number | null;
}

function resolveWhere(target: number | TenantTarget): { studyProgramId: number } | { facultyId: number } {
  if (typeof target === 'number') {
    return { studyProgramId: target };
  }
  if (target.facultyId) {
    return { facultyId: target.facultyId };
  }
  return { studyProgramId: target.studyProgramId! };
}

/** Membaca status kata sandi arsip sebuah prodi atau fakultas. */
export async function getDocumentPasswordStatus(target: number | TenantTarget): Promise<DocumentPasswordStatus> {
  const where = resolveWhere(target);
  const setting = await prisma.websiteSetting.findUnique({
    where,
    select: { documentPasswordHash: true, documentPasswordSetAt: true, documentPasswordVersion: true },
  });

  return {
    passwordActive: Boolean(setting?.documentPasswordHash),
    setAt: setting?.documentPasswordSetAt ? setting.documentPasswordSetAt.toISOString() : null,
    version: setting?.documentPasswordVersion ?? 0,
  };
}

/**
 * Mengambil hash kata sandi arsip satu prodi atau fakultas.
 *
 * Mengembalikan `null` bila belum memasang kata sandi.
 */
export async function getDocumentPasswordHash(target: number | TenantTarget): Promise<string | null> {
  const where = resolveWhere(target);
  const setting = await prisma.websiteSetting.findUnique({
    where,
    select: { documentPasswordHash: true },
  });
  return setting?.documentPasswordHash ?? null;
}

/** Memasang atau mengganti kata sandi arsip prodi atau fakultas. */
export async function setDocumentPassword(
  target: number | TenantTarget,
  password: string,
): Promise<DocumentPasswordStatus> {
  const where = resolveWhere(target);
  const hash = hashDocumentPassword(password);
  const now = new Date();

  const isFaculty = 'facultyId' in where;
  const setting = await prisma.websiteSetting.upsert({
    where,
    create: {
      ...where,
      siteTitle: isFaculty ? 'Website Fakultas' : 'Website Program Studi',
      documentPasswordHash: hash,
      documentPasswordSetAt: now,
      documentPasswordVersion: 1,
    },
    update: {
      documentPasswordHash: hash,
      documentPasswordSetAt: now,
      documentPasswordVersion: { increment: 1 },
    },
    select: { documentPasswordHash: true, documentPasswordSetAt: true, documentPasswordVersion: true },
  });

  return {
    passwordActive: Boolean(setting.documentPasswordHash),
    setAt: setting.documentPasswordSetAt ? setting.documentPasswordSetAt.toISOString() : null,
    version: setting.documentPasswordVersion,
  };
}
