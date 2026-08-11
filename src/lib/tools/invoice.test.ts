import { describe, expect, it } from "vitest";
import { calculateInvoice, invoiceCsv, invoiceFilename, type InvoiceDocument } from "@/lib/tools/invoice";

const document: InvoiceDocument = {
  seller: { name: "บริษัท มีอาว์ จำกัด", taxId: "0105569000000", address: "กรุงเทพฯ", contact: "hello@example.com" },
  customer: { name: "ร้านฮานะ", taxId: "", address: "เชียงใหม่", contact: "" },
  number: "INV-20260811-001",
  issueDate: "2026-08-11",
  dueDate: "2026-08-25",
  reference: "PO-123",
  items: [
    { id: "a", description: "ออกแบบเว็บไซต์", quantity: 1, unitPrice: 25_000 },
    { id: "b", description: "ดูแลระบบ", quantity: 2, unitPrice: 3_500 },
  ],
  discount: 2_000,
  vatMode: "excluded",
  vatRate: 7,
  amountPaid: 10_000,
  paymentDetails: "โอนเข้าบัญชีตัวอย่าง",
  notes: "ขอบคุณที่ใช้บริการ",
};

describe("invoice calculations", () => {
  it("calculates VAT, partial payment, and outstanding balance", () => {
    expect(calculateInvoice(document)).toEqual({
      itemTotals: [25_000, 7_000],
      subtotal: 32_000,
      discount: 2_000,
      amountAfterDiscount: 30_000,
      netBeforeVat: 30_000,
      vat: 2_100,
      total: 32_100,
      amountPaid: 10_000,
      balanceDue: 22_100,
      status: "partially-paid",
    });
  });

  it("distinguishes unpaid and paid invoices", () => {
    expect(calculateInvoice({ ...document, amountPaid: 0 }).status).toBe("unpaid");
    expect(calculateInvoice({ ...document, amountPaid: 32_100 })).toMatchObject({ status: "paid", balanceDue: 0 });
  });

  it("rejects an overpayment and invalid negative payment", () => {
    expect(() => calculateInvoice({ ...document, amountPaid: 32_101 })).toThrow("ไม่มากกว่ายอดใบแจ้งหนี้");
    expect(() => calculateInvoice({ ...document, amountPaid: -1 })).toThrow("ตั้งแต่ 0");
  });
});

describe("invoice exports", () => {
  it("creates safe filenames and a UTF-8 spreadsheet report", () => {
    expect(invoiceFilename("INV/2026 001")).toBe("invoice-INV-2026-001.pdf");
    const unsafe = { ...document, reference: "=HYPERLINK(\"bad\")", items: [{ ...document.items[0]!, description: "+SUM(1,1)" }] };
    const csv = invoiceCsv(unsafe, calculateInvoice(unsafe));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Reference / PO","\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"1","\'+SUM(1,1)"');
    expect(csv).toContain('"Balance due","14610.00","THB"');
  });
});
