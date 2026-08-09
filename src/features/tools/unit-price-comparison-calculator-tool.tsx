"use client";

import { useState } from "react";
import {
  BadgeDollarSign,
  Calculator,
  Download,
  Info,
  PackagePlus,
  Plus,
  Scale,
  Sparkles,
  Tags,
  Trash2,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateUnitPriceComparison,
  getUnitPriceUnit,
  getUnitPriceUnits,
  unitPriceComparisonCsv,
  UNIT_PRICE_MAX_ITEMS,
  type UnitPriceComparisonInput,
  type UnitPriceComparisonResult,
  type UnitPriceCurrency,
  type UnitPriceDimension,
  type UnitPriceUnit,
} from "@/lib/tools/unit-price-comparison";

type UnitPriceFormRow = {
  id: number;
  name: string;
  listedPrice: string;
  packageCount: string;
  amountPerPackage: string;
  unit: UnitPriceUnit;
  discountPercent: string;
  fixedDiscount: string;
  extraCost: string;
};

type UnitPriceForm = {
  currency: UnitPriceCurrency;
  comparisonName: string;
  dimension: UnitPriceDimension;
  targetAmount: string;
  targetUnit: UnitPriceUnit;
  items: UnitPriceFormRow[];
};

const currencyLabels: Record<UnitPriceCurrency, string> = {
  THB: "บาท (THB)",
  USD: "ดอลลาร์สหรัฐ (USD)",
  EUR: "ยูโร (EUR)",
  GBP: "ปอนด์ (GBP)",
  JPY: "เยน (JPY)",
  OTHER: "หน่วยเงินอื่น",
};

const dimensionLabels: Record<UnitPriceDimension, string> = {
  mass: "น้ำหนัก",
  volume: "ปริมาตร",
  count: "จำนวนชิ้น",
};

const dimensionDefaults: Record<UnitPriceDimension, { targetAmount: string; unit: UnitPriceUnit }> = {
  mass: { targetAmount: "100", unit: "g" },
  volume: { targetAmount: "100", unit: "ml" },
  count: { targetAmount: "1", unit: "item" },
};

function emptyRow(id: number, unit: UnitPriceUnit): UnitPriceFormRow {
  return {
    id,
    name: "",
    listedPrice: "",
    packageCount: "1",
    amountPerPackage: "",
    unit,
    discountPercent: "",
    fixedDiscount: "",
    extraCost: "",
  };
}

function createInitialForm(): UnitPriceForm {
  return {
    currency: "THB",
    comparisonName: "ของที่กำลังเลือกซื้อ",
    dimension: "mass",
    targetAmount: "100",
    targetUnit: "g",
    items: [emptyRow(1, "g"), emptyRow(2, "g")],
  };
}

function createExampleForm(): UnitPriceForm {
  return {
    currency: "THB",
    comparisonName: "เปรียบเทียบกาแฟ 3 แพ็ก",
    dimension: "mass",
    targetAmount: "100",
    targetUnit: "g",
    items: [
      { id: 1, name: "ถุง 500 กรัม", listedPrice: "65", packageCount: "1", amountPerPackage: "500", unit: "g", discountPercent: "", fixedDiscount: "", extraCost: "" },
      { id: 2, name: "ถุง 1 กิโลกรัม", listedPrice: "119", packageCount: "1", amountPerPackage: "1", unit: "kg", discountPercent: "", fixedDiscount: "", extraCost: "" },
      { id: 3, name: "แพ็ก 3 ถุง 400 กรัม", listedPrice: "135", packageCount: "3", amountPerPackage: "400", unit: "g", discountPercent: "10", fixedDiscount: "", extraCost: "5" },
    ],
  };
}

function parseNumber(value: string, label: string, allowEmptyZero = false) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized && allowEmptyZero) return 0;
  if (!normalized) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function money(value: number, currency: UnitPriceCurrency, compact = false) {
  const maximumFractionDigits = compact ? (Math.abs(value) < 1 ? 6 : 4) : 2;
  if (currency === "OTHER") {
    return `${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits })} หน่วย`;
  }
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: compact ? 2 : currency === "JPY" ? 0 : 2,
    maximumFractionDigits,
  }).format(value);
}

function number(value: number, maximumFractionDigits = 6) {
  return value.toLocaleString("th-TH", { maximumFractionDigits });
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} min={min} max={max} step={step} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function comparisonSummary(input: UnitPriceComparisonInput, result: UnitPriceComparisonResult) {
  const winners = result.ranking.filter((row) => row.isCheapest).map((row) => row.name).join(", ");
  const lines = [
    input.comparisonName,
    `ฐานเปรียบเทียบ: ${result.targetLabel}`,
    `คุ้มสุด: ${winners} · ${money(result.cheapestPricePerTarget, input.currency, true)} ต่อ ${result.targetLabel}`,
    "",
    ...result.ranking.map((row) => `${row.rank}. ${row.name}: ${money(row.pricePerTarget, input.currency, true)} ต่อ ${result.targetLabel}${row.isCheapest ? " · คุ้มสุด" : ` · แพงกว่า ${number(row.moreExpensivePercent, 2)}%`}`),
    "",
    "คำนวณจากราคาหลังส่วนลดและค่าใช้จ่ายเพิ่ม ไม่รวมคุณภาพ วันหมดอายุ หรือปริมาณที่ใช้ไม่หมด",
  ];
  return lines.join("\n");
}

function ResultPanel({ input, result }: { input: UnitPriceComparisonInput; result: UnitPriceComparisonResult }) {
  const winners = result.ranking.filter((row) => row.isCheapest);
  const maximumBarValue = result.mostExpensivePricePerTarget || 1;
  const csv = unitPriceComparisonCsv(input, result);
  const summary = comparisonSummary(input, result);

  return (
    <section className="space-y-6" data-testid="unit-price-result" aria-labelledby="unit-price-result-title">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">ผลเปรียบเทียบ</p>
        <h2 id="unit-price-result-title" className="mt-2 text-xl font-bold sm:text-2xl">{input.comparisonName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">เรียงจากราคาต่อ {result.targetLabel} ต่ำที่สุด โดยใช้ยอดจ่ายจริงหลังส่วนลดและค่าใช้จ่ายเพิ่ม</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="meaw-glass-card rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 shadow-sm" data-testid="unit-price-best">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><Trophy className="size-4" />คุ้มสุดต่อ {result.targetLabel}</div>
          <p className="mt-3 text-xl font-bold">{winners.map((row) => row.name).join(" · ")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{money(result.cheapestPricePerTarget, input.currency, true)}</p>
          {winners.length > 1 ? <p className="mt-2 text-xs text-muted-foreground">มี {winners.length} รายการราคาเท่ากันภายในค่าคลาดเคลื่อนของระบบ</p> : null}
        </article>
        <article className="meaw-glass-card rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><Tags className="size-4" />ส่วนต่างมากที่สุด</div>
          <p className="mt-3 text-2xl font-bold tabular-nums">{money(result.maximumSavingsPerTarget, input.currency, true)}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ประหยัดต่อ {result.targetLabel} เมื่อเลือกคุ้มสุดแทนรายการที่แพงสุด</p>
        </article>
        <article className="meaw-glass-card rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-primary"><Scale className="size-4" />ฐานที่เทียบ</div>
          <p className="mt-3 text-2xl font-bold tabular-nums">{result.targetLabel}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{dimensionLabels[input.dimension]} · {result.rows.length} รายการ · ใช้หน่วยเดียวกันก่อนจัดอันดับ</p>
        </article>
      </div>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="unit-price-ranking-title" data-testid="unit-price-ranking">
        <h3 id="unit-price-ranking-title" className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-primary" />อันดับความคุ้มค่า</h3>
        <div className="mt-5 space-y-4">
          {result.ranking.map((row) => {
            const unit = getUnitPriceUnit(row.unit);
            const barWidth = Math.max(6, row.pricePerTarget / maximumBarValue * 100);
            return (
              <article key={row.itemIndex} className={`rounded-xl border p-4 ${row.isCheapest ? "border-emerald-500/35 bg-emerald-500/5" : "bg-card/45"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{row.rank}</span>
                      <h4 className="break-words font-semibold">{row.name}</h4>
                      {row.isCheapest ? <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">คุ้มสุด</span> : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{number(row.packageCount, 0)} แพ็ก × {number(row.amountPerPackage)} {unit.shortLabel} · จ่ายจริง {money(row.effectiveCost, input.currency)}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-lg font-bold tabular-nums">{money(row.pricePerTarget, input.currency, true)}</p>
                    <p className="text-xs text-muted-foreground">ต่อ {result.targetLabel}</p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" aria-label={`${row.name} ราคา ${number(row.pricePerTarget)} ต่อ ${result.targetLabel}`}>
                  <div className={`h-full rounded-full ${row.isCheapest ? "bg-emerald-500" : "bg-pink-400 dark:bg-pink-500"}`} style={{ width: `${barWidth}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>{number(row.totalTargetUnits, 4)} ชุดฐานในแพ็ก</span>
                  {row.isCheapest ? <span>ส่วนต่างจากคุ้มสุด 0%</span> : <span>แพงกว่าคุ้มสุด {number(row.moreExpensivePercent, 2)}% ({money(row.differenceFromCheapest, input.currency, true)})</span>}
                  {row.discountPercent > 0 || row.fixedDiscount > 0 || row.extraCost > 0 ? <span>ปรับจากหน้าป้าย {money(row.listedPrice, input.currency)} → {money(row.effectiveCost, input.currency)}</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="unit-price-formula-title">
          <h3 id="unit-price-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรและลำดับส่วนลด</h3>
          <ol className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> ยอดจ่ายจริง = ราคาหน้าป้าย × (1 − ส่วนลด %) − ส่วนลดคงที่ + ค่าใช้จ่ายเพิ่ม</li>
            <li><strong className="text-foreground">2.</strong> ปริมาณรวม = จำนวนแพ็ก × ปริมาณต่อแพ็ก แล้วแปลงเป็นหน่วยฐานเดียวกัน</li>
            <li><strong className="text-foreground">3.</strong> ราคาต่อฐาน = ยอดจ่ายจริง ÷ จำนวนชุด {result.targetLabel} ที่มีในแพ็ก</li>
          </ol>
        </section>
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="unit-price-boundary-title">
          <h3 id="unit-price-boundary-title" className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />สิ่งที่ราคาต่อหน่วยยังไม่บอก</h3>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">ราคาต่ำสุดไม่ได้แปลว่าเหมาะที่สุดเสมอ ควรเทียบคุณภาพ ส่วนผสม วันหมดอายุ พื้นที่เก็บ ปริมาณที่จะใช้จริง เงื่อนไขสมาชิก และความเสี่ยงซื้อมาแล้วใช้ไม่หมดด้วย</p>
        </section>
      </div>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกผลเปรียบเทียบแล้ว")}><Sparkles className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="unit-price-csv" onClick={() => downloadText(csv, "meaw-unit-price-comparison.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </section>
  );
}

export function UnitPriceComparisonCalculatorTool() {
  const [form, setForm] = useState<UnitPriceForm>(createInitialForm);
  const [nextItemId, setNextItemId] = useState(3);
  const [calculation, setCalculation] = useState<{ input: UnitPriceComparisonInput; result: UnitPriceComparisonResult } | null>(null);
  const [error, setError] = useState("");
  const units = getUnitPriceUnits(form.dimension);

  const updateForm = <Key extends keyof Omit<UnitPriceForm, "items">>(key: Key, value: UnitPriceForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setCalculation(null);
    setError("");
  };

  const updateItem = <Key extends keyof Omit<UnitPriceFormRow, "id">>(id: number, key: Key, value: UnitPriceFormRow[Key]) => {
    setForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
    setCalculation(null);
    setError("");
  };

  const changeDimension = (dimension: UnitPriceDimension) => {
    const defaults = dimensionDefaults[dimension];
    setForm((current) => ({
      ...current,
      dimension,
      targetAmount: defaults.targetAmount,
      targetUnit: defaults.unit,
      items: current.items.map((item) => ({ ...item, unit: defaults.unit })),
    }));
    setCalculation(null);
    setError("");
  };

  const addItem = () => {
    if (form.items.length >= UNIT_PRICE_MAX_ITEMS) return;
    setForm((current) => ({ ...current, items: [...current.items, emptyRow(nextItemId, dimensionDefaults[current.dimension].unit)] }));
    setNextItemId((value) => value + 1);
    setCalculation(null);
    setError("");
  };

  const removeItem = (id: number) => {
    if (form.items.length <= 2) return;
    setForm((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
    setCalculation(null);
    setError("");
  };

  const calculate = () => {
    try {
      const input: UnitPriceComparisonInput = {
        currency: form.currency,
        comparisonName: form.comparisonName,
        dimension: form.dimension,
        targetAmount: parseNumber(form.targetAmount, "ปริมาณฐานเปรียบเทียบ"),
        targetUnit: form.targetUnit,
        items: form.items.map((item, index) => ({
          name: item.name,
          listedPrice: parseNumber(item.listedPrice, `ราคาหน้าป้ายรายการที่ ${index + 1}`),
          packageCount: parseNumber(item.packageCount, `จำนวนแพ็กรายการที่ ${index + 1}`),
          amountPerPackage: parseNumber(item.amountPerPackage, `ปริมาณต่อแพ็กรายการที่ ${index + 1}`),
          unit: item.unit,
          discountPercent: parseNumber(item.discountPercent, `ส่วนลดเปอร์เซ็นต์รายการที่ ${index + 1}`, true),
          fixedDiscount: parseNumber(item.fixedDiscount, `ส่วนลดคงที่รายการที่ ${index + 1}`, true),
          extraCost: parseNumber(item.extraCost, `ค่าใช้จ่ายเพิ่มรายการที่ ${index + 1}`, true),
        })),
      };
      const result = calculateUnitPriceComparison(input);
      setCalculation({ input, result });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "เปรียบเทียบราคาต่อหน่วยไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setForm(createExampleForm());
    setNextItemId(4);
    setCalculation(null);
    setError("");
  };

  const clear = () => {
    setForm(createInitialForm());
    setNextItemId(3);
    setCalculation(null);
    setError("");
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-7 overflow-hidden border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-amber-300/10">
        <PackagePlus className="text-pink-600 dark:text-pink-300" />
        <AlertTitle className="flex flex-wrap items-center gap-2">แพ็กใหญ่ไม่ได้คุ้มกว่าเสมอ <span aria-hidden="true" className="rounded-full border border-pink-300/40 bg-white/55 px-2 py-0.5 text-xs font-normal text-pink-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-pink-200">ฅ(ᐤˊ꒳ˋᐤ♪)</span></AlertTitle>
        <AlertDescription className="leading-6">เทียบราคาต่อ 100 g, 1 kg, 100 mL, 1 L หรือ 1 ชิ้น โดยรวมส่วนลด คูปอง และค่าส่ง ข้อมูลคำนวณใน Browser ไม่ถูกส่งไป Server</AlertDescription>
      </Alert>

      <section aria-labelledby="unit-price-settings-title">
        <h2 id="unit-price-settings-title" className="flex items-center gap-2 font-semibold"><Scale className="size-4 text-primary" />1. เลือกสิ่งที่จะเปรียบเทียบ</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">เทียบเฉพาะสินค้าประเภทเดียวกัน เช่น น้ำหนักกับน้ำหนัก ปริมาตรกับปริมาตร หรือจำนวนชิ้นกับจำนวนชิ้น</p>
        <Tabs value={form.dimension} onValueChange={(value) => changeDimension(value as UnitPriceDimension)} className="mt-5">
          <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit sm:min-w-[26rem]">
            <TabsTrigger value="mass">น้ำหนัก</TabsTrigger>
            <TabsTrigger value="volume">ปริมาตร</TabsTrigger>
            <TabsTrigger value="count">จำนวนชิ้น</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="unit-price-comparison-name">ชื่อรายการเปรียบเทียบ</Label>
            <Input id="unit-price-comparison-name" value={form.comparisonName} maxLength={120} placeholder="เช่น กาแฟสามยี่ห้อ" onChange={(event) => updateForm("comparisonName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้เป็นหัวข้อในสรุปและไฟล์ CSV</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="unit-price-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as UnitPriceCurrency)}>
              <SelectTrigger id="unit-price-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(currencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">จัดรูปแบบเท่านั้น ไม่มีการแลกเปลี่ยนเงิน</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="unit-price-target-amount">แสดงราคาต่อ</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,1.3fr)] gap-2">
              <Input id="unit-price-target-amount" inputMode="decimal" value={form.targetAmount} placeholder="100" onChange={(event) => updateForm("targetAmount", event.target.value)} />
              <Select value={form.targetUnit} onValueChange={(value) => updateForm("targetUnit", value as UnitPriceUnit)}>
                <SelectTrigger aria-label="หน่วยฐานเปรียบเทียบ" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">เช่น 100 g, 1 kg, 100 mL หรือ 1 ชิ้น</p>
          </div>
        </div>
      </section>

      <section className="mt-9 border-t pt-8" aria-labelledby="unit-price-items-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="unit-price-items-title" className="flex items-center gap-2 font-semibold"><Tags className="size-4 text-primary" />2. กรอกราคาและขนาดแพ็ก</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ราคาหน้าป้ายคือราคาของแพ็กทั้งหมด หากเป็น 3 ขวด × 500 mL ให้ใส่จำนวนแพ็ก 3 และปริมาณต่อแพ็ก 500 mL</p>
          </div>
          <Button type="button" variant="outline" onClick={addItem} disabled={form.items.length >= UNIT_PRICE_MAX_ITEMS}><Plus className="size-4" />เพิ่มสินค้า ({form.items.length}/{UNIT_PRICE_MAX_ITEMS})</Button>
        </div>

        <div className="mt-6 space-y-5">
          {form.items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-white/50 bg-card/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/45 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">สินค้า {index + 1}</h3>
                <Button type="button" size="icon" variant="ghost" disabled={form.items.length <= 2} onClick={() => removeItem(item.id)} aria-label={`ลบสินค้า ${index + 1}`}><Trash2 className="size-4" /></Button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-3 md:col-span-2 xl:col-span-1">
                  <Label htmlFor={`unit-price-name-${item.id}`}>ชื่อสินค้า / ขนาด</Label>
                  <Input id={`unit-price-name-${item.id}`} value={item.name} maxLength={80} placeholder="เช่น ถุง 500 กรัม" onChange={(event) => updateItem(item.id, "name", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">ไม่ต้องใส่ข้อมูลสมาชิกหรือเลขคำสั่งซื้อ</p>
                </div>
                <NumberField id={`unit-price-price-${item.id}`} label="ราคาหน้าป้ายทั้งแพ็ก" value={item.listedPrice} onChange={(value) => updateItem(item.id, "listedPrice", value)} placeholder="เช่น 119" hint="ก่อนหักส่วนลดและบวกค่าส่ง" min={0.01} />
                <NumberField id={`unit-price-count-${item.id}`} label="จำนวนแพ็ก / ชิ้นย่อย" value={item.packageCount} onChange={(value) => updateItem(item.id, "packageCount", value)} placeholder="1" hint="ต้องเป็นจำนวนเต็ม เช่น 3 ขวด" min={1} step={1} />
                <div className="grid gap-3">
                  <Label htmlFor={`unit-price-amount-${item.id}`}>ปริมาณต่อแพ็ก / ชิ้นย่อย</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,1.25fr)] gap-2">
                    <Input id={`unit-price-amount-${item.id}`} inputMode="decimal" value={item.amountPerPackage} placeholder={form.dimension === "count" ? "1" : "500"} onChange={(event) => updateItem(item.id, "amountPerPackage", event.target.value)} />
                    <Select value={item.unit} onValueChange={(value) => updateItem(item.id, "unit", value as UnitPriceUnit)}>
                      <SelectTrigger aria-label={`หน่วยสินค้า ${index + 1}`} className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">อ่านจากปริมาณสุทธิบนฉลาก</p>
                </div>
              </div>

              <details className="group mt-5 rounded-xl border bg-muted/20 p-4" open={Boolean(item.discountPercent || item.fixedDiscount || item.extraCost) || undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium marker:content-none">
                  <span className="flex items-center gap-2"><BadgeDollarSign className="size-4 text-primary" />ส่วนลด คูปอง และค่าส่ง <span className="font-normal text-muted-foreground">(เว้นว่างได้)</span></span>
                  <span className="text-xs font-normal text-primary group-open:hidden">เปิดกรอก</span>
                  <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">ซ่อน</span>
                </summary>
                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  <NumberField id={`unit-price-discount-${item.id}`} label="ส่วนลด (%)" value={item.discountPercent} onChange={(value) => updateItem(item.id, "discountPercent", value)} placeholder="0" hint="หักจากราคาหน้าป้ายก่อน" min={0} max={100} />
                  <NumberField id={`unit-price-fixed-${item.id}`} label="ส่วนลดคงที่ / คูปอง" value={item.fixedDiscount} onChange={(value) => updateItem(item.id, "fixedDiscount", value)} placeholder="0" hint="หักหลังส่วนลดเปอร์เซ็นต์" min={0} />
                  <NumberField id={`unit-price-extra-${item.id}`} label="ค่าส่ง / ค่าใช้จ่ายเพิ่ม" value={item.extraCost} onChange={(value) => updateItem(item.id, "extraCost", value)} placeholder="0" hint="บวกเป็นขั้นตอนสุดท้าย" min={0} />
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      {error ? <Alert variant="destructive" className="mt-6"><TriangleAlert /><AlertTitle>ตรวจข้อมูลก่อนเปรียบเทียบ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={calculate}><Calculator className="size-4" />เปรียบเทียบราคาต่อหน่วย</Button>
        <ExampleButton onExample={loadExample} />
        <ClearButton onClear={clear} />
      </div>

      {calculation ? <div className="mt-9 border-t pt-8"><ResultPanel input={calculation.input} result={calculation.result} /></div> : null}

      <Alert className="mt-9 border-sky-500/25 bg-sky-500/5">
        <Info className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>หลักการและแหล่งหน่วยอ้างอิง</AlertTitle>
        <AlertDescription className="leading-6">
          NIST อธิบายว่า Unit pricing ใช้เทียบความคุ้มค่าระหว่างแบรนด์และขนาดแพ็ก และควรใช้หน่วยเดียวกันอย่างสม่ำเสมอใน <a className="font-medium text-primary hover:underline" href="https://www.nist.gov/pml/owm/nist-handbook-130-current-edition" target="_blank" rel="noreferrer">Handbook 130 ฉบับปัจจุบัน</a> ส่วนค่าการแปลง oz/lb และ fl oz/pint/quart/gallon ใช้ตารางของ <a className="font-medium text-primary hover:underline" href="https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1020.pdf" target="_blank" rel="noreferrer">NIST SP 1020</a> เครื่องมือนี้เป็นตัวช่วยซื้อของ ไม่ใช่ฉลากราคาตามกฎหมายหรือการรับรองคุณภาพสินค้าในประเทศไทย
        </AlertDescription>
      </Alert>
    </WorkspaceFrame>
  );
}
