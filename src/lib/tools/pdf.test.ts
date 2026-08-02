import { describe, expect, it } from "vitest";
import {
  formatPdfBytes,
  parsePdfPageSelection,
  parsePdfSplitRanges,
  pdfFileStem,
  validatePdfFile,
} from "@/lib/tools/pdf";

describe("PDF tool helpers", () => {
  it("parses unique page selections while preserving requested order", () => {
    expect(parsePdfPageSelection("3,1-2,2", 5)).toEqual([2, 0, 1]);
    expect(parsePdfPageSelection("all", 3)).toEqual([0, 1, 2]);
  });

  it("rejects invalid and oversized selections", () => {
    expect(() => parsePdfPageSelection("5-3", 10)).toThrow("เรียงจากน้อยไปมาก");
    expect(() => parsePdfPageSelection("1-11", 10)).toThrow("มี 10 หน้า");
    expect(() => parsePdfPageSelection("1-21", 30)).toThrow("สูงสุด 20 หน้า");
  });

  it("splits comma-separated ranges into separate groups", () => {
    expect(parsePdfSplitRanges("1-3, 5, 8-9", 10)).toEqual([
      { label: "1-3", pages: [0, 1, 2] },
      { label: "5", pages: [4] },
      { label: "8-9", pages: [7, 8] },
    ]);
  });

  it("validates files and creates safe output names", () => {
    expect(() => validatePdfFile({ name: "report.PDF", size: 100, type: "" })).not.toThrow();
    expect(() => validatePdfFile({ name: "report.txt", size: 100, type: "text/plain" })).toThrow("เฉพาะไฟล์ PDF");
    expect(pdfFileStem('  report: Q1/2026.pdf  ')).toBe("report- Q1-2026");
    expect(formatPdfBytes(1_048_576)).toBe("1.0 MB");
  });
});
