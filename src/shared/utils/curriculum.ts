/**
 * Pemilihan kurikulum berjalan berdasarkan tahun kalender.
 *
 * Kurikulum terbaru dengan `year <= currentYear` dipilih sebagai kurikulum
 * berlaku; bila seluruh kurikulum bertahun masa depan (`> currentYear`), jatuh
 * ke kurikulum terbaru yang tersedia agar halaman tidak kosong.
 */
export function pickCurrentCurriculum<T extends { year: number; id?: number }>(
  curriculums: readonly T[],
  currentYear: number = new Date().getFullYear(),
): T | null {
  if (curriculums.length === 0) return null;

  const sorted = [...curriculums].sort(
    (a, b) => b.year - a.year || (b.id ?? 0) - (a.id ?? 0),
  );

  return sorted.find((c) => c.year <= currentYear) ?? sorted[0] ?? null;
}
