import { describe, expect, it } from "vitest";
import { calculateSavingPercent, createImageOutputName, fitImageWithin, validateDecodedImage } from "@/lib/tools/images";

describe("fitImageWithin", () => {
  it("preserves the aspect ratio inside both limits", () => {
    expect(fitImageWithin(4_000, 3_000, 1_920, 1_080)).toEqual({ width: 1_440, height: 1_080 });
  });

  it("does not enlarge small images by default", () => {
    expect(fitImageWithin(800, 600, 1_920, 1_080)).toEqual({ width: 800, height: 600 });
  });

  it("rejects invalid dimensions", () => {
    expect(() => fitImageWithin(0, 600, 1_920, 1_080)).toThrow("ความกว้างต้นฉบับ");
  });
});

describe("image output helpers", () => {
  it("calculates both savings and size increases", () => {
    expect(calculateSavingPercent(1_000, 600)).toBe(40);
    expect(calculateSavingPercent(1_000, 1_250)).toBe(-25);
  });

  it("creates a safe, readable download name", () => {
    expect(createImageOutputName("สินค้า หน้าร้าน.PNG", "jpg", "converted")).toBe("สินค้า-หน้าร้าน-converted.jpg");
  });

  it("rejects oversized decoded images", () => {
    expect(() => validateDecodedImage(8_001, 1_000)).toThrow("8,000");
    expect(() => validateDecodedImage(8_000, 8_000)).toThrow("40 ล้านพิกเซล");
  });
});
