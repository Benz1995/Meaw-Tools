import { describe, expect, it } from "vitest";
import {
  calculateCoffeeCost,
  coffeeCostCsv,
  COFFEE_COST_MAX_EXTRAS,
  type CoffeeCostInput,
} from "@/lib/tools/coffee-cost";

const exampleInput: CoffeeCostInput = {
  currency: "THB",
  drinkName: "Iced Latte 16 oz",
  sellingPricePerCup: 95,
  targetIngredientCostPercent: 28,
  cupsPerDay: 80,
  operatingDaysPerMonth: 30,
  paymentFeePercent: 3,
  packagingCostPerCup: 7,
  laborCostPerCup: 12,
  otherDirectCostPerCup: 2,
  beanPurchaseCost: 780,
  beanBagWeight: 1,
  beanBagUnit: "kg",
  beanDoseG: 18,
  beanUsableYieldPercent: 98,
  includeMilk: true,
  milkPurchaseCost: 98,
  milkContainerVolume: 2,
  milkContainerUnit: "l",
  milkUsageMl: 160,
  milkUsableYieldPercent: 95,
  extras: [
    { name: "ไซรัป", purchaseCost: 180, purchaseQuantity: 750, purchaseUnit: "ml", usagePerCup: 15, usageUnit: "ml", usableYieldPercent: 98 },
  ],
};

describe("calculateCoffeeCost", () => {
  it("calculates cost per cup, pricing, fees, contribution, and monthly usage", () => {
    const result = calculateCoffeeCost(exampleInput);

    expect(result.beanCostPerCup).toBeCloseTo(14.3265306122, 8);
    expect(result.milkCostPerCup).toBeCloseTo(8.2526315789, 8);
    expect(result.extraCostPerCup).toBeCloseTo(3.6734693878, 8);
    expect(result.ingredientCostPerCup).toBeCloseTo(26.2526315789, 8);
    expect(result.paymentFeePerCup).toBeCloseTo(2.85, 8);
    expect(result.totalDirectCostPerCup).toBeCloseTo(50.1026315789, 8);
    expect(result.suggestedPricePerCup).toBeCloseTo(93.7593984962, 8);
    expect(result.ingredientCostPercent).toBeCloseTo(27.6343490305, 8);
    expect(result.directCostPercent).toBeCloseTo(52.7396121884, 8);
    expect(result.contributionPerCup).toBeCloseTo(44.8973684211, 8);
    expect(result.contributionMarginPercent).toBeCloseTo(47.2603878116, 8);
    expect(result.ingredientCostStatus).toBe("at-or-below-target");
    expect(result.cupsPerBeanBag).toBeCloseTo(54.4444444444, 8);
    expect(result.cupsPerMilkContainer).toBeCloseTo(11.875, 8);
    expect(result.monthlyCups).toBe(2_400);
    expect(result.monthlyBeanPurchaseG).toBeCloseTo(44_081.6326530612, 8);
    expect(result.monthlyBeanBags).toBeCloseTo(44.0816326531, 8);
    expect(result.monthlyMilkContainers).toBeCloseTo(202.1052631579, 8);
    expect(result.extraResults[0]!.monthlyPurchasePacks).toBeCloseTo(48.9795918367, 8);
    expect(result.monthlyRevenue).toBe(228_000);
    expect(result.monthlyContribution).toBeCloseTo(107_753.6842105263, 8);
  });

  it("supports black coffee without requiring milk inputs", () => {
    const result = calculateCoffeeCost({
      ...exampleInput,
      includeMilk: false,
      milkPurchaseCost: Number.NaN,
      milkContainerVolume: 0,
      milkContainerUnit: "ml",
      milkUsageMl: 0,
      milkUsableYieldPercent: 0,
    });

    expect(result.milkCostPerCup).toBe(0);
    expect(result.cupsPerMilkContainer).toBeNull();
    expect(result.monthlyMilkContainers).toBe(0);
  });

  it("converts units and keeps extra ingredient dimensions auditable", () => {
    const result = calculateCoffeeCost({
      ...exampleInput,
      extras: [
        { name: "ผงโกโก้", purchaseCost: 250, purchaseQuantity: 1, purchaseUnit: "kg", usagePerCup: 20, usageUnit: "g", usableYieldPercent: 80 },
        { name: "ฝาปิด", purchaseCost: 100, purchaseQuantity: 100, purchaseUnit: "piece", usagePerCup: 1, usageUnit: "piece", usableYieldPercent: 100 },
      ],
    });

    expect(result.extraResults[0]!.purchaseBaseQuantity).toBe(1_000);
    expect(result.extraResults[0]!.asPurchasedBaseQuantityPerCup).toBe(25);
    expect(result.extraResults[0]!.lineCostPerCup).toBeCloseTo(6.25, 8);
    expect(result.extraResults[1]!.lineCostPerCup).toBe(1);
  });

  it("does not invent price metrics when price and volume plan are omitted", () => {
    const result = calculateCoffeeCost({
      ...exampleInput,
      sellingPricePerCup: 0,
      paymentFeePercent: 0,
      cupsPerDay: 0,
    });

    expect(result.suggestedPricePerCup).toBeCloseTo(93.7593984962, 8);
    expect(result.ingredientCostPercent).toBeNull();
    expect(result.contributionPerCup).toBeNull();
    expect(result.monthlyCups).toBe(0);
    expect(result.monthlyRevenue).toBeNull();
    expect(result.ingredientCostStatus).toBe("not-provided");
  });

  it("requires a selling price when a percentage fee is configured", () => {
    expect(() => calculateCoffeeCost({
      ...exampleInput,
      sellingPricePerCup: 0,
      paymentFeePercent: 3,
    })).toThrow("กรุณากรอกราคาขาย");
  });

  it("rejects invalid dimensions, bounds, and excessive extra rows", () => {
    expect(() => calculateCoffeeCost({ ...exampleInput, currency: "EUR" as CoffeeCostInput["currency"] })).toThrow("หน่วยเงิน");
    expect(() => calculateCoffeeCost({ ...exampleInput, drinkName: "" })).toThrow("ชื่อเมนู");
    expect(() => calculateCoffeeCost({ ...exampleInput, beanBagUnit: "lb" as CoffeeCostInput["beanBagUnit"] })).toThrow("หน่วยน้ำหนักเมล็ด");
    expect(() => calculateCoffeeCost({ ...exampleInput, beanDoseG: 0 })).toThrow("Dose");
    expect(() => calculateCoffeeCost({ ...exampleInput, beanUsableYieldPercent: 0 })).toThrow("Yield เมล็ด");
    expect(() => calculateCoffeeCost({ ...exampleInput, operatingDaysPerMonth: 30.5 })).toThrow("จำนวนเต็ม");
    expect(() => calculateCoffeeCost({ ...exampleInput, includeMilk: true, milkUsageMl: 0 })).toThrow("ปริมาณนม");
    expect(() => calculateCoffeeCost({ ...exampleInput, extras: [{ ...exampleInput.extras[0]!, usageUnit: "g" }] })).toThrow("หน่วยคนละประเภท");
    expect(() => calculateCoffeeCost({
      ...exampleInput,
      extras: Array.from({ length: COFFEE_COST_MAX_EXTRAS + 1 }, (_, index) => ({ ...exampleInput.extras[0]!, name: `item-${index}` })),
    })).toThrow("ส่วนผสมเสริม");
  });

  it("exports UTF-8 CSV and neutralizes spreadsheet formulas in names", () => {
    const input = {
      ...exampleInput,
      drinkName: "=SUM(1,1)",
      extras: [{ ...exampleInput.extras[0]!, name: "@IMPORTXML(\"https://bad.invalid\")" }],
    };
    const result = calculateCoffeeCost(input);
    const csv = coffeeCostCsv(input, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(`"'=SUM(1,1)"`);
    expect(csv).toContain(`"'@IMPORTXML(""https://bad.invalid"")"`);
    expect(csv).toContain('"ต้นทุนวัตถุดิบรวมต่อแก้ว","26.25","THB/แก้ว"');
    expect(csv).toContain('"จำนวนแก้วต่อเดือน","2400.0000","แก้ว"');
    expect(csv).not.toContain('"=SUM');
    expect(csv).not.toContain('"@IMPORTXML');
  });

  it("fails closed when supported inputs produce an excessive result", () => {
    expect(() => calculateCoffeeCost({
      ...exampleInput,
      sellingPricePerCup: 1_000_000_000_000,
      cupsPerDay: 1_000_000,
      operatingDaysPerMonth: 31,
      packagingCostPerCup: 1_000_000_000_000,
    })).toThrow("ผลลัพธ์สูงเกินขอบเขต");
  });
});
