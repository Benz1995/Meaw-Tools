export const EOQ_MAX_AMOUNT = 1_000_000_000_000;
export const EOQ_MAX_COST = 1_000_000_000_000_000;
export const EOQ_MAX_TIERS = 6;

export type EoqCurrency = "THB" | "USD" | "EUR" | "JPY" | "GBP";
export type HoldingCostMode = "per-unit" | "rate";

export type EoqPriceTier = {
  minimumQuantity: number;
  unitPrice: number;
};

export type EoqInput = {
  currency: EoqCurrency;
  annualDemand: number;
  orderingCost: number;
  holdingCostMode: HoldingCostMode;
  holdingCostPerUnit: number;
  holdingRatePercent: number;
  workingDaysPerYear: number;
  leadTimeDays: number;
  safetyStock: number;
  packSize: number;
  minimumOrderQuantity: number;
  storageCapacity: number;
  currentOrderQuantity: number;
  priceTiers: EoqPriceTier[];
};

export type EoqCandidate = {
  quantity: number;
  unitPrice: number;
  priceTierMinimum: number;
  holdingCostPerUnit: number;
  rawEoq: number;
  ordersPerYear: number;
  cycleDays: number;
  averageCycleInventory: number;
  averageTotalInventory: number;
  annualPurchaseCost: number;
  annualOrderingCost: number;
  annualHoldingCost: number;
  annualRelevantCost: number;
  annualTotalCost: number;
  reasons: string[];
};

export type EoqResult = {
  recommended: EoqCandidate;
  candidates: EoqCandidate[];
  dailyDemand: number;
  reorderPoint: number;
  demandDuringLeadTime: number;
  current: EoqCandidate | null;
  annualSavingsVsCurrent: number | null;
  savingsPercentVsCurrent: number | null;
  purchaseCostSharePercent: number;
  orderingCostSharePercent: number;
  holdingCostSharePercent: number;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertInteger(value: number, label: string) {
  if (!Number.isInteger(value)) throw new Error(`${label}ต้องเป็นจำนวนเต็ม`);
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > EOQ_MAX_COST) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

function roundUpToMultiple(value: number, multiple: number) {
  return Math.ceil(value / multiple - 1e-12) * multiple;
}

function roundDownToMultiple(value: number, multiple: number) {
  return Math.floor(value / multiple + 1e-12) * multiple;
}

function tierForQuantity(priceTiers: EoqPriceTier[], quantity: number) {
  let selected = priceTiers[0]!;
  for (const tier of priceTiers) {
    if (quantity + 1e-9 < tier.minimumQuantity) break;
    selected = tier;
  }
  return selected;
}

function holdingCostForTier(input: EoqInput, tier: EoqPriceTier) {
  return input.holdingCostMode === "per-unit"
    ? input.holdingCostPerUnit
    : tier.unitPrice * input.holdingRatePercent / 100;
}

function evaluateCandidate(input: EoqInput, quantity: number, reasons: string[]): EoqCandidate {
  const tier = tierForQuantity(input.priceTiers, quantity);
  const holdingCostPerUnit = holdingCostForTier(input, tier);
  const rawEoq = Math.sqrt(2 * input.annualDemand * input.orderingCost / holdingCostPerUnit);
  const ordersPerYear = input.annualDemand / quantity;
  const cycleDays = input.workingDaysPerYear / ordersPerYear;
  const averageCycleInventory = quantity / 2;
  const averageTotalInventory = averageCycleInventory + input.safetyStock;
  const annualPurchaseCost = input.annualDemand * tier.unitPrice;
  const annualOrderingCost = ordersPerYear * input.orderingCost;
  const annualHoldingCost = averageTotalInventory * holdingCostPerUnit;
  const annualRelevantCost = annualOrderingCost + annualHoldingCost;
  const annualTotalCost = annualPurchaseCost + annualRelevantCost;

  [
    holdingCostPerUnit,
    rawEoq,
    ordersPerYear,
    cycleDays,
    averageCycleInventory,
    averageTotalInventory,
    annualPurchaseCost,
    annualOrderingCost,
    annualHoldingCost,
    annualRelevantCost,
    annualTotalCost,
  ].forEach(assertResult);

  return {
    quantity,
    unitPrice: tier.unitPrice,
    priceTierMinimum: tier.minimumQuantity,
    holdingCostPerUnit,
    rawEoq,
    ordersPerYear,
    cycleDays,
    averageCycleInventory,
    averageTotalInventory,
    annualPurchaseCost,
    annualOrderingCost,
    annualHoldingCost,
    annualRelevantCost,
    annualTotalCost,
    reasons,
  };
}

function validateInput(input: EoqInput) {
  if (!["THB", "USD", "EUR", "JPY", "GBP"].includes(input.currency)) throw new Error("สกุลเงินไม่ถูกต้อง");
  if (input.holdingCostMode !== "per-unit" && input.holdingCostMode !== "rate") throw new Error("วิธีกรอกต้นทุนถือครองไม่ถูกต้อง");
  assertRange(input.annualDemand, "Demand ต่อปี", 0.01, EOQ_MAX_AMOUNT);
  assertRange(input.orderingCost, "ต้นทุนต่อการสั่งซื้อ", 0.01, EOQ_MAX_COST);
  assertRange(input.workingDaysPerYear, "วันทำงานต่อปี", 1, 366);
  assertInteger(input.workingDaysPerYear, "วันทำงานต่อปี");
  assertRange(input.leadTimeDays, "Lead time", 0, 3_660);
  assertRange(input.safetyStock, "Safety Stock", 0, EOQ_MAX_AMOUNT);
  assertRange(input.packSize, "Pack size", 1, EOQ_MAX_AMOUNT);
  assertInteger(input.packSize, "Pack size");
  assertRange(input.minimumOrderQuantity, "MOQ", 1, EOQ_MAX_AMOUNT);
  assertInteger(input.minimumOrderQuantity, "MOQ");
  assertRange(input.storageCapacity, "ความจุสูงสุด", 0, EOQ_MAX_AMOUNT);
  if (input.storageCapacity > 0) assertInteger(input.storageCapacity, "ความจุสูงสุด");
  assertRange(input.currentOrderQuantity, "จำนวนสั่งซื้อปัจจุบัน", 0, EOQ_MAX_AMOUNT);
  if (input.currentOrderQuantity > 0) assertInteger(input.currentOrderQuantity, "จำนวนสั่งซื้อปัจจุบัน");

  if (input.holdingCostMode === "per-unit") {
    assertRange(input.holdingCostPerUnit, "ต้นทุนถือครองต่อหน่วยต่อปี", 0.000001, EOQ_MAX_COST);
  } else {
    assertRange(input.holdingRatePercent, "อัตราต้นทุนถือครอง", 0.000001, 1_000);
  }

  if (input.priceTiers.length < 1 || input.priceTiers.length > EOQ_MAX_TIERS) {
    throw new Error(`Price tier ต้องมี 1–${EOQ_MAX_TIERS} ระดับ`);
  }
  input.priceTiers.forEach((tier, index) => {
    assertRange(tier.minimumQuantity, `จำนวนเริ่มต้น Tier ${index + 1}`, 1, EOQ_MAX_AMOUNT);
    assertInteger(tier.minimumQuantity, `จำนวนเริ่มต้น Tier ${index + 1}`);
    assertRange(tier.unitPrice, `ราคาต่อหน่วย Tier ${index + 1}`, 0.000001, EOQ_MAX_COST);
    if (index === 0 && tier.minimumQuantity !== 1) throw new Error("Tier แรกต้องเริ่มที่ 1 หน่วย");
    const previous = input.priceTiers[index - 1];
    if (previous && tier.minimumQuantity <= previous.minimumQuantity) throw new Error("จำนวนเริ่มต้นของ Price tier ต้องเรียงจากน้อยไปมากและไม่ซ้ำ");
    if (previous && tier.unitPrice >= previous.unitPrice) throw new Error("ราคาต่อหน่วยของ Price tier ถัดไปต้องต่ำกว่าระดับก่อนหน้า");
  });

  const roundedMinimum = roundUpToMultiple(input.minimumOrderQuantity, input.packSize);
  if (input.storageCapacity > 0 && roundedMinimum > input.storageCapacity) {
    throw new Error("ความจุสูงสุดต้องไม่น้อยกว่า MOQ หลังปัด Pack size");
  }
  if (input.currentOrderQuantity > 0) {
    if (input.currentOrderQuantity < roundedMinimum) throw new Error("จำนวนสั่งซื้อปัจจุบันต้องไม่น้อยกว่า MOQ หลังปัด Pack size");
    if (input.currentOrderQuantity % input.packSize !== 0) throw new Error("จำนวนสั่งซื้อปัจจุบันต้องหารด้วย Pack size ลงตัว");
    if (input.storageCapacity > 0 && input.currentOrderQuantity > input.storageCapacity) throw new Error("จำนวนสั่งซื้อปัจจุบันต้องไม่เกินความจุสูงสุด");
  }
}

export function calculateEoq(input: EoqInput): EoqResult {
  validateInput(input);
  const maximumQuantity = input.storageCapacity > 0
    ? roundDownToMultiple(input.storageCapacity, input.packSize)
    : EOQ_MAX_AMOUNT;
  const minimumQuantity = roundUpToMultiple(input.minimumOrderQuantity, input.packSize);
  const reasonsByQuantity = new Map<number, Set<string>>();

  const addCandidate = (quantity: number, reason: string) => {
    if (!Number.isFinite(quantity) || quantity < minimumQuantity || quantity > maximumQuantity) return;
    if (!Number.isInteger(quantity) || quantity % input.packSize !== 0) return;
    const reasons = reasonsByQuantity.get(quantity) ?? new Set<string>();
    reasons.add(reason);
    reasonsByQuantity.set(quantity, reasons);
  };

  addCandidate(minimumQuantity, "MOQ/ขั้นต่ำที่เป็นไปได้");
  for (const tier of input.priceTiers) {
    const tierMinimum = roundUpToMultiple(Math.max(tier.minimumQuantity, input.minimumOrderQuantity), input.packSize);
    addCandidate(tierMinimum, tier.minimumQuantity === 1 ? "ขั้นต่ำของนโยบาย" : `จุดเริ่มส่วนลด ${tier.minimumQuantity.toLocaleString("th-TH")} หน่วย`);
    const rawEoq = Math.sqrt(2 * input.annualDemand * input.orderingCost / holdingCostForTier(input, tier));
    addCandidate(roundDownToMultiple(rawEoq, input.packSize), "EOQ ปัดลงตาม Pack size");
    addCandidate(roundUpToMultiple(rawEoq, input.packSize), "EOQ ปัดขึ้นตาม Pack size");
  }
  if (input.storageCapacity > 0) addCandidate(maximumQuantity, "ขีดจำกัดพื้นที่เก็บ");
  if (input.currentOrderQuantity > 0) addCandidate(input.currentOrderQuantity, "จำนวนสั่งซื้อปัจจุบัน");

  const candidates = [...reasonsByQuantity.entries()]
    .map(([quantity, reasons]) => evaluateCandidate(input, quantity, [...reasons]))
    .sort((a, b) => a.annualTotalCost - b.annualTotalCost || a.quantity - b.quantity);
  const recommended = candidates[0];
  if (!recommended) throw new Error("ไม่พบจำนวนสั่งซื้อที่เป็นไปได้ภายใต้ MOQ, Pack size และความจุที่กำหนด");

  const dailyDemand = input.annualDemand / input.workingDaysPerYear;
  const demandDuringLeadTime = dailyDemand * input.leadTimeDays;
  const reorderPoint = demandDuringLeadTime + input.safetyStock;
  const current = input.currentOrderQuantity > 0
    ? evaluateCandidate(input, input.currentOrderQuantity, ["จำนวนสั่งซื้อปัจจุบัน"])
    : null;
  const annualSavingsVsCurrent = current ? Math.max(0, current.annualTotalCost - recommended.annualTotalCost) : null;
  const savingsPercentVsCurrent = current && annualSavingsVsCurrent !== null
    ? annualSavingsVsCurrent / current.annualTotalCost * 100
    : null;
  const purchaseCostSharePercent = recommended.annualPurchaseCost / recommended.annualTotalCost * 100;
  const orderingCostSharePercent = recommended.annualOrderingCost / recommended.annualTotalCost * 100;
  const holdingCostSharePercent = recommended.annualHoldingCost / recommended.annualTotalCost * 100;
  [dailyDemand, demandDuringLeadTime, reorderPoint, purchaseCostSharePercent, orderingCostSharePercent, holdingCostSharePercent].forEach(assertResult);

  return {
    recommended,
    candidates,
    dailyDemand,
    reorderPoint,
    demandDuringLeadTime,
    current,
    annualSavingsVsCurrent,
    savingsPercentVsCurrent,
    purchaseCostSharePercent,
    orderingCostSharePercent,
    holdingCostSharePercent,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "ไม่มีข้อมูล" : value.toFixed(4);
}

export function eoqCsv(input: EoqInput, result: EoqResult) {
  const rows: Array<Array<string | number>> = [
    ["EOQ Calculator", "Value", "Unit"],
    ["Currency", input.currency, ""],
    ["Annual demand", csvNumber(input.annualDemand), "units/year"],
    ["Ordering cost", csvNumber(input.orderingCost), `${input.currency}/order`],
    ["Holding cost mode", input.holdingCostMode, ""],
    ["Holding cost per unit", csvNumber(input.holdingCostPerUnit), `${input.currency}/unit/year`],
    ["Holding rate", csvNumber(input.holdingRatePercent), "%/year"],
    ["Working days", input.workingDaysPerYear, "days/year"],
    ["Lead time", csvNumber(input.leadTimeDays), "days"],
    ["Safety stock", csvNumber(input.safetyStock), "units"],
    ["Pack size", input.packSize, "units"],
    ["MOQ", input.minimumOrderQuantity, "units"],
    ["Storage capacity", input.storageCapacity === 0 ? "No limit" : input.storageCapacity, "units"],
    ["Current order quantity", input.currentOrderQuantity === 0 ? "Not provided" : input.currentOrderQuantity, "units"],
    [],
    ["Price tiers", "Minimum quantity", `Unit price (${input.currency})`],
    ...input.priceTiers.map((tier, index) => [`Tier ${index + 1}`, tier.minimumQuantity, csvNumber(tier.unitPrice)]),
    [],
    ["Recommended result", "Value", "Unit"],
    ["Order quantity", result.recommended.quantity, "units/order"],
    ["Raw EOQ at selected price", csvNumber(result.recommended.rawEoq), "units"],
    ["Applied unit price", csvNumber(result.recommended.unitPrice), `${input.currency}/unit`],
    ["Orders per year", csvNumber(result.recommended.ordersPerYear), "orders/year"],
    ["Cycle length", csvNumber(result.recommended.cycleDays), "working days"],
    ["Average total inventory", csvNumber(result.recommended.averageTotalInventory), "units"],
    ["Estimated reorder point", csvNumber(result.reorderPoint), "units"],
    ["Annual purchase cost", csvNumber(result.recommended.annualPurchaseCost), input.currency],
    ["Annual ordering cost", csvNumber(result.recommended.annualOrderingCost), input.currency],
    ["Annual holding cost", csvNumber(result.recommended.annualHoldingCost), input.currency],
    ["Annual total cost", csvNumber(result.recommended.annualTotalCost), input.currency],
    ["Annual savings vs current", csvNumber(result.annualSavingsVsCurrent), input.currency],
    [],
    ["Candidate rank", "Quantity", "Unit price", "Annual total cost", "Reasons"],
    ...result.candidates.map((candidate, index) => [
      index + 1,
      candidate.quantity,
      csvNumber(candidate.unitPrice),
      csvNumber(candidate.annualTotalCost),
      candidate.reasons.join(" + "),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
