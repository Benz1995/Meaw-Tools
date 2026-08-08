export const SAFETY_STOCK_MAX_QUANTITY = 1_000_000_000_000;
export const SAFETY_STOCK_MAX_PERIODS = 3_660;
export const SAFETY_STOCK_MAX_RESULT = 1_000_000_000_000_000_000;
export const SAFETY_STOCK_MIN_SERVICE_LEVEL = 50;
export const SAFETY_STOCK_MAX_SERVICE_LEVEL = 99.99;

export type SafetyStockMethod = "service-level" | "days-cover" | "manual";
export type InventoryPeriodUnit = "day" | "week" | "month";

export type SafetyStockInput = {
  method: SafetyStockMethod;
  periodUnit: InventoryPeriodUnit;
  averageDemand: number;
  demandStdDev: number;
  averageLeadTime: number;
  leadTimeStdDev: number;
  serviceLevelPercent: number;
  safetyCoverPeriods: number;
  manualSafetyStock: number;
  roundingMultiple: number;
  onHand: number;
  onOrder: number;
  backorders: number;
};

export type SafetyStockResult = {
  leadTimeDemand: number;
  leadTimeDemandStdDev: number | null;
  zScore: number | null;
  rawSafetyStock: number;
  recommendedSafetyStock: number;
  rawReorderPoint: number;
  recommendedReorderPoint: number;
  inventoryPosition: number;
  reorderNow: boolean;
  unitsBelowReorderPoint: number;
  unitsAboveReorderPoint: number;
  periodsUntilReorderPoint: number;
  safetyBufferPeriods: number;
  totalCoveragePeriods: number;
  safetyStockSharePercent: number;
  demandVariabilityPercent: number | null;
  leadTimeVariabilityPercent: number | null;
  nominalStockoutRiskPercent: number | null;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > SAFETY_STOCK_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

export function serviceLevelToZScore(serviceLevelPercent: number) {
  assertRange(
    serviceLevelPercent,
    "Target service level",
    SAFETY_STOCK_MIN_SERVICE_LEVEL,
    SAFETY_STOCK_MAX_SERVICE_LEVEL,
  );

  const probability = serviceLevelPercent / 100;
  if (probability === 0.5) return 0;

  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];
  const lowerBoundary = 0.02425;
  const upperBoundary = 1 - lowerBoundary;

  if (probability < lowerBoundary) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!)
      / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }

  if (probability <= upperBoundary) {
    const q = probability - 0.5;
    const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q
      / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }

  const q = Math.sqrt(-2 * Math.log(1 - probability));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!)
    / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

function roundUpToMultiple(value: number, multiple: number) {
  if (multiple === 0 || value === 0) return value;
  return Math.ceil(value / multiple - 1e-12) * multiple;
}

export function calculateSafetyStock(input: SafetyStockInput): SafetyStockResult {
  if (input.method !== "service-level" && input.method !== "days-cover" && input.method !== "manual") {
    throw new Error("วิธีคำนวณ Safety Stock ไม่ถูกต้อง");
  }
  if (input.periodUnit !== "day" && input.periodUnit !== "week" && input.periodUnit !== "month") {
    throw new Error("หน่วยเวลาไม่ถูกต้อง");
  }

  assertRange(input.averageDemand, "Demand เฉลี่ยต่อช่วง", 0.01, SAFETY_STOCK_MAX_QUANTITY);
  assertRange(input.averageLeadTime, "Lead time เฉลี่ย", 0.01, SAFETY_STOCK_MAX_PERIODS);
  assertRange(input.roundingMultiple, "หน่วยที่ใช้ปัดขึ้น", 0, SAFETY_STOCK_MAX_QUANTITY);
  assertRange(input.onHand, "ของคงเหลือ", 0, SAFETY_STOCK_MAX_QUANTITY);
  assertRange(input.onOrder, "ของที่สั่งแล้ว", 0, SAFETY_STOCK_MAX_QUANTITY);
  assertRange(input.backorders, "Backorder", 0, SAFETY_STOCK_MAX_QUANTITY);

  let zScore: number | null = null;
  let leadTimeDemandStdDev: number | null = null;
  let rawSafetyStock: number;

  if (input.method === "service-level") {
    assertRange(input.demandStdDev, "Demand standard deviation", 0, SAFETY_STOCK_MAX_QUANTITY);
    assertRange(input.leadTimeStdDev, "Lead-time standard deviation", 0, SAFETY_STOCK_MAX_PERIODS);
    zScore = serviceLevelToZScore(input.serviceLevelPercent);
    leadTimeDemandStdDev = Math.sqrt(
      input.averageLeadTime * input.demandStdDev ** 2
      + input.averageDemand ** 2 * input.leadTimeStdDev ** 2,
    );
    rawSafetyStock = zScore * leadTimeDemandStdDev;
  } else if (input.method === "days-cover") {
    assertRange(input.safetyCoverPeriods, "ช่วงเวลาสำรอง", 0, SAFETY_STOCK_MAX_PERIODS);
    rawSafetyStock = input.averageDemand * input.safetyCoverPeriods;
  } else {
    assertRange(input.manualSafetyStock, "Safety Stock ที่กำหนดเอง", 0, SAFETY_STOCK_MAX_QUANTITY);
    rawSafetyStock = input.manualSafetyStock;
  }

  const leadTimeDemand = input.averageDemand * input.averageLeadTime;
  const recommendedSafetyStock = roundUpToMultiple(rawSafetyStock, input.roundingMultiple);
  const rawReorderPoint = leadTimeDemand + rawSafetyStock;
  const recommendedReorderPoint = roundUpToMultiple(rawReorderPoint, input.roundingMultiple);
  const inventoryPosition = input.onHand + input.onOrder - input.backorders;
  const distanceToReorderPoint = recommendedReorderPoint - inventoryPosition;
  const unitsBelowReorderPoint = Math.max(0, distanceToReorderPoint);
  const unitsAboveReorderPoint = Math.max(0, -distanceToReorderPoint);
  const periodsUntilReorderPoint = unitsAboveReorderPoint / input.averageDemand;
  const safetyBufferPeriods = rawSafetyStock / input.averageDemand;
  const totalCoveragePeriods = rawReorderPoint / input.averageDemand;
  const safetyStockSharePercent = rawReorderPoint > 0 ? rawSafetyStock / rawReorderPoint * 100 : 0;
  const demandVariabilityPercent = input.method === "service-level"
    ? input.demandStdDev / input.averageDemand * 100
    : null;
  const leadTimeVariabilityPercent = input.method === "service-level"
    ? input.leadTimeStdDev / input.averageLeadTime * 100
    : null;
  const nominalStockoutRiskPercent = input.method === "service-level"
    ? 100 - input.serviceLevelPercent
    : null;

  const values = [
    leadTimeDemand,
    ...(leadTimeDemandStdDev === null ? [] : [leadTimeDemandStdDev]),
    ...(zScore === null ? [] : [zScore]),
    rawSafetyStock,
    recommendedSafetyStock,
    rawReorderPoint,
    recommendedReorderPoint,
    inventoryPosition,
    unitsBelowReorderPoint,
    unitsAboveReorderPoint,
    periodsUntilReorderPoint,
    safetyBufferPeriods,
    totalCoveragePeriods,
    safetyStockSharePercent,
    ...(demandVariabilityPercent === null ? [] : [demandVariabilityPercent]),
    ...(leadTimeVariabilityPercent === null ? [] : [leadTimeVariabilityPercent]),
    ...(nominalStockoutRiskPercent === null ? [] : [nominalStockoutRiskPercent]),
  ];
  values.forEach(assertResult);

  return {
    leadTimeDemand,
    leadTimeDemandStdDev,
    zScore,
    rawSafetyStock,
    recommendedSafetyStock,
    rawReorderPoint,
    recommendedReorderPoint,
    inventoryPosition,
    reorderNow: inventoryPosition <= recommendedReorderPoint,
    unitsBelowReorderPoint,
    unitsAboveReorderPoint,
    periodsUntilReorderPoint,
    safetyBufferPeriods,
    totalCoveragePeriods,
    safetyStockSharePercent,
    demandVariabilityPercent,
    leadTimeVariabilityPercent,
    nominalStockoutRiskPercent,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "คำนวณไม่ได้" : value.toFixed(2);
}

export function safetyStockCsv(input: SafetyStockInput, result: SafetyStockResult) {
  const methodLabels: Record<SafetyStockMethod, string> = {
    "service-level": "Service level และความผันผวน",
    "days-cover": "Days of cover",
    manual: "กำหนด Safety Stock เอง",
  };
  const periodLabels: Record<InventoryPeriodUnit, string> = { day: "วัน", week: "สัปดาห์", month: "เดือน" };
  const period = periodLabels[input.periodUnit];
  const rows: Array<Array<string | number>> = [
    ["การตั้งค่า", "ค่า", "หน่วย"],
    ["วิธีคำนวณ", methodLabels[input.method], ""],
    ["Demand เฉลี่ย", csvNumber(input.averageDemand), `หน่วย/${period}`],
    ["Demand standard deviation", csvNumber(input.demandStdDev), `หน่วย/${period}`],
    ["Lead time เฉลี่ย", csvNumber(input.averageLeadTime), period],
    ["Lead-time standard deviation", csvNumber(input.leadTimeStdDev), period],
    ["Target service level", csvNumber(input.serviceLevelPercent), "%"],
    ["ช่วงเวลาสำรอง", csvNumber(input.safetyCoverPeriods), period],
    ["Safety Stock ที่กำหนดเอง", csvNumber(input.manualSafetyStock), "หน่วย"],
    ["ปัดขึ้นเป็นหลายเท่าของ", csvNumber(input.roundingMultiple), "หน่วย"],
    ["ของคงเหลือ", csvNumber(input.onHand), "หน่วย"],
    ["ของที่สั่งแล้ว", csvNumber(input.onOrder), "หน่วย"],
    ["Backorder", csvNumber(input.backorders), "หน่วย"],
    [],
    ["ผลลัพธ์", "ค่า", "หน่วย"],
    ["Demand ระหว่าง Lead time", csvNumber(result.leadTimeDemand), "หน่วย"],
    ["ส่วนเบี่ยงเบน Demand ระหว่าง Lead time", csvNumber(result.leadTimeDemandStdDev), "หน่วย"],
    ["z-score", csvNumber(result.zScore), ""],
    ["Safety Stock ก่อนปัด", csvNumber(result.rawSafetyStock), "หน่วย"],
    ["Safety Stock แนะนำ", csvNumber(result.recommendedSafetyStock), "หน่วย"],
    ["Reorder Point ก่อนปัด", csvNumber(result.rawReorderPoint), "หน่วย"],
    ["Reorder Point แนะนำ", csvNumber(result.recommendedReorderPoint), "หน่วย"],
    ["Inventory position", csvNumber(result.inventoryPosition), "หน่วย"],
    ["สถานะสั่งซื้อ", result.reorderNow ? "ถึงจุดสั่งซื้อ" : "ยังเหนือจุดสั่งซื้อ", ""],
    ["จำนวนที่ต่ำกว่าจุดสั่งซื้อ", csvNumber(result.unitsBelowReorderPoint), "หน่วย"],
    ["จำนวนที่เหนือจุดสั่งซื้อ", csvNumber(result.unitsAboveReorderPoint), "หน่วย"],
    ["เวลาโดยประมาณก่อนถึงจุดสั่งซื้อ", csvNumber(result.periodsUntilReorderPoint), period],
    ["Safety buffer", csvNumber(result.safetyBufferPeriods), period],
    ["Coverage รวมที่ Reorder Point", csvNumber(result.totalCoveragePeriods), period],
    ["สัดส่วน Safety Stock ใน Reorder Point", csvNumber(result.safetyStockSharePercent), "%"],
    ["Nominal stockout risk", csvNumber(result.nominalStockoutRiskPercent), "%"],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
