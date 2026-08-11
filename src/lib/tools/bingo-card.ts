export const BINGO_STATE_VERSION = 1 as const;
export const BINGO_MAX_ITEMS = 500;
export const BINGO_MAX_CARDS = 100;
export const BINGO_MAX_ITEM_LENGTH = 80;
export const BINGO_MAX_TITLE_LENGTH = 80;
export const BINGO_MAX_SEED_LENGTH = 80;
export const BINGO_MAX_FREE_LABEL_LENGTH = 24;
export const BINGO_MAX_JSON_LENGTH = 1_000_000;

export type BingoMode = "custom" | "classic75";
export type BingoGridSize = 3 | 4 | 5;
export type BingoCardsPerPage = 1 | 2 | 4;
export type BingoColorTheme = "matcha" | "sakura" | "mikan" | "sora";

export type BingoCell = {
  key: string;
  value: string;
  row: number;
  column: number;
  isFree: boolean;
};

export type BingoCard = {
  id: string;
  number: number;
  cells: BingoCell[];
};

export type BingoCall = {
  key: string;
  label: string;
};

export type BingoGameState = {
  version: typeof BINGO_STATE_VERSION;
  title: string;
  mode: BingoMode;
  size: BingoGridSize;
  freeCenter: boolean;
  freeLabel: string;
  cardCount: number;
  cardsPerPage: BingoCardsPerPage;
  seed: string;
  theme: BingoColorTheme;
  items: string[];
  cards: BingoCard[];
  callOrder: BingoCall[];
  calledKeys: string[];
  marks: Record<string, string[]>;
};

export type CreateBingoGameInput = {
  title: string;
  mode: BingoMode;
  size: BingoGridSize;
  freeCenter: boolean;
  freeLabel: string;
  cardCount: number;
  cardsPerPage: BingoCardsPerPage;
  seed: string;
  theme: BingoColorTheme;
  itemsText: string;
};

export type CreateBingoGameResult = {
  state: BingoGameState;
  duplicateItems: string[];
};

const BINGO_COLUMNS = ["B", "I", "N", "G", "O"] as const;
const VALID_SIZES = new Set<number>([3, 4, 5]);
const VALID_CARDS_PER_PAGE = new Set<number>([1, 2, 4]);
const VALID_THEMES = new Set<BingoColorTheme>([
  "matcha",
  "sakura",
  "mikan",
  "sora",
]);

function cleanText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("th-TH");
}

function assertInteger(
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}ต้องเป็นจำนวนเต็ม ${min}–${max}`);
  }
}

function hashSeed(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target] as T,
      shuffled[index] as T,
    ];
  }
  return shuffled;
}

function isGridSize(value: unknown): value is BingoGridSize {
  return typeof value === "number" && VALID_SIZES.has(value);
}

function isCardsPerPage(value: unknown): value is BingoCardsPerPage {
  return typeof value === "number" && VALID_CARDS_PER_PAGE.has(value);
}

function isTheme(value: unknown): value is BingoColorTheme {
  return typeof value === "string" && VALID_THEMES.has(value as BingoColorTheme);
}

function isMode(value: unknown): value is BingoMode {
  return value === "custom" || value === "classic75";
}

export function bingoRequiredItemCount(
  size: BingoGridSize,
  freeCenter: boolean,
): number {
  return size * size - (freeCenter && size % 2 === 1 ? 1 : 0);
}

export function parseBingoItems(
  input: string,
  minimum: number,
): { items: string[]; duplicateItems: string[] } {
  if (input.length > BINGO_MAX_JSON_LENGTH) {
    throw new Error("รายการคำยาวเกินขนาดที่รองรับ");
  }

  const items: string[] = [];
  const duplicateItems: string[] = [];
  const seen = new Set<string>();

  for (const [index, rawLine] of input.split(/\r?\n/).entries()) {
    if (!rawLine.trim()) continue;
    const cleaned = cleanText(rawLine, BINGO_MAX_ITEM_LENGTH + 1);
    if (cleaned.length > BINGO_MAX_ITEM_LENGTH) {
      throw new Error(
        `คำหรือข้อความบรรทัดที่ ${index + 1} ยาวเกิน ${BINGO_MAX_ITEM_LENGTH} ตัวอักษร`,
      );
    }
    const key = normalizeKey(cleaned);
    if (seen.has(key)) {
      duplicateItems.push(cleaned);
      continue;
    }
    seen.add(key);
    items.push(cleaned);
    if (items.length > BINGO_MAX_ITEMS) {
      throw new Error(`รองรับคำหรือข้อความสูงสุด ${BINGO_MAX_ITEMS} รายการ`);
    }
  }

  if (items.length < minimum) {
    throw new Error(`เพิ่มคำหรือข้อความที่ไม่ซ้ำกันอย่างน้อย ${minimum} รายการ`);
  }

  return { items, duplicateItems };
}

export function generateBingoSeed(): string {
  const bytes = new Uint32Array(2);
  globalThis.crypto.getRandomValues(bytes);
  return `${(bytes[0] ?? 0).toString(36)}-${(bytes[1] ?? 0).toString(36)}`;
}

function customCalls(items: readonly string[], seed: string): BingoCall[] {
  return shuffle(
    items.map((value, index) => ({ key: `item-${index + 1}`, label: value })),
    seededRandom(`${seed}:caller`),
  );
}

function classicCalls(seed: string): BingoCall[] {
  const calls = Array.from({ length: 75 }, (_, index) => {
    const value = index + 1;
    const column = BINGO_COLUMNS[Math.floor(index / 15)] ?? "B";
    return { key: `number-${value}`, label: `${column}-${value}` };
  });
  return shuffle(calls, seededRandom(`${seed}:caller`));
}

function createCustomCard(
  number: number,
  size: BingoGridSize,
  freeCenter: boolean,
  freeLabel: string,
  items: readonly string[],
  seed: string,
  attempt: number,
): BingoCard {
  const required = bingoRequiredItemCount(size, freeCenter);
  const selected = shuffle(
    items.map((value, index) => ({ key: `item-${index + 1}`, value })),
    seededRandom(`${seed}:card:${number}:${attempt}`),
  ).slice(0, required);
  const center = Math.floor((size * size) / 2);
  let itemIndex = 0;
  const cells = Array.from({ length: size * size }, (_, position): BingoCell => {
    const isFree = freeCenter && size % 2 === 1 && position === center;
    const item = selected[itemIndex];
    if (!isFree) itemIndex += 1;
    return {
      key: isFree ? "free" : (item?.key ?? ""),
      value: isFree ? freeLabel : (item?.value ?? ""),
      row: Math.floor(position / size),
      column: position % size,
      isFree,
    };
  });
  return { id: `card-${number}`, number, cells };
}

function createClassicCard(
  number: number,
  seed: string,
  attempt: number,
  freeLabel: string,
): BingoCard {
  const random = seededRandom(`${seed}:card:${number}:${attempt}`);
  const columns = BINGO_COLUMNS.map((_, column) => {
    const start = column * 15 + 1;
    return shuffle(
      Array.from({ length: 15 }, (__, index) => start + index),
      random,
    ).slice(0, 5);
  });
  const cells: BingoCell[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const isFree = row === 2 && column === 2;
      const value = columns[column]?.[row] ?? 0;
      cells.push({
        key: isFree ? "free" : `number-${value}`,
        value: isFree ? freeLabel : String(value),
        row,
        column,
        isFree,
      });
    }
  }
  return { id: `card-${number}`, number, cells };
}

function createUniqueCards(options: {
  mode: BingoMode;
  size: BingoGridSize;
  freeCenter: boolean;
  freeLabel: string;
  items: readonly string[];
  cardCount: number;
  seed: string;
}): BingoCard[] {
  const cards: BingoCard[] = [];
  const signatures = new Set<string>();

  for (let cardNumber = 1; cardNumber <= options.cardCount; cardNumber += 1) {
    let accepted: BingoCard | null = null;
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const candidate =
        options.mode === "classic75"
          ? createClassicCard(
              cardNumber,
              options.seed,
              attempt,
              options.freeLabel,
            )
          : createCustomCard(
              cardNumber,
              options.size,
              options.freeCenter,
              options.freeLabel,
              options.items,
              options.seed,
              attempt,
            );
      const signature = candidate.cells.map((cell) => cell.key).join("|");
      if (signatures.has(signature)) continue;
      signatures.add(signature);
      accepted = candidate;
      break;
    }
    if (!accepted) {
      throw new Error(
        "ไม่สามารถสร้างการ์ดที่ไม่ซ้ำได้ครบตามจำนวน ลองเพิ่มรายการหรือลดจำนวนการ์ด",
      );
    }
    cards.push(accepted);
  }
  return cards;
}

export function createBingoGame(
  input: CreateBingoGameInput,
): CreateBingoGameResult {
  if (!isMode(input.mode)) throw new Error("รูปแบบบิงโกไม่ถูกต้อง");
  if (!isGridSize(input.size)) throw new Error("ขนาดตารางไม่ถูกต้อง");
  if (!isTheme(input.theme)) throw new Error("ชุดสีไม่ถูกต้อง");
  if (!isCardsPerPage(input.cardsPerPage)) {
    throw new Error("จำนวนการ์ดต่อหน้าพิมพ์ไม่ถูกต้อง");
  }
  assertInteger(input.cardCount, 1, BINGO_MAX_CARDS, "จำนวนการ์ด");

  const title = cleanText(input.title, BINGO_MAX_TITLE_LENGTH + 1);
  if (!title) throw new Error("กรอกชื่อชุดบิงโก");
  if (title.length > BINGO_MAX_TITLE_LENGTH) {
    throw new Error(`ชื่อชุดบิงโกยาวเกิน ${BINGO_MAX_TITLE_LENGTH} ตัวอักษร`);
  }
  const freeLabel = cleanText(input.freeLabel, BINGO_MAX_FREE_LABEL_LENGTH + 1);
  if (!freeLabel) throw new Error("กรอกข้อความช่องกลางฟรี");
  if (freeLabel.length > BINGO_MAX_FREE_LABEL_LENGTH) {
    throw new Error(
      `ข้อความช่องกลางฟรียาวเกิน ${BINGO_MAX_FREE_LABEL_LENGTH} ตัวอักษร`,
    );
  }
  const seed = cleanText(input.seed, BINGO_MAX_SEED_LENGTH + 1);
  if (!seed) throw new Error("กรอก Seed หรือกดสุ่ม Seed");
  if (seed.length > BINGO_MAX_SEED_LENGTH) {
    throw new Error(`Seed ยาวเกิน ${BINGO_MAX_SEED_LENGTH} ตัวอักษร`);
  }

  const mode = input.mode;
  const size: BingoGridSize = mode === "classic75" ? 5 : input.size;
  const freeCenter = mode === "classic75" ? true : input.freeCenter && size % 2 === 1;
  const parsed =
    mode === "custom"
      ? parseBingoItems(
          input.itemsText,
          bingoRequiredItemCount(size, freeCenter),
        )
      : { items: [] as string[], duplicateItems: [] as string[] };
  const cards = createUniqueCards({
    mode,
    size,
    freeCenter,
    freeLabel,
    items: parsed.items,
    cardCount: input.cardCount,
    seed,
  });

  return {
    duplicateItems: parsed.duplicateItems,
    state: {
      version: BINGO_STATE_VERSION,
      title,
      mode,
      size,
      freeCenter,
      freeLabel,
      cardCount: input.cardCount,
      cardsPerPage: input.cardsPerPage,
      seed,
      theme: input.theme,
      items: parsed.items,
      cards,
      callOrder:
        mode === "classic75" ? classicCalls(seed) : customCalls(parsed.items, seed),
      calledKeys: [],
      marks: {},
    },
  };
}

export function drawNextBingoCall(state: BingoGameState): BingoGameState {
  const called = new Set(state.calledKeys);
  const next = state.callOrder.find((call) => !called.has(call.key));
  if (!next) return state;
  return { ...state, calledKeys: [...state.calledKeys, next.key] };
}

export function undoLastBingoCall(state: BingoGameState): BingoGameState {
  if (state.calledKeys.length === 0) return state;
  return { ...state, calledKeys: state.calledKeys.slice(0, -1) };
}

export function resetBingoCalls(state: BingoGameState): BingoGameState {
  if (state.calledKeys.length === 0) return state;
  return { ...state, calledKeys: [] };
}

export function toggleBingoMark(
  state: BingoGameState,
  cardId: string,
  cellKey: string,
): BingoGameState {
  const card = state.cards.find((candidate) => candidate.id === cardId);
  const cell = card?.cells.find((candidate) => candidate.key === cellKey);
  if (!card || !cell || cell.isFree) return state;
  const current = new Set(state.marks[cardId] ?? []);
  if (current.has(cellKey)) current.delete(cellKey);
  else current.add(cellKey);
  return {
    ...state,
    marks: { ...state.marks, [cardId]: [...current] },
  };
}

export function resetBingoMarks(
  state: BingoGameState,
  cardId: string,
): BingoGameState {
  if (!(cardId in state.marks)) return state;
  const marks = { ...state.marks };
  delete marks[cardId];
  return { ...state, marks };
}

export function hasBingo(
  card: BingoCard,
  size: BingoGridSize,
  markedKeys: readonly string[],
): boolean {
  const marked = new Set(markedKeys);
  const isMarked = (row: number, column: number) => {
    const cell = card.cells.find(
      (candidate) => candidate.row === row && candidate.column === column,
    );
    return Boolean(cell && (cell.isFree || marked.has(cell.key)));
  };

  for (let row = 0; row < size; row += 1) {
    if (Array.from({ length: size }, (_, column) => isMarked(row, column)).every(Boolean)) {
      return true;
    }
  }
  for (let column = 0; column < size; column += 1) {
    if (Array.from({ length: size }, (_, row) => isMarked(row, column)).every(Boolean)) {
      return true;
    }
  }
  const diagonal = Array.from({ length: size }, (_, index) =>
    isMarked(index, index),
  ).every(Boolean);
  const reverseDiagonal = Array.from({ length: size }, (_, index) =>
    isMarked(index, size - index - 1),
  ).every(Boolean);
  return diagonal || reverseDiagonal;
}

function csvCell(value: string | number): string {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function bingoGameToCsv(state: BingoGameState): string {
  const rows = [
    ["Card", "Row", "Column", "Column Label", "Value", "Free"],
    ...state.cards.flatMap((card) =>
      card.cells.map((cell) => [
        card.number,
        cell.row + 1,
        cell.column + 1,
        state.size === 5 ? (BINGO_COLUMNS[cell.column] ?? "") : "",
        cell.value,
        cell.isFree ? "yes" : "no",
      ]),
    ),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function bingoCardToText(
  state: BingoGameState,
  card: BingoCard,
): string {
  const lines = [state.title, `Card #${card.number} • Seed: ${state.seed}`];
  if (state.size === 5) lines.push(BINGO_COLUMNS.join("\t"));
  for (let row = 0; row < state.size; row += 1) {
    lines.push(
      card.cells
        .filter((cell) => cell.row === row)
        .map((cell) => cell.value)
        .join("\t"),
    );
  }
  return lines.join("\n");
}

export function serializeBingoGame(state: BingoGameState): string {
  return JSON.stringify(state, null, 2);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("รูปแบบไฟล์ JSON ไม่ถูกต้อง");
  }
  return value as Record<string, unknown>;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${label}ในไฟล์ JSON ไม่ถูกต้อง`);
  }
  return value;
}

export function restoreBingoGame(json: string): BingoGameState {
  if (json.length > BINGO_MAX_JSON_LENGTH) {
    throw new Error("ไฟล์ JSON ใหญ่เกิน 1 MB");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("อ่านไฟล์ JSON ไม่สำเร็จ");
  }
  const source = asRecord(parsed);
  if (source.version !== BINGO_STATE_VERSION) {
    throw new Error("ไฟล์นี้เป็นคนละเวอร์ชันกับเครื่องมือปัจจุบัน");
  }
  if (!isMode(source.mode) || !isGridSize(source.size) || !isTheme(source.theme)) {
    throw new Error("การตั้งค่าในไฟล์ JSON ไม่ถูกต้อง");
  }
  if (
    typeof source.title !== "string" ||
    typeof source.freeCenter !== "boolean" ||
    typeof source.freeLabel !== "string" ||
    typeof source.cardCount !== "number" ||
    !isCardsPerPage(source.cardsPerPage) ||
    typeof source.seed !== "string"
  ) {
    throw new Error("ข้อมูลหลักในไฟล์ JSON ไม่ครบ");
  }
  const items = stringArray(source.items, "รายการคำ");
  const regenerated = createBingoGame({
    title: source.title,
    mode: source.mode,
    size: source.size,
    freeCenter: source.freeCenter,
    freeLabel: source.freeLabel,
    cardCount: source.cardCount,
    cardsPerPage: source.cardsPerPage,
    seed: source.seed,
    theme: source.theme,
    itemsText: items.join("\n"),
  }).state;

  const validCallKeys = new Set(regenerated.callOrder.map((call) => call.key));
  const calledKeys = stringArray(source.calledKeys ?? [], "ประวัติคำเรียก");
  const uniqueCalledKeys = [...new Set(calledKeys)];
  if (
    uniqueCalledKeys.length !== calledKeys.length ||
    calledKeys.some((key) => !validCallKeys.has(key))
  ) {
    throw new Error("ประวัติคำเรียกในไฟล์ JSON ไม่ถูกต้อง");
  }

  const marksSource = asRecord(source.marks ?? {});
  const marks: Record<string, string[]> = {};
  for (const [cardId, value] of Object.entries(marksSource)) {
    const card = regenerated.cards.find((candidate) => candidate.id === cardId);
    if (!card) throw new Error("หมายเลขการ์ดในไฟล์ JSON ไม่ถูกต้อง");
    const validCellKeys = new Set(
      card.cells.filter((cell) => !cell.isFree).map((cell) => cell.key),
    );
    const cardMarks = stringArray(value, "ช่องที่ทำเครื่องหมาย");
    const uniqueMarks = [...new Set(cardMarks)];
    if (
      uniqueMarks.length !== cardMarks.length ||
      cardMarks.some((key) => !validCellKeys.has(key))
    ) {
      throw new Error("ช่องที่ทำเครื่องหมายในไฟล์ JSON ไม่ถูกต้อง");
    }
    marks[cardId] = cardMarks;
  }

  return { ...regenerated, calledKeys, marks };
}
