export const FOOD_COST_MAX_INGREDIENTS = 50;
export const FOOD_COST_MAX_MONEY = 1_000_000_000_000;
export const FOOD_COST_MAX_QUANTITY = 1_000_000_000_000;
export const FOOD_COST_MAX_SERVINGS = 1_000_000;
export const FOOD_COST_MAX_RESULT = 1_000_000_000_000_000;

export type FoodCostCurrency = "THB" | "USD" | "OTHER";
export type FoodCostUnit = "g" | "kg" | "ml" | "l" | "piece";
export type FoodCostDimension = "weight" | "volume" | "count";
export type FoodCostStatus = "not-provided" | "at-or-below-target" | "above-target";

export type FoodCostIngredientInput = {
  name: string;
  purchaseCost: number;
  purchaseQuantity: number;
  purchaseUnit: FoodCostUnit;
  recipeQuantity: number;
  recipeUnit: FoodCostUnit;
  yieldPercent: number;
};

export type FoodCostInput = {
  currency: FoodCostCurrency;
  servings: number;
  sellingPricePerServing: number;
  targetFoodCostPercent: number;
  packagingPerServing: number;
  laborPerBatch: number;
  otherDirectCostPerBatch: number;
  ingredients: FoodCostIngredientInput[];
};

export type FoodCostIngredientResult = FoodCostIngredientInput & {
  dimension: FoodCostDimension;
  baseUnit: "g" | "ml" | "piece";
  purchaseBaseQuantity: number;
  recipeBaseQuantity: number;
  usableBaseQuantityPerPurchase: number;
  asPurchasedBaseQuantityNeeded: number;
  wasteBaseQuantity: number;
  purchasePackEquivalent: number;
  costPerUsableBaseUnit: number;
  lineCost: number;
  shareOfIngredientCost: number;
};

export type FoodCostResult = {
  ingredientResults: FoodCostIngredientResult[];
  ingredientCostPerBatch: number;
  ingredientCostPerServing: number;
  packagingCostPerBatch: number;
  totalDirectCostPerBatch: number;
  totalDirectCostPerServing: number;
  suggestedPricePerServing: number;
  ingredientShareOfDirectCost: number;
  packagingShareOfDirectCost: number;
  laborShareOfDirectCost: number;
  otherDirectShareOfDirectCost: number;
  foodCostPercent: number | null;
  directCostPercent: number | null;
  contributionPerServing: number | null;
  contributionPerBatch: number | null;
  contributionMarginPercent: number | null;
  revenuePerBatch: number | null;
  currentPriceGapFromTarget: number | null;
  foodCostStatus: FoodCostStatus;
};

const UNIT_DEFINITIONS: Record<FoodCostUnit, { dimension: FoodCostDimension; factor: number; baseUnit: "g" | "ml" | "piece" }> = {
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
  if (!Number.isFinite(value) || Math.abs(value) > FOOD_COST_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจปริมาณ ราคา และ Yield อีกครั้ง");
  }
}

function resolveUnit(unit: FoodCostUnit, label: string) {
  const definition = UNIT_DEFINITIONS[unit];
  if (!definition) throw new Error(`${label}ไม่ถูกต้อง`);
  return definition;
}

export function calculateFoodCost(input: FoodCostInput): FoodCostResult {
  if (input.currency !== "THB" && input.currency !== "USD" && input.currency !== "OTHER") {
    throw new Error("หน่วยเงินไม่ถูกต้อง");
  }
  if (!Number.isInteger(input.servings)) {
    throw new Error("จำนวนเสิร์ฟต้องเป็นจำนวนเต็ม");
  }
  assertRange(input.servings, "จำนวนเสิร์ฟ", 1, FOOD_COST_MAX_SERVINGS);
  assertRange(input.sellingPricePerServing, "ราคาขายต่อเสิร์ฟ", 0, FOOD_COST_MAX_MONEY);
  assertRange(input.targetFoodCostPercent, "เป้าหมาย Food cost", 0.1, 100);
  assertRange(input.packagingPerServing, "บรรจุภัณฑ์ต่อเสิร์ฟ", 0, FOOD_COST_MAX_MONEY);
  assertRange(input.laborPerBatch, "ค่าแรงตรงต่อสูตร", 0, FOOD_COST_MAX_MONEY);
  assertRange(input.otherDirectCostPerBatch, "ต้นทุนตรงอื่นต่อสูตร", 0, FOOD_COST_MAX_MONEY);

  if (input.ingredients.length < 1 || input.ingredients.length > FOOD_COST_MAX_INGREDIENTS) {
    throw new Error(`จำนวนวัตถุดิบต้องอยู่ระหว่าง 1–${FOOD_COST_MAX_INGREDIENTS} รายการ`);
  }

  const ingredientResults = input.ingredients.map((ingredient, index): FoodCostIngredientResult => {
    const rowLabel = `วัตถุดิบรายการที่ ${index + 1}`;
    const name = ingredient.name.trim();
    if (!name || name.length > 80) throw new Error(`${rowLabel}ต้องมีชื่อ 1–80 ตัวอักษร`);
    assertRange(ingredient.purchaseCost, `${rowLabel}: ราคาซื้อ`, 0, FOOD_COST_MAX_MONEY);
    assertRange(ingredient.purchaseQuantity, `${rowLabel}: ปริมาณที่ซื้อ`, Number.MIN_VALUE, FOOD_COST_MAX_QUANTITY);
    assertRange(ingredient.recipeQuantity, `${rowLabel}: ปริมาณที่สูตรใช้`, Number.MIN_VALUE, FOOD_COST_MAX_QUANTITY);
    assertRange(ingredient.yieldPercent, `${rowLabel}: Yield`, 0.1, 100);

    const purchaseUnit = resolveUnit(ingredient.purchaseUnit, `${rowLabel}: หน่วยซื้อ`);
    const recipeUnit = resolveUnit(ingredient.recipeUnit, `${rowLabel}: หน่วยใช้`);
    if (purchaseUnit.dimension !== recipeUnit.dimension) {
      throw new Error(`${rowLabel}ใช้หน่วยคนละประเภท กรุณาใช้หน่วยน้ำหนักกับน้ำหนัก ปริมาตรกับปริมาตร หรือชิ้นกับชิ้น`);
    }

    const purchaseBaseQuantity = ingredient.purchaseQuantity * purchaseUnit.factor;
    const recipeBaseQuantity = ingredient.recipeQuantity * recipeUnit.factor;
    const yieldRatio = ingredient.yieldPercent / 100;
    const usableBaseQuantityPerPurchase = purchaseBaseQuantity * yieldRatio;
    const asPurchasedBaseQuantityNeeded = recipeBaseQuantity / yieldRatio;
    const wasteBaseQuantity = asPurchasedBaseQuantityNeeded - recipeBaseQuantity;
    const purchasePackEquivalent = asPurchasedBaseQuantityNeeded / purchaseBaseQuantity;
    const costPerUsableBaseUnit = ingredient.purchaseCost / usableBaseQuantityPerPurchase;
    const lineCost = recipeBaseQuantity * costPerUsableBaseUnit;

    [
      purchaseBaseQuantity,
      recipeBaseQuantity,
      usableBaseQuantityPerPurchase,
      asPurchasedBaseQuantityNeeded,
      wasteBaseQuantity,
      purchasePackEquivalent,
      costPerUsableBaseUnit,
      lineCost,
    ].forEach(assertResult);

    return {
      ...ingredient,
      name,
      dimension: purchaseUnit.dimension,
      baseUnit: purchaseUnit.baseUnit,
      purchaseBaseQuantity,
      recipeBaseQuantity,
      usableBaseQuantityPerPurchase,
      asPurchasedBaseQuantityNeeded,
      wasteBaseQuantity,
      purchasePackEquivalent,
      costPerUsableBaseUnit,
      lineCost,
      shareOfIngredientCost: 0,
    };
  });

  const ingredientCostPerBatch = ingredientResults.reduce((sum, ingredient) => sum + ingredient.lineCost, 0);
  if (ingredientCostPerBatch <= 0) {
    throw new Error("ต้นทุนวัตถุดิบรวมต้องมากกว่า 0 กรุณาตรวจราคาซื้อและปริมาณที่ใช้");
  }

  ingredientResults.forEach((ingredient) => {
    ingredient.shareOfIngredientCost = ingredient.lineCost / ingredientCostPerBatch * 100;
  });

  const ingredientCostPerServing = ingredientCostPerBatch / input.servings;
  const packagingCostPerBatch = input.packagingPerServing * input.servings;
  const totalDirectCostPerBatch = ingredientCostPerBatch + packagingCostPerBatch + input.laborPerBatch + input.otherDirectCostPerBatch;
  const totalDirectCostPerServing = totalDirectCostPerBatch / input.servings;
  const suggestedPricePerServing = ingredientCostPerServing / (input.targetFoodCostPercent / 100);
  const ingredientShareOfDirectCost = ingredientCostPerBatch / totalDirectCostPerBatch * 100;
  const packagingShareOfDirectCost = packagingCostPerBatch / totalDirectCostPerBatch * 100;
  const laborShareOfDirectCost = input.laborPerBatch / totalDirectCostPerBatch * 100;
  const otherDirectShareOfDirectCost = input.otherDirectCostPerBatch / totalDirectCostPerBatch * 100;

  let foodCostPercent: number | null = null;
  let directCostPercent: number | null = null;
  let contributionPerServing: number | null = null;
  let contributionPerBatch: number | null = null;
  let contributionMarginPercent: number | null = null;
  let revenuePerBatch: number | null = null;
  let currentPriceGapFromTarget: number | null = null;
  let foodCostStatus: FoodCostStatus = "not-provided";

  if (input.sellingPricePerServing > 0) {
    foodCostPercent = ingredientCostPerServing / input.sellingPricePerServing * 100;
    directCostPercent = totalDirectCostPerServing / input.sellingPricePerServing * 100;
    contributionPerServing = input.sellingPricePerServing - totalDirectCostPerServing;
    contributionPerBatch = contributionPerServing * input.servings;
    contributionMarginPercent = contributionPerServing / input.sellingPricePerServing * 100;
    revenuePerBatch = input.sellingPricePerServing * input.servings;
    currentPriceGapFromTarget = input.sellingPricePerServing - suggestedPricePerServing;
    foodCostStatus = foodCostPercent <= input.targetFoodCostPercent + 0.005
      ? "at-or-below-target"
      : "above-target";
  }

  const numericResults = [
    ingredientCostPerBatch,
    ingredientCostPerServing,
    packagingCostPerBatch,
    totalDirectCostPerBatch,
    totalDirectCostPerServing,
    suggestedPricePerServing,
    ingredientShareOfDirectCost,
    packagingShareOfDirectCost,
    laborShareOfDirectCost,
    otherDirectShareOfDirectCost,
    ...(foodCostPercent === null ? [] : [foodCostPercent]),
    ...(directCostPercent === null ? [] : [directCostPercent]),
    ...(contributionPerServing === null ? [] : [contributionPerServing]),
    ...(contributionPerBatch === null ? [] : [contributionPerBatch]),
    ...(contributionMarginPercent === null ? [] : [contributionMarginPercent]),
    ...(revenuePerBatch === null ? [] : [revenuePerBatch]),
    ...(currentPriceGapFromTarget === null ? [] : [currentPriceGapFromTarget]),
  ];
  numericResults.forEach(assertResult);

  return {
    ingredientResults,
    ingredientCostPerBatch,
    ingredientCostPerServing,
    packagingCostPerBatch,
    totalDirectCostPerBatch,
    totalDirectCostPerServing,
    suggestedPricePerServing,
    ingredientShareOfDirectCost,
    packagingShareOfDirectCost,
    laborShareOfDirectCost,
    otherDirectShareOfDirectCost,
    foodCostPercent,
    directCostPercent,
    contributionPerServing,
    contributionPerBatch,
    contributionMarginPercent,
    revenuePerBatch,
    currentPriceGapFromTarget,
    foodCostStatus,
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

export function foodCostCsv(input: FoodCostInput, result: FoodCostResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["วัตถุดิบ", "ราคาซื้อ", "ปริมาณซื้อ", "หน่วยซื้อ", "ปริมาณใช้", "หน่วยใช้", "Yield %", "ปริมาณ AP ที่ต้องใช้", "หน่วยฐาน", "ต้นทุนรายการ", "% ต้นทุนวัตถุดิบ"],
    ...result.ingredientResults.map((ingredient) => [
      safeSpreadsheetText(ingredient.name),
      csvNumber(ingredient.purchaseCost),
      csvNumber(ingredient.purchaseQuantity, 4),
      ingredient.purchaseUnit,
      csvNumber(ingredient.recipeQuantity, 4),
      ingredient.recipeUnit,
      csvNumber(ingredient.yieldPercent),
      csvNumber(ingredient.asPurchasedBaseQuantityNeeded, 4),
      ingredient.baseUnit,
      csvNumber(ingredient.lineCost),
      csvNumber(ingredient.shareOfIngredientCost),
    ]),
    [],
    ["การตั้งค่า/ผลลัพธ์", "ค่า", "หน่วย"],
    ["จำนวนเสิร์ฟ", input.servings, "เสิร์ฟ"],
    ["ต้นทุนวัตถุดิบต่อสูตร", csvNumber(result.ingredientCostPerBatch), currency],
    ["ต้นทุนวัตถุดิบต่อเสิร์ฟ", csvNumber(result.ingredientCostPerServing), `${currency}/เสิร์ฟ`],
    ["บรรจุภัณฑ์ต่อเสิร์ฟ", csvNumber(input.packagingPerServing), `${currency}/เสิร์ฟ`],
    ["ค่าแรงตรงต่อสูตร", csvNumber(input.laborPerBatch), currency],
    ["ต้นทุนตรงอื่นต่อสูตร", csvNumber(input.otherDirectCostPerBatch), currency],
    ["ต้นทุนตรงรวมต่อสูตร", csvNumber(result.totalDirectCostPerBatch), currency],
    ["ต้นทุนตรงรวมต่อเสิร์ฟ", csvNumber(result.totalDirectCostPerServing), `${currency}/เสิร์ฟ`],
    ["เป้าหมาย Food cost", csvNumber(input.targetFoodCostPercent), "%"],
    ["ราคาขายแนะนำจากเป้าหมาย Food cost", csvNumber(result.suggestedPricePerServing), `${currency}/เสิร์ฟ`],
    ["ราคาขายปัจจุบัน", csvNumber(input.sellingPricePerServing || null), `${currency}/เสิร์ฟ`],
    ["Food cost ปัจจุบัน", csvNumber(result.foodCostPercent), "%"],
    ["Direct cost ปัจจุบัน", csvNumber(result.directCostPercent), "%"],
    ["Contribution ต่อเสิร์ฟ", csvNumber(result.contributionPerServing), `${currency}/เสิร์ฟ`],
    ["Contribution margin", csvNumber(result.contributionMarginPercent), "%"],
    ["รายได้ต่อสูตร", csvNumber(result.revenuePerBatch), currency],
    ["Contribution ต่อสูตร", csvNumber(result.contributionPerBatch), currency],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
