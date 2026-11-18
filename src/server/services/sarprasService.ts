import { config } from '../config/index.js';

/**
 * Representasi sarpras dari UNUSU Sarpras yang dipetakan ke bentuk
 * fasilitas lokal prodi-unusu.
 */
export interface SarprasHubItem {
  id: string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  imageUrl: string | null;
  status: string;
  sortOrder: number;
}

interface SarprasCacheEntry {
  fetchedAt: number;
  items: SarprasHubItem[];
}

const CACHE_TTL_MS = 60 * 1000; // 1 menit
const cache = new Map<string, SarprasCacheEntry>();
const inFlight = new Map<string, Promise<SarprasHubItem[]>>();

export function clearSarprasCache(): void {
  cache.clear();
  inFlight.clear();
}

/**
 * Mengambil data sarana prasarana berlingkup Prodi dari ONE UNUSU API Hub.
 * Mengembalikan array kosong bila kredensial belum ada atau hub tidak dapat dihubungi,
 * agar halaman fasilitas lokal tetap dapat dirender tanpa crash.
 */
export async function getSarprasByProdiCode(prodiCode: string): Promise<SarprasHubItem[]> {
  const code = (prodiCode || '').trim();
  if (!code) return [];

  const now = Date.now();
  const cached = cache.get(code);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.items;
  }

  const existingFlight = inFlight.get(code);
  if (existingFlight) {
    return existingFlight;
  }

  const promise = (async () => {
    if (!config.sso.clientKey) {
      return [];
    }

    const hubUrl = `${config.sso.baseUrl.replace(/\/$/, '')}/api/v2/website/sarpras`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(hubUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.sso.clientId,
          client_key: config.sso.clientKey,
          prodiCode: code,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json() as { status?: boolean; data?: any[] };
      if (!json.status || !Array.isArray(json.data)) {
        return [];
      }

      const items: SarprasHubItem[] = json.data.map((row: any, idx: number) => {
        const lokasiParts = [row.gedung, row.lantai ? `Lt. ${row.lantai}` : null].filter(Boolean);
        const spekParts = [
          row.kapasitas ? `Kapasitas: ${row.kapasitas} orang` : null,
          row.luas ? `Luas: ${row.luas} m²` : null,
          row.kondisi ? `Kondisi: ${row.kondisi}` : null,
          row.keterangan || null,
        ].filter(Boolean);

        return {
          id: String(row.id || `sarpras-${idx}`),
          name: String(row.nama || 'Fasilitas Program Studi'),
          category: String(row.jenis || 'fasilitas'),
          location: lokasiParts.length > 0 ? lokasiParts.join(', ') : null,
          description: spekParts.length > 0 ? spekParts.join(' | ') : null,
          imageUrl: row.fotoUrl || null,
          status: row.status === 'aktif' ? 'available' : 'maintenance',
          sortOrder: 1000 + idx,
        };
      });

      cache.set(code, { fetchedAt: Date.now(), items });
      return items;
    } catch (err) {
      // Hub mati atau timeout: log dan kembalikan array kosong agar halaman fasilitas tidak rusak
      return [];
    } finally {
      clearTimeout(timeout);
      inFlight.delete(code);
    }
  })();

  inFlight.set(code, promise);
  return promise;
}
