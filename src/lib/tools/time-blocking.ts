export const TIME_BLOCKING_STORAGE_KEY = "meaw-time-blocking-v1";
export const TIME_BLOCKING_MAX_DAYS = 60;
export const TIME_BLOCKING_MAX_BLOCKS_PER_DAY = 40;
export const TIME_BLOCKING_MAX_TITLE_LENGTH = 80;
export const TIME_BLOCKING_MAX_NOTES_LENGTH = 300;
export const TIME_BLOCKING_MAX_STORAGE_LENGTH = 2_000_000;

export type TimeBlockCategory = "focus" | "meeting" | "admin" | "break" | "personal" | "study" | "creative";
export type TimeBlockingTemplateKey = "balanced" | "deep-work" | "study";

export type TimeBlock = {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  category: TimeBlockCategory;
  notes: string;
  completed: boolean;
};

export type TimeBlockingSettings = {
  dayStartMinutes: number;
  dayEndMinutes: number;
  snapMinutes: 15 | 30 | 60;
  dailyFocusGoalMinutes: number;
};

export type TimeBlockingStoredState = {
  settings: TimeBlockingSettings;
  schedules: Record<string, TimeBlock[]>;
};

export type TimeBlockingMetrics = {
  plannedMinutes: number;
  freeMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
  completedMinutes: number;
  completionPercent: number;
  longestFreeMinutes: number;
  completedBlocks: number;
};

export type TimeBlockingGap = { startMinutes: number; endMinutes: number };

export type TimeBlockingTemplateBlock = Omit<TimeBlock, "id" | "completed">;

export const DEFAULT_TIME_BLOCKING_SETTINGS: TimeBlockingSettings = {
  dayStartMinutes: 6 * 60,
  dayEndMinutes: 23 * 60,
  snapMinutes: 15,
  dailyFocusGoalMinutes: 180,
};

export const TIME_BLOCKING_CATEGORY_LABELS: Record<TimeBlockCategory, string> = {
  focus: "งานโฟกัส",
  meeting: "ประชุม",
  admin: "งานทั่วไป",
  break: "พัก",
  personal: "ส่วนตัว",
  study: "เรียน",
  creative: "งานสร้างสรรค์",
};

export const TIME_BLOCKING_TEMPLATES: Record<TimeBlockingTemplateKey, { label: string; description: string; blocks: TimeBlockingTemplateBlock[] }> = {
  balanced: {
    label: "วันทำงานสมดุล",
    description: "โฟกัส ประชุม พัก และสรุปงาน",
    blocks: [
      { title: "วางแผนและจัดลำดับงาน", startMinutes: 9 * 60, endMinutes: 9 * 60 + 30, category: "admin", notes: "เลือกงานสำคัญไม่เกิน 3 เรื่อง" },
      { title: "Deep Work", startMinutes: 9 * 60 + 30, endMinutes: 11 * 60 + 30, category: "focus", notes: "ปิดการแจ้งเตือนและทำงานเดียว" },
      { title: "พักกลางวัน", startMinutes: 12 * 60, endMinutes: 13 * 60, category: "break", notes: "" },
      { title: "ประชุมและตอบข้อความ", startMinutes: 13 * 60, endMinutes: 14 * 60 + 30, category: "meeting", notes: "รวมงานสื่อสารไว้ในช่วงเดียว" },
      { title: "โฟกัสรอบบ่าย", startMinutes: 14 * 60 + 45, endMinutes: 16 * 60 + 45, category: "focus", notes: "" },
      { title: "สรุปและเตรียมพรุ่งนี้", startMinutes: 17 * 60, endMinutes: 17 * 60 + 30, category: "admin", notes: "" },
    ],
  },
  "deep-work": {
    label: "Deep Work",
    description: "สองช่วงโฟกัสยาวพร้อมเวลาฟื้นตัว",
    blocks: [
      { title: "เตรียมงานสำคัญ", startMinutes: 8 * 60 + 30, endMinutes: 9 * 60, category: "admin", notes: "กำหนดผลลัพธ์ที่ต้องส่งมอบ" },
      { title: "Deep Work รอบเช้า", startMinutes: 9 * 60, endMinutes: 11 * 60 + 30, category: "focus", notes: "" },
      { title: "พักและเดิน", startMinutes: 11 * 60 + 30, endMinutes: 12 * 60, category: "break", notes: "" },
      { title: "งานสื่อสาร", startMinutes: 13 * 60, endMinutes: 14 * 60, category: "meeting", notes: "ประชุม อีเมล และข้อความ" },
      { title: "Deep Work รอบบ่าย", startMinutes: 14 * 60 + 30, endMinutes: 17 * 60, category: "focus", notes: "" },
    ],
  },
  study: {
    label: "วันอ่านหนังสือ",
    description: "แบ่งวิชา ทบทวน และพักเป็นช่วง",
    blocks: [
      { title: "วิชาหลัก", startMinutes: 9 * 60, endMinutes: 10 * 60 + 30, category: "study", notes: "อ่านเนื้อหาใหม่" },
      { title: "พัก", startMinutes: 10 * 60 + 30, endMinutes: 10 * 60 + 45, category: "break", notes: "" },
      { title: "ทำแบบฝึกหัด", startMinutes: 10 * 60 + 45, endMinutes: 12 * 60, category: "study", notes: "" },
      { title: "พักกลางวัน", startMinutes: 12 * 60, endMinutes: 13 * 60, category: "break", notes: "" },
      { title: "วิชารอง", startMinutes: 13 * 60 + 30, endMinutes: 15 * 60, category: "study", notes: "" },
      { title: "สรุปด้วยคำของตัวเอง", startMinutes: 15 * 60 + 15, endMinutes: 16 * 60, category: "creative", notes: "" },
    ],
  },
};

const CATEGORIES = Object.keys(TIME_BLOCKING_CATEGORY_LABELS) as TimeBlockCategory[];

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

export function isTimeBlockingDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function timeBlockingToday(nowMs = Date.now()): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? hour * 60 + minute : null;
}

export function minutesToTime(value: number): string {
  const minutes = clampInteger(value, 0, 23 * 60 + 59, 0);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function formatTimeBlockingDuration(minutes: number): string {
  const safe = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (!hours) return `${remainder} นาที`;
  return `${hours} ชม.${remainder ? ` ${remainder} นาที` : ""}`;
}

export function normalizeTimeBlockingSettings(value: Partial<TimeBlockingSettings> | null | undefined): TimeBlockingSettings {
  const dayStartMinutes = clampInteger(value?.dayStartMinutes, 0, 22 * 60, DEFAULT_TIME_BLOCKING_SETTINGS.dayStartMinutes);
  const requestedEnd = clampInteger(value?.dayEndMinutes, 60, 23 * 60 + 59, DEFAULT_TIME_BLOCKING_SETTINGS.dayEndMinutes);
  const dayEndMinutes = requestedEnd >= dayStartMinutes + 60 ? requestedEnd : Math.min(23 * 60 + 59, dayStartMinutes + 60);
  const snapMinutes = value?.snapMinutes === 30 || value?.snapMinutes === 60 ? value.snapMinutes : 15;
  return {
    dayStartMinutes,
    dayEndMinutes,
    snapMinutes,
    dailyFocusGoalMinutes: clampInteger(value?.dailyFocusGoalMinutes, 15, 720, DEFAULT_TIME_BLOCKING_SETTINGS.dailyFocusGoalMinutes),
  };
}

function normalizeCategory(value: unknown): TimeBlockCategory {
  return typeof value === "string" && CATEGORIES.includes(value as TimeBlockCategory) ? value as TimeBlockCategory : "focus";
}

function normalizeBlock(value: Partial<TimeBlock>, index: number, settings: TimeBlockingSettings): TimeBlock | null {
  const title = cleanText(value.title, TIME_BLOCKING_MAX_TITLE_LENGTH);
  const rawStart = Number(value.startMinutes);
  const rawEnd = Number(value.endMinutes);
  const startMinutes = Number.isInteger(rawStart) ? rawStart : -1;
  const endMinutes = Number.isInteger(rawEnd) ? rawEnd : -1;
  if (!title || startMinutes < settings.dayStartMinutes || endMinutes <= startMinutes || endMinutes - startMinutes < 15) return null;
  if (endMinutes > settings.dayEndMinutes) return null;
  return {
    id: cleanText(value.id, 80) || `restored-${index}`,
    title,
    startMinutes,
    endMinutes,
    category: normalizeCategory(value.category),
    notes: cleanText(value.notes, TIME_BLOCKING_MAX_NOTES_LENGTH),
    completed: value.completed === true,
  };
}

export function findTimeBlockConflicts(blocks: TimeBlock[], candidate: Pick<TimeBlock, "startMinutes" | "endMinutes">, ignoreId?: string): TimeBlock[] {
  return blocks.filter((block) => block.id !== ignoreId && candidate.startMinutes < block.endMinutes && candidate.endMinutes > block.startMinutes);
}

export function upsertTimeBlock(blocks: TimeBlock[], candidate: TimeBlock, settings: TimeBlockingSettings): TimeBlock[] {
  const normalizedSettings = normalizeTimeBlockingSettings(settings);
  const normalized = normalizeBlock(candidate, blocks.length, normalizedSettings);
  if (!normalized) throw new Error("กรอกชื่องานและเวลาอย่างน้อย 15 นาทีภายในช่วงวันที่แสดง");
  if (findTimeBlockConflicts(blocks, normalized, normalized.id).length) throw new Error("ช่วงเวลานี้ทับกับบล็อกอื่น กรุณาเลือกเวลาว่างหรือเลื่อนบล็อกเดิม");
  return [...blocks.filter((block) => block.id !== normalized.id), normalized]
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes || left.id.localeCompare(right.id));
}

export function shiftTimeBlock(blocks: TimeBlock[], id: string, deltaMinutes: number, settings: TimeBlockingSettings): TimeBlock[] {
  const current = blocks.find((block) => block.id === id);
  if (!current) throw new Error("ไม่พบบล็อกเวลาที่ต้องการเลื่อน");
  const shifted = { ...current, startMinutes: current.startMinutes + deltaMinutes, endMinutes: current.endMinutes + deltaMinutes };
  if (shifted.startMinutes < settings.dayStartMinutes || shifted.endMinutes > settings.dayEndMinutes) throw new Error("เลื่อนต่อไม่ได้เพราะเกินช่วงเวลาของวัน");
  return upsertTimeBlock(blocks, shifted, settings);
}

export function findTimeBlockingGaps(blocks: TimeBlock[], settings: TimeBlockingSettings): TimeBlockingGap[] {
  const normalized = normalizeTimeBlockingSettings(settings);
  const sorted = [...blocks].sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
  const gaps: TimeBlockingGap[] = [];
  let cursor = normalized.dayStartMinutes;
  for (const block of sorted) {
    if (block.startMinutes > cursor) gaps.push({ startMinutes: cursor, endMinutes: block.startMinutes });
    cursor = Math.max(cursor, block.endMinutes);
  }
  if (cursor < normalized.dayEndMinutes) gaps.push({ startMinutes: cursor, endMinutes: normalized.dayEndMinutes });
  return gaps;
}

export function suggestTimeBlockRange(blocks: TimeBlock[], settings: TimeBlockingSettings, anchorMinutes?: number, durationMinutes = 60): TimeBlockingGap {
  const normalized = normalizeTimeBlockingSettings(settings);
  const duration = clampInteger(durationMinutes, 15, 12 * 60, 60);
  const requested = clampInteger(anchorMinutes, normalized.dayStartMinutes, normalized.dayEndMinutes - 15, normalized.dayStartMinutes);
  const snapped = Math.ceil(requested / normalized.snapMinutes) * normalized.snapMinutes;
  const gaps = findTimeBlockingGaps(blocks, normalized);
  for (const gap of gaps) {
    const startMinutes = Math.max(gap.startMinutes, snapped);
    const aligned = Math.ceil(startMinutes / normalized.snapMinutes) * normalized.snapMinutes;
    if (aligned + duration <= gap.endMinutes) return { startMinutes: aligned, endMinutes: aligned + duration };
  }
  const fallback = gaps.find((gap) => gap.endMinutes - gap.startMinutes >= 15);
  if (fallback) return { startMinutes: fallback.startMinutes, endMinutes: Math.min(fallback.endMinutes, fallback.startMinutes + duration) };
  return { startMinutes: normalized.dayStartMinutes, endMinutes: Math.min(normalized.dayEndMinutes, normalized.dayStartMinutes + duration) };
}

export function calculateTimeBlockingMetrics(blocks: TimeBlock[], settings: TimeBlockingSettings): TimeBlockingMetrics {
  const normalized = normalizeTimeBlockingSettings(settings);
  const plannedMinutes = blocks.reduce((total, block) => total + Math.max(0, block.endMinutes - block.startMinutes), 0);
  const focusMinutes = blocks.filter((block) => ["focus", "study", "creative"].includes(block.category)).reduce((total, block) => total + block.endMinutes - block.startMinutes, 0);
  const breakMinutes = blocks.filter((block) => block.category === "break").reduce((total, block) => total + block.endMinutes - block.startMinutes, 0);
  const completedMinutes = blocks.filter((block) => block.completed).reduce((total, block) => total + block.endMinutes - block.startMinutes, 0);
  const gaps = findTimeBlockingGaps(blocks, normalized);
  return {
    plannedMinutes,
    freeMinutes: Math.max(0, normalized.dayEndMinutes - normalized.dayStartMinutes - plannedMinutes),
    focusMinutes,
    breakMinutes,
    completedMinutes,
    completionPercent: plannedMinutes ? Math.round((completedMinutes / plannedMinutes) * 100) : 0,
    longestFreeMinutes: gaps.reduce((longest, gap) => Math.max(longest, gap.endMinutes - gap.startMinutes), 0),
    completedBlocks: blocks.filter((block) => block.completed).length,
  };
}

export function createEmptyTimeBlockingState(): TimeBlockingStoredState {
  return { settings: { ...DEFAULT_TIME_BLOCKING_SETTINGS }, schedules: {} };
}

export function parseTimeBlockingStoredState(raw: string | null): TimeBlockingStoredState {
  const empty = createEmptyTimeBlockingState();
  if (!raw || raw.length > TIME_BLOCKING_MAX_STORAGE_LENGTH) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<TimeBlockingStoredState>;
    const settings = normalizeTimeBlockingSettings(parsed.settings);
    const schedules: Record<string, TimeBlock[]> = {};
    if (parsed.schedules && typeof parsed.schedules === "object" && !Array.isArray(parsed.schedules)) {
      const scheduleEntries = Object.entries(parsed.schedules)
        .filter(([date]) => isTimeBlockingDateKey(date))
        .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
        .slice(0, TIME_BLOCKING_MAX_DAYS);
      for (const [date, candidates] of scheduleEntries) {
        if (!isTimeBlockingDateKey(date) || !Array.isArray(candidates)) continue;
        const accepted: TimeBlock[] = [];
        const ids = new Set<string>();
        for (const [index, candidate] of candidates.slice(0, TIME_BLOCKING_MAX_BLOCKS_PER_DAY).entries()) {
          if (!candidate || typeof candidate !== "object") continue;
          const block = normalizeBlock(candidate as Partial<TimeBlock>, index, settings);
          if (!block || ids.has(block.id) || findTimeBlockConflicts(accepted, block).length) continue;
          ids.add(block.id);
          accepted.push(block);
        }
        if (accepted.length) schedules[date] = accepted.sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
      }
    }
    return { settings, schedules };
  } catch {
    return empty;
  }
}

export function serializeTimeBlockingStoredState(state: TimeBlockingStoredState): string {
  const normalized = parseTimeBlockingStoredState(JSON.stringify(state));
  return JSON.stringify({ version: 1, ...normalized });
}

function safeSpreadsheetCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildTimeBlockingCsv(date: string, blocks: TimeBlock[]): string {
  if (!isTimeBlockingDateKey(date)) throw new Error("วันที่ไม่ถูกต้อง");
  const header = ["Date", "Start", "End", "Title", "Category", "Notes", "Completed"];
  const rows = blocks.map((block) => [
    date,
    minutesToTime(block.startMinutes),
    minutesToTime(block.endMinutes),
    block.title,
    TIME_BLOCKING_CATEGORY_LABELS[block.category],
    block.notes,
    block.completed ? "Yes" : "No",
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map((cell) => safeSpreadsheetCell(String(cell))).join(",")).join("\r\n")}`;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const output: string[] = [];
  let current = "";
  for (const character of line) {
    if (current && encoder.encode(current + character).length > 70) {
      output.push(current);
      current = ` ${character}`;
    } else {
      current += character;
    }
  }
  if (current) output.push(current);
  return output.join("\r\n");
}

function icsLocalDateTime(date: string, minutes: number): string {
  const compactDate = date.replace(/-/g, "");
  return `${compactDate}T${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;
}

export function buildTimeBlockingIcs(date: string, blocks: TimeBlock[], nowMs = Date.now()): string {
  if (!isTimeBlockingDateKey(date)) throw new Error("วันที่ไม่ถูกต้อง");
  const stamp = new Date(nowMs).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Meaw Tools//Time Blocking Planner//TH", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeIcsText(`Time Blocking ${date}`)}`];
  for (const [index, block] of blocks.entries()) {
    const cleanId = block.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "block";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${date}-${index}-${cleanId}@meaw-tools`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsLocalDateTime(date, block.startMinutes)}`,
      `DTEND:${icsLocalDateTime(date, block.endMinutes)}`,
      `SUMMARY:${escapeIcsText(block.title)}`,
      `DESCRIPTION:${escapeIcsText(block.notes || `สร้างจาก Meaw Tools • ${TIME_BLOCKING_CATEGORY_LABELS[block.category]}`)}`,
      `CATEGORIES:${escapeIcsText(TIME_BLOCKING_CATEGORY_LABELS[block.category])}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildTimeBlockingSummary(date: string, blocks: TimeBlock[], settings: TimeBlockingSettings): string {
  const metrics = calculateTimeBlockingMetrics(blocks, settings);
  const lines = [`แผน Time Blocking วันที่ ${date}`, `วางแผน ${formatTimeBlockingDuration(metrics.plannedMinutes)} • ว่าง ${formatTimeBlockingDuration(metrics.freeMinutes)}`];
  for (const block of blocks) lines.push(`${block.completed ? "✓" : "○"} ${minutesToTime(block.startMinutes)}–${minutesToTime(block.endMinutes)} ${block.title} (${TIME_BLOCKING_CATEGORY_LABELS[block.category]})`);
  return lines.join("\n");
}
