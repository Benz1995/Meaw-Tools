export type TextStats = {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  sentences: number;
  lines: number;
  paragraphs: number;
  readingMinutes: number;
};

export function analyzeText(value: string): TextStats {
  const graphemeSegmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
  const wordSegmenter = new Intl.Segmenter("th", { granularity: "word" });
  const sentenceSegmenter = new Intl.Segmenter("th", { granularity: "sentence" });
  const trimmed = value.trim();
  const words = Array.from(wordSegmenter.segment(value)).filter((segment) => segment.isWordLike).length;

  return {
    characters: Array.from(graphemeSegmenter.segment(value)).length,
    charactersWithoutSpaces: Array.from(graphemeSegmenter.segment(value.replace(/\s/gu, ""))).length,
    words,
    sentences: trimmed
      ? Array.from(sentenceSegmenter.segment(trimmed)).filter((segment) => segment.segment.trim()).length
      : 0,
    lines: value ? value.split(/\r\n|\r|\n/u).length : 0,
    paragraphs: trimmed ? trimmed.split(/(?:\r?\n){2,}/u).filter((paragraph) => paragraph.trim()).length : 0,
    readingMinutes: words ? Math.max(1, Math.ceil(words / 200)) : 0,
  };
}

export type TextCleanOptions = {
  trimLines: boolean;
  collapseSpaces: boolean;
  removeEmptyLines: boolean;
  deduplicateLines: boolean;
};

export function cleanText(value: string, options: TextCleanOptions): string {
  let lines = value.replace(/\r\n?|\n/gu, "\n").split("\n");

  if (options.trimLines) lines = lines.map((line) => line.trim());
  if (options.collapseSpaces) lines = lines.map((line) => line.replace(/[\t ]+/gu, " "));
  if (options.removeEmptyLines) lines = lines.filter((line) => line.trim().length > 0);
  if (options.deduplicateLines) {
    const seen = new Set<string>();
    lines = lines.filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });
  }

  const result = lines.join("\n");
  return options.trimLines ? result.trim() : result;
}

export type PercentageMode = "of" | "ratio" | "change";

export function calculatePercentage(mode: PercentageMode, first: number, second: number): number {
  if (!Number.isFinite(first) || !Number.isFinite(second)) throw new Error("กรุณากรอกตัวเลขให้ครบ");
  if (mode === "of") return (first / 100) * second;
  if (second === 0 && mode === "ratio") throw new Error("ค่ารวมต้องไม่เป็นศูนย์");
  if (first === 0 && mode === "change") throw new Error("ค่าเริ่มต้นต้องไม่เป็นศูนย์");
  return mode === "ratio" ? (first / second) * 100 : ((second - first) / Math.abs(first)) * 100;
}

export type UnitCategory = "length" | "weight" | "temperature" | "area" | "data";
export type UnitOption = { value: string; label: string; factor?: number };

export const unitGroups: Record<UnitCategory, { label: string; units: [UnitOption, ...UnitOption[]] }> = {
  length: {
    label: "ความยาว",
    units: [
      { value: "mm", label: "มิลลิเมตร (mm)", factor: 0.001 },
      { value: "cm", label: "เซนติเมตร (cm)", factor: 0.01 },
      { value: "m", label: "เมตร (m)", factor: 1 },
      { value: "km", label: "กิโลเมตร (km)", factor: 1000 },
      { value: "in", label: "นิ้ว (in)", factor: 0.0254 },
      { value: "ft", label: "ฟุต (ft)", factor: 0.3048 },
      { value: "yd", label: "หลา (yd)", factor: 0.9144 },
      { value: "mi", label: "ไมล์ (mi)", factor: 1609.344 },
    ],
  },
  weight: {
    label: "น้ำหนัก",
    units: [
      { value: "mg", label: "มิลลิกรัม (mg)", factor: 0.000001 },
      { value: "g", label: "กรัม (g)", factor: 0.001 },
      { value: "kg", label: "กิโลกรัม (kg)", factor: 1 },
      { value: "tonne", label: "ตัน (tonne)", factor: 1000 },
      { value: "oz", label: "ออนซ์ (oz)", factor: 0.028349523125 },
      { value: "lb", label: "ปอนด์ (lb)", factor: 0.45359237 },
    ],
  },
  temperature: {
    label: "อุณหภูมิ",
    units: [
      { value: "c", label: "เซลเซียส (°C)" },
      { value: "f", label: "ฟาเรนไฮต์ (°F)" },
      { value: "k", label: "เคลวิน (K)" },
    ],
  },
  area: {
    label: "พื้นที่",
    units: [
      { value: "sqm", label: "ตารางเมตร", factor: 1 },
      { value: "sqkm", label: "ตารางกิโลเมตร", factor: 1_000_000 },
      { value: "rai", label: "ไร่", factor: 1600 },
      { value: "ngan", label: "งาน", factor: 400 },
      { value: "sqwah", label: "ตารางวา", factor: 4 },
      { value: "acre", label: "เอเคอร์", factor: 4046.8564224 },
      { value: "hectare", label: "เฮกตาร์", factor: 10_000 },
    ],
  },
  data: {
    label: "ขนาดข้อมูล",
    units: [
      { value: "b", label: "Byte (B)", factor: 1 },
      { value: "kb", label: "Kilobyte (KB)", factor: 1000 },
      { value: "mb", label: "Megabyte (MB)", factor: 1_000_000 },
      { value: "gb", label: "Gigabyte (GB)", factor: 1_000_000_000 },
      { value: "kib", label: "Kibibyte (KiB)", factor: 1024 },
      { value: "mib", label: "Mebibyte (MiB)", factor: 1_048_576 },
      { value: "gib", label: "Gibibyte (GiB)", factor: 1_073_741_824 },
    ],
  },
};

function temperatureToCelsius(value: number, unit: string): number {
  if (unit === "f") return ((value - 32) * 5) / 9;
  if (unit === "k") return value - 273.15;
  return value;
}

function celsiusToTemperature(value: number, unit: string): number {
  if (unit === "f") return (value * 9) / 5 + 32;
  if (unit === "k") return value + 273.15;
  return value;
}

export function convertUnit(category: UnitCategory, value: number, from: string, to: string): number {
  if (!Number.isFinite(value)) throw new Error("กรุณากรอกตัวเลขที่ต้องการแปลง");
  const group = unitGroups[category];
  const fromUnit = group.units.find((unit) => unit.value === from);
  const toUnit = group.units.find((unit) => unit.value === to);
  if (!fromUnit || !toUnit) throw new Error("ไม่พบหน่วยที่เลือก");

  if (category === "temperature") {
    return celsiusToTemperature(temperatureToCelsius(value, from), to);
  }

  return (value * (fromUnit.factor ?? 1)) / (toUnit.factor ?? 1);
}

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error("วันที่ไม่ถูกต้อง");
  }
  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function differenceInCalendarDays(startValue: string, endValue: string): number {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86_400_000);
}

export function addDaysToDate(value: string, amount: number, businessDaysOnly = false): string {
  if (!Number.isInteger(amount) || Math.abs(amount) > 100_000) {
    throw new Error("จำนวนวันต้องเป็นจำนวนเต็มไม่เกิน 100,000 วัน");
  }
  const date = parseIsoDate(value);
  if (!businessDaysOnly) {
    date.setDate(date.getDate() + amount);
    return formatIsoDate(date);
  }

  const direction = amount < 0 ? -1 : 1;
  let remaining = Math.abs(amount);
  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return formatIsoDate(date);
}
