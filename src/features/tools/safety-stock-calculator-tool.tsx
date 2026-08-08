"use client";

import {
  Calculator,
  ClipboardList,
  Download,
  Info,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  Sigma,
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
  calculateSafetyStock,
  safetyStockCsv,
  type InventoryPeriodUnit,
  type SafetyStockInput,
  type SafetyStockMethod,
  type SafetyStockResult,
} from "@/lib/tools/safety-stock";

type SafetyStockFormState = {
  method: SafetyStockMethod;
  periodUnit: InventoryPeriodUnit;
  averageDemand: string;
  demandStdDev: string;
  averageLeadTime: string;
  leadTimeStdDev: string;
  serviceLevelPercent: string;
  safetyCoverPeriods: string;
  manualSafetyStock: string;
  roundingMultiple: string;
  onHand: string;
  onOrder: string;
  backorders: string;
};

const METHOD_OPTIONS: Array<{ value: SafetyStockMethod; label: string; description: string }> = [
  { value: "service-level", label: "Service level + ความผันผวน", description: "ใช้ Demand, Lead time, Standard deviation และ z-score" },
  { value: "days-cover", label: "Days of cover", description: "สำรองตามจำนวนวัน/สัปดาห์/เดือนที่กำหนด" },
  { value: "manual", label: "กำหนด Safety Stock เอง", description: "ใช้ค่าที่องค์กรอนุมัติหรือคำนวณจากระบบอื่น" },
];

const PERIOD_OPTIONS: Array<{ value: InventoryPeriodUnit; label: string; perLabel: string }> = [
  { value: "day", label: "วัน", perLabel: "ต่อวัน" },
  { value: "week", label: "สัปดาห์", perLabel: "ต่อสัปดาห์" },
  { value: "month", label: "เดือน", perLabel: "ต่อเดือน" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function quantity(value: number) {
  return `${numberFormatter.format(value)} หน่วย`;
}

function createInitialForm(): SafetyStockFormState {
  return {
    method: "service-level",
    periodUnit: "day",
    averageDemand: "",
    demandStdDev: "",
    averageLeadTime: "",
    leadTimeStdDev: "0",
    serviceLevelPercent: "95",
    safetyCoverPeriods: "2",
    manualSafetyStock: "0",
    roundingMultiple: "1",
    onHand: "0",
    onOrder: "0",
    backorders: "0",
  };
}

function createExampleForm(): SafetyStockFormState {
  return {
    ...createInitialForm(),
    averageDemand: "100",
    demandStdDev: "20",
    averageLeadTime: "7",
    leadTimeStdDev: "1",
    onHand: "600",
    onOrder: "150",
    backorders: "25",
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

function ResultCard({
  label,
  value,
  detail,
  testId,
  tone = "default",
}: {
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

function SafetyStockResultPanel({ input, result }: { input: SafetyStockInput; result: SafetyStockResult }) {
  const period = PERIOD_OPTIONS.find((item) => item.value === input.periodUnit)?.label ?? "ช่วง";
  const leadTimeShare = Math.max(0, 100 - result.safetyStockSharePercent);
  const statusText = result.reorderNow ? "ถึงจุดสั่งซื้อแล้ว" : "ยังเหนือจุดสั่งซื้อ";
  const summary = [
    "สรุป Safety Stock และ Reorder Point",
    `Safety Stock แนะนำ: ${quantity(result.recommendedSafetyStock)}`,
    `Demand ระหว่าง Lead time: ${quantity(result.leadTimeDemand)}`,
    `Reorder Point แนะนำ: ${quantity(result.recommendedReorderPoint)}`,
    `Inventory position: ${quantity(result.inventoryPosition)}`,
    `สถานะ: ${statusText}`,
    result.reorderNow
      ? `ต่ำกว่าหรือเท่าจุดสั่งซื้อ ${quantity(result.unitsBelowReorderPoint)}`
      : `คาดว่าอีก ${numberFormatter.format(result.periodsUntilReorderPoint)} ${period} จะถึงจุดสั่งซื้อ`,
  ].join("\n");

  return (
    <div data-testid="safety-stock-result" className="space-y-5" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="Safety Stock แนะนำ" value={quantity(result.recommendedSafetyStock)} detail={`ก่อนปัด ${quantity(result.rawSafetyStock)}`} testId="safety-stock-recommended" tone="positive" />
        <ResultCard label="Reorder Point แนะนำ" value={quantity(result.recommendedReorderPoint)} detail={`ก่อนปัด ${quantity(result.rawReorderPoint)}`} testId="reorder-point-recommended" tone="positive" />
        <ResultCard label="Demand ระหว่าง Lead time" value={quantity(result.leadTimeDemand)} detail={`${numberFormatter.format(input.averageDemand)} หน่วย × ${numberFormatter.format(input.averageLeadTime)} ${period}`} testId="lead-time-demand" />
        <ResultCard label="Inventory position" value={quantity(result.inventoryPosition)} detail="คงเหลือ + สั่งแล้ว − Backorder" testId="inventory-position" />
        <ResultCard label="สถานะจุดสั่งซื้อ" value={statusText} detail={result.reorderNow ? `ต่ำกว่าหรือเท่าจุดสั่งซื้อ ${quantity(result.unitsBelowReorderPoint)}` : `เหนือจุดสั่งซื้อ ${quantity(result.unitsAboveReorderPoint)}`} testId="reorder-status" tone={result.reorderNow ? "warning" : "positive"} />
        <ResultCard label="Safety buffer" value={`${numberFormatter.format(result.safetyBufferPeriods)} ${period}`} detail={`Coverage รวมที่ ROP ${numberFormatter.format(result.totalCoveragePeriods)} ${period}`} testId="safety-buffer" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="safety-stock-formula-title">
          <h3 id="safety-stock-formula-title" className="flex items-center gap-2 font-semibold"><PackageSearch className="size-4 text-primary" />โครงสร้าง Reorder Point</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Demand ระหว่าง Lead time</span><span className="tabular-nums">{quantity(result.leadTimeDemand)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Safety Stock ก่อนปัด</span><span className="tabular-nums">+{quantity(result.rawSafetyStock)}</span></div>
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>Reorder Point ก่อนปัด</span><span className="tabular-nums">{quantity(result.rawReorderPoint)}</span></div>
          </div>
          <div className="mt-5 overflow-hidden rounded-full bg-muted" aria-label={`Demand ระหว่าง Lead time ${numberFormatter.format(leadTimeShare)}% และ Safety Stock ${numberFormatter.format(result.safetyStockSharePercent)}%`}>
            <div className="flex h-3 w-full">
              <div className="bg-emerald-800/70" style={{ width: `${leadTimeShare}%` }} />
              <div className="bg-amber-500/75" style={{ width: `${result.safetyStockSharePercent}%` }} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-800/70" />Lead-time demand {numberFormatter.format(leadTimeShare)}%</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-500/75" />Safety Stock {numberFormatter.format(result.safetyStockSharePercent)}%</span>
          </div>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="inventory-position-title">
          <h3 id="inventory-position-title" className="flex items-center gap-2 font-semibold"><Warehouse className="size-4 text-primary" />Inventory position และการตัดสินใจ</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ของคงเหลือ</span><span className="tabular-nums">{quantity(input.onHand)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ของที่สั่งแล้ว</span><span className="tabular-nums">+{quantity(input.onOrder)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Backorder</span><span className="tabular-nums">−{quantity(input.backorders)}</span></div>
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>Inventory position</span><span className="tabular-nums">{quantity(result.inventoryPosition)}</span></div>
          </div>
          <div className={`mt-4 rounded-lg border p-3 text-sm leading-6 ${result.reorderNow ? "border-amber-500/35 bg-amber-500/5 text-amber-950 dark:text-amber-100" : "border-emerald-500/35 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"}`}>
            {result.reorderNow
              ? `Inventory position ถึงหรือต่ำกว่า Reorder Point อยู่ ${numberFormatter.format(result.unitsBelowReorderPoint)} หน่วย ควรทบทวนใบสั่งซื้อ MOQ, ของที่กำลังเข้า และวันรับจริง`
              : `Inventory position ยังสูงกว่า Reorder Point ${numberFormatter.format(result.unitsAboveReorderPoint)} หน่วย หรือประมาณ ${numberFormatter.format(result.periodsUntilReorderPoint)} ${period}ที่ Demand เฉลี่ยเดิม`}
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="safety-assumption-title">
        <h3 id="safety-assumption-title" className="flex items-center gap-2 font-semibold"><Sigma className="size-4 text-primary" />วิธีคำนวณและสมมติฐาน</h3>
        {input.method === "service-level" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Target service level</p><p className="mt-1 font-semibold tabular-nums">{numberFormatter.format(input.serviceLevelPercent)}%</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">z-score</p><p className="mt-1 font-semibold tabular-nums">{numberFormatter.format(result.zScore ?? 0)}</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">σ ของ Demand ช่วง Lead time</p><p className="mt-1 font-semibold tabular-nums">{quantity(result.leadTimeDemandStdDev ?? 0)}</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Nominal cycle stockout risk</p><p className="mt-1 font-semibold tabular-nums">{numberFormatter.format(result.nominalStockoutRiskPercent ?? 0)}%</p></div>
            <p className="text-xs leading-5 text-muted-foreground sm:col-span-2 xl:col-span-4">สูตรรวม Demand variability {numberFormatter.format(result.demandVariabilityPercent ?? 0)}% และ Lead-time variability {numberFormatter.format(result.leadTimeVariabilityPercent ?? 0)}% โดยสมมติว่าเป็นอิสระและ Demand ระหว่าง Lead time ใกล้ Normal distribution</p>
          </div>
        ) : input.method === "days-cover" ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Safety Stock = Demand เฉลี่ย × {numberFormatter.format(input.safetyCoverPeriods)} {period} วิธีนี้อ่านง่ายแต่ไม่ได้แปลงความผันผวนเป็น Service level จึงไม่ควรแสดง Nominal stockout risk</p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">ใช้ Safety Stock ที่กำหนดเอง {quantity(input.manualSafetyStock)} แล้วบวก Demand ระหว่าง Lead time วิธีนี้เหมาะกับค่าที่ผ่านการอนุมัติหรือได้จากระบบวางแผนอื่น แต่หน้านี้ไม่ตรวจที่มาของค่าดังกล่าว</p>
        )}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">การปัด: {input.roundingMultiple === 0 ? "ไม่ปัดผลลัพธ์" : `ปัด Safety Stock และ Reorder Point ขึ้นเป็นหลายเท่าของ ${numberFormatter.format(input.roundingMultiple)} หน่วย`}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" onClick={() => downloadText(safetyStockCsv(input, result), "meaw-safety-stock.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function SafetyStockCalculatorTool() {
  const [form, setForm] = useState<SafetyStockFormState>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: SafetyStockInput; result: SafetyStockResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateField = <Key extends keyof SafetyStockFormState>(key: Key, value: SafetyStockFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };

  const calculate = () => {
    try {
      const input: SafetyStockInput = {
        method: form.method,
        periodUnit: form.periodUnit,
        averageDemand: parseNumber(form.averageDemand, "Demand เฉลี่ย", true),
        demandStdDev: parseNumber(form.demandStdDev, "Demand standard deviation", form.method === "service-level"),
        averageLeadTime: parseNumber(form.averageLeadTime, "Lead time เฉลี่ย", true),
        leadTimeStdDev: parseNumber(form.leadTimeStdDev, "Lead-time standard deviation"),
        serviceLevelPercent: parseNumber(form.serviceLevelPercent, "Target service level", form.method === "service-level"),
        safetyCoverPeriods: parseNumber(form.safetyCoverPeriods, "ช่วงเวลาสำรอง", form.method === "days-cover"),
        manualSafetyStock: parseNumber(form.manualSafetyStock, "Safety Stock ที่กำหนดเอง", form.method === "manual"),
        roundingMultiple: parseNumber(form.roundingMultiple, "หน่วยที่ใช้ปัดขึ้น"),
        onHand: parseNumber(form.onHand, "ของคงเหลือ"),
        onOrder: parseNumber(form.onOrder, "ของที่สั่งแล้ว"),
        backorders: parseNumber(form.backorders, "Backorder"),
      };
      setCalculation({ input, result: calculateSafetyStock(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณ Safety Stock ได้");
    }
  };

  const periodOption = PERIOD_OPTIONS.find((item) => item.value === form.periodUnit) ?? PERIOD_OPTIONS[0]!;
  const activeMethod = METHOD_OPTIONS.find((item) => item.value === form.method) ?? METHOD_OPTIONS[0]!;

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>ข้อมูลสต๊อกคำนวณใน Browser</AlertTitle>
        <AlertDescription className="leading-6">Demand, Lead time, Inventory position และผลคำนวณไม่ถูกส่งไป Server หรือบันทึกไว้ ข้อมูลจะหายเมื่อรีเฟรชหน้า ใช้ยอดรวมต่อ SKU/Location แทนรายละเอียดลูกค้าหรือ Supplier เมื่อทำได้</AlertDescription>
      </Alert>

      <section aria-labelledby="safety-policy-title">
        <div>
          <h2 id="safety-policy-title" className="flex items-center gap-2 font-semibold"><PackageSearch className="size-4 text-primary" />นโยบาย Safety Stock และฐานเวลา</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">เลือกสูตรให้ตรงข้อมูลที่มี ทุกค่า Demand และ Lead time ต้องใช้ฐานวัน/สัปดาห์/เดือนเดียวกัน</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="safety-method">วิธีคำนวณ Safety Stock</Label>
            <Select value={form.method} onValueChange={(value) => updateField("method", value as SafetyStockMethod)}>
              <SelectTrigger id="safety-method" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{METHOD_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{activeMethod.description}</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="safety-period-unit">ฐานเวลา</Label>
            <Select value={form.periodUnit} onValueChange={(value) => updateField("periodUnit", value as InventoryPeriodUnit)}>
              <SelectTrigger id="safety-period-unit" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIOD_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">Demand และ Lead time ต้องใช้ฐานนี้ร่วมกัน</p>
          </div>
          <NumberField id="safety-rounding-multiple" label="ปัดขึ้นเป็นหลายเท่าของ (หน่วย)" value={form.roundingMultiple} onChange={(value) => updateField("roundingMultiple", value)} min={0} hint="1 = จำนวนเต็ม, 12 = ลังละ 12, 0 = ไม่ปัด" placeholder="1" />
          <NumberField id="safety-average-demand" label={`Demand เฉลี่ย (${periodOption.perLabel})`} value={form.averageDemand} onChange={(value) => updateField("averageDemand", value)} min={0.01} placeholder="100" />
          <NumberField id="safety-average-lead-time" label={`Lead time เฉลี่ย (${periodOption.label})`} value={form.averageLeadTime} onChange={(value) => updateField("averageLeadTime", value)} min={0.01} hint="ตั้งแต่เริ่มจัดซื้อ/ผลิตจนพร้อมใช้หรือขาย" placeholder="7" />
          {form.method === "service-level" ? (
            <>
              <NumberField id="safety-demand-stddev" label={`Demand standard deviation (${periodOption.perLabel})`} value={form.demandStdDev} onChange={(value) => updateField("demandStdDev", value)} min={0} hint="คำนวณจาก Demand ต่อช่วง รวมช่วงที่ Demand เป็นศูนย์" placeholder="20" />
              <NumberField id="safety-leadtime-stddev" label={`Lead-time standard deviation (${periodOption.label})`} value={form.leadTimeStdDev} onChange={(value) => updateField("leadTimeStdDev", value)} min={0} hint="ใช้ 0 เมื่อถือว่า Lead time คงที่" placeholder="1" />
              <NumberField id="safety-service-level" label="Target service level (%)" value={form.serviceLevelPercent} onChange={(value) => updateField("serviceLevelPercent", value)} min={50} max={99.99} hint="รองรับ 50–99.99%; ยิ่งสูงยิ่งถือสต๊อกมาก" placeholder="95" />
            </>
          ) : form.method === "days-cover" ? (
            <NumberField id="safety-cover-periods" label={`ช่วงเวลาสำรอง (${periodOption.label})`} value={form.safetyCoverPeriods} onChange={(value) => updateField("safetyCoverPeriods", value)} min={0} hint="Safety Stock = Demand เฉลี่ย × ช่วงเวลาสำรอง" placeholder="2" />
          ) : (
            <NumberField id="safety-manual-stock" label="Safety Stock ที่กำหนดเอง (หน่วย)" value={form.manualSafetyStock} onChange={(value) => updateField("manualSafetyStock", value)} min={0} hint="ใช้ค่าที่อนุมัติหรือคำนวณจากระบบอื่น" placeholder="200" />
          )}
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="inventory-snapshot-title">
        <div>
          <h2 id="inventory-snapshot-title" className="flex items-center gap-2 font-semibold"><Warehouse className="size-4 text-primary" />Inventory position ปัจจุบัน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Inventory position = ของคงเหลือ + ของที่สั่งแล้ว − Backorder ใช้ตรวจว่าถึงจุดสั่งซื้อหรือยัง ไม่ได้คำนวณจำนวนที่ควรสั่ง</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="safety-on-hand" label="ของคงเหลือพร้อมใช้ (หน่วย)" value={form.onHand} onChange={(value) => updateField("onHand", value)} min={0} placeholder="600" />
          <NumberField id="safety-on-order" label="ของที่สั่งแล้ว (หน่วย)" value={form.onOrder} onChange={(value) => updateField("onOrder", value)} min={0} hint="นับเฉพาะของที่คาดว่าจะมาทันและยังไม่รวมซ้ำ" placeholder="150" />
          <NumberField id="safety-backorders" label="Backorder / Demand ค้าง (หน่วย)" value={form.backorders} onChange={(value) => updateField("backorders", value)} min={0} placeholder="25" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculate}><Calculator className="size-4" />คำนวณ Safety Stock</Button>
          <ExampleButton onExample={() => { setForm(createExampleForm()); setCalculation(null); setError(""); }} />
          <ClearButton onClear={() => { setForm(createInitialForm()); setCalculation(null); setError(""); }} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? (
          <SafetyStockResultPanel input={calculation.input} result={calculation.result} />
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><PackageCheck className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอก Demand, Lead time, วิธีสำรอง และ Inventory position แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดง Safety Stock, Reorder Point, Coverage, สมมติฐาน และสถานะจุดสั่งซื้อ</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>เป็นแบบจำลอง Continuous-review ไม่ใช่คำสั่งซื้ออัตโนมัติ</AlertTitle>
        <AlertDescription className="leading-6">Normal model อาจคลาดเคลื่อนเมื่อ Demand ขาดช่วง โปรโมชันแรง มีฤดูกาล หรือเบ้มาก และสมมติ Demand กับ Lead time เป็นอิสระ Days of cover ไม่ได้การันตี Service level ส่วน Inventory position ไม่ตรวจ MOQ, Order quantity, Shelf life, Capacity, Supplier calendar หรือวันรับจริง ควร backtest กับ stockout และ holding cost ของแต่ละ SKU/Location</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">สูตรอ้างอิง:</strong> Normal variability และการปัดขึ้นตาม <a className="font-medium text-primary hover:underline" href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0702045810.html" target="_blank" rel="noreferrer">Oracle NetSuite Inventory Optimization</a>; Days of cover ตาม <a className="font-medium text-primary hover:underline" href="https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/faurp/how-safety-stock-is-calculated-in-oracle-replenishment-planning.html" target="_blank" rel="noreferrer">Oracle Replenishment Planning</a>; Reorder Point = Safety Stock + Demand ระหว่าง Lead time ตาม <a className="font-medium text-primary hover:underline" href="https://docs.oracle.com/cd/A60725_05/html/comnls/us/inv/roplan.htm" target="_blank" rel="noreferrer">Oracle Inventory</a> หากต้องการแปลงวันรับของจริงให้ใช้ <Link href="/business-days-calculator" className="font-medium text-primary hover:underline">Business Days Calculator</Link> และวิเคราะห์ต้นทุนสินค้าด้วย <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit & Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
