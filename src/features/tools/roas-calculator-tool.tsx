"use client";

import { BarChart3, Calculator, Cat, CircleDollarSign, Download, Gauge, Info, Megaphone, Target, TriangleAlert, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateRoas, roasCsv, type RoasCurrency, type RoasInput, type RoasResult } from "@/lib/tools/roas";

type RoasForm = { currency: RoasCurrency } & Record<Exclude<keyof RoasInput, "currency">, string>;

const currencyLabels: Record<RoasCurrency, string> = {
  THB: "บาท (THB)", USD: "ดอลลาร์ (USD)", EUR: "ยูโร (EUR)", GBP: "ปอนด์ (GBP)", JPY: "เยน (JPY)", OTHER: "หน่วยเงินอื่น",
};
const currencySymbols: Record<RoasCurrency, string> = { THB: "฿", USD: "$", EUR: "€", GBP: "£", JPY: "¥", OTHER: "¤" };

function initialForm(): RoasForm {
  return { currency: "THB", campaignName: "", grossRevenue: "", refunds: "0", adSpend: "", productCost: "0", paymentFeePercent: "0", fulfillmentCost: "0", otherVariableCost: "0", orders: "0", targetProfitMarginPercent: "15" };
}

function exampleForm(): RoasForm {
  return { currency: "THB", campaignName: "Summer Cat Campaign", grossRevenue: "200000", refunds: "10000", adSpend: "50000", productCost: "70000", paymentFeePercent: "3", fulfillmentCost: "15000", otherVariableCost: "5000", orders: "500", targetProfitMarginPercent: "15" };
}

function parseNumber(value: string, label: string, required = false) {
  if (!value.trim()) {
    if (required) throw new Error(`กรุณากรอก${label}`);
    return 0;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return number;
}

function buildInput(form: RoasForm): RoasInput {
  return {
    currency: form.currency,
    campaignName: form.campaignName,
    grossRevenue: parseNumber(form.grossRevenue, "ยอดขายรวม", true),
    refunds: parseNumber(form.refunds, "ยอดคืนเงิน"),
    adSpend: parseNumber(form.adSpend, "ค่าโฆษณา", true),
    productCost: parseNumber(form.productCost, "ต้นทุนสินค้า"),
    paymentFeePercent: parseNumber(form.paymentFeePercent, "ค่าธรรมเนียม"),
    fulfillmentCost: parseNumber(form.fulfillmentCost, "Fulfillment"),
    otherVariableCost: parseNumber(form.otherVariableCost, "ต้นทุนอื่น"),
    orders: parseNumber(form.orders, "จำนวน Order"),
    targetProfitMarginPercent: parseNumber(form.targetProfitMarginPercent, "เป้ากำไร"),
  };
}

function money(value: number, currency: RoasCurrency) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

function ratio(value: number | null) {
  return value === null ? "คำนวณไม่ได้" : `${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}x`;
}

function percent(value: number) {
  return `${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

function NumberField({ id, label, value, onChange, hint, required = false, step = 0.01, max }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string; required?: boolean; step?: number; max?: number }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}{required ? <span className="text-destructive"> *</span> : null}</Label><Input id={id} type="number" inputMode="decimal" min={0} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} required={required} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function MetricCard({ label, value, detail, testId, tone = "default" }: { label: string; value: string; detail: string; testId?: string; tone?: "default" | "positive" | "warning" }) {
  const toneClass = tone === "positive" ? "border-emerald-500/30 bg-emerald-500/7" : tone === "warning" ? "border-amber-500/30 bg-amber-500/7" : "border-white/55 bg-white/55 dark:border-white/10 dark:bg-white/4";
  return <article className={`rounded-2xl border p-4 shadow-sm backdrop-blur-xl ${toneClass}`}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className="mt-1 break-words text-xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></article>;
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0"><span className="text-sm text-muted-foreground">{label}</span><span className={`text-right tabular-nums ${strong ? "font-bold text-foreground" : "font-medium"}`}>{value}</span></div>;
}

function RoasResults({ input, result }: { input: RoasInput; result: RoasResult }) {
  const statusText = result.status === "profit" ? "Campaign มีกำไรหลังหักค่าโฆษณา" : result.status === "break-even" ? "Campaign อยู่ใกล้จุดคุ้มทุน" : "Campaign ขาดทุนหลังหักค่าโฆษณา";
  return (
    <section className="mt-8 space-y-6" aria-labelledby="roas-results-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 id="roas-results-title" className="flex items-center gap-2 font-semibold"><BarChart3 className="size-4 text-primary" />ผลลัพธ์ {input.campaignName}</h3><p className="mt-1 text-xs text-muted-foreground">คำนวณจากยอดและโครงสร้างต้นทุนที่กรอก</p></div><Button type="button" variant="outline" data-testid="roas-csv" onClick={() => downloadText(roasCsv(input, result), "meaw-roas-analysis.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>

      <Alert variant={result.status === "loss" ? "destructive" : "default"} className={result.status === "profit" ? "border-emerald-500/30 bg-emerald-500/7" : undefined}>
        {result.status === "loss" ? <TriangleAlert /> : <CircleDollarSign />}
        <AlertTitle>{statusText}</AlertTitle>
        <AlertDescription>กำไรหลังโฆษณา {money(result.profitAfterAds, input.currency)} · Margin {percent(result.profitMarginPercent)} · กำไรหลังโฆษณา ÷ Ad spend {percent(result.profitReturnOnAdSpendPercent)}</AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Gross ROAS" value={ratio(result.grossRoas)} detail="ยอดขายรวม ÷ ค่าโฆษณา" testId="roas-gross" />
        <MetricCard label="Net ROAS" value={`${ratio(result.netRoas)} · ${percent(result.reportedRoasPercent)}`} detail="ยอดหลังคืนเงิน ÷ ค่าโฆษณา" testId="roas-net" />
        <MetricCard label="กำไรหลังโฆษณา" value={money(result.profitAfterAds, input.currency)} detail={`Profit margin ${percent(result.profitMarginPercent)}`} testId="roas-profit" tone={result.status === "profit" ? "positive" : "warning"} />
        <MetricCard label="Break-even ROAS" value={ratio(result.breakEvenRoas)} detail="ขั้นต่ำภายใต้ Sales mix ปัจจุบัน" testId="roas-break-even" />
        <MetricCard label={`Target ROAS · กำไร ${percent(input.targetProfitMarginPercent)}`} value={ratio(result.targetRoas)} detail={result.targetFeasible ? "เป้าขั้นต่ำภายใต้ Sales mix ปัจจุบัน" : "Contribution ไม่พอสำหรับเป้านี้"} testId="roas-target" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border bg-muted/10 p-4 sm:p-5"><h4 className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />จากรายได้ถึงกำไร</h4><div className="mt-3"><ResultRow label="ยอดขายรวม / Conversion value" value={money(input.grossRevenue, input.currency)} /><ResultRow label={`หักคืนเงิน (${percent(result.refundRatePercent)})`} value={`− ${money(input.refunds, input.currency)}`} /><ResultRow label="ยอดขายสุทธิ" value={money(result.netRevenue, input.currency)} strong /><ResultRow label="ต้นทุนผันแปรก่อนโฆษณา" value={`− ${money(result.variableCostBeforeAds, input.currency)}`} /><ResultRow label="Contribution ก่อนโฆษณา" value={money(result.contributionBeforeAds, input.currency)} /><ResultRow label="ค่าโฆษณา" value={`− ${money(input.adSpend, input.currency)}`} /><ResultRow label="กำไรหลังโฆษณา" value={money(result.profitAfterAds, input.currency)} strong /></div></article>
        <article className="rounded-2xl border bg-muted/10 p-4 sm:p-5"><h4 className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />เพดานค่าโฆษณา</h4><div className="mt-3"><ResultRow label="คุ้มทุนได้เมื่อ Ad spend ไม่เกิน" value={result.breakEvenAdSpend === null ? "คำนวณไม่ได้" : money(result.breakEvenAdSpend, input.currency)} strong /><ResultRow label="ระยะห่างจากจุดคุ้มทุน" value={result.breakEvenAdSpendGap === null ? "คำนวณไม่ได้" : money(result.breakEvenAdSpendGap, input.currency)} /><ResultRow label={`กำไรเป้าหมาย ${percent(input.targetProfitMarginPercent)}`} value={money(result.targetProfitAmount, input.currency)} /><ResultRow label="Ad spend สูงสุดตามเป้ากำไร" value={result.targetAdSpendCapacity === null ? "เป้าหมายยังทำไม่ได้" : money(result.targetAdSpendCapacity, input.currency)} strong /><ResultRow label="งบโฆษณาที่เพิ่ม/ต้องลดเพื่อถึงเป้า" value={result.targetAdSpendGap === null ? "คำนวณไม่ได้" : money(result.targetAdSpendGap, input.currency)} /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">ค่าบวกคือยังมี Headroom ส่วนค่าลบหมายถึงค่าโฆษณาปัจจุบันเกินเพดานภายใต้ยอดขายและสัดส่วนต้นทุนเดิม</p></article>
      </div>

      {result.perOrder ? <article className="rounded-2xl border bg-muted/10 p-4 sm:p-5"><h4 className="flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />ตัวเลขต่อ Order / Conversion</h4><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Net AOV" value={money(result.perOrder.netAverageOrderValue, input.currency)} detail="ยอดสุทธิเฉลี่ยต่อ Order" /><MetricCard label="CPA ปัจจุบัน" value={money(result.perOrder.currentCpa, input.currency)} detail="Ad spend ต่อ Conversion" /><MetricCard label="Break-even CPA" value={result.perOrder.breakEvenCpa === null ? "คำนวณไม่ได้" : money(result.perOrder.breakEvenCpa, input.currency)} detail="เพดาน CPA ที่จุดคุ้มทุน" /><MetricCard label="Target CPA" value={result.perOrder.targetCpa === null ? "คำนวณไม่ได้" : money(result.perOrder.targetCpa, input.currency)} detail={`เพดาน CPA ที่ Margin ${percent(input.targetProfitMarginPercent)}`} /></div></article> : null}
    </section>
  );
}

export function RoasCalculatorTool() {
  const [form, setForm] = useState<RoasForm>(initialForm);
  const [calculation, setCalculation] = useState<{ input: RoasInput; result: RoasResult } | null>(null);
  const [error, setError] = useState("");
  const commit = (next: RoasForm) => { setForm(next); setCalculation(null); setError(""); };
  const update = (key: keyof RoasForm, value: string) => commit({ ...form, [key]: value });

  function submit() {
    try {
      const input = buildInput(form);
      setCalculation({ input, result: calculateRoas(input) });
      setError("");
    } catch (reason) {
      setCalculation(null);
      setError(reason instanceof Error ? reason.message : "คำนวณไม่สำเร็จ กรุณาตรวจข้อมูล");
    }
  }

  return (
    <WorkspaceFrame>
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-100/55 px-3 py-1 text-xs text-pink-800 dark:bg-pink-400/10 dark:text-pink-200"><Cat className="size-3.5" />ยอดขายสูง ไม่ได้แปลว่ากำไรเสมอ</span><h2 className="mt-3 flex items-center gap-2 text-lg font-bold"><Megaphone className="size-5 text-primary" />ROAS & Profit Workspace</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">เทียบ ROAS ที่แพลตฟอร์มรายงานกับกำไรหลังหักยอดคืน ต้นทุนสินค้า ค่าธรรมเนียม Fulfillment และค่าโฆษณา พร้อมหา Break-even และ Target ROAS</p></div><ActionBar><ExampleButton onExample={() => commit(exampleForm())} /><ClearButton onClear={() => commit(initialForm())} /></ActionBar></div>

      <form className="mt-6 space-y-8" onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate>
        <section aria-labelledby="roas-campaign-title"><h3 id="roas-campaign-title" className="flex items-center gap-2 font-semibold"><Megaphone className="size-4 text-primary" />1. Campaign และรายได้</h3><div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.6fr)]"><div className="grid gap-3"><Label htmlFor="roas-campaign" className="leading-5">ชื่อ Campaign <span className="text-destructive">*</span></Label><Input id="roas-campaign" maxLength={80} placeholder="เช่น Summer Sale" value={form.campaignName} onChange={(event) => update("campaignName", event.target.value)} required /></div><div className="grid gap-3"><Label htmlFor="roas-currency" className="leading-5">สกุลเงิน</Label><Select value={form.currency} onValueChange={(value) => commit({ ...form, currency: value as RoasCurrency })}><SelectTrigger id="roas-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(currencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><NumberField id="roas-gross-revenue" label="ยอดขายรวม / Conversion value" value={form.grossRevenue} onChange={(value) => update("grossRevenue", value)} hint="ยอดที่แพลตฟอร์มโฆษณาใช้รายงาน" required /><NumberField id="roas-refunds" label="คืนเงินและยกเลิก" value={form.refunds} onChange={(value) => update("refunds", value)} hint="ยอดที่ไม่ได้เป็นรายได้จริง" /><NumberField id="roas-ad-spend" label="ค่าโฆษณา" value={form.adSpend} onChange={(value) => update("adSpend", value)} hint="Spend ของช่วงเดียวกับยอดขาย" required /><NumberField id="roas-orders" label="Order / Conversion" value={form.orders} onChange={(value) => update("orders", value)} hint="ใส่ 0 หากไม่ต้องการ CPA/AOV" step={1} /></div></section>

        <section aria-labelledby="roas-cost-title"><h3 id="roas-cost-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />2. ต้นทุนที่เปลี่ยนตามยอดขาย</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">ไม่รวมค่าโฆษณา เพราะระบบหักแยกเพื่อหาเพดานงบได้ชัดเจน</p><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><NumberField id="roas-product-cost" label="ต้นทุนสินค้า / บริการ" value={form.productCost} onChange={(value) => update("productCost", value)} /><NumberField id="roas-fee-percent" label="ค่าธรรมเนียมจากยอดสุทธิ (%)" value={form.paymentFeePercent} onChange={(value) => update("paymentFeePercent", value)} max={99.9999} /><NumberField id="roas-fulfillment" label="Fulfillment และจัดส่ง" value={form.fulfillmentCost} onChange={(value) => update("fulfillmentCost", value)} /><NumberField id="roas-other-cost" label="ต้นทุนผันแปรอื่น" value={form.otherVariableCost} onChange={(value) => update("otherVariableCost", value)} /></div></section>

        <section aria-labelledby="roas-target-title"><h3 id="roas-target-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />3. เป้าหมายกำไร Campaign</h3><div className="mt-5 max-w-sm"><NumberField id="roas-target-margin" label="กำไรหลังโฆษณาต่อยอดสุทธิ (%)" value={form.targetProfitMarginPercent} onChange={(value) => update("targetProfitMarginPercent", value)} hint="ใช้หา Target ROAS และ Target CPA" max={99.9999} /></div></section>

        {error ? <Alert variant="destructive"><TriangleAlert /><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button type="submit" className="w-full sm:w-auto"><Calculator className="size-4" />คำนวณ ROAS และกำไร</Button>
      </form>

      {calculation ? <RoasResults input={calculation.input} result={calculation.result} /> : <div className="mt-8 rounded-2xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">โหลดตัวอย่างหรือกรอกยอดขาย ต้นทุน และค่าโฆษณา แล้วกดคำนวณเพื่อดู ROAS กำไร และจุดคุ้มทุน</div>}

      <div className="mt-8 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ROAS = Conversion value ÷ Ad spend ตามนิยามของ <a href="https://support.google.com/google-ads/answer/6268637?hl=en" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Google Ads</a> ส่วน Break-even และ Target ROAS ในหน้านี้เป็นแบบจำลองจาก Contribution margin และ Sales mix ปัจจุบันตามแนวคิด <a href="https://openstax.org/books/principles-managerial-accounting/pages/3-1-explain-contribution-margin-and-calculate-contribution-margin-per-unit-contribution-margin-ratio-and-total-contribution-margin" target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">Contribution margin</a> ไม่ใช่คำรับรองผลโฆษณาหรือคำแนะนำการเงิน ผลจริงอาจเปลี่ยนเมื่อยอดขาย ราคา ต้นทุน Conversion mix หรือ Attribution เปลี่ยน หากต้องการวิเคราะห์ราคาสินค้าให้ใช้ <Link href="/profit-margin-calculator" className="font-medium text-primary hover:underline">Profit Margin Calculator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
