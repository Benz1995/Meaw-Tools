export type IconFitMode = "contain" | "cover";

export type IconDrawPlan = {
  sx: number;
  sy: number;
  sourceWidth: number;
  sourceHeight: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
};

export type PngIconLayer = {
  size: number;
  bytes: Uint8Array;
};

export type WebManifestOptions = {
  name: string;
  shortName: string;
  startUrl: string;
  themeColor: string;
  backgroundColor: string;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const FAVICON_SOURCE_MIN_RECOMMENDED = 512;
export const FAVICON_APP_NAME_LIMIT = 100;
export const FAVICON_SHORT_NAME_LIMIT = 30;

function assertPositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} ต้องมากกว่า 0`);
}

export function calculateIconDrawPlan(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  paddingPercent: number,
  fitMode: IconFitMode,
): IconDrawPlan {
  assertPositive(sourceWidth, "ความกว้างต้นฉบับ");
  assertPositive(sourceHeight, "ความสูงต้นฉบับ");
  assertPositive(targetSize, "ขนาดไอคอน");
  if (!Number.isFinite(paddingPercent) || paddingPercent < 0 || paddingPercent > 40) {
    throw new Error("ระยะขอบต้องอยู่ระหว่าง 0–40%");
  }

  if (fitMode === "cover") {
    const sourceSize = Math.min(sourceWidth, sourceHeight);
    return {
      sx: (sourceWidth - sourceSize) / 2,
      sy: (sourceHeight - sourceSize) / 2,
      sourceWidth: sourceSize,
      sourceHeight: sourceSize,
      dx: 0,
      dy: 0,
      width: targetSize,
      height: targetSize,
    };
  }

  const available = targetSize * (1 - paddingPercent / 50);
  const scale = Math.min(available / sourceWidth, available / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    sx: 0,
    sy: 0,
    sourceWidth,
    sourceHeight,
    dx: (targetSize - width) / 2,
    dy: (targetSize - height) / 2,
    width,
    height,
  };
}

export function validateHexColor(value: string, label: string) {
  if (!HEX_COLOR.test(value)) throw new Error(`${label} ต้องเป็นรหัสสี Hex 6 หลัก`);
}

function isPng(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

export function createMultiSizeIco(layers: readonly PngIconLayer[]): Uint8Array {
  if (layers.length < 1 || layers.length > 255) throw new Error("ICO ต้องมีรูปอย่างน้อย 1 และไม่เกิน 255 ขนาด");
  const seenSizes = new Set<number>();
  for (const layer of layers) {
    if (!Number.isInteger(layer.size) || layer.size < 1 || layer.size > 256) throw new Error("ขนาดใน ICO ต้องเป็นจำนวนเต็ม 1–256 พิกเซล");
    if (seenSizes.has(layer.size)) throw new Error(`ขนาด ICO ซ้ำ: ${layer.size}×${layer.size}`);
    if (!isPng(layer.bytes)) throw new Error(`ข้อมูล ${layer.size}×${layer.size} ไม่ใช่ PNG`);
    seenSizes.add(layer.size);
  }

  const directoryBytes = 6 + layers.length * 16;
  const totalBytes = directoryBytes + layers.reduce((sum, layer) => sum + layer.bytes.length, 0);
  const output = new Uint8Array(totalBytes);
  const view = new DataView(output.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, layers.length, true);

  let dataOffset = directoryBytes;
  layers.forEach((layer, index) => {
    const entryOffset = 6 + index * 16;
    output[entryOffset] = layer.size === 256 ? 0 : layer.size;
    output[entryOffset + 1] = layer.size === 256 ? 0 : layer.size;
    output[entryOffset + 2] = 0;
    output[entryOffset + 3] = 0;
    view.setUint16(entryOffset + 4, 1, true);
    view.setUint16(entryOffset + 6, 32, true);
    view.setUint32(entryOffset + 8, layer.bytes.length, true);
    view.setUint32(entryOffset + 12, dataOffset, true);
    output.set(layer.bytes, dataOffset);
    dataOffset += layer.bytes.length;
  });

  return output;
}

export function validateManifestPath(value: string) {
  if (!/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(value) || value.includes(":")) {
    throw new Error("Start URL ต้องเป็น path ภายในเว็บไซต์และขึ้นต้นด้วย / เช่น / หรือ /app/");
  }
}

export function buildWebManifest(options: WebManifestOptions): string {
  const name = options.name.trim();
  const shortName = options.shortName.trim();
  if (!name || name.length > FAVICON_APP_NAME_LIMIT) throw new Error(`ชื่อแอปต้องมี 1–${FAVICON_APP_NAME_LIMIT} ตัวอักษร`);
  if (!shortName || shortName.length > FAVICON_SHORT_NAME_LIMIT) throw new Error(`ชื่อย่อต้องมี 1–${FAVICON_SHORT_NAME_LIMIT} ตัวอักษร`);
  validateManifestPath(options.startUrl);
  validateHexColor(options.themeColor, "สี Theme");
  validateHexColor(options.backgroundColor, "สีพื้นหลัง");

  return JSON.stringify({
    name,
    short_name: shortName,
    start_url: options.startUrl,
    id: options.startUrl,
    display: "standalone",
    theme_color: options.themeColor,
    background_color: options.backgroundColor,
    icons: [
      { src: "./pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "./pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "./pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, null, 2);
}

export function buildFaviconHeadSnippet(themeColor: string): string {
  validateHexColor(themeColor, "สี Theme");
  return [
    '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<meta name="theme-color" content="${themeColor}">`,
  ].join("\n");
}

export function buildFaviconReadme(): string {
  return [
    "Meaw Tools — Favicon & PWA Icon Package",
    "",
    "1. วางไฟล์ทั้งหมดไว้ที่ public root หรือแก้ path ใน HTML/manifest ให้ตรงกับโปรเจกต์",
    "2. วางเนื้อหาจาก favicon-head.html ไว้ภายใน <head>",
    "3. ให้ Server ส่ง site.webmanifest เป็น application/manifest+json หรือ application/json",
    "4. ตรวจ favicon ที่ขนาด 16px และตรวจ maskable safe zone ใน DevTools ก่อน Deploy",
    "5. Manifest กับไอคอนอย่างเดียวไม่ได้ทำให้เว็บติดตั้งเป็น PWA ต้องมี HTTPS และเงื่อนไขของ Browser เพิ่มเติม",
    "",
    "ไฟล์ถูกสร้างใน Browser และไม่คัดลอก EXIF, GPS หรือ metadata เดิม",
  ].join("\n");
}
