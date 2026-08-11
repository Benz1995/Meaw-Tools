import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_BLOCKING_SETTINGS,
  TIME_BLOCKING_TEMPLATES,
  buildTimeBlockingCsv,
  buildTimeBlockingIcs,
  buildTimeBlockingSummary,
  calculateTimeBlockingMetrics,
  createEmptyTimeBlockingState,
  findTimeBlockConflicts,
  findTimeBlockingGaps,
  formatTimeBlockingDuration,
  isTimeBlockingDateKey,
  minutesToTime,
  parseTimeBlockingStoredState,
  serializeTimeBlockingStoredState,
  shiftTimeBlock,
  suggestTimeBlockRange,
  timeToMinutes,
  upsertTimeBlock,
  type TimeBlock,
} from "./time-blocking";

const focus: TimeBlock = {
  id: "focus-1",
  title: "เขียน Landing page",
  startMinutes: 9 * 60,
  endMinutes: 11 * 60,
  category: "focus",
  notes: "ปิดการแจ้งเตือน",
  completed: false,
};

const lunch: TimeBlock = {
  id: "break-1",
  title: "พักกลางวัน",
  startMinutes: 12 * 60,
  endMinutes: 13 * 60,
  category: "break",
  notes: "",
  completed: true,
};

describe("time blocking engine", () => {
  it("parses valid dates and clock values without accepting normalized invalid dates", () => {
    expect(isTimeBlockingDateKey("2026-08-11")).toBe(true);
    expect(isTimeBlockingDateKey("2026-02-30")).toBe(false);
    expect(timeToMinutes("09:45")).toBe(585);
    expect(timeToMinutes("24:00")).toBeNull();
    expect(minutesToTime(585)).toBe("09:45");
    expect(formatTimeBlockingDuration(135)).toBe("2 ชม. 15 นาที");
  });

  it("inserts sorted blocks and rejects overlaps or blocks outside the day", () => {
    const withLunch = upsertTimeBlock([], lunch, DEFAULT_TIME_BLOCKING_SETTINGS);
    expect(upsertTimeBlock(withLunch, focus, DEFAULT_TIME_BLOCKING_SETTINGS).map((block) => block.id)).toEqual(["focus-1", "break-1"]);
    expect(findTimeBlockConflicts([focus], { startMinutes: 10 * 60, endMinutes: 12 * 60 })).toEqual([focus]);
    expect(() => upsertTimeBlock([focus], { ...lunch, startMinutes: 10 * 60 + 30 }, DEFAULT_TIME_BLOCKING_SETTINGS)).toThrow("ทับกับบล็อกอื่น");
    expect(() => upsertTimeBlock([], { ...focus, startMinutes: 5 * 60 }, DEFAULT_TIME_BLOCKING_SETTINGS)).toThrow("ภายในช่วงวันที่แสดง");
  });

  it("updates an existing block while ignoring itself during conflict checks", () => {
    const updated = upsertTimeBlock([focus, lunch], { ...focus, endMinutes: 10 * 60 + 30, completed: true }, DEFAULT_TIME_BLOCKING_SETTINGS);
    expect(updated[0]).toMatchObject({ id: "focus-1", endMinutes: 630, completed: true });
  });

  it("shifts blocks by the configured step but stops at collisions and day boundaries", () => {
    expect(shiftTimeBlock([focus, lunch], "focus-1", 30, DEFAULT_TIME_BLOCKING_SETTINGS)[0]).toMatchObject({ startMinutes: 570, endMinutes: 690 });
    expect(() => shiftTimeBlock([focus, { ...lunch, startMinutes: 11 * 60, endMinutes: 12 * 60 }], "focus-1", 30, DEFAULT_TIME_BLOCKING_SETTINGS)).toThrow("ทับกับบล็อกอื่น");
    expect(() => shiftTimeBlock([{ ...focus, startMinutes: 6 * 60, endMinutes: 8 * 60 }], "focus-1", -15, DEFAULT_TIME_BLOCKING_SETTINGS)).toThrow("เกินช่วงเวลาของวัน");
  });

  it("finds free gaps and suggests the first aligned range after an anchor", () => {
    expect(findTimeBlockingGaps([focus, lunch], DEFAULT_TIME_BLOCKING_SETTINGS)).toEqual([
      { startMinutes: 360, endMinutes: 540 },
      { startMinutes: 660, endMinutes: 720 },
      { startMinutes: 780, endMinutes: 1380 },
    ]);
    expect(suggestTimeBlockRange([focus, lunch], DEFAULT_TIME_BLOCKING_SETTINGS, 10 * 60, 45)).toEqual({ startMinutes: 660, endMinutes: 705 });
  });

  it("calculates planned, free, focus, break, completion, and longest-gap metrics", () => {
    const metrics = calculateTimeBlockingMetrics([focus, lunch], DEFAULT_TIME_BLOCKING_SETTINGS);
    expect(metrics).toMatchObject({ plannedMinutes: 180, freeMinutes: 840, focusMinutes: 120, breakMinutes: 60, completedMinutes: 60, completedBlocks: 1, completionPercent: 33, longestFreeMinutes: 600 });
  });

  it("sanitizes bounded local state, duplicate ids, overlaps, and invalid dates", () => {
    const stored = JSON.stringify({
      settings: { dayStartMinutes: 360, dayEndMinutes: 1380, snapMinutes: 30, dailyFocusGoalMinutes: 9999 },
      schedules: {
        "2026-08-11": [focus, { ...focus, title: "ซ้ำ" }, { ...lunch, title: "  พัก\nกลางวัน  " }, { ...lunch, id: "overlap", startMinutes: 10 * 60 }],
        "2026-02-30": [focus],
      },
    });
    const parsed = parseTimeBlockingStoredState(stored);
    expect(parsed.settings).toMatchObject({ snapMinutes: 30, dailyFocusGoalMinutes: 720 });
    expect(parsed.schedules["2026-08-11"]).toHaveLength(2);
    expect(parsed.schedules["2026-08-11"]?.[1]).toMatchObject({ title: "พัก กลางวัน" });
    expect(parsed.schedules["2026-02-30"]).toBeUndefined();
    expect(parseTimeBlockingStoredState("not-json")).toEqual(createEmptyTimeBlockingState());
  });

  it("round-trips normalized schedules", () => {
    const state = createEmptyTimeBlockingState();
    state.schedules["2026-08-11"] = [focus, lunch];
    expect(parseTimeBlockingStoredState(serializeTimeBlockingStoredState(state))).toEqual(state);
  });

  it("exports formula-safe UTF-8 CSV and floating-time ICS events", () => {
    const unsafe = { ...focus, title: "=HYPERLINK(\"bad\")", notes: "+SUM(1,1)" };
    const csv = buildTimeBlockingCsv("2026-08-11", [unsafe]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"\'+SUM(1,1)"');

    const ics = buildTimeBlockingIcs("2026-08-11", [focus], Date.UTC(2026, 7, 1));
    expect(ics).toContain("DTSTART:20260811T090000\r\n");
    expect(ics).toContain("DTEND:20260811T110000\r\n");
    expect(ics).toContain("SUMMARY:เขียน Landing page");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("provides useful templates and a readable daily summary", () => {
    expect(TIME_BLOCKING_TEMPLATES.balanced.blocks.length).toBeGreaterThanOrEqual(5);
    const summary = buildTimeBlockingSummary("2026-08-11", [focus, lunch], DEFAULT_TIME_BLOCKING_SETTINGS);
    expect(summary).toContain("09:00–11:00 เขียน Landing page");
    expect(summary).toContain("วางแผน 3 ชม.");
  });
});
