import { describe, expect, it } from "vitest";
import {
  calculateInventoryTurnover,
  inventoryTurnoverCsv,
  type InventoryTurnoverInput,
} from "@/lib/tools/inventory-turnover";

const exampleInput: InventoryTurnoverInput = {
  averageMethod: "opening-closing",
  currency: "THB",
  periodDays: 365,
  costOfGoodsSold: 1_200_000,
  openingInventory: 300_000,
  closingInventory: 200_000,
  directAverageInventory: 0,
  inventorySnapshots: [],
  targetAnnualTurnover: 6,
};

describe("inventory turnover calculator", () => {
  it("calculates turnover, inventory days, coverage, and a transparent target comparison", () => {
    const result = calculateInventoryTurnover(exampleInput);

    expect(result.averageInventory).toBe(250_000);
    expect(result.turnoverForPeriod).toBe(4.8);
    expect(result.annualizedTurnover).toBe(4.8);
    expect(result.inventoryDays).toBeCloseTo(76.0416667, 6);
    expect(result.weeksOnHand).toBeCloseTo(10.8630952, 6);
    expect(result.monthsOnHand).toBeCloseTo(2.5, 10);
    expect(result.costOfGoodsSoldPerDay).toBeCloseTo(3_287.6712329, 6);
    expect(result.closingInventoryDays).toBeCloseTo(60.8333333, 6);
    expect(result.targetAverageInventory).toBe(200_000);
    expect(result.averageInventoryGapToTarget).toBe(50_000);
    expect(result.averageInventoryGapPercent).toBe(25);
    expect(result.targetStatus).toBe("above-target-inventory");
  });

  it("annualizes a partial period without changing its inventory days", () => {
    const result = calculateInventoryTurnover({
      ...exampleInput,
      averageMethod: "direct",
      periodDays: 90,
      costOfGoodsSold: 300_000,
      directAverageInventory: 200_000,
      targetAnnualTurnover: 0,
    });

    expect(result.turnoverForPeriod).toBe(1.5);
    expect(result.annualizedTurnover).toBeCloseTo(6.0833333, 6);
    expect(result.inventoryDays).toBe(60);
    expect(result.annualizedCostOfGoodsSold).toBeCloseTo(1_216_666.6666667, 6);
    expect(result.closingInventoryDays).toBeNull();
    expect(result.targetStatus).toBe("no-target");
  });

  it("averages multiple snapshots for seasonal or volatile inventory", () => {
    const result = calculateInventoryTurnover({
      ...exampleInput,
      averageMethod: "snapshots",
      inventorySnapshots: [100_000, 200_000, 300_000, 400_000],
      targetAnnualTurnover: 0,
    });

    expect(result.averageInventory).toBe(250_000);
    expect(result.snapshotCount).toBe(4);
    expect(result.turnoverForPeriod).toBe(4.8);
  });

  it("keeps the snapshot mean stable at the supported upper count and value", () => {
    const result = calculateInventoryTurnover({
      ...exampleInput,
      averageMethod: "snapshots",
      costOfGoodsSold: 1_000_000_000_000_000,
      inventorySnapshots: Array.from({ length: 3_660 }, () => 1_000_000_000_000_000),
      targetAnnualTurnover: 0,
    });

    expect(result.averageInventory).toBe(1_000_000_000_000_000);
    expect(result.snapshotCount).toBe(3_660);
    expect(result.turnoverForPeriod).toBe(1);
  });

  it("shows when average inventory is below the user-supplied target level", () => {
    const result = calculateInventoryTurnover({
      ...exampleInput,
      averageMethod: "direct",
      directAverageInventory: 150_000,
      targetAnnualTurnover: 6,
    });

    expect(result.annualizedTurnover).toBe(8);
    expect(result.targetAverageInventory).toBe(200_000);
    expect(result.averageInventoryGapToTarget).toBe(-50_000);
    expect(result.averageInventoryGapPercent).toBe(-25);
    expect(result.targetStatus).toBe("below-target-inventory");
  });

  it("treats a small target difference as near target", () => {
    const result = calculateInventoryTurnover({
      ...exampleInput,
      averageMethod: "direct",
      directAverageInventory: 200_500,
      targetAnnualTurnover: 6,
    });

    expect(result.averageInventoryGapPercent).toBeCloseTo(0.25, 10);
    expect(result.targetStatus).toBe("near-target");
  });

  it("exports a UTF-8 CSV with inputs, formulas, and target results", () => {
    const result = calculateInventoryTurnover(exampleInput);
    const csv = inventoryTurnoverCsv(exampleInput, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Average inventory","250000.00","THB"');
    expect(csv).toContain('"Inventory turnover ในรอบ","4.80","รอบ"');
    expect(csv).toContain('"Inventory days / DIO","76.04","วัน"');
    expect(csv).toContain('"สถานะเทียบเป้าหมาย","Average inventory สูงกว่าระดับตามเป้าหมาย",""');
  });

  it("rejects invalid money, time, averaging, and snapshot inputs", () => {
    expect(() => calculateInventoryTurnover({ ...exampleInput, costOfGoodsSold: 0 })).toThrow("ต้นทุนขาย");
    expect(() => calculateInventoryTurnover({ ...exampleInput, periodDays: 0 })).toThrow("จำนวนวันในรอบ");
    expect(() => calculateInventoryTurnover({ ...exampleInput, openingInventory: 0, closingInventory: 0 })).toThrow("Average inventory");
    expect(() => calculateInventoryTurnover({ ...exampleInput, averageMethod: "snapshots", inventorySnapshots: [100] })).toThrow("2–");
    expect(() => calculateInventoryTurnover({ ...exampleInput, averageMethod: "snapshots", inventorySnapshots: [100, -1] })).toThrow("ลำดับ 2");
    expect(() => calculateInventoryTurnover({ ...exampleInput, targetAnnualTurnover: -1 })).toThrow("เป้าหมาย");
  });

  it("rejects unsupported averaging and currency values", () => {
    expect(() => calculateInventoryTurnover({ ...exampleInput, averageMethod: "invalid" as InventoryTurnoverInput["averageMethod"] })).toThrow("วิธีหา");
    expect(() => calculateInventoryTurnover({ ...exampleInput, currency: "EUR" as InventoryTurnoverInput["currency"] })).toThrow("หน่วยเงิน");
  });
});
