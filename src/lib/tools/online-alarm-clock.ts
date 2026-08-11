export const ONLINE_ALARM_STORAGE_KEY = "meaw-online-alarm-clock-v1";
export const ONLINE_ALARM_MAX_ALARMS = 12;
export const ONLINE_ALARM_MAX_LABEL_LENGTH = 60;
export const ONLINE_ALARM_MAX_STORAGE_BYTES = 200_000;

export type AlarmRepeat = "once" | "daily" | "weekdays" | "weekends" | "custom";
export type AlarmSound = "chime" | "digital" | "gentle" | "bell";
export type AlarmTriggerSource = "alarm" | "snooze";

export type OnlineAlarm = {
  id: string;
  label: string;
  time: string;
  repeat: AlarmRepeat;
  days: number[];
  sound: AlarmSound;
  snoozeMinutes: number;
  enabled: boolean;
  nextTriggerAtMs: number | null;
  snoozeUntilMs: number | null;
  createdAtMs: number;
  updatedAtMs: number;
};

export type AlarmClockSettings = {
  use24Hour: boolean;
  keepAwake: boolean;
  notificationsEnabled: boolean;
  volume: number;
};

export type AlarmClockStore = {
  alarms: OnlineAlarm[];
  settings: AlarmClockSettings;
};

export type AlarmOccurrence = {
  alarm: OnlineAlarm;
  source: AlarmTriggerSource;
  atMs: number;
};

export const DEFAULT_ALARM_SETTINGS: AlarmClockSettings = {
  use24Hour: true,
  keepAwake: false,
  notificationsEnabled: false,
  volume: 0.7,
};

export const ALARM_REPEAT_OPTIONS: ReadonlyArray<{ value: AlarmRepeat; label: string }> = [
  { value: "once", label: "ครั้งถัดไป" },
  { value: "daily", label: "ทุกวัน" },
  { value: "weekdays", label: "จันทร์–ศุกร์" },
  { value: "weekends", label: "เสาร์–อาทิตย์" },
  { value: "custom", label: "เลือกวันเอง" },
];

export const ALARM_SOUND_OPTIONS: ReadonlyArray<{ value: AlarmSound; label: string }> = [
  { value: "chime", label: "Meaw Chime" },
  { value: "digital", label: "Digital Beep" },
  { value: "gentle", label: "Gentle Morning" },
  { value: "bell", label: "Classic Bell" },
];

const REPEAT_VALUES = new Set<AlarmRepeat>(ALARM_REPEAT_OPTIONS.map((option) => option.value));
const SOUND_VALUES = new Set<AlarmSound>(ALARM_SOUND_OPTIONS.map((option) => option.value));
const MAX_SCHEDULE_AHEAD_MS = 8 * 86_400_000;
const MAX_SNOOZE_AHEAD_MS = 31 * 60_000;

function cleanText(value: unknown, fallback = "Alarm"): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, ONLINE_ALARM_MAX_LABEL_LENGTH);
  return cleaned || fallback;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, Math.round(numeric))) : fallback;
}

function safeId(value: unknown, fallback: string): string {
  const cleaned = typeof value === "string" ? value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "";
  return cleaned || fallback;
}

function safeTimestamp(value: unknown, nowMs: number, maxAheadMs: number): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > nowMs && numeric <= nowMs + maxAheadMs ? Math.floor(numeric) : null;
}

export function normalizeAlarmTime(value: unknown, fallback = "07:00"): string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return fallback;
  const [hours, minutes] = value.split(":").map(Number);
  return hours! >= 0 && hours! <= 23 && minutes! >= 0 && minutes! <= 59 ? value : fallback;
}

export function normalizeAlarmDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [1, 2, 3, 4, 5];
  const unique = Array.from(new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [1, 2, 3, 4, 5];
}

export function nextAlarmTimestamp(time: string, repeat: AlarmRepeat, days: number[], fromMs: number): number {
  const normalizedTime = normalizeAlarmTime(time);
  const [hours, minutes] = normalizedTime.split(":").map(Number);
  const customDays = new Set(normalizeAlarmDays(days));
  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = new Date(fromMs);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hours!, minutes!, 0, 0);
    if (candidate.getHours() !== hours || candidate.getMinutes() !== minutes || candidate.getTime() <= fromMs) continue;
    const day = candidate.getDay();
    const matches = repeat === "once" || repeat === "daily"
      || (repeat === "weekdays" && day >= 1 && day <= 5)
      || (repeat === "weekends" && (day === 0 || day === 6))
      || (repeat === "custom" && customDays.has(day));
    if (matches) return candidate.getTime();
  }
  throw new Error("ไม่พบเวลาปลุกถัดไปภายใน 8 วัน");
}

export function defaultAlarmTime(nowMs = Date.now(), minutesAhead = 5): string {
  const date = new Date(nowMs + minutesAhead * 60_000);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function normalizeOnlineAlarm(input: unknown, nowMs = Date.now(), fallbackId = `alarm-${nowMs}`): OnlineAlarm {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const repeat = REPEAT_VALUES.has(source.repeat as AlarmRepeat) ? source.repeat as AlarmRepeat : "once";
  const sound = SOUND_VALUES.has(source.sound as AlarmSound) ? source.sound as AlarmSound : "chime";
  const time = normalizeAlarmTime(source.time, defaultAlarmTime(nowMs));
  const days = normalizeAlarmDays(source.days);
  let enabled = source.enabled === true;
  let nextTriggerAtMs = enabled ? safeTimestamp(source.nextTriggerAtMs, nowMs, MAX_SCHEDULE_AHEAD_MS) : null;
  const snoozeUntilMs = enabled ? safeTimestamp(source.snoozeUntilMs, nowMs, MAX_SNOOZE_AHEAD_MS) : null;
  if (enabled && nextTriggerAtMs === null && snoozeUntilMs === null) {
    nextTriggerAtMs = nextAlarmTimestamp(time, repeat, days, nowMs);
  }
  if (!nextTriggerAtMs && !snoozeUntilMs) enabled = false;
  const created = Number(source.createdAtMs);
  const updated = Number(source.updatedAtMs);
  return {
    id: safeId(source.id, fallbackId),
    label: cleanText(source.label),
    time,
    repeat,
    days,
    sound,
    snoozeMinutes: boundedInteger(source.snoozeMinutes, 5, 1, 30),
    enabled,
    nextTriggerAtMs,
    snoozeUntilMs,
    createdAtMs: Number.isFinite(created) ? Math.min(nowMs, Math.max(0, Math.floor(created))) : nowMs,
    updatedAtMs: Number.isFinite(updated) ? Math.min(nowMs, Math.max(0, Math.floor(updated))) : nowMs,
  };
}

export function createOnlineAlarm(input: Partial<OnlineAlarm>, id: string, nowMs = Date.now()): OnlineAlarm {
  const base = normalizeOnlineAlarm({ ...input, id, enabled: false, createdAtMs: nowMs, updatedAtMs: nowMs }, nowMs, id);
  const enabled = input.enabled !== false;
  return enabled ? enableOnlineAlarm(base, nowMs) : base;
}

export function enableOnlineAlarm(alarm: OnlineAlarm, nowMs = Date.now()): OnlineAlarm {
  const normalized = normalizeOnlineAlarm({ ...alarm, enabled: false }, nowMs, alarm.id);
  return {
    ...normalized,
    enabled: true,
    nextTriggerAtMs: nextAlarmTimestamp(normalized.time, normalized.repeat, normalized.days, nowMs),
    snoozeUntilMs: null,
    updatedAtMs: nowMs,
  };
}

export function disableOnlineAlarm(alarm: OnlineAlarm, nowMs = Date.now()): OnlineAlarm {
  return { ...alarm, enabled: false, nextTriggerAtMs: null, snoozeUntilMs: null, updatedAtMs: nowMs };
}

function alarmOccurrences(alarm: OnlineAlarm): Array<{ source: AlarmTriggerSource; atMs: number }> {
  if (!alarm.enabled) return [];
  const occurrences: Array<{ source: AlarmTriggerSource; atMs: number }> = [];
  if (alarm.nextTriggerAtMs !== null) occurrences.push({ source: "alarm", atMs: alarm.nextTriggerAtMs });
  if (alarm.snoozeUntilMs !== null) occurrences.push({ source: "snooze", atMs: alarm.snoozeUntilMs });
  return occurrences;
}

export function getNextAlarmOccurrence(alarms: OnlineAlarm[]): AlarmOccurrence | null {
  let next: AlarmOccurrence | null = null;
  for (const alarm of alarms) {
    for (const occurrence of alarmOccurrences(alarm)) {
      if (!next || occurrence.atMs < next.atMs) next = { alarm, ...occurrence };
    }
  }
  return next;
}

export function getDueAlarmOccurrence(alarms: OnlineAlarm[], nowMs = Date.now()): AlarmOccurrence | null {
  const next = getNextAlarmOccurrence(alarms);
  return next && next.atMs <= nowMs ? next : null;
}

export function dismissAlarmOccurrence(alarm: OnlineAlarm, source: AlarmTriggerSource, nowMs = Date.now()): OnlineAlarm {
  if (source === "snooze") {
    return alarm.repeat === "once"
      ? disableOnlineAlarm(alarm, nowMs)
      : { ...alarm, snoozeUntilMs: null, updatedAtMs: nowMs };
  }
  if (alarm.repeat === "once") return disableOnlineAlarm(alarm, nowMs);
  return {
    ...alarm,
    enabled: true,
    nextTriggerAtMs: nextAlarmTimestamp(alarm.time, alarm.repeat, alarm.days, nowMs + 1_000),
    snoozeUntilMs: null,
    updatedAtMs: nowMs,
  };
}

export function snoozeAlarmOccurrence(alarm: OnlineAlarm, source: AlarmTriggerSource, nowMs = Date.now()): OnlineAlarm {
  const nextTriggerAtMs = source === "alarm" && alarm.repeat !== "once"
    ? nextAlarmTimestamp(alarm.time, alarm.repeat, alarm.days, nowMs + 1_000)
    : source === "alarm" ? null : alarm.nextTriggerAtMs;
  return {
    ...alarm,
    enabled: true,
    nextTriggerAtMs,
    snoozeUntilMs: nowMs + alarm.snoozeMinutes * 60_000,
    updatedAtMs: nowMs,
  };
}

export function normalizeAlarmClockSettings(input: unknown): AlarmClockSettings {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const volume = Number(source.volume);
  return {
    use24Hour: source.use24Hour !== false,
    keepAwake: source.keepAwake === true,
    notificationsEnabled: source.notificationsEnabled === true,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0.1, volume)) : DEFAULT_ALARM_SETTINGS.volume,
  };
}

export function normalizeAlarmClockStore(input: unknown, nowMs = Date.now()): AlarmClockStore {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const alarms: OnlineAlarm[] = [];
  const ids = new Set<string>();
  if (Array.isArray(source.alarms)) {
    for (const [index, item] of source.alarms.slice(0, ONLINE_ALARM_MAX_ALARMS).entries()) {
      const alarm = normalizeOnlineAlarm(item, nowMs, `alarm-${index + 1}`);
      if (ids.has(alarm.id)) continue;
      ids.add(alarm.id);
      alarms.push(alarm);
    }
  }
  return { alarms, settings: normalizeAlarmClockSettings(source.settings) };
}

export function parseAlarmClockStore(raw: string | null, nowMs = Date.now()): AlarmClockStore {
  if (!raw || new Blob([raw]).size > ONLINE_ALARM_MAX_STORAGE_BYTES) return { alarms: [], settings: DEFAULT_ALARM_SETTINGS };
  try { return normalizeAlarmClockStore(JSON.parse(raw), nowMs); }
  catch { return { alarms: [], settings: DEFAULT_ALARM_SETTINGS }; }
}

export function serializeAlarmClockStore(store: AlarmClockStore, nowMs = Date.now()): string {
  return JSON.stringify(normalizeAlarmClockStore(store, nowMs));
}

export function formatAlarmCountdown(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(valueMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function alarmRepeatLabel(alarm: Pick<OnlineAlarm, "repeat" | "days">): string {
  if (alarm.repeat !== "custom") return ALARM_REPEAT_OPTIONS.find((option) => option.value === alarm.repeat)?.label ?? "ครั้งถัดไป";
  const labels = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  return normalizeAlarmDays(alarm.days).map((day) => labels[day]).join(" ");
}
