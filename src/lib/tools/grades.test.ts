import { describe, expect, it } from "vitest";
import {
  calculateCourseGpa,
  calculateCumulativeGpax,
  roundGradeAverage,
  truncateGradeAverage,
} from "@/lib/tools/grades";

describe("course GPA", () => {
  it("calculates the official weighted credit example and exposes both display policies", () => {
    const result = calculateCourseGpa([
      { name: "AA", credits: 2, grade: "A" },
      { name: "BB", credits: 2, grade: "B+" },
      { name: "CC", credits: 3, grade: "B" },
      { name: "DD", credits: 3, grade: "C+" },
      { name: "EE", credits: 3, grade: "C" },
      { name: "FF", credits: 3, grade: "D+" },
      { name: "GG", credits: 3, grade: "D" },
    ]);
    expect(result.totalCredits).toBe(19);
    expect(result.totalWeightedPoints).toBe(45);
    expect(result.exactAverage).toBeCloseTo(45 / 19, 10);
    expect(result.roundedAverage).toBe(2.37);
    expect(result.truncatedAverage).toBe(2.36);
  });

  it("counts F but excludes W, S, and U", () => {
    const result = calculateCourseGpa([
      { name: "วิชาหลัก", credits: 3, grade: "A" },
      { name: "วิชาที่ไม่ผ่าน", credits: 3, grade: "F" },
      { name: "ถอนรายวิชา", credits: 3, grade: "W" },
      { name: "กิจกรรม", credits: 1, grade: "S" },
      { name: "กิจกรรมไม่ผ่าน", credits: 1, grade: "U" },
    ]);
    expect(result.totalCredits).toBe(6);
    expect(result.totalWeightedPoints).toBe(12);
    expect(result.exactAverage).toBe(2);
    expect(result.includedCourses).toBe(2);
    expect(result.excludedCourses).toBe(3);
  });

  it("rejects missing counted courses and invalid credits", () => {
    expect(() => calculateCourseGpa([{ name: "ถอน", credits: 3, grade: "W" }])).toThrow("นำมาคำนวณ GPA");
    expect(() => calculateCourseGpa([{ name: "ผิด", credits: 0, grade: "A" }])).toThrow("0.5 ถึง 30");
  });
});

describe("cumulative GPAX", () => {
  it("weights each term by credits instead of averaging term GPAs directly", () => {
    const result = calculateCumulativeGpax([
      { name: "เทอม 1", credits: 18, gpa: 4 },
      { name: "เทอม 2", credits: 6, gpa: 2 },
    ]);
    expect(result.totalCredits).toBe(24);
    expect(result.totalWeightedPoints).toBe(84);
    expect(result.exactAverage).toBe(3.5);
    expect(result.termCount).toBe(2);
  });

  it("rejects GPA outside 0–4 and invalid collection sizes", () => {
    expect(() => calculateCumulativeGpax([{ name: "เทอม 1", credits: 18, gpa: 4.01 }])).toThrow("0 ถึง 4");
    expect(() => calculateCumulativeGpax([])).toThrow("อย่างน้อย 1");
  });
});

describe("grade average formatting", () => {
  it("distinguishes rounding from truncating at two decimals", () => {
    expect(roundGradeAverage(2.368421)).toBe(2.37);
    expect(truncateGradeAverage(2.368421)).toBe(2.36);
    expect(roundGradeAverage(4)).toBe(4);
    expect(truncateGradeAverage(4)).toBe(4);
  });
});
