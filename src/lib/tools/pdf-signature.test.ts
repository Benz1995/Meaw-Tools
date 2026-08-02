import { describe, expect, it } from "vitest";
import {
  clampSignaturePlacement,
  createCenteredSignaturePlacement,
  mapSignaturePlacementToPdf,
  normalizePdfRotation,
  signedPdfFilename,
  validateSignatureImage,
  type PdfSignaturePlacement,
} from "@/lib/tools/pdf-signature";

const placement: PdfSignaturePlacement = {
  id: "signature-1",
  pageIndex: 0,
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.1,
  opacity: 0.75,
};

describe("PDF signature placement", () => {
  it("maps top-left preview coordinates onto unrotated PDF coordinates", () => {
    expect(mapSignaturePlacementToPdf(placement, 600, 800, 0)).toEqual({
      x: 60,
      y: 560,
      width: 180,
      height: 80,
      rotation: 0,
      opacity: 0.75,
    });
  });

  it("keeps signatures upright on rotated PDF pages", () => {
    expect(mapSignaturePlacementToPdf(placement, 600, 800, 90)).toEqual({
      x: 180,
      y: 80,
      width: 240,
      height: 60,
      rotation: 90,
      opacity: 0.75,
    });
    expect(mapSignaturePlacementToPdf(placement, 600, 800, 180)).toEqual({
      x: 540,
      y: 240,
      width: 180,
      height: 80,
      rotation: -180,
      opacity: 0.75,
    });
    expect(mapSignaturePlacementToPdf(placement, 600, 800, 270)).toEqual({
      x: 420,
      y: 720,
      width: 240,
      height: 60,
      rotation: -90,
      opacity: 0.75,
    });
  });

  it("creates and clamps a centered placement without losing its aspect ratio", () => {
    const centered = createCenteredSignaturePlacement({
      id: "new",
      pageIndex: 2,
      signatureWidth: 600,
      signatureHeight: 200,
      displayWidth: 600,
      displayHeight: 800,
    });
    expect(centered).toMatchObject({ id: "new", pageIndex: 2, x: 0.35, y: 0.68, width: 0.3, opacity: 1 });
    expect(centered.height).toBeCloseTo(0.075, 8);
    expect(clampSignaturePlacement({ ...placement, x: -2, y: 5, width: 2, height: 0, opacity: 4 })).toMatchObject({ x: 0, y: 0.98, width: 0.95, height: 0.02, opacity: 1 });
  });

  it("validates rotations, signature files, and safe output filenames", () => {
    expect(normalizePdfRotation(-90)).toBe(270);
    expect(() => normalizePdfRotation(45)).toThrow("0, 90, 180 หรือ 270");
    expect(() => validateSignatureImage({ name: "sign.png", type: "image/png", size: 100 })).not.toThrow();
    expect(() => validateSignatureImage({ name: "sign.svg", type: "image/svg+xml", size: 100 })).toThrow("PNG, JPG และ WebP");
    expect(signedPdfFilename("สัญญา: งาน/2026.PDF")).toBe("สัญญา- งาน-2026-signed.pdf");
  });
});
