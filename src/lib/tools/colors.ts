export type RgbColor = { red: number; green: number; blue: number };
export type HslColor = { hue: number; saturation: number; lightness: number };

function clampChannel(value: number) {
  if (!Number.isFinite(value)) throw new Error("ค่าสีต้องเป็นตัวเลข");
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function normalizeHex(input: string): string {
  const value = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return `#${value.split("").map((character) => character.repeat(2)).join("")}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(value)) return `#${value}`.toUpperCase();
  throw new Error("กรุณากรอกรหัสสี Hex 3 หรือ 6 หลัก");
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex).slice(1);
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((value) => clampChannel(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function rgbToHsl({ red, green, blue }: RgbColor): HslColor {
  const r = clampChannel(red) / 255;
  const g = clampChannel(green) / 255;
  const b = clampChannel(blue) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    hue: Math.round(hue),
    saturation: Math.round(saturation * 1_000) / 10,
    lightness: Math.round(lightness * 1_000) / 10,
  };
}

function linearize(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { red, green, blue } = hexToRgb(hex);
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

export function contrastRatio(firstHex: string, secondHex: string): number {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function getContrastChecks(ratio: number) {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

export function mixHex(firstHex: string, secondHex: string, secondWeight: number): string {
  if (!Number.isFinite(secondWeight) || secondWeight < 0 || secondWeight > 1) {
    throw new Error("น้ำหนักสีต้องอยู่ระหว่าง 0 ถึง 1");
  }
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  return rgbToHex(
    first.red + (second.red - first.red) * secondWeight,
    first.green + (second.green - first.green) * secondWeight,
    first.blue + (second.blue - first.blue) * secondWeight,
  );
}
