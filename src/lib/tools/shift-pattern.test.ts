import { describe, expect, it } from "vitest";
import {
  SHIFT_PATTERN_MAX_DAYS,
  SHIFT_PATTERN_PRESETS,
  calculateShiftPattern,
  parseShiftPattern,
  shiftPatternCsv,
  shiftPatternIcs,
  type ShiftPatternInput,
} from "@/lib/tools/shift-pattern";

const fourOnFour = SHIFT_PATTERN_PRESETS.find((preset) => preset.id === "four-on-four-off")!;
const baseInput: ShiftPatternInput = {
  startDate: "2026-08-01",
  endDate: "2026-08-10",
  startCycleDay: 1,
  pattern: fourOnFour.pattern,
  definitions: fourOnFour.definitions,
};

describe("shift pattern calculator", () => {
  it("expands a repeating 4-on-4-off cycle and totals net hours", () => {
    const result = calculateShiftPattern(baseInput);
    expect(result).toMatchObject({ calendarDays: 10, workingDays: 6, offDays: 4, cycleLength: 8, netMinutes: 3_960 });
    expect(result.days.map((day) => day.code)).toEqual(["D", "D", "D", "D", "OFF", "OFF", "OFF", "OFF", "D", "D"]);
    expect(result.shifts).toEqual([{ code: "D", label: "กะกลางวัน", count: 6, netMinutes: 3_960 }]);
  });

  it("aligns the calendar from any day inside the cycle", () => {
    const result = calculateShiftPattern({ ...baseInput, endDate: "2026-08-04", startCycleDay: 5 });
    expect(result.days.map((day) => day.code)).toEqual(["OFF", "OFF", "OFF", "OFF"]);
  });

  it("handles day and overnight shifts without local timezone arithmetic", () => {
    const preset = SHIFT_PATTERN_PRESETS.find((item) => item.id === "two-day-two-night-four-off")!;
    const result = calculateShiftPattern({ ...baseInput, endDate: "2026-08-04", pattern: preset.pattern, definitions: preset.definitions });
    expect(result).toMatchObject({ workingDays: 4, overnightShifts: 2, netMinutes: 2_640, breakMinutes: 240 });
    expect(result.days[2]).toMatchObject({ code: "N", isOvernight: true, startTime: "20:00", endTime: "08:00", netMinutes: 660 });
  });

  it("parses flexible separators and Thai off-day aliases", () => {
    expect(parseShiftPattern("d, D | n; หยุด\nO REST")).toEqual(["D", "D", "N", "OFF", "OFF", "OFF"]);
  });

  it("summarizes partial months independently", () => {
    const result = calculateShiftPattern({ ...baseInput, startDate: "2026-01-30", endDate: "2026-02-03" });
    expect(result.months).toEqual([
      { month: "2026-01", days: 2, workingDays: 2, offDays: 0, netMinutes: 1_320 },
      { month: "2026-02", days: 3, workingDays: 2, offDays: 1, netMinutes: 1_320 },
    ]);
  });

  it("rejects unknown shifts, duplicate codes, bad breaks, and excessive ranges", () => {
    expect(() => calculateShiftPattern({ ...baseInput, pattern: ["D", "X"] })).toThrow("ไม่พบประเภทกะรหัส X");
    expect(() => calculateShiftPattern({ ...baseInput, definitions: [...baseInput.definitions, { ...baseInput.definitions[0]!, label: "ซ้ำ" }] })).toThrow("รหัสกะ D ซ้ำ");
    expect(() => calculateShiftPattern({ ...baseInput, definitions: [{ ...baseInput.definitions[0]!, breakMinutes: 720 }] })).toThrow("น้อยกว่าระยะเวลากะ");
    expect(() => calculateShiftPattern({ ...baseInput, endDate: "2027-08-02" })).toThrow(`ไม่เกิน ${SHIFT_PATTERN_MAX_DAYS} วัน`);
  });

  it("protects spreadsheet formulas in CSV exports", () => {
    const result = calculateShiftPattern({ ...baseInput, endDate: "2026-08-01", definitions: [{ ...baseInput.definitions[0]!, label: "=HYPERLINK(1)" }] });
    const csv = shiftPatternCsv(result);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("11.00");
  });

  it("exports RFC 5545-style floating events and advances overnight end dates", () => {
    const preset = SHIFT_PATTERN_PRESETS.find((item) => item.id === "two-day-two-night-four-off")!;
    const result = calculateShiftPattern({ ...baseInput, startDate: "2026-08-03", endDate: "2026-08-06", startCycleDay: 2, pattern: preset.pattern, definitions: preset.definitions });
    const ics = shiftPatternIcs(result, true, new Date("2026-08-01T00:00:00Z"));
    expect(ics).toContain("DTSTAMP:20260801T000000Z");
    expect(ics).toContain("DTSTART:20260804T200000");
    expect(ics).toContain("DTEND:20260805T080000");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260806");
    expect(ics).toContain("DTEND;VALUE=DATE:20260807");
    expect(ics).toContain("SUMMARY:N · กะกลางคืน");
    expect(ics.endsWith("\r\n")).toBe(true);
  });
});
