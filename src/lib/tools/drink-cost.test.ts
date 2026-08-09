import { describe, expect, it } from "vitest";
import {
  calculateDrinkCost,
  drinkCostCsv,
  DRINK_COST_MAX_INGREDIENTS,
  US_FL_OZ_IN_ML,
  US_STANDARD_DRINK_PURE_ALCOHOL_ML,
  type DrinkCostInput,
} from "@/lib/tools/drink-cost";

const exampleInput: DrinkCostInput = {
  currency: "THB",
  sellingPricePerDrink: 320,
  targetPourCostPercent: 22,
  extraIngredientCostPerDrink: 4,
  packagingCostPerDrink: 0,
  laborCostPerDrink: 15,
  otherDirectCostPerDrink: 3,
  dilutionVolumeMl: 25,
  ingredients: [
    { name: "Gin", purchaseCost: 690, containerVolume: 750, containerUnit: "ml", pourVolume: 45, pourUnit: "ml", usableYieldPercent: 98, abvPercent: 40 },
    { name: "Liqueur", purchaseCost: 520, containerVolume: 700, containerUnit: "ml", pourVolume: 20, pourUnit: "ml", usableYieldPercent: 98, abvPercent: 20 },
    { name: "Lime", purchaseCost: 120, containerVolume: 1, containerUnit: "l", pourVolume: 25, pourUnit: "ml", usableYieldPercent: 90, abvPercent: 0 },
    { name: "Syrup", purchaseCost: 95, containerVolume: 75, containerUnit: "cl", pourVolume: 15, pourUnit: "ml", usableYieldPercent: 100, abvPercent: 0 },
  ],
};

describe("calculateDrinkCost", () => {
  it("calculates pour cost, direct cost, price and alcohol analysis", () => {
    const result = calculateDrinkCost(exampleInput);

    expect(result.ingredientResults[0]!.lineCost).toBeCloseTo(42.2448979592, 8);
    expect(result.ingredientResults[1]!.lineCost).toBeCloseTo(15.1603498542, 8);
    expect(result.ingredientResults[2]!.lineCost).toBeCloseTo(3.3333333333, 8);
    expect(result.ingredientResults[3]!.lineCost).toBeCloseTo(1.9, 8);
    expect(result.liquidCostPerDrink).toBeCloseTo(62.6385811467, 8);
    expect(result.beverageIngredientCostPerDrink).toBeCloseTo(66.6385811467, 8);
    expect(result.totalDirectCostPerDrink).toBeCloseTo(84.6385811467, 8);
    expect(result.suggestedPricePerDrink).toBeCloseTo(302.9026415759, 8);
    expect(result.currentPourCostPercent).toBeCloseTo(20.8245566083, 8);
    expect(result.directCostPercent).toBeCloseTo(26.4495566083, 8);
    expect(result.contributionPerDrink).toBeCloseTo(235.3614188533, 8);
    expect(result.pourCostStatus).toBe("at-or-below-target");
    expect(result.enteredLiquidVolumeMl).toBe(105);
    expect(result.servedVolumeMl).toBe(130);
    expect(result.pureAlcoholVolumeMl).toBe(22);
    expect(result.estimatedAbvPercent).toBeCloseTo(16.9230769231, 8);
    expect(result.usStandardDrinkEquivalent).toBeCloseTo(22 / US_STANDARD_DRINK_PURE_ALCOHOL_ML, 8);
  });

  it("converts litres, centilitres and U.S. fluid ounces to millilitres", () => {
    const result = calculateDrinkCost({
      ...exampleInput,
      extraIngredientCostPerDrink: 0,
      ingredients: [
        { name: "Bottle", purchaseCost: 100, containerVolume: 1, containerUnit: "l", pourVolume: 1, pourUnit: "us-fl-oz", usableYieldPercent: 100, abvPercent: 0 },
      ],
    });

    expect(result.ingredientResults[0]!.containerVolumeMl).toBe(1_000);
    expect(result.ingredientResults[0]!.pourVolumeMl).toBeCloseTo(US_FL_OZ_IN_ML, 10);
    expect(result.liquidCostPerDrink).toBeCloseTo(2.95735295625, 10);
  });

  it("does not invent sales metrics when selling price is omitted", () => {
    const result = calculateDrinkCost({ ...exampleInput, sellingPricePerDrink: 0 });

    expect(result.suggestedPricePerDrink).toBeCloseTo(302.9026415759, 8);
    expect(result.currentPourCostPercent).toBeNull();
    expect(result.directCostPercent).toBeNull();
    expect(result.contributionPerDrink).toBeNull();
    expect(result.pourCostStatus).toBe("not-provided");
  });

  it("flags pour cost above the user-defined target", () => {
    const result = calculateDrinkCost({ ...exampleInput, sellingPricePerDrink: 250 });

    expect(result.currentPourCostPercent).toBeCloseTo(26.6554324587, 8);
    expect(result.priceGapFromTarget).toBeLessThan(0);
    expect(result.pourCostStatus).toBe("above-target");
  });

  it("supports non-alcoholic recipes without division errors", () => {
    const result = calculateDrinkCost({
      ...exampleInput,
      ingredients: exampleInput.ingredients.map((ingredient) => ({ ...ingredient, abvPercent: 0 })),
    });

    expect(result.pureAlcoholVolumeMl).toBe(0);
    expect(result.estimatedAbvPercent).toBe(0);
    expect(result.usStandardDrinkEquivalent).toBe(0);
  });

  it("rejects invalid units, bounds and excessive rows", () => {
    expect(() => calculateDrinkCost({ ...exampleInput, currency: "EUR" as DrinkCostInput["currency"] })).toThrow("หน่วยเงิน");
    expect(() => calculateDrinkCost({ ...exampleInput, targetPourCostPercent: 0 })).toThrow("Pour cost");
    expect(() => calculateDrinkCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, containerUnit: "cup" as DrinkCostInput["ingredients"][number]["containerUnit"] }] })).toThrow("หน่วยขวด");
    expect(() => calculateDrinkCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, containerVolume: 0 }] })).toThrow("ปริมาตรขวด");
    expect(() => calculateDrinkCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, usableYieldPercent: 0 }] })).toThrow("Yield");
    expect(() => calculateDrinkCost({ ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, abvPercent: 101 }] })).toThrow("ABV");
    expect(() => calculateDrinkCost({ ...exampleInput, ingredients: [] })).toThrow("จำนวนของเหลว");
    expect(() => calculateDrinkCost({ ...exampleInput, ingredients: Array.from({ length: DRINK_COST_MAX_INGREDIENTS + 1 }, (_, index) => ({ ...exampleInput.ingredients[0]!, name: `item-${index}` })) })).toThrow("จำนวนของเหลว");
  });

  it("exports UTF-8 CSV and neutralizes spreadsheet formulas in names", () => {
    const input = { ...exampleInput, ingredients: [{ ...exampleInput.ingredients[0]!, name: "=HYPERLINK(\"https://bad.invalid\")" }] };
    const result = calculateDrinkCost(input);
    const csv = drinkCostCsv(input, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""https://bad.invalid"")"`);
    expect(csv).toContain('"ต้นทุนวัตถุดิบเครื่องดื่มต่อแก้ว"');
    expect(csv).toContain('"U.S. standard drink โดยประมาณ"');
    expect(csv).not.toContain('"=HYPERLINK');
  });

  it("stays finite at supported upper values", () => {
    const result = calculateDrinkCost({
      ...exampleInput,
      sellingPricePerDrink: 1_000_000_000_000,
      targetPourCostPercent: 0.1,
      ingredients: [{ name: "bulk", purchaseCost: 1_000_000_000_000, containerVolume: 1_000_000_000_000, containerUnit: "ml", pourVolume: 1_000_000_000_000, pourUnit: "ml", usableYieldPercent: 100, abvPercent: 100 }],
      extraIngredientCostPerDrink: 0,
      packagingCostPerDrink: 0,
      laborCostPerDrink: 0,
      otherDirectCostPerDrink: 0,
      dilutionVolumeMl: 1_000_000_000_000,
    });

    expect(Number.isFinite(result.totalDirectCostPerDrink)).toBe(true);
    expect(Number.isFinite(result.usStandardDrinkEquivalent)).toBe(true);
  });
});
