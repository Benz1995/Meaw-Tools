export type IrrCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";
export type IrrPeriodUnit = "month" | "quarter" | "year";
export type IrrCashFlowPattern = "conventional-investment" | "conventional-financing" | "non-conventional";
export type IrrRootStatus = "unique" | "multiple" | "ambiguous" | "none" | "outside-range";

export type IrrCashFlow = {
  label: string;
  amount: number;
};

export type IrrMirrInput = {
  currency: IrrCurrency;
  scenarioName: string;
  periodUnit: IrrPeriodUnit;
  annualHurdleRatePercent: number;
  annualFinanceRatePercent: number;
  annualReinvestmentRatePercent: number;
  cashFlows: IrrCashFlow[];
};

export type IrrRoot = {
  periodicRatePercent: number;
  annualEffectiveRatePercent: number;
  npvResidual: number;
};

export type IrrTimelineRow = IrrCashFlow & {
  period: number;
  discountFactor: number;
  presentValue: number;
  cumulativePresentValue: number;
};

export type IrrProfilePoint = {
  periodicRatePercent: number;
  netPresentValue: number;
};

export type IrrMirrResult = {
  periodsPerYear: number;
  periodicHurdleRatePercent: number;
  periodicFinanceRatePercent: number;
  periodicReinvestmentRatePercent: number;
  cashFlowPattern: IrrCashFlowPattern;
  signChanges: number;
  rootStatus: IrrRootStatus;
  roots: IrrRoot[];
  mirrPeriodicRatePercent: number;
  mirrAnnualEffectiveRatePercent: number;
  netPresentValueAtHurdleRate: number;
  presentValueOfNegativeCashFlows: number;
  futureValueOfPositiveCashFlows: number;
  totalCashInflow: number;
  totalCashOutflow: number;
  timeline: IrrTimelineRow[];
  profile: IrrProfilePoint[];
};

export const IRR_MAX_PERIODS = 60;
export const IRR_MAX_MONEY = 1_000_000_000_000_000;
export const IRR_MIN_PERIODIC_RATE_PERCENT = -99.99;
export const IRR_MAX_PERIODIC_RATE_PERCENT = 100_000;

const ROOT_VALUE_TOLERANCE = 1e-8;
const ROOT_LOG_TOLERANCE = 1e-12;
const SUPPORTED_CURRENCIES = new Set<IrrCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);
const PERIODS_PER_YEAR: Record<IrrPeriodUnit, number> = { month: 12, quarter: 4, year: 1 };

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`);
  }
}

function annualToPeriodicRate(annualRatePercent: number, periodsPerYear: number) {
  return Math.pow(1 + annualRatePercent / 100, 1 / periodsPerYear) - 1;
}

function periodicToAnnualRate(periodicRate: number, periodsPerYear: number) {
  return Math.pow(1 + periodicRate, periodsPerYear) - 1;
}

function trimPolynomial(coefficients: number[]) {
  const next = [...coefficients];
  while (next.length > 1 && Math.abs(next[next.length - 1]!) <= Number.EPSILON) next.pop();
  return next;
}

function normalizePolynomial(coefficients: number[]) {
  const trimmed = trimPolynomial(coefficients);
  const scale = Math.max(...trimmed.map(Math.abs), 1);
  return trimmed.map((coefficient) => coefficient / scale);
}

/**
 * Evaluates P(q), scaled by q^degree when q > 1. Scaling preserves roots and
 * signs while avoiding overflow for long cash-flow series near a -100% rate.
 */
function evaluatePolynomialScaled(coefficients: number[], q: number) {
  if (q <= 1) {
    let value = coefficients[coefficients.length - 1]!;
    for (let index = coefficients.length - 2; index >= 0; index -= 1) value = value * q + coefficients[index]!;
    return value;
  }

  const reciprocal = 1 / q;
  let value = coefficients[0]!;
  for (let index = 1; index < coefficients.length; index += 1) value = value * reciprocal + coefficients[index]!;
  return value;
}

function derivative(coefficients: number[]) {
  return coefficients.slice(1).map((coefficient, index) => coefficient * (index + 1));
}

function appendUniqueRoot(roots: number[], candidate: number) {
  if (!Number.isFinite(candidate) || candidate <= 0) return;
  const duplicate = roots.some((root) => Math.abs(root - candidate) <= 1e-7 * Math.max(1, Math.abs(root), Math.abs(candidate)));
  if (!duplicate) roots.push(candidate);
}

function bisectPositiveRoot(coefficients: number[], lowerQ: number, upperQ: number) {
  let lowerLog = Math.log(lowerQ);
  let upperLog = Math.log(upperQ);
  let lowerValue = evaluatePolynomialScaled(coefficients, lowerQ);

  for (let iteration = 0; iteration < 160 && upperLog - lowerLog > ROOT_LOG_TOLERANCE; iteration += 1) {
    const middleLog = (lowerLog + upperLog) / 2;
    const middleQ = Math.exp(middleLog);
    const middleValue = evaluatePolynomialScaled(coefficients, middleQ);
    if (middleValue === 0) return middleQ;
    if (Math.sign(lowerValue) === Math.sign(middleValue)) {
      lowerLog = middleLog;
      lowerValue = middleValue;
    } else {
      upperLog = middleLog;
    }
  }

  return Math.exp((lowerLog + upperLog) / 2);
}

/**
 * Isolates every positive real root in [minimumQ, maximumQ]. Derivative roots
 * partition the polynomial into monotonic intervals, so sign-changing roots
 * are found by bisection and repeated/tangent roots are found at critical points.
 */
function findPositivePolynomialRoots(rawCoefficients: number[], minimumQ: number, maximumQ: number): number[] {
  const coefficients = normalizePolynomial(rawCoefficients);
  const degree = coefficients.length - 1;
  if (degree <= 0) return [];

  if (degree === 1) {
    const root = -coefficients[0]! / coefficients[1]!;
    return root >= minimumQ && root <= maximumQ ? [root] : [];
  }

  const criticalPoints = findPositivePolynomialRoots(derivative(coefficients), minimumQ, maximumQ);
  const boundaries = [minimumQ, ...criticalPoints, maximumQ].sort((left, right) => left - right);
  const roots: number[] = [];

  for (const boundary of boundaries) {
    if (Math.abs(evaluatePolynomialScaled(coefficients, boundary)) <= ROOT_VALUE_TOLERANCE) appendUniqueRoot(roots, boundary);
  }

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const lowerQ = boundaries[index]!;
    const upperQ = boundaries[index + 1]!;
    const lowerValue = evaluatePolynomialScaled(coefficients, lowerQ);
    const upperValue = evaluatePolynomialScaled(coefficients, upperQ);
    if (Math.abs(lowerValue) <= ROOT_VALUE_TOLERANCE || Math.abs(upperValue) <= ROOT_VALUE_TOLERANCE) continue;
    if (Math.sign(lowerValue) !== Math.sign(upperValue)) {
      appendUniqueRoot(roots, bisectPositiveRoot(coefficients, lowerQ, upperQ));
    }
  }

  return roots.sort((left, right) => left - right);
}

export function netPresentValue(cashFlows: readonly number[], periodicRate: number) {
  if (!Number.isFinite(periodicRate) || periodicRate <= -1) throw new Error("อัตราต่องวดต้องมากกว่า -100%");
  let value = 0;
  for (let period = cashFlows.length - 1; period >= 0; period -= 1) value = value / (1 + periodicRate) + cashFlows[period]!;
  return value;
}

function countSignChanges(cashFlows: readonly number[]) {
  const signs = cashFlows.filter((value) => value !== 0).map(Math.sign);
  return signs.slice(1).reduce((count, sign, index) => count + (sign !== signs[index] ? 1 : 0), 0);
}

function classifyCashFlows(cashFlows: readonly number[], signChanges: number): IrrCashFlowPattern {
  const firstNonZero = cashFlows.find((value) => value !== 0)!;
  if (signChanges > 1) return "non-conventional";
  return firstNonZero < 0 ? "conventional-investment" : "conventional-financing";
}

function inverseSymmetricLog(value: number, linearScale: number) {
  return Math.sign(value) * linearScale * Math.expm1(Math.abs(value));
}

function symmetricLog(value: number, linearScale: number) {
  return Math.sign(value) * Math.log1p(Math.abs(value) / linearScale);
}

function buildNpvProfile(cashFlows: readonly number[], roots: readonly IrrRoot[], hurdlePeriodicRate: number) {
  const visibleRoots = roots.map((root) => root.periodicRatePercent / 100).filter((rate) => rate <= 10);
  const maximumRate = Math.min(10, Math.max(1, hurdlePeriodicRate * 2 + 0.1, ...visibleRoots.map((rate) => rate * 1.25)));
  const minimumRate = -0.9;
  const linearScale = 0.1;
  const minimumTransformed = symmetricLog(minimumRate, linearScale);
  const maximumTransformed = symmetricLog(maximumRate, linearScale);
  const rates = Array.from({ length: 101 }, (_, index) => {
    const transformed = minimumTransformed + (maximumTransformed - minimumTransformed) * (index / 100);
    return inverseSymmetricLog(transformed, linearScale);
  });
  rates.push(hurdlePeriodicRate, ...visibleRoots);

  return [...new Set(rates.map((rate) => Number(rate.toPrecision(14))))]
    .sort((left, right) => left - right)
    .map((periodicRate) => ({ periodicRatePercent: periodicRate * 100, netPresentValue: netPresentValue(cashFlows, periodicRate) }));
}

function safeSpreadsheetText(value: string) {
  const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  return /^[\s]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function csvCell(value: string | number) {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function csvNumber(value: number, digits = 6) {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

export function calculateIrrMirr(input: IrrMirrInput): IrrMirrResult {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  if (!input.scenarioName.trim() || input.scenarioName.trim().length > 120) throw new Error("ชื่อ Scenario ต้องมี 1–120 ตัวอักษร");
  if (!(input.periodUnit in PERIODS_PER_YEAR)) throw new Error("หน่วยงวดไม่รองรับ");
  assertFiniteInRange(input.annualHurdleRatePercent, "Hurdle rate ต่อปี", -99.99, 1_000);
  assertFiniteInRange(input.annualFinanceRatePercent, "Finance rate ต่อปี", -99.99, 1_000);
  assertFiniteInRange(input.annualReinvestmentRatePercent, "Reinvestment rate ต่อปี", -99.99, 1_000);
  if (input.cashFlows.length < 2 || input.cashFlows.length > IRR_MAX_PERIODS + 1) {
    throw new Error(`กระแสเงินสดต้องมี 2–${IRR_MAX_PERIODS + 1} งวด รวมงวด 0`);
  }

  const cashFlows = input.cashFlows.map((cashFlow, index) => {
    const label = cashFlow.label.trim();
    if (!label || label.length > 80) throw new Error(`ชื่องวดที่ ${index} ต้องมี 1–80 ตัวอักษร`);
    assertFiniteInRange(cashFlow.amount, `กระแสเงินสดงวดที่ ${index}`, -IRR_MAX_MONEY, IRR_MAX_MONEY);
    return { label, amount: cashFlow.amount };
  });
  const amounts = cashFlows.map((cashFlow) => cashFlow.amount);
  if (!amounts.some((value) => value < 0) || !amounts.some((value) => value > 0)) {
    throw new Error("ต้องมีกระแสเงินสดอย่างน้อยหนึ่งค่าติดลบและหนึ่งค่าบวก");
  }

  const periodsPerYear = PERIODS_PER_YEAR[input.periodUnit];
  const hurdlePeriodicRate = annualToPeriodicRate(input.annualHurdleRatePercent, periodsPerYear);
  const financePeriodicRate = annualToPeriodicRate(input.annualFinanceRatePercent, periodsPerYear);
  const reinvestmentPeriodicRate = annualToPeriodicRate(input.annualReinvestmentRatePercent, periodsPerYear);
  const minimumPeriodicRate = IRR_MIN_PERIODIC_RATE_PERCENT / 100;
  const maximumPeriodicRate = IRR_MAX_PERIODIC_RATE_PERCENT / 100;
  const minimumQ = 1 / (1 + maximumPeriodicRate);
  const maximumQ = 1 / (1 + minimumPeriodicRate);
  const qRoots = findPositivePolynomialRoots(amounts, minimumQ, maximumQ);
  const roots = qRoots
    .map((q) => {
      const periodicRate = 1 / q - 1;
      return {
        periodicRatePercent: periodicRate * 100,
        annualEffectiveRatePercent: periodicToAnnualRate(periodicRate, periodsPerYear) * 100,
        npvResidual: netPresentValue(amounts, periodicRate),
      } satisfies IrrRoot;
    })
    .sort((left, right) => left.periodicRatePercent - right.periodicRatePercent);

  const signChanges = countSignChanges(amounts);
  const rootStatus: IrrRootStatus = roots.length > 1
    ? "multiple"
    : roots.length === 1
      ? signChanges === 1 ? "unique" : "ambiguous"
      : signChanges === 1 ? "outside-range" : "none";

  const horizon = amounts.length - 1;
  let presentValueOfNegativeCashFlows = 0;
  let futureValueOfPositiveCashFlows = 0;
  let cumulativePresentValue = 0;
  const timeline = cashFlows.map((cashFlow, period) => {
    const discountFactor = Math.pow(1 + hurdlePeriodicRate, period);
    const presentValue = cashFlow.amount / discountFactor;
    cumulativePresentValue += presentValue;
    if (cashFlow.amount < 0) presentValueOfNegativeCashFlows += cashFlow.amount / Math.pow(1 + financePeriodicRate, period);
    if (cashFlow.amount > 0) futureValueOfPositiveCashFlows += cashFlow.amount * Math.pow(1 + reinvestmentPeriodicRate, horizon - period);
    return { ...cashFlow, period, discountFactor, presentValue, cumulativePresentValue };
  });
  const mirrPeriodicRate = Math.pow(futureValueOfPositiveCashFlows / -presentValueOfNegativeCashFlows, 1 / horizon) - 1;
  const mirrAnnualRate = periodicToAnnualRate(mirrPeriodicRate, periodsPerYear);
  const derivedValues = [
    hurdlePeriodicRate,
    financePeriodicRate,
    reinvestmentPeriodicRate,
    presentValueOfNegativeCashFlows,
    futureValueOfPositiveCashFlows,
    mirrPeriodicRate,
    mirrAnnualRate,
    ...timeline.flatMap((row) => [row.discountFactor, row.presentValue, row.cumulativePresentValue]),
  ];
  if (derivedValues.some((value) => !Number.isFinite(value))) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาลดจำนวนเงิน อัตรา หรือจำนวนงวด");
  }

  return {
    periodsPerYear,
    periodicHurdleRatePercent: hurdlePeriodicRate * 100,
    periodicFinanceRatePercent: financePeriodicRate * 100,
    periodicReinvestmentRatePercent: reinvestmentPeriodicRate * 100,
    cashFlowPattern: classifyCashFlows(amounts, signChanges),
    signChanges,
    rootStatus,
    roots,
    mirrPeriodicRatePercent: mirrPeriodicRate * 100,
    mirrAnnualEffectiveRatePercent: mirrAnnualRate * 100,
    netPresentValueAtHurdleRate: cumulativePresentValue,
    presentValueOfNegativeCashFlows,
    futureValueOfPositiveCashFlows,
    totalCashInflow: amounts.filter((value) => value > 0).reduce((sum, value) => sum + value, 0),
    totalCashOutflow: -amounts.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
    timeline,
    profile: buildNpvProfile(amounts, roots, hurdlePeriodicRate),
  };
}

export function irrMirrCsv(input: IrrMirrInput, result: IrrMirrResult) {
  const rows: Array<Array<string | number>> = [
    ["IRR & MIRR Calculator", safeSpreadsheetText(input.scenarioName)],
    ["หน่วยงวด", input.periodUnit],
    ["หน่วยเงิน", input.currency],
    ["Hurdle rate ต่อปี", csvNumber(input.annualHurdleRatePercent), "% effective"],
    ["Finance rate ต่อปี", csvNumber(input.annualFinanceRatePercent), "% effective"],
    ["Reinvestment rate ต่อปี", csvNumber(input.annualReinvestmentRatePercent), "% effective"],
    ["รูปแบบกระแสเงินสด", result.cashFlowPattern],
    ["จำนวนครั้งที่เครื่องหมายเปลี่ยน", result.signChanges],
    ["สถานะ IRR", result.rootStatus],
    [],
    ["ผลลัพธ์", "ต่องวด (%)", "ต่อปี effective (%)", "NPV residual"],
    ...result.roots.map((root, index) => [`IRR ${index + 1}`, csvNumber(root.periodicRatePercent, 8), csvNumber(root.annualEffectiveRatePercent, 8), csvNumber(root.npvResidual, 8)]),
    ["MIRR", csvNumber(result.mirrPeriodicRatePercent, 8), csvNumber(result.mirrAnnualEffectiveRatePercent, 8), ""],
    ["NPV at hurdle rate", csvNumber(result.netPresentValueAtHurdleRate, 2), input.currency, ""],
    [],
    ["งวด", "ชื่อ", "Cash flow", "Discount factor", "Present value", "Cumulative present value"],
    ...result.timeline.map((row) => [row.period, safeSpreadsheetText(row.label), csvNumber(row.amount, 2), csvNumber(row.discountFactor, 10), csvNumber(row.presentValue, 2), csvNumber(row.cumulativePresentValue, 2)]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
