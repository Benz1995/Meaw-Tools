import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { categoryConfigs, getCategory, getToolsByCategory } from "@/config/tools";

type CategoryPageProps = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return categoryConfigs.map((category) => ({ category: category.value }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) return {};
  return {
    title: `${category.label} — เครื่องมือออนไลน์ฟรี`,
    description: category.description,
    alternates: { canonical: `/categories/${category.value}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = getCategory(categorySlug);
  if (!category) notFound();
  const categoryTools = getToolsByCategory(category.value);
  const toolGridColumns = categoryTools.length === 1
    ? "max-w-xl"
    : categoryTools.length === 2 || categoryTools.length === 4
      ? "sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/">หน้าแรก</Link><ChevronRight className="size-3.5" />
        <Link href="/categories">หมวดหมู่</Link><ChevronRight className="size-3.5" />
        <span aria-current="page">{category.label}</span>
      </nav>

      <header className="mt-6 flex max-w-3xl items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ToolIcon name={category.icon} className="size-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-primary">{categoryTools.length} เครื่องมือพร้อมใช้</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{category.label}</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{category.description}</p>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="category-tools-heading">
        <h2 id="category-tools-heading" className="text-xl font-semibold">เครื่องมือในหมวดนี้</h2>
        <div className={`mt-5 grid gap-4 ${toolGridColumns}`}>
          {categoryTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
        </div>
      </section>
    </div>
  );
}
