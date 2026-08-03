export const HEIC_FILE_LIMIT = 10;
export const HEIC_FILE_LIMIT_BYTES = 20 * 1024 * 1024;
export const HEIC_TOTAL_LIMIT_BYTES = 60 * 1024 * 1024;
export const HEIC_MAX_PIXELS = 50_000_000;

const HEIC_EXTENSIONS = /\.(heic|heif)$/i;
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

export type HeicFileLike = {
  name: string;
  size: number;
  type?: string;
};

export function looksLikeHeicFile(file: HeicFileLike): boolean {
  return HEIC_EXTENSIONS.test(file.name.trim()) || HEIC_MIME_TYPES.has(file.type?.toLowerCase() ?? "");
}

export function hasHeicSignature(input: ArrayBuffer | Uint8Array): boolean {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 12) return false;
  const text = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (text(4) !== "ftyp") return false;

  const brandEnd = Math.min(bytes.length - 3, 80);
  let hasHeicBrand = false;
  for (let offset = 8; offset < brandEnd; offset += 4) {
    const brand = text(offset);
    if (AVIF_BRANDS.has(brand)) return false;
    if (HEIC_BRANDS.has(brand)) hasHeicBrand = true;
  }
  return hasHeicBrand;
}

export function validateHeicFiles(files: readonly HeicFileLike[]): void {
  if (!files.length) throw new Error("กรุณาเลือกไฟล์ HEIC หรือ HEIF");
  if (files.length > HEIC_FILE_LIMIT) throw new Error(`เลือกได้สูงสุด ${HEIC_FILE_LIMIT} ไฟล์ต่อครั้ง`);

  let totalBytes = 0;
  for (const file of files) {
    if (!looksLikeHeicFile(file)) throw new Error(`${file.name || "ไฟล์"} ไม่ใช่ไฟล์ HEIC หรือ HEIF`);
    if (file.size <= 0) throw new Error(`${file.name || "ไฟล์"} ว่างเปล่าหรืออ่านไม่ได้`);
    if (file.size > HEIC_FILE_LIMIT_BYTES) throw new Error(`${file.name} มีขนาดเกิน 20 MB`);
    totalBytes += file.size;
  }
  if (totalBytes > HEIC_TOTAL_LIMIT_BYTES) throw new Error("ไฟล์ทั้งหมดต้องมีขนาดรวมไม่เกิน 60 MB");
}

export function clampJpegQuality(value: number): number {
  if (!Number.isFinite(value)) return 0.9;
  return Math.min(1, Math.max(0.6, value));
}

export function fitHeicOutput(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("ขนาดรูป HEIC ไม่ถูกต้อง");
  }
  if (width * height > HEIC_MAX_PIXELS) throw new Error("รูปมีความละเอียดเกิน 50 ล้านพิกเซล");
  if (!Number.isFinite(maxEdge) || maxEdge <= 0 || Math.max(width, height) <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function heicJpegFilename(filename: string): string {
  const stem = filename
    .trim()
    .replace(/\.(heic|heif)$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return `${stem || "meaw-photo"}.jpg`;
}

export { makeUniqueFilenames } from "@/lib/tools/images";
