export type BreakEvenCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";

export type BreakEvenFixedCosts = {
  rentAndSpace: number;
  fixedPayroll: number;
  utilitiesAndSubscriptions: number;
  marketingAndAdmin: number;
  depreciationAndOther: number;
};

export type BreakEvenProduct = {
  name: string;
  sellingPricePerUnit: number;
  variableCostPerUnit: number;
  unitSalesMixPercent: number;
};

export type BreakEvenInput = {
  currency: BreakEvenCurrency;
  scenarioName: string;
  fixedCosts: BreakEvenFixedCosts;
  products: BreakEvenProduct[];
  currentTotalUnits: number;
  targetOperatingProfit: number;
  capacityUnits: number;
};

export type BreakEvenProductResult = BreakEvenProduct & {
  contributionMarginPerUnit: number;
  contributionMarginRatioPercent: number;
  weightedPricePerUnit: number;
  weightedVariableCostPerUnit: number;
  weightedContributionPerUnit: number;
  breakEvenUnitsExact: number;
  targetUnitsExact: number;
  currentUnits: number | null;
};

export type BreakEvenCurrentPlan = {
  totalUnits: number;
  revenue: number;
  variableCosts: number;
  contributionMargin: number;
  operatingProfit: number;
  operatingMarginPercent: number;
  marginOfSafetyUnits: number;
  marginOfSafetyRevenue: number;
  marginOfSafetyPercent: number;
  unitsGapToBreakEven: number;
  unitsGapToTarget: number;
};

export type BreakEvenCapacityPlan = {
  units: number;
  revenue: number;
  operatingProfit: number;
  breakEvenCapacityPercent: number;
  targetCapacityPercent: number;
  status: "below-break-even" | "between-break-even-and-target" | "at-or-above-target";
};

export type BreakEvenResult = {
  totalFixedCosts: number;
  weightedSellingPricePerUnit: number;
  weightedVariableCostPerUnit: number;
  weightedContributionMarginPerUnit: number;
  weightedContributionMarginRatioPercent: number;
  breakEvenUnitsExact: number;
  breakEvenUnitsRounded: number;
  breakEvenRevenue: number;
  targetUnitsExact: number;
  targetUnitsRounded: number;
  targetRevenue: number;
  products: BreakEvenProductResult[];
  currentPlan: BreakEvenCurrentPlan | null;
  capacityPlan: BreakEvenCapacityPlan | null;
};

export const BREAK_EVEN_MAX_MONEY = 1_000_000_000_000;
export const BREAK_EVEN_MAX_QUANTITY = 1_000_000_000;
export const BREAK_EVEN_MAX_PRODUCTS = 6;
const BREAK_EVEN_MAX_RESULT = 1_000_000_000_000_000_000;
const SUPPORTED_CURRENCIES = new Set<BreakEvenCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);

function assertText(value: string, label: string, maxLength = 80) {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  if (value.length > maxLength) throw new Error(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
}

function assertNumber(value: number, label: string, options: { min?: number; max?: number; positive?: boolean } = {}) {
  if (!Number.isFinite(value)) throw new Error(`${label}ต้องเป็นตัวเลขที่มีขอบเขต`);
  if (options.positive && value <= 0) throw new Error(`${label}ต้องมากกว่า 0`);
  if (options.min !== undefined && value < options.min) throw new Error(`${label}ต้องไม่น้อยกว่า ${options.min}`);
  if (options.max !== undefined && value > options.max) throw new Error(`${label}สูงเกินขอบเขตที่รองรับ`);
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > BREAK_EVEN_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาตรวจหน่วย ราคา และต้นทุนอีกครั้ง");
  }
}

function sumFixedCosts(costs: BreakEvenFixedCosts) {
  return costs.rentAndSpace
    + costs.fixedPayroll
    + costs.utilitiesAndSubscriptions
    + costs.marketingAndAdmin
    + costs.depreciationAndOther;
}

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  assertText(input.scenarioName, "ชื่อ Scenario");
  if (input.products.length < 1 || input.products.length > BREAK_EVEN_MAX_PRODUCTS) {
    throw new Error(`ต้องมีสินค้า/บริการ 1–${BREAK_EVEN_MAX_PRODUCTS} รายการ`);
  }

  const fixedEntries: Array<[string, number]> = [
    ["ค่าเช่าและพื้นที่", input.fixedCosts.rentAndSpace],
    ["เงินเดือนและค่าแรงส่วนคงที่", input.fixedCosts.fixedPayroll],
    ["Utilities และ Subscription ส่วนคงที่", input.fixedCosts.utilitiesAndSubscriptions],
    ["Marketing และ Admin ส่วนคงที่", input.fixedCosts.marketingAndAdmin],
    ["Depreciation และต้นทุนคงที่อื่น", input.fixedCosts.depreciationAndOther],
  ];
  fixedEntries.forEach(([label, value]) => assertNumber(value, label, { min: 0, max: BREAK_EVEN_MAX_MONEY }));
  const totalFixedCosts = sumFixedCosts(input.fixedCosts);
  assertNumber(totalFixedCosts, "ต้นทุนคงที่รวม", { positive: true, max: BREAK_EVEN_MAX_MONEY });
  assertNumber(input.currentTotalUnits, "ยอดขายปัจจุบัน", { min: 0, max: BREAK_EVEN_MAX_QUANTITY });
  assertNumber(input.targetOperatingProfit, "เป้าหมายกำไรจากการดำเนินงาน", { min: 0, max: BREAK_EVEN_MAX_MONEY });
  assertNumber(input.capacityUnits, "กำลังรองรับสูงสุด", { min: 0, max: BREAK_EVEN_MAX_QUANTITY });

  let mixTotal = 0;
  let weightedSellingPricePerUnit = 0;
  let weightedVariableCostPerUnit = 0;

  input.products.forEach((product, index) => {
    const position = index + 1;
    assertText(product.name, `ชื่อสินค้า/บริการรายการที่ ${position}`, 60);
    assertNumber(product.sellingPricePerUnit, `ราคาขายรายการที่ ${position}`, { positive: true, max: BREAK_EVEN_MAX_MONEY });
    assertNumber(product.variableCostPerUnit, `ต้นทุนผันแปรรายการที่ ${position}`, { min: 0, max: BREAK_EVEN_MAX_MONEY });
    assertNumber(product.unitSalesMixPercent, `Unit sales mix รายการที่ ${position}`, { positive: true, max: 100 });
    mixTotal += product.unitSalesMixPercent;
    const mixRate = product.unitSalesMixPercent / 100;
    weightedSellingPricePerUnit += product.sellingPricePerUnit * mixRate;
    weightedVariableCostPerUnit += product.variableCostPerUnit * mixRate;
  });

  if (Math.abs(mixTotal - 100) > 0.01) {
    throw new Error(`Unit sales mix รวมต้องเท่ากับ 100% (ปัจจุบัน ${mixTotal.toFixed(2)}%)`);
  }

  const weightedContributionMarginPerUnit = weightedSellingPricePerUnit - weightedVariableCostPerUnit;
  if (weightedContributionMarginPerUnit <= 0) {
    throw new Error("Contribution margin แบบถ่วงน้ำหนักต้องมากกว่า 0 จึงจะมีจุดคุ้มทุนที่คำนวณได้");
  }
  const weightedContributionMarginRatioPercent = weightedContributionMarginPerUnit / weightedSellingPricePerUnit * 100;
  const breakEvenUnitsExact = totalFixedCosts / weightedContributionMarginPerUnit;
  const breakEvenUnitsRounded = Math.ceil(breakEvenUnitsExact - Number.EPSILON);
  const breakEvenRevenue = totalFixedCosts / (weightedContributionMarginRatioPercent / 100);
  const targetUnitsExact = (totalFixedCosts + input.targetOperatingProfit) / weightedContributionMarginPerUnit;
  const targetUnitsRounded = Math.ceil(targetUnitsExact - Number.EPSILON);
  const targetRevenue = (totalFixedCosts + input.targetOperatingProfit) / (weightedContributionMarginRatioPercent / 100);

  const products: BreakEvenProductResult[] = input.products.map((product) => {
    const mixRate = product.unitSalesMixPercent / 100;
    const contributionMarginPerUnit = product.sellingPricePerUnit - product.variableCostPerUnit;
    return {
      ...product,
      contributionMarginPerUnit,
      contributionMarginRatioPercent: contributionMarginPerUnit / product.sellingPricePerUnit * 100,
      weightedPricePerUnit: product.sellingPricePerUnit * mixRate,
      weightedVariableCostPerUnit: product.variableCostPerUnit * mixRate,
      weightedContributionPerUnit: contributionMarginPerUnit * mixRate,
      breakEvenUnitsExact: breakEvenUnitsExact * mixRate,
      targetUnitsExact: targetUnitsExact * mixRate,
      currentUnits: input.currentTotalUnits > 0 ? input.currentTotalUnits * mixRate : null,
    };
  });

  let currentPlan: BreakEvenCurrentPlan | null = null;
  if (input.currentTotalUnits > 0) {
    const revenue = input.currentTotalUnits * weightedSellingPricePerUnit;
    const variableCosts = input.currentTotalUnits * weightedVariableCostPerUnit;
    const contributionMargin = input.currentTotalUnits * weightedContributionMarginPerUnit;
    const operatingProfit = contributionMargin - totalFixedCosts;
    const marginOfSafetyRevenue = revenue - breakEvenRevenue;
    currentPlan = {
      totalUnits: input.currentTotalUnits,
      revenue,
      variableCosts,
      contributionMargin,
      operatingProfit,
      operatingMarginPercent: operatingProfit / revenue * 100,
      marginOfSafetyUnits: input.currentTotalUnits - breakEvenUnitsExact,
      marginOfSafetyRevenue,
      marginOfSafetyPercent: marginOfSafetyRevenue / revenue * 100,
      unitsGapToBreakEven: Math.max(0, breakEvenUnitsExact - input.currentTotalUnits),
      unitsGapToTarget: Math.max(0, targetUnitsExact - input.currentTotalUnits),
    };
  }

  let capacityPlan: BreakEvenCapacityPlan | null = null;
  if (input.capacityUnits > 0) {
    const operatingProfit = input.capacityUnits * weightedContributionMarginPerUnit - totalFixedCosts;
    capacityPlan = {
      units: input.capacityUnits,
      revenue: input.capacityUnits * weightedSellingPricePerUnit,
      operatingProfit,
      breakEvenCapacityPercent: breakEvenUnitsExact / input.capacityUnits * 100,
      targetCapacityPercent: targetUnitsExact / input.capacityUnits * 100,
      status: input.capacityUnits < breakEvenUnitsExact
        ? "below-break-even"
        : input.capacityUnits < targetUnitsExact
          ? "between-break-even-and-target"
          : "at-or-above-target",
    };
  }

  const resultsToCheck = [
    totalFixedCosts,
    weightedSellingPricePerUnit,
    weightedVariableCostPerUnit,
    weightedContributionMarginPerUnit,
    weightedContributionMarginRatioPercent,
    breakEvenUnitsExact,
    breakEvenUnitsRounded,
    breakEvenRevenue,
    targetUnitsExact,
    targetUnitsRounded,
    targetRevenue,
    ...products.flatMap((product) => [
      product.contributionMarginPerUnit,
      product.contributionMarginRatioPercent,
      product.weightedContributionPerUnit,
      product.breakEvenUnitsExact,
      product.targetUnitsExact,
    ]),
    ...(currentPlan ? Object.values(currentPlan) : []),
    ...(capacityPlan ? [capacityPlan.units, capacityPlan.revenue, capacityPlan.operatingProfit, capacityPlan.breakEvenCapacityPercent, capacityPlan.targetCapacityPercent] : []),
  ];
  resultsToCheck.forEach(assertResult);

  return {
    totalFixedCosts,
    weightedSellingPricePerUnit,
    weightedVariableCostPerUnit,
    weightedContributionMarginPerUnit,
    weightedContributionMarginRatioPercent,
    breakEvenUnitsExact,
    breakEvenUnitsRounded,
    breakEvenRevenue,
    targetUnitsExact,
    targetUnitsRounded,
    targetRevenue,
    products,
    currentPlan,
    capacityPlan,
  };
}

function safeSpreadsheetText(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null, decimals = 2) {
  return value === null ? "ไม่ได้กรอก/คำนวณไม่ได้" : value.toFixed(decimals);
}

export function breakEvenCsv(input: BreakEvenInput, result: BreakEvenResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["Break-even scenario", safeSpreadsheetText(input.scenarioName)],
    ["Period", "หนึ่งงวดเดียวกัน (ตัวอย่าง UI ใช้รายเดือน)"],
    [],
    ["ต้นทุนคงที่", "ค่า", "หน่วย"],
    ["ค่าเช่าและพื้นที่", csvNumber(input.fixedCosts.rentAndSpace), currency],
    ["เงินเดือนและค่าแรงส่วนคงที่", csvNumber(input.fixedCosts.fixedPayroll), currency],
    ["Utilities และ Subscription ส่วนคงที่", csvNumber(input.fixedCosts.utilitiesAndSubscriptions), currency],
    ["Marketing และ Admin ส่วนคงที่", csvNumber(input.fixedCosts.marketingAndAdmin), currency],
    ["Depreciation และต้นทุนคงที่อื่น", csvNumber(input.fixedCosts.depreciationAndOther), currency],
    ["ต้นทุนคงที่รวม", csvNumber(result.totalFixedCosts), currency],
    [],
    ["สินค้า/บริการ", "ราคาขาย/หน่วย", "ต้นทุนผันแปร/หน่วย", "Unit mix %", "Contribution/หน่วย", "Break-even units", "Target units"],
    ...result.products.map((product) => [
      safeSpreadsheetText(product.name),
      csvNumber(product.sellingPricePerUnit),
      csvNumber(product.variableCostPerUnit),
      csvNumber(product.unitSalesMixPercent, 4),
      csvNumber(product.contributionMarginPerUnit),
      csvNumber(product.breakEvenUnitsExact, 4),
      csvNumber(product.targetUnitsExact, 4),
    ]),
    [],
    ["ผลรวมถ่วงน้ำหนัก", "ค่า", "หน่วย"],
    ["ราคาขายเฉลี่ยถ่วงน้ำหนัก", csvNumber(result.weightedSellingPricePerUnit), `${currency}/unit`],
    ["ต้นทุนผันแปรเฉลี่ยถ่วงน้ำหนัก", csvNumber(result.weightedVariableCostPerUnit), `${currency}/unit`],
    ["Contribution margin เฉลี่ยถ่วงน้ำหนัก", csvNumber(result.weightedContributionMarginPerUnit), `${currency}/unit`],
    ["Contribution margin ratio", csvNumber(result.weightedContributionMarginRatioPercent, 4), "%"],
    ["Break-even units (exact)", csvNumber(result.breakEvenUnitsExact, 4), "unit"],
    ["Break-even units (rounded up)", result.breakEvenUnitsRounded, "unit"],
    ["Break-even revenue", csvNumber(result.breakEvenRevenue), currency],
    ["Target operating profit", csvNumber(input.targetOperatingProfit), currency],
    ["Target units (exact)", csvNumber(result.targetUnitsExact, 4), "unit"],
    ["Target units (rounded up)", result.targetUnitsRounded, "unit"],
    ["Target revenue", csvNumber(result.targetRevenue), currency],
    [],
    ["Current scenario", "ค่า", "หน่วย"],
    ["ยอดขายปัจจุบัน", csvNumber(result.currentPlan?.totalUnits ?? null, 4), "unit"],
    ["รายได้", csvNumber(result.currentPlan?.revenue ?? null), currency],
    ["Contribution margin", csvNumber(result.currentPlan?.contributionMargin ?? null), currency],
    ["Operating profit", csvNumber(result.currentPlan?.operatingProfit ?? null), currency],
    ["Operating margin", csvNumber(result.currentPlan?.operatingMarginPercent ?? null, 4), "%"],
    ["Margin of safety", csvNumber(result.currentPlan?.marginOfSafetyPercent ?? null, 4), "%"],
    [],
    ["Capacity scenario", "ค่า", "หน่วย"],
    ["กำลังรองรับสูงสุด", csvNumber(result.capacityPlan?.units ?? null, 4), "unit"],
    ["Operating profit ที่ Capacity", csvNumber(result.capacityPlan?.operatingProfit ?? null), currency],
    ["Capacity ที่ต้องใช้เพื่อคุ้มทุน", csvNumber(result.capacityPlan?.breakEvenCapacityPercent ?? null, 4), "%"],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
