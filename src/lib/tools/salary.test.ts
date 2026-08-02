import { describe, expect, it } from "vitest";
import { calculateM33EmployeeContribution, calculateNetSalary } from "@/lib/tools/salary";

describe("calculateM33EmployeeContribution", () => {
  it.each([
    [0, 0, 0],
    [1_000, 82.5, 1_650],
    [10_000, 500, 10_000],
    [17_500, 875, 17_500],
    [50_000, 875, 17_500],
  ])("calculates the 2569 M33 contribution for wage %s", (wage, contribution, wageBase) => {
    expect(calculateM33EmployeeContribution(wage)).toEqual({ contribution, wageBase });
  });

  it("rejects an invalid wage", () => {
    expect(() => calculateM33EmployeeContribution(-1)).toThrow("ค่าจ้าง");
  });
});

describe("calculateNetSalary", () => {
  const baseInput = {
    baseSalary: 30_000,
    overtime: 2_000,
    allowances: 1_500,
    bonus: 0,
    socialSecurityMode: "auto" as const,
    socialSecurityWage: 30_000,
    manualSocialSecurity: 0,
    providentFundRate: 3,
    withholdingTax: 500,
    otherDeductions: 300,
  };

  it("shows a transparent monthly pay breakdown", () => {
    const result = calculateNetSalary(baseInput);
    expect(result.grossIncome).toBe(33_500);
    expect(result.socialSecurity).toBe(875);
    expect(result.providentFund).toBe(900);
    expect(result.totalDeductions).toBe(2_575);
    expect(result.netPay).toBe(30_925);
    expect(result.deductionRate).toBeCloseTo(7.6866, 4);
  });

  it("supports the exact contribution shown on a payslip", () => {
    const result = calculateNetSalary({ ...baseInput, socialSecurityMode: "manual", manualSocialSecurity: 700 });
    expect(result.socialSecurity).toBe(700);
    expect(result.socialSecurityWageBase).toBe(0);
    expect(result.netPay).toBe(31_100);
  });

  it("supports employees who are not contributing in the selected month", () => {
    const result = calculateNetSalary({ ...baseInput, socialSecurityMode: "none" });
    expect(result.socialSecurity).toBe(0);
    expect(result.netPay).toBe(31_800);
  });

  it("keeps a negative net result visible when deductions exceed earnings", () => {
    const result = calculateNetSalary({ ...baseInput, baseSalary: 1_000, overtime: 0, allowances: 0, otherDeductions: 2_000 });
    expect(result.netPay).toBeLessThan(0);
  });
});
