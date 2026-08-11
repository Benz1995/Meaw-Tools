import { describe, expect, it } from "vitest";
import {
  DEFAULT_POMODORO_SETTINGS,
  createEmptyPomodoroState,
  getPomodoroTransition,
  localDateKey,
  parsePomodoroStoredState,
  pomodoroClockParts,
  pomodoroDurationSeconds,
  pomodoroRemainingMs,
  pomodoroTaskProgress,
  serializePomodoroStoredState,
  updatePomodoroStats,
} from "./pomodoro";

describe("pomodoro engine", () => {
  it("uses classic focus, short-break, and long-break durations", () => {
    expect(pomodoroDurationSeconds("focus", DEFAULT_POMODORO_SETTINGS)).toBe(1_500);
    expect(pomodoroDurationSeconds("short-break", DEFAULT_POMODORO_SETTINGS)).toBe(300);
    expect(pomodoroDurationSeconds("long-break", DEFAULT_POMODORO_SETTINGS)).toBe(900);
  });

  it("moves to a long break after the configured number of completed focus sessions", () => {
    expect(getPomodoroTransition("focus", 0, DEFAULT_POMODORO_SETTINGS)).toMatchObject({ nextMode: "short-break", nextCycleFocusCount: 1, completedFocus: true });
    expect(getPomodoroTransition("short-break", 1, DEFAULT_POMODORO_SETTINGS)).toMatchObject({ nextMode: "focus", nextCycleFocusCount: 1 });
    expect(getPomodoroTransition("focus", 3, DEFAULT_POMODORO_SETTINGS)).toMatchObject({ nextMode: "long-break", nextCycleFocusCount: 4 });
    expect(getPomodoroTransition("long-break", 4, DEFAULT_POMODORO_SETTINGS)).toMatchObject({ nextMode: "focus", nextCycleFocusCount: 0 });
  });

  it("does not credit a manually skipped focus session", () => {
    expect(getPomodoroTransition("focus", 2, DEFAULT_POMODORO_SETTINGS, false)).toMatchObject({ nextMode: "short-break", nextCycleFocusCount: 2, completedFocus: false });
  });

  it("derives remaining time from the deadline and formats clocks over one hour", () => {
    expect(pomodoroRemainingMs(10_000, 99_000, 4_500)).toBe(5_500);
    expect(pomodoroRemainingMs(1_000, 99_000, 2_000)).toBe(0);
    expect(pomodoroClockParts(3_661_000)).toEqual({ minutes: 61, seconds: 1, text: "61:01" });
  });

  it("rolls daily statistics at local midnight", () => {
    const dayOne = new Date(2026, 7, 11, 12).getTime();
    const dayTwo = new Date(2026, 7, 12, 12).getTime();
    const first = updatePomodoroStats({ date: localDateKey(dayOne), completedFocusSessions: 2, focusMinutes: 50 }, 25, dayOne);
    expect(first).toMatchObject({ completedFocusSessions: 3, focusMinutes: 75 });
    expect(updatePomodoroStats(first, 50, dayTwo)).toEqual({ date: localDateKey(dayTwo), completedFocusSessions: 1, focusMinutes: 50 });
  });

  it("sanitizes bounded local storage and discards stale daily statistics", () => {
    const now = new Date(2026, 7, 11, 12).getTime();
    const stored = JSON.stringify({
      settings: { focusMinutes: 999, shortBreakMinutes: 0, soundEnabled: false },
      tasks: [{ id: "a", title: "  เขียน\nบทความ  ", estimate: 99, completedSessions: -1, done: false }, null],
      stats: { date: "2026-08-10", completedFocusSessions: 9, focusMinutes: 225 },
    });
    const parsed = parsePomodoroStoredState(stored, now);
    expect(parsed.settings).toMatchObject({ focusMinutes: 120, shortBreakMinutes: 1, soundEnabled: false });
    expect(parsed.tasks).toEqual([{ id: "a", title: "เขียน บทความ", estimate: 12, completedSessions: 0, done: false }]);
    expect(parsed.stats).toEqual({ date: localDateKey(now), completedFocusSessions: 0, focusMinutes: 0 });
    expect(parsePomodoroStoredState("not-json", now)).toEqual(createEmptyPomodoroState(now));
  });

  it("round-trips normalized state and calculates task progress", () => {
    const now = Date.now();
    const state = createEmptyPomodoroState(now);
    state.tasks = [{ id: "task-1", title: "ออกแบบหน้าเว็บ", estimate: 4, completedSessions: 2, done: false }];
    expect(parsePomodoroStoredState(serializePomodoroStoredState(state), now)).toEqual(state);
    expect(pomodoroTaskProgress(state.tasks[0]!)).toBe(50);
    expect(pomodoroTaskProgress({ ...state.tasks[0]!, done: true })).toBe(100);
  });
});
