"use client";

import {
  Calculator,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Download,
  Gauge,
  Info,
  RefreshCw,
  ShieldCheck,
  Target,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateInventoryTurnover,
  inventoryTurnoverCsv,
  type InventoryAverageMethod,
  type InventoryTargetStatus,
  type InventoryTurnoverCurrency,
  type InventoryTurnoverInput,
  type InventoryTurnoverResult,
} from "@/lib/tools/inventory-turnover";

type PeriodPreset = "30" | "90" | "365" | "366" | "custom";
type InventoryTurnoverFormState = {
  averageMethod: InventoryAverageMethod;
  currency: InventoryTurnoverCurrency;
  periodPreset: PeriodPreset;
  periodDays: string;
  costOfGoodsSold: string;
  openingInventory: string;
  closingInventory: string;
  directAverageInventory: string;
  inventorySnapshots: string;
  targetAnnualTurnover: string;
};

const AVERAGE_METHODS: Array<{ value: InventoryAverageMethod; label: string; description: string }> = [
  { value: "opening-closing", label: "Inventory ต้นรอบ + ปลายรอบ", description: "Average inventory = (ต้นรอบ + ปลายรอบ) ÷ 2" },
  { value: "direct", label: "กรอก Average inventory โดยตรง", description: "ใช้ค่าเฉลี่ยที่คำนวณจากระบบบัญชีหรือรายงานภายนอก" },
  { value: "snapshots", label: "เฉลี่ยจากหลาย Snapshot", description: "เหมาะเมื่อสต๊อกผันผวนหรือมีฤดูกาล เช่น ยอดปลายเดือน 13 จุด" },
];

const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "30", label: "30 วัน" },
  { value: "90", label: "90 วัน" },
  { value: "365", label: "365 วัน" },
  { value: "366", label: "366 วัน" },
  { value: "custom", label: "กำหนดเอง" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const moneyFormatters: Record<Exclude<InventoryTurnoverCurrency, "OTHER">, Intl.NumberFormat> = {
  THB: new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

function money(value: number, currency: InventoryTurnoverCurrency) {
  return currency === "OTHER" ? `${numberFormatter.format(value)} หน่วยเงิน` : moneyFormatters[currency].format(value);
}

function createInitialForm(): InventoryTurnoverFormState {
  return {
    averageMethod: "opening-closing",
    currency: "THB",
    periodPreset: "365",
    periodDays: "365",
    costOfGoodsSold: "",
    openingInventory: "",
    closingInventory: "",
    directAverageInventory: "",
    inventorySnapshots: "",
    targetAnnualTurnover: "",
  };
}

function createExampleForm(): InventoryTurnoverFormState {
  return {
    averageMethod: "opening-closing",
    currency: "THB",
    periodPreset: "365",
    periodDays: "365",
    costOfGoodsSold: "1200000",
    openingInventory: "300000",
    closingInventory: "200000",
    directAverageInventory: "",
    inventorySnapshots: "",
    targetAnnualTurnover: "6",
  };
}

function parseNumber(value: string, label: string, required = false) {
  if (!value.trim()) {
    if (required) throw new Error(`กรุณากรอก${label}`);
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function parseSnapshots(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed.split(/[\s,;]+/).map((token, index) => {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) throw new Error(`Inventory snapshot ลำดับ ${index + 1} ต้องเป็นตัวเลข`);
    return parsed;
  });
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  min,
  max,
  step = 0.01,
  placeholder = "0",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ResultCard({ label, value, detail, testId, tone = "default" }: {
  label: string;
  value: string;
  detail: string;
  testId: string;
  tone?: "default" | "positive" | "warning";
}) {
  const toneClass = tone === "positive"
    ? "border-emerald-500/35 bg-emerald-500/5"
    : tone === "warning"
      ? "border-amber-500/40 bg-amber-500/5"
      : "bg-muted/10";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function targetStatusText(status: InventoryTargetStatus) {
  const labels: Record<InventoryTargetStatus, string> = {
    "no-target": "ยังไม่ได้ตั้งเป้าหมาย",
    "near-target": "Average inventory ใกล้ระดับตามเป้าหมาย",
    "above-target-inventory": "Average inventory สูงกว่าระดับตามเป้าหมาย",
    "below-target-inventory": "Average inventory ต่ำกว่าระดับตามเป้าหมาย",
  };
  return labels[status];
}

function InventoryTurnoverResultPanel({ input, result }: { input: InventoryTurnoverInput; result: InventoryTurnoverResult }) {
  const method = AVERAGE_METHODS.find((item) => item.value === input.averageMethod) ?? AVERAGE_METHODS[0]!;
  const targetGap = result.averageInventoryGapToTarget ?? 0;
  const targetTone = result.targetStatus === "above-target-inventory" ? "warning" : "positive";
  const summary = [
    "สรุป Inventory Turnover และ Inventory Days",
    `Average inventory: ${money(result.averageInventory, input.currency)}`,
    `Inventory turnover ในรอบ: ${numberFormatter.format(result.turnoverForPeriod)} รอบ / ${numberFormatter.format(input.periodDays)} วัน`,
    `Inventory turnover แบบ Annualized: ${numberFormatter.format(result.annualizedTurnover)} รอบ/ปี`,
    `Inventory days / DIO: ${numberFormatter.format(result.inventoryDays)} วัน`,
    `Weeks on hand: ${numberFormatter.format(result.weeksOnHand)} สัปดาห์`,
    input.targetAnnualTurnover > 0 ? `เทียบเป้าหมาย ${numberFormatter.format(input.targetAnnualTurnover)} รอบ/ปี: ${targetStatusText(result.targetStatus)}` : "ไม่ได้ตั้งเป้าหมาย Turnover",
  ].join("\n");

  return (
    <div data-testid="inventory-turnover-result" className="space-y-5" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="Inventory turnover ในรอบ" value={`${numberFormatter.format(result.turnoverForPeriod)} รอบ`} detail={`${numberFormatter.format(input.periodDays)} วันตาม COGS ที่กรอก`} testId="inventory-turnover-period" tone="positive" />
        <ResultCard label="Inventory turnover แบบ Annualized" value={`${numberFormatter.format(result.annualizedTurnover)} รอบ/ปี`} detail="ปรับสัดส่วนเป็น 365 วันเพื่อใช้เทียบช่วง" testId="inventory-turnover-annualized" tone="positive" />
        <ResultCard label="Inventory days / DIO" value={`${numberFormatter.format(result.inventoryDays)} วัน`} detail="จำนวนวันเฉลี่ยที่ Inventory รองรับ COGS" testId="inventory-days" />
        <ResultCard label="Average inventory" value={money(result.averageInventory, input.currency)} detail={`${method.label} · ${result.snapshotCount} ค่า`} testId="inventory-average" />
        <ResultCard label="Weeks on hand" value={`${numberFormatter.format(result.weeksOnHand)} สัปดาห์`} detail={`${numberFormatter.format(result.monthsOnHand)} เดือนโดยประมาณ`} testId="inventory-weeks" />
        <ResultCard label="COGS เฉลี่ยต่อวัน" value={money(result.costOfGoodsSoldPerDay, input.currency)} detail={`COGS ${money(input.costOfGoodsSold, input.currency)} ÷ ${numberFormatter.format(input.periodDays)} วัน`} testId="inventory-cogs-per-day" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="inventory-turnover-formula-title">
          <h3 id="inventory-turnover-formula-title" className="flex items-center gap-2 font-semibold"><RefreshCw className="size-4 text-primary" />โครงสร้าง Turnover และ Days</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ต้นทุนขาย (COGS)</span><span className="text-right tabular-nums">{money(input.costOfGoodsSold, input.currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Average inventory</span><span className="text-right tabular-nums">÷ {money(result.averageInventory, input.currency)}</span></div>
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>Turnover ในรอบ</span><span className="tabular-nums">{numberFormatter.format(result.turnoverForPeriod)} รอบ</span></div>
          </div>
          <div className="mt-4 rounded-lg border bg-card p-3 text-sm leading-6">
            Inventory days = {numberFormatter.format(input.periodDays)} วัน ÷ {numberFormatter.format(result.turnoverForPeriod)} รอบ = <strong>{numberFormatter.format(result.inventoryDays)} วัน</strong>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{method.description} ทุกยอดต้องเป็นมูลค่าที่ฐานต้นทุน หน่วยเงิน และขอบเขตสินค้า/คลังเดียวกัน</p>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="inventory-target-title">
          <h3 id="inventory-target-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />เปรียบเทียบเป้าหมายที่ผู้ใช้กำหนด</h3>
          {input.targetAnnualTurnover > 0 && result.targetAverageInventory !== null ? (
            <div className="mt-5 space-y-3">
              <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">เป้าหมาย</span><span className="tabular-nums">{numberFormatter.format(input.targetAnnualTurnover)} รอบ/ปี</span></div>
              <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">Average inventory ที่สอดคล้องกับเป้า</span><span data-testid="inventory-target-average" className="text-right tabular-nums">{money(result.targetAverageInventory, input.currency)}</span></div>
              <div className={`rounded-lg border p-3 text-sm leading-6 ${targetTone === "warning" ? "border-amber-500/35 bg-amber-500/5 text-amber-950 dark:text-amber-100" : "border-emerald-500/35 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"}`}>
                <p data-testid="inventory-target-status" className="font-medium">{targetStatusText(result.targetStatus)}</p>
                <p className="mt-1">ต่าง {money(Math.abs(targetGap), input.currency)} หรือ {numberFormatter.format(Math.abs(result.averageInventoryGapPercent ?? 0))}% จากระดับที่คำนวณตามเป้า</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">
              ใส่เป้าหมาย Turnover ต่อปีขององค์กรเพื่อคำนวณ Average inventory ที่สอดคล้องกับ COGS ปัจจุบัน อย่าใช้ตัวเลขอุตสาหกรรมทั่วไปแทนเป้าหมายโดยไม่ตรวจ Product mix, Service level และ Stockout
            </div>
          )}
          {result.closingInventoryDays !== null ? <p className="mt-4 text-xs leading-5 text-muted-foreground">Inventory ปลายรอบเทียบ COGS เฉลี่ยปัจจุบันครอบคลุมประมาณ {numberFormatter.format(result.closingInventoryDays)} วัน ค่านี้เป็น Point-in-time coverage ไม่ใช่ DIO ซึ่งใช้ Average inventory</p> : null}
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="inventory-interpretation-title">
        <h3 id="inventory-interpretation-title" className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />อ่านผลอย่างไม่เหมารวม</h3>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Turnover สูงขึ้น</p><p className="mt-1 text-xs text-muted-foreground">อาจหมายถึงสต๊อกหมุนเร็วขึ้น แต่ถ้าสูงเกินนโยบายอาจเกิด Stockout หรือ Lost sales</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Turnover ลดลง</p><p className="mt-1 text-xs text-muted-foreground">อาจสะท้อน Slow-moving, Overstock หรือ Seasonality ต้องดู SKU และช่วงเทียบเคียง</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Annualized</p><p className="mt-1 text-xs text-muted-foreground">เป็นการยืดอัตราจาก {numberFormatter.format(input.periodDays)} วันเป็น 365 วัน ไม่ใช่ Forecast และอาจเพี้ยนเมื่อช่วงมีฤดูกาล</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" onClick={() => downloadText(inventoryTurnoverCsv(input, result), "meaw-inventory-turnover.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function InventoryTurnoverCalculatorTool() {
  const [form, setForm] = useState<InventoryTurnoverFormState>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: InventoryTurnoverInput; result: InventoryTurnoverResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateField = <Key extends keyof InventoryTurnoverFormState>(key: Key, value: InventoryTurnoverFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updatePeriodPreset = (preset: PeriodPreset) => {
    setForm((current) => ({ ...current, periodPreset: preset, periodDays: preset === "custom" ? current.periodDays : preset }));
    invalidate();
  };

  const calculate = () => {
    try {
      const input: InventoryTurnoverInput = {
        averageMethod: form.averageMethod,
        currency: form.currency,
        periodDays: parseNumber(form.periodDays, "จำนวนวันในรอบ", true),
        costOfGoodsSold: parseNumber(form.costOfGoodsSold, "ต้นทุนขาย (COGS)", true),
        openingInventory: parseNumber(form.openingInventory, "Inventory ต้นรอบ", form.averageMethod === "opening-closing"),
        closingInventory: parseNumber(form.closingInventory, "Inventory ปลายรอบ", form.averageMethod === "opening-closing"),
        directAverageInventory: parseNumber(form.directAverageInventory, "Average inventory", form.averageMethod === "direct"),
        inventorySnapshots: form.averageMethod === "snapshots" ? parseSnapshots(form.inventorySnapshots) : [],
        targetAnnualTurnover: parseNumber(form.targetAnnualTurnover, "เป้าหมาย Turnover ต่อปี"),
      };
      setCalculation({ input, result: calculateInventoryTurnover(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณ Inventory Turnover ได้");
    }
  };

  const activeMethod = AVERAGE_METHODS.find((item) => item.value === form.averageMethod) ?? AVERAGE_METHODS[0]!;

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>ข้อมูลต้นทุนและ Inventory คำนวณใน Browser</AlertTitle>
        <AlertDescription className="leading-6">COGS, Inventory balances, เป้าหมาย และผลลัพธ์ไม่ถูกส่งไป Server หรือบันทึกไว้ ข้อมูลจะหายเมื่อรีเฟรชหน้า ใช้ยอดรวมที่ไม่ระบุ Supplier หรือ SKU สำคัญเมื่อทำได้</AlertDescription>
      </Alert>

      <section aria-labelledby="inventory-period-title">
        <div>
          <h2 id="inventory-period-title" className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-primary" />รอบบัญชีและต้นทุนขาย</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ COGS และ Inventory ที่ฐานต้นทุน หน่วยเงิน ขอบเขตสินค้า และช่วงเวลาเดียวกัน ไม่ใช้ยอดขายแทน COGS</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3">
            <Label htmlFor="inventory-period-preset">ช่วงเวลา</Label>
            <Select value={form.periodPreset} onValueChange={(value) => updatePeriodPreset(value as PeriodPreset)}>
              <SelectTrigger id="inventory-period-preset" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIOD_PRESETS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">เลือก 30, 90, 365, 366 วัน หรือกำหนดเอง</p>
          </div>
          <NumberField id="inventory-period-days" label="จำนวนวันในรอบ" value={form.periodDays} onChange={(value) => updateField("periodDays", value)} min={1} max={3660} step={1} hint="ใช้จำนวนวันจริงของรายงาน COGS" placeholder="365" />
          <div className="grid gap-3">
            <Label htmlFor="inventory-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateField("currency", value as InventoryTurnoverCurrency)}>
              <SelectTrigger id="inventory-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">เปลี่ยนเฉพาะหน่วยแสดงผล ไม่มี FX conversion</p>
          </div>
          <NumberField id="inventory-cogs" label="ต้นทุนขาย COGS ในรอบ" value={form.costOfGoodsSold} onChange={(value) => updateField("costOfGoodsSold", value)} min={0.01} hint="ดึงจาก P&L/ระบบบัญชีของช่วงเดียวกัน" placeholder="1200000" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="inventory-average-title">
        <div>
          <h2 id="inventory-average-title" className="flex items-center gap-2 font-semibold"><Warehouse className="size-4 text-primary" />Average inventory ที่ฐานต้นทุน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">เลือกวิธีเฉลี่ยตามข้อมูลที่มี ยิ่งสต๊อกผันผวนหรือมีฤดูกาล การใช้หลาย Snapshot ยิ่งลดอคติจากวันเดียว</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="inventory-average-method">วิธีหา Average inventory</Label>
            <Select value={form.averageMethod} onValueChange={(value) => updateField("averageMethod", value as InventoryAverageMethod)}>
              <SelectTrigger id="inventory-average-method" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{AVERAGE_METHODS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{activeMethod.description}</p>
          </div>
          {form.averageMethod === "opening-closing" ? (
            <>
              <NumberField id="inventory-opening" label="Inventory ต้นรอบ" value={form.openingInventory} onChange={(value) => updateField("openingInventory", value)} min={0} placeholder="300000" />
              <NumberField id="inventory-closing" label="Inventory ปลายรอบ" value={form.closingInventory} onChange={(value) => updateField("closingInventory", value)} min={0} placeholder="200000" />
            </>
          ) : form.averageMethod === "direct" ? (
            <NumberField id="inventory-direct-average" label="Average inventory" value={form.directAverageInventory} onChange={(value) => updateField("directAverageInventory", value)} min={0.01} hint="ใช้ค่าเฉลี่ยที่มี Audit trail จากระบบของคุณ" placeholder="250000" />
          ) : (
            <div className="grid gap-3 md:col-span-2">
              <Label htmlFor="inventory-snapshots" className="leading-5">Inventory snapshots</Label>
              <Textarea id="inventory-snapshots" value={form.inventorySnapshots} onChange={(event) => updateField("inventorySnapshots", event.target.value)} className="min-h-28" placeholder={"300000\n280000\n250000\n200000"} />
              <p className="text-xs leading-5 text-muted-foreground">ใส่อย่างน้อย 2 ค่า คั่นด้วยบรรทัดใหม่ เว้นวรรค comma หรือ semicolon เช่นยอดปลายเดือน 13 จุดสำหรับหนึ่งปี</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="inventory-target-input-title">
        <div>
          <h2 id="inventory-target-input-title" className="flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />เป้าหมายเปรียบเทียบ (ไม่บังคับ)</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ใส่เป้าหมายขององค์กรหรือ SKU group เดียวกัน ระบบจะไม่เดา Benchmark จากอุตสาหกรรม</p>
        </div>
        <div className="mt-5 max-w-xl">
          <NumberField id="inventory-target-turnover" label="เป้าหมาย Inventory turnover ต่อปี" value={form.targetAnnualTurnover} onChange={(value) => updateField("targetAnnualTurnover", value)} min={0} hint="เว้นว่างหรือ 0 เพื่อไม่เปรียบเทียบเป้าหมาย" placeholder="6" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculate}><Calculator className="size-4" />คำนวณ Inventory Turnover</Button>
          <ExampleButton onExample={() => { setForm(createExampleForm()); setCalculation(null); setError(""); }} />
          <ClearButton onClear={() => { setForm(createInitialForm()); setCalculation(null); setError(""); }} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? (
          <InventoryTurnoverResultPanel input={calculation.input} result={calculation.result} />
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><CircleDollarSign className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอก COGS, จำนวนวัน และ Average inventory แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดง Turnover, DIO/Days on hand, Annualized rate, Coverage และ Target gap</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>เป็นตัวชี้วัดเชิงบริหาร ไม่ใช่มาตรฐานว่า “สูงดี–ต่ำแย่” สำหรับทุกธุรกิจ</AlertTitle>
        <AlertDescription className="leading-6">ต้องเทียบช่วง ความยาวรอบ ฐานต้นทุน SKU/Location และวิธีตีราคาเดียวกัน ค่าเฉลี่ยต้น–ปลายอาจบิดเบือนธุรกิจฤดูกาล Annualized rate ไม่ใช่ Forecast และ DIO ไม่ใช่อายุจริงของสินค้าแต่ละชิ้น ควรดู Stockout, Service level, Margin, Shelf life และ Obsolescence ร่วมกัน</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">สูตรอ้างอิง:</strong> Inventory turnover = COGS ÷ Average inventory, Average inventory = (ต้นรอบ + ปลายรอบ) ÷ 2 และ Inventory days = จำนวนวัน ÷ Turnover ตาม <a className="font-medium text-primary hover:underline" href="https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-management/use-inventory-turnover-report-quickbooks-2024/L6nNqyuvy_US_en_US" target="_blank" rel="noreferrer">QuickBooks Inventory Turnover Report</a>; DSI = Average inventory ÷ COGS × วันในรอบตาม <a className="font-medium text-primary hover:underline" href="https://www.xero.com/us/guides/inventory-management-system/" target="_blank" rel="noreferrer">Xero Inventory KPIs</a> หากต้องวางจุดสั่งซื้อใช้ <Link href="/safety-stock-calculator" className="font-medium text-primary hover:underline">Safety Stock & Reorder Point Calculator</Link> และวิเคราะห์ Margin ใช้ <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit & Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
