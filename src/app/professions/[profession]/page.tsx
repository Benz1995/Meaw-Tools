import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { getProfession, professionConfigs } from "@/config/professions";
import { getTool } from "@/config/tools";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import type { ToolConfig } from "@/types/tool";

type ProfessionPageProps = { params: Promise<{ profession: string }> };

export function generateStaticParams() {
  return professionConfigs.map((profession) => ({ profession: profession.value }));
}

export async function generateMetadata({ params }: ProfessionPageProps): Promise<Metadata> {
  const { profession: professionSlug } = await params;
  const profession = getProfession(professionSlug);
  if (!profession) return {};
  return {
    title: `เครื่องมือสำหรับ${profession.label} ฟรี`,
    description: profession.description,
    keywords: profession.keywords,
    alternates: { canonical: `/professions/${profession.value}` },
  };
}

export default async function ProfessionPage({ params }: ProfessionPageProps) {
  const { profession: professionSlug } = await params;
  const profession = getProfession(professionSlug);
  if (!profession) notFound();
  const professionTools = profession.toolSlugs.map(getTool).filter((tool): tool is ToolConfig => Boolean(tool));
  const pageUrl = `${siteConfig.url}/professions/${profession.value}`;
  const schemas = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": pageUrl, name: `เครื่องมือสำหรับ${profession.label}`, description: profession.description, url: pageUrl, inLanguage: "th", mainEntity: { "@id": `${pageUrl}#tools` } },
      { "@type": "ItemList", "@id": `${pageUrl}#tools`, name: `เครื่องมือสำหรับ${profession.label}`, numberOfItems: professionTools.length, itemListElement: professionTools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: `${siteConfig.url}/${tool.slug}` })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "หน้าแรก", item: siteConfig.url },
        { "@type": "ListItem", position: 2, name: "สายอาชีพ", item: `${siteConfig.url}/professions` },
        { "@type": "ListItem", position: 3, name: profession.label, item: pageUrl },
      ] },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schemas) }} />
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/">หน้าแรก</Link><ChevronRight className="size-3.5" />
        <Link href="/professions">สายอาชีพ</Link><ChevronRight className="size-3.5" />
        <span aria-current="page">{profession.label}</span>
      </nav>

      <header className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.44fr)] lg:items-start">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ToolIcon name={profession.icon} className="size-6" /></span>
          <div>
            <p className="text-sm font-medium text-primary">{profession.englishLabel} · {professionTools.length} เครื่องมือ</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">เครื่องมือสำหรับ{profession.label}</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{profession.description}</p>
          </div>
        </div>
        <aside className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
          <p className="text-sm font-semibold">ช่วยงานอะไรบ้าง</p>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">{profession.highlights.map((highlight) => <li key={highlight} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{highlight}</li>)}</ul>
        </aside>
      </header>

      <section className="mt-10" aria-labelledby="profession-tools-heading">
        <h2 id="profession-tools-heading" className="text-xl font-semibold">เครื่องมือที่เหมาะกับสายงานนี้</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">เลือกใช้เฉพาะเมนูที่ตรงกับงานของคุณ ข้อมูลที่กรอกยังประมวลผลภายใน Browser เช่นเดียวกับหน้าเครื่องมือหลัก</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{professionTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>
      </section>
    </div>
  );
}
