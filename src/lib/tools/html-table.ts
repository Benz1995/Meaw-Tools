import { parseCsv, type CsvDelimiter, type CsvDelimiterOption } from "./csv";

export const HTML_TABLE_ROW_LIMIT = 100;
export const HTML_TABLE_COLUMN_LIMIT = 20;
export const HTML_TABLE_CELL_CHARACTER_LIMIT = 1_000;
export const HTML_TABLE_IMPORT_CHARACTER_LIMIT = 100_000;

export type HtmlTableStylePreset = "clean" | "striped" | "minimal";
export type HtmlTableOutputMode = "css" | "inline" | "html-only";

export type HtmlTableCell = {
  value: string;
  colSpan: number;
  rowSpan: number;
  hidden: boolean;
};

export type HtmlTableData = {
  rows: HtmlTableCell[][];
};

export type HtmlTableOptions = {
  caption: string;
  headerRow: boolean;
  headerColumn: boolean;
  responsive: boolean;
  stylePreset: HtmlTableStylePreset;
  outputMode: HtmlTableOutputMode;
};

export type ImportedHtmlTable = {
  table: HtmlTableData;
  delimiter: CsvDelimiter;
  importedRowCount: number;
  columnCount: number;
};

export function createHtmlTableCell(value = ""): HtmlTableCell {
  return { value, colSpan: 1, rowSpan: 1, hidden: false };
}

export function createEmptyHtmlTable(rowCount = 3, columnCount = 3): HtmlTableData {
  if (rowCount < 1 || columnCount < 1) throw new Error("ตารางต้องมีอย่างน้อย 1 แถวและ 1 คอลัมน์");
  return {
    rows: Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => createHtmlTableCell())),
  };
}

function cloneTable(table: HtmlTableData): HtmlTableData {
  return { rows: table.rows.map((row) => row.map((cell) => ({ ...cell }))) };
}

function tableDimensions(table: HtmlTableData): { rowCount: number; columnCount: number } {
  return { rowCount: table.rows.length, columnCount: table.rows[0]?.length ?? 0 };
}

function assertCellValue(value: string, rowIndex: number, columnIndex: number): void {
  if (value.length > HTML_TABLE_CELL_CHARACTER_LIMIT) {
    throw new Error(`แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1} ยาวเกิน ${HTML_TABLE_CELL_CHARACTER_LIMIT.toLocaleString("en-US")} ตัวอักษร`);
  }
}

export function validateHtmlTable(table: HtmlTableData, options?: Pick<HtmlTableOptions, "headerRow">): void {
  const { rowCount, columnCount } = tableDimensions(table);
  if (rowCount < 1 || columnCount < 1) throw new Error("ตารางต้องมีอย่างน้อย 1 แถวและ 1 คอลัมน์");
  if (rowCount > HTML_TABLE_ROW_LIMIT) throw new Error(`ตารางมีได้ไม่เกิน ${HTML_TABLE_ROW_LIMIT} แถว`);
  if (columnCount > HTML_TABLE_COLUMN_LIMIT) throw new Error(`ตารางมีได้ไม่เกิน ${HTML_TABLE_COLUMN_LIMIT} คอลัมน์`);
  if (table.rows.some((row) => row.length !== columnCount)) throw new Error("ทุกแถวต้องมีจำนวนคอลัมน์เท่ากัน");

  const coverage = Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => 0));
  table.rows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    assertCellValue(cell.value, rowIndex, columnIndex);
    if (!Number.isInteger(cell.rowSpan) || !Number.isInteger(cell.colSpan) || cell.rowSpan < 1 || cell.colSpan < 1) {
      throw new Error(`rowspan และ colspan ของแถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1} ต้องเป็นจำนวนเต็มอย่างน้อย 1`);
    }
    if (cell.hidden) return;
    if (rowIndex + cell.rowSpan > rowCount || columnIndex + cell.colSpan > columnCount) {
      throw new Error(`เซลล์แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1} รวมเกินขอบตาราง`);
    }
    if (options?.headerRow && rowIndex === 0 && cell.rowSpan > 1) {
      throw new Error("หัวตารางใน thead ไม่ควรใช้ rowspan ข้ามไปยัง tbody");
    }
    for (let coveredRow = rowIndex; coveredRow < rowIndex + cell.rowSpan; coveredRow += 1) {
      const coverageRow = coverage[coveredRow]!;
      for (let coveredColumn = columnIndex; coveredColumn < columnIndex + cell.colSpan; coveredColumn += 1) {
        coverageRow[coveredColumn] = (coverageRow[coveredColumn] ?? 0) + 1;
      }
    }
  }));

  table.rows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    const count = coverage[rowIndex]![columnIndex];
    if (cell.hidden && count !== 1) throw new Error(`เซลล์ที่ซ่อนแถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1} ไม่ได้อยู่ในช่วงที่รวมอย่างถูกต้อง`);
    if (!cell.hidden && count !== 1) throw new Error(`ช่วงเซลล์ซ้อนกันที่แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1}`);
  }));
}

export function applyHtmlTableSpan(
  table: HtmlTableData,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  colSpan: number,
): HtmlTableData {
  validateHtmlTable(table);
  const { rowCount, columnCount } = tableDimensions(table);
  if (!Number.isInteger(rowSpan) || !Number.isInteger(colSpan) || rowSpan < 1 || colSpan < 1) throw new Error("rowspan และ colspan ต้องเป็นจำนวนเต็มอย่างน้อย 1");
  if (rowIndex < 0 || columnIndex < 0 || rowIndex >= rowCount || columnIndex >= columnCount) throw new Error("ไม่พบเซลล์ที่เลือก");
  if (rowIndex + rowSpan > rowCount || columnIndex + colSpan > columnCount) throw new Error("ช่วงที่รวมเกินขอบตาราง");

  const next = unmergeHtmlTableCell(table, rowIndex, columnIndex);
  for (let targetRow = rowIndex; targetRow < rowIndex + rowSpan; targetRow += 1) {
    for (let targetColumn = columnIndex; targetColumn < columnIndex + colSpan; targetColumn += 1) {
      const target = next.rows[targetRow]![targetColumn]!;
      if (target.hidden || target.rowSpan !== 1 || target.colSpan !== 1) throw new Error("ช่วงที่เลือกทับกับเซลล์ที่รวมอยู่แล้ว กรุณาแยกเซลล์เดิมก่อน");
    }
  }

  const anchor = next.rows[rowIndex]![columnIndex]!;
  anchor.rowSpan = rowSpan;
  anchor.colSpan = colSpan;
  for (let targetRow = rowIndex; targetRow < rowIndex + rowSpan; targetRow += 1) {
    for (let targetColumn = columnIndex; targetColumn < columnIndex + colSpan; targetColumn += 1) {
      if (targetRow !== rowIndex || targetColumn !== columnIndex) next.rows[targetRow]![targetColumn]!.hidden = true;
    }
  }
  validateHtmlTable(next);
  return next;
}

export function unmergeHtmlTableCell(table: HtmlTableData, rowIndex: number, columnIndex: number): HtmlTableData {
  const next = cloneTable(table);
  const anchor = next.rows[rowIndex]?.[columnIndex];
  if (!anchor) throw new Error("ไม่พบเซลล์ที่เลือก");
  if (anchor.hidden) throw new Error("กรุณาเลือกเซลล์หลักของช่วงที่รวม");
  const previousRowSpan = anchor.rowSpan;
  const previousColSpan = anchor.colSpan;
  anchor.rowSpan = 1;
  anchor.colSpan = 1;
  for (let targetRow = rowIndex; targetRow < rowIndex + previousRowSpan; targetRow += 1) {
    for (let targetColumn = columnIndex; targetColumn < columnIndex + previousColSpan; targetColumn += 1) {
      next.rows[targetRow]![targetColumn]!.hidden = false;
    }
  }
  return next;
}

export function flattenHtmlTableMerges(table: HtmlTableData): HtmlTableData {
  return {
    rows: table.rows.map((row) => row.map((cell) => ({ ...cell, colSpan: 1, rowSpan: 1, hidden: false }))),
  };
}

function escapeHtml(value: string, attribute = false): string {
  const escaped = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return attribute ? escaped.replaceAll('"', "&quot;").replaceAll("'", "&#39;") : escaped;
}

export function escapeHtmlTableCell(value: string): string {
  return escapeHtml(value).replace(/\r\n?/g, "\n").replaceAll("\n", "<br>\n");
}

function classStyles(): string {
  return `<style>
.meaw-table-scroll {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.meaw-table {
  width: 100%;
  border-collapse: collapse;
  color: #2f2925;
  font-family: system-ui, sans-serif;
  font-size: 0.95rem;
  line-height: 1.5;
}
.meaw-table caption {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  text-align: left;
}
.meaw-table th,
.meaw-table td {
  padding: 0.65rem 0.8rem;
  text-align: left;
  vertical-align: top;
}
.meaw-table th {
  background: #edf5ee;
  font-weight: 700;
}
.meaw-table--clean th,
.meaw-table--clean td,
.meaw-table--striped th,
.meaw-table--striped td {
  border: 1px solid #d8ded8;
}
.meaw-table--striped tbody tr:nth-child(even) {
  background: #f8faf8;
}
.meaw-table--minimal th,
.meaw-table--minimal td {
  border-bottom: 1px solid #d8ded8;
}
</style>`;
}

function inlineStyles(preset: HtmlTableStylePreset, rowIndex: number, isHeader: boolean): { table: string; caption: string; cell: string } {
  const table = "width:100%;border-collapse:collapse;color:#2f2925;font-family:system-ui,sans-serif;font-size:0.95rem;line-height:1.5";
  const caption = "margin-bottom:0.75rem;font-size:1rem;font-weight:700;text-align:left";
  const border = preset === "minimal" ? "border-bottom:1px solid #d8ded8" : "border:1px solid #d8ded8";
  const stripe = preset === "striped" && rowIndex % 2 === 0 && !isHeader ? "background:#f8faf8;" : "";
  const header = isHeader ? "background:#edf5ee;font-weight:700;" : "";
  return { table, caption, cell: `${stripe}${header}${border};padding:0.65rem 0.8rem;text-align:left;vertical-align:top` };
}

function createTableMarkup(table: HtmlTableData, options: HtmlTableOptions): string {
  validateHtmlTable(table, options);
  const classAttribute = options.outputMode === "css" ? ` class="meaw-table meaw-table--${options.stylePreset}"` : "";
  const tableStyle = options.outputMode === "inline" ? ` style="${inlineStyles(options.stylePreset, 0, false).table}"` : "";
  const caption = options.caption.trim()
    ? `\n  <caption${options.outputMode === "inline" ? ` style="${inlineStyles(options.stylePreset, 0, false).caption}"` : ""}>${escapeHtmlTableCell(options.caption.trim())}</caption>`
    : "";

  const rowMarkup = (row: HtmlTableCell[], rowIndex: number) => {
    const cells = row.flatMap((cell, columnIndex) => {
      if (cell.hidden) return [];
      const columnHeader = options.headerRow && rowIndex === 0;
      const rowHeader = options.headerColumn && columnIndex === 0 && !columnHeader;
      const isHeader = columnHeader || rowHeader;
      const tag = isHeader ? "th" : "td";
      const spanAttributes = `${cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ""}${cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ""}`;
      const scope = columnHeader
        ? ` scope="${cell.colSpan > 1 ? "colgroup" : "col"}"`
        : rowHeader ? ` scope="${cell.rowSpan > 1 ? "rowgroup" : "row"}"` : "";
      const inlineStyle = options.outputMode === "inline" ? ` style="${inlineStyles(options.stylePreset, rowIndex, isHeader).cell}"` : "";
      return `      <${tag}${scope}${spanAttributes}${inlineStyle}>${escapeHtmlTableCell(cell.value)}</${tag}>`;
    });
    return `    <tr>\n${cells.join("\n")}\n    </tr>`;
  };

  const sections: string[] = [];
  if (options.headerRow) sections.push(`  <thead>\n${rowMarkup(table.rows[0]!, 0)}\n  </thead>`);
  const bodyRows = options.headerRow ? table.rows.slice(1) : table.rows;
  const bodyOffset = options.headerRow ? 1 : 0;
  sections.push(`  <tbody>\n${bodyRows.map((row, index) => rowMarkup(row, index + bodyOffset)).join("\n")}\n  </tbody>`);
  return `<table${classAttribute}${tableStyle}>${caption}\n${sections.join("\n")}\n</table>`;
}

export function createHtmlTable(table: HtmlTableData, options: HtmlTableOptions): string {
  const tableMarkup = createTableMarkup(table, options);
  const label = escapeHtml(options.caption.trim() || "ตารางข้อมูล", true);
  const wrapped = options.responsive && options.outputMode !== "html-only"
    ? `<div class="meaw-table-scroll" role="region" aria-label="เลื่อนดูตาราง: ${label}" tabindex="0"${options.outputMode === "inline" ? ' style="max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch"' : ""}>\n${tableMarkup.split("\n").map((line) => `  ${line}`).join("\n")}\n</div>`
    : tableMarkup;
  return options.outputMode === "css" ? `${classStyles()}\n\n${wrapped}` : wrapped;
}

export function createStandaloneHtmlTablePage(table: HtmlTableData, options: HtmlTableOptions): string {
  const title = escapeHtml(options.caption.trim() || "ตารางข้อมูล");
  const snippet = createHtmlTable(table, options);
  const style = options.outputMode === "css" ? classStyles() : "";
  const bodyMarkup = style ? snippet.slice(`${style}\n\n`.length) : snippet;
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
${style ? style.split("\n").map((line) => `  ${line}`).join("\n") : ""}
</head>
<body>
${bodyMarkup}
</body>
</html>`;
}

export function importDelimitedHtmlTable(
  text: string,
  delimiterOption: CsvDelimiterOption = "auto",
): ImportedHtmlTable {
  if (text.length > HTML_TABLE_IMPORT_CHARACTER_LIMIT) throw new Error(`ข้อความนำเข้าต้องไม่เกิน ${HTML_TABLE_IMPORT_CHARACTER_LIMIT.toLocaleString("en-US")} ตัวอักษร`);
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""), delimiterOption);
  if (parsed.rows.length > HTML_TABLE_ROW_LIMIT) throw new Error(`ข้อมูลนำเข้ามี ${parsed.rows.length} แถว แต่รองรับไม่เกิน ${HTML_TABLE_ROW_LIMIT} แถว`);
  if (parsed.columnCount > HTML_TABLE_COLUMN_LIMIT) throw new Error(`ข้อมูลนำเข้ามี ${parsed.columnCount} คอลัมน์ แต่รองรับไม่เกิน ${HTML_TABLE_COLUMN_LIMIT} คอลัมน์`);
  const rows = parsed.rows.map((row, rowIndex) => Array.from({ length: parsed.columnCount }, (_, columnIndex) => {
    const value = row[columnIndex] ?? "";
    assertCellValue(value, rowIndex, columnIndex);
    return createHtmlTableCell(value);
  }));
  const table = { rows };
  validateHtmlTable(table);
  return { table, delimiter: parsed.delimiter, importedRowCount: rows.length, columnCount: parsed.columnCount };
}
