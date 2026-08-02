export const THAI_INCOME_TAX_RULESET = {
  label: "โครงสร้างภาษีปี 2560 เป็นต้นไป",
  verifiedAt: "2026-08-03",
  employmentExpenseRate: 0.5,
  employmentExpenseCap: 100_000,
  personalAllowance: 60_000,
} as const;

export type TaxBracket = {
  lowerBound: number;
  upperBound: number | null;
  rate: number;
};

export const THAI_PERSONAL_INCOME_TAX_BRACKETS: TaxBracket[] = [
  { lowerBound: 0, upperBound: 150_000, rate: 0 },
  { lowerBound: 150_000, upperBound: 300_000, rate: 0.05 },
  { lowerBound: 300_000, upperBound: 500_000, rate: 0.1 },
  { lowerBound: 500_000, upperBound: 750_000, rate: 0.15 },
  { lowerBound: 750_000, upperBound: 1_000_000, rate: 0.2 },
  { lowerBound: 1_000_000, upperBound: 2_000_000, rate: 0.25 },
  { lowerBound: 2_000_000, upperBound: 5_000_000, rate: 0.3 },
  { lowerBound: 5_000_000, upperBound: null, rate: 0.35 },
];

export type TaxBandResult = TaxBracket & {
  taxableAmount: number;
  tax: number;
};

export type TaxCalculationResult = {
  taxableIncome: number;
  tax: number;
  monthlyTaxAverage: number;
  marginalRate: number;
  effectiveRate: number;
  bands: TaxBandResult[];
};

export type SalaryTaxInput = {
  monthlySalary: number;
  annualBonus: number;
  otherEmploymentIncome: number;
  socialSecurity: number;
  otherDeductions: number;
  withheldTax: number;
};

export type SalaryTaxResult = TaxCalculationResult & {
  grossIncome: number;
  employmentExpense: number;
  personalAllowance: number;
  totalDeductions: number;
  withheldTax: number;
  balance: number;
};

function assertMoney(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    throw new Error(`${label}ต้องอยู่ระหว่าง 0 ถึง 1,000,000,000 บาท`);
  }
}

export function calculateThaiPersonalIncomeTax(taxableIncome: number): TaxCalculationResult {
  assertMoney(taxableIncome, "เงินได้สุทธิ");

  const bands = THAI_PERSONAL_INCOME_TAX_BRACKETS.map((bracket) => {
    const ceiling = bracket.upperBound ?? taxableIncome;
    const taxableAmount = Math.max(0, Math.min(taxableIncome, ceiling) - bracket.lowerBound);
    return { ...bracket, taxableAmount, tax: taxableAmount * bracket.rate };
  });
  const tax = bands.reduce((sum, band) => sum + band.tax, 0);
  const activeBand = [...bands].reverse().find((band) => taxableIncome > band.lowerBound);

  return {
    taxableIncome,
    tax,
    monthlyTaxAverage: tax / 12,
    marginalRate: activeBand?.rate ?? 0,
    effectiveRate: taxableIncome === 0 ? 0 : (tax / taxableIncome) * 100,
    bands,
  };
}

export function estimateSalaryIncomeTax(input: SalaryTaxInput): SalaryTaxResult {
  assertMoney(input.monthlySalary, "เงินเดือนต่อเดือน");
  assertMoney(input.annualBonus, "โบนัสทั้งปี");
  assertMoney(input.otherEmploymentIncome, "รายได้จากงานประจำอื่น ๆ");
  assertMoney(input.socialSecurity, "เงินสมทบประกันสังคม");
  assertMoney(input.otherDeductions, "ค่าลดหย่อนอื่น");
  assertMoney(input.withheldTax, "ภาษีหัก ณ ที่จ่าย");

  const grossIncome = input.monthlySalary * 12 + input.annualBonus + input.otherEmploymentIncome;
  assertMoney(grossIncome, "รายได้จากงานประจำรวม");
  const employmentExpense = Math.min(
    grossIncome * THAI_INCOME_TAX_RULESET.employmentExpenseRate,
    THAI_INCOME_TAX_RULESET.employmentExpenseCap,
  );
  const personalAllowance = THAI_INCOME_TAX_RULESET.personalAllowance;
  const totalDeductions = employmentExpense + personalAllowance + input.socialSecurity + input.otherDeductions;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  const taxResult = calculateThaiPersonalIncomeTax(taxableIncome);

  return {
    ...taxResult,
    grossIncome,
    employmentExpense,
    personalAllowance,
    totalDeductions,
    withheldTax: input.withheldTax,
    balance: taxResult.tax - input.withheldTax,
  };
}
