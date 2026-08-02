export const QR_SCAN_MAX_IMAGE_DIMENSION = 1_600;
export const QR_SCAN_MAX_CAMERA_DIMENSION = 960;
export const QR_SCAN_FILE_LIMIT_BYTES = 10 * 1024 * 1024;
const SUPPORTED_QR_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type QrContentKind = "url" | "email" | "phone" | "wifi" | "vcard" | "text";

export type QrContentInfo = {
  kind: QrContentKind;
  label: string;
  safeUrl?: string;
  hostname?: string;
};

function assertPositiveDimension(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} ต้องมากกว่า 0`);
}

export function calculateQrScanDimensions(width: number, height: number, maxDimension: number) {
  assertPositiveDimension(width, "ความกว้าง");
  assertPositiveDimension(height, "ความสูง");
  assertPositiveDimension(maxDimension, "ขนาดสูงสุด");
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function validateQrImageInput(type: string, size: number) {
  if (!SUPPORTED_QR_IMAGE_TYPES.has(type)) {
    throw new Error("รองรับเฉพาะไฟล์ PNG, JPG และ WebP");
  }
  if (!Number.isFinite(size) || size <= 0) throw new Error("ไฟล์รูปว่างหรือขนาดไม่ถูกต้อง");
  if (size > QR_SCAN_FILE_LIMIT_BYTES) throw new Error("ไฟล์รูปต้องมีขนาดไม่เกิน 10 MB");
}

export function classifyQrContent(value: string): QrContentInfo {
  const normalized = value.trim();
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return { kind: "url", label: "ลิงก์เว็บไซต์", safeUrl: url.href, hostname: url.hostname };
      }
    } catch {
      // Invalid URLs are shown as plain text and are never opened automatically.
    }
  }
  if (/^mailto:/i.test(normalized)) return { kind: "email", label: "อีเมล" };
  if (/^tel:/i.test(normalized)) return { kind: "phone", label: "หมายเลขโทรศัพท์" };
  if (/^wifi:/i.test(normalized)) return { kind: "wifi", label: "ข้อมูล Wi-Fi" };
  if (/^begin:vcard/i.test(normalized)) return { kind: "vcard", label: "ข้อมูลผู้ติดต่อ" };
  return { kind: "text", label: "ข้อความ" };
}

export function getCameraErrorMessage(errorName: string) {
  switch (errorName) {
    case "NotAllowedError":
    case "SecurityError":
      return "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาต Camera ใน Browser แล้วลองใหม่";
    case "NotFoundError":
    case "OverconstrainedError":
      return "ไม่พบกล้องที่ใช้งานได้บนอุปกรณ์นี้";
    case "NotReadableError":
    case "AbortError":
      return "เปิดกล้องไม่ได้ อาจมีกล้องถูกใช้งานโดยแอปอื่น";
    default:
      return "เปิดกล้องไม่สำเร็จ กรุณาลองอัปโหลดรูป QR Code แทน";
  }
}
