import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { getCategory } from "@/config/tools";
import type { ToolConfig } from "@/types/tool";

export function ToolCard({ tool }: { tool: ToolConfig }) {
  const category = getCategory(tool.category);
  return <Card className="group flex h-full flex-col transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><CardHeader><div className="mb-3 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ToolIcon name={tool.icon} /></span><div className="flex gap-1">{tool.isPopular ? <Badge variant="secondary">ยอดนิยม</Badge> : null}{tool.isNew ? <Badge>ใหม่</Badge> : null}</div></div><CardTitle className="text-lg">{tool.name}</CardTitle><CardDescription>{tool.shortDescription}</CardDescription></CardHeader><CardContent className="mt-auto space-y-3"><span className="block text-xs text-muted-foreground">{tool.thaiName}</span>{category ? <Badge variant="outline" asChild><Link href={`/categories/${category.value}`} aria-label={`ดูหมวด${category.label}`}>{category.label}</Link></Badge> : null}</CardContent><CardFooter><Link href={`/${tool.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">เปิดเครื่องมือ <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></CardFooter></Card>;
}
