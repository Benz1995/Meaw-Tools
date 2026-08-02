"use client";

import { ArrowLeftRight, Calculator, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ActionBar,
  ClearButton,
  CopyButton,
  EmptyOutput,
  ExampleButton,
  PanelLabel,
  WorkspaceFrame,
} from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addDaysToDate,
  analyzeText,
  calculatePercentage,
  cleanText,
  convertUnit,
  differenceInCalendarDays,
  unitGroups,
  type PercentageMode,
  type TextCleanOptions,
  type UnitCategory,
} from "@/lib/tools/general";

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 10 });
const integerFormatter = new Intl.NumberFormat("th-TH");

function formatNumber(value: number) {
  return numberFormatter.format(Number(value.toPrecision(12)));
}

function parseNumber(value: string) {
  if (!value.trim()) throw new Error("กรุณากรอกตัวเลขให้ครบ");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("กรุณากรอกตัวเลขให้ถูกต้อง");
  return parsed;
}

function StatCard({ label, value, testId }: { label: string; value: string | number; testId?: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums" data-testid={testId}>{value}</p>
    </div>
  );
}

export function WordCounterTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => analyzeText(text), [text]);
  const cards = [
    ["คำ", stats.words, "word-count"],
    ["ตัวอักษร", stats.characters],
    ["ไม่รวมช่องว่าง", stats.charactersWithoutSpaces],
    ["ประโยค", stats.sentences],
    ["บรรทัด", stats.lines],
    ["ย่อหน้า", stats.paragraphs],
  ] as const;

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelLabel>ข้อความที่ต้องการวิเคราะห์</PanelLabel>
        <ActionBar>
          <ExampleButton onExample={() => setText("Meaw Tools ช่วยให้งานประจำวันง่ายขึ้น\n\nรองรับภาษาไทย ใช้ฟรี และข้อมูลไม่ออกจาก Browser")} />
          <CopyButton value={text} label="คัดลอกข้อความ" />
          <ClearButton onClear={() => setText("")} />
        </ActionBar>
      </div>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-56 resize-y leading-7"
        placeholder="พิมพ์หรือวางข้อความภาษาไทยและภาษาอังกฤษที่นี่..."
        aria-label="ข้อความสำหรับนับคำ"
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-live="polite">
        {cards.map(([label, value, testId]) => <StatCard key={label} label={label} value={integerFormatter.format(value)} testId={testId} />)}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        เวลาอ่านโดยประมาณ <strong className="text-foreground">{stats.readingMinutes ? `${stats.readingMinutes} นาที` : "—"}</strong> ที่ความเร็วเฉลี่ย 200 คำต่อนาที
      </p>
    </WorkspaceFrame>
  );
}

const defaultCleanOptions: TextCleanOptions = {
  trimLines: true,
  collapseSpaces: true,
  removeEmptyLines: false,
  deduplicateLines: false,
};

export function TextCleanerTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [options, setOptions] = useState(defaultCleanOptions);
  const optionItems: Array<[keyof TextCleanOptions, string]> = [
    ["trimLines", "ตัดช่องว่างหัว-ท้ายบรรทัด"],
    ["collapseSpaces", "ยุบช่องว่างซ้ำ"],
    ["removeEmptyLines", "ลบบรรทัดว่าง"],
    ["deduplicateLines", "ลบบรรทัดซ้ำ"],
  ];
  const run = () => {
    if (!input.trim()) {
      setError("กรุณากรอกข้อความที่ต้องการจัดระเบียบ");
      setOutput("");
      return;
    }
    setOutput(cleanText(input, options));
    setError("");
    toast.success("จัดระเบียบข้อความแล้ว");
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {optionItems.map(([key, label]) => (
          <label key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-sm">
            {label}
            <Switch checked={options[key]} onCheckedChange={(checked) => setOptions((current) => ({ ...current, [key]: checked }))} aria-label={label} />
          </label>
        ))}
      </div>
      <div className="mt-4">
        <ActionBar>
          <Button onClick={run}><Sparkles className="size-4" />จัดระเบียบ</Button>
          <ExampleButton onExample={() => setInput("  รายการสินค้า A   ราคา 100 บาท  \n\nรายการสินค้า B    ราคา 250 บาท\nรายการสินค้า B    ราคา 250 บาท  ")} />
          <ClearButton onClear={() => { setInput(""); setOutput(""); setError(""); setOptions(defaultCleanOptions); }} />
          <CopyButton value={output} label="คัดลอกผลลัพธ์" />
        </ActionBar>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <PanelLabel meta={`${integerFormatter.format(input.length)} ตัวอักษร`}>ข้อความต้นฉบับ</PanelLabel>
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-60 resize-y" aria-label="ข้อความต้นฉบับสำหรับจัดระเบียบ" />
        </div>
        <div>
          <PanelLabel meta={`${integerFormatter.format(output.length)} ตัวอักษร`}>ผลลัพธ์</PanelLabel>
          {output ? <Textarea value={output} readOnly className="min-h-60 resize-y" aria-label="ข้อความที่จัดระเบียบแล้ว" /> : <EmptyOutput text="ตั้งค่าตัวเลือก แล้วกด “จัดระเบียบ”" />}
        </div>
      </div>
    </WorkspaceFrame>
  );
}

const percentageLabels: Record<PercentageMode, { first: string; second: string; formula: string; suffix: string }> = {
  of: { first: "เปอร์เซ็นต์", second: "จำนวนทั้งหมด", formula: "(เปอร์เซ็นต์ ÷ 100) × จำนวนทั้งหมด", suffix: "" },
  ratio: { first: "จำนวนส่วน", second: "จำนวนทั้งหมด", formula: "(จำนวนส่วน ÷ จำนวนทั้งหมด) × 100", suffix: "%" },
  change: { first: "ค่าเริ่มต้น", second: "ค่าใหม่", formula: "((ค่าใหม่ − ค่าเริ่มต้น) ÷ |ค่าเริ่มต้น|) × 100", suffix: "%" },
};

export function PercentageCalculatorTool() {
  const [mode, setMode] = useState<PercentageMode>("of");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");
  const labels = percentageLabels[mode];
  const clearResult = () => { setResult(null); setError(""); };
  const run = () => {
    try {
      setResult(calculatePercentage(mode, parseNumber(first), parseNumber(second)));
      setError("");
      toast.success("คำนวณเปอร์เซ็นต์แล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr_1fr]">
        <div>
          <Label htmlFor="percentage-mode">รูปแบบการคำนวณ</Label>
          <Select value={mode} onValueChange={(value) => { setMode(value as PercentageMode); clearResult(); }}>
            <SelectTrigger id="percentage-mode" className="mt-1 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="of">X% ของ Y</SelectItem>
              <SelectItem value="ratio">X เป็นกี่ % ของ Y</SelectItem>
              <SelectItem value="change">% เปลี่ยนจาก X เป็น Y</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="percentage-first">{labels.first}</Label><Input id="percentage-first" type="number" inputMode="decimal" value={first} onChange={(event) => { setFirst(event.target.value); clearResult(); }} className="mt-1" placeholder="เช่น 15" /></div>
        <div><Label htmlFor="percentage-second">{labels.second}</Label><Input id="percentage-second" type="number" inputMode="decimal" value={second} onChange={(event) => { setSecond(event.target.value); clearResult(); }} className="mt-1" placeholder="เช่น 200" /></div>
      </div>
      <div className="mt-4"><ActionBar><Button onClick={run}><Calculator className="size-4" />คำนวณเปอร์เซ็นต์</Button><ExampleButton onExample={() => { setMode("of"); setFirst("15"); setSecond("200"); clearResult(); }} /><ClearButton onClear={() => { setFirst(""); setSecond(""); clearResult(); }} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        {result !== null ? (
          <div className="rounded-xl border bg-primary/5 p-5" aria-live="polite">
            <p className="text-sm text-muted-foreground">ผลลัพธ์</p>
            <p className="mt-1 text-3xl font-bold tabular-nums" data-testid="percentage-result">{formatNumber(result)}{labels.suffix}</p>
            <p className="mt-2 text-xs text-muted-foreground">สูตร: {labels.formula}</p>
          </div>
        ) : <EmptyOutput size="compact" text="กรอกตัวเลขให้ครบ แล้วกด “คำนวณเปอร์เซ็นต์”" />}
      </div>
    </WorkspaceFrame>
  );
}

export function UnitConverterTool() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("ft");
  const [input, setInput] = useState("");
  const group = unitGroups[category];
  const conversion = useMemo(() => {
    if (!input.trim()) return { result: null, error: "" };
    try {
      return { result: convertUnit(category, parseNumber(input), fromUnit, toUnit), error: "" };
    } catch (caught) {
      return { result: null, error: caught instanceof Error ? caught.message : "แปลงหน่วยไม่สำเร็จ" };
    }
  }, [category, fromUnit, input, toUnit]);
  const selectCategory = (nextCategory: UnitCategory) => {
    const units = unitGroups[nextCategory].units;
    setCategory(nextCategory);
    setFromUnit(units[0].value);
    setToUnit(units[1]?.value ?? units[0].value);
  };
  const fromLabel = group.units.find((unit) => unit.value === fromUnit)?.label ?? fromUnit;
  const toLabel = group.units.find((unit) => unit.value === toUnit)?.label ?? toUnit;

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 lg:grid-cols-[12rem_1fr_auto_1fr] lg:items-end">
        <div>
          <Label htmlFor="unit-category">ประเภทหน่วย</Label>
          <Select value={category} onValueChange={(value) => selectCategory(value as UnitCategory)}>
            <SelectTrigger id="unit-category" className="mt-1 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(unitGroups).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit-input">ค่าต้นทาง</Label>
          <div className="mt-1 flex gap-2"><Input id="unit-input" type="number" inputMode="decimal" value={input} onChange={(event) => setInput(event.target.value)} placeholder="เช่น 10" /><Select value={fromUnit} onValueChange={setFromUnit}><SelectTrigger className="w-44" aria-label="หน่วยต้นทาง"><SelectValue /></SelectTrigger><SelectContent>{group.units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => { setFromUnit(toUnit); setToUnit(fromUnit); }} aria-label="สลับหน่วย"><ArrowLeftRight className="size-4" /></Button>
        <div>
          <Label>หน่วยปลายทาง</Label>
          <Select value={toUnit} onValueChange={setToUnit}><SelectTrigger className="mt-1 w-full" aria-label="หน่วยปลายทาง"><SelectValue /></SelectTrigger><SelectContent>{group.units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      {conversion.error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{conversion.error}</p> : null}
      <div className="mt-4">
        {conversion.result !== null ? (
          <div className="rounded-xl border bg-primary/5 p-5" aria-live="polite">
            <p className="text-sm text-muted-foreground">{formatNumber(parseNumber(input))} {fromLabel} เท่ากับ</p>
            <p className="mt-1 break-words text-3xl font-bold tabular-nums">{formatNumber(conversion.result)} <span className="text-lg font-medium">{toLabel}</span></p>
          </div>
        ) : <EmptyOutput size="compact" text="กรอกค่าเพื่อดูผลลัพธ์ทันที" />}
      </div>
    </WorkspaceFrame>
  );
}

function DateResult({ value, description }: { value: string; description: string }) {
  return <div className="rounded-xl border bg-primary/5 p-5" aria-live="polite"><p className="text-sm text-muted-foreground">{description}</p><p className="mt-1 text-3xl font-bold tabular-nums">{value}</p></div>;
}

export function DateCalculatorTool() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [baseDate, setBaseDate] = useState("");
  const [daysToAdd, setDaysToAdd] = useState("");
  const [businessDaysOnly, setBusinessDaysOnly] = useState(false);
  const difference = useMemo(() => {
    if (!start || !end) return { value: null, error: "" };
    try { return { value: differenceInCalendarDays(start, end), error: "" }; }
    catch (caught) { return { value: null, error: caught instanceof Error ? caught.message : "คำนวณวันไม่สำเร็จ" }; }
  }, [end, start]);
  const addedDate = useMemo(() => {
    if (!baseDate || !daysToAdd.trim()) return { value: "", error: "" };
    try { return { value: addDaysToDate(baseDate, parseNumber(daysToAdd), businessDaysOnly), error: "" }; }
    catch (caught) { return { value: "", error: caught instanceof Error ? caught.message : "คำนวณวันที่ไม่สำเร็จ" }; }
  }, [baseDate, businessDaysOnly, daysToAdd]);
  const thaiDate = addedDate.value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(new Date(`${addedDate.value}T12:00:00`)) : "";

  return (
    <WorkspaceFrame>
      <Tabs defaultValue="difference">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit sm:min-w-80">
          <TabsTrigger value="difference">หาระยะห่าง</TabsTrigger>
          <TabsTrigger value="add">บวก/ลบวัน</TabsTrigger>
        </TabsList>
        <TabsContent value="difference" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="date-start">วันที่เริ่มต้น</Label><Input id="date-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="date-end">วันที่สิ้นสุด</Label><Input id="date-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1" /></div>
          </div>
          {difference.error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{difference.error}</p> : null}
          <div className="mt-4">
            {difference.value !== null ? <DateResult value={`${integerFormatter.format(difference.value)} วัน`} description={`${integerFormatter.format(Math.trunc(Math.abs(difference.value) / 7))} สัปดาห์ ${integerFormatter.format(Math.abs(difference.value) % 7)} วัน · ค่าติดลบหมายถึงวันที่สิ้นสุดอยู่ก่อนวันที่เริ่มต้น`} /> : <EmptyOutput size="compact" text="เลือกวันที่เริ่มต้นและวันที่สิ้นสุด" />}
          </div>
        </TabsContent>
        <TabsContent value="add" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><Label htmlFor="date-base">วันที่ตั้งต้น</Label><Input id="date-base" type="date" value={baseDate} onChange={(event) => setBaseDate(event.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="date-days">จำนวนวันที่ต้องการบวก/ลบ</Label><Input id="date-days" type="number" inputMode="numeric" value={daysToAdd} onChange={(event) => setDaysToAdd(event.target.value)} className="mt-1" placeholder="เช่น 30 หรือ -7" /></div>
            <label className="flex min-h-8 items-center justify-between gap-4 rounded-lg border px-3 text-sm">นับเฉพาะวันทำงาน <Switch checked={businessDaysOnly} onCheckedChange={setBusinessDaysOnly} aria-label="นับเฉพาะวันทำงานจันทร์ถึงศุกร์" /></label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">โหมดวันทำงานไม่นับเสาร์-อาทิตย์ แต่ยังไม่หักวันหยุดนักขัตฤกษ์</p>
          {addedDate.error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{addedDate.error}</p> : null}
          <div className="mt-4">
            {addedDate.value ? <DateResult value={addedDate.value} description={thaiDate} /> : <EmptyOutput size="compact" text="เลือกวันที่ แล้วกรอกจำนวนวันที่ต้องการบวกหรือลบ" />}
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-4 flex justify-end"><ClearButton onClear={() => { setStart(""); setEnd(""); setBaseDate(""); setDaysToAdd(""); setBusinessDaysOnly(false); }} /></div>
    </WorkspaceFrame>
  );
}
