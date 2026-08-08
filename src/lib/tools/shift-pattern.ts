import { formatDecimalHours, formatDuration, parseClockTime } from "@/lib/tools/working-hours";

export const SHIFT_PATTERN_MAX_DAYS = 366;
export const SHIFT_PATTERN_MAX_CYCLE_DAYS = 56;
export const SHIFT_PATTERN_MAX_DEFINITIONS = 6;
export const SHIFT_PATTERN_MAX_BREAK_MINUTES = 720;

export type ShiftDefinition = {
  code: string;
  label: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

export type ShiftPatternInput = {
  startDate: string;
  endDate: string;
  startCycleDay: number;
  pattern: string[];
  definitions: ShiftDefinition[];
};

export type ShiftPatternDay = {
  date: string;
  weekday: number;
  cycleDay: number;
  code: string;
  label: string;
  isOff: boolean;
  startTime?: string;
  endTime?: string;
  isOvernight: boolean;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
};

export type ShiftPatternBreakdown = {
  code: string;
  label: string;
  count: number;
  netMinutes: number;
};

export type ShiftPatternMonth = {
  month: string;
  days: number;
  workingDays: number;
  offDays: number;
  netMinutes: number;
};

export type ShiftPatternResult = {
  startDate: string;
  endDate: string;
  cycleLength: number;
  startCycleDay: number;
  days: ShiftPatternDay[];
  months: ShiftPatternMonth[];
  shifts: ShiftPatternBreakdown[];
  calendarDays: number;
  workingDays: number;
  offDays: number;
  overnightShifts: number;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
};

export type ShiftPatternPresetId = "four-on-four-off" | "two-day-two-night-four-off" | "five-on-two-off" | "two-two-three" | "custom";

export type ShiftPatternPreset = {
  id: ShiftPatternPresetId;
  name: string;
  description: string;
  pattern: string[];
  definitions: ShiftDefinition[];
};

const DAY_SHIFT: ShiftDefinition = { code: "D", label: "กะกลางวัน", startTime: "08:00", endTime: "20:00", breakMinutes: 60 };
const NIGHT_SHIFT: ShiftDefinition = { code: "N", label: "กะกลางคืน", startTime: "20:00", endTime: "08:00", breakMinutes: 60 };

export const SHIFT_PATTERN_PRESETS: ShiftPatternPreset[] = [
  {
    id: "four-on-four-off",
    name: "4 ทำงาน / 4 หยุด",
    description: "กะ 12 ชั่วโมง 4 วัน แล้วหยุด 4 วัน",
    pattern: ["D", "D", "D", "D", "OFF", "OFF", "OFF", "OFF"],
    definitions: [DAY_SHIFT],
  },
  {
    id: "two-day-two-night-four-off",
    name: "2 วัน / 2 คืน / 4 หยุด",
    description: "กะกลางวัน 2 วัน กะกลางคืน 2 วัน แล้วหยุด 4 วัน",
    pattern: ["D", "D", "N", "N", "OFF", "OFF", "OFF", "OFF"],
    definitions: [DAY_SHIFT, NIGHT_SHIFT],
  },
  {
    id: "five-on-two-off",
    name: "5 ทำงาน / 2 หยุด",
    description: "กะกลางวัน 5 วัน แล้วหยุด 2 วัน",
    pattern: ["D", "D", "D", "D", "D", "OFF", "OFF"],
    definitions: [{ code: "D", label: "กะทำงาน", startTime: "09:00", endTime: "17:00", breakMinutes: 60 }],
  },
  {
    id: "two-two-three",
    name: "2-2-3 (กะวันตัวอย่าง)",
    description: "ทำ 2 หยุด 2 ทำ 3 / หยุด 2 ทำ 2 หยุด 3 ในรอบ 14 วัน",
    pattern: ["D", "D", "OFF", "OFF", "D", "D", "D", "OFF", "OFF", "D", "D", "OFF", "OFF", "OFF"],
    definitions: [DAY_SHIFT],
  },
  {
    id: "custom",
    name: "กำหนดรอบกะเอง",
    description: "เริ่มจากกะกลางวัน กลางคืน และวันหยุด แล้วแก้ได้ทั้งหมด",
    pattern: ["D", "D", "N", "N", "OFF", "OFF"],
    definitions: [DAY_SHIFT, NIGHT_SHIFT],
  },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,8}$/u;
const CSV_FORMULA_PATTERN = /^[=+\-@\t\r]/;
const OFF_ALIASES = new Set(["O", "OFF", "REST", "หยุด"]);

function parseDate(value: string, label: string) {
  if (!DATE_PATTERN.test(value)) throw new Error(`${label}ต้องอยู่ในรูปแบบ YYYY-MM-DD`);
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new Error(`${label}ไม่ถูกต้อง`);
  return parsed;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function inclusiveDays(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function normalizeShiftCode(value: string) {
  const normalized = value.trim().toLocaleUpperCase("th");
  return OFF_ALIASES.has(normalized) ? "OFF" : normalized;
}

export function parseShiftPattern(value: string) {
  const tokens = value.split(/[\s,;|]+/u).map(normalizeShiftCode).filter(Boolean);
  if (!tokens.length) throw new Error("กรุณากำหนดรอบกะอย่างน้อย 1 วัน");
  if (tokens.length > SHIFT_PATTERN_MAX_CYCLE_DAYS) throw new Error(`รอบกะยาวได้ไม่เกิน ${SHIFT_PATTERN_MAX_CYCLE_DAYS} วัน`);
  return tokens;
}

function validateDefinitions(definitions: ShiftDefinition[]) {
  if (!definitions.length) throw new Error("กรุณากำหนดประเภทกะอย่างน้อย 1 ประเภท");
  if (definitions.length > SHIFT_PATTERN_MAX_DEFINITIONS) throw new Error(`กำหนดประเภทกะได้ไม่เกิน ${SHIFT_PATTERN_MAX_DEFINITIONS} ประเภท`);
  const map = new Map<string, ShiftDefinition & { grossMinutes: number; netMinutes: number; isOvernight: boolean }>();
  definitions.forEach((definition, index) => {
    const code = normalizeShiftCode(definition.code);
    const row = `กะที่ ${index + 1}`;
    if (code === "OFF") throw new Error(`${row}: OFF เป็นรหัสวันหยุดที่สงวนไว้`);
    if (!CODE_PATTERN.test(code)) throw new Error(`${row}: รหัสกะใช้ตัวอักษร ตัวเลข _ หรือ - ได้ไม่เกิน 8 ตัว`);
    if (map.has(code)) throw new Error(`${row}: รหัสกะ ${code} ซ้ำ`);
    const label = definition.label.trim();
    if (!label || label.length > 60) throw new Error(`${row}: ชื่อกะต้องมี 1–60 ตัวอักษร`);
    if (!Number.isInteger(definition.breakMinutes) || definition.breakMinutes < 0 || definition.breakMinutes > SHIFT_PATTERN_MAX_BREAK_MINUTES) {
      throw new Error(`${row}: เวลาพักต้องเป็นจำนวนนาที 0–${SHIFT_PATTERN_MAX_BREAK_MINUTES}`);
    }
    const start = parseClockTime(definition.startTime);
    const end = parseClockTime(definition.endTime);
    if (start === end) throw new Error(`${row}: เวลาเริ่มและสิ้นสุดต้องไม่เท่ากัน`);
    const isOvernight = end < start;
    const grossMinutes = (isOvernight ? end + 1_440 : end) - start;
    if (definition.breakMinutes >= grossMinutes) throw new Error(`${row}: เวลาพักต้องน้อยกว่าระยะเวลากะ`);
    map.set(code, { ...definition, code, label, grossMinutes, netMinutes: grossMinutes - definition.breakMinutes, isOvernight });
  });
  return map;
}

export function calculateShiftPattern(input: ShiftPatternInput): ShiftPatternResult {
  const start = parseDate(input.startDate, "วันที่เริ่มต้น");
  const end = parseDate(input.endDate, "วันที่สิ้นสุด");
  if (end < start) throw new Error("วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น");
  const calendarDays = inclusiveDays(start, end);
  if (calendarDays > SHIFT_PATTERN_MAX_DAYS) throw new Error(`สร้างปฏิทินได้ไม่เกิน ${SHIFT_PATTERN_MAX_DAYS} วันต่อครั้ง`);
  if (!input.pattern.length || input.pattern.length > SHIFT_PATTERN_MAX_CYCLE_DAYS) throw new Error(`รอบกะต้องมี 1–${SHIFT_PATTERN_MAX_CYCLE_DAYS} วัน`);
  if (!Number.isInteger(input.startCycleDay) || input.startCycleDay < 1 || input.startCycleDay > input.pattern.length) {
    throw new Error(`วันเริ่มรอบต้องอยู่ระหว่าง 1–${input.pattern.length}`);
  }

  const definitions = validateDefinitions(input.definitions);
  const pattern = input.pattern.map(normalizeShiftCode);
  pattern.forEach((code, index) => {
    if (code !== "OFF" && !definitions.has(code)) throw new Error(`รอบกะวันที่ ${index + 1}: ไม่พบประเภทกะรหัส ${code}`);
  });

  const days: ShiftPatternDay[] = [];
  const shiftTotals = new Map<string, ShiftPatternBreakdown>();
  const monthTotals = new Map<string, ShiftPatternMonth>();
  let workingDays = 0;
  let offDays = 0;
  let overnightShifts = 0;
  let grossMinutes = 0;
  let breakMinutes = 0;
  let netMinutes = 0;

  for (let offset = 0; offset < calendarDays; offset += 1) {
    const current = addDays(start, offset);
    const cycleIndex = (offset + input.startCycleDay - 1) % pattern.length;
    const code = pattern[cycleIndex]!;
    const definition = definitions.get(code);
    const isOff = code === "OFF";
    const day: ShiftPatternDay = {
      date: dateKey(current),
      weekday: current.getUTCDay(),
      cycleDay: cycleIndex + 1,
      code,
      label: isOff ? "วันหยุด" : definition!.label,
      isOff,
      startTime: definition?.startTime,
      endTime: definition?.endTime,
      isOvernight: definition?.isOvernight ?? false,
      grossMinutes: definition?.grossMinutes ?? 0,
      breakMinutes: definition?.breakMinutes ?? 0,
      netMinutes: definition?.netMinutes ?? 0,
    };
    days.push(day);

    if (isOff) offDays += 1;
    else {
      workingDays += 1;
      overnightShifts += Number(day.isOvernight);
      grossMinutes += day.grossMinutes;
      breakMinutes += day.breakMinutes;
      netMinutes += day.netMinutes;
      const total = shiftTotals.get(code) ?? { code, label: day.label, count: 0, netMinutes: 0 };
      total.count += 1;
      total.netMinutes += day.netMinutes;
      shiftTotals.set(code, total);
    }

    const monthKey = day.date.slice(0, 7);
    const month = monthTotals.get(monthKey) ?? { month: monthKey, days: 0, workingDays: 0, offDays: 0, netMinutes: 0 };
    month.days += 1;
    month.workingDays += Number(!isOff);
    month.offDays += Number(isOff);
    month.netMinutes += day.netMinutes;
    monthTotals.set(monthKey, month);
  }

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    cycleLength: pattern.length,
    startCycleDay: input.startCycleDay,
    days,
    months: [...monthTotals.values()],
    shifts: [...shiftTotals.values()],
    calendarDays,
    workingDays,
    offDays,
    overnightShifts,
    grossMinutes,
    breakMinutes,
    netMinutes,
  };
}

function csvCell(value: string | number) {
  let normalized = String(value);
  if (CSV_FORMULA_PATTERN.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function shiftPatternCsv(result: ShiftPatternResult) {
  const rows = [
    ["วันที่", "วัน", "วันในรอบ", "รหัส", "ชื่อกะ", "เวลาเริ่ม", "เวลาสิ้นสุด", "ข้ามวัน", "พัก (นาที)", "ชั่วโมงสุทธิ", "ชั่วโมงทศนิยม"],
    ...result.days.map((day) => [day.date, day.weekday, day.cycleDay, day.code, day.label, day.startTime ?? "", day.endTime ?? "", day.isOvernight ? "ใช่" : "ไม่ใช่", day.breakMinutes, formatDuration(day.netMinutes), formatDecimalHours(day.netMinutes)]),
    [],
    ["รวม", "", "", "", "", "", "", "", result.breakMinutes, formatDuration(result.netMinutes), formatDecimalHours(result.netMinutes)],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function icsEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\r\n", "\\n").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const segments: string[] = [];
  let segment = "";
  let limit = 75;
  for (const character of line) {
    if (encoder.encode(segment + character).length > limit && segment) {
      segments.push(segment);
      segment = character;
      limit = 74;
    } else segment += character;
  }
  if (segment) segments.push(segment);
  return segments.join("\r\n ");
}

function compactDate(value: string) {
  return value.replaceAll("-", "");
}

function compactDateTime(date: string, time: string) {
  return `${compactDate(date)}T${time.replace(":", "")}00`;
}

function utcStamp(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function shiftPatternIcs(result: ShiftPatternResult, includeOffDays = false, generatedAt = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Meaw Tools//Shift Pattern Calendar//TH", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:ตารางกะ Meaw Tools"];
  for (const day of result.days) {
    if (day.isOff && !includeOffDays) continue;
    lines.push("BEGIN:VEVENT", `UID:meaw-shift-${day.date}-${day.code.toLocaleLowerCase("en-US")}@meaw-tools.vercel.app`, `DTSTAMP:${utcStamp(generatedAt)}`);
    if (day.isOff) {
      const nextDate = dateKey(addDays(parseDate(day.date, "วันที่"), 1));
      lines.push(`DTSTART;VALUE=DATE:${compactDate(day.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDate)}`, "SUMMARY:วันหยุด", "TRANSP:TRANSPARENT");
    } else {
      const endDate = day.isOvernight ? dateKey(addDays(parseDate(day.date, "วันที่"), 1)) : day.date;
      lines.push(`DTSTART:${compactDateTime(day.date, day.startTime!)}`, `DTEND:${compactDateTime(endDate, day.endTime!)}`, `SUMMARY:${icsEscape(`${day.code} · ${day.label}`)}`, `DESCRIPTION:${icsEscape(`รอบกะวันที่ ${day.cycleDay} · พัก ${day.breakMinutes} นาที · สุทธิ ${formatDuration(day.netMinutes)} · เวลาแบบ local/floating`)}`, "TRANSP:OPAQUE");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
