import { cryptoRandomInt, type RandomIntSource } from "@/lib/tools/generators";

export const MAX_WHEEL_ENTRIES = 100;
export const MAX_WHEEL_ENTRY_LENGTH = 80;
export const MAX_ERA_YEARS = 100;

export type EraDirection = "be-to-ce" | "ce-to-be";

export type WheelWinner = {
  index: number;
  value: string;
};

export function parseWheelEntries(input: string, deduplicate = true): string[] {
  if (input.length > 10_000) throw new Error("รายชื่อยาวเกิน 10,000 ตัวอักษร");

  const entries = input
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\s+/gu, " "))
    .filter(Boolean);

  if (entries.some((entry) => entry.length > MAX_WHEEL_ENTRY_LENGTH)) {
    throw new Error(`แต่ละรายการต้องยาวไม่เกิน ${MAX_WHEEL_ENTRY_LENGTH} ตัวอักษร`);
  }

  const seen = new Set<string>();
  const normalizedEntries = deduplicate
    ? entries.filter((entry) => {
        const normalized = entry.toLocaleLowerCase("th");
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
    : entries;

  if (normalizedEntries.length < 2) throw new Error("กรุณากรอกอย่างน้อย 2 รายการ");
  if (normalizedEntries.length > MAX_WHEEL_ENTRIES) {
    throw new Error(`รองรับสูงสุด ${MAX_WHEEL_ENTRIES} รายการต่อครั้ง`);
  }

  return normalizedEntries;
}

export function pickWheelWinner(
  entries: readonly string[],
  randomInt: RandomIntSource = cryptoRandomInt,
): WheelWinner {
  if (entries.length < 2 || entries.length > MAX_WHEEL_ENTRIES) {
    throw new Error(`จำนวนรายการต้องอยู่ระหว่าง 2–${MAX_WHEEL_ENTRIES}`);
  }
  const index = randomInt(entries.length);
  if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
    throw new Error("แหล่งสุ่มส่งค่าที่อยู่นอกช่วง");
  }
  return { index, value: entries[index]! };
}

export function getNextWheelRotation(
  currentRotation: number,
  winnerIndex: number,
  entryCount: number,
  minimumTurns = 5,
): number {
  if (!Number.isFinite(currentRotation)) throw new Error("มุมวงล้อไม่ถูกต้อง");
  if (!Number.isInteger(entryCount) || entryCount < 2 || entryCount > MAX_WHEEL_ENTRIES) {
    throw new Error(`จำนวนรายการต้องอยู่ระหว่าง 2–${MAX_WHEEL_ENTRIES}`);
  }
  if (!Number.isInteger(winnerIndex) || winnerIndex < 0 || winnerIndex >= entryCount) {
    throw new Error("ลำดับผู้ชนะอยู่นอกช่วง");
  }
  if (!Number.isInteger(minimumTurns) || minimumTurns < 1 || minimumTurns > 20) {
    throw new Error("จำนวนรอบหมุนไม่ถูกต้อง");
  }

  const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
  const segmentAngle = 360 / entryCount;
  const target = (360 - (winnerIndex + 0.5) * segmentAngle + 360) % 360;
  const forwardDelta = (target - normalizedCurrent + 360) % 360;
  return currentRotation + minimumTurns * 360 + forwardDelta;
}

export function convertEraYear(year: number, direction: EraDirection): number {
  if (!Number.isSafeInteger(year)) throw new Error("ปีต้องเป็นจำนวนเต็ม");

  if (direction === "be-to-ce") {
    if (year < 544 || year > 10_542) throw new Error("พ.ศ. ต้องอยู่ระหว่าง 544–10,542");
    return year - 543;
  }

  if (year < 1 || year > 9_999) throw new Error("ค.ศ. ต้องอยู่ระหว่าง 1–9,999");
  return year + 543;
}

export function parseEraYears(input: string): number[] {
  if (input.length > 2_000) throw new Error("รายการปียาวเกิน 2,000 ตัวอักษร");

  const tokens = input
    .trim()
    .split(/[\s,;]+/u)
    .filter(Boolean);

  if (!tokens.length) throw new Error("กรุณากรอกปีอย่างน้อย 1 รายการ");
  if (tokens.length > MAX_ERA_YEARS) throw new Error(`รองรับสูงสุด ${MAX_ERA_YEARS} ปีต่อครั้ง`);

  return tokens.map((token) => {
    if (!/^\d+$/u.test(token)) throw new Error(`“${token}” ไม่ใช่ปีที่เป็นจำนวนเต็ม`);
    const year = Number(token);
    if (!Number.isSafeInteger(year)) throw new Error(`“${token}” อยู่นอกช่วงที่รองรับ`);
    return year;
  });
}

export function convertEraYears(input: string, direction: EraDirection) {
  return parseEraYears(input).map((source) => ({
    source,
    converted: convertEraYear(source, direction),
  }));
}
