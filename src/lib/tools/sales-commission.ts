export const SALES_COMMISSION_MAX_MONEY = 1_000_000_000_000;
export const SALES_COMMISSION_MAX_RESULT = 1_000_000_000_000_000;
export const SALES_COMMISSION_MAX_RATE_PERCENT = 1_000;
export const SALES_COMMISSION_MAX_TIERS = 10;
export const SALES_COMMISSION_MAX_PERIODS_PER_YEAR = 366;

export type CommissionPlanType = "flat" | "marginal" | "retroactive";
export type CommissionBasis = "revenue" | "gross-profit";

export type CommissionTier = {
  threshold: number;
  ratePercent: number;
};

export type SalesCommissionInput = {
  planType: CommissionPlanType;
  basis: CommissionBasis;
  grossSales: number;
  refunds: number;
  directCosts: number;
  salesCreditPercent: number;
  flatRatePercent: number;
  tiers: CommissionTier[];
  quota: number;
  quotaBonus: number;
  payoutAdjustment: number;
  payoutCap: number;
  basePay: number;
  periodsPerYear: number;
};

export type CommissionTierBreakdown = {
  tierIndex: number;
  threshold: number;
  nextThreshold: number | null;
  amountInTier: number;
  ratePercent: number;
  commission: number;
};

export type SalesCommissionResult = {
  netSales: number;
  creditedNetSales: number;
  creditedDirectCosts: number;
  creditedGrossProfit: number;
  eligibleCommissionBase: number;
  commissionBeforeBonuses: number;
  selectedRatePercent: number;
  marginalCommission: number | null;
  retroactiveCommission: number | null;
  quotaAttainmentPercent: number | null;
  quotaBonusEarned: number;
  quotaReached: boolean;
  rawVariablePayout: number;
  payoutBeforeCap: number;
  floorReduction: number;
  capReduction: number;
  finalCommissionPayout: number;
  totalPeriodEarnings: number;
  annualizedCommissionPayout: number;
  annualizedTotalEarnings: number;
  effectivePayoutRatePercent: number | null;
  amountToQuota: number | null;
  nextTierThreshold: number | null;
  amountToNextTier: number | null;
  tierBreakdown: CommissionTierBreakdown[];
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > SALES_COMMISSION_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

function validateTiers(tiers: CommissionTier[]) {
  if (tiers.length < 1 || tiers.length > SALES_COMMISSION_MAX_TIERS) {
    throw new Error(`แผนแบบขั้นบันไดต้องมี 1–${SALES_COMMISSION_MAX_TIERS} ขั้น`);
  }
  if (tiers[0]?.threshold !== 0) throw new Error("ขั้นแรกต้องเริ่มที่ยอด 0");

  tiers.forEach((tier, index) => {
    assertRange(tier.threshold, `ยอดเริ่มต้นขั้นที่ ${index + 1}`, 0, SALES_COMMISSION_MAX_MONEY);
    assertRange(tier.ratePercent, `อัตราขั้นที่ ${index + 1}`, 0, SALES_COMMISSION_MAX_RATE_PERCENT);
    const previousTier = tiers[index - 1];
    if (previousTier && tier.threshold <= previousTier.threshold) {
      throw new Error("ยอดเริ่มต้นของแต่ละขั้นต้องเรียงจากน้อยไปมากและห้ามซ้ำ");
    }
  });
}

function selectedTierIndex(base: number, tiers: CommissionTier[]) {
  let selected = 0;
  for (let index = 1; index < tiers.length; index += 1) {
    const tier = tiers[index];
    if (!tier || base < tier.threshold) break;
    selected = index;
  }
  return selected;
}

function marginalBreakdown(base: number, tiers: CommissionTier[]): CommissionTierBreakdown[] {
  return tiers.map((tier, index) => {
    const nextThreshold = tiers[index + 1]?.threshold ?? null;
    const tierEnd = nextThreshold === null ? base : Math.min(base, nextThreshold);
    const amountInTier = Math.max(0, tierEnd - tier.threshold);
    return {
      tierIndex: index,
      threshold: tier.threshold,
      nextThreshold,
      amountInTier,
      ratePercent: tier.ratePercent,
      commission: amountInTier * tier.ratePercent / 100,
    };
  });
}

function retroactiveBreakdown(base: number, tiers: CommissionTier[]): CommissionTierBreakdown[] {
  const index = selectedTierIndex(base, tiers);
  const tier = tiers[index] ?? tiers[0];
  if (!tier) throw new Error("แผนแบบขั้นบันไดต้องมีอย่างน้อย 1 ขั้น");
  return [{
    tierIndex: index,
    threshold: tier.threshold,
    nextThreshold: tiers[index + 1]?.threshold ?? null,
    amountInTier: base,
    ratePercent: tier.ratePercent,
    commission: base * tier.ratePercent / 100,
  }];
}

export function calculateSalesCommission(input: SalesCommissionInput): SalesCommissionResult {
  assertRange(input.grossSales, "ยอดขายรวม", 0.01, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.refunds, "ยอดคืน/ยกเลิก", 0, SALES_COMMISSION_MAX_MONEY);
  if (input.refunds > input.grossSales) throw new Error("ยอดคืน/ยกเลิกต้องไม่เกินยอดขายรวม");
  assertRange(input.directCosts, "ต้นทุนตรงของยอดขายสุทธิ", 0, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.salesCreditPercent, "สัดส่วนเครดิตยอดขาย", 0, 100);
  assertRange(input.flatRatePercent, "อัตราคอมมิชชันคงที่", 0, SALES_COMMISSION_MAX_RATE_PERCENT);
  assertRange(input.quota, "Quota", 0, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.quotaBonus, "โบนัสเมื่อถึง Quota", 0, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.payoutAdjustment, "รายการปรับเพิ่ม/Clawback", -SALES_COMMISSION_MAX_MONEY, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.payoutCap, "เพดาน Payout", 0, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.basePay, "ค่าจ้างฐานต่อรอบ", 0, SALES_COMMISSION_MAX_MONEY);
  assertRange(input.periodsPerYear, "จำนวนรอบต่อปี", 1, SALES_COMMISSION_MAX_PERIODS_PER_YEAR);
  if (!Number.isInteger(input.periodsPerYear)) throw new Error("จำนวนรอบต่อปีต้องเป็นจำนวนเต็ม");
  if (input.planType !== "flat" && input.planType !== "marginal" && input.planType !== "retroactive") {
    throw new Error("รูปแบบแผนคอมมิชชันไม่ถูกต้อง");
  }
  if (input.basis !== "revenue" && input.basis !== "gross-profit") {
    throw new Error("ฐานคำนวณคอมมิชชันไม่ถูกต้อง");
  }
  if (input.planType !== "flat") validateTiers(input.tiers);

  const netSales = input.grossSales - input.refunds;
  const creditFactor = input.salesCreditPercent / 100;
  const creditedNetSales = netSales * creditFactor;
  const creditedDirectCosts = input.directCosts * creditFactor;
  const creditedGrossProfit = creditedNetSales - creditedDirectCosts;
  const eligibleCommissionBase = input.basis === "revenue"
    ? creditedNetSales
    : Math.max(0, creditedGrossProfit);

  let commissionBeforeBonuses: number;
  let selectedRatePercent: number;
  let tierBreakdown: CommissionTierBreakdown[] = [];
  let marginalCommission: number | null = null;
  let retroactiveCommission: number | null = null;

  if (input.planType === "flat") {
    selectedRatePercent = input.flatRatePercent;
    commissionBeforeBonuses = eligibleCommissionBase * input.flatRatePercent / 100;
  } else {
    const marginalRows = marginalBreakdown(eligibleCommissionBase, input.tiers);
    const retroactiveRows = retroactiveBreakdown(eligibleCommissionBase, input.tiers);
    const retroactiveRow = retroactiveRows[0];
    const selectedTier = input.tiers[selectedTierIndex(eligibleCommissionBase, input.tiers)];
    if (!retroactiveRow || !selectedTier) throw new Error("ไม่พบขั้นคอมมิชชันที่ตรงกับฐานคำนวณ");
    marginalCommission = marginalRows.reduce((total, row) => total + row.commission, 0);
    retroactiveCommission = retroactiveRow.commission;
    if (input.planType === "marginal") {
      tierBreakdown = marginalRows;
      commissionBeforeBonuses = marginalCommission;
      selectedRatePercent = selectedTier.ratePercent;
    } else {
      tierBreakdown = retroactiveRows;
      commissionBeforeBonuses = retroactiveCommission;
      selectedRatePercent = retroactiveRow.ratePercent;
    }
  }

  const quotaReached = input.quota > 0 && eligibleCommissionBase >= input.quota;
  const quotaAttainmentPercent = input.quota > 0 ? eligibleCommissionBase / input.quota * 100 : null;
  const quotaBonusEarned = quotaReached ? input.quotaBonus : 0;
  const rawVariablePayout = commissionBeforeBonuses + quotaBonusEarned + input.payoutAdjustment;
  const payoutBeforeCap = Math.max(0, rawVariablePayout);
  const floorReduction = Math.max(0, -rawVariablePayout);
  const finalCommissionPayout = input.payoutCap > 0
    ? Math.min(payoutBeforeCap, input.payoutCap)
    : payoutBeforeCap;
  const capReduction = payoutBeforeCap - finalCommissionPayout;
  const totalPeriodEarnings = input.basePay + finalCommissionPayout;
  const annualizedCommissionPayout = finalCommissionPayout * input.periodsPerYear;
  const annualizedTotalEarnings = totalPeriodEarnings * input.periodsPerYear;
  const effectivePayoutRatePercent = eligibleCommissionBase > 0
    ? finalCommissionPayout / eligibleCommissionBase * 100
    : null;
  const amountToQuota = input.quota > 0 ? Math.max(0, input.quota - eligibleCommissionBase) : null;
  const nextTier = input.planType === "flat"
    ? undefined
    : input.tiers.find((tier) => tier.threshold > eligibleCommissionBase);
  const nextTierThreshold = nextTier?.threshold ?? null;
  const amountToNextTier = nextTier ? nextTier.threshold - eligibleCommissionBase : null;

  const resultValues = [
    netSales,
    creditedNetSales,
    creditedDirectCosts,
    creditedGrossProfit,
    eligibleCommissionBase,
    commissionBeforeBonuses,
    selectedRatePercent,
    quotaBonusEarned,
    rawVariablePayout,
    payoutBeforeCap,
    floorReduction,
    capReduction,
    finalCommissionPayout,
    totalPeriodEarnings,
    annualizedCommissionPayout,
    annualizedTotalEarnings,
    ...(marginalCommission === null ? [] : [marginalCommission]),
    ...(retroactiveCommission === null ? [] : [retroactiveCommission]),
    ...(quotaAttainmentPercent === null ? [] : [quotaAttainmentPercent]),
    ...(effectivePayoutRatePercent === null ? [] : [effectivePayoutRatePercent]),
    ...(amountToQuota === null ? [] : [amountToQuota]),
    ...(nextTierThreshold === null ? [] : [nextTierThreshold]),
    ...(amountToNextTier === null ? [] : [amountToNextTier]),
    ...tierBreakdown.flatMap((row) => [row.threshold, row.nextThreshold ?? 0, row.amountInTier, row.ratePercent, row.commission]),
  ];
  resultValues.forEach(assertResult);

  return {
    netSales,
    creditedNetSales,
    creditedDirectCosts,
    creditedGrossProfit,
    eligibleCommissionBase,
    commissionBeforeBonuses,
    selectedRatePercent,
    marginalCommission,
    retroactiveCommission,
    quotaAttainmentPercent,
    quotaBonusEarned,
    quotaReached,
    rawVariablePayout,
    payoutBeforeCap,
    floorReduction,
    capReduction,
    finalCommissionPayout,
    totalPeriodEarnings,
    annualizedCommissionPayout,
    annualizedTotalEarnings,
    effectivePayoutRatePercent,
    amountToQuota,
    nextTierThreshold,
    amountToNextTier,
    tierBreakdown,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "คำนวณไม่ได้" : value.toFixed(2);
}

export function salesCommissionCsv(input: SalesCommissionInput, result: SalesCommissionResult, currency: string) {
  const planLabels: Record<CommissionPlanType, string> = {
    flat: "อัตราคงที่",
    marginal: "ขั้นบันไดแบบ Marginal",
    retroactive: "ขั้นบันไดแบบ Retroactive",
  };
  const basisLabels: Record<CommissionBasis, string> = { revenue: "ยอดขายสุทธิ", "gross-profit": "กำไรขั้นต้น" };
  const rows: Array<Array<string | number>> = [
    ["การตั้งค่า", "ค่า", "หน่วย"],
    ["รูปแบบแผน", planLabels[input.planType], ""],
    ["ฐานคำนวณ", basisLabels[input.basis], ""],
    ["ยอดขายรวม", csvNumber(input.grossSales), currency],
    ["ยอดคืน/ยกเลิก", csvNumber(input.refunds), currency],
    ["ต้นทุนตรงของยอดขายสุทธิ", csvNumber(input.directCosts), currency],
    ["สัดส่วนเครดิตยอดขาย", csvNumber(input.salesCreditPercent), "%"],
    ["Quota", csvNumber(input.quota), currency],
    ["โบนัสเมื่อถึง Quota", csvNumber(input.quotaBonus), currency],
    ["รายการปรับเพิ่ม/Clawback", csvNumber(input.payoutAdjustment), currency],
    ["เพดาน Payout (0 = ไม่จำกัด)", csvNumber(input.payoutCap), currency],
    ["ค่าจ้างฐานต่อรอบ", csvNumber(input.basePay), currency],
    ["จำนวนรอบต่อปี", input.periodsPerYear, "รอบ"],
    [],
    ["ผลลัพธ์", "ค่า", "หน่วย"],
    ["ยอดขายสุทธิ", csvNumber(result.netSales), currency],
    ["ยอดขายสุทธิที่ได้รับเครดิต", csvNumber(result.creditedNetSales), currency],
    ["กำไรขั้นต้นที่ได้รับเครดิต", csvNumber(result.creditedGrossProfit), currency],
    ["ฐานคำนวณคอมมิชชัน", csvNumber(result.eligibleCommissionBase), currency],
    ["คอมมิชชันก่อนโบนัส/ปรับยอด", csvNumber(result.commissionBeforeBonuses), currency],
    ["อัตราขั้นปัจจุบัน", csvNumber(result.selectedRatePercent), "%"],
    ["Quota attainment", csvNumber(result.quotaAttainmentPercent), "%"],
    ["โบนัส Quota ที่ได้รับ", csvNumber(result.quotaBonusEarned), currency],
    ["รายการปรับเพิ่ม/Clawback", csvNumber(input.payoutAdjustment), currency],
    ["ยอดลดจากเพดาน", csvNumber(result.capReduction), currency],
    ["Commission payout สุทธิ", csvNumber(result.finalCommissionPayout), currency],
    ["รายได้รวมค่าจ้างฐานต่อรอบ", csvNumber(result.totalPeriodEarnings), currency],
    ["Commission ต่อปีโดยประมาณ", csvNumber(result.annualizedCommissionPayout), currency],
    ["รายได้รวมต่อปีโดยประมาณ", csvNumber(result.annualizedTotalEarnings), currency],
    ["Effective payout rate", csvNumber(result.effectivePayoutRatePercent), "%"],
  ];

  if (input.planType !== "flat") {
    rows.push(
      [],
      ["รายละเอียดขั้น", "ยอดเริ่มต้น", "ยอดสิ้นสุด", "ยอดในขั้น", "อัตรา", "คอมมิชชัน", "สกุลเงิน"],
      ...result.tierBreakdown.map((row) => [
        `ขั้น ${row.tierIndex + 1}`,
        csvNumber(row.threshold),
        row.nextThreshold === null ? "ไม่จำกัด" : csvNumber(row.nextThreshold),
        csvNumber(row.amountInTier),
        csvNumber(row.ratePercent),
        csvNumber(row.commission),
        currency,
      ]),
    );
  }

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
