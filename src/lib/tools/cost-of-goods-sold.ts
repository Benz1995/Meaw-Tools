export const COGS_MAX_MONEY = 1_000_000_000_000_000;
export const COGS_MAX_UNITS = 1_000_000_000_000;
export const COGS_MAX_RESULT = 1_000_000_000_000_000_000;

export type CogsCalculationMode = "basic" | "detailed";
export type CogsCurrency = "THB" | "USD" | "OTHER";
export type CogsSalesStatus = "not-provided" | "gross-profit" | "break-even" | "gross-loss";

export type CostOfGoodsSoldInput = {
  mode: CogsCalculationMode;
  currency: CogsCurrency;
  beginningInventory: number;
  grossPurchases: number;
  purchaseReturns: number;
  purchaseDiscounts: number;
  freightIn: number;
  directLabor: number;
  materialsAndSupplies: number;
  otherDirectCosts: number;
  endingInventory: number;
  netSales: number;
  unitsSold: number;
};

export type CostOfGoodsSoldResult = {
  netPurchases: number;
  purchaseAdjustments: number;
  productionCosts: number;
  additionsToInventory: number;
  goodsAvailableForSale: number;
  costOfGoodsSold: number;
  inventoryChange: number;
  cogsShareOfGoodsAvailable: number;
  endingInventoryShare: number;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  cogsPercentOfSales: number | null;
  markupOnCogsPercent: number | null;
  costPerUnitSold: number | null;
  salesStatus: CogsSalesStatus;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > COGS_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

export function calculateCostOfGoodsSold(input: CostOfGoodsSoldInput): CostOfGoodsSoldResult {
  if (input.mode !== "basic" && input.mode !== "detailed") {
    throw new Error("โหมดคำนวณ COGS ไม่ถูกต้อง");
  }
  if (input.currency !== "THB" && input.currency !== "USD" && input.currency !== "OTHER") {
    throw new Error("หน่วยเงินไม่ถูกต้อง");
  }

  const moneyFields: Array<[number, string]> = [
    [input.beginningInventory, "สินค้าคงเหลือต้นงวด"],
    [input.grossPurchases, "ยอดซื้อสินค้าและวัตถุดิบ"],
    [input.purchaseReturns, "ส่งคืนสินค้าและส่วนลดรับจากการคืน"],
    [input.purchaseDiscounts, "ส่วนลดรับจากการซื้อ"],
    [input.freightIn, "ค่าขนส่งเข้าและต้นทุนจัดหา"],
    [input.directLabor, "ค่าแรงผลิตโดยตรง"],
    [input.materialsAndSupplies, "วัสดุและของใช้ในการผลิต"],
    [input.otherDirectCosts, "ต้นทุนผลิตโดยตรงอื่น"],
    [input.endingInventory, "สินค้าคงเหลือปลายงวด"],
    [input.netSales, "ยอดขายสุทธิ"],
  ];
  moneyFields.forEach(([value, label]) => assertRange(value, label, 0, COGS_MAX_MONEY));
  assertRange(input.unitsSold, "จำนวนหน่วยที่ขาย", 0, COGS_MAX_UNITS);

  if (input.mode === "basic") {
    const detailedValues = [
      input.purchaseReturns,
      input.purchaseDiscounts,
      input.freightIn,
      input.directLabor,
      input.materialsAndSupplies,
      input.otherDirectCosts,
    ];
    if (detailedValues.some((value) => value !== 0)) {
      throw new Error("โหมดพื้นฐานต้องไม่ส่งค่าปรับปรุงหรือต้นทุนผลิตแบบละเอียด");
    }
  }

  const purchaseAdjustments = input.mode === "detailed"
    ? input.purchaseReturns + input.purchaseDiscounts
    : 0;
  const freightIn = input.mode === "detailed" ? input.freightIn : 0;
  const productionCosts = input.mode === "detailed"
    ? input.directLabor + input.materialsAndSupplies + input.otherDirectCosts
    : 0;
  const netPurchases = input.grossPurchases - purchaseAdjustments + freightIn;

  if (netPurchases < 0) {
    throw new Error("ยอดส่งคืนและส่วนลดรับรวมกันสูงกว่ายอดซื้อกับค่าขนส่งเข้า กรุณาตรวจช่วงเวลาและ Cutoff");
  }

  const additionsToInventory = netPurchases + productionCosts;
  const goodsAvailableForSale = input.beginningInventory + additionsToInventory;
  if (goodsAvailableForSale <= 0) {
    throw new Error("ต้นทุนสินค้าที่มีไว้ขายต้องมากกว่า 0 กรุณากรอกสินค้าต้นงวด ยอดซื้อ หรือต้นทุนผลิต");
  }
  if (input.endingInventory > goodsAvailableForSale) {
    throw new Error("สินค้าคงเหลือปลายงวดสูงกว่าต้นทุนสินค้าที่มีไว้ขาย กรุณาตรวจ Cutoff การซื้อ การผลิต และการตีราคา");
  }

  const costOfGoodsSold = goodsAvailableForSale - input.endingInventory;
  const inventoryChange = input.endingInventory - input.beginningInventory;
  const cogsShareOfGoodsAvailable = costOfGoodsSold / goodsAvailableForSale * 100;
  const endingInventoryShare = input.endingInventory / goodsAvailableForSale * 100;

  let grossProfit: number | null = null;
  let grossMarginPercent: number | null = null;
  let cogsPercentOfSales: number | null = null;
  let markupOnCogsPercent: number | null = null;
  let salesStatus: CogsSalesStatus = "not-provided";

  if (input.netSales > 0) {
    grossProfit = input.netSales - costOfGoodsSold;
    grossMarginPercent = grossProfit / input.netSales * 100;
    cogsPercentOfSales = costOfGoodsSold / input.netSales * 100;
    markupOnCogsPercent = costOfGoodsSold > 0 ? grossProfit / costOfGoodsSold * 100 : null;
    if (Math.abs(grossProfit) <= 0.005) salesStatus = "break-even";
    else salesStatus = grossProfit > 0 ? "gross-profit" : "gross-loss";
  }

  const costPerUnitSold = input.unitsSold > 0 ? costOfGoodsSold / input.unitsSold : null;
  const numericResults = [
    netPurchases,
    purchaseAdjustments,
    productionCosts,
    additionsToInventory,
    goodsAvailableForSale,
    costOfGoodsSold,
    inventoryChange,
    cogsShareOfGoodsAvailable,
    endingInventoryShare,
    ...(grossProfit === null ? [] : [grossProfit]),
    ...(grossMarginPercent === null ? [] : [grossMarginPercent]),
    ...(cogsPercentOfSales === null ? [] : [cogsPercentOfSales]),
    ...(markupOnCogsPercent === null ? [] : [markupOnCogsPercent]),
    ...(costPerUnitSold === null ? [] : [costPerUnitSold]),
  ];
  numericResults.forEach(assertResult);

  return {
    netPurchases,
    purchaseAdjustments,
    productionCosts,
    additionsToInventory,
    goodsAvailableForSale,
    costOfGoodsSold,
    inventoryChange,
    cogsShareOfGoodsAvailable,
    endingInventoryShare,
    grossProfit,
    grossMarginPercent,
    cogsPercentOfSales,
    markupOnCogsPercent,
    costPerUnitSold,
    salesStatus,
  };
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "ไม่ได้กรอก/คำนวณไม่ได้" : value.toFixed(2);
}

export function costOfGoodsSoldCsv(input: CostOfGoodsSoldInput, result: CostOfGoodsSoldResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const modeLabel = input.mode === "basic" ? "สูตรพื้นฐาน" : "สูตรละเอียด";
  const statusLabels: Record<CogsSalesStatus, string> = {
    "not-provided": "ไม่ได้กรอกยอดขายสุทธิ",
    "gross-profit": "กำไรขั้นต้น",
    "break-even": "เท่าทุนขั้นต้น",
    "gross-loss": "ขาดทุนขั้นต้น",
  };
  const rows: Array<Array<string | number>> = [
    ["การตั้งค่า", "ค่า", "หน่วย"],
    ["โหมดคำนวณ", modeLabel, ""],
    ["สินค้าคงเหลือต้นงวด", csvNumber(input.beginningInventory), currency],
    ["ยอดซื้อสินค้าและวัตถุดิบ", csvNumber(input.grossPurchases), currency],
    ["ส่งคืนสินค้าและส่วนลดรับจากการคืน", csvNumber(input.purchaseReturns), currency],
    ["ส่วนลดรับจากการซื้อ", csvNumber(input.purchaseDiscounts), currency],
    ["ค่าขนส่งเข้าและต้นทุนจัดหา", csvNumber(input.freightIn), currency],
    ["ค่าแรงผลิตโดยตรง", csvNumber(input.directLabor), currency],
    ["วัสดุและของใช้ในการผลิต", csvNumber(input.materialsAndSupplies), currency],
    ["ต้นทุนผลิตโดยตรงอื่น", csvNumber(input.otherDirectCosts), currency],
    ["สินค้าคงเหลือปลายงวด", csvNumber(input.endingInventory), currency],
    ["ยอดขายสุทธิ", csvNumber(input.netSales), currency],
    ["จำนวนหน่วยที่ขาย", csvNumber(input.unitsSold), "หน่วย"],
    [],
    ["ผลลัพธ์", "ค่า", "หน่วย"],
    ["รายการปรับลดยอดซื้อ", csvNumber(result.purchaseAdjustments), currency],
    ["ยอดซื้อสุทธิ", csvNumber(result.netPurchases), currency],
    ["ต้นทุนผลิตเพิ่มเติม", csvNumber(result.productionCosts), currency],
    ["ต้นทุนที่เพิ่มเข้าระหว่างงวด", csvNumber(result.additionsToInventory), currency],
    ["ต้นทุนสินค้าที่มีไว้ขาย", csvNumber(result.goodsAvailableForSale), currency],
    ["ต้นทุนขาย COGS", csvNumber(result.costOfGoodsSold), currency],
    ["การเปลี่ยนแปลงสินค้าคงเหลือ", csvNumber(result.inventoryChange), currency],
    ["COGS ต่อสินค้าที่มีไว้ขาย", csvNumber(result.cogsShareOfGoodsAvailable), "%"],
    ["สินค้าปลายงวดต่อสินค้าที่มีไว้ขาย", csvNumber(result.endingInventoryShare), "%"],
    ["กำไรขั้นต้น", csvNumber(result.grossProfit), currency],
    ["Gross margin", csvNumber(result.grossMarginPercent), "%"],
    ["COGS ต่อยอดขายสุทธิ", csvNumber(result.cogsPercentOfSales), "%"],
    ["Markup บน COGS", csvNumber(result.markupOnCogsPercent), "%"],
    ["COGS ต่อหน่วยที่ขาย", csvNumber(result.costPerUnitSold), `${currency}/หน่วย`],
    ["สถานะจากยอดขาย", statusLabels[result.salesStatus], ""],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
