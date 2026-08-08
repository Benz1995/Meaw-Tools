export const LABOR_COST_MAX_MONEY = 1_000_000_000_000;
export const LABOR_COST_MAX_RESULT = 1_000_000_000_000_000;
export const LABOR_COST_MAX_HEADCOUNT = 100_000;
export const LABOR_COST_MAX_PERCENT = 500;
export const LABOR_COST_MAX_HOURS_PER_WEEK = 168;
export const LABOR_COST_MAX_WEEKS_PER_YEAR = 53;
export const LABOR_COST_MAX_DAYS_PER_YEAR = 366;

export type LaborPayBasis = "monthly" | "annual" | "hourly";

export type LaborCostInput = {
  payBasis: LaborPayBasis;
  payAmount: number;
  headcount: number;
  hoursPerWeek: number;
  paidWeeksPerYear: number;
  workdaysPerWeek: number;
  annualBonus: number;
  annualAllowances: number;
  employerContributionPercent: number;
  retirementPercent: number;
  otherWageLinkedPercent: number;
  annualBenefits: number;
  annualTrainingCost: number;
  annualEquipmentSoftware: number;
  annualWorkspaceCost: number;
  annualRecruitingCost: number;
  annualOtherCost: number;
  allocatedOverheadPercent: number;
  paidLeaveDays: number;
  paidHolidayDays: number;
  otherNonproductiveDays: number;
};

export type LaborCostBreakdown = {
  basePay: number;
  variableCashPay: number;
  wageLinkedBurden: number;
  fixedEmployeeCosts: number;
  allocatedOverhead: number;
};

export type LaborCostResult = {
  annualBasePayPerEmployee: number;
  directCashCompensationPerEmployee: number;
  employerContributionCost: number;
  retirementCost: number;
  otherWageLinkedCost: number;
  wageLinkedBurdenPerEmployee: number;
  fixedEmployeeCostsPerEmployee: number;
  allocatedOverheadPerEmployee: number;
  loadedAnnualCostPerEmployee: number;
  loadedMonthlyCostPerEmployee: number;
  burdenCostPerEmployee: number;
  burdenRatePercent: number;
  costMultiplier: number;
  paidHoursPerEmployee: number;
  nonproductiveHoursPerEmployee: number;
  productiveHoursPerEmployee: number;
  loadedCostPerPaidHour: number;
  loadedCostPerProductiveHour: number | null;
  teamAnnualCost: number;
  teamMonthlyCost: number;
  teamProductiveHours: number;
  breakdown: LaborCostBreakdown;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > LABOR_COST_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

function annualizeBasePay(input: LaborCostInput) {
  if (input.payBasis === "monthly") return input.payAmount * 12;
  if (input.payBasis === "annual") return input.payAmount;
  if (input.payBasis === "hourly") return input.payAmount * input.hoursPerWeek * input.paidWeeksPerYear;
  throw new Error("รูปแบบค่าจ้างไม่ถูกต้อง");
}

export function calculateLaborCost(input: LaborCostInput): LaborCostResult {
  assertRange(input.payAmount, "ค่าจ้างฐาน", 0.01, LABOR_COST_MAX_MONEY);
  assertRange(input.headcount, "จำนวนพนักงาน", 1, LABOR_COST_MAX_HEADCOUNT);
  if (!Number.isInteger(input.headcount)) throw new Error("จำนวนพนักงานต้องเป็นจำนวนเต็ม");
  assertRange(input.hoursPerWeek, "ชั่วโมงที่จ่ายต่อสัปดาห์", 0.25, LABOR_COST_MAX_HOURS_PER_WEEK);
  assertRange(input.paidWeeksPerYear, "สัปดาห์ที่จ่ายต่อปี", 0.25, LABOR_COST_MAX_WEEKS_PER_YEAR);
  assertRange(input.workdaysPerWeek, "วันทำงานต่อสัปดาห์", 1, 7);
  if (!Number.isInteger(input.workdaysPerWeek)) throw new Error("วันทำงานต่อสัปดาห์ต้องเป็นจำนวนเต็ม");

  const moneyFields: Array<[number, string]> = [
    [input.annualBonus, "โบนัส/คอมมิชชันต่อปี"],
    [input.annualAllowances, "เบี้ยเลี้ยง/ค่าตอบแทนอื่นต่อปี"],
    [input.annualBenefits, "สวัสดิการคงที่ต่อปี"],
    [input.annualTrainingCost, "ค่าอบรมต่อปี"],
    [input.annualEquipmentSoftware, "อุปกรณ์และซอฟต์แวร์ต่อปี"],
    [input.annualWorkspaceCost, "พื้นที่ทำงานต่อปี"],
    [input.annualRecruitingCost, "ค่า Recruiting/Onboarding ที่เฉลี่ยต่อปี"],
    [input.annualOtherCost, "ต้นทุนอื่นต่อปี"],
  ];
  moneyFields.forEach(([value, label]) => assertRange(value, label, 0, LABOR_COST_MAX_MONEY));

  const percentFields: Array<[number, string]> = [
    [input.employerContributionPercent, "ภาษีและเงินสมทบฝั่งนายจ้าง"],
    [input.retirementPercent, "เงินสมทบเกษียณ/กองทุน"],
    [input.otherWageLinkedPercent, "ภาระอื่นที่ผูกกับค่าจ้าง"],
    [input.allocatedOverheadPercent, "Overhead ที่จัดสรร"],
  ];
  percentFields.forEach(([value, label]) => assertRange(value, label, 0, LABOR_COST_MAX_PERCENT));

  const dayFields: Array<[number, string]> = [
    [input.paidLeaveDays, "วันลาที่ได้รับค่าจ้าง"],
    [input.paidHolidayDays, "วันหยุดที่ได้รับค่าจ้าง"],
    [input.otherNonproductiveDays, "วันอบรม/แอดมินที่ไม่สร้างชั่วโมงส่งมอบ"],
  ];
  dayFields.forEach(([value, label]) => assertRange(value, label, 0, LABOR_COST_MAX_DAYS_PER_YEAR));

  const paidHoursPerEmployee = input.hoursPerWeek * input.paidWeeksPerYear;
  const scheduledWorkdays = input.workdaysPerWeek * input.paidWeeksPerYear;
  const nonproductiveDays = input.paidLeaveDays + input.paidHolidayDays + input.otherNonproductiveDays;
  if (nonproductiveDays > scheduledWorkdays + 0.000_001) {
    throw new Error("วันลาหยุดและวันไม่ส่งมอบรวมกันต้องไม่เกินวันทำงานที่จ่ายในรอบปี");
  }

  const annualBasePayPerEmployee = annualizeBasePay(input);
  const variableCashPay = input.annualBonus + input.annualAllowances;
  const directCashCompensationPerEmployee = annualBasePayPerEmployee + variableCashPay;
  const employerContributionCost = annualBasePayPerEmployee * input.employerContributionPercent / 100;
  const retirementCost = annualBasePayPerEmployee * input.retirementPercent / 100;
  const otherWageLinkedCost = annualBasePayPerEmployee * input.otherWageLinkedPercent / 100;
  const wageLinkedBurdenPerEmployee = employerContributionCost + retirementCost + otherWageLinkedCost;
  const fixedEmployeeCostsPerEmployee = moneyFields.slice(2).reduce((total, [value]) => total + value, 0);
  const allocatedOverheadPerEmployee = directCashCompensationPerEmployee * input.allocatedOverheadPercent / 100;
  const loadedAnnualCostPerEmployee = directCashCompensationPerEmployee
    + wageLinkedBurdenPerEmployee
    + fixedEmployeeCostsPerEmployee
    + allocatedOverheadPerEmployee;
  const loadedMonthlyCostPerEmployee = loadedAnnualCostPerEmployee / 12;
  const burdenCostPerEmployee = loadedAnnualCostPerEmployee - annualBasePayPerEmployee;
  const burdenRatePercent = burdenCostPerEmployee / annualBasePayPerEmployee * 100;
  const costMultiplier = loadedAnnualCostPerEmployee / annualBasePayPerEmployee;
  const hoursPerWorkday = input.hoursPerWeek / input.workdaysPerWeek;
  const nonproductiveHoursPerEmployee = nonproductiveDays * hoursPerWorkday;
  const productiveHoursPerEmployee = Math.max(0, paidHoursPerEmployee - nonproductiveHoursPerEmployee);
  const loadedCostPerPaidHour = loadedAnnualCostPerEmployee / paidHoursPerEmployee;
  const loadedCostPerProductiveHour = productiveHoursPerEmployee > 0
    ? loadedAnnualCostPerEmployee / productiveHoursPerEmployee
    : null;
  const teamAnnualCost = loadedAnnualCostPerEmployee * input.headcount;
  const teamMonthlyCost = teamAnnualCost / 12;
  const teamProductiveHours = productiveHoursPerEmployee * input.headcount;
  const breakdown: LaborCostBreakdown = {
    basePay: annualBasePayPerEmployee,
    variableCashPay,
    wageLinkedBurden: wageLinkedBurdenPerEmployee,
    fixedEmployeeCosts: fixedEmployeeCostsPerEmployee,
    allocatedOverhead: allocatedOverheadPerEmployee,
  };

  [
    annualBasePayPerEmployee,
    directCashCompensationPerEmployee,
    employerContributionCost,
    retirementCost,
    otherWageLinkedCost,
    wageLinkedBurdenPerEmployee,
    fixedEmployeeCostsPerEmployee,
    allocatedOverheadPerEmployee,
    loadedAnnualCostPerEmployee,
    loadedMonthlyCostPerEmployee,
    burdenCostPerEmployee,
    burdenRatePercent,
    costMultiplier,
    paidHoursPerEmployee,
    nonproductiveHoursPerEmployee,
    productiveHoursPerEmployee,
    loadedCostPerPaidHour,
    teamAnnualCost,
    teamMonthlyCost,
    teamProductiveHours,
    ...Object.values(breakdown),
  ].forEach(assertResult);
  if (loadedCostPerProductiveHour !== null) assertResult(loadedCostPerProductiveHour);

  return {
    annualBasePayPerEmployee,
    directCashCompensationPerEmployee,
    employerContributionCost,
    retirementCost,
    otherWageLinkedCost,
    wageLinkedBurdenPerEmployee,
    fixedEmployeeCostsPerEmployee,
    allocatedOverheadPerEmployee,
    loadedAnnualCostPerEmployee,
    loadedMonthlyCostPerEmployee,
    burdenCostPerEmployee,
    burdenRatePercent,
    costMultiplier,
    paidHoursPerEmployee,
    nonproductiveHoursPerEmployee,
    productiveHoursPerEmployee,
    loadedCostPerPaidHour,
    loadedCostPerProductiveHour,
    teamAnnualCost,
    teamMonthlyCost,
    teamProductiveHours,
    breakdown,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "คำนวณไม่ได้" : value.toFixed(2);
}

export function laborCostCsv(input: LaborCostInput, result: LaborCostResult, currency: string) {
  const payBasisLabel: Record<LaborPayBasis, string> = { monthly: "รายเดือน", annual: "รายปี", hourly: "รายชั่วโมง" };
  const rows: Array<Array<string | number>> = [
    ["การตั้งค่า", "ค่า", "หน่วย"],
    ["รูปแบบค่าจ้าง", payBasisLabel[input.payBasis], ""],
    ["ค่าจ้างฐานที่กรอก", csvNumber(input.payAmount), currency],
    ["จำนวนพนักงาน", input.headcount, "คน"],
    ["ชั่วโมงที่จ่ายต่อสัปดาห์", csvNumber(input.hoursPerWeek), "ชั่วโมง"],
    ["สัปดาห์ที่จ่ายต่อปี", csvNumber(input.paidWeeksPerYear), "สัปดาห์"],
    ["วันทำงานต่อสัปดาห์", input.workdaysPerWeek, "วัน"],
    ["วันลาที่ได้รับค่าจ้าง", csvNumber(input.paidLeaveDays), "วัน/ปี"],
    ["วันหยุดที่ได้รับค่าจ้าง", csvNumber(input.paidHolidayDays), "วัน/ปี"],
    ["วันอบรม/แอดมินที่ไม่ส่งมอบ", csvNumber(input.otherNonproductiveDays), "วัน/ปี"],
    [],
    ["ต้นทุนต่อพนักงาน", "ค่า", "หน่วย"],
    ["ค่าจ้างฐานต่อปี", csvNumber(result.annualBasePayPerEmployee), currency],
    ["โบนัส/คอมมิชชัน", csvNumber(input.annualBonus), currency],
    ["เบี้ยเลี้ยง/ค่าตอบแทนอื่น", csvNumber(input.annualAllowances), currency],
    ["ภาษีและเงินสมทบฝั่งนายจ้าง", csvNumber(result.employerContributionCost), currency],
    ["เงินสมทบเกษียณ/กองทุน", csvNumber(result.retirementCost), currency],
    ["ภาระอื่นที่ผูกกับค่าจ้าง", csvNumber(result.otherWageLinkedCost), currency],
    ["ต้นทุนคงที่ของพนักงาน", csvNumber(result.fixedEmployeeCostsPerEmployee), currency],
    ["Overhead ที่จัดสรร", csvNumber(result.allocatedOverheadPerEmployee), currency],
    ["ต้นทุนรวมต่อปี", csvNumber(result.loadedAnnualCostPerEmployee), currency],
    ["ต้นทุนรวมต่อเดือน", csvNumber(result.loadedMonthlyCostPerEmployee), currency],
    ["ภาระเหนือค่าจ้างฐาน", csvNumber(result.burdenCostPerEmployee), currency],
    ["Labor burden rate", csvNumber(result.burdenRatePercent), "%"],
    ["Cost multiplier", csvNumber(result.costMultiplier), "เท่า"],
    ["ชั่วโมงที่จ่ายต่อปี", csvNumber(result.paidHoursPerEmployee), "ชั่วโมง"],
    ["ชั่วโมงที่ส่งมอบได้", csvNumber(result.productiveHoursPerEmployee), "ชั่วโมง"],
    ["ต้นทุนต่อชั่วโมงที่จ่าย", csvNumber(result.loadedCostPerPaidHour), currency],
    ["ต้นทุนต่อชั่วโมงที่ส่งมอบได้", csvNumber(result.loadedCostPerProductiveHour), currency],
    [],
    ["ต้นทุนทีม", "ค่า", "หน่วย"],
    ["ต้นทุนทีมต่อปี", csvNumber(result.teamAnnualCost), currency],
    ["ต้นทุนทีมต่อเดือน", csvNumber(result.teamMonthlyCost), currency],
    ["ชั่วโมงส่งมอบของทีม", csvNumber(result.teamProductiveHours), "ชั่วโมง"],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
