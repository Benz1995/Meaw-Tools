export const BUSINESS_DAYS_MIN_YEAR = 1900;
export const BUSINESS_DAYS_MAX_YEAR = 2100;
export const BUSINESS_DAYS_MAX_RANGE = 3_660;
export const BUSINESS_DAYS_MAX_SHIFT = 5_000;
export const BUSINESS_DAYS_MAX_CUSTOM_HOLIDAYS = 500;

export const BOT_HOLIDAY_SOURCE_URL = "https://www.bot.or.th/th/financial-institutions-holiday.html";
export const BOT_HOLIDAY_RULESET = {
  year: 2026,
  buddhistYear: 2569,
  updatedAt: "2026-06-09",
  scope: "วันหยุดสถาบันการเงินและสถาบันการเงินเฉพาะกิจ",
} as const;

export type BusinessDayMode = "range" | "shift";
export type BusinessDayDirection = "add" | "subtract";
export type HolidayPreset = "none" | "bot-2026-national" | "bot-2026-bangkok";
export type DayRecordType = "working" | "weekly-off" | "holiday";

export type HolidayDefinition = {
  date: string;
  name: string;
  source: "preset" | "custom";
};

export type BusinessDayRecord = {
  date: string;
  weekday: number;
  type: DayRecordType;
  holidayName: string | null;
  holidaySource: HolidayDefinition["source"] | null;
};

export type BusinessDayMonthSummary = {
  month: string;
  calendarDays: number;
  workingDays: number;
  weeklyDaysOff: number;
  holidaysExcluded: number;
};

export type BusinessDayResult = {
  startDate: string;
  endDate: string;
  calendarDays: number;
  workingDays: number;
  weeklyDaysOff: number;
  holidaysExcluded: number;
  holidaysOnWeeklyDaysOff: number;
  records: BusinessDayRecord[];
  months: BusinessDayMonthSummary[];
};

const BOT_2026_NATIONAL_HOLIDAYS: ReadonlyArray<Omit<HolidayDefinition, "source">> = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่" },
  { date: "2026-01-02", name: "วันหยุดทำการเพิ่มเป็นกรณีพิเศษ" },
  { date: "2026-03-03", name: "วันมาฆบูชา" },
  { date: "2026-04-06", name: "วันจักรี" },
  { date: "2026-04-13", name: "วันสงกรานต์" },
  { date: "2026-04-14", name: "วันสงกรานต์" },
  { date: "2026-04-15", name: "วันสงกรานต์" },
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ" },
  { date: "2026-05-04", name: "วันฉัตรมงคล" },
  { date: "2026-06-01", name: "วันหยุดชดเชยวันวิสาขบูชา" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี" },
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว" },
  { date: "2026-07-29", name: "วันอาสาฬหบูชา" },
  { date: "2026-08-12", name: "วันแม่แห่งชาติ" },
  { date: "2026-10-13", name: "วันนวมินทรมหาราช" },
  { date: "2026-10-23", name: "วันปิยมหาราช" },
  { date: "2026-12-07", name: "วันหยุดชดเชยวันพ่อแห่งชาติ" },
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ" },
  { date: "2026-12-31", name: "วันสิ้นปี" },
];

const BOT_2026_BANGKOK_SPECIAL: Omit<HolidayDefinition, "source"> = {
  date: "2026-10-16",
  name: "วันหยุดทำการเพิ่มเป็นกรณีพิเศษในพื้นที่กรุงเทพมหานคร",
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const CUSTOM_HOLIDAY_LINE_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[\t,]\s*(.*))?$/u;

function parseIsoDate(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) throw new Error("รูปแบบวันที่ต้องเป็น YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < BUSINESS_DAYS_MIN_YEAR || year > BUSINESS_DAYS_MAX_YEAR) {
    throw new Error(`รองรับปี ${BUSINESS_DAYS_MIN_YEAR} ถึง ${BUSINESS_DAYS_MAX_YEAR}`);
  }
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`วันที่ ${value} ไม่ถูกต้อง`);
  }
  return date;
}

function formatIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addCalendarDays(value: string, amount: number) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatIsoDate(date);
}

function calendarDayDifference(start: string, end: string) {
  return Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / 86_400_000);
}

function validateWorkingWeekdays(workingWeekdays: number[]) {
  const unique = new Set(workingWeekdays);
  if (!unique.size || unique.size !== workingWeekdays.length || [...unique].some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("ต้องเลือกวันทำงานอย่างน้อย 1 วันและไม่ให้วันซ้ำกัน");
  }
  return unique;
}

export function getPresetHolidays(preset: HolidayPreset): HolidayDefinition[] {
  if (preset === "none") return [];
  const holidays = BOT_2026_NATIONAL_HOLIDAYS.map((holiday) => ({ ...holiday, source: "preset" as const }));
  if (preset === "bot-2026-bangkok") holidays.push({ ...BOT_2026_BANGKOK_SPECIAL, source: "preset" });
  return holidays;
}

export function parseCustomHolidays(input: string): HolidayDefinition[] {
  if (!input.trim()) return [];
  const holidays = new Map<string, HolidayDefinition>();
  const lines = input.split(/\r?\n/u).filter((line) => line.trim());
  if (lines.length > BUSINESS_DAYS_MAX_CUSTOM_HOLIDAYS) {
    throw new Error(`กรอกวันหยุดกำหนดเองได้สูงสุด ${BUSINESS_DAYS_MAX_CUSTOM_HOLIDAYS} รายการ`);
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line.length > 120) throw new Error(`รายการวันหยุดบรรทัดที่ ${index + 1} ยาวเกิน 120 ตัวอักษร`);
    const match = CUSTOM_HOLIDAY_LINE_PATTERN.exec(line);
    if (!match) throw new Error(`รายการวันหยุดบรรทัดที่ ${index + 1} ต้องเป็น YYYY-MM-DD หรือ YYYY-MM-DD, ชื่อวันหยุด`);
    const date = formatIsoDate(parseIsoDate(match[1]!));
    const name = (match[2]?.trim() || "วันหยุดกำหนดเอง").replace(/\s+/gu, " ");
    if (Array.from(name).length > 80) throw new Error(`ชื่อวันหยุดบรรทัดที่ ${index + 1} ยาวเกิน 80 ตัวอักษร`);
    holidays.set(date, { date, name, source: "custom" });
  });

  return [...holidays.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function buildHolidayMap(preset: HolidayPreset, customInput: string) {
  const holidays = new Map<string, HolidayDefinition>();
  getPresetHolidays(preset).forEach((holiday) => holidays.set(holiday.date, holiday));
  parseCustomHolidays(customInput).forEach((holiday) => holidays.set(holiday.date, holiday));
  return holidays;
}

function classifyDay(date: string, workingWeekdays: Set<number>, holidays: Map<string, HolidayDefinition>): BusinessDayRecord {
  const weekday = parseIsoDate(date).getUTCDay();
  const holiday = holidays.get(date);
  if (!workingWeekdays.has(weekday)) {
    return { date, weekday, type: "weekly-off", holidayName: holiday?.name ?? null, holidaySource: holiday?.source ?? null };
  }
  if (holiday) {
    return { date, weekday, type: "holiday", holidayName: holiday.name, holidaySource: holiday.source };
  }
  return { date, weekday, type: "working", holidayName: null, holidaySource: null };
}

function summarizeRecords(records: BusinessDayRecord[]) {
  const months = new Map<string, BusinessDayMonthSummary>();
  let workingDays = 0;
  let weeklyDaysOff = 0;
  let holidaysExcluded = 0;
  let holidaysOnWeeklyDaysOff = 0;

  records.forEach((record) => {
    if (record.type === "working") workingDays += 1;
    if (record.type === "weekly-off") weeklyDaysOff += 1;
    if (record.type === "holiday") holidaysExcluded += 1;
    if (record.type === "weekly-off" && record.holidayName) holidaysOnWeeklyDaysOff += 1;
    const monthKey = record.date.slice(0, 7);
    const current = months.get(monthKey) ?? { month: monthKey, calendarDays: 0, workingDays: 0, weeklyDaysOff: 0, holidaysExcluded: 0 };
    current.calendarDays += 1;
    if (record.type === "working") current.workingDays += 1;
    if (record.type === "weekly-off") current.weeklyDaysOff += 1;
    if (record.type === "holiday") current.holidaysExcluded += 1;
    months.set(monthKey, current);
  });

  return { workingDays, weeklyDaysOff, holidaysExcluded, holidaysOnWeeklyDaysOff, months: [...months.values()] };
}

export function calculateBusinessDaysRange(input: {
  startDate: string;
  endDate: string;
  includeStart: boolean;
  includeEnd: boolean;
  workingWeekdays: number[];
  preset: HolidayPreset;
  customHolidays: string;
}): BusinessDayResult {
  parseIsoDate(input.startDate);
  parseIsoDate(input.endDate);
  const span = calendarDayDifference(input.startDate, input.endDate);
  if (span < 0) throw new Error("วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น");
  if (span > BUSINESS_DAYS_MAX_RANGE) throw new Error(`ช่วงวันที่ต้องไม่เกิน ${BUSINESS_DAYS_MAX_RANGE.toLocaleString("en-US")} วัน`);
  const workingWeekdays = validateWorkingWeekdays(input.workingWeekdays);
  const holidays = buildHolidayMap(input.preset, input.customHolidays);
  const firstDate = addCalendarDays(input.startDate, input.includeStart ? 0 : 1);
  const lastDate = addCalendarDays(input.endDate, input.includeEnd ? 0 : -1);
  const records: BusinessDayRecord[] = [];

  if (calendarDayDifference(firstDate, lastDate) >= 0) {
    for (let date = firstDate; calendarDayDifference(date, lastDate) >= 0; date = addCalendarDays(date, 1)) {
      records.push(classifyDay(date, workingWeekdays, holidays));
    }
  }

  const summary = summarizeRecords(records);
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    calendarDays: records.length,
    ...summary,
    records,
  };
}

export function shiftBusinessDate(input: {
  startDate: string;
  businessDays: number;
  direction: BusinessDayDirection;
  workingWeekdays: number[];
  preset: HolidayPreset;
  customHolidays: string;
}): BusinessDayResult {
  parseIsoDate(input.startDate);
  if (!Number.isInteger(input.businessDays) || input.businessDays < 0 || input.businessDays > BUSINESS_DAYS_MAX_SHIFT) {
    throw new Error(`จำนวนวันทำการต้องเป็นจำนวนเต็ม 0 ถึง ${BUSINESS_DAYS_MAX_SHIFT.toLocaleString("en-US")}`);
  }
  const workingWeekdays = validateWorkingWeekdays(input.workingWeekdays);
  const holidays = buildHolidayMap(input.preset, input.customHolidays);
  const direction = input.direction === "subtract" ? -1 : 1;
  const records: BusinessDayRecord[] = [];
  let current = input.startDate;
  let counted = 0;

  while (counted < input.businessDays) {
    current = addCalendarDays(current, direction);
    const record = classifyDay(current, workingWeekdays, holidays);
    records.push(record);
    if (record.type === "working") counted += 1;
    if (records.length > 20_000) throw new Error("ไม่สามารถหาวันเป้าหมายได้จากวันทำงานที่เลือก");
  }

  const summary = summarizeRecords(records);
  return {
    startDate: input.startDate,
    endDate: current,
    calendarDays: records.length,
    ...summary,
    records,
  };
}

function safeCsvCell(value: string) {
  const safeValue = /^[=+@-]/u.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function businessDaysCsv(records: BusinessDayRecord[]) {
  const rows = records.map((record) => [
    record.date,
    String(record.weekday),
    record.type,
    record.holidayName ?? "",
    record.holidaySource ?? "",
  ].map(safeCsvCell).join(","));
  return `\uFEFFdate,weekday,type,holiday_name,holiday_source\r\n${rows.join("\r\n")}`;
}
