import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Tags } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { professionConfigs } from "@/config/professions";
import { getTool } from "@/config/tools";

export const metadata: Metadata = {
  title: "เครื่องมือฟรี แบ่งตามสายอาชีพ",
  description: "เลือกเครื่องมือออนไลน์ฟรีตามสายอาชีพ ทั้ง Developer, Marketing, เจ้าของธุรกิจ, บัญชี, HR, Creator, Designer, ฟรีแลนซ์ และงานสำนักงาน",
  keywords: ["เครื่องมือตามสายอาชีพ", "เครื่องมือทำงานออนไลน์", "online tools for professionals"],
  alternates: { canonical: "/professions" },
};

export default function ProfessionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
          <BriefcaseBusiness className="size-4 text-primary" /> เลือกจากงานที่คุณทำ
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">เครื่องมือแบ่งตามสายอาชีพ</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          ไม่ต้องรู้ชื่อเครื่องมือก่อน เพียงเลือกสายงานของคุณ เรารวมเมนูที่ใช้บ่อยไว้ให้แล้ว เครื่องมือหนึ่งอาจช่วยได้หลายอาชีพและยังเปิดจากหน้าเดิมเสมอ
        </p>
      </header>

      <aside className="mt-8 flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">กำลังหาเครื่องมือตามประเภทงาน?</p><p className="mt-1 text-sm leading-6 text-muted-foreground">หมวดหมู่บอกว่าเครื่องมือทำอะไร ส่วนสายอาชีพบอกว่าใครน่าจะใช้</p></div>
        <Link href="/categories" className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary hover:underline"><Tags className="size-4" /> ดูตามหมวดหมู่</Link>
      </aside>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professionConfigs.map((profession) => {
          const professionTools = profession.toolSlugs.map(getTool).filter(Boolean);
          return (
            <Card key={profession.value} data-testid="profession-card" className="group flex h-full flex-col transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><ToolIcon name={profession.icon} /></span>
                  <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">{professionTools.length} เครื่องมือ</span>
                </div>
                <CardTitle className="mt-2 text-xl">{profession.label}</CardTitle>
                <p className="text-xs font-medium tracking-wide text-primary">{profession.englishLabel}</p>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm leading-6 text-muted-foreground">{profession.shortDescription}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {professionTools.slice(0, 3).map((tool) => tool ? <span key={tool.slug} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{tool.thaiName}</span> : null)}
                </div>
              </CardContent>
              <CardFooter><Link href={`/professions/${profession.value}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">ดูเครื่องมือสำหรับสายนี้ <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link></CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
