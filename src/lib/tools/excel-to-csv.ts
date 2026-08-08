import { strToU8, zipSync } from "fflate";
import { protectSpreadsheetCell } from "./csv-cleaner";

export const EXCEL_TO_CSV_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const EXCEL_TO_CSV_SHEET_LIMIT = 50;
export const EXCEL_TO_CSV_ROW_LIMIT = 50_000;
export const EXCEL_TO_CSV_COLUMN_LIMIT = 200;
export const EXCEL_TO_CSV_CELL_LIMIT = 500_000;
export const EXCEL_TO_CSV_PREVIEW_ROW_LIMIT = 12;
export const EXCEL_TO_CSV_PREVIEW_COLUMN_LIMIT = 8;

export type ExcelCellValue = string | number | boolean | Date | null;
export type ExcelSheetData = ExcelCellValue[][];
export type ExcelCsvDelimiter = "comma" | "semicolon" | "tab" | "pipe";
export type ExcelCsvLineEnding = "crlf" | "lf";

export type ExcelCsvOptions = {
  delimiter: ExcelCsvDelimiter;
  lineEnding: ExcelCsvLineEnding;
  includeBom: boolean;
  quoteAll: boolean;
  protectSpreadsheetFormulas: boolean;
};

export type ExcelSheetSummary = {
  sheet: string;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  blankRowCount: number;
};

export type ExcelCsvResult = ExcelSheetSummary & {
  csv: string;
  protectedCellCount: number;
};

const DELIMITERS: Record<ExcelCsvDelimiter, string> = {
  comma: ",",
  semicolon: ";",
  tab: "\t",
  pipe: "|",
};

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatExcelCell(value: ExcelCellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const date = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
    const time = `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
    return time === "00:00:00" ? date : `${date}T${time}`;
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function escapeCsvValue(value: string, delimiter: string, quoteAll: boolean): string {
  const escaped = value.replaceAll('"', '""');
  return quoteAll || value.includes(delimiter) || /["\r\n]/.test(value) ? `"${escaped}"` : escaped;
}

export function summarizeExcelSheet(sheet: string, data: ExcelSheetData): ExcelSheetSummary {
  const columnCount = data.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  return {
    sheet,
    rowCount: data.length,
    columnCount,
    cellCount: data.reduce((total, row) => total + row.length, 0),
    blankRowCount: data.filter((row) => row.every((value) => value === null || formatExcelCell(value) === "")).length,
  };
}

export function validateExcelWorkbook(sheets: Array<{ sheet: string; data: ExcelSheetData }>): ExcelSheetSummary[] {
  if (!sheets.length) throw new Error("ไม่พบ Worksheet ในไฟล์ Excel");
  if (sheets.length > EXCEL_TO_CSV_SHEET_LIMIT) throw new Error(`รองรับไม่เกิน ${EXCEL_TO_CSV_SHEET_LIMIT} Worksheet ต่อไฟล์`);
  const summaries = sheets.map(({ sheet, data }) => summarizeExcelSheet(sheet, data));
  if (!summaries.some((summary) => summary.cellCount > 0)) throw new Error("ไม่พบข้อมูลใน Worksheet ของไฟล์ Excel");
  for (const summary of summaries) {
    if (summary.rowCount > EXCEL_TO_CSV_ROW_LIMIT) throw new Error(`Worksheet “${summary.sheet}” มีเกิน ${EXCEL_TO_CSV_ROW_LIMIT.toLocaleString("en-US")} แถว`);
    if (summary.columnCount > EXCEL_TO_CSV_COLUMN_LIMIT) throw new Error(`Worksheet “${summary.sheet}” มีเกิน ${EXCEL_TO_CSV_COLUMN_LIMIT} คอลัมน์`);
  }
  const totalCells = summaries.reduce((total, summary) => total + summary.cellCount, 0);
  if (totalCells > EXCEL_TO_CSV_CELL_LIMIT) throw new Error(`Workbook มีเกิน ${EXCEL_TO_CSV_CELL_LIMIT.toLocaleString("en-US")} เซลล์`);
  return summaries;
}

export function createExcelCsv(sheet: string, data: ExcelSheetData, options: ExcelCsvOptions): ExcelCsvResult {
  const summary = summarizeExcelSheet(sheet, data);
  const delimiter = DELIMITERS[options.delimiter];
  const lineEnding = options.lineEnding === "crlf" ? "\r\n" : "\n";
  let protectedCellCount = 0;
  const rows = data.map((row) => Array.from({ length: summary.columnCount }, (_, columnIndex) => {
    const formatted = formatExcelCell(row[columnIndex] ?? null);
    if (!options.protectSpreadsheetFormulas) return escapeCsvValue(formatted, delimiter, options.quoteAll);
    const protectedCell = protectSpreadsheetCell(formatted);
    if (protectedCell.protected) protectedCellCount += 1;
    return escapeCsvValue(protectedCell.value, delimiter, options.quoteAll);
  }).join(delimiter));
  const csv = `${options.includeBom ? "\uFEFF" : ""}${rows.join(lineEnding)}`;
  return { ...summary, csv, protectedCellCount };
}

function safeFilenamePart(value: string, fallback: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

export function sanitizeExcelCsvBaseName(filename: string): string {
  return safeFilenamePart(filename.replace(/\.xlsx$/i, ""), "meaw-excel");
}

export function createExcelCsvFilename(sourceName: string, sheetName: string, includeSheetName: boolean): string {
  const base = sanitizeExcelCsvBaseName(sourceName);
  return `${base}${includeSheetName ? `-${safeFilenamePart(sheetName, "sheet")}` : ""}.csv`;
}

export function createExcelCsvArchive(
  sourceName: string,
  sheets: Array<{ sheet: string; data: ExcelSheetData }>,
  options: ExcelCsvOptions,
): { bytes: Uint8Array; filename: string; protectedCellCount: number } {
  validateExcelWorkbook(sheets);
  const files: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();
  let protectedCellCount = 0;
  for (const item of sheets) {
    const result = createExcelCsv(item.sheet, item.data, options);
    protectedCellCount += result.protectedCellCount;
    const baseName = createExcelCsvFilename(sourceName, item.sheet, true).replace(/\.csv$/i, "");
    let candidate = `${baseName}.csv`;
    let suffix = 2;
    while (usedNames.has(candidate.toLocaleLowerCase("en-US"))) {
      candidate = `${baseName}-${suffix}.csv`;
      suffix += 1;
    }
    usedNames.add(candidate.toLocaleLowerCase("en-US"));
    files[candidate] = strToU8(result.csv);
  }
  return {
    bytes: zipSync(files, { level: 6 }),
    filename: `${sanitizeExcelCsvBaseName(sourceName)}-csv.zip`,
    protectedCellCount,
  };
}

export function createExcelCsvPreview(data: ExcelSheetData): string[][] {
  return data.slice(0, EXCEL_TO_CSV_PREVIEW_ROW_LIMIT).map((row) =>
    row.slice(0, EXCEL_TO_CSV_PREVIEW_COLUMN_LIMIT).map((value) => formatExcelCell(value)),
  );
}
