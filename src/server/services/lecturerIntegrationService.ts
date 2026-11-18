import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

export interface InterServiceLecturer {
  id: number;
  name: string;
  nidn: string | null;
  nip?: string | null;
  email: string | null;
  gender?: string | null;
  studyProgramName: string | null;
  facultyName: string | null;
  academicRank: string | null;
  education: string | null;
  expertise?: string | null;
  sintaId?: string | null;
  sintaUrl?: string | null;
  googleScholar?: string | null;
  scopusId?: string | null;
  orcid?: string | null;
  bio?: string | null;
  photoUrl: string | null;
  isActive: boolean;
}

interface LecturerCacheEntry {
  fetchedAt: number;
  items: InterServiceLecturer[];
}

const cache = new Map<string, LecturerCacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 menit

/**
 * Mengambil data dosen aktif dari ONE UNUSU API Hub (`GET /api/v1/inter-service/dosen`).
 */
export async function fetchLecturersFromApiHub(query?: { prodi?: string; search?: string }): Promise<InterServiceLecturer[]> {
  const cacheKey = `${query?.prodi ?? ''}|${query?.search ?? ''}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.items;
  }

  const ssoBaseUrl = config.sso.baseUrl.replace(/\/$/, '');
  const url = new URL(`${ssoBaseUrl}/api/v1/inter-service/dosen`);
  if (query?.prodi) url.searchParams.set('prodi', query.prodi);
  if (query?.search) url.searchParams.set('search', query.search);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API Hub merespons status ${response.status}`);
    }

    const json = (await response.json()) as { success: boolean; data: InterServiceLecturer[] };
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error('Format data dosen dari API Hub tidak sesuai.');
    }

    cache.set(cacheKey, { fetchedAt: now, items: json.data });
    return json.data;
  } catch (error: any) {
    // Jika API Hub tidak merespons, bila ada cache lama kembalikan cache tersebut
    if (cached) return cached.items;

    throw AppError.internal(
      `Gagal mengambil data dosen dari API Hub ONE UNUSU: ${error?.message || 'Server API Hub tidak dapat dihubungi.'}`,
      'API_HUB_LECTURER_ERROR',
    );
  }
}
