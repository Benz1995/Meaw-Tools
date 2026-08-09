export const ROAS_MAX_MONEY = 1_000_000_000_000;
export const ROAS_MAX_ORDERS = 1_000_000_000;

export type RoasCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";
export type RoasProfitStatus = "profit" | "break-even" | "loss";

export type RoasInput = {
  currency: RoasCurrency;
  campaignName: string;
  grossRevenue: number;
  refunds: number;
  adSpend: number;
  productCost: number;
  paymentFeePercent: number;
  fulfillmentCost: number;
  otherVariableCost: number;
  orders: number;
  targetProfitMarginPercent: number;
};

export type RoasPerOrderResult = {
  netAverageOrderValue: number;
  currentCpa: number;
  breakEvenCpa: number | null;
  targetCpa: number | null;
  contributionBeforeAdsPerOrder: number;
  profitAfterAdsPerOrder: number;
};

export type RoasResult = {
  netRevenue: number;
  refundRatePercent: number;
  paymentFeeAmount: number;
  variableCostBeforeAds: number;
  contributionBeforeAds: number;
  contributionMarginPercent: number;
  grossRoas: number;
  netRoas: number;
  reportedRoasPercent: number;
  profitAfterAds: number;
  profitMarginPercent: number;
  profitReturnOnAdSpendPercent: number;
  status: RoasProfitStatus;
  breakEvenRoas: number | null;
  breakEvenAdSpend: number | null;
  breakEvenAdSpendGap: number | null;
  targetProfitAmount: number;
  targetAdSpendCapacity: number | null;
  targetAdSpendGap: number | null;
  targetRoas: number | null;
  targetFeasible: boolean;
  perOrder: RoasPerOrderResult | null;
};

const supportedCurrencies = new Set<RoasCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);
const ROAS_MAX_RESULT = 1_000_000_000_000_000;

function assertText(value: string, label: string, maxLength = 80) {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  if (value.trim().length > maxLength) throw new Error(`${label}ต้องไม่เกิน ${maxLength} ตัวอักษร`);
}

function assertNumber(value: number, label: string, options: { min?: number; max?: number; positive?: boolean; integer?: boolean } = {}) {
  if (!Number.isFinite(value)) throw new Error(`${label}ต้องเป็นตัวเลขที่มีขอบเขต`);
  if (options.positive && value <= 0) throw new Error(`${label}ต้องมากกว่า 0`);
  if (options.min !== undefined && value < options.min) throw new Error(`${label}ต้องไม่น้อยกว่า ${options.min}`);
  if (options.max !== undefined && value > options.max) throw new Error(`${label}สูงเกินขอบเขตที่รองรับ`);
  if (options.integer && !Number.isInteger(value)) throw new Error(`${label}ต้องเป็นจำนวนเต็ม`);
}

function assertResult(value: number | null) {
  if (value !== null && (!Number.isFinite(value) || Math.abs(value) > ROAS_MAX_RESULT)) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาตรวจยอดขาย ต้นทุน และหน่วยเงินอีกครั้ง");
  }
}

function round(value: number, digits = 8) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateRoas(input: RoasInput): RoasResult {
  if (!supportedCurrencies.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  assertText(input.campaignName, "ชื่อ Campaign");
  assertNumber(input.grossRevenue, "ยอดขายรวม", { positive: true, max: ROAS_MAX_MONEY });
  assertNumber(input.refunds, "ยอดคืนเงินและยกเลิก", { min: 0, max: ROAS_MAX_MONEY });
  if (input.refunds >= input.grossRevenue) throw new Error("ยอดคืนเงินและยกเลิกต้องน้อยกว่ายอดขายรวม");
  assertNumber(input.adSpend, "ค่าโฆษณา", { positive: true, max: ROAS_MAX_MONEY });
  assertNumber(input.productCost, "ต้นทุนสินค้า/บริการผันแปร", { min: 0, max: ROAS_MAX_MONEY });
  assertNumber(input.paymentFeePercent, "ค่าธรรมเนียมจากยอดขาย", { min: 0, max: 99.9999 });
  assertNumber(input.fulfillmentCost, "ต้นทุน Fulfillment และจัดส่ง", { min: 0, max: ROAS_MAX_MONEY });
  assertNumber(input.otherVariableCost, "ต้นทุนผันแปรอื่น", { min: 0, max: ROAS_MAX_MONEY });
  assertNumber(input.orders, "จำนวน Order/Conversion", { min: 0, max: ROAS_MAX_ORDERS, integer: true });
  assertNumber(input.targetProfitMarginPercent, "เป้าหมายกำไรสุทธิจาก Campaign", { min: 0, max: 99.9999 });

  const netRevenue = input.grossRevenue - input.refunds;
  const paymentFeeAmount = netRevenue * input.paymentFeePercent / 100;
  const variableCostBeforeAds = input.productCost + paymentFeeAmount + input.fulfillmentCost + input.otherVariableCost;
  const contributionBeforeAds = netRevenue - variableCostBeforeAds;
  const contributionMarginPercent = contributionBeforeAds / netRevenue * 100;
  const grossRoas = input.grossRevenue / input.adSpend;
  const netRoas = netRevenue / input.adSpend;
  const profitAfterAds = contributionBeforeAds - input.adSpend;
  const profitMarginPercent = profitAfterAds / netRevenue * 100;
  const profitReturnOnAdSpendPercent = profitAfterAds / input.adSpend * 100;
  const status: RoasProfitStatus = Math.abs(profitAfterAds) < 0.005 ? "break-even" : profitAfterAds > 0 ? "profit" : "loss";

  const hasPositiveContribution = contributionBeforeAds > 0;
  const breakEvenAdSpend = hasPositiveContribution ? contributionBeforeAds : null;
  const breakEvenRoas = hasPositiveContribution ? netRevenue / contributionBeforeAds : null;
  const breakEvenAdSpendGap = breakEvenAdSpend === null ? null : breakEvenAdSpend - input.adSpend;

  const targetProfitAmount = netRevenue * input.targetProfitMarginPercent / 100;
  const rawTargetAdSpendCapacity = contributionBeforeAds - targetProfitAmount;
  const targetFeasible = rawTargetAdSpendCapacity > 0;
  const targetAdSpendCapacity = targetFeasible ? rawTargetAdSpendCapacity : null;
  const targetAdSpendGap = targetAdSpendCapacity === null ? null : targetAdSpendCapacity - input.adSpend;
  const targetRoas = targetAdSpendCapacity === null ? null : netRevenue / targetAdSpendCapacity;

  const perOrder: RoasPerOrderResult | null = input.orders > 0 ? {
    netAverageOrderValue: netRevenue / input.orders,
    currentCpa: input.adSpend / input.orders,
    breakEvenCpa: breakEvenAdSpend === null ? null : breakEvenAdSpend / input.orders,
    targetCpa: targetAdSpendCapacity === null ? null : targetAdSpendCapacity / input.orders,
    contributionBeforeAdsPerOrder: contributionBeforeAds / input.orders,
    profitAfterAdsPerOrder: profitAfterAds / input.orders,
  } : null;

  const result: RoasResult = {
    netRevenue: round(netRevenue),
    refundRatePercent: round(input.refunds / input.grossRevenue * 100),
    paymentFeeAmount: round(paymentFeeAmount),
    variableCostBeforeAds: round(variableCostBeforeAds),
    contributionBeforeAds: round(contributionBeforeAds),
    contributionMarginPercent: round(contributionMarginPercent),
    grossRoas: round(grossRoas),
    netRoas: round(netRoas),
    reportedRoasPercent: round(netRoas * 100),
    profitAfterAds: round(profitAfterAds),
    profitMarginPercent: round(profitMarginPercent),
    profitReturnOnAdSpendPercent: round(profitReturnOnAdSpendPercent),
    status,
    breakEvenRoas: breakEvenRoas === null ? null : round(breakEvenRoas),
    breakEvenAdSpend: breakEvenAdSpend === null ? null : round(breakEvenAdSpend),
    breakEvenAdSpendGap: breakEvenAdSpendGap === null ? null : round(breakEvenAdSpendGap),
    targetProfitAmount: round(targetProfitAmount),
    targetAdSpendCapacity: targetAdSpendCapacity === null ? null : round(targetAdSpendCapacity),
    targetAdSpendGap: targetAdSpendGap === null ? null : round(targetAdSpendGap),
    targetRoas: targetRoas === null ? null : round(targetRoas),
    targetFeasible,
    perOrder: perOrder ? {
      netAverageOrderValue: round(perOrder.netAverageOrderValue),
      currentCpa: round(perOrder.currentCpa),
      breakEvenCpa: perOrder.breakEvenCpa === null ? null : round(perOrder.breakEvenCpa),
      targetCpa: perOrder.targetCpa === null ? null : round(perOrder.targetCpa),
      contributionBeforeAdsPerOrder: round(perOrder.contributionBeforeAdsPerOrder),
      profitAfterAdsPerOrder: round(perOrder.profitAfterAdsPerOrder),
    } : null,
  };

  [
    result.netRevenue,
    result.refundRatePercent,
    result.paymentFeeAmount,
    result.variableCostBeforeAds,
    result.contributionBeforeAds,
    result.contributionMarginPercent,
    result.grossRoas,
    result.netRoas,
    result.reportedRoasPercent,
    result.profitAfterAds,
    result.profitMarginPercent,
    result.profitReturnOnAdSpendPercent,
    result.breakEvenRoas,
    result.breakEvenAdSpend,
    result.breakEvenAdSpendGap,
    result.targetProfitAmount,
    result.targetAdSpendCapacity,
    result.targetAdSpendGap,
    result.targetRoas,
    ...(result.perOrder ? Object.values(result.perOrder) : []),
  ].forEach(assertResult);

  return result;
}

function safeSpreadsheetText(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null, digits = 2) {
  return value === null ? "คำนวณไม่ได้" : value.toFixed(digits);
}

export function roasCsv(input: RoasInput, result: RoasResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["ROAS & Profit Calculator", "Value", "Unit"],
    ["Campaign", safeSpreadsheetText(input.campaignName), ""],
    [],
    ["Input", "Value", "Unit"],
    ["Gross revenue / conversion value", csvNumber(input.grossRevenue), currency],
    ["Refunds and cancellations", csvNumber(input.refunds), currency],
    ["Net revenue", csvNumber(result.netRevenue), currency],
    ["Ad spend", csvNumber(input.adSpend), currency],
    ["Product/service variable cost", csvNumber(input.productCost), currency],
    ["Payment/platform fee", csvNumber(result.paymentFeeAmount), currency],
    ["Fulfillment and shipping", csvNumber(input.fulfillmentCost), currency],
    ["Other variable cost", csvNumber(input.otherVariableCost), currency],
    ["Orders / conversions", input.orders, "count"],
    ["Target campaign profit margin", csvNumber(input.targetProfitMarginPercent, 4), "%"],
    [],
    ["Current performance", "Value", "Unit"],
    ["Gross ROAS", csvNumber(result.grossRoas, 4), "x"],
    ["Net ROAS", csvNumber(result.netRoas, 4), "x"],
    ["Net ROAS", csvNumber(result.reportedRoasPercent, 4), "%"],
    ["Contribution before ads", csvNumber(result.contributionBeforeAds), currency],
    ["Contribution margin before ads", csvNumber(result.contributionMarginPercent, 4), "%"],
    ["Profit after ads", csvNumber(result.profitAfterAds), currency],
    ["Campaign profit margin", csvNumber(result.profitMarginPercent, 4), "%"],
    ["Profit / ad spend", csvNumber(result.profitReturnOnAdSpendPercent, 4), "%"],
    [],
    ["Threshold", "Value", "Unit"],
    ["Break-even ROAS", csvNumber(result.breakEvenRoas, 4), "x"],
    ["Break-even ad spend at current net revenue", csvNumber(result.breakEvenAdSpend), currency],
    ["Ad spend gap to break-even", csvNumber(result.breakEvenAdSpendGap), currency],
    ["Target ROAS", csvNumber(result.targetRoas, 4), "x"],
    ["Ad spend capacity at target margin", csvNumber(result.targetAdSpendCapacity), currency],
    ["Ad spend gap to target margin", csvNumber(result.targetAdSpendGap), currency],
    [],
    ["Per order", "Value", "Unit"],
    ["Net AOV", csvNumber(result.perOrder?.netAverageOrderValue ?? null), currency],
    ["Current CPA", csvNumber(result.perOrder?.currentCpa ?? null), currency],
    ["Break-even CPA", csvNumber(result.perOrder?.breakEvenCpa ?? null), currency],
    ["Target CPA", csvNumber(result.perOrder?.targetCpa ?? null), currency],
    ["Profit after ads per order", csvNumber(result.perOrder?.profitAfterAdsPerOrder ?? null), currency],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
