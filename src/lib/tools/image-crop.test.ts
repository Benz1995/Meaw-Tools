import { describe, expect, it } from "vitest";
import {
  createCenteredCrop,
  cropFromPixels,
  cropToPixels,
  getTransformedDimensions,
  moveCrop,
  resizeCrop,
  validateCropOutput,
} from "@/lib/tools/image-crop";

describe("image crop geometry", () => {
  it("swaps transformed dimensions for quarter turns", () => {
    expect(getTransformedDimensions(1_200, 800, 0)).toEqual({ width: 1_200, height: 800 });
    expect(getTransformedDimensions(1_200, 800, 90)).toEqual({ width: 800, height: 1_200 });
    expect(getTransformedDimensions(1_200, 800, 270)).toEqual({ width: 800, height: 1_200 });
  });

  it("creates a centered crop in the requested pixel aspect ratio", () => {
    const crop = createCenteredCrop(1_600, 900, 1);
    const pixels = cropToPixels(crop, 1_600, 900);
    expect(pixels.width).toBe(pixels.height);
    expect(crop.x + crop.width / 2).toBeCloseTo(0.5);
    expect(crop.y + crop.height / 2).toBeCloseTo(0.5);
  });

  it("keeps movement inside the image", () => {
    const crop = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    expect(moveCrop(crop, 1, -1)).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
  });

  it("keeps a locked aspect ratio while resizing at an edge", () => {
    const crop = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    const resized = resizeCrop(crop, "se", 0.4, 0.1, 1_200, 800, 16 / 9);
    const pixels = cropToPixels(resized, 1_200, 800);
    expect(pixels.width / pixels.height).toBeCloseTo(16 / 9, 2);
    expect(resized.x + resized.width).toBeLessThanOrEqual(1);
    expect(resized.y + resized.height).toBeLessThanOrEqual(1);
  });

  it("round-trips a pixel crop and clamps it to the source", () => {
    const normalized = cropFromPixels({ x: 950, y: 700, width: 400, height: 300 }, 1_200, 800);
    expect(cropToPixels(normalized, 1_200, 800)).toEqual({ x: 800, y: 500, width: 400, height: 300 });
  });
});

describe("crop output limits", () => {
  it("accepts a practical output size", () => {
    expect(() => validateCropOutput(4_000, 4_000)).not.toThrow();
  });

  it("rejects invalid, overlong and memory-heavy output", () => {
    expect(() => validateCropOutput(0, 500)).toThrow("อย่างน้อย 1");
    expect(() => validateCropOutput(8_001, 500)).toThrow("8,000");
    expect(() => validateCropOutput(6_000, 6_000)).toThrow("24 ล้าน");
  });
});
