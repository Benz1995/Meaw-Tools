import { describe, expect, it } from "vitest";
import { calculateThaiPersonalIncomeTax, estimateSalaryIncomeTax } from "@/lib/tools/thai-income-tax";

describe("calculateThaiPersonalIncomeTax", () => {
  it.each([
    [0, 0],
    [150_000, 0],
    [300_000, 7_500],
    [500_000, 27_500],
    [1_000_000, 115_000],
    [5_000_000, 1_265_000],
    [6_000_000, 1_615_000],
  ])("calculates progressive tax for %s baht", (income, expectedTax) => {
    expect(calculateThaiPersonalIncomeTax(income).tax).toBe(expectedTax);
  });

  it("returns the active marginal rate and a transparent band breakdown", () => {
    const result = calculateThaiPersonalIncomeTax(431_000);
    expect(result.marginalRate).toBe(0.1);
    expect(result.bands.filter((band) => band.taxableAmount > 0)).toHaveLength(3);
    expect(result.bands[2]).toMatchObject({ taxableAmount: 131_000, tax: 13_100 });
  });

  it("rejects negative and non-finite income", () => {
    expect(() => calculateThaiPersonalIncomeTax(-1)).toThrow("เงินได้สุทธิ");
    expect(() => calculateThaiPersonalIncomeTax(Number.NaN)).toThrow("เงินได้สุทธิ");
  });
});

describe("estimateSalaryIncomeTax", () => {
  it("applies the employment expense cap and explicit allowances", () => {
    const result = estimateSalaryIncomeTax({
      monthlySalary: 50_000,
      annualBonus: 0,
      otherEmploymentIncome: 0,
      socialSecurity: 9_000,
      otherDeductions: 0,
      withheldTax: 10_000,
    });

    expect(result.grossIncome).toBe(600_000);
    expect(result.employmentExpense).toBe(100_000);
    expect(result.personalAllowance).toBe(60_000);
    expect(result.taxableIncome).toBe(431_000);
    expect(result.tax).toBe(20_600);
    expect(result.balance).toBe(10_600);
  });

  it("never produces negative taxable income", () => {
    const result = estimateSalaryIncomeTax({
      monthlySalary: 10_000,
      annualBonus: 0,
      otherEmploymentIncome: 0,
      socialSecurity: 0,
      otherDeductions: 0,
      withheldTax: 0,
    });
    expect(result.taxableIncome).toBe(0);
    expect(result.tax).toBe(0);
  });
});
