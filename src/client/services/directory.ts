export interface DirectoryProdi {
  id: number;
  code: string;
  name: string;
  slug: string;
  degree: string;
  logoUrl: string | null;
  primaryHostname: string | null;
  faculty: { id: number; name: string; code: string };
}

export interface DirectoryResponse {
  success: boolean;
  total: number;
  studyPrograms: DirectoryProdi[];
}

export interface DirectoryFaculty {
  id: number;
  code: string;
  name: string;
  prodis: DirectoryProdi[];
}

export interface PortalNews {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  views: number;
  category: { name: string; slug: string } | null;
  studyProgramId: number;
  studyProgramCode: string;
  studyProgramName: string;
  facultyName: string;
  prodiHostname: string | null;
  url: string | null;
}

export interface PortalNewsResponse {
  success: boolean;
  items: PortalNews[];
}

/** Format tanggal ringkas berbahasa Indonesia, mis. "8 November 2026". */
export function formatTanggalIndonesia(iso: string | null): string {
  if (!iso) return 'Belum terbit';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Belum terbit';
  const bulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Mengelompokkan direktori prodi per fakultas.
 *
 * Urutan fakultas dan prodi mengikuti urutan yang sudah ditetapkan backend
 * (`facultyId` lalu `sortOrder`), sehingga tampilan konsisten dengan data
 * seeder dan tidak bergantung pada urutan respons JSON.
 */
export function groupByFaculty(prodis: DirectoryProdi[]): DirectoryFaculty[] {
  const map = new Map<number, DirectoryFaculty>();

  for (const prodi of prodis) {
    const existing = map.get(prodi.faculty.id);
    if (existing) {
      existing.prodis.push(prodi);
    } else {
      map.set(prodi.faculty.id, {
        id: prodi.faculty.id,
        code: prodi.faculty.code,
        name: prodi.faculty.name,
        prodis: [prodi],
      });
    }
  }

  return [...map.values()];
}
