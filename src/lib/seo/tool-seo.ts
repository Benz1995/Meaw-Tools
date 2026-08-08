import type { ToolConfig } from "@/types/tool";

export type ToolSeoIssue = {
  slug: string;
  rule: string;
  message: string;
};

function normalizeKeyword(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function getToolPrimaryKeyword(tool: ToolConfig): string {
  return tool.keywords[0]?.trim() ?? "";
}

export function buildToolSeoTitle(tool: ToolConfig): string {
  const thaiTitle = `${tool.thaiName} ฟรี`;
  const alreadyContainsEnglishName = normalizeKeyword(tool.thaiName).includes(normalizeKeyword(tool.name));
  const bilingualTitle = alreadyContainsEnglishName ? thaiTitle : `${thaiTitle} — ${tool.name}`;
  return bilingualTitle.length <= 76 ? bilingualTitle : thaiTitle;
}

export function buildToolSeoDescription(tool: ToolConfig): string {
  return `${tool.description} ใช้งานฟรี ไม่ต้องสมัครสมาชิก และประมวลผลภายใน Browser`;
}

export function findPrimaryKeywordCannibalization(tools: ToolConfig[]): ToolSeoIssue[] {
  const issues: ToolSeoIssue[] = [];
  const primaryOwners = new Map(tools.map((tool) => [normalizeKeyword(getToolPrimaryKeyword(tool)), tool.slug]));

  for (const tool of tools) {
    for (const keyword of tool.keywords.slice(1)) {
      const normalized = normalizeKeyword(keyword);
      const primaryOwner = primaryOwners.get(normalized);
      if (primaryOwner && primaryOwner !== tool.slug) {
        issues.push({
          slug: tool.slug,
          rule: "primary-keyword-cannibalization",
          message: `keyword ซ้ำกับ primary intent ของ ${primaryOwner}: ${keyword}`,
        });
      }
    }
  }

  return issues;
}

export function auditToolSeo(tools: ToolConfig[]): ToolSeoIssue[] {
  const issues: ToolSeoIssue[] = [...findPrimaryKeywordCannibalization(tools)];
  const seen = {
    slug: new Map<string, string>(),
    name: new Map<string, string>(),
    thaiName: new Map<string, string>(),
    primaryKeyword: new Map<string, string>(),
    title: new Map<string, string>(),
  };
  const slugs = new Set(tools.map((tool) => tool.slug));

  const claimUnique = (kind: keyof typeof seen, value: string, slug: string) => {
    const normalized = normalizeKeyword(value);
    const existing = seen[kind].get(normalized);
    if (existing) issues.push({ slug, rule: `unique-${kind}`, message: `${kind} ซ้ำกับ ${existing}: ${value}` });
    else seen[kind].set(normalized, slug);
  };

  for (const tool of tools) {
    const primaryKeyword = getToolPrimaryKeyword(tool);
    const title = buildToolSeoTitle(tool);
    const description = buildToolSeoDescription(tool);
    claimUnique("slug", tool.slug, tool.slug);
    claimUnique("name", tool.name, tool.slug);
    claimUnique("thaiName", tool.thaiName, tool.slug);
    claimUnique("primaryKeyword", primaryKeyword, tool.slug);
    claimUnique("title", title, tool.slug);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) issues.push({ slug: tool.slug, rule: "slug-format", message: "slug ต้องเป็น lowercase kebab-case" });
    if (!primaryKeyword) issues.push({ slug: tool.slug, rule: "primary-keyword", message: "keywords[0] ต้องเป็น primary keyword" });
    const visibleIntent = normalizeKeyword([tool.name, tool.thaiName, tool.shortDescription, tool.description, title].join(" "));
    if (primaryKeyword && !visibleIntent.includes(normalizeKeyword(primaryKeyword))) issues.push({ slug: tool.slug, rule: "primary-keyword-placement", message: `ไม่พบ primary keyword ในชื่อหรือเนื้อหาหลัก: ${primaryKeyword}` });
    if (tool.keywords.length < 5) issues.push({ slug: tool.slug, rule: "keyword-depth", message: "ควรมี keyword ที่เกี่ยวข้องอย่างน้อย 5 คำ" });
    if (new Set(tool.keywords.map(normalizeKeyword)).size !== tool.keywords.length) issues.push({ slug: tool.slug, rule: "duplicate-keywords", message: "มี keyword ซ้ำภายในหน้าเดียวกัน" });
    if (title.length < 12 || title.length > 76) issues.push({ slug: tool.slug, rule: "title-length", message: `title ยาว ${title.length} ตัวอักษร` });
    if (description.length < 80 || description.length > 360) issues.push({ slug: tool.slug, rule: "description-length", message: `description ยาว ${description.length} ตัวอักษร` });
    if (tool.howTo.length < 3) issues.push({ slug: tool.slug, rule: "helpful-content", message: "ต้องมีวิธีใช้อย่างน้อย 3 ขั้น" });
    if (tool.faq.length < 2) issues.push({ slug: tool.slug, rule: "faq-depth", message: "ต้องมี FAQ อย่างน้อย 2 ข้อ" });
    if (tool.relatedTools.length < 3) issues.push({ slug: tool.slug, rule: "internal-links", message: "ต้องมี internal links อย่างน้อย 3 หน้า" });
    if (tool.relatedTools.includes(tool.slug)) issues.push({ slug: tool.slug, rule: "self-link", message: "relatedTools ห้ามอ้างหน้าตัวเอง" });
    for (const relatedSlug of tool.relatedTools) {
      if (!slugs.has(relatedSlug)) issues.push({ slug: tool.slug, rule: "broken-internal-link", message: `ไม่พบ related tool: ${relatedSlug}` });
    }
  }
  return issues;
}
