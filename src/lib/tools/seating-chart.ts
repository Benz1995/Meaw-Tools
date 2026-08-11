export const SEATING_STATE_VERSION = 1 as const;
export const SEATING_MAX_PEOPLE = 200;
export const SEATING_MAX_NAME_LENGTH = 80;
export const SEATING_MAX_GROUP_LENGTH = 40;
export const SEATING_MAX_TITLE_LENGTH = 80;
export const SEATING_MAX_SEED_LENGTH = 80;
export const SEATING_MAX_INPUT_LENGTH = 50_000;
export const SEATING_MAX_JSON_LENGTH = 1_000_000;
export const SEATING_MAX_ROWS = 12;
export const SEATING_MAX_COLUMNS = 12;
export const SEATING_MAX_TABLES = 20;
export const SEATING_MAX_SEATS_PER_TABLE = 12;

export type SeatingLayout = "classroom" | "round-tables";
export type SeatingStrategy = "random" | "spread" | "together";

export type SeatingPerson = {
  id: string;
  name: string;
  group: string;
};

export type SeatingSeat = {
  id: string;
  label: string;
  section: string;
  row: number;
  column: number;
  personId: string | null;
  locked: boolean;
  unavailable: boolean;
};

export type SeatingChartState = {
  version: typeof SEATING_STATE_VERSION;
  title: string;
  layout: SeatingLayout;
  strategy: SeatingStrategy;
  rows: number;
  columns: number;
  tableCount: number;
  seatsPerTable: number;
  seed: string;
  people: SeatingPerson[];
  duplicateNames: string[];
  seats: SeatingSeat[];
};

export type CreateSeatingChartInput = {
  title: string;
  peopleText: string;
  layout: SeatingLayout;
  strategy: SeatingStrategy;
  rows: number;
  columns: number;
  tableCount: number;
  seatsPerTable: number;
  seed: string;
};

export type ParsedSeatingPeople = {
  people: SeatingPerson[];
  duplicateNames: string[];
};

type RandomSource = () => number;

function cleanText(value: string, maxLength: number, label: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) throw new Error(`กรอก${label}`);
  if (cleaned.length > maxLength) {
    throw new Error(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  }
  return cleaned;
}

function assertInteger(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องเป็นจำนวนเต็ม ${minimum}–${maximum}`);
  }
}

function normalizedNameKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("th-TH");
}

export function parseSeatingPeople(input: string): ParsedSeatingPeople {
  if (input.length > SEATING_MAX_INPUT_LENGTH) {
    throw new Error(`รายการยาวเกิน ${SEATING_MAX_INPUT_LENGTH.toLocaleString("en-US")} ตัวอักษร`);
  }
  const people: SeatingPerson[] = [];
  const duplicateNames: string[] = [];
  const seen = new Set<string>();

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const [rawName = "", ...rawGroupParts] = rawLine.split("|");
    const name = cleanText(rawName, SEATING_MAX_NAME_LENGTH, `ชื่อบรรทัดที่ ${index + 1}`);
    const groupSource = rawGroupParts.join("|");
    const group = groupSource.trim()
      ? cleanText(groupSource, SEATING_MAX_GROUP_LENGTH, `กลุ่มบรรทัดที่ ${index + 1}`)
      : "";
    const key = normalizedNameKey(name);
    if (seen.has(key)) {
      duplicateNames.push(name);
      continue;
    }
    seen.add(key);
    people.push({ id: `person-${people.length + 1}`, name, group });
    if (people.length > SEATING_MAX_PEOPLE) {
      throw new Error(`รองรับสูงสุด ${SEATING_MAX_PEOPLE} รายชื่อ กรุณาแบ่งเป็นหลายผัง`);
    }
  }
  if (!people.length) throw new Error("เพิ่มรายชื่ออย่างน้อย 1 คน");
  return { people, duplicateNames };
}

function isLayout(value: unknown): value is SeatingLayout {
  return value === "classroom" || value === "round-tables";
}

function isStrategy(value: unknown): value is SeatingStrategy {
  return value === "random" || value === "spread" || value === "together";
}

function hashSeed(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): RandomSource {
  let value = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex] as T, result[index] as T];
  }
  return result;
}

function groupedPeople(people: readonly SeatingPerson[], random: RandomSource): SeatingPerson[][] {
  const groups = new Map<string, SeatingPerson[]>();
  for (const person of people) {
    const key = person.group ? normalizedNameKey(person.group) : `__ungrouped-${person.id}`;
    const group = groups.get(key) ?? [];
    group.push(person);
    groups.set(key, group);
  }
  return shuffle(
    [...groups.values()].map((group) => shuffle(group, random)),
    random,
  );
}

function orderPeople(
  people: readonly SeatingPerson[],
  strategy: SeatingStrategy,
  random: RandomSource,
): SeatingPerson[] {
  if (strategy === "random") return shuffle(people, random);
  const groups = groupedPeople(people, random);
  if (strategy === "together") return groups.flat();

  const queues = groups
    .map((members, index) => ({ members: [...members], index, tie: random() }))
    .toSorted((left, right) => right.members.length - left.members.length || left.tie - right.tie);
  const result: SeatingPerson[] = [];
  let previousGroup = -1;
  while (queues.some((queue) => queue.members.length)) {
    const available = queues
      .filter((queue) => queue.members.length)
      .toSorted((left, right) => right.members.length - left.members.length || left.tie - right.tie);
    const selected = available.find((queue) => queue.index !== previousGroup) ?? available[0];
    if (!selected) break;
    const person = selected.members.shift();
    if (person) result.push(person);
    previousGroup = selected.index;
  }
  return result;
}

function createSeats(input: Pick<CreateSeatingChartInput, "layout" | "rows" | "columns" | "tableCount" | "seatsPerTable">): SeatingSeat[] {
  if (input.layout === "classroom") {
    return Array.from({ length: input.rows * input.columns }, (_, index) => {
      const row = Math.floor(index / input.columns);
      const column = index % input.columns;
      return {
        id: `R${row + 1}-C${column + 1}`,
        label: `แถว ${row + 1} · ที่ ${column + 1}`,
        section: `แถว ${row + 1}`,
        row,
        column,
        personId: null,
        locked: false,
        unavailable: false,
      };
    });
  }
  return Array.from({ length: input.tableCount * input.seatsPerTable }, (_, index) => {
    const table = Math.floor(index / input.seatsPerTable);
    const seat = index % input.seatsPerTable;
    return {
      id: `T${table + 1}-S${seat + 1}`,
      label: `โต๊ะ ${table + 1} · ที่ ${seat + 1}`,
      section: `โต๊ะ ${table + 1}`,
      row: table,
      column: seat,
      personId: null,
      locked: false,
      unavailable: false,
    };
  });
}

function validateInput(input: CreateSeatingChartInput): {
  title: string;
  seed: string;
  parsed: ParsedSeatingPeople;
} {
  if (!isLayout(input.layout)) throw new Error("รูปแบบผังที่นั่งไม่ถูกต้อง");
  if (!isStrategy(input.strategy)) throw new Error("วิธีจัดที่นั่งไม่ถูกต้อง");
  assertInteger(input.rows, 1, SEATING_MAX_ROWS, "จำนวนแถว");
  assertInteger(input.columns, 1, SEATING_MAX_COLUMNS, "จำนวนที่นั่งต่อแถว");
  assertInteger(input.tableCount, 1, SEATING_MAX_TABLES, "จำนวนโต๊ะ");
  assertInteger(input.seatsPerTable, 2, SEATING_MAX_SEATS_PER_TABLE, "จำนวนที่นั่งต่อโต๊ะ");
  const title = cleanText(input.title, SEATING_MAX_TITLE_LENGTH, "ชื่อผัง");
  const seed = cleanText(input.seed, SEATING_MAX_SEED_LENGTH, "Seed");
  return { title, seed, parsed: parseSeatingPeople(input.peopleText) };
}

export function createSeatingChart(input: CreateSeatingChartInput): SeatingChartState {
  const { title, seed, parsed } = validateInput(input);
  const seats = createSeats(input);
  if (parsed.people.length > seats.length) {
    throw new Error(`ที่นั่งไม่พอ: มี ${parsed.people.length} คน แต่ผังมี ${seats.length} ที่นั่ง`);
  }
  const random = seededRandom(seed);
  const ordered = orderPeople(parsed.people, input.strategy, random);
  const assignedSeats = seats.map((seat, index) => ({
    ...seat,
    personId: ordered[index]?.id ?? null,
  }));
  return {
    version: SEATING_STATE_VERSION,
    title,
    layout: input.layout,
    strategy: input.strategy,
    rows: input.rows,
    columns: input.columns,
    tableCount: input.tableCount,
    seatsPerTable: input.seatsPerTable,
    seed,
    people: parsed.people,
    duplicateNames: parsed.duplicateNames,
    seats: assignedSeats,
  };
}

export function generateSeatingSeed(): string {
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return `seat-${(values[0] ?? 0).toString(36)}-${(values[1] ?? 0).toString(36)}`;
}

function personMap(state: SeatingChartState): Map<string, SeatingPerson> {
  return new Map(state.people.map((person) => [person.id, person]));
}

export function getUnseatedPeople(state: SeatingChartState): SeatingPerson[] {
  const seated = new Set(state.seats.flatMap((seat) => seat.personId ? [seat.personId] : []));
  return state.people.filter((person) => !seated.has(person.id));
}

export function reshuffleSeating(state: SeatingChartState, seed: string): SeatingChartState {
  const nextSeed = cleanText(seed, SEATING_MAX_SEED_LENGTH, "Seed");
  const lockedPeople = new Set(
    state.seats.flatMap((seat) => seat.locked && seat.personId ? [seat.personId] : []),
  );
  const movablePeople = state.people.filter((person) => !lockedPeople.has(person.id));
  const openSeats = state.seats.filter((seat) => !seat.locked && !seat.unavailable);
  if (movablePeople.length > openSeats.length) {
    throw new Error(`ที่นั่งที่เปิดอยู่ไม่พอสำหรับ ${movablePeople.length} คนที่ยังไม่ล็อก`);
  }
  const ordered = orderPeople(movablePeople, state.strategy, seededRandom(nextSeed));
  let cursor = 0;
  const seats = state.seats.map((seat) => {
    if (seat.locked) return seat;
    if (seat.unavailable) return { ...seat, personId: null };
    const personId = ordered[cursor]?.id ?? null;
    cursor += 1;
    return { ...seat, personId };
  });
  return { ...state, seed: nextSeed, seats };
}

export function assignPersonToSeat(
  state: SeatingChartState,
  personId: string,
  seatId: string,
): SeatingChartState {
  if (!personMap(state).has(personId)) throw new Error("ไม่พบรายชื่อที่เลือก");
  const target = state.seats.find((seat) => seat.id === seatId);
  if (!target) throw new Error("ไม่พบที่นั่งที่เลือก");
  if (target.unavailable) throw new Error("ที่นั่งนี้ถูกปิดใช้งาน");
  if (target.locked && target.personId !== personId) throw new Error("ที่นั่งนี้ถูกล็อกไว้");
  const current = state.seats.find((seat) => seat.personId === personId);
  if (current?.locked && current.id !== target.id) throw new Error("ปลดล็อกที่นั่งเดิมก่อนย้ายรายชื่อ");
  if (current?.id === target.id) return state;
  const displacedPersonId = target.personId;
  const seats = state.seats.map((seat) => {
    if (seat.id === target.id) return { ...seat, personId };
    if (seat.id === current?.id) return { ...seat, personId: displacedPersonId };
    return seat;
  });
  return { ...state, seats };
}

export function unassignSeat(state: SeatingChartState, seatId: string): SeatingChartState {
  const seat = state.seats.find((candidate) => candidate.id === seatId);
  if (!seat) throw new Error("ไม่พบที่นั่งที่เลือก");
  if (seat.locked) throw new Error("ปลดล็อกที่นั่งก่อนนำรายชื่อออก");
  if (!seat.personId) return state;
  return {
    ...state,
    seats: state.seats.map((candidate) => candidate.id === seatId
      ? { ...candidate, personId: null }
      : candidate),
  };
}

export function toggleSeatLock(state: SeatingChartState, seatId: string): SeatingChartState {
  const seat = state.seats.find((candidate) => candidate.id === seatId);
  if (!seat) throw new Error("ไม่พบที่นั่งที่เลือก");
  if (!seat.personId || seat.unavailable) throw new Error("ล็อกได้เฉพาะที่นั่งที่มีรายชื่อ");
  return {
    ...state,
    seats: state.seats.map((candidate) => candidate.id === seatId
      ? { ...candidate, locked: !candidate.locked }
      : candidate),
  };
}

export function toggleSeatUnavailable(state: SeatingChartState, seatId: string): SeatingChartState {
  const seat = state.seats.find((candidate) => candidate.id === seatId);
  if (!seat) throw new Error("ไม่พบที่นั่งที่เลือก");
  if (seat.personId || seat.locked) throw new Error("นำรายชื่อออกและปลดล็อกก่อนปิดที่นั่ง");
  return {
    ...state,
    seats: state.seats.map((candidate) => candidate.id === seatId
      ? { ...candidate, unavailable: !candidate.unavailable }
      : candidate),
  };
}

export function clearSeatingAssignments(state: SeatingChartState): SeatingChartState {
  return {
    ...state,
    seats: state.seats.map((seat) => ({ ...seat, personId: null, locked: false })),
  };
}

export function assignUnseatedPeople(state: SeatingChartState, seed: string): SeatingChartState {
  const unseated = getUnseatedPeople(state);
  if (!unseated.length) return state;
  const openSeatIds = state.seats
    .filter((seat) => !seat.personId && !seat.unavailable && !seat.locked)
    .map((seat) => seat.id);
  if (unseated.length > openSeatIds.length) {
    throw new Error(`ที่นั่งว่างไม่พอ: ยังไม่ได้นั่ง ${unseated.length} คน แต่เหลือ ${openSeatIds.length} ที่`);
  }
  const nextSeed = cleanText(seed, SEATING_MAX_SEED_LENGTH, "Seed");
  const ordered = orderPeople(unseated, state.strategy, seededRandom(nextSeed));
  const assignment = new Map(openSeatIds.map((seatId, index) => [seatId, ordered[index]?.id ?? null]));
  return {
    ...state,
    seed: nextSeed,
    seats: state.seats.map((seat) => assignment.has(seat.id)
      ? { ...seat, personId: assignment.get(seat.id) ?? null }
      : seat),
  };
}

function spreadsheetSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | boolean): string {
  const raw = typeof value === "string" ? spreadsheetSafe(value) : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

export function seatingChartToCsv(state: SeatingChartState): string {
  const people = personMap(state);
  const rows: Array<Array<string | number | boolean>> = [
    ["Seat", "Section", "Row", "Position", "Person", "Group", "Locked", "Unavailable"],
    ...state.seats.map((seat) => {
      const person = seat.personId ? people.get(seat.personId) : undefined;
      return [
        seat.label,
        seat.section,
        seat.row + 1,
        seat.column + 1,
        person?.name ?? "",
        person?.group ?? "",
        seat.locked,
        seat.unavailable,
      ];
    }),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function seatingChartToText(state: SeatingChartState): string {
  const people = personMap(state);
  const sections = new Map<string, SeatingSeat[]>();
  for (const seat of state.seats) {
    const section = sections.get(seat.section) ?? [];
    section.push(seat);
    sections.set(seat.section, section);
  }
  return [
    state.title,
    `Seed: ${state.seed}`,
    ...[...sections.entries()].flatMap(([section, seats]) => [
      "",
      section,
      ...seats.map((seat) => {
        const person = seat.personId ? people.get(seat.personId) : undefined;
        const value = seat.unavailable ? "ปิดที่นั่ง" : person
          ? `${person.name}${person.group ? ` (${person.group})` : ""}`
          : "ว่าง";
        return `${seat.label}: ${value}${seat.locked ? " [ล็อก]" : ""}`;
      }),
    ]),
  ].join("\n");
}

export function serializeSeatingChart(state: SeatingChartState): string {
  return JSON.stringify(state, null, 2);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}ในไฟล์ JSON ไม่ถูกต้อง`);
  }
  return value as Record<string, unknown>;
}

export function restoreSeatingChart(json: string): SeatingChartState {
  if (json.length > SEATING_MAX_JSON_LENGTH) throw new Error("ไฟล์ JSON ใหญ่เกิน 1 MB");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("อ่านไฟล์ JSON ไม่สำเร็จ");
  }
  const source = asRecord(parsed, "โครงสร้าง");
  if (source.version !== SEATING_STATE_VERSION) {
    throw new Error("ไฟล์นี้เป็นคนละเวอร์ชันกับเครื่องมือปัจจุบัน");
  }
  if (!isLayout(source.layout) || !isStrategy(source.strategy)) {
    throw new Error("รูปแบบผังหรือวิธีจัดที่นั่งในไฟล์ไม่ถูกต้อง");
  }
  if (
    typeof source.title !== "string" ||
    typeof source.seed !== "string" ||
    typeof source.rows !== "number" ||
    typeof source.columns !== "number" ||
    typeof source.tableCount !== "number" ||
    typeof source.seatsPerTable !== "number" ||
    !Array.isArray(source.people) ||
    !Array.isArray(source.seats)
  ) {
    throw new Error("ข้อมูลหลักในไฟล์ JSON ไม่ครบ");
  }
  const peopleText = source.people.map((value, index) => {
    const person = asRecord(value, `รายชื่อที่ ${index + 1}`);
    if (typeof person.name !== "string" || typeof person.group !== "string") {
      throw new Error(`รายชื่อที่ ${index + 1} ในไฟล์ไม่ถูกต้อง`);
    }
    return `${person.name}${person.group ? ` | ${person.group}` : ""}`;
  }).join("\n");
  const regenerated = createSeatingChart({
    title: source.title,
    peopleText,
    layout: source.layout,
    strategy: source.strategy,
    rows: source.rows,
    columns: source.columns,
    tableCount: source.tableCount,
    seatsPerTable: source.seatsPerTable,
    seed: source.seed,
  });
  if (source.seats.length !== regenerated.seats.length) {
    throw new Error("จำนวนที่นั่งในไฟล์ JSON ไม่ตรงกับการตั้งค่า");
  }
  const validPeople = new Set(regenerated.people.map((person) => person.id));
  const seenSeats = new Set<string>();
  const seatedPeople = new Set<string>();
  const sourceSeatMap = new Map<string, Record<string, unknown>>();
  for (const [index, value] of source.seats.entries()) {
    const seat = asRecord(value, `ที่นั่งที่ ${index + 1}`);
    if (typeof seat.id !== "string" || seenSeats.has(seat.id)) {
      throw new Error("หมายเลขที่นั่งในไฟล์ JSON ไม่ถูกต้องหรือซ้ำกัน");
    }
    seenSeats.add(seat.id);
    sourceSeatMap.set(seat.id, seat);
  }
  const seats = regenerated.seats.map((canonical) => {
    const sourceSeat = sourceSeatMap.get(canonical.id);
    if (!sourceSeat) throw new Error(`ไม่พบ ${canonical.id} ในไฟล์ JSON`);
    const personId = sourceSeat.personId;
    if (personId !== null && typeof personId !== "string") {
      throw new Error(`รายชื่อของ ${canonical.id} ไม่ถูกต้อง`);
    }
    if (typeof personId === "string") {
      if (!validPeople.has(personId) || seatedPeople.has(personId)) {
        throw new Error("พบรายชื่อที่ไม่ถูกต้องหรือนั่งซ้ำในไฟล์ JSON");
      }
      seatedPeople.add(personId);
    }
    if (typeof sourceSeat.locked !== "boolean" || typeof sourceSeat.unavailable !== "boolean") {
      throw new Error(`สถานะของ ${canonical.id} ไม่ถูกต้อง`);
    }
    if (sourceSeat.unavailable && personId) throw new Error("ที่นั่งที่ปิดใช้งานต้องไม่มีรายชื่อ");
    if (sourceSeat.locked && !personId) throw new Error("ที่นั่งว่างไม่สามารถล็อกได้");
    return {
      ...canonical,
      personId,
      locked: sourceSeat.locked,
      unavailable: sourceSeat.unavailable,
    };
  });
  return { ...regenerated, duplicateNames: [], seats };
}
