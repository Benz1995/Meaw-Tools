import { describe, expect, it } from "vitest";
import {
  BATCH_IMAGE_TOTAL_PIXEL_LIMIT,
  createBatchImageOutputNames,
  detectBatchImageMime,
  getBatchImageExtension,
  looksLikeBatchImage,
  validateBatchImageFiles,
  validateBatchOutputPixels,
} from "@/lib/tools/image-batch";

describe("batch image validation", () => {
  it("accepts supported MIME types and extensions", () => {
    expect(looksLikeBatchImage({ name: "PHOTO.JPG", size: 100 })).toBe(true);
    expect(looksLikeBatchImage({ name: "upload.bin", type: "image/webp", size: 100 })).toBe(true);
    expect(() => validateBatchImageFiles([{ name: "photo.png", type: "image/png", size: 100 }])).not.toThrow();
  });

  it("detects real JPG, PNG, and WebP signatures", () => {
    expect(detectBatchImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectBatchImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectBatchImageMime(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))).toBe("image/webp");
    expect(detectBatchImageMime(Uint8Array.from([71, 73, 70, 56, 57, 97]))).toBeNull();
  });

  it("rejects unsupported, empty, oversized, and excessive files", () => {
    expect(() => validateBatchImageFiles([{ name: "photo.gif", type: "image/gif", size: 100 }])).toThrow("ไม่ใช่ไฟล์");
    expect(() => validateBatchImageFiles([{ name: "photo.jpg", size: 0 }])).toThrow("ว่างเปล่า");
    expect(() => validateBatchImageFiles([{ name: "photo.jpg", size: 10 * 1024 * 1024 + 1 }])).toThrow("เกิน 10 MB");
    expect(() => validateBatchImageFiles(Array.from({ length: 21 }, (_, index) => ({ name: `${index}.jpg`, size: 1 })))).toThrow("20 ไฟล์");
    expect(() => validateBatchImageFiles(Array.from({ length: 6 }, (_, index) => ({ name: `${index}.jpg`, size: 9 * 1024 * 1024 })))).toThrow("รวมไม่เกิน 50 MB");
  });

  it("caps aggregate output pixels", () => {
    expect(validateBatchOutputPixels([{ width: 4_000, height: 3_000 }, { width: 2_000, height: 1_000 }])).toBe(14_000_000);
    expect(() => validateBatchOutputPixels([{ width: BATCH_IMAGE_TOTAL_PIXEL_LIMIT + 1, height: 1 }])).toThrow("120 ล้านพิกเซล");
  });
});

describe("batch image filenames", () => {
  it("maps MIME types and creates safe unique output names", () => {
    expect(getBatchImageExtension("image/jpeg")).toBe("jpg");
    expect(getBatchImageExtension("image/png")).toBe("png");
    expect(getBatchImageExtension("image/webp")).toBe("webp");
    expect(createBatchImageOutputNames(["สินค้า 01.JPG", "สินค้า 01.jpg"], "image/png")).toEqual([
      "สินค้า-01-converted.png",
      "สินค้า-01-converted-2.png",
    ]);
  });
});
