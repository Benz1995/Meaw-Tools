export type SavingsCurrency = "THB" | "USD" | "EUR" | "GBP" | "JPY" | "OTHER";

export type SavingsMode = "projection" | "goal";

export type ContributionFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export type CompoundFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly";

export type ContributionTiming = "beginning" | "end";

export type GoalBasis = "future" | "today";

export type CompoundSavingsInput = {
  currency: SavingsCurrency;
  scenarioName: string;
  mode: SavingsMode;
  initialAmount: number;
  recurringContribution: number;
  targetAmount: number;
  years: number;
  annualNominalRatePercent: number;
  compoundFrequency: CompoundFrequency;
  contributionFrequency: ContributionFrequency;
  contributionTiming: ContributionTiming;
  annualInflationRatePercent: number;
  goalBasis: GoalBasis;
};

export type SavingsTimelineRow = {
  year: number;
  openingBalance: number;
  contributions: number;
  interest: number;
  endingBalance: number;
  realEndingBalance: number;
};

export type CompoundSavingsResult = {
  periodsPerYear: number;
  numberOfPeriods: number;
  periodicRatePercent: number;
  effectiveAnnualYieldPercent: number;
  recurringContributionUsed: number;
  requiredContribution: number | null;
  goalAtHorizon: number | null;
  goalAchievedByInitial: boolean;
  goalSurplusFromInitial: number;
  initialFutureValue: number;
  contributionFutureValue: number;
  totalContributions: number;
  totalPrincipal: number;
  interestEarned: number;
  futureValue: number;
  realFutureValue: number;
  timeline: SavingsTimelineRow[];
};

export const SAVINGS_MAX_MONEY = 1_000_000_000_000_000;
export const SAVINGS_MAX_YEARS = 60;
const MAX_DERIVED_ABSOLUTE_VALUE = 1_000_000_000_000_000_000;
const EPSILON = 1e-12;

const SUPPORTED_CURRENCIES = new Set<SavingsCurrency>(["THB", "USD", "EUR", "GBP", "JPY", "OTHER"]);
const SUPPORTED_MODES = new Set<SavingsMode>(["projection", "goal"]);
const SUPPORTED_TIMINGS = new Set<ContributionTiming>(["beginning", "end"]);
const SUPPORTED_GOAL_BASES = new Set<GoalBasis>(["future", "today"]);

export const CONTRIBUTION_PERIODS_PER_YEAR: Record<ContributionFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export const COMPOUND_PERIODS_PER_YEAR: Record<CompoundFrequency, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  yearly: 1,
};

function assertFiniteInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${min.toLocaleString("th-TH")}–${max.toLocaleString("th-TH")}`);
  }
}

function assertDerived(values: number[]) {
  if (values.some((value) => !Number.isFinite(value) || Math.abs(value) > MAX_DERIVED_ABSOLUTE_VALUE)) {
    throw new Error("ผลลัพธ์สูงเกินขอบเขตที่รองรับ กรุณาลดจำนวนเงิน ระยะเวลา หรืออัตราดอกเบี้ย");
  }
}

function annuityFutureValueFactor(periodicRate: number, periods: number, timing: ContributionTiming) {
  const ordinaryFactor = Math.abs(periodicRate) < EPSILON
    ? periods
    : (Math.pow(1 + periodicRate, periods) - 1) / periodicRate;
  return timing === "beginning" ? ordinaryFactor * (1 + periodicRate) : ordinaryFactor;
}

function buildTimeline(
  initialAmount: number,
  recurringContribution: number,
  periodicRate: number,
  periodsPerYear: number,
  years: number,
  timing: ContributionTiming,
  annualInflationRate: number,
) {
  let balance = initialAmount;
  const timeline: SavingsTimelineRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    const openingBalance = balance;
    for (let period = 0; period < periodsPerYear; period += 1) {
      if (timing === "beginning") balance += recurringContribution;
      balance *= 1 + periodicRate;
      if (timing === "end") balance += recurringContribution;
      assertDerived([balance]);
    }

    const contributions = recurringContribution * periodsPerYear;
    const interest = balance - openingBalance - contributions;
    const realEndingBalance = balance / Math.pow(1 + annualInflationRate, year);
    assertDerived([openingBalance, contributions, interest, balance, realEndingBalance]);
    timeline.push({ year, openingBalance, contributions, interest, endingBalance: balance, realEndingBalance });
  }

  return timeline;
}

export function calculateCompoundSavings(input: CompoundSavingsInput): CompoundSavingsResult {
  if (!SUPPORTED_CURRENCIES.has(input.currency)) throw new Error("หน่วยเงินไม่รองรับ");
  if (!SUPPORTED_MODES.has(input.mode)) throw new Error("โหมดคำนวณไม่รองรับ");
  if (!input.scenarioName.trim() || input.scenarioName.trim().length > 120) throw new Error("ชื่อ Scenario ต้องมี 1–120 ตัวอักษร");
  if (!(input.compoundFrequency in COMPOUND_PERIODS_PER_YEAR)) throw new Error("ความถี่ทบต้นไม่รองรับ");
  if (!(input.contributionFrequency in CONTRIBUTION_PERIODS_PER_YEAR)) throw new Error("ความถี่เงินออมไม่รองรับ");
  if (!SUPPORTED_TIMINGS.has(input.contributionTiming)) throw new Error("จังหวะฝากเงินไม่รองรับ");
  if (!SUPPORTED_GOAL_BASES.has(input.goalBasis)) throw new Error("ฐานมูลค่าเป้าหมายไม่รองรับ");

  assertFiniteInRange(input.initialAmount, "เงินตั้งต้น", 0, SAVINGS_MAX_MONEY);
  assertFiniteInRange(input.recurringContribution, "เงินออมต่องวด", 0, SAVINGS_MAX_MONEY);
  assertFiniteInRange(input.targetAmount, "เป้าหมายเงินออม", input.mode === "goal" ? 0.01 : 0, SAVINGS_MAX_MONEY);
  assertFiniteInRange(input.years, "ระยะเวลา", 1, SAVINGS_MAX_YEARS);
  if (!Number.isInteger(input.years)) throw new Error("ระยะเวลาต้องเป็นจำนวนปีเต็ม 1–60 ปี");
  assertFiniteInRange(input.annualNominalRatePercent, "อัตราดอกเบี้ยต่อปี", -99, 100);
  assertFiniteInRange(input.annualInflationRatePercent, "อัตราเงินเฟ้อต่อปี", -99, 100);

  const compoundsPerYear = COMPOUND_PERIODS_PER_YEAR[input.compoundFrequency];
  const periodsPerYear = CONTRIBUTION_PERIODS_PER_YEAR[input.contributionFrequency];
  const numberOfPeriods = input.years * periodsPerYear;
  const nominalRate = input.annualNominalRatePercent / 100;
  const annualInflationRate = input.annualInflationRatePercent / 100;
  const effectiveAnnualRate = Math.pow(1 + nominalRate / compoundsPerYear, compoundsPerYear) - 1;
  const periodicRate = Math.pow(1 + effectiveAnnualRate, 1 / periodsPerYear) - 1;
  const growthFactor = Math.pow(1 + periodicRate, numberOfPeriods);
  const factor = annuityFutureValueFactor(periodicRate, numberOfPeriods, input.contributionTiming);
  const initialFutureValue = input.initialAmount * growthFactor;
  const inflationFactor = Math.pow(1 + annualInflationRate, input.years);
  const goalAtHorizon = input.mode === "goal"
    ? input.targetAmount * (input.goalBasis === "today" ? inflationFactor : 1)
    : null;
  const rawRequiredContribution = goalAtHorizon === null ? null : (goalAtHorizon - initialFutureValue) / factor;
  const requiredContribution = rawRequiredContribution === null ? null : Math.max(0, rawRequiredContribution);
  const recurringContributionUsed = input.mode === "goal" ? requiredContribution ?? 0 : input.recurringContribution;
  const contributionFutureValue = recurringContributionUsed * factor;
  const futureValue = initialFutureValue + contributionFutureValue;
  const totalContributions = recurringContributionUsed * numberOfPeriods;
  const totalPrincipal = input.initialAmount + totalContributions;
  const interestEarned = futureValue - totalPrincipal;
  const realFutureValue = futureValue / inflationFactor;
  const goalAchievedByInitial = goalAtHorizon !== null && initialFutureValue >= goalAtHorizon - EPSILON;
  const goalSurplusFromInitial = goalAtHorizon === null ? 0 : Math.max(0, initialFutureValue - goalAtHorizon);

  assertDerived([
    effectiveAnnualRate,
    periodicRate,
    growthFactor,
    factor,
    initialFutureValue,
    goalAtHorizon ?? 0,
    requiredContribution ?? 0,
    contributionFutureValue,
    futureValue,
    totalContributions,
    totalPrincipal,
    interestEarned,
    realFutureValue,
    goalSurplusFromInitial,
  ]);

  return {
    periodsPerYear,
    numberOfPeriods,
    periodicRatePercent: periodicRate * 100,
    effectiveAnnualYieldPercent: effectiveAnnualRate * 100,
    recurringContributionUsed,
    requiredContribution,
    goalAtHorizon,
    goalAchievedByInitial,
    goalSurplusFromInitial,
    initialFutureValue,
    contributionFutureValue,
    totalContributions,
    totalPrincipal,
    interestEarned,
    futureValue,
    realFutureValue,
    timeline: buildTimeline(
      input.initialAmount,
      recurringContributionUsed,
      periodicRate,
      periodsPerYear,
      input.years,
      input.contributionTiming,
      annualInflationRate,
    ),
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

export function compoundSavingsCsv(input: CompoundSavingsInput, result: CompoundSavingsResult) {
  const summaryRows: Array<[string, string | number | null]> = [
    ["Scenario", input.scenarioName],
    ["Mode", input.mode],
    ["Currency", input.currency],
    ["Initial amount", input.initialAmount],
    ["Recurring contribution per period", result.recurringContributionUsed],
    ["Contribution frequency", input.contributionFrequency],
    ["Contribution timing", input.contributionTiming],
    ["Years", input.years],
    ["Nominal annual rate percent", input.annualNominalRatePercent],
    ["Compound frequency", input.compoundFrequency],
    ["Effective annual yield percent", result.effectiveAnnualYieldPercent],
    ["Inflation rate percent", input.annualInflationRatePercent],
    ["Target basis", input.goalBasis],
    ["Target at horizon", result.goalAtHorizon],
    ["Required contribution per period", result.requiredContribution],
    ["Total principal", result.totalPrincipal],
    ["Interest earned", result.interestEarned],
    ["Future value", result.futureValue],
    ["Real future value", result.realFutureValue],
  ];
  const rows = [
    ["Field", "Value"].map(csvCell).join(","),
    ...summaryRows.map((row) => row.map(csvCell).join(",")),
    "",
    ["Year", "Opening balance", "Contributions", "Interest", "Ending balance", "Real ending balance"].map(csvCell).join(","),
    ...result.timeline.map((row) => [row.year, row.openingBalance, row.contributions, row.interest, row.endingBalance, row.realEndingBalance].map(csvCell).join(",")),
  ];
  return `\uFEFF${rows.join("\r\n")}`;
}
