export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropHandle = "nw" | "ne" | "sw" | "se";
export type CropRotation = 0 | 90 | 180 | 270;

export const CROP_OUTPUT_MAX_DIMENSION = 8_000;
export const CROP_OUTPUT_MAX_PIXELS = 24_000_000;

const MIN_CROP_PIXELS = 24;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getTransformedDimensions(width: number, height: number, rotation: CropRotation) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function createCenteredCrop(imageWidth: number, imageHeight: number, aspectRatio: number | null): CropRect {
  if (imageWidth <= 0 || imageHeight <= 0) throw new Error("ขนาดรูปต้องมากกว่า 0");

  const maximum = 0.82;
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { x: 0.09, y: 0.09, width: maximum, height: maximum };
  }

  const normalizedRatio = aspectRatio * imageHeight / imageWidth;
  let width = maximum;
  let height = width / normalizedRatio;
  if (height > maximum) {
    height = maximum;
    width = height * normalizedRatio;
  }

  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}

export function moveCrop(rect: CropRect, deltaX: number, deltaY: number): CropRect {
  return {
    ...rect,
    x: clamp(rect.x + deltaX, 0, 1 - rect.width),
    y: clamp(rect.y + deltaY, 0, 1 - rect.height),
  };
}

export function resizeCrop(
  rect: CropRect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number | null,
): CropRect {
  const west = handle.endsWith("w");
  const north = handle.startsWith("n");
  const anchorX = west ? rect.x + rect.width : rect.x;
  const anchorY = north ? rect.y + rect.height : rect.y;
  const edgeX = (west ? rect.x : rect.x + rect.width) + deltaX;
  const edgeY = (north ? rect.y : rect.y + rect.height) + deltaY;
  const minimumWidth = Math.min(1, MIN_CROP_PIXELS / imageWidth);
  const minimumHeight = Math.min(1, MIN_CROP_PIXELS / imageHeight);
  const maximumWidth = west ? anchorX : 1 - anchorX;
  const maximumHeight = north ? anchorY : 1 - anchorY;

  let width = clamp(Math.abs(anchorX - edgeX), minimumWidth, maximumWidth);
  let height = clamp(Math.abs(anchorY - edgeY), minimumHeight, maximumHeight);

  if (aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0) {
    const requestedWidthPixels = width * imageWidth;
    const requestedHeightPixels = height * imageHeight;
    let targetWidthPixels = Math.abs(deltaX * imageWidth) >= Math.abs(deltaY * imageHeight)
      ? requestedWidthPixels
      : requestedHeightPixels * aspectRatio;
    const minimumPixels = Math.max(MIN_CROP_PIXELS, MIN_CROP_PIXELS * aspectRatio);
    const maximumPixels = Math.min(maximumWidth * imageWidth, maximumHeight * imageHeight * aspectRatio);
    targetWidthPixels = clamp(targetWidthPixels, Math.min(minimumPixels, maximumPixels), maximumPixels);
    width = targetWidthPixels / imageWidth;
    height = targetWidthPixels / aspectRatio / imageHeight;
  }

  return {
    x: west ? anchorX - width : anchorX,
    y: north ? anchorY - height : anchorY,
    width,
    height,
  };
}

export function cropToPixels(rect: CropRect, imageWidth: number, imageHeight: number) {
  const x = clamp(Math.round(rect.x * imageWidth), 0, Math.max(0, imageWidth - 1));
  const y = clamp(Math.round(rect.y * imageHeight), 0, Math.max(0, imageHeight - 1));
  const width = clamp(Math.round(rect.width * imageWidth), 1, imageWidth - x);
  const height = clamp(Math.round(rect.height * imageHeight), 1, imageHeight - y);
  return { x, y, width, height };
}

export function cropFromPixels(
  rect: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const width = clamp(Math.round(rect.width), 1, imageWidth);
  const height = clamp(Math.round(rect.height), 1, imageHeight);
  const x = clamp(Math.round(rect.x), 0, imageWidth - width);
  const y = clamp(Math.round(rect.y), 0, imageHeight - height);
  return { x: x / imageWidth, y: y / imageHeight, width: width / imageWidth, height: height / imageHeight };
}

export function validateCropOutput(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("ขนาดผลลัพธ์ต้องเป็นจำนวนเต็มอย่างน้อย 1 พิกเซล");
  }
  if (width > CROP_OUTPUT_MAX_DIMENSION || height > CROP_OUTPUT_MAX_DIMENSION) {
    throw new Error(`ผลลัพธ์ต้องมีด้านยาวไม่เกิน ${CROP_OUTPUT_MAX_DIMENSION.toLocaleString("th-TH")} พิกเซล`);
  }
  if (width * height > CROP_OUTPUT_MAX_PIXELS) {
    throw new Error("ผลลัพธ์ต้องมีความละเอียดรวมไม่เกิน 24 ล้านพิกเซล");
  }
}
