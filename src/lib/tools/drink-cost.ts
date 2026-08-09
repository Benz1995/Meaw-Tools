export const DRINK_COST_MAX_INGREDIENTS = 30;
export const DRINK_COST_MAX_MONEY = 1_000_000_000_000;
export const DRINK_COST_MAX_VOLUME = 1_000_000_000_000;
export const DRINK_COST_MAX_RESULT = 1_000_000_000_000_000;
export const US_FL_OZ_IN_ML = 29.5735295625;
export const US_STANDARD_DRINK_PURE_ALCOHOL_ML = US_FL_OZ_IN_ML * 0.6;

export type DrinkCostCurrency = "THB" | "USD" | "OTHER";
export type DrinkVolumeUnit = "ml" | "l" | "cl" | "us-fl-oz";
export type DrinkCostStatus = "not-provided" | "at-or-below-target" | "above-target";

export type DrinkIngredientInput = {
  name: string;
  purchaseCost: number;
  containerVolume: number;
  containerUnit: DrinkVolumeUnit;
  pourVolume: number;
  pourUnit: DrinkVolumeUnit;
  usableYieldPercent: number;
  abvPercent: number;
};

export type DrinkCostInput = {
  currency: DrinkCostCurrency;
  sellingPricePerDrink: number;
  targetPourCostPercent: number;
  extraIngredientCostPerDrink: number;
  packagingCostPerDrink: number;
  laborCostPerDrink: number;
  otherDirectCostPerDrink: number;
  dilutionVolumeMl: number;
  ingredients: DrinkIngredientInput[];
};

export type DrinkIngredientResult = DrinkIngredientInput & {
  containerVolumeMl: number;
  pourVolumeMl: number;
  usableContainerVolumeMl: number;
  theoreticalDrinksPerContainer: number;
  costPerUsableMl: number;
  lineCost: number;
  pureAlcoholVolumeMl: number;
  shareOfLiquidCost: number;
};

export type DrinkCostResult = {
  ingredientResults: DrinkIngredientResult[];
  liquidCostPerDrink: number;
  beverageIngredientCostPerDrink: number;
  totalDirectCostPerDrink: number;
  suggestedPricePerDrink: number;
  currentPourCostPercent: number | null;
  directCostPercent: number | null;
  contributionPerDrink: number | null;
  contributionMarginPercent: number | null;
  priceGapFromTarget: number | null;
  pourCostStatus: DrinkCostStatus;
  liquidShareOfDirectCost: number;
  extraIngredientShareOfDirectCost: number;
  packagingShareOfDirectCost: number;
  laborShareOfDirectCost: number;
  otherDirectShareOfDirectCost: number;
  enteredLiquidVolumeMl: number;
  servedVolumeMl: number;
  pureAlcoholVolumeMl: number;
  estimatedAbvPercent: number;
  usStandardDrinkEquivalent: number;
};

const UNIT_FACTORS: Record<DrinkVolumeUnit, number> = {
  ml: 1,
  l: 1_000,
  cl: 10,
  "us-fl-oz": US_FL_OZ_IN_ML,
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > DRINK_COST_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจราคา ปริมาตร Yield และหน่วยอีกครั้ง");
  }
}

function volumeToMl(value: number, unit: DrinkVolumeUnit, label: string) {
  const factor = UNIT_FACTORS[unit];
  if (!factor) throw new Error(`${label}ไม่ถูกต้อง`);
  return value * factor;
}

export function calculateDrinkCost(input: DrinkCostInput): DrinkCostResult {
  if (input.currency !== "THB" && input.currency !== "USD" && input.currency !== "OTHER") {
    throw new Error("หน่วยเงินไม่ถูกต้อง");
  }

  assertRange(input.sellingPricePerDrink, "ราคาขายต่อแก้ว", 0, DRINK_COST_MAX_MONEY);
  assertRange(input.targetPourCostPercent, "เป้าหมาย Pour cost", 0.1, 100);
  assertRange(input.extraIngredientCostPerDrink, "วัตถุดิบเสริมต่อแก้ว", 0, DRINK_COST_MAX_MONEY);
  assertRange(input.packagingCostPerDrink, "บรรจุภัณฑ์ต่อแก้ว", 0, DRINK_COST_MAX_MONEY);
  assertRange(input.laborCostPerDrink, "ค่าแรงตรงต่อแก้ว", 0, DRINK_COST_MAX_MONEY);
  assertRange(input.otherDirectCostPerDrink, "ต้นทุนตรงอื่นต่อแก้ว", 0, DRINK_COST_MAX_MONEY);
  assertRange(input.dilutionVolumeMl, "น้ำหรือ Dilution ต่อแก้ว", 0, DRINK_COST_MAX_VOLUME);

  if (input.ingredients.length < 1 || input.ingredients.length > DRINK_COST_MAX_INGREDIENTS) {
    throw new Error(`จำนวนของเหลวต้องอยู่ระหว่าง 1–${DRINK_COST_MAX_INGREDIENTS} รายการ`);
  }

  const ingredientResults = input.ingredients.map((ingredient, index): DrinkIngredientResult => {
    const rowLabel = `ของเหลวรายการที่ ${index + 1}`;
    const name = ingredient.name.trim();
    if (!name || name.length > 80) throw new Error(`${rowLabel}ต้องมีชื่อ 1–80 ตัวอักษร`);
    assertRange(ingredient.purchaseCost, `${rowLabel}: ราคาซื้อ`, 0, DRINK_COST_MAX_MONEY);
    assertRange(ingredient.containerVolume, `${rowLabel}: ปริมาตรขวด/ภาชนะ`, Number.MIN_VALUE, DRINK_COST_MAX_VOLUME);
    assertRange(ingredient.pourVolume, `${rowLabel}: ปริมาณริน`, Number.MIN_VALUE, DRINK_COST_MAX_VOLUME);
    assertRange(ingredient.usableYieldPercent, `${rowLabel}: Yield`, 0.1, 100);
    assertRange(ingredient.abvPercent, `${rowLabel}: ABV`, 0, 100);

    const containerVolumeMl = volumeToMl(ingredient.containerVolume, ingredient.containerUnit, `${rowLabel}: หน่วยขวด/ภาชนะ`);
    const pourVolumeMl = volumeToMl(ingredient.pourVolume, ingredient.pourUnit, `${rowLabel}: หน่วยที่ริน`);
    const usableContainerVolumeMl = containerVolumeMl * ingredient.usableYieldPercent / 100;
    const theoreticalDrinksPerContainer = usableContainerVolumeMl / pourVolumeMl;
    const costPerUsableMl = ingredient.purchaseCost / usableContainerVolumeMl;
    const lineCost = pourVolumeMl * costPerUsableMl;
    const pureAlcoholVolumeMl = pourVolumeMl * ingredient.abvPercent / 100;

    [containerVolumeMl, pourVolumeMl, usableContainerVolumeMl, theoreticalDrinksPerContainer, costPerUsableMl, lineCost, pureAlcoholVolumeMl].forEach(assertResult);

    return {
      ...ingredient,
      name,
      containerVolumeMl,
      pourVolumeMl,
      usableContainerVolumeMl,
      theoreticalDrinksPerContainer,
      costPerUsableMl,
      lineCost,
      pureAlcoholVolumeMl,
      shareOfLiquidCost: 0,
    };
  });

  const liquidCostPerDrink = ingredientResults.reduce((sum, ingredient) => sum + ingredient.lineCost, 0);
  const beverageIngredientCostPerDrink = liquidCostPerDrink + input.extraIngredientCostPerDrink;
  if (beverageIngredientCostPerDrink <= 0) {
    throw new Error("ต้นทุนวัตถุดิบเครื่องดื่มรวมต้องมากกว่า 0 กรุณาตรวจราคาซื้อและวัตถุดิบเสริม");
  }

  ingredientResults.forEach((ingredient) => {
    ingredient.shareOfLiquidCost = liquidCostPerDrink > 0 ? ingredient.lineCost / liquidCostPerDrink * 100 : 0;
  });

  const totalDirectCostPerDrink = beverageIngredientCostPerDrink
    + input.packagingCostPerDrink
    + input.laborCostPerDrink
    + input.otherDirectCostPerDrink;
  const suggestedPricePerDrink = beverageIngredientCostPerDrink / (input.targetPourCostPercent / 100);
  const liquidShareOfDirectCost = liquidCostPerDrink / totalDirectCostPerDrink * 100;
  const extraIngredientShareOfDirectCost = input.extraIngredientCostPerDrink / totalDirectCostPerDrink * 100;
  const packagingShareOfDirectCost = input.packagingCostPerDrink / totalDirectCostPerDrink * 100;
  const laborShareOfDirectCost = input.laborCostPerDrink / totalDirectCostPerDrink * 100;
  const otherDirectShareOfDirectCost = input.otherDirectCostPerDrink / totalDirectCostPerDrink * 100;
  const enteredLiquidVolumeMl = ingredientResults.reduce((sum, ingredient) => sum + ingredient.pourVolumeMl, 0);
  const servedVolumeMl = enteredLiquidVolumeMl + input.dilutionVolumeMl;
  const pureAlcoholVolumeMl = ingredientResults.reduce((sum, ingredient) => sum + ingredient.pureAlcoholVolumeMl, 0);
  const estimatedAbvPercent = servedVolumeMl > 0 ? pureAlcoholVolumeMl / servedVolumeMl * 100 : 0;
  const usStandardDrinkEquivalent = pureAlcoholVolumeMl / US_STANDARD_DRINK_PURE_ALCOHOL_ML;

  let currentPourCostPercent: number | null = null;
  let directCostPercent: number | null = null;
  let contributionPerDrink: number | null = null;
  let contributionMarginPercent: number | null = null;
  let priceGapFromTarget: number | null = null;
  let pourCostStatus: DrinkCostStatus = "not-provided";

  if (input.sellingPricePerDrink > 0) {
    currentPourCostPercent = beverageIngredientCostPerDrink / input.sellingPricePerDrink * 100;
    directCostPercent = totalDirectCostPerDrink / input.sellingPricePerDrink * 100;
    contributionPerDrink = input.sellingPricePerDrink - totalDirectCostPerDrink;
    contributionMarginPercent = contributionPerDrink / input.sellingPricePerDrink * 100;
    priceGapFromTarget = input.sellingPricePerDrink - suggestedPricePerDrink;
    pourCostStatus = currentPourCostPercent <= input.targetPourCostPercent + 0.005
      ? "at-or-below-target"
      : "above-target";
  }

  [
    liquidCostPerDrink,
    beverageIngredientCostPerDrink,
    totalDirectCostPerDrink,
    suggestedPricePerDrink,
    liquidShareOfDirectCost,
    extraIngredientShareOfDirectCost,
    packagingShareOfDirectCost,
    laborShareOfDirectCost,
    otherDirectShareOfDirectCost,
    enteredLiquidVolumeMl,
    servedVolumeMl,
    pureAlcoholVolumeMl,
    estimatedAbvPercent,
    usStandardDrinkEquivalent,
    ...(currentPourCostPercent === null ? [] : [currentPourCostPercent]),
    ...(directCostPercent === null ? [] : [directCostPercent]),
    ...(contributionPerDrink === null ? [] : [contributionPerDrink]),
    ...(contributionMarginPercent === null ? [] : [contributionMarginPercent]),
    ...(priceGapFromTarget === null ? [] : [priceGapFromTarget]),
  ].forEach(assertResult);

  return {
    ingredientResults,
    liquidCostPerDrink,
    beverageIngredientCostPerDrink,
    totalDirectCostPerDrink,
    suggestedPricePerDrink,
    currentPourCostPercent,
    directCostPercent,
    contributionPerDrink,
    contributionMarginPercent,
    priceGapFromTarget,
    pourCostStatus,
    liquidShareOfDirectCost,
    extraIngredientShareOfDirectCost,
    packagingShareOfDirectCost,
    laborShareOfDirectCost,
    otherDirectShareOfDirectCost,
    enteredLiquidVolumeMl,
    servedVolumeMl,
    pureAlcoholVolumeMl,
    estimatedAbvPercent,
    usStandardDrinkEquivalent,
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

export function drinkCostCsv(input: DrinkCostInput, result: DrinkCostResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["ของเหลว", "ราคาซื้อ", "ปริมาตรขวด/ภาชนะ", "หน่วยขวด", "ปริมาณริน", "หน่วยริน", "Yield %", "ABV %", "ปริมาตรริน ml", "จำนวนแก้วต่อขวดโดยประมาณ", "ต้นทุนต่อแก้ว", "% ต้นทุนของเหลว"],
    ...result.ingredientResults.map((ingredient) => [
      safeSpreadsheetText(ingredient.name),
      csvNumber(ingredient.purchaseCost),
      csvNumber(ingredient.containerVolume, 4),
      ingredient.containerUnit,
      csvNumber(ingredient.pourVolume, 4),
      ingredient.pourUnit,
      csvNumber(ingredient.usableYieldPercent),
      csvNumber(ingredient.abvPercent),
      csvNumber(ingredient.pourVolumeMl, 4),
      csvNumber(ingredient.theoreticalDrinksPerContainer, 4),
      csvNumber(ingredient.lineCost),
      csvNumber(ingredient.shareOfLiquidCost),
    ]),
    [],
    ["การตั้งค่า/ผลลัพธ์", "ค่า", "หน่วย"],
    ["ต้นทุนของเหลวต่อแก้ว", csvNumber(result.liquidCostPerDrink), `${currency}/แก้ว`],
    ["วัตถุดิบเสริมต่อแก้ว", csvNumber(input.extraIngredientCostPerDrink), `${currency}/แก้ว`],
    ["ต้นทุนวัตถุดิบเครื่องดื่มต่อแก้ว", csvNumber(result.beverageIngredientCostPerDrink), `${currency}/แก้ว`],
    ["บรรจุภัณฑ์ต่อแก้ว", csvNumber(input.packagingCostPerDrink), `${currency}/แก้ว`],
    ["ค่าแรงตรงต่อแก้ว", csvNumber(input.laborCostPerDrink), `${currency}/แก้ว`],
    ["ต้นทุนตรงอื่นต่อแก้ว", csvNumber(input.otherDirectCostPerDrink), `${currency}/แก้ว`],
    ["ต้นทุนตรงรวมต่อแก้ว", csvNumber(result.totalDirectCostPerDrink), `${currency}/แก้ว`],
    ["เป้าหมาย Pour cost", csvNumber(input.targetPourCostPercent), "%"],
    ["ราคาขายจากเป้าหมาย Pour cost", csvNumber(result.suggestedPricePerDrink), `${currency}/แก้ว`],
    ["ราคาขายปัจจุบัน", csvNumber(input.sellingPricePerDrink || null), `${currency}/แก้ว`],
    ["Pour cost ปัจจุบัน", csvNumber(result.currentPourCostPercent), "%"],
    ["Direct cost ปัจจุบัน", csvNumber(result.directCostPercent), "%"],
    ["Contribution ต่อแก้ว", csvNumber(result.contributionPerDrink), `${currency}/แก้ว`],
    ["ปริมาตรของเหลวที่กรอก", csvNumber(result.enteredLiquidVolumeMl, 4), "ml"],
    ["น้ำ/Dilution เพิ่ม", csvNumber(input.dilutionVolumeMl, 4), "ml"],
    ["ปริมาตรเสิร์ฟโดยประมาณ", csvNumber(result.servedVolumeMl, 4), "ml"],
    ["แอลกอฮอล์บริสุทธิ์โดยประมาณ", csvNumber(result.pureAlcoholVolumeMl, 4), "ml"],
    ["ABV หลัง Dilution โดยประมาณ", csvNumber(result.estimatedAbvPercent, 4), "%"],
    ["U.S. standard drink โดยประมาณ", csvNumber(result.usStandardDrinkEquivalent, 4), "standard drink"],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
