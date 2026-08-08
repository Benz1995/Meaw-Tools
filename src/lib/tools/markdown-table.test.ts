import { describe, expect, it } from "vitest";
import {
  createMarkdownTable,
  escapeMarkdownTableCell,
  importDelimitedMarkdownTable,
  MARKDOWN_TABLE_CELL_CHARACTER_LIMIT,
  MARKDOWN_TABLE_COLUMN_LIMIT,
  MARKDOWN_TABLE_IMPORT_CHARACTER_LIMIT,
  MARKDOWN_TABLE_ROW_LIMIT,
} from "./markdown-table";

describe("Markdown table generator", () => {
  it("creates a padded GFM table with per-column alignment", () => {
    expect(createMarkdownTable({
      headers: ["สินค้า", "ราคา", "สถานะ"],
      rows: [["ชาไทย", "65", "พร้อมขาย"], ["กาแฟ", "80", "หมด"]],
      alignments: ["left", "right", "center"],
    })).toBe([
      "| สินค้า | ราคา | สถานะ    |",
      "| :----- | ---: | :------: |",
      "| ชาไทย  | 65   | พร้อมขาย |",
      "| กาแฟ   | 80   | หมด      |",
    ].join("\n"));
  });

  it("escapes pipes and backslashes while preserving multiline cells with br", () => {
    expect(escapeMarkdownTableCell("A|B\\C\r\nบรรทัด 2")).toBe("A\\|B\\\\C<br>บรรทัด 2");
  });

  it("normalizes ragged rows and supplies readable empty headers", () => {
    const output = createMarkdownTable({ headers: ["", "ชื่อ"], rows: [["1"], ["2", "Meaw"]], alignments: [] });
    expect(output).toContain("| คอลัมน์ 1 | ชื่อ |");
    expect(output).toContain("| 1         |      |");
    expect(output).toContain("| 2         | Meaw |");
  });

  it("imports quoted CSV and uses the first row as headers", () => {
    expect(importDelimitedMarkdownTable('name,note,price\n"Meaw Cafe","ชา,กาแฟ",99', true)).toMatchObject({
      headers: ["name", "note", "price"],
      rows: [["Meaw Cafe", "ชา,กาแฟ", "99"]],
      delimiter: ",",
      importedRowCount: 1,
    });
  });

  it("imports pasted TSV without treating the first row as headers", () => {
    expect(importDelimitedMarkdownTable("A\t10\nB\t20", false)).toMatchObject({
      headers: ["คอลัมน์ 1", "คอลัมน์ 2"],
      rows: [["A", "10"], ["B", "20"]],
      delimiter: "\t",
      importedRowCount: 2,
    });
  });

  it("rejects input beyond editor resource limits", () => {
    expect(() => createMarkdownTable({ headers: Array.from({ length: MARKDOWN_TABLE_COLUMN_LIMIT + 1 }, () => "x"), rows: [], alignments: [] })).toThrow(/ไม่เกิน 20 คอลัมน์/);
    expect(() => createMarkdownTable({ headers: ["x"], rows: Array.from({ length: MARKDOWN_TABLE_ROW_LIMIT + 1 }, () => ["x"]), alignments: [] })).toThrow(/ไม่เกิน 100 แถว/);
    expect(() => createMarkdownTable({ headers: ["x"], rows: [["x".repeat(MARKDOWN_TABLE_CELL_CHARACTER_LIMIT + 1)]], alignments: [] })).toThrow(/ยาวเกิน/);
    expect(() => importDelimitedMarkdownTable("x".repeat(MARKDOWN_TABLE_IMPORT_CHARACTER_LIMIT + 1))).toThrow(/ข้อความนำเข้า/);
  });
});
