export const COFFEE_COST_MAX_EXTRAS = 20;
export const COFFEE_COST_MAX_MONEY = 1_000_000_000_000;
export const COFFEE_COST_MAX_QUANTITY = 1_000_000_000_000;
export const COFFEE_COST_MAX_CUPS_PER_DAY = 1_000_000;
export const COFFEE_COST_MAX_RESULT = 1_000_000_000_000_000;

export type CoffeeCostCurrency = "THB" | "USD" | "OTHER";
export type CoffeeMassUnit = "g" | "kg";
export type CoffeeVolumeUnit = "ml" | "l";
export type CoffeeExtraUnit = "g" | "kg" | "ml" | "l" | "piece";
export type CoffeeExtraDimension = "weight" | "volume" | "count";
export type CoffeeCostStatus = "not-provided" | "at-or-below-target" | "above-target";

export type CoffeeExtraInput = {
  name: string;
  purchaseCost: number;
  purchaseQuantity: number;
  purchaseUnit: CoffeeExtraUnit;
  usagePerCup: number;
  usageUnit: CoffeeExtraUnit;
  usableYieldPercent: number;
};

export type CoffeeCostInput = {
  currency: CoffeeCostCurrency;
  drinkName: string;
  sellingPricePerCup: number;
  targetIngredientCostPercent: number;
  cupsPerDay: number;
  operatingDaysPerMonth: number;
  paymentFeePercent: number;
  packagingCostPerCup: number;
  laborCostPerCup: number;
  otherDirectCostPerCup: number;
  beanPurchaseCost: number;
  beanBagWeight: number;
  beanBagUnit: CoffeeMassUnit;
  beanDoseG: number;
  beanUsableYieldPercent: number;
  includeMilk: boolean;
  milkPurchaseCost: number;
  milkContainerVolume: number;
  milkContainerUnit: CoffeeVolumeUnit;
  milkUsageMl: number;
  milkUsableYieldPercent: number;
  extras: CoffeeExtraInput[];
};

export type CoffeeExtraResult = CoffeeExtraInput & {
  dimension: CoffeeExtraDimension;
  baseUnit: "g" | "ml" | "piece";
  purchaseBaseQuantity: number;
  usageBaseQuantityPerCup: number;
  usableBaseQuantityPerPurchase: number;
  asPurchasedBaseQuantityPerCup: number;
  purchasePackEquivalentPerCup: number;
  costPerUsableBaseUnit: number;
  lineCostPerCup: number;
  shareOfExtraCost: number;
  monthlyPurchaseBaseQuantity: number;
  monthlyPurchasePacks: number;
};

export type CoffeeCostResult = {
  extraResults: CoffeeExtraResult[];
  beanBagWeightG: number;
  usableBeanWeightG: number;
  asPurchasedBeanGPerCup: number;
  cupsPerBeanBag: number;
  beanCostPerCup: number;
  milkContainerVolumeMl: number;
  usableMilkVolumeMl: number;
  asPurchasedMilkMlPerCup: number;
  cupsPerMilkContainer: number | null;
  milkCostPerCup: number;
  extraCostPerCup: number;
  ingredientCostPerCup: number;
  paymentFeePerCup: number;
  totalDirectCostPerCup: number;
  suggestedPricePerCup: number;
  ingredientCostPercent: number | null;
  directCostPercent: number | null;
  contributionPerCup: number | null;
  contributionMarginPercent: number | null;
  priceGapFromTarget: number | null;
  ingredientCostStatus: CoffeeCostStatus;
  beanShareOfDirectCost: number;
  milkShareOfDirectCost: number;
  extraShareOfDirectCost: number;
  packagingShareOfDirectCost: number;
  laborShareOfDirectCost: number;
  paymentFeeShareOfDirectCost: number;
  otherDirectShareOfDirectCost: number;
  monthlyCups: number;
  monthlyBeanPurchaseG: number;
  monthlyBeanBags: number;
  monthlyMilkPurchaseMl: number;
  monthlyMilkContainers: number;
  monthlyIngredientCost: number;
  monthlyDirectCost: number;
  monthlyRevenue: number | null;
  monthlyContribution: number | null;
};

const EXTRA_UNIT_DEFINITIONS: Record<CoffeeExtraUnit, { dimension: CoffeeExtraDimension; factor: number; baseUnit: "g" | "ml" | "piece" }> = {
  g: { dimension: "weight", factor: 1, baseUnit: "g" },
  kg: { dimension: "weight", factor: 1_000, baseUnit: "g" },
  ml: { dimension: "volume", factor: 1, baseUnit: "ml" },
  l: { dimension: "volume", factor: 1_000, baseUnit: "ml" },
  piece: { dimension: "count", factor: 1, baseUnit: "piece" },
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > COFFEE_COST_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจราคา ปริมาณ Yield และยอดขายอีกครั้ง");
  }
}

function resolveExtraUnit(unit: CoffeeExtraUnit, label: string) {
  const definition = EXTRA_UNIT_DEFINITIONS[unit];
  if (!definition) throw new Error(`${label}ไม่ถูกต้อง`);
  return definition;
}

export function calculateCoffeeCost(input: CoffeeCostInput): CoffeeCostResult {
  if (input.currency !== "THB" && input.currency !== "USD" && input.currency !== "OTHER") {
    throw new Error("หน่วยเงินไม่ถูกต้อง");
  }

  const drinkName = input.drinkName.trim();
  if (!drinkName || drinkName.length > 80) throw new Error("ชื่อเมนูต้องมี 1–80 ตัวอักษร");
  assertRange(input.sellingPricePerCup, "ราคาขายต่อแก้ว", 0, COFFEE_COST_MAX_MONEY);
  assertRange(input.targetIngredientCostPercent, "เป้าหมาย Ingredient cost", 0.1, 100);
  assertRange(input.cupsPerDay, "ยอดขายเฉลี่ยต่อวัน", 0, COFFEE_COST_MAX_CUPS_PER_DAY);
  if (!Number.isInteger(input.operatingDaysPerMonth)) throw new Error("จำนวนวันเปิดร้านต่อเดือนต้องเป็นจำนวนเต็ม");
  assertRange(input.operatingDaysPerMonth, "จำนวนวันเปิดร้านต่อเดือน", 1, 31);
  assertRange(input.paymentFeePercent, "ค่าธรรมเนียมตามยอดขาย", 0, 100);
  assertRange(input.packagingCostPerCup, "บรรจุภัณฑ์ต่อแก้ว", 0, COFFEE_COST_MAX_MONEY);
  assertRange(input.laborCostPerCup, "ค่าแรงตรงต่อแก้ว", 0, COFFEE_COST_MAX_MONEY);
  assertRange(input.otherDirectCostPerCup, "ต้นทุนตรงอื่นต่อแก้ว", 0, COFFEE_COST_MAX_MONEY);

  if (input.paymentFeePercent > 0 && input.sellingPricePerCup <= 0) {
    throw new Error("กรุณากรอกราคาขายต่อแก้วเมื่อมีค่าธรรมเนียมตามยอดขาย");
  }

  assertRange(input.beanPurchaseCost, "ราคาเมล็ดกาแฟต่อถุง", Number.MIN_VALUE, COFFEE_COST_MAX_MONEY);
  assertRange(input.beanBagWeight, "น้ำหนักเมล็ดต่อถุง", Number.MIN_VALUE, COFFEE_COST_MAX_QUANTITY);
  if (input.beanBagUnit !== "g" && input.beanBagUnit !== "kg") throw new Error("หน่วยน้ำหนักเมล็ดไม่ถูกต้อง");
  assertRange(input.beanDoseG, "Dose เมล็ดต่อแก้ว", Number.MIN_VALUE, COFFEE_COST_MAX_QUANTITY);
  assertRange(input.beanUsableYieldPercent, "Yield เมล็ดกาแฟ", 0.1, 100);

  const beanBagWeightG = input.beanBagWeight * (input.beanBagUnit === "kg" ? 1_000 : 1);
  const usableBeanWeightG = beanBagWeightG * input.beanUsableYieldPercent / 100;
  const asPurchasedBeanGPerCup = input.beanDoseG / (input.beanUsableYieldPercent / 100);
  const cupsPerBeanBag = usableBeanWeightG / input.beanDoseG;
  const beanCostPerCup = input.beanPurchaseCost * input.beanDoseG / usableBeanWeightG;

  let milkContainerVolumeMl = 0;
  let usableMilkVolumeMl = 0;
  let asPurchasedMilkMlPerCup = 0;
  let cupsPerMilkContainer: number | null = null;
  let milkCostPerCup = 0;

  if (input.includeMilk) {
    assertRange(input.milkPurchaseCost, "ราคานมต่อภาชนะ", 0, COFFEE_COST_MAX_MONEY);
    assertRange(input.milkContainerVolume, "ปริมาตรนมต่อภาชนะ", Number.MIN_VALUE, COFFEE_COST_MAX_QUANTITY);
    if (input.milkContainerUnit !== "ml" && input.milkContainerUnit !== "l") throw new Error("หน่วยปริมาตรนมไม่ถูกต้อง");
    assertRange(input.milkUsageMl, "ปริมาณนมต่อแก้ว", Number.MIN_VALUE, COFFEE_COST_MAX_QUANTITY);
    assertRange(input.milkUsableYieldPercent, "Yield นม", 0.1, 100);
    milkContainerVolumeMl = input.milkContainerVolume * (input.milkContainerUnit === "l" ? 1_000 : 1);
    usableMilkVolumeMl = milkContainerVolumeMl * input.milkUsableYieldPercent / 100;
    asPurchasedMilkMlPerCup = input.milkUsageMl / (input.milkUsableYieldPercent / 100);
    cupsPerMilkContainer = usableMilkVolumeMl / input.milkUsageMl;
    milkCostPerCup = input.milkPurchaseCost * input.milkUsageMl / usableMilkVolumeMl;
  }

  if (input.extras.length > COFFEE_COST_MAX_EXTRAS) {
    throw new Error(`ส่วนผสมเสริมต้องไม่เกิน ${COFFEE_COST_MAX_EXTRAS} รายการ`);
  }

  const monthlyCups = input.cupsPerDay * input.operatingDaysPerMonth;
  const extraResults = input.extras.map((extra, index): CoffeeExtraResult => {
    const rowLabel = `ส่วนผสมเสริมรายการที่ ${index + 1}`;
    const name = extra.name.trim();
    if (!name || name.length > 80) throw new Error(`${rowLabel}ต้องมีชื่อ 1–80 ตัวอักษร`);
    assertRange(extra.purchaseCost, `${rowLabel}: ราคาซื้อ`, 0, COFFEE_COST_MAX_MONEY);
    assertRange(extra.purchaseQuantity, `${rowLabel}: ปริมาณที่ซื้อ`, Number.MIN_VALUE, COFFEE_COST_MAX_QUANTITY);
    assertRange(extra.usagePerCup, `${rowLabel}: ปริมาณใช้ต่อแก้ว`, Number.MIN_VALUE, COFFEE_COST_MAX_QUANTITY);
    assertRange(extra.usableYieldPercent, `${rowLabel}: Yield`, 0.1, 100);

    const purchaseUnit = resolveExtraUnit(extra.purchaseUnit, `${rowLabel}: หน่วยซื้อ`);
    const usageUnit = resolveExtraUnit(extra.usageUnit, `${rowLabel}: หน่วยใช้`);
    if (purchaseUnit.dimension !== usageUnit.dimension) {
      throw new Error(`${rowLabel}ใช้หน่วยคนละประเภท กรุณาใช้น้ำหนักกับน้ำหนัก ปริมาตรกับปริมาตร หรือชิ้นกับชิ้น`);
    }

    const purchaseBaseQuantity = extra.purchaseQuantity * purchaseUnit.factor;
    const usageBaseQuantityPerCup = extra.usagePerCup * usageUnit.factor;
    const usableBaseQuantityPerPurchase = purchaseBaseQuantity * extra.usableYieldPercent / 100;
    const asPurchasedBaseQuantityPerCup = usageBaseQuantityPerCup / (extra.usableYieldPercent / 100);
    const purchasePackEquivalentPerCup = asPurchasedBaseQuantityPerCup / purchaseBaseQuantity;
    const costPerUsableBaseUnit = extra.purchaseCost / usableBaseQuantityPerPurchase;
    const lineCostPerCup = usageBaseQuantityPerCup * costPerUsableBaseUnit;
    const monthlyPurchaseBaseQuantity = asPurchasedBaseQuantityPerCup * monthlyCups;
    const monthlyPurchasePacks = purchasePackEquivalentPerCup * monthlyCups;

    [purchaseBaseQuantity, usageBaseQuantityPerCup, usableBaseQuantityPerPurchase, asPurchasedBaseQuantityPerCup, purchasePackEquivalentPerCup, costPerUsableBaseUnit, lineCostPerCup, monthlyPurchaseBaseQuantity, monthlyPurchasePacks].forEach(assertResult);

    return {
      ...extra,
      name,
      dimension: purchaseUnit.dimension,
      baseUnit: purchaseUnit.baseUnit,
      purchaseBaseQuantity,
      usageBaseQuantityPerCup,
      usableBaseQuantityPerPurchase,
      asPurchasedBaseQuantityPerCup,
      purchasePackEquivalentPerCup,
      costPerUsableBaseUnit,
      lineCostPerCup,
      shareOfExtraCost: 0,
      monthlyPurchaseBaseQuantity,
      monthlyPurchasePacks,
    };
  });

  const extraCostPerCup = extraResults.reduce((sum, extra) => sum + extra.lineCostPerCup, 0);
  extraResults.forEach((extra) => {
    extra.shareOfExtraCost = extraCostPerCup > 0 ? extra.lineCostPerCup / extraCostPerCup * 100 : 0;
  });

  const ingredientCostPerCup = beanCostPerCup + milkCostPerCup + extraCostPerCup;
  const paymentFeePerCup = input.sellingPricePerCup * input.paymentFeePercent / 100;
  const totalDirectCostPerCup = ingredientCostPerCup
    + input.packagingCostPerCup
    + input.laborCostPerCup
    + paymentFeePerCup
    + input.otherDirectCostPerCup;
  const suggestedPricePerCup = ingredientCostPerCup / (input.targetIngredientCostPercent / 100);

  const beanShareOfDirectCost = beanCostPerCup / totalDirectCostPerCup * 100;
  const milkShareOfDirectCost = milkCostPerCup / totalDirectCostPerCup * 100;
  const extraShareOfDirectCost = extraCostPerCup / totalDirectCostPerCup * 100;
  const packagingShareOfDirectCost = input.packagingCostPerCup / totalDirectCostPerCup * 100;
  const laborShareOfDirectCost = input.laborCostPerCup / totalDirectCostPerCup * 100;
  const paymentFeeShareOfDirectCost = paymentFeePerCup / totalDirectCostPerCup * 100;
  const otherDirectShareOfDirectCost = input.otherDirectCostPerCup / totalDirectCostPerCup * 100;

  let ingredientCostPercent: number | null = null;
  let directCostPercent: number | null = null;
  let contributionPerCup: number | null = null;
  let contributionMarginPercent: number | null = null;
  let priceGapFromTarget: number | null = null;
  let ingredientCostStatus: CoffeeCostStatus = "not-provided";

  if (input.sellingPricePerCup > 0) {
    ingredientCostPercent = ingredientCostPerCup / input.sellingPricePerCup * 100;
    directCostPercent = totalDirectCostPerCup / input.sellingPricePerCup * 100;
    contributionPerCup = input.sellingPricePerCup - totalDirectCostPerCup;
    contributionMarginPercent = contributionPerCup / input.sellingPricePerCup * 100;
    priceGapFromTarget = input.sellingPricePerCup - suggestedPricePerCup;
    ingredientCostStatus = ingredientCostPercent <= input.targetIngredientCostPercent + 0.005
      ? "at-or-below-target"
      : "above-target";
  }

  const monthlyBeanPurchaseG = asPurchasedBeanGPerCup * monthlyCups;
  const monthlyBeanBags = monthlyBeanPurchaseG / beanBagWeightG;
  const monthlyMilkPurchaseMl = asPurchasedMilkMlPerCup * monthlyCups;
  const monthlyMilkContainers = milkContainerVolumeMl > 0 ? monthlyMilkPurchaseMl / milkContainerVolumeMl : 0;
  const monthlyIngredientCost = ingredientCostPerCup * monthlyCups;
  const monthlyDirectCost = totalDirectCostPerCup * monthlyCups;
  const monthlyRevenue = input.sellingPricePerCup > 0 ? input.sellingPricePerCup * monthlyCups : null;
  const monthlyContribution = contributionPerCup === null ? null : contributionPerCup * monthlyCups;

  [
    beanBagWeightG,
    usableBeanWeightG,
    asPurchasedBeanGPerCup,
    cupsPerBeanBag,
    beanCostPerCup,
    milkContainerVolumeMl,
    usableMilkVolumeMl,
    asPurchasedMilkMlPerCup,
    ...(cupsPerMilkContainer === null ? [] : [cupsPerMilkContainer]),
    milkCostPerCup,
    extraCostPerCup,
    ingredientCostPerCup,
    paymentFeePerCup,
    totalDirectCostPerCup,
    suggestedPricePerCup,
    beanShareOfDirectCost,
    milkShareOfDirectCost,
    extraShareOfDirectCost,
    packagingShareOfDirectCost,
    laborShareOfDirectCost,
    paymentFeeShareOfDirectCost,
    otherDirectShareOfDirectCost,
    monthlyCups,
    monthlyBeanPurchaseG,
    monthlyBeanBags,
    monthlyMilkPurchaseMl,
    monthlyMilkContainers,
    monthlyIngredientCost,
    monthlyDirectCost,
    ...(ingredientCostPercent === null ? [] : [ingredientCostPercent]),
    ...(directCostPercent === null ? [] : [directCostPercent]),
    ...(contributionPerCup === null ? [] : [contributionPerCup]),
    ...(contributionMarginPercent === null ? [] : [contributionMarginPercent]),
    ...(priceGapFromTarget === null ? [] : [priceGapFromTarget]),
    ...(monthlyRevenue === null ? [] : [monthlyRevenue]),
    ...(monthlyContribution === null ? [] : [monthlyContribution]),
  ].forEach(assertResult);

  return {
    extraResults,
    beanBagWeightG,
    usableBeanWeightG,
    asPurchasedBeanGPerCup,
    cupsPerBeanBag,
    beanCostPerCup,
    milkContainerVolumeMl,
    usableMilkVolumeMl,
    asPurchasedMilkMlPerCup,
    cupsPerMilkContainer,
    milkCostPerCup,
    extraCostPerCup,
    ingredientCostPerCup,
    paymentFeePerCup,
    totalDirectCostPerCup,
    suggestedPricePerCup,
    ingredientCostPercent,
    directCostPercent,
    contributionPerCup,
    contributionMarginPercent,
    priceGapFromTarget,
    ingredientCostStatus,
    beanShareOfDirectCost,
    milkShareOfDirectCost,
    extraShareOfDirectCost,
    packagingShareOfDirectCost,
    laborShareOfDirectCost,
    paymentFeeShareOfDirectCost,
    otherDirectShareOfDirectCost,
    monthlyCups,
    monthlyBeanPurchaseG,
    monthlyBeanBags,
    monthlyMilkPurchaseMl,
    monthlyMilkContainers,
    monthlyIngredientCost,
    monthlyDirectCost,
    monthlyRevenue,
    monthlyContribution,
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

export function coffeeCostCsv(input: CoffeeCostInput, result: CoffeeCostResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["เมนู", safeSpreadsheetText(input.drinkName)],
    [],
    ["ส่วนผสมหลัก", "ราคาซื้อ", "ปริมาณซื้อ", "หน่วยซื้อ", "ปริมาณใช้ต่อแก้ว", "หน่วยใช้", "Yield %", "ต้นทุนต่อแก้ว", "จำนวนแก้วต่อแพ็ก"],
    ["เมล็ดกาแฟ", csvNumber(input.beanPurchaseCost), csvNumber(input.beanBagWeight, 4), input.beanBagUnit, csvNumber(input.beanDoseG, 4), "g", csvNumber(input.beanUsableYieldPercent), csvNumber(result.beanCostPerCup), csvNumber(result.cupsPerBeanBag, 4)],
    ...(input.includeMilk ? [["นม", csvNumber(input.milkPurchaseCost), csvNumber(input.milkContainerVolume, 4), input.milkContainerUnit, csvNumber(input.milkUsageMl, 4), "ml", csvNumber(input.milkUsableYieldPercent), csvNumber(result.milkCostPerCup), csvNumber(result.cupsPerMilkContainer, 4)]] : []),
    ...result.extraResults.map((extra) => [
      safeSpreadsheetText(extra.name),
      csvNumber(extra.purchaseCost),
      csvNumber(extra.purchaseQuantity, 4),
      extra.purchaseUnit,
      csvNumber(extra.usagePerCup, 4),
      extra.usageUnit,
      csvNumber(extra.usableYieldPercent),
      csvNumber(extra.lineCostPerCup),
      csvNumber(1 / extra.purchasePackEquivalentPerCup, 4),
    ]),
    [],
    ["การตั้งค่า/ผลลัพธ์", "ค่า", "หน่วย"],
    ["ต้นทุนเมล็ดต่อแก้ว", csvNumber(result.beanCostPerCup), `${currency}/แก้ว`],
    ["ต้นทุนนมต่อแก้ว", csvNumber(result.milkCostPerCup), `${currency}/แก้ว`],
    ["ต้นทุนส่วนผสมเสริมต่อแก้ว", csvNumber(result.extraCostPerCup), `${currency}/แก้ว`],
    ["ต้นทุนวัตถุดิบรวมต่อแก้ว", csvNumber(result.ingredientCostPerCup), `${currency}/แก้ว`],
    ["บรรจุภัณฑ์ต่อแก้ว", csvNumber(input.packagingCostPerCup), `${currency}/แก้ว`],
    ["ค่าแรงตรงต่อแก้ว", csvNumber(input.laborCostPerCup), `${currency}/แก้ว`],
    ["ค่าธรรมเนียมตามยอดขาย", csvNumber(result.paymentFeePerCup), `${currency}/แก้ว`],
    ["ต้นทุนตรงอื่นต่อแก้ว", csvNumber(input.otherDirectCostPerCup), `${currency}/แก้ว`],
    ["ต้นทุนตรงรวมต่อแก้ว", csvNumber(result.totalDirectCostPerCup), `${currency}/แก้ว`],
    ["เป้าหมาย Ingredient cost", csvNumber(input.targetIngredientCostPercent), "%"],
    ["ราคาขายจากเป้าหมาย Ingredient cost", csvNumber(result.suggestedPricePerCup), `${currency}/แก้ว`],
    ["ราคาขายปัจจุบัน", csvNumber(input.sellingPricePerCup || null), `${currency}/แก้ว`],
    ["Ingredient cost ปัจจุบัน", csvNumber(result.ingredientCostPercent), "%"],
    ["Direct cost ปัจจุบัน", csvNumber(result.directCostPercent), "%"],
    ["Contribution ต่อแก้ว", csvNumber(result.contributionPerCup), `${currency}/แก้ว`],
    [],
    ["แผนรายเดือน", "ค่า", "หน่วย"],
    ["ยอดขายเฉลี่ยต่อวัน", csvNumber(input.cupsPerDay, 4), "แก้ว/วัน"],
    ["วันเปิดร้านต่อเดือน", input.operatingDaysPerMonth, "วัน"],
    ["จำนวนแก้วต่อเดือน", csvNumber(result.monthlyCups, 4), "แก้ว"],
    ["เมล็ดที่ต้องซื้อต่อเดือน", csvNumber(result.monthlyBeanPurchaseG, 4), "g"],
    ["ถุงเมล็ดต่อเดือน", csvNumber(result.monthlyBeanBags, 4), "ถุง"],
    ["นมที่ต้องซื้อต่อเดือน", csvNumber(result.monthlyMilkPurchaseMl, 4), "ml"],
    ["ภาชนะนมต่อเดือน", csvNumber(result.monthlyMilkContainers, 4), "ภาชนะ"],
    ...result.extraResults.map((extra) => [`${safeSpreadsheetText(extra.name)} ที่ต้องซื้อต่อเดือน`, csvNumber(extra.monthlyPurchasePacks, 4), "แพ็ก"]),
    ["ต้นทุนวัตถุดิบต่อเดือน", csvNumber(result.monthlyIngredientCost), currency],
    ["ต้นทุนตรงต่อเดือน", csvNumber(result.monthlyDirectCost), currency],
    ["รายได้ต่อเดือน", csvNumber(result.monthlyRevenue), currency],
    ["Contribution ต่อเดือน", csvNumber(result.monthlyContribution), currency],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
