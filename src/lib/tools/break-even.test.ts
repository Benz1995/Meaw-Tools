import { describe, expect, it } from "vitest";
import {
  BREAK_EVEN_MAX_MONEY,
  calculateBreakEven,
  breakEvenCsv,
  type BreakEvenInput,
} from "@/lib/tools/break-even";

function exampleInput(overrides: Partial<BreakEvenInput> = {}): BreakEvenInput {
  return {
    currency: "THB",
    scenarioName: "Coffee shop · Monthly plan",
    fixedCosts: {
      rentAndSpace: 30_000,
      fixedPayroll: 60_000,
      utilitiesAndSubscriptions: 8_000,
      marketingAndAdmin: 2_000,
      depreciationAndOther: 10_000,
    },
    products: [
      { name: "Americano", sellingPricePerUnit: 70, variableCostPerUnit: 20, unitSalesMixPercent: 40 },
      { name: "Latte", sellingPricePerUnit: 85, variableCostPerUnit: 32, unitSalesMixPercent: 35 },
      { name: "Other drinks", sellingPricePerUnit: 95, variableCostPerUnit: 40, unitSalesMixPercent: 25 },
    ],
    currentTotalUnits: 3_000,
    targetOperatingProfit: 40_000,
    capacityUnits: 3_600,
    ...overrides,
  };
}

describe("calculateBreakEven", () => {
  it("calculates weighted product mix, break-even, target profit, current plan, and capacity", () => {
    const result = calculateBreakEven(exampleInput());

    expect(result.totalFixedCosts).toBe(110_000);
    expect(result.weightedSellingPricePerUnit).toBeCloseTo(81.5, 10);
    expect(result.weightedVariableCostPerUnit).toBeCloseTo(29.2, 10);
    expect(result.weightedContributionMarginPerUnit).toBeCloseTo(52.3, 10);
    expect(result.weightedContributionMarginRatioPercent).toBeCloseTo(64.1717791411, 9);
    expect(result.breakEvenUnitsExact).toBeCloseTo(2_103.2504780115, 9);
    expect(result.breakEvenUnitsRounded).toBe(2_104);
    expect(result.breakEvenRevenue).toBeCloseTo(171_414.913957935, 7);
    expect(result.targetUnitsExact).toBeCloseTo(2_868.068833652, 9);
    expect(result.targetUnitsRounded).toBe(2_869);
    expect(result.targetRevenue).toBeCloseTo(233_747.609942639, 7);

    expect(result.currentPlan?.revenue).toBeCloseTo(244_500, 10);
    expect(result.currentPlan?.variableCosts).toBeCloseTo(87_600, 10);
    expect(result.currentPlan?.contributionMargin).toBeCloseTo(156_900, 10);
    expect(result.currentPlan?.operatingProfit).toBeCloseTo(46_900, 10);
    expect(result.currentPlan?.marginOfSafetyPercent).toBeCloseTo(29.891650733, 9);
    expect(result.capacityPlan?.operatingProfit).toBeCloseTo(78_280, 10);
    expect(result.capacityPlan?.status).toBe("at-or-above-target");
  });

  it("matches the standard single-product break-even and target-profit formulas", () => {
    const result = calculateBreakEven(exampleInput({
      fixedCosts: { rentAndSpace: 18_000, fixedPayroll: 0, utilitiesAndSubscriptions: 0, marketingAndAdmin: 0, depreciationAndOther: 0 },
      products: [{ name: "Blue Jay", sellingPricePerUnit: 100, variableCostPerUnit: 20, unitSalesMixPercent: 100 }],
      currentTotalUnits: 300,
      targetOperatingProfit: 16_000,
      capacityUnits: 0,
    }));

    expect(result.breakEvenUnitsExact).toBe(225);
    expect(result.breakEvenRevenue).toBe(22_500);
    expect(result.targetUnitsExact).toBe(425);
    expect(result.targetRevenue).toBe(42_500);
    expect(result.currentPlan?.operatingProfit).toBe(6_000);
  });

  it("keeps optional current and capacity scenarios null when omitted", () => {
    const result = calculateBreakEven(exampleInput({ currentTotalUnits: 0, capacityUnits: 0 }));
    expect(result.currentPlan).toBeNull();
    expect(result.capacityPlan).toBeNull();
  });

  it("rejects unit mixes that do not total 100 percent", () => {
    expect(() => calculateBreakEven(exampleInput({
      products: [{ name: "A", sellingPricePerUnit: 100, variableCostPerUnit: 50, unitSalesMixPercent: 90 }],
    }))).toThrow(/100%/);
  });

  it("rejects a non-positive weighted contribution margin", () => {
    expect(() => calculateBreakEven(exampleInput({
      products: [
        { name: "Loss leader", sellingPricePerUnit: 100, variableCostPerUnit: 130, unitSalesMixPercent: 80 },
        { name: "Positive", sellingPricePerUnit: 100, variableCostPerUnit: 50, unitSalesMixPercent: 20 },
      ],
    }))).toThrow(/Contribution margin แบบถ่วงน้ำหนัก/);
  });

  it("rejects unsupported currencies, empty names, invalid ranges, and too many products", () => {
    expect(() => calculateBreakEven(exampleInput({ currency: "CAD" as BreakEvenInput["currency"] }))).toThrow(/หน่วยเงิน/);
    expect(() => calculateBreakEven(exampleInput({ scenarioName: " " }))).toThrow(/ชื่อ Scenario/);
    expect(() => calculateBreakEven(exampleInput({ currentTotalUnits: -1 }))).toThrow(/ยอดขายปัจจุบัน/);
    expect(() => calculateBreakEven(exampleInput({ products: [] }))).toThrow(/1–6/);
    expect(() => calculateBreakEven(exampleInput({ products: Array.from({ length: 7 }, (_, index) => ({ name: `P${index}`, sellingPricePerUnit: 10, variableCostPerUnit: 2, unitSalesMixPercent: 100 / 7 })) }))).toThrow(/1–6/);
  });

  it("adds a UTF-8 BOM and neutralizes spreadsheet formulas in CSV", () => {
    const input = exampleInput({
      scenarioName: "=HYPERLINK(\"https://example.com\")",
      products: [{ name: "+SUM(A1:A2)", sellingPricePerUnit: 100, variableCostPerUnit: 40, unitSalesMixPercent: 100 }],
    });
    const csv = breakEvenCsv(input, calculateBreakEven(input));

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM");
    expect(csv).toContain('"Break-even revenue"');
  });

  it("rejects finite but excessive derived results", () => {
    expect(() => calculateBreakEven(exampleInput({
      fixedCosts: { rentAndSpace: BREAK_EVEN_MAX_MONEY, fixedPayroll: 0, utilitiesAndSubscriptions: 0, marketingAndAdmin: 0, depreciationAndOther: 0 },
      products: [{ name: "Tiny contribution", sellingPricePerUnit: 1, variableCostPerUnit: 0.999999999999999, unitSalesMixPercent: 100 }],
      currentTotalUnits: 0,
      capacityUnits: 0,
    }))).toThrow(/ผลลัพธ์สูงเกินขอบเขต/);
  });
});
