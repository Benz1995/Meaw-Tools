import { describe, expect, it } from "vitest";
import { calculateEoq, eoqCsv, type EoqInput } from "@/lib/tools/eoq";

function exampleInput(overrides: Partial<EoqInput> = {}): EoqInput {
  return {
    currency: "THB",
    annualDemand: 10_000,
    orderingCost: 500,
    holdingCostMode: "per-unit",
    holdingCostPerUnit: 20,
    holdingRatePercent: 20,
    workingDaysPerYear: 250,
    leadTimeDays: 7,
    safetyStock: 100,
    packSize: 1,
    minimumOrderQuantity: 1,
    storageCapacity: 0,
    currentOrderQuantity: 500,
    priceTiers: [{ minimumQuantity: 1, unitPrice: 100 }],
    ...overrides,
  };
}

describe("calculateEoq", () => {
  it("finds the classical EOQ and balances ordering with cycle holding cost", () => {
    const result = calculateEoq(exampleInput({ safetyStock: 0, currentOrderQuantity: 0 }));

    expect(result.recommended.quantity).toBe(707);
    expect(result.recommended.rawEoq).toBeCloseTo(Math.sqrt(500_000), 10);
    expect(result.recommended.annualOrderingCost).toBeCloseTo(7_072.1358, 3);
    expect(result.recommended.annualHoldingCost).toBeCloseTo(7_070, 3);
    expect(result.recommended.ordersPerYear).toBeCloseTo(10_000 / 707, 10);
  });

  it("derives holding cost from the unit price when rate mode is selected", () => {
    const result = calculateEoq(exampleInput({
      holdingCostMode: "rate",
      holdingCostPerUnit: 0,
      holdingRatePercent: 20,
      safetyStock: 0,
      currentOrderQuantity: 0,
    }));

    expect(result.recommended.holdingCostPerUnit).toBe(20);
    expect(result.recommended.quantity).toBe(707);
  });

  it("evaluates all-units quantity discounts instead of selecting the standalone EOQ blindly", () => {
    const result = calculateEoq(exampleInput({
      holdingCostMode: "rate",
      holdingCostPerUnit: 0,
      storageCapacity: 1_800,
      priceTiers: [
        { minimumQuantity: 1, unitPrice: 100 },
        { minimumQuantity: 1_000, unitPrice: 90 },
        { minimumQuantity: 2_500, unitPrice: 85 },
      ],
    }));

    expect(result.recommended.quantity).toBe(1_000);
    expect(result.recommended.unitPrice).toBe(90);
    expect(result.candidates.some((candidate) => candidate.quantity === 2_500)).toBe(false);
    expect(result.recommended.annualTotalCost).toBeCloseTo(915_800, 6);
  });

  it("applies MOQ, pack rounding, and storage capacity to feasible candidates", () => {
    const result = calculateEoq(exampleInput({
      packSize: 24,
      minimumOrderQuantity: 100,
      storageCapacity: 800,
      currentOrderQuantity: 0,
    }));

    expect(result.candidates.every((candidate) => candidate.quantity % 24 === 0)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.quantity >= 120 && candidate.quantity <= 792)).toBe(true);
    expect(result.recommended.quantity).toBe(696);
  });

  it("estimates reorder point and annual savings against the supplied current policy", () => {
    const result = calculateEoq(exampleInput());

    expect(result.dailyDemand).toBe(40);
    expect(result.demandDuringLeadTime).toBe(280);
    expect(result.reorderPoint).toBe(380);
    expect(result.current?.quantity).toBe(500);
    expect(result.annualSavingsVsCurrent).toBeCloseTo(857.8642, 3);
    expect(result.savingsPercentVsCurrent).toBeGreaterThan(0);
  });

  it("rejects invalid tiers and impossible operational constraints", () => {
    expect(() => calculateEoq(exampleInput({ priceTiers: [] }))).toThrow(/1–6/);
    expect(() => calculateEoq(exampleInput({ priceTiers: [{ minimumQuantity: 10, unitPrice: 100 }] }))).toThrow(/เริ่มที่ 1/);
    expect(() => calculateEoq(exampleInput({ priceTiers: [
      { minimumQuantity: 1, unitPrice: 100 },
      { minimumQuantity: 100, unitPrice: 110 },
    ] }))).toThrow(/ต้องต่ำกว่า/);
    expect(() => calculateEoq(exampleInput({ packSize: 24, minimumOrderQuantity: 100, storageCapacity: 100, currentOrderQuantity: 0 }))).toThrow(/ความจุสูงสุด/);
    expect(() => calculateEoq(exampleInput({ packSize: 24, currentOrderQuantity: 500 }))).toThrow(/หารด้วย Pack size/);
  });
});

describe("EOQ CSV", () => {
  it("adds a UTF-8 BOM and includes tiers, totals, and ranked candidates", () => {
    const input = exampleInput();
    const csv = eoqCsv(input, calculateEoq(input));

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Price tiers","Minimum quantity","Unit price (THB)"');
    expect(csv).toContain('"Order quantity","707","units/order"');
    expect(csv).toContain('"Candidate rank","Quantity","Unit price","Annual total cost","Reasons"');
  });
});
