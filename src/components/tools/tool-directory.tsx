"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToolCard } from "@/components/tools/tool-card";
import { searchTools, toolCategories } from "@/config/tools";
import type { ToolCategory } from "@/types/tool";

export function ToolDirectory({ initialQuery = "" }: { initialQuery?: string }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery || searchParams.get("q") || "");
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const results = useMemo(() => searchTools(query, category), [query, category]);
  return <div><div className="rounded-xl border bg-card p-4 shadow-sm"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-9" placeholder="ค้นหาจากชื่อ คำอธิบาย หรือ keyword" aria-label="ค้นหาเครื่องมือแบบทันที" /></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="กรองหมวดหมู่">{toolCategories.map((item) => <Button key={item.value} size="sm" variant={category === item.value ? "default" : "outline"} onClick={() => setCategory(item.value)} aria-pressed={category === item.value}>{item.label}</Button>)}</div><div className="mt-3 text-right"><Link href="/categories" className="text-xs font-medium text-primary hover:underline">ดูรายละเอียดทุกหมวดหมู่</Link></div></div><p className="my-5 text-sm text-muted-foreground" aria-live="polite">พบ {results.length} เครื่องมือ</p>{results.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div> : <div className="rounded-xl border border-dashed bg-card p-10 text-center"><p className="font-medium">ไม่พบเครื่องมือที่ค้นหา</p><p className="mt-1 text-sm text-muted-foreground">ลองใช้คำว่า JSON, SQL, JWT หรือเลือกหมวดทั้งหมด</p></div>}</div>;
}
