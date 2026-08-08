import { describe, expect, it } from "vitest";
import {
  calculateLaborCost,
  laborCostCsv,
  type LaborCostInput,
} from "@/lib/tools/labor-cost";

const exampleInput: LaborCostInput = {
  payBasis: "monthly",
  payAmount: 50_000,
  headcount: 3,
  hoursPerWeek: 40,
  paidWeeksPerYear: 52,
  workdaysPerWeek: 5,
  annualBonus: 50_000,
  annualAllowances: 24_000,
  employerContributionPercent: 3,
  retirementPercent: 2,
  otherWageLinkedPercent: 1,
  annualBenefits: 36_000,
  annualTrainingCost: 10_000,
  annualEquipmentSoftware: 30_000,
  annualWorkspaceCost: 24_000,
  annualRecruitingCost: 12_000,
  annualOtherCost: 6_000,
  allocatedOverheadPercent: 5,
  paidLeaveDays: 12,
  paidHolidayDays: 13,
  otherNonproductiveDays: 5,
};

describe("labor cost calculator", () => {
  it("builds loaded annual, monthly, and productive-hour costs without double-counting paid time", () => {
    const result = calculateLaborCost(exampleInput);
    expect(result).toMatchObject({
      annualBasePayPerEmployee: 600_000,
      directCashCompensationPerEmployee: 674_000,
      employerContributionCost: 18_000,
      retirementCost: 12_000,
      otherWageLinkedCost: 6_000,
      wageLinkedBurdenPerEmployee: 36_000,
      fixedEmployeeCostsPerEmployee: 118_000,
      allocatedOverheadPerEmployee: 33_700,
      loadedAnnualCostPerEmployee: 861_700,
      paidHoursPerEmployee: 2_080,
      nonproductiveHoursPerEmployee: 240,
      productiveHoursPerEmployee: 1_840,
      teamAnnualCost: 2_585_100,
      teamProductiveHours: 5_520,
    });
    expect(result.loadedMonthlyCostPerEmployee).toBeCloseTo(71_808.333_333, 6);
    expect(result.burdenCostPerEmployee).toBe(261_700);
    expect(result.burdenRatePercent).toBeCloseTo(261_700 / 600_000 * 100, 10);
    expect(result.costMultiplier).toBeCloseTo(861_700 / 600_000, 10);
    expect(result.loadedCostPerPaidHour).toBeCloseTo(861_700 / 2_080, 10);
    expect(result.loadedCostPerProductiveHour).toBeCloseTo(861_700 / 1_840, 10);
    expect(result.teamMonthlyCost).toBeCloseTo(215_425, 6);
  });

  it("annualizes hourly and annual pay bases transparently", () => {
    const hourly = calculateLaborCost({
      ...exampleInput,
      payBasis: "hourly",
      payAmount: 500,
      annualBonus: 0,
      annualAllowances: 0,
      employerContributionPercent: 0,
      retirementPercent: 0,
      otherWageLinkedPercent: 0,
      annualBenefits: 0,
      annualTrainingCost: 0,
      annualEquipmentSoftware: 0,
      annualWorkspaceCost: 0,
      annualRecruitingCost: 0,
      annualOtherCost: 0,
      allocatedOverheadPercent: 0,
    });
    const annual = calculateLaborCost({ ...exampleInput, payBasis: "annual", payAmount: 720_000 });
    expect(hourly.annualBasePayPerEmployee).toBe(1_040_000);
    expect(hourly.loadedCostPerPaidHour).toBe(500);
    expect(annual.annualBasePayPerEmployee).toBe(720_000);
  });

  it("returns null instead of Infinity when no productive hours remain", () => {
    const result = calculateLaborCost({
      ...exampleInput,
      paidWeeksPerYear: 1,
      paidLeaveDays: 5,
      paidHolidayDays: 0,
      otherNonproductiveDays: 0,
    });
    expect(result.productiveHoursPerEmployee).toBe(0);
    expect(result.loadedCostPerProductiveHour).toBeNull();
  });

  it("exports a UTF-8 CSV with the cost stack and team totals", () => {
    const result = calculateLaborCost(exampleInput);
    const csv = laborCostCsv(exampleInput, result, "THB");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"ต้นทุนรวมต่อปี","861700.00","THB"');
    expect(csv).toContain('"ต้นทุนทีมต่อปี","2585100.00","THB"');
    expect(csv).toContain('"ต้นทุนต่อชั่วโมงที่ส่งมอบได้","468.32","THB"');
  });

  it("rejects invalid headcount, schedules, percentages, and impossible nonproductive days", () => {
    expect(() => calculateLaborCost({ ...exampleInput, payAmount: 0 })).toThrow("ค่าจ้างฐาน");
    expect(() => calculateLaborCost({ ...exampleInput, headcount: 1.5 })).toThrow("จำนวนเต็ม");
    expect(() => calculateLaborCost({ ...exampleInput, workdaysPerWeek: 8 })).toThrow("วันทำงานต่อสัปดาห์");
    expect(() => calculateLaborCost({ ...exampleInput, employerContributionPercent: 501 })).toThrow("ภาษีและเงินสมทบ");
    expect(() => calculateLaborCost({ ...exampleInput, paidWeeksPerYear: 1, paidLeaveDays: 6 })).toThrow("ต้องไม่เกินวันทำงาน");
    expect(() => calculateLaborCost({ ...exampleInput, annualBenefits: Number.NaN })).toThrow("สวัสดิการคงที่");
    expect(() => calculateLaborCost({ ...exampleInput, payBasis: "weekly" as "annual" })).toThrow("รูปแบบค่าจ้าง");
  });
});
