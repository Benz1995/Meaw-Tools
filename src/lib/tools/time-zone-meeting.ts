export const MIN_MEETING_PARTICIPANTS = 2;
export const MAX_MEETING_PARTICIPANTS = 6;
export const MEETING_SLOT_INTERVAL_MINUTES = 30;

export type MeetingParticipant = {
  label: string;
  timeZone: string;
  workStart: string;
  workEnd: string;
};

export type MeetingPlannerInput = {
  title: string;
  date: string;
  durationMinutes: number;
  participants: MeetingParticipant[];
};

export type ParticipantSlotStatus = "available" | "early" | "late" | "weekend";

export type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateKey: string;
  minutesOfDay: number;
  weekday: number;
  offsetMinutes: number;
  offsetLabel: string;
};

export type ParticipantMeetingSlot = {
  participant: MeetingParticipant;
  localStart: ZonedDateTimeParts;
  localEnd: ZonedDateTimeParts;
  status: ParticipantSlotStatus;
  withinWorkHours: boolean;
  comfortScore: number;
};

export type MeetingSuggestion = {
  startMs: number;
  endMs: number;
  score: number;
  allAvailable: boolean;
  availableCount: number;
  participantSlots: ParticipantMeetingSlot[];
};

export type MeetingPlannerResult = {
  dayStartMs: number;
  dayEndMs: number;
  dayLengthHours: number;
  slotsEvaluated: number;
  hasFullOverlap: boolean;
  offsetChanges: string[];
  suggestions: MeetingSuggestion[];
};

export type SharedMeetingPlan = MeetingPlannerInput & { selectedStartMs?: number };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const ALLOWED_DURATIONS = new Set([30, 45, 60, 90, 120, 180]);
const formatterCache = new Map<string, Intl.DateTimeFormat>();
const timeZoneValidationCache = new Map<string, boolean>();

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-GB-u-hc-h23", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  const normalized = timeZone.trim();
  if (!normalized || normalized.length > 80) return false;
  const cached = timeZoneValidationCache.get(normalized);
  if (cached !== undefined) return cached;
  try {
    getDateFormatter(normalized).format(0);
    timeZoneValidationCache.set(normalized, true);
    return true;
  } catch {
    timeZoneValidationCache.set(normalized, false);
    return false;
  }
}

function parseDate(date: string): { year: number; month: number; day: number } {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new Error("วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || year > 2100 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error("กรุณาเลือกวันที่ระหว่างปี 2000–2100");
  }
  return { year, month, day };
}

function parseTime(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new Error("เวลาทำงานต้องอยู่ในรูปแบบ HH:mm");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("เวลาทำงานไม่ถูกต้อง");
  return hour * 60 + minute;
}

function nextDateKey(date: string): string {
  const { year, month, day } = parseDate(date);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function getZonedDateTimeParts(epochMs: number, timeZone: string): ZonedDateTimeParts {
  if (!Number.isFinite(epochMs)) throw new Error("จุดเวลาไม่ถูกต้อง");
  if (!isValidTimeZone(timeZone)) throw new Error(`ไม่พบเขตเวลา ${timeZone}`);
  const roundedEpoch = Math.floor(epochMs / 1_000) * 1_000;
  const values: Record<string, number> = {};
  for (const part of getDateFormatter(timeZone).formatToParts(roundedEpoch)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  const year = values.year;
  const month = values.month;
  const day = values.day;
  const rawHour = values.hour;
  const minute = values.minute;
  if (year === undefined || month === undefined || day === undefined || rawHour === undefined || minute === undefined) {
    throw new Error(`Browser ไม่สามารถอ่านเขตเวลา ${timeZone} ได้`);
  }
  const hour = rawHour === 24 ? 0 : rawHour;
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, values.second ?? 0);
  const offsetMinutes = Math.round((localAsUtc - roundedEpoch) / 60_000);
  const offsetSign = offsetMinutes >= 0 ? "+" : "−";
  const absoluteOffset = Math.abs(offsetMinutes);
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    minutesOfDay: hour * 60 + minute,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    offsetMinutes,
    offsetLabel: `UTC${offsetSign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`,
  };
}

function findLocalDateStart(date: string, timeZone: string): number {
  const { year, month, day } = parseDate(date);
  const anchor = Date.UTC(year, month - 1, day, 12);
  let earliest: number | null = null;
  for (let epoch = anchor - 36 * 60 * 60_000; epoch <= anchor + 36 * 60 * 60_000; epoch += 15 * 60_000) {
    if (getZonedDateTimeParts(epoch, timeZone).dateKey === date) {
      earliest = epoch;
      break;
    }
  }
  if (earliest === null) throw new Error(`ไม่พบวันที่ ${date} ในเขตเวลา ${timeZone}`);
  return earliest;
}

function normalizeInput(input: MeetingPlannerInput): MeetingPlannerInput {
  parseDate(input.date);
  if (!ALLOWED_DURATIONS.has(input.durationMinutes)) throw new Error("ระยะเวลาประชุมไม่รองรับ");
  if (input.participants.length < MIN_MEETING_PARTICIPANTS || input.participants.length > MAX_MEETING_PARTICIPANTS) {
    throw new Error(`เพิ่มผู้เข้าร่วม ${MIN_MEETING_PARTICIPANTS}–${MAX_MEETING_PARTICIPANTS} คน`);
  }
  const participants = input.participants.map((participant, index) => {
    const label = participant.label.trim();
    const timeZone = participant.timeZone.trim();
    if (!label || label.length > 40) throw new Error(`ชื่อผู้เข้าร่วมคนที่ ${index + 1} ต้องมี 1–40 ตัวอักษร`);
    if (!isValidTimeZone(timeZone)) throw new Error(`เขตเวลาของ ${label} ไม่ถูกต้อง`);
    const workStart = parseTime(participant.workStart);
    const workEnd = parseTime(participant.workEnd);
    if (workStart >= workEnd) throw new Error(`เวลางานของ ${label} ต้องเริ่มก่อนเวลาสิ้นสุดในวันเดียวกัน`);
    return { label, timeZone, workStart: participant.workStart, workEnd: participant.workEnd };
  });
  return {
    title: input.title.trim().slice(0, 120) || "ประชุมทีมต่างประเทศ",
    date: input.date,
    durationMinutes: input.durationMinutes,
    participants,
  };
}

function evaluateParticipant(
  participant: MeetingParticipant,
  startMs: number,
  endMs: number,
): ParticipantMeetingSlot {
  const localStart = getZonedDateTimeParts(startMs, participant.timeZone);
  const localEnd = getZonedDateTimeParts(endMs, participant.timeZone);
  const workStart = parseTime(participant.workStart);
  const workEnd = parseTime(participant.workEnd);
  const weekend = localStart.weekday === 0 || localStart.weekday === 6;
  const sameLocalDate = localStart.dateKey === localEnd.dateKey;
  const withinWorkHours = !weekend
    && sameLocalDate
    && localStart.minutesOfDay >= workStart
    && localEnd.minutesOfDay <= workEnd;
  let status: ParticipantSlotStatus;
  if (weekend) status = "weekend";
  else if (withinWorkHours) status = "available";
  else if (localStart.minutesOfDay < workStart) status = "early";
  else status = "late";

  let comfortScore: number;
  if (weekend) {
    comfortScore = 8;
  } else if (withinWorkHours) {
    const workMiddle = (workStart + workEnd) / 2;
    const meetingMiddle = (localStart.minutesOfDay + localEnd.minutesOfDay) / 2;
    const normalizedDistance = Math.abs(meetingMiddle - workMiddle) / Math.max(1, (workEnd - workStart) / 2);
    comfortScore = 85 + 15 * (1 - clamp(normalizedDistance, 0, 1));
  } else {
    const minutesOutside = localStart.minutesOfDay < workStart
      ? workStart - localStart.minutesOfDay
      : Math.max(0, localEnd.minutesOfDay - workEnd);
    comfortScore = clamp(72 - minutesOutside / 4, 0, 72);
  }
  return { participant, localStart, localEnd, status, withinWorkHours, comfortScore: Math.round(comfortScore) };
}

function chooseSpacedSuggestions(candidates: MeetingSuggestion[], durationMinutes: number): MeetingSuggestion[] {
  const suggestions: MeetingSuggestion[] = [];
  const minimumGapMs = Math.max(60, durationMinutes) * 60_000;
  for (const candidate of candidates) {
    if (suggestions.every((suggestion) => Math.abs(suggestion.startMs - candidate.startMs) >= minimumGapMs)) {
      suggestions.push(candidate);
      if (suggestions.length === 3) return suggestions;
    }
  }
  for (const candidate of candidates) {
    if (!suggestions.includes(candidate)) suggestions.push(candidate);
    if (suggestions.length === 3) break;
  }
  return suggestions;
}

export function planTimeZoneMeeting(rawInput: MeetingPlannerInput): MeetingPlannerResult {
  const input = normalizeInput(rawInput);
  const organizerTimeZone = input.participants[0]!.timeZone;
  const dayStartMs = findLocalDateStart(input.date, organizerTimeZone);
  const dayEndMs = findLocalDateStart(nextDateKey(input.date), organizerTimeZone);
  const durationMs = input.durationMinutes * 60_000;
  const candidates: MeetingSuggestion[] = [];

  for (let startMs = dayStartMs; startMs + durationMs <= dayEndMs; startMs += MEETING_SLOT_INTERVAL_MINUTES * 60_000) {
    const endMs = startMs + durationMs;
    const participantSlots = input.participants.map((participant) => evaluateParticipant(participant, startMs, endMs));
    const scores = participantSlots.map((slot) => slot.comfortScore);
    const availableCount = participantSlots.filter((slot) => slot.withinWorkHours).length;
    const worstScore = Math.min(...scores);
    const averageScore = scores.reduce((total, score) => total + score, 0) / scores.length;
    candidates.push({
      startMs,
      endMs,
      score: Math.round(worstScore * 0.7 + averageScore * 0.3),
      allAvailable: availableCount === input.participants.length,
      availableCount,
      participantSlots,
    });
  }

  candidates.sort((left, right) =>
    Number(right.allAvailable) - Number(left.allAvailable)
      || right.score - left.score
      || right.availableCount - left.availableCount
      || left.startMs - right.startMs,
  );
  const offsetChanges = input.participants
    .filter((participant) => {
      const offsets = new Set<number>();
      for (let epoch = dayStartMs; epoch < dayEndMs; epoch += 30 * 60_000) {
        offsets.add(getZonedDateTimeParts(epoch, participant.timeZone).offsetMinutes);
      }
      return offsets.size > 1;
    })
    .map((participant) => participant.label);

  return {
    dayStartMs,
    dayEndMs,
    dayLengthHours: (dayEndMs - dayStartMs) / 3_600_000,
    slotsEvaluated: candidates.length,
    hasFullOverlap: candidates.some((candidate) => candidate.allAvailable),
    offsetChanges,
    suggestions: chooseSpacedSuggestions(candidates, input.durationMinutes),
  };
}

export function buildMeetingPlannerShareUrl(origin: string, rawInput: MeetingPlannerInput, selectedStartMs?: number): string {
  const input = normalizeInput(rawInput);
  const url = new URL("/time-zone-meeting-planner", origin);
  url.searchParams.set("v", "1");
  url.searchParams.set("d", input.date);
  url.searchParams.set("du", String(input.durationMinutes));
  url.searchParams.set("t", input.title);
  url.searchParams.set("p", JSON.stringify(input.participants));
  if (Number.isFinite(selectedStartMs)) url.searchParams.set("s", String(selectedStartMs));
  if (url.toString().length > 3_500) throw new Error("ลิงก์ยาวเกินไป กรุณาย่อชื่อผู้เข้าร่วม");
  return url.toString();
}

export function parseMeetingPlannerShareParams(search: string): SharedMeetingPlan | null {
  try {
    const params = new URLSearchParams(search);
    if (params.get("v") !== "1") return null;
    const participants = JSON.parse(params.get("p") ?? "null") as unknown;
    if (!Array.isArray(participants)) return null;
    const input = normalizeInput({
      title: params.get("t") ?? "ประชุมทีมต่างประเทศ",
      date: params.get("d") ?? "",
      durationMinutes: Number(params.get("du")),
      participants: participants as MeetingParticipant[],
    });
    const selectedStartMs = Number(params.get("s"));
    return Number.isFinite(selectedStartMs) && selectedStartMs > 0 ? { ...input, selectedStartMs } : input;
  } catch {
    return null;
  }
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const output: string[] = [];
  let current = "";
  let limit = 75;
  for (const character of line) {
    if (encoder.encode(current + character).length > limit && current) {
      output.push(current);
      current = ` ${character}`;
      limit = 75;
    } else {
      current += character;
    }
  }
  if (current) output.push(current);
  return output.join("\r\n");
}

function utcIcsDate(epochMs: number): string {
  return new Date(epochMs).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildMeetingIcs(
  rawInput: MeetingPlannerInput,
  startMs: number,
  generatedAtMs = Date.now(),
): string {
  const input = normalizeInput(rawInput);
  if (!Number.isFinite(startMs) || startMs < 0) throw new Error("กรุณาเลือกเวลาประชุม");
  const endMs = startMs + input.durationMinutes * 60_000;
  const participantSummary = input.participants
    .map((participant) => `${participant.label}: ${participant.timeZone}`)
    .join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meaw Tools//Time Zone Meeting Planner//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${stableHash(`${input.title}|${startMs}`)}@meaw-tools.vercel.app`,
    `DTSTAMP:${utcIcsDate(generatedAtMs)}`,
    `DTSTART:${utcIcsDate(startMs)}`,
    `DTEND:${utcIcsDate(endMs)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(`วางแผนด้วย Meaw Tools\n${participantSummary}\nกรุณาตรวจสอบเวลาอีกครั้งก่อนส่งคำเชิญ`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildMeetingSummary(input: MeetingPlannerInput, suggestion: MeetingSuggestion): string {
  const title = input.title.trim() || "ประชุมทีมต่างประเทศ";
  const lines = suggestion.participantSlots.map((slot) => {
    const start = `${pad(slot.localStart.hour)}:${pad(slot.localStart.minute)}`;
    const end = `${pad(slot.localEnd.hour)}:${pad(slot.localEnd.minute)}`;
    return `- ${slot.participant.label}: ${slot.localStart.dateKey} ${start}–${end} (${slot.localStart.offsetLabel}, ${slot.participant.timeZone})`;
  });
  return [title, ...lines, "", "ตรวจสอบเวลาอีกครั้งก่อนส่งคำเชิญ • Meaw Tools"].join("\n");
}

export function meetingIcsFilename(title: string): string {
  const safe = title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${safe || "time-zone-meeting"}.ics`;
}
