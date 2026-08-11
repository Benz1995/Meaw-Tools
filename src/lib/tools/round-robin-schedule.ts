export const ROUND_ROBIN_MAX_PARTICIPANTS = 24;
export const ROUND_ROBIN_MAX_COURTS = 8;
export const ROUND_ROBIN_MAX_NAME_LENGTH = 80;
export const ROUND_ROBIN_MAX_TITLE_LENGTH = 80;
export const ROUND_ROBIN_MAX_COURT_NAME_LENGTH = 60;
export const ROUND_ROBIN_MAX_JSON_LENGTH = 500_000;
export const ROUND_ROBIN_STATE_VERSION = 1 as const;

export type RoundRobinFormat = "single" | "double";
export type RoundRobinOrderingMode = "ordered" | "random";
export type RoundRobinRandomSource = () => number;

export type RoundRobinParticipant = {
  id: string;
  name: string;
  order: number;
};

export type RoundRobinSettings = {
  format: RoundRobinFormat;
  orderingMode: RoundRobinOrderingMode;
  startDate: string;
  startTime: string;
  matchDurationMinutes: number;
  breakMinutes: number;
  courts: string[];
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
};

export type RoundRobinScore = {
  homeScore: number;
  awayScore: number;
};

export type RoundRobinScheduleState = {
  version: typeof ROUND_ROBIN_STATE_VERSION;
  title: string;
  participants: RoundRobinParticipant[];
  settings: RoundRobinSettings;
  scores: Record<string, RoundRobinScore>;
};

export type CreateRoundRobinScheduleInput = {
  title: string;
  names: string;
  courts: string;
  format: RoundRobinFormat;
  orderingMode: RoundRobinOrderingMode;
  startDate: string;
  startTime: string;
  matchDurationMinutes: number;
  breakMinutes: number;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
};

export type CreateRoundRobinScheduleResult = {
  state: RoundRobinScheduleState;
  duplicateNames: string[];
  duplicateCourts: string[];
};

export type ResolvedRoundRobinMatch = {
  id: string;
  displayNumber: number;
  roundNumber: number;
  leg: 1 | 2;
  matchInRound: number;
  home: RoundRobinParticipant;
  away: RoundRobinParticipant;
  court: string;
  start: string;
  end: string;
  score: RoundRobinScore | null;
};

export type ResolvedRoundRobinRound = {
  number: number;
  leg: 1 | 2;
  matches: ResolvedRoundRobinMatch[];
  bye: RoundRobinParticipant | null;
  start: string;
  end: string;
};

export type RoundRobinStanding = {
  position: number;
  participant: RoundRobinParticipant;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  difference: number;
  points: number;
};

export type ResolvedRoundRobinSchedule = {
  state: RoundRobinScheduleState;
  rounds: ResolvedRoundRobinRound[];
  matches: ResolvedRoundRobinMatch[];
  standings: RoundRobinStanding[];
  totalMatches: number;
  completedMatches: number;
  totalRounds: number;
  estimatedEnd: string;
};

type Pairing = {
  homeId: string;
  awayId: string;
};

type PairingRound = {
  pairings: Pairing[];
  byeId: string | null;
};

function cryptoRandomFloat(): number {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return (value[0] ?? 0) / 4_294_967_296;
}

function normalizeKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("th-TH");
}

function cleanText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanNamedLine(
  value: string,
  lineNumber: number,
  maxLength: number,
  label: string,
): string {
  const cleaned = cleanText(value, maxLength + 1);
  if (!cleaned) throw new Error(`บรรทัดที่ ${lineNumber} ไม่มี${label}`);
  if (cleaned.length > maxLength)
    throw new Error(
      `${label}บรรทัดที่ ${lineNumber} ยาวเกิน ${maxLength} ตัวอักษร`,
    );
  return cleaned;
}

function parseUniqueLines(
  input: string,
  options: { min: number; max: number; maxLength: number; label: string },
): { values: string[]; duplicates: string[] } {
  if (input.length > ROUND_ROBIN_MAX_JSON_LENGTH)
    throw new Error("รายการยาวเกินขนาดที่รองรับ");
  const values: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const value = cleanNamedLine(
      rawLine,
      index + 1,
      options.maxLength,
      options.label,
    );
    const key = normalizeKey(value);
    if (seen.has(key)) {
      duplicates.push(value);
      continue;
    }
    seen.add(key);
    values.push(value);
    if (values.length > options.max)
      throw new Error(`รองรับ${options.label}สูงสุด ${options.max} รายการ`);
  }

  if (values.length < options.min)
    throw new Error(
      `เพิ่ม${options.label}ที่ไม่ซ้ำกันอย่างน้อย ${options.min} รายการ`,
    );
  return { values, duplicates };
}

export function parseRoundRobinParticipants(input: string): {
  names: string[];
  duplicateNames: string[];
} {
  const result = parseUniqueLines(input, {
    min: 2,
    max: ROUND_ROBIN_MAX_PARTICIPANTS,
    maxLength: ROUND_ROBIN_MAX_NAME_LENGTH,
    label: "ชื่อผู้เข้าแข่งขันหรือทีม",
  });
  return { names: result.values, duplicateNames: result.duplicates };
}

export function parseRoundRobinCourts(input: string): {
  courts: string[];
  duplicateCourts: string[];
} {
  const result = parseUniqueLines(input, {
    min: 1,
    max: ROUND_ROBIN_MAX_COURTS,
    maxLength: ROUND_ROBIN_MAX_COURT_NAME_LENGTH,
    label: "ชื่อสนามหรือพื้นที่",
  });
  return { courts: result.values, duplicateCourts: result.duplicates };
}

function shuffle<T>(values: readonly T[], random: RoundRobinRandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = Math.max(0, Math.min(0.9999999999999999, random()));
    const target = Math.floor(value * (index + 1));
    [result[index], result[target]] = [result[target] as T, result[index] as T];
  }
  return result;
}

function validateInteger(
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${label}ต้องเป็นจำนวนเต็ม ${min}–${max}`);
}

function parseLocalDateTime(date: string, time: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch)
    throw new Error("วันที่หรือเวลาเริ่มไม่ถูกต้อง");
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (year < 2000 || year > 2100 || hour > 23 || minute > 59)
    throw new Error("วันที่หรือเวลาเริ่มอยู่นอกช่วงที่รองรับ");
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    result.getHours() !== hour ||
    result.getMinutes() !== minute
  )
    throw new Error("วันที่หรือเวลาเริ่มไม่ถูกต้อง");
  return result;
}

function formatLocalDateTime(value: Date): string {
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function addMinutes(value: Date, minutes: number): Date {
  return new Date(value.getTime() + minutes * 60_000);
}

function createPairingRounds(
  participantIds: readonly string[],
): PairingRound[] {
  const rotation: Array<string | null> = [...participantIds];
  if (rotation.length % 2 === 1) rotation.push(null);
  const rounds: PairingRound[] = [];
  const roundCount = rotation.length - 1;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const pairings: Pairing[] = [];
    let byeId: string | null = null;
    for (let index = 0; index < rotation.length / 2; index += 1) {
      let first = rotation[index] ?? null;
      let second = rotation[rotation.length - 1 - index] ?? null;
      if (first === null || second === null) {
        byeId = first ?? second;
        continue;
      }
      if (index === 0 && roundIndex % 2 === 1) {
        [first, second] = [second, first];
      }
      pairings.push({ homeId: first, awayId: second });
    }
    rounds.push({ pairings, byeId });
    const fixed = rotation[0] ?? null;
    const moving = rotation.slice(1);
    const last = moving.pop() ?? null;
    rotation.splice(0, rotation.length, fixed, last, ...moving);
  }
  return rounds;
}

function validateSettings(settings: RoundRobinSettings): void {
  if (settings.format !== "single" && settings.format !== "double")
    throw new Error("รูปแบบการแข่งขันไม่ถูกต้อง");
  if (settings.orderingMode !== "ordered" && settings.orderingMode !== "random")
    throw new Error("วิธีเรียงทีมไม่ถูกต้อง");
  parseLocalDateTime(settings.startDate, settings.startTime);
  validateInteger(settings.matchDurationMinutes, 5, 240, "เวลาต่อคู่");
  validateInteger(settings.breakMinutes, 0, 120, "เวลาพักระหว่างช่วง");
  validateInteger(settings.winPoints, 0, 20, "คะแนนชนะ");
  validateInteger(settings.drawPoints, 0, 20, "คะแนนเสมอ");
  validateInteger(settings.lossPoints, 0, 20, "คะแนนแพ้");
  if (
    settings.winPoints < settings.drawPoints ||
    settings.drawPoints < settings.lossPoints
  )
    throw new Error("คะแนนต้องเรียง ชนะ ≥ เสมอ ≥ แพ้");
  if (
    settings.courts.length < 1 ||
    settings.courts.length > ROUND_ROBIN_MAX_COURTS
  )
    throw new Error(`จำนวนสนามต้องอยู่ระหว่าง 1–${ROUND_ROBIN_MAX_COURTS}`);
}

export function createRoundRobinSchedule(
  input: CreateRoundRobinScheduleInput,
  random: RoundRobinRandomSource = cryptoRandomFloat,
): CreateRoundRobinScheduleResult {
  const parsedParticipants = parseRoundRobinParticipants(input.names);
  const parsedCourts = parseRoundRobinCourts(input.courts);
  const orderedNames =
    input.orderingMode === "random"
      ? shuffle(parsedParticipants.names, random)
      : parsedParticipants.names;
  const settings: RoundRobinSettings = {
    format: input.format,
    orderingMode: input.orderingMode,
    startDate: input.startDate,
    startTime: input.startTime,
    matchDurationMinutes: input.matchDurationMinutes,
    breakMinutes: input.breakMinutes,
    courts: parsedCourts.courts,
    winPoints: input.winPoints,
    drawPoints: input.drawPoints,
    lossPoints: input.lossPoints,
  };
  validateSettings(settings);
  return {
    state: {
      version: ROUND_ROBIN_STATE_VERSION,
      title:
        cleanText(input.title, ROUND_ROBIN_MAX_TITLE_LENGTH) ||
        "การแข่งขันแบบพบกันหมด",
      participants: orderedNames.map((name, index) => ({
        id: `rr-p-${index + 1}`,
        name,
        order: index + 1,
      })),
      settings,
      scores: {},
    },
    duplicateNames: parsedParticipants.duplicateNames,
    duplicateCourts: parsedCourts.duplicateCourts,
  };
}

function standingMetricsEqual(
  first: Omit<RoundRobinStanding, "position">,
  second: Omit<RoundRobinStanding, "position">,
): boolean {
  return (
    first.points === second.points &&
    first.difference === second.difference &&
    first.scored === second.scored &&
    first.wins === second.wins
  );
}

function buildStandings(
  state: RoundRobinScheduleState,
  matches: readonly ResolvedRoundRobinMatch[],
): RoundRobinStanding[] {
  const rows = new Map<string, Omit<RoundRobinStanding, "position">>(
    state.participants.map((participant) => [
      participant.id,
      {
        participant,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        scored: 0,
        conceded: 0,
        difference: 0,
        points: 0,
      },
    ]),
  );

  for (const match of matches) {
    if (!match.score) continue;
    const home = rows.get(match.home.id);
    const away = rows.get(match.away.id);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.scored += match.score.homeScore;
    home.conceded += match.score.awayScore;
    away.scored += match.score.awayScore;
    away.conceded += match.score.homeScore;
    if (match.score.homeScore > match.score.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += state.settings.winPoints;
      away.points += state.settings.lossPoints;
    } else if (match.score.homeScore < match.score.awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += state.settings.winPoints;
      home.points += state.settings.lossPoints;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += state.settings.drawPoints;
      away.points += state.settings.drawPoints;
    }
  }

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, difference: row.scored - row.conceded }))
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.difference - first.difference ||
        second.scored - first.scored ||
        second.wins - first.wins ||
        first.participant.name.localeCompare(second.participant.name, "th"),
    );

  const standings: RoundRobinStanding[] = [];
  for (const [index, row] of sorted.entries()) {
    const previous = standings.at(-1);
    standings.push({
      ...row,
      position:
        previous && standingMetricsEqual(row, previous)
          ? previous.position
          : index + 1,
    });
  }
  return standings;
}

export function resolveRoundRobinSchedule(
  state: RoundRobinScheduleState,
): ResolvedRoundRobinSchedule {
  validateSettings(state.settings);
  const participantById = new Map(
    state.participants.map((participant) => [participant.id, participant]),
  );
  const firstLeg = createPairingRounds(
    state.participants.map((participant) => participant.id),
  );
  const pairingRounds = [
    ...firstLeg.map((round) => ({ ...round, leg: 1 as const })),
    ...(state.settings.format === "double"
      ? firstLeg.map((round) => ({
          pairings: round.pairings.map((pairing) => ({
            homeId: pairing.awayId,
            awayId: pairing.homeId,
          })),
          byeId: round.byeId,
          leg: 2 as const,
        }))
      : []),
  ];
  const start = parseLocalDateTime(
    state.settings.startDate,
    state.settings.startTime,
  );
  const slotMinutes =
    state.settings.matchDurationMinutes + state.settings.breakMinutes;
  let elapsedSlots = 0;
  let displayNumber = 1;
  const rounds: ResolvedRoundRobinRound[] = [];

  for (const [roundIndex, pairingRound] of pairingRounds.entries()) {
    const roundStart = addMinutes(start, elapsedSlots * slotMinutes);
    const matches = pairingRound.pairings.map((pairing, matchIndex) => {
      const home = participantById.get(pairing.homeId);
      const away = participantById.get(pairing.awayId);
      if (!home || !away)
        throw new Error("ตารางอ้างอิงผู้เข้าแข่งขันที่ไม่ถูกต้อง");
      const wave = Math.floor(matchIndex / state.settings.courts.length);
      const matchStart = addMinutes(roundStart, wave * slotMinutes);
      const id = `leg${pairingRound.leg}-r${roundIndex + 1}-m${matchIndex + 1}`;
      const score = state.scores[id] ?? null;
      const match: ResolvedRoundRobinMatch = {
        id,
        displayNumber,
        roundNumber: roundIndex + 1,
        leg: pairingRound.leg,
        matchInRound: matchIndex + 1,
        home,
        away,
        court: state.settings.courts[
          matchIndex % state.settings.courts.length
        ] as string,
        start: formatLocalDateTime(matchStart),
        end: formatLocalDateTime(
          addMinutes(matchStart, state.settings.matchDurationMinutes),
        ),
        score,
      };
      displayNumber += 1;
      return match;
    });
    const waves = Math.max(
      1,
      Math.ceil(pairingRound.pairings.length / state.settings.courts.length),
    );
    elapsedSlots += waves;
    rounds.push({
      number: roundIndex + 1,
      leg: pairingRound.leg,
      matches,
      bye: pairingRound.byeId
        ? (participantById.get(pairingRound.byeId) ?? null)
        : null,
      start: formatLocalDateTime(roundStart),
      end: matches.at(-1)?.end ?? formatLocalDateTime(roundStart),
    });
  }

  const matches = rounds.flatMap((round) => round.matches);
  const estimatedEnd = matches.at(-1)?.end ?? formatLocalDateTime(start);
  return {
    state,
    rounds,
    matches,
    standings: buildStandings(state, matches),
    totalMatches: matches.length,
    completedMatches: matches.filter((match) => match.score !== null).length,
    totalRounds: rounds.length,
    estimatedEnd,
  };
}

function validateScore(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 999)
    throw new Error(`${label}ต้องเป็นจำนวนเต็ม 0–999`);
}

export function setRoundRobinMatchScore(
  state: RoundRobinScheduleState,
  matchId: string,
  homeScore: number,
  awayScore: number,
): RoundRobinScheduleState {
  validateScore(homeScore, "คะแนนเจ้าบ้าน");
  validateScore(awayScore, "คะแนนทีมเยือน");
  const allowed = resolveRoundRobinSchedule({
    ...state,
    scores: {},
  }).matches.some((match) => match.id === matchId);
  if (!allowed) throw new Error("ไม่พบคู่แข่งขันนี้");
  return {
    ...state,
    scores: { ...state.scores, [matchId]: { homeScore, awayScore } },
  };
}

export function clearRoundRobinMatchScore(
  state: RoundRobinScheduleState,
  matchId: string,
): RoundRobinScheduleState {
  const scores = { ...state.scores };
  delete scores[matchId];
  return { ...state, scores };
}

export function serializeRoundRobinSchedule(
  state: RoundRobinScheduleState,
): string {
  return JSON.stringify(state, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function restoreRoundRobinSchedule(
  json: string,
): RoundRobinScheduleState {
  if (json.length > ROUND_ROBIN_MAX_JSON_LENGTH)
    throw new Error("ไฟล์ JSON ใหญ่เกิน 500 KB");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("ไฟล์ JSON ไม่ถูกต้อง");
  }
  if (
    !isRecord(raw) ||
    raw.version !== ROUND_ROBIN_STATE_VERSION ||
    !Array.isArray(raw.participants) ||
    !isRecord(raw.settings) ||
    typeof raw.title !== "string"
  )
    throw new Error("ไม่ใช่ไฟล์ Round Robin Schedule ที่รองรับ");
  if (
    raw.participants.length < 2 ||
    raw.participants.length > ROUND_ROBIN_MAX_PARTICIPANTS
  )
    throw new Error("จำนวนผู้เข้าแข่งขันในไฟล์ไม่ถูกต้อง");

  const participants = raw.participants.map((participant, index) => {
    if (
      !isRecord(participant) ||
      typeof participant.name !== "string" ||
      participant.order !== index + 1
    )
      throw new Error("ลำดับผู้เข้าแข่งขันในไฟล์ไม่ถูกต้อง");
    return {
      id: `rr-p-${index + 1}`,
      name: cleanNamedLine(
        participant.name,
        index + 1,
        ROUND_ROBIN_MAX_NAME_LENGTH,
        "ชื่อผู้เข้าแข่งขันหรือทีม",
      ),
      order: index + 1,
    };
  });
  if (
    new Set(participants.map((participant) => normalizeKey(participant.name)))
      .size !== participants.length
  )
    throw new Error("ไฟล์มีชื่อผู้เข้าแข่งขันซ้ำ");

  const settingsRaw = raw.settings;
  if (
    !Array.isArray(settingsRaw.courts) ||
    settingsRaw.courts.some((court) => typeof court !== "string") ||
    typeof settingsRaw.startDate !== "string" ||
    typeof settingsRaw.startTime !== "string" ||
    typeof settingsRaw.matchDurationMinutes !== "number" ||
    typeof settingsRaw.breakMinutes !== "number" ||
    typeof settingsRaw.winPoints !== "number" ||
    typeof settingsRaw.drawPoints !== "number" ||
    typeof settingsRaw.lossPoints !== "number"
  )
    throw new Error("การตั้งค่าตารางในไฟล์ไม่ถูกต้อง");
  const courtLines = settingsRaw.courts.join("\n");
  const parsedCourts = parseRoundRobinCourts(courtLines);
  if (parsedCourts.duplicateCourts.length) throw new Error("ไฟล์มีชื่อสนามซ้ำ");
  const settings: RoundRobinSettings = {
    format: settingsRaw.format as RoundRobinFormat,
    orderingMode: settingsRaw.orderingMode as RoundRobinOrderingMode,
    startDate: settingsRaw.startDate,
    startTime: settingsRaw.startTime,
    matchDurationMinutes: settingsRaw.matchDurationMinutes,
    breakMinutes: settingsRaw.breakMinutes,
    courts: parsedCourts.courts,
    winPoints: settingsRaw.winPoints,
    drawPoints: settingsRaw.drawPoints,
    lossPoints: settingsRaw.lossPoints,
  };
  validateSettings(settings);
  const baseState: RoundRobinScheduleState = {
    version: ROUND_ROBIN_STATE_VERSION,
    title:
      cleanText(raw.title, ROUND_ROBIN_MAX_TITLE_LENGTH) ||
      "การแข่งขันแบบพบกันหมด",
    participants,
    settings,
    scores: {},
  };
  const allowedMatches = new Set(
    resolveRoundRobinSchedule(baseState).matches.map((match) => match.id),
  );
  const scores: Record<string, RoundRobinScore> = {};
  if (isRecord(raw.scores)) {
    for (const [matchId, score] of Object.entries(raw.scores)) {
      if (!allowedMatches.has(matchId) || !isRecord(score)) continue;
      if (
        typeof score.homeScore !== "number" ||
        typeof score.awayScore !== "number"
      )
        throw new Error("ไฟล์มีคะแนนไม่ถูกต้อง");
      const homeScore = score.homeScore;
      const awayScore = score.awayScore;
      validateScore(homeScore, "คะแนนเจ้าบ้าน");
      validateScore(awayScore, "คะแนนทีมเยือน");
      scores[matchId] = { homeScore, awayScore };
    }
  }
  return { ...baseState, scores };
}

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function roundRobinScheduleCsv(
  resolved: ResolvedRoundRobinSchedule,
): string {
  const header = [
    "Match",
    "Round",
    "Leg",
    "Date",
    "Start",
    "End",
    "Court",
    "Home",
    "Away",
    "Home score",
    "Away score",
    "Status",
  ];
  const rows = resolved.matches.map((match) => {
    const [date, start] = match.start.split("T");
    const end = match.end.split("T")[1] ?? "";
    return [
      match.displayNumber,
      match.roundNumber,
      match.leg,
      date ?? "",
      start ?? "",
      end,
      match.court,
      match.home.name,
      match.away.name,
      match.score?.homeScore ?? "",
      match.score?.awayScore ?? "",
      match.score ? "completed" : "scheduled",
    ]
      .map(csvCell)
      .join(",");
  });
  return `\uFEFF${header.map(csvCell).join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let currentBytes = 0;
  let capacity = 75;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (current && currentBytes + bytes > capacity) {
      lines.push(current);
      current = ` ${character}`;
      currentBytes = 1 + bytes;
      capacity = 75;
    } else {
      current += character;
      currentBytes += bytes;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

function icsLocalDateTime(value: string): string {
  return value.replace(/[-:]/g, "");
}

function icsUtcDateTime(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function simpleHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function roundRobinScheduleIcs(
  resolved: ResolvedRoundRobinSchedule,
  generatedAt = new Date(),
): string {
  const fingerprint = simpleHash(
    [
      resolved.state.title,
      resolved.state.settings.startDate,
      resolved.state.settings.startTime,
      ...resolved.state.participants.map((participant) => participant.name),
    ].join("|"),
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meaw Tools//Round Robin Schedule Generator//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...resolved.matches.flatMap((match) => [
      "BEGIN:VEVENT",
      `UID:${fingerprint}-${match.id}@meaw-tools.vercel.app`,
      `DTSTAMP:${icsUtcDateTime(generatedAt)}`,
      `DTSTART:${icsLocalDateTime(match.start)}00`,
      `DTEND:${icsLocalDateTime(match.end)}00`,
      `SUMMARY:${escapeIcs(`${match.home.name} vs ${match.away.name} — ${resolved.state.title}`)}`,
      `LOCATION:${escapeIcs(match.court)}`,
      `DESCRIPTION:${escapeIcs(`รอบ ${match.roundNumber} • นัดที่ ${match.displayNumber}${match.score ? ` • ผล ${match.score.homeScore}-${match.score.awayScore}` : ""}`)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function roundRobinScheduleSummary(
  resolved: ResolvedRoundRobinSchedule,
): string {
  const lines = [
    resolved.state.title,
    `${resolved.state.settings.format === "double" ? "Double" : "Single"} Round Robin • ${resolved.state.participants.length} คน/ทีม • ${resolved.totalRounds} รอบ • ${resolved.totalMatches} คู่`,
    "",
  ];
  for (const round of resolved.rounds) {
    lines.push(`รอบ ${round.number}${round.leg === 2 ? " (เลก 2)" : ""}`);
    if (round.bye) lines.push(`พัก: ${round.bye.name}`);
    for (const match of round.matches) {
      lines.push(
        `M${match.displayNumber} ${match.start.replace("T", " ")} • ${match.court} • ${match.home.name} vs ${match.away.name}${match.score ? ` • ${match.score.homeScore}-${match.score.awayScore}` : ""}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
