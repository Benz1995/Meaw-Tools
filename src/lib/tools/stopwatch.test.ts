import { describe, expect, it } from "vitest";
import {
  STOPWATCH_MAX_LAPS,
  STOPWATCH_MAX_MS,
  buildStopwatchCsv,
  buildStopwatchSummary,
  calculateStopwatchStats,
  createStopwatchState,
  formatStopwatchTime,
  getStopwatchElapsedMs,
  normalizeStopwatchState,
  parseStopwatchState,
  pauseStopwatch,
  recordStopwatchLap,
  resetStopwatch,
  serializeStopwatchState,
  startStopwatch,
} from "./stopwatch";

describe("stopwatch engine", () => {
  it("calculates elapsed time from an absolute timestamp instead of timer ticks", () => {
    const running = startStopwatch(createStopwatchState(1_000), 2_000);
    expect(getStopwatchElapsedMs(running, 3_234)).toBe(1_234);
    expect(getStopwatchElapsedMs(running, 1_500)).toBe(0);
  });

  it("pauses and resumes without losing accumulated time", () => {
    const firstRun = startStopwatch(createStopwatchState(0), 1_000);
    const paused = pauseStopwatch(firstRun, 3_500);
    expect(paused).toMatchObject({ status: "paused", accumulatedMs: 2_500, startedAtMs: null });
    const resumed = startStopwatch(paused, 10_000);
    expect(getStopwatchElapsedMs(resumed, 10_750)).toBe(3_250);
  });

  it("records cumulative and split lap times", () => {
    let state = startStopwatch(createStopwatchState(0), 1_000);
    state = recordStopwatchLap(state, "lap-a", 2_250);
    state = recordStopwatchLap(state, "lap-b", 4_000);
    expect(state.laps).toEqual([
      { id: "lap-a", totalMs: 1_250, splitMs: 1_250, recordedAtMs: 2_250 },
      { id: "lap-b", totalMs: 3_000, splitMs: 1_750, recordedAtMs: 4_000 },
    ]);
  });

  it("does not record laps while paused, duplicate zero-time laps, or more than the limit", () => {
    const paused = { ...createStopwatchState(0), status: "paused" as const };
    expect(recordStopwatchLap(paused, "ignored", 1_000)).toBe(paused);
    const laps = Array.from({ length: STOPWATCH_MAX_LAPS }, (_, index) => ({ id: String(index), totalMs: index + 1, splitMs: 1, recordedAtMs: index + 1 }));
    const full = { ...startStopwatch(createStopwatchState(0), 0), laps };
    expect(recordStopwatchLap(full, "overflow", 1_000).laps).toHaveLength(STOPWATCH_MAX_LAPS);
  });

  it("calculates fastest, slowest, average, and latest split", () => {
    const stats = calculateStopwatchStats([
      { id: "a", totalMs: 1_000, splitMs: 1_000, recordedAtMs: 1 },
      { id: "b", totalMs: 3_500, splitMs: 2_500, recordedAtMs: 2 },
      { id: "c", totalMs: 5_000, splitMs: 1_500, recordedAtMs: 3 },
    ]);
    expect(stats).toEqual({ count: 3, fastestMs: 1_000, slowestMs: 2_500, averageMs: 5_000 / 3, latestMs: 1_500 });
  });

  it("formats hundredths for the clock and milliseconds for export", () => {
    expect(formatStopwatchTime(3_723_456)).toBe("01:02:03.45");
    expect(formatStopwatchTime(3_723_456, true)).toBe("01:02:03.456");
    expect(formatStopwatchTime(-10)).toBe("00:00:00.00");
  });

  it("sanitizes stored state, recomputes splits, and removes duplicate or impossible laps", () => {
    const state = normalizeStopwatchState({
      status: "running",
      accumulatedMs: 1_000,
      startedAtMs: 8_000,
      sessionName: "  วิ่ง\nรอบสนาม  ",
      laps: [
        { id: "a", totalMs: 1_500, splitMs: 999, recordedAtMs: 8_500 },
        { id: "a", totalMs: 1_600, splitMs: 100, recordedAtMs: 8_600 },
        { id: "back", totalMs: 1_000, splitMs: -500, recordedAtMs: 8_700 },
        { id: "future", totalMs: 4_000, splitMs: 2_500, recordedAtMs: 20_000 },
      ],
      updatedAtMs: 9_000,
    }, 10_000);
    expect(state.sessionName).toBe("วิ่ง รอบสนาม");
    expect(state.laps).toEqual([{ id: "a", totalMs: 1_500, splitMs: 1_500, recordedAtMs: 8_500 }]);
  });

  it("fails closed for malformed or oversized persisted data", () => {
    expect(parseStopwatchState("not-json", 100)).toEqual(createStopwatchState(100));
    expect(parseStopwatchState(JSON.stringify({ status: "bad", accumulatedMs: -1 }), 100)).toMatchObject({ status: "idle", accumulatedMs: 0 });
  });

  it("pauses safely when a restored stopwatch reaches the maximum", () => {
    const state = normalizeStopwatchState({ status: "running", accumulatedMs: STOPWATCH_MAX_MS, startedAtMs: 1 }, 10);
    expect(state).toMatchObject({ status: "paused", accumulatedMs: STOPWATCH_MAX_MS, startedAtMs: null });
  });

  it("resets elapsed time and laps while preserving the session name", () => {
    const state = { ...createStopwatchState(0), status: "paused" as const, accumulatedMs: 500, sessionName: "ซ้อมวิ่ง", laps: [{ id: "a", totalMs: 500, splitMs: 500, recordedAtMs: 500 }] };
    expect(resetStopwatch(state, 1_000)).toEqual({ ...createStopwatchState(1_000), sessionName: "ซ้อมวิ่ง" });
  });

  it("round-trips normalized state", () => {
    const state = { ...createStopwatchState(100), status: "paused" as const, accumulatedMs: 2_000, sessionName: "ประชุม" };
    expect(parseStopwatchState(serializeStopwatchState(state), 100)).toEqual(state);
  });

  it("exports formula-safe UTF-8 CSV and a useful summary", () => {
    const state = {
      ...createStopwatchState(2_000),
      status: "paused" as const,
      accumulatedMs: 1_500,
      sessionName: "=HYPERLINK(\"bad\")",
      laps: [{ id: "a", totalMs: 1_500, splitMs: 1_500, recordedAtMs: 2_000 }],
    };
    const csv = buildStopwatchCsv(state);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("00:00:01.500");
    expect(buildStopwatchSummary(state, 3_000)).toContain("จำนวนรอบ: 1");
  });
});
