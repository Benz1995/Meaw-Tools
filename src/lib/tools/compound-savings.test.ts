import { describe, expect, it } from "vitest";
import {
  calculateCompoundSavings,
  compoundSavingsCsv,
  SAVINGS_MAX_MONEY,
  type CompoundSavingsInput,
} from "@/lib/tools/compound-savings";

function exampleInput(overrides: Partial<CompoundSavingsInput> = {}): CompoundSavingsInput {
  return {
    currency: "THB",
    scenarioName: "Microsoft FV example",
    mode: "projection",
    initialAmount: 1_000,
    recurringContribution: 100,
    targetAmount: 0,
    years: 1,
    annualNominalRatePercent: 6,
    compoundFrequency: "monthly",
    contributionFrequency: "monthly",
    contributionTiming: "beginning",
    annualInflationRatePercent: 0,
    goalBasis: "future",
    ...overrides,
  };
}

describe("calculateCompoundSavings", () => {
  it("matches the Microsoft FV beginning-of-period example", () => {
    const result = calculateCompoundSavings(exampleInput());

    expect(result.futureValue).toBeCloseTo(2_301.40, 2);
    expect(result.totalPrincipal).toBe(2_200);
    expect(result.interestEarned).toBeCloseTo(101.40, 2);
    expect(result.effectiveAnnualYieldPercent).toBeCloseTo(6.167781, 6);
    expect(result.timeline.at(-1)?.endingBalance).toBeCloseTo(result.futureValue, 8);
  });

  it("uses an ordinary annuity when contributions are made at period end", () => {
    const result = calculateCompoundSavings(exampleInput({ contributionTiming: "end" }));
    const monthlyRate = 0.06 / 12;
    const independentlyExpected = 1_000 * Math.pow(1 + monthlyRate, 12)
      + 100 * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate);

    expect(result.futureValue).toBeCloseTo(independentlyExpected, 8);
    expect(result.futureValue).toBeLessThan(calculateCompoundSavings(exampleInput()).futureValue);
  });

  it("handles zero interest without dividing by zero", () => {
    const result = calculateCompoundSavings(exampleInput({
      initialAmount: 500,
      recurringContribution: 100,
      years: 2,
      annualNominalRatePercent: 0,
      contributionTiming: "end",
    }));

    expect(result.futureValue).toBe(2_900);
    expect(result.interestEarned).toBe(0);
    expect(result.timeline).toHaveLength(2);
  });

  it("calculates the contribution required for a future-value goal", () => {
    const result = calculateCompoundSavings(exampleInput({
      mode: "goal",
      initialAmount: 0,
      recurringContribution: 99_999,
      targetAmount: 120_000,
      years: 10,
      annualNominalRatePercent: 0,
      contributionTiming: "end",
    }));

    expect(result.requiredContribution).toBe(1_000);
    expect(result.recurringContributionUsed).toBe(1_000);
    expect(result.futureValue).toBe(120_000);
  });

  it("inflates a today-money goal before calculating required savings", () => {
    const result = calculateCompoundSavings(exampleInput({
      mode: "goal",
      initialAmount: 0,
      targetAmount: 100_000,
      years: 10,
      annualNominalRatePercent: 0,
      annualInflationRatePercent: 3,
      goalBasis: "today",
      contributionTiming: "end",
    }));

    expect(result.goalAtHorizon).toBeCloseTo(134_391.64, 2);
    expect(result.realFutureValue).toBeCloseTo(100_000, 6);
  });

  it("supports a negative rate and reports a loss", () => {
    const result = calculateCompoundSavings(exampleInput({
      initialAmount: 10_000,
      recurringContribution: 0,
      years: 2,
      annualNominalRatePercent: -10,
      compoundFrequency: "yearly",
    }));

    expect(result.futureValue).toBeCloseTo(8_100, 8);
    expect(result.interestEarned).toBeCloseTo(-1_900, 8);
  });

  it("returns zero required savings when the starting balance already covers the goal", () => {
    const result = calculateCompoundSavings(exampleInput({
      mode: "goal",
      initialAmount: 150_000,
      targetAmount: 100_000,
      years: 1,
      annualNominalRatePercent: 0,
    }));

    expect(result.requiredContribution).toBe(0);
    expect(result.goalAchievedByInitial).toBe(true);
    expect(result.goalSurplusFromInitial).toBe(50_000);
  });

  it("rejects inputs whose derived result exceeds the supported boundary", () => {
    expect(() => calculateCompoundSavings(exampleInput({
      initialAmount: SAVINGS_MAX_MONEY,
      recurringContribution: SAVINGS_MAX_MONEY,
      years: 60,
      annualNominalRatePercent: 100,
      compoundFrequency: "daily",
      contributionFrequency: "weekly",
    }))).toThrow(/สูงเกินขอบเขต/);
  });
});

describe("compoundSavingsCsv", () => {
  it("adds a UTF-8 BOM and neutralizes spreadsheet formulas", () => {
    const input = exampleInput({ scenarioName: "=HYPERLINK(\"https://example.com\")" });
    const csv = compoundSavingsCsv(input, calculateCompoundSavings(input));

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Year","Opening balance"');
  });
});
