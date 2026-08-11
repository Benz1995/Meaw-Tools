export const POMODORO_STORAGE_KEY = "meaw-pomodoro-v1";
export const POMODORO_MAX_TASKS = 20;
export const POMODORO_MAX_TASK_LENGTH = 80;

export type PomodoroMode = "focus" | "short-break" | "long-break";
export type PomodoroStatus = "idle" | "running" | "paused";

export type PomodoroSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakAfter: number;
  dailyGoal: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  keepAwake: boolean;
};

export type PomodoroTask = {
  id: string;
  title: string;
  estimate: number;
  completedSessions: number;
  done: boolean;
};

export type PomodoroStats = {
  date: string;
  completedFocusSessions: number;
  focusMinutes: number;
};

export type PomodoroStoredState = {
  settings: PomodoroSettings;
  tasks: PomodoroTask[];
  stats: PomodoroStats;
};

export type PomodoroTransition = {
  nextMode: PomodoroMode;
  nextCycleFocusCount: number;
  completedFocus: boolean;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfter: 4,
  dailyGoal: 8,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  keepAwake: false,
};

export const POMODORO_PRESETS = {
  classic: { label: "Classic 25/5", focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakAfter: 4 },
  deep: { label: "Deep Work 50/10", focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 25, longBreakAfter: 3 },
  study: { label: "Study 45/15", focusMinutes: 45, shortBreakMinutes: 15, longBreakMinutes: 30, longBreakAfter: 3 },
  quick: { label: "Quick Focus 15/5", focusMinutes: 15, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakAfter: 4 },
} as const;

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export function localDateKey(nowMs = Date.now()): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function normalizePomodoroSettings(value: Partial<PomodoroSettings> | null | undefined): PomodoroSettings {
  return {
    focusMinutes: clampInteger(value?.focusMinutes, 1, 120, DEFAULT_POMODORO_SETTINGS.focusMinutes),
    shortBreakMinutes: clampInteger(value?.shortBreakMinutes, 1, 60, DEFAULT_POMODORO_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampInteger(value?.longBreakMinutes, 1, 60, DEFAULT_POMODORO_SETTINGS.longBreakMinutes),
    longBreakAfter: clampInteger(value?.longBreakAfter, 1, 12, DEFAULT_POMODORO_SETTINGS.longBreakAfter),
    dailyGoal: clampInteger(value?.dailyGoal, 1, 20, DEFAULT_POMODORO_SETTINGS.dailyGoal),
    autoStartBreaks: value?.autoStartBreaks === true,
    autoStartFocus: value?.autoStartFocus === true,
    soundEnabled: value?.soundEnabled !== false,
    keepAwake: value?.keepAwake === true,
  };
}

export function pomodoroDurationSeconds(mode: PomodoroMode, settings: PomodoroSettings): number {
  const normalized = normalizePomodoroSettings(settings);
  if (mode === "focus") return normalized.focusMinutes * 60;
  if (mode === "short-break") return normalized.shortBreakMinutes * 60;
  return normalized.longBreakMinutes * 60;
}

export function getPomodoroTransition(
  mode: PomodoroMode,
  cycleFocusCount: number,
  settings: PomodoroSettings,
  completedNaturally = true,
): PomodoroTransition {
  const normalized = normalizePomodoroSettings(settings);
  const safeCycle = clampInteger(cycleFocusCount, 0, normalized.longBreakAfter, 0);
  if (mode === "focus") {
    const nextCount = completedNaturally ? Math.min(normalized.longBreakAfter, safeCycle + 1) : safeCycle;
    return {
      nextMode: nextCount >= normalized.longBreakAfter ? "long-break" : "short-break",
      nextCycleFocusCount: nextCount,
      completedFocus: completedNaturally,
    };
  }
  return {
    nextMode: "focus",
    nextCycleFocusCount: mode === "long-break" ? 0 : safeCycle,
    completedFocus: false,
  };
}

export function pomodoroRemainingMs(deadlineMs: number | null, storedRemainingMs: number, nowMs = Date.now()): number {
  if (deadlineMs === null) return Math.max(0, Math.floor(storedRemainingMs));
  return Math.max(0, Math.floor(deadlineMs - nowMs));
}

export function pomodoroClockParts(remainingMs: number): { minutes: number; seconds: number; text: string } {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { minutes, seconds, text: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` };
}

export function updatePomodoroStats(
  current: PomodoroStats,
  focusMinutes: number,
  nowMs = Date.now(),
): PomodoroStats {
  const date = localDateKey(nowMs);
  const base = current.date === date
    ? current
    : { date, completedFocusSessions: 0, focusMinutes: 0 };
  return {
    date,
    completedFocusSessions: clampInteger(base.completedFocusSessions, 0, 10_000, 0) + 1,
    focusMinutes: clampInteger(base.focusMinutes, 0, 1_000_000, 0) + clampInteger(focusMinutes, 1, 120, 25),
  };
}

export function createEmptyPomodoroState(nowMs = Date.now()): PomodoroStoredState {
  return {
    settings: { ...DEFAULT_POMODORO_SETTINGS },
    tasks: [],
    stats: { date: localDateKey(nowMs), completedFocusSessions: 0, focusMinutes: 0 },
  };
}

export function parsePomodoroStoredState(raw: string | null, nowMs = Date.now()): PomodoroStoredState {
  const empty = createEmptyPomodoroState(nowMs);
  if (!raw || raw.length > 50_000) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<PomodoroStoredState>;
    const tasks = Array.isArray(parsed.tasks)
      ? parsed.tasks.slice(0, POMODORO_MAX_TASKS).flatMap((candidate, index) => {
        if (!candidate || typeof candidate !== "object") return [];
        const task = candidate as Partial<PomodoroTask>;
        const title = cleanText(task.title, POMODORO_MAX_TASK_LENGTH);
        if (!title) return [];
        return [{
          id: cleanText(task.id, 80) || `restored-${index}`,
          title,
          estimate: clampInteger(task.estimate, 1, 12, 1),
          completedSessions: clampInteger(task.completedSessions, 0, 10_000, 0),
          done: task.done === true,
        }];
      })
      : [];
    const today = localDateKey(nowMs);
    const parsedStats = parsed.stats;
    const stats = parsedStats?.date === today
      ? {
        date: today,
        completedFocusSessions: clampInteger(parsedStats.completedFocusSessions, 0, 10_000, 0),
        focusMinutes: clampInteger(parsedStats.focusMinutes, 0, 1_000_000, 0),
      }
      : empty.stats;
    return { settings: normalizePomodoroSettings(parsed.settings), tasks, stats };
  } catch {
    return empty;
  }
}

export function serializePomodoroStoredState(state: PomodoroStoredState): string {
  const normalized = parsePomodoroStoredState(JSON.stringify(state));
  return JSON.stringify({ version: 1, ...normalized });
}

export function pomodoroTaskProgress(task: PomodoroTask): number {
  if (task.done) return 100;
  return Math.min(100, Math.round((task.completedSessions / Math.max(1, task.estimate)) * 100));
}
