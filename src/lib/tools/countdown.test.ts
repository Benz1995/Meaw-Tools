import { describe, expect, it, vi } from "vitest";
import {
  buildCountdownEventIcs,
  buildCountdownShareUrl,
  countdownFilename,
  durationToSeconds,
  getCountdownParts,
  parseCountdownShareParams,
} from "./countdown";

describe("countdown tool", () => {
  it("derives remaining units from the deadline instead of decrementing state", () => {
    const now = Date.UTC(2026, 7, 11, 0, 0, 0);
    expect(getCountdownParts(now + 2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5_000, now)).toEqual({
      totalMs: 183_845_000,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      finished: false,
    });
    expect(getCountdownParts(now - 1, now).finished).toBe(true);
  });

  it("validates duration fields", () => {
    expect(durationToSeconds(1, 2, 3)).toBe(3_723);
    expect(() => durationToSeconds(0, 0, 0)).toThrow("มากกว่า 0");
    expect(() => durationToSeconds(1, 60, 0)).toThrow("0–999");
  });

  it("round-trips event and duration share URLs with bounded text", () => {
    const eventUrl = buildCountdownShareUrl("https://meaw-tools.vercel.app/tools", {
      mode: "event",
      title: " เปิดตัวโปรเจกต์\nMeaw ",
      theme: "sakura",
      completionMessage: "ถึงเวลาแล้ว!",
      targetMs: 1_800_000_000_000,
    });
    expect(parseCountdownShareParams(new URL(eventUrl).searchParams)).toEqual({
      mode: "event",
      title: "เปิดตัวโปรเจกต์ Meaw",
      theme: "sakura",
      completionMessage: "ถึงเวลาแล้ว!",
      targetMs: 1_800_000_000_000,
    });

    const durationUrl = buildCountdownShareUrl("https://meaw-tools.vercel.app", {
      mode: "duration",
      title: "พักเบรก",
      theme: "night",
      completionMessage: "กลับมาเริ่มงาน",
      durationSeconds: 900,
    });
    expect(parseCountdownShareParams(new URL(durationUrl).search)).toMatchObject({ mode: "duration", durationSeconds: 900 });
    expect(parseCountdownShareParams("?mode=duration&duration=0")).toBeNull();
  });

  it("creates a UTC calendar event and safely escapes content", () => {
    vi.setSystemTime(new Date("2026-08-11T00:00:00.000Z"));
    const ics = buildCountdownEventIcs({
      title: "Launch, Meaw; Tools",
      targetMs: Date.parse("2026-09-01T02:30:00.000Z"),
      completionMessage: "เปิดตัว, พร้อมกัน",
    });
    expect(ics).toContain("DTSTART:20260901T023000Z");
    expect(ics).toContain("DTEND:20260901T030000Z");
    expect(ics).toContain("SUMMARY:Launch\\, Meaw\\; Tools");
    expect(ics).toContain("DESCRIPTION:เปิดตัว\\, พร้อมกัน");
  });

  it("produces a filesystem-safe calendar filename", () => {
    expect(countdownFilename('เปิดตัว: "Meaw Tools"')).toBe("เปิดตัว-meaw-tools.ics");
    expect(countdownFilename("   ")).toBe("countdown-event.ics");
  });
});
