import { describe, expect, it } from "vitest";
import { calculateSocialSecurityPension } from "@/lib/tools/social-security-pension";

describe("calculateSocialSecurityPension", () => {
  it("calculates the 20% base pension at exactly 180 contribution months", () => {
    const result = calculateSocialSecurityPension({
      averageWageBase: 15_000,
      contributionMonths: 180,
      age: 55,
      insuredStatusEnded: true,
    });

    expect(result.pensionRate).toBe(0.2);
    expect(result.monthlyPension).toBe(3_000);
    expect(result.annualPension).toBe(36_000);
    expect(result.eligibleNow).toBe(true);
  });

  it("adds 1.5% only for each complete 12-month block beyond 180 months", () => {
    const result = calculateSocialSecurityPension({
      averageWageBase: 15_000,
      contributionMonths: 250,
      age: 60,
      insuredStatusEnded: true,
    });

    expect(result.completeExtraYears).toBe(5);
    expect(result.unusedExtraMonths).toBe(10);
    expect(result.pensionRate).toBeCloseTo(0.275, 10);
    expect(result.monthlyPension).toBeCloseTo(4_125, 10);
  });

  it("does not show a monthly pension when contributions are below 180 months", () => {
    const result = calculateSocialSecurityPension({
      averageWageBase: 12_000,
      contributionMonths: 150,
      age: 58,
      insuredStatusEnded: true,
    });

    expect(result.monthsToPensionThreshold).toBe(30);
    expect(result.monthlyPension).toBeNull();
    expect(result.pensionRate).toBe(0);
    expect(result.eligibleNow).toBe(false);
  });

  it("separates the estimated amount from current eligibility conditions", () => {
    const result = calculateSocialSecurityPension({
      averageWageBase: 17_500,
      contributionMonths: 240,
      age: 54,
      insuredStatusEnded: false,
    });

    expect(result.monthlyPension).toBe(4_812.5);
    expect(result.ageThresholdMet).toBe(false);
    expect(result.insuredStatusEnded).toBe(false);
    expect(result.eligibleNow).toBe(false);
  });

  it("rejects fractional contribution months and implausible values", () => {
    expect(() => calculateSocialSecurityPension({
      averageWageBase: 15_000,
      contributionMonths: 180.5,
      age: 55,
      insuredStatusEnded: true,
    })).toThrow("จำนวนเต็ม");

    expect(() => calculateSocialSecurityPension({
      averageWageBase: -1,
      contributionMonths: 180,
      age: 55,
      insuredStatusEnded: true,
    })).toThrow("ค่าจ้างเฉลี่ย");
  });
});
