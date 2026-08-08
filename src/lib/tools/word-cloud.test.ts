import { describe, expect, it } from "vitest";
import {
  analyzeWordCloudText,
  buildWordCloudSvg,
  layoutWordCloud,
  parseWeightedWordList,
  wordCloudFrequencyCsv,
  type WordCloudAnalysisOptions,
} from "@/lib/tools/word-cloud";

const defaultOptions: WordCloudAnalysisOptions = {
  excludeCommonWords: true,
  excludeNumbers: true,
  customStopWords: "",
  minimumWordLength: 1,
  minimumFrequency: 1,
  maximumWords: 50,
};

describe("word cloud analysis", () => {
  it("segments Thai text, counts repeats, and removes common words", () => {
    const result = analyzeWordCloudText("แมวรักกาแฟ แมวสร้างเครื่องมือ และแมวช่วยคนทำงาน", defaultOptions);

    expect(result.words[0]).toEqual({ text: "แมว", count: 3 });
    expect(result.words.some((word) => word.text === "และ")).toBe(false);
    expect(result.totalTokens).toBeGreaterThan(3);
    expect(result.uniqueWords).toBe(result.words.length);
  });

  it("normalizes English case and can filter numbers, custom words, length, and frequency", () => {
    const result = analyzeWordCloudText("Cat cat CAT dog dog fox 2026 project project", {
      ...defaultOptions,
      customStopWords: "dog",
      minimumWordLength: 3,
      minimumFrequency: 2,
    });

    expect(result.words).toEqual([
      { text: "cat", count: 3 },
      { text: "project", count: 2 },
    ]);
    expect(result.filteredWords).toBe(1);
  });

  it("rejects empty, oversized, and over-filtered input", () => {
    expect(() => analyzeWordCloudText("", defaultOptions)).toThrow("กรุณาวางข้อความ");
    expect(() => analyzeWordCloudText("ก".repeat(100_001), defaultOptions)).toThrow("100,000");
    expect(() => analyzeWordCloudText("และ ที่ ของ", defaultOptions)).toThrow("ไม่พบคำ");
    expect(() => analyzeWordCloudText("แมว หมา", { ...defaultOptions, minimumFrequency: 2 })).toThrow("ความถี่ขั้นต่ำ");
  });

  it("parses phrases and optional weights while combining duplicates", () => {
    const result = parseWeightedWordList("Meaw Tools,5\nกาแฟญี่ปุ่น = 3\nMeaw Tools,2\nคนรักแมว", 20);

    expect(result.words).toEqual([
      { text: "Meaw Tools", count: 7 },
      { text: "กาแฟญี่ปุ่น", count: 3 },
      { text: "คนรักแมว", count: 1 },
    ]);
    expect(result.totalTokens).toBe(11);
    expect(result.uniqueWords).toBe(3);
  });
});

describe("word cloud layout and exports", () => {
  const words = [
    { text: "แมว", count: 20 },
    { text: "เครื่องมือ", count: 16 },
    { text: "ภาษาไทย", count: 12 },
    { text: "กาแฟ", count: 10 },
    { text: "ทำงาน", count: 8 },
    { text: "ออนไลน์", count: 6 },
  ];

  it("creates a deterministic collision-free layout inside the canvas", () => {
    const options = { width: 1_000, height: 600, rotation: "mixed" as const, palette: "cafe" as const, seed: 42 };
    const first = layoutWordCloud(words, options);
    const second = layoutWordCloud(words, options);

    expect(first).toEqual(second);
    expect(first.words.length).toBe(words.length);
    for (const [index, word] of first.words.entries()) {
      expect(word.x - word.width / 2).toBeGreaterThanOrEqual(0);
      expect(word.y - word.height / 2).toBeGreaterThanOrEqual(0);
      expect(word.x + word.width / 2).toBeLessThanOrEqual(first.width);
      expect(word.y + word.height / 2).toBeLessThanOrEqual(first.height);
      for (const other of first.words.slice(index + 1)) {
        const separated = word.x + word.width / 2 <= other.x - other.width / 2
          || word.x - word.width / 2 >= other.x + other.width / 2
          || word.y + word.height / 2 <= other.y - other.height / 2
          || word.y - word.height / 2 >= other.y + other.height / 2;
        expect(separated).toBe(true);
      }
    }
  });

  it("scales dense 100-word input instead of letting high counts consume the canvas", () => {
    const denseWords = Array.from({ length: 100 }, (_, index) => ({ text: `keyword${index}`, count: 100 - index }));
    const layout = layoutWordCloud(denseWords, { width: 1_000, height: 600, rotation: "mixed", palette: "cafe", seed: 36 });

    expect(layout.words.length).toBeGreaterThanOrEqual(40);
    expect(layout.omittedWords).toBeLessThanOrEqual(60);
    expect(Math.min(...layout.words.map((word) => word.fontSize))).toBeGreaterThanOrEqual(12);
  });

  it("escapes user text in SVG and creates safe CSV", () => {
    const layout = layoutWordCloud([{ text: "<script>&cat", count: 3 }], {
      width: 1_000,
      height: 600,
      rotation: "horizontal",
      palette: "ocean",
      seed: 7,
    });
    const svg = buildWordCloudSvg(layout, "#ffffff");
    const csv = wordCloudFrequencyCsv([{ text: 'แมว "ส้ม"', count: 3 }, { text: "=HYPERLINK(\"https://example.com\")", count: 1 }]);

    expect(svg).toContain("&lt;script&gt;&amp;cat");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain('<rect width="1000" height="600" fill="#ffffff"/>');
    expect(csv).toBe('\uFEFFword,frequency\r\n"แมว ""ส้ม""",3\r\n"\'=HYPERLINK(""https://example.com"")",1');
  });
});
