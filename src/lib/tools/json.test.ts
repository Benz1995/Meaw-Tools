import { describe, expect, it } from "vitest";
import { formatJson, minifyJson, validateJson } from "@/lib/tools/json";

describe("JSON tools", () => {
  it("formats and minifies valid JSON", () => {
    const input = '{"name":"DevThai","items":[1,2]}';
    expect(formatJson(input, 2)).toContain('\n  "name"');
    expect(minifyJson(input)).toBe(input);
  });
  it("returns structure statistics", () => {
    const result = validateJson('{"a":{},"b":[{"c":1}]}');
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.stats).toEqual({ objects: 3, arrays: 1, keys: 3 });
  });
  it("reports malformed JSON", () => {
    const result = validateJson('{"name": }');
    expect(result.valid).toBe(false);
  });
});
