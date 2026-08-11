import { describe, expect, it } from "vitest";
import {
  EXPENSE_TRACKER_MAX_TRANSACTIONS,
  amountToMinor,
  buildExpenseMonthTrend,
  buildExpenseTrackerCsv,
  calculateExpenseMonthSummary,
  createEmptyExpenseTrackerState,
  expenseCategoryBreakdown,
  isExpenseDateKey,
  isExpenseMonthKey,
  normalizeExpenseTransaction,
  parseExpenseTrackerState,
  serializeExpenseTrackerState,
  shiftExpenseMonth,
  transactionsForMonth,
  type ExpenseTransaction,
} from "./expense-tracker";

const expense: ExpenseTransaction = {
  id: "food-1",
  date: "2026-08-10",
  type: "expense",
  amountMinor: 12550,
  category: "food",
  description: "อาหารกลางวัน",
  note: "",
  createdAt: 1_754_780_000_000,
  updatedAt: 1_754_780_000_000,
};

const income: ExpenseTransaction = {
  ...expense,
  id: "salary-1",
  date: "2026-08-01",
  type: "income",
  amountMinor: 30_000_00,
  category: "salary",
  description: "เงินเดือน",
};

describe("expense tracker engine", () => {
  it("validates dates and shifts month boundaries", () => {
    expect(isExpenseDateKey("2026-02-28")).toBe(true);
    expect(isExpenseDateKey("2026-02-30")).toBe(false);
    expect(isExpenseMonthKey("2026-08")).toBe(true);
    expect(isExpenseMonthKey("2026-13")).toBe(false);
    expect(shiftExpenseMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftExpenseMonth("2026-12", 1)).toBe("2027-01");
  });

  it("converts entered money to integer minor units", () => {
    expect(amountToMinor(125.55)).toBe(12555);
    expect(() => amountToMinor(0)).toThrow("มากกว่า 0");
    expect(() => amountToMinor(Number.NaN)).toThrow("มากกว่า 0");
  });

  it("normalizes text, future dates and category/type mismatches", () => {
    const normalized = normalizeExpenseTransaction({ ...expense, date: "2099-01-01", category: "salary", description: " อาหาร\nกลางวัน " }, 0, "2026-08-11", 1_754_800_000_000);
    expect(normalized).toMatchObject({ date: "2026-08-11", category: "other", description: "อาหาร กลางวัน" });
    expect(normalizeExpenseTransaction({ ...expense, amountMinor: -1 })).toBeNull();
    expect(normalizeExpenseTransaction({ ...expense, description: "" })).toBeNull();
  });

  it("summarizes income, expense, balance and savings rate", () => {
    expect(calculateExpenseMonthSummary([expense, income])).toEqual({
      incomeMinor: 3_000_000,
      expenseMinor: 12_550,
      balanceMinor: 2_987_450,
      savingsRate: 99.58,
      transactionCount: 2,
    });
    expect(calculateExpenseMonthSummary([expense]).savingsRate).toBeNull();
  });

  it("filters transactions to a selected month", () => {
    const july = { ...expense, id: "july", date: "2026-07-31" };
    expect(transactionsForMonth([expense, income, july], "2026-08")).toHaveLength(2);
    expect(transactionsForMonth([expense], "bad-month")).toEqual([]);
  });

  it("builds descending expense category shares", () => {
    const transport = { ...expense, id: "ride", category: "transport" as const, amountMinor: 5_000 };
    const breakdown = expenseCategoryBreakdown([expense, transport, income]);
    expect(breakdown.map((item) => item.category)).toEqual(["food", "transport"]);
    expect(breakdown.reduce((total, item) => total + item.sharePercent, 0)).toBe(100);
  });

  it("builds a chronological bounded month trend", () => {
    const trend = buildExpenseMonthTrend([expense, income], "2026-08", 3);
    expect(trend.map((item) => item.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(trend[2]).toMatchObject({ incomeMinor: 3_000_000, expenseMinor: 12_550 });
    expect(buildExpenseMonthTrend([], "2026-08", 99)).toHaveLength(24);
  });

  it("sanitizes malformed, duplicate and over-limit imported records", () => {
    const transactions = Array.from({ length: EXPENSE_TRACKER_MAX_TRANSACTIONS + 3 }, (_, index) => ({ ...expense, id: `tx-${index}` }));
    transactions[1] = { ...expense, id: "tx-0" };
    const parsed = parseExpenseTrackerState(JSON.stringify({ currency: "BTC", transactions }), "2026-08-11", 1_754_800_000_000);
    expect(parsed.currency).toBe("THB");
    expect(parsed.transactions.length).toBeLessThanOrEqual(EXPENSE_TRACKER_MAX_TRANSACTIONS);
    expect(new Set(parsed.transactions.map((transaction) => transaction.id)).size).toBe(parsed.transactions.length);
    expect(parseExpenseTrackerState("bad-json")).toEqual(createEmptyExpenseTrackerState());
  });

  it("round-trips normalized state", () => {
    const state = { currency: "THB" as const, transactions: [expense, income] };
    expect(parseExpenseTrackerState(serializeExpenseTrackerState(state), "2026-08-11").transactions).toEqual([expense, income]);
  });

  it("creates a formula-safe UTF-8 CSV for one month", () => {
    const unsafe = { ...expense, description: "=HYPERLINK(\"bad\")", note: "+cmd" };
    const csv = buildExpenseTrackerCsv({ currency: "THB", transactions: [unsafe, { ...income, date: "2026-07-01" }] }, "2026-08");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("' =".replace(" ", ""));
    expect(csv).toContain("'+cmd");
    expect(csv).not.toContain("เงินเดือน");
  });
});
