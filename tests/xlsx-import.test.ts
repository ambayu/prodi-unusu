import { describe, expect, it } from 'vitest';
import { createXlsxBlob, parseSheetRows, parseSharedStrings, readXlsxRows } from '../src/client/utils/xlsx';
import {
  buildStudentImportReport,
  detectImportColumns,
  normalizeNim,
} from '../src/client/utils/studentImport';

describe('parseSheetRows', () => {
  it('reads shared string cells and skips empty columns', () => {
    const shared = parseSharedStrings(
      '<sst><si><t>NIM</t></si><si><t>Nama Mahasiswa</t></si><si><r><t>ABD</t></r><r><t>UL</t></r></si></sst>',
    );
    const xml =
      '<worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
      '<row r="2"><c r="A2"><v>217107064</v></c><c r="B2" t="s"><v>2</v></c></row>' +
      '<row r="3"><c r="C3" t="inlineStr"><is><t>Tanpa NIM</t></is></c></row>' +
      '</sheetData></worksheet>';

    expect(parseSheetRows(xml, shared)).toEqual([
      ['NIM', 'Nama Mahasiswa'],
      ['217107064', 'ABDUL'],
      ['', '', 'Tanpa NIM'],
    ]);
  });

  it('decodes xml entities in cell values', () => {
    const xml =
      '<worksheet><sheetData><row r="1">' +
      '<c r="A1" t="inlineStr"><is><t>Studi &amp; Praktik</t></is></c>' +
      '</row></sheetData></worksheet>';

    expect(parseSheetRows(xml)).toEqual([['Studi & Praktik']]);
  });
});

describe('normalizeNim', () => {
  it('removes whitespace and apostrophes', () => {
    expect(normalizeNim(" 217 107 064 '")).toBe('217107064');
  });
});

describe('detectImportColumns', () => {
  it('uses the header row when NIM column exists', () => {
    expect(detectImportColumns([['No', 'Nama', 'NIM']])).toEqual({
      startRow: 1,
      nimColumn: 2,
      nameColumn: 1,
    });
  });

  it('treats the first row as data when no header is present', () => {
    expect(detectImportColumns([['217107064', 'ABDUL HADI']])).toEqual({
      startRow: 0,
      nimColumn: 0,
      nameColumn: 1,
    });
  });

  it('skips leading blank rows', () => {
    expect(detectImportColumns([[], ['', ''], ['NIM', 'Nama Mahasiswa']])).toEqual({
      startRow: 3,
      nimColumn: 0,
      nameColumn: 1,
    });
  });
});

describe('buildStudentImportReport', () => {
  const known = [
    { nim: '217107064', name: 'ABD. HUSEIN SIREGAR' },
    { nim: '322107064', name: 'ABDIEL BOBI CHAHYADI GINTING' },
    { nim: '120109001', name: 'ABDUL HADI HARAHAP' },
  ];

  it('separates matched, registered, duplicate, and unknown NIMs', () => {
    const report = buildStudentImportReport(
      [
        ['NIM', 'Nama Mahasiswa'],
        ['217107064', 'Husein'],
        ['322107064', 'Abdiel'],
        ['999999999', 'Nama Tidak Ada'],
        ['217107064', 'Duplikat'],
        ['', ''],
        ['120109001', 'Abdul Hadi'],
        ['abc', 'NIM Salah'],
      ],
      known,
      [known[2]],
    );

    expect(report.matched).toEqual([known[0], known[1]]);
    expect(report.alreadyRegistered).toEqual([known[2]]);
    expect(report.unmatched).toEqual([
      { nim: '999999999', name: 'Nama Tidak Ada' },
      { nim: 'ABC', name: 'NIM Salah' },
    ]);
    expect(report.duplicateNims).toEqual(['217107064']);
    expect(report.rowsWithoutNim).toBe(0);
  });

  it('counts rows with other content but no NIM', () => {
    const report = buildStudentImportReport(
      [
        ['NIM', 'Nama Mahasiswa'],
        ['', 'Tanpa NIM'],
      ],
      known,
    );

    expect(report.rowsWithoutNim).toBe(1);
    expect(report.matched).toHaveLength(0);
  });
});

describe('createXlsxBlob', () => {
  it('produces a readable workbook with the requested rows', async () => {
    const blob = createXlsxBlob({
      name: 'Peserta',
      rows: [
        ['NIM', 'Nama Mahasiswa'],
        ['217107064', 'ABD. HUSEIN SIREGAR'],
      ],
    });

    await expect(readXlsxRows(blob)).resolves.toEqual([
      ['NIM', 'Nama Mahasiswa'],
      ['217107064', 'ABD. HUSEIN SIREGAR'],
    ]);
  });
});
