"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Download,
  Info,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
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
  calculateCostOfGoodsSold,
  costOfGoodsSoldCsv,
  type CogsCalculationMode,
  type CogsCurrency,
  type CogsSalesStatus,
  type CostOfGoodsSoldInput,
  type CostOfGoodsSoldResult,
} from "@/lib/tools/cost-of-goods-sold";

type CogsFormState = {
  mode: CogsCalculationMode;
  currency: CogsCurrency;
  beginningInventory: string;
  grossPurchases: string;
  purchaseReturns: string;
  purchaseDiscounts: string;
  freightIn: string;
  directLabor: string;
  materialsAndSupplies: string;
  otherDirectCosts: string;
  endingInventory: string;
  netSales: string;
  unitsSold: string;
};

const CALCULATION_MODES: Array<{ value: CogsCalculationMode; label: string; description: string }> = [
  { value: "basic", label: "สูตรพื้นฐาน", description: "Beginning inventory + Purchases − Ending inventory" },
  { value: "detailed", label: "สูตรละเอียด", description: "แยก Returns, Discounts, Freight-in, Direct labor, Materials และต้นทุนผลิตอื่น" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const moneyFormatters: Record<Exclude<CogsCurrency, "OTHER">, Intl.NumberFormat> = {
  THB: new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

function money(value: number, currency: CogsCurrency) {
  return currency === "OTHER" ? `${numberFormatter.format(value)} หน่วยเงิน` : moneyFormatters[currency].format(value);
}

function createInitialForm(): CogsFormState {
  return {
    mode: "basic",
    currency: "THB",
    beginningInventory: "",
    grossPurchases: "",
    purchaseReturns: "",
    purchaseDiscounts: "",
    freightIn: "",
    directLabor: "",
    materialsAndSupplies: "",
    otherDirectCosts: "",
    endingInventory: "",
    netSales: "",
    unitsSold: "",
  };
}

function createExampleForm(): CogsFormState {
  return {
    mode: "detailed",
    currency: "THB",
    beginningInventory: "200000",
    grossPurchases: "700000",
    purchaseReturns: "30000",
    purchaseDiscounts: "10000",
    freightIn: "40000",
    directLabor: "50000",
    materialsAndSupplies: "20000",
    otherDirectCosts: "30000",
    endingInventory: "250000",
    netSales: "1200000",
    unitsSold: "5000",
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
  placeholder = "0",
  step = 0.01,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  step?: number;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={0} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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

function salesStatusText(status: CogsSalesStatus) {
  const labels: Record<CogsSalesStatus, string> = {
    "not-provided": "ยังไม่ได้กรอกยอดขายสุทธิ",
    "gross-profit": "มีกำไรขั้นต้น",
    "break-even": "เท่าทุนขั้นต้น",
    "gross-loss": "ขาดทุนขั้นต้น",
  };
  return labels[status];
}

function CostOfGoodsSoldResultPanel({ input, result }: { input: CostOfGoodsSoldInput; result: CostOfGoodsSoldResult }) {
  const hasSales = result.grossProfit !== null;
  const salesTone = result.salesStatus === "gross-loss" ? "warning" : "positive";
  const summary = [
    "สรุปต้นทุนขาย Cost of Goods Sold (COGS)",
    `ต้นทุนสินค้าที่มีไว้ขาย: ${money(result.goodsAvailableForSale, input.currency)}`,
    `สินค้าคงเหลือปลายงวด: ${money(input.endingInventory, input.currency)}`,
    `ต้นทุนขาย COGS: ${money(result.costOfGoodsSold, input.currency)}`,
    hasSales ? `กำไรขั้นต้น: ${money(result.grossProfit ?? 0, input.currency)}` : "ไม่ได้กรอกยอดขายสุทธิ",
    result.grossMarginPercent !== null ? `Gross margin: ${numberFormatter.format(result.grossMarginPercent)}%` : "",
    result.costPerUnitSold !== null ? `COGS ต่อหน่วยที่ขาย: ${money(result.costPerUnitSold, input.currency)}` : "",
  ].filter(Boolean).join("\n");

  return (
    <div data-testid="cogs-result" className="space-y-5" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="ต้นทุนขาย COGS" value={money(result.costOfGoodsSold, input.currency)} detail="สินค้าที่มีไว้ขาย − สินค้าปลายงวด" testId="cogs-total" tone="positive" />
        <ResultCard label="ต้นทุนสินค้าที่มีไว้ขาย" value={money(result.goodsAvailableForSale, input.currency)} detail="ต้นงวด + ต้นทุนที่เพิ่มระหว่างงวด" testId="cogs-goods-available" />
        <ResultCard label="ยอดซื้อสุทธิ" value={money(result.netPurchases, input.currency)} detail={input.mode === "detailed" ? "ยอดซื้อ − Returns − Discounts + Freight-in" : "ยอดซื้อที่กรอกในสูตรพื้นฐาน"} testId="cogs-net-purchases" />
        <ResultCard label="ต้นทุนผลิตเพิ่มเติม" value={money(result.productionCosts, input.currency)} detail="Direct labor + Materials + Other direct costs" testId="cogs-production-costs" />
        {hasSales ? (
          <ResultCard label="กำไร/ขาดทุนขั้นต้น" value={money(result.grossProfit ?? 0, input.currency)} detail={`${salesStatusText(result.salesStatus)} · Gross margin ${numberFormatter.format(result.grossMarginPercent ?? 0)}%`} testId="cogs-gross-profit" tone={salesTone} />
        ) : (
          <ResultCard label="การเปลี่ยนแปลง Inventory" value={money(result.inventoryChange, input.currency)} detail="ปลายงวด − ต้นงวด ไม่ใช่ COGS" testId="cogs-inventory-change" />
        )}
        {result.costPerUnitSold !== null ? (
          <ResultCard label="COGS ต่อหน่วยที่ขาย" value={money(result.costPerUnitSold, input.currency)} detail={`COGS ÷ ${numberFormatter.format(input.unitsSold)} หน่วย`} testId="cogs-per-unit" />
        ) : (
          <ResultCard label="สัดส่วน COGS ต่อสินค้าที่มีไว้ขาย" value={`${numberFormatter.format(result.cogsShareOfGoodsAvailable)}%`} detail={`สินค้าปลายงวดคงเหลือ ${numberFormatter.format(result.endingInventoryShare)}%`} testId="cogs-share" />
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="cogs-waterfall-title">
          <h3 id="cogs-waterfall-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />COGS waterfall ที่ตรวจสอบย้อนหลังได้</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">สินค้าคงเหลือต้นงวด</span><span className="text-right tabular-nums">{money(input.beginningInventory, input.currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ยอดซื้อสุทธิ</span><span className="text-right tabular-nums">+ {money(result.netPurchases, input.currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ต้นทุนผลิตเพิ่มเติม</span><span className="text-right tabular-nums">+ {money(result.productionCosts, input.currency)}</span></div>
            <div className="flex justify-between gap-4 border-t pt-3 font-medium"><span>ต้นทุนสินค้าที่มีไว้ขาย</span><span className="text-right tabular-nums">{money(result.goodsAvailableForSale, input.currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">สินค้าคงเหลือปลายงวด</span><span className="text-right tabular-nums">− {money(input.endingInventory, input.currency)}</span></div>
            <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold"><span>ต้นทุนขาย COGS</span><span className="text-right tabular-nums">{money(result.costOfGoodsSold, input.currency)}</span></div>
          </div>
          {input.mode === "detailed" ? <p className="mt-4 rounded-lg border bg-card p-3 text-xs leading-5 text-muted-foreground">ยอดซื้อสุทธิ = {money(input.grossPurchases, input.currency)} − {money(result.purchaseAdjustments, input.currency)} + {money(input.freightIn, input.currency)} = <strong className="text-foreground">{money(result.netPurchases, input.currency)}</strong></p> : null}
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="cogs-sales-title">
          <h3 id="cogs-sales-title" className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />วิเคราะห์เทียบยอดขายสุทธิ</h3>
          {hasSales ? (
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">ยอดขายสุทธิ</span><span className="text-right tabular-nums">{money(input.netSales, input.currency)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">หัก COGS</span><span className="text-right tabular-nums">− {money(result.costOfGoodsSold, input.currency)}</span></div>
              <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>กำไร/ขาดทุนขั้นต้น</span><span className="text-right tabular-nums">{money(result.grossProfit ?? 0, input.currency)}</span></div>
              <div className={`rounded-lg border p-3 leading-6 ${result.salesStatus === "gross-loss" ? "border-amber-500/35 bg-amber-500/5" : "border-emerald-500/35 bg-emerald-500/5"}`}>
                <p data-testid="cogs-sales-status" className="font-medium">{salesStatusText(result.salesStatus)}</p>
                <p className="mt-1 text-xs">Gross margin <span data-testid="cogs-gross-margin">{numberFormatter.format(result.grossMarginPercent ?? 0)}%</span> · COGS ต่อยอดขาย {numberFormatter.format(result.cogsPercentOfSales ?? 0)}%{result.markupOnCogsPercent === null ? "" : ` · Markup บน COGS ${numberFormatter.format(result.markupOnCogsPercent)}%`}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">กรอกยอดขายสุทธิของช่วงเดียวกันเพื่อดู Gross profit, Gross margin และ COGS percentage ระบบไม่ดึงยอดขายจากแหล่งภายนอกและไม่รวมค่าใช้จ่ายดำเนินงาน</div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="cogs-interpretation-title">
        <h3 id="cogs-interpretation-title" className="flex items-center gap-2 font-semibold"><PackageCheck className="size-4 text-primary" />จัดหมวดต้นทุนให้ถูกก่อนใช้ผล</h3>
        <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">รวมเมื่อเกี่ยวกับสินค้าโดยตรง</p><p className="mt-1 text-xs text-muted-foreground">สินค้า/วัตถุดิบ ค่าแรงผลิต วัสดุ Freight-in และ Overhead ที่จัดสรรเข้าการผลิตตามนโยบาย</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">อย่ารวมซ้ำ</p><p className="mt-1 text-xs text-muted-foreground">หาก Purchases หรือ Inventory รวม Freight, Labor หรือ Materials แล้ว ต้องไม่กรอกช่องรายละเอียดซ้ำอีก</p></div>
          <div className="rounded-lg border bg-card p-3"><p className="font-medium">ไม่ใช่ค่าใช้จ่ายดำเนินงานทั้งหมด</p><p className="mt-1 text-xs text-muted-foreground">Marketing, ค่าใช้จ่ายสำนักงาน และ Freight-out โดยทั่วไปแยกจาก COGS เว้นแต่นโยบายบัญชีที่ใช้กำหนดต่างออกไป</p></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" onClick={() => downloadText(costOfGoodsSoldCsv(input, result), "meaw-cogs-calculator.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </div>
    </div>
  );
}

export function CostOfGoodsSoldCalculatorTool() {
  const [form, setForm] = useState<CogsFormState>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: CostOfGoodsSoldInput; result: CostOfGoodsSoldResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateField = <Key extends keyof CogsFormState>(key: Key, value: CogsFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updateMode = (mode: CogsCalculationMode) => {
    setForm((current) => mode === "basic" ? {
      ...current,
      mode,
      purchaseReturns: "",
      purchaseDiscounts: "",
      freightIn: "",
      directLabor: "",
      materialsAndSupplies: "",
      otherDirectCosts: "",
    } : { ...current, mode });
    invalidate();
  };

  const calculate = () => {
    try {
      const detailed = form.mode === "detailed";
      const input: CostOfGoodsSoldInput = {
        mode: form.mode,
        currency: form.currency,
        beginningInventory: parseNumber(form.beginningInventory, "สินค้าคงเหลือต้นงวด", true),
        grossPurchases: parseNumber(form.grossPurchases, "ยอดซื้อสินค้าและวัตถุดิบ", true),
        purchaseReturns: detailed ? parseNumber(form.purchaseReturns, "ส่งคืนสินค้าและส่วนลดรับจากการคืน") : 0,
        purchaseDiscounts: detailed ? parseNumber(form.purchaseDiscounts, "ส่วนลดรับจากการซื้อ") : 0,
        freightIn: detailed ? parseNumber(form.freightIn, "ค่าขนส่งเข้าและต้นทุนจัดหา") : 0,
        directLabor: detailed ? parseNumber(form.directLabor, "ค่าแรงผลิตโดยตรง") : 0,
        materialsAndSupplies: detailed ? parseNumber(form.materialsAndSupplies, "วัสดุและของใช้ในการผลิต") : 0,
        otherDirectCosts: detailed ? parseNumber(form.otherDirectCosts, "ต้นทุนผลิตโดยตรงอื่น") : 0,
        endingInventory: parseNumber(form.endingInventory, "สินค้าคงเหลือปลายงวด", true),
        netSales: parseNumber(form.netSales, "ยอดขายสุทธิ"),
        unitsSold: parseNumber(form.unitsSold, "จำนวนหน่วยที่ขาย"),
      };
      setCalculation({ input, result: calculateCostOfGoodsSold(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณต้นทุนขาย COGS ได้");
    }
  };

  const activeMode = CALCULATION_MODES.find((item) => item.value === form.mode) ?? CALCULATION_MODES[0]!;

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>ข้อมูลต้นทุนและยอดขายคำนวณใน Browser</AlertTitle>
        <AlertDescription className="leading-6">Inventory, Purchases, Direct costs, Sales และผลลัพธ์ไม่ถูกส่งไป Server หรือบันทึกไว้ ข้อมูลจะหายเมื่อรีเฟรชหน้า ใช้ยอดรวมที่ไม่ระบุ Supplier, SKU หรือข้อมูลลับเมื่อทำได้</AlertDescription>
      </Alert>

      <section aria-labelledby="cogs-mode-title">
        <div>
          <h2 id="cogs-mode-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />วิธีคำนวณและหน่วยเงิน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ทุกยอดต้องเป็นฐานต้นทุน หน่วยเงิน ขอบเขตสินค้า และรอบบัญชีเดียวกัน การเลือกหน่วยเงินเปลี่ยนเฉพาะรูปแบบแสดงผล ไม่มี FX conversion</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2">
          <div className="grid gap-3">
            <Label htmlFor="cogs-mode">โหมดคำนวณ</Label>
            <Select value={form.mode} onValueChange={(value) => updateMode(value as CogsCalculationMode)}>
              <SelectTrigger id="cogs-mode" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{CALCULATION_MODES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{activeMode.description}</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="cogs-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateField("currency", value as CogsCurrency)}>
              <SelectTrigger id="cogs-currency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="THB">บาท (THB)</SelectItem><SelectItem value="USD">ดอลลาร์ (USD)</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">กรอกทุกช่องด้วยหน่วยเดียวกัน</p>
          </div>
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="cogs-inventory-title">
        <div>
          <h2 id="cogs-inventory-title" className="flex items-center gap-2 font-semibold"><Warehouse className="size-4 text-primary" />Inventory และ Purchases ของงวด</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Beginning inventory ควรตรงกับ Closing inventory งวดก่อน และ Ending inventory ต้องผ่าน Cutoff กับวิธีตีราคาที่ใช้อย่างสม่ำเสมอ</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="cogs-beginning-inventory" label="สินค้าคงเหลือต้นงวด" value={form.beginningInventory} onChange={(value) => updateField("beginningInventory", value)} hint="มูลค่าที่ฐานต้นทุน ณ วันต้นงวด" placeholder="200000" />
          <NumberField id="cogs-gross-purchases" label={form.mode === "basic" ? "ยอดซื้อ/ต้นทุนเพิ่มระหว่างงวด" : "ยอดซื้อสินค้าและวัตถุดิบ"} value={form.grossPurchases} onChange={(value) => updateField("grossPurchases", value)} hint={form.mode === "basic" ? "ใช้ยอดสุทธิที่รวมต้นทุนตรงซึ่งต้องการแล้ว" : "ยอดก่อนหัก Returns/Discounts และก่อนบวก Freight-in"} placeholder={form.mode === "basic" ? "800000" : "700000"} />
          <NumberField id="cogs-ending-inventory" label="สินค้าคงเหลือปลายงวด" value={form.endingInventory} onChange={(value) => updateField("endingInventory", value)} hint="มูลค่าสินค้าที่ยังไม่ขาย ณ วันสิ้นงวด" placeholder="250000" />
        </div>
      </section>

      {form.mode === "detailed" ? (
        <section className="mt-7 border-t pt-7" aria-labelledby="cogs-detail-title">
          <div>
            <h2 id="cogs-detail-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />รายการปรับยอดซื้อและต้นทุนผลิต</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกเฉพาะต้นทุนที่ยังไม่รวมใน Purchases หรือ Inventory เพื่อป้องกัน Double counting ค่าใช้จ่ายขายและบริหารไม่ควรใส่รวมโดยอัตโนมัติ</p>
          </div>
          <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
            <NumberField id="cogs-purchase-returns" label="ส่งคืนสินค้าและส่วนลดรับจากการคืน" value={form.purchaseReturns} onChange={(value) => updateField("purchaseReturns", value)} hint="นำไปหักออกจากยอดซื้อ" placeholder="30000" />
            <NumberField id="cogs-purchase-discounts" label="ส่วนลดรับจากการซื้อ" value={form.purchaseDiscounts} onChange={(value) => updateField("purchaseDiscounts", value)} hint="Supplier discount ที่ลดต้นทุนจัดหา" placeholder="10000" />
            <NumberField id="cogs-freight-in" label="Freight-in และต้นทุนจัดหาโดยตรง" value={form.freightIn} onChange={(value) => updateField("freightIn", value)} hint="ขนส่งเข้า/ภาษีนำเข้าที่จัดสรรเข้าต้นทุน ไม่ใช่ Freight-out" placeholder="40000" />
            <NumberField id="cogs-direct-labor" label="ค่าแรงผลิตโดยตรง" value={form.directLabor} onChange={(value) => updateField("directLabor", value)} hint="แรงงานผลิตที่ยังไม่รวมใน Inventory/Purchases" placeholder="50000" />
            <NumberField id="cogs-materials" label="วัสดุและของใช้ในการผลิต" value={form.materialsAndSupplies} onChange={(value) => updateField("materialsAndSupplies", value)} hint="ใช้ในการผลิตและยังไม่ถูกนับในยอดซื้อ" placeholder="20000" />
            <NumberField id="cogs-other-direct-costs" label="ต้นทุนผลิตโดยตรงอื่น" value={form.otherDirectCosts} onChange={(value) => updateField("otherDirectCosts", value)} hint="เช่น Packaging ที่เป็นส่วนหนึ่งของสินค้า หรือ Manufacturing overhead ที่จัดสรรแล้ว" placeholder="30000" />
          </div>
        </section>
      ) : null}

      <section className="mt-7 border-t pt-7" aria-labelledby="cogs-analysis-input-title">
        <div>
          <h2 id="cogs-analysis-input-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />ข้อมูลวิเคราะห์เพิ่มเติม (ไม่บังคับ)</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ยอดขายต้องเป็น Net sales หลัง Sales returns/allowances และอยู่ในงวดเดียวกับ COGS จำนวนหน่วยต้องใช้ขอบเขตสินค้าเดียวกัน</p>
        </div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2">
          <NumberField id="cogs-net-sales" label="ยอดขายสุทธิของงวด" value={form.netSales} onChange={(value) => updateField("netSales", value)} hint="ใช้คำนวณ Gross profit, Margin และ COGS percentage" placeholder="1200000" />
          <NumberField id="cogs-units-sold" label="จำนวนหน่วยที่ขาย" value={form.unitsSold} onChange={(value) => updateField("unitsSold", value)} hint="ใช้หา COGS เฉลี่ยต่อหน่วย ไม่ใช่ต้นทุนเฉพาะ SKU" placeholder="5000" step={1} />
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculate}><Calculator className="size-4" />คำนวณต้นทุนขาย COGS</Button>
          <ExampleButton onExample={() => { setForm(createExampleForm()); setCalculation(null); setError(""); }} />
          <ClearButton onClear={() => { setForm(createInitialForm()); setCalculation(null); setError(""); }} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">
        {calculation ? (
          <CostOfGoodsSoldResultPanel input={calculation.input} result={calculation.result} />
        ) : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ReceiptText className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอก Inventory ต้นงวด ยอดซื้อ และ Inventory ปลายงวด แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดง Net purchases, Goods available for sale, COGS และตัวชี้วัดที่เลือกกรอก</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>ผลคำนวณไม่ใช่งบการเงินหรือคำแนะนำภาษี</AlertTitle>
        <AlertDescription className="leading-6">Inventory valuation, Cutoff, Direct/Indirect cost และการจัดสรร Manufacturing overhead มีผลต่อ COGS อย่างมีนัยสำคัญ กฎบัญชีและภาษีต่างกันตามกิจการและประเทศ ควรเทียบ General ledger, Stock count และตรวจผู้ทำบัญชีก่อนบันทึกหรือยื่นแบบจริง</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">สูตรอ้างอิง:</strong> COGS = Beginning inventory + Purchases − Ending inventory และ Gross profit = Net sales − COGS ตาม <a className="font-medium text-primary hover:underline" href="https://www.xero.com/au/guides/cogs/" target="_blank" rel="noreferrer">Xero COGS Guide</a>; สูตรละเอียดแยก Returns, Discounts และ Freight-in ตาม <a className="font-medium text-primary hover:underline" href="https://quickbooks.intuit.com/global/resources/expenses/cost-of-goods-sold-formula/" target="_blank" rel="noreferrer">QuickBooks COGS Formula</a>; Direct labor, Materials, Freight-in และ Manufacturing overhead ที่เกี่ยวข้องอ้างโครงสร้าง <a className="font-medium text-primary hover:underline" href="https://www.irs.gov/publications/p334" target="_blank" rel="noreferrer">IRS Publication 334</a> ซึ่งใช้เป็นตัวอย่างโครงสร้าง ไม่ใช่กฎภาษีไทย วิเคราะห์การหมุนสต๊อกต่อด้วย <Link href="/inventory-turnover-calculator" className="font-medium text-primary hover:underline">Inventory Turnover Calculator</Link> และวิเคราะห์ราคาขายด้วย <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit & Margin Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
