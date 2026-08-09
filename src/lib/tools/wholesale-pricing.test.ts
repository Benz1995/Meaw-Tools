import { describe, expect, it } from "vitest";
import {
  calculateWholesalePricing,
  wholesalePricingCsv,
  type WholesalePricingInput,
} from "@/lib/tools/wholesale-pricing";

const example: WholesalePricingInput = {
  currency: "THB",
  productName: "กระเป๋าผ้าแมว",
  costs: {
    materials: 100,
    packaging: 20,
    labor: 35,
    fulfillment: 10,
    inbound: 5,
    overhead: 8,
    other: 2,
  },
  channels: [
    { name: "ขายส่งร้านคู่ค้า", orderQuantity: 50, variableFeePercent: 2, fixedFeePerOrder: 100, fixedFeePerUnit: 0, targetMarginPercent: 25, downstreamMarginPercent: 40 },
    { name: "ร้านออนไลน์ของเรา", orderQuantity: 1, variableFeePercent: 3, fixedFeePerOrder: 0, fixedFeePerUnit: 10, targetMarginPercent: 40, downstreamMarginPercent: 0 },
    { name: "Marketplace", orderQuantity: 1, variableFeePercent: 15, fixedFeePerOrder: 0, fixedFeePerUnit: 20, targetMarginPercent: 30, downstreamMarginPercent: 0 },
  ],
};

describe("wholesale and retail pricing", () => {
  it("solves the required price after blended fees and target seller margin", () => {
    const result = calculateWholesalePricing(example);
    expect(result.unitCost).toBe(180);
    expect(result.channels[0]!.requiredPrice).toBeCloseTo(249.3151, 4);
    expect(result.channels[0]!.actualMarginPercent).toBeCloseTo(25, 10);
    expect(result.channels[0]!.suggestedRetailPrice).toBeCloseTo(415.5251, 4);
    expect(result.channels[1]!.requiredPrice).toBeCloseTo(333.3333, 4);
    expect(result.channels[2]!.requiredPrice).toBeCloseTo(363.6364, 4);
    expect(result.priceSpread).toBeCloseTo(114.3213, 4);
  });

  it("allocates an order-level fee by quantity before solving price", () => {
    const result = calculateWholesalePricing({
      ...example,
      channels: [{ name: "B2B", orderQuantity: 20, variableFeePercent: 0, fixedFeePerOrder: 200, fixedFeePerUnit: 5, targetMarginPercent: 20, downstreamMarginPercent: 0 }],
    });
    expect(result.channels[0]!.allocatedOrderFeePerUnit).toBe(10);
    expect(result.channels[0]!.requiredPrice).toBeCloseTo(243.75, 10);
    expect(result.channels[0]!.profitPerUnit).toBeCloseTo(48.75, 10);
  });

  it("rejects impossible fee and margin combinations", () => {
    expect(() => calculateWholesalePricing({
      ...example,
      channels: [{ ...example.channels[0]!, variableFeePercent: 40, targetMarginPercent: 60 }],
    })).toThrow("ต้องน้อยกว่า 100%");
  });

  it("requires positive unit cost, integer order quantity, and bounded channel count", () => {
    expect(() => calculateWholesalePricing({ ...example, costs: Object.fromEntries(Object.keys(example.costs).map((key) => [key, 0])) as WholesalePricingInput["costs"] })).toThrow("ต้นทุนรวมต่อหน่วย");
    expect(() => calculateWholesalePricing({ ...example, channels: [{ ...example.channels[0]!, orderQuantity: 1.5 }] })).toThrow("จำนวนเต็ม");
    expect(() => calculateWholesalePricing({ ...example, channels: [] })).toThrow("1–6");
  });
});

describe("wholesale pricing CSV", () => {
  it("exports a UTF-8 BOM and neutralizes spreadsheet formulas in user names", () => {
    const input = { ...example, productName: "=HYPERLINK(\"bad\")", channels: [{ ...example.channels[0]!, name: "+SUM(1,1)" }] };
    const csv = wholesalePricingCsv(input, calculateWholesalePricing(input));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"Product\",\"'=HYPERLINK(\"\"bad\"\")\"");
    expect(csv).toContain("\"'+SUM(1,1)\"");
    expect(csv).toContain("\"Required price\"");
  });
});
