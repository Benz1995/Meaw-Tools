export type DebtCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";

export type DebtStrategy = "avalanche" | "snowball";

export type DebtInput = {
  name: string;
  balance: number;
  annualInterestRatePercent: number;
  minimumPayment: number;
};

export type DebtPayoffInput = {
  currency: DebtCurrency;
  planName: string;
  startMonth: string;
  extraMonthlyPayment: number;
  debts: DebtInput[];
};

export type DebtPayoffMilestone = {
  debtIndex: number;
  name: string;
  payoffMonth: number;
  payoffMonthLabel: string;
  totalInterest: number;
  totalPaid: number;
};

export type DebtMonthlyRow = {
  month: number;
  monthLabel: string;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
  activeDebts: number;
};

export type DebtAnnualRow = {
  year: number;
  startMonthLabel: string;
  endMonthLabel: string;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
};

export type DebtStrategyResult = {
  strategy: DebtStrategy;
  completed: boolean;
  months: number;
  payoffMonthLabel: string | null;
  totalInterest: number;
  totalPaid: number;
  remainingBalance: number;
  payoffOrder: DebtPayoffMilestone[];
  monthlyTimeline: DebtMonthlyRow[];
  annualTimeline: DebtAnnualRow[];
};

export type DebtPayoffResult = {
  initialBalance: number;
  baseMinimumBudget: number;
  totalMonthlyBudget: number;
  initialMonthlyInterest: number;
  minimumInterestWarnings: string[];
  avalanche: DebtStrategyResult;
  snowball: DebtStrategyResult;
  interestDifference: number;
  monthDifference: number;
};

type WorkingDebt = DebtInput & {
  debtIndex: number;
  currentBalance: number;
  totalInterest: number;
  totalPaid: number;
  payoffSequence: number | null;
  payoffMonth: number | null;
};

export const DEBT_MAX_MONEY = 1_000_000_000_000_000;
export const DEBT_MAX_COUNT = 20;
export const DEBT_MAX_MONTHS = 600;
const MAX_DERIVED_VALUE = 1_000_000_000_000_000_000;
const EPSILON = 1e-8;
const SUPPORTED_CURRENCIES = new Set<DebtCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`);
  }
}

function assertDerived(values: number[]) {
  if (values.some((value) => !Number.isFinite(value) || Math.abs(value) > MAX_DERIVED_VALUE)) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาลดยอดหนี้ อัตราดอกเบี้ย หรือเพิ่มยอดชำระรายเดือน");
  }
}

function parseStartMonth(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error("เดือนเริ่มแผนต้องอยู่ในรูปแบบ YYYY-MM");
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (year < 1900 || year > 9949) throw new Error("ปีเริ่มแผนต้องอยู่ระหว่าง 1900–9949 เพื่อรองรับ Timeline 600 เดือน");
  return { year, month };
}

export function addMonthsToLabel(startMonth: string, offset: number) {
  const { year, month } = parseStartMonth(startMonth);
  if (!Number.isInteger(offset) || offset < 0 || offset > DEBT_MAX_MONTHS) throw new Error("จำนวนเดือนที่เลื่อนไม่ถูกต้อง");
  const absoluteMonth = year * 12 + month - 1 + offset;
  const resultYear = Math.floor(absoluteMonth / 12);
  const resultMonth = (absoluteMonth % 12) + 1;
  return `${String(resultYear).padStart(4, "0")}-${String(resultMonth).padStart(2, "0")}`;
}

function validateInput(input: DebtPayoffInput) {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  const planName = input.planName.trim();
  if (!planName || planName.length > 120) throw new Error("ชื่อแผนต้องมี 1–120 ตัวอักษร");
  parseStartMonth(input.startMonth);
  assertFiniteInRange(input.extraMonthlyPayment, "เงินโปะเพิ่มต่อเดือน", 0, DEBT_MAX_MONEY);
  if (!Array.isArray(input.debts) || input.debts.length < 1 || input.debts.length > DEBT_MAX_COUNT) {
    throw new Error(`จำนวนหนี้ต้องอยู่ระหว่าง 1–${DEBT_MAX_COUNT} รายการ`);
  }

  input.debts.forEach((debt, index) => {
    const number = index + 1;
    if (!debt.name.trim() || debt.name.trim().length > 80) throw new Error(`ชื่อหนี้รายการที่ ${number} ต้องมี 1–80 ตัวอักษร`);
    assertFiniteInRange(debt.balance, `ยอดหนี้รายการที่ ${number}`, 0.01, DEBT_MAX_MONEY);
    assertFiniteInRange(debt.annualInterestRatePercent, `ดอกเบี้ยรายการที่ ${number}`, 0, 100);
    assertFiniteInRange(debt.minimumPayment, `ยอดขั้นต่ำรายการที่ ${number}`, 0.01, DEBT_MAX_MONEY);
  });
}

function priority(debts: WorkingDebt[], strategy: DebtStrategy) {
  return debts
    .filter((debt) => debt.currentBalance > EPSILON)
    .sort((left, right) => {
      if (strategy === "avalanche") {
        return right.annualInterestRatePercent - left.annualInterestRatePercent
          || left.currentBalance - right.currentBalance
          || left.debtIndex - right.debtIndex;
      }
      return left.currentBalance - right.currentBalance
        || right.annualInterestRatePercent - left.annualInterestRatePercent
        || left.debtIndex - right.debtIndex;
    });
}

function annualize(rows: DebtMonthlyRow[]): DebtAnnualRow[] {
  const result: DebtAnnualRow[] = [];
  for (let offset = 0; offset < rows.length; offset += 12) {
    const group = rows.slice(offset, offset + 12);
    const first = group[0];
    const last = group.at(-1);
    if (!first || !last) continue;
    result.push({
      year: result.length + 1,
      startMonthLabel: first.monthLabel,
      endMonthLabel: last.monthLabel,
      openingBalance: first.openingBalance,
      payment: group.reduce((sum, row) => sum + row.payment, 0),
      interest: group.reduce((sum, row) => sum + row.interest, 0),
      principal: group.reduce((sum, row) => sum + row.principal, 0),
      endingBalance: last.endingBalance,
    });
  }
  return result;
}

function simulate(input: DebtPayoffInput, strategy: DebtStrategy, totalMonthlyBudget: number): DebtStrategyResult {
  const debts: WorkingDebt[] = input.debts.map((debt, debtIndex) => ({
    ...debt,
    debtIndex,
    currentBalance: debt.balance,
    totalInterest: 0,
    totalPaid: 0,
    payoffSequence: null,
    payoffMonth: null,
  }));
  const monthlyTimeline: DebtMonthlyRow[] = [];
  let payoffSequence = 0;

  const markPaid = (debt: WorkingDebt, month: number) => {
    if (debt.currentBalance <= EPSILON && debt.payoffMonth === null) {
      debt.currentBalance = 0;
      debt.payoffMonth = month;
      debt.payoffSequence = payoffSequence;
      payoffSequence += 1;
    }
  };

  for (let month = 1; month <= DEBT_MAX_MONTHS; month += 1) {
    const activeAtStart = debts.filter((debt) => debt.currentBalance > EPSILON);
    if (activeAtStart.length === 0) break;
    const openingBalance = activeAtStart.reduce((sum, debt) => sum + debt.currentBalance, 0);
    let interest = 0;
    for (const debt of activeAtStart) {
      const monthlyInterest = debt.currentBalance * (debt.annualInterestRatePercent / 100 / 12);
      debt.currentBalance += monthlyInterest;
      debt.totalInterest += monthlyInterest;
      interest += monthlyInterest;
      assertDerived([debt.currentBalance, debt.totalInterest, interest]);
    }

    let payment = 0;
    for (const debt of activeAtStart) {
      const paid = Math.min(debt.minimumPayment, debt.currentBalance);
      debt.currentBalance -= paid;
      debt.totalPaid += paid;
      payment += paid;
      markPaid(debt, month);
    }

    let available = Math.max(0, totalMonthlyBudget - payment);
    for (const debt of priority(debts, strategy)) {
      if (available <= EPSILON) break;
      const paid = Math.min(available, debt.currentBalance);
      debt.currentBalance -= paid;
      debt.totalPaid += paid;
      payment += paid;
      available -= paid;
      markPaid(debt, month);
    }

    const endingBalance = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
    assertDerived([openingBalance, payment, interest, endingBalance]);
    monthlyTimeline.push({
      month,
      monthLabel: addMonthsToLabel(input.startMonth, month - 1),
      openingBalance,
      payment,
      interest,
      principal: payment - interest,
      endingBalance,
      activeDebts: debts.filter((debt) => debt.currentBalance > EPSILON).length,
    });
  }

  const remainingBalance = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const completed = remainingBalance <= EPSILON;
  const months = monthlyTimeline.length;
  const payoffOrder = debts
    .filter((debt): debt is WorkingDebt & { payoffMonth: number; payoffSequence: number } => debt.payoffMonth !== null && debt.payoffSequence !== null)
    .sort((left, right) => left.payoffSequence - right.payoffSequence)
    .map((debt) => ({
      debtIndex: debt.debtIndex,
      name: debt.name.trim(),
      payoffMonth: debt.payoffMonth,
      payoffMonthLabel: addMonthsToLabel(input.startMonth, debt.payoffMonth - 1),
      totalInterest: debt.totalInterest,
      totalPaid: debt.totalPaid,
    }));

  return {
    strategy,
    completed,
    months,
    payoffMonthLabel: completed && months > 0 ? addMonthsToLabel(input.startMonth, months - 1) : null,
    totalInterest: debts.reduce((sum, debt) => sum + debt.totalInterest, 0),
    totalPaid: debts.reduce((sum, debt) => sum + debt.totalPaid, 0),
    remainingBalance,
    payoffOrder,
    monthlyTimeline,
    annualTimeline: annualize(monthlyTimeline),
  };
}

export function calculateDebtPayoff(input: DebtPayoffInput): DebtPayoffResult {
  validateInput(input);
  const initialBalance = input.debts.reduce((sum, debt) => sum + debt.balance, 0);
  const baseMinimumBudget = input.debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalMonthlyBudget = baseMinimumBudget + input.extraMonthlyPayment;
  const initialMonthlyInterest = input.debts.reduce(
    (sum, debt) => sum + debt.balance * (debt.annualInterestRatePercent / 100 / 12),
    0,
  );
  const minimumInterestWarnings = input.debts
    .filter((debt) => debt.minimumPayment <= debt.balance * (debt.annualInterestRatePercent / 100 / 12) + EPSILON)
    .map((debt) => debt.name.trim());
  assertDerived([initialBalance, baseMinimumBudget, totalMonthlyBudget, initialMonthlyInterest]);

  const avalanche = simulate(input, "avalanche", totalMonthlyBudget);
  const snowball = simulate(input, "snowball", totalMonthlyBudget);
  return {
    initialBalance,
    baseMinimumBudget,
    totalMonthlyBudget,
    initialMonthlyInterest,
    minimumInterestWarnings,
    avalanche,
    snowball,
    interestDifference: snowball.totalInterest - avalanche.totalInterest,
    monthDifference: snowball.months - avalanche.months,
  };
}

function spreadsheetSafeText(value: string) {
  const normalized = value.replace(/[\r\n]+/g, " ").trim();
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : typeof value === "number" ? String(value) : spreadsheetSafeText(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function debtPayoffCsv(input: DebtPayoffInput, result: DebtPayoffResult, strategy: DebtStrategy) {
  const selected = result[strategy];
  const summary: Array<[string, string | number | null]> = [
    ["Plan", input.planName],
    ["Strategy", strategy],
    ["Currency", input.currency],
    ["Start month", input.startMonth],
    ["Initial balance", result.initialBalance],
    ["Original minimum budget", result.baseMinimumBudget],
    ["Extra monthly payment", input.extraMonthlyPayment],
    ["Fixed monthly budget", result.totalMonthlyBudget],
    ["Completed within 600 months", selected.completed ? "yes" : "no"],
    ["Months", selected.months],
    ["Payoff month", selected.payoffMonthLabel],
    ["Total interest", selected.totalInterest],
    ["Total paid", selected.totalPaid],
    ["Remaining balance", selected.remainingBalance],
  ];
  const rows = [
    ["Field", "Value"].map(csvCell).join(","),
    ...summary.map((row) => row.map(csvCell).join(",")),
    "",
    ["Payoff order", "Debt", "Payoff month number", "Payoff month", "Interest", "Paid"].map(csvCell).join(","),
    ...selected.payoffOrder.map((debt, index) => [index + 1, debt.name, debt.payoffMonth, debt.payoffMonthLabel, debt.totalInterest, debt.totalPaid].map(csvCell).join(",")),
    "",
    ["Month number", "Month", "Opening balance", "Payment", "Interest", "Principal", "Ending balance", "Active debts"].map(csvCell).join(","),
    ...selected.monthlyTimeline.map((row) => [row.month, row.monthLabel, row.openingBalance, row.payment, row.interest, row.principal, row.endingBalance, row.activeDebts].map(csvCell).join(",")),
  ];
  return `\uFEFF${rows.join("\r\n")}`;
}
