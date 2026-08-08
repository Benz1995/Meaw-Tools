import { describe, expect, it } from "vitest";
import {
  calculateLiveMeetingCost,
  calculateMeetingCost,
  meetingCostCsv,
  normalizeMeetingHourlyRate,
  type MeetingCostInput,
} from "@/lib/tools/meeting-cost";

const example: MeetingCostInput = {
  groups: [
    { label: "ผู้บริหาร", count: 2, rateAmount: 1_200_000, ratePeriod: "annual" },
    { label: "ทีมงาน", count: 6, rateAmount: 50_000, ratePeriod: "monthly" },
  ],
  durationMinutes: 60,
  hoursPerWeek: 40,
  workWeeksPerYear: 52,
  overheadPercent: 30,
  directCostPerMeeting: 500,
  meetingsPerWeek: 2,
  recurringWeeksPerYear: 48,
  shorterByMinutes: 15,
};

describe("meeting cost", () => {
  it("normalizes monthly and annual compensation with user-controlled work capacity", () => {
    expect(normalizeMeetingHourlyRate(50_000, "monthly", 2_080)).toBeCloseTo(288.461538, 6);
    expect(normalizeMeetingHourlyRate(1_200_000, "annual", 2_080)).toBeCloseTo(576.923077, 6);
    expect(normalizeMeetingHourlyRate(750, "hourly", 2_080)).toBe(750);
  });

  it("calculates transparent labor, overhead, direct, and recurring costs", () => {
    const result = calculateMeetingCost(example);
    expect(result.participantCount).toBe(8);
    expect(result.peopleHours).toBe(8);
    expect(result.teamBaseHourlyCost).toBeCloseTo(2_884.615385, 6);
    expect(result.baseLaborCost).toBeCloseTo(2_884.615385, 6);
    expect(result.overheadCost).toBeCloseTo(865.384615, 6);
    expect(result.loadedLaborCost).toBeCloseTo(3_750, 6);
    expect(result.totalMeetingCost).toBeCloseTo(4_250, 6);
    expect(result.costPerMinute).toBeCloseTo(70.833333, 6);
    expect(result.annualMeetingCount).toBe(96);
    expect(result.monthlyRecurringCost).toBeCloseTo(34_000, 6);
    expect(result.annualRecurringCost).toBeCloseTo(408_000, 6);
  });

  it("calculates time-reduction savings from loaded labor only", () => {
    const result = calculateMeetingCost(example);
    expect(result.shortenedDurationMinutes).toBe(45);
    expect(result.savingsPerMeeting).toBeCloseTo(937.5, 6);
    expect(result.annualSavings).toBeCloseTo(90_000, 6);
  });

  it("supports zero recurrence and zero overhead without inventing annual cost", () => {
    const result = calculateMeetingCost({
      ...example,
      groups: [{ label: "ที่ปรึกษา", count: 1, rateAmount: 1_000, ratePeriod: "hourly" }],
      durationMinutes: 90,
      overheadPercent: 0,
      directCostPerMeeting: 0,
      meetingsPerWeek: 0,
      recurringWeeksPerYear: 0,
      shorterByMinutes: 0,
    });
    expect(result.totalMeetingCost).toBe(1_500);
    expect(result.annualRecurringCost).toBe(0);
    expect(result.annualSavings).toBe(0);
  });

  it("calculates a live counter from elapsed seconds", () => {
    expect(calculateLiveMeetingCost(3_750, 500, 900)).toEqual({ laborCost: 937.5, totalCost: 1_437.5 });
  });

  it("rejects invalid participant and duration assumptions", () => {
    expect(() => calculateMeetingCost({ ...example, groups: [] })).toThrow("กลุ่มผู้เข้าร่วม");
    expect(() => calculateMeetingCost({ ...example, groups: [{ ...example.groups[0]!, count: 1.5 }] })).toThrow("จำนวนเต็ม");
    expect(() => calculateMeetingCost({ ...example, durationMinutes: 0 })).toThrow("ระยะเวลาประชุม");
    expect(() => calculateMeetingCost({ ...example, shorterByMinutes: 61 })).toThrow("เวลาที่ต้องการลด");
  });

  it("rejects impossible work capacity and unsupported rate periods", () => {
    expect(() => calculateMeetingCost({ ...example, hoursPerWeek: 169 })).toThrow("ชั่วโมงทำงานต่อสัปดาห์");
    expect(() => normalizeMeetingHourlyRate(1_000, "weekly" as never, 2_080)).toThrow("งวดค่าจ้าง");
  });

  it("exports a UTF-8 CSV with summary and group evidence", () => {
    const result = calculateMeetingCost(example);
    const csv = meetingCostCsv(example, result, "THB");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"ต้นทุนรวมต่อครั้ง","4250.00","THB"');
    expect(csv).toContain('"ต้นทุนประชุมต่อปี","408000.00","THB"');
    expect(csv).toContain('"ผู้บริหาร","2","1200000.00","ต่อปี"');
  });
});
