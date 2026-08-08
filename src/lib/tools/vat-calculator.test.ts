import { describe, expect, it } from "vitest";
import {
  calculateVat,
  THAILAND_VAT_RATE,
  THAILAND_VAT_RATE_VALID_THROUGH,
  THAILAND_VAT_RATE_VERIFIED_AT,
  VAT_MAX_AMOUNT,
} from "./vat-calculator";

describe("VAT calculator", () => {
  it("adds 7% VAT to a price that excludes VAT", () => {
    expect(calculateVat({
      amount: 1_000,
      amountMode: "exclusive",
      vatRate: 7,
      serviceChargeRate: 0,
      withholdingRate: 0,
    })).toMatchObject({
      baseBeforeService: 1_000,
      serviceCharge: 0,
      vatBase: 1_000,
      vat: 70,
      grossTotal: 1_070,
      withholdingTax: 0,
      netPayment: 1_070,
    });
  });

  it("extracts VAT from a price that already includes VAT", () => {
    expect(calculateVat({
      amount: 1_070,
      amountMode: "inclusive",
      vatRate: 7,
      serviceChargeRate: 0,
      withholdingRate: 0,
    })).toMatchObject({
      baseBeforeService: 1_000,
      vatBase: 1_000,
      vat: 70,
      grossTotal: 1_070,
      netPayment: 1_070,
    });
  });

  it("adds service charge before calculating VAT", () => {
    expect(calculateVat({
      amount: 1_000,
      amountMode: "exclusive",
      vatRate: 7,
      serviceChargeRate: 10,
      withholdingRate: 0,
    })).toMatchObject({
      baseBeforeService: 1_000,
      serviceCharge: 100,
      vatBase: 1_100,
      vat: 77,
      grossTotal: 1_177,
    });
  });

  it("estimates withholding from the amount before VAT", () => {
    expect(calculateVat({
      amount: 1_000,
      amountMode: "exclusive",
      vatRate: 7,
      serviceChargeRate: 10,
      withholdingRate: 3,
    })).toMatchObject({
      withholdingBase: 1_100,
      withholdingTax: 33,
      grossTotal: 1_177,
      netPayment: 1_144,
    });
  });

  it("uses the official 7/107 extraction pattern with currency rounding", () => {
    expect(calculateVat({
      amount: 100,
      amountMode: "inclusive",
      vatRate: 7,
      serviceChargeRate: 0,
      withholdingRate: 3,
    })).toMatchObject({
      vatBase: 93.46,
      vat: 6.54,
      withholdingTax: 2.8,
      netPayment: 97.2,
    });
  });

  it("supports editable zero rates without inventing tax", () => {
    expect(calculateVat({
      amount: 250.25,
      amountMode: "exclusive",
      vatRate: 0,
      serviceChargeRate: 0,
      withholdingRate: 0,
    })).toMatchObject({ vat: 0, grossTotal: 250.25, netPayment: 250.25 });
  });

  it("rejects unsafe amounts, rates, and ambiguous inclusive service charge", () => {
    const base = { amount: 1_000, amountMode: "exclusive" as const, vatRate: 7, serviceChargeRate: 0, withholdingRate: 0 };
    expect(() => calculateVat({ ...base, amount: 0 })).toThrow(/มากกว่า 0/);
    expect(() => calculateVat({ ...base, amount: VAT_MAX_AMOUNT + 1 })).toThrow(/ไม่เกิน/);
    expect(() => calculateVat({ ...base, vatRate: 101 })).toThrow(/VAT/);
    expect(() => calculateVat({ ...base, withholdingRate: -1 })).toThrow(/หัก ณ ที่จ่าย/);
    expect(() => calculateVat({ ...base, amountMode: "inclusive", serviceChargeRate: 10 })).toThrow(/ยอดรวมสุดท้าย/);
  });

  it("versions the current Thailand VAT preset instead of treating it as permanent", () => {
    expect(THAILAND_VAT_RATE).toBe(7);
    expect(THAILAND_VAT_RATE_VERIFIED_AT).toBe("2026-08-08");
    expect(THAILAND_VAT_RATE_VALID_THROUGH).toBe("2027-09-30");
  });
});
