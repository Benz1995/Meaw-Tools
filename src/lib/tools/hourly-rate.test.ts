import { describe, expect, it } from "vitest";
import {
  calculateFreelanceRate,
  calculateSalaryRate,
  freelanceRateCsv,
  roundRateUp,
  salaryRateCsv,
  type FreelanceRateInput,
  type SalaryRateInput,
} from "@/lib/tools/hourly-rate";

const salaryInput: SalaryRateInput = {
  amount: 30_000,
  payPeriod: "monthly",
  hoursPerWeek: 40,
  workDaysPerWeek: 5,
  workWeeksPerYear: 52,
  annualAdditionalPay: 0,
};

const freelanceInput: FreelanceRateInput = {
  desiredAnnualIncome: 600_000,
  annualOverhead: 120_000,
  annualReserve: 60_000,
  bufferPercent: 10,
  platformFeePercent: 10,
  billableHoursPerWeek: 25,
  billableWeeksPerYear: 48,
  billableHoursPerDay: 8,
  roundingStep: 50,
  projectHours: 20,
  projectDirectCosts: 10_000,
};

describe("hourly rate calculator", () => {
  it("converts a monthly salary using explicit work capacity", () => {
    const result = calculateSalaryRate(salaryInput);
    expect(result).toMatchObject({ annualIncome: 360_000, annualHours: 2_080, annualWorkDays: 260, hoursPerDay: 8 });
    expect(result.hourlyRate).toBeCloseTo(173.076923, 6);
    expect(result.dailyRate).toBeCloseTo(1_384.615384, 5);
    expect(result.weeklyRate).toBeCloseTo(6_923.076923, 6);
  });

  it("distributes annual additional pay over actual working hours", () => {
    const result = calculateSalaryRate({ ...salaryInput, amount: 600_000, payPeriod: "annual", workWeeksPerYear: 48, annualAdditionalPay: 60_000 });
    expect(result).toMatchObject({ regularAnnualIncome: 600_000, annualIncome: 660_000, annualHours: 1_920, monthlyRate: 55_000 });
    expect(result.hourlyRate).toBeCloseTo(343.75, 6);
  });

  it("annualizes hourly, daily, and weekly pay consistently", () => {
    expect(calculateSalaryRate({ ...salaryInput, amount: 100, payPeriod: "hourly", workWeeksPerYear: 50 }).annualIncome).toBe(200_000);
    expect(calculateSalaryRate({ ...salaryInput, amount: 800, payPeriod: "daily", workWeeksPerYear: 50 }).annualIncome).toBe(200_000);
    expect(calculateSalaryRate({ ...salaryInput, amount: 4_000, payPeriod: "weekly", workWeeksPerYear: 50 }).annualIncome).toBe(200_000);
  });

  it("builds a freelance rate from income, costs, realistic billable hours, buffer, and fees", () => {
    const result = calculateFreelanceRate(freelanceInput);
    expect(result).toMatchObject({ annualBillableHours: 1_200, baseAnnualNeed: 780_000, bufferAmount: 78_000, revenueBeforePlatformFee: 858_000 });
    expect(result.requiredAnnualRevenue).toBeCloseTo(953_333.333333, 6);
    expect(result.platformFeeAmount).toBeCloseTo(95_333.333333, 6);
    expect(result.exactHourlyRate).toBeCloseTo(794.444444, 6);
    expect(result.roundedHourlyRate).toBe(800);
    expect(result.dayRate).toBe(6_400);
    expect(result.projectQuote).toBeCloseTo(27_111.111111, 6);
  });

  it("keeps the simple freelance formula transparent when optional adjustments are zero", () => {
    const result = calculateFreelanceRate({ ...freelanceInput, annualOverhead: 0, annualReserve: 0, bufferPercent: 0, platformFeePercent: 0, roundingStep: 0, projectHours: 0, projectDirectCosts: 0 });
    expect(result.requiredAnnualRevenue).toBe(600_000);
    expect(result.exactHourlyRate).toBe(500);
    expect(result.roundedHourlyRate).toBe(500);
    expect(result.projectQuote).toBe(0);
  });

  it("rounds rates upward without lowering the calculated minimum", () => {
    expect(roundRateUp(794.01, 50)).toBe(800);
    expect(roundRateUp(800, 50)).toBe(800);
    expect(roundRateUp(794.01, 0)).toBe(794.01);
  });

  it("rejects impossible work capacity, near-total fees, and invalid rounding", () => {
    expect(() => calculateSalaryRate({ ...salaryInput, hoursPerWeek: 140, workDaysPerWeek: 5 })).toThrow("ไม่เกิน 24 ชั่วโมง");
    expect(() => calculateSalaryRate({ ...salaryInput, workWeeksPerYear: 54 })).toThrow("สัปดาห์ทำงานต่อปี");
    expect(() => calculateFreelanceRate({ ...freelanceInput, platformFeePercent: 96 })).toThrow("ค่าธรรมเนียมแพลตฟอร์ม");
    expect(() => calculateFreelanceRate({ ...freelanceInput, roundingStep: 25 as 50 })).toThrow("หน่วยปัดเรทไม่ถูกต้อง");
  });

  it("exports calculation inputs and results as UTF-8 CSV", () => {
    const salaryCsv = salaryRateCsv(salaryInput, calculateSalaryRate(salaryInput), "THB");
    const freelanceCsv = freelanceRateCsv(freelanceInput, calculateFreelanceRate(freelanceInput), "THB");
    expect(salaryCsv.startsWith("\uFEFF")).toBe(true);
    expect(salaryCsv).toContain('"เทียบรายชั่วโมง","173.08","THB"');
    expect(freelanceCsv).toContain('"เรทหลังปัดขึ้น","800.00","THB/ชั่วโมง"');
    expect(freelanceCsv).toContain('"ราคาโปรเจกต์ขั้นต่ำ","27111.11","THB"');
  });
});
