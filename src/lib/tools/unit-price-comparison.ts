export type UnitPriceCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";

export type UnitPriceDimension = "mass" | "volume" | "count";

export type UnitPriceUnit =
  | "mg"
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "cl"
  | "dl"
  | "l"
  | "fl-oz-us"
  | "cup-us"
  | "pint-us"
  | "quart-us"
  | "gallon-us"
  | "item";

export type UnitPriceUnitDefinition = {
  value: UnitPriceUnit;
  dimension: UnitPriceDimension;
  label: string;
  shortLabel: string;
  baseFactor: number;
};

export type UnitPriceItemInput = {
  name: string;
  listedPrice: number;
  packageCount: number;
  amountPerPackage: number;
  unit: UnitPriceUnit;
  discountPercent: number;
  fixedDiscount: number;
  extraCost: number;
};

export type UnitPriceComparisonInput = {
  currency: UnitPriceCurrency;
  comparisonName: string;
  dimension: UnitPriceDimension;
  targetAmount: number;
  targetUnit: UnitPriceUnit;
  items: UnitPriceItemInput[];
};

export type UnitPriceComparisonRow = UnitPriceItemInput & {
  itemIndex: number;
  percentDiscountAmount: number;
  priceAfterPercentDiscount: number;
  effectiveCost: number;
  totalBaseQuantity: number;
  totalTargetUnits: number;
  pricePerTarget: number;
  differenceFromCheapest: number;
  moreExpensivePercent: number;
  valueIndex: number;
  rank: number;
  isCheapest: boolean;
};

export type UnitPriceComparisonResult = {
  targetBaseQuantity: number;
  targetLabel: string;
  rows: UnitPriceComparisonRow[];
  ranking: UnitPriceComparisonRow[];
  cheapestPricePerTarget: number;
  mostExpensivePricePerTarget: number;
  maximumSavingsPerTarget: number;
  cheapestItemIndices: number[];
};

export const UNIT_PRICE_MAX_ITEMS = 20;
export const UNIT_PRICE_MAX_MONEY = 1_000_000_000_000_000;
export const UNIT_PRICE_MAX_QUANTITY = 1_000_000_000_000;
export const UNIT_PRICE_MAX_PACKAGE_COUNT = 1_000_000;

const MAX_DERIVED_VALUE = 1_000_000_000_000_000_000_000_000;
const MIN_QUANTITY = 0.000001;
const SUPPORTED_CURRENCIES = new Set<UnitPriceCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);
const SUPPORTED_DIMENSIONS = new Set<UnitPriceDimension>(["mass", "volume", "count"]);

export const UNIT_PRICE_UNITS: readonly UnitPriceUnitDefinition[] = [
  { value: "mg", dimension: "mass", label: "มิลลิกรัม (mg)", shortLabel: "mg", baseFactor: 0.001 },
  { value: "g", dimension: "mass", label: "กรัม (g)", shortLabel: "g", baseFactor: 1 },
  { value: "kg", dimension: "mass", label: "กิโลกรัม (kg)", shortLabel: "kg", baseFactor: 1_000 },
  { value: "oz", dimension: "mass", label: "ออนซ์น้ำหนัก (oz)", shortLabel: "oz", baseFactor: 28.349_523_125 },
  { value: "lb", dimension: "mass", label: "ปอนด์ (lb)", shortLabel: "lb", baseFactor: 453.592_37 },
  { value: "ml", dimension: "volume", label: "มิลลิลิตร (mL)", shortLabel: "mL", baseFactor: 1 },
  { value: "cl", dimension: "volume", label: "เซนติลิตร (cL)", shortLabel: "cL", baseFactor: 10 },
  { value: "dl", dimension: "volume", label: "เดซิลิตร (dL)", shortLabel: "dL", baseFactor: 100 },
  { value: "l", dimension: "volume", label: "ลิตร (L)", shortLabel: "L", baseFactor: 1_000 },
  { value: "fl-oz-us", dimension: "volume", label: "ฟลูอิดออนซ์สหรัฐ (fl oz)", shortLabel: "fl oz", baseFactor: 29.573_53 },
  { value: "cup-us", dimension: "volume", label: "ถ้วยสหรัฐ (cup)", shortLabel: "cup", baseFactor: 236.588_24 },
  { value: "pint-us", dimension: "volume", label: "ไพนต์สหรัฐ (pt)", shortLabel: "pt", baseFactor: 473.176_5 },
  { value: "quart-us", dimension: "volume", label: "ควอร์ตสหรัฐ (qt)", shortLabel: "qt", baseFactor: 946.352_9 },
  { value: "gallon-us", dimension: "volume", label: "แกลลอนสหรัฐ (gal)", shortLabel: "gal", baseFactor: 3_785.411_784 },
  { value: "item", dimension: "count", label: "ชิ้น / หน่วย", shortLabel: "ชิ้น", baseFactor: 1 },
] as const;

const unitMap = new Map(UNIT_PRICE_UNITS.map((unit) => [unit.value, unit]));

export function getUnitPriceUnits(dimension: UnitPriceDimension) {
  return UNIT_PRICE_UNITS.filter((unit) => unit.dimension === dimension);
}

export function getUnitPriceUnit(unit: UnitPriceUnit) {
  const definition = unitMap.get(unit);
  if (!definition) throw new Error("ไม่พบหน่วยที่เลือก");
  return definition;
}

export function convertUnitPriceQuantity(value: number, fromUnit: UnitPriceUnit, toUnit: UnitPriceUnit) {
  const from = getUnitPriceUnit(fromUnit);
  const to = getUnitPriceUnit(toUnit);
  if (from.dimension !== to.dimension) throw new Error("แปลงข้ามประเภทน้ำหนัก ปริมาตร และจำนวนไม่ได้");
  if (!Number.isFinite(value)) throw new Error("ปริมาณต้องเป็นตัวเลขที่ถูกต้อง");
  return value * from.baseFactor / to.baseFactor;
}

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`);
  }
}

function assertDerived(values: number[]) {
  if (values.some((value) => !Number.isFinite(value) || Math.abs(value) > MAX_DERIVED_VALUE)) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาลดราคา จำนวนแพ็ก หรือปริมาณ");
  }
}

function nearlyEqual(left: number, right: number) {
  const tolerance = Math.max(1e-9, Math.max(Math.abs(left), Math.abs(right)) * 1e-9);
  return Math.abs(left - right) <= tolerance;
}

function validateInput(input: UnitPriceComparisonInput) {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  if (!SUPPORTED_DIMENSIONS.has(input.dimension)) throw new Error("ประเภทการเปรียบเทียบไม่รองรับ");
  if (!input.comparisonName.trim() || input.comparisonName.trim().length > 120) {
    throw new Error("ชื่อรายการเปรียบเทียบต้องมี 1–120 ตัวอักษร");
  }
  const targetDefinition = getUnitPriceUnit(input.targetUnit);
  if (targetDefinition.dimension !== input.dimension) throw new Error("หน่วยฐานเปรียบเทียบไม่ตรงกับประเภทที่เลือก");
  assertFiniteInRange(input.targetAmount, "ปริมาณฐานเปรียบเทียบ", MIN_QUANTITY, UNIT_PRICE_MAX_QUANTITY);
  if (input.dimension === "count" && !Number.isInteger(input.targetAmount)) throw new Error("ฐานจำนวนชิ้นต้องเป็นจำนวนเต็ม");
  if (!Array.isArray(input.items) || input.items.length < 2 || input.items.length > UNIT_PRICE_MAX_ITEMS) {
    throw new Error(`จำนวนสินค้าต้องอยู่ระหว่าง 2–${UNIT_PRICE_MAX_ITEMS} รายการ`);
  }

  input.items.forEach((item, index) => {
    const number = index + 1;
    if (!item.name.trim() || item.name.trim().length > 80) throw new Error(`ชื่อสินค้ารายการที่ ${number} ต้องมี 1–80 ตัวอักษร`);
    assertFiniteInRange(item.listedPrice, `ราคาหน้าป้ายรายการที่ ${number}`, 0.01, UNIT_PRICE_MAX_MONEY);
    assertFiniteInRange(item.packageCount, `จำนวนแพ็กรายการที่ ${number}`, 1, UNIT_PRICE_MAX_PACKAGE_COUNT);
    if (!Number.isInteger(item.packageCount)) throw new Error(`จำนวนแพ็กรายการที่ ${number} ต้องเป็นจำนวนเต็ม`);
    assertFiniteInRange(item.amountPerPackage, `ปริมาณต่อแพ็กรายการที่ ${number}`, MIN_QUANTITY, UNIT_PRICE_MAX_QUANTITY);
    if (input.dimension === "count" && !Number.isInteger(item.amountPerPackage)) throw new Error(`จำนวนชิ้นต่อแพ็กรายการที่ ${number} ต้องเป็นจำนวนเต็ม`);
    const itemDefinition = getUnitPriceUnit(item.unit);
    if (itemDefinition.dimension !== input.dimension) throw new Error(`หน่วยของรายการที่ ${number} ไม่ตรงกับประเภทที่เลือก`);
    assertFiniteInRange(item.discountPercent, `ส่วนลดเปอร์เซ็นต์รายการที่ ${number}`, 0, 100);
    assertFiniteInRange(item.fixedDiscount, `ส่วนลดคงที่รายการที่ ${number}`, 0, UNIT_PRICE_MAX_MONEY);
    assertFiniteInRange(item.extraCost, `ค่าใช้จ่ายเพิ่มรายการที่ ${number}`, 0, UNIT_PRICE_MAX_MONEY);
    const priceAfterPercent = item.listedPrice * (1 - item.discountPercent / 100);
    if (item.fixedDiscount > priceAfterPercent + 1e-9) {
      throw new Error(`ส่วนลดคงที่รายการที่ ${number} ห้ามเกินราคาหลังหักส่วนลดเปอร์เซ็นต์`);
    }
    if (priceAfterPercent - item.fixedDiscount + item.extraCost <= 0) {
      throw new Error(`ยอดจ่ายจริงรายการที่ ${number} ต้องมากกว่า 0`);
    }
  });
}

export function calculateUnitPriceComparison(input: UnitPriceComparisonInput): UnitPriceComparisonResult {
  validateInput(input);
  const targetDefinition = getUnitPriceUnit(input.targetUnit);
  const targetBaseQuantity = input.targetAmount * targetDefinition.baseFactor;
  assertDerived([targetBaseQuantity]);

  const basicRows = input.items.map((item, itemIndex) => {
    const definition = getUnitPriceUnit(item.unit);
    const percentDiscountAmount = item.listedPrice * item.discountPercent / 100;
    const priceAfterPercentDiscount = item.listedPrice - percentDiscountAmount;
    const effectiveCost = priceAfterPercentDiscount - item.fixedDiscount + item.extraCost;
    const totalBaseQuantity = item.packageCount * item.amountPerPackage * definition.baseFactor;
    const totalTargetUnits = totalBaseQuantity / targetBaseQuantity;
    const pricePerTarget = effectiveCost / totalTargetUnits;
    assertDerived([percentDiscountAmount, priceAfterPercentDiscount, effectiveCost, totalBaseQuantity, totalTargetUnits, pricePerTarget]);
    return {
      ...item,
      name: item.name.trim(),
      itemIndex,
      percentDiscountAmount,
      priceAfterPercentDiscount,
      effectiveCost,
      totalBaseQuantity,
      totalTargetUnits,
      pricePerTarget,
    };
  });

  const cheapestPricePerTarget = Math.min(...basicRows.map((row) => row.pricePerTarget));
  const mostExpensivePricePerTarget = Math.max(...basicRows.map((row) => row.pricePerTarget));
  const ordered = [...basicRows].sort((left, right) => left.pricePerTarget - right.pricePerTarget || left.itemIndex - right.itemIndex);
  let rank = 0;
  let previousPrice: number | null = null;
  const rankByIndex = new Map<number, number>();
  ordered.forEach((row, index) => {
    if (previousPrice === null || !nearlyEqual(row.pricePerTarget, previousPrice)) rank = index + 1;
    rankByIndex.set(row.itemIndex, rank);
    previousPrice = row.pricePerTarget;
  });

  const rows: UnitPriceComparisonRow[] = basicRows.map((row) => {
    const differenceFromCheapest = row.pricePerTarget - cheapestPricePerTarget;
    return {
      ...row,
      differenceFromCheapest: nearlyEqual(row.pricePerTarget, cheapestPricePerTarget) ? 0 : differenceFromCheapest,
      moreExpensivePercent: nearlyEqual(row.pricePerTarget, cheapestPricePerTarget) ? 0 : differenceFromCheapest / cheapestPricePerTarget * 100,
      valueIndex: row.pricePerTarget / cheapestPricePerTarget * 100,
      rank: rankByIndex.get(row.itemIndex) ?? row.itemIndex + 1,
      isCheapest: nearlyEqual(row.pricePerTarget, cheapestPricePerTarget),
    };
  });
  const ranking = [...rows].sort((left, right) => left.rank - right.rank || left.itemIndex - right.itemIndex);
  const cheapestItemIndices = rows.filter((row) => row.isCheapest).map((row) => row.itemIndex);

  return {
    targetBaseQuantity,
    targetLabel: `${input.targetAmount.toLocaleString("th-TH", { maximumFractionDigits: 6 })} ${targetDefinition.shortLabel}`,
    rows,
    ranking,
    cheapestPricePerTarget,
    mostExpensivePricePerTarget,
    maximumSavingsPerTarget: mostExpensivePricePerTarget - cheapestPricePerTarget,
    cheapestItemIndices,
  };
}

function csvCell(value: string | number, neutralizeFormula = false) {
  let text = String(value);
  if (neutralizeFormula && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function unitPriceComparisonCsv(input: UnitPriceComparisonInput, result: UnitPriceComparisonResult) {
  const lines = [
    ["Comparison", input.comparisonName],
    ["Currency", input.currency],
    ["Dimension", input.dimension],
    ["Comparison basis", result.targetLabel],
    [],
    [
      "Rank",
      "Product",
      "Listed price",
      "Discount (%)",
      "Fixed discount",
      "Extra cost",
      "Effective cost",
      "Package count",
      "Amount per package",
      "Unit",
      `Price per ${result.targetLabel}`,
      "Difference from cheapest",
      "More expensive (%)",
      "Best value",
    ],
    ...result.ranking.map((row) => [
      row.rank,
      row.name,
      row.listedPrice.toFixed(6),
      row.discountPercent.toFixed(6),
      row.fixedDiscount.toFixed(6),
      row.extraCost.toFixed(6),
      row.effectiveCost.toFixed(6),
      row.packageCount,
      row.amountPerPackage.toFixed(6),
      getUnitPriceUnit(row.unit).shortLabel,
      row.pricePerTarget.toFixed(6),
      row.differenceFromCheapest.toFixed(6),
      row.moreExpensivePercent.toFixed(6),
      row.isCheapest ? "yes" : "no",
    ]),
  ];

  return `\uFEFF${lines.map((line, lineIndex) => line.map((value, columnIndex) => csvCell(value, columnIndex === 1 && lineIndex !== 5)).join(",")).join("\r\n")}`;
}
