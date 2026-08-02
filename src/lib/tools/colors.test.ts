import { describe, expect, it } from "vitest";
import { contrastRatio, getContrastChecks, hexToRgb, mixHex, normalizeHex, rgbToHex, rgbToHsl } from "@/lib/tools/colors";

describe("color conversion", () => {
  it("normalizes short and long hex values", () => {
    expect(normalizeHex("#0f8")).toBe("#00FF88");
    expect(normalizeHex("0f9f8f")).toBe("#0F9F8F");
  });

  it("converts between hex, RGB, and HSL", () => {
    expect(hexToRgb("#FF0000")).toEqual({ red: 255, green: 0, blue: 0 });
    expect(rgbToHex(15, 159, 143)).toBe("#0F9F8F");
    expect(rgbToHsl({ red: 255, green: 0, blue: 0 })).toEqual({ hue: 0, saturation: 100, lightness: 50 });
  });

  it("creates predictable tints", () => {
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});

describe("WCAG contrast", () => {
  it("returns the maximum ratio for black and white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(getContrastChecks(21)).toEqual({ aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true });
  });

  it("distinguishes normal and large AA text", () => {
    expect(getContrastChecks(3.5)).toMatchObject({ aaNormal: false, aaLarge: true });
  });
});
