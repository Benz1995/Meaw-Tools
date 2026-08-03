import { IMAGE_FILE_COUNT_LIMIT, IMAGE_FILE_LIMIT_BYTES, IMAGE_TOTAL_LIMIT_BYTES } from "@/lib/tools/limits";
import { createImageOutputName, makeUniqueFilenames } from "@/lib/tools/images";

export const BATCH_IMAGE_TOTAL_PIXEL_LIMIT = 120_000_000;

export type BatchImageOutputMime = "image/jpeg" | "image/png" | "image/webp";
export type BatchImageFileLike = { name: string; size: number; type?: string };
export type BatchImageDimensions = { width: number; height: number };

const BATCH_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const BATCH_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function looksLikeBatchImage(file: BatchImageFileLike) {
  return BATCH_IMAGE_EXTENSIONS.test(file.name.trim()) || BATCH_IMAGE_MIME_TYPES.has(file.type?.toLowerCase() ?? "");
}

export function detectBatchImageMime(bytes: Uint8Array): BatchImageOutputMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 12) {
    const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
    if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  }
  return null;
}

export function validateBatchImageFiles(files: readonly BatchImageFileLike[]) {
  if (!files.length) throw new Error("กรุณาเลือกไฟล์ JPG, PNG หรือ WebP");
  if (files.length > IMAGE_FILE_COUNT_LIMIT) throw new Error(`เลือกได้สูงสุด ${IMAGE_FILE_COUNT_LIMIT} ไฟล์ต่อครั้ง`);

  let totalBytes = 0;
  for (const file of files) {
    if (!looksLikeBatchImage(file)) throw new Error(`${file.name || "ไฟล์"} ไม่ใช่ไฟล์ JPG, PNG หรือ WebP`);
    if (file.size <= 0) throw new Error(`${file.name || "ไฟล์"} ว่างเปล่าหรืออ่านไม่ได้`);
    if (file.size > IMAGE_FILE_LIMIT_BYTES) throw new Error(`${file.name} มีขนาดเกิน 10 MB`);
    totalBytes += file.size;
  }
  if (totalBytes > IMAGE_TOTAL_LIMIT_BYTES) throw new Error("ไฟล์ทั้งหมดต้องมีขนาดรวมไม่เกิน 50 MB");
}

export function validateBatchOutputPixels(dimensions: readonly BatchImageDimensions[]) {
  const totalPixels = dimensions.reduce((sum, item) => sum + item.width * item.height, 0);
  if (!Number.isFinite(totalPixels) || totalPixels <= 0) throw new Error("ขนาดรูปผลลัพธ์ไม่ถูกต้อง");
  if (totalPixels > BATCH_IMAGE_TOTAL_PIXEL_LIMIT) {
    throw new Error("รูปผลลัพธ์รวมต้องไม่เกิน 120 ล้านพิกเซล เลือกขนาดด้านยาวที่เล็กลงหรือลดจำนวนไฟล์");
  }
  return totalPixels;
}

export function getBatchImageExtension(mime: BatchImageOutputMime): "jpg" | "png" | "webp" {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export function createBatchImageOutputNames(filenames: readonly string[], mime: BatchImageOutputMime) {
  const extension = getBatchImageExtension(mime);
  return makeUniqueFilenames(filenames.map((filename) => createImageOutputName(filename, extension, "converted")));
}
