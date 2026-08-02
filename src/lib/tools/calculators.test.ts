import { describe, expect, it } from "vitest";
import { calculateBmi, calculateLoan, calculateProfitMargin } from "@/lib/tools/calculators";

describe("calculateLoan", () => {
  it("calculates an equal-payment reducing-balance loan", () => {
    const result = calculateLoan(12_000, 24, 6);
    expect(result.monthlyPayment).toBeCloseTo(2_142.31, 2);
    expect(result.totalInterest).toBeCloseTo(853.86, 2);
    expect(result.schedule).toHaveLength(6);
    expect(result.schedule.at(-1)?.balance).toBe(0);
  });

  it("supports a zero-interest loan", () => {
    const result = calculateLoan(12_000, 0, 6);
    expect(result.monthlyPayment).toBe(2_000);
    expect(result.totalInterest).toBe(0);
  });

  it("rejects an invalid term", () => {
    expect(() => calculateLoan(10_000, 5, 0)).toThrow("จำนวนงวด");
  });
});

describe("calculateBmi", () => {
  it("uses the WHO adult BMI formula and categories", () => {
    const result = calculateBmi(70, 175);
    expect(result.bmi).toBeCloseTo(22.86, 2);
    expect(result.category).toBe("น้ำหนักปกติ");
    expect(result.healthyWeightMin).toBeCloseTo(56.66, 2);
    expect(result.healthyWeightMax).toBeCloseTo(76.26, 2);
  });

  it.each([
    [45, 175, "น้ำหนักต่ำกว่าเกณฑ์"],
    [80, 175, "น้ำหนักเกิน"],
    [100, 175, "โรคอ้วนระดับ 1"],
    [115, 175, "โรคอ้วนระดับ 2"],
    [130, 175, "โรคอ้วนระดับ 3"],
  ])("classifies %s kg at %s cm", (weight, height, category) => {
    expect(calculateBmi(weight, height).category).toBe(category);
  });
});

describe("calculateProfitMargin", () => {
  it("calculates profit, margin, and markup", () => {
    const result = calculateProfitMargin(60, 100, 10);
    expect(result.revenue).toBe(1_000);
    expect(result.totalCost).toBe(600);
    expect(result.profit).toBe(400);
    expect(result.marginPercent).toBe(40);
    expect(result.markupPercent).toBeCloseTo(66.67, 2);
  });

  it("shows a loss as negative margin and markup", () => {
    const result = calculateProfitMargin(120, 100, 2);
    expect(result.profit).toBe(-40);
    expect(result.marginPercent).toBe(-20);
    expect(result.markupPercent).toBeCloseTo(-16.67, 2);
  });

  it("handles zero cost without an infinite markup", () => {
    expect(calculateProfitMargin(0, 100, 1).markupPercent).toBeNull();
  });
});
