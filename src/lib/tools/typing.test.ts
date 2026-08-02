import { describe, expect, it } from "vitest";
import {
  calculateTypingMetrics,
  compareTyping,
  getTypingPassages,
  splitGraphemes,
  truncateToGraphemes,
} from "@/lib/tools/typing";

describe("typing helpers", () => {
  it("segments Thai combining marks as grapheme clusters", () => {
    const graphemes = splitGraphemes("เก่ง", "th");
    expect(graphemes.join("")).toBe("เก่ง");
    expect(graphemes.length).toBeLessThan(Array.from("เก่ง").length);
  });

  it("compares correct, incorrect, and pending characters", () => {
    const comparison = compareTyping("hello world", "hello xorld", "en");
    expect(comparison).toMatchObject({
      correctCharacters: 10,
      incorrectCharacters: 1,
      pendingCharacters: 0,
      targetCharacters: 11,
      typedCharacters: 11,
      completed: true,
    });
  });

  it("calculates net WPM, CPM, accuracy, and progress", () => {
    const metrics = calculateTypingMetrics("hello world", "hello xorld", 60_000, "en");
    expect(metrics.wpm).toBe(2);
    expect(metrics.cpm).toBe(10);
    expect(metrics.accuracy).toBe(90.9);
    expect(metrics.progress).toBe(100);
    expect(metrics.elapsedSeconds).toBe(60);
  });

  it("truncates by grapheme count and exposes passages for both languages", () => {
    expect(truncateToGraphemes("เก่งมาก", 2, "th")).toBe(splitGraphemes("เก่งมาก", "th").slice(0, 2).join(""));
    expect(getTypingPassages("th").length).toBeGreaterThanOrEqual(3);
    expect(getTypingPassages("en").length).toBeGreaterThanOrEqual(3);
    expect(getTypingPassages("th")[0]?.text).not.toBe(getTypingPassages("en")[0]?.text);
  });
});
