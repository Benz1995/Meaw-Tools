import { describe, expect, it } from "vitest";
import { wrapShapedText, type ShapedFont } from "@/lib/tools/pdf-thai";

const monospaceFont = {
  pdf: null,
  engine: {
    unitsPerEm: 1,
    layout: (text: string) => ({
      glyphs: Array.from(text, (character) => ({ codePoints: [character.codePointAt(0)!] })),
      positions: Array.from(text, () => ({ xAdvance: 1, yAdvance: 0, xOffset: 0, yOffset: 0 })),
    }),
  },
} as unknown as ShapedFont;

describe("Thai PDF text wrapping", () => {
  it("keeps English words intact when they fit on the next line", () => {
    expect(wrapShapedText(monospaceFont, "alpha beta gamma", 1, 10, 4)).toEqual(["alpha beta", "gamma"]);
  });

  it("splits a single oversized token and marks truncated content", () => {
    expect(wrapShapedText(monospaceFont, "abcdefghijkl", 1, 5, 4)).toEqual(["abcde", "fghij", "kl"]);
    expect(wrapShapedText(monospaceFont, "alpha beta gamma", 1, 8, 1)).toEqual(["alpha..."]);
  });
});
