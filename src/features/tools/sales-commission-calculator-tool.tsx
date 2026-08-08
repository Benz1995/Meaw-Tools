"use client";

import {
  BadgeDollarSign,
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  Download,
  Info,
  Plus,
  ReceiptText,
  ShieldCheck,
  Target,
  Trash2,
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
  SALES_COMMISSION_MAX_TIERS,
  calculateSalesCommission,
  salesCommissionCsv,
  type CommissionBasis,
  type CommissionPlanType,
  type SalesCommissionInput,
  type SalesCommissionResult,
} from "@/lib/tools/sales-commission";

type CurrencyCode = "THB" | "USD" | "EUR" | "GBP" | "JPY";
type TierDraft = { id: number; threshold: string; ratePercent: string };
type CommissionFormState = {
  currency: CurrencyCode;
  planType: CommissionPlanType;
  basis: CommissionBasis;
  grossSales: string;
  refunds: string;
  directCosts: string;
  salesCreditPercent: string;
  flatRatePercent: string;
  tiers: TierDraft[];
  quota: string;
  quotaBonus: string;
  payoutAdjustment: string;
  payoutCap: string;
  basePay: string;
  periodsPerYear: string;
};

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: "THB", label: "THB — บาทไทย" },
  { code: "USD", label: "USD — ดอลลาร์สหรัฐ" },
  { code: "EUR", label: "EUR — ยูโร" },
  { code: "GBP", label: "GBP — ปอนด์" },
  { code: "JPY", label: "JPY — เยน" },
];

const PLAN_OPTIONS: Array<{ value: CommissionPlanType; label: string }> = [
  { value: "flat", label: "Flat — อัตราคงที่ทั้งยอด" },
  { value: "marginal", label: "Marginal tiers — แต่ละช่วงใช้อัตราของตัวเอง" },
  { value: "retroactive", label: "Retroactive tiers — อัตราสูงสุดใช้กับทั้งยอด" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function money(value: number, currency: CurrencyCode) {
  try {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${numberFormatter.format(value)} ${currency}`;
  }
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

function createInitialForm(): CommissionFormState {
  return {
    currency: "THB",
    planType: "flat",
    basis: "revenue",
    grossSales: "",
    refunds: "0",
    directCosts: "0",
    salesCreditPercent: "100",
    flatRatePercent: "5",
    tiers: [
      { id: 1, threshold: "0", ratePercent: "4" },
      { id: 2, threshold: "50000", ratePercent: "8" },
      { id: 3, threshold: "100000", ratePercent: "12" },
    ],
    quota: "0",
    quotaBonus: "0",
    payoutAdjustment: "0",
    payoutCap: "0",
    basePay: "0",
    periodsPerYear: "12",
  };
}

function createExampleForm(): CommissionFormState {
  return {
    ...createInitialForm(),
    planType: "marginal",
    grossSales: "120000",
    refunds: "5000",
    quota: "100000",
    quotaBonus: "1000",
    payoutAdjustment: "-500",
    payoutCap: "8000",
    basePay: "25000",
  };
}

function NumberField({ id, label, value, onChange, hint, min, max, step = 0.01, placeholder = "0" }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string; min?: number; max?: number; step?: number; placeholder?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, testId, emphasized = false }: { label: string; value: string; detail: string; testId: string; emphasized?: boolean }) {
  return <div className={emphasized ? "rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-4" : "rounded-xl border bg-muted/10 p-4"}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-emerald-950 tabular-nums dark:text-emerald-100" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>;
}

function SalesCommissionResultPanel({ input, result, currency }: { input: SalesCommissionInput; result: SalesCommissionResult; currency: CurrencyCode }) {
  const attainment = result.quotaAttainmentPercent === null ? "ไม่ได้ตั้ง Quota" : `${numberFormatter.format(result.quotaAttainmentPercent)}%`;
  const effectiveRate = result.effectivePayoutRatePercent === null ? "คำนวณไม่ได้" : `${numberFormatter.format(result.effectivePayoutRatePercent)}%`;
  const summary = [
    "สรุป Sales Commission",
    `ฐานคำนวณ: ${money(result.eligibleCommissionBase, currency)}`,
    `คอมมิชชันก่อนโบนัส/ปรับยอด: ${money(result.commissionBeforeBonuses, currency)}`,
    `Commission payout สุทธิ: ${money(result.finalCommissionPayout, currency)}`,
    `Quota attainment: ${attainment}`,
    `Effective payout rate: ${effectiveRate}`,
    `รายได้รวมค่าจ้างฐานต่อรอบ: ${money(result.totalPeriodEarnings, currency)}`,
    `Commission ต่อปีโดยประมาณ: ${money(result.annualizedCommissionPayout, currency)}`,
  ].join("\n");

  return (
    <div data-testid="sales-commission-result" className="space-y-5" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="Commission payout สุทธิ / รอบ" value={money(result.finalCommissionPayout, currency)} detail={result.capReduction > 0 ? `ถูก Cap ลด ${money(result.capReduction, currency)}` : "หลังโบนัส Adjustment และ Cap"} testId="commission-payout" emphasized />
        <ResultCard label="คอมมิชชันก่อนโบนัส/ปรับยอด" value={money(result.commissionBeforeBonuses, currency)} detail={`อัตราขั้นปัจจุบัน ${numberFormatter.format(result.selectedRatePercent)}%`} testId="commission-before-adjustment" />
        <ResultCard label="รายได้รวมค่าจ้างฐาน / รอบ" value={money(result.totalPeriodEarnings, currency)} detail={`รวมค่าจ้างฐาน ${money(input.basePay, currency)}`} testId="commission-total-earnings" />
        <ResultCard label="Quota attainment" value={attainment} detail={result.amountToQuota === null ? "ไม่ได้ตั้ง Quota" : result.quotaReached ? "ถึงเป้ารอบนี้แล้ว" : `อีก ${money(result.amountToQuota, currency)} ถึงเป้า`} testId="commission-quota-attainment" />
        <ResultCard label="Commission ต่อปีโดยประมาณ" value={money(result.annualizedCommissionPayout, currency)} detail={`${input.periodsPerYear} รอบต่อปี`} testId="commission-annualized" />
        <ResultCard label="Effective payout rate" value={effectiveRate} detail="Payout สุทธิ ÷ ฐานคำนวณ" testId="commission-effective-rate" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="commission-waterfall-title">
          <h3 id="commission-waterfall-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />Payout waterfall</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">คอมมิชชันจากแผน</span><span className="tabular-nums">{money(result.commissionBeforeBonuses, currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">โบนัสเมื่อถึง Quota</span><span className="tabular-nums">+{money(result.quotaBonusEarned, currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Adjustment / Clawback</span><span className="tabular-nums">{input.payoutAdjustment >= 0 ? "+" : "−"}{money(Math.abs(input.payoutAdjustment), currency)}</span></div>
            {result.floorReduction > 0 ? <div className="flex justify-between gap-4"><span className="text-muted-foreground">Floor ที่ศูนย์</span><span className="tabular-nums">+{money(result.floorReduction, currency)}</span></div> : null}
            {result.capReduction > 0 ? <div className="flex justify-between gap-4 text-amber-700 dark:text-amber-300"><span>ลดจาก Payout cap</span><span className="tabular-nums">−{money(result.capReduction, currency)}</span></div> : null}
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>Commission payout สุทธิ</span><span className="tabular-nums">{money(result.finalCommissionPayout, currency)}</span></div>
          </div>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="commission-basis-title">
          <h3 id="commission-basis-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" />ฐานยอดขายและ Milestone</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ยอดขายหลังคืน/ยกเลิก</span><span className="tabular-nums">{money(result.netSales, currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ยอดขายที่ได้รับเครดิต {numberFormatter.format(input.salesCreditPercent)}%</span><span className="tabular-nums">{money(result.creditedNetSales, currency)}</span></div>
            {input.basis === "gross-profit" ? <><div className="flex justify-between gap-4"><span className="text-muted-foreground">ต้นทุนตรงที่ได้รับเครดิต</span><span className="tabular-nums">−{money(result.creditedDirectCosts, currency)}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">กำไรขั้นต้นที่ได้รับเครดิต</span><span className="tabular-nums">{money(result.creditedGrossProfit, currency)}</span></div></> : null}
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>ฐานคำนวณคอมมิชชัน</span><span className="tabular-nums">{money(result.eligibleCommissionBase, currency)}</span></div>
          </div>
          <div className="mt-4 grid gap-2 text-xs leading-5 text-muted-foreground">
            {result.amountToQuota !== null ? <p>{result.quotaReached ? "ถึง Quota แล้ว โบนัสถูกนับตามที่ตั้งไว้" : `เหลือ ${money(result.amountToQuota, currency)} ถึง Quota`}</p> : null}
            {result.amountToNextTier !== null ? <p>อีก {money(result.amountToNextTier, currency)} ถึงขั้นถัดไปที่ {money(result.nextTierThreshold ?? 0, currency)}</p> : input.planType === "flat" ? <p>แผน Flat ไม่มีขั้นถัดไป</p> : <p>อยู่ขั้นสูงสุดของแผนแล้ว</p>}
          </div>
        </section>
      </div>

      {input.planType !== "flat" ? (
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="commission-tier-result-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="commission-tier-result-title" className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />รายละเอียดการคิดแบบขั้นบันได</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">Marginal คิดเฉพาะยอดในแต่ละช่วง ส่วน Retroactive ใช้อัตราขั้นสูงสุดที่ถึงกับฐานทั้งก้อน</p></div>{result.marginalCommission !== null && result.retroactiveCommission !== null ? <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-card px-3 py-2 text-xs"><span className="text-muted-foreground">เปรียบเทียบก่อนโบนัส:</span><strong>Marginal {money(result.marginalCommission, currency)}</strong><span aria-hidden="true" className="text-muted-foreground">·</span><strong>Retroactive {money(result.retroactiveCommission, currency)}</strong></div> : null}</div>
          <div className="mt-4 max-w-full overflow-x-auto rounded-xl border" tabIndex={0} aria-label="ตารางรายละเอียด Commission ที่เลื่อนได้">
            <table className="w-full min-w-[44rem] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3">ขั้น</th><th className="px-4 py-3">ช่วงฐาน</th><th className="px-4 py-3 text-right">ยอดในขั้น</th><th className="px-4 py-3 text-right">อัตรา</th><th className="px-4 py-3 text-right">คอมมิชชัน</th></tr></thead><tbody>{result.tierBreakdown.map((row) => <tr key={row.tierIndex} data-testid="commission-tier-row" className="border-t"><th scope="row" className="px-4 py-3 font-medium">ขั้น {row.tierIndex + 1}</th><td className="px-4 py-3 text-muted-foreground">{money(row.threshold, currency)} – {row.nextThreshold === null ? "ไม่จำกัด" : money(row.nextThreshold, currency)}</td><td className="px-4 py-3 text-right tabular-nums">{money(row.amountInTier, currency)}</td><td className="px-4 py-3 text-right tabular-nums">{numberFormatter.format(row.ratePercent)}%</td><td className="px-4 py-3 text-right font-medium tabular-nums">{money(row.commission, currency)}</td></tr>)}</tbody></table>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(salesCommissionCsv(input, result, currency), "meaw-sales-commission.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function SalesCommissionCalculatorTool() {
  const [form, setForm] = useState<CommissionFormState>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: SalesCommissionInput; result: SalesCommissionResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateField = <Key extends keyof CommissionFormState>(key: Key, value: CommissionFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    invalidate();
  };
  const updateTier = (id: number, field: "threshold" | "ratePercent", value: string) => {
    setForm((current) => ({ ...current, tiers: current.tiers.map((tier) => tier.id === id ? { ...tier, [field]: value } : tier) }));
    invalidate();
  };
  const addTier = () => {
    setForm((current) => {
      if (current.tiers.length >= SALES_COMMISSION_MAX_TIERS) return current;
      const last = current.tiers.at(-1);
      const nextId = Math.max(0, ...current.tiers.map((tier) => tier.id)) + 1;
      const suggestedThreshold = Math.max(0, Number(last?.threshold) || 0) + 50_000;
      return { ...current, tiers: [...current.tiers, { id: nextId, threshold: String(suggestedThreshold), ratePercent: last?.ratePercent ?? "0" }] };
    });
    invalidate();
  };
  const removeTier = (id: number) => {
    setForm((current) => current.tiers.length <= 1 ? current : { ...current, tiers: current.tiers.filter((tier) => tier.id !== id) });
    invalidate();
  };

  const calculate = () => {
    try {
      const input: SalesCommissionInput = {
        planType: form.planType,
        basis: form.basis,
        grossSales: parseNumber(form.grossSales, "ยอดขายรวม", true),
        refunds: parseNumber(form.refunds, "ยอดคืน/ยกเลิก"),
        directCosts: parseNumber(form.directCosts, "ต้นทุนตรงของยอดขายสุทธิ"),
        salesCreditPercent: parseNumber(form.salesCreditPercent, "สัดส่วนเครดิตยอดขาย", true),
        flatRatePercent: parseNumber(form.flatRatePercent, "อัตราคอมมิชชันคงที่"),
        tiers: form.tiers.map((tier, index) => ({ threshold: parseNumber(tier.threshold, `ยอดเริ่มต้นขั้นที่ ${index + 1}`, true), ratePercent: parseNumber(tier.ratePercent, `อัตราขั้นที่ ${index + 1}`, true) })),
        quota: parseNumber(form.quota, "Quota"),
        quotaBonus: parseNumber(form.quotaBonus, "โบนัสเมื่อถึง Quota"),
        payoutAdjustment: parseNumber(form.payoutAdjustment, "รายการปรับเพิ่ม/Clawback"),
        payoutCap: parseNumber(form.payoutCap, "เพดาน Payout"),
        basePay: parseNumber(form.basePay, "ค่าจ้างฐานต่อรอบ"),
        periodsPerYear: parseNumber(form.periodsPerYear, "จำนวนรอบต่อปี", true),
      };
      setCalculation({ input, result: calculateSalesCommission(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณค่าคอมมิชชันได้");
    }
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>ค่าคอมมิชชันคำนวณใน Browser</AlertTitle><AlertDescription className="leading-6">ยอดขาย Quota อัตรา Payout และค่าจ้างฐานไม่ถูกส่งไป Server หรือบันทึกไว้ ข้อมูลจะหายเมื่อรีเฟรชหน้า ใช้ข้อมูลรวมของรอบแทนรายชื่อลูกค้าหรือข้อมูลดีลเมื่อทำได้</AlertDescription></Alert>

      <section aria-labelledby="commission-plan-title">
        <div><h2 id="commission-plan-title" className="flex items-center gap-2 font-semibold"><BadgeDollarSign className="size-4 text-primary" />แผนคอมมิชชันและฐานยอดขาย</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">เลือกวิธีคิดให้ตรงเอกสารแผนจริง โดยเฉพาะคำว่า Tiered ซึ่งอาจหมายถึง Marginal หรือ Retroactive คนละสูตร</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3"><Label htmlFor="commission-currency">สกุลเงินที่ใช้แสดงผล</Label><Select value={form.currency} onValueChange={(value) => updateField("currency", value as CurrencyCode)}><SelectTrigger id="commission-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">เปลี่ยนหน่วยเท่านั้น ไม่มี FX conversion</p></div>
          <div className="grid gap-3 md:col-span-1 xl:col-span-2"><Label htmlFor="commission-plan-type">รูปแบบแผน</Label><Select value={form.planType} onValueChange={(value) => updateField("planType", value as CommissionPlanType)}><SelectTrigger id="commission-plan-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PLAN_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">Marginal แยกยอดแต่ละช่วง; Retroactive ใช้อัตราขั้นที่ถึงกับทั้งฐาน</p></div>
          <div className="grid gap-3"><Label htmlFor="commission-basis">ฐานคำนวณ</Label><Select value={form.basis} onValueChange={(value) => updateField("basis", value as CommissionBasis)}><SelectTrigger id="commission-basis" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="revenue">ยอดขายสุทธิ</SelectItem><SelectItem value="gross-profit">กำไรขั้นต้น</SelectItem></SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">Gross profit = ยอดขายหลังคืน − ต้นทุนตรง</p></div>
          <NumberField id="commission-gross-sales" label={`ยอดขายรวม (${form.currency})`} value={form.grossSales} onChange={(value) => updateField("grossSales", value)} min={0.01} placeholder="120000" />
          <NumberField id="commission-refunds" label={`ยอดคืน / ยกเลิก (${form.currency})`} value={form.refunds} onChange={(value) => updateField("refunds", value)} min={0} placeholder="5000" />
          {form.basis === "gross-profit" ? <NumberField id="commission-direct-costs" label={`ต้นทุนตรงของยอดขายสุทธิ (${form.currency})`} value={form.directCosts} onChange={(value) => updateField("directCosts", value)} min={0} hint="กรอกต้นทุนหลังหักยอดคืนแล้ว ระบบคูณ Sales credit ให้อีกครั้ง" placeholder="60000" /> : null}
          <NumberField id="commission-credit" label="สัดส่วนเครดิตยอดขายของผู้รับ (%)" value={form.salesCreditPercent} onChange={(value) => updateField("salesCreditPercent", value)} min={0} max={100} hint="ใช้สำหรับ Split credit เช่น รับเครดิต 50% ของดีล" placeholder="100" />
          {form.planType === "flat" ? <NumberField id="commission-flat-rate" label="อัตราคอมมิชชันคงที่ (%)" value={form.flatRatePercent} onChange={(value) => updateField("flatRatePercent", value)} min={0} max={1000} placeholder="5" /> : null}
        </div>
      </section>

      {form.planType !== "flat" ? (
        <section className="mt-7 border-t pt-7" aria-labelledby="commission-tier-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="commission-tier-title" className="font-semibold">ขั้นบันไดและ Accelerator</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">กำหนดยอดเริ่มต้นของแต่ละขั้น ขั้นแรกต้องเป็น 0 และทุกขั้นต้องเรียงจากน้อยไปมาก</p></div><Button type="button" variant="outline" size="sm" onClick={addTier} disabled={form.tiers.length >= SALES_COMMISSION_MAX_TIERS}><Plus className="size-4" />เพิ่มขั้น</Button></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {form.tiers.map((tier, index) => <div key={tier.id} data-testid="commission-tier-input" className="rounded-xl border bg-muted/5 p-4"><div className="mb-4 flex items-center justify-between gap-3"><p className="font-medium">ขั้น {index + 1}</p><Button type="button" variant="ghost" size="icon-sm" disabled={form.tiers.length <= 1 || index === 0} onClick={() => removeTier(tier.id)} aria-label={`ลบขั้น ${index + 1}`}><Trash2 className="size-4" /></Button></div><div className="grid gap-5 sm:grid-cols-2"><NumberField id={`commission-tier-threshold-${tier.id}`} label={`ยอดเริ่มต้น (${form.currency})`} value={tier.threshold} onChange={(value) => updateTier(tier.id, "threshold", value)} min={0} step={0.01} hint={index === 0 ? "ขั้นแรกต้องเป็น 0" : undefined} /><NumberField id={`commission-tier-rate-${tier.id}`} label="อัตราคอมมิชชัน (%)" value={tier.ratePercent} onChange={(value) => updateTier(tier.id, "ratePercent", value)} min={0} max={1000} step={0.01} /></div></div>)}
          </div>
        </section>
      ) : null}

      <section className="mt-7 border-t pt-7" aria-labelledby="commission-payout-title">
        <div><h2 id="commission-payout-title" className="font-semibold">Quota, Bonus, Clawback และ Payout cap</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Quota วัดจากฐานคำนวณที่เลือก Bonus ได้เมื่อฐานถึงหรือเกิน Quota ส่วน Adjustment ติดลบใช้จำลอง Clawback ที่อนุมัติแล้ว</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <NumberField id="commission-quota" label={`Quota ต่อรอบ (${form.currency})`} value={form.quota} onChange={(value) => updateField("quota", value)} min={0} hint="0 = ไม่วัด Quota" placeholder="100000" />
          <NumberField id="commission-quota-bonus" label={`โบนัสเมื่อถึง Quota (${form.currency})`} value={form.quotaBonus} onChange={(value) => updateField("quotaBonus", value)} min={0} placeholder="1000" />
          <NumberField id="commission-adjustment" label={`ปรับเพิ่ม (+) / Clawback (−) (${form.currency})`} value={form.payoutAdjustment} onChange={(value) => updateField("payoutAdjustment", value)} hint="ใช้ยอดที่ได้รับอนุมัติแล้ว ไม่คำนวณสิทธิทางกฎหมาย" placeholder="-500" />
          <NumberField id="commission-cap" label={`เพดาน Payout ต่อรอบ (${form.currency})`} value={form.payoutCap} onChange={(value) => updateField("payoutCap", value)} min={0} hint="0 = ไม่จำกัด" placeholder="8000" />
          <NumberField id="commission-base-pay" label={`ค่าจ้างฐานต่อรอบ (${form.currency})`} value={form.basePay} onChange={(value) => updateField("basePay", value)} min={0} hint="ใช้แสดงรายได้รวม ไม่ถูกนำไปคิดคอมมิชชัน" placeholder="25000" />
          <NumberField id="commission-periods" label="จำนวนรอบจ่ายต่อปี" value={form.periodsPerYear} onChange={(value) => updateField("periodsPerYear", value)} min={1} max={366} step={1} hint="เช่น 12 รายเดือน, 26 ทุกสองสัปดาห์, 52 รายสัปดาห์" placeholder="12" />
        </div>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculate}><Calculator className="size-4" />คำนวณค่าคอมมิชชัน</Button><ExampleButton onExample={() => { setForm(createExampleForm()); setCalculation(null); setError(""); }} /><ClearButton onClear={() => { setForm(createInitialForm()); setCalculation(null); setError(""); }} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">{calculation ? <SalesCommissionResultPanel input={calculation.input} result={calculation.result} currency={form.currency} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><BadgeDollarSign className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกยอดขาย รูปแบบแผน Quota และเงื่อนไข Payout แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดงฐานคำนวณ รายละเอียดแต่ละขั้น โบนัส Cap รายได้รวม และค่ารายปีโดยประมาณ</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ผลลัพธ์เป็นแบบจำลอง Gross payout ไม่ใช่ Payroll, ภาษี, คำแนะนำกฎหมาย หรือการอนุมัติค่าคอมมิชชัน เอกสารแผนจริงอาจมี eligibility window, product rate, draw, chargeback, split, rounding และเงื่อนไขเฉพาะเพิ่มเติม ควรตรวจสูตรกับ Sales Ops, Finance และสัญญาที่มีผล หากต้องการคำนวณค่าจ้างสุทธิใช้ <Link href="/salary-calculator" className="font-medium text-primary hover:underline">Salary Calculator</Link> หรือวิเคราะห์ต้นทุนรวมด้วย <Link href="/labor-cost-calculator" className="font-medium text-primary hover:underline">Labor Cost Calculator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
