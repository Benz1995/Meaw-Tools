import { makeUniqueFilenames } from "@/lib/tools/images";

export const BARCODE_ITEM_LIMIT = 50;
export const BARCODE_VALUE_LIMIT = 80;

export type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "ITF14" | "CODE39";
export type ParsedBarcode = { id: string; source: string; value: string };

type FixedDigitSpec = { bodyLength: number; totalLength: number; label: string };

const FIXED_DIGIT_FORMATS: Partial<Record<BarcodeFormat, FixedDigitSpec>> = {
  EAN13: { bodyLength: 12, totalLength: 13, label: "EAN-13" },
  EAN8: { bodyLength: 7, totalLength: 8, label: "EAN-8" },
  UPC: { bodyLength: 11, totalLength: 12, label: "UPC-A" },
  ITF14: { bodyLength: 13, totalLength: 14, label: "ITF-14" },
};

export function calculateGs1CheckDigit(body: string): number {
  if (!/^\d+$/.test(body)) throw new Error("ข้อมูลสำหรับคำนวณ Check Digit ต้องเป็นตัวเลขเท่านั้น");
  const sum = [...body].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

function normalizeFixedDigits(value: string, spec: FixedDigitSpec): string {
  if (!/^\d+$/.test(value)) throw new Error(`${spec.label} ใช้ตัวเลขเท่านั้น`);
  if (value.length === spec.bodyLength) return `${value}${calculateGs1CheckDigit(value)}`;
  if (value.length !== spec.totalLength) {
    throw new Error(`${spec.label} ต้องมี ${spec.bodyLength} หลักเพื่อให้ระบบเติม Check Digit หรือ ${spec.totalLength} หลักแบบครบถ้วน`);
  }
  const body = value.slice(0, -1);
  const expected = calculateGs1CheckDigit(body);
  if (Number(value.at(-1)) !== expected) throw new Error(`${spec.label} มี Check Digit ไม่ถูกต้อง ค่าที่ถูกต้องควรลงท้ายด้วย ${expected}`);
  return value;
}

export function normalizeBarcodeValue(source: string, format: BarcodeFormat): string {
  const value = source.trim();
  if (!value) throw new Error("กรุณากรอกรหัสอย่างน้อย 1 รายการ");
  if (value.length > BARCODE_VALUE_LIMIT) throw new Error(`แต่ละรหัสยาวได้ไม่เกิน ${BARCODE_VALUE_LIMIT} ตัวอักษร`);

  const fixedSpec = FIXED_DIGIT_FORMATS[format];
  if (fixedSpec) return normalizeFixedDigits(value.replace(/\s+/g, ""), fixedSpec);

  if (format === "CODE39") {
    const normalized = value.toUpperCase();
    if (!/^[0-9A-Z .$/+%-]+$/.test(normalized)) throw new Error("Code 39 รองรับ A–Z, 0–9, เว้นวรรค และสัญลักษณ์ - . $ / + % เท่านั้น");
    return normalized;
  }

  if (!/^[\x20-\x7E]+$/.test(value)) throw new Error("Code 128 รองรับตัวอักษรอังกฤษ ตัวเลข และสัญลักษณ์ ASCII ที่พิมพ์ได้เท่านั้น");
  return value;
}

export function parseBarcodeInput(input: string, format: BarcodeFormat): ParsedBarcode[] {
  if (input.length > 6_000) throw new Error("ข้อมูลรวมยาวเกิน 6,000 ตัวอักษร");
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("กรุณากรอกรหัสอย่างน้อย 1 รายการ");
  if (lines.length > BARCODE_ITEM_LIMIT) throw new Error(`สร้างได้สูงสุด ${BARCODE_ITEM_LIMIT} รายการต่อครั้ง`);
  return lines.map((source, index) => {
    try {
      return { id: `${index + 1}-${source}`, source, value: normalizeBarcodeValue(source, format) };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "รูปแบบรหัสไม่ถูกต้อง";
      throw new Error(`บรรทัด ${index + 1}: ${message}`);
    }
  });
}

function safeBarcodeStem(value: string, index: number) {
  const safe = value
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${String(index + 1).padStart(2, "0")}-${safe || "barcode"}`;
}

export function createBarcodeFilenames(values: readonly string[], extension: "png" | "svg"): string[] {
  return makeUniqueFilenames(values.map((value, index) => `${safeBarcodeStem(value, index)}.${extension}`));
}
