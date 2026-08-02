import { createImageOutputName, fitImageWithin } from "@/lib/tools/images";

export const OCR_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
export const OCR_MAX_WORKING_DIMENSION = 2_400;
const SUPPORTED_OCR_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type OcrLanguage = "tha+eng" | "tha" | "eng";
export type OcrLayout = "auto" | "sparse";

export function validateOcrImageInput(type: string, size: number) {
  if (!SUPPORTED_OCR_IMAGE_TYPES.has(type)) throw new Error("รองรับเฉพาะไฟล์ PNG, JPG และ WebP");
  if (!Number.isFinite(size) || size <= 0) throw new Error("ไฟล์รูปว่างหรือขนาดไม่ถูกต้อง");
  if (size > OCR_FILE_LIMIT_BYTES) throw new Error("ไฟล์รูปต้องมีขนาดไม่เกิน 10 MB");
}

export function calculateOcrDimensions(width: number, height: number) {
  return fitImageWithin(width, height, OCR_MAX_WORKING_DIMENSION, OCR_MAX_WORKING_DIMENSION);
}

export function getOcrLanguageCodes(language: OcrLanguage): string[] {
  if (language === "tha") return ["tha"];
  if (language === "eng") return ["eng"];
  return ["tha", "eng"];
}

export function normalizeOcrText(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function getOcrProgressLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("loading tesseract core")) return "กำลังโหลด OCR Runtime";
  if (normalized.includes("loading language")) return "กำลังโหลดโมเดลภาษา";
  if (normalized.includes("initializing tesseract")) return "กำลังเตรียมระบบอ่านข้อความ";
  if (normalized.includes("initializing api")) return "กำลังเตรียมภาษา";
  if (normalized.includes("recognizing text")) return "กำลังอ่านข้อความจากรูป";
  return "กำลังเตรียม OCR";
}

export function getOcrConfidenceLabel(confidence: number) {
  if (!Number.isFinite(confidence)) return "ไม่ทราบความมั่นใจ";
  if (confidence >= 85) return "ความมั่นใจสูง";
  if (confidence >= 65) return "ความมั่นใจปานกลาง";
  return "ควรตรวจแก้ผลลัพธ์";
}

export function createOcrTextFilename(imageName: string) {
  return createImageOutputName(imageName, "png", "ocr").replace(/\.png$/, ".txt");
}

export function countOcrLines(text: string) {
  const normalized = normalizeOcrText(text);
  return normalized ? normalized.split("\n").length : 0;
}
