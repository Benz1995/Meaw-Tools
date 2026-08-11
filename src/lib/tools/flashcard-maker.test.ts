import { describe, expect, it } from "vitest";
import {
  FLASHCARD_MAKER_MAX_CARDS,
  addFlashcard,
  buildFlashcardPrintSheets,
  createFlashcardDeck,
  flashcardMakerCsv,
  flashcardMakerSvg,
  flashcardMakerTsv,
  parseFlashcardCsv,
  parseFlashcardText,
  removeFlashcard,
  restoreFlashcardDeck,
  serializeFlashcardDeck,
  shuffleFlashcards,
  updateFlashcard,
  type FlashcardDeck,
} from "./flashcard-maker";

function sampleDeck(): FlashcardDeck {
  return createFlashcardDeck({
    title: "Japanese basics",
    theme: "sakura",
    cards: parseFlashcardText("猫\tแมว\n犬 | สุนัข\n水 | น้ำ").cards,
  });
}

describe("flashcard maker engine", () => {
  it("parses tab and pipe pairs while removing normalized duplicates", () => {
    const result = parseFlashcardText("Cat\tแมว\nDog | สุนัข\n cat | แมว ");
    expect(result.cards).toHaveLength(2);
    expect(result.cards[1]).toMatchObject({ front: "Dog", back: "สุนัข" });
    expect(result.duplicateCount).toBe(1);
  });

  it("reports incomplete rows and enforces the card limit", () => {
    expect(() => parseFlashcardText("front only")).toThrow("Row 1");
    const rows = Array.from({ length: FLASHCARD_MAKER_MAX_CARDS + 1 }, (_, index) => `Q${index}\tA${index}`).join("\n");
    expect(() => parseFlashcardText(rows)).toThrow(`at most ${FLASHCARD_MAKER_MAX_CARDS}`);
  });

  it("imports quoted CSV by English or Thai headers", () => {
    const english = parseFlashcardCsv('\uFEFF"question","answer"\r\n"What, exactly?","A ""quoted"" answer"');
    expect(english.cards[0]).toMatchObject({ front: "What, exactly?", back: 'A "quoted" answer' });
    const thai = parseFlashcardCsv("คำศัพท์,ความหมาย\nแมว,cat");
    expect(thai.cards[0]).toMatchObject({ front: "แมว", back: "cat" });
  });

  it("supports headerless CSV and rejects malformed rows", () => {
    expect(parseFlashcardCsv("one,หนึ่ง\ntwo,สอง").cards).toHaveLength(2);
    expect(() => parseFlashcardCsv("front,back\nonly-one-column")).toThrow("needs front and back");
    expect(() => parseFlashcardCsv('front,back\n"open,answer')).toThrow("unclosed");
  });

  it("creates, adds, edits, and removes cards with duplicate protection", () => {
    let deck = sampleDeck();
    deck = addFlashcard(deck, { front: "Fire", back: "ไฟ" });
    expect(deck.cards.at(-1)?.id).toBe("card-4");
    deck = updateFlashcard(deck, "card-4", { front: "Fire", back: "เปลวไฟ" });
    expect(deck.cards.at(-1)?.back).toBe("เปลวไฟ");
    expect(() => addFlashcard(deck, { front: "猫", back: "แมว" })).toThrow("already exists");
    expect(() => updateFlashcard(deck, "card-4", { front: "猫", back: "แมว" })).toThrow("already exists");
    expect(removeFlashcard(deck, "card-4").cards).toHaveLength(3);
    const oneCard = createFlashcardDeck({ title: "One", theme: "sora", cards: [{ id: "card-1", front: "Q", back: "A" }] });
    expect(() => removeFlashcard(oneCard, "card-1")).toThrow("at least one");
  });

  it("shuffles without mutating the source", () => {
    const source = [1, 2, 3, 4];
    expect(shuffleFlashcards(source, () => 0)).toEqual([2, 3, 4, 1]);
    expect(source).toEqual([1, 2, 3, 4]);
  });

  it("exports formula-safe UTF-8 CSV", () => {
    const deck = createFlashcardDeck({ title: "=Class", theme: "matcha", cards: [{ id: "card-1", front: "+SUM(1,1)", back: "@answer" }] });
    const csv = flashcardMakerCsv(deck);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'+SUM(1,1)"');
    expect(csv).toContain('"\'@answer"');
    expect(csv).toContain('"\'=Class"');
    expect(flashcardMakerTsv(deck)).toBe("'+SUM(1,1)\t'@answer");
  });

  it("round-trips versioned JSON and rejects unsafe structures", () => {
    const deck = sampleDeck();
    expect(restoreFlashcardDeck(serializeFlashcardDeck(deck))).toEqual(deck);
    expect(() => restoreFlashcardDeck("{")).toThrow("valid JSON");
    expect(() => restoreFlashcardDeck(JSON.stringify({ ...deck, version: 2 }))).toThrow("not supported");
    expect(() => restoreFlashcardDeck(JSON.stringify({ ...deck, cards: [...deck.cards, deck.cards[0]] }))).toThrow("IDs must be unique");
  });

  it("mirrors back columns for duplex printing and pads the final sheet", () => {
    const sheets = buildFlashcardPrintSheets(sampleDeck().cards, 4);
    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.fronts.map((card) => card?.id ?? null)).toEqual(["card-1", "card-2", "card-3", null]);
    expect(sheets[0]?.backs.map((card) => card?.id ?? null)).toEqual(["card-2", "card-1", null, "card-3"]);
  });

  it("escapes text in the downloadable SVG", () => {
    const deck = createFlashcardDeck({ title: "Deck <A>", theme: "sora", cards: [{ id: "card-1", front: "Q & <test>", back: 'A "ok"' }] });
    const svg = flashcardMakerSvg(deck, "card-1");
    expect(svg).toContain("Deck &lt;A&gt;");
    expect(svg).toContain("Q &amp; &lt;test&gt;");
    expect(svg).toContain("#5d9bc1");
    expect(svg).toContain('width="1400"');
  });
});
