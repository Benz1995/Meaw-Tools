import { describe, expect, it } from "vitest";
import {
  BILLABLE_HOURS_MAX_ENTRIES,
  billableHoursCsv,
  buildBillingIncrementChart,
  calculateBillableHours,
  roundBillableMinutesUp,
  type BillableHoursInput,
} from "@/lib/tools/billable-hours";

const exampleInput: BillableHoursInput = {
  entries: [
    { label: "ประชุมเริ่มงาน", kind: "billable", minutes: 52 },
    { label: "ออกแบบ UX", kind: "billable", minutes: 83 },
    { label: "พัฒนา", kind: "billable", minutes: 130 },
    { label: "เสนอราคาและงานธุรการ", kind: "non-billable", minutes: 90 },
  ],
  hourlyRate: 1_500,
  availableHours: 8,
  targetUtilizationPercent: 75,
  periodsPerYear: 48,
  billingIncrementMinutes: 6,
};

describe("billable hours calculator", () => {
  it("calculates raw time, per-entry invoice rounding, utilization, and annual revenue gap", () => {
    const result = calculateBillableHours(exampleInput);

    expect(result).toMatchObject({
      totalLoggedMinutes: 355,
      rawBillableMinutes: 265,
      invoiceMinutes: 270,
      nonBillableMinutes: 90,
      roundingAdjustmentMinutes: 5,
      targetBillableMinutes: 360,
      gapToTargetMinutes: 95,
      aboveTargetMinutes: 0,
      invoiceRevenue: 6_750,
      projectedAnnualRawRevenue: 318_000,
      projectedAnnualInvoiceRevenue: 324_000,
      targetAnnualRevenue: 432_000,
      annualRevenueGap: 114_000,
    });
    expect(result.utilizationPercent).toBeCloseTo(55.208333, 6);
    expect(result.billableShareOfLoggedPercent).toBeCloseTo(74.647887, 6);
    expect(result.rawBillableValue).toBe(6_625);
    expect(result.roundingAdjustmentRevenue).toBe(125);
    expect(result.effectiveRevenuePerLoggedHour).toBeCloseTo(1_140.84507, 5);
  });

  it("rounds each billable entry separately instead of rounding the aggregate", () => {
    const result = calculateBillableHours({
      ...exampleInput,
      entries: [
        { label: "โทรครั้งที่ 1", kind: "billable", minutes: 3 },
        { label: "โทรครั้งที่ 2", kind: "billable", minutes: 3 },
      ],
    });

    expect(result.rawBillableMinutes).toBe(6);
    expect(result.invoiceMinutes).toBe(12);
    expect(result.entries.map((entry) => entry.invoiceMinutes)).toEqual([6, 6]);
  });

  it("does not round or invoice non-billable entries", () => {
    const result = calculateBillableHours({
      ...exampleInput,
      entries: [{ label: "งานภายใน", kind: "non-billable", minutes: 17 }],
    });

    expect(result).toMatchObject({ rawBillableMinutes: 0, invoiceMinutes: 0, nonBillableMinutes: 17, invoiceRevenue: 0 });
    expect(result.entries[0]).toMatchObject({ invoiceMinutes: 0, roundingAdjustmentMinutes: 0, invoiceValue: 0 });
  });

  it("reports time above target without a negative revenue gap", () => {
    const result = calculateBillableHours({
      ...exampleInput,
      entries: [{ label: "ส่งมอบงาน", kind: "billable", minutes: 420 }],
    });

    expect(result.utilizationPercent).toBe(87.5);
    expect(result.gapToTargetMinutes).toBe(0);
    expect(result.aboveTargetMinutes).toBe(60);
    expect(result.annualRevenueGap).toBe(0);
  });

  it("keeps an explicit capacity denominator and allows overtime utilization above 100%", () => {
    const result = calculateBillableHours({
      ...exampleInput,
      availableHours: 2,
      entries: [{ label: "งานเร่ง", kind: "billable", minutes: 180 }],
    });

    expect(result.utilizationPercent).toBe(150);
    expect(result.billableShareOfLoggedPercent).toBe(100);
  });

  it("builds a six-minute decimal billing chart", () => {
    expect(buildBillingIncrementChart(6)).toEqual([
      { fromMinute: 1, toMinute: 6, billedMinutes: 6, billedDecimalHours: 0.1 },
      { fromMinute: 7, toMinute: 12, billedMinutes: 12, billedDecimalHours: 0.2 },
      { fromMinute: 13, toMinute: 18, billedMinutes: 18, billedDecimalHours: 0.3 },
      { fromMinute: 19, toMinute: 24, billedMinutes: 24, billedDecimalHours: 0.4 },
      { fromMinute: 25, toMinute: 30, billedMinutes: 30, billedDecimalHours: 0.5 },
      { fromMinute: 31, toMinute: 36, billedMinutes: 36, billedDecimalHours: 0.6 },
      { fromMinute: 37, toMinute: 42, billedMinutes: 42, billedDecimalHours: 0.7 },
      { fromMinute: 43, toMinute: 48, billedMinutes: 48, billedDecimalHours: 0.8 },
      { fromMinute: 49, toMinute: 54, billedMinutes: 54, billedDecimalHours: 0.9 },
      { fromMinute: 55, toMinute: 60, billedMinutes: 60, billedDecimalHours: 1 },
    ]);
    expect(roundBillableMinutesUp(6, 6)).toBe(6);
    expect(roundBillableMinutesUp(6.01, 6)).toBe(12);
  });

  it("exports a BOM CSV with formula-safe labels and entry breakdown", () => {
    const input = { ...exampleInput, entries: [{ label: "=SUM(A1:A2)", kind: "billable" as const, minutes: 7 }] };
    const result = calculateBillableHours(input);
    const csv = billableHoursCsv(input, result, "THB");

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Billable utilization","1.46","%"');
    expect(csv).toContain('"\'=SUM(A1:A2)","Billable","7.00","12.00","5.00","300.00"');
  });

  it("rejects unsupported increments, invalid entries, and unsafe bounds", () => {
    expect(() => calculateBillableHours({ ...exampleInput, billingIncrementMinutes: 5 as 6 })).toThrow("รอบบิล");
    expect(() => calculateBillableHours({ ...exampleInput, entries: [] })).toThrow("1 ถึง 50");
    expect(() => calculateBillableHours({ ...exampleInput, entries: Array.from({ length: BILLABLE_HOURS_MAX_ENTRIES + 1 }, () => ({ label: "งาน", kind: "billable" as const, minutes: 1 })) })).toThrow("1 ถึง 50");
    expect(() => calculateBillableHours({ ...exampleInput, availableHours: 0 })).toThrow("ชั่วโมงทำงานที่ใช้เป็นฐาน");
    expect(() => calculateBillableHours({ ...exampleInput, periodsPerYear: 48.5 })).toThrow("จำนวนเต็ม");
    expect(() => calculateBillableHours({ ...exampleInput, entries: [{ label: "x".repeat(81), kind: "billable", minutes: 1 }] })).toThrow("80 ตัวอักษร");
    expect(() => calculateBillableHours({ ...exampleInput, entries: [{ label: "งาน", kind: "unknown" as "billable", minutes: 1 }] })).toThrow("ประเภทเวลา");
    expect(() => calculateBillableHours({ ...exampleInput, entries: [{ label: "งาน", kind: "billable", minutes: -1 }] })).toThrow("ระยะเวลา");
  });

  it("returns zero effective rate when no time has been logged", () => {
    const result = calculateBillableHours({ ...exampleInput, entries: [{ label: "ยังไม่เริ่ม", kind: "billable", minutes: 0 }] });
    expect(result.effectiveRevenuePerLoggedHour).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });
});
