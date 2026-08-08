export const THAI_OVERTIME_RULESET = {
  label: "อัตราขั้นต่ำทั่วไปตาม พ.ร.บ. คุ้มครองแรงงาน",
  reviewedAt: "2026-08-08",
  monthlyDivisorDays: 30,
  workdayOvertimeMultiplier: 1.5,
  entitledHolidayRegularMultiplier: 1,
  notEntitledHolidayRegularMultiplier: 2,
  holidayOvertimeMultiplier: 3,
} as const;

export type WageType = "monthly" | "daily" | "hourly";
export type HolidayPayEntitlement = "entitled" | "not-entitled";

export type OvertimeCalculationInput = {
  wageType: WageType;
  wageAmount: number;
  normalHoursPerDay: number;
  workdayOvertimeHours: number;
  holidayRegularHours: number;
  holidayOvertimeHours: number;
  holidayPayEntitlement: HolidayPayEntitlement;
};

export type OvertimeCalculationResult = {
  hourlyWage: number;
  workdayOvertimeRate: number;
  holidayRegularRate: number;
  holidayOvertimeRate: number;
  workdayOvertimePay: number;
  holidayRegularPay: number;
  holidayOvertimePay: number;
  totalAdditionalPay: number;
  estimatedMonthlyGross: number | null;
};

function assertFiniteRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

export function calculateOvertime(input: OvertimeCalculationInput): OvertimeCalculationResult {
  assertFiniteRange(input.wageAmount, "ค่าจ้าง", 0.01, 100_000_000);
  assertFiniteRange(input.normalHoursPerDay, "ชั่วโมงทำงานปกติต่อวัน", 0.01, 24);
  assertFiniteRange(input.workdayOvertimeHours, "ชั่วโมง OT วันทำงาน", 0, 744);
  assertFiniteRange(input.holidayRegularHours, "ชั่วโมงทำงานปกติในวันหยุด", 0, 744);
  assertFiniteRange(input.holidayOvertimeHours, "ชั่วโมง OT ในวันหยุด", 0, 744);

  const totalHours = input.workdayOvertimeHours + input.holidayRegularHours + input.holidayOvertimeHours;
  if (totalHours === 0) throw new Error("กรุณากรอกชั่วโมงทำงานอย่างน้อย 1 รายการ");
  if (totalHours > 744) throw new Error("ชั่วโมงรวมต้องไม่เกิน 744 ชั่วโมงต่อรอบที่คำนวณ");

  const hourlyWage = input.wageType === "monthly"
    ? input.wageAmount / (THAI_OVERTIME_RULESET.monthlyDivisorDays * input.normalHoursPerDay)
    : input.wageType === "daily"
      ? input.wageAmount / input.normalHoursPerDay
      : input.wageAmount;
  const holidayRegularMultiplier = input.holidayPayEntitlement === "entitled"
    ? THAI_OVERTIME_RULESET.entitledHolidayRegularMultiplier
    : THAI_OVERTIME_RULESET.notEntitledHolidayRegularMultiplier;
  const workdayOvertimeRate = hourlyWage * THAI_OVERTIME_RULESET.workdayOvertimeMultiplier;
  const holidayRegularRate = hourlyWage * holidayRegularMultiplier;
  const holidayOvertimeRate = hourlyWage * THAI_OVERTIME_RULESET.holidayOvertimeMultiplier;
  const workdayOvertimePay = workdayOvertimeRate * input.workdayOvertimeHours;
  const holidayRegularPay = holidayRegularRate * input.holidayRegularHours;
  const holidayOvertimePay = holidayOvertimeRate * input.holidayOvertimeHours;
  const totalAdditionalPay = workdayOvertimePay + holidayRegularPay + holidayOvertimePay;

  return {
    hourlyWage,
    workdayOvertimeRate,
    holidayRegularRate,
    holidayOvertimeRate,
    workdayOvertimePay,
    holidayRegularPay,
    holidayOvertimePay,
    totalAdditionalPay,
    estimatedMonthlyGross: input.wageType === "monthly" ? input.wageAmount + totalAdditionalPay : null,
  };
}
