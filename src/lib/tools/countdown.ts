export const COUNTDOWN_MAX_TITLE_LENGTH = 120;
export const COUNTDOWN_MAX_MESSAGE_LENGTH = 160;
export const COUNTDOWN_MAX_DURATION_SECONDS = 999 * 60 * 60 + 59 * 60 + 59;

export type CountdownMode = "event" | "duration";
export type CountdownTheme = "mint" | "sakura" | "night";

export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
};

export type CountdownShareState = {
  mode: CountdownMode;
  title: string;
  theme: CountdownTheme;
  completionMessage: string;
  targetMs?: number;
  durationSeconds?: number;
};

const THEMES = new Set<CountdownTheme>(["mint", "sakura", "night"]);

function cleanText(value: string, maxLength: number): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function getCountdownParts(targetMs: number, nowMs = Date.now()): CountdownParts {
  const totalMs = Math.max(0, Math.floor(targetMs - nowMs));
  const totalSeconds = Math.ceil(totalMs / 1_000);
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    finished: targetMs <= nowMs,
  };
}

export function durationToSeconds(hours: number, minutes: number, seconds: number): number {
  if (![hours, minutes, seconds].every(Number.isInteger)) throw new Error("ระยะเวลาต้องเป็นจำนวนเต็ม");
  if (hours < 0 || hours > 999 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error("กำหนดชั่วโมง 0–999 และนาที/วินาที 0–59");
  }
  const total = hours * 3_600 + minutes * 60 + seconds;
  if (total < 1) throw new Error("ระยะเวลาต้องมากกว่า 0 วินาที");
  return total;
}

export function buildCountdownShareUrl(baseUrl: string, input: CountdownShareState): string {
  const url = new URL("/countdown-timer", baseUrl);
  const title = cleanText(input.title, COUNTDOWN_MAX_TITLE_LENGTH);
  const message = cleanText(input.completionMessage, COUNTDOWN_MAX_MESSAGE_LENGTH);
  url.searchParams.set("mode", input.mode);
  if (title) url.searchParams.set("title", title);
  url.searchParams.set("theme", THEMES.has(input.theme) ? input.theme : "mint");
  if (message) url.searchParams.set("done", message);

  if (input.mode === "event") {
    if (!Number.isFinite(input.targetMs) || Number(input.targetMs) <= 0) throw new Error("วันและเวลาเป้าหมายไม่ถูกต้อง");
    url.searchParams.set("target", String(Math.floor(Number(input.targetMs))));
  } else {
    const durationSeconds = Number(input.durationSeconds);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > COUNTDOWN_MAX_DURATION_SECONDS) {
      throw new Error("ระยะเวลาสำหรับแชร์ไม่ถูกต้อง");
    }
    url.searchParams.set("duration", String(durationSeconds));
  }
  return url.toString();
}

export function parseCountdownShareParams(search: string | URLSearchParams): CountdownShareState | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const mode: CountdownMode = params.get("mode") === "duration" ? "duration" : "event";
  const themeValue = params.get("theme") as CountdownTheme | null;
  const theme = themeValue && THEMES.has(themeValue) ? themeValue : "mint";
  const shared = {
    mode,
    title: cleanText(params.get("title") ?? "", COUNTDOWN_MAX_TITLE_LENGTH),
    theme,
    completionMessage: cleanText(params.get("done") ?? "", COUNTDOWN_MAX_MESSAGE_LENGTH),
  };

  if (mode === "event") {
    const targetMs = Number(params.get("target"));
    return Number.isSafeInteger(targetMs) && targetMs > 0 ? { ...shared, targetMs } : null;
  }
  const durationSeconds = Number(params.get("duration"));
  return Number.isInteger(durationSeconds) && durationSeconds >= 1 && durationSeconds <= COUNTDOWN_MAX_DURATION_SECONDS
    ? { ...shared, durationSeconds }
    : null;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function formatIcsUtc(value: number): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCountdownEventIcs(input: { title: string; targetMs: number; completionMessage?: string }): string {
  if (!Number.isFinite(input.targetMs) || input.targetMs <= 0) throw new Error("วันและเวลาเป้าหมายไม่ถูกต้อง");
  const title = cleanText(input.title, COUNTDOWN_MAX_TITLE_LENGTH) || "กิจกรรมจาก Meaw Tools";
  const description = cleanText(input.completionMessage ?? "", COUNTDOWN_MAX_MESSAGE_LENGTH);
  const start = Math.floor(input.targetMs / 1_000) * 1_000;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meaw Tools//Countdown Timer//TH",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:countdown-${start}@meaw-tools.vercel.app`,
    `DTSTAMP:${formatIcsUtc(Date.now())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(start + 30 * 60_000)}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR", "");
  return lines.join("\r\n");
}

export function countdownFilename(title: string): string {
  const safe = cleanText(title, 60)
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("th");
  return `${safe || "countdown-event"}.ics`;
}
