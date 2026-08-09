"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  Coffee,
  CupSoda,
  Download,
  Info,
  Milk,
  PackageOpen,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingBasket,
  Target,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateCoffeeCost,
  coffeeCostCsv,
  COFFEE_COST_MAX_EXTRAS,
  type CoffeeCostCurrency,
  type CoffeeCostInput,
  type CoffeeCostResult,
  type CoffeeCostStatus,
  type CoffeeExtraInput,
  type CoffeeExtraUnit,
  type CoffeeMassUnit,
  type CoffeeVolumeUnit,
} from "@/lib/tools/coffee-cost";

type ExtraDraft = {
  id: string;
  name: string;
  purchaseCost: string;
  purchaseQuantity: string;
  purchaseUnit: CoffeeExtraUnit;
  usagePerCup: string;
  usageUnit: CoffeeExtraUnit;
  usableYieldPercent: string;
};

type CoffeeCostForm = {
  currency: CoffeeCostCurrency;
  drinkName: string;
  sellingPricePerCup: string;
  targetIngredientCostPercent: string;
  cupsPerDay: string;
  operatingDaysPerMonth: string;
  paymentFeePercent: string;
  packagingCostPerCup: string;
  laborCostPerCup: string;
  otherDirectCostPerCup: string;
  beanPurchaseCost: string;
  beanBagWeight: string;
  beanBagUnit: CoffeeMassUnit;
  beanDoseG: string;
  beanUsableYieldPercent: string;
  includeMilk: boolean;
  milkPurchaseCost: string;
  milkContainerVolume: string;
  milkContainerUnit: CoffeeVolumeUnit;
  milkUsageMl: string;
  milkUsableYieldPercent: string;
  extras: ExtraDraft[];
};

const EXTRA_UNITS: Array<{ value: CoffeeExtraUnit; label: string; group: string }> = [
  { value: "g", label: "กรัม (g)", group: "น้ำหนัก" },
  { value: "kg", label: "กิโลกรัม (kg)", group: "น้ำหนัก" },
  { value: "ml", label: "มิลลิลิตร (ml)", group: "ปริมาตร" },
  { value: "l", label: "ลิตร (L)", group: "ปริมาตร" },
  { value: "piece", label: "ชิ้น/หน่วย", group: "จำนวน" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const currencyFormatters = new Map<Exclude<CoffeeCostCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: CoffeeCostCurrency) {
  if (currency === "OTHER") return `${numberFormatter.format(value)} หน่วยเงิน`;
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

function signedMoney(value: number, currency: CoffeeCostCurrency) {
  if (Math.abs(value) < 0.005) return money(0, currency);
  return `${value > 0 ? "+" : "−"}${money(Math.abs(value), currency)}`;
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

function createEmptyExtra(id: string): ExtraDraft {
  return { id, name: "", purchaseCost: "", purchaseQuantity: "", purchaseUnit: "ml", usagePerCup: "", usageUnit: "ml", usableYieldPercent: "100" };
}

function createInitialForm(): CoffeeCostForm {
  return {
    currency: "THB",
    drinkName: "",
    sellingPricePerCup: "",
    targetIngredientCostPercent: "30",
    cupsPerDay: "",
    operatingDaysPerMonth: "30",
    paymentFeePercent: "0",
    packagingCostPerCup: "0",
    laborCostPerCup: "0",
    otherDirectCostPerCup: "0",
    beanPurchaseCost: "",
    beanBagWeight: "",
    beanBagUnit: "kg",
    beanDoseG: "",
    beanUsableYieldPercent: "100",
    includeMilk: true,
    milkPurchaseCost: "",
    milkContainerVolume: "",
    milkContainerUnit: "l",
    milkUsageMl: "",
    milkUsableYieldPercent: "100",
    extras: [],
  };
}

function createExampleForm(): CoffeeCostForm {
  return {
    currency: "THB",
    drinkName: "Iced Latte 16 oz",
    sellingPricePerCup: "95",
    targetIngredientCostPercent: "28",
    cupsPerDay: "80",
    operatingDaysPerMonth: "30",
    paymentFeePercent: "3",
    packagingCostPerCup: "7",
    laborCostPerCup: "12",
    otherDirectCostPerCup: "2",
    beanPurchaseCost: "780",
    beanBagWeight: "1",
    beanBagUnit: "kg",
    beanDoseG: "18",
    beanUsableYieldPercent: "98",
    includeMilk: true,
    milkPurchaseCost: "98",
    milkContainerVolume: "2",
    milkContainerUnit: "l",
    milkUsageMl: "160",
    milkUsableYieldPercent: "95",
    extras: [
      { id: "coffee-cost-extra-1", name: "ไซรัป", purchaseCost: "180", purchaseQuantity: "750", purchaseUnit: "ml", usagePerCup: "15", usageUnit: "ml", usableYieldPercent: "98" },
    ],
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
  disabled = false,
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
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ExtraUnitField({ id, label, value, onChange }: { id: string; label: string; value: CoffeeExtraUnit; onChange: (value: CoffeeExtraUnit) => void }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as CoffeeExtraUnit)}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{EXTRA_UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label} · {unit.group}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function ExtraEditor({ extra, index, onUpdate, onRemove }: { extra: ExtraDraft; index: number; onUpdate: (patch: Partial<ExtraDraft>) => void; onRemove: () => void }) {
  const prefix = extra.id;
  return (
    <fieldset className="rounded-xl border bg-muted/5 p-4 sm:p-5">
      <legend className="sr-only">ส่วนผสมเสริมรายการที่ {index + 1}</legend>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><span className="text-sm font-semibold">ส่วนผสมเสริม</span></div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`ลบส่วนผสมเสริมรายการที่ ${index + 1}`}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-3 sm:col-span-2 xl:col-span-1">
          <Label htmlFor={`${prefix}-name`}>ชื่อส่วนผสม</Label>
          <Input id={`${prefix}-name`} value={extra.name} maxLength={80} placeholder="เช่น ไซรัปหรือผงโกโก้" onChange={(event) => onUpdate({ name: event.target.value })} />
          <p className="text-xs leading-5 text-muted-foreground">แสดงในตารางและ CSV เท่านั้น</p>
        </div>
        <NumberField id={`${prefix}-purchase-cost`} label="ราคาที่ซื้อทั้งแพ็ก" value={extra.purchaseCost} onChange={(value) => onUpdate({ purchaseCost: value })} placeholder="180" hint="ราคาของปริมาณซื้อด้านล่าง" />
        <NumberField id={`${prefix}-purchase-quantity`} label="ปริมาณที่ซื้อ" value={extra.purchaseQuantity} onChange={(value) => onUpdate({ purchaseQuantity: value })} min={Number.MIN_VALUE} placeholder="750" hint="เช่น 750 ml หรือ 1 kg" />
        <ExtraUnitField id={`${prefix}-purchase-unit`} label="หน่วยที่ซื้อ" value={extra.purchaseUnit} onChange={(value) => onUpdate({ purchaseUnit: value })} />
        <NumberField id={`${prefix}-usage`} label="ปริมาณใช้ต่อแก้ว" value={extra.usagePerCup} onChange={(value) => onUpdate({ usagePerCup: value })} min={Number.MIN_VALUE} placeholder="15" hint="ใช้ตาม Standard recipe" />
        <ExtraUnitField id={`${prefix}-usage-unit`} label="หน่วยที่ใช้" value={extra.usageUnit} onChange={(value) => onUpdate({ usageUnit: value })} />
        <NumberField id={`${prefix}-yield`} label="Yield ใช้ได้จริง (%)" value={extra.usableYieldPercent} onChange={(value) => onUpdate({ usableYieldPercent: value })} min={0.1} max={100} placeholder="100" hint="ลดลงเมื่อมีของค้างแพ็กหรือสูญเสีย" />
      </div>
    </fieldset>
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

function statusText(status: CoffeeCostStatus) {
  if (status === "at-or-below-target") return "Ingredient cost อยู่ในหรือต่ำกว่าเป้าที่กรอก";
  if (status === "above-target") return "Ingredient cost สูงกว่าเป้าที่กรอก";
  return "ยังไม่ได้กรอกราคาขาย";
}

function CoffeeCostResultPanel({ input, result }: { input: CoffeeCostInput; result: CoffeeCostResult }) {
  const targetMet = result.ingredientCostStatus === "at-or-below-target";
  const summary = [
    `สรุป Coffee Cost — ${input.drinkName} — Meaw Tools`,
    `เมล็ดต่อแก้ว: ${money(result.beanCostPerCup, input.currency)}`,
    ...(input.includeMilk ? [`นมต่อแก้ว: ${money(result.milkCostPerCup, input.currency)}`] : []),
    `ส่วนผสมเสริมต่อแก้ว: ${money(result.extraCostPerCup, input.currency)}`,
    `ต้นทุนวัตถุดิบรวมต่อแก้ว: ${money(result.ingredientCostPerCup, input.currency)}`,
    `ต้นทุนตรงรวมต่อแก้ว: ${money(result.totalDirectCostPerCup, input.currency)}`,
    `ราคาจากเป้า Ingredient cost ${numberFormatter.format(input.targetIngredientCostPercent)}%: ${money(result.suggestedPricePerCup, input.currency)}`,
    ...(result.ingredientCostPercent === null ? [] : [
      `ราคาขายปัจจุบัน: ${money(input.sellingPricePerCup, input.currency)}`,
      `Ingredient cost ปัจจุบัน: ${numberFormatter.format(result.ingredientCostPercent)}%`,
      `Direct cost ปัจจุบัน: ${numberFormatter.format(result.directCostPercent ?? 0)}%`,
      `Contribution ต่อแก้ว: ${money(result.contributionPerCup ?? 0, input.currency)}`,
    ]),
    ...(result.monthlyCups > 0 ? [
      `แผน ${numberFormatter.format(result.monthlyCups)} แก้ว/เดือน`,
      `เมล็ดประมาณ ${quantityFormatter.format(result.monthlyBeanBags)} ถุง/เดือน`,
      ...(input.includeMilk ? [`นมประมาณ ${quantityFormatter.format(result.monthlyMilkContainers)} ภาชนะ/เดือน`] : []),
    ] : []),
    "หมายเหตุ: ราคาเป้าหมายใช้ต้นทุนวัตถุดิบเป็นฐาน ส่วน Contribution ยังไม่หักค่าเช่า Utilities ภาษี และ Overhead ทั้งหมด",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="coffee-cost-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ResultCard label="ต้นทุนเมล็ดต่อแก้ว" value={money(result.beanCostPerCup, input.currency)} detail={`${quantityFormatter.format(input.beanDoseG)} g ต่อแก้ว`} testId="coffee-cost-bean" />
        <ResultCard label="ต้นทุนนมต่อแก้ว" value={money(result.milkCostPerCup, input.currency)} detail={input.includeMilk ? `${quantityFormatter.format(input.milkUsageMl)} ml ต่อแก้ว` : "เมนูนี้ไม่รวมนม"} testId="coffee-cost-milk" />
        <ResultCard label="ต้นทุนวัตถุดิบรวม" value={money(result.ingredientCostPerCup, input.currency)} detail="เมล็ด + นม + ส่วนผสมเสริม" testId="coffee-cost-ingredient" />
        <ResultCard label="ต้นทุนตรงรวมต่อแก้ว" value={money(result.totalDirectCostPerCup, input.currency)} detail="วัตถุดิบ + Packaging + Labor + Fee" testId="coffee-cost-direct" />
        <ResultCard label={`ราคาจากเป้า ${numberFormatter.format(input.targetIngredientCostPercent)}%`} value={money(result.suggestedPricePerCup, input.currency)} detail="เป็นจุดตรวจราคา ไม่ใช่ราคาที่ตลาดรับรอง" emphasized testId="coffee-cost-target-price" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-cost-breakdown-title">
          <h2 id="coffee-cost-breakdown-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ต้นทุนตรงต่อแก้ว</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">สัดส่วนจากต้นทุนตรงที่กรอก ไม่ใช่งบกำไรขาดทุนหรือการจัดสรรบัญชีที่รับรองแล้ว</p>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="bg-amber-800 dark:bg-amber-500" style={{ width: `${result.beanShareOfDirectCost}%` }} />
            <span className="bg-sky-600 dark:bg-sky-400" style={{ width: `${result.milkShareOfDirectCost}%` }} />
            <span className="bg-lime-600 dark:bg-lime-400" style={{ width: `${result.extraShareOfDirectCost}%` }} />
            <span className="bg-orange-500" style={{ width: `${result.packagingShareOfDirectCost}%` }} />
            <span className="bg-violet-600 dark:bg-violet-400" style={{ width: `${result.laborShareOfDirectCost}%` }} />
            <span className="bg-rose-600 dark:bg-rose-400" style={{ width: `${result.paymentFeeShareOfDirectCost}%` }} />
            <span className="bg-slate-600 dark:bg-slate-400" style={{ width: `${result.otherDirectShareOfDirectCost}%` }} />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">เมล็ด <small>({numberFormatter.format(result.beanShareOfDirectCost)}%)</small></span><strong>{money(result.beanCostPerCup, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">นม <small>({numberFormatter.format(result.milkShareOfDirectCost)}%)</small></span><strong>{money(result.milkCostPerCup, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ส่วนผสมเสริม <small>({numberFormatter.format(result.extraShareOfDirectCost)}%)</small></span><strong>{money(result.extraCostPerCup, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Packaging <small>({numberFormatter.format(result.packagingShareOfDirectCost)}%)</small></span><strong>{money(input.packagingCostPerCup, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ค่าแรงตรง <small>({numberFormatter.format(result.laborShareOfDirectCost)}%)</small></span><strong>{money(input.laborCostPerCup, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Payment/Channel fee <small>({numberFormatter.format(result.paymentFeeShareOfDirectCost)}%)</small></span><strong>{money(result.paymentFeePerCup, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ต้นทุนตรงอื่น <small>({numberFormatter.format(result.otherDirectShareOfDirectCost)}%)</small></span><strong>{money(input.otherDirectCostPerCup, input.currency)}</strong></div>
          </div>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-cost-pricing-title">
          <h2 id="coffee-cost-pricing-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />ราคาและ Contribution</h2>
          {result.ingredientCostPercent !== null ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className={`rounded-lg border p-3 ${targetMet ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                <p data-testid="coffee-cost-status" className="font-medium">{statusText(result.ingredientCostStatus)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Ingredient cost <strong data-testid="coffee-cost-percent">{numberFormatter.format(result.ingredientCostPercent)}%</strong> · เป้าที่ผู้ใช้กรอก {numberFormatter.format(input.targetIngredientCostPercent)}%</p>
              </div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ราคาขายต่อแก้ว</span><strong>{money(input.sellingPricePerCup, input.currency)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Direct cost %</span><strong data-testid="coffee-cost-direct-percent">{numberFormatter.format(result.directCostPercent ?? 0)}%</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Contribution ต่อแก้ว</span><strong data-testid="coffee-cost-contribution">{money(result.contributionPerCup ?? 0, input.currency)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Contribution margin</span><strong>{numberFormatter.format(result.contributionMarginPercent ?? 0)}%</strong></div>
              <div className="flex items-center justify-between gap-3 border-t pt-3"><span className="text-muted-foreground">ราคาปัจจุบันเทียบราคาจากเป้า</span><strong className={result.priceGapFromTarget !== null && result.priceGapFromTarget < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}>{signedMoney(result.priceGapFromTarget ?? 0, input.currency)}</strong></div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">กรอกราคาขายต่อแก้วเพื่อดู Ingredient cost %, Direct cost %, Contribution และค่าธรรมเนียมตามยอดขาย ระบบจะไม่เดาราคาตลาดให้เอง</div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-cost-recipe-title">
        <h2 id="coffee-cost-recipe-title" className="flex items-center gap-2 font-semibold"><Coffee className="size-4 text-primary" />Recipe cost และจำนวนแก้วต่อแพ็ก</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">จำนวนแก้วต่อแพ็กคิดจากปริมาณซื้อ × Yield ÷ ปริมาณใช้ต่อแก้ว จึงเป็นค่าทฤษฎีเมื่อทำตาม Standard recipe</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">ส่วนผสม</th><th className="pb-3 px-3 font-medium">ใช้ต่อแก้ว</th><th className="pb-3 px-3 font-medium">Yield</th><th className="pb-3 px-3 font-medium">แก้วต่อแพ็ก</th><th className="pb-3 pl-3 font-medium">ต้นทุนต่อแก้ว</th></tr></thead>
            <tbody className="divide-y">
              <tr><th className="py-3 pr-4 text-left font-medium">เมล็ดกาแฟ</th><td className="px-3 tabular-nums">{quantityFormatter.format(input.beanDoseG)} g</td><td className="px-3 tabular-nums">{numberFormatter.format(input.beanUsableYieldPercent)}%</td><td className="px-3 tabular-nums">{quantityFormatter.format(result.cupsPerBeanBag)}</td><td className="pl-3 font-semibold tabular-nums">{money(result.beanCostPerCup, input.currency)}</td></tr>
              {input.includeMilk ? <tr><th className="py-3 pr-4 text-left font-medium">นม</th><td className="px-3 tabular-nums">{quantityFormatter.format(input.milkUsageMl)} ml</td><td className="px-3 tabular-nums">{numberFormatter.format(input.milkUsableYieldPercent)}%</td><td className="px-3 tabular-nums">{quantityFormatter.format(result.cupsPerMilkContainer ?? 0)}</td><td className="pl-3 font-semibold tabular-nums">{money(result.milkCostPerCup, input.currency)}</td></tr> : null}
              {result.extraResults.map((extra, index) => <tr key={`${extra.name}-${index}`}><th className="py-3 pr-4 text-left font-medium">{extra.name}</th><td className="px-3 tabular-nums">{quantityFormatter.format(extra.usagePerCup)} {extra.usageUnit}</td><td className="px-3 tabular-nums">{numberFormatter.format(extra.usableYieldPercent)}%</td><td className="px-3 tabular-nums">{quantityFormatter.format(1 / extra.purchasePackEquivalentPerCup)}</td><td className="pl-3 font-semibold tabular-nums">{money(extra.lineCostPerCup, input.currency)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {result.monthlyCups > 0 ? (
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-cost-monthly-title">
          <h2 id="coffee-cost-monthly-title" className="flex items-center gap-2 font-semibold"><ShoppingBasket className="size-4 text-primary" />แผนวัตถุดิบและ Contribution รายเดือน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ประมาณการจากยอดขายเฉลี่ย {numberFormatter.format(input.cupsPerDay)} แก้ว/วัน × {input.operatingDaysPerMonth} วัน โดยถือว่า Product mix และ Standard recipe คงที่ ไม่ใช่ Forecast ยอดขายหรือกำไรสุทธิ</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultCard label="จำนวนแก้วต่อเดือน" value={`${numberFormatter.format(result.monthlyCups)} แก้ว`} testId="coffee-cost-monthly-cups" />
            <ResultCard label="ถุงเมล็ดต่อเดือน" value={`${quantityFormatter.format(result.monthlyBeanBags)} ถุง`} detail={`${quantityFormatter.format(result.monthlyBeanPurchaseG / 1_000)} kg โดยประมาณ`} testId="coffee-cost-monthly-beans" />
            <ResultCard label="ต้นทุนตรงต่อเดือน" value={money(result.monthlyDirectCost, input.currency)} testId="coffee-cost-monthly-direct" />
            <ResultCard label="Contribution ต่อเดือน" value={result.monthlyContribution === null ? "—" : money(result.monthlyContribution, input.currency)} detail="ก่อนค่าเช่า ภาษี และ Overhead" emphasized testId="coffee-cost-monthly-contribution" />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-right text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">วัตถุดิบที่ต้องซื้อ</th><th className="pb-3 px-3 font-medium">ปริมาณฐาน</th><th className="pb-3 pl-3 font-medium">จำนวนแพ็กโดยประมาณ</th></tr></thead>
              <tbody className="divide-y">
                <tr><th className="py-3 pr-4 text-left font-medium">เมล็ดกาแฟ</th><td className="px-3 tabular-nums">{quantityFormatter.format(result.monthlyBeanPurchaseG / 1_000)} kg</td><td className="pl-3 font-semibold tabular-nums">{quantityFormatter.format(result.monthlyBeanBags)} ถุง</td></tr>
                {input.includeMilk ? <tr><th className="py-3 pr-4 text-left font-medium">นม</th><td className="px-3 tabular-nums">{quantityFormatter.format(result.monthlyMilkPurchaseMl / 1_000)} L</td><td className="pl-3 font-semibold tabular-nums">{quantityFormatter.format(result.monthlyMilkContainers)} ภาชนะ</td></tr> : null}
                {result.extraResults.map((extra, index) => <tr key={`monthly-${extra.name}-${index}`}><th className="py-3 pr-4 text-left font-medium">{extra.name}</th><td className="px-3 tabular-nums">{quantityFormatter.format(extra.monthlyPurchaseBaseQuantity)} {extra.baseUnit}</td><td className="pl-3 font-semibold tabular-nums">{quantityFormatter.format(extra.monthlyPurchasePacks)} แพ็ก</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed bg-muted/5 p-4 text-sm leading-6 text-muted-foreground" aria-label="แผนรายเดือนยังไม่พร้อม">กรอกยอดขายเฉลี่ยต่อวันมากกว่า 0 เพื่อดูจำนวนถุงเมล็ด ภาชนะนม ส่วนผสม ต้นทุนตรง และ Contribution รายเดือน</section>
      )}

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="coffee-cost-formula-title">
        <h2 id="coffee-cost-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรที่ใช้และขอบเขต</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ต้นทุนส่วนผสม</p><p className="mt-1 text-xs text-muted-foreground">Cost line = ราคาซื้อ × ปริมาณใช้ ÷ (ปริมาณซื้อ × Yield)</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Ingredient cost</p><p className="mt-1 text-xs text-muted-foreground">Ingredient cost % = ต้นทุนวัตถุดิบต่อแก้ว ÷ ราคาขาย × 100</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ราคาจากเป้าหมาย</p><p className="mt-1 text-xs text-muted-foreground">ราคา = ต้นทุนวัตถุดิบต่อแก้ว ÷ เป้าหมาย Ingredient cost %</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปต้นทุนกาแฟแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" onClick={() => downloadText(coffeeCostCsv(input, result), "meaw-coffee-cost-per-cup.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function CoffeeCostCalculatorTool() {
  const nextExtraId = useRef(1);
  const [form, setForm] = useState<CoffeeCostForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: CoffeeCostInput; result: CoffeeCostResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateForm = <Key extends keyof Omit<CoffeeCostForm, "extras">>(key: Key, value: CoffeeCostForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updateExtra = (id: string, patch: Partial<ExtraDraft>) => {
    setForm((current) => ({ ...current, extras: current.extras.map((extra) => extra.id === id ? { ...extra, ...patch } : extra) }));
    invalidate();
  };
  const addExtra = () => {
    if (form.extras.length >= COFFEE_COST_MAX_EXTRAS) {
      setError(`เพิ่มส่วนผสมเสริมได้สูงสุด ${COFFEE_COST_MAX_EXTRAS} รายการ`);
      return;
    }
    const id = `coffee-cost-extra-${nextExtraId.current++}`;
    setForm((current) => ({ ...current, extras: [...current.extras, createEmptyExtra(id)] }));
    invalidate();
  };
  const removeExtra = (id: string) => {
    setForm((current) => ({ ...current, extras: current.extras.filter((extra) => extra.id !== id) }));
    invalidate();
  };

  const calculate = () => {
    try {
      const extras: CoffeeExtraInput[] = form.extras.map((extra, index) => ({
        name: extra.name.trim() || `ส่วนผสม ${index + 1}`,
        purchaseCost: parseNumber(extra.purchaseCost, `ราคาซื้อส่วนผสมรายการที่ ${index + 1}`, true),
        purchaseQuantity: parseNumber(extra.purchaseQuantity, `ปริมาณซื้อส่วนผสมรายการที่ ${index + 1}`, true),
        purchaseUnit: extra.purchaseUnit,
        usagePerCup: parseNumber(extra.usagePerCup, `ปริมาณใช้ส่วนผสมรายการที่ ${index + 1}`, true),
        usageUnit: extra.usageUnit,
        usableYieldPercent: parseNumber(extra.usableYieldPercent, `Yield ส่วนผสมรายการที่ ${index + 1}`, true),
      }));
      const input: CoffeeCostInput = {
        currency: form.currency,
        drinkName: form.drinkName,
        sellingPricePerCup: parseNumber(form.sellingPricePerCup, "ราคาขายต่อแก้ว"),
        targetIngredientCostPercent: parseNumber(form.targetIngredientCostPercent, "เป้าหมาย Ingredient cost", true),
        cupsPerDay: parseNumber(form.cupsPerDay, "ยอดขายเฉลี่ยต่อวัน"),
        operatingDaysPerMonth: parseNumber(form.operatingDaysPerMonth, "จำนวนวันเปิดร้านต่อเดือน", true),
        paymentFeePercent: parseNumber(form.paymentFeePercent, "ค่าธรรมเนียมตามยอดขาย"),
        packagingCostPerCup: parseNumber(form.packagingCostPerCup, "บรรจุภัณฑ์ต่อแก้ว"),
        laborCostPerCup: parseNumber(form.laborCostPerCup, "ค่าแรงตรงต่อแก้ว"),
        otherDirectCostPerCup: parseNumber(form.otherDirectCostPerCup, "ต้นทุนตรงอื่นต่อแก้ว"),
        beanPurchaseCost: parseNumber(form.beanPurchaseCost, "ราคาเมล็ดต่อถุง", true),
        beanBagWeight: parseNumber(form.beanBagWeight, "น้ำหนักเมล็ดต่อถุง", true),
        beanBagUnit: form.beanBagUnit,
        beanDoseG: parseNumber(form.beanDoseG, "Dose เมล็ดต่อแก้ว", true),
        beanUsableYieldPercent: parseNumber(form.beanUsableYieldPercent, "Yield เมล็ดกาแฟ", true),
        includeMilk: form.includeMilk,
        milkPurchaseCost: form.includeMilk ? parseNumber(form.milkPurchaseCost, "ราคานมต่อภาชนะ", true) : 0,
        milkContainerVolume: form.includeMilk ? parseNumber(form.milkContainerVolume, "ปริมาตรนมต่อภาชนะ", true) : 0,
        milkContainerUnit: form.milkContainerUnit,
        milkUsageMl: form.includeMilk ? parseNumber(form.milkUsageMl, "ปริมาณนมต่อแก้ว", true) : 0,
        milkUsableYieldPercent: form.includeMilk ? parseNumber(form.milkUsableYieldPercent, "Yield นม", true) : 100,
        extras,
      };
      setCalculation({ input, result: calculateCoffeeCost(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณต้นทุนกาแฟได้");
    }
  };

  const loadExample = () => {
    setForm(createExampleForm());
    nextExtraId.current = 2;
    setCalculation(null);
    setError("");
  };
  const clear = () => {
    setForm(createInitialForm());
    nextExtraId.current = 1;
    setCalculation(null);
    setError("");
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>สูตร ราคา และยอดขายอยู่ใน Browser</AlertTitle>
        <AlertDescription className="leading-6">ไม่มี API รับหรือบันทึกราคา Supplier, Recipe, Yield, ยอดขาย หรือค่าธรรมเนียม ข้อมูลจะหายเมื่อรีเฟรชหน้า และ CSV ป้องกันข้อความที่อาจกลายเป็น Spreadsheet formula</AlertDescription>
      </Alert>

      <section aria-labelledby="coffee-cost-settings-title">
        <div>
          <h2 id="coffee-cost-settings-title" className="flex items-center gap-2 font-semibold"><Coffee className="size-4 text-primary" />เมนู ราคา และแผนยอดขาย</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">คำนวณหนึ่งเมนู/ขนาดต่อครั้ง เพื่อไม่ปน Dose, Recipe และ Packaging ระหว่าง Size</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="coffee-cost-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as CoffeeCostCurrency)}>
              <SelectTrigger id="coffee-cost-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ทุกยอดต้องใช้หน่วยเดียวกัน ไม่มี FX conversion</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="coffee-cost-name">ชื่อเมนูและขนาด</Label>
            <Input id="coffee-cost-name" value={form.drinkName} maxLength={80} placeholder="เช่น Iced Latte 16 oz" onChange={(event) => updateForm("drinkName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้ในสรุปและ CSV ไม่ถูกส่งไป Server</p>
          </div>
          <NumberField id="coffee-cost-selling-price" label="ราคาขายต่อแก้ว (ไม่บังคับ)" value={form.sellingPricePerCup} onChange={(value) => updateForm("sellingPricePerCup", value)} placeholder="95" hint="จำเป็นเมื่อมี Payment/Channel fee เป็นเปอร์เซ็นต์" />
          <NumberField id="coffee-cost-target" label="เป้าหมาย Ingredient cost (%)" value={form.targetIngredientCostPercent} onChange={(value) => updateForm("targetIngredientCostPercent", value)} min={0.1} max={100} placeholder="30" hint="เป้าหมายของร้าน ไม่ใช่ Benchmark ที่ระบบกำหนด" />
          <NumberField id="coffee-cost-cups-day" label="ยอดขายเฉลี่ยต่อวัน (ไม่บังคับ)" value={form.cupsPerDay} onChange={(value) => updateForm("cupsPerDay", value)} max={1_000_000} placeholder="80" hint="ใช้วางแผนวัตถุดิบรายเดือน ไม่ใช่ Forecast" />
          <NumberField id="coffee-cost-days-month" label="วันเปิดร้านต่อเดือน" value={form.operatingDaysPerMonth} onChange={(value) => updateForm("operatingDaysPerMonth", value)} min={1} max={31} step={1} placeholder="30" hint="ต้องเป็นจำนวนเต็ม 1–31 วัน" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-cost-bean-title">
        <div>
          <h2 id="coffee-cost-bean-title" className="flex items-center gap-2 font-semibold"><Coffee className="size-4 text-primary" />เมล็ดกาแฟและ Dose ต่อแก้ว</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Dose คือเมล็ด/ผงกาแฟที่ใช้ต่อแก้ว ไม่ใช่น้ำหนัก Espresso beverage ที่สกัดออกมา</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-5">
          <NumberField id="coffee-cost-bean-price" label="ราคาเมล็ดต่อถุง" value={form.beanPurchaseCost} onChange={(value) => updateForm("beanPurchaseCost", value)} min={Number.MIN_VALUE} placeholder="780" hint="ราคาสุทธิของถุงที่ใช้เป็นฐาน" />
          <NumberField id="coffee-cost-bean-weight" label="น้ำหนักเมล็ดต่อถุง" value={form.beanBagWeight} onChange={(value) => updateForm("beanBagWeight", value)} min={Number.MIN_VALUE} placeholder="1" hint="น้ำหนักบนฉลากหรือรับเข้าจริง" />
          <div className="grid gap-3">
            <Label htmlFor="coffee-cost-bean-unit">หน่วยน้ำหนักถุง</Label>
            <Select value={form.beanBagUnit} onValueChange={(value) => updateForm("beanBagUnit", value as CoffeeMassUnit)}>
              <SelectTrigger id="coffee-cost-bean-unit" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="g">กรัม (g)</SelectItem><SelectItem value="kg">กิโลกรัม (kg)</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ระบบแปลง kg เป็น g ก่อนคำนวณ</p>
          </div>
          <NumberField id="coffee-cost-bean-dose" label="Dose เมล็ดต่อแก้ว (g)" value={form.beanDoseG} onChange={(value) => updateForm("beanDoseG", value)} min={Number.MIN_VALUE} placeholder="18" hint="ใช้ค่าจาก Standard recipe ที่ชั่งจริง" />
          <NumberField id="coffee-cost-bean-yield" label="Yield เมล็ดใช้ได้จริง (%)" value={form.beanUsableYieldPercent} onChange={(value) => updateForm("beanUsableYieldPercent", value)} min={0.1} max={100} placeholder="100" hint="ลดลงเมื่อมี Purge, Dial-in, Spill หรือของค้าง" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-cost-milk-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="coffee-cost-milk-title" className="flex items-center gap-2 font-semibold"><Milk className="size-4 text-primary" />นมต่อแก้ว</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ปิดส่วนนี้สำหรับ Espresso, Americano หรือเมนูที่ไม่ใช้นม</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-full border bg-card px-4 py-2 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" checked={form.includeMilk} onChange={(event) => updateForm("includeMilk", event.target.checked)} />
            รวมต้นทุนนม
          </label>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-5">
          <NumberField id="coffee-cost-milk-price" label="ราคานมต่อภาชนะ" value={form.milkPurchaseCost} onChange={(value) => updateForm("milkPurchaseCost", value)} min={Number.MIN_VALUE} placeholder="98" hint="เช่น ราคาต่อขวดหรือกล่อง" disabled={!form.includeMilk} />
          <NumberField id="coffee-cost-milk-volume" label="ปริมาตรนมต่อภาชนะ" value={form.milkContainerVolume} onChange={(value) => updateForm("milkContainerVolume", value)} min={Number.MIN_VALUE} placeholder="2" hint="ปริมาตรบนฉลากหรือรับเข้าจริง" disabled={!form.includeMilk} />
          <div className="grid gap-3">
            <Label htmlFor="coffee-cost-milk-unit">หน่วยภาชนะนม</Label>
            <Select value={form.milkContainerUnit} onValueChange={(value) => updateForm("milkContainerUnit", value as CoffeeVolumeUnit)} disabled={!form.includeMilk}>
              <SelectTrigger id="coffee-cost-milk-unit" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ml">มิลลิลิตร (ml)</SelectItem><SelectItem value="l">ลิตร (L)</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ระบบแปลง L เป็น ml ก่อนคำนวณ</p>
          </div>
          <NumberField id="coffee-cost-milk-usage" label="นมที่ใช้ต่อแก้ว (ml)" value={form.milkUsageMl} onChange={(value) => updateForm("milkUsageMl", value)} min={Number.MIN_VALUE} placeholder="160" hint="รวมปริมาณที่เทใช้ตาม Recipe" disabled={!form.includeMilk} />
          <NumberField id="coffee-cost-milk-yield" label="Yield นมใช้ได้จริง (%)" value={form.milkUsableYieldPercent} onChange={(value) => updateForm("milkUsableYieldPercent", value)} min={0.1} max={100} placeholder="100" hint="ลดลงเมื่อมี Steaming waste หรือของเหลือทิ้ง" disabled={!form.includeMilk} />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-cost-extras-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="coffee-cost-extras-title" className="flex items-center gap-2 font-semibold"><CupSoda className="size-4 text-primary" />ไซรัป ซอส และส่วนผสมเสริม</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">รองรับ g↔kg, ml↔L และชิ้น โดยหน่วยซื้อกับหน่วยใช้ในรายการเดียวกันต้องเป็นประเภทเดียวกัน</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{form.extras.length}/{COFFEE_COST_MAX_EXTRAS} รายการ</span>
        </div>
        {form.extras.length > 0 ? <div className="mt-5 space-y-4">{form.extras.map((extra, index) => <ExtraEditor key={extra.id} extra={extra} index={index} onUpdate={(patch) => updateExtra(extra.id, patch)} onRemove={() => removeExtra(extra.id)} />)}</div> : <div className="mt-5 rounded-xl border border-dashed bg-muted/5 p-4 text-sm leading-6 text-muted-foreground">ไม่มีส่วนผสมเสริม เพิ่มเมื่อเมนูใช้ไซรัป ซอส ผง ท็อปปิง หรือน้ำแข็งที่ต้องการคิดต้นทุนแยก</div>}
        <Button type="button" variant="outline" className="mt-4" onClick={addExtra} disabled={form.extras.length >= COFFEE_COST_MAX_EXTRAS}><Plus className="size-4" />เพิ่มส่วนผสม</Button>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="coffee-cost-direct-title">
        <div>
          <h2 id="coffee-cost-direct-title" className="flex items-center gap-2 font-semibold"><PackageOpen className="size-4 text-primary" />Packaging, Labor และ Channel fee</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">แยกจาก Ingredient cost เพื่อดู Total direct cost และ Contribution โดยไม่ปนนิยามต้นทุนวัตถุดิบ</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <NumberField id="coffee-cost-packaging" label="แก้ว/ฝา/หลอดต่อแก้ว" value={form.packagingCostPerCup} onChange={(value) => updateForm("packagingCostPerCup", value)} placeholder="7" hint="รวม Packaging ที่ใช้ต่อหน่วยขาย" />
          <NumberField id="coffee-cost-labor" label="ค่าแรงตรงต่อแก้ว" value={form.laborCostPerCup} onChange={(value) => updateForm("laborCostPerCup", value)} placeholder="12" hint="ใช้ค่าที่ร้านจัดสรรจากเวลาทำงานจริง" />
          <NumberField id="coffee-cost-fee" label="Payment/Channel fee (%)" value={form.paymentFeePercent} onChange={(value) => updateForm("paymentFeePercent", value)} min={0} max={100} placeholder="3" hint="คิดจากราคาขาย จึงต้องกรอกราคาขายเมื่อมากกว่า 0" />
          <NumberField id="coffee-cost-other-direct" label="ต้นทุนตรงอื่นต่อแก้ว" value={form.otherDirectCostPerCup} onChange={(value) => updateForm("otherDirectCostPerCup", value)} placeholder="2" hint="เช่น Consumable หรือพลังงานที่จัดสรรได้" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-amber-900 text-white hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600" onClick={calculate}><Calculator className="size-4" />คำนวณ Coffee Cost</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? <CoffeeCostResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกเมนู ราคาเมล็ด Dose นม และต้นทุนที่เกี่ยวข้อง</p><p className="mt-1 text-xs">ระบบจะแสดง Cost per cup, Ingredient cost, Contribution ราคาเป้าหมาย และแผนวัตถุดิบรายเดือน</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>Contribution ไม่ใช่กำไรสุทธิ และแผนรายเดือนไม่ใช่ Forecast</AlertTitle>
        <AlertDescription className="leading-6">ราคาจาก Target ingredient cost ยังไม่รับรองว่าครอบคลุมค่าเช่า Utilities, Depreciation เครื่องชง, Waste นอก Yield, Promotion, Delivery fee, VAT, ภาษี และ Overhead ทั้งหมด แผนรายเดือนถือว่ายอดขาย Product mix และ Recipe คงที่ จึงต้องเทียบกับยอดขายและ Inventory จริง</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและขอบเขต:</strong> แนวคิด AP/EP, Yield, Standardized recipe และ Portion cost อ้างอิง <a className="font-medium text-primary hover:underline" href="https://resources.escoffier.edu/ge130/dopson/dopson_c05.pdf" target="_blank" rel="noreferrer">Cost Control for the Hospitality Industry</a>; การแยก Ground coffee dose จาก Espresso beverage ratio อ้างอิง <a className="font-medium text-primary hover:underline" href="https://sca.coffee/sca-news/25/issue-9/english/water-and-coffee-acidity-how-to-adapt-your-water-for-different-extraction-methods-25-magazine-issue-9-pxjby" target="_blank" rel="noreferrer">Specialty Coffee Association</a>; หน่วย g/kg และ ml/L อ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.nist.gov/pml/owm/si-units-volume" target="_blank" rel="noreferrer">NIST SI Units</a> หากต้องคำนวณอาหารหรือ Batch recipe ใช้ <Link href="/food-cost-calculator" className="font-medium text-primary hover:underline">Food Cost Calculator</Link>; หากเป็นเครื่องดื่มจาก Bottle/Pour ใช้ <Link href="/drink-cost-calculator" className="font-medium text-primary hover:underline">Drink Cost Calculator</Link>; หากต้องการตรวจ Margin หลังต้นทุนทั้งหมดใช้ <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit &amp; Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
