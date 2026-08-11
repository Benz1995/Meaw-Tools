import {
  calculateQuotation,
  type QuotationCalculation,
  type QuotationItem,
  type QuotationParty,
  type QuotationVatMode,
} from "@/lib/tools/quotation";

export type InvoiceDocument = {
  seller: QuotationParty;
  customer: QuotationParty;
  number: string;
  issueDate: string;
  dueDate: string;
  reference: string;
  items: QuotationItem[];
  discount: number;
  vatMode: QuotationVatMode;
  vatRate: number;
  amountPaid: number;
  paymentDetails: string;
  notes: string;
};

export type InvoiceStatus = "unpaid" | "partially-paid" | "paid";

export type InvoiceCalculation = QuotationCalculation & {
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateInvoice(document: InvoiceDocument): InvoiceCalculation {
  const base = calculateQuotation(document.items, document.discount, document.vatMode, document.vatRate);
  if (!Number.isFinite(document.amountPaid) || document.amountPaid < 0) throw new Error("ยอดชำระแล้วต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
  const amountPaid = roundMoney(document.amountPaid);
  if (amountPaid > base.total) throw new Error("ยอดชำระแล้วต้องไม่มากกว่ายอดใบแจ้งหนี้");
  const balanceDue = roundMoney(base.total - amountPaid);
  const status: InvoiceStatus = balanceDue === 0 ? "paid" : amountPaid > 0 ? "partially-paid" : "unpaid";
  return { ...base, amountPaid, balanceDue, status };
}

function safeFilenamePart(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-");
}

export function invoiceFilename(number: string): string {
  return `invoice-${safeFilenamePart(number) || "draft"}.pdf`;
}

function safeSpreadsheetText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function invoiceCsv(document: InvoiceDocument, calculation: InvoiceCalculation): string {
  const rows: Array<Array<string | number>> = [
    ["Invoice", safeSpreadsheetText(document.number), "THB"],
    ["Issue date", document.issueDate, ""],
    ["Due date", document.dueDate, ""],
    ["Reference / PO", safeSpreadsheetText(document.reference), ""],
    ["Seller", safeSpreadsheetText(document.seller.name), ""],
    ["Customer", safeSpreadsheetText(document.customer.name), ""],
    [],
    ["Item", "Description", "Quantity", "Unit price", "Line total"],
    ...document.items.map((item, index) => [index + 1, safeSpreadsheetText(item.description), item.quantity.toFixed(4), item.unitPrice.toFixed(2), calculation.itemTotals[index]!.toFixed(2)]),
    [],
    ["Summary", "Value", "Currency"],
    ["Subtotal", calculation.subtotal.toFixed(2), "THB"],
    ["Discount", calculation.discount.toFixed(2), "THB"],
    ["Net before VAT", calculation.netBeforeVat.toFixed(2), "THB"],
    ["VAT", calculation.vat.toFixed(2), "THB"],
    ["Invoice total", calculation.total.toFixed(2), "THB"],
    ["Amount paid", calculation.amountPaid.toFixed(2), "THB"],
    ["Balance due", calculation.balanceDue.toFixed(2), "THB"],
    ["Status", calculation.status, ""],
    [],
    ["Payment details", safeSpreadsheetText(document.paymentDetails), ""],
    ["Notes", safeSpreadsheetText(document.notes), ""],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
