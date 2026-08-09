import { describe, expect, it } from "vitest";
import {
  calculatePayback,
  PAYBACK_MAX_MONEY,
  paybackCsv,
  type PaybackInput,
} from "@/lib/tools/payback-period";

function exampleInput(overrides: Partial<PaybackInput> = {}): PaybackInput {
  return {
    currency: "THB",
    scenarioName: "เครื่องจักรใหม่",
    periodUnit: "year",
    initialInvestment: 160_000,
    annualDiscountRatePercent: 9,
    targetPaybackPeriods: 5,
    terminalValue: 0,
    cashFlows: [20_000, 40_000, 50_000, 50_000, 50_000, 50_000].map((amount, index) => ({ label: `ปี ${index + 1}`, amount })),
    ...overrides,
  };
}

describe("calculatePayback", () => {
  it("calculates simple payback, discounted payback, and NPV for uneven cash flows", () => {
    const result = calculatePayback(exampleInput());

    expect(result.simplePayback?.exactPeriods).toBe(4);
    expect(result.discountedPayback?.exactPeriods).toBeCloseTo(5.048876, 6);
    expect(result.periodicDiscountRatePercent).toBeCloseTo(9, 10);
    expect(result.presentValueOfFutureCashFlows).toBeCloseTo(188_356.19, 0);
    expect(result.netPresentValue).toBeCloseTo(28_356.19, 0);
    expect(result.timeline[4]!.cumulativeDiscountedCashFlow).toBeCloseTo(-1_457.24, 0);
    expect(result.simpleRecoveryIsSustained).toBe(true);
    expect(result.discountedRecoveryIsSustained).toBe(true);
  });

  it("converts an effective annual discount rate to a monthly rate", () => {
    const result = calculatePayback(exampleInput({
      periodUnit: "month",
      annualDiscountRatePercent: 12,
      initialInvestment: 1_000,
      cashFlows: [{ label: "เดือน 1", amount: 1_100 }],
    }));

    expect(result.periodicDiscountRatePercent).toBeCloseTo((Math.pow(1.12, 1 / 12) - 1) * 100, 10);
    expect(result.discountedPayback?.exactPeriods).toBeGreaterThan(result.simplePayback?.exactPeriods ?? 0);
  });

  it("adds terminal value only to the final period", () => {
    const result = calculatePayback(exampleInput({
      initialInvestment: 100,
      annualDiscountRatePercent: 0,
      terminalValue: 40,
      cashFlows: [{ label: "ปี 1", amount: 20 }, { label: "ปี 2", amount: 40 }],
    }));

    expect(result.timeline[0]!.terminalValue).toBe(0);
    expect(result.timeline[1]!.totalCashFlow).toBe(80);
    expect(result.simplePayback?.exactPeriods).toBe(2);
  });

  it("reports unrecovered investment at the selected horizon", () => {
    const result = calculatePayback(exampleInput({
      initialInvestment: 1_000,
      annualDiscountRatePercent: 10,
      cashFlows: [{ label: "ปี 1", amount: 100 }, { label: "ปี 2", amount: 100 }],
    }));

    expect(result.simplePayback).toBeNull();
    expect(result.discountedPayback).toBeNull();
    expect(result.simpleRemainingAtHorizon).toBe(800);
    expect(result.discountedRemainingAtHorizon).toBeGreaterThan(800);
  });

  it("flags a recovery that later becomes negative again", () => {
    const result = calculatePayback(exampleInput({
      initialInvestment: 100,
      annualDiscountRatePercent: 0,
      cashFlows: [
        { label: "ปี 1", amount: 120 },
        { label: "ปี 2", amount: -50 },
        { label: "ปี 3", amount: 40 },
      ],
    }));

    expect(result.simplePayback?.exactPeriods).toBeCloseTo(100 / 120, 10);
    expect(result.simpleRecoveryIsSustained).toBe(false);
    expect(result.hasNegativeFutureCashFlow).toBe(true);
  });

  it("rejects unsupported values and excessive ranges", () => {
    expect(() => calculatePayback(exampleInput({ currency: "CAD" as PaybackInput["currency"] }))).toThrow(/หน่วยเงิน/);
    expect(() => calculatePayback(exampleInput({ scenarioName: " " }))).toThrow(/ชื่อ Scenario/);
    expect(() => calculatePayback(exampleInput({ initialInvestment: 0 }))).toThrow(/เงินลงทุนเริ่มต้น/);
    expect(() => calculatePayback(exampleInput({ annualDiscountRatePercent: -1 }))).toThrow(/อัตราคิดลด/);
    expect(() => calculatePayback(exampleInput({ cashFlows: [] }))).toThrow(/1–60/);
    expect(() => calculatePayback(exampleInput({ cashFlows: [{ label: " ", amount: 1 }] }))).toThrow(/ชื่องวด/);
    expect(() => calculatePayback(exampleInput({ terminalValue: PAYBACK_MAX_MONEY + 1 }))).toThrow(/มูลค่าคงเหลือ/);
  });

  it("exports UTF-8 CSV and neutralizes spreadsheet formulas", () => {
    const input = exampleInput({
      scenarioName: "=HYPERLINK(\"https://example.com\")",
      cashFlows: [{ label: "+SUM(A1:A2)", amount: 200_000 }],
    });
    const csv = paybackCsv(input, calculatePayback(input));

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM");
    expect(csv).toContain('"Net present value (NPV)"');
  });
});
