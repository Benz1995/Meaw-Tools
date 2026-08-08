import { describe, expect, it } from "vitest";
import { buildUtmUrl, emptyUtmFields, parseUtmUrl } from "./utm";

const options = { lowercase: true, spacesToUnderscores: true };

describe("UTM link builder", () => {
  it("preserves existing query parameters and fragments", () => {
    const result = buildUtmUrl(
      "https://example.com/shop?product=ชาไทย#details",
      { ...emptyUtmFields, source: "Facebook", medium: "Paid Social", campaign: "Summer Sale" },
      options,
    );
    const url = new URL(result.url);

    expect(url.searchParams.get("product")).toBe("ชาไทย");
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.get("utm_medium")).toBe("paid_social");
    expect(url.searchParams.get("utm_campaign")).toBe("summer_sale");
    expect(url.hash).toBe("#details");
  });

  it("replaces duplicate managed UTM parameters without touching unrelated parameters", () => {
    const result = buildUtmUrl(
      "https://example.com/?ref=partner&utm_source=old&utm_source=older&utm_medium=email&utm_creative_format=video",
      { ...emptyUtmFields, source: "newsletter", medium: "email", campaign: "august" },
      options,
    );
    const url = new URL(result.url);

    expect(result.replacedParameterCount).toBe(3);
    expect(url.searchParams.getAll("utm_source")).toEqual(["newsletter"]);
    expect(url.searchParams.get("utm_creative_format")).toBe("video");
    expect(url.searchParams.get("ref")).toBe("partner");
  });

  it("keeps case and spaces when normalization is disabled", () => {
    const result = buildUtmUrl(
      "https://example.com",
      { ...emptyUtmFields, source: "Meta Ads", medium: "Paid Social", campaign: "August Promo" },
      { lowercase: false, spacesToUnderscores: false },
    );
    const url = new URL(result.url);

    expect(url.searchParams.get("utm_source")).toBe("Meta Ads");
    expect(url.searchParams.get("utm_campaign")).toBe("August Promo");
  });

  it("imports supported UTM values and returns a clean base URL", () => {
    const parsed = parseUtmUrl("https://example.com/path?sku=1&utm_source=line&utm_medium=social&utm_campaign=flash&utm_content=hero#buy");

    expect(parsed.fields).toMatchObject({ source: "line", medium: "social", campaign: "flash", content: "hero" });
    expect(parsed.importedParameterCount).toBe(4);
    expect(parsed.baseUrl).toBe("https://example.com/path?sku=1#buy");
  });

  it("rejects missing required campaign values", () => {
    expect(() => buildUtmUrl("https://example.com", emptyUtmFields, options)).toThrow(/Campaign Source/);
  });

  it("rejects unsafe schemes, embedded credentials, and malformed URLs", () => {
    const fields = { ...emptyUtmFields, source: "google", medium: "cpc", campaign: "sale" };

    expect(() => buildUtmUrl("javascript:alert(1)", fields, options)).toThrow(/https/);
    expect(() => buildUtmUrl("https://user:secret@example.com", fields, options)).toThrow(/รหัสผ่าน/);
    expect(() => buildUtmUrl("example without protocol", fields, options)).toThrow(/URL ไม่ถูกต้อง/);
  });
});
