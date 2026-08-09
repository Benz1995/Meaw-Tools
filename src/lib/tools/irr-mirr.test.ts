import { describe, expect, it } from "vitest";
import {
  calculateIrrMirr,
  irrMirrCsv,
  netPresentValue,
  type IrrMirrInput,
} from "@/lib/tools/irr-mirr";

function input(cashFlows: number[], overrides: Partial<IrrMirrInput> = {}): IrrMirrInput {
  return {
    currency: "THB",
    scenarioName: "โครงการตัวอย่าง",
    periodUnit: "year",
    annualHurdleRatePercent: 10,
    annualFinanceRatePercent: 10,
    annualReinvestmentRatePercent: 12,
    cashFlows: cashFlows.map((amount, period) => ({ label: period ? `ปี ${period}` : "เงินลงทุนเริ่มต้น", amount })),
    ...overrides,
  };
}

describe("calculateIrrMirr", () => {
  it("finds a unique conventional IRR and produces a near-zero NPV residual", () => {
    const result = calculateIrrMirr(input([-100, 60, 60]));

    expect(result.cashFlowPattern).toBe("conventional-investment");
    expect(result.signChanges).toBe(1);
    expect(result.rootStatus).toBe("unique");
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]!.periodicRatePercent).toBeCloseTo(13.0662386, 6);
    expect(result.roots[0]!.annualEffectiveRatePercent).toBeCloseTo(13.0662386, 6);
    expect(Math.abs(result.roots[0]!.npvResidual)).toBeLessThan(1e-7);
  });

  it("includes a valid negative IRR above -100% and classifies financing cash flow", () => {
    const investment = calculateIrrMirr(input([-100, 90]));
    const financing = calculateIrrMirr(input([100, -110]));

    expect(investment.rootStatus).toBe("unique");
    expect(investment.roots[0]!.periodicRatePercent).toBeCloseTo(-10, 8);
    expect(financing.cashFlowPattern).toBe("conventional-financing");
    expect(financing.roots[0]!.periodicRatePercent).toBeCloseTo(10, 8);
  });

  it("isolates both IRRs for a non-conventional cash-flow series", () => {
    const result = calculateIrrMirr(input([-100, 230, -132]));

    expect(result.cashFlowPattern).toBe("non-conventional");
    expect(result.signChanges).toBe(2);
    expect(result.rootStatus).toBe("multiple");
    expect(result.roots.map((root) => root.periodicRatePercent)).toEqual([
      expect.closeTo(10, 6),
      expect.closeTo(20, 6),
    ]);
  });

  it("detects a repeated root that only touches the NPV axis", () => {
    const result = calculateIrrMirr(input([-100, 200, -100]));

    expect(result.rootStatus).toBe("ambiguous");
    expect(result.signChanges).toBe(2);
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]!.periodicRatePercent).toBeCloseTo(0, 8);
  });

  it("reports no real periodic IRR when the NPV profile never reaches zero", () => {
    const result = calculateIrrMirr(input([-100, 50, -10]));

    expect(result.rootStatus).toBe("none");
    expect(result.roots).toEqual([]);
    expect(result.signChanges).toBe(2);
  });

  it("distinguishes a conventional root beyond the documented search range", () => {
    const result = calculateIrrMirr(input([-1, 1_002]));

    expect(result.rootStatus).toBe("outside-range");
    expect(result.roots).toEqual([]);
    expect(result.signChanges).toBe(1);
  });

  it("calculates MIRR from financed outflows and reinvested inflows", () => {
    const result = calculateIrrMirr(input([-1_000, 500, 400, 300]));
    const expectedMirr = Math.pow((500 * 1.12 ** 2 + 400 * 1.12 + 300) / 1_000, 1 / 3) - 1;

    expect(result.presentValueOfNegativeCashFlows).toBe(-1_000);
    expect(result.futureValueOfPositiveCashFlows).toBeCloseTo(1_375.2, 8);
    expect(result.mirrPeriodicRatePercent).toBeCloseTo(expectedMirr * 100, 8);
    expect(result.mirrAnnualEffectiveRatePercent).toBeCloseTo(expectedMirr * 100, 8);
  });

  it("annualizes a monthly IRR and converts annual assumptions to periodic rates", () => {
    const result = calculateIrrMirr(input([-100, 110], { periodUnit: "month", annualHurdleRatePercent: 12 }));

    expect(result.roots[0]!.periodicRatePercent).toBeCloseTo(10, 8);
    expect(result.roots[0]!.annualEffectiveRatePercent).toBeCloseTo((1.1 ** 12 - 1) * 100, 7);
    expect(result.periodicHurdleRatePercent).toBeCloseTo((1.12 ** (1 / 12) - 1) * 100, 10);
  });

  it("keeps NPV and profile values consistent at the hurdle rate", () => {
    const result = calculateIrrMirr(input([-1_000, 500, 400, 300]));
    expect(result.netPresentValueAtHurdleRate).toBeCloseTo(netPresentValue([-1_000, 500, 400, 300], 0.1), 10);
    const hurdlePoint = result.profile.find((point) => Math.abs(point.periodicRatePercent - 10) < 1e-8);
    expect(hurdlePoint?.netPresentValue).toBeCloseTo(result.netPresentValueAtHurdleRate, 8);
  });

  it("rejects missing signs, unsupported rates, and invalid row metadata", () => {
    expect(() => calculateIrrMirr(input([100, 50]))).toThrow(/ค่าติดลบ/);
    expect(() => calculateIrrMirr(input([-100, 50], { annualFinanceRatePercent: -100 }))).toThrow(/Finance rate/);
    expect(() => calculateIrrMirr(input([-100, 50], { cashFlows: [{ label: " ", amount: -100 }, { label: "ปี 1", amount: 50 }] }))).toThrow(/ชื่องวด/);
    expect(() => calculateIrrMirr(input([-100]))).toThrow(/2–61/);
  });

  it("exports UTF-8 CSV and neutralizes spreadsheet formulas", () => {
    const unsafe = input([-100, 120], {
      scenarioName: "=HYPERLINK(\"https://example.com\")",
      cashFlows: [{ label: "+ลงทุน", amount: -100 }, { label: "@รับคืน", amount: 120 }],
    });
    const csv = irrMirrCsv(unsafe, calculateIrrMirr(unsafe));

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+ลงทุน");
    expect(csv).toContain("'@รับคืน");
    expect(csv).toContain('"MIRR"');
  });
});
