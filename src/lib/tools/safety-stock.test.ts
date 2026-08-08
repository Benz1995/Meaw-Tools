import { describe, expect, it } from "vitest";
import {
  calculateSafetyStock,
  safetyStockCsv,
  serviceLevelToZScore,
  type SafetyStockInput,
} from "@/lib/tools/safety-stock";

const exampleInput: SafetyStockInput = {
  method: "service-level",
  periodUnit: "day",
  averageDemand: 100,
  demandStdDev: 20,
  averageLeadTime: 7,
  leadTimeStdDev: 1,
  serviceLevelPercent: 95,
  safetyCoverPeriods: 2,
  manualSafetyStock: 200,
  roundingMultiple: 1,
  onHand: 600,
  onOrder: 150,
  backorders: 25,
};

describe("safety stock calculator", () => {
  it("calculates combined demand and lead-time variability with an actionable reorder status", () => {
    const result = calculateSafetyStock(exampleInput);

    expect(result.leadTimeDemand).toBe(700);
    expect(result.leadTimeDemandStdDev).toBeCloseTo(Math.sqrt(12_800), 10);
    expect(result.zScore).toBeCloseTo(1.6448536269, 7);
    expect(result.rawSafetyStock).toBeCloseTo(186.0939446, 6);
    expect(result.recommendedSafetyStock).toBe(187);
    expect(result.rawReorderPoint).toBeCloseTo(886.0939446, 6);
    expect(result.recommendedReorderPoint).toBe(887);
    expect(result.inventoryPosition).toBe(725);
    expect(result.reorderNow).toBe(true);
    expect(result.unitsBelowReorderPoint).toBe(162);
    expect(result.nominalStockoutRiskPercent).toBe(5);
  });

  it("reduces to demand variability during constant lead time", () => {
    const result = calculateSafetyStock({ ...exampleInput, leadTimeStdDev: 0 });
    const expectedStdDev = 20 * Math.sqrt(7);

    expect(result.leadTimeDemandStdDev).toBeCloseTo(expectedStdDev, 10);
    expect(result.rawSafetyStock).toBeCloseTo(1.6448536269 * expectedStdDev, 6);
  });

  it("supports a days-of-cover policy without claiming a service level", () => {
    const result = calculateSafetyStock({
      ...exampleInput,
      method: "days-cover",
      safetyCoverPeriods: 2.5,
    });

    expect(result.rawSafetyStock).toBe(250);
    expect(result.recommendedSafetyStock).toBe(250);
    expect(result.recommendedReorderPoint).toBe(950);
    expect(result.zScore).toBeNull();
    expect(result.leadTimeDemandStdDev).toBeNull();
    expect(result.nominalStockoutRiskPercent).toBeNull();
  });

  it("supports a manual policy and rounds recommendations to an order multiple", () => {
    const result = calculateSafetyStock({
      ...exampleInput,
      method: "manual",
      averageDemand: 10,
      averageLeadTime: 5,
      manualSafetyStock: 25,
      roundingMultiple: 12,
    });

    expect(result.rawSafetyStock).toBe(25);
    expect(result.recommendedSafetyStock).toBe(36);
    expect(result.rawReorderPoint).toBe(75);
    expect(result.recommendedReorderPoint).toBe(84);
  });

  it("estimates time remaining when inventory position is above the reorder point", () => {
    const result = calculateSafetyStock({ ...exampleInput, onHand: 1_200, onOrder: 0, backorders: 0 });

    expect(result.reorderNow).toBe(false);
    expect(result.unitsBelowReorderPoint).toBe(0);
    expect(result.unitsAboveReorderPoint).toBe(313);
    expect(result.periodsUntilReorderPoint).toBeCloseTo(3.13, 10);
  });

  it("converts common service levels to standard-normal z-scores", () => {
    expect(serviceLevelToZScore(50)).toBe(0);
    expect(serviceLevelToZScore(90)).toBeCloseTo(1.2815515655, 7);
    expect(serviceLevelToZScore(95)).toBeCloseTo(1.6448536269, 7);
    expect(serviceLevelToZScore(99)).toBeCloseTo(2.326347874, 7);
    expect(serviceLevelToZScore(99.99)).toBeCloseTo(3.7190164855, 6);
  });

  it("exports a UTF-8 CSV with the policy and inventory decision", () => {
    const result = calculateSafetyStock(exampleInput);
    const csv = safetyStockCsv(exampleInput, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Safety Stock แนะนำ","187.00","หน่วย"');
    expect(csv).toContain('"Reorder Point แนะนำ","887.00","หน่วย"');
    expect(csv).toContain('"สถานะสั่งซื้อ","ถึงจุดสั่งซื้อ",""');
  });

  it("rejects invalid service, time, quantity, and policy inputs", () => {
    expect(() => calculateSafetyStock({ ...exampleInput, serviceLevelPercent: 49.99 })).toThrow("Target service level");
    expect(() => calculateSafetyStock({ ...exampleInput, averageLeadTime: 0 })).toThrow("Lead time เฉลี่ย");
    expect(() => calculateSafetyStock({ ...exampleInput, backorders: -1 })).toThrow("Backorder");
    expect(() => calculateSafetyStock({ ...exampleInput, method: "invalid" as SafetyStockInput["method"] })).toThrow("วิธีคำนวณ");
  });
});
