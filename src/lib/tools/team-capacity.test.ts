import { describe, expect, it } from "vitest";
import {
  calculateTeamCapacity,
  TEAM_CAPACITY_MAX_GROUPS,
  teamCapacityCsv,
  type TeamCapacityInput,
} from "@/lib/tools/team-capacity";

const exampleInput: TeamCapacityInput = {
  workingDays: 10,
  hoursPerDay: 8,
  reservePercent: 10,
  groups: [
    { label: "Development", scheduledFte: 4, leaveDaysPerFte: 1, focusPercent: 75, demandHours: 240 },
    { label: "Design", scheduledFte: 1.5, leaveDaysPerFte: 0.5, focusPercent: 70, demandHours: 70 },
    { label: "QA", scheduledFte: 2, leaveDaysPerFte: 0, focusPercent: 75, demandHours: 100 },
    { label: "Project Management", scheduledFte: 1, leaveDaysPerFte: 0, focusPercent: 60, demandHours: 40 },
  ],
};

describe("team capacity calculator", () => {
  it("subtracts leave, focus time, and reserve before comparing demand", () => {
    const result = calculateTeamCapacity(exampleInput);

    expect(result).toMatchObject({
      standardHoursPerFte: 80,
      scheduledFte: 8.5,
      grossHours: 680,
      absenceHours: 38,
      netScheduledHours: 642,
      nonDeliveryHours: 178.2,
      deliveryCapacityHours: 463.8,
      plannedCapacityHours: 417.42,
      demandHours: 450,
      status: "over-capacity",
    });
    expect(result.reserveHours).toBeCloseTo(46.38, 6);
    expect(result.capacityGapHours).toBeCloseTo(-32.58, 6);
    expect(result.loadPercent).toBeCloseTo(107.805088, 6);
    expect(result.effectivePlannedFte).toBeCloseTo(5.21775, 5);
    expect(result.demandFte).toBe(5.625);
    expect(result.additionalScheduledFte).toBeCloseTo(0.938272, 6);
  });

  it("shows the overloaded role without hiding capacity in other roles", () => {
    const result = calculateTeamCapacity(exampleInput);
    expect(result.groups[0]).toMatchObject({
      grossHours: 320,
      absenceHours: 32,
      nonDeliveryHours: 72,
      deliveryCapacityHours: 216,
      reserveHours: 21.6,
      plannedCapacityHours: 194.4,
      demandHours: 240,
      status: "over-capacity",
    });
    expect(result.groups[0]?.capacityGapHours).toBeCloseTo(-45.6, 6);
    expect(result.groups[0]?.loadPercent).toBeCloseTo(123.45679, 5);
    expect(result.groups[0]?.requiredScheduledFte).toBeCloseTo(4.938272, 6);
    expect(result.groups[0]?.additionalScheduledFte).toBeCloseTo(0.938272, 6);
    expect(result.groups[1]?.status).toBe("near-capacity");
    expect(result.groups[1]?.capacityGapHours).toBeCloseTo(1.82, 6);
  });

  it("returns null ratios when the whole group is unavailable", () => {
    const result = calculateTeamCapacity({
      workingDays: 10,
      hoursPerDay: 8,
      reservePercent: 10,
      groups: [{ label: "Unavailable", scheduledFte: 2, leaveDaysPerFte: 10, focusPercent: 80, demandHours: 16 }],
    });
    expect(result.plannedCapacityHours).toBe(0);
    expect(result.loadPercent).toBeNull();
    expect(result.additionalScheduledFte).toBeNull();
    expect(result.groups[0]).toMatchObject({ requiredScheduledFte: null, additionalScheduledFte: null, status: "no-capacity" });
  });

  it("estimates hiring needs when a demanded role has no scheduled FTE yet", () => {
    const result = calculateTeamCapacity({
      workingDays: 10,
      hoursPerDay: 8,
      reservePercent: 10,
      groups: [{ label: "New role", scheduledFte: 0, leaveDaysPerFte: 0, focusPercent: 75, demandHours: 108 }],
    });
    expect(result.groups[0]).toMatchObject({
      plannedCapacityHours: 0,
      requiredScheduledFte: 2,
      additionalScheduledFte: 2,
      status: "no-capacity",
    });
    expect(result.additionalScheduledFte).toBe(2);
  });

  it("marks room below ninety percent and near capacity at ninety percent", () => {
    const baseInput: TeamCapacityInput = {
      workingDays: 10,
      hoursPerDay: 8,
      reservePercent: 0,
      groups: [{ label: "Team", scheduledFte: 2, leaveDaysPerFte: 0, focusPercent: 100, demandHours: 100 }],
    };
    const available = calculateTeamCapacity(baseInput);
    const near = calculateTeamCapacity({
      ...baseInput,
      groups: [{ label: "Team", scheduledFte: 2, leaveDaysPerFte: 0, focusPercent: 100, demandHours: 144 }],
    });
    expect(available.status).toBe("available");
    expect(near.status).toBe("near-capacity");
  });

  it("exports UTF-8 CSV and protects spreadsheet formulas", () => {
    const input = { ...exampleInput, groups: [{ ...exampleInput.groups[0]!, label: "=IMPORTXML(A1)" }] };
    const result = calculateTeamCapacity(input);
    const csv = teamCapacityCsv(input, result);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=IMPORTXML(A1)","4.00","1.00","75.00"');
    expect(csv).toContain('"Planned capacity หลัง buffer","194.40","ชั่วโมง"');
  });

  it("rejects invalid periods, buffers, arrays, labels, and numeric bounds", () => {
    expect(() => calculateTeamCapacity({ ...exampleInput, workingDays: 10.5 })).toThrow("จำนวนเต็ม");
    expect(() => calculateTeamCapacity({ ...exampleInput, workingDays: 0 })).toThrow("วันทำงานในรอบ");
    expect(() => calculateTeamCapacity({ ...exampleInput, reservePercent: 96 })).toThrow("Capacity buffer");
    expect(() => calculateTeamCapacity({ ...exampleInput, groups: [] })).toThrow("กลุ่มงาน 1 ถึง 30");
    expect(() => calculateTeamCapacity({ ...exampleInput, groups: Array.from({ length: TEAM_CAPACITY_MAX_GROUPS + 1 }, () => exampleInput.groups[0]!) })).toThrow("กลุ่มงาน 1 ถึง 30");
    expect(() => calculateTeamCapacity({ ...exampleInput, groups: [{ ...exampleInput.groups[0]!, label: "x".repeat(81) }] })).toThrow("80 ตัวอักษร");
    expect(() => calculateTeamCapacity({ ...exampleInput, groups: [{ ...exampleInput.groups[0]!, scheduledFte: -0.01 }] })).toThrow("กำลังคน FTE");
    expect(() => calculateTeamCapacity({ ...exampleInput, groups: [{ ...exampleInput.groups[0]!, leaveDaysPerFte: 11 }] })).toThrow("วันลาเฉลี่ย");
    expect(() => calculateTeamCapacity({ ...exampleInput, groups: [{ ...exampleInput.groups[0]!, focusPercent: Number.NaN }] })).toThrow("Focus factor");
  });
});
