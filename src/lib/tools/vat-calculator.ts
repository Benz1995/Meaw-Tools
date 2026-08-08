export const VAT_MAX_AMOUNT = 999_999_999_999.99;
export const THAILAND_VAT_RATE = 7;
export const THAILAND_VAT_RATE_VERIFIED_AT = "2026-08-08";
export const THAILAND_VAT_RATE_VALID_THROUGH = "2027-09-30";
export const THAILAND_VAT_SOURCE_URL = "https://rd.go.th/fileadmin/user_upload/news/2569thai/news19_2569.pdf";
export const THAILAND_WITHHOLDING_SOURCE_URL = "https://interweb1.rd.go.th/publish/seminar/training/RD06.pdf";

export type VatAmountMode = "exclusive" | "inclusive";

export type VatCalculationInput = {
  amount: number;
  amountMode: VatAmountMode;
  vatRate: number;
  serviceChargeRate: number;
  withholdingRate: number;
};

export type VatCalculationResult = {
  inputAmount: number;
  amountMode: VatAmountMode;
  vatRate: number;
  serviceChargeRate: number;
  withholdingRate: number;
  baseBeforeService: number;
  serviceCharge: number;
  vatBase: number;
  vat: number;
  grossTotal: number;
  withholdingBase: number;
  withholdingTax: number;
  netPayment: number;
};

export function roundVatMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertAmount(value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > VAT_MAX_AMOUNT) {
    throw new Error(`ยอดเงินต้องมากกว่า 0 และไม่เกิน ${VAT_MAX_AMOUNT.toLocaleString("th-TH")} บาท`);
  }
}

function assertRate(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label}ต้องอยู่ระหว่าง 0 ถึง 100%`);
  }
}

export function calculateVat(input: VatCalculationInput): VatCalculationResult {
  assertAmount(input.amount);
  assertRate(input.vatRate, "อัตรา VAT");
  assertRate(input.serviceChargeRate, "อัตรา Service Charge");
  assertRate(input.withholdingRate, "อัตราภาษีหัก ณ ที่จ่าย");
  if (input.amountMode === "inclusive" && input.serviceChargeRate !== 0) {
    throw new Error("โหมดถอด VAT ต้องใช้อัตรา Service Charge 0% เพราะยอดที่กรอกเป็นยอดรวมสุดท้ายแล้ว");
  }

  const inputAmount = roundVatMoney(input.amount);
  let baseBeforeService: number;
  let serviceCharge: number;
  let vatBase: number;
  let vat: number;
  let grossTotal: number;

  if (input.amountMode === "inclusive") {
    grossTotal = inputAmount;
    vat = input.vatRate === 0 ? 0 : roundVatMoney(grossTotal * input.vatRate / (100 + input.vatRate));
    vatBase = roundVatMoney(grossTotal - vat);
    baseBeforeService = vatBase;
    serviceCharge = 0;
  } else {
    baseBeforeService = inputAmount;
    serviceCharge = roundVatMoney(baseBeforeService * input.serviceChargeRate / 100);
    vatBase = roundVatMoney(baseBeforeService + serviceCharge);
    vat = roundVatMoney(vatBase * input.vatRate / 100);
    grossTotal = roundVatMoney(vatBase + vat);
  }

  const withholdingBase = vatBase;
  const withholdingTax = roundVatMoney(withholdingBase * input.withholdingRate / 100);
  const netPayment = roundVatMoney(grossTotal - withholdingTax);

  return {
    inputAmount,
    amountMode: input.amountMode,
    vatRate: input.vatRate,
    serviceChargeRate: input.serviceChargeRate,
    withholdingRate: input.withholdingRate,
    baseBeforeService,
    serviceCharge,
    vatBase,
    vat,
    grossTotal,
    withholdingBase,
    withholdingTax,
    netPayment,
  };
}
