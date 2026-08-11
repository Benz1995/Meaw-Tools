export const HABIT_TRACKER_STORAGE_KEY = "meaw-habit-tracker-v1";
export const HABIT_TRACKER_MAX_HABITS = 12;
export const HABIT_TRACKER_MAX_TITLE_LENGTH = 60;
export const HABIT_TRACKER_MAX_HISTORY_DAYS = 730;
export const HABIT_TRACKER_MAX_STORAGE_LENGTH = 1_500_000;

export type HabitColor = "mint" | "sky" | "amber" | "rose" | "violet" | "orange";
export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";

export type Habit = {
  id: string;
  title: string;
  color: HabitColor;
  frequency: HabitFrequency;
  weekdays: number[];
  createdDate: string;
};

export type HabitTrackerStoredState = {
  habits: Habit[];
  checkins: Record<string, string[]>;
};

export type HabitStats = {
  currentStreak: number;
  bestStreak: number;
  completionPercent: number;
  completedDays: number;
  scheduledDays: number;
  totalCheckins: number;
};

export const HABIT_FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: "ทุกวัน",
  weekdays: "จันทร์–ศุกร์",
  weekends: "เสาร์–อาทิตย์",
  custom: "เลือกวันเอง",
};

export const HABIT_WEEKDAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

export const HABIT_TEMPLATES: Array<Pick<Habit, "title" | "color" | "frequency" | "weekdays">> = [
  { title: "ดื่มน้ำให้เพียงพอ", color: "sky", frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { title: "อ่านหนังสือ 20 นาที", color: "violet", frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { title: "ขยับร่างกาย", color: "mint", frequency: "weekdays", weekdays: [1, 2, 3, 4, 5] },
  { title: "ทบทวนแผนประจำวัน", color: "amber", frequency: "weekdays", weekdays: [1, 2, 3, 4, 5] },
];

const COLORS: HabitColor[] = ["mint", "sky", "amber", "rose", "violet", "orange"];
const FREQUENCIES: HabitFrequency[] = ["daily", "weekdays", "weekends", "custom"];

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

export function isHabitDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function habitToday(nowMs = Date.now()): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(dateKey: string): Date {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function shiftHabitDate(dateKey: string, days: number): string {
  if (!isHabitDateKey(dateKey)) throw new Error("วันที่ไม่ถูกต้อง");
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + Math.trunc(days));
  return date.toISOString().slice(0, 10);
}

export function habitDateRange(endDate: string, days: number): string[] {
  if (!isHabitDateKey(endDate)) return [];
  const safeDays = Math.min(HABIT_TRACKER_MAX_HISTORY_DAYS, Math.max(0, Math.trunc(days)));
  return Array.from({ length: safeDays }, (_, index) => shiftHabitDate(endDate, index - safeDays + 1));
}

function normalizedWeekdays(frequency: HabitFrequency, value: unknown): number[] {
  if (frequency === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (frequency === "weekdays") return [1, 2, 3, 4, 5];
  if (frequency === "weekends") return [0, 6];
  if (!Array.isArray(value)) return [1];
  const days = [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right);
  return days.length ? days : [1];
}

export function normalizeHabit(candidate: Partial<Habit>, index = 0, fallbackDate = habitToday()): Habit | null {
  const title = cleanText(candidate.title, HABIT_TRACKER_MAX_TITLE_LENGTH);
  if (!title) return null;
  const frequency = typeof candidate.frequency === "string" && FREQUENCIES.includes(candidate.frequency as HabitFrequency)
    ? candidate.frequency as HabitFrequency
    : "daily";
  return {
    id: cleanText(candidate.id, 80) || `restored-${index}`,
    title,
    color: typeof candidate.color === "string" && COLORS.includes(candidate.color as HabitColor) ? candidate.color as HabitColor : "mint",
    frequency,
    weekdays: normalizedWeekdays(frequency, candidate.weekdays),
    createdDate: typeof candidate.createdDate === "string" && isHabitDateKey(candidate.createdDate) && candidate.createdDate <= fallbackDate ? candidate.createdDate : fallbackDate,
  };
}

export function isHabitScheduledOn(habit: Habit, dateKey: string): boolean {
  if (!isHabitDateKey(dateKey) || dateKey < habit.createdDate) return false;
  return habit.weekdays.includes(dateFromKey(dateKey).getUTCDay());
}

export function isHabitChecked(checkins: Record<string, string[]>, habitId: string, dateKey: string): boolean {
  return checkins[dateKey]?.includes(habitId) ?? false;
}

export function toggleHabitCheckin(state: HabitTrackerStoredState, habitId: string, dateKey: string): HabitTrackerStoredState {
  if (!isHabitDateKey(dateKey)) throw new Error("วันที่ไม่ถูกต้อง");
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) throw new Error("ไม่พบกิจวัตรที่ต้องการเช็กอิน");
  if (!isHabitScheduledOn(habit, dateKey)) throw new Error("กิจวัตรนี้ไม่ได้กำหนดไว้ในวันที่เลือก");
  const existing = state.checkins[dateKey] ?? [];
  const next = existing.includes(habitId) ? existing.filter((id) => id !== habitId) : [...existing, habitId];
  const checkins = { ...state.checkins };
  if (next.length) checkins[dateKey] = next;
  else delete checkins[dateKey];
  return { ...state, checkins };
}

export function calculateHabitStats(
  habit: Habit,
  checkins: Record<string, string[]>,
  today: string,
  windowDays = 30,
): HabitStats {
  const range = habitDateRange(today, Math.min(HABIT_TRACKER_MAX_HISTORY_DAYS, Math.max(1, windowDays)));
  const scheduled = range.filter((date) => isHabitScheduledOn(habit, date));
  const completedDays = scheduled.filter((date) => isHabitChecked(checkins, habit.id, date)).length;

  let currentStreak = 0;
  let cursor = today;
  if (isHabitScheduledOn(habit, cursor) && !isHabitChecked(checkins, habit.id, cursor)) cursor = shiftHabitDate(cursor, -1);
  while (cursor >= habit.createdDate) {
    if (isHabitScheduledOn(habit, cursor)) {
      if (!isHabitChecked(checkins, habit.id, cursor)) break;
      currentStreak += 1;
    }
    cursor = shiftHabitDate(cursor, -1);
  }

  let bestStreak = 0;
  let runningStreak = 0;
  const lifetimeRange = habitDateRange(today, Math.min(HABIT_TRACKER_MAX_HISTORY_DAYS, Math.max(1, Math.floor((dateFromKey(today).getTime() - dateFromKey(habit.createdDate).getTime()) / 86_400_000) + 1)));
  for (const date of lifetimeRange) {
    if (!isHabitScheduledOn(habit, date)) continue;
    if (isHabitChecked(checkins, habit.id, date)) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  const totalCheckins = Object.values(checkins).reduce((total, ids) => total + (ids.includes(habit.id) ? 1 : 0), 0);
  return {
    currentStreak,
    bestStreak,
    completionPercent: scheduled.length ? Math.round((completedDays / scheduled.length) * 100) : 0,
    completedDays,
    scheduledDays: scheduled.length,
    totalCheckins,
  };
}

export function createEmptyHabitTrackerState(): HabitTrackerStoredState {
  return { habits: [], checkins: {} };
}

export function parseHabitTrackerStoredState(raw: string | null, fallbackDate = habitToday()): HabitTrackerStoredState {
  const empty = createEmptyHabitTrackerState();
  if (!raw || raw.length > HABIT_TRACKER_MAX_STORAGE_LENGTH) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<HabitTrackerStoredState>;
    const habits: Habit[] = [];
    const ids = new Set<string>();
    if (Array.isArray(parsed.habits)) {
      for (const [index, candidate] of parsed.habits.slice(0, HABIT_TRACKER_MAX_HABITS).entries()) {
        if (!candidate || typeof candidate !== "object") continue;
        const habit = normalizeHabit(candidate as Partial<Habit>, index, fallbackDate);
        if (!habit || ids.has(habit.id)) continue;
        ids.add(habit.id);
        habits.push(habit);
      }
    }
    const checkins: Record<string, string[]> = {};
    const habitsById = new Map(habits.map((habit) => [habit.id, habit]));
    if (parsed.checkins && typeof parsed.checkins === "object" && !Array.isArray(parsed.checkins)) {
      const entries = Object.entries(parsed.checkins)
        .filter(([date]) => isHabitDateKey(date) && date <= fallbackDate)
        .sort(([left], [right]) => right.localeCompare(left))
        .slice(0, HABIT_TRACKER_MAX_HISTORY_DAYS);
      for (const [date, candidates] of entries) {
        if (!Array.isArray(candidates)) continue;
        const accepted = [...new Set(candidates.filter((id): id is string => {
          if (typeof id !== "string" || !ids.has(id)) return false;
          const habit = habitsById.get(id);
          return habit ? isHabitScheduledOn(habit, date) : false;
        }))];
        if (accepted.length) checkins[date] = accepted;
      }
    }
    return { habits, checkins };
  } catch {
    return empty;
  }
}

export function serializeHabitTrackerStoredState(state: HabitTrackerStoredState): string {
  return JSON.stringify(parseHabitTrackerStoredState(JSON.stringify(state)));
}

function safeSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const text = safeSpreadsheetCell(String(value));
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildHabitTrackerCsv(state: HabitTrackerStoredState, endDate: string, days = 30): string {
  const rows = [["Date", "Habit", "Scheduled", "Completed", "Frequency"]];
  for (const date of habitDateRange(endDate, days)) {
    for (const habit of state.habits) {
      if (!isHabitScheduledOn(habit, date)) continue;
      rows.push([date, habit.title, "Yes", isHabitChecked(state.checkins, habit.id, date) ? "Yes" : "No", HABIT_FREQUENCY_LABELS[habit.frequency]]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
