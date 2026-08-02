import Image from "next/image";
import Link from "next/link";
import { Coffee, PawPrint } from "lucide-react";
import { tools } from "@/config/tools";

export function AppFooter() {
  return (
    <footer className="relative overflow-hidden border-t bg-card/85 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div><div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-2xl border bg-secondary"><Image src="/brand/devthai-cat.png" alt="" width={58} height={44} sizes="48px" className="h-auto w-14 translate-y-1" /></span><div><p className="font-bold">Meaw Tools</p><p className="text-xs font-medium tracking-[0.14em] text-primary">まいにちの道具</p></div></div><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">คาเฟ่เครื่องมือที่คนทำงานใช้จริง อธิบายภาษาไทย และประมวลผลข้อมูลภายใน Browser ของคุณ</p></div>
        <div><p className="text-sm font-semibold">เครื่องมือยอดนิยม</p><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{tools.filter((tool) => tool.isPopular).slice(0, 5).map((tool) => <li key={tool.slug}><Link className="hover:text-foreground" href={`/${tool.slug}`}>{tool.name}</Link></li>)}</ul></div>
        <div><p className="text-sm font-semibold">ข้อมูลเว็บไซต์</p><ul className="mt-3 space-y-2 text-sm text-muted-foreground"><li><Link href="/categories">หมวดหมู่เครื่องมือ</Link></li><li><Link href="/about">เกี่ยวกับเรา</Link></li><li><Link href="/privacy-policy">นโยบายความเป็นส่วนตัว</Link></li><li><Link href="/terms">ข้อกำหนดการใช้งาน</Link></li><li><Link href="/contact">ติดต่อ</Link></li></ul></div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground"><span className="inline-flex flex-wrap items-center justify-center gap-1.5"><Coffee className="size-3.5 text-primary" /> © {new Date().getFullYear()} Meaw Tools · ข้อมูลเครื่องมือไม่ถูกส่งไปยัง Server <PawPrint className="size-3.5 text-primary" /></span></div>
    </footer>
  );
}
