export const EMPLOYEE_SCHEDULE_MAX_EMPLOYEES = 80;
export const EMPLOYEE_SCHEDULE_MAX_DAYS = 31;
export const EMPLOYEE_SCHEDULE_MAX_SHIFTS = 8;
export const EMPLOYEE_SCHEDULE_MAX_PEOPLE_PER_SHIFT = 6;
export const EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH = 1_500_000;

export type EmployeeScheduleEmployee = {
  id: string;
  name: string;
  role: string;
  maxWeeklyHours: number;
};

export type EmployeeScheduleShift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  requiredPeople: number;
  requiredRole: string;
  weekdays: number[];
};

export type EmployeeScheduleUnavailability = {
  employeeId: string;
  date: string;
};

export type EmployeeScheduleAssignment = {
  id: string;
  date: string;
  shiftId: string;
  slot: number;
  employeeId: string;
  locked: boolean;
};

export type EmployeeScheduleState = {
  version: 1;
  title: string;
  startDate: string;
  endDate: string;
  employees: EmployeeScheduleEmployee[];
  shifts: EmployeeScheduleShift[];
  unavailability: EmployeeScheduleUnavailability[];
  minRestHours: number;
  maxConsecutiveDays: number;
  seed: string;
  assignments: EmployeeScheduleAssignment[];
};

export type EmployeeScheduleInput = Omit<EmployeeScheduleState, "version" | "assignments">;

export type EmployeeScheduleEligibility = {
  eligible: boolean;
  reason: string;
};

export type EmployeeScheduleEmployeeSummary = {
  employeeId: string;
  name: string;
  role: string;
  shifts: number;
  netMinutes: number;
  weekendShifts: number;
  overnightShifts: number;
  highestWeeklyMinutes: number;
  maxWeeklyMinutes: number;
};

export type EmployeeScheduleSummary = {
  totalSlots: number;
  filledSlots: number;
  openSlots: number;
  lockedSlots: number;
  totalNetMinutes: number;
  coveragePercent: number;
  employees: EmployeeScheduleEmployeeSummary[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CSV_FORMULA_PATTERN = /^[=+\-@\t\r]/;
const MAX_TEXT_LENGTH = 50_000;
const MAX_NAME_LENGTH = 80;
const MAX_ROLE_LENGTH = 40;
const DAY_MS = 86_400_000;

function normalizeText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function normalizeLookup(value: string) {
  return normalizeText(value).toLocaleLowerCase("th");
}

function parseDate(value: string, label = "วันที่") {
  if (!DATE_PATTERN.test(value)) throw new Error(`${label}ต้องอยู่ในรูปแบบ YYYY-MM-DD`);
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new Error(`${label}ไม่ถูกต้อง`);
  return parsed;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number) {
  const next = parseDate(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return dateKey(next);
}

function inclusiveDays(startDate: string, endDate: string) {
  return Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / DAY_MS) + 1;
}

function enumerateDates(startDate: string, endDate: string) {
  const length = inclusiveDays(startDate, endDate);
  return Array.from({ length }, (_, index) => addDays(startDate, index));
}

function parseTime(value: string, label: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error(`${label}ต้องอยู่ในรูปแบบ HH:mm`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function shiftTiming(shift: EmployeeScheduleShift) {
  const start = parseTime(shift.startTime, `เวลาเริ่มของ ${shift.name}`);
  const rawEnd = parseTime(shift.endTime, `เวลาสิ้นสุดของ ${shift.name}`);
  if (start === rawEnd) throw new Error(`เวลาเริ่มและสิ้นสุดของ ${shift.name} ต้องไม่เท่ากัน`);
  const overnight = rawEnd < start;
  const grossMinutes = (overnight ? rawEnd + 1_440 : rawEnd) - start;
  if (!Number.isInteger(shift.breakMinutes) || shift.breakMinutes < 0 || shift.breakMinutes >= grossMinutes) throw new Error(`เวลาพักของ ${shift.name} ต้องเป็นจำนวนนาทีและน้อยกว่าระยะเวลากะ`);
  return { start, end: overnight ? rawEnd + 1_440 : rawEnd, overnight, grossMinutes, netMinutes: grossMinutes - shift.breakMinutes };
}

function assignmentInterval(date: string, shift: EmployeeScheduleShift) {
  const timing = shiftTiming(shift);
  const dayStart = parseDate(date).getTime();
  return {
    ...timing,
    start: dayStart + timing.start * 60_000,
    end: dayStart + timing.end * 60_000,
  };
}

function weekKey(date: string) {
  const parsed = parseDate(date);
  const weekday = parsed.getUTCDay();
  parsed.setUTCDate(parsed.getUTCDate() - ((weekday + 6) % 7));
  return dateKey(parsed);
}

function seededHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function csvCell(value: string | number | boolean) {
  let normalized = String(value);
  if (CSV_FORMULA_PATTERN.test(normalized)) normalized = `'${normalized}`;
  return `"${normalized.replaceAll('"', '""')}"`;
}

function cloneState(state: EmployeeScheduleState): EmployeeScheduleState {
  return {
    ...state,
    employees: state.employees.map((employee) => ({ ...employee })),
    shifts: state.shifts.map((shift) => ({ ...shift, weekdays: [...shift.weekdays] })),
    unavailability: state.unavailability.map((entry) => ({ ...entry })),
    assignments: state.assignments.map((assignment) => ({ ...assignment })),
  };
}

function validateDateRange(startDate: string, endDate: string) {
  parseDate(startDate, "วันที่เริ่มต้น");
  parseDate(endDate, "วันที่สิ้นสุด");
  if (endDate < startDate) throw new Error("วันที่สิ้นสุดต้องไม่อยู่ก่อนวันที่เริ่มต้น");
  const days = inclusiveDays(startDate, endDate);
  if (days > EMPLOYEE_SCHEDULE_MAX_DAYS) throw new Error(`สร้างตารางได้ไม่เกิน ${EMPLOYEE_SCHEDULE_MAX_DAYS} วันต่อครั้ง`);
  return days;
}

function validateEmployees(employees: readonly EmployeeScheduleEmployee[]) {
  if (!employees.length) throw new Error("กรุณาเพิ่มพนักงานอย่างน้อย 1 คน");
  if (employees.length > EMPLOYEE_SCHEDULE_MAX_EMPLOYEES) throw new Error(`รองรับพนักงานได้ไม่เกิน ${EMPLOYEE_SCHEDULE_MAX_EMPLOYEES} คน`);
  const names = new Set<string>();
  return employees.map((raw, index) => {
    const name = normalizeText(raw.name);
    const role = normalizeText(raw.role || "ทั่วไป");
    if (!name || name.length > MAX_NAME_LENGTH || name.includes("|")) throw new Error(`พนักงานลำดับ ${index + 1}: ชื่อต้องมี 1–${MAX_NAME_LENGTH} ตัวอักษรและไม่มี |`);
    if (!role || role.length > MAX_ROLE_LENGTH || role.includes("|")) throw new Error(`พนักงานลำดับ ${index + 1}: บทบาทต้องมี 1–${MAX_ROLE_LENGTH} ตัวอักษรและไม่มี |`);
    const key = normalizeLookup(name);
    if (names.has(key)) throw new Error(`พบชื่อพนักงานซ้ำ: ${name}`);
    names.add(key);
    if (!Number.isFinite(raw.maxWeeklyHours) || raw.maxWeeklyHours <= 0 || raw.maxWeeklyHours > 168) throw new Error(`พนักงาน ${name}: ชั่วโมงสูงสุดต่อสัปดาห์ต้องมากกว่า 0 และไม่เกิน 168`);
    return { id: `employee-${index + 1}`, name, role, maxWeeklyHours: Math.round(raw.maxWeeklyHours * 100) / 100 };
  });
}

function validateShifts(shifts: readonly EmployeeScheduleShift[]) {
  if (!shifts.length) throw new Error("กรุณาเพิ่มกะอย่างน้อย 1 กะ");
  if (shifts.length > EMPLOYEE_SCHEDULE_MAX_SHIFTS) throw new Error(`เพิ่มกะได้ไม่เกิน ${EMPLOYEE_SCHEDULE_MAX_SHIFTS} กะ`);
  return shifts.map((raw, index) => {
    const name = normalizeText(raw.name);
    const requiredRole = normalizeText(raw.requiredRole);
    if (!name || name.length > 60 || name.includes("|")) throw new Error(`กะลำดับ ${index + 1}: ชื่อต้องมี 1–60 ตัวอักษรและไม่มี |`);
    if (requiredRole.length > MAX_ROLE_LENGTH || requiredRole.includes("|")) throw new Error(`กะ ${name}: บทบาทที่ต้องการยาวเกิน ${MAX_ROLE_LENGTH} ตัวอักษรหรือมี |`);
    if (!Number.isInteger(raw.requiredPeople) || raw.requiredPeople < 1 || raw.requiredPeople > EMPLOYEE_SCHEDULE_MAX_PEOPLE_PER_SHIFT) throw new Error(`กะ ${name}: จำนวนคนต้องอยู่ระหว่าง 1–${EMPLOYEE_SCHEDULE_MAX_PEOPLE_PER_SHIFT}`);
    const weekdays = [...new Set(raw.weekdays)].sort((left, right) => left - right);
    if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error(`กะ ${name}: กรุณาเลือกวันทำงานอย่างน้อย 1 วัน`);
    const normalized = {
      id: `shift-${index + 1}`,
      name,
      startTime: raw.startTime,
      endTime: raw.endTime,
      breakMinutes: raw.breakMinutes,
      requiredPeople: raw.requiredPeople,
      requiredRole,
      weekdays,
    };
    shiftTiming(normalized);
    return normalized;
  });
}

export function parseEmployeeScheduleEmployees(value: string, defaultMaxWeeklyHours = 40) {
  if (value.length > MAX_TEXT_LENGTH) throw new Error("ข้อมูลพนักงานยาวเกิน 50,000 ตัวอักษร");
  const duplicates: string[] = [];
  const names = new Set<string>();
  const employees: EmployeeScheduleEmployee[] = [];
  value.split(/\r?\n/u).forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line) return;
    const fields = line.split("|").map(normalizeText);
    if (fields.length > 3) throw new Error(`บรรทัด ${lineIndex + 1}: ใช้รูปแบบ ชื่อ | บทบาท | ชั่วโมงสูงสุดต่อสัปดาห์`);
    const [name = "", role = "ทั่วไป", maxHoursText = ""] = fields;
    if (!name) throw new Error(`บรรทัด ${lineIndex + 1}: กรุณาใส่ชื่อ`);
    const key = normalizeLookup(name);
    if (names.has(key)) {
      duplicates.push(name);
      return;
    }
    names.add(key);
    const maxWeeklyHours = maxHoursText ? Number(maxHoursText) : defaultMaxWeeklyHours;
    employees.push({ id: `employee-${employees.length + 1}`, name, role: role || "ทั่วไป", maxWeeklyHours });
  });
  return { employees: validateEmployees(employees), duplicates };
}

export function parseEmployeeScheduleUnavailability(value: string, employees: readonly EmployeeScheduleEmployee[], startDate: string, endDate: string) {
  validateDateRange(startDate, endDate);
  if (value.length > MAX_TEXT_LENGTH) throw new Error("ข้อมูลวันลา/วันไม่สะดวกยาวเกิน 50,000 ตัวอักษร");
  const byName = new Map(employees.map((employee) => [normalizeLookup(employee.name), employee]));
  const unique = new Set<string>();
  const entries: EmployeeScheduleUnavailability[] = [];

  const addEntry = (employee: EmployeeScheduleEmployee, date: string, line: number) => {
    parseDate(date, `บรรทัด ${line}: วันที่`);
    if (date < startDate || date > endDate) throw new Error(`บรรทัด ${line}: ${date} อยู่นอกช่วงตาราง`);
    const key = `${employee.id}|${date}`;
    if (!unique.has(key)) {
      unique.add(key);
      entries.push({ employeeId: employee.id, date });
    }
  };

  value.split(/\r?\n/u).forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line) return;
    const separator = line.indexOf("|");
    if (separator < 1) throw new Error(`บรรทัด ${lineIndex + 1}: ใช้รูปแบบ ชื่อ | YYYY-MM-DD`);
    const name = normalizeText(line.slice(0, separator));
    const employee = byName.get(normalizeLookup(name));
    if (!employee) throw new Error(`บรรทัด ${lineIndex + 1}: ไม่พบพนักงานชื่อ ${name}`);
    const tokens = line.slice(separator + 1).split(",").map(normalizeText).filter(Boolean);
    if (!tokens.length) throw new Error(`บรรทัด ${lineIndex + 1}: กรุณาใส่วันที่`);
    tokens.forEach((token) => {
      const range = token.split("..").map(normalizeText);
      if (range.length === 1) addEntry(employee, range[0]!, lineIndex + 1);
      else if (range.length === 2) {
        validateDateRange(range[0]!, range[1]!);
        enumerateDates(range[0]!, range[1]!).forEach((date) => addEntry(employee, date, lineIndex + 1));
      } else throw new Error(`บรรทัด ${lineIndex + 1}: ช่วงวันที่ต้องใช้ YYYY-MM-DD..YYYY-MM-DD`);
    });
  });
  return entries.sort((left, right) => left.date.localeCompare(right.date) || left.employeeId.localeCompare(right.employeeId));
}

function createEmptySchedule(input: EmployeeScheduleInput): EmployeeScheduleState {
  validateDateRange(input.startDate, input.endDate);
  const title = normalizeText(input.title);
  if (!title || title.length > 100) throw new Error("ชื่อตารางต้องมี 1–100 ตัวอักษร");
  if (!Number.isInteger(input.minRestHours) || input.minRestHours < 0 || input.minRestHours > 24) throw new Error("เวลาพักขั้นต่ำต้องเป็นจำนวนเต็ม 0–24 ชั่วโมง");
  if (!Number.isInteger(input.maxConsecutiveDays) || input.maxConsecutiveDays < 1 || input.maxConsecutiveDays > 14) throw new Error("จำนวนวันทำงานติดกันสูงสุดต้องอยู่ระหว่าง 1–14 วัน");
  const seed = normalizeText(input.seed);
  if (!seed || seed.length > 100) throw new Error("Seed ต้องมี 1–100 ตัวอักษร");
  const employees = validateEmployees(input.employees);
  const shifts = validateShifts(input.shifts);
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const unavailableKeys = new Set<string>();
  const unavailability = input.unavailability.map((entry) => {
    if (!employeeIds.has(entry.employeeId)) throw new Error("ข้อมูลวันลาอ้างถึงพนักงานที่ไม่มีอยู่");
    parseDate(entry.date, "วันลา");
    if (entry.date < input.startDate || entry.date > input.endDate) throw new Error(`วันลา ${entry.date} อยู่นอกช่วงตาราง`);
    const key = `${entry.employeeId}|${entry.date}`;
    if (unavailableKeys.has(key)) throw new Error("พบข้อมูลวันลาหรือวันไม่สะดวกซ้ำ");
    unavailableKeys.add(key);
    return { employeeId: entry.employeeId, date: entry.date };
  });
  const assignments: EmployeeScheduleAssignment[] = [];
  enumerateDates(input.startDate, input.endDate).forEach((date) => {
    const weekday = parseDate(date).getUTCDay();
    shifts.forEach((shift) => {
      if (!shift.weekdays.includes(weekday)) return;
      for (let slot = 1; slot <= shift.requiredPeople; slot += 1) assignments.push({ id: `${date}_${shift.id}_${slot}`, date, shiftId: shift.id, slot, employeeId: "", locked: false });
    });
  });
  return { version: 1, title, startDate: input.startDate, endDate: input.endDate, employees, shifts, unavailability, minRestHours: input.minRestHours, maxConsecutiveDays: input.maxConsecutiveDays, seed, assignments };
}

function roleMatches(employeeRole: string, requiredRole: string) {
  if (!requiredRole) return true;
  return normalizeLookup(employeeRole) === normalizeLookup(requiredRole);
}

function maxConsecutiveRun(dates: string[]) {
  const ordinals = [...new Set(dates)].map((date) => Math.round(parseDate(date).getTime() / DAY_MS)).sort((left, right) => left - right);
  let maximum = 0;
  let current = 0;
  let previous = Number.NEGATIVE_INFINITY;
  ordinals.forEach((ordinal) => {
    current = ordinal === previous + 1 ? current + 1 : 1;
    maximum = Math.max(maximum, current);
    previous = ordinal;
  });
  return maximum;
}

function context(state: EmployeeScheduleState) {
  return {
    employees: new Map(state.employees.map((employee) => [employee.id, employee])),
    shifts: new Map(state.shifts.map((shift) => [shift.id, shift])),
    unavailable: new Set(state.unavailability.map((entry) => `${entry.employeeId}|${entry.date}`)),
  };
}

export function getEmployeeScheduleEligibility(state: EmployeeScheduleState, assignmentId: string, employeeId: string): EmployeeScheduleEligibility {
  const maps = context(state);
  const assignment = state.assignments.find((entry) => entry.id === assignmentId);
  const employee = maps.employees.get(employeeId);
  if (!assignment) return { eligible: false, reason: "ไม่พบช่องเวรที่เลือก" };
  if (!employee) return { eligible: false, reason: "ไม่พบพนักงานที่เลือก" };
  const shift = maps.shifts.get(assignment.shiftId)!;
  if (!roleMatches(employee.role, shift.requiredRole)) return { eligible: false, reason: `กะนี้ต้องการบทบาท ${shift.requiredRole}` };
  const timing = shiftTiming(shift);
  if (maps.unavailable.has(`${employee.id}|${assignment.date}`) || (timing.overnight && maps.unavailable.has(`${employee.id}|${addDays(assignment.date, 1)}`))) return { eligible: false, reason: "พนักงานลา/ไม่สะดวกในวันที่กะครอบคลุม" };

  const existing = state.assignments.filter((entry) => entry.id !== assignment.id && entry.employeeId === employee.id);
  const candidateInterval = assignmentInterval(assignment.date, shift);
  for (const entry of existing) {
    const otherShift = maps.shifts.get(entry.shiftId)!;
    const other = assignmentInterval(entry.date, otherShift);
    if (candidateInterval.start < other.end && candidateInterval.end > other.start) return { eligible: false, reason: "เวลาทำงานซ้อนกับกะที่มีอยู่" };
    const gapMinutes = candidateInterval.start >= other.end ? (candidateInterval.start - other.end) / 60_000 : (other.start - candidateInterval.end) / 60_000;
    if (gapMinutes < state.minRestHours * 60) return { eligible: false, reason: `พักระหว่างกะน้อยกว่า ${state.minRestHours} ชั่วโมง` };
  }

  const candidateWeek = weekKey(assignment.date);
  const weeklyMinutes = existing.reduce((total, entry) => {
    if (weekKey(entry.date) !== candidateWeek) return total;
    return total + shiftTiming(maps.shifts.get(entry.shiftId)!).netMinutes;
  }, 0) + timing.netMinutes;
  if (weeklyMinutes > employee.maxWeeklyHours * 60 + 0.001) return { eligible: false, reason: `เกิน ${employee.maxWeeklyHours} ชั่วโมงต่อสัปดาห์` };
  if (maxConsecutiveRun([...existing.map((entry) => entry.date), assignment.date]) > state.maxConsecutiveDays) return { eligible: false, reason: `เกิน ${state.maxConsecutiveDays} วันทำงานติดกัน` };
  return { eligible: true, reason: "จัดเวรได้" };
}

function assignmentScore(state: EmployeeScheduleState, assignment: EmployeeScheduleAssignment, employee: EmployeeScheduleEmployee) {
  const maps = context(state);
  const entries = state.assignments.filter((entry) => entry.employeeId === employee.id);
  const week = weekKey(assignment.date);
  let weekMinutes = 0;
  let totalMinutes = 0;
  let undesirable = 0;
  entries.forEach((entry) => {
    const shift = maps.shifts.get(entry.shiftId)!;
    const timing = shiftTiming(shift);
    totalMinutes += timing.netMinutes;
    if (weekKey(entry.date) === week) weekMinutes += timing.netMinutes;
    const weekday = parseDate(entry.date).getUTCDay();
    undesirable += Number(weekday === 0 || weekday === 6 || timing.overnight);
  });
  return [weekMinutes, totalMinutes, entries.length, undesirable, seededHash(`${state.seed}|${assignment.id}|${employee.id}`)] as const;
}

function compareScores(left: readonly number[], right: readonly number[]) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function fillSchedule(state: EmployeeScheduleState) {
  const next = cloneState(state);
  const maps = context(next);
  const openAssignments = next.assignments.filter((assignment) => !assignment.employeeId).sort((left, right) => {
    const leftShift = maps.shifts.get(left.shiftId)!;
    const rightShift = maps.shifts.get(right.shiftId)!;
    const leftStatic = next.employees.filter((employee) => roleMatches(employee.role, leftShift.requiredRole) && !maps.unavailable.has(`${employee.id}|${left.date}`)).length;
    const rightStatic = next.employees.filter((employee) => roleMatches(employee.role, rightShift.requiredRole) && !maps.unavailable.has(`${employee.id}|${right.date}`)).length;
    return left.date.localeCompare(right.date) || leftStatic - rightStatic || Number(!leftShift.requiredRole) - Number(!rightShift.requiredRole) || leftShift.startTime.localeCompare(rightShift.startTime) || left.slot - right.slot;
  });
  openAssignments.forEach((assignment) => {
    const candidates = next.employees
      .filter((employee) => getEmployeeScheduleEligibility(next, assignment.id, employee.id).eligible)
      .sort((left, right) => compareScores(assignmentScore(next, assignment, left), assignmentScore(next, assignment, right)));
    if (candidates[0]) assignment.employeeId = candidates[0].id;
  });
  return next;
}

export function createEmployeeSchedule(input: EmployeeScheduleInput) {
  return fillSchedule(createEmptySchedule(input));
}

export function regenerateEmployeeSchedule(state: EmployeeScheduleState, seed: string) {
  const next = createEmptySchedule({
    title: state.title,
    startDate: state.startDate,
    endDate: state.endDate,
    employees: state.employees,
    shifts: state.shifts,
    unavailability: state.unavailability,
    minRestHours: state.minRestHours,
    maxConsecutiveDays: state.maxConsecutiveDays,
    seed,
  });
  const byId = new Map(state.assignments.filter((assignment) => assignment.locked && assignment.employeeId).map((assignment) => [assignment.id, assignment]));
  next.assignments.forEach((assignment) => {
    const locked = byId.get(assignment.id);
    if (!locked) return;
    assignment.employeeId = locked.employeeId;
    assignment.locked = true;
  });
  return fillSchedule(next);
}

export function fillOpenEmployeeScheduleSlots(state: EmployeeScheduleState) {
  return fillSchedule(state);
}

export function assignEmployeeScheduleSlot(state: EmployeeScheduleState, assignmentId: string, employeeId: string) {
  const next = cloneState(state);
  const assignment = next.assignments.find((entry) => entry.id === assignmentId);
  if (!assignment) throw new Error("ไม่พบช่องเวรที่เลือก");
  if (assignment.locked && assignment.employeeId !== employeeId) throw new Error("ปลดล็อกช่องเวรก่อนเปลี่ยนพนักงาน");
  if (!employeeId) {
    if (assignment.locked) throw new Error("ปลดล็อกช่องเวรก่อนนำชื่อออก");
    assignment.employeeId = "";
    return next;
  }
  const eligibility = getEmployeeScheduleEligibility(next, assignmentId, employeeId);
  if (!eligibility.eligible) throw new Error(eligibility.reason);
  assignment.employeeId = employeeId;
  return next;
}

export function toggleEmployeeScheduleLock(state: EmployeeScheduleState, assignmentId: string) {
  const next = cloneState(state);
  const assignment = next.assignments.find((entry) => entry.id === assignmentId);
  if (!assignment) throw new Error("ไม่พบช่องเวรที่เลือก");
  if (!assignment.employeeId) throw new Error("ต้องจัดพนักงานก่อนล็อกเวร");
  assignment.locked = !assignment.locked;
  return next;
}

export function clearEmployeeScheduleAssignments(state: EmployeeScheduleState, preserveLocked = true) {
  const next = cloneState(state);
  next.assignments.forEach((assignment) => {
    if (!preserveLocked || !assignment.locked) {
      assignment.employeeId = "";
      assignment.locked = false;
    }
  });
  return next;
}

export function summarizeEmployeeSchedule(state: EmployeeScheduleState): EmployeeScheduleSummary {
  const maps = context(state);
  const filled = state.assignments.filter((assignment) => assignment.employeeId);
  const summaries = state.employees.map<EmployeeScheduleEmployeeSummary>((employee) => {
    const assignments = filled.filter((assignment) => assignment.employeeId === employee.id);
    const weeks = new Map<string, number>();
    let netMinutes = 0;
    let weekendShifts = 0;
    let overnightShifts = 0;
    assignments.forEach((assignment) => {
      const shift = maps.shifts.get(assignment.shiftId)!;
      const timing = shiftTiming(shift);
      netMinutes += timing.netMinutes;
      weeks.set(weekKey(assignment.date), (weeks.get(weekKey(assignment.date)) ?? 0) + timing.netMinutes);
      const weekday = parseDate(assignment.date).getUTCDay();
      weekendShifts += Number(weekday === 0 || weekday === 6);
      overnightShifts += Number(timing.overnight);
    });
    return { employeeId: employee.id, name: employee.name, role: employee.role, shifts: assignments.length, netMinutes, weekendShifts, overnightShifts, highestWeeklyMinutes: Math.max(0, ...weeks.values()), maxWeeklyMinutes: employee.maxWeeklyHours * 60 };
  });
  const totalNetMinutes = summaries.reduce((total, summary) => total + summary.netMinutes, 0);
  return { totalSlots: state.assignments.length, filledSlots: filled.length, openSlots: state.assignments.length - filled.length, lockedSlots: filled.filter((assignment) => assignment.locked).length, totalNetMinutes, coveragePercent: state.assignments.length ? Math.round((filled.length / state.assignments.length) * 100) : 100, employees: summaries };
}

export function employeeScheduleDates(state: EmployeeScheduleState) {
  return enumerateDates(state.startDate, state.endDate);
}

export function employeeScheduleShiftMinutes(shift: EmployeeScheduleShift) {
  return shiftTiming(shift).netMinutes;
}

const WEEKDAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] as const;

export function employeeScheduleToText(state: EmployeeScheduleState) {
  const maps = context(state);
  const lines = [state.title, `${state.startDate} ถึง ${state.endDate}`, ""];
  employeeScheduleDates(state).forEach((date) => {
    lines.push(`${date} · ${WEEKDAY_NAMES[parseDate(date).getUTCDay()]}`);
    state.assignments.filter((assignment) => assignment.date === date).forEach((assignment) => {
      const shift = maps.shifts.get(assignment.shiftId)!;
      const employee = maps.employees.get(assignment.employeeId);
      lines.push(`- ${shift.name} ${shift.startTime}–${shift.endTime} · ช่อง ${assignment.slot}: ${employee ? `${employee.name} (${employee.role})` : "ยังไม่มีคน"}${assignment.locked ? " · ล็อก" : ""}`);
    });
    lines.push("");
  });
  return lines.join("\n").trim();
}

export function employeeScheduleCsv(state: EmployeeScheduleState) {
  const maps = context(state);
  const rows: Array<Array<string | number | boolean>> = [["Date", "Day", "Shift", "Start", "End", "Overnight", "Required role", "Slot", "Employee", "Employee role", "Locked", "Net hours"]];
  state.assignments.forEach((assignment) => {
    const shift = maps.shifts.get(assignment.shiftId)!;
    const timing = shiftTiming(shift);
    const employee = maps.employees.get(assignment.employeeId);
    rows.push([assignment.date, WEEKDAY_NAMES[parseDate(assignment.date).getUTCDay()] ?? "", shift.name, shift.startTime, shift.endTime, timing.overnight ? "Yes" : "No", shift.requiredRole, assignment.slot, employee?.name ?? "", employee?.role ?? "", assignment.locked ? "Yes" : "No", (timing.netMinutes / 60).toFixed(2)]);
  });
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function icsEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\r\n", "\\n").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let limit = 75;
  for (const character of line) {
    if (encoder.encode(current + character).length > limit && current) {
      parts.push(current);
      current = character;
      limit = 74;
    } else current += character;
  }
  if (current) parts.push(current);
  return parts.join("\r\n ");
}

function compactDateTime(date: string, time: string) {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function utcStamp(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function employeeScheduleIcs(state: EmployeeScheduleState, generatedAt = new Date()) {
  const maps = context(state);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Meaw Tools//Employee Schedule Maker//TH", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(state.title)}`];
  state.assignments.filter((assignment) => assignment.employeeId).forEach((assignment) => {
    const shift = maps.shifts.get(assignment.shiftId)!;
    const employee = maps.employees.get(assignment.employeeId)!;
    const timing = shiftTiming(shift);
    const endDate = timing.overnight ? addDays(assignment.date, 1) : assignment.date;
    lines.push("BEGIN:VEVENT", `UID:meaw-roster-${assignment.id}@meaw-tools.vercel.app`, `DTSTAMP:${utcStamp(generatedAt)}`, `DTSTART:${compactDateTime(assignment.date, shift.startTime)}`, `DTEND:${compactDateTime(endDate, shift.endTime)}`, `SUMMARY:${icsEscape(`${shift.name} · ${employee.name}`)}`, `DESCRIPTION:${icsEscape(`${employee.role} · พัก ${shift.breakMinutes} นาที · ตารางเวลาแบบ local/floating`)}`, "TRANSP:OPAQUE", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function serializeEmployeeSchedule(state: EmployeeScheduleState) {
  return JSON.stringify(state, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function restoreEmployeeSchedule(value: string) {
  if (value.length > EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH) throw new Error("ไฟล์ JSON ใหญ่เกิน 1.5 MB");
  let payload: unknown;
  try {
    payload = JSON.parse(value);
  } catch {
    throw new Error("ไฟล์ JSON ไม่ถูกต้อง");
  }
  if (!isRecord(payload) || payload.version !== 1) throw new Error("รองรับเฉพาะไฟล์ Employee Schedule Maker เวอร์ชัน 1");
  if (!Array.isArray(payload.employees) || !Array.isArray(payload.shifts) || !Array.isArray(payload.unavailability) || !Array.isArray(payload.assignments)) throw new Error("โครงสร้างไฟล์ตารางเวรไม่ครบ");

  const employees = payload.employees.map((raw, index) => {
    if (!isRecord(raw) || typeof raw.name !== "string" || typeof raw.role !== "string" || typeof raw.maxWeeklyHours !== "number" || raw.id !== `employee-${index + 1}`) throw new Error("ข้อมูลพนักงานในไฟล์ไม่ถูกต้อง");
    return { id: raw.id, name: raw.name, role: raw.role, maxWeeklyHours: raw.maxWeeklyHours } as EmployeeScheduleEmployee;
  });
  const shifts = payload.shifts.map((raw, index) => {
    if (!isRecord(raw) || raw.id !== `shift-${index + 1}` || typeof raw.name !== "string" || typeof raw.startTime !== "string" || typeof raw.endTime !== "string" || typeof raw.breakMinutes !== "number" || typeof raw.requiredPeople !== "number" || typeof raw.requiredRole !== "string" || !Array.isArray(raw.weekdays) || raw.weekdays.some((day) => typeof day !== "number")) throw new Error("ข้อมูลกะในไฟล์ไม่ถูกต้อง");
    return { id: raw.id, name: raw.name, startTime: raw.startTime, endTime: raw.endTime, breakMinutes: raw.breakMinutes, requiredPeople: raw.requiredPeople, requiredRole: raw.requiredRole, weekdays: raw.weekdays as number[] } as EmployeeScheduleShift;
  });
  const unavailability = payload.unavailability.map((raw) => {
    if (!isRecord(raw) || typeof raw.employeeId !== "string" || typeof raw.date !== "string") throw new Error("ข้อมูลวันลาในไฟล์ไม่ถูกต้อง");
    return { employeeId: raw.employeeId, date: raw.date };
  });
  if (typeof payload.title !== "string" || typeof payload.startDate !== "string" || typeof payload.endDate !== "string" || typeof payload.minRestHours !== "number" || typeof payload.maxConsecutiveDays !== "number" || typeof payload.seed !== "string") throw new Error("การตั้งค่าตารางเวรในไฟล์ไม่ถูกต้อง");
  const state = createEmptySchedule({ title: payload.title, startDate: payload.startDate, endDate: payload.endDate, employees, shifts, unavailability, minRestHours: payload.minRestHours, maxConsecutiveDays: payload.maxConsecutiveDays, seed: payload.seed });
  if (payload.assignments.length !== state.assignments.length) throw new Error("จำนวนช่องเวรในไฟล์ไม่ตรงกับโครงสร้างตาราง");
  const rawById = new Map<string, Record<string, unknown>>();
  payload.assignments.forEach((raw) => {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.date !== "string" || typeof raw.shiftId !== "string" || typeof raw.slot !== "number" || typeof raw.employeeId !== "string" || typeof raw.locked !== "boolean" || rawById.has(raw.id)) throw new Error("ข้อมูลช่องเวรในไฟล์ไม่ถูกต้องหรือซ้ำ");
    rawById.set(raw.id, raw);
  });
  state.assignments.forEach((assignment) => {
    const raw = rawById.get(assignment.id);
    if (!raw || raw.date !== assignment.date || raw.shiftId !== assignment.shiftId || raw.slot !== assignment.slot) throw new Error("โครงสร้างช่องเวรในไฟล์ถูกแก้ไข");
    assignment.employeeId = raw.employeeId as string;
    assignment.locked = raw.locked as boolean;
    if (assignment.locked && !assignment.employeeId) throw new Error("ช่องเวรว่างไม่สามารถล็อกได้");
  });
  const employeeIds = new Set(state.employees.map((employee) => employee.id));
  state.assignments.forEach((assignment) => {
    if (!assignment.employeeId) return;
    if (!employeeIds.has(assignment.employeeId)) throw new Error("ช่องเวรอ้างถึงพนักงานที่ไม่มีอยู่");
    const eligibility = getEmployeeScheduleEligibility(state, assignment.id, assignment.employeeId);
    if (!eligibility.eligible) throw new Error(`ตารางที่นำเข้าขัดเงื่อนไข: ${eligibility.reason}`);
  });
  return state;
}

export function generateEmployeeScheduleSeed() {
  const random = new Uint32Array(2);
  crypto.getRandomValues(random);
  return `roster-${random[0]!.toString(36)}-${random[1]!.toString(36)}`;
}
