import { describe, expect, it } from "vitest";
import {
  calculateCoffeeRoasting,
  coffeeRoastingCsv,
  COFFEE_ROASTING_MAX_MONEY,
  COFFEE_ROASTING_MAX_QUANTITY,
  type CoffeeRoastingInput,
} from "@/lib/tools/coffee-roasting";

function exampleInput(overrides: Partial<CoffeeRoastingInput> = {}): CoffeeRoastingInput {
  return {
    currency: "THB",
    batchName: "House Blend · Medium Roast",
    greenPurchaseCost: 1_000,
    greenPurchaseWeight: 10,
    greenPurchaseUnit: "kg",
    greenBatchWeight: 5,
    greenBatchUnit: "kg",
    roastedOutputWeight: 4.25,
    roastedOutputUnit: "kg",
    expectedLossPercent: 14.5,
    energyCostPerBatch: 60,
    laborMinutesPerBatch: 30,
    laborCostPerHour: 120,
    otherBatchCost: 40,
    retailBagSizeG: 250,
    packagingCostPerBag: 8,
    sellingPricePerBag: 160,
    channelFeePercent: 3,
    targetContributionMarginPercent: 30,
    batchesPerMonth: 20,
    ...overrides,
  };
}

describe("calculateCoffeeRoasting", () => {
  it("calculates roast loss, yield, batch cost, bag economics, and monthly plan", () => {
    const result = calculateCoffeeRoasting(exampleInput());

    expect(result.greenBatchWeightG).toBe(5_000);
    expect(result.roastedOutputWeightG).toBe(4_250);
    expect(result.actualLossWeightG).toBe(750);
    expect(result.actualLossPercent).toBeCloseTo(15, 10);
    expect(result.yieldPercent).toBeCloseTo(85, 10);
    expect(result.expectedRoastedWeightG).toBeCloseTo(4_275, 10);
    expect(result.lossVariancePercentagePoints).toBeCloseTo(0.5, 10);
    expect(result.lossStatus).toBe("above-plan");

    expect(result.greenCostPerKg).toBeCloseTo(100, 10);
    expect(result.greenBeanCostPerBatch).toBeCloseTo(500, 10);
    expect(result.laborCostPerBatch).toBeCloseTo(60, 10);
    expect(result.processCostPerBatch).toBeCloseTo(660, 10);
    expect(result.costPerRoastedKgBeforePackaging).toBeCloseTo(155.294117647, 9);
    expect(result.fullBagsPerBatch).toBe(17);
    expect(result.leftoverRoastedWeightG).toBeCloseTo(0, 10);
    expect(result.coffeeCostPerBag).toBeCloseTo(38.8235294118, 9);
    expect(result.costPerBagBeforeChannelFee).toBeCloseTo(46.8235294118, 9);
    expect(result.channelFeePerBag).toBeCloseTo(4.8, 10);
    expect(result.totalDirectCostPerBag).toBeCloseTo(51.6235294118, 9);
    expect(result.suggestedPricePerBag).toBeCloseTo(69.8858647937, 9);
    expect(result.contributionPerBag).toBeCloseTo(108.3764705882, 9);
    expect(result.contributionMarginPercent).toBeCloseTo(67.7352941176, 9);
    expect(result.batchRevenue).toBeCloseTo(2_720, 10);
    expect(result.batchContribution).toBeCloseTo(1_842.4, 10);

    expect(result.monthlyGreenWeightG).toBe(100_000);
    expect(result.monthlyRoastedWeightG).toBe(85_000);
    expect(result.monthlyFullBags).toBe(340);
    expect(result.monthlyProcessCost).toBeCloseTo(13_200, 10);
    expect(result.monthlyRevenue).toBeCloseTo(54_400, 10);
    expect(result.monthlyContribution).toBeCloseTo(36_848, 10);
  });

  it("normalizes g and kg before calculating loss and green cost", () => {
    const result = calculateCoffeeRoasting(exampleInput({
      greenPurchaseWeight: 10_000,
      greenPurchaseUnit: "g",
      greenBatchWeight: 5_000,
      greenBatchUnit: "g",
      roastedOutputWeight: 4_250,
      roastedOutputUnit: "g",
    }));

    expect(result.actualLossPercent).toBeCloseTo(15, 10);
    expect(result.greenBeanCostPerBatch).toBeCloseTo(500, 10);
    expect(result.costPerRoastedKgBeforePackaging).toBeCloseTo(155.294117647, 9);
  });

  it("keeps sales metrics null when selling price is omitted without inventing a market price", () => {
    const result = calculateCoffeeRoasting(exampleInput({ sellingPricePerBag: 0 }));

    expect(result.channelFeePerBag).toBeNull();
    expect(result.totalDirectCostPerBag).toBeNull();
    expect(result.contributionPerBag).toBeNull();
    expect(result.contributionMarginPercent).toBeNull();
    expect(result.batchRevenue).toBeNull();
    expect(result.batchContribution).toBeNull();
    expect(result.monthlyRevenue).toBeNull();
    expect(result.monthlyContribution).toBeNull();
    expect(result.suggestedPricePerBag).toBeCloseTo(69.8858647937, 9);
  });

  it("reports below, on, and above the user's loss plan without assigning roast quality", () => {
    expect(calculateCoffeeRoasting(exampleInput({ expectedLossPercent: 16 })).lossStatus).toBe("below-plan");
    expect(calculateCoffeeRoasting(exampleInput({ expectedLossPercent: 15.05 })).lossStatus).toBe("on-plan");
    expect(calculateCoffeeRoasting(exampleInput({ expectedLossPercent: 14 })).lossStatus).toBe("above-plan");
  });

  it("fails closed for impossible weights and invalid pricing targets", () => {
    expect(() => calculateCoffeeRoasting(exampleInput({ roastedOutputWeight: 5.1 }))).toThrow(/น้ำหนักหลังคั่ว/);
    expect(() => calculateCoffeeRoasting(exampleInput({ channelFeePercent: 70, targetContributionMarginPercent: 30 }))).toThrow(/ต่ำกว่า 100%/);
    expect(() => calculateCoffeeRoasting(exampleInput({ batchesPerMonth: 2.5 }))).toThrow(/จำนวนเต็ม/);
  });

  it("rejects unsupported units, currencies, ranges, and empty names", () => {
    expect(() => calculateCoffeeRoasting(exampleInput({ currency: "EUR" as CoffeeRoastingInput["currency"] }))).toThrow(/หน่วยเงิน/);
    expect(() => calculateCoffeeRoasting(exampleInput({ greenBatchUnit: "lb" as CoffeeRoastingInput["greenBatchUnit"] }))).toThrow(/หน่วยน้ำหนักก่อนคั่ว/);
    expect(() => calculateCoffeeRoasting(exampleInput({ batchName: " " }))).toThrow(/ชื่อ Batch/);
    expect(() => calculateCoffeeRoasting(exampleInput({ expectedLossPercent: 100 }))).toThrow(/Loss ที่คาด/);
    expect(() => calculateCoffeeRoasting(exampleInput({ greenPurchaseCost: COFFEE_ROASTING_MAX_MONEY + 1 }))).toThrow(/ราคา Green coffee/);
  });

  it("adds a UTF-8 BOM and neutralizes spreadsheet formulas in CSV", () => {
    const input = exampleInput({ batchName: "=HYPERLINK(\"https://example.com\")" });
    const csv = coffeeRoastingCsv(input, calculateCoffeeRoasting(input));

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Roast loss"');
    expect(csv).toContain('"Contribution"');
  });

  it("rejects finite but excessive derived results", () => {
    expect(() => calculateCoffeeRoasting(exampleInput({
      greenPurchaseCost: COFFEE_ROASTING_MAX_MONEY,
      greenPurchaseWeight: 0.000001,
      greenPurchaseUnit: "g",
      greenBatchWeight: COFFEE_ROASTING_MAX_QUANTITY,
      greenBatchUnit: "g",
      roastedOutputWeight: COFFEE_ROASTING_MAX_QUANTITY / 2,
      roastedOutputUnit: "g",
    }))).toThrow(/ผลลัพธ์สูงเกินขอบเขต/);
  });
});
