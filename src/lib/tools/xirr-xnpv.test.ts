import { describe, expect, it } from "vitest";
import {
  calculateXirrXnpv,
  parseIsoDateUtc,
  xirrXnpvCsv,
  xnpv,
  type XirrXnpvInput,
} from "@/lib/tools/xirr-xnpv";

function input(
  cashFlows: Array<{ date: string; amount: number }>,
  overrides: Partial<XirrXnpvInput> = {},
): XirrXnpvInput {
  return {
    currency: "THB",
    scenarioName: "โครงการตัวอย่าง",
    annualHurdleRatePercent: 9,
    cashFlows: cashFlows.map((cashFlow, index) => ({ ...cashFlow, label: index ? `รับเงิน ${index}` : "เงินลงทุนเริ่มต้น" })),
    ...overrides,
  };
}

describe("calculateXirrXnpv", () => {
  it("matches Microsoft's irregular-date XIRR and XNPV examples", () => {
    const example = input([
      { date: "2008-01-01", amount: -10_000 },
      { date: "2008-03-01", amount: 2_750 },
      { date: "2008-10-30", amount: 4_250 },
      { date: "2009-02-15", amount: 3_250 },
      { date: "2009-04-01", amount: 2_750 },
    ]);
    const result = calculateXirrXnpv(example);

    expect(result.rootStatus).toBe("unique");
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]!.annualRatePercent).toBeCloseTo(37.3362535, 6);
    expect(Math.abs(result.roots[0]!.xnpvResidual!)).toBeLessThan(1e-5);
    expect(result.netPresentValueAtHurdleRate).toBeCloseTo(2_086.65, 2);
    expect(result.durationDays).toBe(456);
  });

  it("isolates two XIRRs for non-conventional dated cash flows", () => {
    const result = calculateXirrXnpv(input([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 230 },
      { date: "2027-01-01", amount: -132 },
    ]));

    expect(result.rootStatus).toBe("multiple");
    expect(result.signChanges).toBe(2);
    expect(result.roots.map((root) => root.annualRatePercent)).toEqual([
      expect.closeTo(10, 6),
      expect.closeTo(20, 6),
    ]);
  });

  it("detects a repeated root and a series with no real XIRR", () => {
    const repeated = calculateXirrXnpv(input([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 200 },
      { date: "2027-01-01", amount: -100 },
    ]));
    const none = calculateXirrXnpv(input([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 50 },
      { date: "2027-01-01", amount: -10 },
    ]));

    expect(repeated.rootStatus).toBe("ambiguous");
    expect(repeated.roots[0]!.annualRatePercent).toBeCloseTo(0, 8);
    expect(none.rootStatus).toBe("none");
    expect(none.roots).toEqual([]);
  });

  it("supports a negative XIRR and reports a conventional root outside the search range", () => {
    const negative = calculateXirrXnpv(input([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 90 },
    ]));
    const outside = calculateXirrXnpv(input([
      { date: "2025-01-01", amount: -1 },
      { date: "2026-01-01", amount: 1_002 },
    ]));

    expect(negative.roots[0]!.annualRatePercent).toBeCloseTo(-10, 8);
    expect(outside.rootStatus).toBe("outside-range");
    expect(outside.roots).toEqual([]);
  });

  it("counts actual UTC calendar days, including leap days", () => {
    const result = calculateXirrXnpv(input([
      { date: "2024-02-28", amount: -100 },
      { date: "2024-03-01", amount: 101 },
    ]));

    expect(result.durationDays).toBe(2);
    expect(result.timeline[1]!.yearFraction).toBeCloseTo(2 / 365, 12);
    expect(parseIsoDateUtc("2024-02-29")).toBe(Date.UTC(2024, 1, 29));
    expect(() => parseIsoDateUtc("2023-02-29")).toThrow(/ไม่มีอยู่จริง/);
  });

  it("keeps XNPV, profile, and timeline values consistent", () => {
    const example = input([
      { date: "2025-01-01", amount: -1_000 },
      { date: "2025-08-01", amount: 500 },
      { date: "2026-03-01", amount: 700 },
    ], { annualHurdleRatePercent: 10 });
    const result = calculateXirrXnpv(example);
    const direct = xnpv(result.timeline, 0.1);
    const profilePoint = result.profile.find((point) => Math.abs(point.annualRatePercent - 10) < 1e-8);

    expect(result.netPresentValueAtHurdleRate).toBeCloseTo(direct, 10);
    expect(result.timeline.at(-1)!.cumulativePresentValue).toBeCloseTo(direct, 10);
    expect(profilePoint?.netPresentValue).toBeCloseTo(direct, 8);
  });

  it("rejects invalid order, duplicate dates, unsupported signs, and excessive spans", () => {
    expect(() => calculateXirrXnpv(input([
      { date: "2026-01-01", amount: -100 },
      { date: "2025-01-01", amount: 120 },
    ]))).toThrow(/เรียงจากเก่าไปใหม่/);
    expect(() => calculateXirrXnpv(input([
      { date: "2025-01-01", amount: -100 },
      { date: "2025-01-01", amount: 120 },
    ]))).toThrow(/ห้ามซ้ำ/);
    expect(() => calculateXirrXnpv(input([
      { date: "2025-01-01", amount: 100 },
      { date: "2026-01-01", amount: 120 },
    ]))).toThrow(/ค่าติดลบ/);
    expect(() => calculateXirrXnpv(input([
      { date: "1900-01-01", amount: -100 },
      { date: "2101-01-01", amount: 120 },
    ]))).toThrow(/ไม่เกิน 100 ปี/);
  });

  it("exports UTF-8 CSV and neutralizes spreadsheet formulas", () => {
    const unsafe = input([
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 120 },
    ], {
      scenarioName: "=HYPERLINK(\"https://example.com\")",
      cashFlows: [
        { date: "2025-01-01", label: "+ลงทุน", amount: -100 },
        { date: "2026-01-01", label: "@รับคืน", amount: 120 },
      ],
    });
    const csv = xirrXnpvCsv(unsafe, calculateXirrXnpv(unsafe));

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+ลงทุน");
    expect(csv).toContain("'@รับคืน");
    expect(csv).toContain('"XNPV at hurdle rate"');
  });
});
