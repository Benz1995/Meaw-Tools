export const BILLABLE_HOURS_MAX_MONEY = 1_000_000_000_000;
export const BILLABLE_HOURS_MAX_RESULT = 1_000_000_000_000_000;
export const BILLABLE_HOURS_MAX_ENTRIES = 50;
export const BILLABLE_HOURS_MAX_ENTRY_MINUTES = 10_080;
export const BILLABLE_HOURS_MAX_AVAILABLE_HOURS = 168;
export const BILLABLE_HOURS_MAX_PERIODS_PER_YEAR = 366;

export type BillingIncrementMinutes = 1 | 6 | 10 | 15 | 30 | 60;
export type BillableTimeKind = "billable" | "non-billable";

export type BillableTimeEntry = {
  label: string;
  kind: BillableTimeKind;
  minutes: number;
};

export type BillableHoursInput = {
  entries: BillableTimeEntry[];
  hourlyRate: number;
  availableHours: number;
  targetUtilizationPercent: number;
  periodsPerYear: number;
  billingIncrementMinutes: BillingIncrementMinutes;
};

export type BillableEntryResult = BillableTimeEntry & {
  invoiceMinutes: number;
  roundingAdjustmentMinutes: number;
  rawValue: number;
  invoiceValue: number;
};

export type BillableHoursResult = {
  entries: BillableEntryResult[];
  totalLoggedMinutes: number;
  rawBillableMinutes: number;
  invoiceMinutes: number;
  nonBillableMinutes: number;
  roundingAdjustmentMinutes: number;
  availableMinutes: number;
  targetBillableMinutes: number;
  gapToTargetMinutes: number;
  aboveTargetMinutes: number;
  utilizationPercent: number;
  billableShareOfLoggedPercent: number;
  rawBillableValue: number;
  invoiceRevenue: number;
  roundingAdjustmentRevenue: number;
  effectiveRevenuePerLoggedHour: number;
  projectedAnnualRawBillableHours: number;
  projectedAnnualRawRevenue: number;
  projectedAnnualInvoiceHours: number;
  projectedAnnualInvoiceRevenue: number;
  targetAnnualBillableHours: number;
  targetAnnualRevenue: number;
  annualRevenueGap: number;
};

export type BillingIncrementChartRow = {
  fromMinute: number;
  toMinute: number;
  billedMinutes: number;
  billedDecimalHours: number;
};

const BILLING_INCREMENTS = new Set<BillingIncrementMinutes>([1, 6, 10, 15, 30, 60]);

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > BILLABLE_HOURS_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

function assertBillingIncrement(value: number): asserts value is BillingIncrementMinutes {
  if (!BILLING_INCREMENTS.has(value as BillingIncrementMinutes)) {
    throw new Error("รอบบิลต้องเป็น 1, 6, 10, 15, 30 หรือ 60 นาที");
  }
}

export function roundBillableMinutesUp(minutes: number, increment: BillingIncrementMinutes) {
  assertRange(minutes, "ระยะเวลา", 0, BILLABLE_HOURS_MAX_ENTRY_MINUTES);
  assertBillingIncrement(increment);
  if (minutes === 0) return 0;
  return Math.ceil((minutes - Number.EPSILON) / increment) * increment;
}

export function calculateBillableHours(input: BillableHoursInput): BillableHoursResult {
  if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > BILLABLE_HOURS_MAX_ENTRIES) {
    throw new Error(`ต้องมีรายการเวลา 1 ถึง ${BILLABLE_HOURS_MAX_ENTRIES} รายการ`);
  }
  assertRange(input.hourlyRate, "เรทที่เรียกเก็บต่อชั่วโมง", 0.01, BILLABLE_HOURS_MAX_MONEY);
  assertRange(input.availableHours, "ชั่วโมงทำงานที่ใช้เป็นฐาน", 0.01, BILLABLE_HOURS_MAX_AVAILABLE_HOURS);
  assertRange(input.targetUtilizationPercent, "เป้าหมาย utilization", 0, 100);
  assertRange(input.periodsPerYear, "จำนวนรอบต่อปี", 1, BILLABLE_HOURS_MAX_PERIODS_PER_YEAR);
  if (!Number.isInteger(input.periodsPerYear)) throw new Error("จำนวนรอบต่อปีต้องเป็นจำนวนเต็ม");
  assertBillingIncrement(input.billingIncrementMinutes);

  const entries = input.entries.map((entry, index): BillableEntryResult => {
    const label = entry.label.trim() || `รายการ ${index + 1}`;
    if (label.length > 80) throw new Error(`ชื่อรายการที่ ${index + 1} ต้องไม่เกิน 80 ตัวอักษร`);
    if (entry.kind !== "billable" && entry.kind !== "non-billable") {
      throw new Error(`ประเภทเวลารายการที่ ${index + 1} ไม่ถูกต้อง`);
    }
    assertRange(entry.minutes, `ระยะเวลารายการที่ ${index + 1}`, 0, BILLABLE_HOURS_MAX_ENTRY_MINUTES);
    const invoiceMinutes = entry.kind === "billable"
      ? roundBillableMinutesUp(entry.minutes, input.billingIncrementMinutes)
      : 0;
    const rawValue = entry.kind === "billable" ? entry.minutes / 60 * input.hourlyRate : 0;
    const invoiceValue = invoiceMinutes / 60 * input.hourlyRate;
    [rawValue, invoiceValue].forEach(assertResult);
    return {
      ...entry,
      label,
      invoiceMinutes,
      roundingAdjustmentMinutes: invoiceMinutes - (entry.kind === "billable" ? entry.minutes : 0),
      rawValue,
      invoiceValue,
    };
  });

  let totalLoggedMinutes = 0;
  let rawBillableMinutes = 0;
  let invoiceMinutes = 0;
  for (const entry of entries) {
    totalLoggedMinutes += entry.minutes;
    if (entry.kind === "billable") rawBillableMinutes += entry.minutes;
    invoiceMinutes += entry.invoiceMinutes;
  }

  const nonBillableMinutes = totalLoggedMinutes - rawBillableMinutes;
  const roundingAdjustmentMinutes = invoiceMinutes - rawBillableMinutes;
  const availableMinutes = input.availableHours * 60;
  const targetBillableMinutes = availableMinutes * (input.targetUtilizationPercent / 100);
  const gapToTargetMinutes = Math.max(0, targetBillableMinutes - rawBillableMinutes);
  const aboveTargetMinutes = Math.max(0, rawBillableMinutes - targetBillableMinutes);
  const utilizationPercent = rawBillableMinutes / availableMinutes * 100;
  const billableShareOfLoggedPercent = totalLoggedMinutes > 0 ? rawBillableMinutes / totalLoggedMinutes * 100 : 0;
  const rawBillableValue = rawBillableMinutes / 60 * input.hourlyRate;
  const invoiceRevenue = invoiceMinutes / 60 * input.hourlyRate;
  const roundingAdjustmentRevenue = invoiceRevenue - rawBillableValue;
  const effectiveRevenuePerLoggedHour = totalLoggedMinutes > 0 ? invoiceRevenue / (totalLoggedMinutes / 60) : 0;
  const projectedAnnualRawBillableHours = rawBillableMinutes / 60 * input.periodsPerYear;
  const projectedAnnualRawRevenue = rawBillableValue * input.periodsPerYear;
  const projectedAnnualInvoiceHours = invoiceMinutes / 60 * input.periodsPerYear;
  const projectedAnnualInvoiceRevenue = invoiceRevenue * input.periodsPerYear;
  const targetAnnualBillableHours = targetBillableMinutes / 60 * input.periodsPerYear;
  const targetAnnualRevenue = targetAnnualBillableHours * input.hourlyRate;
  const annualRevenueGap = gapToTargetMinutes / 60 * input.hourlyRate * input.periodsPerYear;
  [
    totalLoggedMinutes,
    invoiceMinutes,
    rawBillableValue,
    invoiceRevenue,
    effectiveRevenuePerLoggedHour,
    projectedAnnualRawRevenue,
    projectedAnnualInvoiceRevenue,
    targetAnnualRevenue,
    annualRevenueGap,
  ].forEach(assertResult);

  return {
    entries,
    totalLoggedMinutes,
    rawBillableMinutes,
    invoiceMinutes,
    nonBillableMinutes,
    roundingAdjustmentMinutes,
    availableMinutes,
    targetBillableMinutes,
    gapToTargetMinutes,
    aboveTargetMinutes,
    utilizationPercent,
    billableShareOfLoggedPercent,
    rawBillableValue,
    invoiceRevenue,
    roundingAdjustmentRevenue,
    effectiveRevenuePerLoggedHour,
    projectedAnnualRawBillableHours,
    projectedAnnualRawRevenue,
    projectedAnnualInvoiceHours,
    projectedAnnualInvoiceRevenue,
    targetAnnualBillableHours,
    targetAnnualRevenue,
    annualRevenueGap,
  };
}

export function buildBillingIncrementChart(
  increment: BillingIncrementMinutes,
  maximumActualMinutes = 60,
): BillingIncrementChartRow[] {
  assertBillingIncrement(increment);
  assertRange(maximumActualMinutes, "ช่วงเวลาของตาราง", 1, BILLABLE_HOURS_MAX_ENTRY_MINUTES);
  if (!Number.isInteger(maximumActualMinutes)) throw new Error("ช่วงเวลาของตารางต้องเป็นจำนวนนาทีเต็ม");

  const rows: BillingIncrementChartRow[] = [];
  for (let fromMinute = 1; fromMinute <= maximumActualMinutes; fromMinute += increment) {
    const toMinute = Math.min(fromMinute + increment - 1, maximumActualMinutes);
    const billedMinutes = Math.ceil(toMinute / increment) * increment;
    rows.push({ fromMinute, toMinute, billedMinutes, billedDecimalHours: billedMinutes / 60 });
  }
  return rows;
}

function spreadsheetSafeText(value: string) {
  const singleLine = value.replace(/[\r\n]+/g, " ");
  return /^[=+\-@\t]/.test(singleLine) ? `'${singleLine}` : singleLine;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number) {
  return value.toFixed(2);
}

export function billableHoursCsv(input: BillableHoursInput, result: BillableHoursResult, currency: string) {
  const rows: Array<Array<string | number>> = [
    ["รายการ", "ค่า", "สกุลเงิน/หน่วย"],
    ["เรทที่เรียกเก็บ", csvNumber(input.hourlyRate), `${currency}/ชั่วโมง`],
    ["รอบปัดบิล", input.billingIncrementMinutes, "นาที/รายการ"],
    ["ชั่วโมงฐานของรอบ", csvNumber(input.availableHours), "ชั่วโมง"],
    ["เป้าหมาย utilization", csvNumber(input.targetUtilizationPercent), "%"],
    ["เวลาที่บันทึกรวม", csvNumber(result.totalLoggedMinutes), "นาที"],
    ["Billable time ก่อนปัด", csvNumber(result.rawBillableMinutes), "นาที"],
    ["เวลาที่ออกบิลหลังปัด", csvNumber(result.invoiceMinutes), "นาที"],
    ["Non-billable time", csvNumber(result.nonBillableMinutes), "นาที"],
    ["Billable utilization", csvNumber(result.utilizationPercent), "%"],
    ["รายรับของรอบหลังปัด", csvNumber(result.invoiceRevenue), currency],
    ["จำนวนรอบต่อปี", csvNumber(input.periodsPerYear), "รอบ"],
    ["มูลค่าเวลาจริงตามรอบต่อปี", csvNumber(result.projectedAnnualRawRevenue), currency],
    ["รายรับตามเวลาออกบิลต่อปี", csvNumber(result.projectedAnnualInvoiceRevenue), currency],
    ["รายรับที่เป้าหมายต่อปี", csvNumber(result.targetAnnualRevenue), currency],
    ["ช่องว่างรายรับถึงเป้าต่อปี", csvNumber(result.annualRevenueGap), currency],
    [],
    ["รายการเวลา", "ประเภท", "เวลาจริง (นาที)", "เวลาออกบิล (นาที)", "ส่วนเพิ่มจากการปัด (นาที)", `มูลค่า (${currency})`],
    ...result.entries.map((entry) => [
      spreadsheetSafeText(entry.label),
      entry.kind === "billable" ? "Billable" : "Non-billable",
      csvNumber(entry.minutes),
      csvNumber(entry.invoiceMinutes),
      csvNumber(entry.roundingAdjustmentMinutes),
      csvNumber(entry.invoiceValue),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
