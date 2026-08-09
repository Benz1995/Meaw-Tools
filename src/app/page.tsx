import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Flower2,
  Leaf,
  MousePointerClick,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categoryConfigs, getToolsByCategory, tools } from "@/config/tools";

const faqs = [
  ["ใช้งานฟรีหรือไม่?", "ฟรีทุกเครื่องมือ และไม่ต้องสมัครสมาชิก"],
  ["ข้อมูลถูกส่งขึ้น Server หรือไม่?", "ไม่ เนื้อหาที่คุณกรอกประมวลผลใน Browser เท่านั้น"],
  ["ใช้งานบนมือถือได้หรือไม่?", "ได้ หน้าเครื่องมือออกแบบแบบ mobile-first และรองรับ tablet/desktop"],
  ["ถ้าไม่อยากเห็น Meaw เดินล่ะ?", "กดปุ่ม “พัก Meaw” ที่มุมขวาล่างได้ ระบบจะจำการตั้งค่าไว้ให้"],
] as const;

const benefits: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: ShieldCheck, title: "ข้อมูลอยู่ใน Browser", text: "ไม่มีการส่ง JSON, SQL, JWT หรือ source code ไปประมวลผลที่ Server" },
  { icon: Zap, title: "เสิร์ฟไว พร้อมใช้ทันที", text: "ไม่ต้องสมัครสมาชิก เปิดหน้าแล้วเริ่มทำงานได้เลยเหมือนสั่งเมนูประจำ" },
  { icon: CheckCircle2, title: "น่ารักแต่จริงจัง", text: "ทุกเครื่องมือมี validation, error state, ตัวอย่าง และการจำกัดขนาดข้อมูล" },
];

export default function HomePage() {
  const popularTools = tools.filter((tool) => tool.isPopular && tool.isNew).slice(-6);

  return (
    <>
      <section className="cafe-hero relative overflow-hidden border-b">
        <span className="anime-sparkle anime-sparkle-one" aria-hidden="true">✦</span>
        <span className="anime-sparkle anime-sparkle-two" aria-hidden="true">✿</span>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/85 px-3.5 py-1.5 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              いらっしゃいませ · ยินดีต้อนรับ
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.75rem]">
              แวะคาเฟ่แล้วหยิบ
              <span className="mt-1 block text-primary">Meaw Tools</span>
              ไปช่วยงานกัน
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              เครื่องมือออนไลน์ใช้ฟรีสำหรับนักพัฒนา ครีเอเตอร์ และคนทำงานทุกสาย
              ใช้ง่ายเหมือนเมนูประจำร้าน พร้อมความเป็นส่วนตัวที่ไว้ใจได้
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5" aria-label="จุดเด่นของเว็บไซต์">
              <span className="cafe-chip"><Coffee className="size-4" /> {tools.length} เมนูพร้อมใช้</span>
              <span className="cafe-chip"><Leaf className="size-4" /> ฟรี ไม่ต้องสมัคร</span>
              <span className="cafe-chip"><ShieldCheck className="size-4" /> ประมวลผลในเครื่อง</span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="rounded-full px-6 shadow-lg shadow-primary/15">
                <Link href="/tools">เปิดเมนูเครื่องมือ <ArrowRight className="size-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full border-primary/20 bg-card/70 px-6">
                <Link href="/categories">เลือกตามหมวดหมู่</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild className="rounded-full px-5">
                <Link href="/professions">เลือกตามสายอาชีพ</Link>
              </Button>
            </div>
          </div>

          <div className="anime-hero-frame relative aspect-[3/2] overflow-hidden rounded-[2rem] border border-primary/20 bg-secondary shadow-2xl shadow-foreground/10">
            <Image
              src="/brand/meaw-cafe-hero.webp"
              alt="Meaw แมวสามสีสไตล์อนิเมะต้อนรับอยู่ในคาเฟ่เครื่องมือญี่ปุ่น"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 54vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent p-5 pt-16 text-white sm:p-6 sm:pt-20">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-white/75">MEAW&apos;S TOOL KISSA</p>
                  <p className="mt-1 text-lg font-bold sm:text-xl">วันนี้รับเครื่องมืออะไรดี?</p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/15 backdrop-blur">
                  <PawPrint className="size-5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AdSlot name="home-hero" />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-primary"><Flower2 className="size-4" /> TODAY&apos;S MENU</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">เมนูที่หยิบบ่อยช่วงนี้</h2>
            <p className="mt-2 text-sm text-muted-foreground">เครื่องมือยอดนิยม เปิดแล้วใช้ได้ทันที</p>
          </div>
          <Button variant="ghost" asChild className="hidden rounded-full sm:inline-flex"><Link href="/tools">ดูทั้งหมด <ArrowRight /></Link></Button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{popularTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>
      </section>

      <section id="categories" className="cafe-shelf border-y">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.14em] text-primary"><Coffee className="size-4" /> TOOL SHELVES</p>
            <h2 className="mt-2 text-3xl font-bold">เลือกจากชั้นเครื่องมือ</h2>
            <p className="mt-2 text-sm text-muted-foreground">กด Tag เพื่อดูเครื่องมือทั้งหมดในหมวดนั้น</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryConfigs.map((category) => {
              const count = getToolsByCategory(category.value).length;
              return (
                <Link key={category.value} href={`/categories/${category.value}`} className="group rounded-2xl border border-primary/10 bg-card/90 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105"><ToolIcon name={category.icon} className="size-5" /></span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{count} เครื่องมือ</span>
                  </div>
                  <p className="mt-4 font-semibold">{category.label}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 text-center"><Button variant="outline" asChild className="rounded-full bg-card"><Link href="/categories">ดูหน้าหมวดหมู่ทั้งหมด <ArrowRight className="size-4" /></Link></Button></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }, index) => (
            <Card key={title} className="anime-benefit-card relative">
              <CardContent className="p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
                <span className="absolute right-5 top-4 text-xs font-bold text-primary/35">0{index + 1}</span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-y bg-primary text-primary-foreground">
        <div className="absolute -right-10 -top-10 size-48 rounded-full border-[24px] border-white/10" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div><p className="text-sm font-semibold tracking-[0.15em] opacity-75">HOW TO ORDER</p><h2 className="mt-2 text-3xl font-bold">สี่ขั้นตอน แล้วกลับไปทำงานต่อ</h2></div>
            <ol className="grid gap-4 sm:grid-cols-2">{["เลือกเครื่องมือ", "วางข้อมูล", "กดประมวลผล", "คัดลอกผลลัพธ์"].map((step, index) => <li key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><span className="grid size-8 place-items-center rounded-full bg-white text-sm font-bold text-primary">{index + 1}</span><span>{step}</span></li>)}</ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="text-center"><MousePointerClick className="mx-auto size-7 text-primary" /><h2 className="mt-3 text-3xl font-bold">ถาม Meaw ก่อนกลับ</h2><p className="mt-2 text-sm text-muted-foreground">คำถามที่คนแวะคาเฟ่ถามบ่อย</p></div>
        <div className="mt-8 grid gap-3">{faqs.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-primary/10 bg-card/90 p-5 shadow-sm"><summary className="cursor-pointer list-none font-medium marker:hidden">{question}</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p></details>)}</div>
      </section>
    </>
  );
}
