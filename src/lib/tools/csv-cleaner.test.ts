import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import {
  cleanCsv,
  createUtf8CsvBytes,
  getCsvCleanerColumns,
  sanitizeCleanCsvFilename,
  serializeCsv,
  type CsvCleanerOptions,
} from "./csv-cleaner";

const defaults: CsvCleanerOptions = {
  firstRowIsHeader: true,
  trimCells: true,
  removeBlankRows: true,
  duplicateColumns: [],
  caseSensitive: true,
  ignoreBlankDuplicateKeys: true,
  removeDuplicates: true,
  keepDuplicate: "first",
  protectSpreadsheetFormulas: true,
};

describe("CSV cleaner", () => {
  it("trims cells, removes blank rows, and keeps the first exact duplicate", () => {
    const parsed = parseCsv("id,name\r\n 001 , Mali \r\n\r\n001,Mali\r\n002,Somchai");
    const result = cleanCsv(parsed, defaults);

    expect(result.rows).toEqual([
      ["id", "name"],
      ["001", "Mali"],
      ["002", "Somchai"],
    ]);
    expect(result.summary).toMatchObject({
      inputDataRowCount: 4,
      outputDataRowCount: 2,
      duplicateGroupCount: 1,
      duplicateRowCount: 1,
      removedDuplicateRowCount: 1,
      removedBlankRowCount: 1,
      trimmedCellCount: 2,
    });
  });

  it("finds duplicates by selected columns without collapsing blank keys", () => {
    const parsed = parseCsv("id,email,status\n1,A@EXAMPLE.COM,old\n2,a@example.com,new\n3,,draft\n4,,ready");
    const result = cleanCsv(parsed, {
      ...defaults,
      duplicateColumns: [1],
      caseSensitive: false,
      keepDuplicate: "last",
    });

    expect(result.rows).toEqual([
      ["id", "email", "status"],
      ["2", "a@example.com", "new"],
      ["3", "", "draft"],
      ["4", "", "ready"],
    ]);
    expect(result.summary.duplicateRowCount).toBe(1);
    expect(result.summary.selectedColumnCount).toBe(1);
  });

  it("can report duplicate rows without removing them", () => {
    const parsed = parseCsv("sku,name\nA,Cat\nA,Cat");
    const result = cleanCsv(parsed, { ...defaults, removeDuplicates: false });

    expect(result.rows).toHaveLength(3);
    expect(result.summary.duplicateRowCount).toBe(1);
    expect(result.summary.removedDuplicateRowCount).toBe(0);
  });

  it("protects spreadsheet formulas but keeps strict numeric literals", () => {
    const parsed = parseCsv("value\n=HYPERLINK(\"https://example.com\")\n-12.5\n@SUM(A1:A2)\n＋CMD");
    const result = cleanCsv(parsed, defaults);

    expect(result.rows.slice(1)).toEqual([
      ["\t=HYPERLINK(\"https://example.com\")"],
      ["-12.5"],
      ["\t@SUM(A1:A2)"],
      ["\t＋CMD"],
    ]);
    expect(result.summary.protectedCellCount).toBe(3);
  });

  it("serializes every field with RFC-style escaping and UTF-8 BOM", () => {
    const rows = [["id", "note"], ["001", "comma, quote \" and\nnewline"]];
    const output = serializeCsv(rows);
    expect(output).toBe('"id","note"\r\n"001","comma, quote "" and\nnewline"\r\n');

    const bytes = createUtf8CsvBytes(rows);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("builds safe column labels and filenames", () => {
    const parsed = parseCsv("id,,id\n1,a,x");
    expect(getCsvCleanerColumns(parsed, true)).toEqual([
      { index: 0, label: "id" },
      { index: 1, label: "คอลัมน์ 2" },
      { index: 2, label: "id" },
    ]);
    expect(sanitizeCleanCsvFilename("sales:august.csv")).toBe("sales-august-cleaned.csv");
    expect(sanitizeCleanCsvFilename(".csv")).toBe("meaw-csv-cleaned.csv");
  });

  it("rejects stale duplicate column selections", () => {
    const parsed = parseCsv("id,name\n1,Cat");
    expect(() => cleanCsv(parsed, { ...defaults, duplicateColumns: [2] })).toThrow(/วิเคราะห์ไฟล์อีกครั้ง/);
  });
});
