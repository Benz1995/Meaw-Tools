"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { tools } from "@/config/tools";

const navigation = [{ href: "/tools", label: "เครื่องมือ" }, { href: "/categories", label: "หมวดหมู่" }, { href: "/about", label: "เกี่ยวกับ" }, { href: "/blog", label: "บทความ" }];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const activeTool = tools.find((tool) => pathname === `/${tool.slug}`);
  const submit = (event: FormEvent) => { event.preventDefault(); router.push(`/tools${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`); };
  return (
    <header className="cafe-header sticky top-0 z-50 border-b bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/82">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">ข้ามไปเนื้อหาหลัก</a>
      <div className={`mx-auto flex h-[4.5rem] items-center gap-4 px-4 sm:px-6 ${activeTool ? "max-w-[112rem]" : "max-w-7xl"}`}>
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Meaw Tools หน้าแรก">
          <span className="relative grid size-11 place-items-center overflow-hidden rounded-[1rem] border border-primary/20 bg-secondary shadow-sm transition-transform group-hover:-rotate-3 group-hover:scale-105">
            <Image src="/brand/devthai-cat.png" alt="" width={56} height={42} sizes="44px" className="h-auto w-12 translate-y-1 object-contain" />
            <Sparkles className="absolute right-0.5 top-0.5 size-3 text-primary" aria-hidden="true" />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block text-base font-bold tracking-tight">Meaw Tools</span>
            <span className="mt-1 block text-[0.6rem] font-semibold tracking-[0.18em] text-muted-foreground">TOOLS KISSA</span>
          </span>
        </Link>
        {activeTool ? <div className="hidden min-w-0 items-center gap-3 text-sm md:flex"><span className="h-5 w-px bg-border" /><span className="truncate text-muted-foreground">{activeTool.name}</span></div> : <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex" aria-label="เมนูหลัก">{navigation.map((item) => <Link key={item.href} className="transition-colors hover:text-foreground" href={item.href}>{item.label}</Link>)}</nav>}
        {activeTool ? null : <form onSubmit={submit} className="relative ml-auto hidden w-full max-w-xs md:block" role="search"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-full border-primary/15 bg-card/80 pl-9 shadow-sm" placeholder="ค้นหา JSON, PDF, สี..." aria-label="ค้นหาเครื่องมือ" /></form>}
        <div className={activeTool ? "ml-auto" : undefined}><ThemeToggle /></div>
        {activeTool ? null : <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="เปิดเมนู"><Menu className="size-5" /></Button></SheetTrigger><SheetContent side="right"><SheetHeader><SheetTitle>Meaw Tools</SheetTitle><SheetDescription>คาเฟ่เครื่องมือใช้ฟรีสำหรับคนทำงาน</SheetDescription></SheetHeader><nav className="mt-6 grid gap-2" aria-label="เมนูมือถือ">{navigation.map((item) => <Button key={item.href} variant="ghost" asChild className="justify-start"><Link href={item.href}>{item.label}</Link></Button>)}</nav></SheetContent></Sheet>}
      </div>
    </header>
  );
}
