import { describe, expect, it } from "vitest";
import { decodeJwtLocally } from "@/lib/tools/jwt";

describe("JWT decoder", () => {
  it("decodes payload without verifying signature", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjE3MDQwNjcyMDB9.signature";
    const result = decodeJwtLocally(token, new Date("2024-01-02T00:00:00Z"));
    expect(result.payload.sub).toBe("123");
    expect(result.expired).toBe(true);
  });
  it("requires three token parts", () => {
    expect(() => decodeJwtLocally("invalid.token")).toThrow(/3 ส่วน/);
  });
});
