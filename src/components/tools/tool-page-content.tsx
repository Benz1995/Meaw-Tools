import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { PrivacyNotice } from "@/components/tools/privacy-notice";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolRenderer } from "@/components/tools/tool-renderer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategory, getTool } from "@/config/tools";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { getToolPrimaryKeyword } from "@/lib/seo/tool-seo";
import type { ToolConfig } from "@/types/tool";

function JsonLdScript({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }} />;
}

export function ToolPageContent({ tool }: { tool: ToolConfig }) {
  const related = tool.relatedTools.map(getTool).filter((item): item is ToolConfig => Boolean(item));
  const category = getCategory(tool.category);
  const applicationCategory = tool.slug === "bmi-calculator"
    ? "HealthApplication"
    : tool.category === "business"
      ? "FinanceApplication"
      : tool.category === "developer" ? "DeveloperApplication" : "UtilitiesApplication";
  const pageUrl = `${siteConfig.url}/${tool.slug}`;
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    alternateName: tool.thaiName,
    url: pageUrl,
    inLanguage: "th",
    applicationCategory,
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    keywords: [getToolPrimaryKeyword(tool), ...tool.keywords.slice(1, 5)].join(", "),
    featureList: tool.howTo,
    offers: { "@type": "Offer", price: "0", priceCurrency: "THB" },
    description: tool.description,
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "เครื่องมือ", item: `${siteConfig.url}/tools` },
      { "@type": "ListItem", position: 3, name: tool.name, item: pageUrl },
    ],
  };

  return (
    <div className="mx-auto max-w-[86rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
      <JsonLdScript value={appSchema} />
      <JsonLdScript value={faqSchema} />
      <JsonLdScript value={breadcrumbSchema} />

      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/">หน้าแรก</Link>
        <ChevronRight className="size-3.5" />
        <Link href="/tools">เครื่องมือ</Link>
        <ChevronRight className="size-3.5" />
        <span aria-current="page">{tool.name}</span>
      </nav>

      <header className="meaw-tool-heading relative mt-4 overflow-hidden rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 shadow-sm">
            <ToolIcon name={tool.icon} className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-primary">{tool.thaiName}</p>
              {category ? <Badge variant="outline" asChild><Link href={`/categories/${category.value}`}>{category.label}</Link></Badge> : null}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tool.name}</h1>
          </div>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">{tool.description}</p>
        <PrivacyNotice compact />
      </header>

      <section className="mt-5" aria-label={`พื้นที่ทำงาน ${tool.name}`}><ToolRenderer slug={tool.slug} /></section>
      <AdSlot name={`${tool.slug}-result`} />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>วิธีใช้งาน</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {tool.howTo.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                  <span className="text-sm leading-6">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ตัวอย่างและข้อควรระวัง</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm" role="region" tabIndex={0} aria-label={`ตัวอย่าง ${tool.name} ที่เลื่อนได้`}><code>{tool.example}</code></pre>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{tool.caution}</p>
          </CardContent>
        </Card>
      </div>

      <AdSlot name={`${tool.slug}-content`} />
      <section className="mt-12">
        <h2 className="text-2xl font-bold">คำถามที่พบบ่อย</h2>
        <div className="mt-5 grid gap-3">
          {tool.faq.map((item) => (
            <details key={item.question} className="rounded-xl border bg-card p-5">
              <summary className="cursor-pointer font-medium">{item.question}</summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">เครื่องมือที่เกี่ยวข้อง</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => <ToolCard key={item.slug} tool={item} />)}
        </div>
      </section>
    </div>
  );
}
