import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createExcelCsv,
  createExcelCsvArchive,
  createExcelCsvFilename,
  formatExcelCell,
  validateExcelWorkbook,
  type ExcelCsvOptions,
} from "./excel-to-csv";

const options: ExcelCsvOptions = {
  delimiter: "comma",
  lineEnding: "crlf",
  includeBom: true,
  quoteAll: false,
  protectSpreadsheetFormulas: true,
};

describe("Excel to CSV conversion", () => {
  it("creates UTF-8 BOM CSV with RFC-style escaping", () => {
    const result = createExcelCsv("สินค้า", [
      ["รหัส", "สินค้า", "หมายเหตุ"],
      ["001", "ชา,กาแฟ", 'บรรทัด "พิเศษ"\nสอง'],
    ], options);

    expect(result.csv).toBe('\uFEFFรหัส,สินค้า,หมายเหตุ\r\n001,"ชา,กาแฟ","บรรทัด ""พิเศษ""\nสอง"');
    expect(result.protectedCellCount).toBe(0);
  });

  it("formats dates and booleans and protects spreadsheet formulas", () => {
    const result = createExcelCsv("ข้อมูล", [[
      new Date(Date.UTC(2026, 7, 8)),
      new Date(Date.UTC(2026, 7, 8, 14, 5, 9)),
      true,
      false,
      "=HYPERLINK(\"https://example.com\")",
      "-12.50",
    ]], { ...options, includeBom: false });

    expect(result.csv).toContain("2026-08-08,2026-08-08T14:05:09,TRUE,FALSE");
    expect(result.csv).toContain('"\t=HYPERLINK(""https://example.com"")"');
    expect(result.csv.endsWith(",-12.50")).toBe(true);
    expect(result.protectedCellCount).toBe(1);
    expect(formatExcelCell(new Date("invalid"))).toBe("");
  });

  it("supports custom delimiter, LF, and quote-all output", () => {
    const result = createExcelCsv("Sheet", [["A", "B"], [1, 2]], {
      ...options,
      delimiter: "semicolon",
      lineEnding: "lf",
      includeBom: false,
      quoteAll: true,
      protectSpreadsheetFormulas: false,
    });

    expect(result.csv).toBe('"A";"B"\n"1";"2"');
  });

  it("validates workbook resource limits and empty workbooks", () => {
    expect(validateExcelWorkbook([{ sheet: "A", data: [["x", "y"], [1, 2]] }])).toEqual([
      { sheet: "A", rowCount: 2, columnCount: 2, cellCount: 4, blankRowCount: 0 },
    ]);
    expect(() => validateExcelWorkbook([])).toThrow(/ไม่พบ Worksheet/);
    expect(() => validateExcelWorkbook([{ sheet: "ว่าง", data: [] }])).toThrow(/ไม่พบข้อมูล/);
  });

  it("creates one UTF-8 CSV per sheet in a ZIP with collision-safe names", () => {
    const archive = createExcelCsvArchive("ยอดขาย.xlsx", [
      { sheet: "ภาค/เหนือ", data: [["ยอด"], [100]] },
      { sheet: "ภาค:เหนือ", data: [["ยอด"], [200]] },
    ], options);
    const files = unzipSync(archive.bytes);
    const names = Object.keys(files).sort();

    expect(archive.filename).toBe("ยอดขาย-csv.zip");
    expect(names).toEqual(["ยอดขาย-ภาค-เหนือ-2.csv", "ยอดขาย-ภาค-เหนือ.csv"]);
    expect(strFromU8(files["ยอดขาย-ภาค-เหนือ.csv"]!)).toContain("100");
    expect(strFromU8(files["ยอดขาย-ภาค-เหนือ-2.csv"]!)).toContain("200");
  });

  it("creates safe filenames for a selected worksheet", () => {
    expect(createExcelCsvFilename("sales:august.xlsx", "Q1 / ไทย", true)).toBe("sales-august-Q1 - ไทย.csv");
    expect(createExcelCsvFilename(".xlsx", "Sheet1", false)).toBe("meaw-excel.csv");
  });
});
