import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("JSON-LD serialization", () => {
  it("preserves data while escaping characters that can alter a script element", () => {
    const value = { answer: "ค่า <script>alert('x')</script> & ข้อความ\u2028ต่อ" };
    const serialized = serializeJsonLd(value);

    expect(serialized).not.toContain("<script>");
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("&");
    expect(serialized).toContain("\\u003cscript\\u003e");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
