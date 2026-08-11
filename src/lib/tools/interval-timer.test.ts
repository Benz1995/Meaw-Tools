import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERVAL_SETTINGS,
  INTERVAL_TIMER_MAX_SAVED_PROGRAMS,
  advanceIntervalRuntime,
  buildIntervalPlan,
  buildIntervalShareUrl,
  createIntervalRuntime,
  formatIntervalTime,
  intervalPlanDurationSeconds,
  normalizeIntervalSettings,
  parseIntervalShareParams,
  parseIntervalTimerStore,
  pauseIntervalRuntime,
  serializeIntervalTimerStore,
  skipIntervalPhase,
  startIntervalRuntime,
} from "./interval-timer";

describe("interval timer engine", () => {
  it("builds prepare, repeated work/rest, cycle rest, and cooldown without a trailing rest", () => {
    const settings = { ...DEFAULT_INTERVAL_SETTINGS, prepareSeconds: 5, workSeconds: 10, restSeconds: 3, rounds: 2, cycles: 2, cycleRestSeconds: 7, cooldownSeconds: 4 };
    const phases = buildIntervalPlan(settings);
    expect(phases.map((phase) => phase.kind)).toEqual(["prepare", "work", "rest", "work", "cycle-rest", "work", "rest", "work", "cooldown"]);
    expect(phases[1]).toMatchObject({ round: 1, cycle: 1 });
    expect(phases[7]).toMatchObject({ round: 2, cycle: 2 });
    expect(intervalPlanDurationSeconds(phases)).toBe(62);
  });

  it("uses absolute deadlines and catches up across several background phases", () => {
    const phases = buildIntervalPlan({ ...DEFAULT_INTERVAL_SETTINGS, prepareSeconds: 1, workSeconds: 2, restSeconds: 1, rounds: 2, cooldownSeconds: 1 });
    let runtime = startIntervalRuntime(createIntervalRuntime(phases), phases, 1_000);
    expect(runtime).toMatchObject({ status: "running", phaseIndex: 0, deadlineMs: 2_000 });
    runtime = advanceIntervalRuntime(runtime, phases, 5_500);
    expect(runtime).toMatchObject({ status: "running", phaseIndex: 3, deadlineMs: 7_000, remainingMs: 1_500 });
    runtime = advanceIntervalRuntime(runtime, phases, 8_000);
    expect(runtime).toMatchObject({ status: "finished", phaseIndex: phases.length, deadlineMs: null, remainingMs: 0 });
  });

  it("pauses, resumes, and skips without losing the remaining duration", () => {
    const phases = buildIntervalPlan({ ...DEFAULT_INTERVAL_SETTINGS, prepareSeconds: 0, workSeconds: 20, restSeconds: 10, rounds: 2, cooldownSeconds: 0 });
    const running = startIntervalRuntime(createIntervalRuntime(phases), phases, 1_000);
    const paused = pauseIntervalRuntime(running, 6_000);
    expect(paused).toMatchObject({ status: "paused", remainingMs: 15_000, deadlineMs: null });
    const resumed = startIntervalRuntime(paused, phases, 20_000);
    expect(resumed.deadlineMs).toBe(35_000);
    expect(skipIntervalPhase(resumed, phases, 21_000)).toMatchObject({ status: "running", phaseIndex: 1, deadlineMs: 31_000, remainingMs: 10_000 });
  });

  it("normalizes untrusted values into supported limits", () => {
    expect(normalizeIntervalSettings({ name: "  HIIT\nsecret  ", prepareSeconds: -9, workSeconds: 0, restSeconds: 9_999, rounds: 500, cycles: -2, cooldownSeconds: "bad", soundEnabled: "yes" })).toEqual({
      ...DEFAULT_INTERVAL_SETTINGS,
      name: "HIIT secret",
      prepareSeconds: 0,
      workSeconds: 1,
      restSeconds: 3_600,
      rounds: 99,
      cycles: 1,
    });
  });

  it("shares a bounded configuration and ignores unrelated URLs", () => {
    const settings = { ...DEFAULT_INTERVAL_SETTINGS, name: "Boxing ฝึกเช้า", workSeconds: 180, restSeconds: 60, rounds: 3, soundEnabled: false };
    const url = buildIntervalShareUrl(settings, "https://meaw-tools.vercel.app/interval-timer?old=1#bad");
    expect(url).not.toContain("old=1");
    expect(url).not.toContain("#bad");
    expect(parseIntervalShareParams(new URL(url).search)).toEqual(settings);
    expect(parseIntervalShareParams("?utm_source=test")).toBeNull();
  });

  it("fails closed for malformed storage, deduplicates IDs, and caps saved programs", () => {
    expect(parseIntervalTimerStore("not-json").savedPrograms).toEqual([]);
    const savedPrograms = Array.from({ length: INTERVAL_TIMER_MAX_SAVED_PROGRAMS + 3 }, (_, index) => ({ id: index < 2 ? "same" : `p-${index}`, settings: { ...DEFAULT_INTERVAL_SETTINGS, name: `Program ${index}` }, savedAtMs: 999 }));
    const parsed = parseIntervalTimerStore(JSON.stringify({ settings: { workSeconds: 40 }, savedPrograms }), 500);
    expect(parsed.settings.workSeconds).toBe(40);
    expect(parsed.savedPrograms).toHaveLength(INTERVAL_TIMER_MAX_SAVED_PROGRAMS - 1);
    expect(parsed.savedPrograms[0]?.savedAtMs).toBe(500);
    expect(parseIntervalTimerStore(serializeIntervalTimerStore(parsed, 500), 500)).toEqual(parsed);
  });

  it("formats short and long timer values", () => {
    expect(formatIntervalTime(61_001)).toBe("01:02");
    expect(formatIntervalTime(3_661_000)).toBe("01:01:01");
    expect(formatIntervalTime(-1)).toBe("00:00");
  });
});
