import { describe, expect, it } from "vitest";
import {
  addMonthsToLabel,
  calculateDebtPayoff,
  debtPayoffCsv,
  type DebtPayoffInput,
} from "@/lib/tools/debt-payoff";

function exampleInput(overrides: Partial<DebtPayoffInput> = {}): DebtPayoffInput {
  return {
    currency: "THB",
    planName: "แผนปลดหนี้ตัวอย่าง",
    startMonth: "2026-08",
    extraMonthlyPayment: 100,
    debts: [
      { name: "หนี้เล็ก", balance: 600, annualInterestRatePercent: 0, minimumPayment: 100 },
      { name: "หนี้ใหญ่", balance: 400, annualInterestRatePercent: 0, minimumPayment: 100 },
    ],
    ...overrides,
  };
}

describe("calculateDebtPayoff", () => {
  it("rolls the fixed monthly budget into the next debt", () => {
    const result = calculateDebtPayoff(exampleInput());

    expect(result.totalMonthlyBudget).toBe(300);
    expect(result.snowball.months).toBe(4);
    expect(result.snowball.totalPaid).toBe(1_000);
    expect(result.snowball.payoffOrder.map((debt) => debt.name)).toEqual(["หนี้ใหญ่", "หนี้เล็ก"]);
  });

  it("spills an unused minimum payment into the priority debt in the same month", () => {
    const result = calculateDebtPayoff(exampleInput({
      extraMonthlyPayment: 0,
      debts: [
        { name: "เกือบหมด", balance: 50, annualInterestRatePercent: 0, minimumPayment: 100 },
        { name: "ก้อนถัดไป", balance: 1_000, annualInterestRatePercent: 0, minimumPayment: 100 },
      ],
    }));

    expect(result.snowball.monthlyTimeline[0]?.payment).toBe(200);
    expect(result.snowball.monthlyTimeline[0]?.endingBalance).toBe(850);
  });

  it("accrues monthly interest before applying payment", () => {
    const result = calculateDebtPayoff(exampleInput({
      extraMonthlyPayment: 0,
      debts: [{ name: "บัตร", balance: 1_000, annualInterestRatePercent: 12, minimumPayment: 110 }],
    }));

    expect(result.avalanche.monthlyTimeline[0]?.interest).toBeCloseTo(10, 8);
    expect(result.avalanche.monthlyTimeline[0]?.endingBalance).toBeCloseTo(900, 8);
  });

  it("gives avalanche no more interest than snowball in a mixed-rate example", () => {
    const result = calculateDebtPayoff(exampleInput({
      extraMonthlyPayment: 200,
      debts: [
        { name: "ก้อนเล็กดอกต่ำ", balance: 800, annualInterestRatePercent: 4, minimumPayment: 80 },
        { name: "บัตรดอกสูง", balance: 4_000, annualInterestRatePercent: 24, minimumPayment: 160 },
        { name: "สินเชื่อ", balance: 8_000, annualInterestRatePercent: 10, minimumPayment: 220 },
      ],
    }));

    expect(result.avalanche.completed).toBe(true);
    expect(result.snowball.completed).toBe(true);
    expect(result.avalanche.totalInterest).toBeLessThanOrEqual(result.snowball.totalInterest);
    expect(result.interestDifference).toBeGreaterThanOrEqual(0);
  });

  it("marks a plan incomplete after the 600-month safety horizon", () => {
    const result = calculateDebtPayoff(exampleInput({
      extraMonthlyPayment: 0,
      debts: [{ name: "ยอดไม่ลด", balance: 1_000, annualInterestRatePercent: 24, minimumPayment: 1 }],
    }));

    expect(result.avalanche.completed).toBe(false);
    expect(result.avalanche.months).toBe(600);
    expect(result.avalanche.remainingBalance).toBeGreaterThan(1_000);
    expect(result.minimumInterestWarnings).toEqual(["ยอดไม่ลด"]);
  });

  it("uses stable priority tie-breakers", () => {
    const result = calculateDebtPayoff(exampleInput({
      extraMonthlyPayment: 100,
      debts: [
        { name: "รายการแรก", balance: 500, annualInterestRatePercent: 10, minimumPayment: 10 },
        { name: "รายการสอง", balance: 500, annualInterestRatePercent: 10, minimumPayment: 10 },
      ],
    }));

    expect(result.avalanche.payoffOrder[0]?.name).toBe("รายการแรก");
    expect(result.snowball.payoffOrder[0]?.name).toBe("รายการแรก");
  });

  it("validates count, names, dates, rates, and payment ranges", () => {
    expect(() => calculateDebtPayoff(exampleInput({ debts: [] }))).toThrow(/จำนวนหนี้/);
    expect(() => calculateDebtPayoff(exampleInput({ startMonth: "2026-13" }))).toThrow(/YYYY-MM/);
    expect(() => calculateDebtPayoff(exampleInput({ startMonth: "9950-01" }))).toThrow(/1900–9949/);
    expect(() => calculateDebtPayoff(exampleInput({ debts: [{ name: "", balance: 10, annualInterestRatePercent: 0, minimumPayment: 1 }] }))).toThrow(/ชื่อหนี้/);
    expect(() => calculateDebtPayoff(exampleInput({ debts: [{ name: "หนี้", balance: 10, annualInterestRatePercent: 101, minimumPayment: 1 }] }))).toThrow(/ดอกเบี้ย/);
  });
});

describe("debt payoff dates and CSV", () => {
  it("adds months across year boundaries", () => {
    expect(addMonthsToLabel("2026-11", 0)).toBe("2026-11");
    expect(addMonthsToLabel("2026-11", 3)).toBe("2027-02");
    expect(addMonthsToLabel("9949-12", 600)).toBe("9999-12");
  });

  it("adds a UTF-8 BOM and neutralizes spreadsheet formulas", () => {
    const input = exampleInput({
      planName: "=HYPERLINK(\"https://example.com\")",
      debts: [{ name: "+SUM(A1:A2)", balance: 100, annualInterestRatePercent: 0, minimumPayment: 100 }],
    });
    const csv = debtPayoffCsv(input, calculateDebtPayoff(input), "snowball");

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).toContain('"Month number","Month"');
  });
});
