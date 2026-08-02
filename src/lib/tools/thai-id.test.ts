import { describe, expect, it } from "vitest";
import { validateThaiId } from "@/lib/tools/thai-id";

describe("validateThaiId", () => {
  it("accepts a 13-digit value with a matching check digit", () => {
    expect(validateThaiId("1234567890121")).toEqual({
      code: "valid",
      isValid: true,
      digitCount: 13,
      formatValid: true,
      categoryValid: true,
      checksumValid: true,
    });
  });

  it("accepts spaces and hyphens as separators", () => {
    expect(validateThaiId("1-2345-67890-12-1").code).toBe("valid");
    expect(validateThaiId("1 2345 67890 12 1").code).toBe("valid");
  });

  it("rejects a mismatched check digit", () => {
    expect(validateThaiId("1234567890120")).toMatchObject({
      code: "invalid_checksum",
      isValid: false,
      formatValid: true,
      categoryValid: true,
      checksumValid: false,
    });
  });

  it("rejects categories outside the official 1-8 range", () => {
    expect(validateThaiId("0000000000000")).toMatchObject({
      code: "invalid_category",
      categoryValid: false,
      checksumValid: null,
    });
  });

  it("distinguishes empty, wrong-length, and unsupported input", () => {
    expect(validateThaiId("").code).toBe("empty");
    expect(validateThaiId("1234")).toMatchObject({ code: "wrong_length", digitCount: 4 });
    expect(validateThaiId("1234A67890121")).toMatchObject({ code: "invalid_characters", digitCount: 12 });
  });
});
