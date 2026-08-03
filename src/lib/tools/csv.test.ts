import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  CSV_CELL_CHARACTER_LIMIT,
  createCsvPreview,
  createXlsxWorkbook,
  decodeCsvBytes,
  detectCsvDelimiter,
  parseCsv,
  sanitizeXlsxFilename,
} from "./csv";

describe("CSV parser and Excel workbook", () => {
  it("parses RFC-style commas, escaped quotes, and multiline fields", () => {
    const parsed = parseCsv('id,name,note\r\n001,"Meaw, Cafe","บรรทัด 1\nบรรทัด ""สอง"""\r\n002,ชาไทย,พร้อมส่ง\r\n');

    expect(parsed.delimiter).toBe(",");
    expect(parsed.rowCount).toBe(3);
    expect(parsed.columnCount).toBe(3);
    expect(parsed.raggedRowCount).toBe(0);
    expect(parsed.rows[1]).toEqual(["001", "Meaw, Cafe", 'บรรทัด 1\nบรรทัด "สอง"']);
  });

  it("detects tab, semicolon, and pipe delimiters", () => {
    expect(detectCsvDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectCsvDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectCsvDelimiter("a|b|c\n1|2|3")).toBe("|");
    expect(parseCsv("a;b\n1;2", "semicolon").rows[1]).toEqual(["1", "2"]);
  });

  it("reports irregular and blank rows without silently dropping them", () => {
    const parsed = parseCsv("a,b,c\n1,2\n\n3,4,5\n");

    expect(parsed.rowCount).toBe(4);
    expect(parsed.raggedRowCount).toBe(2);
    expect(parsed.blankRowCount).toBe(1);
    expect(createCsvPreview(parsed)).toHaveLength(4);
  });

  it("rejects malformed quotes and cells that exceed Excel limits", () => {
    expect(() => parseCsv('a,b\n"not closed,b')).toThrow(/ปิดไม่ครบ/);
    expect(() => parseCsv(`header\n${"x".repeat(CSV_CELL_CHARACTER_LIMIT + 1)}`)).toThrow(/ขีดจำกัดของ Excel/);
  });

  it("decodes UTF-8 and Windows-874 bytes including Thai text", () => {
    const bytes = new TextEncoder().encode("ชื่อ,ราคา\nชาไทย,45");
    expect(decodeCsvBytes(bytes, "utf-8")).toContain("ชาไทย");
    const windows874 = new Uint8Array([170, 215, 232, 205, 44, 195, 210, 164, 210, 10, 170, 210, 228, 183, 194, 44, 52, 53]);
    expect(decodeCsvBytes(windows874, "windows-874")).toBe("ชื่อ,ราคา\nชาไทย,45");
  });

  it("creates a real XLSX with styled headers, safe strings, and usable numbers", () => {
    const parsed = parseCsv('id,name,price,note\n00123,ชาเขียว,55,"=2+2"');
    const workbook = createXlsxWorkbook(parsed, { sheetName: "สินค้า / 2026", firstRowIsHeader: true, detectNumbers: true });
    const files = unzipSync(workbook);
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]!);
    const workbookXml = strFromU8(files["xl/workbook.xml"]!);

    expect(workbook[0]).toBe(0x50);
    expect(workbook[1]).toBe(0x4b);
    expect(Object.keys(files)).toContain("[Content_Types].xml");
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(sheet).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">00123</t>');
    expect(sheet).toContain('<c r="C2"><v>55</v></c>');
    expect(sheet).toContain("=2+2");
    expect(sheet).not.toContain("<f>");
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain("<autoFilter");
    expect(workbookXml).toContain('name="สินค้า 2026"');
  });

  it("creates a safe Excel filename", () => {
    expect(sanitizeXlsxFilename("sales:august.csv")).toBe("sales-august.xlsx");
    expect(sanitizeXlsxFilename(".csv")).toBe("meaw-csv.xlsx");
  });
});
