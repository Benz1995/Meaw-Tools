import { describe, expect, it } from "vitest";
import {
  calculateQuotation,
  formatThaiBahtText,
  formatThaiDocumentDate,
  quotationFilename,
  type QuotationItem,
} from "@/lib/tools/quotation";

const items: QuotationItem[] = [
  { id: "a", description: "ออกแบบเว็บไซต์", quantity: 1, unitPrice: 25_000 },
  { id: "b", description: "ดูแลระบบ", quantity: 2, unitPrice: 3_500 },
];

describe("quotation calculations", () => {
  it("adds excluded VAT after a fixed discount", () => {
    expect(calculateQuotation(items, 2_000, "excluded", 7)).toEqual({
      itemTotals: [25_000, 7_000],
      subtotal: 32_000,
      discount: 2_000,
      amountAfterDiscount: 30_000,
      netBeforeVat: 30_000,
      vat: 2_100,
      total: 32_100,
    });
  });

  it("extracts included VAT without increasing the grand total", () => {
    const result = calculateQuotation([{ id: "a", description: "สินค้า", quantity: 1, unitPrice: 10_700 }], 0, "included", 7);
    expect(result.netBeforeVat).toBe(10_000);
    expect(result.vat).toBe(700);
    expect(result.total).toBe(10_700);
  });

  it("supports no VAT and rejects unsafe values", () => {
    expect(calculateQuotation(items, 0, "none", 7).vat).toBe(0);
    expect(() => calculateQuotation([], 0, "none", 7)).toThrow("อย่างน้อย 1 รายการ");
    expect(() => calculateQuotation([{ ...items[0]!, quantity: 0 }], 0, "none", 7)).toThrow("ต้องมากกว่า 0");
    expect(() => calculateQuotation(items, 40_000, "none", 7)).toThrow("ไม่มากกว่ายอดรวม");
    expect(() => calculateQuotation(items, 0, "excluded", 101)).toThrow("0 ถึง 100%");
  });
});
describe("quotation formatting", () => {
  it("renders Thai baht text including millions and satang", () => {
    expect(formatThaiBahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(formatThaiBahtText(1_234.5)).toBe("หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์");
    expect(formatThaiBahtText(1_000_001)).toBe("หนึ่งล้านหนึ่งบาทถ้วน");
    expect(formatThaiBahtText(11_000_000)).toBe("สิบเอ็ดล้านบาทถ้วน");
  });

  it("formats Buddhist Era dates and safe filenames", () => {
    expect(formatThaiDocumentDate("2026-08-03")).toBe("3 สิงหาคม 2569");
    expect(formatThaiDocumentDate("")).toBe("-");
    expect(quotationFilename("QT/2026 001")).toBe("quotation-QT-2026-001.pdf");
  });
});
