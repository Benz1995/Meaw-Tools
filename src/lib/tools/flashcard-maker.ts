export const FLASHCARD_MAKER_VERSION = 1 as const;
export const FLASHCARD_MAKER_MAX_CARDS = 200;
export const FLASHCARD_MAKER_MAX_FIELD_LENGTH = 1_000;
export const FLASHCARD_MAKER_MAX_TEXT_LENGTH = 200_000;
export const FLASHCARD_MAKER_MAX_JSON_LENGTH = 1_000_000;

export type FlashcardTheme = "matcha" | "sakura" | "mikan" | "sora";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
};

export type FlashcardDeck = {
  version: typeof FLASHCARD_MAKER_VERSION;
  title: string;
  theme: FlashcardTheme;
  cards: Flashcard[];
};

export type FlashcardParseResult = {
  cards: Flashcard[];
  duplicateCount: number;
};

export type FlashcardPrintSheet = {
  fronts: Array<Flashcard | null>;
  backs: Array<Flashcard | null>;
};

const THEMES = new Set<FlashcardTheme>(["matcha", "sakura", "mikan", "sora"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanField(value: string, label: string, maximum = FLASHCARD_MAKER_MAX_FIELD_LENGTH): string {
  const cleaned = value.replace(/\r\n?/g, "\n").trim();
  if (!cleaned) throw new Error(`${label} is required`);
  if (Array.from(cleaned).length > maximum) throw new Error(`${label} must be at most ${maximum} characters`);
  return cleaned;
}

function cardKey(front: string, back: string): string {
  return `${front.normalize("NFKC").toLocaleLowerCase()}\u0000${back.normalize("NFKC").toLocaleLowerCase()}`;
}

function cardsFromPairs(pairs: Array<[string, string]>): FlashcardParseResult {
  if (pairs.length > FLASHCARD_MAKER_MAX_CARDS) {
    throw new Error(`A deck supports at most ${FLASHCARD_MAKER_MAX_CARDS} cards`);
  }
  const cards: Flashcard[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  pairs.forEach(([rawFront, rawBack], index) => {
    const front = cleanField(rawFront, `Front on row ${index + 1}`);
    const back = cleanField(rawBack, `Back on row ${index + 1}`);
    const key = cardKey(front, back);
    if (seen.has(key)) {
      duplicateCount += 1;
      return;
    }
    seen.add(key);
    cards.push({ id: `card-${cards.length + 1}`, front, back });
  });
  if (!cards.length) throw new Error("Add at least one complete flashcard");
  return { cards, duplicateCount };
}

function splitPair(line: string, lineNumber: number): [string, string] {
  const tabIndex = line.indexOf("\t");
  if (tabIndex >= 0) return [line.slice(0, tabIndex), line.slice(tabIndex + 1)];
  const spacedPipeIndex = line.indexOf(" | ");
  if (spacedPipeIndex >= 0) return [line.slice(0, spacedPipeIndex), line.slice(spacedPipeIndex + 3)];
  const pipeIndex = line.indexOf("|");
  if (pipeIndex >= 0) return [line.slice(0, pipeIndex), line.slice(pipeIndex + 1)];
  throw new Error(`Row ${lineNumber} needs a tab or | between front and back`);
}

export function parseFlashcardText(input: string): FlashcardParseResult {
  if (input.length > FLASHCARD_MAKER_MAX_TEXT_LENGTH) throw new Error("Flashcard text is too large");
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const pairs = lines.flatMap<[string, string]>((line, index) => {
    if (!line.trim()) return [];
    return [splitPair(line, index + 1)];
  });
  return cardsFromPairs(pairs);
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = input.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"' && !cell) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}

const FRONT_HEADERS = new Set(["front", "question", "term", "word", "คำถาม", "ด้านหน้า", "คำศัพท์"].map(normalizeHeader));
const BACK_HEADERS = new Set(["back", "answer", "definition", "meaning", "คำตอบ", "ด้านหลัง", "ความหมาย"].map(normalizeHeader));

export function parseFlashcardCsv(input: string): FlashcardParseResult {
  if (input.length > FLASHCARD_MAKER_MAX_TEXT_LENGTH) throw new Error("Flashcard CSV is too large");
  const rows = parseCsvRows(input);
  if (!rows.length) throw new Error("CSV does not contain flashcards");
  const header = rows[0]!.map(normalizeHeader);
  const frontIndex = header.findIndex((value) => FRONT_HEADERS.has(value));
  const backIndex = header.findIndex((value) => BACK_HEADERS.has(value));
  const hasHeader = frontIndex >= 0 && backIndex >= 0 && frontIndex !== backIndex;
  const resolvedFrontIndex = hasHeader ? frontIndex : 0;
  const resolvedBackIndex = hasHeader ? backIndex : 1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const pairs = dataRows.map<[string, string]>((row, index) => {
    if (row.length <= Math.max(resolvedFrontIndex, resolvedBackIndex)) {
      throw new Error(`CSV row ${index + (hasHeader ? 2 : 1)} needs front and back columns`);
    }
    return [row[resolvedFrontIndex] ?? "", row[resolvedBackIndex] ?? ""];
  });
  return cardsFromPairs(pairs);
}

function validateCards(cards: Flashcard[]): Flashcard[] {
  if (!Array.isArray(cards) || !cards.length) throw new Error("Add at least one complete flashcard");
  if (cards.length > FLASHCARD_MAKER_MAX_CARDS) throw new Error(`A deck supports at most ${FLASHCARD_MAKER_MAX_CARDS} cards`);
  const seen = new Set<string>();
  const ids = new Set<string>();
  return cards.map((card, index) => {
    if (!isRecord(card) || typeof card.id !== "string" || typeof card.front !== "string" || typeof card.back !== "string") {
      throw new Error(`Flashcard ${index + 1} is invalid`);
    }
    const id = cleanField(card.id, `Card ID ${index + 1}`, 80);
    const front = cleanField(card.front, `Front on card ${index + 1}`);
    const back = cleanField(card.back, `Back on card ${index + 1}`);
    const key = cardKey(front, back);
    if (ids.has(id)) throw new Error("Flashcard IDs must be unique");
    if (seen.has(key)) throw new Error("Duplicate flashcards are not allowed");
    ids.add(id);
    seen.add(key);
    return { id, front, back };
  });
}

export function createFlashcardDeck(input: { title: string; theme: FlashcardTheme; cards: Flashcard[] }): FlashcardDeck {
  if (!THEMES.has(input.theme)) throw new Error("Flashcard theme is invalid");
  return {
    version: FLASHCARD_MAKER_VERSION,
    title: cleanField(input.title, "Deck title", 100),
    theme: input.theme,
    cards: validateCards(input.cards),
  };
}

export function addFlashcard(deck: FlashcardDeck, input: Pick<Flashcard, "front" | "back">): FlashcardDeck {
  if (deck.cards.length >= FLASHCARD_MAKER_MAX_CARDS) throw new Error(`A deck supports at most ${FLASHCARD_MAKER_MAX_CARDS} cards`);
  const front = cleanField(input.front, "Front");
  const back = cleanField(input.back, "Back");
  if (deck.cards.some((card) => cardKey(card.front, card.back) === cardKey(front, back))) throw new Error("This flashcard already exists");
  const nextNumber = deck.cards.reduce((maximum, card) => {
    const match = /^card-(\d+)$/.exec(card.id);
    return Math.max(maximum, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return { ...deck, cards: [...deck.cards, { id: `card-${nextNumber}`, front, back }] };
}

export function updateFlashcard(deck: FlashcardDeck, cardId: string, input: Pick<Flashcard, "front" | "back">): FlashcardDeck {
  const front = cleanField(input.front, "Front");
  const back = cleanField(input.back, "Back");
  if (!deck.cards.some((card) => card.id === cardId)) throw new Error("Flashcard was not found");
  if (deck.cards.some((card) => card.id !== cardId && cardKey(card.front, card.back) === cardKey(front, back))) {
    throw new Error("This flashcard already exists");
  }
  return { ...deck, cards: deck.cards.map((card) => card.id === cardId ? { ...card, front, back } : card) };
}

export function removeFlashcard(deck: FlashcardDeck, cardId: string): FlashcardDeck {
  const cards = deck.cards.filter((card) => card.id !== cardId);
  if (cards.length === deck.cards.length) return deck;
  if (!cards.length) throw new Error("A deck needs at least one flashcard");
  return { ...deck, cards };
}

export function shuffleFlashcards<T>(cards: T[], random: () => number = Math.random): T[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled;
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function flashcardMakerCsv(deck: FlashcardDeck): string {
  const rows = [["front", "back", "deck"], ...deck.cards.map((card) => [card.front, card.back, deck.title])];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function flashcardMakerTsv(deck: FlashcardDeck): string {
  const safeCell = (value: string) => {
    const flattened = value.replace(/[\t\r\n]+/g, " ");
    return /^[=+\-@]/.test(flattened) ? `'${flattened}` : flattened;
  };
  return deck.cards.map((card) => `${safeCell(card.front)}\t${safeCell(card.back)}`).join("\r\n");
}

export function flashcardDeckToText(deck: FlashcardDeck): string {
  return [deck.title, `${deck.cards.length} cards`, "", ...deck.cards.flatMap((card, index) => [`${index + 1}. ${card.front}`, `   ${card.back}`])].join("\n");
}

export function serializeFlashcardDeck(deck: FlashcardDeck): string {
  return JSON.stringify(deck, null, 2);
}

export function restoreFlashcardDeck(input: string): FlashcardDeck {
  if (input.length > FLASHCARD_MAKER_MAX_JSON_LENGTH) throw new Error("Flashcard file is too large");
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new Error("Flashcard file must be valid JSON");
  }
  if (!isRecord(value)) throw new Error("Flashcard file must contain an object");
  if (value.version !== FLASHCARD_MAKER_VERSION) throw new Error("Flashcard file version is not supported");
  if (typeof value.title !== "string" || typeof value.theme !== "string" || !THEMES.has(value.theme as FlashcardTheme) || !Array.isArray(value.cards)) {
    throw new Error("Flashcard settings are invalid");
  }
  return createFlashcardDeck({ title: value.title, theme: value.theme as FlashcardTheme, cards: value.cards as Flashcard[] });
}

export function buildFlashcardPrintSheets(cards: Flashcard[], perPage: 4 | 8): FlashcardPrintSheet[] {
  const sheets: FlashcardPrintSheet[] = [];
  for (let start = 0; start < cards.length; start += perPage) {
    const fronts: Array<Flashcard | null> = [...cards.slice(start, start + perPage)];
    while (fronts.length < perPage) fronts.push(null);
    const backs = [...fronts];
    for (let index = 0; index < backs.length; index += 2) {
      [backs[index], backs[index + 1]] = [backs[index + 1] ?? null, backs[index] ?? null];
    }
    sheets.push({ fronts, backs });
  }
  return sheets;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function shortened(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/g, " ");
  const characters = Array.from(normalized);
  return characters.length <= maximum ? normalized : `${characters.slice(0, maximum - 1).join("")}…`;
}

function svgLines(value: string, maximumCharacters: number, maximumLines: number): string[] {
  let remaining = shortened(value, maximumCharacters * maximumLines);
  const lines: string[] = [];
  while (remaining && lines.length < maximumLines) {
    const characters = Array.from(remaining);
    if (characters.length <= maximumCharacters) {
      lines.push(remaining);
      remaining = "";
      break;
    }
    const window = characters.slice(0, maximumCharacters + 1).join("");
    const lastSpace = window.lastIndexOf(" ");
    const cut = lastSpace >= Math.floor(maximumCharacters * 0.55) ? Array.from(window.slice(0, lastSpace)).length : maximumCharacters;
    lines.push(characters.slice(0, cut).join("").trim());
    remaining = characters.slice(cut).join("").trimStart();
  }
  if (remaining && lines.length === maximumLines) {
    const last = Array.from(lines.at(-1) ?? "");
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, maximumCharacters - 1)).join("")}…`;
  }
  return lines;
}

function svgTspans(lines: string[], x: number, startY: number, lineHeight: number): string {
  return lines.map((line, index) => `<tspan x="${x}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`).join("");
}

const SVG_THEMES: Record<FlashcardTheme, { background: string; card: string; accent: string; ink: string; muted: string }> = {
  matcha: { background: "#eef5ea", card: "#ffffff", accent: "#71906b", ink: "#27342a", muted: "#6d786f" },
  sakura: { background: "#fff0f4", card: "#ffffff", accent: "#d77f99", ink: "#472d37", muted: "#8a6875" },
  mikan: { background: "#fff4e4", card: "#ffffff", accent: "#e59446", ink: "#493522", muted: "#8c735d" },
  sora: { background: "#eaf6ff", card: "#ffffff", accent: "#5d9bc1", ink: "#233846", muted: "#657d8b" },
};

export function flashcardMakerSvg(deck: FlashcardDeck, cardId: string): string {
  const card = deck.cards.find((item) => item.id === cardId);
  if (!card) throw new Error("Flashcard was not found");
  const palette = SVG_THEMES[deck.theme];
  const front = svgTspans(svgLines(card.front, 24, 6), 370, 360, 58);
  const back = svgTspans(svgLines(card.back, 28, 6), 1030, 355, 52);
  const title = escapeXml(shortened(deck.title, 70));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800" viewBox="0 0 1400 800">
  <rect width="1400" height="800" rx="48" fill="${palette.background}"/>
  <circle cx="96" cy="92" r="16" fill="${palette.accent}" opacity=".65"/><circle cx="128" cy="76" r="8" fill="${palette.accent}" opacity=".35"/>
  <text x="90" y="110" fill="${palette.ink}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${title}</text>
  <g><rect x="70" y="160" width="600" height="550" rx="34" fill="${palette.card}" stroke="${palette.accent}" stroke-width="4"/><text x="114" y="222" fill="${palette.accent}" font-family="Arial, sans-serif" font-size="24" font-weight="700">FRONT</text><text text-anchor="middle" fill="${palette.ink}" font-family="Arial, sans-serif" font-size="42" font-weight="700">${front}</text></g>
  <g><rect x="730" y="160" width="600" height="550" rx="34" fill="${palette.card}" stroke="${palette.accent}" stroke-width="4"/><text x="774" y="222" fill="${palette.accent}" font-family="Arial, sans-serif" font-size="24" font-weight="700">BACK</text><text text-anchor="middle" fill="${palette.ink}" font-family="Arial, sans-serif" font-size="36">${back}</text></g>
  <text x="700" y="758" text-anchor="middle" fill="${palette.muted}" font-family="Arial, sans-serif" font-size="22">Meaw Tools · Flashcard Maker</text>
</svg>`;
}
