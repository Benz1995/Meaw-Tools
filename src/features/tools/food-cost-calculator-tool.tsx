"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  ChefHat,
  ClipboardList,
  Download,
  Info,
  PackageOpen,
  Plus,
  ReceiptText,
  Scale,
  ShieldCheck,
  Target,
  Trash2,
  TriangleAlert,
  UtensilsCrossed,
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
  calculateFoodCost,
  foodCostCsv,
  FOOD_COST_MAX_INGREDIENTS,
  type FoodCostCurrency,
  type FoodCostIngredientInput,
  type FoodCostInput,
  type FoodCostResult,
  type FoodCostStatus,
  type FoodCostUnit,
} from "@/lib/tools/food-cost";

type IngredientDraft = {
  id: string;
  name: string;
  purchaseCost: string;
  purchaseQuantity: string;
  purchaseUnit: FoodCostUnit;
  recipeQuantity: string;
  recipeUnit: FoodCostUnit;
  yieldPercent: string;
};

type FoodCostForm = {
  currency: FoodCostCurrency;
  servings: string;
  sellingPricePerServing: string;
  targetFoodCostPercent: string;
  packagingPerServing: string;
  laborPerBatch: string;
  otherDirectCostPerBatch: string;
  ingredients: IngredientDraft[];
};

const UNITS: Array<{ value: FoodCostUnit; label: string; group: string }> = [
  { value: "g", label: "กรัม (g)", group: "น้ำหนัก" },
  { value: "kg", label: "กิโลกรัม (kg)", group: "น้ำหนัก" },
  { value: "ml", label: "มิลลิลิตร (ml)", group: "ปริมาตร" },
  { value: "l", label: "ลิตร (L)", group: "ปริมาตร" },
  { value: "piece", label: "ชิ้น/ฟอง/หน่วย", group: "จำนวน" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const quantityFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const currencyFormatters = new Map<Exclude<FoodCostCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: FoodCostCurrency) {
  if (currency === "OTHER") return `${numberFormatter.format(value)} หน่วยเงิน`;
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

function signedMoney(value: number, currency: FoodCostCurrency) {
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
  return { id, name: "", purchaseCost: "", purchaseQuantity: "", purchaseUnit: "g", recipeQuantity: "", recipeUnit: "g", yieldPercent: "100" };
}

function createInitialForm(): FoodCostForm {
  return {
    currency: "THB",
    servings: "",
    sellingPricePerServing: "",
    targetFoodCostPercent: "30",
    packagingPerServing: "0",
    laborPerBatch: "0",
    otherDirectCostPerBatch: "0",
    ingredients: [createEmptyIngredient("food-cost-ingredient-1"), createEmptyIngredient("food-cost-ingredient-2")],
  };
}

function createExampleForm(): FoodCostForm {
  return {
    currency: "THB",
    servings: "8",
    sellingPricePerServing: "89",
    targetFoodCostPercent: "28",
    packagingPerServing: "5",
    laborPerBatch: "120",
    otherDirectCostPerBatch: "40",
    ingredients: [
      { id: "food-cost-ingredient-1", name: "แป้ง", purchaseCost: "180", purchaseQuantity: "5", purchaseUnit: "kg", recipeQuantity: "600", recipeUnit: "g", yieldPercent: "100" },
      { id: "food-cost-ingredient-2", name: "ไก่", purchaseCost: "240", purchaseQuantity: "2", purchaseUnit: "kg", recipeQuantity: "800", recipeUnit: "g", yieldPercent: "80" },
      { id: "food-cost-ingredient-3", name: "ไข่", purchaseCost: "90", purchaseQuantity: "30", purchaseUnit: "piece", recipeQuantity: "5", recipeUnit: "piece", yieldPercent: "100" },
      { id: "food-cost-ingredient-4", name: "ซอส", purchaseCost: "85", purchaseQuantity: "1", purchaseUnit: "l", recipeQuantity: "120", recipeUnit: "ml", yieldPercent: "100" },
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

function UnitField({ id, label, value, onChange }: { id: string; label: string; value: FoodCostUnit; onChange: (value: FoodCostUnit) => void }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as FoodCostUnit)}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label} · {unit.group}</SelectItem>)}</SelectContent>
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
      <legend className="sr-only">วัตถุดิบรายการที่ {index + 1}</legend>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><span className="text-sm font-semibold">วัตถุดิบ</span></div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} disabled={!canRemove} aria-label={`ลบวัตถุดิบรายการที่ ${index + 1}`}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-3 sm:col-span-2 xl:col-span-1">
          <Label htmlFor={`${prefix}-name`}>ชื่อวัตถุดิบ</Label>
          <Input id={`${prefix}-name`} value={ingredient.name} maxLength={80} placeholder="เช่น อกไก่" onChange={(event) => onUpdate({ name: event.target.value })} />
          <p className="text-xs leading-5 text-muted-foreground">ใช้ในตารางต้นทุนและ CSV เท่านั้น</p>
        </div>
        <NumberField id={`${prefix}-purchase-cost`} label="ราคาที่ซื้อทั้งแพ็ก" value={ingredient.purchaseCost} onChange={(value) => onUpdate({ purchaseCost: value })} placeholder="240" hint="ราคาของปริมาณที่ซื้อด้านล่าง" />
        <NumberField id={`${prefix}-purchase-quantity`} label="ปริมาณที่ซื้อ" value={ingredient.purchaseQuantity} onChange={(value) => onUpdate({ purchaseQuantity: value })} min={Number.MIN_VALUE} placeholder="2" hint="เช่น 2 kg หรือ 30 ชิ้น" />
        <UnitField id={`${prefix}-purchase-unit`} label="หน่วยที่ซื้อ" value={ingredient.purchaseUnit} onChange={(value) => onUpdate({ purchaseUnit: value })} />
        <NumberField id={`${prefix}-recipe-quantity`} label="ปริมาณใช้ได้จริงในสูตร" value={ingredient.recipeQuantity} onChange={(value) => onUpdate({ recipeQuantity: value })} min={Number.MIN_VALUE} placeholder="800" hint="ปริมาณหลังปอก ตัดแต่ง หรือเตรียม" />
        <UnitField id={`${prefix}-recipe-unit`} label="หน่วยที่สูตรใช้" value={ingredient.recipeUnit} onChange={(value) => onUpdate({ recipeUnit: value })} />
        <NumberField id={`${prefix}-yield`} label="Yield ใช้ได้จริง (%)" value={ingredient.yieldPercent} onChange={(value) => onUpdate({ yieldPercent: value })} min={0.1} max={100} placeholder="100" hint="100% หากใช้ได้ทั้งหมด; ต่ำลงเมื่อมีเปลือก/เศษ/สูญเสีย" />
      </div>
    </fieldset>
  );
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; testId?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${emphasized ? "border-orange-500/30 bg-orange-500/5" : "bg-muted/10"}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function statusText(status: FoodCostStatus) {
  if (status === "at-or-below-target") return "Food cost อยู่ในหรือต่ำกว่าเป้าที่กรอก";
  if (status === "above-target") return "Food cost สูงกว่าเป้าที่กรอก";
  return "ยังไม่ได้กรอกราคาขาย";
}

function FoodCostResultPanel({ input, result }: { input: FoodCostInput; result: FoodCostResult }) {
  const targetMet = result.foodCostStatus === "at-or-below-target";
  const summary = [
    "สรุป Food Cost & Recipe Cost — Meaw Tools",
    `วัตถุดิบ ${input.ingredients.length} รายการ · ${input.servings} เสิร์ฟ`,
    `ต้นทุนวัตถุดิบต่อสูตร: ${money(result.ingredientCostPerBatch, input.currency)}`,
    `ต้นทุนวัตถุดิบต่อเสิร์ฟ: ${money(result.ingredientCostPerServing, input.currency)}`,
    `ต้นทุนตรงรวมต่อเสิร์ฟ: ${money(result.totalDirectCostPerServing, input.currency)}`,
    `ราคาขายจากเป้า Food cost ${numberFormatter.format(input.targetFoodCostPercent)}%: ${money(result.suggestedPricePerServing, input.currency)}`,
    ...(result.foodCostPercent === null ? [] : [
      `ราคาขายปัจจุบัน: ${money(input.sellingPricePerServing, input.currency)}`,
      `Food cost ปัจจุบัน: ${numberFormatter.format(result.foodCostPercent)}%`,
      `Direct cost ปัจจุบัน: ${numberFormatter.format(result.directCostPercent ?? 0)}%`,
      `Contribution ต่อเสิร์ฟ: ${money(result.contributionPerServing ?? 0, input.currency)}`,
    ]),
    "หมายเหตุ: ราคาจากเป้า Food cost ใช้เฉพาะต้นทุนวัตถุดิบ ไม่รับประกันว่าครอบคลุมค่าแรง ค่าเช่า ภาษี ค่าธรรมเนียม หรือกำไรที่ต้องการ",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="food-cost-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="ต้นทุนวัตถุดิบต่อสูตร" value={money(result.ingredientCostPerBatch, input.currency)} detail={`${input.ingredients.length} รายการ`} testId="food-cost-batch" />
        <ResultCard label="ต้นทุนวัตถุดิบต่อเสิร์ฟ" value={money(result.ingredientCostPerServing, input.currency)} detail={`${input.servings} เสิร์ฟต่อสูตร`} testId="food-cost-serving" />
        <ResultCard label="ต้นทุนตรงรวมต่อเสิร์ฟ" value={money(result.totalDirectCostPerServing, input.currency)} detail="วัตถุดิบ + Packaging + Labor + Direct cost" testId="food-cost-direct-serving" />
        <ResultCard label={`ราคาจากเป้า Food cost ${numberFormatter.format(input.targetFoodCostPercent)}%`} value={money(result.suggestedPricePerServing, input.currency)} detail="เป็นจุดตรวจราคา ไม่ใช่ราคาที่ตลาดรับรอง" emphasized testId="food-cost-target-price" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="food-cost-breakdown-title">
          <h2 id="food-cost-breakdown-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ต้นทุนตรงต่อสูตร</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">แถบแสดงสัดส่วนจากต้นทุนตรงที่กรอก ไม่ใช่งบกำไรขาดทุนหรือการจัดสรรบัญชีแบบรับรอง</p>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="bg-emerald-700 dark:bg-emerald-400" style={{ width: `${result.ingredientShareOfDirectCost}%` }} />
            <span className="bg-amber-500" style={{ width: `${result.packagingShareOfDirectCost}%` }} />
            <span className="bg-sky-600 dark:bg-sky-400" style={{ width: `${result.laborShareOfDirectCost}%` }} />
            <span className="bg-violet-600 dark:bg-violet-400" style={{ width: `${result.otherDirectShareOfDirectCost}%` }} />
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">วัตถุดิบ <small>({numberFormatter.format(result.ingredientShareOfDirectCost)}%)</small></span><strong>{money(result.ingredientCostPerBatch, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Packaging <small>({numberFormatter.format(result.packagingShareOfDirectCost)}%)</small></span><strong>{money(result.packagingCostPerBatch, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ค่าแรงตรง <small>({numberFormatter.format(result.laborShareOfDirectCost)}%)</small></span><strong>{money(input.laborPerBatch, input.currency)}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ต้นทุนตรงอื่น <small>({numberFormatter.format(result.otherDirectShareOfDirectCost)}%)</small></span><strong>{money(input.otherDirectCostPerBatch, input.currency)}</strong></div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4 font-semibold"><span>ต้นทุนตรงรวมต่อสูตร</span><span data-testid="food-cost-direct-batch" className="tabular-nums">{money(result.totalDirectCostPerBatch, input.currency)}</span></div>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="food-cost-pricing-title">
          <h2 id="food-cost-pricing-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />ราคาและ Contribution</h2>
          {result.foodCostPercent !== null ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className={`rounded-lg border p-3 ${targetMet ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                <p data-testid="food-cost-status" className="font-medium">{statusText(result.foodCostStatus)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Food cost <strong data-testid="food-cost-percent">{numberFormatter.format(result.foodCostPercent)}%</strong> · เป้าที่ผู้ใช้กรอก {numberFormatter.format(input.targetFoodCostPercent)}%</p>
              </div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">ราคาขายต่อเสิร์ฟ</span><strong>{money(input.sellingPricePerServing, input.currency)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Direct cost %</span><strong data-testid="food-cost-direct-percent">{numberFormatter.format(result.directCostPercent ?? 0)}%</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Contribution ต่อเสิร์ฟ</span><strong data-testid="food-cost-contribution">{money(result.contributionPerServing ?? 0, input.currency)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Contribution margin</span><strong>{numberFormatter.format(result.contributionMarginPercent ?? 0)}%</strong></div>
              <div className="flex items-center justify-between gap-3 border-t pt-3"><span className="text-muted-foreground">ราคาปัจจุบันเทียบราคาจากเป้า</span><strong className={result.currentPriceGapFromTarget !== null && result.currentPriceGapFromTarget < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}>{signedMoney(result.currentPriceGapFromTarget ?? 0, input.currency)}</strong></div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">กรอกราคาขายต่อเสิร์ฟเพื่อดู Food cost %, Direct cost %, Contribution และส่วนต่างจากราคาตามเป้าหมาย โดยระบบจะไม่เดาราคาตลาดให้เอง</div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="food-cost-ingredients-result-title">
        <h2 id="food-cost-ingredients-result-title" className="flex items-center gap-2 font-semibold"><Scale className="size-4 text-primary" />ต้นทุนแยกตามวัตถุดิบ</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">AP ที่ต้องใช้ = ปริมาณใช้ได้จริง ÷ Yield; ต้นทุนรายการคิดจากสัดส่วนของแพ็กซื้อหลังปรับ Yield</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">วัตถุดิบ</th><th className="pb-3 px-3 font-medium">ใช้ในสูตร</th><th className="pb-3 px-3 font-medium">Yield</th><th className="pb-3 px-3 font-medium">AP ที่ต้องใช้</th><th className="pb-3 px-3 font-medium">สัดส่วน</th><th className="pb-3 pl-3 font-medium">ต้นทุน</th></tr></thead>
            <tbody className="divide-y">{result.ingredientResults.map((ingredient, index) => (
              <tr key={`${ingredient.name}-${index}`}>
                <th className="py-3 pr-4 text-left font-medium">{ingredient.name}</th>
                <td className="px-3 tabular-nums">{quantityFormatter.format(ingredient.recipeQuantity)} {ingredient.recipeUnit}</td>
                <td className="px-3 tabular-nums">{numberFormatter.format(ingredient.yieldPercent)}%</td>
                <td className="px-3 tabular-nums">{quantityFormatter.format(ingredient.asPurchasedBaseQuantityNeeded)} {ingredient.baseUnit}</td>
                <td className="px-3 tabular-nums">{numberFormatter.format(ingredient.shareOfIngredientCost)}%</td>
                <td className="pl-3 font-semibold tabular-nums">{money(ingredient.lineCost, input.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="food-cost-formula-title">
        <h2 id="food-cost-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรที่ใช้และขอบเขต</h2>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ต้นทุนวัตถุดิบ</p><p className="mt-1 text-xs text-muted-foreground">Cost line = ราคาซื้อ × ปริมาณใช้ได้จริง ÷ (ปริมาณซื้อ × Yield)</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">Food cost ต่อเมนู</p><p className="mt-1 text-xs text-muted-foreground">Food cost % = ต้นทุนวัตถุดิบต่อเสิร์ฟ ÷ ราคาขายต่อเสิร์ฟ × 100</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ราคาจากเป้าหมาย</p><p className="mt-1 text-xs text-muted-foreground">ราคา = ต้นทุนวัตถุดิบต่อเสิร์ฟ ÷ เป้าหมาย Food cost %</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุป Food cost แล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" onClick={() => downloadText(foodCostCsv(input, result), "meaw-food-recipe-cost.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function FoodCostCalculatorTool() {
  const nextIngredientId = useRef(3);
  const [form, setForm] = useState<FoodCostForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: FoodCostInput; result: FoodCostResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateForm = <Key extends keyof Omit<FoodCostForm, "ingredients">>(key: Key, value: FoodCostForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updateIngredient = (id: string, patch: Partial<IngredientDraft>) => {
    setForm((current) => ({ ...current, ingredients: current.ingredients.map((ingredient) => ingredient.id === id ? { ...ingredient, ...patch } : ingredient) }));
    invalidate();
  };
  const addIngredient = () => {
    if (form.ingredients.length >= FOOD_COST_MAX_INGREDIENTS) {
      setError(`เพิ่มวัตถุดิบได้สูงสุด ${FOOD_COST_MAX_INGREDIENTS} รายการ`);
      return;
    }
    const id = `food-cost-ingredient-${nextIngredientId.current++}`;
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
      const ingredients: FoodCostIngredientInput[] = form.ingredients.map((ingredient, index) => ({
        name: ingredient.name.trim() || `วัตถุดิบ ${index + 1}`,
        purchaseCost: parseNumber(ingredient.purchaseCost, `ราคาซื้อวัตถุดิบรายการที่ ${index + 1}`, true),
        purchaseQuantity: parseNumber(ingredient.purchaseQuantity, `ปริมาณซื้อวัตถุดิบรายการที่ ${index + 1}`, true),
        purchaseUnit: ingredient.purchaseUnit,
        recipeQuantity: parseNumber(ingredient.recipeQuantity, `ปริมาณใช้วัตถุดิบรายการที่ ${index + 1}`, true),
        recipeUnit: ingredient.recipeUnit,
        yieldPercent: parseNumber(ingredient.yieldPercent, `Yield วัตถุดิบรายการที่ ${index + 1}`, true),
      }));
      const input: FoodCostInput = {
        currency: form.currency,
        servings: parseNumber(form.servings, "จำนวนเสิร์ฟ", true),
        sellingPricePerServing: parseNumber(form.sellingPricePerServing, "ราคาขายต่อเสิร์ฟ"),
        targetFoodCostPercent: parseNumber(form.targetFoodCostPercent, "เป้าหมาย Food cost", true),
        packagingPerServing: parseNumber(form.packagingPerServing, "บรรจุภัณฑ์ต่อเสิร์ฟ"),
        laborPerBatch: parseNumber(form.laborPerBatch, "ค่าแรงตรงต่อสูตร"),
        otherDirectCostPerBatch: parseNumber(form.otherDirectCostPerBatch, "ต้นทุนตรงอื่นต่อสูตร"),
        ingredients,
      };
      setCalculation({ input, result: calculateFoodCost(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณ Food cost ได้");
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
        <AlertTitle>สูตร ราคา และรายชื่อวัตถุดิบอยู่ใน Browser</AlertTitle>
        <AlertDescription className="leading-6">ไม่มี API รับหรือบันทึก Recipe, Supplier price, Yield หรือราคาขาย ข้อมูลจะหายเมื่อรีเฟรชหน้า และ CSV ถูกป้องกันข้อความที่อาจกลายเป็น Spreadsheet formula</AlertDescription>
      </Alert>

      <section aria-labelledby="food-cost-settings-title">
        <div>
          <h2 id="food-cost-settings-title" className="flex items-center gap-2 font-semibold"><ChefHat className="size-4 text-primary" />สูตร จำนวนเสิร์ฟ และเป้าหมายราคา</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ราคาซื้อและ Yield ที่เกิดจริง หน่วยเงินเปลี่ยนเฉพาะรูปแบบแสดงผล ไม่มีการแปลงอัตราแลกเปลี่ยน</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3">
            <Label htmlFor="food-cost-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as FoodCostCurrency)}>
              <SelectTrigger id="food-cost-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ทุกยอดต้องใช้หน่วยเดียวกัน</p>
          </div>
          <NumberField id="food-cost-servings" label="จำนวนเสิร์ฟที่สูตรทำได้" value={form.servings} onChange={(value) => updateForm("servings", value)} min={1} max={1_000_000} step={1} placeholder="8" hint="ใช้หารต้นทุนต่อเสิร์ฟ ต้องเป็นจำนวนเต็ม" />
          <NumberField id="food-cost-selling-price" label="ราคาขายต่อเสิร์ฟ (ไม่บังคับ)" value={form.sellingPricePerServing} onChange={(value) => updateForm("sellingPricePerServing", value)} placeholder="89" hint="ใช้คำนวณ Food cost และ Contribution ปัจจุบัน" />
          <NumberField id="food-cost-target" label="เป้าหมาย Food cost (%)" value={form.targetFoodCostPercent} onChange={(value) => updateForm("targetFoodCostPercent", value)} min={0.1} max={100} placeholder="30" hint="เป้าหมายของร้าน ไม่ใช่ Benchmark ที่ระบบกำหนด" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="food-cost-ingredients-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="food-cost-ingredients-title" className="flex items-center gap-2 font-semibold"><UtensilsCrossed className="size-4 text-primary" />วัตถุดิบและ Yield</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ปริมาณซื้อกับปริมาณใช้เปลี่ยนหน่วย g↔kg หรือ ml↔L ได้ แต่ห้ามผสมน้ำหนัก ปริมาตร และจำนวนในรายการเดียว</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{form.ingredients.length}/{FOOD_COST_MAX_INGREDIENTS} รายการ</span>
        </div>
        <div className="mt-5 space-y-4">{form.ingredients.map((ingredient, index) => (
          <IngredientEditor key={ingredient.id} ingredient={ingredient} index={index} canRemove={form.ingredients.length > 1} onUpdate={(patch) => updateIngredient(ingredient.id, patch)} onRemove={() => removeIngredient(ingredient.id)} />
        ))}</div>
        <Button type="button" variant="outline" className="mt-4" onClick={addIngredient} disabled={form.ingredients.length >= FOOD_COST_MAX_INGREDIENTS}><Plus className="size-4" />เพิ่มวัตถุดิบ</Button>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="food-cost-direct-title">
        <div>
          <h2 id="food-cost-direct-title" className="flex items-center gap-2 font-semibold"><PackageOpen className="size-4 text-primary" />ต้นทุนตรงนอกวัตถุดิบ</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">แยกไว้เพื่อดู Direct cost และ Contribution โดยไม่ปนเข้า Food cost % ของวัตถุดิบ</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="food-cost-packaging" label="บรรจุภัณฑ์ต่อเสิร์ฟ" value={form.packagingPerServing} onChange={(value) => updateForm("packagingPerServing", value)} placeholder="5" hint="เช่น กล่อง ถุง ช้อน หรือแก้วต่อหน่วยขาย" />
          <NumberField id="food-cost-labor" label="ค่าแรงตรงต่อสูตร/Batch" value={form.laborPerBatch} onChange={(value) => updateForm("laborPerBatch", value)} placeholder="120" hint="เฉพาะแรงงานที่ต้องการรวมใน Direct cost ของสูตรนี้" />
          <NumberField id="food-cost-other-direct" label="ต้นทุนตรงอื่นต่อสูตร/Batch" value={form.otherDirectCostPerBatch} onChange={(value) => updateForm("otherDirectCostPerBatch", value)} placeholder="40" hint="เช่น พลังงานหรือ Consumable ที่จัดสรรอย่างมีหลักฐาน" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-orange-800 text-white hover:bg-orange-900 dark:bg-orange-700 dark:hover:bg-orange-600" onClick={calculate}><Calculator className="size-4" />คำนวณ Food Cost</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? (
          <FoodCostResultPanel input={calculation.input} result={calculation.result} />
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกราคาซื้อ ปริมาณที่ซื้อ ปริมาณใช้ และ Yield ของวัตถุดิบ</p><p className="mt-1 text-xs">ระบบจะแสดงต้นทุนต่อสูตร ต่อเสิร์ฟ Food cost %, Contribution และราคาจากเป้าหมาย</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>Food cost ต่ำไม่ได้แปลว่าร้านมีกำไรเสมอ</AlertTitle>
        <AlertDescription className="leading-6">ราคาจาก Target Food cost ใช้ต้นทุนวัตถุดิบเป็นฐาน จึงยังต้องตรวจค่าแรง ค่าเช่า Utilities ของเสีย Promo, Delivery/Marketplace fee, VAT, Service charge, Product mix และราคาที่ลูกค้ายอมรับ เครื่องมือนี้ไม่ใช่งบการเงินหรือคำแนะนำบัญชี/ภาษี</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตร:</strong> การปรับ AP cost ด้วย Yield, EP unit cost, Portion cost และ Menu price factor อ้างอิง <a className="font-medium text-primary hover:underline" href="https://library.vcc.ca/media/vcc-library/content-assets/learning-centre/worksheets/by-coursex2fprogram/business/CulinaryMath-RecipeCosting.pdf" target="_blank" rel="noreferrer">Vancouver Community College — Recipe Costing</a>; แนวคิด Preparation yield และการแปลงหน่วยอ้างอิง <a className="font-medium text-primary hover:underline" href="https://foodbuyingguide.fns.usda.gov/Appendix/ResourceAppendixA" target="_blank" rel="noreferrer">USDA Food Buying Guide</a>; สูตร Food cost ต่อเมนูอ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.escoffier.edu/blog/culinary-pastry-careers/how-to-calculate-food-cost-percentage/" target="_blank" rel="noreferrer">Escoffier</a> หากต้องกระทบยอดต้นทุนทั้งร้านตามงวด ให้ใช้ <Link href="/cost-of-goods-sold-calculator" className="font-medium text-primary hover:underline">COGS Calculator</Link> และตรวจ Margin หลังต้นทุนอื่นด้วย <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit & Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
