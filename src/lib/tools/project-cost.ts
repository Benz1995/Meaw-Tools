export const PROJECT_COST_MAX_MONEY = 1_000_000_000_000;
export const PROJECT_COST_MAX_RESULT = 1_000_000_000_000_000;
export const PROJECT_COST_MAX_HOURS = 1_000_000;
export const PROJECT_COST_MAX_LABOR_ITEMS = 20;
export const PROJECT_COST_MAX_DIRECT_ITEMS = 30;

export type ProjectLaborItem = {
  label: string;
  hourlyCost: number;
  budgetHours: number;
  actualHours: number;
  remainingHours: number;
};

export type ProjectDirectCostItem = {
  label: string;
  budgetCost: number;
  actualCost: number;
  remainingCost: number;
};

export type ProjectCostInput = {
  baseRevenue: number;
  approvedChangeRevenue: number;
  targetMarginPercent: number;
  laborItems: ProjectLaborItem[];
  directCostItems: ProjectDirectCostItem[];
  budgetOverhead: number;
  actualOverhead: number;
  remainingOverhead: number;
};

export type ProjectLaborResult = ProjectLaborItem & {
  budgetCost: number;
  actualCost: number;
  remainingCost: number;
  forecastHours: number;
  forecastCost: number;
  hoursVariance: number;
  costVariance: number;
};

export type ProjectDirectCostResult = ProjectDirectCostItem & {
  forecastCost: number;
  costVariance: number;
};

export type ProjectCostSnapshot = {
  laborHours: number;
  laborCost: number;
  directCost: number;
  overhead: number;
  totalCost: number;
};

export type ProjectCostResult = {
  laborItems: ProjectLaborResult[];
  directCostItems: ProjectDirectCostResult[];
  currentRevenue: number;
  budget: ProjectCostSnapshot & { revenue: number; profit: number; marginPercent: number };
  actual: ProjectCostSnapshot;
  remaining: ProjectCostSnapshot;
  forecast: ProjectCostSnapshot & { revenue: number; profit: number; marginPercent: number };
  variance: ProjectCostSnapshot & {
    revenue: number;
    profit: number;
    marginPoints: number;
  };
  target: {
    marginPercent: number;
    maximumCost: number;
    costHeadroom: number;
    additionalRevenueNeeded: number;
  };
  averageForecastCostPerLaborHour: number | null;
  effectiveRevenuePerLaborHour: number | null;
  breakEvenRevenue: number;
};

function assertRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function assertResult(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > PROJECT_COST_MAX_RESULT) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่เครื่องมือรองรับ กรุณาตรวจตัวเลขอีกครั้ง");
  }
}

function normalizeLabel(value: string, fallback: string, index: number) {
  const label = value.trim() || `${fallback} ${index + 1}`;
  if (label.length > 80) throw new Error(`ชื่อ${fallback}ที่ ${index + 1} ต้องไม่เกิน 80 ตัวอักษร`);
  return label;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function marginPercent(revenue: number, profit: number) {
  return revenue > 0 ? profit / revenue * 100 : 0;
}

export function calculateProjectCost(input: ProjectCostInput): ProjectCostResult {
  assertRange(input.baseRevenue, "รายรับตามสัญญาเดิม", 0.01, PROJECT_COST_MAX_MONEY);
  assertRange(input.approvedChangeRevenue, "รายรับจากงานเพิ่มที่อนุมัติแล้ว", 0, PROJECT_COST_MAX_MONEY);
  assertRange(input.targetMarginPercent, "เป้าหมาย Margin", 0, 99.9);
  assertRange(input.budgetOverhead, "Overhead ตามงบ", 0, PROJECT_COST_MAX_MONEY);
  assertRange(input.actualOverhead, "Overhead ที่เกิดแล้ว", 0, PROJECT_COST_MAX_MONEY);
  assertRange(input.remainingOverhead, "Overhead ที่คาดว่าจะเหลือ", 0, PROJECT_COST_MAX_MONEY);

  if (!Array.isArray(input.laborItems) || input.laborItems.length < 1 || input.laborItems.length > PROJECT_COST_MAX_LABOR_ITEMS) {
    throw new Error(`ต้องมีรายการแรงงาน 1 ถึง ${PROJECT_COST_MAX_LABOR_ITEMS} รายการ`);
  }
  if (!Array.isArray(input.directCostItems) || input.directCostItems.length < 1 || input.directCostItems.length > PROJECT_COST_MAX_DIRECT_ITEMS) {
    throw new Error(`ต้องมีต้นทุนตรง 1 ถึง ${PROJECT_COST_MAX_DIRECT_ITEMS} รายการ`);
  }

  const laborItems = input.laborItems.map((item, index): ProjectLaborResult => {
    const label = normalizeLabel(item.label, "บทบาท", index);
    assertRange(item.hourlyCost, `ต้นทุนต่อชั่วโมงของบทบาทที่ ${index + 1}`, 0, PROJECT_COST_MAX_MONEY);
    assertRange(item.budgetHours, `ชั่วโมงตามงบของบทบาทที่ ${index + 1}`, 0, PROJECT_COST_MAX_HOURS);
    assertRange(item.actualHours, `ชั่วโมงที่ใช้แล้วของบทบาทที่ ${index + 1}`, 0, PROJECT_COST_MAX_HOURS);
    assertRange(item.remainingHours, `ชั่วโมงที่คาดว่าจะเหลือของบทบาทที่ ${index + 1}`, 0, PROJECT_COST_MAX_HOURS);
    const budgetCost = item.budgetHours * item.hourlyCost;
    const actualCost = item.actualHours * item.hourlyCost;
    const remainingCost = item.remainingHours * item.hourlyCost;
    const forecastHours = item.actualHours + item.remainingHours;
    const forecastCost = actualCost + remainingCost;
    [budgetCost, actualCost, remainingCost, forecastCost].forEach(assertResult);
    return {
      ...item,
      label,
      budgetCost,
      actualCost,
      remainingCost,
      forecastHours,
      forecastCost,
      hoursVariance: forecastHours - item.budgetHours,
      costVariance: forecastCost - budgetCost,
    };
  });

  const directCostItems = input.directCostItems.map((item, index): ProjectDirectCostResult => {
    const label = normalizeLabel(item.label, "ต้นทุนตรง", index);
    assertRange(item.budgetCost, `ต้นทุนตรงตามงบรายการที่ ${index + 1}`, 0, PROJECT_COST_MAX_MONEY);
    assertRange(item.actualCost, `ต้นทุนตรงที่เกิดแล้วรายการที่ ${index + 1}`, 0, PROJECT_COST_MAX_MONEY);
    assertRange(item.remainingCost, `ต้นทุนตรงที่คาดว่าจะเหลือรายการที่ ${index + 1}`, 0, PROJECT_COST_MAX_MONEY);
    const forecastCost = item.actualCost + item.remainingCost;
    [forecastCost].forEach(assertResult);
    return { ...item, label, forecastCost, costVariance: forecastCost - item.budgetCost };
  });

  const budgetLaborHours = sum(laborItems.map((item) => item.budgetHours));
  const actualLaborHours = sum(laborItems.map((item) => item.actualHours));
  const remainingLaborHours = sum(laborItems.map((item) => item.remainingHours));
  const forecastLaborHours = actualLaborHours + remainingLaborHours;
  const budgetLaborCost = sum(laborItems.map((item) => item.budgetCost));
  const actualLaborCost = sum(laborItems.map((item) => item.actualCost));
  const remainingLaborCost = sum(laborItems.map((item) => item.remainingCost));
  const forecastLaborCost = actualLaborCost + remainingLaborCost;
  const budgetDirectCost = sum(directCostItems.map((item) => item.budgetCost));
  const actualDirectCost = sum(directCostItems.map((item) => item.actualCost));
  const remainingDirectCost = sum(directCostItems.map((item) => item.remainingCost));
  const forecastDirectCost = actualDirectCost + remainingDirectCost;
  const currentRevenue = input.baseRevenue + input.approvedChangeRevenue;

  const budgetTotalCost = budgetLaborCost + budgetDirectCost + input.budgetOverhead;
  const actualTotalCost = actualLaborCost + actualDirectCost + input.actualOverhead;
  const remainingTotalCost = remainingLaborCost + remainingDirectCost + input.remainingOverhead;
  const forecastTotalCost = actualTotalCost + remainingTotalCost;
  const budgetProfit = input.baseRevenue - budgetTotalCost;
  const forecastProfit = currentRevenue - forecastTotalCost;
  const budgetMarginPercent = marginPercent(input.baseRevenue, budgetProfit);
  const forecastMarginPercent = marginPercent(currentRevenue, forecastProfit);
  const maximumCost = currentRevenue * (1 - input.targetMarginPercent / 100);
  const additionalRevenueNeeded = Math.max(0, forecastTotalCost / (1 - input.targetMarginPercent / 100) - currentRevenue);

  [
    budgetLaborHours, actualLaborHours, remainingLaborHours, forecastLaborHours,
    budgetLaborCost, actualLaborCost, remainingLaborCost, forecastLaborCost,
    budgetDirectCost, actualDirectCost, remainingDirectCost, forecastDirectCost,
    currentRevenue, budgetTotalCost, actualTotalCost, remainingTotalCost,
    forecastTotalCost, budgetProfit, forecastProfit, maximumCost, additionalRevenueNeeded,
  ].forEach(assertResult);

  return {
    laborItems,
    directCostItems,
    currentRevenue,
    budget: {
      revenue: input.baseRevenue,
      laborHours: budgetLaborHours,
      laborCost: budgetLaborCost,
      directCost: budgetDirectCost,
      overhead: input.budgetOverhead,
      totalCost: budgetTotalCost,
      profit: budgetProfit,
      marginPercent: budgetMarginPercent,
    },
    actual: {
      laborHours: actualLaborHours,
      laborCost: actualLaborCost,
      directCost: actualDirectCost,
      overhead: input.actualOverhead,
      totalCost: actualTotalCost,
    },
    remaining: {
      laborHours: remainingLaborHours,
      laborCost: remainingLaborCost,
      directCost: remainingDirectCost,
      overhead: input.remainingOverhead,
      totalCost: remainingTotalCost,
    },
    forecast: {
      revenue: currentRevenue,
      laborHours: forecastLaborHours,
      laborCost: forecastLaborCost,
      directCost: forecastDirectCost,
      overhead: input.actualOverhead + input.remainingOverhead,
      totalCost: forecastTotalCost,
      profit: forecastProfit,
      marginPercent: forecastMarginPercent,
    },
    variance: {
      revenue: input.approvedChangeRevenue,
      laborHours: forecastLaborHours - budgetLaborHours,
      laborCost: forecastLaborCost - budgetLaborCost,
      directCost: forecastDirectCost - budgetDirectCost,
      overhead: input.actualOverhead + input.remainingOverhead - input.budgetOverhead,
      totalCost: forecastTotalCost - budgetTotalCost,
      profit: forecastProfit - budgetProfit,
      marginPoints: forecastMarginPercent - budgetMarginPercent,
    },
    target: {
      marginPercent: input.targetMarginPercent,
      maximumCost,
      costHeadroom: maximumCost - forecastTotalCost,
      additionalRevenueNeeded,
    },
    averageForecastCostPerLaborHour: forecastLaborHours > 0 ? forecastTotalCost / forecastLaborHours : null,
    effectiveRevenuePerLaborHour: forecastLaborHours > 0 ? currentRevenue / forecastLaborHours : null,
    breakEvenRevenue: forecastTotalCost,
  };
}

function spreadsheetSafeText(value: string) {
  const singleLine = value.replace(/[\r\n]+/g, " ");
  return /^[=+\-@\t]/.test(singleLine) ? `'${singleLine}` : singleLine;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function csvNumber(value: number) {
  return value.toFixed(2);
}

export function projectCostCsv(input: ProjectCostInput, result: ProjectCostResult, currency: string) {
  const rows: Array<Array<string | number>> = [
    ["สรุปโครงการ", "ตามงบ", "เกิดแล้ว", "คาดว่าเหลือ", "คาดการณ์จบงาน", "ส่วนต่าง Forecast - Budget", "หน่วย"],
    ["รายรับ", csvNumber(result.budget.revenue), "", "", csvNumber(result.forecast.revenue), csvNumber(result.variance.revenue), currency],
    ["ชั่วโมงแรงงาน", csvNumber(result.budget.laborHours), csvNumber(result.actual.laborHours), csvNumber(result.remaining.laborHours), csvNumber(result.forecast.laborHours), csvNumber(result.variance.laborHours), "ชั่วโมง"],
    ["ต้นทุนแรงงาน", csvNumber(result.budget.laborCost), csvNumber(result.actual.laborCost), csvNumber(result.remaining.laborCost), csvNumber(result.forecast.laborCost), csvNumber(result.variance.laborCost), currency],
    ["ต้นทุนตรง", csvNumber(result.budget.directCost), csvNumber(result.actual.directCost), csvNumber(result.remaining.directCost), csvNumber(result.forecast.directCost), csvNumber(result.variance.directCost), currency],
    ["Overhead", csvNumber(result.budget.overhead), csvNumber(result.actual.overhead), csvNumber(result.remaining.overhead), csvNumber(result.forecast.overhead), csvNumber(result.variance.overhead), currency],
    ["ต้นทุนรวม", csvNumber(result.budget.totalCost), csvNumber(result.actual.totalCost), csvNumber(result.remaining.totalCost), csvNumber(result.forecast.totalCost), csvNumber(result.variance.totalCost), currency],
    ["กำไร", csvNumber(result.budget.profit), "", "", csvNumber(result.forecast.profit), csvNumber(result.variance.profit), currency],
    ["Margin", csvNumber(result.budget.marginPercent), "", "", csvNumber(result.forecast.marginPercent), csvNumber(result.variance.marginPoints), "% / จุดเปอร์เซ็นต์"],
    ["เป้าหมาย Margin", "", "", "", csvNumber(input.targetMarginPercent), "", "%"],
    ["ต้นทุนสูงสุดที่เป้า", "", "", "", csvNumber(result.target.maximumCost), csvNumber(result.target.costHeadroom), currency],
    ["รายรับเพิ่มที่ต้องมีเพื่อถึงเป้า", "", "", "", csvNumber(result.target.additionalRevenueNeeded), "", currency],
    [],
    ["แรงงาน/บทบาท", "ต้นทุนต่อชั่วโมง", "ชั่วโมงตามงบ", "ใช้แล้ว", "คาดว่าเหลือ", "Forecast ชั่วโมง", "Budget ต้นทุน", "Forecast ต้นทุน", "ส่วนต่างต้นทุน", "สกุลเงิน"],
    ...result.laborItems.map((item) => [
      spreadsheetSafeText(item.label), csvNumber(item.hourlyCost), csvNumber(item.budgetHours), csvNumber(item.actualHours), csvNumber(item.remainingHours), csvNumber(item.forecastHours), csvNumber(item.budgetCost), csvNumber(item.forecastCost), csvNumber(item.costVariance), currency,
    ]),
    [],
    ["ต้นทุนตรง", "ตามงบ", "เกิดแล้ว", "คาดว่าเหลือ", "Forecast", "ส่วนต่าง", "สกุลเงิน"],
    ...result.directCostItems.map((item) => [
      spreadsheetSafeText(item.label), csvNumber(item.budgetCost), csvNumber(item.actualCost), csvNumber(item.remainingCost), csvNumber(item.forecastCost), csvNumber(item.costVariance), currency,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
