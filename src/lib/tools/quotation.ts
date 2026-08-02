export const QUOTATION_ITEM_LIMIT = 20;
export const QUOTATION_MAX_AMOUNT = 999_999_999_999.99;

export type QuotationVatMode = "none" | "excluded" | "included";

export type QuotationItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type QuotationParty = {
  name: string;
  taxId: string;
  address: string;
  contact: string;
};

export type QuotationDocument = {
  seller: QuotationParty;
  customer: QuotationParty;
  number: string;
  issueDate: string;
  validUntil: string;
  items: QuotationItem[];
  discount: number;
  vatMode: QuotationVatMode;
  vatRate: number;
  paymentTerms: string;
  notes: string;
};

export type QuotationCalculation = {
  itemTotals: number[];
  subtotal: number;
  discount: number;
  amountAfterDiscount: number;
  netBeforeVat: number;
  vat: number;
  total: number;
};

const THAI_DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertMoney(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > QUOTATION_MAX_AMOUNT) {
    throw new Error(`${label}ต้องเป็นตัวเลขตั้งแต่ 0 ถึง ${QUOTATION_MAX_AMOUNT.toLocaleString("th-TH")} บาท`);
  }
}

export function calculateQuotation(
  items: QuotationItem[],
  discount: number,
  vatMode: QuotationVatMode,
  vatRate: number,
): QuotationCalculation {
  if (!items.length) throw new Error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
  if (items.length > QUOTATION_ITEM_LIMIT) throw new Error(`เพิ่มรายการได้สูงสุด ${QUOTATION_ITEM_LIMIT} รายการ`);
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw new Error("อัตรา VAT ต้องอยู่ระหว่าง 0 ถึง 100%");
  assertMoney(discount, "ส่วนลด");

  const itemTotals = items.map((item, index) => {
    if (!item.description.trim()) throw new Error(`กรุณากรอกรายละเอียดรายการที่ ${index + 1}`);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1_000_000) {
      throw new Error(`จำนวนรายการที่ ${index + 1} ต้องมากกว่า 0 และไม่เกิน 1,000,000`);
    }
    assertMoney(item.unitPrice, `ราคาต่อหน่วยรายการที่ ${index + 1}`);
    const total = roundMoney(item.quantity * item.unitPrice);
    assertMoney(total, `ยอดรวมรายการที่ ${index + 1}`);
    return total;
  });

  const subtotal = roundMoney(itemTotals.reduce((sum, value) => sum + value, 0));
  assertMoney(subtotal, "ยอดรวมสินค้า");
  if (discount > subtotal) throw new Error("ส่วนลดต้องไม่มากกว่ายอดรวมสินค้า");
  const normalizedDiscount = roundMoney(discount);
  const amountAfterDiscount = roundMoney(subtotal - normalizedDiscount);

  if (vatMode === "included") {
    const vat = vatRate === 0 ? 0 : roundMoney(amountAfterDiscount * vatRate / (100 + vatRate));
    return {
      itemTotals,
      subtotal,
      discount: normalizedDiscount,
      amountAfterDiscount,
      netBeforeVat: roundMoney(amountAfterDiscount - vat),
      vat,
      total: amountAfterDiscount,
    };
  }

  const vat = vatMode === "excluded" ? roundMoney(amountAfterDiscount * vatRate / 100) : 0;
  return {
    itemTotals,
    subtotal,
    discount: normalizedDiscount,
    amountAfterDiscount,
    netBeforeVat: amountAfterDiscount,
    vat,
    total: roundMoney(amountAfterDiscount + vat),
  };
}

function readSixDigitGroup(value: number): string {
  const digits = String(value).padStart(6, "0").split("").map(Number);
  let output = "";
  for (let index = 0; index < digits.length; index += 1) {
    const digit = digits[index]!;
    if (digit === 0) continue;
    const position = digits.length - index - 1;
    if (position === 1 && digit === 1) output += "สิบ";
    else if (position === 1 && digit === 2) output += "ยี่สิบ";
    else if (position === 0 && digit === 1 && value > 10) output += "เอ็ด";
    else output += `${THAI_DIGITS[digit]}${THAI_POSITIONS[position]}`;
  }
  return output;
}

function readThaiInteger(value: number): string {
  if (value === 0) return THAI_DIGITS[0]!;
  if (value < 1_000_000) return readSixDigitGroup(value);
  const millions = Math.floor(value / 1_000_000);
  const remainder = value % 1_000_000;
  return `${readThaiInteger(millions)}ล้าน${remainder ? readSixDigitGroup(remainder) : ""}`;
}

export function formatThaiBahtText(value: number): string {
  assertMoney(value, "ยอดเงิน");
  const satangTotal = Math.round((value + Number.EPSILON) * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;
  const bahtText = `${readThaiInteger(baht)}บาท`;
  return satang === 0 ? `${bahtText}ถ้วน` : `${bahtText}${readThaiInteger(satang)}สตางค์`;
}

export function formatThaiDocumentDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || "-";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  if (month < 1 || month > 12 || day < 1 || day > 31) return value;
  return `${day} ${monthNames[month - 1]} ${year + 543}`;
}

export function quotationFilename(number: string): string {
  const safeNumber = number.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-");
  return `quotation-${safeNumber || "draft"}.pdf`;
}
