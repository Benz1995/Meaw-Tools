import { describe, expect, it } from "vitest";
import {
  BARCODE_ITEM_LIMIT,
  calculateGs1CheckDigit,
  createBarcodeFilenames,
  normalizeBarcodeValue,
  parseBarcodeInput,
} from "@/lib/tools/barcodes";

describe("GS1-style barcode checks", () => {
  it("calculates standard check digits", () => {
    expect(calculateGs1CheckDigit("885012345678")).toBe(7);
    expect(calculateGs1CheckDigit("1234567")).toBe(0);
    expect(calculateGs1CheckDigit("12345678901")).toBe(2);
    expect(calculateGs1CheckDigit("1234567890123")).toBe(1);
  });

  it("adds or validates check digits for fixed-length formats", () => {
    expect(normalizeBarcodeValue("885012345678", "EAN13")).toBe("8850123456787");
    expect(normalizeBarcodeValue("12345670", "EAN8")).toBe("12345670");
    expect(normalizeBarcodeValue("1234567890123", "ITF14")).toBe("12345678901231");
    expect(() => normalizeBarcodeValue("8850123456780", "EAN13")).toThrow("ลงท้ายด้วย 7");
  });

  it("validates character sets for Code 128 and Code 39", () => {
    expect(normalizeBarcodeValue("SKU-2026/08", "CODE128")).toBe("SKU-2026/08");
    expect(normalizeBarcodeValue("box-42", "CODE39")).toBe("BOX-42");
    expect(() => normalizeBarcodeValue("สินค้า-01", "CODE128")).toThrow("ASCII");
    expect(() => normalizeBarcodeValue("BOX_42", "CODE39")).toThrow("Code 39");
  });
});

describe("batch barcode input", () => {
  it("parses one value per non-empty line and reports the failing line", () => {
    expect(parseBarcodeInput("SKU-001\n\nSKU-002", "CODE128").map((item) => item.value)).toEqual(["SKU-001", "SKU-002"]);
    expect(() => parseBarcodeInput("123456789012\ninvalid", "EAN13")).toThrow("บรรทัด 2");
  });

  it("caps batch size and creates safe unique filenames", () => {
    const tooMany = Array.from({ length: BARCODE_ITEM_LIMIT + 1 }, (_, index) => `SKU-${index}`).join("\n");
    expect(() => parseBarcodeInput(tooMany, "CODE128")).toThrow(`${BARCODE_ITEM_LIMIT}`);
    expect(createBarcodeFilenames(["SKU/01", "SKU/01"], "svg")).toEqual(["01-SKU-01.svg", "02-SKU-01.svg"]);
  });
});
