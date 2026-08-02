import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tags } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryConfigs, getToolsByCategory } from "@/config/tools";

export const metadata: Metadata = {
  title: "หมวดหมู่เครื่องมือออนไลน์",
  description: "เลือกเครื่องมือฟรีตามหมวดหมู่ ทั้งงานข้อมูล นักพัฒนา เอกสาร เครื่องคำนวณ รูปภาพ และ PDF",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
          <Tags className="size-4 text-primary" /> เลือกตามประเภทงาน
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">หมวดหมู่เครื่องมือ</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          ค้นหาเครื่องมือที่เหมาะกับงานได้เร็วขึ้น แต่ละหมวดรวมเครื่องมือที่เกี่ยวข้องและบอกจำนวนที่พร้อมใช้งาน
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoryConfigs.map((category) => {
          const categoryTools = getToolsByCategory(category.value);
          return (
            <Card key={category.value} className="group flex h-full flex-col transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ToolIcon name={category.icon} />
                  </span>
                  <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                    {categoryTools.length} เครื่องมือ
                  </span>
                </div>
                <CardTitle className="mt-2 text-xl">{category.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm leading-6 text-muted-foreground">{category.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {categoryTools.slice(0, 3).map((tool) => (
                    <span key={tool.slug} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{tool.thaiName}</span>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/categories/${category.value}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  ดูหมวด{category.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
