import { strToU8, zipSync } from "fflate";

export const CSV_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const CSV_ROW_LIMIT = 50_000;
export const CSV_COLUMN_LIMIT = 200;
export const CSV_CELL_LIMIT = 500_000;
export const CSV_CELL_CHARACTER_LIMIT = 32_767;
export const CSV_PREVIEW_ROW_LIMIT = 12;
export const CSV_PREVIEW_COLUMN_LIMIT = 8;

export type CsvEncoding = "utf-8" | "windows-874";
export type CsvDelimiterOption = "auto" | "comma" | "tab" | "semicolon" | "pipe";
export type CsvDelimiter = "," | "\t" | ";" | "|";

export type CsvParseResult = {
  rows: string[][];
  delimiter: CsvDelimiter;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  raggedRowCount: number;
  blankRowCount: number;
};

export type CsvWorkbookOptions = {
  sheetName: string;
  firstRowIsHeader: boolean;
  detectNumbers: boolean;
};

const DELIMITER_BY_OPTION: Record<Exclude<CsvDelimiterOption, "auto">, CsvDelimiter> = {
  comma: ",",
  tab: "\t",
  semicolon: ";",
  pipe: "|",
};

const DELIMITER_CANDIDATES: CsvDelimiter[] = [",", "\t", ";", "|"];

function assertCellLength(value: string, rowIndex: number, columnIndex: number) {
  if (value.length > CSV_CELL_CHARACTER_LIMIT) {
    throw new Error(`แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1} ยาวเกิน ${CSV_CELL_CHARACTER_LIMIT.toLocaleString("en-US")} ตัวอักษร ซึ่งเกินขีดจำกัดของ Excel`);
  }
}

function delimiterScore(text: string, delimiter: CsvDelimiter): number {
  const columnCounts: number[] = [];
  let columns = 1;
  let hasContent = false;
  let inQuotes = false;

  for (let index = 0; index < text.length && columnCounts.length < 32; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
      hasContent = true;
      continue;
    }
    if (!inQuotes && character === delimiter) {
      columns += 1;
      continue;
    }
    if (!inQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      if (hasContent || columns > 1) columnCounts.push(columns);
      columns = 1;
      hasContent = false;
      continue;
    }
    if (!/\s/.test(character)) hasContent = true;
  }
  if ((hasContent || columns > 1) && columnCounts.length < 32) columnCounts.push(columns);
  const multiColumnRows = columnCounts.filter((count) => count > 1);
  if (!multiColumnRows.length) return 0;

  const frequencies = new Map<number, number>();
  multiColumnRows.forEach((count) => frequencies.set(count, (frequencies.get(count) ?? 0) + 1));
  const [modeColumns, modeFrequency] = [...frequencies.entries()].sort((left, right) => right[1] - left[1] || right[0] - left[0])[0]!;
  const consistency = modeFrequency / multiColumnRows.length;
  return consistency * 10_000 + modeFrequency * 100 + Math.min(modeColumns, 99);
}

export function detectCsvDelimiter(text: string): CsvDelimiter {
  const sample = text.slice(0, 128 * 1024);
  let best = DELIMITER_CANDIDATES[0]!;
  let bestScore = -1;
  for (const candidate of DELIMITER_CANDIDATES) {
    const score = delimiterScore(sample, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function decodeCsvBytes(bytes: Uint8Array, encoding: CsvEncoding): string {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    throw new Error(encoding === "windows-874" ? "Browser นี้ไม่รองรับการอ่านรหัสภาษาไทย Windows-874" : "ไม่สามารถอ่านไฟล์ UTF-8 ได้");
  }
}

export function parseCsv(text: string, delimiterOption: CsvDelimiterOption = "auto"): CsvParseResult {
  if (!text.trim()) throw new Error("ไฟล์หรือข้อความ CSV ว่างเปล่า");
  const delimiter = delimiterOption === "auto" ? detectCsvDelimiter(text) : DELIMITER_BY_OPTION[delimiterOption];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowIndex = 0;

  const pushField = () => {
    assertCellLength(field, rowIndex, row.length);
    row.push(field);
    field = "";
    if (row.length > CSV_COLUMN_LIMIT) throw new Error(`พบคอลัมน์เกินขีดจำกัด ${CSV_COLUMN_LIMIT.toLocaleString("en-US")} คอลัมน์ต่อไฟล์`);
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
    rowIndex += 1;
    if (rows.length > CSV_ROW_LIMIT) throw new Error(`พบแถวเกินขีดจำกัด ${CSV_ROW_LIMIT.toLocaleString("en-US")} แถวต่อไฟล์`);
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === delimiter) {
      pushField();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      pushRow();
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error(`พบเครื่องหมายคำพูดที่ปิดไม่ครบใกล้แถว ${rowIndex + 1}`);
  if (field.length || row.length || !/[\r\n]$/.test(text)) pushRow();
  while (rows.length > 1 && rows.at(-1)?.every((value) => value === "")) rows.pop();
  if (!rows.length) throw new Error("ไม่พบข้อมูลใน CSV");

  const rowCount = rows.length;
  const columnCount = Math.max(...rows.map((item) => item.length));
  const cellCount = rows.reduce((sum, item) => sum + item.length, 0);
  if (cellCount > CSV_CELL_LIMIT) throw new Error(`พบเซลล์เกินขีดจำกัด ${CSV_CELL_LIMIT.toLocaleString("en-US")} เซลล์ต่อไฟล์`);
  return {
    rows,
    delimiter,
    rowCount,
    columnCount,
    cellCount,
    raggedRowCount: rows.filter((item) => item.length !== columnCount).length,
    blankRowCount: rows.filter((item) => item.every((value) => value === "")).length,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function safeSheetName(value: string): string {
  const cleaned = value.trim().replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").slice(0, 31);
  return cleaned || "ข้อมูล CSV";
}

function numericCellValue(value: string): string | null {
  const trimmed = value.trim();
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;
  const digits = trimmed.replace(/[^0-9]/g, "").replace(/^0+/, "");
  if (digits.length > 15) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : null;
}

function worksheetXml(parsed: CsvParseResult, options: CsvWorkbookOptions): string {
  const columnWidths = Array.from({ length: parsed.columnCount }, (_, columnIndex) => {
    let width = 8;
    for (let rowIndex = 0; rowIndex < Math.min(parsed.rows.length, 200); rowIndex += 1) {
      width = Math.max(width, Math.min(50, (parsed.rows[rowIndex]?.[columnIndex] ?? "").length + 2));
    }
    return `<col min="${columnIndex + 1}" max="${columnIndex + 1}" width="${width}" customWidth="1"/>`;
  }).join("");

  const sheetRows = parsed.rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      if (value === "") return "";
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      const numericValue = rowIndex > 0 || !options.firstRowIsHeader ? options.detectNumbers ? numericCellValue(value) : null : null;
      if (numericValue !== null) return `<c r="${reference}"><v>${numericValue}</v></c>`;
      const style = options.firstRowIsHeader && rowIndex === 0 ? ' s="1"' : "";
      return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  const lastReference = `${columnName(parsed.columnCount - 1)}${parsed.rowCount}`;
  const sheetView = options.firstRowIsHeader && parsed.rowCount > 1
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const autoFilter = options.firstRowIsHeader && parsed.columnCount > 0 ? `<autoFilter ref="A1:${lastReference}"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastReference}"/>${sheetView}<sheetFormatPr defaultRowHeight="15"/><cols>${columnWidths}</cols><sheetData>${sheetRows}</sheetData>${autoFilter}</worksheet>`;
}

export function createXlsxWorkbook(parsed: CsvParseResult, options: CsvWorkbookOptions): Uint8Array {
  if (!parsed.rows.length || !parsed.columnCount) throw new Error("ไม่พบข้อมูลสำหรับสร้าง Excel");
  const sheetName = safeSheetName(options.sheetName);
  const createdAt = new Date().toISOString();
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'),
    "_rels/.rels": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(parsed, options)),
    "xl/styles.xml": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FF315C45"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF4EC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Meaw Tools</dc:creator><cp:lastModifiedBy>Meaw Tools</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified></cp:coreProperties>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Meaw Tools</Application><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${escapeXml(sheetName)}</vt:lpstr></vt:vector></TitlesOfParts></Properties>`),
  };
  return zipSync(files, { level: 6 });
}

export function createCsvPreview(parsed: CsvParseResult): string[][] {
  return parsed.rows.slice(0, CSV_PREVIEW_ROW_LIMIT).map((row) => row.slice(0, CSV_PREVIEW_COLUMN_LIMIT));
}

export function sanitizeXlsxFilename(value: string): string {
  const base = value.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").trim().slice(0, 100) || "meaw-csv";
  return `${base}.xlsx`;
}
