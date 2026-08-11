import { describe, expect, it } from "vitest";
import {
  BINGO_MAX_CARDS,
  BINGO_MAX_JSON_LENGTH,
  bingoCardToText,
  bingoGameToCsv,
  bingoRequiredItemCount,
  createBingoGame,
  drawNextBingoCall,
  hasBingo,
  parseBingoItems,
  resetBingoCalls,
  resetBingoMarks,
  restoreBingoGame,
  serializeBingoGame,
  toggleBingoMark,
  undoLastBingoCall,
  type CreateBingoGameInput,
} from "./bingo-card";

const WORDS = Array.from({ length: 40 }, (_, index) => `คำที่ ${index + 1}`).join(
  "\n",
);

function customInput(
  overrides: Partial<CreateBingoGameInput> = {},
): CreateBingoGameInput {
  return {
    title: "กิจกรรมบิงโก",
    mode: "custom",
    size: 5,
    freeCenter: true,
    freeLabel: "FREE",
    cardCount: 8,
    cardsPerPage: 2,
    seed: "meaw-class-a",
    theme: "matcha",
    itemsText: WORDS,
    ...overrides,
  };
}

describe("bingo card engine", () => {
  it("calculates the required custom item count for each grid", () => {
    expect(bingoRequiredItemCount(3, true)).toBe(8);
    expect(bingoRequiredItemCount(4, true)).toBe(16);
    expect(bingoRequiredItemCount(5, false)).toBe(25);
    expect(bingoRequiredItemCount(5, true)).toBe(24);
  });

  it("normalizes duplicate custom items while preserving first spelling", () => {
    const parsed = parseBingoItems("Matcha\nชาไทย\n matcha \nＭＡＴＣＨＡ\nชาไทย", 2);
    expect(parsed.items).toEqual(["Matcha", "ชาไทย"]);
    expect(parsed.duplicateItems).toEqual(["matcha", "ＭＡＴＣＨＡ", "ชาไทย"]);
  });

  it("creates deterministic unique custom cards with a free center", () => {
    const first = createBingoGame(customInput()).state;
    const second = createBingoGame(customInput()).state;
    expect(first.cards).toEqual(second.cards);
    expect(new Set(first.cards.map((card) => card.cells.map((cell) => cell.key).join("|"))).size).toBe(8);
    expect(first.cards.every((card) => card.cells[12]?.isFree)).toBe(true);
    expect(first.cards.every((card) => card.cells.length === 25)).toBe(true);
    expect(first.callOrder).toHaveLength(40);
  });

  it("turns off the free center for an even grid", () => {
    const state = createBingoGame(
      customInput({ size: 4, freeCenter: true, cardCount: 2 }),
    ).state;
    expect(state.freeCenter).toBe(false);
    expect(state.cards.every((card) => card.cells.every((cell) => !cell.isFree))).toBe(true);
  });

  it("requires enough unique custom items for the chosen grid", () => {
    expect(() =>
      createBingoGame(customInput({ itemsText: "หนึ่ง\nสอง", size: 3 })),
    ).toThrow("อย่างน้อย 8 รายการ");
  });

  it("creates standard 75-ball cards with correct BINGO column ranges", () => {
    const state = createBingoGame(
      customInput({
        mode: "classic75",
        size: 3,
        freeCenter: false,
        itemsText: "",
        cardCount: 12,
      }),
    ).state;
    expect(state.size).toBe(5);
    expect(state.freeCenter).toBe(true);
    expect(state.callOrder).toHaveLength(75);
    expect(new Set(state.callOrder.map((call) => call.key)).size).toBe(75);
    for (const card of state.cards) {
      for (const cell of card.cells) {
        if (cell.isFree) continue;
        const number = Number(cell.value);
        expect(number).toBeGreaterThanOrEqual(cell.column * 15 + 1);
        expect(number).toBeLessThanOrEqual((cell.column + 1) * 15);
      }
    }
  });

  it("draws, undoes, and resets caller history without duplicates", () => {
    const initial = createBingoGame(customInput()).state;
    const first = drawNextBingoCall(initial);
    const second = drawNextBingoCall(first);
    expect(second.calledKeys).toEqual([
      initial.callOrder[0]?.key,
      initial.callOrder[1]?.key,
    ]);
    expect(undoLastBingoCall(second).calledKeys).toEqual(first.calledKeys);
    expect(resetBingoCalls(second).calledKeys).toEqual([]);
  });

  it("detects completed rows, columns, and diagonals", () => {
    const state = createBingoGame(customInput({ size: 3, cardCount: 1 })).state;
    const card = state.cards[0]!;
    const firstRow = card.cells
      .filter((cell) => cell.row === 0)
      .map((cell) => cell.key);
    expect(hasBingo(card, 3, firstRow.slice(0, 2))).toBe(false);
    expect(hasBingo(card, 3, firstRow)).toBe(true);

    const diagonal = card.cells
      .filter((cell) => cell.row === cell.column && !cell.isFree)
      .map((cell) => cell.key);
    expect(hasBingo(card, 3, diagonal)).toBe(true);
  });

  it("toggles and resets marks only for valid non-free cells", () => {
    const initial = createBingoGame(customInput({ size: 3, cardCount: 1 })).state;
    const card = initial.cards[0]!;
    const target = card.cells.find((cell) => !cell.isFree)!;
    const marked = toggleBingoMark(initial, card.id, target.key);
    expect(marked.marks[card.id]).toEqual([target.key]);
    expect(toggleBingoMark(marked, card.id, target.key).marks[card.id]).toEqual([]);
    expect(toggleBingoMark(initial, card.id, "free")).toBe(initial);
    expect(resetBingoMarks(marked, card.id).marks[card.id]).toBeUndefined();
  });

  it("exports a BOM CSV and neutralizes spreadsheet formulas", () => {
    const items = [`=2+2`, `+SUM(A1:A2)`, `-1`, `@cmd`, ...Array.from({ length: 30 }, (_, index) => `safe ${index}`)].join("\n");
    const state = createBingoGame(customInput({ itemsText: items, cardCount: 20 })).state;
    const csv = bingoGameToCsv(state);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Card","Row","Column","Column Label","Value","Free"');
    expect(csv).toMatch(/"'=2\+2"|"'\+SUM\(A1:A2\)"|"'-1"|"'@cmd"/);
  });

  it("creates a readable text representation", () => {
    const state = createBingoGame(customInput({ cardCount: 1 })).state;
    const text = bingoCardToText(state, state.cards[0]!);
    expect(text).toContain("กิจกรรมบิงโก");
    expect(text).toContain("Card #1");
    expect(text).toContain("B\tI\tN\tG\tO");
  });

  it("restores a canonical game with valid caller history and marks", () => {
    let state = createBingoGame(customInput({ cardCount: 3 })).state;
    state = drawNextBingoCall(state);
    const card = state.cards[0]!;
    state = toggleBingoMark(
      state,
      card.id,
      card.cells.find((cell) => !cell.isFree)!.key,
    );
    expect(restoreBingoGame(serializeBingoGame(state))).toEqual(state);
  });

  it("rejects unknown versions and tampered call or mark keys", () => {
    const state = createBingoGame(customInput({ cardCount: 1 })).state;
    expect(() =>
      restoreBingoGame(JSON.stringify({ ...state, version: 2 })),
    ).toThrow("คนละเวอร์ชัน");
    expect(() =>
      restoreBingoGame(JSON.stringify({ ...state, calledKeys: ["unknown"] })),
    ).toThrow("ประวัติคำเรียก");
    expect(() =>
      restoreBingoGame(
        JSON.stringify({ ...state, marks: { "card-1": ["unknown"] } }),
      ),
    ).toThrow("ช่องที่ทำเครื่องหมาย");
  });

  it("generates the maximum card count with unique layouts", () => {
    const state = createBingoGame(
      customInput({ cardCount: BINGO_MAX_CARDS }),
    ).state;
    expect(state.cards).toHaveLength(BINGO_MAX_CARDS);
    expect(
      new Set(
        state.cards.map((card) => card.cells.map((cell) => cell.key).join("|")),
      ).size,
    ).toBe(BINGO_MAX_CARDS);
  });

  it("keeps the maximum custom game within the validated JSON import limit", () => {
    const itemsText = Array.from(
      { length: 500 },
      (_, index) => `item-${String(index).padStart(3, "0")}-${"x".repeat(70)}`,
    ).join("\n");
    const state = createBingoGame(
      customInput({ cardCount: BINGO_MAX_CARDS, itemsText }),
    ).state;
    const json = serializeBingoGame(state);

    expect(json.length).toBeLessThanOrEqual(BINGO_MAX_JSON_LENGTH);
    expect(restoreBingoGame(json)).toEqual(state);
  });
});
