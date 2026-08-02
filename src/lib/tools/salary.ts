export const THAI_SSO_M33_RULESET_2569 = {
  label: "ผู้ประกันตนมาตรา 33 ปี 2569–2571",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2028-12-31",
  contributionRate: 0.05,
  minimumWageBase: 1_650,
  maximumWageBase: 17_500,
  maximumEmployeeContribution: 875,
} as const;

export type SocialSecurityMode = "auto" | "manual" | "none";

export type SalaryCalculationInput = {
  baseSalary: number;
  overtime: number;
  allowances: number;
  bonus: number;
  socialSecurityMode: SocialSecurityMode;
  socialSecurityWage: number;
  manualSocialSecurity: number;
  providentFundRate: number;
  withholdingTax: number;
  otherDeductions: number;
};

export type SalaryCalculationResult = {
  grossIncome: number;
  socialSecurity: number;
  socialSecurityWageBase: number;
  providentFund: number;
  withholdingTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  deductionRate: number;
};

function assertMoney(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) {
    throw new Error(`${label}ต้องอยู่ระหว่าง 0 ถึง 100,000,000 บาท`);
  }
}

export function calculateM33EmployeeContribution(wage: number): { contribution: number; wageBase: number } {
  assertMoney(wage, "ค่าจ้างที่ใช้ส่งประกันสังคม");
  if (wage === 0) return { contribution: 0, wageBase: 0 };

  const wageBase = Math.min(
    THAI_SSO_M33_RULESET_2569.maximumWageBase,
    Math.max(THAI_SSO_M33_RULESET_2569.minimumWageBase, wage),
  );
  const contribution = wageBase * THAI_SSO_M33_RULESET_2569.contributionRate;
  return { contribution, wageBase };
}

export function calculateNetSalary(input: SalaryCalculationInput): SalaryCalculationResult {
  assertMoney(input.baseSalary, "เงินเดือน");
  assertMoney(input.overtime, "ค่าล่วงเวลา");
  assertMoney(input.allowances, "ค่าตำแหน่งและรายได้อื่น");
  assertMoney(input.bonus, "โบนัสหรือคอมมิชชัน");
  assertMoney(input.socialSecurityWage, "ค่าจ้างที่ใช้ส่งประกันสังคม");
  assertMoney(input.manualSocialSecurity, "ประกันสังคมที่หักจริง");
  assertMoney(input.withholdingTax, "ภาษีหัก ณ ที่จ่าย");
  assertMoney(input.otherDeductions, "รายการหักอื่น");
  if (!Number.isFinite(input.providentFundRate) || input.providentFundRate < 0 || input.providentFundRate > 100) {
    throw new Error("อัตรากองทุนสำรองเลี้ยงชีพต้องอยู่ระหว่าง 0% ถึง 100%");
  }

  const grossIncome = input.baseSalary + input.overtime + input.allowances + input.bonus;
  const automaticSocialSecurity = calculateM33EmployeeContribution(
    input.socialSecurityWage || input.baseSalary,
  );
  const socialSecurity = input.socialSecurityMode === "auto"
    ? automaticSocialSecurity.contribution
    : input.socialSecurityMode === "manual"
      ? input.manualSocialSecurity
      : 0;
  const socialSecurityWageBase = input.socialSecurityMode === "auto" ? automaticSocialSecurity.wageBase : 0;
  const providentFund = input.baseSalary * (input.providentFundRate / 100);
  const totalDeductions = socialSecurity + providentFund + input.withholdingTax + input.otherDeductions;
  const netPay = grossIncome - totalDeductions;

  return {
    grossIncome,
    socialSecurity,
    socialSecurityWageBase,
    providentFund,
    withholdingTax: input.withholdingTax,
    otherDeductions: input.otherDeductions,
    totalDeductions,
    netPay,
    deductionRate: grossIncome === 0 ? 0 : (totalDeductions / grossIncome) * 100,
  };
}
