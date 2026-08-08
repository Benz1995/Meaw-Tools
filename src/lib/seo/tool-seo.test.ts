import { describe, expect, it } from "vitest";
import { tools } from "@/config/tools";
import { auditToolSeo, buildToolSeoDescription, buildToolSeoTitle, findPrimaryKeywordCannibalization, getToolPrimaryKeyword } from "./tool-seo";

describe("tool page SEO governance", () => {
  it("keeps every tool intent, title, canonical source, and internal link valid", () => {
    expect(auditToolSeo(tools)).toEqual([]);
  });

  it("prevents a page from targeting another page's primary keyword", () => {
    expect(findPrimaryKeywordCannibalization(tools)).toEqual([]);
  });

  it("builds a bilingual title when it remains concise", () => {
    const tool = tools.find((item) => item.slug === "utm-builder")!;

    expect(getToolPrimaryKeyword(tool)).toBe("utm builder");
    expect(buildToolSeoTitle(tool)).toBe("สร้างลิงก์ UTM ออนไลน์ ฟรี — UTM Link Builder");
    expect(buildToolSeoDescription(tool)).toContain("Google Analytics 4");
  });
});
