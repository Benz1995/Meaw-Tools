export const BRACKET_MAX_PARTICIPANTS = 32;
export const BRACKET_MAX_NAME_LENGTH = 80;
export const BRACKET_MAX_TITLE_LENGTH = 80;
export const BRACKET_MAX_JSON_LENGTH = 200_000;
export const BRACKET_STATE_VERSION = 1 as const;

export type BracketSeedingMode = "seeded" | "random";
export type BracketSlotStatus = "ready" | "bye" | "pending";

export type BracketParticipant = {
  id: string;
  name: string;
  seed: number;
};

export type BracketOutcome = {
  participant1Id: string;
  participant2Id: string;
  winnerId: string;
  score1: number | null;
  score2: number | null;
};

export type SingleEliminationBracketState = {
  version: typeof BRACKET_STATE_VERSION;
  title: string;
  seedingMode: BracketSeedingMode;
  thirdPlaceEnabled: boolean;
  participants: BracketParticipant[];
  outcomes: Record<string, BracketOutcome>;
};

export type BracketSlot = {
  status: BracketSlotStatus;
  participant: BracketParticipant | null;
  sourceLabel: string;
};

export type ResolvedBracketMatch = {
  id: string;
  displayNumber: number;
  roundIndex: number;
  matchIndex: number;
  roundLabel: string;
  slot1: BracketSlot;
  slot2: BracketSlot;
  winner: BracketParticipant | null;
  loser: BracketParticipant | null;
  outcome: BracketOutcome | null;
  autoAdvanced: boolean;
};

export type ResolvedBracketRound = {
  index: number;
  label: string;
  matches: ResolvedBracketMatch[];
};

export type ResolvedSingleEliminationBracket = {
  state: SingleEliminationBracketState;
  bracketSize: number;
  rounds: ResolvedBracketRound[];
  thirdPlaceMatch: ResolvedBracketMatch | null;
  champion: BracketParticipant | null;
  runnerUp: BracketParticipant | null;
  thirdPlace: BracketParticipant | null;
  byeCount: number;
  totalMatches: number;
  completedMatches: number;
};

export type CreateSingleEliminationBracketInput = {
  title: string;
  names: string;
  seedingMode: BracketSeedingMode;
  thirdPlaceEnabled: boolean;
};

export type CreateSingleEliminationBracketResult = {
  state: SingleEliminationBracketState;
  duplicateNames: string[];
};

export type BracketRandomSource = () => number;

function cryptoRandomFloat(): number {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return (value[0] ?? 0) / 4_294_967_296;
}

function normalizeNameKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("th-TH");
}

function cleanText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanParticipantName(value: string, lineNumber: number): string {
  const name = cleanText(value, BRACKET_MAX_NAME_LENGTH + 1);
  if (!name) throw new Error(`บรรทัดที่ ${lineNumber} ไม่มีชื่อผู้เข้าแข่งขัน`);
  if (name.length > BRACKET_MAX_NAME_LENGTH)
    throw new Error(
      `ชื่อบรรทัดที่ ${lineNumber} ยาวเกิน ${BRACKET_MAX_NAME_LENGTH} ตัวอักษร`,
    );
  return name;
}

export function parseBracketParticipants(input: string): {
  names: string[];
  duplicateNames: string[];
} {
  if (input.length > BRACKET_MAX_JSON_LENGTH)
    throw new Error("รายการยาวเกินขนาดที่รองรับ");
  const names: string[] = [];
  const duplicateNames: string[] = [];
  const seen = new Set<string>();

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const name = cleanParticipantName(rawLine, index + 1);
    const key = normalizeNameKey(name);
    if (seen.has(key)) {
      duplicateNames.push(name);
      continue;
    }
    seen.add(key);
    names.push(name);
    if (names.length > BRACKET_MAX_PARTICIPANTS)
      throw new Error(`รองรับสูงสุด ${BRACKET_MAX_PARTICIPANTS} คนหรือทีม`);
  }

  if (names.length < 2)
    throw new Error("เพิ่มชื่อผู้เข้าแข่งขันที่ไม่ซ้ำกันอย่างน้อย 2 รายการ");
  return { names, duplicateNames };
}

function shuffle<T>(values: readonly T[], random: BracketRandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = Math.max(0, Math.min(0.9999999999999999, random()));
    const target = Math.floor(value * (index + 1));
    [result[index], result[target]] = [result[target] as T, result[index] as T];
  }
  return result;
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

export function bracketSeedOrder(size: number): number[] {
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    size > BRACKET_MAX_PARTICIPANTS ||
    (size & (size - 1)) !== 0
  ) {
    throw new Error("ขนาดสายแข่งขันต้องเป็นเลขยกกำลังของ 2 ระหว่าง 2–32");
  }
  let seeds = [1, 2];
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1;
    seeds = seeds.flatMap((seed) => [seed, sum - seed]);
  }
  return seeds;
}

function roundLabel(roundIndex: number, totalRounds: number): string {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return "รอบชิงชนะเลิศ";
  if (remaining === 2) return "รอบรองชนะเลิศ";
  if (remaining === 3) return "รอบก่อนรองชนะเลิศ";
  return `รอบ ${2 ** remaining} คน/ทีม`;
}

function readySlot(
  participant: BracketParticipant,
  sourceLabel = "",
): BracketSlot {
  return { status: "ready", participant, sourceLabel };
}

function emptySlot(
  status: Exclude<BracketSlotStatus, "ready">,
  sourceLabel: string,
): BracketSlot {
  return { status, participant: null, sourceLabel };
}

function validOutcomeForSlots(
  outcome: BracketOutcome | undefined,
  slot1: BracketSlot,
  slot2: BracketSlot,
): BracketOutcome | null {
  const participant1 = slot1.participant;
  const participant2 = slot2.participant;
  if (
    !outcome ||
    slot1.status !== "ready" ||
    slot2.status !== "ready" ||
    !participant1 ||
    !participant2
  )
    return null;
  if (
    outcome.participant1Id !== participant1.id ||
    outcome.participant2Id !== participant2.id
  )
    return null;
  if (
    outcome.winnerId !== participant1.id &&
    outcome.winnerId !== participant2.id
  )
    return null;
  return outcome;
}

function resolveMatch(
  id: string,
  displayNumber: number,
  roundIndex: number,
  matchIndex: number,
  label: string,
  slot1: BracketSlot,
  slot2: BracketSlot,
  outcomes: Record<string, BracketOutcome>,
): ResolvedBracketMatch {
  const outcome = validOutcomeForSlots(outcomes[id], slot1, slot2);
  const participant1 = slot1.participant;
  const participant2 = slot2.participant;
  const autoAdvanced =
    (slot1.status === "ready" && slot2.status === "bye") ||
    (slot2.status === "ready" && slot1.status === "bye");
  const winner = outcome
    ? outcome.winnerId === participant1?.id
      ? participant1
      : participant2
    : autoAdvanced
      ? (participant1 ?? participant2)
      : null;
  const loser = outcome
    ? outcome.winnerId === participant1?.id
      ? participant2
      : participant1
    : null;
  return {
    id,
    displayNumber,
    roundIndex,
    matchIndex,
    roundLabel: label,
    slot1,
    slot2,
    winner: winner ?? null,
    loser: loser ?? null,
    outcome,
    autoAdvanced,
  };
}

export function resolveSingleEliminationBracket(
  state: SingleEliminationBracketState,
): ResolvedSingleEliminationBracket {
  const participantCount = state.participants.length;
  const bracketSize = nextPowerOfTwo(participantCount);
  const totalRounds = Math.log2(bracketSize);
  const seeds = bracketSeedOrder(bracketSize);
  const participantsBySeed = new Map(
    state.participants.map((participant) => [participant.seed, participant]),
  );
  const rounds: ResolvedBracketRound[] = [];
  let displayNumber = 1;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const matchCount = bracketSize / 2 ** (roundIndex + 1);
    const label = roundLabel(roundIndex, totalRounds);
    const matches: ResolvedBracketMatch[] = [];
    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      let slot1: BracketSlot;
      let slot2: BracketSlot;
      if (roundIndex === 0) {
        const seed1 = seeds[matchIndex * 2] as number;
        const seed2 = seeds[matchIndex * 2 + 1] as number;
        const participant1 = participantsBySeed.get(seed1);
        const participant2 = participantsBySeed.get(seed2);
        slot1 = participant1
          ? readySlot(participant1)
          : emptySlot("bye", `Seed ${seed1}`);
        slot2 = participant2
          ? readySlot(participant2)
          : emptySlot("bye", `Seed ${seed2}`);
      } else {
        const previousRound = rounds[roundIndex - 1] as ResolvedBracketRound;
        const source1 = previousRound.matches[
          matchIndex * 2
        ] as ResolvedBracketMatch;
        const source2 = previousRound.matches[
          matchIndex * 2 + 1
        ] as ResolvedBracketMatch;
        slot1 = source1.winner
          ? readySlot(source1.winner, `ผู้ชนะ M${source1.displayNumber}`)
          : emptySlot("pending", `ผู้ชนะ M${source1.displayNumber}`);
        slot2 = source2.winner
          ? readySlot(source2.winner, `ผู้ชนะ M${source2.displayNumber}`)
          : emptySlot("pending", `ผู้ชนะ M${source2.displayNumber}`);
      }
      matches.push(
        resolveMatch(
          `r${roundIndex + 1}-m${matchIndex + 1}`,
          displayNumber,
          roundIndex,
          matchIndex,
          label,
          slot1,
          slot2,
          state.outcomes,
        ),
      );
      displayNumber += 1;
    }
    rounds.push({ index: roundIndex, label, matches });
  }

  const finalMatch = rounds.at(-1)?.matches[0] ?? null;
  let thirdPlaceMatch: ResolvedBracketMatch | null = null;
  if (state.thirdPlaceEnabled) {
    const semifinals = rounds.at(-2)?.matches ?? [];
    const slot1 = semifinals[0]?.loser
      ? readySlot(semifinals[0].loser, `ผู้แพ้ M${semifinals[0].displayNumber}`)
      : emptySlot(
          "pending",
          semifinals[0]
            ? `ผู้แพ้ M${semifinals[0].displayNumber}`
            : "รอรอบรองฯ",
        );
    const slot2 = semifinals[1]?.loser
      ? readySlot(semifinals[1].loser, `ผู้แพ้ M${semifinals[1].displayNumber}`)
      : emptySlot(
          "pending",
          semifinals[1]
            ? `ผู้แพ้ M${semifinals[1].displayNumber}`
            : "รอรอบรองฯ",
        );
    thirdPlaceMatch = resolveMatch(
      "third-place",
      displayNumber,
      totalRounds,
      0,
      "ชิงอันดับ 3",
      slot1,
      slot2,
      state.outcomes,
    );
  }

  const allMatches = [
    ...rounds.flatMap((round) => round.matches),
    ...(thirdPlaceMatch ? [thirdPlaceMatch] : []),
  ];
  return {
    state,
    bracketSize,
    rounds,
    thirdPlaceMatch,
    champion: finalMatch?.winner ?? null,
    runnerUp: finalMatch?.loser ?? null,
    thirdPlace: thirdPlaceMatch?.winner ?? null,
    byeCount: bracketSize - participantCount,
    totalMatches: participantCount - 1 + (state.thirdPlaceEnabled ? 1 : 0),
    completedMatches: allMatches.filter((match) => match.outcome !== null)
      .length,
  };
}

function collectValidOutcomes(
  resolved: ResolvedSingleEliminationBracket,
): Record<string, BracketOutcome> {
  return Object.fromEntries(
    [
      ...resolved.rounds.flatMap((round) => round.matches),
      ...(resolved.thirdPlaceMatch ? [resolved.thirdPlaceMatch] : []),
    ].flatMap((match) =>
      match.outcome ? [[match.id, match.outcome] as const] : [],
    ),
  );
}

export function createSingleEliminationBracket(
  input: CreateSingleEliminationBracketInput,
  random: BracketRandomSource = cryptoRandomFloat,
): CreateSingleEliminationBracketResult {
  const parsed = parseBracketParticipants(input.names);
  if (input.thirdPlaceEnabled && parsed.names.length < 4)
    throw new Error("รอบชิงอันดับ 3 ต้องมีผู้เข้าแข่งขันอย่างน้อย 4 รายการ");
  const orderedNames =
    input.seedingMode === "random"
      ? shuffle(parsed.names, random)
      : parsed.names;
  const participants = orderedNames.map((name, index) => ({
    id: `p-${index + 1}`,
    name,
    seed: index + 1,
  }));
  const title =
    cleanText(input.title, BRACKET_MAX_TITLE_LENGTH) ||
    "การแข่งขันแบบแพ้คัดออก";
  return {
    state: {
      version: BRACKET_STATE_VERSION,
      title,
      seedingMode: input.seedingMode,
      thirdPlaceEnabled: input.thirdPlaceEnabled,
      participants,
      outcomes: {},
    },
    duplicateNames: parsed.duplicateNames,
  };
}

function validateScore(score: number | null, label: string): void {
  if (score !== null && (!Number.isInteger(score) || score < 0 || score > 999))
    throw new Error(`${label} ต้องเป็นจำนวนเต็ม 0–999`);
}

export function setBracketMatchWinner(
  state: SingleEliminationBracketState,
  matchId: string,
  winnerId: string,
  score1: number | null = null,
  score2: number | null = null,
): SingleEliminationBracketState {
  const resolved = resolveSingleEliminationBracket(state);
  const match = [
    ...resolved.rounds.flatMap((round) => round.matches),
    ...(resolved.thirdPlaceMatch ? [resolved.thirdPlaceMatch] : []),
  ].find((item) => item.id === matchId);
  if (
    !match ||
    match.slot1.status !== "ready" ||
    match.slot2.status !== "ready" ||
    !match.slot1.participant ||
    !match.slot2.participant
  ) {
    throw new Error("คู่นี้ยังไม่พร้อมบันทึกผล");
  }
  if (
    winnerId !== match.slot1.participant.id &&
    winnerId !== match.slot2.participant.id
  )
    throw new Error("ผู้ชนะไม่อยู่ในคู่นี้");
  validateScore(score1, "คะแนนฝ่ายแรก");
  validateScore(score2, "คะแนนฝ่ายที่สอง");
  if ((score1 === null) !== (score2 === null))
    throw new Error("กรอกคะแนนทั้งสองฝ่าย หรือเว้นว่างทั้งคู่");
  if (score1 !== null && score2 !== null) {
    if (score1 === score2)
      throw new Error("การแข่งขันแพ้คัดออกไม่สามารถบันทึกผลเสมอได้");
    const scoreWinnerId =
      score1 > score2 ? match.slot1.participant.id : match.slot2.participant.id;
    if (winnerId !== scoreWinnerId)
      throw new Error("ผู้ชนะต้องตรงกับฝ่ายที่มีคะแนนสูงกว่า");
  }
  const candidate: SingleEliminationBracketState = {
    ...state,
    outcomes: {
      ...state.outcomes,
      [matchId]: {
        participant1Id: match.slot1.participant.id,
        participant2Id: match.slot2.participant.id,
        winnerId,
        score1,
        score2,
      },
    },
  };
  return {
    ...candidate,
    outcomes: collectValidOutcomes(resolveSingleEliminationBracket(candidate)),
  };
}

export function clearBracketMatchOutcome(
  state: SingleEliminationBracketState,
  matchId: string,
): SingleEliminationBracketState {
  const outcomes = { ...state.outcomes };
  delete outcomes[matchId];
  const candidate = { ...state, outcomes };
  return {
    ...candidate,
    outcomes: collectValidOutcomes(resolveSingleEliminationBracket(candidate)),
  };
}

export function serializeSingleEliminationBracket(
  state: SingleEliminationBracketState,
): string {
  return JSON.stringify(state, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredScore(value: unknown): number | null {
  if (value === null) return null;
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > 999
  )
    throw new Error("ไฟล์มีคะแนนไม่ถูกต้อง");
  return value as number;
}

export function restoreSingleEliminationBracket(
  json: string,
): SingleEliminationBracketState {
  if (json.length > BRACKET_MAX_JSON_LENGTH)
    throw new Error("ไฟล์ JSON ใหญ่เกิน 200 KB");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("ไฟล์ JSON ไม่ถูกต้อง");
  }
  if (
    !isRecord(raw) ||
    raw.version !== BRACKET_STATE_VERSION ||
    !Array.isArray(raw.participants)
  )
    throw new Error("ไม่ใช่ไฟล์ Single Elimination Bracket ที่รองรับ");
  if (raw.seedingMode !== "seeded" && raw.seedingMode !== "random")
    throw new Error("รูปแบบ Seed ในไฟล์ไม่ถูกต้อง");
  if (typeof raw.thirdPlaceEnabled !== "boolean")
    throw new Error("การตั้งค่าชิงอันดับ 3 ไม่ถูกต้อง");
  if (typeof raw.title !== "string")
    throw new Error("ชื่อการแข่งขันไม่ถูกต้อง");
  if (
    raw.participants.length < 2 ||
    raw.participants.length > BRACKET_MAX_PARTICIPANTS
  )
    throw new Error("จำนวนผู้เข้าแข่งขันในไฟล์ไม่ถูกต้อง");

  const participants = raw.participants.map((participant, index) => {
    if (
      !isRecord(participant) ||
      typeof participant.name !== "string" ||
      participant.seed !== index + 1
    )
      throw new Error("ลำดับ Seed ในไฟล์ไม่ถูกต้อง");
    return {
      id: `p-${index + 1}`,
      name: cleanParticipantName(participant.name, index + 1),
      seed: index + 1,
    };
  });
  if (
    new Set(
      participants.map((participant) => normalizeNameKey(participant.name)),
    ).size !== participants.length
  )
    throw new Error("ไฟล์มีชื่อผู้เข้าแข่งขันซ้ำ");
  if (raw.thirdPlaceEnabled && participants.length < 4)
    throw new Error("ชิงอันดับ 3 ต้องมีอย่างน้อย 4 รายการ");

  const baseState: SingleEliminationBracketState = {
    version: BRACKET_STATE_VERSION,
    title:
      cleanText(raw.title, BRACKET_MAX_TITLE_LENGTH) ||
      "การแข่งขันแบบแพ้คัดออก",
    seedingMode: raw.seedingMode,
    thirdPlaceEnabled: raw.thirdPlaceEnabled,
    participants,
    outcomes: {},
  };
  const allowedMatchIds = new Set([
    ...resolveSingleEliminationBracket(baseState).rounds.flatMap((round) =>
      round.matches.map((match) => match.id),
    ),
    ...(raw.thirdPlaceEnabled ? ["third-place"] : []),
  ]);
  const outcomes: Record<string, BracketOutcome> = {};
  if (isRecord(raw.outcomes)) {
    for (const matchId of allowedMatchIds) {
      const outcome = raw.outcomes[matchId];
      if (!isRecord(outcome)) continue;
      if (
        typeof outcome.participant1Id !== "string" ||
        typeof outcome.participant2Id !== "string" ||
        typeof outcome.winnerId !== "string"
      )
        continue;
      outcomes[matchId] = {
        participant1Id: outcome.participant1Id,
        participant2Id: outcome.participant2Id,
        winnerId: outcome.winnerId,
        score1: parseStoredScore(outcome.score1),
        score2: parseStoredScore(outcome.score2),
      };
    }
  }
  const candidate = { ...baseState, outcomes };
  return {
    ...candidate,
    outcomes: collectValidOutcomes(resolveSingleEliminationBracket(candidate)),
  };
}

function spreadsheetSafeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const text =
    typeof value === "number" ? String(value) : spreadsheetSafeText(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function slotText(slot: BracketSlot): string {
  if (slot.participant) return slot.participant.name;
  return slot.status === "bye" ? "BYE" : slot.sourceLabel;
}

export function singleEliminationBracketCsv(
  resolved: ResolvedSingleEliminationBracket,
): string {
  const rows: Array<Array<string | number>> = [
    [
      "Round",
      "Match",
      "Participant 1",
      "Seed 1",
      "Score 1",
      "Participant 2",
      "Seed 2",
      "Score 2",
      "Winner",
      "Status",
    ],
  ];
  const matches = [
    ...resolved.rounds.flatMap((round) => round.matches),
    ...(resolved.thirdPlaceMatch ? [resolved.thirdPlaceMatch] : []),
  ];
  for (const match of matches) {
    rows.push([
      match.roundLabel,
      `M${match.displayNumber}`,
      slotText(match.slot1),
      match.slot1.participant?.seed ?? "",
      match.outcome?.score1 ?? "",
      slotText(match.slot2),
      match.slot2.participant?.seed ?? "",
      match.outcome?.score2 ?? "",
      match.winner?.name ?? "",
      match.outcome ? "Completed" : match.autoAdvanced ? "Bye" : "Pending",
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function singleEliminationBracketSummary(
  resolved: ResolvedSingleEliminationBracket,
): string {
  const lines = [
    resolved.state.title,
    `${resolved.state.participants.length} คน/ทีม • ${resolved.rounds.length} รอบ • แข่ง ${resolved.totalMatches} คู่`,
    `ความคืบหน้า ${resolved.completedMatches}/${resolved.totalMatches}`,
  ];
  for (const round of resolved.rounds) {
    lines.push("", round.label);
    for (const match of round.matches) {
      const score =
        match.outcome &&
        match.outcome.score1 !== null &&
        match.outcome.score2 !== null
          ? ` ${match.outcome.score1}–${match.outcome.score2}`
          : "";
      lines.push(
        `M${match.displayNumber}: ${slotText(match.slot1)} vs ${slotText(match.slot2)}${score}${match.winner ? ` → ${match.winner.name}` : ""}`,
      );
    }
  }
  if (resolved.thirdPlaceMatch) {
    const match = resolved.thirdPlaceMatch;
    const score =
      match.outcome &&
      match.outcome.score1 !== null &&
      match.outcome.score2 !== null
        ? ` ${match.outcome.score1}–${match.outcome.score2}`
        : "";
    lines.push(
      "",
      `ชิงอันดับ 3: ${slotText(match.slot1)} vs ${slotText(match.slot2)}${score}${match.winner ? ` → ${match.winner.name}` : ""}`,
    );
  }
  if (resolved.champion) lines.push("", `แชมป์: ${resolved.champion.name}`);
  return lines.join("\n");
}
