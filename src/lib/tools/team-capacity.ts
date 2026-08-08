export const TEAM_CAPACITY_MAX_GROUPS = 30;
export const TEAM_CAPACITY_MAX_WORKING_DAYS = 366;
export const TEAM_CAPACITY_MAX_HOURS_PER_DAY = 24;
export const TEAM_CAPACITY_MAX_FTE = 1_000;
export const TEAM_CAPACITY_MAX_DEMAND_HOURS = 1_000_000_000;
export const TEAM_CAPACITY_MAX_RESULT = 1_000_000_000_000;

export type CapacityStatus = "available" | "near-capacity" | "over-capacity" | "no-capacity";

export type TeamCapacityGroup = {
  label: string;
  scheduledFte: number;
  leaveDaysPerFte: number;
  focusPercent: number;
  demandHours: number;
};

export type TeamCapacityInput = {
  workingDays: number;
  hoursPerDay: number;
  reservePercent: number;
  groups: TeamCapacityGroup[];
};

export type TeamCapacityGroupResult = TeamCapacityGroup & {
  grossHours: number;
  absenceHours: number;
  netScheduledHours: number;
  nonDeliveryHours: number;
  deliveryCapacityHours: number;
  reserveHours: number;
  plannedCapacityHours: number;
  capacityGapHours: number;
  loadPercent: number | null;
  plannedCapacityPerFte: number;
  requiredScheduledFte: number | null;
  additionalScheduledFte: number | null;
  status: CapacityStatus;
};

export type TeamCapacityResult = {
  groups: TeamCapacityGroupResult[];
  standardHoursPerFte: number;
  scheduledFte: number;
  grossHours: number;
  absenceHours: number;
  netScheduledHours: number;
  nonDeliveryHours: number;
  deliveryCapacityHours: number;
  reserveHours: number;
  plannedCapacityHours: number;
  demandHours: number;
  capacityGapHours: number;
  loadPercent: number | null;
  effectivePlannedFte: number;
  demandFte: number;
  additionalScheduledFte: number | null;
  status: CapacityStatus;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > TEAM_CAPACITY_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

function statusFor(plannedCapacityHours: number, demandHours: number): CapacityStatus {
  if (plannedCapacityHours <= 0) return "no-capacity";
  if (demandHours > plannedCapacityHours + 0.005) return "over-capacity";
  if (demandHours >= plannedCapacityHours * 0.9) return "near-capacity";
  return "available";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function calculateTeamCapacity(input: TeamCapacityInput): TeamCapacityResult {
  assertRange(input.workingDays, "จำนวนวันทำงานในรอบ", 1, TEAM_CAPACITY_MAX_WORKING_DAYS);
  if (!Number.isInteger(input.workingDays)) throw new Error("จำนวนวันทำงานในรอบต้องเป็นจำนวนเต็ม");
  assertRange(input.hoursPerDay, "ชั่วโมงมาตรฐานต่อวัน", 0.25, TEAM_CAPACITY_MAX_HOURS_PER_DAY);
  assertRange(input.reservePercent, "Capacity buffer", 0, 95);
  if (!Array.isArray(input.groups) || input.groups.length < 1 || input.groups.length > TEAM_CAPACITY_MAX_GROUPS) {
    throw new Error(`ต้องมีกลุ่มงาน 1 ถึง ${TEAM_CAPACITY_MAX_GROUPS} กลุ่ม`);
  }

  const standardHoursPerFte = input.workingDays * input.hoursPerDay;
  const reserveRatio = input.reservePercent / 100;
  const groups = input.groups.map((group, index): TeamCapacityGroupResult => {
    const label = group.label.trim() || `กลุ่มงาน ${index + 1}`;
    if (label.length > 80) throw new Error(`ชื่อกลุ่มงานที่ ${index + 1} ต้องไม่เกิน 80 ตัวอักษร`);
    assertRange(group.scheduledFte, `กำลังคน FTE กลุ่มที่ ${index + 1}`, 0, TEAM_CAPACITY_MAX_FTE);
    assertRange(group.leaveDaysPerFte, `วันลาเฉลี่ยต่อ FTE กลุ่มที่ ${index + 1}`, 0, input.workingDays);
    assertRange(group.focusPercent, `Focus factor กลุ่มที่ ${index + 1}`, 0.1, 100);
    assertRange(group.demandHours, `ชั่วโมงงานที่ต้องใช้กลุ่มที่ ${index + 1}`, 0, TEAM_CAPACITY_MAX_DEMAND_HOURS);

    const focusRatio = group.focusPercent / 100;
    const grossHours = group.scheduledFte * standardHoursPerFte;
    const absenceHours = group.scheduledFte * group.leaveDaysPerFte * input.hoursPerDay;
    const netScheduledHours = grossHours - absenceHours;
    const deliveryCapacityHours = netScheduledHours * focusRatio;
    const nonDeliveryHours = netScheduledHours - deliveryCapacityHours;
    const reserveHours = deliveryCapacityHours * reserveRatio;
    const plannedCapacityHours = deliveryCapacityHours - reserveHours;
    const capacityGapHours = plannedCapacityHours - group.demandHours;
    const loadPercent = plannedCapacityHours > 0 ? group.demandHours / plannedCapacityHours * 100 : null;
    const plannedCapacityPerFte = (input.workingDays - group.leaveDaysPerFte) * input.hoursPerDay * focusRatio * (1 - reserveRatio);
    const requiredScheduledFte = plannedCapacityPerFte > 0
      ? group.demandHours / plannedCapacityPerFte
      : group.demandHours === 0 ? 0 : null;
    const additionalScheduledFte = capacityGapHours >= -0.005
      ? 0
      : plannedCapacityPerFte > 0 ? -capacityGapHours / plannedCapacityPerFte : null;

    [
      grossHours,
      absenceHours,
      netScheduledHours,
      nonDeliveryHours,
      deliveryCapacityHours,
      reserveHours,
      plannedCapacityHours,
      capacityGapHours,
      plannedCapacityPerFte,
    ].forEach(assertResult);
    if (loadPercent !== null) assertResult(loadPercent);
    if (requiredScheduledFte !== null) assertResult(requiredScheduledFte);
    if (additionalScheduledFte !== null) assertResult(additionalScheduledFte);

    return {
      ...group,
      label,
      grossHours,
      absenceHours,
      netScheduledHours,
      nonDeliveryHours,
      deliveryCapacityHours,
      reserveHours,
      plannedCapacityHours,
      capacityGapHours,
      loadPercent,
      plannedCapacityPerFte,
      requiredScheduledFte,
      additionalScheduledFte,
      status: statusFor(plannedCapacityHours, group.demandHours),
    };
  });

  const scheduledFte = sum(groups.map((group) => group.scheduledFte));
  const grossHours = sum(groups.map((group) => group.grossHours));
  const absenceHours = sum(groups.map((group) => group.absenceHours));
  const netScheduledHours = sum(groups.map((group) => group.netScheduledHours));
  const nonDeliveryHours = sum(groups.map((group) => group.nonDeliveryHours));
  const deliveryCapacityHours = sum(groups.map((group) => group.deliveryCapacityHours));
  const reserveHours = sum(groups.map((group) => group.reserveHours));
  const plannedCapacityHours = sum(groups.map((group) => group.plannedCapacityHours));
  const demandHours = sum(groups.map((group) => group.demandHours));
  const capacityGapHours = plannedCapacityHours - demandHours;
  const loadPercent = plannedCapacityHours > 0 ? demandHours / plannedCapacityHours * 100 : null;
  const effectivePlannedFte = plannedCapacityHours / standardHoursPerFte;
  const demandFte = demandHours / standardHoursPerFte;
  const additionalFteValues = groups.map((group) => group.additionalScheduledFte);
  const additionalScheduledFte = additionalFteValues.some((value) => value === null)
    ? null
    : sum(additionalFteValues as number[]);

  [
    standardHoursPerFte,
    scheduledFte,
    grossHours,
    absenceHours,
    netScheduledHours,
    nonDeliveryHours,
    deliveryCapacityHours,
    reserveHours,
    plannedCapacityHours,
    demandHours,
    capacityGapHours,
    effectivePlannedFte,
    demandFte,
  ].forEach(assertResult);
  if (loadPercent !== null) assertResult(loadPercent);
  if (additionalScheduledFte !== null) assertResult(additionalScheduledFte);

  return {
    groups,
    standardHoursPerFte,
    scheduledFte,
    grossHours,
    absenceHours,
    netScheduledHours,
    nonDeliveryHours,
    deliveryCapacityHours,
    reserveHours,
    plannedCapacityHours,
    demandHours,
    capacityGapHours,
    loadPercent,
    effectivePlannedFte,
    demandFte,
    additionalScheduledFte,
    status: statusFor(plannedCapacityHours, demandHours),
  };
}

function spreadsheetSafeText(value: string) {
  const singleLine = value.replace(/[\r\n]+/g, " ");
  return /^[=+\-@\t]/.test(singleLine) ? `'${singleLine}` : singleLine;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "คำนวณไม่ได้" : value.toFixed(2);
}

export function teamCapacityCsv(input: TeamCapacityInput, result: TeamCapacityResult) {
  const rows: Array<Array<string | number>> = [
    ["การตั้งค่ารอบ", "ค่า", "หน่วย"],
    ["วันทำงานในรอบ", input.workingDays, "วัน"],
    ["ชั่วโมงมาตรฐานต่อวัน", csvNumber(input.hoursPerDay), "ชั่วโมง"],
    ["Capacity buffer", csvNumber(input.reservePercent), "%"],
    [],
    ["สรุปทีม", "ค่า", "หน่วย"],
    ["กำลังคนตามตาราง", csvNumber(result.scheduledFte), "FTE"],
    ["ชั่วโมงตามตารางก่อนหัก", csvNumber(result.grossHours), "ชั่วโมง"],
    ["ชั่วโมงลา/ไม่พร้อม", csvNumber(result.absenceHours), "ชั่วโมง"],
    ["ชั่วโมงประชุม/แอดมิน/งานอื่น", csvNumber(result.nonDeliveryHours), "ชั่วโมง"],
    ["Delivery capacity ก่อน buffer", csvNumber(result.deliveryCapacityHours), "ชั่วโมง"],
    ["Buffer ที่กันไว้", csvNumber(result.reserveHours), "ชั่วโมง"],
    ["Planned capacity หลัง buffer", csvNumber(result.plannedCapacityHours), "ชั่วโมง"],
    ["Demand", csvNumber(result.demandHours), "ชั่วโมง"],
    ["Capacity gap", csvNumber(result.capacityGapHours), "ชั่วโมง"],
    ["Workload", csvNumber(result.loadPercent), "%"],
    ["Effective planned FTE", csvNumber(result.effectivePlannedFte), "FTE"],
    ["Demand FTE", csvNumber(result.demandFte), "FTE"],
    ["Scheduled FTE ที่ต้องเพิ่ม", csvNumber(result.additionalScheduledFte), "FTE"],
    [],
    ["กลุ่มงาน", "Scheduled FTE", "วันลาเฉลี่ย/FTE", "Focus factor (%)", "Gross hours", "Leave hours", "Non-delivery hours", "Delivery capacity", "Buffer hours", "Planned capacity", "Demand hours", "Gap hours", "Workload (%)", "Required scheduled FTE", "Additional scheduled FTE"],
    ...result.groups.map((group) => [
      spreadsheetSafeText(group.label),
      csvNumber(group.scheduledFte),
      csvNumber(group.leaveDaysPerFte),
      csvNumber(group.focusPercent),
      csvNumber(group.grossHours),
      csvNumber(group.absenceHours),
      csvNumber(group.nonDeliveryHours),
      csvNumber(group.deliveryCapacityHours),
      csvNumber(group.reserveHours),
      csvNumber(group.plannedCapacityHours),
      csvNumber(group.demandHours),
      csvNumber(group.capacityGapHours),
      csvNumber(group.loadPercent),
      csvNumber(group.requiredScheduledFte),
      csvNumber(group.additionalScheduledFte),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
