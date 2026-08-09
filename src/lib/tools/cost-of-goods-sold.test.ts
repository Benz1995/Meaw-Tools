import { describe, expect, it } from "vitest";
import {
  calculateCostOfGoodsSold,
  costOfGoodsSoldCsv,
  type CostOfGoodsSoldInput,
} from "@/lib/tools/cost-of-goods-sold";

const detailedExample: CostOfGoodsSoldInput = {
  mode: "detailed",
  currency: "THB",
  beginningInventory: 200_000,
  grossPurchases: 700_000,
  purchaseReturns: 30_000,
  purchaseDiscounts: 10_000,
  freightIn: 40_000,
  directLabor: 50_000,
  materialsAndSupplies: 20_000,
  otherDirectCosts: 30_000,
  endingInventory: 250_000,
  netSales: 1_200_000,
  unitsSold: 5_000,
};

describe("cost of goods sold calculator", () => {
  it("calculates the detailed COGS waterfall and optional sales metrics", () => {
    const result = calculateCostOfGoodsSold(detailedExample);

    expect(result.purchaseAdjustments).toBe(40_000);
    expect(result.netPurchases).toBe(700_000);
    expect(result.productionCosts).toBe(100_000);
    expect(result.additionsToInventory).toBe(800_000);
    expect(result.goodsAvailableForSale).toBe(1_000_000);
    expect(result.costOfGoodsSold).toBe(750_000);
    expect(result.inventoryChange).toBe(50_000);
    expect(result.cogsShareOfGoodsAvailable).toBe(75);
    expect(result.endingInventoryShare).toBe(25);
    expect(result.grossProfit).toBe(450_000);
    expect(result.grossMarginPercent).toBe(37.5);
    expect(result.cogsPercentOfSales).toBe(62.5);
    expect(result.markupOnCogsPercent).toBe(60);
    expect(result.costPerUnitSold).toBe(150);
    expect(result.salesStatus).toBe("gross-profit");
  });

  it("supports the basic beginning plus purchases minus ending formula", () => {
    const result = calculateCostOfGoodsSold({
      ...detailedExample,
      mode: "basic",
      grossPurchases: 800_000,
      purchaseReturns: 0,
      purchaseDiscounts: 0,
      freightIn: 0,
      directLabor: 0,
      materialsAndSupplies: 0,
      otherDirectCosts: 0,
      netSales: 0,
      unitsSold: 0,
    });

    expect(result.goodsAvailableForSale).toBe(1_000_000);
    expect(result.costOfGoodsSold).toBe(750_000);
    expect(result.grossProfit).toBeNull();
    expect(result.costPerUnitSold).toBeNull();
    expect(result.salesStatus).toBe("not-provided");
  });

  it("classifies gross break-even and gross loss without hiding negative profit", () => {
    const breakEven = calculateCostOfGoodsSold({ ...detailedExample, netSales: 750_000 });
    const loss = calculateCostOfGoodsSold({ ...detailedExample, netSales: 600_000 });

    expect(breakEven.grossProfit).toBe(0);
    expect(breakEven.salesStatus).toBe("break-even");
    expect(loss.grossProfit).toBe(-150_000);
    expect(loss.grossMarginPercent).toBe(-25);
    expect(loss.cogsPercentOfSales).toBe(125);
    expect(loss.salesStatus).toBe("gross-loss");
  });

  it("allows zero COGS when all goods remain in ending inventory", () => {
    const result = calculateCostOfGoodsSold({
      ...detailedExample,
      endingInventory: 1_000_000,
      netSales: 100_000,
      unitsSold: 10,
    });

    expect(result.costOfGoodsSold).toBe(0);
    expect(result.grossProfit).toBe(100_000);
    expect(result.grossMarginPercent).toBe(100);
    expect(result.markupOnCogsPercent).toBeNull();
    expect(result.costPerUnitSold).toBe(0);
  });

  it("exports a UTF-8 CSV with the full audit trail", () => {
    const result = calculateCostOfGoodsSold(detailedExample);
    const csv = costOfGoodsSoldCsv(detailedExample, result);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"ยอดซื้อสุทธิ","700000.00","THB"');
    expect(csv).toContain('"ต้นทุนสินค้าที่มีไว้ขาย","1000000.00","THB"');
    expect(csv).toContain('"ต้นทุนขาย COGS","750000.00","THB"');
    expect(csv).toContain('"Gross margin","37.50","%"');
    expect(csv).toContain('"COGS ต่อหน่วยที่ขาย","150.00","THB/หน่วย"');
  });

  it("rejects negative fields, unsupported values, and detailed data in basic mode", () => {
    expect(() => calculateCostOfGoodsSold({ ...detailedExample, beginningInventory: -1 })).toThrow("สินค้าคงเหลือต้นงวด");
    expect(() => calculateCostOfGoodsSold({ ...detailedExample, unitsSold: -1 })).toThrow("จำนวนหน่วยที่ขาย");
    expect(() => calculateCostOfGoodsSold({ ...detailedExample, mode: "invalid" as CostOfGoodsSoldInput["mode"] })).toThrow("โหมดคำนวณ");
    expect(() => calculateCostOfGoodsSold({ ...detailedExample, currency: "EUR" as CostOfGoodsSoldInput["currency"] })).toThrow("หน่วยเงิน");
    expect(() => calculateCostOfGoodsSold({ ...detailedExample, mode: "basic" })).toThrow("โหมดพื้นฐาน");
  });

  it("rejects impossible purchase and inventory relationships", () => {
    expect(() => calculateCostOfGoodsSold({
      ...detailedExample,
      grossPurchases: 10_000,
      purchaseReturns: 20_000,
      purchaseDiscounts: 0,
      freightIn: 0,
    })).toThrow("ยอดส่งคืนและส่วนลดรับ");

    expect(() => calculateCostOfGoodsSold({
      ...detailedExample,
      beginningInventory: 0,
      grossPurchases: 0,
      purchaseReturns: 0,
      purchaseDiscounts: 0,
      freightIn: 0,
      directLabor: 0,
      materialsAndSupplies: 0,
      otherDirectCosts: 0,
      endingInventory: 0,
    })).toThrow("สินค้าที่มีไว้ขาย");

    expect(() => calculateCostOfGoodsSold({ ...detailedExample, endingInventory: 1_000_001 })).toThrow("สินค้าคงเหลือปลายงวดสูงกว่า");
  });

  it("remains finite at the supported upper input range", () => {
    const result = calculateCostOfGoodsSold({
      ...detailedExample,
      beginningInventory: 1_000_000_000_000_000,
      grossPurchases: 1_000_000_000_000_000,
      purchaseReturns: 0,
      purchaseDiscounts: 0,
      freightIn: 1_000_000_000_000_000,
      directLabor: 1_000_000_000_000_000,
      materialsAndSupplies: 1_000_000_000_000_000,
      otherDirectCosts: 1_000_000_000_000_000,
      endingInventory: 1_000_000_000_000_000,
      netSales: 1_000_000_000_000_000,
      unitsSold: 1_000_000_000_000,
    });

    expect(result.costOfGoodsSold).toBe(5_000_000_000_000_000);
    expect(Number.isFinite(result.grossMarginPercent)).toBe(true);
    expect(Number.isFinite(result.costPerUnitSold)).toBe(true);
  });
});
