import { describe, expect, it } from "vitest";
import {
  calculateProjectCost,
  PROJECT_COST_MAX_DIRECT_ITEMS,
  PROJECT_COST_MAX_LABOR_ITEMS,
  projectCostCsv,
  type ProjectCostInput,
} from "@/lib/tools/project-cost";

const exampleInput: ProjectCostInput = {
  baseRevenue: 600_000,
  approvedChangeRevenue: 40_000,
  targetMarginPercent: 30,
  laborItems: [
    { label: "ออกแบบ UX", hourlyCost: 600, budgetHours: 100, actualHours: 90, remainingHours: 20 },
    { label: "พัฒนา", hourlyCost: 850, budgetHours: 250, actualHours: 220, remainingHours: 50 },
    { label: "บริหารโครงการ", hourlyCost: 700, budgetHours: 80, actualHours: 70, remainingHours: 20 },
  ],
  directCostItems: [
    { label: "ซอฟต์แวร์และระบบ", budgetCost: 25_000, actualCost: 20_000, remainingCost: 10_000 },
    { label: "ผู้รับเหมาช่วง", budgetCost: 35_000, actualCost: 25_000, remainingCost: 15_000 },
  ],
  budgetOverhead: 35_000,
  actualOverhead: 20_000,
  remainingOverhead: 20_000,
};
const firstLabor = exampleInput.laborItems[0]!;
const firstDirectCost = exampleInput.directCostItems[0]!;

describe("project cost calculator", () => {
  it("compares the original budget with actual plus remaining forecast", () => {
    const result = calculateProjectCost(exampleInput);

    expect(result.currentRevenue).toBe(640_000);
    expect(result.budget).toMatchObject({
      revenue: 600_000,
      laborHours: 430,
      laborCost: 328_500,
      directCost: 60_000,
      overhead: 35_000,
      totalCost: 423_500,
      profit: 176_500,
    });
    expect(result.actual).toEqual({ laborHours: 380, laborCost: 290_000, directCost: 45_000, overhead: 20_000, totalCost: 355_000 });
    expect(result.remaining).toEqual({ laborHours: 90, laborCost: 68_500, directCost: 25_000, overhead: 20_000, totalCost: 113_500 });
    expect(result.forecast).toMatchObject({ revenue: 640_000, laborHours: 470, laborCost: 358_500, directCost: 70_000, overhead: 40_000, totalCost: 468_500, profit: 171_500 });
    expect(result.budget.marginPercent).toBeCloseTo(29.416667, 6);
    expect(result.forecast.marginPercent).toBeCloseTo(26.796875, 6);
  });

  it("shows cost, profit, and margin variance without hiding approved changes", () => {
    const result = calculateProjectCost(exampleInput);
    expect(result.variance).toMatchObject({ revenue: 40_000, laborHours: 40, laborCost: 30_000, directCost: 10_000, overhead: 5_000, totalCost: 45_000, profit: -5_000 });
    expect(result.variance.marginPoints).toBeCloseTo(-2.619792, 6);
    expect(result.laborItems[1]).toMatchObject({ forecastHours: 270, hoursVariance: 20, budgetCost: 212_500, forecastCost: 229_500, costVariance: 17_000 });
  });

  it("calculates target cost headroom and additional revenue needed", () => {
    const result = calculateProjectCost(exampleInput);
    expect(result.target.maximumCost).toBe(448_000);
    expect(result.target.costHeadroom).toBe(-20_500);
    expect(result.target.additionalRevenueNeeded).toBeCloseTo(29_285.714286, 6);
    expect(result.breakEvenRevenue).toBe(468_500);
  });

  it("returns useful per-hour metrics and null when forecast hours are zero", () => {
    const result = calculateProjectCost(exampleInput);
    expect(result.averageForecastCostPerLaborHour).toBeCloseTo(996.808511, 6);
    expect(result.effectiveRevenuePerLaborHour).toBeCloseTo(1_361.702128, 6);

    const noHours = calculateProjectCost({
      ...exampleInput,
      laborItems: [{ label: "วัสดุเท่านั้น", hourlyCost: 0, budgetHours: 0, actualHours: 0, remainingHours: 0 }],
    });
    expect(noHours.averageForecastCostPerLaborHour).toBeNull();
    expect(noHours.effectiveRevenuePerLaborHour).toBeNull();
  });

  it("supports a loss and zero percent target without invalid percentages", () => {
    const result = calculateProjectCost({
      ...exampleInput,
      baseRevenue: 100_000,
      approvedChangeRevenue: 0,
      targetMarginPercent: 0,
    });
    expect(result.forecast.profit).toBe(-368_500);
    expect(result.forecast.marginPercent).toBe(-368.5);
    expect(result.target.maximumCost).toBe(100_000);
    expect(result.target.additionalRevenueNeeded).toBe(368_500);
  });

  it("exports a BOM CSV with formula-safe labels and both comparisons", () => {
    const input: ProjectCostInput = { ...exampleInput, laborItems: [{ ...firstLabor, label: "=SUM(A1:A2)" }] };
    const result = calculateProjectCost(input);
    const csv = projectCostCsv(input, result, "THB");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"ต้นทุนรวม","155000.00","119000.00","57000.00","176000.00","21000.00","THB"');
    expect(csv).toContain('"\'=SUM(A1:A2)","600.00"');
  });

  it("rejects invalid revenues, targets, arrays, labels, and numeric bounds", () => {
    expect(() => calculateProjectCost({ ...exampleInput, baseRevenue: 0 })).toThrow("รายรับตามสัญญาเดิม");
    expect(() => calculateProjectCost({ ...exampleInput, targetMarginPercent: 100 })).toThrow("เป้าหมาย Margin");
    expect(() => calculateProjectCost({ ...exampleInput, laborItems: [] })).toThrow("รายการแรงงาน");
    expect(() => calculateProjectCost({ ...exampleInput, directCostItems: [] })).toThrow("ต้นทุนตรง");
    expect(() => calculateProjectCost({ ...exampleInput, laborItems: Array.from({ length: PROJECT_COST_MAX_LABOR_ITEMS + 1 }, () => firstLabor) })).toThrow("1 ถึง 20");
    expect(() => calculateProjectCost({ ...exampleInput, directCostItems: Array.from({ length: PROJECT_COST_MAX_DIRECT_ITEMS + 1 }, () => firstDirectCost) })).toThrow("1 ถึง 30");
    expect(() => calculateProjectCost({ ...exampleInput, laborItems: [{ ...firstLabor, label: "x".repeat(81) }] })).toThrow("80 ตัวอักษร");
    expect(() => calculateProjectCost({ ...exampleInput, laborItems: [{ ...firstLabor, actualHours: -1 }] })).toThrow("ชั่วโมงที่ใช้แล้ว");
    expect(() => calculateProjectCost({ ...exampleInput, directCostItems: [{ ...firstDirectCost, remainingCost: Number.NaN }] })).toThrow("ต้นทุนตรงที่คาดว่าจะเหลือ");
  });
});
