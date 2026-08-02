import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "@/lib/tools/encoding";

describe("Base64 UTF-8", () => {
  it("round-trips Thai text", () => {
    const value = "สวัสดี DevThai Tools";
    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });
  it("rejects malformed input", () => {
    expect(() => decodeBase64("not valid!")) .toThrow(/Base64/);
  });
});
