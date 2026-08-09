import { describe, expect, it } from "vitest";
import {
  calculateFoodCost,
  foodCostCsv,
  FOOD_COST_MAX_INGREDIENTS,
  type FoodCostInput,
} from "@/lib/tools/food-cost";

const exampleInput: FoodCostInput = {
  currency: "THB",
  servings: 8,
  sellingPricePerServing: 89,
  targetFoodCostPercent: 28,
  packagingPerServing: 5,
  laborPerBatch: 120,
  otherDirectCostPerBatch: 40,
  ingredients: [
    { name: "แป้ง", purchaseCost: 180, purchaseQuantity: 5, purchaseUnit: "kg", recipeQuantity: 600, recipeUnit: "g", yieldPercent: 100 },
    { name: "ไก่", purchaseCost: 240, purchaseQuantity: 2, purchaseUnit: "kg", recipeQuantity: 800, recipeUnit: "g", yieldPercent: 80 },
    { name: "ไข่", purchaseCost: 90, purchaseQuantity: 30, purchaseUnit: "piece", recipeQuantity: 5, recipeUnit: "piece", yieldPercent: 100 },
    { name: "ซอส", purchaseCost: 85, purchaseQuantity: 1, purchaseUnit: "l", recipeQuantity: 120, recipeUnit: "ml", yieldPercent: 100 },
  ],
};

describe("food cost calculator", () => {
  it("calculates recipe, serving, direct cost, and menu price metrics", () => {
    const result = calculateFoodCost(exampleInput);

    expect(result.ingredientResults[0]!.lineCost).toBeCloseTo(21.6, 8);
    expect(result.ingredientResults[1]!.lineCost).toBeCloseTo(120, 8);
    expect(result.ingredientResults[2]!.lineCost).toBeCloseTo(15, 8);
    expect(result.ingredientResults[3]!.lineCost).toBeCloseTo(10.2, 8);
    expect(result.ingredientCostPerBatch).toBeCloseTo(166.8, 8);
    expect(result.ingredientCostPerServing).toBeCloseTo(20.85, 8);
    expect(result.packagingCostPerBatch).toBe(40);
    expect(result.totalDirectCostPerBatch).toBeCloseTo(366.8, 8);
    expect(result.totalDirectCostPerServing).toBeCloseTo(45.85, 8);
    expect(result.suggestedPricePerServing).toBeCloseTo(74.4642857143, 8);
    expect(result.foodCostPercent).toBeCloseTo(23.4269662921, 8);
    expect(result.directCostPercent).toBeCloseTo(51.5168539326, 8);
    expect(result.contributionPerServing).toBeCloseTo(43.15, 8);
    expect(result.contributionPerBatch).toBeCloseTo(345.2, 8);
    expect(result.contributionMarginPercent).toBeCloseTo(48.4831460674, 8);
    expect(result.revenuePerBatch).toBe(712);
    expect(result.currentPriceGapFromTarget).toBeCloseTo(14.5357142857, 8);
    expect(result.foodCostStatus).toBe("at-or-below-target");
  });

  it("converts compatible units and applies edible yield", () => {
    const result = calculateFoodCost({
      ...exampleInput,
      servings: 1,
      packagingPerServing: 0,
      laborPerBatch: 0,
      otherDirectCostPerBatch: 0,
      ingredients: [
        { name: "ผัก", purchaseCost: 100, purchaseQuantity: 2, purchaseUnit: "kg", recipeQuantity: 500, recipeUnit: "g", yieldPercent: 50 },
        { name: "น้ำซุป", purchaseCost: 60, purchaseQuantity: 1.5, purchaseUnit: "l", recipeQuantity: 250, recipeUnit: "ml", yieldPercent: 100 },
      ],
    });

    expect(result.ingredientResults[0]!.asPurchasedBaseQuantityNeeded).toBe(1_000);
    expect(result.ingredientResults[0]!.wasteBaseQuantity).toBe(500);
    expect(result.ingredientResults[0]!.lineCost).toBe(50);
    expect(result.ingredientResults[1]!.lineCost).toBe(10);
    expect(result.ingredientCostPerBatch).toBe(60);
  });

  it("returns target price without inventing sales metrics when price is omitted", () => {
    const result = calculateFoodCost({ ...exampleInput, sellingPricePerServing: 0 });

    expect(result.suggestedPricePerServing).toBeCloseTo(74.4642857143, 8);
    expect(result.foodCostPercent).toBeNull();
    expect(result.contributionPerServing).toBeNull();
    expect(result.revenuePerBatch).toBeNull();
    expect(result.foodCostStatus).toBe("not-provided");
  });

  it("flags food cost above the user-defined target", () => {
    const result = calculateFoodCost({ ...exampleInput, sellingPricePerServing: 60 });

    expect(result.foodCostPercent).toBeCloseTo(34.75, 8);
    expect(result.currentPriceGapFromTarget).toBeLessThan(0);
    expect(result.foodCostStatus).toBe("above-target");
  });

  it("rejects incompatible dimensions and invalid quantities", () => {
    expect(() => calculateFoodCost({
      ...exampleInput,
      ingredients: [{ ...exampleInput.ingredients[0]!, recipeUnit: "ml" }],
    })).toThrow("หน่วยคนละประเภท");
    expect(() => calculateFoodCost({ ...exampleInput, servings: 1.5 })).toThrow("จำนวนเสิร์ฟต้องเป็นจำนวนเต็ม");
    expect(() => calculateFoodCost({ ...exampleInput, targetFoodCostPercent: 0 })).toThrow("เป้าหมาย Food cost");
    expect(() => calculateFoodCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, yieldPercent: 0 }] })).toThrow("Yield");
    expect(() => calculateFoodCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, purchaseQuantity: 0 }] })).toThrow("ปริมาณที่ซื้อ");
    expect(() => calculateFoodCost({ ...exampleInput, ingredients: [] })).toThrow("จำนวนวัตถุดิบ");
  });

  it("rejects unsupported values and excessive rows", () => {
    expect(() => calculateFoodCost({ ...exampleInput, currency: "EUR" as FoodCostInput["currency"] })).toThrow("หน่วยเงิน");
    expect(() => calculateFoodCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, purchaseUnit: "cup" as FoodCostInput["ingredients"][number]["purchaseUnit"] }] })).toThrow("หน่วยซื้อ");
    expect(() => calculateFoodCost({
      ...exampleInput,
      ingredients: Array.from({ length: FOOD_COST_MAX_INGREDIENTS + 1 }, (_, index) => ({ ...exampleInput.ingredients[0]!, name: `item-${index}` })),
    })).toThrow("จำนวนวัตถุดิบ");
  });

  it("exports UTF-8 CSV and neutralizes spreadsheet formulas in names", () => {
    const input = { ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, name: "=HYPERLINK(\"https://bad.invalid\")" }] };
    const result = calculateFoodCost(input);
    const csv = foodCostCsv(input, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""https://bad.invalid"")"`);
    expect(csv).toContain('"ต้นทุนวัตถุดิบต่อสูตร","21.60","THB"');
    expect(csv).toContain('"ราคาขายแนะนำจากเป้าหมาย Food cost"');
    expect(csv).not.toContain('"=HYPERLINK');
  });

  it("stays finite at supported upper values", () => {
    const result = calculateFoodCost({
      ...exampleInput,
      servings: 1_000_000,
      sellingPricePerServing: 1_000_000_000,
      targetFoodCostPercent: 0.1,
      packagingPerServing: 1_000,
      laborPerBatch: 1_000_000_000_000,
      otherDirectCostPerBatch: 1_000_000_000_000,
      ingredients: [{ name: "bulk", purchaseCost: 1_000_000_000_000, purchaseQuantity: 1_000_000_000_000, purchaseUnit: "kg", recipeQuantity: 1_000_000_000_000, recipeUnit: "g", yieldPercent: 0.1 }],
    });

    expect(Number.isFinite(result.totalDirectCostPerBatch)).toBe(true);
    expect(Number.isFinite(result.suggestedPricePerServing)).toBe(true);
  });
});
