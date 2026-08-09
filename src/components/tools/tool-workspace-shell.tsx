"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Home,
  Menu,
  PawPrint,
  Search,
  Tags,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toolCategories, tools } from "@/config/tools";
import { cn } from "@/lib/utils";
import type { ToolCategory, ToolConfig } from "@/types/tool";

const categoryLabels = new Map(
  toolCategories
    .filter((category) => category.value !== "all")
    .map((category) => [category.value as ToolCategory, category.label]),
);

type ToolNavigationProps = {
  activeSlug: string;
  collapsed?: boolean;
  idPrefix: string;
  onSelect?: () => void;
  query: string;
  setQuery: (value: string) => void;
};

function ToolLink({
  active,
  collapsed,
  onSelect,
  tool,
}: {
  active: boolean;
  collapsed: boolean;
  onSelect?: () => void;
  tool: ToolConfig;
}) {
  const link = (
    <Link
      href={`/${tool.slug}`}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? `${tool.name} — ${tool.thaiName}` : undefined}
      className={cn(
        "group flex min-h-10 items-center rounded-xl border border-transparent text-sm transition-[background-color,border-color,color,box-shadow]",
        collapsed ? "justify-center px-2" : "gap-3 px-3 py-2",
        active
          ? "border-primary/20 bg-primary/10 font-medium text-primary shadow-sm shadow-primary/5"
          : "text-muted-foreground hover:border-border/70 hover:bg-card/80 hover:text-foreground",
      )}
    >
      <ToolIcon name={tool.icon} className="size-4 shrink-0" />
      {collapsed ? null : (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground group-aria-[current=page]:text-primary">
            {tool.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{tool.thaiName}</span>
        </span>
      )}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tool.name}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolNavigation({
  activeSlug,
  collapsed = false,
  idPrefix,
  onSelect,
  query,
  setQuery,
}: ToolNavigationProps) {
  const groupedTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th");
    const filteredTools = tools.filter((tool) => {
      if (!normalizedQuery) return true;
      return [tool.name, tool.thaiName, tool.shortDescription, ...tool.keywords]
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(normalizedQuery);
    });

    return Array.from(categoryLabels, ([category, label]) => ({
      category,
      label,
      tools: filteredTools.filter((tool) => tool.category === category),
    })).filter((group) => group.tools.length > 0);
  }, [query]);

  return (
    <>
      {collapsed ? null : (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 rounded-xl border-border/70 bg-background/80 pl-9 shadow-sm"
              placeholder="ค้นหาเครื่องมือ..."
              aria-label="ค้นหาในเมนูเครื่องมือ"
            />
          </div>
        </div>
      )}

      <nav className="meaw-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="รายการเครื่องมือ">
        {groupedTools.length ? (
          <div className="space-y-4">
            {groupedTools.map((group) => (
              <section key={group.category} aria-labelledby={collapsed ? undefined : `${idPrefix}-tool-category-${group.category}`}>
                {collapsed ? (
                  <div className="mx-2 mb-2 border-t" />
                ) : (
                  <h2
                    id={`${idPrefix}-tool-category-${group.category}`}
                    className="mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    <Link href={`/categories/${group.category}`} onClick={onSelect} className="transition-colors hover:text-foreground">
                      {group.label}
                    </Link>
                  </h2>
                )}
                <div className="space-y-1">
                  {group.tools.map((tool) => (
                    <ToolLink
                      key={tool.slug}
                      tool={tool}
                      active={tool.slug === activeSlug}
                      collapsed={collapsed}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mx-2 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            ไม่พบเครื่องมือ
          </div>
        )}
      </nav>
    </>
  );
}

export function ToolWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeSlug = pathname.split("/").filter(Boolean)[0] ?? "";
  const activeTool = tools.find((tool) => tool.slug === activeSlug);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="mx-auto flex w-full max-w-[112rem] items-start">
      <aside
        className={cn(
          "meaw-shell-glass sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.75rem]" : "w-[17rem]",
        )}
        aria-label="เมนูเครื่องมือด้านข้าง"
      >
        <div className={cn("meaw-glass-subtle flex h-16 shrink-0 items-center border-b", collapsed ? "justify-center px-2" : "gap-2 px-3")}>
          {collapsed ? null : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"><PawPrint className="size-4" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Meaw Workspace</p>
                <p className="text-xs text-muted-foreground">{tools.length} เครื่องมือพร้อมใช้</p>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "ขยายเมนูเครื่องมือ" : "ย่อเมนูเครื่องมือ"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {collapsed ? (
          <div className="px-2 py-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              aria-label="เปิดช่องค้นหาเครื่องมือ"
              className="w-full"
            >
              <Search className="size-4" />
            </Button>
          </div>
        ) : null}

        <ToolNavigation
          activeSlug={activeSlug}
          collapsed={collapsed}
          idPrefix="desktop"
          query={query}
          setQuery={setQuery}
        />

        <div className="meaw-glass-subtle shrink-0 border-t p-2">
          <Button variant="ghost" asChild className={cn("w-full", collapsed ? "px-0" : "justify-start")}>
            <Link href="/categories" aria-label={collapsed ? "ดูหมวดหมู่" : undefined}>
              <Tags className="size-4" />
              {collapsed ? null : "ดูหมวดหมู่"}
            </Link>
          </Button>
          <Button variant="ghost" asChild className={cn("mt-1 w-full", collapsed ? "px-0" : "justify-start")}>
            <Link href="/tools" aria-label={collapsed ? "ดูเครื่องมือทั้งหมด" : undefined}>
              <Grid2X2 className="size-4" />
              {collapsed ? null : "ดูเครื่องมือทั้งหมด"}
            </Link>
          </Button>
          <Button variant="ghost" asChild className={cn("mt-1 w-full", collapsed ? "px-0" : "justify-start")}>
            <Link href="/" aria-label={collapsed ? "กลับหน้าแรก" : undefined}>
              <Home className="size-4" />
              {collapsed ? null : "กลับหน้าแรก"}
            </Link>
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="meaw-shell-glass sticky top-16 z-30 flex h-14 items-center gap-3 border-b px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="เปิดเมนูเครื่องมือ">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[19rem] gap-0 p-0" aria-label="เมนูเครื่องมือมือถือ">
              <SheetHeader className="border-b px-4 py-3 text-left">
                <SheetTitle>เครื่องมือทั้งหมด</SheetTitle>
                <SheetDescription>{tools.length} เครื่องมือสำหรับการทำงานทุกวัน</SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col pt-3">
                <ToolNavigation
                  activeSlug={activeSlug}
                  idPrefix="mobile"
                  query={query}
                  setQuery={setQuery}
                  onSelect={() => setMobileOpen(false)}
                />
              </div>
              <div className="border-t p-3">
                <Button variant="outline" asChild className="w-full justify-start">
                  <Link href="/categories" onClick={() => setMobileOpen(false)}>
                    <Tags className="size-4" /> ดูหมวดหมู่
                  </Link>
                </Button>
                <Button variant="outline" asChild className="mt-2 w-full justify-start">
                  <Link href="/tools" onClick={() => setMobileOpen(false)}>
                    <Grid2X2 className="size-4" /> ดูเครื่องมือทั้งหมด
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground"><PawPrint className="size-3 text-primary" aria-hidden="true" />Meaw Workspace</p>
            <p className="truncate text-sm font-semibold">{activeTool?.name ?? "Meaw Tools"}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
