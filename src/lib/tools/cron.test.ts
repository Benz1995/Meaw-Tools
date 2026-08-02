import { describe, expect, it } from "vitest";
import { describeCronThai, nextCronRuns, validateCron } from "@/lib/tools/cron";

describe("Cron tools", () => {
  it("validates fields and bounds", () => {
    expect(validateCron("0 8 * * 1-5")).toBe(true);
    expect(validateCron("99 8 * * *")).toBe(false);
    expect(validateCron("0 8 * *")).toBe(false);
  });
  it("calculates weekday runs", () => {
    const runs = nextCronRuns("0 8 * * 1-5", new Date("2026-08-01T00:00:00"), 2);
    expect(runs).toHaveLength(2);
    expect(runs.every((run) => run.getHours() === 8 && run.getMinutes() === 0)).toBe(true);
  });
  it("explains the common weekday schedule in Thai", () => {
    expect(describeCronThai("0 8 * * 1-5")).toContain("จันทร์ถึงศุกร์");
  });
});
