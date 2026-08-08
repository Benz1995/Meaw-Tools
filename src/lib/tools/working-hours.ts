export const WORKING_HOURS_MAX_ENTRIES = 62;
export const WORKING_HOURS_MAX_BREAK_MINUTES = 720;
export const WORKING_HOURS_MAX_TARGET_MINUTES = 44_640;

export type WorkingHoursRounding = 0 | 5 | 6 | 10 | 15;

export type WorkingHoursEntry = {
  id: string;
  date: string;
  label: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

export type WorkingHoursInput = {
  entries: WorkingHoursEntry[];
  roundingMinutes: WorkingHoursRounding;
  targetMinutes?: number;
};

export type WorkingHoursRow = WorkingHoursEntry & {
  grossMinutes: number;
  netMinutes: number;
  roundedNetMinutes: number;
  roundingDeltaMinutes: number;
  isOvernight: boolean;
};

export type WorkingHoursResult = {
  rows: WorkingHoursRow[];
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  roundedNetMinutes: number;
  roundingDeltaMinutes: number;
  shiftCount: number;
  dateCount: number;
  overnightCount: number;
  averageMinutes: number;
  targetMinutes?: number;
  targetDifferenceMinutes?: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CSV_FORMULA_PATTERN = /^[=+\-@\t\r]/;

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function parseClockTime(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error("เวลาเข้าและออกต้องอยู่ในรูปแบบ HH:mm");
  return Number(match[1]) * 60 + Number(match[2]);
}

export function roundMinutes(value: number, increment: WorkingHoursRounding) {
  return increment === 0 ? value : Math.round(value / increment) * increment;
}

function validateEntry(entry: WorkingHoursEntry, index: number) {
  const rowLabel = `แถวที่ ${index + 1}`;
  if (!entry.id) throw new Error(`${rowLabel}: ไม่พบรหัสรายการ`);
  if (!isValidDate(entry.date)) throw new Error(`${rowLabel}: กรุณากรอกวันที่ที่ถูกต้อง`);
  if (entry.label.length > 80) throw new Error(`${rowLabel}: หมายเหตุยาวเกิน 80 ตัวอักษร`);
  if (!Number.isInteger(entry.breakMinutes) || entry.breakMinutes < 0 || entry.breakMinutes > WORKING_HOURS_MAX_BREAK_MINUTES) {
    throw new Error(`${rowLabel}: เวลาพักต้องเป็นจำนวนนาที 0–${WORKING_HOURS_MAX_BREAK_MINUTES}`);
  }
}

function calculateRow(entry: WorkingHoursEntry, index: number, roundingMinutes: WorkingHoursRounding): WorkingHoursRow {
  validateEntry(entry, index);
  const start = parseClockTime(entry.startTime);
  const end = parseClockTime(entry.endTime);
  if (start === end) throw new Error(`แถวที่ ${index + 1}: เวลาเข้าและออกต้องไม่เท่ากัน`);

  const isOvernight = end < start;
  const grossMinutes = (isOvernight ? end + 1_440 : end) - start;
  if (entry.breakMinutes >= grossMinutes) throw new Error(`แถวที่ ${index + 1}: เวลาพักต้องน้อยกว่าระยะเวลากะ`);

  const netMinutes = grossMinutes - entry.breakMinutes;
  const roundedNetMinutes = roundMinutes(netMinutes, roundingMinutes);
  return {
    ...entry,
    grossMinutes,
    netMinutes,
    roundedNetMinutes,
    roundingDeltaMinutes: roundedNetMinutes - netMinutes,
    isOvernight,
  };
}

export function calculateWorkingHours(input: WorkingHoursInput): WorkingHoursResult {
  if (!input.entries.length) throw new Error("กรุณาเพิ่มเวลาทำงานอย่างน้อย 1 รายการ");
  if (input.entries.length > WORKING_HOURS_MAX_ENTRIES) throw new Error(`รองรับไม่เกิน ${WORKING_HOURS_MAX_ENTRIES} รายการต่อครั้ง`);
  if (![0, 5, 6, 10, 15].includes(input.roundingMinutes)) throw new Error("หน่วยปัดเวลาไม่ถูกต้อง");
  if (input.targetMinutes !== undefined && (!Number.isInteger(input.targetMinutes) || input.targetMinutes < 0 || input.targetMinutes > WORKING_HOURS_MAX_TARGET_MINUTES)) {
    throw new Error(`ชั่วโมงเป้าหมายต้องอยู่ระหว่าง 0–${WORKING_HOURS_MAX_TARGET_MINUTES / 60} ชั่วโมง`);
  }

  const ids = new Set<string>();
  const rows = input.entries.map((entry, index) => {
    if (ids.has(entry.id)) throw new Error(`แถวที่ ${index + 1}: รหัสรายการซ้ำ`);
    ids.add(entry.id);
    return calculateRow(entry, index, input.roundingMinutes);
  });

  let grossMinutes = 0;
  let breakMinutes = 0;
  let netMinutes = 0;
  let roundedNetMinutes = 0;
  let overnightCount = 0;
  const dates = new Set<string>();
  for (const row of rows) {
    grossMinutes += row.grossMinutes;
    breakMinutes += row.breakMinutes;
    netMinutes += row.netMinutes;
    roundedNetMinutes += row.roundedNetMinutes;
    overnightCount += Number(row.isOvernight);
    dates.add(row.date);
  }

  return {
    rows,
    grossMinutes,
    breakMinutes,
    netMinutes,
    roundedNetMinutes,
    roundingDeltaMinutes: roundedNetMinutes - netMinutes,
    shiftCount: rows.length,
    dateCount: dates.size,
    overnightCount,
    averageMinutes: Math.round(netMinutes / rows.length),
    targetMinutes: input.targetMinutes,
    targetDifferenceMinutes: input.targetMinutes === undefined ? undefined : roundedNetMinutes - input.targetMinutes,
  };
}

export function formatDuration(minutes: number) {
  const sign = minutes < 0 ? "−" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  if (hours && remainder) return `${sign}${hours} ชม. ${remainder} นาที`;
  if (hours) return `${sign}${hours} ชม.`;
  return `${sign}${remainder} นาที`;
}

export function formatDecimalHours(minutes: number) {
  return (minutes / 60).toFixed(2);
}

function csvCell(value: string | number) {
  let normalized = String(value);
  if (CSV_FORMULA_PATTERN.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function workingHoursCsv(result: WorkingHoursResult) {
  const rows = [
    ["วันที่", "หมายเหตุ", "เวลาเข้า", "เวลาออก", "ข้ามวัน", "พัก (นาที)", "ก่อนหักพัก", "สุทธิจริง", "สุทธิหลังปัด", "สุทธิทศนิยม"],
    ...result.rows.map((row) => [
      row.date,
      row.label,
      row.startTime,
      row.endTime,
      row.isOvernight ? "ใช่" : "ไม่ใช่",
      row.breakMinutes,
      formatDuration(row.grossMinutes),
      formatDuration(row.netMinutes),
      formatDuration(row.roundedNetMinutes),
      formatDecimalHours(row.roundedNetMinutes),
    ]),
    [],
    ["รวม", "", "", "", "", result.breakMinutes, formatDuration(result.grossMinutes), formatDuration(result.netMinutes), formatDuration(result.roundedNetMinutes), formatDecimalHours(result.roundedNetMinutes)],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
