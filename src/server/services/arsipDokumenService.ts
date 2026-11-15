import { config } from '../config/index.js';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';

/**
 * Pembaca arsip dokumen mutu LPM & LPPM melalui ONE UNUSU API Hub.
 *
 * Arsip **tidak disalin** ke database prodi-unusu: sumber kebenaran tetap
 * aplikasi LPM/LPPM. prodi-unusu hanya meneruskan permintaan lewat endpoint
 * server-to-server ONE UNUSU (`POST /api/v2/website/dokumen`) memakai
 * `client_id` + `client_key` aplikasi ini, lalu menyajikan hasilnya ke panel
 * admin prodi dan halaman publik prodi.
 */

export type ArsipSumber = 'lpm' | 'lppm';

/** Satu baris arsip dokumen dalam bentuk yang dipakai aplikasi ini. */
export interface ArsipDokumen {
  id: number;
  sumber: ArsipSumber;
  judul: string;
  nomor: string | null;
  kategori: string | null;
  tahun: number | null;
  status: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  prodiCode: string | null;
  prodiName: string | null;
  updatedAt: string | null;
}

export interface ArsipQuery {
  sumber: ArsipSumber;
  prodiCode: string;
  search?: string;
  status?: string;
  tahun?: number;
  skip?: number;
  take?: number;
}

interface ArsipCacheEntry {
  fetchedAt: number;
  items: ArsipDokumen[];
}

/** Cache singkat agar halaman tidak membanjiri LPM/LPPM saat dibuka berulang. */
const cache = new Map<string, ArsipCacheEntry>();
const inFlight = new Map<string, Promise<ArsipDokumen[]>>();

function cacheKey(query: ArsipQuery): string {
  return [
    query.sumber,
    query.prodiCode,
    query.search ?? '',
    query.status ?? '',
    query.tahun ?? '',
    query.skip ?? 0,
    query.take ?? 0,
  ].join('|');
}

/** Membuang cache arsip (dipakai saat pengujian atau setelah perubahan besar). */
export function clearArsipCache(): void {
  cache.clear();
  inFlight.clear();
}

interface UpstreamRow {
  id?: number | string;
  judul?: string | null;
  nomor?: string | null;
  kategori?: { nama?: string | null } | null;
  tahun?: number | null;
  status?: string | null;
  filePdfUrl?: string | null;
  mimeType?: string | null;
  prodiCode?: string | null;
  prodiName?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

function toArsipDokumen(row: UpstreamRow, sumber: ArsipSumber): ArsipDokumen {
  const rawId = typeof row.id === 'string' ? Number(row.id) : row.id;
  return {
    id: Number.isFinite(rawId) ? Number(rawId) : 0,
    sumber,
    judul: row.judul ?? 'Tanpa judul',
    nomor: row.nomor ?? null,
    kategori: row.kategori?.nama ?? null,
    tahun: typeof row.tahun === 'number' ? row.tahun : null,
    status: row.status ?? null,
    fileUrl: row.filePdfUrl ?? null,
    mimeType: row.mimeType ?? null,
    prodiCode: row.prodiCode ?? null,
    prodiName: row.prodiName ?? null,
    updatedAt: row.updatedAt ?? row.createdAt ?? null,
  };
}

/**
 * Memanggil ONE UNUSU untuk membaca arsip satu aplikasi sumber.
 *
 * Gagal jaringan/kredensial selalu diterjemahkan menjadi `AppError` berbahasa
 * Indonesia. Tidak ada data contoh yang dikembalikan, sesuai aturan agar
 * pengguna melihat keadaan gagal yang jujur.
 */
async function fetchFromOneUnusu(query: ArsipQuery): Promise<ArsipDokumen[]> {
  if (!config.sso.clientKey) {
    throw AppError.internal(
      'Integrasi arsip dokumen belum dikonfigurasi. SSO_CLIENT_KEY belum diisi di server.',
      'ARSIP_NOT_CONFIGURED',
    );
  }

  const body = {
    client_id: config.sso.clientId,
    client_key: config.sso.clientKey,
    sumber: query.sumber,
    prodiCode: query.prodiCode,
    tujuanPublish: 'prodi',
    ...(query.search ? { search: query.search } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.tahun ? { tahun: query.tahun } : {}),
    take: Math.min(Math.max(query.take ?? 50, 1), 100),
    skip: Math.max(query.skip ?? 0, 0),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.arsip.timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${config.sso.baseUrl.replace(/\/$/, '')}/api/v2/website/dokumen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw AppError.badGateway(
      'Portal ONE UNUSU tidak dapat dihubungi. Arsip dokumen belum dapat dimuat.',
      'ARSIP_UPSTREAM_UNREACHABLE',
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: UpstreamRow[] }
    | null;

  if (!response.ok || !payload?.status) {
    throw AppError.badGateway(
      payload?.message || 'Arsip dokumen LPM/LPPM sedang tidak dapat dibaca. Coba lagi beberapa saat lagi.',
      'ARSIP_UPSTREAM_FAILED',
    );
  }

  const rows = Array.isArray(payload.data) ? payload.data : [];
  return rows.map((row) => toArsipDokumen(row, query.sumber));
}

/** Membaca arsip satu aplikasi sumber dengan cache singkat. */
export async function ambilArsipDokumen(query: ArsipQuery): Promise<ArsipDokumen[]> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < config.arsip.cacheTtlMs) {
    return cached.items;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetchFromOneUnusu(query)
    .then((items) => {
      cache.set(key, { fetchedAt: Date.now(), items });
      return items;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Membaca arsip prodi dari kedua sumber sekaligus lalu menggabungkannya.
 *
 * Bila salah satu sumber sedang mati, sumber lain tetap ditampilkan; kegagalan
 * hanya dilaporkan ketika KEDUA sumber gagal.
 */
export async function ambilArsipProdi(params: {
  prodiCode: string;
  search?: string;
  status?: string;
  tahun?: number;
  take?: number;
}): Promise<{ items: ArsipDokumen[]; sumberGagal: ArsipSumber[] }> {
  const daftarSumber: ArsipSumber[] = ['lpm', 'lppm'];
  const sumberGagal: ArsipSumber[] = [];

  const hasil = await Promise.all(
    daftarSumber.map(async (sumber) => {
      try {
        return await ambilArsipDokumen({ ...params, sumber });
      } catch (error) {
        sumberGagal.push(sumber);
        if (daftarSumber.length === sumberGagal.length) throw error;
        return [] as ArsipDokumen[];
      }
    }),
  );

  const items = hasil
    .flat()
    .sort((a, b) => (b.tahun ?? 0) - (a.tahun ?? 0) || b.id - a.id);

  return { items, sumberGagal };
}

/**
 * Memastikan kode prodi lokal sudah dipetakan ke kode arsip LPM/LPPM.
 *
 * Tanpa pemetaan, permintaan tidak diteruskan karena hasilnya akan kosong atau
 * (lebih buruk) mencampur dokumen prodi lain.
 */
export async function resolveProdiCode(studyProgramId: number): Promise<{ prodiCode: string; nama: string }> {
  const program = await prisma.studyProgram.findUnique({
    where: { id: studyProgramId },
    select: { code: true, name: true, externalProdiCode: true },
  });

  if (!program) {
    throw AppError.notFound('Program studi tidak ditemukan.');
  }

  const prodiCode = program.externalProdiCode?.trim() || program.code.trim();
  if (!prodiCode) {
    throw AppError.unprocessableCode(
      'Kode prodi belum dipetakan ke arsip LPM/LPPM. Hubungi admin universitas.',
      'PRODI_CODE_UNMAPPED',
    );
  }

  return { prodiCode, nama: program.name };
}

/**
 * Memeriksa apakah sebuah URL berkas layak diteruskan ke klien.
 *
 * Hanya `http`/`https` dan hanya host yang ada di allowlist `ARSIP_FILE_HOSTS`.
 */
export function isAllowedFileUrl(raw: string | null): raw is string {
  if (!raw) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  return config.arsip.fileHosts.includes(parsed.hostname.toLowerCase());
}

/**
 * Memeriksa apakah arsip menyimpan berkasnya sebagai data URI base64.
 *
 * Aplikasi LPM/LPPM dapat menyimpan PDF langsung di kolom `filePdfUrl`
 * (mis. `data:application/pdf;base64,JVBERi0...`) alih-alih URL penyimpanan.
 * Berkas seperti ini tidak perlu diambil dari mana pun — isinya sudah ada pada
 * data arsip, sehingga tidak ada risiko SSRF.
 */
export function isInlineDataUri(raw: string | null): raw is string {
  return Boolean(raw && raw.startsWith('data:'));
}

/** Mengurai data URI base64 menjadi buffer dan tipe kontennya. */
export function parseInlineDataUri(raw: string): { buffer: Buffer; mimeType: string } {
  const koma = raw.indexOf(',');
  if (koma === -1) {
    throw AppError.unprocessableCode('Berkas dokumen pada arsip rusak dan tidak dapat dibaca.', 'ARSIP_FILE_CORRUPT');
  }

  const header = raw.slice(0, koma);
  const isi = raw.slice(koma + 1);
  const mimeType = /^data:([^;,]+)/.exec(header)?.[1] ?? 'application/pdf';

  if (!header.includes(';base64')) {
    throw AppError.unprocessableCode('Berkas dokumen pada arsip tidak berformat yang didukung.', 'ARSIP_FILE_UNSUPPORTED');
  }

  const buffer = Buffer.from(isi, 'base64');
  if (buffer.length === 0) {
    throw AppError.unprocessableCode('Berkas dokumen pada arsip kosong.', 'ARSIP_FILE_EMPTY');
  }

  return { buffer, mimeType };
}

/** Mengambil berkas arsip dari host tujuan untuk diteruskan sebagai stream. */
export async function ambilBerkasArsip(fileUrl: string): Promise<Response> {
  if (!isAllowedFileUrl(fileUrl)) {
    throw AppError.unprocessableCode(
      'Berkas dokumen ini berada pada penyimpanan yang tidak diizinkan sistem.',
      'ARSIP_FILE_HOST_DENIED',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.arsip.timeoutMs * 3);

  try {
    const response = await fetch(fileUrl, { signal: controller.signal });
    if (!response.ok) {
      throw AppError.badGateway(
        'Berkas dokumen tidak dapat diambil dari penyimpanan arsip. Coba lagi beberapa saat lagi.',
        'ARSIP_FILE_UNAVAILABLE',
      );
    }
    return response;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.badGateway(
      'Berkas dokumen tidak dapat diambil dari penyimpanan arsip. Coba lagi beberapa saat lagi.',
      'ARSIP_FILE_UNAVAILABLE',
    );
  } finally {
    clearTimeout(timeout);
  }
}
