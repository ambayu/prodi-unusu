/**
 * Pembaca dan penulis berkas XLSX minimal tanpa dependensi pustaka spreadsheet.
 *
 * Berkas XLSX adalah arsip ZIP berisi beberapa dokumen XML. Modul ini hanya
 * menangani kebutuhan formulir admin: membuat satu lembar kerja berisi teks dan
 * membaca nilai sel dari lembar pertama berkas yang diunggah pengguna.
 */

/** Tabel CRC32 untuk kebutuhan header arsip ZIP. */
const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array): number {
  let checksum = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    checksum = (checksum >>> 8) ^ CRC_TABLE[(checksum ^ bytes[index]) & 0xff];
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

/** Satu berkas di dalam arsip XLSX. */
interface ZipFile {
  name: string;
  data: Uint8Array<ArrayBuffer>;
}

/** Menyusun arsip ZIP tanpa kompresi (metode stored) dari daftar berkas. */
function createZip(files: ZipFile[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const checksum = crc32(file.data);

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, file.data.length, true);
    localView.setUint32(22, file.data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, file.data.length, true);
    centralView.setUint32(24, file.data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    localParts.push(local, file.data);
    centralParts.push(central);
    offset += local.length + file.data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const archive = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  return archive;
}

/** Indeks kolom (0-based) dari referensi sel seperti `AB12`. */
function columnIndexFromRef(ref: string): number {
  let index = 0;
  for (const char of ref) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

/** Label kolom bergaya Excel dari indeks 0-based (`0` menjadi `A`). */
function columnLabelFromIndex(index: number): string {
  let label = '';
  let value = index;
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return label;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, '&');
}

function escapeXml(value: string): string {
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Membaca seluruh teks `<t>` di dalam satu `<si>` (mendukung rich text). */
function collectTextNodes(xml: string): string {
  const texts: string[] = [];
  const pattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    texts.push(decodeXmlEntities(match[1]));
  }
  return texts.join('');
}

/** Mengurai tabel string bersama (`xl/sharedStrings.xml`). */
export function parseSharedStrings(xml: string): string[] {
  const values: string[] = [];
  const pattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    values.push(collectTextNodes(match[1]));
  }
  return values;
}

/** Mengurai nilai sel dari XML lembar kerja menjadi matriks teks. */
export function parseSheetRows(xml: string, sharedStrings: string[] = []): string[][] {
  const rows: string[][] = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const cells: string[] = [];
    const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      const attributes = cellMatch[1];
      const inner = cellMatch[2] ?? '';
      const type = /t="([^"]+)"/.exec(attributes)?.[1] ?? 'n';
      const ref = /r="([A-Z]+)\d+"/.exec(attributes)?.[1];

      let value = '';
      if (type === 'inlineStr') {
        value = collectTextNodes(inner);
      } else {
        const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '';
        if (type === 's') {
          const sharedIndex = Number.parseInt(raw, 10);
          value = Number.isFinite(sharedIndex) ? (sharedStrings[sharedIndex] ?? '') : '';
        } else {
          value = decodeXmlEntities(raw);
        }
      }

      const column = ref ? columnIndexFromRef(ref) : cells.length;
      while (cells.length < column) cells.push('');
      cells[column] = value;
    }

    rows.push(cells);
  }

  return rows;
}

/** Mencari akhir direktori pusat arsip ZIP. */
function findEndOfCentralDirectory(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Peramban ini belum mendukung pembacaan XLSX terkompresi. Buka berkas di Excel lalu simpan ulang sebagai .xlsx.',
    );
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Membaca seluruh entri arsip ZIP ke peta nama berkas ke isinya. */
async function readZipEntries(
  buffer: ArrayBuffer,
): Promise<Map<string, Uint8Array<ArrayBuffer>>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const endOffset = findEndOfCentralDirectory(view);
  if (endOffset < 0) throw new Error('Berkas bukan arsip XLSX yang valid.');

  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  const entries = new Map<string, Uint8Array<ArrayBuffer>>();

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Struktur direktori XLSX rusak atau tidak lengkap.');
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.slice(dataStart, dataStart + compressedSize);

    entries.set(name, method === 0 ? raw : await inflateRaw(raw));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/** Memilih berkas lembar kerja pertama berdasarkan nomor terkecil. */
function pickFirstWorksheet(
  entries: Map<string, Uint8Array<ArrayBuffer>>,
): Uint8Array<ArrayBuffer> | null {
  let selected: { order: number; data: Uint8Array<ArrayBuffer> } | null = null;
  for (const [name, data] of entries) {
    const match = /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(name);
    if (!match) continue;
    const order = Number.parseInt(match[1], 10);
    if (!selected || order < selected.order) selected = { order, data };
  }
  return selected?.data ?? null;
}

/** Membaca nilai sel lembar pertama sebuah berkas `.xlsx`. */
export async function readXlsxRows(source: Blob): Promise<string[][]> {
  const entries = await readZipEntries(await source.arrayBuffer());
  const decoder = new TextDecoder();
  const sharedEntry = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedEntry ? parseSharedStrings(decoder.decode(sharedEntry)) : [];
  const worksheet = pickFirstWorksheet(entries);
  if (!worksheet) throw new Error('Berkas tidak memuat lembar kerja XLSX yang dikenali.');
  return parseSheetRows(decoder.decode(worksheet), sharedStrings);
}

export interface XlsxSheet {
  /** Nama tab lembar kerja (maksimal 31 karakter). */
  name: string;
  /** Baris teks; sel kosong ditulis sebagai string kosong. */
  rows: string[][];
}

function sanitizeSheetName(name: string): string {
  const clean = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return (clean || 'Sheet1').slice(0, 31);
}

/** Membuat berkas `.xlsx` satu lembar kerja siap unduh. */
export function createXlsxBlob(sheet: XlsxSheet): Blob {
  const encoder = new TextEncoder();
  const headers = '[Content_Types].xml';
  const rootRels = '_rels/.rels';
  const workbook = 'xl/workbook.xml';
  const workbookRels = 'xl/_rels/workbook.xml.rels';
  const styles = 'xl/styles.xml';
  const worksheetFile = 'xl/worksheets/sheet1.xml';

  const columnCount = sheet.rows.reduce((max, row) => Math.max(max, row.length), 1);

  const rowsXml = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnLabelFromIndex(columnIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  const files: ZipFile[] = [
    {
      name: headers,
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          '</Types>',
      ),
    },
    {
      name: rootRels,
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: workbook,
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${escapeXml(sanitizeSheetName(sheet.name))}" sheetId="1" r:id="rId1"/></sheets>` +
          '</workbook>',
      ),
    },
    {
      name: workbookRels,
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: styles,
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
          '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
          '</styleSheet>',
      ),
    },
    {
      name: worksheetFile,
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<sheetViews><sheetView workbookViewId="0">' +
          '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
          '</sheetView></sheetViews>' +
          `<cols><col min="1" max="${columnCount}" width="30" customWidth="1" style="1"/></cols>` +
          `<sheetData>${rowsXml}</sheetData>` +
          '</worksheet>',
      ),
    },
  ];

  return new Blob([createZip(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** Mengunduh berkas dari blob tanpa meninggalkan elemen di DOM. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  URL.revokeObjectURL(url);
}
