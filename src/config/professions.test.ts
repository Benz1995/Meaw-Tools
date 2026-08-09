import { describe, expect, it } from "vitest";
import { professionConfigs } from "@/config/professions";
import { tools } from "@/config/tools";

describe("profession navigation", () => {
  it("uses unique, valid profession slugs and useful page content", () => {
    const slugs = professionConfigs.map((profession) => profession.value);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(professionConfigs.length).toBeGreaterThanOrEqual(10);

    for (const profession of professionConfigs) {
      expect(profession.value).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(profession.description.length).toBeGreaterThanOrEqual(100);
      expect(profession.keywords.length).toBeGreaterThanOrEqual(3);
      expect(profession.highlights.length).toBe(3);
      expect(profession.toolSlugs.length).toBeGreaterThanOrEqual(8);
      expect(new Set(profession.toolSlugs).size).toBe(profession.toolSlugs.length);
    }
  });

  it("maps only existing tools and gives every tool at least one profession", () => {
    const toolSlugs = new Set(tools.map((tool) => tool.slug));
    const mappedSlugs = new Set(professionConfigs.flatMap((profession) => profession.toolSlugs));

    for (const profession of professionConfigs) {
      for (const slug of profession.toolSlugs) expect(toolSlugs.has(slug), `${profession.value}: ${slug}`).toBe(true);
    }

    const unmapped = tools.map((tool) => tool.slug).filter((slug) => !mappedSlugs.has(slug));
    expect(unmapped).toEqual([]);
  });
});
