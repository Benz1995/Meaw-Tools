export const BUDGET_MAX_INCOME_ITEMS = 12;
export const BUDGET_MAX_EXPENSE_ITEMS = 50;

export type BudgetCurrency = "THB" | "USD" | "EUR" | "JPY" | "GBP";
export type BudgetFrequency = "weekly" | "biweekly" | "twice-monthly" | "monthly" | "quarterly" | "yearly";
export type BudgetCategory = "needs" | "wants" | "savings-debt";

export type BudgetIncomeItem = {
  name: string;
  amount: number;
  frequency: BudgetFrequency;
};

export type BudgetExpenseItem = BudgetIncomeItem & {
  category: BudgetCategory;
};

export type BudgetTargets = {
  needs: number;
  wants: number;
  savingsDebt: number;
};

export type BudgetInput = {
  currency: BudgetCurrency;
  householdName: string;
  income: BudgetIncomeItem[];
  expenses: BudgetExpenseItem[];
  targets: BudgetTargets;
};

export type NormalizedBudgetItem = {
  name: string;
  amount: number;
  frequency: BudgetFrequency;
  weekly: number;
  monthly: number;
  annual: number;
};

export type NormalizedBudgetExpense = NormalizedBudgetItem & {
  category: BudgetCategory;
};

export type BudgetBucketResult = {
  category: BudgetCategory;
  monthly: number;
  annual: number;
  shareOfIncome: number;
  targetPercent: number;
  targetMonthly: number;
  targetGap: number;
};

export type BudgetResult = {
  income: NormalizedBudgetItem[];
  expenses: NormalizedBudgetExpense[];
  buckets: Record<BudgetCategory, BudgetBucketResult>;
  weeklyIncome: number;
  monthlyIncome: number;
  annualIncome: number;
  weeklyExpenses: number;
  monthlyExpenses: number;
  annualExpenses: number;
  weeklyBalance: number;
  monthlyBalance: number;
  annualBalance: number;
  plannedPercent: number;
};

const frequencyMultipliers: Record<BudgetFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  "twice-monthly": 24,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export const budgetFrequencyLabels: Record<BudgetFrequency, string> = {
  weekly: "รายสัปดาห์",
  biweekly: "ทุก 2 สัปดาห์",
  "twice-monthly": "เดือนละ 2 ครั้ง",
  monthly: "รายเดือน",
  quarterly: "รายไตรมาส",
  yearly: "รายปี",
};

export const budgetCategoryLabels: Record<BudgetCategory, string> = {
  needs: "ค่าใช้จ่ายจำเป็น",
  wants: "ค่าใช้จ่ายตามใจ",
  "savings-debt": "ออมเงินและจ่ายหนี้เพิ่ม",
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function assertText(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`กรุณากรอก${label}`);
  if (trimmed.length > 80) throw new Error(`${label}ต้องไม่เกิน 80 ตัวอักษร`);
  return trimmed;
}

function assertAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label}ต้องมากกว่า 0`);
  if (value > 1_000_000_000_000) throw new Error(`${label}สูงเกินขอบเขตที่รองรับ`);
  return value;
}

function normalizeItem(item: BudgetIncomeItem, label: string): NormalizedBudgetItem {
  const name = assertText(item.name, `ชื่อ${label}`);
  const amount = assertAmount(item.amount, `ยอด${label} ${name}`);
  if (!Object.hasOwn(frequencyMultipliers, item.frequency)) throw new Error(`รอบของ${label} ${name} ไม่รองรับ`);
  const annual = amount * frequencyMultipliers[item.frequency];
  return {
    name,
    amount: round(amount),
    frequency: item.frequency,
    weekly: round(annual / 52),
    monthly: round(annual / 12),
    annual: round(annual),
  };
}

function sum(items: readonly number[]) {
  return round(items.reduce((total, value) => total + value, 0));
}

function percent(value: number, total: number) {
  return total > 0 ? round((value / total) * 100) : 0;
}

export function calculateBudget(input: BudgetInput): BudgetResult {
  if (input.householdName.trim().length > 80) throw new Error("ชื่องบต้องไม่เกิน 80 ตัวอักษร");
  if (!input.income.length) throw new Error("กรุณาเพิ่มรายรับอย่างน้อย 1 รายการ");
  if (!input.expenses.length) throw new Error("กรุณาเพิ่มรายจ่ายอย่างน้อย 1 รายการ");
  if (input.income.length > BUDGET_MAX_INCOME_ITEMS) throw new Error(`รายรับต้องไม่เกิน ${BUDGET_MAX_INCOME_ITEMS} รายการ`);
  if (input.expenses.length > BUDGET_MAX_EXPENSE_ITEMS) throw new Error(`รายจ่ายต้องไม่เกิน ${BUDGET_MAX_EXPENSE_ITEMS} รายการ`);

  const targetValues = [input.targets.needs, input.targets.wants, input.targets.savingsDebt];
  if (targetValues.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("สัดส่วนเป้าหมายแต่ละหมวดต้องอยู่ระหว่าง 0–100%");
  }
  if (Math.abs(targetValues.reduce((total, value) => total + value, 0) - 100) > 0.001) {
    throw new Error("สัดส่วนเป้าหมายทั้ง 3 หมวดต้องรวม 100%");
  }

  const income = input.income.map((item) => normalizeItem(item, "รายรับ"));
  const categories: BudgetCategory[] = ["needs", "wants", "savings-debt"];
  const expenses = input.expenses.map((item) => {
    if (!categories.includes(item.category)) throw new Error(`หมวดของรายจ่าย ${item.name.trim() || "ไม่ระบุชื่อ"} ไม่รองรับ`);
    return { ...normalizeItem(item, "รายจ่าย"), category: item.category };
  });

  const annualIncome = sum(income.map((item) => item.annual));
  const annualExpenses = sum(expenses.map((item) => item.annual));
  const monthlyIncome = round(annualIncome / 12);
  const monthlyExpenses = round(annualExpenses / 12);
  const weeklyIncome = round(annualIncome / 52);
  const weeklyExpenses = round(annualExpenses / 52);

  const targets: Record<BudgetCategory, number> = {
    needs: input.targets.needs,
    wants: input.targets.wants,
    "savings-debt": input.targets.savingsDebt,
  };
  const buckets = Object.fromEntries(categories.map((category) => {
    const annual = sum(expenses.filter((item) => item.category === category).map((item) => item.annual));
    const monthly = round(annual / 12);
    const targetMonthly = round(monthlyIncome * targets[category] / 100);
    return [category, {
      category,
      monthly,
      annual,
      shareOfIncome: percent(monthly, monthlyIncome),
      targetPercent: targets[category],
      targetMonthly,
      targetGap: round(targetMonthly - monthly),
    } satisfies BudgetBucketResult];
  })) as Record<BudgetCategory, BudgetBucketResult>;

  return {
    income,
    expenses,
    buckets,
    weeklyIncome,
    monthlyIncome,
    annualIncome,
    weeklyExpenses,
    monthlyExpenses,
    annualExpenses,
    weeklyBalance: round(weeklyIncome - weeklyExpenses),
    monthlyBalance: round(monthlyIncome - monthlyExpenses),
    annualBalance: round(annualIncome - annualExpenses),
    plannedPercent: percent(monthlyExpenses, monthlyIncome),
  };
}

function csvCell(value: string | number) {
  const raw = String(value);
  const isNumeric = /^-?\d+(?:\.\d+)?$/.test(raw);
  const safe = !isNumeric && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csvRow(values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

export function budgetCsv(input: BudgetInput, result: BudgetResult) {
  const rows: Array<Array<string | number>> = [
    ["Budget Calculator", "Value", "Currency / Unit"],
    ["Household", input.householdName.trim() || "Personal budget", ""],
    ["Monthly income", result.monthlyIncome.toFixed(2), input.currency],
    ["Monthly planned outflow", result.monthlyExpenses.toFixed(2), input.currency],
    ["Monthly balance", result.monthlyBalance.toFixed(2), input.currency],
    ["Annual income", result.annualIncome.toFixed(2), input.currency],
    ["Annual planned outflow", result.annualExpenses.toFixed(2), input.currency],
    ["Annual balance", result.annualBalance.toFixed(2), input.currency],
    [],
    ["Category", "Monthly", "Annual", "Share of income (%)", "Target (%)", "Target monthly", "Target gap"],
    ...(["needs", "wants", "savings-debt"] as BudgetCategory[]).map((category) => {
      const bucket = result.buckets[category];
      return [budgetCategoryLabels[category], bucket.monthly.toFixed(2), bucket.annual.toFixed(2), bucket.shareOfIncome.toFixed(2), bucket.targetPercent.toFixed(2), bucket.targetMonthly.toFixed(2), bucket.targetGap.toFixed(2)];
    }),
    [],
    ["Type", "Name", "Category", "Entered amount", "Frequency", "Weekly", "Monthly", "Annual"],
    ...result.income.map((item) => ["Income", item.name, "", item.amount.toFixed(2), budgetFrequencyLabels[item.frequency], item.weekly.toFixed(2), item.monthly.toFixed(2), item.annual.toFixed(2)]),
    ...result.expenses.map((item) => ["Expense", item.name, budgetCategoryLabels[item.category], item.amount.toFixed(2), budgetFrequencyLabels[item.frequency], item.weekly.toFixed(2), item.monthly.toFixed(2), item.annual.toFixed(2)]),
  ];
  return `\uFEFF${rows.map(csvRow).join("\r\n")}`;
}
