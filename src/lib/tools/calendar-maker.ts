export const CALENDAR_MAKER_VERSION = 1 as const;
export const CALENDAR_MAKER_MAX_MONTHS = 12;
export const CALENDAR_MAKER_MAX_EVENTS = 300;
export const CALENDAR_MAKER_MAX_INPUT_LENGTH = 100_000;
export const CALENDAR_MAKER_MAX_JSON_LENGTH = 1_000_000;
export const CALENDAR_MAKER_MAX_TITLE_LENGTH = 100;
export const CALENDAR_MAKER_MAX_EVENT_TITLE_LENGTH = 120;
export const CALENDAR_MAKER_MAX_NOTES_LENGTH = 500;

export type CalendarMakerLanguage = "th" | "en";
export type CalendarMakerYearSystem = "buddhist" | "gregorian" | "both";
export type CalendarMakerWeekStart = 0 | 1;
export type CalendarMakerTheme = "matcha" | "sakura" | "mikan" | "sora";
export type CalendarMakerEventColor = CalendarMakerTheme | "sumire";

export type CalendarMakerEvent = {
  id: string;
  date: string;
  title: string;
  color: CalendarMakerEventColor;
};

export type CalendarMakerState = {
  version: typeof CALENDAR_MAKER_VERSION;
  title: string;
  startMonth: string;
  monthCount: number;
  language: CalendarMakerLanguage;
  yearSystem: CalendarMakerYearSystem;
  weekStartsOn: CalendarMakerWeekStart;
  showAdjacentDays: boolean;
  showWeekNumbers: boolean;
  showNotes: boolean;
  theme: CalendarMakerTheme;
  notes: string;
  events: CalendarMakerEvent[];
  duplicateEventsRemoved: number;
};

export type CreateCalendarMakerInput = Omit<
  CalendarMakerState,
  "version" | "events" | "duplicateEventsRemoved"
> & {
  eventsText: string;
};

export type CalendarMakerDay = {
  date: string;
  day: number;
  dayOfWeek: number;
  inMonth: boolean;
  isWeekend: boolean;
  events: CalendarMakerEvent[];
};

export type CalendarMakerWeek = {
  weekNumber: number;
  days: CalendarMakerDay[];
};

export type CalendarMakerMonth = {
  key: string;
  year: number;
  month: number;
  label: string;
  weekdays: string[];
  weeks: CalendarMakerWeek[];
};

export type ParsedCalendarMakerEvents = {
  events: CalendarMakerEvent[];
  duplicateCount: number;
};

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const EVENT_COLORS: readonly CalendarMakerEventColor[] = ["matcha", "sakura", "mikan", "sora", "sumire"];
const THEMES: readonly CalendarMakerTheme[] = ["matcha", "sakura", "mikan", "sora"];
const LANGUAGES: readonly CalendarMakerLanguage[] = ["th", "en"];
const YEAR_SYSTEMS: readonly CalendarMakerYearSystem[] = ["buddhist", "gregorian", "both"];
const ENGLISH_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const ENGLISH_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function cleanText(value: string, maxLength: number, label: string, required = true): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (required && !cleaned) throw new Error(`${label} is required`);
  if (cleaned.length > maxLength) throw new Error(`${label} must not exceed ${maxLength} characters`);
  return cleaned;
}

function assertInteger(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
}

function parseMonth(value: string): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(value);
  if (!match) throw new Error("Start month must use YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) {
    throw new Error("Start month must be between 1900-01 and 2100-12");
  }
  return { year, month };
}

function parseDate(value: string, label = "Date"): { year: number; month: number; day: number } {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new Error(`${label} must use YYYY-MM-DD`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 || year > 2100 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label} is invalid or outside 1900-2100`);
  }
  return { year, month, day };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonthsToKey(value: string, amount: number): string {
  const { year, month } = parseMonth(value);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function selectedRange(startMonth: string, monthCount: number): { start: string; end: string } {
  const { year, month } = parseMonth(startMonth);
  const start = formatDate(year, month, 1);
  const endMonth = new Date(Date.UTC(year, month - 1 + monthCount, 0));
  return {
    start,
    end: formatDate(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, endMonth.getUTCDate()),
  };
}

export function isCalendarMakerEventColor(value: unknown): value is CalendarMakerEventColor {
  return typeof value === "string" && EVENT_COLORS.includes(value as CalendarMakerEventColor);
}

function isTheme(value: unknown): value is CalendarMakerTheme {
  return typeof value === "string" && THEMES.includes(value as CalendarMakerTheme);
}

function isLanguage(value: unknown): value is CalendarMakerLanguage {
  return typeof value === "string" && LANGUAGES.includes(value as CalendarMakerLanguage);
}

function isYearSystem(value: unknown): value is CalendarMakerYearSystem {
  return typeof value === "string" && YEAR_SYSTEMS.includes(value as CalendarMakerYearSystem);
}

function normalizedEventKey(date: string, title: string): string {
  return `${date}\u0000${title.normalize("NFKC").toLocaleLowerCase("th-TH")}`;
}

export function parseCalendarMakerEvents(input: string): ParsedCalendarMakerEvents {
  if (input.length > CALENDAR_MAKER_MAX_INPUT_LENGTH) {
    throw new Error(`Event input must not exceed ${CALENDAR_MAKER_MAX_INPUT_LENGTH} characters`);
  }
  const events: CalendarMakerEvent[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const parts = (rawLine.includes("\t") ? rawLine.split("\t") : rawLine.split("|")).map((part) => part.trim());
    const rawDate = parts.shift() ?? "";
    parseDate(rawDate, `Date on line ${index + 1}`);
    let color: CalendarMakerEventColor = "matcha";
    if (parts.length > 1 && isCalendarMakerEventColor(parts.at(-1))) {
      color = parts.pop() as CalendarMakerEventColor;
    }
    const title = cleanText(parts.join(" | "), CALENDAR_MAKER_MAX_EVENT_TITLE_LENGTH, `Event title on line ${index + 1}`);
    const key = normalizedEventKey(rawDate, title);
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    events.push({ id: `event-${events.length + 1}`, date: rawDate, title, color });
    if (events.length > CALENDAR_MAKER_MAX_EVENTS) {
      throw new Error(`A calendar supports at most ${CALENDAR_MAKER_MAX_EVENTS} events`);
    }
  }
  return { events, duplicateCount };
}

function validateEventsInRange(events: readonly CalendarMakerEvent[], startMonth: string, monthCount: number): void {
  const range = selectedRange(startMonth, monthCount);
  const outside = events.find((event) => event.date < range.start || event.date > range.end);
  if (outside) throw new Error(`Event ${outside.date} is outside ${range.start} to ${range.end}`);
}

export function createCalendarMaker(input: CreateCalendarMakerInput): CalendarMakerState {
  const title = cleanText(input.title, CALENDAR_MAKER_MAX_TITLE_LENGTH, "Calendar title");
  parseMonth(input.startMonth);
  assertInteger(input.monthCount, 1, CALENDAR_MAKER_MAX_MONTHS, "Month count");
  parseMonth(addMonthsToKey(input.startMonth, input.monthCount - 1));
  if (!isLanguage(input.language)) throw new Error("Calendar language is invalid");
  if (!isYearSystem(input.yearSystem)) throw new Error("Year system is invalid");
  if (input.weekStartsOn !== 0 && input.weekStartsOn !== 1) throw new Error("Week start is invalid");
  if (!isTheme(input.theme)) throw new Error("Calendar theme is invalid");
  if (typeof input.showAdjacentDays !== "boolean" || typeof input.showWeekNumbers !== "boolean" || typeof input.showNotes !== "boolean") {
    throw new Error("Display options are invalid");
  }
  if (input.showWeekNumbers && input.weekStartsOn !== 1) {
    throw new Error("ISO week numbers require Monday as the first day");
  }
  const notes = cleanText(input.notes, CALENDAR_MAKER_MAX_NOTES_LENGTH, "Notes", false);
  const parsed = parseCalendarMakerEvents(input.eventsText);
  validateEventsInRange(parsed.events, input.startMonth, input.monthCount);
  return {
    version: CALENDAR_MAKER_VERSION,
    title,
    startMonth: input.startMonth,
    monthCount: input.monthCount,
    language: input.language,
    yearSystem: input.yearSystem,
    weekStartsOn: input.weekStartsOn,
    showAdjacentDays: input.showAdjacentDays,
    showWeekNumbers: input.showWeekNumbers,
    showNotes: input.showNotes,
    theme: input.theme,
    notes,
    events: parsed.events,
    duplicateEventsRemoved: parsed.duplicateCount,
  };
}

function isoWeekNumber(date: Date): number {
  const thursday = new Date(date.getTime());
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

function thaiMonthName(year: number, month: number): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthLabel(year: number, month: number, language: CalendarMakerLanguage, yearSystem: CalendarMakerYearSystem): string {
  const name = language === "th" ? thaiMonthName(year, month) : ENGLISH_MONTHS[month - 1];
  const buddhist = year + 543;
  if (language === "th") {
    if (yearSystem === "buddhist") return `${name} ${buddhist}`;
    if (yearSystem === "gregorian") return `${name} ${year}`;
    return `${name} ${buddhist} (${year})`;
  }
  if (yearSystem === "buddhist") return `${name} B.E. ${buddhist}`;
  if (yearSystem === "gregorian") return `${name} ${year}`;
  return `${name} ${year} (B.E. ${buddhist})`;
}

function weekdayNames(language: CalendarMakerLanguage): string[] {
  if (language === "en") return [...ENGLISH_WEEKDAYS];
  const sunday = Date.UTC(2026, 7, 9);
  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(sunday + index * DAY_MS)));
}

export function calendarMakerWeekdays(state: Pick<CalendarMakerState, "language" | "weekStartsOn">): string[] {
  const weekdays = weekdayNames(state.language);
  return state.weekStartsOn === 1 ? [...weekdays.slice(1), weekdays[0]!] : weekdays;
}

export function getCalendarMakerMonth(state: CalendarMakerState, key: string): CalendarMakerMonth {
  const selectedKeys = Array.from({ length: state.monthCount }, (_, index) => addMonthsToKey(state.startMonth, index));
  if (!selectedKeys.includes(key)) throw new Error("Month is outside the selected calendar range");
  const { year, month } = parseMonth(key);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() - state.weekStartsOn + 7) % 7;
  const gridStart = new Date(first.getTime() - offset * DAY_MS);
  const weekdays = calendarMakerWeekdays(state);
  const weeks: CalendarMakerWeek[] = [];

  for (let row = 0; row < 6; row += 1) {
    const days: CalendarMakerDay[] = [];
    for (let column = 0; column < 7; column += 1) {
      const date = new Date(gridStart.getTime() + (row * 7 + column) * DAY_MS);
      const dateString = formatDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      const dayOfWeek = date.getUTCDay();
      days.push({
        date: dateString,
        day: date.getUTCDate(),
        dayOfWeek,
        inMonth: date.getUTCFullYear() === year && date.getUTCMonth() === month - 1,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        events: state.events.filter((event) => event.date === dateString),
      });
    }
    weeks.push({ weekNumber: isoWeekNumber(new Date(`${days[0]!.date}T00:00:00Z`)), days });
  }

  return { key, year, month, label: monthLabel(year, month, state.language, state.yearSystem), weekdays, weeks };
}

export function getCalendarMakerMonths(state: CalendarMakerState): CalendarMakerMonth[] {
  return Array.from({ length: state.monthCount }, (_, index) => getCalendarMakerMonth(state, addMonthsToKey(state.startMonth, index)));
}

export function addCalendarMakerEvent(
  state: CalendarMakerState,
  input: Pick<CalendarMakerEvent, "date" | "title" | "color">,
): CalendarMakerState {
  parseDate(input.date);
  const title = cleanText(input.title, CALENDAR_MAKER_MAX_EVENT_TITLE_LENGTH, "Event title");
  if (!isCalendarMakerEventColor(input.color)) throw new Error("Event color is invalid");
  validateEventsInRange([{ id: "pending", date: input.date, title, color: input.color }], state.startMonth, state.monthCount);
  if (state.events.length >= CALENDAR_MAKER_MAX_EVENTS) throw new Error(`A calendar supports at most ${CALENDAR_MAKER_MAX_EVENTS} events`);
  if (state.events.some((event) => normalizedEventKey(event.date, event.title) === normalizedEventKey(input.date, title))) {
    throw new Error("This event already exists on the selected date");
  }
  const nextNumber = state.events.reduce((maximum, event) => {
    const match = /^event-(\d+)$/.exec(event.id);
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return { ...state, events: [...state.events, { id: `event-${nextNumber}`, date: input.date, title, color: input.color }] };
}

export function removeCalendarMakerEvent(state: CalendarMakerState, eventId: string): CalendarMakerState {
  return { ...state, events: state.events.filter((event) => event.id !== eventId) };
}

export function calendarMakerEventsText(state: CalendarMakerState): string {
  return state.events.map((event) => `${event.date} | ${event.title} | ${event.color}`).join("\n");
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function calendarMakerCsv(state: CalendarMakerState): string {
  const rows = [
    ["date", "title", "color", "calendar"],
    ...state.events.map((event) => [event.date, event.title, event.color, state.title]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function compactDate(value: string): string {
  return value.replace(/-/g, "");
}

function nextDate(value: string): string {
  const { year, month, day } = parseDate(value);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function calendarMakerIcs(state: CalendarMakerState): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Meaw Tools//Calendar Maker//TH", "CALSCALE:GREGORIAN"];
  state.events.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}-${compactDate(event.date)}@meaw-tools.local`,
      "DTSTAMP:19700101T000000Z",
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDate(event.date))}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(state.title)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function calendarMakerToText(state: CalendarMakerState): string {
  const months = getCalendarMakerMonths(state);
  const firstMonth = months[0]!;
  const lines = [state.title, `${firstMonth.label} - ${months.at(-1)?.label ?? firstMonth.label}`, ""];
  state.events.forEach((event) => lines.push(`${event.date}  ${event.title}`));
  if (state.notes) lines.push("", `Notes: ${state.notes}`);
  return lines.join("\n");
}

export function serializeCalendarMaker(state: CalendarMakerState): string {
  return JSON.stringify(state, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function restoreCalendarMaker(input: string): CalendarMakerState {
  if (input.length > CALENDAR_MAKER_MAX_JSON_LENGTH) throw new Error("Calendar file is too large");
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new Error("Calendar file is not valid JSON");
  }
  if (!isRecord(value)) throw new Error("Calendar file must contain an object");
  if (value.version !== CALENDAR_MAKER_VERSION) throw new Error("Calendar file version is not supported");
  if (!Array.isArray(value.events)) throw new Error("Calendar events are invalid");
  const eventsText = value.events.map((item, index) => {
    if (!isRecord(item) || typeof item.date !== "string" || typeof item.title !== "string" || !isCalendarMakerEventColor(item.color)) {
      throw new Error(`Calendar event ${index + 1} is invalid`);
    }
    return `${item.date} | ${item.title} | ${item.color}`;
  }).join("\n");
  if (
    typeof value.title !== "string" || typeof value.startMonth !== "string" || typeof value.monthCount !== "number" ||
    !isLanguage(value.language) || !isYearSystem(value.yearSystem) || (value.weekStartsOn !== 0 && value.weekStartsOn !== 1) ||
    typeof value.showAdjacentDays !== "boolean" || typeof value.showWeekNumbers !== "boolean" || typeof value.showNotes !== "boolean" ||
    !isTheme(value.theme) || typeof value.notes !== "string"
  ) {
    throw new Error("Calendar settings are invalid");
  }
  return createCalendarMaker({
    title: value.title,
    startMonth: value.startMonth,
    monthCount: value.monthCount,
    language: value.language,
    yearSystem: value.yearSystem,
    weekStartsOn: value.weekStartsOn,
    showAdjacentDays: value.showAdjacentDays,
    showWeekNumbers: value.showWeekNumbers,
    showNotes: value.showNotes,
    theme: value.theme,
    notes: value.notes,
    eventsText,
  });
}

const SVG_PALETTES: Record<CalendarMakerTheme, { background: string; surface: string; weekend: string; ink: string; muted: string; accent: string }> = {
  matcha: { background: "#f3f7ee", surface: "#ffffff", weekend: "#edf6e6", ink: "#253329", muted: "#637368", accent: "#6f8f65" },
  sakura: { background: "#fff3f5", surface: "#ffffff", weekend: "#ffe9ee", ink: "#462c35", muted: "#8b6873", accent: "#d77f96" },
  mikan: { background: "#fff7ea", surface: "#ffffff", weekend: "#ffefd4", ink: "#493421", muted: "#8c7259", accent: "#e6923f" },
  sora: { background: "#edf8ff", surface: "#ffffff", weekend: "#e0f2ff", ink: "#223746", muted: "#607988", accent: "#589ac2" },
};
const EVENT_HEX: Record<CalendarMakerEventColor, string> = {
  matcha: "#6f8f65",
  sakura: "#d77f96",
  mikan: "#e6923f",
  sora: "#589ac2",
  sumire: "#8a75ba",
};

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function shortened(value: string, maximum: number): string {
  const values = Array.from(value);
  return values.length <= maximum ? value : `${values.slice(0, Math.max(1, maximum - 3)).join("")}...`;
}

export function calendarMakerSvg(state: CalendarMakerState, key: string): string {
  const month = getCalendarMakerMonth(state, key);
  const palette = SVG_PALETTES[state.theme];
  const width = 1400;
  const height = state.showNotes ? 1120 : 1040;
  const left = 70;
  const top = 220;
  const weekNumberWidth = state.showWeekNumbers ? 52 : 0;
  const gridWidth = width - left * 2 - weekNumberWidth;
  const columnWidth = gridWidth / 7;
  const rowHeight = 122;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="32" fill="${palette.background}"/>`,
    `<text x="${left}" y="74" fill="${palette.accent}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="28" font-weight="700">${xml(shortened(state.title, 60))}</text>`,
    `<text x="${left}" y="145" fill="${palette.ink}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="56" font-weight="800">${xml(month.label)}</text>`,
  ];
  if (state.showWeekNumbers) {
    parts.push(`<text x="${left + 22}" y="198" text-anchor="middle" fill="${palette.muted}" font-family="Arial,sans-serif" font-size="16" font-weight="700">W</text>`);
  }
  month.weekdays.forEach((weekday, index) => {
    const x = left + weekNumberWidth + index * columnWidth + columnWidth / 2;
    parts.push(`<text x="${x}" y="198" text-anchor="middle" fill="${palette.muted}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="21" font-weight="700">${xml(weekday)}</text>`);
  });
  month.weeks.forEach((week, row) => {
    if (state.showWeekNumbers) {
      parts.push(`<text x="${left + 22}" y="${top + row * rowHeight + 62}" text-anchor="middle" fill="${palette.muted}" font-family="Arial,sans-serif" font-size="17">${week.weekNumber}</text>`);
    }
    week.days.forEach((day, column) => {
      const x = left + weekNumberWidth + column * columnWidth;
      const y = top + row * rowHeight;
      const visible = day.inMonth || state.showAdjacentDays;
      const fill = day.inMonth && day.isWeekend ? palette.weekend : palette.surface;
      parts.push(`<rect x="${x + 3}" y="${y + 3}" width="${columnWidth - 6}" height="${rowHeight - 6}" rx="12" fill="${fill}" stroke="${palette.accent}" stroke-opacity="0.18"/>`);
      if (!visible) return;
      parts.push(`<text x="${x + 17}" y="${y + 29}" fill="${day.inMonth ? palette.ink : palette.muted}" fill-opacity="${day.inMonth ? 1 : 0.55}" font-family="Arial,sans-serif" font-size="20" font-weight="700">${day.day}</text>`);
      day.events.slice(0, 3).forEach((event, eventIndex) => {
        const eventY = y + 49 + eventIndex * 25;
        parts.push(`<circle cx="${x + 17}" cy="${eventY - 6}" r="5" fill="${EVENT_HEX[event.color]}"/>`);
        parts.push(`<text x="${x + 30}" y="${eventY}" fill="${palette.ink}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="15" font-weight="600">${xml(shortened(event.title, 18))}</text>`);
      });
      if (day.events.length > 3) {
        parts.push(`<text x="${x + 17}" y="${y + 112}" fill="${palette.muted}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="13">+${day.events.length - 3}</text>`);
      }
    });
  });
  if (state.showNotes && state.notes) {
    parts.push(`<text x="${left}" y="1010" fill="${palette.muted}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="20">Notes: ${xml(shortened(state.notes, 115))}</text>`);
  }
  parts.push(`<text x="${width - left}" y="${height - 34}" text-anchor="end" fill="${palette.muted}" font-family="Noto Sans Thai,Arial,sans-serif" font-size="15">Meaw Tools | Calendar Maker | Local in your browser</text>`, "</svg>");
  return parts.join("");
}
