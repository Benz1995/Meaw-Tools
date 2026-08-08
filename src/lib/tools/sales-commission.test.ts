import { describe, expect, it } from "vitest";
import {
  calculateSalesCommission,
  salesCommissionCsv,
  type SalesCommissionInput,
} from "@/lib/tools/sales-commission";

const exampleInput: SalesCommissionInput = {
  planType: "marginal",
  basis: "revenue",
  grossSales: 120_000,
  refunds: 5_000,
  directCosts: 0,
  salesCreditPercent: 100,
  flatRatePercent: 5,
  tiers: [
    { threshold: 0, ratePercent: 4 },
    { threshold: 50_000, ratePercent: 8 },
    { threshold: 100_000, ratePercent: 12 },
  ],
  quota: 100_000,
  quotaBonus: 1_000,
  payoutAdjustment: -500,
  payoutCap: 8_000,
  basePay: 25_000,
  periodsPerYear: 12,
};

describe("sales commission calculator", () => {
  it("calculates marginal tiers, quota bonus, clawback, cap, and annualized earnings", () => {
    const result = calculateSalesCommission(exampleInput);
    expect(result).toMatchObject({
      netSales: 115_000,
      creditedNetSales: 115_000,
      eligibleCommissionBase: 115_000,
      commissionBeforeBonuses: 7_800,
      selectedRatePercent: 12,
      marginalCommission: 7_800,
      retroactiveCommission: 13_800,
      quotaBonusEarned: 1_000,
      quotaReached: true,
      rawVariablePayout: 8_300,
      payoutBeforeCap: 8_300,
      capReduction: 300,
      finalCommissionPayout: 8_000,
      totalPeriodEarnings: 33_000,
      annualizedCommissionPayout: 96_000,
      annualizedTotalEarnings: 396_000,
      amountToQuota: 0,
      nextTierThreshold: null,
      amountToNextTier: null,
    });
    expect(result.quotaAttainmentPercent).toBeCloseTo(115, 10);
    expect(result.effectivePayoutRatePercent).toBeCloseTo(8_000 / 115_000 * 100, 10);
    expect(result.tierBreakdown.map((row) => row.amountInTier)).toEqual([50_000, 50_000, 15_000]);
    expect(result.tierBreakdown.map((row) => row.commission)).toEqual([2_000, 4_000, 1_800]);
  });

  it("distinguishes retroactive payout from marginal payout at a tier threshold", () => {
    const marginal = calculateSalesCommission({
      ...exampleInput,
      grossSales: 50_000,
      refunds: 0,
      quota: 0,
      quotaBonus: 0,
      payoutAdjustment: 0,
      payoutCap: 0,
    });
    const retroactive = calculateSalesCommission({
      ...exampleInput,
      planType: "retroactive",
      grossSales: 50_000,
      refunds: 0,
      quota: 0,
      quotaBonus: 0,
      payoutAdjustment: 0,
      payoutCap: 0,
    });
    expect(marginal.commissionBeforeBonuses).toBe(2_000);
    expect(marginal.selectedRatePercent).toBe(8);
    expect(retroactive.commissionBeforeBonuses).toBe(4_000);
    expect(retroactive.tierBreakdown).toEqual([{
      tierIndex: 1,
      threshold: 50_000,
      nextThreshold: 100_000,
      amountInTier: 50_000,
      ratePercent: 8,
      commission: 4_000,
    }]);
  });

  it("handles flat commission with refunds and shared sales credit", () => {
    const result = calculateSalesCommission({
      ...exampleInput,
      planType: "flat",
      grossSales: 100_000,
      refunds: 10_000,
      salesCreditPercent: 50,
      flatRatePercent: 10,
      quota: 0,
      quotaBonus: 0,
      payoutAdjustment: 0,
      payoutCap: 0,
    });
    expect(result.netSales).toBe(90_000);
    expect(result.creditedNetSales).toBe(45_000);
    expect(result.eligibleCommissionBase).toBe(45_000);
    expect(result.commissionBeforeBonuses).toBe(4_500);
    expect(result.finalCommissionPayout).toBe(4_500);
    expect(result.marginalCommission).toBeNull();
    expect(result.tierBreakdown).toEqual([]);
  });

  it("uses non-negative credited gross profit as the commission basis", () => {
    const profitable = calculateSalesCommission({
      ...exampleInput,
      planType: "flat",
      basis: "gross-profit",
      grossSales: 100_000,
      refunds: 10_000,
      directCosts: 50_000,
      salesCreditPercent: 50,
      flatRatePercent: 10,
      quota: 0,
      quotaBonus: 0,
      payoutAdjustment: 0,
      payoutCap: 0,
    });
    const loss = calculateSalesCommission({ ...profitableInput(), directCosts: 120_000 });
    expect(profitable.creditedNetSales).toBe(45_000);
    expect(profitable.creditedDirectCosts).toBe(25_000);
    expect(profitable.creditedGrossProfit).toBe(20_000);
    expect(profitable.finalCommissionPayout).toBe(2_000);
    expect(loss.creditedGrossProfit).toBe(-15_000);
    expect(loss.eligibleCommissionBase).toBe(0);
    expect(loss.finalCommissionPayout).toBe(0);
    expect(loss.effectivePayoutRatePercent).toBeNull();
  });

  it("floors a negative adjusted payout at zero", () => {
    const result = calculateSalesCommission({
      ...exampleInput,
      planType: "flat",
      grossSales: 10_000,
      refunds: 0,
      flatRatePercent: 5,
      quota: 0,
      quotaBonus: 0,
      payoutAdjustment: -1_000,
      payoutCap: 0,
    });
    expect(result.commissionBeforeBonuses).toBe(500);
    expect(result.rawVariablePayout).toBe(-500);
    expect(result.floorReduction).toBe(500);
    expect(result.finalCommissionPayout).toBe(0);
  });

  it("exports UTF-8 CSV with payout and tier audit rows", () => {
    const result = calculateSalesCommission(exampleInput);
    const csv = salesCommissionCsv(exampleInput, result, "THB");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Commission payout สุทธิ","8000.00","THB"');
    expect(csv).toContain('"ขั้น 1","0.00","50000.00","50000.00","4.00","2000.00","THB"');
    expect(csv).toContain('"ขั้น 3","100000.00","ไม่จำกัด","15000.00","12.00","1800.00","THB"');
  });

  it("rejects invalid amounts, plans, tiers, rates, and periods", () => {
    expect(() => calculateSalesCommission({ ...exampleInput, grossSales: 0 })).toThrow("ยอดขายรวม");
    expect(() => calculateSalesCommission({ ...exampleInput, refunds: 120_001 })).toThrow("ต้องไม่เกินยอดขายรวม");
    expect(() => calculateSalesCommission({ ...exampleInput, salesCreditPercent: 101 })).toThrow("สัดส่วนเครดิตยอดขาย");
    expect(() => calculateSalesCommission({ ...exampleInput, periodsPerYear: 12.5 })).toThrow("จำนวนเต็ม");
    expect(() => calculateSalesCommission({ ...exampleInput, planType: "ladder" as "flat" })).toThrow("รูปแบบแผน");
    expect(() => calculateSalesCommission({ ...exampleInput, tiers: [{ threshold: 10, ratePercent: 5 }] })).toThrow("ขั้นแรก");
    expect(() => calculateSalesCommission({ ...exampleInput, tiers: [{ threshold: 0, ratePercent: 5 }, { threshold: 0, ratePercent: 8 }] })).toThrow("ห้ามซ้ำ");
    expect(() => calculateSalesCommission({ ...exampleInput, tiers: [{ threshold: 0, ratePercent: 1_001 }] })).toThrow("อัตราขั้น");
    expect(() => calculateSalesCommission({ ...exampleInput, directCosts: Number.NaN })).toThrow("ต้นทุนตรง");
  });
});

function profitableInput(): SalesCommissionInput {
  return {
    ...exampleInput,
    planType: "flat",
    basis: "gross-profit",
    grossSales: 100_000,
    refunds: 10_000,
    directCosts: 50_000,
    salesCreditPercent: 50,
    flatRatePercent: 10,
    quota: 0,
    quotaBonus: 0,
    payoutAdjustment: 0,
    payoutCap: 0,
  };
}
