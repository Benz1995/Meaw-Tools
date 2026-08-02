import { describe, expect, it } from "vitest";
import {
  clampJpegQuality,
  fitHeicOutput,
  hasHeicSignature,
  heicJpegFilename,
  looksLikeHeicFile,
  makeUniqueFilenames,
  validateHeicFiles,
} from "@/lib/tools/heic";

function isoBmffHeader(majorBrand: string, compatibleBrand = ""): Uint8Array {
  const text = `\u0000\u0000\u0000\u001cftyp${majorBrand}\u0000\u0000\u0000\u0000${compatibleBrand}`;
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

describe("HEIC helpers", () => {
  it("recognizes HEIC brands in ISO BMFF headers", () => {
    expect(hasHeicSignature(isoBmffHeader("heic"))).toBe(true);
    expect(hasHeicSignature(isoBmffHeader("mif1", "heix"))).toBe(true);
    expect(hasHeicSignature(isoBmffHeader("mif1", "avif"))).toBe(false);
    expect(hasHeicSignature(isoBmffHeader("mif1"))).toBe(false);
    expect(hasHeicSignature(isoBmffHeader("avif"))).toBe(false);
    expect(hasHeicSignature(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("validates extensions, MIME types, file counts, and byte limits", () => {
    expect(looksLikeHeicFile({ name: "IMG_1001.HEIC", size: 10 })).toBe(true);
    expect(looksLikeHeicFile({ name: "photo.bin", type: "image/heif", size: 10 })).toBe(true);
    expect(() => validateHeicFiles([{ name: "photo.jpg", type: "image/jpeg", size: 10 }])).toThrow("ไม่ใช่ไฟล์ HEIC");
    expect(() => validateHeicFiles([{ name: "photo.heic", size: 20 * 1024 * 1024 + 1 }])).toThrow("เกิน 20 MB");
  });

  it("clamps quality and calculates output dimensions safely", () => {
    expect(clampJpegQuality(0.4)).toBe(0.6);
    expect(clampJpegQuality(0.92)).toBe(0.92);
    expect(clampJpegQuality(3)).toBe(1);
    expect(fitHeicOutput(4032, 3024, 2560)).toEqual({ width: 2560, height: 1920 });
    expect(fitHeicOutput(1200, 800, 0)).toEqual({ width: 1200, height: 800 });
    expect(() => fitHeicOutput(10_000, 6_000, 0)).toThrow("50 ล้านพิกเซล");
  });

  it("creates safe and unique JPG filenames", () => {
    expect(heicJpegFilename("IMG: 1001.HEIF")).toBe("IMG- 1001.jpg");
    expect(makeUniqueFilenames(["photo.jpg", "PHOTO.jpg", "other.jpg", "photo.jpg"])).toEqual([
      "photo.jpg",
      "PHOTO-2.jpg",
      "other.jpg",
      "photo-3.jpg",
    ]);
  });
});
