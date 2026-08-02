import { describe, expect, it, vi } from "vitest";
import {
  convertEraYear,
  convertEraYears,
  getNextWheelRotation,
  parseEraYears,
  parseWheelEntries,
  pickWheelWinner,
} from "@/lib/tools/everyday";

describe("random wheel logic", () => {
  it("normalizes whitespace and removes duplicate entries without changing order", () => {
    expect(parseWheelEntries("  มะลิ  \nสมชาย\nมะลิ\nสม   หญิง ")).toEqual([
      "มะลิ",
      "สมชาย",
      "สม หญิง",
    ]);
  });

  it("can preserve duplicates when they are intentional weights", () => {
    expect(parseWheelEntries(["แดง", "แดง", "น้ำเงิน"].join("\n"), false)).toEqual([
      "แดง",
      "แดง",
      "น้ำเงิน",
    ]);
  });

  it("selects a winner through an injected secure-random source", () => {
    const randomInt = vi.fn(() => 2);
    expect(pickWheelWinner(["A", "B", "C"], randomInt)).toEqual({ index: 2, value: "C" });
    expect(randomInt).toHaveBeenCalledWith(3);
  });

  it("aligns the selected segment center with the pointer after forward turns", () => {
    const rotation = getNextWheelRotation(23, 1, 4, 5);
    expect(rotation).toBeGreaterThanOrEqual(23 + 5 * 360);
    expect(((rotation % 360) + 360) % 360).toBeCloseTo(225, 8);
  });

  it("rejects fewer than two wheel entries", () => {
    expect(() => parseWheelEntries("รายการเดียว")).toThrow("อย่างน้อย 2 รายการ");
  });
});

describe("Buddhist Era and Common Era conversion", () => {
  it("converts modern Thai Buddhist and Gregorian years in both directions", () => {
    expect(convertEraYear(2569, "be-to-ce")).toBe(2026);
    expect(convertEraYear(2026, "ce-to-be")).toBe(2569);
  });

  it("parses spaces, commas, semicolons, and new lines for bulk conversion", () => {
    expect(parseEraYears("2569, 2568;2567\n2566")).toEqual([2569, 2568, 2567, 2566]);
  });

  it("converts a bulk list while retaining each source year", () => {
    expect(convertEraYears("2569 2568", "be-to-ce")).toEqual([
      { source: 2569, converted: 2026 },
      { source: 2568, converted: 2025 },
    ]);
  });

  it("rejects a Buddhist Era year that would produce a non-positive Gregorian year", () => {
    expect(() => convertEraYear(543, "be-to-ce")).toThrow("พ.ศ. ต้องอยู่ระหว่าง");
  });

  it("rejects non-numeric bulk tokens", () => {
    expect(() => parseEraYears("2569 สองพันห้าร้อย")).toThrow("ไม่ใช่ปีที่เป็นจำนวนเต็ม");
  });
});
