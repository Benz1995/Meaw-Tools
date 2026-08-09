export type XirrCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";
export type XirrCashFlowPattern = "conventional-investment" | "conventional-financing" | "non-conventional";
export type XirrRootStatus = "unique" | "multiple" | "ambiguous" | "none" | "outside-range";

export type XirrCashFlow = {
  date: string;
  label: string;
  amount: number;
};

export type XirrXnpvInput = {
  currency: XirrCurrency;
  scenarioName: string;
  annualHurdleRatePercent: number;
  cashFlows: XirrCashFlow[];
};

export type XirrRoot = {
  annualRatePercent: number;
  xnpvResidual: number | null;
  relativeResidual: number;
};

export type XirrTimelineRow = XirrCashFlow & {
  dayOffset: number;
  yearFraction: number;
  discountFactor: number;
  presentValue: number;
  cumulativePresentValue: number;
};

export type XirrProfilePoint = {
  annualRatePercent: number;
  netPresentValue: number;
};

export type XirrXnpvResult = {
  durationDays: number;
  durationYears: number;
  cashFlowPattern: XirrCashFlowPattern;
  signChanges: number;
  rootStatus: XirrRootStatus;
  roots: XirrRoot[];
  netPresentValueAtHurdleRate: number;
  totalCashInflow: number;
  totalCashOutflow: number;
  timeline: XirrTimelineRow[];
  profile: XirrProfilePoint[];
};

type ExponentialTerm = {
  coefficient: number;
  exponent: number;
};

export const XIRR_MAX_CASH_FLOWS = 61;
export const XIRR_MAX_MONEY = 1_000_000_000_000_000;
export const XIRR_MIN_RATE_PERCENT = -99.99;
export const XIRR_MAX_RATE_PERCENT = 100_000;

const DAY_MS = 86_400_000;
const MAX_DATE_SPAN_DAYS = 36_525;
const MIN_DATE = Date.UTC(1900, 0, 1);
const MAX_DATE = Date.UTC(2200, 11, 31);
const ROOT_VALUE_TOLERANCE = 1e-9;
const ROOT_LOG_TOLERANCE = 1e-12;
const SUPPORTED_CURRENCIES = new Set<XirrCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`);
  }
}

/** Parses YYYY-MM-DD without the browser timezone changing the calendar day. */
export function parseIsoDateUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`วันที่ ${value} ไม่มีอยู่จริง`);
  }
  if (timestamp < MIN_DATE || timestamp > MAX_DATE) throw new Error("วันที่ต้องอยู่ระหว่าง 1900-01-01 ถึง 2200-12-31");
  return timestamp;
}

export function xnpv(cashFlows: readonly { amount: number; dayOffset: number }[], annualRate: number) {
  if (!Number.isFinite(annualRate) || annualRate <= -1) throw new Error("อัตรารายปีต้องมากกว่า -100%");
  return cashFlows.reduce((sum, cashFlow) => sum + cashFlow.amount / Math.pow(1 + annualRate, cashFlow.dayOffset / 365), 0);
}

function countSignChanges(amounts: readonly number[]) {
  const signs = amounts.filter((value) => value !== 0).map(Math.sign);
  return signs.slice(1).reduce((count, sign, index) => count + (sign !== signs[index] ? 1 : 0), 0);
}

function classifyCashFlows(amounts: readonly number[], signChanges: number): XirrCashFlowPattern {
  const firstNonZero = amounts.find((value) => value !== 0)!;
  if (signChanges > 1) return "non-conventional";
  return firstNonZero < 0 ? "conventional-investment" : "conventional-financing";
}

function normalizeTerms(rawTerms: readonly ExponentialTerm[]) {
  const filtered = rawTerms.filter((term) => Math.abs(term.coefficient) > Number.EPSILON);
  if (filtered.length === 0) return [];
  const scale = Math.max(...filtered.map((term) => Math.abs(term.coefficient)));
  const minimumExponent = Math.min(...filtered.map((term) => term.exponent));
  return filtered.map((term) => ({
    coefficient: term.coefficient / scale,
    exponent: term.exponent - minimumExponent,
  }));
}

/**
 * Returns a scaled value with the same sign and zeros as the exponential sum.
 * Log scaling prevents overflow near -100% across long date spans.
 */
function evaluateExponentialScaled(terms: readonly ExponentialTerm[], y: number) {
  if (terms.length === 0) return 0;
  const logs = terms.map((term) => Math.log(Math.abs(term.coefficient)) - term.exponent * y);
  const maximumLog = Math.max(...logs);
  return terms.reduce(
    (sum, term, index) => sum + Math.sign(term.coefficient) * Math.exp(logs[index]! - maximumLog),
    0,
  );
}

function derivativeTerms(terms: readonly ExponentialTerm[]) {
  return normalizeTerms(
    terms
      .filter((term) => term.exponent > 0)
      .map((term) => ({ coefficient: -term.exponent * term.coefficient, exponent: term.exponent })),
  );
}

function appendUniqueRoot(roots: number[], candidate: number) {
  if (!Number.isFinite(candidate)) return;
  const duplicate = roots.some((root) => Math.abs(root - candidate) <= 1e-8 * Math.max(1, Math.abs(root), Math.abs(candidate)));
  if (!duplicate) roots.push(candidate);
}

function bisectExponentialRoot(terms: readonly ExponentialTerm[], lower: number, upper: number) {
  let lowerY = lower;
  let upperY = upper;
  let lowerValue = evaluateExponentialScaled(terms, lowerY);

  for (let iteration = 0; iteration < 180 && upperY - lowerY > ROOT_LOG_TOLERANCE; iteration += 1) {
    const middleY = (lowerY + upperY) / 2;
    const middleValue = evaluateExponentialScaled(terms, middleY);
    if (Math.abs(middleValue) <= 1e-14) return middleY;
    if (Math.sign(lowerValue) === Math.sign(middleValue)) {
      lowerY = middleY;
      lowerValue = middleValue;
    } else {
      upperY = middleY;
    }
  }

  return (lowerY + upperY) / 2;
}

/**
 * Derivative roots partition an exponential polynomial into monotonic ranges.
 * This isolates sign-changing roots and repeated roots at stationary points,
 * avoiding the single-starting-guess limitation of common spreadsheet solvers.
 */
function findExponentialRoots(rawTerms: readonly ExponentialTerm[], minimumY: number, maximumY: number): number[] {
  const terms = normalizeTerms(rawTerms);
  if (terms.length <= 1) return [];

  if (terms.length === 2) {
    const [constantTerm, variableTerm] = terms;
    if (!constantTerm || !variableTerm || variableTerm.exponent === 0) return [];
    const ratio = -constantTerm.coefficient / variableTerm.coefficient;
    if (ratio <= 0) return [];
    const root = -Math.log(ratio) / variableTerm.exponent;
    return root >= minimumY && root <= maximumY ? [root] : [];
  }

  const criticalPoints = findExponentialRoots(derivativeTerms(terms), minimumY, maximumY);
  const boundaries = [minimumY, ...criticalPoints, maximumY].sort((left, right) => left - right);
  const roots: number[] = [];

  for (const boundary of boundaries) {
    if (Math.abs(evaluateExponentialScaled(terms, boundary)) <= ROOT_VALUE_TOLERANCE) appendUniqueRoot(roots, boundary);
  }

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const lower = boundaries[index]!;
    const upper = boundaries[index + 1]!;
    const lowerValue = evaluateExponentialScaled(terms, lower);
    const upperValue = evaluateExponentialScaled(terms, upper);
    if (Math.abs(lowerValue) <= ROOT_VALUE_TOLERANCE || Math.abs(upperValue) <= ROOT_VALUE_TOLERANCE) continue;
    if (Math.sign(lowerValue) !== Math.sign(upperValue)) {
      appendUniqueRoot(roots, bisectExponentialRoot(terms, lower, upper));
    }
  }

  return roots.sort((left, right) => left - right);
}

function inverseSymmetricLog(value: number, linearScale: number) {
  return Math.sign(value) * linearScale * Math.expm1(Math.abs(value));
}

function symmetricLog(value: number, linearScale: number) {
  return Math.sign(value) * Math.log1p(Math.abs(value) / linearScale);
}

function buildXnpvProfile(
  datedCashFlows: readonly { amount: number; dayOffset: number }[],
  roots: readonly XirrRoot[],
  hurdleRate: number,
) {
  const visibleRoots = roots.map((root) => root.annualRatePercent / 100).filter((rate) => rate <= 10);
  const maximumRate = Math.min(10, Math.max(1, hurdleRate * 2 + 0.1, ...visibleRoots.map((rate) => rate * 1.25)));
  const minimumRate = -0.9;
  const linearScale = 0.1;
  const minimumTransformed = symmetricLog(minimumRate, linearScale);
  const maximumTransformed = symmetricLog(maximumRate, linearScale);
  const rates = Array.from({ length: 101 }, (_, index) => {
    const transformed = minimumTransformed + (maximumTransformed - minimumTransformed) * (index / 100);
    return inverseSymmetricLog(transformed, linearScale);
  });
  rates.push(hurdleRate, ...visibleRoots);

  return [...new Set(rates.map((rate) => Number(rate.toPrecision(14))))]
    .sort((left, right) => left - right)
    .map((annualRate) => ({ annualRatePercent: annualRate * 100, netPresentValue: xnpv(datedCashFlows, annualRate) }));
}

function safeSpreadsheetText(value: string) {
  const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  return /^[\s]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null, digits = 6) {
  return value !== null && Number.isFinite(value) ? value.toFixed(digits) : "";
}

export function calculateXirrXnpv(input: XirrXnpvInput): XirrXnpvResult {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  if (!input.scenarioName.trim() || input.scenarioName.trim().length > 120) throw new Error("ชื่อ Scenario ต้องมี 1–120 ตัวอักษร");
  assertFiniteInRange(input.annualHurdleRatePercent, "Hurdle rate ต่อปี", -99, 1_000);
  if (input.cashFlows.length < 2 || input.cashFlows.length > XIRR_MAX_CASH_FLOWS) {
    throw new Error(`กระแสเงินสดต้องมี 2–${XIRR_MAX_CASH_FLOWS} รายการ`);
  }

  let previousTimestamp = -Infinity;
  const cashFlows = input.cashFlows.map((cashFlow, index) => {
    const label = cashFlow.label.trim();
    if (!label || label.length > 80) throw new Error(`ชื่อรายการที่ ${index + 1} ต้องมี 1–80 ตัวอักษร`);
    assertFiniteInRange(cashFlow.amount, `กระแสเงินสดรายการที่ ${index + 1}`, -XIRR_MAX_MONEY, XIRR_MAX_MONEY);
    const timestamp = parseIsoDateUtc(cashFlow.date);
    if (timestamp <= previousTimestamp) throw new Error("วันที่ต้องเรียงจากเก่าไปใหม่และห้ามซ้ำกัน");
    previousTimestamp = timestamp;
    return { date: cashFlow.date, label, amount: cashFlow.amount, timestamp };
  });

  const firstTimestamp = cashFlows[0]!.timestamp;
  const datedCashFlows = cashFlows.map((cashFlow) => ({
    ...cashFlow,
    dayOffset: Math.round((cashFlow.timestamp - firstTimestamp) / DAY_MS),
  }));
  const durationDays = datedCashFlows.at(-1)!.dayOffset;
  if (durationDays <= 0 || durationDays > MAX_DATE_SPAN_DAYS) throw new Error("ช่วงวันที่ต้องมากกว่า 0 วันและไม่เกิน 100 ปี");

  const amounts = datedCashFlows.map((cashFlow) => cashFlow.amount);
  if (!amounts.some((value) => value < 0) || !amounts.some((value) => value > 0)) {
    throw new Error("ต้องมีกระแสเงินสดอย่างน้อยหนึ่งค่าติดลบและหนึ่งค่าบวก");
  }

  const hurdleRate = input.annualHurdleRatePercent / 100;
  const minimumY = Math.log1p(XIRR_MIN_RATE_PERCENT / 100);
  const maximumY = Math.log1p(XIRR_MAX_RATE_PERCENT / 100);
  const terms = datedCashFlows.map((cashFlow) => ({
    coefficient: cashFlow.amount,
    exponent: cashFlow.dayOffset / 365,
  }));
  const yRoots = findExponentialRoots(terms, minimumY, maximumY);
  const roots = yRoots
    .map((y) => {
      const annualRate = Math.expm1(y);
      const residual = xnpv(datedCashFlows, annualRate);
      return {
        annualRatePercent: annualRate * 100,
        xnpvResidual: Number.isFinite(residual) ? residual : null,
        relativeResidual: Math.abs(evaluateExponentialScaled(normalizeTerms(terms), y)),
      } satisfies XirrRoot;
    })
    .sort((left, right) => left.annualRatePercent - right.annualRatePercent);

  const signChanges = countSignChanges(amounts);
  const rootStatus: XirrRootStatus = roots.length > 1
    ? "multiple"
    : roots.length === 1
      ? signChanges === 1 ? "unique" : "ambiguous"
      : signChanges === 1 ? "outside-range" : "none";

  let cumulativePresentValue = 0;
  const timeline = datedCashFlows.map((cashFlow) => {
    const yearFraction = cashFlow.dayOffset / 365;
    const discountFactor = Math.pow(1 + hurdleRate, yearFraction);
    const presentValue = cashFlow.amount / discountFactor;
    cumulativePresentValue += presentValue;
    return {
      date: cashFlow.date,
      label: cashFlow.label,
      amount: cashFlow.amount,
      dayOffset: cashFlow.dayOffset,
      yearFraction,
      discountFactor,
      presentValue,
      cumulativePresentValue,
    };
  });

  const derivedValues = timeline.flatMap((row) => [row.discountFactor, row.presentValue, row.cumulativePresentValue]);
  if (derivedValues.some((value) => !Number.isFinite(value))) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาลดจำนวนเงิน อัตรา หรือช่วงวันที่");
  }

  return {
    durationDays,
    durationYears: durationDays / 365,
    cashFlowPattern: classifyCashFlows(amounts, signChanges),
    signChanges,
    rootStatus,
    roots,
    netPresentValueAtHurdleRate: cumulativePresentValue,
    totalCashInflow: amounts.filter((value) => value > 0).reduce((sum, value) => sum + value, 0),
    totalCashOutflow: -amounts.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
    timeline,
    profile: buildXnpvProfile(datedCashFlows, roots, hurdleRate),
  };
}

export function xirrXnpvCsv(input: XirrXnpvInput, result: XirrXnpvResult) {
  const rows: Array<Array<string | number>> = [
    ["XIRR & XNPV Date Calculator", safeSpreadsheetText(input.scenarioName)],
    ["หน่วยเงิน", input.currency],
    ["Hurdle rate ต่อปี", csvNumber(input.annualHurdleRatePercent), "% effective annual"],
    ["สถานะ XIRR", result.rootStatus],
    ["รูปแบบกระแสเงินสด", result.cashFlowPattern],
    ["จำนวนครั้งที่เครื่องหมายเปลี่ยน", result.signChanges],
    ["ช่วงเวลา (วัน)", result.durationDays],
    [],
    ["ผลลัพธ์", "อัตราต่อปี (%)", "XNPV residual", "Relative residual"],
    ...result.roots.map((root, index) => [
      `XIRR ${index + 1}`,
      csvNumber(root.annualRatePercent, 8),
      csvNumber(root.xnpvResidual, 8),
      csvNumber(root.relativeResidual, 12),
    ]),
    ["XNPV at hurdle rate", csvNumber(result.netPresentValueAtHurdleRate, 2), input.currency, ""],
    [],
    ["วันที่", "ชื่อรายการ", "Cash flow", "จำนวนวันจากวันแรก", "เศษส่วนปี / 365", "Discount factor", "Present value", "Cumulative XNPV"],
    ...result.timeline.map((row) => [
      row.date,
      safeSpreadsheetText(row.label),
      csvNumber(row.amount, 2),
      row.dayOffset,
      csvNumber(row.yearFraction, 10),
      csvNumber(row.discountFactor, 10),
      csvNumber(row.presentValue, 2),
      csvNumber(row.cumulativePresentValue, 2),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
