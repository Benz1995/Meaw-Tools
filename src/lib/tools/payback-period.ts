export type PaybackCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";

export type PaybackPeriodUnit = "month" | "quarter" | "year";

export type PaybackCashFlow = {
  label: string;
  amount: number;
};

export type PaybackInput = {
  currency: PaybackCurrency;
  scenarioName: string;
  periodUnit: PaybackPeriodUnit;
  initialInvestment: number;
  annualDiscountRatePercent: number;
  targetPaybackPeriods: number;
  terminalValue: number;
  cashFlows: PaybackCashFlow[];
};

export type PaybackPoint = {
  exactPeriods: number;
  completedPeriods: number;
  recoveryPeriodIndex: number;
  fractionOfRecoveryPeriod: number;
};

export type PaybackTimelineRow = PaybackCashFlow & {
  period: number;
  terminalValue: number;
  totalCashFlow: number;
  discountFactor: number;
  discountedCashFlow: number;
  cumulativeCashFlow: number;
  cumulativeDiscountedCashFlow: number;
};

export type PaybackResult = {
  periodsPerYear: number;
  periodicDiscountRatePercent: number;
  totalFutureCashFlows: number;
  presentValueOfFutureCashFlows: number;
  undiscountedNetValue: number;
  netPresentValue: number;
  simplePayback: PaybackPoint | null;
  discountedPayback: PaybackPoint | null;
  simpleRecoveryIsSustained: boolean;
  discountedRecoveryIsSustained: boolean;
  simpleRemainingAtHorizon: number;
  discountedRemainingAtHorizon: number;
  hasNegativeFutureCashFlow: boolean;
  timeline: PaybackTimelineRow[];
};

export const PAYBACK_MAX_PERIODS = 60;
export const PAYBACK_MAX_MONEY = 1_000_000_000_000_000;
const MAX_DERIVED_ABSOLUTE_VALUE = 100_000_000_000_000_000;
const SUPPORTED_CURRENCIES = new Set<PaybackCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);
const PERIODS_PER_YEAR: Record<PaybackPeriodUnit, number> = { month: 12, quarter: 4, year: 1 };

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`);
  }
}

function assertDerived(values: number[]) {
  if (values.some((value) => !Number.isFinite(value) || Math.abs(value) > MAX_DERIVED_ABSOLUTE_VALUE)) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาลดจำนวนเงินหรืออัตราคิดลด");
  }
}

function findPaybackPoint(rows: PaybackTimelineRow[], key: "cumulativeCashFlow" | "cumulativeDiscountedCashFlow") {
  for (const row of rows) {
    const cumulative = row[key];
    if (cumulative < -1e-8) continue;

    const recoveryFlow = key === "cumulativeCashFlow" ? row.totalCashFlow : row.discountedCashFlow;
    const priorCumulative = cumulative - recoveryFlow;
    const fraction = priorCumulative < 0 && recoveryFlow > 0
      ? Math.min(1, Math.max(0, -priorCumulative / recoveryFlow))
      : 0;

    return {
      exactPeriods: row.period - 1 + fraction,
      completedPeriods: row.period - 1,
      recoveryPeriodIndex: row.period,
      fractionOfRecoveryPeriod: fraction,
    } satisfies PaybackPoint;
  }
  return null;
}

function recoveryIsSustained(rows: PaybackTimelineRow[], point: PaybackPoint | null, key: "cumulativeCashFlow" | "cumulativeDiscountedCashFlow") {
  if (!point) return false;
  return rows.slice(point.recoveryPeriodIndex - 1).every((row) => row[key] >= -1e-8);
}

export function calculatePayback(input: PaybackInput): PaybackResult {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  if (!input.scenarioName.trim() || input.scenarioName.trim().length > 120) throw new Error("ชื่อ Scenario ต้องมี 1–120 ตัวอักษร");
  if (!(input.periodUnit in PERIODS_PER_YEAR)) throw new Error("หน่วยงวดไม่รองรับ");
  assertFiniteInRange(input.initialInvestment, "เงินลงทุนเริ่มต้น", 0.01, PAYBACK_MAX_MONEY);
  assertFiniteInRange(input.annualDiscountRatePercent, "อัตราคิดลดต่อปี", 0, 1_000);
  assertFiniteInRange(input.targetPaybackPeriods, "เป้าคืนทุน", 0, PAYBACK_MAX_PERIODS);
  assertFiniteInRange(input.terminalValue, "มูลค่าคงเหลือปลายโครงการ", 0, PAYBACK_MAX_MONEY);
  if (input.cashFlows.length < 1 || input.cashFlows.length > PAYBACK_MAX_PERIODS) {
    throw new Error(`กระแสเงินสดต้องมี 1–${PAYBACK_MAX_PERIODS} งวด`);
  }

  const periodsPerYear = PERIODS_PER_YEAR[input.periodUnit];
  const periodicDiscountRate = Math.pow(1 + input.annualDiscountRatePercent / 100, 1 / periodsPerYear) - 1;
  let cumulativeCashFlow = -input.initialInvestment;
  let cumulativeDiscountedCashFlow = -input.initialInvestment;

  const timeline = input.cashFlows.map((cashFlow, index) => {
    const label = cashFlow.label.trim();
    if (!label || label.length > 80) throw new Error(`ชื่องวดที่ ${index + 1} ต้องมี 1–80 ตัวอักษร`);
    assertFiniteInRange(cashFlow.amount, `กระแสเงินสดงวดที่ ${index + 1}`, -PAYBACK_MAX_MONEY, PAYBACK_MAX_MONEY);
    const terminalValue = index === input.cashFlows.length - 1 ? input.terminalValue : 0;
    const totalCashFlow = cashFlow.amount + terminalValue;
    const discountFactor = Math.pow(1 + periodicDiscountRate, index + 1);
    const discountedCashFlow = totalCashFlow / discountFactor;
    cumulativeCashFlow += totalCashFlow;
    cumulativeDiscountedCashFlow += discountedCashFlow;
    assertDerived([totalCashFlow, discountFactor, discountedCashFlow, cumulativeCashFlow, cumulativeDiscountedCashFlow]);

    return {
      ...cashFlow,
      label,
      period: index + 1,
      terminalValue,
      totalCashFlow,
      discountFactor,
      discountedCashFlow,
      cumulativeCashFlow,
      cumulativeDiscountedCashFlow,
    };
  });

  const simplePayback = findPaybackPoint(timeline, "cumulativeCashFlow");
  const discountedPayback = findPaybackPoint(timeline, "cumulativeDiscountedCashFlow");
  const totalFutureCashFlows = timeline.reduce((sum, row) => sum + row.totalCashFlow, 0);
  const presentValueOfFutureCashFlows = timeline.reduce((sum, row) => sum + row.discountedCashFlow, 0);
  const undiscountedNetValue = totalFutureCashFlows - input.initialInvestment;
  const netPresentValue = presentValueOfFutureCashFlows - input.initialInvestment;
  assertDerived([totalFutureCashFlows, presentValueOfFutureCashFlows, undiscountedNetValue, netPresentValue]);

  return {
    periodsPerYear,
    periodicDiscountRatePercent: periodicDiscountRate * 100,
    totalFutureCashFlows,
    presentValueOfFutureCashFlows,
    undiscountedNetValue,
    netPresentValue,
    simplePayback,
    discountedPayback,
    simpleRecoveryIsSustained: recoveryIsSustained(timeline, simplePayback, "cumulativeCashFlow"),
    discountedRecoveryIsSustained: recoveryIsSustained(timeline, discountedPayback, "cumulativeDiscountedCashFlow"),
    simpleRemainingAtHorizon: Math.max(0, -cumulativeCashFlow),
    discountedRemainingAtHorizon: Math.max(0, -cumulativeDiscountedCashFlow),
    hasNegativeFutureCashFlow: input.cashFlows.some((cashFlow) => cashFlow.amount < 0),
    timeline,
  };
}

function safeSpreadsheetText(value: string) {
  const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  return /^[\s]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function csvCell(value: string | number) {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function csvNumber(value: number | null, digits = 2) {
  return value === null ? "" : value.toFixed(digits);
}

export function paybackCsv(input: PaybackInput, result: PaybackResult) {
  const currency = input.currency === "OTHER" ? "OTHER" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["Payback Period & Discounted Payback Calculator", safeSpreadsheetText(input.scenarioName)],
    ["หน่วยงวด", input.periodUnit],
    ["เงินลงทุนเริ่มต้น", csvNumber(input.initialInvestment), currency],
    ["อัตราคิดลดต่อปี", csvNumber(input.annualDiscountRatePercent, 4), "% effective"],
    ["อัตราคิดลดต่องวด", csvNumber(result.periodicDiscountRatePercent, 6), "%"],
    ["มูลค่าคงเหลือปลายโครงการ", csvNumber(input.terminalValue), currency],
    ["เป้าคืนทุน", input.targetPaybackPeriods ? csvNumber(input.targetPaybackPeriods, 4) : "", "period"],
    [],
    ["ผลลัพธ์", "ค่า", "หน่วย"],
    ["Simple payback", csvNumber(result.simplePayback?.exactPeriods ?? null, 6), "period"],
    ["Discounted payback", csvNumber(result.discountedPayback?.exactPeriods ?? null, 6), "period"],
    ["Present value of future cash flows", csvNumber(result.presentValueOfFutureCashFlows), currency],
    ["Net present value (NPV)", csvNumber(result.netPresentValue), currency],
    ["Undiscounted net value", csvNumber(result.undiscountedNetValue), currency],
    [],
    ["งวด", "ชื่อ", "กระแสเงินสด", "Terminal value", "กระแสเงินสดรวม", "Discount factor", "Discounted cash flow", "สะสมแบบ Simple", "สะสมแบบ Discounted"],
    ...result.timeline.map((row) => [
      row.period,
      safeSpreadsheetText(row.label),
      csvNumber(row.amount),
      csvNumber(row.terminalValue),
      csvNumber(row.totalCashFlow),
      csvNumber(row.discountFactor, 8),
      csvNumber(row.discountedCashFlow),
      csvNumber(row.cumulativeCashFlow),
      csvNumber(row.cumulativeDiscountedCashFlow),
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
