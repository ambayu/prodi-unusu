/**
 * Pencocokan baris impor peserta dengan data mahasiswa ONE UNUSU.
 *
 * Seluruh fungsi bersifat murni agar hasil impor dapat diprediksi dan diuji
 * tanpa bergantung pada berkas Excel maupun jaringan.
 */

export interface StudentRecord {
  nim: string;
  name: string;
}

export interface UnmatchedStudentRow {
  nim: string;
  /** Nama dari berkas impor; string kosong bila kolom nama tidak diisi. */
  name: string;
}

export interface StudentImportReport {
  /** Baris yang cocok dengan ONE UNUSU dan belum terdaftar di kelas. */
  matched: StudentRecord[];
  /** NIM yang tidak ada pada data ONE UNUSU. */
  unmatched: UnmatchedStudentRow[];
  /** NIM yang valid namun sudah menjadi peserta kelas. */
  alreadyRegistered: StudentRecord[];
  /** NIM yang muncul lebih dari sekali di dalam berkas. */
  duplicateNims: string[];
  /** Baris berisi data lain tetapi tanpa NIM. */
  rowsWithoutNim: number;
}

const NIM_HEADER = /^(nim|npm|nomor\s*induk\s*mahasiswa)\b/i;
const NAME_HEADER = /^(nama|name)\b/i;

/** Merapikan NIM agar pencocokan tidak gagal karena spasi atau apostrof Excel. */
export function normalizeNim(value: string): string {
  return value.replace(/[\s'"]/g, '').toUpperCase();
}

interface ColumnMapping {
  startRow: number;
  nimColumn: number;
  nameColumn: number;
}

/**
 * Menentukan baris awal data dan posisi kolom NIM/nama.
 *
 * Bila baris pertama memuat judul kolom yang dikenali, baris tersebut dilewati.
 * Tanpa judul, kolom A dianggap NIM dan kolom B nama.
 */
export function detectImportColumns(rows: string[][]): ColumnMapping {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim() !== ''));
  if (headerIndex < 0) return { startRow: 0, nimColumn: 0, nameColumn: 1 };

  const header = rows[headerIndex].map((cell) => cell.trim());
  const nimColumn = header.findIndex((cell) => NIM_HEADER.test(cell));
  if (nimColumn < 0) return { startRow: headerIndex, nimColumn: 0, nameColumn: 1 };

  const nameColumn = header.findIndex(
    (cell, index) => index !== nimColumn && NAME_HEADER.test(cell),
  );
  return { startRow: headerIndex + 1, nimColumn, nameColumn };
}

/** Menyusun laporan pencocokan baris impor terhadap mahasiswa ONE UNUSU. */
export function buildStudentImportReport(
  rows: string[][],
  knownStudents: readonly StudentRecord[],
  registeredStudents: readonly StudentRecord[] = [],
): StudentImportReport {
  const knownByNim = new Map<string, StudentRecord>();
  for (const student of knownStudents) {
    knownByNim.set(normalizeNim(student.nim), student);
  }

  const registeredNims = new Set(registeredStudents.map((student) => normalizeNim(student.nim)));
  const { startRow, nimColumn, nameColumn } = detectImportColumns(rows);

  const report: StudentImportReport = {
    matched: [],
    unmatched: [],
    alreadyRegistered: [],
    duplicateNims: [],
    rowsWithoutNim: 0,
  };

  const seen = new Set<string>();

  for (let index = startRow; index < rows.length; index += 1) {
    const row = rows[index];
    const nim = normalizeNim(row[nimColumn] ?? '');
    const name = nameColumn >= 0 ? (row[nameColumn] ?? '').trim() : '';

    if (!nim) {
      if (row.some((cell) => cell.trim() !== '')) report.rowsWithoutNim += 1;
      continue;
    }

    if (seen.has(nim)) {
      report.duplicateNims.push(nim);
      continue;
    }
    seen.add(nim);

    if (registeredNims.has(nim)) {
      report.alreadyRegistered.push(knownByNim.get(nim) ?? { nim, name: name || nim });
      continue;
    }

    const known = knownByNim.get(nim);
    if (known) {
      report.matched.push(known);
      continue;
    }

    report.unmatched.push({ nim, name });
  }

  return report;
}
