"use client";

import { Check, Clipboard, Info, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame, copyText } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDecoratedText,
  createFancyTextStyles,
  countFancyTextCharacters,
  searchSymbolGroups,
  symbolGroups,
  truncateFancyText,
  type SymbolCategoryId,
} from "@/lib/tools/special-characters";

const EXAMPLE_TEXT = "Meaw น่ารัก";

function TextResultCard({
  label,
  description,
  value,
  className = "",
  onCopy,
}: {
  label: string;
  description?: string;
  value: string;
  className?: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <article className={`flex min-w-0 flex-col rounded-xl border bg-background/70 p-3.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onCopy(value, label)} aria-label={`คัดลอก ${label}`}>
          <Clipboard className="size-3.5" />คัดลอก
        </Button>
      </div>
      <p className="mt-4 break-words text-lg leading-8">{value}</p>
    </article>
  );
}

export function SpecialCharactersTool() {
  const [text, setText] = useState(EXAMPLE_TEXT);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SymbolCategoryId | "all">("popular");
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const [copiedStatus, setCopiedStatus] = useState("");

  const fancyResults = createFancyTextStyles(text);
  const decoratedResults = createDecoratedText(text);
  const visibleGroups = searchSymbolGroups(query, category);
  const textLength = countFancyTextCharacters(text);

  const copyValue = async (value: string, label: string, remember = false) => {
    try {
      await copyText(value, `คัดลอก ${label} แล้ว`);
      setCopiedStatus(`คัดลอก ${label} แล้ว`);
      if (remember) {
        setRecentSymbols((current) => [value, ...current.filter((item) => item !== value)].slice(0, 8));
      }
    } catch {
      toast.error("Browser ไม่อนุญาตให้คัดลอก กรุณาเลือกข้อความแล้วคัดลอกด้วยตนเอง");
    }
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    if (value.trim()) setCategory("all");
  };

  const clear = () => {
    setText("");
    setQuery("");
    setCategory("popular");
    setRecentSymbols([]);
    setCopiedStatus("");
  };

  return (
    <WorkspaceFrame>
      <section aria-labelledby="fancy-text-title">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 id="fancy-text-title" className="text-base font-semibold">สร้างข้อความและชื่อแบบพิเศษ</h2>
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="special-text-input">ข้อความสำหรับแต่งชื่อ</Label>
            <span className="text-xs tabular-nums text-muted-foreground">{textLength}/200 ตัว</span>
          </div>
          <Input
            id="special-text-input"
            value={text}
            onChange={(event) => setText(truncateFancyText(event.target.value))}
            placeholder="เช่น Meaw, ชื่อเกม หรือข้อความสั้น ๆ"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs leading-5 text-muted-foreground">สไตล์ตัวอักษรเปลี่ยนเฉพาะ A–Z, a–z และตัวเลขที่รองรับ ส่วนกรอบตกแต่งใช้ได้กับภาษาไทยและ Emoji</p>
        </div>

        <div className="mt-4">
          <ActionBar>
            <ExampleButton onExample={() => setText(EXAMPLE_TEXT)} />
            <ClearButton onClear={clear} />
          </ActionBar>
        </div>

        {text ? (
          <>
            <div className="mt-6 flex items-end justify-between gap-3">
              <div>
                <h3 className="font-semibold">รูปแบบตัวอักษร Unicode</h3>
                <p className="mt-1 text-xs text-muted-foreground">แตะคัดลอกแล้วนำไปวางใน Bio, Caption หรือชื่อที่รองรับ</p>
              </div>
              <span className="text-xs text-muted-foreground">{fancyResults.length} แบบ</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="fancy-results">
              {fancyResults.map((result, index) => (
                <TextResultCard
                  key={result.id}
                  label={result.label}
                  description={result.description}
                  value={result.value}
                  className={index === fancyResults.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}
                  onCopy={(value, label) => void copyValue(value, label)}
                />
              ))}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold">กรอบแต่งชื่อ ใช้กับภาษาไทยได้</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="decorated-results">
                {decoratedResults.map((result) => (
                  <TextResultCard key={result.id} label={result.label} value={result.value} onCopy={(value, label) => void copyValue(value, label)} />
                ))}
              </div>
            </div>
          </>
        ) : <div className="mt-5"><EmptyOutput size="compact" text="กรอกชื่อหรือข้อความก่อน ระบบจะแสดงรูปแบบที่คัดลอกได้ทันที" /></div>}
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="symbol-library-title">
        <div className="flex items-center gap-2">
          <Clipboard className="size-4 text-primary" />
          <h2 id="symbol-library-title" className="text-base font-semibold">คลังอักษรและสัญลักษณ์พิเศษ</h2>
        </div>

        <div className="mt-4 space-y-2.5">
          <Label htmlFor="symbol-search">ค้นหาสัญลักษณ์</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="symbol-search"
              type="search"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              className="pl-9"
              placeholder="เช่น หัวใจ, ปีก, เลขโรมัน, ลูกศร หรือ ★"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" role="group" aria-label="กรองหมวดสัญลักษณ์">
          <Button type="button" size="sm" variant={category === "all" ? "default" : "outline"} aria-pressed={category === "all"} onClick={() => { setCategory("all"); setQuery(""); }}>ทั้งหมด</Button>
          {symbolGroups.map((group) => (
            <Button key={group.id} type="button" size="sm" variant={category === group.id ? "default" : "outline"} aria-pressed={category === group.id} onClick={() => { setCategory(group.id); setQuery(""); }} className="shrink-0">
              {group.label}
            </Button>
          ))}
        </div>

        {recentSymbols.length ? (
          <div className="mt-5 rounded-xl border bg-muted/10 p-3.5" data-testid="recent-symbols">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">คัดลอกล่าสุด</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRecentSymbols([])} aria-label="ล้างรายการคัดลอกล่าสุด"><X className="size-3.5" />ล้าง</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentSymbols.map((symbol) => <button key={symbol} type="button" onClick={() => void copyValue(symbol, "สัญลักษณ์", true)} className="min-h-10 rounded-lg border bg-background px-3 text-lg transition-colors hover:border-primary hover:bg-primary/5" aria-label={`คัดลอก ${symbol} อีกครั้ง`}>{symbol}</button>)}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-5" data-testid="symbol-results">
          {visibleGroups.map((group) => (
            <section key={group.id} aria-labelledby={`symbol-group-${group.id}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 id={`symbol-group-${group.id}`} className="text-sm font-semibold">{group.label}</h3>
                <span className="text-xs text-muted-foreground">{group.symbols.length} รายการ</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.symbols.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => void copyValue(symbol, "สัญลักษณ์", true)}
                    className="min-h-12 max-w-full rounded-xl border bg-background px-3 py-2 text-xl leading-7 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={`คัดลอก ${symbol}`}
                    title={`คัดลอก ${symbol}`}
                  >
                    <span className="break-all">{symbol}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {visibleGroups.length === 0 ? <EmptyOutput size="compact" text="ไม่พบสัญลักษณ์ ลองค้นคำว่า หัวใจ, ดาว, ปีก, ลูกศร หรือเลขโรมัน" /> : null}
        </div>
      </section>

      <p className="sr-only" aria-live="polite">{copiedStatus}</p>

      <div className="mt-7 grid gap-3 border-t pt-5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-amber-600" />อักษรแบบพิเศษคือ Unicode ไม่ใช่ไฟล์ Font รูปลักษณ์อาจต่างกันตามอุปกรณ์ และบางเกมหรือแอปอาจไม่รองรับทุกตัว</p>
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />ข้อความและประวัติที่คัดลอกอยู่ในหน้านี้ชั่วคราว ไม่ถูกอัปโหลดหรือบันทึก และจะหายเมื่อรีเฟรช</p>
      </div>
      <p className="mt-3 flex gap-2 text-xs leading-5 text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />ควรใช้ข้อความปกติในข้อมูลสำคัญ เช่น ชื่อจริง อีเมล รหัสผ่าน และเนื้อหาที่ต้องค้นหาหรืออ่านด้วย Screen Reader</p>
    </WorkspaceFrame>
  );
}
