export const WHOLESALE_PRICING_MAX_CHANNELS = 6;
export const WHOLESALE_PRICING_MAX_AMOUNT = 1_000_000_000_000;
const MAX_RESULT = 1_000_000_000_000_000;

export type WholesalePricingCurrency = "THB" | "USD" | "EUR" | "JPY" | "GBP";

export type WholesalePricingCosts = {
  materials: number;
  packaging: number;
  labor: number;
  fulfillment: number;
  inbound: number;
  overhead: number;
  other: number;
};

export type WholesalePricingChannel = {
  name: string;
  orderQuantity: number;
  variableFeePercent: number;
  fixedFeePerOrder: number;
  fixedFeePerUnit: number;
  targetMarginPercent: number;
  downstreamMarginPercent: number;
};

export type WholesalePricingInput = {
  currency: WholesalePricingCurrency;
  productName: string;
  costs: WholesalePricingCosts;
  channels: WholesalePricingChannel[];
};

export type WholesalePricingChannelResult = WholesalePricingChannel & {
  rank: number;
  unitCost: number;
  allocatedOrderFeePerUnit: number;
  breakEvenPrice: number;
  requiredPrice: number;
  variableFeePerUnit: number;
  totalFeePerUnit: number;
  profitPerUnit: number;
  actualMarginPercent: number;
  markupPercent: number;
  orderRevenue: number;
  orderCost: number;
  orderFees: number;
  orderProfit: number;
  suggestedRetailPrice: number | null;
  downstreamProfitPerUnit: number | null;
  differenceFromLowest: number;
  differenceFromLowestPercent: number;
  isLowestRequiredPrice: boolean;
};

export type WholesalePricingResult = {
  unitCost: number;
  channels: WholesalePricingChannelResult[];
  lowestRequiredPrice: number;
  highestRequiredPrice: number;
  priceSpread: number;
  priceSpreadPercent: number;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขและเปอร์เซ็นต์อีกครั้ง");
  }
}

function validateInput(input: WholesalePricingInput) {
  if (!["THB", "USD", "EUR", "JPY", "GBP"].includes(input.currency)) throw new Error("สกุลเงินไม่ถูกต้อง");
  if (!input.productName.trim()) throw new Error("กรุณากรอกชื่อสินค้า");
  if (input.productName.trim().length > 120) throw new Error("ชื่อสินค้าต้องไม่เกิน 120 ตัวอักษร");

  const costEntries = Object.entries(input.costs) as Array<[keyof WholesalePricingCosts, number]>;
  const costLabels: Record<keyof WholesalePricingCosts, string> = {
    materials: "วัตถุดิบหรือราคาซื้อ",
    packaging: "บรรจุภัณฑ์",
    labor: "แรงงาน",
    fulfillment: "จัดเตรียมและส่งมอบ",
    inbound: "ขนส่งเข้าและอากร",
    overhead: "ค่าใช้จ่ายจัดสรร",
    other: "ต้นทุนอื่น",
  };
  costEntries.forEach(([key, value]) => assertRange(value, costLabels[key], 0, WHOLESALE_PRICING_MAX_AMOUNT));
  const unitCost = costEntries.reduce((sum, [, value]) => sum + value, 0);
  if (unitCost <= 0) throw new Error("ต้นทุนรวมต่อหน่วยต้องมากกว่า 0");

  if (input.channels.length < 1 || input.channels.length > WHOLESALE_PRICING_MAX_CHANNELS) {
    throw new Error(`ช่องทางขายต้องมี 1–${WHOLESALE_PRICING_MAX_CHANNELS} ช่องทาง`);
  }
  input.channels.forEach((channel, index) => {
    const prefix = `ช่องทาง ${index + 1}`;
    if (!channel.name.trim()) throw new Error(`กรุณากรอกชื่อ${prefix}`);
    if (channel.name.trim().length > 80) throw new Error(`ชื่อ${prefix}ต้องไม่เกิน 80 ตัวอักษร`);
    assertRange(channel.orderQuantity, `จำนวนต่อ Order ของ${prefix}`, 1, 1_000_000_000);
    if (!Number.isInteger(channel.orderQuantity)) throw new Error(`จำนวนต่อ Order ของ${prefix}ต้องเป็นจำนวนเต็ม`);
    assertRange(channel.variableFeePercent, `ค่าธรรมเนียมเปอร์เซ็นต์ของ${prefix}`, 0, 99);
    assertRange(channel.fixedFeePerOrder, `ค่าธรรมเนียมคงที่ต่อ Order ของ${prefix}`, 0, WHOLESALE_PRICING_MAX_AMOUNT);
    assertRange(channel.fixedFeePerUnit, `ค่าธรรมเนียมคงที่ต่อหน่วยของ${prefix}`, 0, WHOLESALE_PRICING_MAX_AMOUNT);
    assertRange(channel.targetMarginPercent, `กำไรเป้าหมายของ${prefix}`, 0, 99);
    assertRange(channel.downstreamMarginPercent, `Margin ร้านคู่ค้าของ${prefix}`, 0, 99);
    if (channel.variableFeePercent + channel.targetMarginPercent >= 100) {
      throw new Error(`ค่าธรรมเนียมเปอร์เซ็นต์รวมกับกำไรเป้าหมายของ${prefix}ต้องน้อยกว่า 100%`);
    }
  });
}

export function calculateWholesalePricing(input: WholesalePricingInput): WholesalePricingResult {
  validateInput(input);
  const unitCost = Object.values(input.costs).reduce((sum, value) => sum + value, 0);
  assertResult(unitCost);

  const preliminary = input.channels.map((channel, originalIndex) => {
    const variableFeeRate = channel.variableFeePercent / 100;
    const targetMarginRate = channel.targetMarginPercent / 100;
    const allocatedOrderFeePerUnit = channel.fixedFeePerOrder / channel.orderQuantity;
    const fixedBurdenPerUnit = channel.fixedFeePerUnit + allocatedOrderFeePerUnit;
    const breakEvenPrice = (unitCost + fixedBurdenPerUnit) / (1 - variableFeeRate);
    const requiredPrice = (unitCost + fixedBurdenPerUnit) / (1 - variableFeeRate - targetMarginRate);
    const variableFeePerUnit = requiredPrice * variableFeeRate;
    const totalFeePerUnit = variableFeePerUnit + fixedBurdenPerUnit;
    const profitPerUnit = requiredPrice - unitCost - totalFeePerUnit;
    const actualMarginPercent = profitPerUnit / requiredPrice * 100;
    const markupPercent = profitPerUnit / unitCost * 100;
    const orderRevenue = requiredPrice * channel.orderQuantity;
    const orderCost = unitCost * channel.orderQuantity;
    const orderFees = totalFeePerUnit * channel.orderQuantity;
    const orderProfit = profitPerUnit * channel.orderQuantity;
    const suggestedRetailPrice = channel.downstreamMarginPercent > 0
      ? requiredPrice / (1 - channel.downstreamMarginPercent / 100)
      : null;
    const downstreamProfitPerUnit = suggestedRetailPrice === null ? null : suggestedRetailPrice - requiredPrice;

    [allocatedOrderFeePerUnit, breakEvenPrice, requiredPrice, variableFeePerUnit, totalFeePerUnit, profitPerUnit,
      actualMarginPercent, markupPercent, orderRevenue, orderCost, orderFees, orderProfit,
      suggestedRetailPrice ?? 0, downstreamProfitPerUnit ?? 0].forEach(assertResult);

    return {
      ...channel,
      name: channel.name.trim(),
      originalIndex,
      unitCost,
      allocatedOrderFeePerUnit,
      breakEvenPrice,
      requiredPrice,
      variableFeePerUnit,
      totalFeePerUnit,
      profitPerUnit,
      actualMarginPercent,
      markupPercent,
      orderRevenue,
      orderCost,
      orderFees,
      orderProfit,
      suggestedRetailPrice,
      downstreamProfitPerUnit,
    };
  });

  const ranked = [...preliminary].sort((a, b) => a.requiredPrice - b.requiredPrice || a.originalIndex - b.originalIndex);
  const rankByOriginalIndex = new Map(ranked.map((channel, index) => [channel.originalIndex, index + 1]));
  const lowestRequiredPrice = ranked[0]!.requiredPrice;
  const highestRequiredPrice = ranked.at(-1)!.requiredPrice;
  const priceSpread = highestRequiredPrice - lowestRequiredPrice;
  const priceSpreadPercent = priceSpread / lowestRequiredPrice * 100;
  [lowestRequiredPrice, highestRequiredPrice, priceSpread, priceSpreadPercent].forEach(assertResult);

  return {
    unitCost,
    channels: preliminary.map(({ originalIndex, ...channel }) => ({
      ...channel,
      rank: rankByOriginalIndex.get(originalIndex)!,
      differenceFromLowest: channel.requiredPrice - lowestRequiredPrice,
      differenceFromLowestPercent: (channel.requiredPrice - lowestRequiredPrice) / lowestRequiredPrice * 100,
      isLowestRequiredPrice: channel.requiredPrice === lowestRequiredPrice,
    })),
    lowestRequiredPrice,
    highestRequiredPrice,
    priceSpread,
    priceSpreadPercent,
  };
}

function csvSafeText(value: string) {
  const trimmed = value.trim();
  return /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number | null) {
  return value === null ? "Not provided" : value.toFixed(4);
}

export function wholesalePricingCsv(input: WholesalePricingInput, result: WholesalePricingResult) {
  const costRows: Array<[string, number, string]> = [
    ["Materials / purchase", input.costs.materials, `${input.currency}/unit`],
    ["Packaging", input.costs.packaging, `${input.currency}/unit`],
    ["Labor", input.costs.labor, `${input.currency}/unit`],
    ["Fulfillment", input.costs.fulfillment, `${input.currency}/unit`],
    ["Inbound freight / duty", input.costs.inbound, `${input.currency}/unit`],
    ["Allocated overhead", input.costs.overhead, `${input.currency}/unit`],
    ["Other cost", input.costs.other, `${input.currency}/unit`],
  ];
  const rows: Array<Array<string | number>> = [
    ["Wholesale & Retail Price Calculator", "Value", "Unit"],
    ["Product", csvSafeText(input.productName), ""],
    ["Currency", input.currency, ""],
    ...costRows.map(([label, value, unit]) => [label, csvNumber(value), unit]),
    ["Total unit cost", csvNumber(result.unitCost), `${input.currency}/unit`],
    [],
    ["Channel", "Order quantity", "Variable fee %", "Fixed fee/order", "Fixed fee/unit", "Target seller margin %", "Downstream margin %", "Break-even price", "Required price", "Fees/unit", "Seller profit/unit", "Seller margin %", "Markup %", "Order revenue", "Order fees", "Order profit", "Suggested retail price"],
    ...result.channels.map((channel) => [
      csvSafeText(channel.name),
      channel.orderQuantity,
      csvNumber(channel.variableFeePercent),
      csvNumber(channel.fixedFeePerOrder),
      csvNumber(channel.fixedFeePerUnit),
      csvNumber(channel.targetMarginPercent),
      csvNumber(channel.downstreamMarginPercent),
      csvNumber(channel.breakEvenPrice),
      csvNumber(channel.requiredPrice),
      csvNumber(channel.totalFeePerUnit),
      csvNumber(channel.profitPerUnit),
      csvNumber(channel.actualMarginPercent),
      csvNumber(channel.markupPercent),
      csvNumber(channel.orderRevenue),
      csvNumber(channel.orderFees),
      csvNumber(channel.orderProfit),
      csvNumber(channel.suggestedRetailPrice),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
