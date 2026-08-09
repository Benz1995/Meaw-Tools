"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  Download,
  Gauge,
  Info,
  Plus,
  ReceiptText,
  ShieldCheck,
  Store,
  Target,
  Trash2,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BREAK_EVEN_MAX_PRODUCTS,
  breakEvenCsv,
  calculateBreakEven,
  type BreakEvenCurrency,
  type BreakEvenInput,
  type BreakEvenProductResult,
  type BreakEvenResult,
} from "@/lib/tools/break-even";

type ProductForm = {
  id: string;
  name: string;
  sellingPricePerUnit: string;
  variableCostPerUnit: string;
  unitSalesMixPercent: string;
};

type BreakEvenForm = {
  currency: BreakEvenCurrency;
  scenarioName: string;
  rentAndSpace: string;
  fixedPayroll: string;
  utilitiesAndSubscriptions: string;
  marketingAndAdmin: string;
  depreciationAndOther: string;
  products: ProductForm[];
  currentTotalUnits: string;
  targetOperatingProfit: string;
  capacityUnits: string;
};

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const preciseFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const currencyFormatters = new Map<Exclude<BreakEvenCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: BreakEvenCurrency) {
  if (currency === "OTHER") return `${numberFormatter.format(value)} หน่วยเงิน`;
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

function signedMoney(value: number, currency: BreakEvenCurrency) {
  if (Math.abs(value) < 0.005) return money(0, currency);
  return `${value < 0 ? "−" : "+"}${money(Math.abs(value), currency)}`;
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

function product(id: string, mix = "100"): ProductForm {
  return { id, name: "", sellingPricePerUnit: "", variableCostPerUnit: "", unitSalesMixPercent: mix };
}

function createInitialForm(): BreakEvenForm {
  return {
    currency: "THB",
    scenarioName: "",
    rentAndSpace: "0",
    fixedPayroll: "0",
    utilitiesAndSubscriptions: "0",
    marketingAndAdmin: "0",
    depreciationAndOther: "0",
    products: [product("break-even-product-1")],
    currentTotalUnits: "0",
    targetOperatingProfit: "0",
    capacityUnits: "0",
  };
}

function createExampleForm(): BreakEvenForm {
  return {
    currency: "THB",
    scenarioName: "Coffee shop · แผนรายเดือน",
    rentAndSpace: "30000",
    fixedPayroll: "60000",
    utilitiesAndSubscriptions: "8000",
    marketingAndAdmin: "2000",
    depreciationAndOther: "10000",
    products: [
      { id: "break-even-product-1", name: "Americano", sellingPricePerUnit: "70", variableCostPerUnit: "20", unitSalesMixPercent: "40" },
      { id: "break-even-product-2", name: "Latte", sellingPricePerUnit: "85", variableCostPerUnit: "32", unitSalesMixPercent: "35" },
      { id: "break-even-product-3", name: "เครื่องดื่มอื่น", sellingPricePerUnit: "95", variableCostPerUnit: "40", unitSalesMixPercent: "25" },
    ],
    currentTotalUnits: "3000",
    targetOperatingProfit: "40000",
    capacityUnits: "3600",
  };
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  min = 0,
  max = 1_000_000_000_000,
  step = 0.01,
  placeholder = "0",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" value={value} min={min} max={max} step={step} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} />
      <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function ResultCard({ label, value, detail, accent = false, testId }: { label: string; value: string; detail: string; accent?: boolean; testId?: string }) {
  return (
    <div data-testid={testId} className={`min-w-0 rounded-2xl border p-4 ${accent ? "border-emerald-500/40 bg-emerald-500/5" : "bg-card"}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function BreakEvenChart({ input, result }: { input: BreakEvenInput; result: BreakEvenResult }) {
  const candidateUnits = [result.breakEvenUnitsExact, result.targetUnitsExact, input.currentTotalUnits, input.capacityUnits].filter((value) => value > 0);
  const maxUnits = Math.max(...candidateUnits) * 1.18;
  const revenueAtMax = maxUnits * result.weightedSellingPricePerUnit;
  const costsAtMax = result.totalFixedCosts + maxUnits * result.weightedVariableCostPerUnit;
  const maxMoney = Math.max(revenueAtMax, costsAtMax) * 1.08;
  const left = 64;
  const right = 616;
  const top = 22;
  const bottom = 270;
  const x = (units: number) => left + units / maxUnits * (right - left);
  const y = (value: number) => bottom - value / maxMoney * (bottom - top);
  const breakEvenX = x(result.breakEvenUnitsExact);
  const breakEvenY = y(result.breakEvenRevenue);
  const targetX = x(result.targetUnitsExact);
  const chartId = "break-even-cvp-chart";

  return (
    <section className="min-w-0 rounded-2xl border bg-muted/5 p-4 sm:p-5" aria-labelledby={`${chartId}-heading`}>
      <div>
        <h2 id={`${chartId}-heading`} className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />กราฟ Cost–Volume–Profit</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">จุดตัดของรายได้กับต้นทุนรวมคือ Break-even ภายใต้ราคา ต้นทุน และ Unit sales mix ที่คงที่</p>
      </div>
      <div className="mt-4 min-w-0 overflow-hidden rounded-xl border bg-card p-2 sm:p-4">
        <svg className="h-auto w-full" viewBox="0 0 640 310" role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
          <title id={`${chartId}-title`}>กราฟรายได้ ต้นทุนรวม จุดคุ้มทุน และเป้าหมายกำไร</title>
          <desc id={`${chartId}-desc`}>เส้นรายได้เริ่มจากศูนย์ เส้นต้นทุนรวมเริ่มจากต้นทุนคงที่ ทั้งสองเส้นตัดกันที่ประมาณ {preciseFormatter.format(result.breakEvenUnitsExact)} หน่วย</desc>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = bottom - ratio * (bottom - top);
            return <line key={ratio} x1={left} x2={right} y1={gridY} y2={gridY} stroke="currentColor" strokeOpacity="0.09" />;
          })}
          <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="currentColor" strokeOpacity="0.45" />
          <line x1={left} x2={left} y1={top} y2={bottom} stroke="currentColor" strokeOpacity="0.45" />
          <line x1={left} x2={right} y1={bottom} y2={y(revenueAtMax)} stroke="#0f9f8f" strokeWidth="4" strokeLinecap="round" />
          <line x1={left} x2={right} y1={y(result.totalFixedCosts)} y2={y(costsAtMax)} stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          <line x1={breakEvenX} x2={breakEvenX} y1={breakEvenY} y2={bottom} stroke="#10b981" strokeWidth="2" strokeDasharray="6 5" />
          <circle cx={breakEvenX} cy={breakEvenY} r="7" fill="#10b981" stroke="white" strokeWidth="3" />
          {input.targetOperatingProfit > 0 ? <line x1={targetX} x2={targetX} y1={top} y2={bottom} stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 5" /> : null}
          <text x={left} y="296" fontSize="12" fill="currentColor" opacity="0.7">0 units</text>
          <text x={right} y="296" textAnchor="end" fontSize="12" fill="currentColor" opacity="0.7">{integerFormatter.format(maxUnits)} units</text>
          <text x={Math.min(right - 84, breakEvenX + 10)} y={Math.max(top + 14, breakEvenY - 12)} fontSize="12" fontWeight="700" fill="#059669">Break-even</text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#0f9f8f]" />รายได้</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#f59e0b]" />ต้นทุนรวม</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-500" />จุดคุ้มทุน</span>
      </div>
    </section>
  );
}

function ProductMixTable({ products, currency }: { products: BreakEvenProductResult[]; currency: BreakEvenCurrency }) {
  return (
    <section className="min-w-0 rounded-2xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="break-even-mix-result-title">
      <h2 id="break-even-mix-result-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />Product mix ที่ใช้คำนวณ</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">จำนวนต่อรายการเป็นค่าประมาณจาก Unit mix ที่คงที่ ไม่ใช่ Revenue share และอาจเป็นทศนิยมสำหรับบริการหรือ Composite unit</p>
      <div className="mt-4 min-w-0 overflow-x-auto rounded-xl border bg-card" role="region" aria-label="ตาราง Product mix เลื่อนแนวนอนได้" tabIndex={0}>
        <table className="min-w-[780px] w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">สินค้า/บริการ</th><th className="px-4 py-3 text-right font-medium">Mix</th><th className="px-4 py-3 text-right font-medium">ราคา</th><th className="px-4 py-3 text-right font-medium">Variable</th><th className="px-4 py-3 text-right font-medium">CM/หน่วย</th><th className="px-4 py-3 text-right font-medium">Break-even</th><th className="px-4 py-3 text-right font-medium">Target</th></tr>
          </thead>
          <tbody>
            {products.map((item, index) => (
              <tr key={`${index}-${item.name}`} className="border-t">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-right">{numberFormatter.format(item.unitSalesMixPercent)}%</td>
                <td className="px-4 py-3 text-right">{money(item.sellingPricePerUnit, currency)}</td>
                <td className="px-4 py-3 text-right">{money(item.variableCostPerUnit, currency)}</td>
                <td className={`px-4 py-3 text-right font-medium ${item.contributionMarginPerUnit < 0 ? "text-destructive" : ""}`}>{signedMoney(item.contributionMarginPerUnit, currency)}</td>
                <td className="px-4 py-3 text-right">{preciseFormatter.format(item.breakEvenUnitsExact)}</td>
                <td className="px-4 py-3 text-right">{preciseFormatter.format(item.targetUnitsExact)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BreakEvenResultPanel({ input, result }: { input: BreakEvenInput; result: BreakEvenResult }) {
  const summary = [
    `${input.scenarioName} — Break-even`,
    `Fixed costs: ${money(result.totalFixedCosts, input.currency)}`,
    `Weighted contribution: ${money(result.weightedContributionMarginPerUnit, input.currency)}/unit (${numberFormatter.format(result.weightedContributionMarginRatioPercent)}%)`,
    `Break-even: ${preciseFormatter.format(result.breakEvenUnitsExact)} units; ปัดขึ้น ${integerFormatter.format(result.breakEvenUnitsRounded)} units; revenue ${money(result.breakEvenRevenue, input.currency)}`,
    `Target operating profit ${money(input.targetOperatingProfit, input.currency)}: ${preciseFormatter.format(result.targetUnitsExact)} units; revenue ${money(result.targetRevenue, input.currency)}`,
    result.currentPlan ? `Current plan: ${preciseFormatter.format(result.currentPlan.totalUnits)} units; operating profit ${signedMoney(result.currentPlan.operatingProfit, input.currency)}; margin of safety ${numberFormatter.format(result.currentPlan.marginOfSafetyPercent)}%` : "Current plan: ไม่ได้กรอก",
    result.capacityPlan ? `Capacity: ${preciseFormatter.format(result.capacityPlan.units)} units; operating profit ${signedMoney(result.capacityPlan.operatingProfit, input.currency)}` : "Capacity: ไม่ได้กรอก",
    "หมายเหตุ: เป็น Cost–Volume–Profit scenario ก่อนภาษีและไม่ใช่ Cash-flow forecast หรือคำแนะนำทางบัญชี",
  ].join("\n");

  return (
    <div data-testid="break-even-result" className="min-w-0 space-y-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard testId="break-even-units" label="Break-even units" value={integerFormatter.format(result.breakEvenUnitsRounded)} detail={`Exact ${preciseFormatter.format(result.breakEvenUnitsExact)} · ปัดขึ้นเมื่อขายเป็นหน่วยเต็ม`} accent />
        <ResultCard testId="break-even-revenue" label="Break-even revenue" value={money(result.breakEvenRevenue, input.currency)} detail="ยอดขายที่ Contribution ครบต้นทุนคงที่" />
        <ResultCard testId="break-even-contribution" label="Weighted contribution / unit" value={money(result.weightedContributionMarginPerUnit, input.currency)} detail={`${numberFormatter.format(result.weightedContributionMarginRatioPercent)}% ของราคาขายเฉลี่ยถ่วงน้ำหนัก`} />
        <ResultCard testId="break-even-target-units" label={`Target profit ${money(input.targetOperatingProfit, input.currency)}`} value={integerFormatter.format(result.targetUnitsRounded)} detail={`Target revenue ${money(result.targetRevenue, input.currency)}`} />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <BreakEvenChart input={input} result={result} />
        <section className="min-w-0 rounded-2xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="break-even-weighted-title">
          <h2 id="break-even-weighted-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />ต้นทุนและ Contribution ถ่วงน้ำหนัก</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ค่านี้คือ Composite unit จากสัดส่วนจำนวนหน่วยของทุกสินค้า/บริการ</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3"><dt>ราคาขายเฉลี่ย</dt><dd className="font-semibold">{money(result.weightedSellingPricePerUnit, input.currency)}</dd></div>
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3"><dt>ต้นทุนผันแปรเฉลี่ย</dt><dd className="font-semibold">{money(result.weightedVariableCostPerUnit, input.currency)}</dd></div>
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3"><dt>Contribution เฉลี่ย</dt><dd className="font-semibold text-emerald-700 dark:text-emerald-300">{money(result.weightedContributionMarginPerUnit, input.currency)}</dd></div>
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3"><dt>ต้นทุนคงที่รวม</dt><dd className="font-semibold">{money(result.totalFixedCosts, input.currency)}</dd></div>
          </dl>
        </section>
      </div>

      <ProductMixTable products={result.products} currency={input.currency} />

      {result.currentPlan ? (
        <section className="rounded-2xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="break-even-current-title">
          <h2 id="break-even-current-title" className="flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-primary" />ยอดขายปัจจุบันและ Margin of Safety</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Operating profit = Revenue − Variable costs − Fixed costs ที่กรอก ยังไม่ใช่กำไรสุทธิหลังภาษี</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultCard label="รายได้ตามแผน" value={money(result.currentPlan.revenue, input.currency)} detail={`${preciseFormatter.format(result.currentPlan.totalUnits)} units`} />
            <ResultCard testId="break-even-operating-profit" label="Operating profit" value={signedMoney(result.currentPlan.operatingProfit, input.currency)} detail={`${numberFormatter.format(result.currentPlan.operatingMarginPercent)}% ของรายได้`} accent={result.currentPlan.operatingProfit >= 0} />
            <ResultCard testId="break-even-margin-safety" label="Margin of safety" value={`${numberFormatter.format(result.currentPlan.marginOfSafetyPercent)}%`} detail={`${signedMoney(result.currentPlan.marginOfSafetyRevenue, input.currency)} เทียบ Break-even`} />
            <ResultCard label="จำนวนที่ยังขาดจาก Target" value={preciseFormatter.format(result.currentPlan.unitsGapToTarget)} detail={result.currentPlan.unitsGapToBreakEven > 0 ? `ยังขาด Break-even ${preciseFormatter.format(result.currentPlan.unitsGapToBreakEven)} units` : "ผ่าน Break-even แล้ว"} />
          </div>
        </section>
      ) : null}

      {result.capacityPlan ? (
        <Alert className={result.capacityPlan.status === "below-break-even" ? "border-destructive/40 bg-destructive/5" : result.capacityPlan.status === "at-or-above-target" ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}>
          <Gauge className={result.capacityPlan.status === "below-break-even" ? "text-destructive" : "text-primary"} />
          <AlertTitle>{result.capacityPlan.status === "below-break-even" ? "Capacity ปัจจุบันต่ำกว่าจุดคุ้มทุน" : result.capacityPlan.status === "at-or-above-target" ? "Capacity รองรับเป้าหมายที่กรอก" : "Capacity ผ่าน Break-even แต่ยังไม่ถึง Target"}</AlertTitle>
          <AlertDescription className="leading-6">ที่ {preciseFormatter.format(result.capacityPlan.units)} units จะมีรายได้ประมาณ {money(result.capacityPlan.revenue, input.currency)} และ Operating profit {signedMoney(result.capacityPlan.operatingProfit, input.currency)} โดย Break-even ใช้ {numberFormatter.format(result.capacityPlan.breakEvenCapacityPercent)}% ของ Capacity และ Target ใช้ {numberFormatter.format(result.capacityPlan.targetCapacityPercent)}%</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="break-even-formula-title">
        <h2 id="break-even-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรที่ใช้</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Contribution / unit</p><p className="mt-1 text-xs text-muted-foreground">ราคาขาย − ต้นทุนผันแปรต่อหน่วย</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Break-even units</p><p className="mt-1 text-xs text-muted-foreground">ต้นทุนคงที่ ÷ Contribution เฉลี่ยถ่วงน้ำหนัก</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Target profit units</p><p className="mt-1 text-xs text-muted-foreground">(ต้นทุนคงที่ + Target operating profit) ÷ Contribution เฉลี่ย</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปจุดคุ้มทุนแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="break-even-csv" onClick={() => downloadText(breakEvenCsv(input, result), "meaw-business-break-even.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function BreakEvenCalculatorTool() {
  const [form, setForm] = useState<BreakEvenForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: BreakEvenInput; result: BreakEvenResult } | null>(null);
  const [error, setError] = useState("");
  const [nextProductNumber, setNextProductNumber] = useState(2);

  const invalidate = () => {
    setCalculation(null);
    setError("");
  };

  const updateForm = <Key extends keyof Omit<BreakEvenForm, "products">>(key: Key, value: BreakEvenForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };

  const updateProduct = (id: string, key: keyof Omit<ProductForm, "id">, value: string) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((item) => item.id === id ? { ...item, [key]: value } : item),
    }));
    invalidate();
  };

  const addProduct = () => {
    if (form.products.length >= BREAK_EVEN_MAX_PRODUCTS) return;
    const id = `break-even-product-${nextProductNumber}`;
    setNextProductNumber((value) => value + 1);
    setForm((current) => ({ ...current, products: [...current.products, product(id, "0")] }));
    invalidate();
  };

  const removeProduct = (id: string) => {
    if (form.products.length === 1) return;
    setForm((current) => ({ ...current, products: current.products.filter((item) => item.id !== id) }));
    invalidate();
  };

  const mixTotal = form.products.reduce((total, item) => {
    const value = Number(item.unitSalesMixPercent);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  const calculate = () => {
    try {
      const input: BreakEvenInput = {
        currency: form.currency,
        scenarioName: form.scenarioName,
        fixedCosts: {
          rentAndSpace: parseNumber(form.rentAndSpace, "ค่าเช่าและพื้นที่"),
          fixedPayroll: parseNumber(form.fixedPayroll, "เงินเดือนและค่าแรงส่วนคงที่"),
          utilitiesAndSubscriptions: parseNumber(form.utilitiesAndSubscriptions, "Utilities และ Subscription"),
          marketingAndAdmin: parseNumber(form.marketingAndAdmin, "Marketing และ Admin"),
          depreciationAndOther: parseNumber(form.depreciationAndOther, "Depreciation และต้นทุนคงที่อื่น"),
        },
        products: form.products.map((item, index) => ({
          name: item.name,
          sellingPricePerUnit: parseNumber(item.sellingPricePerUnit, `ราคาขายรายการที่ ${index + 1}`, true),
          variableCostPerUnit: parseNumber(item.variableCostPerUnit, `ต้นทุนผันแปรรายการที่ ${index + 1}`),
          unitSalesMixPercent: parseNumber(item.unitSalesMixPercent, `Unit sales mix รายการที่ ${index + 1}`, true),
        })),
        currentTotalUnits: parseNumber(form.currentTotalUnits, "ยอดขายปัจจุบัน"),
        targetOperatingProfit: parseNumber(form.targetOperatingProfit, "เป้าหมาย Operating profit"),
        capacityUnits: parseNumber(form.capacityUnits, "Capacity"),
      };
      setCalculation({ input, result: calculateBreakEven(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณจุดคุ้มทุนได้");
    }
  };

  const loadExample = () => {
    setForm(createExampleForm());
    setNextProductNumber(4);
    setCalculation(null);
    setError("");
  };

  const clear = () => {
    setForm(createInitialForm());
    setNextProductNumber(2);
    setCalculation(null);
    setError("");
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>ราคา ต้นทุน และ Product mix อยู่ใน Browser</AlertTitle>
        <AlertDescription className="leading-6">ไม่มี API รับหรือบันทึกชื่อกิจการ สินค้า ราคา ต้นทุน หรือแผนยอดขาย ข้อมูลจะหายเมื่อรีเฟรชหน้า และ CSV ป้องกันข้อความที่อาจกลายเป็น Spreadsheet formula</AlertDescription>
      </Alert>

      <section aria-labelledby="break-even-scenario-title">
        <div>
          <h2 id="break-even-scenario-title" className="flex items-center gap-2 font-semibold"><Store className="size-4 text-primary" />Scenario และงวดวิเคราะห์</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ต้นทุน ราคา ปริมาณ และเป้าหมายจากงวดเดียวกัน ตัวอย่างนี้ออกแบบให้กรอกเป็นรายเดือน</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="break-even-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as BreakEvenCurrency)}>
              <SelectTrigger id="break-even-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="EUR">ยูโร (EUR)</SelectItem><SelectItem value="GBP">ปอนด์ (GBP)</SelectItem><SelectItem value="JPY">เยน (JPY)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ทุกยอดต้องเป็นหน่วยเดียวกัน ไม่มี FX conversion</p>
          </div>
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="break-even-scenario-name">ชื่อกิจการ / Scenario</Label>
            <Input id="break-even-scenario-name" value={form.scenarioName} maxLength={80} placeholder="เช่น ร้านกาแฟ · แผนรายเดือน" onChange={(event) => updateForm("scenarioName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้แยก Scenario ในสรุปและ CSV เท่านั้น</p>
          </div>
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="break-even-fixed-title">
        <div>
          <h2 id="break-even-fixed-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />ต้นทุนคงที่ต่องวด</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ต้นทุนที่ยังเกิดแม้ยอดขายเปลี่ยน หากเป็น Mixed cost ให้แยกส่วนคงที่ไว้ที่นี่และส่วนตามหน่วยไว้ใน Product mix</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <NumberField id="break-even-rent" label="ค่าเช่าและพื้นที่" value={form.rentAndSpace} onChange={(value) => updateForm("rentAndSpace", value)} hint="ค่าเช่า พื้นที่ คลัง หรือค่าใช้สถานที่ประจำงวด" />
          <NumberField id="break-even-payroll" label="เงินเดือนและค่าแรงส่วนคงที่" value={form.fixedPayroll} onChange={(value) => updateForm("fixedPayroll", value)} hint="เฉพาะส่วนที่ไม่เพิ่มตามจำนวนหน่วยขาย" />
          <NumberField id="break-even-utilities" label="Utilities และ Subscription ส่วนคงที่" value={form.utilitiesAndSubscriptions} onChange={(value) => updateForm("utilitiesAndSubscriptions", value)} hint="Base charge, Software และค่าบริการประจำ" />
          <NumberField id="break-even-marketing" label="Marketing และ Admin ส่วนคงที่" value={form.marketingAndAdmin} onChange={(value) => updateForm("marketingAndAdmin", value)} hint="งบคงที่ ไม่รวมค่าธรรมเนียมที่คิดตามยอดขาย" />
          <NumberField id="break-even-other-fixed" label="Depreciation และต้นทุนคงที่อื่น" value={form.depreciationAndOther} onChange={(value) => updateForm("depreciationAndOther", value)} hint="กรอกตามนโยบายของกิจการและไม่หักรายการเดียวกันซ้ำ" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="break-even-products-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="break-even-products-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />สินค้า บริการ และ Unit sales mix</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">Mix คือสัดส่วน “จำนวนหน่วย” เช่น 40 จากทุก 100 แก้ว ไม่ใช่สัดส่วนรายได้ และต้องรวม 100%</p>
          </div>
          <Badge role="status" aria-live="polite" variant={Math.abs(mixTotal - 100) <= 0.01 ? "secondary" : "destructive"}>Mix {numberFormatter.format(mixTotal)}%</Badge>
        </div>
        <div className="mt-5 space-y-4">
          {form.products.map((item, index) => (
            <div key={item.id} className="rounded-2xl border bg-muted/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">รายการ {index + 1}</p>
                <Button type="button" size="icon-sm" variant="ghost" disabled={form.products.length === 1} aria-label={`ลบสินค้า/บริการรายการที่ ${index + 1}`} onClick={() => removeProduct(item.id)}><Trash2 className="size-4" /></Button>
              </div>
              <div className="mt-4 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-3 md:col-span-2 xl:col-span-1">
                  <Label htmlFor={`${item.id}-name`}>ชื่อสินค้า / บริการ</Label>
                  <Input id={`${item.id}-name`} value={item.name} maxLength={60} placeholder="เช่น Americano" onChange={(event) => updateProduct(item.id, "name", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">หนึ่งรายการควรมีหน่วยขายสม่ำเสมอ</p>
                </div>
                <NumberField id={`${item.id}-price`} label="ราคาขายต่อหน่วย" value={item.sellingPricePerUnit} onChange={(value) => updateProduct(item.id, "sellingPricePerUnit", value)} min={0.000001} required hint="ราคาก่อนหักต้นทุนผันแปร" />
                <NumberField id={`${item.id}-variable`} label="ต้นทุนผันแปรต่อหน่วย" value={item.variableCostPerUnit} onChange={(value) => updateProduct(item.id, "variableCostPerUnit", value)} hint="วัตถุดิบ Packaging, Fee หรือแรงงานที่เพิ่มตามหน่วย" />
                <NumberField id={`${item.id}-mix`} label="Unit sales mix (%)" value={item.unitSalesMixPercent} onChange={(value) => updateProduct(item.id, "unitSalesMixPercent", value)} min={0.000001} max={100} required hint="สัดส่วนจำนวนหน่วย ต้องรวมทุกแถวเป็น 100%" />
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="mt-4" disabled={form.products.length >= BREAK_EVEN_MAX_PRODUCTS} onClick={addProduct}><Plus className="size-4" />เพิ่มสินค้า/บริการ ({form.products.length}/{BREAK_EVEN_MAX_PRODUCTS})</Button>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="break-even-plan-title">
        <div>
          <h2 id="break-even-plan-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />ยอดปัจจุบัน เป้ากำไร และ Capacity</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ช่องเหล่านี้ไม่บังคับ ใช้เทียบแผนกับ Break-even โดยถือว่า Product mix เดิมไม่เปลี่ยน</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="break-even-current-units" label="ยอดขายปัจจุบันรวม (units/งวด)" value={form.currentTotalUnits} onChange={(value) => updateForm("currentTotalUnits", value)} hint="รวมทุกสินค้า/บริการตาม Unit mix ที่กรอก" />
          <NumberField id="break-even-target-profit" label="Target operating profit/งวด" value={form.targetOperatingProfit} onChange={(value) => updateForm("targetOperatingProfit", value)} hint="ก่อนภาษีและรายการที่ยังไม่รวมในต้นทุน" />
          <NumberField id="break-even-capacity" label="Capacity สูงสุด (units/งวด)" value={form.capacityUnits} onChange={(value) => updateForm("capacityUnits", value)} hint="ใช้ตรวจว่าความสามารถรองรับเพียงพอต่อ Break-even/Target หรือไม่" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณจุดคุ้มทุน</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5 min-w-0">
        {calculation ? <BreakEvenResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกต้นทุนคงที่ ราคา ต้นทุนผันแปร และ Unit sales mix</p><p className="mt-1 text-xs">ระบบจะแสดง Break-even, Contribution margin, Target profit, Margin of safety และ Capacity</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>Break-even เป็น Scenario ไม่ใช่กำไรสุทธิหรือ Cash-flow forecast</AlertTitle>
        <AlertDescription className="leading-6">สูตรถือว่าราคา ต้นทุนต่อหน่วย ต้นทุนคงที่ และ Unit sales mix คงที่ในช่วงที่วิเคราะห์ ไม่รวมข้อจำกัดแบบขั้นบันได Stock, Seasonality, เครดิตรับจ่าย, เงินลงทุน, VAT, ภาษีเงินได้ หรือแหล่งเงินทุน เว้นแต่คุณรวมรายการนั้นใน Input อย่างถูกขอบเขต</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและขอบเขต:</strong> <a className="font-medium text-primary hover:underline" href="https://www.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point" target="_blank" rel="noreferrer">U.S. Small Business Administration</a> อธิบายสูตร Fixed costs ÷ (Price − Variable cost) และการแยก Fixed/Variable/Mixed cost; <a className="font-medium text-primary hover:underline" href="https://openstax.org/books/principles-managerial-accounting/pages/3-4-perform-break-even-sensitivity-analysis-for-a-multi-product-environment-under-changing-business-situations" target="_blank" rel="noreferrer">OpenStax — Multi-product CVP</a> อธิบาย Composite unit และข้อสมมติว่า Sales mix คงที่ หากต้องการต้นทุนต่อเมนูใช้ <Link href="/coffee-cost-calculator" className="font-medium text-primary hover:underline">Coffee Cost Calculator</Link>, ต้นทุนตามงวดใช้ <Link href="/cost-of-goods-sold-calculator" className="font-medium text-primary hover:underline">COGS Calculator</Link> และตรวจ Markup/Margin รายการเดียวใช้ <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit &amp; Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
