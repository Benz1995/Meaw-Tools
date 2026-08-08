import {
  CSV_PREVIEW_COLUMN_LIMIT,
  CSV_PREVIEW_ROW_LIMIT,
  type CsvParseResult,
} from "./csv";

export type CsvDuplicateRetention = "first" | "last";

export type CsvCleanerOptions = {
  firstRowIsHeader: boolean;
  trimCells: boolean;
  removeBlankRows: boolean;
  duplicateColumns: number[];
  caseSensitive: boolean;
  ignoreBlankDuplicateKeys: boolean;
  removeDuplicates: boolean;
  keepDuplicate: CsvDuplicateRetention;
  protectSpreadsheetFormulas: boolean;
};

export type CsvCleanerSummary = {
  inputRowCount: number;
  inputDataRowCount: number;
  outputRowCount: number;
  outputDataRowCount: number;
  duplicateGroupCount: number;
  duplicateRowCount: number;
  removedDuplicateRowCount: number;
  removedBlankRowCount: number;
  trimmedCellCount: number;
  protectedCellCount: number;
  raggedRowCount: number;
  selectedColumnCount: number;
};

export type CsvCleanerResult = {
  rows: string[][];
  summary: CsvCleanerSummary;
};

const NUMERIC_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@＝＋－＠]/;

function normalizedDuplicateValue(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLowerCase();
}

function protectSpreadsheetCell(value: string): { value: string; protected: boolean } {
  const candidate = value.trimStart();
  if (!FORMULA_PREFIX.test(value) || NUMERIC_LITERAL.test(candidate)) return { value, protected: false };
  return { value: `\t${value}`, protected: true };
}

function selectedColumns(options: CsvCleanerOptions, columnCount: number): number[] {
  const requested = options.duplicateColumns.length
    ? [...new Set(options.duplicateColumns)]
    : Array.from({ length: columnCount }, (_, index) => index);
  if (requested.some((index) => !Number.isInteger(index) || index < 0 || index >= columnCount)) {
    throw new Error("คอลัมน์สำหรับตรวจข้อมูลซ้ำไม่ถูกต้อง กรุณาวิเคราะห์ไฟล์อีกครั้ง");
  }
  return requested.sort((left, right) => left - right);
}

export function getCsvCleanerColumns(parsed: CsvParseResult, firstRowIsHeader: boolean): Array<{ index: number; label: string }> {
  const header = firstRowIsHeader ? parsed.rows[0] ?? [] : [];
  return Array.from({ length: parsed.columnCount }, (_, index) => ({
    index,
    label: header[index]?.trim() || `คอลัมน์ ${index + 1}`,
  }));
}

export function cleanCsv(parsed: CsvParseResult, options: CsvCleanerOptions): CsvCleanerResult {
  const duplicateColumns = selectedColumns(options, parsed.columnCount);
  const headerOffset = options.firstRowIsHeader && parsed.rows.length ? 1 : 0;
  let trimmedCellCount = 0;

  const normalizedRows = parsed.rows.map((row) => row.map((cell) => {
    if (!options.trimCells) return cell;
    const trimmed = cell.trim();
    if (trimmed !== cell) trimmedCellCount += 1;
    return trimmed;
  }));

  const headerRows = normalizedRows.slice(0, headerOffset);
  const sourceDataRows = normalizedRows.slice(headerOffset);
  let removedBlankRowCount = 0;
  const dataRows = sourceDataRows.filter((row) => {
    const blank = row.every((value) => value.trim() === "");
    if (options.removeBlankRows && blank) {
      removedBlankRowCount += 1;
      return false;
    }
    return true;
  });

  const keyFor = (row: string[]): string | null => {
    const values = duplicateColumns.map((columnIndex) => row[columnIndex] ?? "");
    if (options.ignoreBlankDuplicateKeys && values.every((value) => value.trim() === "")) return null;
    return JSON.stringify(values.map((value) => normalizedDuplicateValue(value, options.caseSensitive)));
  };

  const keyCounts = new Map<string, number>();
  dataRows.forEach((row) => {
    const key = keyFor(row);
    if (key !== null) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  });
  const duplicateGroupCount = [...keyCounts.values()].filter((count) => count > 1).length;
  const duplicateRowCount = [...keyCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);

  let outputDataRows = dataRows;
  if (options.removeDuplicates && duplicateRowCount > 0) {
    if (options.keepDuplicate === "first") {
      const seen = new Set<string>();
      outputDataRows = dataRows.filter((row) => {
        const key = keyFor(row);
        if (key === null) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else {
      const lastIndexByKey = new Map<string, number>();
      dataRows.forEach((row, index) => {
        const key = keyFor(row);
        if (key !== null) lastIndexByKey.set(key, index);
      });
      outputDataRows = dataRows.filter((row, index) => {
        const key = keyFor(row);
        return key === null || lastIndexByKey.get(key) === index;
      });
    }
  }

  let protectedCellCount = 0;
  const rows = [...headerRows, ...outputDataRows].map((row) => row.map((cell) => {
    if (!options.protectSpreadsheetFormulas) return cell;
    const protectedCell = protectSpreadsheetCell(cell);
    if (protectedCell.protected) protectedCellCount += 1;
    return protectedCell.value;
  }));

  return {
    rows,
    summary: {
      inputRowCount: parsed.rowCount,
      inputDataRowCount: sourceDataRows.length,
      outputRowCount: rows.length,
      outputDataRowCount: outputDataRows.length,
      duplicateGroupCount,
      duplicateRowCount,
      removedDuplicateRowCount: options.removeDuplicates ? duplicateRowCount : 0,
      removedBlankRowCount,
      trimmedCellCount,
      protectedCellCount,
      raggedRowCount: parsed.raggedRowCount,
      selectedColumnCount: duplicateColumns.length,
    },
  };
}

export function createCleanCsvPreview(result: CsvCleanerResult): string[][] {
  return result.rows
    .slice(0, CSV_PREVIEW_ROW_LIMIT)
    .map((row) => row.slice(0, CSV_PREVIEW_COLUMN_LIMIT));
}

export function serializeCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\r\n") + "\r\n";
}

export function createUtf8CsvBytes(rows: string[][]): Uint8Array {
  return new TextEncoder().encode(`\uFEFF${serializeCsv(rows)}`);
}

export function sanitizeCleanCsvFilename(value: string): string {
  const base = value
    .replace(/\.[^.]+$/, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .trim()
    .slice(0, 92) || "meaw-csv";
  return `${base}-cleaned.csv`;
}
