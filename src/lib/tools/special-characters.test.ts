import { describe, expect, it } from "vitest";
import {
  applyFancyStyle,
  countFancyTextCharacters,
  createDecoratedText,
  createFancyTextStyles,
  searchSymbolGroups,
  symbolGroups,
  truncateFancyText,
} from "@/lib/tools/special-characters";

describe("special character helpers", () => {
  it("maps ASCII letters and digits while preserving Thai and emoji", () => {
    expect(applyFancyStyle("Ab9 ไทย 🐈", "bold")).toBe("𝐀𝐛𝟗 ไทย 🐈");
    expect(applyFancyStyle("Ah", "italic")).toBe("𝐴ℎ");
    expect(applyFancyStyle("Ab9", "circled")).toBe("Ⓐⓑ⑨");
  });

  it("creates all supported styles without changing the source", () => {
    const source = "Meaw 2026";
    const results = createFancyTextStyles(source);
    expect(results).toHaveLength(9);
    expect(results.map((result) => result.id)).toEqual(expect.arrayContaining(["monospace", "fullwidth", "circled"]));
    expect(source).toBe("Meaw 2026");
  });

  it("decorates Thai text and truncates very long input", () => {
    expect(createDecoratedText("เหมียว").map((item) => item.value)).toContain("♡ เหมียว ♡");
    expect(Array.from(truncateFancyText("a".repeat(250)))).toHaveLength(200);
    const thaiAtBoundary = `${"ก".repeat(199)}ก่ข`;
    expect(truncateFancyText(thaiAtBoundary)).toBe(`${"ก".repeat(199)}ก่`);
    expect(countFancyTextCharacters("ก่")).toBe(1);
  });

  it("searches symbol groups by Thai keywords and literal symbols", () => {
    const hearts = searchSymbolGroups("หัวใจ");
    expect(hearts).toHaveLength(1);
    expect(hearts[0]?.id).toBe("hearts");
    expect(hearts[0]?.symbols).toContain("♡");

    const roman = searchSymbolGroups("Ⅰ");
    expect(roman.some((group) => group.id === "numbers" && group.symbols.includes("Ⅰ"))).toBe(true);
    expect(searchSymbolGroups("ไม่พบแน่นอน")).toEqual([]);
  });

  it("keeps category ids and symbols unique for stable rendering", () => {
    expect(new Set(symbolGroups.map((group) => group.id)).size).toBe(symbolGroups.length);
    for (const group of symbolGroups) {
      expect(new Set(group.symbols).size).toBe(group.symbols.length);
    }
  });
});
