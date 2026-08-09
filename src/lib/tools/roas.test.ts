import { describe, expect, it } from "vitest";
import { calculateRoas, roasCsv, type RoasInput } from "@/lib/tools/roas";

const example: RoasInput = {
  currency: "THB",
  campaignName: "Summer Cat Campaign",
  grossRevenue: 200_000,
  refunds: 10_000,
  adSpend: 50_000,
  productCost: 70_000,
  paymentFeePercent: 3,
  fulfillmentCost: 15_000,
  otherVariableCost: 5_000,
  orders: 500,
  targetProfitMarginPercent: 15,
};

describe("ROAS calculator", () => {
  it("separates reported revenue ROAS from profit and contribution", () => {
    const result = calculateRoas(example);
    expect(result).toMatchObject({
      netRevenue: 190_000,
      paymentFeeAmount: 5_700,
      variableCostBeforeAds: 95_700,
      contributionBeforeAds: 94_300,
      grossRoas: 4,
      netRoas: 3.8,
      reportedRoasPercent: 380,
      profitAfterAds: 44_300,
      profitReturnOnAdSpendPercent: 88.6,
      status: "profit",
    });
    expect(result.profitMarginPercent).toBeCloseTo(23.31578947, 6);
  });

  it("calculates break-even and target thresholds at the current sales mix", () => {
    const result = calculateRoas(example);
    expect(result.breakEvenRoas).toBeCloseTo(2.01484624, 6);
    expect(result.breakEvenAdSpend).toBe(94_300);
    expect(result.breakEvenAdSpendGap).toBe(44_300);
    expect(result.targetProfitAmount).toBe(28_500);
    expect(result.targetAdSpendCapacity).toBe(65_800);
    expect(result.targetAdSpendGap).toBe(15_800);
    expect(result.targetRoas).toBeCloseTo(2.88753799, 6);
  });

  it("provides CPA and AOV metrics only when an order count is available", () => {
    expect(calculateRoas(example).perOrder).toMatchObject({
      netAverageOrderValue: 380,
      currentCpa: 100,
      breakEvenCpa: 188.6,
      targetCpa: 131.6,
      contributionBeforeAdsPerOrder: 188.6,
      profitAfterAdsPerOrder: 88.6,
    });
    expect(calculateRoas({ ...example, orders: 0 }).perOrder).toBeNull();
  });

  it("shows a loss and stops inventing thresholds when contribution is not positive", () => {
    const loss = calculateRoas({ ...example, grossRevenue: 100_000, refunds: 0, productCost: 50_000, paymentFeePercent: 0, fulfillmentCost: 0, otherVariableCost: 0, adSpend: 60_000 });
    expect(loss).toMatchObject({ status: "loss", profitAfterAds: -10_000, breakEvenRoas: 2, breakEvenAdSpendGap: -10_000 });

    const noContribution = calculateRoas({ ...example, grossRevenue: 100_000, refunds: 0, productCost: 100_000, paymentFeePercent: 0, fulfillmentCost: 0, otherVariableCost: 0 });
    expect(noContribution.breakEvenRoas).toBeNull();
    expect(noContribution.targetRoas).toBeNull();
  });

  it("marks an impossible target instead of returning a negative ad budget", () => {
    const result = calculateRoas({ ...example, grossRevenue: 100_000, refunds: 0, productCost: 80_000, paymentFeePercent: 0, fulfillmentCost: 0, otherVariableCost: 0, targetProfitMarginPercent: 25 });
    expect(result.targetFeasible).toBe(false);
    expect(result.targetAdSpendCapacity).toBeNull();
    expect(result.targetRoas).toBeNull();
  });

  it("validates impossible inputs", () => {
    expect(() => calculateRoas({ ...example, adSpend: 0 })).toThrow("ค่าโฆษณาต้องมากกว่า 0");
    expect(() => calculateRoas({ ...example, refunds: 200_000 })).toThrow("ต้องน้อยกว่ายอดขายรวม");
    expect(() => calculateRoas({ ...example, orders: 1.5 })).toThrow("จำนวนเต็ม");
  });
});

describe("ROAS CSV", () => {
  it("exports a UTF-8 workbook-friendly report and neutralizes formulas", () => {
    const input = { ...example, campaignName: "=HYPERLINK(\"bad\")" };
    const csv = roasCsv(input, calculateRoas(input));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Campaign","\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"Net ROAS","3.8000","x"');
    expect(csv).toContain('"Profit after ads","44300.00","THB"');
  });
});
