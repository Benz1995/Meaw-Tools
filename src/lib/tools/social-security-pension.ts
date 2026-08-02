export const THAI_SSO_PENSION_RULESET_CURRENT = {
  label: "บำนาญชราภาพประกันสังคม มาตรา 33 และมาตรา 39 (สูตร FAE ปัจจุบัน)",
  reviewedAt: "2026-08-03",
  minimumContributionMonths: 180,
  eligibilityAge: 55,
  wageAveragingMonths: 60,
  basePensionRate: 0.2,
  extraRatePerCompleteYear: 0.015,
  careStatus: "draft-approved-not-effective",
} as const;

export type SocialSecurityPensionInput = {
  averageWageBase: number;
  contributionMonths: number;
  age: number;
  insuredStatusEnded: boolean;
};

export type SocialSecurityPensionResult = {
  averageWageBase: number;
  contributionMonths: number;
  contributionThresholdMet: boolean;
  ageThresholdMet: boolean;
  insuredStatusEnded: boolean;
  eligibleNow: boolean;
  monthsToPensionThreshold: number;
  completeExtraYears: number;
  unusedExtraMonths: number;
  pensionRate: number;
  monthlyPension: number | null;
  annualPension: number | null;
};

function assertFiniteInRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

export function calculateSocialSecurityPension(
  input: SocialSecurityPensionInput,
): SocialSecurityPensionResult {
  assertFiniteInRange(input.averageWageBase, "ค่าจ้างเฉลี่ย", 0, 100_000_000);
  assertFiniteInRange(input.contributionMonths, "จำนวนเดือนที่ส่งเงินสมทบ", 0, 1_200);
  assertFiniteInRange(input.age, "อายุ", 0, 120);

  if (!Number.isInteger(input.contributionMonths)) {
    throw new Error("จำนวนเดือนที่ส่งเงินสมทบต้องเป็นจำนวนเต็ม");
  }
  if (!Number.isInteger(input.age)) {
    throw new Error("อายุต้องเป็นจำนวนปีเต็ม");
  }

  const contributionThresholdMet = input.contributionMonths >= THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths;
  const ageThresholdMet = input.age >= THAI_SSO_PENSION_RULESET_CURRENT.eligibilityAge;
  const excessMonths = Math.max(0, input.contributionMonths - THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths);
  const completeExtraYears = Math.floor(excessMonths / 12);
  const unusedExtraMonths = excessMonths % 12;
  const pensionRate = contributionThresholdMet
    ? THAI_SSO_PENSION_RULESET_CURRENT.basePensionRate
      + completeExtraYears * THAI_SSO_PENSION_RULESET_CURRENT.extraRatePerCompleteYear
    : 0;
  const monthlyPension = contributionThresholdMet ? input.averageWageBase * pensionRate : null;

  return {
    averageWageBase: input.averageWageBase,
    contributionMonths: input.contributionMonths,
    contributionThresholdMet,
    ageThresholdMet,
    insuredStatusEnded: input.insuredStatusEnded,
    eligibleNow: contributionThresholdMet && ageThresholdMet && input.insuredStatusEnded,
    monthsToPensionThreshold: Math.max(
      0,
      THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths - input.contributionMonths,
    ),
    completeExtraYears,
    unusedExtraMonths,
    pensionRate,
    monthlyPension,
    annualPension: monthlyPension === null ? null : monthlyPension * 12,
  };
}
