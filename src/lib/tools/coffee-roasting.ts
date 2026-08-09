export const COFFEE_ROASTING_MAX_MONEY = 1_000_000_000_000;
export const COFFEE_ROASTING_MAX_QUANTITY = 1_000_000_000_000;
export const COFFEE_ROASTING_MAX_BATCHES_PER_MONTH = 1_000_000;
export const COFFEE_ROASTING_MAX_RESULT = 1_000_000_000_000_000;
export const COFFEE_ROASTING_MIN_QUANTITY = 0.000001;

export type CoffeeRoastingCurrency = "THB" | "USD" | "OTHER";
export type CoffeeRoastingMassUnit = "g" | "kg";
export type RoastLossStatus = "below-plan" | "on-plan" | "above-plan";

export type CoffeeRoastingInput = {
  currency: CoffeeRoastingCurrency;
  batchName: string;
  greenPurchaseCost: number;
  greenPurchaseWeight: number;
  greenPurchaseUnit: CoffeeRoastingMassUnit;
  greenBatchWeight: number;
  greenBatchUnit: CoffeeRoastingMassUnit;
  roastedOutputWeight: number;
  roastedOutputUnit: CoffeeRoastingMassUnit;
  expectedLossPercent: number;
  energyCostPerBatch: number;
  laborMinutesPerBatch: number;
  laborCostPerHour: number;
  otherBatchCost: number;
  retailBagSizeG: number;
  packagingCostPerBag: number;
  sellingPricePerBag: number;
  channelFeePercent: number;
  targetContributionMarginPercent: number;
  batchesPerMonth: number;
};

export type CoffeeRoastingResult = {
  greenPurchaseWeightG: number;
  greenBatchWeightG: number;
  roastedOutputWeightG: number;
  actualLossWeightG: number;
  actualLossPercent: number;
  yieldPercent: number;
  expectedLossWeightG: number;
  expectedRoastedWeightG: number;
  lossVariancePercentagePoints: number;
  lossStatus: RoastLossStatus;
  greenCostPerKg: number;
  greenBeanCostPerBatch: number;
  laborCostPerBatch: number;
  processCostPerBatch: number;
  costPerRoastedKgBeforePackaging: number;
  fullBagsPerBatch: number;
  leftoverRoastedWeightG: number;
  coffeeCostPerBag: number;
  costPerBagBeforeChannelFee: number;
  channelFeePerBag: number | null;
  totalDirectCostPerBag: number | null;
  suggestedPricePerBag: number;
  contributionPerBag: number | null;
  contributionMarginPercent: number | null;
  batchRevenue: number | null;
  batchContribution: number | null;
  greenShareOfProcessCost: number;
  energyShareOfProcessCost: number;
  laborShareOfProcessCost: number;
  otherShareOfProcessCost: number;
  monthlyGreenWeightG: number;
  monthlyRoastedWeightG: number;
  monthlyFullBags: number;
  monthlyLeftoverWeightG: number;
  monthlyProcessCost: number;
  monthlyRevenue: number | null;
  monthlyContribution: number | null;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > COFFEE_ROASTING_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจราคา น้ำหนัก ขนาดถุง และจำนวน Batch อีกครั้ง");
  }
}

function toGrams(value: number, unit: CoffeeRoastingMassUnit, label: string) {
  if (unit !== "g" && unit !== "kg") throw new Error(`${label}ไม่ถูกต้อง`);
  return value * (unit === "kg" ? 1_000 : 1);
}

export function calculateCoffeeRoasting(input: CoffeeRoastingInput): CoffeeRoastingResult {
  if (input.currency !== "THB" && input.currency !== "USD" && input.currency !== "OTHER") {
    throw new Error("หน่วยเงินไม่ถูกต้อง");
  }

  const batchName = input.batchName.trim();
  if (!batchName || batchName.length > 80) throw new Error("ชื่อ Batch ต้องมี 1–80 ตัวอักษร");

  assertRange(input.greenPurchaseCost, "ราคา Green coffee", COFFEE_ROASTING_MIN_QUANTITY, COFFEE_ROASTING_MAX_MONEY);
  assertRange(input.greenPurchaseWeight, "น้ำหนักที่ซื้อ", COFFEE_ROASTING_MIN_QUANTITY, COFFEE_ROASTING_MAX_QUANTITY);
  assertRange(input.greenBatchWeight, "น้ำหนักก่อนคั่ว", COFFEE_ROASTING_MIN_QUANTITY, COFFEE_ROASTING_MAX_QUANTITY);
  assertRange(input.roastedOutputWeight, "น้ำหนักหลังคั่ว", COFFEE_ROASTING_MIN_QUANTITY, COFFEE_ROASTING_MAX_QUANTITY);
  assertRange(input.expectedLossPercent, "Loss ที่คาด", 0, 99);
  assertRange(input.energyCostPerBatch, "ต้นทุนพลังงานต่อ Batch", 0, COFFEE_ROASTING_MAX_MONEY);
  assertRange(input.laborMinutesPerBatch, "เวลาแรงงานต่อ Batch", 0, COFFEE_ROASTING_MAX_QUANTITY);
  assertRange(input.laborCostPerHour, "ค่าแรงต่อชั่วโมง", 0, COFFEE_ROASTING_MAX_MONEY);
  assertRange(input.otherBatchCost, "ต้นทุน Batch อื่น", 0, COFFEE_ROASTING_MAX_MONEY);
  assertRange(input.retailBagSizeG, "ขนาดถุงขาย", COFFEE_ROASTING_MIN_QUANTITY, COFFEE_ROASTING_MAX_QUANTITY);
  assertRange(input.packagingCostPerBag, "ต้นทุนบรรจุภัณฑ์ต่อถุง", 0, COFFEE_ROASTING_MAX_MONEY);
  assertRange(input.sellingPricePerBag, "ราคาขายต่อถุง", 0, COFFEE_ROASTING_MAX_MONEY);
  assertRange(input.channelFeePercent, "Channel fee", 0, 100);
  assertRange(input.targetContributionMarginPercent, "เป้าหมาย Contribution margin", 0, 99);
  if (!Number.isInteger(input.batchesPerMonth)) throw new Error("จำนวน Batch ต่อเดือนต้องเป็นจำนวนเต็ม");
  assertRange(input.batchesPerMonth, "จำนวน Batch ต่อเดือน", 0, COFFEE_ROASTING_MAX_BATCHES_PER_MONTH);

  const targetRate = input.targetContributionMarginPercent / 100;
  const channelFeeRate = input.channelFeePercent / 100;
  if (targetRate + channelFeeRate >= 1) {
    throw new Error("เป้าหมาย Contribution margin รวมกับ Channel fee ต้องต่ำกว่า 100%");
  }

  const greenPurchaseWeightG = toGrams(input.greenPurchaseWeight, input.greenPurchaseUnit, "หน่วยน้ำหนักที่ซื้อ");
  const greenBatchWeightG = toGrams(input.greenBatchWeight, input.greenBatchUnit, "หน่วยน้ำหนักก่อนคั่ว");
  const roastedOutputWeightG = toGrams(input.roastedOutputWeight, input.roastedOutputUnit, "หน่วยน้ำหนักหลังคั่ว");
  if (roastedOutputWeightG > greenBatchWeightG) {
    throw new Error("น้ำหนักหลังคั่วต้องไม่มากกว่าน้ำหนัก Green coffee ก่อนคั่ว กรุณาตรวจหน่วย g/kg และค่าที่ชั่ง");
  }

  const actualLossWeightG = greenBatchWeightG - roastedOutputWeightG;
  const actualLossPercent = actualLossWeightG / greenBatchWeightG * 100;
  const yieldPercent = roastedOutputWeightG / greenBatchWeightG * 100;
  const expectedLossWeightG = greenBatchWeightG * input.expectedLossPercent / 100;
  const expectedRoastedWeightG = greenBatchWeightG - expectedLossWeightG;
  const lossVariancePercentagePoints = actualLossPercent - input.expectedLossPercent;
  const lossStatus: RoastLossStatus = Math.abs(lossVariancePercentagePoints) <= 0.1
    ? "on-plan"
    : lossVariancePercentagePoints > 0
      ? "above-plan"
      : "below-plan";

  const greenCostPerGram = input.greenPurchaseCost / greenPurchaseWeightG;
  const greenCostPerKg = greenCostPerGram * 1_000;
  const greenBeanCostPerBatch = greenCostPerGram * greenBatchWeightG;
  const laborCostPerBatch = input.laborMinutesPerBatch / 60 * input.laborCostPerHour;
  const processCostPerBatch = greenBeanCostPerBatch + input.energyCostPerBatch + laborCostPerBatch + input.otherBatchCost;
  const costPerRoastedGramBeforePackaging = processCostPerBatch / roastedOutputWeightG;
  const costPerRoastedKgBeforePackaging = costPerRoastedGramBeforePackaging * 1_000;
  const fullBagsPerBatch = Math.floor((roastedOutputWeightG + Number.EPSILON) / input.retailBagSizeG);
  const leftoverRoastedWeightG = roastedOutputWeightG - fullBagsPerBatch * input.retailBagSizeG;
  const coffeeCostPerBag = costPerRoastedGramBeforePackaging * input.retailBagSizeG;
  const costPerBagBeforeChannelFee = coffeeCostPerBag + input.packagingCostPerBag;
  const suggestedPricePerBag = costPerBagBeforeChannelFee / (1 - channelFeeRate - targetRate);

  let channelFeePerBag: number | null = null;
  let totalDirectCostPerBag: number | null = null;
  let contributionPerBag: number | null = null;
  let contributionMarginPercent: number | null = null;
  let batchRevenue: number | null = null;
  let batchContribution: number | null = null;

  if (input.sellingPricePerBag > 0) {
    channelFeePerBag = input.sellingPricePerBag * channelFeeRate;
    totalDirectCostPerBag = costPerBagBeforeChannelFee + channelFeePerBag;
    contributionPerBag = input.sellingPricePerBag - totalDirectCostPerBag;
    contributionMarginPercent = contributionPerBag / input.sellingPricePerBag * 100;
    batchRevenue = fullBagsPerBatch * input.sellingPricePerBag;
    batchContribution = batchRevenue
      - processCostPerBatch
      - fullBagsPerBatch * input.packagingCostPerBag
      - fullBagsPerBatch * channelFeePerBag;
  }

  const greenShareOfProcessCost = greenBeanCostPerBatch / processCostPerBatch * 100;
  const energyShareOfProcessCost = input.energyCostPerBatch / processCostPerBatch * 100;
  const laborShareOfProcessCost = laborCostPerBatch / processCostPerBatch * 100;
  const otherShareOfProcessCost = input.otherBatchCost / processCostPerBatch * 100;

  const monthlyGreenWeightG = greenBatchWeightG * input.batchesPerMonth;
  const monthlyRoastedWeightG = roastedOutputWeightG * input.batchesPerMonth;
  const monthlyFullBags = fullBagsPerBatch * input.batchesPerMonth;
  const monthlyLeftoverWeightG = leftoverRoastedWeightG * input.batchesPerMonth;
  const monthlyProcessCost = processCostPerBatch * input.batchesPerMonth;
  const monthlyRevenue = batchRevenue === null ? null : batchRevenue * input.batchesPerMonth;
  const monthlyContribution = batchContribution === null ? null : batchContribution * input.batchesPerMonth;

  const valuesToCheck = [
    greenPurchaseWeightG,
    greenBatchWeightG,
    roastedOutputWeightG,
    actualLossWeightG,
    actualLossPercent,
    yieldPercent,
    expectedLossWeightG,
    expectedRoastedWeightG,
    lossVariancePercentagePoints,
    greenCostPerKg,
    greenBeanCostPerBatch,
    laborCostPerBatch,
    processCostPerBatch,
    costPerRoastedKgBeforePackaging,
    fullBagsPerBatch,
    leftoverRoastedWeightG,
    coffeeCostPerBag,
    costPerBagBeforeChannelFee,
    suggestedPricePerBag,
    greenShareOfProcessCost,
    energyShareOfProcessCost,
    laborShareOfProcessCost,
    otherShareOfProcessCost,
    monthlyGreenWeightG,
    monthlyRoastedWeightG,
    monthlyFullBags,
    monthlyLeftoverWeightG,
    monthlyProcessCost,
    ...(channelFeePerBag === null ? [] : [channelFeePerBag]),
    ...(totalDirectCostPerBag === null ? [] : [totalDirectCostPerBag]),
    ...(contributionPerBag === null ? [] : [contributionPerBag]),
    ...(contributionMarginPercent === null ? [] : [contributionMarginPercent]),
    ...(batchRevenue === null ? [] : [batchRevenue]),
    ...(batchContribution === null ? [] : [batchContribution]),
    ...(monthlyRevenue === null ? [] : [monthlyRevenue]),
    ...(monthlyContribution === null ? [] : [monthlyContribution]),
  ];
  valuesToCheck.forEach(assertResult);

  return {
    greenPurchaseWeightG,
    greenBatchWeightG,
    roastedOutputWeightG,
    actualLossWeightG,
    actualLossPercent,
    yieldPercent,
    expectedLossWeightG,
    expectedRoastedWeightG,
    lossVariancePercentagePoints,
    lossStatus,
    greenCostPerKg,
    greenBeanCostPerBatch,
    laborCostPerBatch,
    processCostPerBatch,
    costPerRoastedKgBeforePackaging,
    fullBagsPerBatch,
    leftoverRoastedWeightG,
    coffeeCostPerBag,
    costPerBagBeforeChannelFee,
    channelFeePerBag,
    totalDirectCostPerBag,
    suggestedPricePerBag,
    contributionPerBag,
    contributionMarginPercent,
    batchRevenue,
    batchContribution,
    greenShareOfProcessCost,
    energyShareOfProcessCost,
    laborShareOfProcessCost,
    otherShareOfProcessCost,
    monthlyGreenWeightG,
    monthlyRoastedWeightG,
    monthlyFullBags,
    monthlyLeftoverWeightG,
    monthlyProcessCost,
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

export function coffeeRoastingCsv(input: CoffeeRoastingInput, result: CoffeeRoastingResult) {
  const currency = input.currency === "OTHER" ? "หน่วยเงิน" : input.currency;
  const rows: Array<Array<string | number>> = [
    ["Coffee roasting batch", safeSpreadsheetText(input.batchName)],
    [],
    ["น้ำหนักและ Yield", "ค่า", "หน่วย"],
    ["Green coffee ก่อนคั่ว", csvNumber(result.greenBatchWeightG, 4), "g"],
    ["น้ำหนักหลังคั่ว", csvNumber(result.roastedOutputWeightG, 4), "g"],
    ["น้ำหนักที่หาย", csvNumber(result.actualLossWeightG, 4), "g"],
    ["Roast loss", csvNumber(result.actualLossPercent, 4), "%"],
    ["Roast yield", csvNumber(result.yieldPercent, 4), "%"],
    ["Loss ที่คาด", csvNumber(input.expectedLossPercent, 4), "%"],
    ["ความต่างจากแผน", csvNumber(result.lossVariancePercentagePoints, 4), "percentage points"],
    [],
    ["ต้นทุนต่อ Batch", "ค่า", "หน่วย"],
    ["ต้นทุน Green coffee", csvNumber(result.greenBeanCostPerBatch), currency],
    ["พลังงาน", csvNumber(input.energyCostPerBatch), currency],
    ["แรงงาน", csvNumber(result.laborCostPerBatch), currency],
    ["ต้นทุน Batch อื่น", csvNumber(input.otherBatchCost), currency],
    ["ต้นทุนกระบวนการรวม", csvNumber(result.processCostPerBatch), currency],
    ["ต้นทุนกาแฟคั่วก่อน Packaging", csvNumber(result.costPerRoastedKgBeforePackaging), `${currency}/kg`],
    [],
    ["บรรจุและราคา", "ค่า", "หน่วย"],
    ["ขนาดถุงขาย", csvNumber(input.retailBagSizeG, 4), "g"],
    ["จำนวนถุงเต็มต่อ Batch", result.fullBagsPerBatch, "ถุง"],
    ["น้ำหนักเหลือต่อ Batch", csvNumber(result.leftoverRoastedWeightG, 4), "g"],
    ["ต้นทุนกาแฟต่อถุง", csvNumber(result.coffeeCostPerBag), `${currency}/ถุง`],
    ["Packaging ต่อถุง", csvNumber(input.packagingCostPerBag), `${currency}/ถุง`],
    ["ต้นทุนต่อถุงก่อน Channel fee", csvNumber(result.costPerBagBeforeChannelFee), `${currency}/ถุง`],
    ["ราคาขายต่อถุง", csvNumber(input.sellingPricePerBag || null), `${currency}/ถุง`],
    ["Channel fee", csvNumber(result.channelFeePerBag), `${currency}/ถุง`],
    ["ต้นทุนตรงรวมต่อถุง", csvNumber(result.totalDirectCostPerBag), `${currency}/ถุง`],
    ["Contribution ต่อถุง", csvNumber(result.contributionPerBag), `${currency}/ถุง`],
    ["Contribution margin", csvNumber(result.contributionMarginPercent), "%"],
    ["ราคาจากเป้า Contribution margin", csvNumber(result.suggestedPricePerBag), `${currency}/ถุง`],
    [],
    ["แผนรายเดือน", "ค่า", "หน่วย"],
    ["จำนวน Batch", input.batchesPerMonth, "Batch"],
    ["Green coffee", csvNumber(result.monthlyGreenWeightG / 1_000, 4), "kg"],
    ["กาแฟคั่ว", csvNumber(result.monthlyRoastedWeightG / 1_000, 4), "kg"],
    ["จำนวนถุงเต็ม", result.monthlyFullBags, "ถุง"],
    ["ต้นทุนกระบวนการ", csvNumber(result.monthlyProcessCost), currency],
    ["รายได้", csvNumber(result.monthlyRevenue), currency],
    ["Contribution", csvNumber(result.monthlyContribution), currency],
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
