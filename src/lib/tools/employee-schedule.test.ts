import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH,
  assignEmployeeScheduleSlot,
  clearEmployeeScheduleAssignments,
  createEmployeeSchedule,
  employeeScheduleCsv,
  employeeScheduleIcs,
  employeeScheduleToText,
  fillOpenEmployeeScheduleSlots,
  getEmployeeScheduleEligibility,
  parseEmployeeScheduleEmployees,
  parseEmployeeScheduleUnavailability,
  regenerateEmployeeSchedule,
  restoreEmployeeSchedule,
  serializeEmployeeSchedule,
  summarizeEmployeeSchedule,
  toggleEmployeeScheduleLock,
  type EmployeeScheduleInput,
} from "@/lib/tools/employee-schedule";

const PEOPLE = [
  "มะลิ | หัวหน้ากะ | 40",
  "นนท์ | หัวหน้ากะ | 40",
  "สมชาย | พนักงาน | 40",
  "น้ำฝน | พนักงาน | 40",
  "ต้นกล้า | พนักงาน | 40",
  "ฟ้าใส | พนักงาน | 40",
  "ภูผา | พนักงาน | 40",
  "ใบหม่อน | พนักงาน | 40",
].join("\n");

function baseInput(overrides: Partial<EmployeeScheduleInput> = {}): EmployeeScheduleInput {
  const employees = parseEmployeeScheduleEmployees(PEOPLE).employees;
  return {
    title: "ตารางเวรสาขา A",
    startDate: "2026-08-10",
    endDate: "2026-08-16",
    employees,
    shifts: [
      { id: "shift-1", name: "เปิดร้าน", startTime: "07:00", endTime: "15:00", breakMinutes: 60, requiredPeople: 1, requiredRole: "หัวหน้ากะ", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      { id: "shift-2", name: "กะเช้า", startTime: "08:00", endTime: "16:00", breakMinutes: 60, requiredPeople: 2, requiredRole: "พนักงาน", weekdays: [0, 1, 2, 3, 4, 5, 6] },
      { id: "shift-3", name: "กะบ่าย", startTime: "14:00", endTime: "22:00", breakMinutes: 60, requiredPeople: 2, requiredRole: "พนักงาน", weekdays: [0, 1, 2, 3, 4, 5, 6] },
    ],
    unavailability: [],
    minRestHours: 8,
    maxConsecutiveDays: 5,
    seed: "meaw-roster-a",
    ...overrides,
  };
}

describe("employee schedule engine", () => {
  it("parses employees, removes case-insensitive duplicates, and applies default hours", () => {
    const parsed = parseEmployeeScheduleEmployees("Mali | Barista\nmali | Barista\nNont | Lead | 32", 40);
    expect(parsed.employees).toEqual([
      { id: "employee-1", name: "Mali", role: "Barista", maxWeeklyHours: 40 },
      { id: "employee-2", name: "Nont", role: "Lead", maxWeeklyHours: 32 },
    ]);
    expect(parsed.duplicates).toEqual(["mali"]);
  });

  it("parses single dates and inclusive date ranges for known employees", () => {
    const employees = parseEmployeeScheduleEmployees(PEOPLE).employees;
    const entries = parseEmployeeScheduleUnavailability("มะลิ | 2026-08-10, 2026-08-12..2026-08-14", employees, "2026-08-10", "2026-08-16");
    expect(entries.map((entry) => entry.date)).toEqual(["2026-08-10", "2026-08-12", "2026-08-13", "2026-08-14"]);
    expect(entries.every((entry) => entry.employeeId === "employee-1")).toBe(true);
  });

  it("rejects unknown employees and out-of-range unavailability", () => {
    const employees = parseEmployeeScheduleEmployees(PEOPLE).employees;
    expect(() => parseEmployeeScheduleUnavailability("ไม่พบชื่อ | 2026-08-10", employees, "2026-08-10", "2026-08-16")).toThrow("ไม่พบพนักงาน");
    expect(() => parseEmployeeScheduleUnavailability("มะลิ | 2026-08-17", employees, "2026-08-10", "2026-08-16")).toThrow("อยู่นอกช่วงตาราง");
  });

  it("creates a complete deterministic weekly schedule with role coverage", () => {
    const first = createEmployeeSchedule(baseInput());
    const second = createEmployeeSchedule(baseInput());
    expect(first).toEqual(second);
    expect(first.assignments).toHaveLength(35);
    expect(first.assignments.every((assignment) => assignment.employeeId)).toBe(true);
    const managerIds = new Set(first.employees.filter((employee) => employee.role === "หัวหน้ากะ").map((employee) => employee.id));
    expect(first.assignments.filter((assignment) => assignment.shiftId === "shift-1").every((assignment) => managerIds.has(assignment.employeeId))).toBe(true);
    const summary = summarizeEmployeeSchedule(first);
    expect(summary).toMatchObject({ totalSlots: 35, filledSlots: 35, openSlots: 0, coveragePercent: 100 });
    expect(summary.employees.every((employee) => employee.highestWeeklyMinutes <= employee.maxWeeklyMinutes)).toBe(true);
  });

  it("respects unavailability and leaves explicit coverage gaps when constraints cannot be met", () => {
    const input = baseInput();
    input.unavailability = parseEmployeeScheduleUnavailability("มะลิ | 2026-08-10\nนนท์ | 2026-08-10", input.employees, input.startDate, input.endDate);
    const result = createEmployeeSchedule(input);
    const openShift = result.assignments.find((assignment) => assignment.date === "2026-08-10" && assignment.shiftId === "shift-1");
    expect(openShift?.employeeId).toBe("");
    expect(summarizeEmployeeSchedule(result).openSlots).toBeGreaterThan(0);
  });

  it("reports role, overlap, rest, weekly-hour, and consecutive-day constraints", () => {
    const state = createEmployeeSchedule(baseInput());
    const managerSlot = state.assignments.find((assignment) => assignment.shiftId === "shift-1")!;
    expect(getEmployeeScheduleEligibility(state, managerSlot.id, "employee-3")).toEqual({ eligible: false, reason: "กะนี้ต้องการบทบาท หัวหน้ากะ" });

    const compact = createEmployeeSchedule(baseInput({
      endDate: "2026-08-10",
      minRestHours: 8,
      maxConsecutiveDays: 1,
      employees: parseEmployeeScheduleEmployees("หนึ่ง | พนักงาน | 8").employees,
      shifts: [
        { id: "shift-1", name: "เช้า", startTime: "08:00", endTime: "16:00", breakMinutes: 0, requiredPeople: 1, requiredRole: "พนักงาน", weekdays: [1] },
        { id: "shift-2", name: "บ่าย", startTime: "15:00", endTime: "23:00", breakMinutes: 0, requiredPeople: 1, requiredRole: "พนักงาน", weekdays: [1] },
      ],
    }));
    expect(compact.assignments.filter((assignment) => assignment.employeeId)).toHaveLength(1);
    const open = compact.assignments.find((assignment) => !assignment.employeeId)!;
    expect(getEmployeeScheduleEligibility(compact, open.id, "employee-1").eligible).toBe(false);
  });

  it("prevents close-open assignments when minimum rest is not met", () => {
    const state = createEmployeeSchedule(baseInput({
      startDate: "2026-08-10",
      endDate: "2026-08-11",
      employees: parseEmployeeScheduleEmployees("หนึ่ง | พนักงาน | 40").employees,
      minRestHours: 11,
      maxConsecutiveDays: 2,
      shifts: [
        { id: "shift-1", name: "ปิดร้าน", startTime: "14:00", endTime: "22:00", breakMinutes: 0, requiredPeople: 1, requiredRole: "พนักงาน", weekdays: [1] },
        { id: "shift-2", name: "เปิดร้าน", startTime: "07:00", endTime: "15:00", breakMinutes: 0, requiredPeople: 1, requiredRole: "พนักงาน", weekdays: [2] },
      ],
    }));
    expect(state.assignments.filter((assignment) => assignment.employeeId)).toHaveLength(1);
    expect(summarizeEmployeeSchedule(state).openSlots).toBe(1);
  });

  it("supports manual replacement while rejecting an invalid role", () => {
    const state = clearEmployeeScheduleAssignments(createEmployeeSchedule(baseInput()), false);
    const slot = state.assignments.find((assignment) => assignment.shiftId === "shift-2")!;
    const replacement = state.employees.find((employee) => employee.role === "พนักงาน" && getEmployeeScheduleEligibility(state, slot.id, employee.id).eligible)!;
    const replaced = assignEmployeeScheduleSlot(state, slot.id, replacement.id);
    expect(replaced.assignments.find((assignment) => assignment.id === slot.id)?.employeeId).toBe(replacement.id);
    expect(() => assignEmployeeScheduleSlot(state, slot.id, "employee-1")).toThrow("กะนี้ต้องการบทบาท");
  });

  it("preserves locked assignments on regeneration and clears only unlocked assignments", () => {
    const original = createEmployeeSchedule(baseInput());
    const target = original.assignments.find((assignment) => assignment.employeeId)!;
    const locked = toggleEmployeeScheduleLock(original, target.id);
    const regenerated = regenerateEmployeeSchedule(locked, "another-seed");
    expect(regenerated.assignments.find((assignment) => assignment.id === target.id)).toMatchObject({ employeeId: target.employeeId, locked: true });
    const cleared = clearEmployeeScheduleAssignments(regenerated);
    expect(cleared.assignments.find((assignment) => assignment.id === target.id)?.employeeId).toBe(target.employeeId);
    expect(cleared.assignments.filter((assignment) => assignment.employeeId)).toHaveLength(1);
  });

  it("fills open slots without changing existing assignments", () => {
    const state = createEmployeeSchedule(baseInput());
    const target = state.assignments[0]!;
    const opened = assignEmployeeScheduleSlot(state, target.id, "");
    const filled = fillOpenEmployeeScheduleSlots(opened);
    expect(filled.assignments.find((assignment) => assignment.id === target.id)?.employeeId).not.toBe("");
    expect(summarizeEmployeeSchedule(filled).openSlots).toBe(0);
  });

  it("exports formula-safe UTF-8 CSV and readable text", () => {
    const input = baseInput({
      endDate: "2026-08-10",
      employees: parseEmployeeScheduleEmployees("=SUM(A1:A2) | พนักงาน | 40").employees,
      shifts: [{ id: "shift-1", name: "เช้า", startTime: "08:00", endTime: "16:00", breakMinutes: 60, requiredPeople: 1, requiredRole: "พนักงาน", weekdays: [1] }],
    });
    const state = createEmployeeSchedule(input);
    const csv = employeeScheduleCsv(state);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=SUM(A1:A2)");
    expect(employeeScheduleToText(state)).toContain("เช้า 08:00–16:00");
  });

  it("exports overnight assignments to the following day in ICS", () => {
    const state = createEmployeeSchedule(baseInput({
      endDate: "2026-08-10",
      employees: parseEmployeeScheduleEmployees("กานต์ | รปภ. | 40").employees,
      shifts: [{ id: "shift-1", name: "กะดึก", startTime: "20:00", endTime: "08:00", breakMinutes: 60, requiredPeople: 1, requiredRole: "รปภ.", weekdays: [1] }],
    }));
    const ics = employeeScheduleIcs(state, new Date("2026-08-01T00:00:00Z"));
    expect(ics).toContain("DTSTART:20260810T200000");
    expect(ics).toContain("DTEND:20260811T080000");
    expect(ics).toContain("SUMMARY:กะดึก · กานต์");
  });

  it("restores a versioned schedule and rejects tampered assignments", () => {
    const state = createEmployeeSchedule(baseInput());
    expect(restoreEmployeeSchedule(serializeEmployeeSchedule(state))).toEqual(state);
    const tampered = JSON.parse(serializeEmployeeSchedule(state)) as { assignments: Array<{ id: string }> };
    tampered.assignments[0]!.id = "forged-slot";
    expect(() => restoreEmployeeSchedule(JSON.stringify(tampered))).toThrow("โครงสร้างช่องเวร");
  });

  it("rejects imported schedules that violate availability", () => {
    const input = baseInput({ endDate: "2026-08-10" });
    input.unavailability = parseEmployeeScheduleUnavailability("มะลิ | 2026-08-10", input.employees, input.startDate, input.endDate);
    const state = createEmployeeSchedule(input);
    const payload = JSON.parse(serializeEmployeeSchedule(state)) as { assignments: Array<{ shiftId: string; employeeId: string }> };
    payload.assignments.find((assignment) => assignment.shiftId === "shift-1")!.employeeId = "employee-1";
    expect(() => restoreEmployeeSchedule(JSON.stringify(payload))).toThrow("ตารางที่นำเข้าขัดเงื่อนไข");
  });

  it("fails closed for oversized JSON", () => {
    expect(() => restoreEmployeeSchedule("x".repeat(EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH + 1))).toThrow("ใหญ่เกิน 1.5 MB");
  });
});
