export const EXPENSE_TRACKER_STORAGE_KEY = "meaw-expense-tracker-v1";
export const EXPENSE_TRACKER_MAX_TRANSACTIONS = 1_500;
export const EXPENSE_TRACKER_MAX_STORAGE_LENGTH = 2_000_000;
export const EXPENSE_TRACKER_MAX_IMPORT_LENGTH = 2_000_000;

export type ExpenseTrackerCurrency = "THB" | "USD" | "EUR" | "JPY" | "GBP";
export type ExpenseTransactionType = "expense" | "income";
export type ExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "bills"
  | "shopping"
  | "health"
  | "education"
  | "entertainment"
  | "debt"
  | "salary"
  | "freelance"
  | "business"
  | "investment"
  | "gift"
  | "refund"
  | "other";

export type ExpenseTransaction = {
  id: string;
  date: string;
  type: ExpenseTransactionType;
  amountMinor: number;
  category: ExpenseCategory;
  description: string;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type ExpenseTrackerState = {
  currency: ExpenseTrackerCurrency;
  transactions: ExpenseTransaction[];
};

export type ExpenseMonthSummary = {
  incomeMinor: number;
  expenseMinor: number;
  balanceMinor: number;
  savingsRate: number | null;
  transactionCount: number;
};

export type ExpenseCategoryTotal = {
  category: ExpenseCategory;
  amountMinor: number;
  sharePercent: number;
  transactionCount: number;
};

export type ExpenseMonthTrend = ExpenseMonthSummary & { month: string };

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: "อาหารและเครื่องดื่ม",
  transport: "เดินทาง",
  housing: "ที่อยู่อาศัย",
  bills: "ค่าน้ำไฟและบิล",
  shopping: "ช้อปปิ้ง",
  health: "สุขภาพ",
  education: "การศึกษา",
  entertainment: "บันเทิง",
  debt: "ชำระหนี้",
  salary: "เงินเดือน",
  freelance: "งานฟรีแลนซ์",
  business: "ธุรกิจ",
  investment: "การลงทุน",
  gift: "ของขวัญ",
  refund: "เงินคืน",
  other: "อื่น ๆ",
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "food", "transport", "housing", "bills", "shopping", "health", "education", "entertainment", "debt", "other",
];

export const INCOME_CATEGORIES: ExpenseCategory[] = [
  "salary", "freelance", "business", "investment", "gift", "refund", "other",
];

const CURRENCIES: ExpenseTrackerCurrency[] = ["THB", "USD", "EUR", "JPY", "GBP"];
const TYPES: ExpenseTransactionType[] = ["expense", "income"];
const ALL_CATEGORIES = new Set<ExpenseCategory>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]);

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

export function isExpenseDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isExpenseMonthKey(value: string): boolean {
  return /^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value);
}

export function expenseTrackerToday(nowMs = Date.now()): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftExpenseMonth(month: string, offset: number): string {
  if (!isExpenseMonthKey(month)) throw new Error("เดือนไม่ถูกต้อง");
  const parts = month.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const monthNumber = parts[1] ?? 1;
  const date = new Date(Date.UTC(year, monthNumber - 1 + Math.trunc(offset), 1));
  if (date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100) return month;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function amountToMinor(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000_000) throw new Error("จำนวนเงินต้องมากกว่า 0 และไม่เกินขอบเขตที่รองรับ");
  return Math.round((value + Number.EPSILON) * 100);
}

function safeTimestamp(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 946_684_800_000 && parsed <= 4_135_708_800_000 ? parsed : fallback;
}

export function normalizeExpenseTransaction(
  candidate: Partial<ExpenseTransaction>,
  index = 0,
  fallbackDate = expenseTrackerToday(),
  nowMs = Date.now(),
): ExpenseTransaction | null {
  const description = cleanText(candidate.description, 80);
  const type = typeof candidate.type === "string" && TYPES.includes(candidate.type as ExpenseTransactionType)
    ? candidate.type as ExpenseTransactionType
    : null;
  const amountMinor = Number(candidate.amountMinor);
  if (!description || !type || !Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 1_000_000_000_000) return null;
  const allowedCategories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const category = typeof candidate.category === "string" && ALL_CATEGORIES.has(candidate.category as ExpenseCategory) && allowedCategories.includes(candidate.category as ExpenseCategory)
    ? candidate.category as ExpenseCategory
    : "other";
  const createdAt = safeTimestamp(candidate.createdAt, nowMs);
  return {
    id: cleanText(candidate.id, 80) || `restored-${index}`,
    date: typeof candidate.date === "string" && isExpenseDateKey(candidate.date) && candidate.date <= fallbackDate ? candidate.date : fallbackDate,
    type,
    amountMinor,
    category,
    description,
    note: cleanText(candidate.note, 160),
    createdAt,
    updatedAt: Math.max(createdAt, safeTimestamp(candidate.updatedAt, createdAt)),
  };
}

export function createEmptyExpenseTrackerState(): ExpenseTrackerState {
  return { currency: "THB", transactions: [] };
}

export function parseExpenseTrackerState(raw: string | null, fallbackDate = expenseTrackerToday(), nowMs = Date.now()): ExpenseTrackerState {
  const empty = createEmptyExpenseTrackerState();
  if (!raw || raw.length > EXPENSE_TRACKER_MAX_STORAGE_LENGTH) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<ExpenseTrackerState>;
    const currency = typeof parsed.currency === "string" && CURRENCIES.includes(parsed.currency as ExpenseTrackerCurrency)
      ? parsed.currency as ExpenseTrackerCurrency
      : "THB";
    const transactions: ExpenseTransaction[] = [];
    const ids = new Set<string>();
    if (Array.isArray(parsed.transactions)) {
      for (const [index, candidate] of parsed.transactions.slice(0, EXPENSE_TRACKER_MAX_TRANSACTIONS).entries()) {
        if (!candidate || typeof candidate !== "object") continue;
        const transaction = normalizeExpenseTransaction(candidate as Partial<ExpenseTransaction>, index, fallbackDate, nowMs);
        if (!transaction || ids.has(transaction.id)) continue;
        ids.add(transaction.id);
        transactions.push(transaction);
      }
    }
    transactions.sort((left, right) => right.date.localeCompare(left.date) || right.updatedAt - left.updatedAt);
    return { currency, transactions };
  } catch {
    return empty;
  }
}

export function serializeExpenseTrackerState(state: ExpenseTrackerState): string {
  return JSON.stringify(parseExpenseTrackerState(JSON.stringify(state)));
}

export function transactionsForMonth(transactions: readonly ExpenseTransaction[], month: string): ExpenseTransaction[] {
  if (!isExpenseMonthKey(month)) return [];
  return transactions.filter((transaction) => transaction.date.startsWith(`${month}-`));
}

export function calculateExpenseMonthSummary(transactions: readonly ExpenseTransaction[]): ExpenseMonthSummary {
  const incomeMinor = transactions.reduce((total, transaction) => total + (transaction.type === "income" ? transaction.amountMinor : 0), 0);
  const expenseMinor = transactions.reduce((total, transaction) => total + (transaction.type === "expense" ? transaction.amountMinor : 0), 0);
  const balanceMinor = incomeMinor - expenseMinor;
  return {
    incomeMinor,
    expenseMinor,
    balanceMinor,
    savingsRate: incomeMinor > 0 ? Math.round((balanceMinor / incomeMinor) * 10_000) / 100 : null,
    transactionCount: transactions.length,
  };
}

export function expenseCategoryBreakdown(transactions: readonly ExpenseTransaction[]): ExpenseCategoryTotal[] {
  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  const total = expenses.reduce((sum, transaction) => sum + transaction.amountMinor, 0);
  const grouped = new Map<ExpenseCategory, { amountMinor: number; transactionCount: number }>();
  for (const transaction of expenses) {
    const current = grouped.get(transaction.category) ?? { amountMinor: 0, transactionCount: 0 };
    grouped.set(transaction.category, { amountMinor: current.amountMinor + transaction.amountMinor, transactionCount: current.transactionCount + 1 });
  }
  return [...grouped.entries()]
    .map(([category, value]) => ({ category, ...value, sharePercent: total > 0 ? Math.round((value.amountMinor / total) * 10_000) / 100 : 0 }))
    .sort((left, right) => right.amountMinor - left.amountMinor);
}

export function buildExpenseMonthTrend(transactions: readonly ExpenseTransaction[], endMonth: string, months = 6): ExpenseMonthTrend[] {
  if (!isExpenseMonthKey(endMonth)) return [];
  const safeMonths = Math.min(24, Math.max(1, Math.trunc(months)));
  return Array.from({ length: safeMonths }, (_, index) => {
    const month = shiftExpenseMonth(endMonth, index - safeMonths + 1);
    return { month, ...calculateExpenseMonthSummary(transactionsForMonth(transactions, month)) };
  });
}

function safeSpreadsheetCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const text = safeSpreadsheetCell(String(value));
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildExpenseTrackerCsv(state: ExpenseTrackerState, month?: string): string {
  const source = month && isExpenseMonthKey(month) ? transactionsForMonth(state.transactions, month) : state.transactions;
  const rows: Array<Array<string | number>> = [
    ["Date", "Type", "Category", "Description", "Note", "Amount", "Currency"],
    ...source.map((transaction) => [
      transaction.date,
      transaction.type === "income" ? "Income" : "Expense",
      EXPENSE_CATEGORY_LABELS[transaction.category],
      transaction.description,
      transaction.note,
      (transaction.amountMinor / 100).toFixed(2),
      state.currency,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
