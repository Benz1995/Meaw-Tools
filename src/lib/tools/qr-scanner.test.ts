import { describe, expect, it } from "vitest";
import {
  calculateQrScanDimensions,
  classifyQrContent,
  getCameraErrorMessage,
  validateQrImageInput,
} from "@/lib/tools/qr-scanner";

describe("QR scanner helpers", () => {
  it("scales large images without enlarging small ones", () => {
    expect(calculateQrScanDimensions(4_000, 3_000, 1_600)).toEqual({ width: 1_600, height: 1_200 });
    expect(calculateQrScanDimensions(640, 480, 1_600)).toEqual({ width: 640, height: 480 });
    expect(() => calculateQrScanDimensions(0, 480, 1_600)).toThrow("ความกว้าง");
  });

  it("accepts supported image inputs and rejects unsafe sizes or formats", () => {
    expect(() => validateQrImageInput("image/png", 1024)).not.toThrow();
    expect(() => validateQrImageInput("image/svg+xml", 1024)).toThrow("PNG, JPG และ WebP");
    expect(() => validateQrImageInput("image/jpeg", 11 * 1024 * 1024)).toThrow("10 MB");
  });

  it("classifies safe web URLs without treating dangerous schemes as links", () => {
    expect(classifyQrContent("https://example.com/path")).toEqual({
      kind: "url",
      label: "ลิงก์เว็บไซต์",
      safeUrl: "https://example.com/path",
      hostname: "example.com",
    });
    expect(classifyQrContent("javascript:alert(1)")).toEqual({ kind: "text", label: "ข้อความ" });
  });

  it("classifies common QR payloads and explains camera failures", () => {
    expect(classifyQrContent("WIFI:T:WPA;S:Meaw;P:secret;;").kind).toBe("wifi");
    expect(classifyQrContent("mailto:hello@example.com").kind).toBe("email");
    expect(classifyQrContent("BEGIN:VCARD\nVERSION:3.0").kind).toBe("vcard");
    expect(getCameraErrorMessage("NotAllowedError")).toContain("อนุญาต");
    expect(getCameraErrorMessage("UnknownError")).toContain("อัปโหลดรูป");
  });
});
