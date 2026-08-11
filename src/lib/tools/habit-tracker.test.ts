import { describe, expect, it } from "vitest";
import {
  HABIT_TRACKER_MAX_HABITS,
  buildHabitTrackerCsv,
  calculateHabitStats,
  createEmptyHabitTrackerState,
  habitDateRange,
  isHabitDateKey,
  isHabitScheduledOn,
  normalizeHabit,
  parseHabitTrackerStoredState,
  serializeHabitTrackerStoredState,
  shiftHabitDate,
  toggleHabitCheckin,
  type Habit,
} from "./habit-tracker";

const daily: Habit = {
  id: "read",
  title: "อ่านหนังสือ",
  color: "violet",
  frequency: "daily",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  createdDate: "2026-08-01",
};

describe("habit tracker engine", () => {
  it("validates and shifts calendar dates without accepting normalized invalid dates", () => {
    expect(isHabitDateKey("2026-08-11")).toBe(true);
    expect(isHabitDateKey("2026-02-30")).toBe(false);
    expect(shiftHabitDate("2026-08-01", -1)).toBe("2026-07-31");
    expect(habitDateRange("2026-08-03", 3)).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
  });

  it("normalizes recurrence presets and custom weekdays", () => {
    expect(normalizeHabit({ ...daily, frequency: "weekdays", weekdays: [0] })?.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeHabit({ ...daily, frequency: "custom", weekdays: [6, 2, 2, 99] })?.weekdays).toEqual([2, 6]);
    expect(normalizeHabit({ ...daily, title: "  อ่าน\nหนังสือ  " })?.title).toBe("อ่าน หนังสือ");
  });

  it("uses the selected weekday schedule and does not schedule before creation", () => {
    const weekdays = { ...daily, frequency: "weekdays" as const, weekdays: [1, 2, 3, 4, 5] };
    expect(isHabitScheduledOn(weekdays, "2026-08-10")).toBe(true);
    expect(isHabitScheduledOn(weekdays, "2026-08-09")).toBe(false);
    expect(isHabitScheduledOn(weekdays, "2026-07-31")).toBe(false);
  });

  it("toggles a scheduled check-in without mutating the previous state", () => {
    const state = { habits: [daily], checkins: {} };
    const checked = toggleHabitCheckin(state, daily.id, "2026-08-11");
    expect(checked.checkins["2026-08-11"]).toEqual([daily.id]);
    expect(state.checkins).toEqual({});
    expect(toggleHabitCheckin(checked, daily.id, "2026-08-11").checkins).toEqual({});
  });

  it("rejects check-ins on dates outside a habit schedule", () => {
    const weekdays = { ...daily, frequency: "weekdays" as const, weekdays: [1, 2, 3, 4, 5] };
    expect(() => toggleHabitCheckin({ habits: [weekdays], checkins: {} }, daily.id, "2026-08-09")).toThrow("ไม่ได้กำหนดไว้");
  });

  it("does not break a current streak before today's scheduled check-in is due", () => {
    const stats = calculateHabitStats(daily, {
      "2026-08-08": [daily.id],
      "2026-08-09": [daily.id],
      "2026-08-10": [daily.id],
    }, "2026-08-11");
    expect(stats.currentStreak).toBe(3);
    expect(stats.bestStreak).toBe(3);
  });

  it("counts today's completion and resets streak after a missed scheduled day", () => {
    const completed = calculateHabitStats(daily, {
      "2026-08-09": [daily.id],
      "2026-08-10": [daily.id],
      "2026-08-11": [daily.id],
    }, "2026-08-11");
    expect(completed.currentStreak).toBe(3);
    const missed = calculateHabitStats(daily, { "2026-08-09": [daily.id], "2026-08-11": [daily.id] }, "2026-08-11");
    expect(missed.currentStreak).toBe(1);
    expect(missed.bestStreak).toBe(1);
  });

  it("counts custom-schedule streaks across unscheduled gaps", () => {
    const custom = { ...daily, frequency: "custom" as const, weekdays: [1, 3, 5] };
    const stats = calculateHabitStats(custom, {
      "2026-08-05": [daily.id],
      "2026-08-07": [daily.id],
      "2026-08-10": [daily.id],
    }, "2026-08-11");
    expect(stats.currentStreak).toBe(3);
    expect(stats.scheduledDays).toBeGreaterThan(3);
  });

  it("calculates the 30-day completion rate and lifetime check-ins", () => {
    const stats = calculateHabitStats(daily, { "2026-08-09": [daily.id], "2026-08-10": [daily.id] }, "2026-08-11", 3);
    expect(stats).toMatchObject({ completedDays: 2, scheduledDays: 3, completionPercent: 67, totalCheckins: 2 });
  });

  it("sanitizes malformed, duplicate, unknown, invalid, and over-limit stored data", () => {
    const candidates = Array.from({ length: HABIT_TRACKER_MAX_HABITS + 3 }, (_, index) => ({ ...daily, id: `habit-${index}`, title: ` Habit ${index} ` }));
    candidates[1] = { ...daily, id: "habit-0", title: "Habit 0" };
    const parsed = parseHabitTrackerStoredState(JSON.stringify({
      habits: candidates,
      checkins: { "2026-08-11": ["habit-0", "habit-0", "unknown"], "2026-02-30": ["habit-0"], "2026-08-12": ["habit-0"] },
    }), "2026-08-11");
    expect(parsed.habits.length).toBeLessThanOrEqual(HABIT_TRACKER_MAX_HABITS);
    expect(new Set(parsed.habits.map((habit) => habit.id)).size).toBe(parsed.habits.length);
    expect(parsed.checkins).toEqual({ "2026-08-11": ["habit-0"] });
    expect(parseHabitTrackerStoredState("not-json")).toEqual(createEmptyHabitTrackerState());
  });

  it("drops imported check-ins outside a habit schedule and clamps future creation dates", () => {
    const parsed = parseHabitTrackerStoredState(JSON.stringify({
      habits: [{ ...daily, frequency: "weekdays", weekdays: [1, 2, 3, 4, 5], createdDate: "2099-01-01" }],
      checkins: { "2026-08-09": [daily.id], "2026-08-11": [daily.id] },
    }), "2026-08-11");
    expect(parsed.habits[0]?.createdDate).toBe("2026-08-11");
    expect(parsed.checkins).toEqual({ "2026-08-11": [daily.id] });
  });

  it("round-trips normalized state and creates a formula-safe UTF-8 CSV", () => {
    const unsafe = { ...daily, title: "=HYPERLINK(\"bad\")" };
    const state = { habits: [unsafe], checkins: { "2026-08-11": [unsafe.id] } };
    expect(parseHabitTrackerStoredState(serializeHabitTrackerStoredState(state))).toEqual(state);
    const csv = buildHabitTrackerCsv(state, "2026-08-11", 1);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Yes"');
  });
});
