import { describe, expect, it } from "vitest";
import {
  calculateOcrDimensions,
  countOcrLines,
  createOcrTextFilename,
  getOcrConfidenceLabel,
  getOcrLanguageCodes,
  getOcrProgressLabel,
  normalizeOcrText,
  validateOcrImageInput,
} from "@/lib/tools/image-to-text";

describe("image to text OCR helpers", () => {
  it("validates supported image files and resource limits", () => {
    expect(() => validateOcrImageInput("image/png", 1_024)).not.toThrow();
    expect(() => validateOcrImageInput("image/svg+xml", 1_024)).toThrow("PNG, JPG และ WebP");
    expect(() => validateOcrImageInput("image/jpeg", 11 * 1_024 * 1_024)).toThrow("10 MB");
  });

  it("limits OCR working dimensions without enlarging small images", () => {
    expect(calculateOcrDimensions(4_800, 3_200)).toEqual({ width: 2_400, height: 1_600 });
    expect(calculateOcrDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("maps language selections to trained data codes", () => {
    expect(getOcrLanguageCodes("tha+eng")).toEqual(["tha", "eng"]);
    expect(getOcrLanguageCodes("tha")).toEqual(["tha"]);
    expect(getOcrLanguageCodes("eng")).toEqual(["eng"]);
  });

  it("normalizes OCR text and creates safe output metadata", () => {
    const text = normalizeOcrText("บรรทัดแรก  \r\n\r\n\r\nLine two\t \n");
    expect(text).toBe("บรรทัดแรก\n\nLine two");
    expect(countOcrLines(text)).toBe(3);
    expect(createOcrTextFilename("ใบเสร็จ ร้านแมว.JPG")).toBe("ใบเสร็จ-ร้านแมว-ocr.txt");
  });

  it("explains progress and confidence in user-facing language", () => {
    expect(getOcrProgressLabel("recognizing text")).toContain("อ่านข้อความ");
    expect(getOcrProgressLabel("loading language traineddata")).toContain("โมเดลภาษา");
    expect(getOcrConfidenceLabel(91)).toBe("ความมั่นใจสูง");
    expect(getOcrConfidenceLabel(50)).toBe("ควรตรวจแก้ผลลัพธ์");
  });
});
