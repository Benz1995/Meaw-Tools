import { describe, expect, it } from "vitest";
import {
  addDaysToDate,
  analyzeText,
  calculatePercentage,
  cleanText,
  convertUnit,
  differenceInCalendarDays,
} from "@/lib/tools/general";

describe("general tools", () => {
  it("counts words, lines and reading time", () => {
    const stats = analyzeText("DevThai Tools works well\nEvery day");
    expect(stats.words).toBe(6);
    expect(stats.lines).toBe(2);
    expect(stats.readingMinutes).toBe(1);
  });

  it("cleans whitespace, blank lines and duplicate lines", () => {
    expect(cleanText("  Alpha   one  \n\nAlpha one\n Beta ", {
      trimLines: true,
      collapseSpaces: true,
      removeEmptyLines: true,
      deduplicateLines: true,
    })).toBe("Alpha one\nBeta");
  });

  it("calculates common percentage modes", () => {
    expect(calculatePercentage("of", 15, 200)).toBe(30);
    expect(calculatePercentage("ratio", 25, 100)).toBe(25);
    expect(calculatePercentage("change", 80, 100)).toBe(25);
    expect(() => calculatePercentage("ratio", 1, 0)).toThrow(/ศูนย์/u);
  });

  it("converts metric, Thai area and temperature units", () => {
    expect(convertUnit("length", 1, "m", "cm")).toBe(100);
    expect(convertUnit("area", 1, "rai", "sqm")).toBe(1600);
    expect(convertUnit("temperature", 32, "f", "c")).toBeCloseTo(0);
  });

  it("calculates and adds calendar or business days", () => {
    expect(differenceInCalendarDays("2026-03-01", "2026-03-11")).toBe(10);
    expect(addDaysToDate("2026-08-07", 1, true)).toBe("2026-08-10");
    expect(addDaysToDate("2026-08-10", -3)).toBe("2026-08-07");
  });
});
