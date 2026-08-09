import { describe, expect, it } from "vitest";
import { budgetCsv, calculateBudget, type BudgetInput } from "@/lib/tools/budget";

const example: BudgetInput = {
  currency: "THB",
  householdName: "บ้านแมวมีสุข",
  income: [
    { name: "เงินเดือน", amount: 60_000, frequency: "monthly" },
    { name: "งานเสริม", amount: 3_000, frequency: "weekly" },
  ],
  expenses: [
    { name: "ค่าเช่า", amount: 18_000, frequency: "monthly", category: "needs" },
    { name: "อาหาร", amount: 2_500, frequency: "weekly", category: "needs" },
    { name: "ค่าน้ำไฟและอินเทอร์เน็ต", amount: 3_000, frequency: "monthly", category: "needs" },
    { name: "เดินทาง", amount: 1_200, frequency: "weekly", category: "needs" },
    { name: "กินข้าวนอกบ้าน", amount: 3_000, frequency: "monthly", category: "wants" },
    { name: "Streaming", amount: 700, frequency: "monthly", category: "wants" },
    { name: "ท่องเที่ยว", amount: 24_000, frequency: "yearly", category: "wants" },
    { name: "เงินสำรองฉุกเฉิน", amount: 6_000, frequency: "monthly", category: "savings-debt" },
    { name: "จ่ายหนี้เพิ่ม", amount: 1_500, frequency: "biweekly", category: "savings-debt" },
  ],
  targets: { needs: 50, wants: 30, savingsDebt: 20 },
};

describe("budget calculator", () => {
  it("normalizes mixed frequencies into weekly, monthly, and annual totals", () => {
    const result = calculateBudget(example);
    expect(result.annualIncome).toBe(876_000);
    expect(result.monthlyIncome).toBe(73_000);
    expect(result.weeklyIncome).toBe(16_846.15);
    expect(result.annualExpenses).toBe(623_800);
    expect(result.monthlyExpenses).toBe(51_983.33);
    expect(result.monthlyBalance).toBe(21_016.67);
    expect(result.annualBalance).toBe(252_200);
  });

  it("compares needs, wants, and savings-debt against a customizable 50/30/20 target", () => {
    const result = calculateBudget(example);
    expect(result.buckets.needs).toMatchObject({
      monthly: 37_033.33,
      targetMonthly: 36_500,
      targetGap: -533.33,
    });
    expect(result.buckets.wants).toMatchObject({
      monthly: 5_700,
      targetMonthly: 21_900,
      targetGap: 16_200,
    });
    expect(result.buckets["savings-debt"]).toMatchObject({
      monthly: 9_250,
      targetMonthly: 14_600,
      targetGap: 5_350,
    });
    expect(result.plannedPercent).toBe(71.21);
  });

  it("distinguishes every-two-weeks from twice per month", () => {
    const result = calculateBudget({
      ...example,
      expenses: [
        { name: "Biweekly", amount: 1_000, frequency: "biweekly", category: "needs" },
        { name: "Twice monthly", amount: 1_000, frequency: "twice-monthly", category: "wants" },
      ],
    });
    expect(result.expenses[0]).toMatchObject({ annual: 26_000, monthly: 2_166.67 });
    expect(result.expenses[1]).toMatchObject({ annual: 24_000, monthly: 2_000 });
  });

  it("rejects invalid target totals and non-positive line items", () => {
    expect(() => calculateBudget({ ...example, targets: { needs: 50, wants: 30, savingsDebt: 10 } })).toThrow("รวม 100%");
    expect(() => calculateBudget({
      ...example,
      expenses: [{ name: "ยอดผิด", amount: 0, frequency: "monthly", category: "needs" }],
    })).toThrow("ต้องมากกว่า 0");
  });
});

describe("budget CSV", () => {
  it("exports normalized details with a UTF-8 BOM and neutralizes spreadsheet formulas", () => {
    const input: BudgetInput = {
      ...example,
      householdName: "=HYPERLINK(\"bad\")",
      income: [{ name: "+SUM(1,1)", amount: 60_000, frequency: "monthly" }],
    };
    const csv = budgetCsv(input, calculateBudget(input));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"Household\",\"'=HYPERLINK(\"\"bad\"\")\"");
    expect(csv).toContain("\"Income\",\"'+SUM(1,1)\"");
    expect(csv).toContain("\"Monthly income\",\"60000.00\",\"THB\"");
  });
});
