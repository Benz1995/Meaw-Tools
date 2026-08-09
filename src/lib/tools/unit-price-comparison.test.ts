import { describe, expect, it } from "vitest";
import {
  calculateUnitPriceComparison,
  convertUnitPriceQuantity,
  unitPriceComparisonCsv,
  type UnitPriceComparisonInput,
} from "@/lib/tools/unit-price-comparison";

function exampleInput(overrides: Partial<UnitPriceComparisonInput> = {}): UnitPriceComparisonInput {
  return {
    currency: "THB",
    comparisonName: "เทียบกาแฟสามแพ็ก",
    dimension: "mass",
    targetAmount: 100,
    targetUnit: "g",
    items: [
      { name: "ถุง 500 กรัม", listedPrice: 65, packageCount: 1, amountPerPackage: 500, unit: "g", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
      { name: "ถุง 1 กิโลกรัม", listedPrice: 119, packageCount: 1, amountPerPackage: 1, unit: "kg", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
      { name: "แพ็ก 3 ถุง", listedPrice: 135, packageCount: 3, amountPerPackage: 400, unit: "g", discountPercent: 10, fixedDiscount: 0, extraCost: 5 },
    ],
    ...overrides,
  };
}

describe("calculateUnitPriceComparison", () => {
  it("normalizes package sizes, discounts, and extra cost to the same mass basis", () => {
    const result = calculateUnitPriceComparison(exampleInput());

    expect(result.targetLabel).toBe("100 g");
    expect(result.rows[0]?.pricePerTarget).toBeCloseTo(13, 10);
    expect(result.rows[1]?.pricePerTarget).toBeCloseTo(11.9, 10);
    expect(result.rows[2]?.effectiveCost).toBeCloseTo(126.5, 10);
    expect(result.rows[2]?.pricePerTarget).toBeCloseTo(10.5416666667, 9);
    expect(result.ranking.map((row) => row.name)).toEqual(["แพ็ก 3 ถุง", "ถุง 1 กิโลกรัม", "ถุง 500 กรัม"]);
    expect(result.cheapestItemIndices).toEqual([2]);
    expect(result.maximumSavingsPerTarget).toBeCloseTo(2.4583333333, 9);
  });

  it("applies percent discount, then fixed discount, then extra cost", () => {
    const result = calculateUnitPriceComparison(exampleInput({
      items: [
        { name: "มีส่วนลด", listedPrice: 100, packageCount: 1, amountPerPackage: 10, unit: "g", discountPercent: 10, fixedDiscount: 5, extraCost: 7 },
        { name: "ราคาปกติ", listedPrice: 100, packageCount: 1, amountPerPackage: 10, unit: "g", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
      ],
      targetAmount: 10,
    }));

    expect(result.rows[0]).toMatchObject({ percentDiscountAmount: 10, priceAfterPercentDiscount: 90, effectiveCost: 92 });
    expect(result.rows[0]?.isCheapest).toBe(true);
  });

  it("converts exact customary mass factors and supported liquid volume factors", () => {
    expect(convertUnitPriceQuantity(1, "lb", "g")).toBeCloseTo(453.59237, 10);
    expect(convertUnitPriceQuantity(16, "oz", "lb")).toBeCloseTo(1, 10);
    expect(convertUnitPriceQuantity(1, "gallon-us", "ml")).toBeCloseTo(3_785.411784, 9);
    expect(convertUnitPriceQuantity(1, "fl-oz-us", "ml")).toBeCloseTo(29.57353, 8);
  });

  it("supports count-based multipacks", () => {
    const result = calculateUnitPriceComparison(exampleInput({
      dimension: "count",
      targetAmount: 1,
      targetUnit: "item",
      items: [
        { name: "กล่องเล็ก", listedPrice: 30, packageCount: 1, amountPerPackage: 6, unit: "item", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
        { name: "แพ็กคู่", listedPrice: 50, packageCount: 2, amountPerPackage: 6, unit: "item", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
      ],
    }));

    expect(result.rows[0]?.pricePerTarget).toBe(5);
    expect(result.rows[1]?.pricePerTarget).toBeCloseTo(50 / 12, 10);
    expect(result.ranking[0]?.name).toBe("แพ็กคู่");
  });

  it("keeps equal prices tied with a stable input order", () => {
    const result = calculateUnitPriceComparison(exampleInput({
      items: [
        { name: "ครึ่งกิโล", listedPrice: 50, packageCount: 1, amountPerPackage: 500, unit: "g", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
        { name: "หนึ่งกิโล", listedPrice: 100, packageCount: 1, amountPerPackage: 1, unit: "kg", discountPercent: 0, fixedDiscount: 0, extraCost: 0 },
      ],
    }));

    expect(result.cheapestItemIndices).toEqual([0, 1]);
    expect(result.ranking.map((row) => row.rank)).toEqual([1, 1]);
    expect(result.ranking.map((row) => row.name)).toEqual(["ครึ่งกิโล", "หนึ่งกิโล"]);
  });

  it("rejects invalid dimensions, counts, discounts, quantities, and non-positive payable totals", () => {
    expect(() => calculateUnitPriceComparison(exampleInput({ items: [exampleInput().items[0]!] }))).toThrow(/2–20/);
    expect(() => calculateUnitPriceComparison(exampleInput({ targetUnit: "ml" }))).toThrow(/หน่วยฐาน/);
    expect(() => calculateUnitPriceComparison(exampleInput({ items: [{ ...exampleInput().items[0]!, unit: "ml" }, exampleInput().items[1]!] }))).toThrow(/หน่วยของรายการ/);
    expect(() => calculateUnitPriceComparison(exampleInput({ items: [{ ...exampleInput().items[0]!, packageCount: 1.5 }, exampleInput().items[1]!] }))).toThrow(/จำนวนเต็ม/);
    expect(() => calculateUnitPriceComparison(exampleInput({ items: [{ ...exampleInput().items[0]!, discountPercent: 101 }, exampleInput().items[1]!] }))).toThrow(/ส่วนลดเปอร์เซ็นต์/);
    expect(() => calculateUnitPriceComparison(exampleInput({ items: [{ ...exampleInput().items[0]!, fixedDiscount: 66 }, exampleInput().items[1]!] }))).toThrow(/ห้ามเกิน/);
    expect(() => calculateUnitPriceComparison(exampleInput({ items: [{ ...exampleInput().items[0]!, discountPercent: 100 }, exampleInput().items[1]!] }))).toThrow(/ยอดจ่ายจริง/);
    expect(() => calculateUnitPriceComparison(exampleInput({ dimension: "count", targetUnit: "item", targetAmount: 0.5, items: [
      { ...exampleInput().items[0]!, unit: "item", amountPerPackage: 1 },
      { ...exampleInput().items[1]!, unit: "item", amountPerPackage: 2 },
    ] }))).toThrow(/ฐานจำนวนชิ้น/);
    expect(() => calculateUnitPriceComparison(exampleInput({ dimension: "count", targetUnit: "item", targetAmount: 1, items: [
      { ...exampleInput().items[0]!, unit: "item", amountPerPackage: 1.5 },
      { ...exampleInput().items[1]!, unit: "item", amountPerPackage: 2 },
    ] }))).toThrow(/จำนวนชิ้นต่อแพ็ก/);
  });
});

describe("unit price comparison CSV", () => {
  it("adds a UTF-8 BOM and neutralizes spreadsheet formulas in user labels", () => {
    const input = exampleInput({
      comparisonName: "=HYPERLINK(\"https://example.com\")",
      items: [
        { ...exampleInput().items[0]!, name: "+SUM(A1:A2)" },
        exampleInput().items[1]!,
      ],
    });
    const csv = unitPriceComparisonCsv(input, calculateUnitPriceComparison(input));

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).toContain('"Rank","Product","Listed price"');
    expect(csv).toContain('"Comparison basis","100 g"');
  });
});
