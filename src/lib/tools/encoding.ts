import { assertWithinLimit } from "@/lib/tools/limits";

export function encodeBase64(value: string): string {
  assertWithinLimit(value);
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeBase64(value: string): string {
  assertWithinLimit(value);
  const normalized = value.replace(/\s/g, "");
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("Base64 ไม่ถูกต้อง กรุณาตรวจสอบตัวอักษรและ padding");
  }
  try {
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("ไม่สามารถถอด Base64 เป็นข้อความ UTF-8 ได้");
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
