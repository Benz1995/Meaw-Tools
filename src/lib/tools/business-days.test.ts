import { describe, expect, it } from "vitest";
import {
  BOT_HOLIDAY_RULESET,
  buildHolidayMap,
  businessDaysCsv,
  calculateBusinessDaysRange,
  getPresetHolidays,
  parseCustomHolidays,
  shiftBusinessDate,
} from "@/lib/tools/business-days";

const standardWeek = [1, 2, 3, 4, 5];

describe("business days calculator", () => {
  it("versions the official BOT 2026 national and Bangkok presets", () => {
    expect(BOT_HOLIDAY_RULESET).toMatchObject({ year: 2026, buddhistYear: 2569, updatedAt: "2026-06-09" });
    expect(getPresetHolidays("bot-2026-national")).toHaveLength(19);
    expect(getPresetHolidays("bot-2026-bangkok")).toHaveLength(20);
    expect(getPresetHolidays("bot-2026-bangkok")).toContainEqual(expect.objectContaining({ date: "2026-10-16" }));
  });

  it("parses, validates, sorts, and deduplicates custom holidays", () => {
    expect(parseCustomHolidays("2026-04-20, ปิดบริษัท\n2026-04-18\n2026-04-20, วันหยุดใหม่")).toEqual([
      { date: "2026-04-18", name: "วันหยุดกำหนดเอง", source: "custom" },
      { date: "2026-04-20", name: "วันหยุดใหม่", source: "custom" },
    ]);
    expect(() => parseCustomHolidays("2026-02-30, ไม่มีวันนี้")).toThrow("ไม่ถูกต้อง");
    expect(() => parseCustomHolidays("20/04/2026")).toThrow("YYYY-MM-DD");
  });

  it("lets custom entries override preset holiday names", () => {
    expect(buildHolidayMap("bot-2026-national", "2026-01-01, ปิดสำนักงาน").get("2026-01-01")).toEqual({
      date: "2026-01-01",
      name: "ปิดสำนักงาน",
      source: "custom",
    });
  });

  it("counts an inclusive month with weekends and BOT holidays separately", () => {
    const result = calculateBusinessDaysRange({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      includeStart: true,
      includeEnd: true,
      workingWeekdays: standardWeek,
      preset: "bot-2026-national",
      customHolidays: "",
    });
    expect(result).toMatchObject({ calendarDays: 31, workingDays: 20, weeklyDaysOff: 9, holidaysExcluded: 2, holidaysOnWeeklyDaysOff: 0 });
    expect(result.months).toEqual([{ month: "2026-01", calendarDays: 31, workingDays: 20, weeklyDaysOff: 9, holidaysExcluded: 2 }]);
  });

  it("applies endpoint policies explicitly", () => {
    const base = { startDate: "2026-01-05", endDate: "2026-01-05", workingWeekdays: standardWeek, preset: "none" as const, customHolidays: "" };
    expect(calculateBusinessDaysRange({ ...base, includeStart: true, includeEnd: true }).workingDays).toBe(1);
    expect(calculateBusinessDaysRange({ ...base, includeStart: false, includeEnd: true })).toMatchObject({ calendarDays: 0, startDate: "2026-01-05", endDate: "2026-01-05" });
    expect(calculateBusinessDaysRange({ ...base, includeStart: true, includeEnd: false })).toMatchObject({ calendarDays: 0, startDate: "2026-01-05", endDate: "2026-01-05" });
  });

  it("does not subtract a holiday twice when it falls on a weekly day off", () => {
    const result = calculateBusinessDaysRange({
      startDate: "2026-01-03",
      endDate: "2026-01-03",
      includeStart: true,
      includeEnd: true,
      workingWeekdays: standardWeek,
      preset: "none",
      customHolidays: "2026-01-03, ปิดบริษัท",
    });
    expect(result).toMatchObject({ workingDays: 0, weeklyDaysOff: 1, holidaysExcluded: 0, holidaysOnWeeklyDaysOff: 1 });
  });

  it("supports non-standard workweeks", () => {
    const result = calculateBusinessDaysRange({
      startDate: "2026-01-04",
      endDate: "2026-01-10",
      includeStart: true,
      includeEnd: true,
      workingWeekdays: [0, 1, 2, 3, 4],
      preset: "none",
      customHolidays: "",
    });
    expect(result).toMatchObject({ calendarDays: 7, workingDays: 5, weeklyDaysOff: 2 });
  });

  it("adds business days across Songkran and weekends", () => {
    const result = shiftBusinessDate({
      startDate: "2026-04-10",
      businessDays: 10,
      direction: "add",
      workingWeekdays: standardWeek,
      preset: "bot-2026-national",
      customHolidays: "",
    });
    expect(result).toMatchObject({ endDate: "2026-04-29", workingDays: 10, weeklyDaysOff: 6, holidaysExcluded: 3, calendarDays: 19 });
  });

  it("subtracts business days across consecutive official holidays", () => {
    const result = shiftBusinessDate({
      startDate: "2026-07-30",
      businessDays: 2,
      direction: "subtract",
      workingWeekdays: standardWeek,
      preset: "bot-2026-national",
      customHolidays: "",
    });
    expect(result).toMatchObject({ endDate: "2026-07-24", workingDays: 2, weeklyDaysOff: 2, holidaysExcluded: 2 });
  });

  it("protects spreadsheet formulas in CSV exports", () => {
    const records = calculateBusinessDaysRange({
      startDate: "2026-01-05",
      endDate: "2026-01-05",
      includeStart: true,
      includeEnd: true,
      workingWeekdays: standardWeek,
      preset: "none",
      customHolidays: "2026-01-05, =HYPERLINK(1)",
    }).records;
    expect(businessDaysCsv(records)).toContain("'=HYPERLINK(1)");
  });

  it("rejects reversed and excessive ranges", () => {
    const base = { includeStart: true, includeEnd: true, workingWeekdays: standardWeek, preset: "none" as const, customHolidays: "" };
    expect(() => calculateBusinessDaysRange({ ...base, startDate: "2026-02-01", endDate: "2026-01-01" })).toThrow("ไม่อยู่ก่อน");
    expect(() => calculateBusinessDaysRange({ ...base, startDate: "2020-01-01", endDate: "2031-01-01" })).toThrow("3,660");
  });
});
