import { describe, expect, it } from "vitest";
import { BACKGROUND_REMOVAL_MAX_DIMENSION, BACKGROUND_REMOVAL_MAX_PIXELS, BACKGROUND_REMOVAL_MODEL, BACKGROUND_REMOVAL_MODEL_URL, createAlphaMaskPixels, getModelDownloadPercent } from "@/lib/tools/background-removal";

describe("background removal helpers", () => {
  it("uses the reviewed lightweight model", () => {
    expect(BACKGROUND_REMOVAL_MODEL).toBe("BritishWerewolf/U-2-Netp");
    expect(BACKGROUND_REMOVAL_MODEL_URL).toContain("BritishWerewolf/U-2-Netp/resolve/main/onnx/model.onnx");
    expect(BACKGROUND_REMOVAL_MAX_DIMENSION).toBe(4_096);
    expect(BACKGROUND_REMOVAL_MAX_PIXELS).toBe(16_000_000);
  });

  it("normalizes valid model download progress", () => {
    expect(getModelDownloadPercent({ status: "progress", progress: 42.4 })).toBe(42);
    expect(getModelDownloadPercent({ status: "progress", progress: 140 })).toBe(100);
    expect(getModelDownloadPercent({ status: "progress", progress: -5 })).toBe(0);
  });

  it("ignores unrelated or invalid events", () => {
    expect(getModelDownloadPercent({ status: "ready", progress: 100 })).toBeNull();
    expect(getModelDownloadPercent({ status: "progress", progress: Number.NaN })).toBeNull();
    expect(getModelDownloadPercent(null)).toBeNull();
  });

  it("stores normalized mask values in the alpha channel", () => {
    expect(Array.from(createAlphaMaskPixels(new Float32Array([0.1, 0.5, 0.9])))).toEqual([
      255, 255, 255, 0,
      255, 255, 255, 128,
      255, 255, 255, 255,
    ]);
  });
});
