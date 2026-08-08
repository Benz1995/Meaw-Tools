export const INVENTORY_TURNOVER_MAX_MONEY = 1_000_000_000_000_000;
export const INVENTORY_TURNOVER_MAX_DAYS = 3_660;
export const INVENTORY_TURNOVER_MAX_SNAPSHOTS = 3_660;
export const INVENTORY_TURNOVER_MAX_TARGET = 100_000;
export const INVENTORY_TURNOVER_MAX_RESULT = 1_000_000_000_000_000_000;

export type InventoryAverageMethod = "opening-closing" | "direct" | "snapshots";
export type InventoryTurnoverCurrency = "THB" | "USD" | "OTHER";
export type InventoryTargetStatus = "no-target" | "near-target" | "above-target-inventory" | "below-target-inventory";

export type InventoryTurnoverInput = {
  averageMethod: InventoryAverageMethod;
  currency: InventoryTurnoverCurrency;
  periodDays: number;
  costOfGoodsSold: number;
  openingInventory: number;
  closingInventory: number;
  directAverageInventory: number;
  inventorySnapshots: number[];
  targetAnnualTurnover: number;
};

export type InventoryTurnoverResult = {
  averageInventory: number;
  snapshotCount: number;
  turnoverForPeriod: number;
  annualizedTurnover: number;
  inventoryDays: number;
  weeksOnHand: number;
  monthsOnHand: number;
  costOfGoodsSoldPerDay: number;
  annualizedCostOfGoodsSold: number;
  closingInventoryDays: number | null;
  targetAverageInventory: number | null;
  averageInventoryGapToTarget: number | null;
  averageInventoryGapPercent: number | null;
  targetStatus: InventoryTargetStatus;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > INVENTORY_TURNOVER_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

export function calculateInventoryTurnover(input: InventoryTurnoverInput): InventoryTurnoverResult {
  if (input.averageMethod !== "opening-closing" && input.averageMethod !== "direct" && input.averageMethod !== "snapshots") {
    throw new Error("วิธีหา Average inventory ไม่ถูกต้อง");
  }
  if (input.currency !== "THB" && input.currency !== "USD" && input.currency !== "OTHER") {
    throw new Error("หน่วยเงินไม่ถูกต้อง");
  }

  assertRange(input.periodDays, "จำนวนวันในรอบ", 1, INVENTORY_TURNOVER_MAX_DAYS);
  assertRange(input.costOfGoodsSold, "ต้นทุนขาย (COGS)", 0.01, INVENTORY_TURNOVER_MAX_MONEY);
  assertRange(input.targetAnnualTurnover, "เป้าหมาย Turnover ต่อปี", 0, INVENTORY_TURNOVER_MAX_TARGET);

  let averageInventory: number;
  let snapshotCount: number;

  if (input.averageMethod === "opening-closing") {
    assertRange(input.openingInventory, "Inventory ต้นรอบ", 0, INVENTORY_TURNOVER_MAX_MONEY);
    assertRange(input.closingInventory, "Inventory ปลายรอบ", 0, INVENTORY_TURNOVER_MAX_MONEY);
    averageInventory = (input.openingInventory + input.closingInventory) / 2;
    snapshotCount = 2;
  } else if (input.averageMethod === "direct") {
    assertRange(input.directAverageInventory, "Average inventory", 0.01, INVENTORY_TURNOVER_MAX_MONEY);
    averageInventory = input.directAverageInventory;
    snapshotCount = 1;
  } else {
    if (input.inventorySnapshots.length < 2 || input.inventorySnapshots.length > INVENTORY_TURNOVER_MAX_SNAPSHOTS) {
      throw new Error(`ยอด Inventory snapshots ต้องมี 2–${INVENTORY_TURNOVER_MAX_SNAPSHOTS.toLocaleString("th-TH")} ค่า`);
    }
    input.inventorySnapshots.forEach((value, index) => {
      assertRange(value, `Inventory snapshot ลำดับ ${index + 1}`, 0, INVENTORY_TURNOVER_MAX_MONEY);
    });
    averageInventory = input.inventorySnapshots.reduce(
      (mean, value, index) => mean + (value - mean) / (index + 1),
      0,
    );
    snapshotCount = input.inventorySnapshots.length;
  }

  if (averageInventory <= 0) {
    throw new Error("Average inventory ต้องมากกว่า 0 เพื่อคำนวณ Turnover");
  }

  const turnoverForPeriod = input.costOfGoodsSold / averageInventory;
  const inventoryDays = input.periodDays / turnoverForPeriod;
  const annualizationFactor = 365 / input.periodDays;
  const annualizedTurnover = turnoverForPeriod * annualizationFactor;
  const annualizedCostOfGoodsSold = input.costOfGoodsSold * annualizationFactor;
  const costOfGoodsSoldPerDay = input.costOfGoodsSold / input.periodDays;
  const weeksOnHand = inventoryDays / 7;
  const monthsOnHand = inventoryDays / (365 / 12);
  const closingInventoryDays = input.averageMethod === "opening-closing"
    ? input.closingInventory / costOfGoodsSoldPerDay
    : null;

  let targetAverageInventory: number | null = null;
  let averageInventoryGapToTarget: number | null = null;
  let averageInventoryGapPercent: number | null = null;
  let targetStatus: InventoryTargetStatus = "no-target";

  if (input.targetAnnualTurnover > 0) {
    targetAverageInventory = annualizedCostOfGoodsSold / input.targetAnnualTurnover;
    averageInventoryGapToTarget = averageInventory - targetAverageInventory;
    averageInventoryGapPercent = averageInventoryGapToTarget / targetAverageInventory * 100;
    if (Math.abs(averageInventoryGapPercent) <= 0.5) {
      targetStatus = "near-target";
    } else if (averageInventoryGapToTarget > 0) {
      targetStatus = "above-target-inventory";
    } else {
      targetStatus = "below-target-inventory";
    }
  }

  const values = [
    averageInventory,
    turnoverForPeriod,
    annualizedTurnover,
    inventoryDays,
    weeksOnHand,
    monthsOnHand,
    costOfGoodsSoldPerDay,
    annualizedCostOfGoodsSold,
    ...(closingInventoryDays === null ? [] : [closingInventoryDays]),
    ...(targetAverageInventory === null ? [] : [targetAverageInventory]),
    ...(averageInventoryGapToTarget === null ? [] : [averageInventoryGapToTarget]),
    ...(averageInventoryGapPercent === null ? [] : [averageInventoryGapPercent]),
  ];
  values.forEach(assertResult);

  return {
    averageInventory,
    snapshotCount,
    turnoverForPeriod,
    annualizedTurnover,
    inventoryDays,
    weeksOnHand,
    monthsOnHand,
    costOfGoodsSoldPerDay,
    annualizedCostOfGoodsSold,
    closingInventoryDays,
    targetAverageInventory,
    averageInventoryGapToTarget,
    averageInventoryGapPercent,
    targetStatus,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "คำนวณไม่ได้" : value.toFixed(2);
}

export function inventoryTurnoverCsv(input: InventoryTurnoverInput, result: InventoryTurnoverResult) {
  const methodLabels: Record<InventoryAverageMethod, string> = {
    "opening-closing": "Inventory ต้นรอบและปลายรอบ",
    direct: "กรอก Average inventory โดยตรง",
    snapshots: "เฉลี่ยจากหลาย Snapshot",
  };
  const statusLabels: Record<InventoryTargetStatus, string> = {
    "no-target": "ไม่ได้ตั้งเป้าหมาย",
    "near-target": "ใกล้ระดับ Inventory ตามเป้าหมาย",
    "above-target-inventory": "Average inventory สูงกว่าระดับตามเป้าหมาย",
    "below-target-inventory": "Average inventory ต่ำกว่าระดับตามเป้าหมาย",
  };
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["การตั้งค่า", "ค่า", "หน่วย"],
    ["วิธีหา Average inventory", methodLabels[input.averageMethod], ""],
    ["จำนวนวันในรอบ", csvNumber(input.periodDays), "วัน"],
    ["ต้นทุนขาย (COGS)", csvNumber(input.costOfGoodsSold), currency],
    ["Inventory ต้นรอบ", csvNumber(input.openingInventory), currency],
    ["Inventory ปลายรอบ", csvNumber(input.closingInventory), currency],
    ["Average inventory ที่กรอก", csvNumber(input.directAverageInventory), currency],
    ["Inventory snapshots", input.inventorySnapshots.map((value) => value.toFixed(2)).join("; "), currency],
    ["เป้าหมาย Turnover ต่อปี", csvNumber(input.targetAnnualTurnover), "รอบ/ปี"],
    [],
    ["ผลลัพธ์", "ค่า", "หน่วย"],
    ["Average inventory", csvNumber(result.averageInventory), currency],
    ["จำนวน Snapshot ที่ใช้", result.snapshotCount, "ค่า"],
    ["Inventory turnover ในรอบ", csvNumber(result.turnoverForPeriod), "รอบ"],
    ["Inventory turnover แบบ Annualized", csvNumber(result.annualizedTurnover), "รอบ/ปี"],
    ["Inventory days / DIO", csvNumber(result.inventoryDays), "วัน"],
    ["Weeks on hand", csvNumber(result.weeksOnHand), "สัปดาห์"],
    ["Months on hand", csvNumber(result.monthsOnHand), "เดือน"],
    ["COGS เฉลี่ยต่อวัน", csvNumber(result.costOfGoodsSoldPerDay), `${currency}/วัน`],
    ["COGS แบบ Annualized", csvNumber(result.annualizedCostOfGoodsSold), `${currency}/ปี`],
    ["Coverage ของ Inventory ปลายรอบ", csvNumber(result.closingInventoryDays), "วัน"],
    ["Average inventory ตามเป้าหมาย", csvNumber(result.targetAverageInventory), currency],
    ["ส่วนต่าง Average inventory เทียบเป้า", csvNumber(result.averageInventoryGapToTarget), currency],
    ["ส่วนต่าง Average inventory เทียบเป้า", csvNumber(result.averageInventoryGapPercent), "%"],
    ["สถานะเทียบเป้าหมาย", statusLabels[result.targetStatus], ""],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
