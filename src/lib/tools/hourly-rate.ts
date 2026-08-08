export const HOURLY_RATE_MAX_MONEY = 1_000_000_000_000;
export const HOURLY_RATE_MAX_RESULT = 1_000_000_000_000_000;
export const HOURLY_RATE_MAX_HOURS_PER_WEEK = 168;
export const HOURLY_RATE_MAX_WEEKS_PER_YEAR = 53;
export const HOURLY_RATE_MAX_BUFFER_PERCENT = 500;
export const HOURLY_RATE_MAX_PLATFORM_FEE_PERCENT = 95;

export type PayPeriod = "hourly" | "daily" | "weekly" | "monthly" | "annual";
export type RateRoundingStep = 0 | 1 | 5 | 10 | 50 | 100;

export type SalaryRateInput = {
  amount: number;
  payPeriod: PayPeriod;
  hoursPerWeek: number;
  workDaysPerWeek: number;
  workWeeksPerYear: number;
  annualAdditionalPay: number;
};

export type SalaryRateResult = {
  regularAnnualIncome: number;
  annualAdditionalPay: number;
  annualIncome: number;
  annualHours: number;
  annualWorkDays: number;
  hoursPerDay: number;
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
};

export type FreelanceRateInput = {
  desiredAnnualIncome: number;
  annualOverhead: number;
  annualReserve: number;
  bufferPercent: number;
  platformFeePercent: number;
  billableHoursPerWeek: number;
  billableWeeksPerYear: number;
  billableHoursPerDay: number;
  roundingStep: RateRoundingStep;
  projectHours: number;
  projectDirectCosts: number;
};

export type FreelanceRateResult = {
  annualBillableHours: number;
  baseAnnualNeed: number;
  bufferAmount: number;
  revenueBeforePlatformFee: number;
  requiredAnnualRevenue: number;
  platformFeeAmount: number;
  exactHourlyRate: number;
  roundedHourlyRate: number;
  roundingDelta: number;
  dayRate: number;
  weeklyBillableTarget: number;
  monthlyRevenueTarget: number;
  projectLabor: number;
  projectDirectCostsWithFee: number;
  projectQuote: number;
};

const PAY_PERIOD_LABELS: Record<PayPeriod, string> = {
  hourly: "รายชั่วโมง",
  daily: "รายวัน",
  weekly: "รายสัปดาห์",
  monthly: "รายเดือน",
  annual: "รายปี",
};
const ROUNDING_STEPS = new Set<RateRoundingStep>([0, 1, 5, 10, 50, 100]);

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertMoney(value: number, label: string, minimum = 0) {
  assertRange(value, label, minimum, HOURLY_RATE_MAX_MONEY);
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || value > HOURLY_RATE_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

export function roundRateUp(value: number, step: RateRoundingStep) {
  if (!ROUNDING_STEPS.has(step)) throw new Error("หน่วยปัดเรทไม่ถูกต้อง");
  return step === 0 ? value : Math.ceil((value - Number.EPSILON) / step) * step;
}

export function calculateSalaryRate(input: SalaryRateInput): SalaryRateResult {
  assertMoney(input.amount, "ค่าจ้างหรือเงินเดือน", 0.01);
  assertMoney(input.annualAdditionalPay, "โบนัสและรายได้เพิ่มต่อปี");
  assertRange(input.hoursPerWeek, "ชั่วโมงทำงานต่อสัปดาห์", 0.01, HOURLY_RATE_MAX_HOURS_PER_WEEK);
  assertRange(input.workDaysPerWeek, "วันทำงานต่อสัปดาห์", 0.01, 7);
  assertRange(input.workWeeksPerYear, "สัปดาห์ทำงานต่อปี", 0.01, HOURLY_RATE_MAX_WEEKS_PER_YEAR);
  const hoursPerDay = input.hoursPerWeek / input.workDaysPerWeek;
  if (hoursPerDay > 24) throw new Error("ชั่วโมงทำงานเฉลี่ยต่อวันต้องไม่เกิน 24 ชั่วโมง กรุณาตรวจชั่วโมงและวันทำงาน");

  const annualHours = input.hoursPerWeek * input.workWeeksPerYear;
  const annualWorkDays = input.workDaysPerWeek * input.workWeeksPerYear;
  const multipliers: Record<PayPeriod, number> = {
    hourly: annualHours,
    daily: annualWorkDays,
    weekly: input.workWeeksPerYear,
    monthly: 12,
    annual: 1,
  };
  if (!(input.payPeriod in multipliers)) throw new Error("งวดค่าจ้างไม่ถูกต้อง");
  const regularAnnualIncome = input.amount * multipliers[input.payPeriod];
  const annualIncome = regularAnnualIncome + input.annualAdditionalPay;
  assertResult(annualIncome);

  return {
    regularAnnualIncome,
    annualAdditionalPay: input.annualAdditionalPay,
    annualIncome,
    annualHours,
    annualWorkDays,
    hoursPerDay,
    hourlyRate: annualIncome / annualHours,
    dailyRate: annualIncome / annualWorkDays,
    weeklyRate: annualIncome / input.workWeeksPerYear,
    monthlyRate: annualIncome / 12,
  };
}

export function calculateFreelanceRate(input: FreelanceRateInput): FreelanceRateResult {
  assertMoney(input.desiredAnnualIncome, "รายได้ส่วนตัวเป้าหมายต่อปี", 0.01);
  assertMoney(input.annualOverhead, "ต้นทุนธุรกิจต่อปี");
  assertMoney(input.annualReserve, "เงินสำรองและสวัสดิการต่อปี");
  assertRange(input.bufferPercent, "ส่วนเผื่อความเสี่ยงหรือกำไร", 0, HOURLY_RATE_MAX_BUFFER_PERCENT);
  assertRange(input.platformFeePercent, "ค่าธรรมเนียมแพลตฟอร์มหรือการรับเงิน", 0, HOURLY_RATE_MAX_PLATFORM_FEE_PERCENT);
  assertRange(input.billableHoursPerWeek, "ชั่วโมงที่เรียกเก็บเงินได้ต่อสัปดาห์", 0.01, HOURLY_RATE_MAX_HOURS_PER_WEEK);
  assertRange(input.billableWeeksPerYear, "สัปดาห์ที่รับงานต่อปี", 0.01, HOURLY_RATE_MAX_WEEKS_PER_YEAR);
  assertRange(input.billableHoursPerDay, "ชั่วโมงคิดค่าบริการต่อวัน", 0.01, 24);
  assertMoney(input.projectHours, "ชั่วโมงของโปรเจกต์");
  assertMoney(input.projectDirectCosts, "ค่าใช้จ่ายตรงของโปรเจกต์");
  if (!ROUNDING_STEPS.has(input.roundingStep)) throw new Error("หน่วยปัดเรทไม่ถูกต้อง");

  const annualBillableHours = input.billableHoursPerWeek * input.billableWeeksPerYear;
  const baseAnnualNeed = input.desiredAnnualIncome + input.annualOverhead + input.annualReserve;
  const bufferAmount = baseAnnualNeed * (input.bufferPercent / 100);
  const revenueBeforePlatformFee = baseAnnualNeed + bufferAmount;
  const platformMultiplier = 1 - input.platformFeePercent / 100;
  const requiredAnnualRevenue = revenueBeforePlatformFee / platformMultiplier;
  const platformFeeAmount = requiredAnnualRevenue - revenueBeforePlatformFee;
  const exactHourlyRate = requiredAnnualRevenue / annualBillableHours;
  const roundedHourlyRate = roundRateUp(exactHourlyRate, input.roundingStep);
  const projectLabor = roundedHourlyRate * input.projectHours;
  const projectDirectCostsWithFee = input.projectDirectCosts / platformMultiplier;
  const projectQuote = projectLabor + projectDirectCostsWithFee;
  [baseAnnualNeed, requiredAnnualRevenue, exactHourlyRate, projectQuote].forEach(assertResult);

  return {
    annualBillableHours,
    baseAnnualNeed,
    bufferAmount,
    revenueBeforePlatformFee,
    requiredAnnualRevenue,
    platformFeeAmount,
    exactHourlyRate,
    roundedHourlyRate,
    roundingDelta: roundedHourlyRate - exactHourlyRate,
    dayRate: roundedHourlyRate * input.billableHoursPerDay,
    weeklyBillableTarget: roundedHourlyRate * input.billableHoursPerWeek,
    monthlyRevenueTarget: requiredAnnualRevenue / 12,
    projectLabor,
    projectDirectCostsWithFee,
    projectQuote,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number) {
  return value.toFixed(2);
}

export function salaryRateCsv(input: SalaryRateInput, result: SalaryRateResult, currency: string) {
  const rows = [
    ["รายการ", "ค่า", "สกุลเงิน/หน่วย"],
    ["ค่าจ้างที่กรอก", csvNumber(input.amount), `${currency} ${PAY_PERIOD_LABELS[input.payPeriod]}`],
    ["โบนัสและรายได้เพิ่มต่อปี", csvNumber(input.annualAdditionalPay), currency],
    ["ชั่วโมงทำงานต่อสัปดาห์", csvNumber(input.hoursPerWeek), "ชั่วโมง"],
    ["วันทำงานต่อสัปดาห์", csvNumber(input.workDaysPerWeek), "วัน"],
    ["สัปดาห์ทำงานต่อปี", csvNumber(input.workWeeksPerYear), "สัปดาห์"],
    ["เทียบรายชั่วโมง", csvNumber(result.hourlyRate), currency],
    ["เทียบรายวัน", csvNumber(result.dailyRate), currency],
    ["เทียบรายสัปดาห์", csvNumber(result.weeklyRate), currency],
    ["เทียบรายเดือน", csvNumber(result.monthlyRate), currency],
    ["เทียบรายปี", csvNumber(result.annualIncome), currency],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function freelanceRateCsv(input: FreelanceRateInput, result: FreelanceRateResult, currency: string) {
  const rows = [
    ["รายการ", "ค่า", "สกุลเงิน/หน่วย"],
    ["รายได้ส่วนตัวเป้าหมายต่อปี", csvNumber(input.desiredAnnualIncome), currency],
    ["ต้นทุนธุรกิจต่อปี", csvNumber(input.annualOverhead), currency],
    ["เงินสำรองและสวัสดิการต่อปี", csvNumber(input.annualReserve), currency],
    ["ส่วนเผื่อความเสี่ยงหรือกำไร", csvNumber(input.bufferPercent), "%"],
    ["ค่าธรรมเนียมแพลตฟอร์ม", csvNumber(input.platformFeePercent), "%"],
    ["ชั่วโมงที่เรียกเก็บเงินได้ต่อปี", csvNumber(result.annualBillableHours), "ชั่วโมง"],
    ["รายรับธุรกิจเป้าหมายต่อปี", csvNumber(result.requiredAnnualRevenue), currency],
    ["เรทขั้นต่ำก่อนปัด", csvNumber(result.exactHourlyRate), `${currency}/ชั่วโมง`],
    ["เรทหลังปัดขึ้น", csvNumber(result.roundedHourlyRate), `${currency}/ชั่วโมง`],
    ["เรทรายวัน", csvNumber(result.dayRate), `${currency}/วัน`],
    ["ราคาโปรเจกต์ขั้นต่ำ", csvNumber(result.projectQuote), currency],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
