export const PDF_SIGNATURE_PAGE_LIMIT = 100;
export const PDF_SIGNATURE_PLACEMENT_LIMIT = 30;
export const SIGNATURE_IMAGE_LIMIT_BYTES = 5 * 1024 * 1024;

export type PdfPageRotation = 0 | 90 | 180 | 270;

export type PdfSignaturePlacement = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

export type PdfSignatureDrawOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
};

export type SignatureImageLike = {
  name: string;
  size: number;
  type?: string;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizePdfRotation(angle: number): PdfPageRotation {
  const normalized = ((Math.round(angle) % 360) + 360) % 360;
  if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) return normalized;
  throw new Error("มุมหมุนของหน้า PDF ต้องเป็น 0, 90, 180 หรือ 270 องศา");
}

export function clampSignaturePlacement(placement: PdfSignaturePlacement): PdfSignaturePlacement {
  const width = clamp(placement.width, 0.04, 0.95);
  const height = clamp(placement.height, 0.02, 0.8);
  return {
    ...placement,
    pageIndex: Math.max(0, Math.floor(placement.pageIndex)),
    x: clamp(placement.x, 0, 1 - width),
    y: clamp(placement.y, 0, 1 - height),
    width,
    height,
    opacity: clamp(placement.opacity, 0.2, 1),
  };
}

export function createCenteredSignaturePlacement({
  id,
  pageIndex,
  signatureWidth,
  signatureHeight,
  displayWidth,
  displayHeight,
}: {
  id: string;
  pageIndex: number;
  signatureWidth: number;
  signatureHeight: number;
  displayWidth: number;
  displayHeight: number;
}): PdfSignaturePlacement {
  if (signatureWidth <= 0 || signatureHeight <= 0 || displayWidth <= 0 || displayHeight <= 0) {
    throw new Error("ขนาดลายเซ็นหรือหน้า PDF ไม่ถูกต้อง");
  }
  const width = 0.3;
  const height = clamp(width * (displayWidth / displayHeight) * (signatureHeight / signatureWidth), 0.04, 0.28);
  return clampSignaturePlacement({ id, pageIndex, x: 0.5 - width / 2, y: 0.68, width, height, opacity: 1 });
}

export function mapSignaturePlacementToPdf(
  placementInput: PdfSignaturePlacement,
  pageWidth: number,
  pageHeight: number,
  rotationInput: number,
): PdfSignatureDrawOptions {
  if (pageWidth <= 0 || pageHeight <= 0) throw new Error("ขนาดหน้า PDF ไม่ถูกต้อง");
  const placement = clampSignaturePlacement(placementInput);
  const rotation = normalizePdfRotation(rotationInput);
  const displayWidth = rotation === 90 || rotation === 270 ? pageHeight : pageWidth;
  const displayHeight = rotation === 90 || rotation === 270 ? pageWidth : pageHeight;
  const displayX = placement.x * displayWidth;
  const displayTop = placement.y * displayHeight;
  const width = placement.width * displayWidth;
  const height = placement.height * displayHeight;
  const displayBottom = displayHeight - displayTop - height;

  if (rotation === 90) {
    // PDF.js maps a 90-degree page as display (x, y) = (pdfY, pdfX).
    // Rotate the image counter-clockwise in PDF space so it stays upright
    // after the page rotation is applied by the viewer.
    return {
      x: pageWidth - displayBottom,
      y: displayX,
      width,
      height,
      rotation: 90,
      opacity: placement.opacity,
    };
  }
  if (rotation === 180) {
    return {
      x: pageWidth - displayX,
      y: pageHeight - displayBottom,
      width,
      height,
      rotation: -180,
      opacity: placement.opacity,
    };
  }
  if (rotation === 270) {
    // A 270-degree page uses display (x, y) = (pageHeight - pdfY,
    // pageWidth - pdfX); the inverse anchor keeps the full image in bounds.
    return {
      x: displayBottom,
      y: pageHeight - displayX,
      width,
      height,
      rotation: -90,
      opacity: placement.opacity,
    };
  }
  return {
    x: displayX,
    y: displayBottom,
    width,
    height,
    rotation: 0,
    opacity: placement.opacity,
  };
}

export function validateSignatureImage(file: SignatureImageLike): void {
  const acceptedType = file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
  const acceptedExtension = /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!acceptedType && !acceptedExtension) throw new Error("รองรับรูปลายเซ็น PNG, JPG และ WebP เท่านั้น");
  if (file.size <= 0) throw new Error("ไฟล์รูปลายเซ็นว่างเปล่าหรืออ่านไม่ได้");
  if (file.size > SIGNATURE_IMAGE_LIMIT_BYTES) throw new Error("ไฟล์รูปลายเซ็นต้องมีขนาดไม่เกิน 5 MB");
}

export function signedPdfFilename(filename: string): string {
  const stem = filename.trim().replace(/\.pdf$/i, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim();
  return `${stem || "document"}-signed.pdf`;
}
