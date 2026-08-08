import { parseCsv, type CsvDelimiter, type CsvDelimiterOption } from "./csv";

export const MARKDOWN_TABLE_ROW_LIMIT = 100;
export const MARKDOWN_TABLE_COLUMN_LIMIT = 20;
export const MARKDOWN_TABLE_CELL_CHARACTER_LIMIT = 1_000;
export const MARKDOWN_TABLE_IMPORT_CHARACTER_LIMIT = 100_000;

export type MarkdownTableAlignment = "default" | "left" | "center" | "right";

export type MarkdownTableData = {
  headers: string[];
  rows: string[][];
  alignments: MarkdownTableAlignment[];
};

export type ImportedMarkdownTable = MarkdownTableData & {
  delimiter: CsvDelimiter;
  importedRowCount: number;
};

function assertCell(value: string, rowIndex: number, columnIndex: number): void {
  if (value.length > MARKDOWN_TABLE_CELL_CHARACTER_LIMIT) {
    throw new Error(`แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1} ยาวเกิน ${MARKDOWN_TABLE_CELL_CHARACTER_LIMIT.toLocaleString("en-US")} ตัวอักษร`);
  }
}

export function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", "<br>");
}

function alignmentToken(alignment: MarkdownTableAlignment, width: number): string {
  const tokenWidth = Math.max(width, alignment === "center" ? 5 : alignment === "default" ? 3 : 4);
  if (alignment === "left") return `:${"-".repeat(tokenWidth - 1)}`;
  if (alignment === "center") return `:${"-".repeat(tokenWidth - 2)}:`;
  if (alignment === "right") return `${"-".repeat(tokenWidth - 1)}:`;
  return "-".repeat(tokenWidth);
}

function tableColumnCount(data: MarkdownTableData): number {
  return Math.max(data.headers.length, data.alignments.length, ...data.rows.map((row) => row.length), 0);
}

export function createMarkdownTable(data: MarkdownTableData): string {
  const columnCount = tableColumnCount(data);
  if (columnCount < 1) throw new Error("ตารางต้องมีอย่างน้อย 1 คอลัมน์");
  if (columnCount > MARKDOWN_TABLE_COLUMN_LIMIT) throw new Error(`ตารางมีได้ไม่เกิน ${MARKDOWN_TABLE_COLUMN_LIMIT} คอลัมน์`);
  if (data.rows.length > MARKDOWN_TABLE_ROW_LIMIT) throw new Error(`ตารางมีข้อมูลได้ไม่เกิน ${MARKDOWN_TABLE_ROW_LIMIT} แถว`);

  const alignments = Array.from({ length: columnCount }, (_, index) => data.alignments[index] ?? "default");
  const headers = Array.from({ length: columnCount }, (_, index) => {
    const value = data.headers[index] ?? "";
    assertCell(value, 0, index);
    return escapeMarkdownTableCell(value.trim() || `คอลัมน์ ${index + 1}`);
  });
  const rows = data.rows.map((row, rowIndex) => Array.from({ length: columnCount }, (_, columnIndex) => {
    const value = row[columnIndex] ?? "";
    assertCell(value, rowIndex + 1, columnIndex);
    return escapeMarkdownTableCell(value);
  }));
  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const alignmentMinimum = alignments[columnIndex] === "center" ? 5 : alignments[columnIndex] === "default" ? 3 : 4;
    return Math.max(alignmentMinimum, headers[columnIndex]!.length, ...rows.map((row) => row[columnIndex]!.length));
  });
  const formatRow = (cells: string[]) => `| ${cells.map((cell, index) => cell.padEnd(widths[index]!)).join(" | ")} |`;
  const delimiterRow = alignments.map((alignment, index) => alignmentToken(alignment, widths[index]!));

  return [formatRow(headers), formatRow(delimiterRow), ...rows.map(formatRow)].join("\n");
}

export function importDelimitedMarkdownTable(
  text: string,
  firstRowIsHeader = true,
  delimiterOption: CsvDelimiterOption = "auto",
): ImportedMarkdownTable {
  if (text.length > MARKDOWN_TABLE_IMPORT_CHARACTER_LIMIT) {
    throw new Error(`ข้อความนำเข้าต้องไม่เกิน ${MARKDOWN_TABLE_IMPORT_CHARACTER_LIMIT.toLocaleString("en-US")} ตัวอักษร`);
  }
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""), delimiterOption);
  if (parsed.columnCount > MARKDOWN_TABLE_COLUMN_LIMIT) {
    throw new Error(`ข้อมูลนำเข้ามี ${parsed.columnCount} คอลัมน์ แต่ตัวแก้ไขรองรับไม่เกิน ${MARKDOWN_TABLE_COLUMN_LIMIT} คอลัมน์`);
  }
  const importedRows = firstRowIsHeader ? parsed.rows.slice(1) : parsed.rows;
  if (importedRows.length > MARKDOWN_TABLE_ROW_LIMIT) {
    throw new Error(`ข้อมูลนำเข้ามี ${importedRows.length} แถว แต่ตัวแก้ไขรองรับไม่เกิน ${MARKDOWN_TABLE_ROW_LIMIT} แถว`);
  }
  const normalizeRow = (row: string[]) => Array.from({ length: parsed.columnCount }, (_, index) => row[index] ?? "");
  const headers = firstRowIsHeader
    ? normalizeRow(parsed.rows[0]!)
    : Array.from({ length: parsed.columnCount }, (_, index) => `คอลัมน์ ${index + 1}`);
  const rows = importedRows.map(normalizeRow);

  headers.forEach((value, columnIndex) => assertCell(value, 0, columnIndex));
  rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => assertCell(value, rowIndex + 1, columnIndex)));
  return {
    headers,
    rows,
    alignments: Array.from({ length: parsed.columnCount }, () => "default" as const),
    delimiter: parsed.delimiter,
    importedRowCount: importedRows.length,
  };
}
