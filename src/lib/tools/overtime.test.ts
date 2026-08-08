import { describe, expect, it } from "vitest";
import { calculateOvertime } from "@/lib/tools/overtime";

describe("calculateOvertime", () => {
  it("calculates monthly wages with 1.5x, entitled holiday pay, and 3x overtime", () => {
    const result = calculateOvertime({
      wageType: "monthly",
      wageAmount: 30_000,
      normalHoursPerDay: 8,
      workdayOvertimeHours: 10,
      holidayRegularHours: 8,
      holidayOvertimeHours: 4,
      holidayPayEntitlement: "entitled",
    });

    expect(result.hourlyWage).toBe(125);
    expect(result.workdayOvertimeRate).toBe(187.5);
    expect(result.holidayRegularRate).toBe(125);
    expect(result.holidayOvertimeRate).toBe(375);
    expect(result.workdayOvertimePay).toBe(1_875);
    expect(result.holidayRegularPay).toBe(1_000);
    expect(result.holidayOvertimePay).toBe(1_500);
    expect(result.totalAdditionalPay).toBe(4_375);
    expect(result.estimatedMonthlyGross).toBe(34_375);
  });

  it("uses 2x for normal holiday hours when holiday pay is not already included", () => {
    const result = calculateOvertime({
      wageType: "daily",
      wageAmount: 800,
      normalHoursPerDay: 8,
      workdayOvertimeHours: 0,
      holidayRegularHours: 8,
      holidayOvertimeHours: 0,
      holidayPayEntitlement: "not-entitled",
    });

    expect(result.hourlyWage).toBe(100);
    expect(result.holidayRegularPay).toBe(1_600);
    expect(result.totalAdditionalPay).toBe(1_600);
    expect(result.estimatedMonthlyGross).toBeNull();
  });

  it("uses the entered hourly wage without dividing it again", () => {
    const result = calculateOvertime({
      wageType: "hourly",
      wageAmount: 120,
      normalHoursPerDay: 8,
      workdayOvertimeHours: 2.5,
      holidayRegularHours: 0,
      holidayOvertimeHours: 1,
      holidayPayEntitlement: "not-entitled",
    });

    expect(result.hourlyWage).toBe(120);
    expect(result.workdayOvertimePay).toBe(450);
    expect(result.holidayOvertimePay).toBe(360);
    expect(result.totalAdditionalPay).toBe(810);
  });

  it("does not round intermediate calculations", () => {
    const result = calculateOvertime({
      wageType: "monthly",
      wageAmount: 25_001,
      normalHoursPerDay: 8,
      workdayOvertimeHours: 1.25,
      holidayRegularHours: 0,
      holidayOvertimeHours: 0,
      holidayPayEntitlement: "entitled",
    });

    expect(result.totalAdditionalPay).toBeCloseTo(195.3203125, 8);
  });

  it("rejects invalid amounts, empty hours, and impossible totals", () => {
    const base = {
      wageType: "monthly" as const,
      wageAmount: 30_000,
      normalHoursPerDay: 8,
      workdayOvertimeHours: 1,
      holidayRegularHours: 0,
      holidayOvertimeHours: 0,
      holidayPayEntitlement: "entitled" as const,
    };

    expect(() => calculateOvertime({ ...base, wageAmount: 0 })).toThrow("ค่าจ้าง");
    expect(() => calculateOvertime({ ...base, normalHoursPerDay: 25 })).toThrow("ชั่วโมงทำงานปกติ");
    expect(() => calculateOvertime({ ...base, workdayOvertimeHours: 0 })).toThrow("อย่างน้อย 1 รายการ");
    expect(() => calculateOvertime({ ...base, workdayOvertimeHours: 400, holidayOvertimeHours: 400 })).toThrow("ชั่วโมงรวม");
  });
});
