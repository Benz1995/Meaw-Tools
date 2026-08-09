"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  Download,
  Droplets,
  FlaskConical,
  Info,
  Martini,
  PackageOpen,
  Plus,
  ReceiptText,
  ShieldCheck,
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
  calculateDrinkCost,
  drinkCostCsv,
  DRINK_COST_MAX_INGREDIENTS,
  type DrinkCostCurrency,
  type DrinkCostInput,
  type DrinkCostResult,
  type DrinkCostStatus,
  type DrinkIngredientInput,
  type DrinkVolumeUnit,
} from "@/lib/tools/drink-cost";

type IngredientDraft = {
  id: string;
  name: string;
  purchaseCost: string;
  containerVolume: string;
  containerUnit: DrinkVolumeUnit;
  pourVolume: string;
  pourUnit: DrinkVolumeUnit;
  usableYieldPercent: string;
  abvPercent: string;
};

type DrinkCostForm = {
  currency: DrinkCostCurrency;
  sellingPricePerDrink: string;
  targetPourCostPercent: string;
  extraIngredientCostPerDrink: string;
  packagingCostPerDrink: string;
  laborCostPerDrink: string;
  otherDirectCostPerDrink: string;
  dilutionVolumeMl: string;
  ingredients: IngredientDraft[];
};

const UNITS: Array<{ value: DrinkVolumeUnit; label: string }> = [
  { value: "ml", label: "มิลลิลิตร (ml)" },
  { value: "l", label: "ลิตร (L)" },
  { value: "cl", label: "เซนติลิตร (cl)" },
  { value: "us-fl-oz", label: "US fluid ounce (fl oz)" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const volumeFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const currencyFormatters = new Map<Exclude<DrinkCostCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: DrinkCostCurrency) {
  if (currency === "OTHER") return `${numberFormatter.format(value)} หน่วยเงิน`;
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

function signedMoney(value: number, currency: DrinkCostCurrency) {
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

function createEmptyIngredient(id: string): IngredientDraft {
  return {
    id,
    name: "",
    purchaseCost: "",
    containerVolume: "",
    containerUnit: "ml",
    pourVolume: "",
    pourUnit: "ml",
    usableYieldPercent: "100",
    abvPercent: "0",
  };
}

function createInitialForm(): DrinkCostForm {
  return {
    currency: "THB",
    sellingPricePerDrink: "",
    targetPourCostPercent: "25",
    extraIngredientCostPerDrink: "0",
    packagingCostPerDrink: "0",
    laborCostPerDrink: "0",
    otherDirectCostPerDrink: "0",
    dilutionVolumeMl: "0",
    ingredients: [createEmptyIngredient("drink-cost-ingredient-1"), createEmptyIngredient("drink-cost-ingredient-2")],
  };
}

function createExampleForm(): DrinkCostForm {
  return {
    currency: "THB",
    sellingPricePerDrink: "320",
    targetPourCostPercent: "22",
    extraIngredientCostPerDrink: "4",
    packagingCostPerDrink: "0",
    laborCostPerDrink: "15",
    otherDirectCostPerDrink: "3",
    dilutionVolumeMl: "25",
    ingredients: [
      { id: "drink-cost-ingredient-1", name: "Gin", purchaseCost: "690", containerVolume: "750", containerUnit: "ml", pourVolume: "45", pourUnit: "ml", usableYieldPercent: "98", abvPercent: "40" },
      { id: "drink-cost-ingredient-2", name: "Liqueur", purchaseCost: "520", containerVolume: "700", containerUnit: "ml", pourVolume: "20", pourUnit: "ml", usableYieldPercent: "98", abvPercent: "20" },
      { id: "drink-cost-ingredient-3", name: "น้ำมะนาว", purchaseCost: "120", containerVolume: "1", containerUnit: "l", pourVolume: "25", pourUnit: "ml", usableYieldPercent: "90", abvPercent: "0" },
      { id: "drink-cost-ingredient-4", name: "ไซรัป", purchaseCost: "95", containerVolume: "75", containerUnit: "cl", pourVolume: "15", pourUnit: "ml", usableYieldPercent: "100", abvPercent: "0" },
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

function UnitField({ id, label, value, onChange }: { id: string; label: string; value: DrinkVolumeUnit; onChange: (value: DrinkVolumeUnit) => void }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as DrinkVolumeUnit)}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function IngredientEditor({
  ingredient,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: {
  ingredient: IngredientDraft;
  index: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<IngredientDraft>) => void;
  onRemove: () => void;
}) {
  const prefix = ingredient.id;
  return (
    <fieldset className="rounded-xl border bg-muted/5 p-4 sm:p-5">
      <legend className="sr-only">ของเหลวรายการที่ {index + 1}</legend>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><span className="text-sm font-semibold">ของเหลว/ส่วนผสมที่ริน</span></div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} disabled={!canRemove} aria-label={`ลบของเหลวรายการที่ ${index + 1}`}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-3 sm:col-span-2 xl:col-span-1">
          <Label htmlFor={`${prefix}-name`}>ชื่อของเหลว</Label>
          <Input id={`${prefix}-name`} value={ingredient.name} maxLength={80} placeholder="เช่น Gin หรือน้ำมะนาว" onChange={(event) => onUpdate({ name: event.target.value })} />
          <p className="text-xs leading-5 text-muted-foreground">แสดงในตารางต้นทุนและ CSV เท่านั้น</p>
        </div>
        <NumberField id={`${prefix}-purchase-cost`} label="ราคาขวด/ภาชนะ" value={ingredient.purchaseCost} onChange={(value) => onUpdate({ purchaseCost: value })} placeholder="690" hint="ราคาของปริมาตรเต็มที่กรอก" />
        <NumberField id={`${prefix}-container-volume`} label="ปริมาตรขวด/ภาชนะ" value={ingredient.containerVolume} onChange={(value) => onUpdate({ containerVolume: value })} min={Number.MIN_VALUE} placeholder="750" hint="ดูฉลากหรือปริมาตรที่วัดจริง" />
        <UnitField id={`${prefix}-container-unit`} label="หน่วยขวด/ภาชนะ" value={ingredient.containerUnit} onChange={(value) => onUpdate({ containerUnit: value })} />
        <NumberField id={`${prefix}-pour-volume`} label="ปริมาณรินต่อแก้ว" value={ingredient.pourVolume} onChange={(value) => onUpdate({ pourVolume: value })} min={Number.MIN_VALUE} placeholder="45" hint="ใช้ Jigger หรือสูตรมาตรฐานของร้าน" />
        <UnitField id={`${prefix}-pour-unit`} label="หน่วยที่ริน" value={ingredient.pourUnit} onChange={(value) => onUpdate({ pourUnit: value })} />
        <NumberField id={`${prefix}-yield`} label="Yield ใช้ได้จริง (%)" value={ingredient.usableYieldPercent} onChange={(value) => onUpdate({ usableYieldPercent: value })} min={0.1} max={100} placeholder="100" hint="ลดลงเมื่อมี Spillage หรือใช้ไม่หมดขวด" />
        <NumberField id={`${prefix}-abv`} label="ABV บนฉลาก (%)" value={ingredient.abvPercent} onChange={(value) => onUpdate({ abvPercent: value })} min={0} max={100} placeholder="40" hint="ใส่ 0 สำหรับส่วนผสมไม่มีแอลกอฮอล์" />
      </div>
    </fieldset>
  );
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; testId?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${emphasized ? "border-cyan-600/30 bg-cyan-600/5" : "bg-muted/10"}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function statusText(status: DrinkCostStatus) {
  if (status === "at-or-below-target") return "Pour cost อยู่ในหรือต่ำกว่าเป้าที่กรอก";
  if (status === "above-target") return "Pour cost สูงกว่าเป้าที่กรอก";
  return "ยังไม่ได้กรอกราคาขาย";
}

function DrinkCostResultPanel({ input, result }: { input: DrinkCostInput; result: DrinkCostResult }) {
  const targetMet = result.pourCostStatus === "at-or-below-target";
  const summary = [
    "สรุป Drink, Cocktail & Liquor Cost — Meaw Tools",
    `ของเหลว ${input.ingredients.length} รายการ · ปริมาตรสูตร ${volumeFormatter.format(result.enteredLiquidVolumeMl)} ml`,
    `ต้นทุนของเหลวต่อแก้ว: ${money(result.liquidCostPerDrink, input.currency)}`,
    `ต้นทุนวัตถุดิบเครื่องดื่มต่อแก้ว: ${money(result.beverageIngredientCostPerDrink, input.currency)}`,
    `ต้นทุนตรงรวมต่อแก้ว: ${money(result.totalDirectCostPerDrink, input.currency)}`,
    `ราคาขายจากเป้า Pour cost ${numberFormatter.format(input.targetPourCostPercent)}%: ${money(result.suggestedPricePerDrink, input.currency)}`,
    ...(result.currentPourCostPercent === null ? [] : [
      `ราคาขายปัจจุบัน: ${money(input.sellingPricePerDrink, input.currency)}`,
      `Pour cost ปัจจุบัน: ${numberFormatter.format(result.currentPourCostPercent)}%`,
      `Direct cost ปัจจุบัน: ${numberFormatter.format(result.directCostPercent ?? 0)}%`,
      `Contribution ต่อแก้ว: ${money(result.contributionPerDrink ?? 0, input.currency)}`,
    ]),
    `ABV หลัง Dilution โดยประมาณ: ${numberFormatter.format(result.estimatedAbvPercent)}%`,
    `U.S. standard drink โดยประมาณ: ${numberFormatter.format(result.usStandardDrinkEquivalent)}`,
    "หมายเหตุ: ราคาเป้าหมายใช้ต้นทุนวัตถุดิบเครื่องดื่มเป็นฐาน ส่วน ABV/standard drink เป็นค่าประมาณเพื่อการศึกษา ไม่ใช้ประเมิน BAC การขับขี่ หรือข้อกฎหมาย",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="drink-cost-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="ต้นทุนของเหลวต่อแก้ว" value={money(result.liquidCostPerDrink, input.currency)} detail={`${input.ingredients.length} รายการ`} testId="drink-cost-liquid" />
        <ResultCard label="ต้นทุนวัตถุดิบเครื่องดื่ม" value={money(result.beverageIngredientCostPerDrink, input.currency)} detail="ของเหลว + Garnish/Ice/ของเสริม" testId="drink-cost-beverage" />
        <ResultCard label="ต้นทุนตรงรวมต่อแก้ว" value={money(result.totalDirectCostPerDrink, input.currency)} detail="วัตถุดิบ + Packaging + Labor + Direct cost" testId="drink-cost-direct" />
        <ResultCard label={`ราคาจากเป้า Pour cost ${numberFormatter.format(input.targetPourCostPercent)}%`} value={money(result.suggestedPricePerDrink, input.currency)} detail="เป็นจุดตรวจราคา ไม่ใช่ราคาที่ตลาดรับรอง" emphasized testId="drink-cost-target-price" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="drink-cost-breakdown-title">
          <h2 id="drink-cost-breakdown-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ต้นทุนตรงต่อแก้ว</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">แถบนี้แสดงสัดส่วนจากต้นทุนตรงที่กรอก ไม่ใช่งบกำไรขาดทุนหรือการจัดสรรบัญชีที่รับรองแล้ว</p>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="bg-cyan-700 dark:bg-cyan-400" style={{ width: `${result.liquidShareOfDirectCost}%` }} />
            <span className="bg-lime-600 dark:bg-lime-400" style={{ width: `${result.extraIngredientShareOfDirectCost}%` }} />
            <span className="bg-amber-500" style={{ width: `${result.packagingShareOfDirectCost}%` }} />
            <span className="bg-sky-600 dark:bg-sky-400" style={{ width: `${result.laborShareOfDirectCost}%` }} />
            <span className="bg-violet-600 dark:bg-violet-400" style={{ width: `${result.otherDirectShareOfDirectCost}%` }} />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ของเหลว <small>({numberFormatter.format(result.liquidShareOfDirectCost)}%)</small></span><strong>{money(result.liquidCostPerDrink, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">วัตถุดิบเสริม <small>({numberFormatter.format(result.extraIngredientShareOfDirectCost)}%)</small></span><strong>{money(input.extraIngredientCostPerDrink, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Packaging <small>({numberFormatter.format(result.packagingShareOfDirectCost)}%)</small></span><strong>{money(input.packagingCostPerDrink, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ค่าแรงตรง <small>({numberFormatter.format(result.laborShareOfDirectCost)}%)</small></span><strong>{money(input.laborCostPerDrink, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ต้นทุนตรงอื่น <small>({numberFormatter.format(result.otherDirectShareOfDirectCost)}%)</small></span><strong>{money(input.otherDirectCostPerDrink, input.currency)}</strong></div>
          </div>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="drink-cost-pricing-title">
          <h2 id="drink-cost-pricing-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />ราคาและ Contribution</h2>
          {result.currentPourCostPercent !== null ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className={`rounded-lg border p-3 ${targetMet ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                <p data-testid="drink-cost-status" className="font-medium">{statusText(result.pourCostStatus)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Pour cost <strong data-testid="drink-cost-percent">{numberFormatter.format(result.currentPourCostPercent)}%</strong> · เป้าที่ผู้ใช้กรอก {numberFormatter.format(input.targetPourCostPercent)}%</p>
              </div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ราคาขายต่อแก้ว</span><strong>{money(input.sellingPricePerDrink, input.currency)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Direct cost %</span><strong data-testid="drink-cost-direct-percent">{numberFormatter.format(result.directCostPercent ?? 0)}%</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Contribution ต่อแก้ว</span><strong data-testid="drink-cost-contribution">{money(result.contributionPerDrink ?? 0, input.currency)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Contribution margin</span><strong>{numberFormatter.format(result.contributionMarginPercent ?? 0)}%</strong></div>
              <div className="flex items-center justify-between gap-3 border-t pt-3"><span className="text-muted-foreground">ราคาปัจจุบันเทียบราคาจากเป้า</span><strong className={result.priceGapFromTarget !== null && result.priceGapFromTarget < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}>{signedMoney(result.priceGapFromTarget ?? 0, input.currency)}</strong></div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">กรอกราคาขายต่อแก้วเพื่อดู Pour cost %, Direct cost %, Contribution และส่วนต่างจากราคาตามเป้าหมาย โดยระบบจะไม่เดาราคาตลาดให้เอง</div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="drink-cost-alcohol-title">
        <h2 id="drink-cost-alcohol-title" className="flex items-center gap-2 font-semibold"><FlaskConical className="size-4 text-primary" />ปริมาตรและแอลกอฮอล์โดยประมาณ</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">คำนวณจากปริมาณรินและ ABV ที่กรอก โดยถือว่าปริมาตรรวมกันแบบเส้นตรงและไม่รวมการหดตัว การระเหย หรือของตกค้าง</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResultCard label="ของเหลวที่กรอก" value={`${volumeFormatter.format(result.enteredLiquidVolumeMl)} ml`} />
          <ResultCard label="ปริมาตรเสิร์ฟหลัง Dilution" value={`${volumeFormatter.format(result.servedVolumeMl)} ml`} />
          <ResultCard label="แอลกอฮอล์บริสุทธิ์" value={`${volumeFormatter.format(result.pureAlcoholVolumeMl)} ml`} />
          <ResultCard label="ABV หลัง Dilution" value={`${numberFormatter.format(result.estimatedAbvPercent)}%`} testId="drink-cost-abv" />
          <ResultCard label="U.S. standard drink" value={numberFormatter.format(result.usStandardDrinkEquivalent)} detail="ประมาณการจาก 0.6 US fl oz alcohol" testId="drink-cost-standard-drink" />
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="drink-cost-ingredients-result-title">
        <h2 id="drink-cost-ingredients-result-title" className="flex items-center gap-2 font-semibold"><Droplets className="size-4 text-primary" />ต้นทุนแยกตามของเหลว</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">จำนวนแก้วต่อขวด = ปริมาตรขวด × Yield ÷ ปริมาณริน; ต้นทุนต่อแก้วคิดจากปริมาตรที่ใช้ได้จริงหลัง Yield</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[58rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">ของเหลว</th><th className="pb-3 px-3 font-medium">ปริมาณริน</th><th className="pb-3 px-3 font-medium">Yield</th><th className="pb-3 px-3 font-medium">ABV</th><th className="pb-3 px-3 font-medium">แก้วต่อขวด</th><th className="pb-3 px-3 font-medium">สัดส่วน</th><th className="pb-3 pl-3 font-medium">ต้นทุน</th></tr></thead>
            <tbody className="divide-y">{result.ingredientResults.map((ingredient, index) => (
              <tr key={`${ingredient.name}-${index}`}>
                <th className="py-3 pr-4 text-left font-medium">{ingredient.name}</th>
                <td className="px-3 tabular-nums">{volumeFormatter.format(ingredient.pourVolume)} {ingredient.pourUnit}</td>
                <td className="px-3 tabular-nums">{numberFormatter.format(ingredient.usableYieldPercent)}%</td>
                <td className="px-3 tabular-nums">{numberFormatter.format(ingredient.abvPercent)}%</td>
                <td className="px-3 tabular-nums">{volumeFormatter.format(ingredient.theoreticalDrinksPerContainer)}</td>
                <td className="px-3 tabular-nums">{numberFormatter.format(ingredient.shareOfLiquidCost)}%</td>
                <td className="pl-3 font-semibold tabular-nums">{money(ingredient.lineCost, input.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="drink-cost-formula-title">
        <h2 id="drink-cost-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรที่ใช้และขอบเขต</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ต้นทุนต่อการริน</p><p className="mt-1 text-xs text-muted-foreground">ต้นทุน = ราคาขวด × ปริมาณริน ÷ (ปริมาตรขวด × Yield)</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Pour cost</p><p className="mt-1 text-xs text-muted-foreground">Pour cost % = ต้นทุนวัตถุดิบเครื่องดื่ม ÷ ราคาขาย × 100</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ราคาจากเป้าหมาย</p><p className="mt-1 text-xs text-muted-foreground">ราคา = ต้นทุนวัตถุดิบเครื่องดื่ม ÷ เป้าหมาย Pour cost %</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปต้นทุนเครื่องดื่มแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" onClick={() => downloadText(drinkCostCsv(input, result), "meaw-drink-cocktail-cost.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function DrinkCostCalculatorTool() {
  const nextIngredientId = useRef(3);
  const [form, setForm] = useState<DrinkCostForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: DrinkCostInput; result: DrinkCostResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateForm = <Key extends keyof Omit<DrinkCostForm, "ingredients">>(key: Key, value: DrinkCostForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updateIngredient = (id: string, patch: Partial<IngredientDraft>) => {
    setForm((current) => ({ ...current, ingredients: current.ingredients.map((ingredient) => ingredient.id === id ? { ...ingredient, ...patch } : ingredient) }));
    invalidate();
  };
  const addIngredient = () => {
    if (form.ingredients.length >= DRINK_COST_MAX_INGREDIENTS) {
      setError(`เพิ่มของเหลวได้สูงสุด ${DRINK_COST_MAX_INGREDIENTS} รายการ`);
      return;
    }
    const id = `drink-cost-ingredient-${nextIngredientId.current++}`;
    setForm((current) => ({ ...current, ingredients: [...current.ingredients, createEmptyIngredient(id)] }));
    invalidate();
  };
  const removeIngredient = (id: string) => {
    if (form.ingredients.length <= 1) return;
    setForm((current) => ({ ...current, ingredients: current.ingredients.filter((ingredient) => ingredient.id !== id) }));
    invalidate();
  };

  const calculate = () => {
    try {
      const ingredients: DrinkIngredientInput[] = form.ingredients.map((ingredient, index) => ({
        name: ingredient.name.trim() || `ของเหลว ${index + 1}`,
        purchaseCost: parseNumber(ingredient.purchaseCost, `ราคาซื้อของเหลวรายการที่ ${index + 1}`, true),
        containerVolume: parseNumber(ingredient.containerVolume, `ปริมาตรขวดของเหลวรายการที่ ${index + 1}`, true),
        containerUnit: ingredient.containerUnit,
        pourVolume: parseNumber(ingredient.pourVolume, `ปริมาณรินของเหลวรายการที่ ${index + 1}`, true),
        pourUnit: ingredient.pourUnit,
        usableYieldPercent: parseNumber(ingredient.usableYieldPercent, `Yield ของเหลวรายการที่ ${index + 1}`, true),
        abvPercent: parseNumber(ingredient.abvPercent, `ABV ของเหลวรายการที่ ${index + 1}`, true),
      }));
      const input: DrinkCostInput = {
        currency: form.currency,
        sellingPricePerDrink: parseNumber(form.sellingPricePerDrink, "ราคาขายต่อแก้ว"),
        targetPourCostPercent: parseNumber(form.targetPourCostPercent, "เป้าหมาย Pour cost", true),
        extraIngredientCostPerDrink: parseNumber(form.extraIngredientCostPerDrink, "วัตถุดิบเสริมต่อแก้ว"),
        packagingCostPerDrink: parseNumber(form.packagingCostPerDrink, "บรรจุภัณฑ์ต่อแก้ว"),
        laborCostPerDrink: parseNumber(form.laborCostPerDrink, "ค่าแรงตรงต่อแก้ว"),
        otherDirectCostPerDrink: parseNumber(form.otherDirectCostPerDrink, "ต้นทุนตรงอื่นต่อแก้ว"),
        dilutionVolumeMl: parseNumber(form.dilutionVolumeMl, "น้ำหรือ Dilution ต่อแก้ว"),
        ingredients,
      };
      setCalculation({ input, result: calculateDrinkCost(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณต้นทุนเครื่องดื่มได้");
    }
  };

  const loadExample = () => {
    setForm(createExampleForm());
    nextIngredientId.current = 5;
    setCalculation(null);
    setError("");
  };
  const clear = () => {
    setForm(createInitialForm());
    nextIngredientId.current = 3;
    setCalculation(null);
    setError("");
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>สูตร ราคา และชื่อส่วนผสมอยู่ใน Browser</AlertTitle>
        <AlertDescription className="leading-6">ไม่มี API รับหรือบันทึกราคาขวด สูตร Pour, Yield, ABV หรือราคาขาย ข้อมูลจะหายเมื่อรีเฟรชหน้า และ CSV ป้องกันข้อความที่อาจกลายเป็น Spreadsheet formula</AlertDescription>
      </Alert>

      <section aria-labelledby="drink-cost-settings-title">
        <div>
          <h2 id="drink-cost-settings-title" className="flex items-center gap-2 font-semibold"><Martini className="size-4 text-primary" />ราคาขายและเป้าหมาย Pour cost</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ราคาซื้อกับ Yield ที่เกิดจริง หน่วยเงินเปลี่ยนเฉพาะรูปแบบแสดงผล ไม่มีการแปลงอัตราแลกเปลี่ยน</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="drink-cost-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as DrinkCostCurrency)}>
              <SelectTrigger id="drink-cost-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ทุกยอดต้องใช้หน่วยเดียวกัน</p>
          </div>
          <NumberField id="drink-cost-selling-price" label="ราคาขายต่อแก้ว (ไม่บังคับ)" value={form.sellingPricePerDrink} onChange={(value) => updateForm("sellingPricePerDrink", value)} placeholder="320" hint="ใช้คำนวณ Pour cost และ Contribution ปัจจุบัน" />
          <NumberField id="drink-cost-target" label="เป้าหมาย Pour cost (%)" value={form.targetPourCostPercent} onChange={(value) => updateForm("targetPourCostPercent", value)} min={0.1} max={100} placeholder="25" hint="เป้าหมายของร้าน ไม่ใช่ Benchmark ที่ระบบกำหนด" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="drink-cost-ingredients-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="drink-cost-ingredients-title" className="flex items-center gap-2 font-semibold"><Droplets className="size-4 text-primary" />ของเหลว ปริมาณริน และ Yield</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ ml, L, cl หรือ US fl oz ข้ามกันได้ ระบบแปลงเป็น ml ก่อนคิดต้นทุนและจำนวนแก้วต่อขวด</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{form.ingredients.length}/{DRINK_COST_MAX_INGREDIENTS} รายการ</span>
        </div>
        <div className="mt-5 space-y-4">{form.ingredients.map((ingredient, index) => (
          <IngredientEditor key={ingredient.id} ingredient={ingredient} index={index} canRemove={form.ingredients.length > 1} onUpdate={(patch) => updateIngredient(ingredient.id, patch)} onRemove={() => removeIngredient(ingredient.id)} />
        ))}</div>
        <Button type="button" variant="outline" className="mt-4" onClick={addIngredient} disabled={form.ingredients.length >= DRINK_COST_MAX_INGREDIENTS}><Plus className="size-4" />เพิ่มของเหลว</Button>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="drink-cost-direct-title">
        <div>
          <h2 id="drink-cost-direct-title" className="flex items-center gap-2 font-semibold"><PackageOpen className="size-4 text-primary" />ของเสริม ต้นทุนตรง และ Dilution ต่อแก้ว</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">วัตถุดิบเสริมรวมใน Pour cost ส่วน Packaging, Labor และต้นทุนตรงอื่นแยกไว้เพื่อดู Direct cost โดยไม่ปนคำจำกัดความ</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-5">
          <NumberField id="drink-cost-extra" label="Garnish/Ice/ของเสริม" value={form.extraIngredientCostPerDrink} onChange={(value) => updateForm("extraIngredientCostPerDrink", value)} placeholder="4" hint="ต้นทุนวัตถุดิบเสริมรวมต่อแก้ว" />
          <NumberField id="drink-cost-packaging" label="บรรจุภัณฑ์ต่อแก้ว" value={form.packagingCostPerDrink} onChange={(value) => updateForm("packagingCostPerDrink", value)} placeholder="0" hint="เช่น แก้ว ฝา หลอด หรือถุง" />
          <NumberField id="drink-cost-labor" label="ค่าแรงตรงต่อแก้ว" value={form.laborCostPerDrink} onChange={(value) => updateForm("laborCostPerDrink", value)} placeholder="15" hint="เฉพาะแรงงานที่ต้องการรวมใน Direct cost" />
          <NumberField id="drink-cost-other-direct" label="ต้นทุนตรงอื่นต่อแก้ว" value={form.otherDirectCostPerDrink} onChange={(value) => updateForm("otherDirectCostPerDrink", value)} placeholder="3" hint="เช่น Consumable หรือ Channel fee ที่จัดสรรได้" />
          <NumberField id="drink-cost-dilution" label="น้ำ/Dilution เพิ่ม (ml)" value={form.dilutionVolumeMl} onChange={(value) => updateForm("dilutionVolumeMl", value)} placeholder="25" hint="น้ำหรือ Melted ice เพิ่ม ใช้ประมาณ ABV เท่านั้น" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-cyan-800 text-white hover:bg-cyan-900 dark:bg-cyan-700 dark:hover:bg-cyan-600" onClick={calculate}><Calculator className="size-4" />คำนวณ Drink Cost</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? (
          <DrinkCostResultPanel input={calculation.input} result={calculation.result} />
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกราคาขวด ปริมาตร ปริมาณริน และ Yield ของส่วนผสม</p><p className="mt-1 text-xs">ระบบจะแสดงต้นทุนต่อแก้ว Pour cost, Contribution ราคาจากเป้าหมาย และค่าประมาณ ABV</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>Pour cost ต่ำไม่ได้แปลว่าร้านมีกำไรหรือดื่มได้อย่างปลอดภัย</AlertTitle>
        <AlertDescription className="leading-6">ราคาจากเป้าหมายยังไม่รวมค่าเช่า Utilities, Waste นอก Yield, Promo, VAT, Service charge และต้นทุนแฝงทุกชนิด ส่วน ABV และ U.S. standard drink เป็นเพียงค่าประมาณจากสูตร ไม่ใช่ค่า BAC ไม่ใช้ตัดสินการขับขี่ ปริมาณที่ปลอดภัย หรือข้อกฎหมายในประเทศไทย</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและหน่วย:</strong> สูตร Beverage cost percentage อ้างอิง <a className="font-medium text-primary hover:underline" href="https://resources.escoffier.edu/ge130/dopson/dopson_c05.pdf" target="_blank" rel="noreferrer">Cost Control for the Hospitality Industry</a>; แนวทางคิดราคาค็อกเทลจากต้นทุนส่วนผสมและเป้าหมาย Cost of goods sold อ้างอิง <a className="font-medium text-primary hover:underline" href="https://online.jwu.edu/blog/hospitality-the-cost-of-a-martini/" target="_blank" rel="noreferrer">Johnson &amp; Wales University</a>; การแปลง 1 US fl oz = 29.573 ml อ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.nist.gov/document/f-033pdf" target="_blank" rel="noreferrer">NIST</a>; U.S. standard drink 0.6 fl oz หรือ 14 g แอลกอฮอล์บริสุทธิ์ และข้อจำกัดของ Recipe estimate อ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink" target="_blank" rel="noreferrer">NIAAA</a> หากต้องคำนวณสูตรอาหารใช้ <Link href="/food-cost-calculator" className="font-medium text-primary hover:underline">Food Cost Calculator</Link>; หากต้องกระทบยอดต้นทุนทั้งร้านตามงวดใช้ <Link href="/cost-of-goods-sold-calculator" className="font-medium text-primary hover:underline">COGS Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
