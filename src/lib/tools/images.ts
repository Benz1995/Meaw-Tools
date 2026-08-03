export const IMAGE_MAX_DIMENSION = 8_000;
export const IMAGE_MAX_PIXELS = 40_000_000;

export type ImageDimensions = {
  width: number;
  height: number;
};

function assertPositiveDimension(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} ต้องมากกว่า 0`);
  }
}

export function fitImageWithin(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
  allowUpscale = false,
): ImageDimensions {
  assertPositiveDimension(sourceWidth, "ความกว้างต้นฉบับ");
  assertPositiveDimension(sourceHeight, "ความสูงต้นฉบับ");
  assertPositiveDimension(maxWidth, "ความกว้างสูงสุด");
  assertPositiveDimension(maxHeight, "ความสูงสูงสุด");

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const safeScale = allowUpscale ? scale : Math.min(scale, 1);

  return {
    width: Math.max(1, Math.round(sourceWidth * safeScale)),
    height: Math.max(1, Math.round(sourceHeight * safeScale)),
  };
}

export function validateDecodedImage(width: number, height: number) {
  assertPositiveDimension(width, "ความกว้างรูป");
  assertPositiveDimension(height, "ความสูงรูป");

  if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
    throw new Error(`รูปต้องมีด้านยาวไม่เกิน ${IMAGE_MAX_DIMENSION.toLocaleString("th-TH")} พิกเซล`);
  }

  if (width * height > IMAGE_MAX_PIXELS) {
    throw new Error("รูปต้องมีความละเอียดรวมไม่เกิน 40 ล้านพิกเซล");
  }
}

export function formatImageBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0 B";
  if (value < 1_024) return `${Math.round(value)} B`;
  if (value < 1_024 * 1_024) return `${(value / 1_024).toFixed(1)} KB`;
  return `${(value / 1_024 / 1_024).toFixed(2)} MB`;
}

export function calculateSavingPercent(originalBytes: number, outputBytes: number): number {
  if (originalBytes <= 0 || !Number.isFinite(originalBytes) || !Number.isFinite(outputBytes)) return 0;
  return Math.round((1 - outputBytes / originalBytes) * 1_000) / 10;
}

export function createImageOutputName(filename: string, extension: "jpg" | "png" | "webp", suffix = "optimized") {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const safeBase = withoutExtension
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "meaw-image";
  return `${safeBase}-${suffix}.${extension}`;
}

export function makeUniqueFilenames(filenames: readonly string[]): string[] {
  const counts = new Map<string, number>();
  return filenames.map((filename) => {
    const key = filename.toLocaleLowerCase("en-US");
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count === 1) return filename;
    const dot = filename.lastIndexOf(".");
    return dot > 0 ? `${filename.slice(0, dot)}-${count}${filename.slice(dot)}` : `${filename}-${count}`;
  });
}
