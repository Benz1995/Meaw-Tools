import { describe, expect, it } from "vitest";
import { calculateAge, fitRectangle } from "@/lib/tools/popular";

describe("popular tool logic", () => {
  it("calculates calendar age and next birthday", () => {
    expect(calculateAge("2000-01-15", "2026-08-02")).toEqual({
      years: 26,
      months: 6,
      days: 18,
      totalDays: 9696,
      nextBirthday: "2027-01-15",
      daysUntilBirthday: 166,
    });
  });

  it("handles a leap-day birthday without producing an invalid date", () => {
    const result = calculateAge("2000-02-29", "2026-02-28");
    expect(result.years).toBe(26);
    expect(result.nextBirthday).toBe("2026-02-28");
    expect(result.daysUntilBirthday).toBe(0);
  });

  it("rejects a birth date in the future", () => {
    expect(() => calculateAge("2027-01-01", "2026-08-02")).toThrow("วันเกิดต้องไม่อยู่หลังวันที่คำนวณ");
  });

  it("fits a landscape image inside a portrait page and centers it", () => {
    expect(fitRectangle(1600, 900, 600, 800, 30)).toEqual({ width: 540, height: 303.75, x: 30, y: 248.125 });
  });

  it("rejects a margin that leaves no printable area", () => {
    expect(() => fitRectangle(100, 100, 200, 200, 100)).toThrow("ระยะขอบไม่ถูกต้อง");
  });
});
