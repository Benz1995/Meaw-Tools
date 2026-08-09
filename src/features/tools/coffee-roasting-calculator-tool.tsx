"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  Coffee,
  Download,
  Flame,
  Info,
  PackageOpen,
  ReceiptText,
  Scale,
  ShieldCheck,
  Target,
  Timer,
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
  calculateCoffeeRoasting,
  coffeeRoastingCsv,
  type CoffeeRoastingCurrency,
  type CoffeeRoastingInput,
  type CoffeeRoastingMassUnit,
  type CoffeeRoastingResult,
  type RoastLossStatus,
} from "@/lib/tools/coffee-roasting";

type CoffeeRoastingForm = {
  currency: CoffeeRoastingCurrency;
  batchName: string;
  greenPurchaseCost: string;
  greenPurchaseWeight: string;
  greenPurchaseUnit: CoffeeRoastingMassUnit;
  greenBatchWeight: string;
  greenBatchUnit: CoffeeRoastingMassUnit;
  roastedOutputWeight: string;
  roastedOutputUnit: CoffeeRoastingMassUnit;
  expectedLossPercent: string;
  energyCostPerBatch: string;
  laborMinutesPerBatch: string;
  laborCostPerHour: string;
  otherBatchCost: string;
  retailBagSizeG: string;
  packagingCostPerBag: string;
  sellingPricePerBag: string;
  channelFeePercent: string;
  targetContributionMarginPercent: string;
  batchesPerMonth: string;
};

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const currencyFormatters = new Map<Exclude<CoffeeRoastingCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: CoffeeRoastingCurrency) {
  if (currency === "OTHER") return `${numberFormatter.format(value)} หน่วยเงิน`;
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

function signedPercentagePoints(value: number) {
  if (Math.abs(value) < 0.005) return "0.00 pp";
  return `${value > 0 ? "+" : "−"}${numberFormatter.format(Math.abs(value))} pp`;
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

function createInitialForm(): CoffeeRoastingForm {
  return {
    currency: "THB",
    batchName: "",
    greenPurchaseCost: "",
    greenPurchaseWeight: "",
    greenPurchaseUnit: "kg",
    greenBatchWeight: "",
    greenBatchUnit: "kg",
    roastedOutputWeight: "",
    roastedOutputUnit: "kg",
    expectedLossPercent: "15",
    energyCostPerBatch: "0",
    laborMinutesPerBatch: "0",
    laborCostPerHour: "0",
    otherBatchCost: "0",
    retailBagSizeG: "250",
    packagingCostPerBag: "0",
    sellingPricePerBag: "",
    channelFeePercent: "0",
    targetContributionMarginPercent: "30",
    batchesPerMonth: "0",
  };
}

function createExampleForm(): CoffeeRoastingForm {
  return {
    currency: "THB",
    batchName: "House Blend · Medium Roast",
    greenPurchaseCost: "1000",
    greenPurchaseWeight: "10",
    greenPurchaseUnit: "kg",
    greenBatchWeight: "5",
    greenBatchUnit: "kg",
    roastedOutputWeight: "4.25",
    roastedOutputUnit: "kg",
    expectedLossPercent: "14.5",
    energyCostPerBatch: "60",
    laborMinutesPerBatch: "30",
    laborCostPerHour: "120",
    otherBatchCost: "40",
    retailBagSizeG: "250",
    packagingCostPerBag: "8",
    sellingPricePerBag: "160",
    channelFeePercent: "3",
    targetContributionMarginPercent: "30",
    batchesPerMonth: "20",
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: React.ReactNode;
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

function MassUnitField({ id, label, value, onChange }: { id: string; label: string; value: CoffeeRoastingMassUnit; onChange: (value: CoffeeRoastingMassUnit) => void }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as CoffeeRoastingMassUnit)}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="g">กรัม (g)</SelectItem><SelectItem value="kg">กิโลกรัม (kg)</SelectItem></SelectContent>
      </Select>
      <p className="text-xs leading-5 text-muted-foreground">ระบบแปลงเป็นกรัมก่อนคำนวณ</p>
    </div>
  );
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; testId?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${emphasized ? "border-amber-600/30 bg-amber-600/5" : "bg-muted/10"}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function lossStatusText(status: RoastLossStatus) {
  if (status === "on-plan") return "ใกล้เคียง Loss ที่วางแผนไว้";
  if (status === "above-plan") return "น้ำหนักหายมากกว่าแผน";
  return "น้ำหนักหายน้อยกว่าแผน";
}

function CoffeeRoastingResultPanel({ input, result }: { input: CoffeeRoastingInput; result: CoffeeRoastingResult }) {
  const comparisonMax = Math.max(result.actualLossPercent, input.expectedLossPercent, 1);
  const actualBarWidth = result.actualLossPercent / comparisonMax * 100;
  const expectedBarWidth = input.expectedLossPercent / comparisonMax * 100;
  const summary = [
    `สรุป Coffee Roasting — ${input.batchName} — Meaw Tools`,
    `Green coffee: ${quantityFormatter.format(result.greenBatchWeightG / 1_000)} kg`,
    `กาแฟหลังคั่ว: ${quantityFormatter.format(result.roastedOutputWeightG / 1_000)} kg`,
    `น้ำหนักหาย: ${quantityFormatter.format(result.actualLossWeightG)} g (${numberFormatter.format(result.actualLossPercent)}%)`,
    `Roast yield: ${numberFormatter.format(result.yieldPercent)}%`,
    `ต้นทุนกระบวนการต่อ Batch: ${money(result.processCostPerBatch, input.currency)}`,
    `ต้นทุนกาแฟคั่วก่อน Packaging: ${money(result.costPerRoastedKgBeforePackaging, input.currency)}/kg`,
    `ถุงเต็ม ${quantityFormatter.format(input.retailBagSizeG)} g: ${numberFormatter.format(result.fullBagsPerBatch)} ถุง`,
    `ต้นทุนต่อถุงก่อน Channel fee: ${money(result.costPerBagBeforeChannelFee, input.currency)}`,
    `ราคาจากเป้า Contribution margin ${numberFormatter.format(input.targetContributionMarginPercent)}%: ${money(result.suggestedPricePerBag, input.currency)}`,
    ...(result.contributionPerBag === null ? [] : [
      `Contribution ต่อถุง: ${money(result.contributionPerBag, input.currency)} (${numberFormatter.format(result.contributionMarginPercent ?? 0)}%)`,
    ]),
    ...(input.batchesPerMonth > 0 ? [
      `แผน ${numberFormatter.format(input.batchesPerMonth)} Batch/เดือน: ${numberFormatter.format(result.monthlyFullBags)} ถุงเต็ม`,
    ] : []),
    "หมายเหตุ: Weight loss ไม่ได้ยืนยันระดับคั่วหรือคุณภาพ และ Contribution ยังไม่ใช่กำไรสุทธิ",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="coffee-roasting-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ResultCard label="Roast loss" value={`${numberFormatter.format(result.actualLossPercent)}%`} detail={`${quantityFormatter.format(result.actualLossWeightG)} g หายจากน้ำหนักก่อนคั่ว`} testId="coffee-roasting-loss" />
        <ResultCard label="Roast yield" value={`${numberFormatter.format(result.yieldPercent)}%`} detail={`${quantityFormatter.format(result.roastedOutputWeightG / 1_000)} kg หลังคั่ว`} testId="coffee-roasting-yield" />
        <ResultCard label="ต้นทุนกาแฟคั่วก่อน Packaging" value={`${money(result.costPerRoastedKgBeforePackaging, input.currency)}/kg`} detail="Green bean + Energy + Labor + Other" testId="coffee-roasting-cost-kg" />
        <ResultCard label={`ต้นทุนก่อน Fee · ${quantityFormatter.format(input.retailBagSizeG)} g`} value={money(result.costPerBagBeforeChannelFee, input.currency)} detail="กาแฟคั่วตามสัดส่วน + บรรจุภัณฑ์" testId="coffee-roasting-cost-bag" />
        <ResultCard label={`ราคาจากเป้า Margin ${numberFormatter.format(input.targetContributionMarginPercent)}%`} value={money(result.suggestedPricePerBag, input.currency)} detail="รวม Channel fee ที่กรอก ไม่ใช่ราคาตลาด" emphasized testId="coffee-roasting-target-price" />
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="min-w-0 rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-roasting-loss-title">
          <h2 id="coffee-roasting-loss-title" className="flex items-center gap-2 font-semibold"><Scale className="size-4 text-primary" />Loss เทียบแผน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">เปรียบเทียบเป็น percentage points จากค่าที่ผู้ใช้กรอก ไม่ใช้ตัดสินระดับคั่วหรือคุณภาพ</p>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3"><span>Loss ที่ชั่งจริง</span><strong>{numberFormatter.format(result.actualLossPercent)}%</strong></div>
              <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-700 dark:bg-amber-500" style={{ width: `${actualBarWidth}%` }} /></div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3"><span>Loss ที่คาด</span><strong>{numberFormatter.format(input.expectedLossPercent)}%</strong></div>
              <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-sky-600 dark:bg-sky-400" style={{ width: `${expectedBarWidth}%` }} /></div>
            </div>
            <div className={`rounded-lg border p-3 ${result.lossStatus === "on-plan" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              <p className="font-medium">{lossStatusText(result.lossStatus)}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">ต่างจากแผน <strong data-testid="coffee-roasting-loss-variance">{signedPercentagePoints(result.lossVariancePercentagePoints)}</strong> · น้ำหนักหลังคั่วตามแผน {quantityFormatter.format(result.expectedRoastedWeightG / 1_000)} kg</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-roasting-cost-title">
          <h2 id="coffee-roasting-cost-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ต้นทุนกระบวนการต่อ Batch</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ต้นทุนกาแฟต่อกิโลสูงขึ้นเมื่อ Roast yield ลดลง แม้ราคา Green coffee และต้นทุน Batch เท่าเดิม</p>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="bg-amber-800 dark:bg-amber-500" style={{ width: `${result.greenShareOfProcessCost}%` }} />
            <span className="bg-orange-500" style={{ width: `${result.energyShareOfProcessCost}%` }} />
            <span className="bg-violet-600 dark:bg-violet-400" style={{ width: `${result.laborShareOfProcessCost}%` }} />
            <span className="bg-slate-600 dark:bg-slate-400" style={{ width: `${result.otherShareOfProcessCost}%` }} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-right text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">รายการ</th><th className="pb-3 px-3 font-medium">สัดส่วน</th><th className="pb-3 pl-3 font-medium">ต้นทุน</th></tr></thead>
              <tbody className="divide-y">
                <tr><th className="py-3 pr-4 text-left font-medium">Green coffee</th><td className="px-3 tabular-nums">{numberFormatter.format(result.greenShareOfProcessCost)}%</td><td className="pl-3 font-semibold tabular-nums">{money(result.greenBeanCostPerBatch, input.currency)}</td></tr>
                <tr><th className="py-3 pr-4 text-left font-medium">พลังงาน</th><td className="px-3 tabular-nums">{numberFormatter.format(result.energyShareOfProcessCost)}%</td><td className="pl-3 font-semibold tabular-nums">{money(input.energyCostPerBatch, input.currency)}</td></tr>
                <tr><th className="py-3 pr-4 text-left font-medium">แรงงาน</th><td className="px-3 tabular-nums">{numberFormatter.format(result.laborShareOfProcessCost)}%</td><td className="pl-3 font-semibold tabular-nums">{money(result.laborCostPerBatch, input.currency)}</td></tr>
                <tr><th className="py-3 pr-4 text-left font-medium">ต้นทุน Batch อื่น</th><td className="px-3 tabular-nums">{numberFormatter.format(result.otherShareOfProcessCost)}%</td><td className="pl-3 font-semibold tabular-nums">{money(input.otherBatchCost, input.currency)}</td></tr>
                <tr><th className="py-3 pr-4 text-left font-semibold">รวม</th><td className="px-3">100%</td><td className="pl-3 text-base font-bold tabular-nums">{money(result.processCostPerBatch, input.currency)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-roasting-pack-title">
        <h2 id="coffee-roasting-pack-title" className="flex items-center gap-2 font-semibold"><PackageOpen className="size-4 text-primary" />ถุงขาย ราคา และ Contribution</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">จำนวนถุงเต็มใช้ Floor จากน้ำหนักหลังคั่วจริง ส่วนกาแฟที่เหลือยังเป็น Inventory ไม่ถูกนับเป็นยอดขาย</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResultCard label="ถุงเต็มต่อ Batch" value={`${numberFormatter.format(result.fullBagsPerBatch)} ถุง`} detail={`เหลือ ${quantityFormatter.format(result.leftoverRoastedWeightG)} g`} testId="coffee-roasting-bags" />
          <ResultCard label="ต้นทุนกาแฟต่อถุง" value={money(result.coffeeCostPerBag, input.currency)} detail={`ก่อน Packaging · ${quantityFormatter.format(input.retailBagSizeG)} g`} />
          <ResultCard label="ต้นทุนตรงรวมต่อถุง" value={result.totalDirectCostPerBag === null ? "—" : money(result.totalDirectCostPerBag, input.currency)} detail={result.channelFeePerBag === null ? "กรอกราคาขายเพื่อคำนวณ Channel fee" : `รวม Fee ${money(result.channelFeePerBag, input.currency)}`} />
          <ResultCard label="Contribution ต่อถุง" value={result.contributionPerBag === null ? "—" : money(result.contributionPerBag, input.currency)} detail={result.contributionMarginPercent === null ? "ยังไม่ได้กรอกราคาขาย" : `${numberFormatter.format(result.contributionMarginPercent)}% ของราคาขาย`} emphasized />
        </div>
      </section>

      {input.batchesPerMonth > 0 ? (
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-roasting-monthly-title">
          <h2 id="coffee-roasting-monthly-title" className="flex items-center gap-2 font-semibold"><Warehouse className="size-4 text-primary" />แผน Roastery รายเดือน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ประมาณจาก {numberFormatter.format(input.batchesPerMonth)} Batch ที่มี Input, Yield, Pack size และราคาคงที่ ไม่ใช่ Forecast หรือ Purchase order</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultCard label="Green coffee" value={`${quantityFormatter.format(result.monthlyGreenWeightG / 1_000)} kg`} />
            <ResultCard label="กาแฟหลังคั่ว" value={`${quantityFormatter.format(result.monthlyRoastedWeightG / 1_000)} kg`} />
            <ResultCard label="ถุงเต็มต่อเดือน" value={`${numberFormatter.format(result.monthlyFullBags)} ถุง`} detail={`เศษรวม ${quantityFormatter.format(result.monthlyLeftoverWeightG / 1_000)} kg`} testId="coffee-roasting-monthly-bags" />
            <ResultCard label="Contribution ต่อเดือน" value={result.monthlyContribution === null ? "—" : money(result.monthlyContribution, input.currency)} detail="ก่อนค่าเช่า ภาษี Depreciation และ Overhead" emphasized testId="coffee-roasting-monthly-contribution" />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-3"><span className="text-muted-foreground">ต้นทุนกระบวนการ</span><strong className="mt-1 block tabular-nums">{money(result.monthlyProcessCost, input.currency)}</strong></div>
            <div className="rounded-lg border bg-card p-3"><span className="text-muted-foreground">รายได้จากถุงเต็ม</span><strong className="mt-1 block tabular-nums">{result.monthlyRevenue === null ? "—" : money(result.monthlyRevenue, input.currency)}</strong></div>
            <div className="rounded-lg border bg-card p-3"><span className="text-muted-foreground">น้ำหนักเหลือที่ยังไม่ขาย</span><strong className="mt-1 block tabular-nums">{quantityFormatter.format(result.monthlyLeftoverWeightG)} g</strong></div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed bg-muted/5 p-4 text-sm leading-6 text-muted-foreground" aria-label="แผนรายเดือนยังไม่พร้อม">กรอกจำนวน Batch ต่อเดือนมากกว่า 0 เพื่อดู Green coffee, ผลผลิตหลังคั่ว จำนวนถุง ต้นทุน และ Contribution รายเดือน</section>
      )}

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-roasting-formula-title">
        <h2 id="coffee-roasting-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรที่ใช้</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Roast loss</p><p className="mt-1 text-xs text-muted-foreground">(น้ำหนักก่อนคั่ว − หลังคั่ว) ÷ น้ำหนักก่อนคั่ว × 100</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ต้นทุนต่อ kg หลังคั่ว</p><p className="mt-1 text-xs text-muted-foreground">ต้นทุนกระบวนการต่อ Batch ÷ น้ำหนักหลังคั่ว kg</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ราคาจากเป้า Margin</p><p className="mt-1 text-xs text-muted-foreground">ต้นทุนก่อน Fee ÷ (1 − Fee rate − Target margin rate)</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปการคั่วกาแฟแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="coffee-roasting-csv" onClick={() => downloadText(coffeeRoastingCsv(input, result), "meaw-coffee-roasting-cost.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function CoffeeRoastingCalculatorTool() {
  const [form, setForm] = useState<CoffeeRoastingForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: CoffeeRoastingInput; result: CoffeeRoastingResult } | null>(null);
  const [error, setError] = useState("");

  const updateForm = <Key extends keyof CoffeeRoastingForm>(key: Key, value: CoffeeRoastingForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setCalculation(null);
    setError("");
  };

  const calculate = () => {
    try {
      const input: CoffeeRoastingInput = {
        currency: form.currency,
        batchName: form.batchName,
        greenPurchaseCost: parseNumber(form.greenPurchaseCost, "ราคา Green coffee", true),
        greenPurchaseWeight: parseNumber(form.greenPurchaseWeight, "น้ำหนัก Green coffee ที่ซื้อ", true),
        greenPurchaseUnit: form.greenPurchaseUnit,
        greenBatchWeight: parseNumber(form.greenBatchWeight, "น้ำหนักก่อนคั่ว", true),
        greenBatchUnit: form.greenBatchUnit,
        roastedOutputWeight: parseNumber(form.roastedOutputWeight, "น้ำหนักหลังคั่ว", true),
        roastedOutputUnit: form.roastedOutputUnit,
        expectedLossPercent: parseNumber(form.expectedLossPercent, "Loss ที่คาด", true),
        energyCostPerBatch: parseNumber(form.energyCostPerBatch, "ต้นทุนพลังงานต่อ Batch"),
        laborMinutesPerBatch: parseNumber(form.laborMinutesPerBatch, "เวลาแรงงานต่อ Batch"),
        laborCostPerHour: parseNumber(form.laborCostPerHour, "ค่าแรงต่อชั่วโมง"),
        otherBatchCost: parseNumber(form.otherBatchCost, "ต้นทุน Batch อื่น"),
        retailBagSizeG: parseNumber(form.retailBagSizeG, "ขนาดถุงขาย", true),
        packagingCostPerBag: parseNumber(form.packagingCostPerBag, "ต้นทุน Packaging ต่อถุง"),
        sellingPricePerBag: parseNumber(form.sellingPricePerBag, "ราคาขายต่อถุง"),
        channelFeePercent: parseNumber(form.channelFeePercent, "Channel fee"),
        targetContributionMarginPercent: parseNumber(form.targetContributionMarginPercent, "เป้าหมาย Contribution margin", true),
        batchesPerMonth: parseNumber(form.batchesPerMonth, "จำนวน Batch ต่อเดือน"),
      };
      setCalculation({ input, result: calculateCoffeeRoasting(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณต้นทุนการคั่วกาแฟได้");
    }
  };

  const loadExample = () => {
    setForm(createExampleForm());
    setCalculation(null);
    setError("");
  };

  const clear = () => {
    setForm(createInitialForm());
    setCalculation(null);
    setError("");
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>ข้อมูล Batch, ราคา และ Yield อยู่ใน Browser</AlertTitle>
        <AlertDescription className="leading-6">ไม่มี API รับหรือบันทึกชื่อ Blend, ราคา Supplier, น้ำหนักก่อน/หลังคั่ว หรือต้นทุนโรงคั่ว ข้อมูลจะหายเมื่อรีเฟรชหน้า และ CSV ป้องกันข้อความที่อาจกลายเป็น Spreadsheet formula</AlertDescription>
      </Alert>

      <section aria-labelledby="coffee-roasting-green-title">
        <div>
          <h2 id="coffee-roasting-green-title" className="flex items-center gap-2 font-semibold"><Coffee className="size-4 text-primary" />Green coffee และขนาด Batch</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ราคาซื้อและน้ำหนักรับเข้าฐานเดียวกัน แล้วจัดสรรต้นทุนตามน้ำหนัก Green coffee ที่เข้า Roaster จริง</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="coffee-roasting-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as CoffeeRoastingCurrency)}>
              <SelectTrigger id="coffee-roasting-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ทุกยอดต้องเป็นหน่วยเดียวกัน ไม่มี FX conversion</p>
          </div>
          <div className="grid gap-3 md:col-span-1 xl:col-span-2">
            <Label htmlFor="coffee-roasting-name">ชื่อ Batch / Blend / Roast profile</Label>
            <Input id="coffee-roasting-name" value={form.batchName} maxLength={80} placeholder="เช่น House Blend · Medium Roast" onChange={(event) => updateForm("batchName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้ในสรุปและ CSV เท่านั้น ไม่ถูกส่งไป Server</p>
          </div>
          <NumberField id="coffee-roasting-purchase-cost" label="ราคา Green coffee ที่ซื้อ" value={form.greenPurchaseCost} onChange={(value) => updateForm("greenPurchaseCost", value)} min={0.000001} placeholder="1000" hint="ราคาของน้ำหนักที่ซื้อในช่องถัดไป" />
          <NumberField id="coffee-roasting-purchase-weight" label="น้ำหนัก Green coffee ที่ซื้อ" value={form.greenPurchaseWeight} onChange={(value) => updateForm("greenPurchaseWeight", value)} min={0.000001} placeholder="10" hint="เช่น กระสอบ 60 kg หรือ Lot 10 kg" />
          <MassUnitField id="coffee-roasting-purchase-unit" label="หน่วยน้ำหนักที่ซื้อ" value={form.greenPurchaseUnit} onChange={(value) => updateForm("greenPurchaseUnit", value)} />
          <NumberField id="coffee-roasting-batch-weight" label="น้ำหนัก Green coffee ก่อนคั่ว" value={form.greenBatchWeight} onChange={(value) => updateForm("greenBatchWeight", value)} min={0.000001} placeholder="5" hint="น้ำหนัก Charge ที่ชั่งจริงต่อ Batch" />
          <MassUnitField id="coffee-roasting-batch-unit" label="หน่วยน้ำหนักก่อนคั่ว" value={form.greenBatchUnit} onChange={(value) => updateForm("greenBatchUnit", value)} />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-roasting-output-title">
        <div>
          <h2 id="coffee-roasting-output-title" className="flex items-center gap-2 font-semibold"><Flame className="size-4 text-primary" />น้ำหนักหลังคั่วและ Loss plan</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ชั่งหลังจบรอบและ Cool down ด้วยวิธีที่สม่ำเสมอ ระบบไม่เดาน้ำหนักจากชื่อ Roast level</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <NumberField id="coffee-roasting-output-weight" label="น้ำหนักกาแฟหลังคั่ว" value={form.roastedOutputWeight} onChange={(value) => updateForm("roastedOutputWeight", value)} min={0.000001} placeholder="4.25" hint="ต้องไม่มากกว่าน้ำหนัก Green coffee ก่อนคั่ว" />
          <MassUnitField id="coffee-roasting-output-unit" label="หน่วยน้ำหนักหลังคั่ว" value={form.roastedOutputUnit} onChange={(value) => updateForm("roastedOutputUnit", value)} />
          <NumberField id="coffee-roasting-expected-loss" label="Roast loss ที่คาด (%)" value={form.expectedLossPercent} onChange={(value) => updateForm("expectedLossPercent", value)} min={0} max={99} placeholder="15" hint="เป้าจาก Profile/ประวัติของคุณ ไม่ใช่ Benchmark ที่ระบบกำหนด" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-roasting-operation-title">
        <div>
          <h2 id="coffee-roasting-operation-title" className="flex items-center gap-2 font-semibold"><Timer className="size-4 text-primary" />พลังงาน แรงงาน และต้นทุนต่อ Batch</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกเฉพาะต้นทุนที่สัมพันธ์กับ Batch นี้ หากเป็นค่าเช่าหรือ Depreciation ที่จัดสรรไม่ได้ให้ตรวจในงบต้นทุนแยกต่างหาก</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <NumberField id="coffee-roasting-energy" label="พลังงานต่อ Batch" value={form.energyCostPerBatch} onChange={(value) => updateForm("energyCostPerBatch", value)} placeholder="60" hint="เช่น Gas หรือไฟฟ้าที่วัด/จัดสรรได้" />
          <NumberField id="coffee-roasting-labor-minutes" label="เวลาแรงงานต่อ Batch (นาที)" value={form.laborMinutesPerBatch} onChange={(value) => updateForm("laborMinutesPerBatch", value)} placeholder="30" hint="รวมเตรียม คั่ว Cool down และทำความสะอาดตามขอบเขตที่ใช้" />
          <NumberField id="coffee-roasting-labor-rate" label="ค่าแรงต่อชั่วโมง" value={form.laborCostPerHour} onChange={(value) => updateForm("laborCostPerHour", value)} placeholder="120" hint="ใช้ Total labor cost ตามนโยบายของกิจการ" />
          <NumberField id="coffee-roasting-other-cost" label="ต้นทุน Batch อื่น" value={form.otherBatchCost} onChange={(value) => updateForm("otherBatchCost", value)} placeholder="40" hint="เช่น Sorting, Consumable หรือ QC ที่จัดสรรได้" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-roasting-pricing-title">
        <div>
          <h2 id="coffee-roasting-pricing-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />ถุงขาย ราคา และแผนรายเดือน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">คำนวณจากถุงเต็มเท่านั้น น้ำหนักที่เหลือยังเป็น Inventory และ Contribution ไม่ใช่กำไรสุทธิ</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <NumberField id="coffee-roasting-bag-size" label="ขนาดกาแฟต่อถุงขาย (g)" value={form.retailBagSizeG} onChange={(value) => updateForm("retailBagSizeG", value)} min={0.000001} placeholder="250" hint="ใช้ Net weight ของกาแฟ ไม่รวมน้ำหนักถุง" />
          <NumberField id="coffee-roasting-packaging" label="Packaging ต่อถุง" value={form.packagingCostPerBag} onChange={(value) => updateForm("packagingCostPerBag", value)} placeholder="8" hint="ถุง วาล์ว ฉลาก และกล่องที่ใช้ต่อหน่วยขาย" />
          <NumberField id="coffee-roasting-selling-price" label="ราคาขายต่อถุง (ไม่บังคับ)" value={form.sellingPricePerBag} onChange={(value) => updateForm("sellingPricePerBag", value)} placeholder="160" hint="กรอกเพื่อดู Fee, Contribution และรายได้" />
          <NumberField id="coffee-roasting-channel-fee" label="Payment/Channel fee (%)" value={form.channelFeePercent} onChange={(value) => updateForm("channelFeePercent", value)} min={0} max={100} placeholder="3" hint="ใช้ทั้งตรวจราคาปัจจุบันและหาราคาเป้าหมาย" />
          <NumberField id="coffee-roasting-target-margin" label="เป้าหมาย Contribution margin (%)" value={form.targetContributionMarginPercent} onChange={(value) => updateForm("targetContributionMarginPercent", value)} min={0} max={99} placeholder="30" hint="Margin + Channel fee ต้องต่ำกว่า 100%" />
          <NumberField id="coffee-roasting-monthly-batches" label="จำนวน Batch ต่อเดือน" value={form.batchesPerMonth} onChange={(value) => updateForm("batchesPerMonth", value)} min={0} max={1_000_000} step={1} placeholder="20" hint="ต้องเป็นจำนวนเต็ม ใช้ทำ Scenario ไม่ใช่ Forecast" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-amber-900 text-white hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600" onClick={calculate}><Calculator className="size-4" />คำนวณ Coffee Roasting</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? <CoffeeRoastingResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกราคา Green coffee น้ำหนักก่อน/หลังคั่ว และต้นทุนที่เกี่ยวข้อง</p><p className="mt-1 text-xs">ระบบจะแสดง Roast loss, Yield, ต้นทุนต่อ kg/ถุง ราคาเป้าหมาย และแผนรายเดือน</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>Weight loss ไม่ใช่คะแนนคุณภาพ และ Contribution ไม่ใช่กำไรสุทธิ</AlertTitle>
        <AlertDescription className="leading-6">น้ำหนักที่หายขึ้นกับเมล็ด ความชื้น อุณหภูมิ เวลา Airflow วิธี Cool down และเงื่อนไขการชั่ง จึงไม่ควรใช้ตัวเลขเดียวตัดสิน Roast level หรือรสชาติ ส่วน Contribution ยังไม่หักค่าเช่า Depreciation เครื่องคั่ว การทดสอบ QC ของเสีย ภาษี Promotion และ Overhead ทั้งหมด</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและขอบเขต:</strong> งานวิจัย <a className="font-medium text-primary hover:underline" href="https://www.sciencedirect.com/science/article/abs/pii/S0260877406000239" target="_blank" rel="noreferrer">Heat and mass transfer during coffee batch roasting</a> ใช้น้ำหนักก่อน/หลังคั่วเป็นตัวแปรกระบวนการ; งานทดลองอีกชุดรายงานค่า Light, Medium และ Dark ต่างกันภายใต้เงื่อนไขตัวอย่างเฉพาะ จึงใช้เป็นบริบท ไม่ใช่เกณฑ์ตัดสินสากล; การแปลง g/kg อ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.nist.gov/pml/owm/si-units-mass" target="_blank" rel="noreferrer">NIST SI Units — Mass</a> หากต้องการต้นทุนเมนูกาแฟต่อแก้วใช้ <Link href="/coffee-cost-calculator" className="font-medium text-primary hover:underline">Coffee Cost Calculator</Link> และหากตรวจ Margin จากต้นทุนรวมใช้ <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit &amp; Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
