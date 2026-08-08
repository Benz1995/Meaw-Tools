import { describe, expect, it } from "vitest";
import {
  WORKING_HOURS_MAX_ENTRIES,
  calculateWorkingHours,
  formatDecimalHours,
  formatDuration,
  parseClockTime,
  roundMinutes,
  workingHoursCsv,
  type WorkingHoursEntry,
} from "@/lib/tools/working-hours";

const entry = (overrides: Partial<WorkingHoursEntry> = {}): WorkingHoursEntry => ({
  id: "shift-1",
  date: "2026-08-03",
  label: "สำนักงาน",
  startTime: "09:00",
  endTime: "17:30",
  breakMinutes: 60,
  ...overrides,
});

describe("working hours calculator", () => {
  it("subtracts an unpaid break from a daytime shift", () => {
    expect(calculateWorkingHours({ entries: [entry()], roundingMinutes: 0 })).toMatchObject({
      grossMinutes: 510,
      breakMinutes: 60,
      netMinutes: 450,
      roundedNetMinutes: 450,
      shiftCount: 1,
      dateCount: 1,
      overnightCount: 0,
    });
  });

  it("handles an overnight shift without relying on local time zones", () => {
    const result = calculateWorkingHours({ entries: [entry({ startTime: "22:00", endTime: "06:30", breakMinutes: 30 })], roundingMinutes: 0 });
    expect(result.rows[0]).toMatchObject({ grossMinutes: 510, netMinutes: 480, isOvernight: true });
    expect(result.overnightCount).toBe(1);
  });

  it("supports split shifts on the same date", () => {
    const result = calculateWorkingHours({
      entries: [entry({ endTime: "12:00", breakMinutes: 0 }), entry({ id: "shift-2", startTime: "13:00", endTime: "18:00", breakMinutes: 0 })],
      roundingMinutes: 0,
    });
    expect(result).toMatchObject({ netMinutes: 480, shiftCount: 2, dateCount: 1, averageMinutes: 240 });
  });

  it("rounds each shift net duration to the selected increment", () => {
    const result = calculateWorkingHours({ entries: [entry({ startTime: "08:58", endTime: "18:04" })], roundingMinutes: 15 });
    expect(result.rows[0]).toMatchObject({ netMinutes: 486, roundedNetMinutes: 480, roundingDeltaMinutes: -6 });
    expect(roundMinutes(483, 6)).toBe(486);
  });

  it("compares the rounded total with an optional target", () => {
    const result = calculateWorkingHours({ entries: [entry()], roundingMinutes: 0, targetMinutes: 480 });
    expect(result.targetDifferenceMinutes).toBe(-30);
  });

  it("formats clock, duration, and decimal representations", () => {
    expect(parseClockTime("23:59")).toBe(1_439);
    expect(formatDuration(2_286)).toBe("38 ชม. 6 นาที");
    expect(formatDuration(-30)).toBe("−30 นาที");
    expect(formatDecimalHours(2_286)).toBe("38.10");
  });

  it("rejects ambiguous, impossible, and excessive entries", () => {
    expect(() => calculateWorkingHours({ entries: [entry({ endTime: "09:00" })], roundingMinutes: 0 })).toThrow("ต้องไม่เท่ากัน");
    expect(() => calculateWorkingHours({ entries: [entry({ endTime: "09:30", breakMinutes: 30 })], roundingMinutes: 0 })).toThrow("ต้องน้อยกว่า");
    expect(() => calculateWorkingHours({ entries: [entry({ date: "2026-02-30" })], roundingMinutes: 0 })).toThrow("วันที่ที่ถูกต้อง");
    expect(() => calculateWorkingHours({ entries: Array.from({ length: WORKING_HOURS_MAX_ENTRIES + 1 }, (_, index) => entry({ id: String(index) })), roundingMinutes: 0 })).toThrow("ไม่เกิน 62");
  });

  it("protects spreadsheet formulas in CSV labels", () => {
    const result = calculateWorkingHours({ entries: [entry({ label: "=HYPERLINK(1)" })], roundingMinutes: 0 });
    const csv = workingHoursCsv(result);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("7.50");
  });
});
