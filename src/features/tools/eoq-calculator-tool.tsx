"use client";

import {
  Calculator,
  Cat,
  ClipboardList,
  Download,
  Info,
  PackageOpen,
  Plus,
  Scale,
  ShoppingCart,
  Trash2,
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
import {
  calculateEoq,
  eoqCsv,
  EOQ_MAX_TIERS,
  type EoqCurrency,
  type EoqInput,
  type EoqResult,
  type HoldingCostMode,
} from "@/lib/tools/eoq";

type PriceTierForm = { id: number; minimumQuantity: string; unitPrice: string };
type EoqFormState = {
  currency: EoqCurrency;
  annualDemand: string;
  orderingCost: string;
  holdingCostMode: HoldingCostMode;
  holdingCostPerUnit: string;
  holdingRatePercent: string;
  workingDaysPerYear: string;
  leadTimeDays: string;
  safetyStock: string;
  packSize: string;
  minimumOrderQuantity: string;
  storageCapacity: string;
  currentOrderQuantity: string;
  priceTiers: PriceTierForm[];
};

const CURRENCIES: Array<{ value: EoqCurrency; label: string }> = [
  { value: "THB", label: "บาท (THB)" },
  { value: "USD", label: "ดอลลาร์ (USD)" },
  { value: "EUR", label: "ยูโร (EUR)" },
  { value: "JPY", label: "เยน (JPY)" },
  { value: "GBP", label: "ปอนด์ (GBP)" },
];

const currencySymbols: Record<EoqCurrency, string> = { THB: "฿", USD: "$", EUR: "€", JPY: "¥", GBP: "£" };
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function money(value: number, currency: EoqCurrency) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function quantity(value: number) {
  return `${numberFormatter.format(value)} หน่วย`;
}

function initialForm(): EoqFormState {
  return {
    currency: "THB",
    annualDemand: "",
    orderingCost: "",
    holdingCostMode: "rate",
    holdingCostPerUnit: "",
    holdingRatePercent: "20",
    workingDaysPerYear: "250",
    leadTimeDays: "0",
    safetyStock: "0",
    packSize: "1",
    minimumOrderQuantity: "1",
    storageCapacity: "0",
    currentOrderQuantity: "0",
    priceTiers: [{ id: 1, minimumQuantity: "1", unitPrice: "" }],
  };
}

function exampleForm(): EoqFormState {
  return {
    ...initialForm(),
    annualDemand: "10000",
    orderingCost: "500",
    leadTimeDays: "7",
    safetyStock: "100",
    storageCapacity: "1800",
    currentOrderQuantity: "500",
    priceTiers: [
      { id: 1, minimumQuantity: "1", unitPrice: "100" },
      { id: 2, minimumQuantity: "1000", unitPrice: "90" },
      { id: 3, minimumQuantity: "2500", unitPrice: "85" },
    ],
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

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  min,
  max,
  step = 0.01,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MetricCard({ label, value, detail, testId, tone = "default" }: {
  label: string;
  value: string;
  detail: string;
  testId?: string;
  tone?: "default" | "positive" | "warm";
}) {
  const toneClass = tone === "positive"
    ? "border-emerald-500/35 bg-emerald-500/5"
    : tone === "warm"
      ? "border-amber-500/35 bg-amber-500/5"
      : "bg-card/60";
  return (
    <article className={`rounded-2xl border p-4 shadow-sm backdrop-blur ${toneClass}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function ResultPanel({ input, result }: { input: EoqInput; result: EoqResult }) {
  const recommended = result.recommended;
  const summary = [
    "สรุป Economic Order Quantity (EOQ)",
    `จำนวนสั่งซื้อแนะนำ: ${quantity(recommended.quantity)}/ครั้ง`,
    `ราคาต่อหน่วยที่ใช้: ${money(recommended.unitPrice, input.currency)}`,
    `จำนวนครั้งต่อปี: ${numberFormatter.format(recommended.ordersPerYear)}`,
    `รอบสั่งซื้อ: ${numberFormatter.format(recommended.cycleDays)} วันทำงาน`,
    `ต้นทุนรวมต่อปี: ${money(recommended.annualTotalCost, input.currency)}`,
    `จุดสั่งซื้อโดยประมาณ: ${quantity(result.reorderPoint)}`,
    result.annualSavingsVsCurrent === null
      ? "ไม่ได้กรอกจำนวนสั่งซื้อปัจจุบัน"
      : `ประหยัดเทียบปัจจุบัน: ${money(result.annualSavingsVsCurrent, input.currency)}/ปี`,
  ].join("\n");
  const maxCandidateCost = Math.max(...result.candidates.map((candidate) => candidate.annualTotalCost));
  const candidateCard = (candidate: EoqResult["candidates"][number], index: number) => {
    const relativeWidth = maxCandidateCost > 0 ? Math.max(4, candidate.annualTotalCost / maxCandidateCost * 100) : 0;
    return (
      <article key={candidate.quantity} className={`rounded-xl border p-4 ${index === 0 ? "border-emerald-500/40 bg-emerald-500/5" : "bg-background/45"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <span>#{index + 1} · {quantity(candidate.quantity)}/ครั้ง</span>
              {index === 0 ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">แนะนำ</span> : null}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{candidate.reasons.join(" · ")} · ราคา {money(candidate.unitPrice, input.currency)}/หน่วย</p>
          </div>
          <p className="font-semibold tabular-nums">{money(candidate.annualTotalCost, input.currency)}/ปี</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={index === 0 ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-primary/55"} style={{ width: `${relativeWidth}%` }} /></div>
      </article>
    );
  };

  return (
    <div data-testid="eoq-result" className="space-y-5" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="จำนวนสั่งซื้อแนะนำ" value={`${quantity(recommended.quantity)}/ครั้ง`} detail={`Raw EOQ ที่ราคานี้ ${quantity(recommended.rawEoq)}`} testId="eoq-recommended" tone="positive" />
        <MetricCard label="ต้นทุนรวมต่อปี" value={money(recommended.annualTotalCost, input.currency)} detail={`ซื้อ + สั่งซื้อ + ถือครอง`} testId="eoq-total-cost" tone="positive" />
        <MetricCard label="ความถี่การสั่งซื้อ" value={`${numberFormatter.format(recommended.ordersPerYear)} ครั้ง/ปี`} detail={`ประมาณทุก ${numberFormatter.format(recommended.cycleDays)} วันทำงาน`} testId="eoq-orders" />
        <MetricCard label="ราคาและ Tier ที่ใช้" value={money(recommended.unitPrice, input.currency)} detail={`เริ่มที่ ${numberFormatter.format(recommended.priceTierMinimum)} หน่วย`} testId="eoq-unit-price" />
        <MetricCard label="Inventory เฉลี่ย" value={quantity(recommended.averageTotalInventory)} detail={`Cycle ${quantity(recommended.averageCycleInventory)} + Safety Stock ${quantity(input.safetyStock)}`} />
        <MetricCard label="จุดสั่งซื้อโดยประมาณ" value={quantity(result.reorderPoint)} detail={`Demand ช่วง Lead time ${quantity(result.demandDuringLeadTime)} + Safety Stock`} testId="eoq-reorder-point" tone="warm" />
      </div>

      {result.current && result.annualSavingsVsCurrent !== null ? (
        <section data-testid="eoq-savings" className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShoppingCart className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold">เทียบกับนโยบายสั่งซื้อปัจจุบัน</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                ปัจจุบัน {quantity(result.current.quantity)}/ครั้ง มีต้นทุนรวม {money(result.current.annualTotalCost, input.currency)}/ปี
                — ตัวเลือกแนะนำลดต้นทุนในโมเดลได้ {money(result.annualSavingsVsCurrent, input.currency)} หรือ {numberFormatter.format(result.savingsPercentVsCurrent ?? 0)}% ต่อปี
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-card/55 p-4 shadow-sm backdrop-blur-xl sm:p-5" aria-labelledby="eoq-cost-mix-title">
        <h3 id="eoq-cost-mix-title" className="flex items-center gap-2 font-semibold"><Scale className="size-4 text-primary" />โครงสร้างต้นทุนของตัวเลือกแนะนำ</h3>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" aria-label="สัดส่วนต้นทุนรวม">
          <div className="bg-sky-500" style={{ width: `${result.purchaseCostSharePercent}%` }} title={`Purchase ${result.purchaseCostSharePercent.toFixed(2)}%`} />
          <div className="bg-violet-500" style={{ width: `${result.orderingCostSharePercent}%` }} title={`Ordering ${result.orderingCostSharePercent.toFixed(2)}%`} />
          <div className="bg-amber-500" style={{ width: `${result.holdingCostSharePercent}%` }} title={`Holding ${result.holdingCostSharePercent.toFixed(2)}%`} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background/55 p-3"><p className="text-xs text-muted-foreground">ซื้อสินค้า · {numberFormatter.format(result.purchaseCostSharePercent)}%</p><p className="mt-1 font-semibold tabular-nums">{money(recommended.annualPurchaseCost, input.currency)}</p></div>
          <div className="rounded-xl border bg-background/55 p-3"><p className="text-xs text-muted-foreground">สั่งซื้อ · {numberFormatter.format(result.orderingCostSharePercent)}%</p><p className="mt-1 font-semibold tabular-nums">{money(recommended.annualOrderingCost, input.currency)}</p></div>
          <div className="rounded-xl border bg-background/55 p-3"><p className="text-xs text-muted-foreground">ถือครอง · {numberFormatter.format(result.holdingCostSharePercent)}%</p><p className="mt-1 font-semibold tabular-nums">{money(recommended.annualHoldingCost, input.currency)}</p></div>
        </div>
      </section>

      <section data-testid="eoq-candidates" className="rounded-2xl border bg-card/55 p-4 shadow-sm backdrop-blur-xl sm:p-5" aria-labelledby="eoq-candidate-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="eoq-candidate-title" className="flex items-center gap-2 font-semibold"><PackageOpen className="size-4 text-primary" />ตัวเลือกที่ระบบตรวจจริง</h3>
          <span className="rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">{result.candidates.length} ตัวเลือกที่ผ่านข้อจำกัด</span>
        </div>
        <div className="mt-4 space-y-3">
          {result.candidates.slice(0, 5).map(candidateCard)}
          {result.candidates.length > 5 ? (
            <details className="rounded-xl border bg-background/35 p-3">
              <summary className="cursor-pointer font-medium text-primary">ดูอีก {result.candidates.length - 5} ตัวเลือกที่ตรวจแล้ว</summary>
              <div className="mt-3 space-y-3">{result.candidates.slice(5).map((candidate, index) => candidateCard(candidate, index + 5))}</div>
            </details>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="eoq-formula-title">
        <h3 id="eoq-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรและขอบเขตโมเดล</h3>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-2">
          <p className="rounded-xl border bg-card/60 p-3"><strong className="text-foreground">EOQ = √(2DS ÷ H)</strong><br />D = Demand ต่อปี, S = ต้นทุนต่อ Order, H = ต้นทุนถือครองต่อหน่วยต่อปี</p>
          <p className="rounded-xl border bg-card/60 p-3"><strong className="text-foreground">Annual total = DC + DS/Q + H(Q/2 + SS)</strong><br />ระบบเทียบ EOQ, จุดเริ่มส่วนลด, MOQ, Pack size, Capacity และนโยบายปัจจุบัน</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">EOQ แบบพื้นฐานสมมติ Demand คงที่ การรับของทันที ไม่มี Stockout/Backorder และต้นทุนที่กรอกคงที่ ส่วนจุดสั่งซื้อด้านบนเป็นเพียง Demand เฉลี่ย × Lead time + Safety Stock ที่ผู้ใช้กรอก ไม่คำนวณความผันผวนซ้ำกับ Safety Stock Calculator</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุป EOQ แล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button data-testid="eoq-csv" type="button" variant="outline" onClick={() => downloadText(eoqCsv(input, result), "meaw-eoq-calculator.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function EoqCalculatorTool() {
  const [form, setForm] = useState<EoqFormState>(() => initialForm());
  const [calculation, setCalculation] = useState<{ input: EoqInput; result: EoqResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateField = <Key extends keyof Omit<EoqFormState, "priceTiers">>(key: Key, value: EoqFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updateTier = (id: number, field: "minimumQuantity" | "unitPrice", value: string) => {
    setForm((current) => ({
      ...current,
      priceTiers: current.priceTiers.map((tier) => tier.id === id ? { ...tier, [field]: value } : tier),
    }));
    invalidate();
  };
  const addTier = () => {
    setForm((current) => {
      if (current.priceTiers.length >= EOQ_MAX_TIERS) return current;
      const id = Math.max(...current.priceTiers.map((tier) => tier.id)) + 1;
      return { ...current, priceTiers: [...current.priceTiers, { id, minimumQuantity: "", unitPrice: "" }] };
    });
    invalidate();
  };
  const removeTier = (id: number) => {
    setForm((current) => ({ ...current, priceTiers: current.priceTiers.filter((tier) => tier.id !== id) }));
    invalidate();
  };
  const calculate = () => {
    try {
      const input: EoqInput = {
        currency: form.currency,
        annualDemand: parseNumber(form.annualDemand, "Demand ต่อปี", true),
        orderingCost: parseNumber(form.orderingCost, "ต้นทุนต่อการสั่งซื้อ", true),
        holdingCostMode: form.holdingCostMode,
        holdingCostPerUnit: parseNumber(form.holdingCostPerUnit, "ต้นทุนถือครองต่อหน่วยต่อปี", form.holdingCostMode === "per-unit"),
        holdingRatePercent: parseNumber(form.holdingRatePercent, "อัตราต้นทุนถือครอง", form.holdingCostMode === "rate"),
        workingDaysPerYear: parseNumber(form.workingDaysPerYear, "วันทำงานต่อปี", true),
        leadTimeDays: parseNumber(form.leadTimeDays, "Lead time"),
        safetyStock: parseNumber(form.safetyStock, "Safety Stock"),
        packSize: parseNumber(form.packSize, "Pack size", true),
        minimumOrderQuantity: parseNumber(form.minimumOrderQuantity, "MOQ", true),
        storageCapacity: parseNumber(form.storageCapacity, "ความจุสูงสุด"),
        currentOrderQuantity: parseNumber(form.currentOrderQuantity, "จำนวนสั่งซื้อปัจจุบัน"),
        priceTiers: form.priceTiers.map((tier, index) => ({
          minimumQuantity: parseNumber(tier.minimumQuantity, `จำนวนเริ่มต้น Tier ${index + 1}`, true),
          unitPrice: parseNumber(tier.unitPrice, `ราคาต่อหน่วย Tier ${index + 1}`, true),
        })),
      };
      setCalculation({ input, result: calculateEoq(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณ EOQ ได้");
    }
  };

  return (
    <WorkspaceFrame>
      <div className="space-y-6">
        <Alert className="border-pink-300/45 bg-gradient-to-r from-pink-500/8 via-card/70 to-sky-500/8 shadow-sm backdrop-blur-xl dark:border-pink-400/20">
          <Cat className="size-4 text-pink-500" />
          <AlertTitle>สั่งให้พอดี ไม่แน่นโกดังจนแมวหาที่นอนไม่ได้</AlertTitle>
          <AlertDescription>EOQ ช่วยหาจุดสมดุลระหว่างค่าสั่งซื้อกับค่าถือครอง แล้วตรวจส่วนลดจำนวนมากเทียบกับ MOQ, Pack size และพื้นที่เก็บจริง</AlertDescription>
        </Alert>

        <section className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-xl sm:p-5" aria-labelledby="eoq-core-title">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Calculator className="size-5" /></div>
            <div><h2 id="eoq-core-title" className="font-semibold">Demand และต้นทุนหลัก</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ใช้ตัวเลขของ SKU และ Location เดียวกันในช่วงหนึ่งปี</p></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField id="eoq-annual-demand" label="Demand ต่อปี (หน่วย)" value={form.annualDemand} onChange={(value) => updateField("annualDemand", value)} min={0.01} hint="ยอดใช้หรือยอดขายคาดการณ์ทั้งปี" />
            <NumberField id="eoq-ordering-cost" label={`ต้นทุนต่อการสั่งซื้อ (${form.currency})`} value={form.orderingCost} onChange={(value) => updateField("orderingCost", value)} min={0.01} hint="งาน PO, รับของ, ขนส่งคงที่ หรือ Setup ต่อ Order" />
            <div className="grid gap-3">
              <Label htmlFor="eoq-currency">สกุลเงิน</Label>
              <Select value={form.currency} onValueChange={(value) => updateField("currency", value as EoqCurrency)}><SelectTrigger id="eoq-currency"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
              <p className="text-xs leading-5 text-muted-foreground">เปลี่ยนรูปแบบแสดงผลเท่านั้น ไม่มี FX conversion</p>
            </div>
            <NumberField id="eoq-working-days" label="วันทำงานต่อปี" value={form.workingDaysPerYear} onChange={(value) => updateField("workingDaysPerYear", value)} min={1} max={366} step={1} hint="ใช้แปลงความถี่เป็นวันทำงานต่อรอบ" />
          </div>

          <div className="mt-5 rounded-2xl border bg-background/45 p-4">
            <div className="grid gap-3">
              <Label htmlFor="eoq-holding-mode">วิธีกรอกต้นทุนถือครอง</Label>
              <Select value={form.holdingCostMode} onValueChange={(value) => updateField("holdingCostMode", value as HoldingCostMode)}><SelectTrigger id="eoq-holding-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rate">เปอร์เซ็นต์ของราคาต่อหน่วย/ปี</SelectItem><SelectItem value="per-unit">ยอดเงินต่อหน่วย/ปี</SelectItem></SelectContent></Select>
            </div>
            <div className="mt-5 max-w-xl">
              {form.holdingCostMode === "rate" ? <NumberField id="eoq-holding-rate" label="อัตราต้นทุนถือครอง (% ต่อปี)" value={form.holdingRatePercent} onChange={(value) => updateField("holdingRatePercent", value)} min={0.000001} max={1000} hint="รวมเงินทุน พื้นที่ ประกัน เสื่อมสภาพ และความเสี่ยงตามนโยบายองค์กร" /> : <NumberField id="eoq-holding-per-unit" label={`ต้นทุนถือครองต่อหน่วยต่อปี (${form.currency})`} value={form.holdingCostPerUnit} onChange={(value) => updateField("holdingCostPerUnit", value)} min={0.000001} hint="ใช้ยอดคงที่เดียวกับทุก Price tier" />}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-xl sm:p-5" aria-labelledby="eoq-policy-title">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300"><Warehouse className="size-5" /></div>
            <div><h2 id="eoq-policy-title" className="font-semibold">ข้อจำกัดการสั่งซื้อและคลัง</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ระบบจะไม่แนะนำจำนวนที่ขัดกับ MOQ, Pack size หรือ Capacity</p></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField id="eoq-pack-size" label="Pack size (หน่วย)" value={form.packSize} onChange={(value) => updateField("packSize", value)} min={1} step={1} hint="เช่น ต้องสั่งครั้งละ 12 ชิ้น" />
            <NumberField id="eoq-moq" label="MOQ ขั้นต่ำ (หน่วย)" value={form.minimumOrderQuantity} onChange={(value) => updateField("minimumOrderQuantity", value)} min={1} step={1} hint="ระบบปัดขึ้นให้หารด้วย Pack size ลงตัว" />
            <NumberField id="eoq-storage-capacity" label="ความจุสูงสุด (0 = ไม่จำกัด)" value={form.storageCapacity} onChange={(value) => updateField("storageCapacity", value)} min={0} step={1} hint="จำนวนสูงสุดที่รับเพิ่มต่อรอบตามพื้นที่หรือเงินทุน" />
            <NumberField id="eoq-current-quantity" label="จำนวนสั่งซื้อปัจจุบัน (0 = ไม่เทียบ)" value={form.currentOrderQuantity} onChange={(value) => updateField("currentOrderQuantity", value)} min={0} step={1} hint="ต้องตรง Pack size และไม่เกิน Capacity" />
            <NumberField id="eoq-lead-time" label="Lead time (วันทำงาน)" value={form.leadTimeDays} onChange={(value) => updateField("leadTimeDays", value)} min={0} hint="ใช้แสดงจุดสั่งซื้อโดยประมาณ ไม่เปลี่ยน EOQ" />
            <NumberField id="eoq-safety-stock" label="Safety Stock (หน่วย)" value={form.safetyStock} onChange={(value) => updateField("safetyStock", value)} min={0} hint="บวกใน Inventory เฉลี่ยและ Reorder Point" />
          </div>
        </section>

        <section className="rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-xl sm:p-5" aria-labelledby="eoq-tier-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300"><ShoppingCart className="size-5" /></div>
              <div><h2 id="eoq-tier-title" className="font-semibold">ราคาและส่วนลดตามจำนวน</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">All-units discount: เมื่อถึงขั้นต่ำ ราคาของทุกหน่วยใน Order ใช้ Tier นั้น</p></div>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={form.priceTiers.length >= EOQ_MAX_TIERS} onClick={addTier}><Plus className="size-4" />เพิ่ม Tier</Button>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {form.priceTiers.map((tier, index) => (
              <article key={tier.id} className="rounded-2xl border bg-background/45 p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Tier {index + 1}{index === 0 ? " · ราคาปกติ" : " · ราคาลด"}</h3>{index > 0 ? <Button type="button" variant="ghost" size="icon-sm" aria-label={`ลบ Tier ${index + 1}`} onClick={() => removeTier(tier.id)}><Trash2 className="size-4" /></Button> : null}</div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <NumberField id={`eoq-tier-${tier.id}-minimum`} label="จำนวนเริ่มต้น (หน่วย)" value={tier.minimumQuantity} onChange={(value) => updateTier(tier.id, "minimumQuantity", value)} min={1} step={1} disabled={index === 0} hint={index === 0 ? "Tier แรกเริ่มที่ 1 เสมอ" : "ต้องมากกว่า Tier ก่อนหน้า"} />
                  <NumberField id={`eoq-tier-${tier.id}-price`} label={`ราคาต่อหน่วย (${form.currency})`} value={tier.unitPrice} onChange={(value) => updateTier(tier.id, "unitPrice", value)} min={0.000001} hint={index === 0 ? "ราคาปกติ" : "ต้องต่ำกว่า Tier ก่อนหน้า"} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <ActionBar>
          <Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณ EOQ และต้นทุน</Button>
          <ExampleButton onExample={() => { setForm(exampleForm()); setCalculation(null); setError(""); }} />
          <ClearButton onClear={() => { setForm(initialForm()); setCalculation(null); setError(""); }} />
        </ActionBar>

        {error ? <Alert variant="destructive"><TriangleAlert className="size-4" /><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {calculation ? <ResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed bg-muted/10 p-6 text-center">
            <div><Warehouse className="mx-auto size-8 text-primary/55" /><p className="mt-3 font-medium">กรอก Demand ต้นทุน และราคา แล้วกดคำนวณ</p><p className="mt-1 text-sm text-muted-foreground">ผลจะเทียบ EOQ กับจุดส่วนลดและข้อจำกัดจริงให้ในหน้าเดียว</p></div>
          </div>
        )}

        <Alert className="border-sky-300/40 bg-sky-500/5 dark:border-sky-400/20">
          <Info className="size-4" />
          <AlertTitle>EOQ ไม่ใช่คำสั่งซื้ออัตโนมัติ</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>ตรวจ Demand forecast, Cash flow, Shelf life, ความเสี่ยงของ Supplier, Lead-time variability และ Capacity จริงก่อนออก PO หาก Demand ผันผวนให้คำนวณ Buffer แยกที่ <Link href="/safety-stock-calculator" className="font-medium text-primary underline-offset-4 hover:underline">Safety Stock Calculator</Link></p>
            <p>อ้างอิงหลักการ EOQ จาก <a href="https://ocw.mit.edu/courses/2-854-introduction-to-manufacturing-systems-fall-2016/6c8fec8f99bcf7059b73b82e96d43901_MIT2_854F16_Inventory.pdf" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">MIT OpenCourseWare: Inventory</a> และขอบเขต EOQ/Quantity Discount จาก <a href="https://ocw.mit.edu/courses/esd-273j-logistics-and-supply-chain-management-fall-2009/resources/mitesd_273jf09_lec02/" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">MIT Logistics and Supply Chain Management</a></p>
          </AlertDescription>
        </Alert>
      </div>
    </WorkspaceFrame>
  );
}
