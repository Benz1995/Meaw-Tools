"use client";

import {
  Calculator,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Download,
  Info,
  Plus,
  ShieldCheck,
  Table2,
  Target,
  Trash2,
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
  BILLABLE_HOURS_MAX_ENTRIES,
  billableHoursCsv,
  buildBillingIncrementChart,
  calculateBillableHours,
  type BillableHoursInput,
  type BillableHoursResult,
  type BillableTimeKind,
  type BillingIncrementMinutes,
} from "@/lib/tools/billable-hours";

type CurrencyCode = "THB" | "USD" | "EUR" | "GBP" | "JPY";
type TimeEntryDraft = { id: string; label: string; kind: BillableTimeKind; hours: string; minutes: string };

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: "THB", label: "THB — บาทไทย" },
  { code: "USD", label: "USD — ดอลลาร์สหรัฐ" },
  { code: "EUR", label: "EUR — ยูโร" },
  { code: "GBP", label: "GBP — ปอนด์อังกฤษ" },
  { code: "JPY", label: "JPY — เยนญี่ปุ่น" },
];
const BILLING_INCREMENTS: Array<{ value: BillingIncrementMinutes; label: string }> = [
  { value: 1, label: "1 นาที — ตามเวลาจริง" },
  { value: 6, label: "6 นาที — 0.1 ชั่วโมง" },
  { value: 10, label: "10 นาที — 1/6 ชั่วโมง" },
  { value: 15, label: "15 นาที — 0.25 ชั่วโมง" },
  { value: 30, label: "30 นาที — 0.5 ชั่วโมง" },
  { value: 60, label: "60 นาที — 1 ชั่วโมง" },
];
const INITIAL_ENTRIES: TimeEntryDraft[] = [
  { id: "time-entry-1", label: "งานลูกค้า", kind: "billable", hours: "", minutes: "" },
];
const EXAMPLE_ENTRIES: TimeEntryDraft[] = [
  { id: "time-entry-1", label: "ประชุมเริ่มงาน", kind: "billable", hours: "0", minutes: "52" },
  { id: "time-entry-2", label: "ออกแบบ UX", kind: "billable", hours: "1", minutes: "23" },
  { id: "time-entry-3", label: "พัฒนา", kind: "billable", hours: "2", minutes: "10" },
  { id: "time-entry-4", label: "เสนอราคาและงานธุรการ", kind: "non-billable", hours: "1", minutes: "30" },
];
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const currencyFormatters = new Map<CurrencyCode, Intl.NumberFormat>();

function money(value: number, currency: CurrencyCode) {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
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

function parseWholeNumber(value: string, label: string) {
  const parsed = parseNumber(value, label);
  if (!Number.isInteger(parsed)) throw new Error(`${label}ต้องเป็นจำนวนเต็ม`);
  return parsed;
}

function formatDuration(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes - hours * 60;
  if (hours === 0) return `${numberFormatter.format(minutes)} นาที`;
  if (minutes < 0.005) return `${numberFormatter.format(hours)} ชม.`;
  return `${numberFormatter.format(hours)} ชม. ${numberFormatter.format(minutes)} นาที`;
}

function NumberField({ id, label, value, onChange, hint, min = 0, max = 1_000_000_000_000, step = 0.01, placeholder = "0" }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: React.ReactNode; min?: number; max?: number; step?: number; placeholder?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; testId?: string }) {
  return <div className={emphasized ? "rounded-xl border border-sky-500/35 bg-sky-500/5 p-4" : "rounded-xl border bg-muted/10 p-4"}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-sky-950 tabular-nums dark:text-sky-100" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}</div>;
}

function BreakdownRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}><span className="text-muted-foreground">{label}</span><span className="shrink-0 text-right tabular-nums">{value}</span></div>;
}

function BillingIncrementChart({ increment }: { increment: BillingIncrementMinutes }) {
  const rows = buildBillingIncrementChart(increment);
  return (
    <details className="rounded-xl border bg-muted/5 p-4 sm:p-5" open={rows.length <= 12}>
      <summary className="cursor-pointer font-semibold marker:text-primary">ตารางแปลงเวลารอบละ {increment} นาที</summary>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">แสดงการปัดขึ้นต่อรายการสำหรับเวลาจริง 1–60 นาที ไม่ใช่การรับรองวิธีคิดค่าบริการตามสัญญาหรือวิชาชีพ</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div key={row.fromMinute} className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2 text-sm">
            <span>{row.fromMinute === row.toMinute ? row.fromMinute : `${row.fromMinute}–${row.toMinute}`} นาที</span>
            <span className="font-medium tabular-nums">{numberFormatter.format(row.billedDecimalHours)} ชม.</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function BillableResultPanel({ input, result, currency }: { input: BillableHoursInput; result: BillableHoursResult; currency: CurrencyCode }) {
  const utilizationWidth = Math.min(100, Math.max(0, result.utilizationPercent));
  const targetWidth = Math.min(100, Math.max(0, input.targetUtilizationPercent));
  const targetStatus = result.gapToTargetMinutes > 0
    ? `ขาดอีก ${formatDuration(result.gapToTargetMinutes)}`
    : result.aboveTargetMinutes > 0
      ? `สูงกว่าเป้า ${formatDuration(result.aboveTargetMinutes)}`
      : "ถึงเป้าพอดี";
  const summary = [
    "สรุป Billable Hours — Meaw Tools",
    `เวลาที่บันทึกรวม: ${formatDuration(result.totalLoggedMinutes)}`,
    `Billable ก่อนปัด: ${formatDuration(result.rawBillableMinutes)}`,
    `เวลาออกบิลหลังปัด: ${formatDuration(result.invoiceMinutes)}`,
    `Billable utilization: ${numberFormatter.format(result.utilizationPercent)}%`,
    `รายรับของรอบ: ${money(result.invoiceRevenue, currency)}`,
    `รายรับตามรอบต่อปี: ${money(result.projectedAnnualInvoiceRevenue, currency)}`,
    `ช่องว่างรายรับถึงเป้าต่อปี: ${money(result.annualRevenueGap, currency)}`,
    "หมายเหตุ: utilization ใช้เวลาจริงก่อนปัดหารด้วยชั่วโมงฐาน และเป็นค่าประมาณจากข้อมูลที่กรอก",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="billable-hours-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="เวลาออกบิลหลังปัด" value={formatDuration(result.invoiceMinutes)} detail={`ก่อนปัด ${formatDuration(result.rawBillableMinutes)}`} emphasized testId="billable-invoice-hours" />
        <ResultCard label="รายรับของรอบ" value={money(result.invoiceRevenue, currency)} detail={`เรท ${money(input.hourlyRate, currency)}/ชม.`} testId="billable-invoice-revenue" />
        <ResultCard label="Billable utilization" value={`${numberFormatter.format(result.utilizationPercent)}%`} detail={`เวลาจริง ÷ ฐาน ${numberFormatter.format(input.availableHours)} ชม.`} testId="billable-utilization" />
        <ResultCard label="Effective rate ต่อเวลาที่ลงทั้งหมด" value={`${money(result.effectiveRevenuePerLoggedHour, currency)}/ชม.`} detail="รายรับหลังปัด ÷ เวลาที่บันทึกรวม" />
      </div>

      <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 sm:p-5" aria-labelledby="billable-target-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="billable-target-title" className="flex items-center gap-2 font-semibold"><Target className="size-4 text-sky-700 dark:text-sky-300" />สถานะเทียบเป้าหมาย</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">เป้า {numberFormatter.format(input.targetUtilizationPercent)}% = {formatDuration(result.targetBillableMinutes)} จากฐาน {numberFormatter.format(input.availableHours)} ชั่วโมงต่อรอบ</p></div>
          <span className="rounded-full border border-sky-500/30 bg-background/70 px-3 py-1 text-sm font-medium">{targetStatus}</span>
        </div>
        <div className="relative mt-5 h-3 overflow-visible rounded-full bg-muted" role="progressbar" aria-label="Billable utilization เทียบความจุของรอบ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, result.utilizationPercent))} aria-valuetext={`${numberFormatter.format(result.utilizationPercent)} เปอร์เซ็นต์ เป้าหมาย ${numberFormatter.format(input.targetUtilizationPercent)} เปอร์เซ็นต์`}>
          <div className="h-full rounded-full bg-sky-700 transition-[width] dark:bg-sky-400" style={{ width: `${utilizationWidth}%` }} />
          <div className="absolute -top-1 h-5 w-0.5 bg-foreground" style={{ left: `${targetWidth}%` }} aria-hidden="true" />
        </div>
        <div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground"><span>ปัจจุบัน {numberFormatter.format(result.utilizationPercent)}%</span><span>เป้า {numberFormatter.format(input.targetUtilizationPercent)}%</span></div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="billable-time-breakdown-title">
          <h2 id="billable-time-breakdown-title" className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />ที่มาของเวลา</h2>
          <div className="mt-4 space-y-3"><BreakdownRow label="เวลาที่บันทึกรวม" value={formatDuration(result.totalLoggedMinutes)} /><BreakdownRow label="Billable time ก่อนปัด" value={formatDuration(result.rawBillableMinutes)} /><BreakdownRow label="Non-billable time" value={formatDuration(result.nonBillableMinutes)} /><BreakdownRow label={`เพิ่มจากการปัด ${input.billingIncrementMinutes} นาที/รายการ`} value={formatDuration(result.roundingAdjustmentMinutes)} /><BreakdownRow label="เวลาออกบิล" value={formatDuration(result.invoiceMinutes)} strong /></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">สัดส่วน Billable ต่อเวลาที่ลงจริงคือ {numberFormatter.format(result.billableShareOfLoggedPercent)}% ส่วน utilization ใช้ชั่วโมงฐานที่กำหนด ไม่ใช้เวลาที่ลงเป็นตัวหาร</p>
        </section>
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="billable-revenue-breakdown-title">
          <h2 id="billable-revenue-breakdown-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />รายรับและผลต่อปี</h2>
          <div className="mt-4 space-y-3"><BreakdownRow label="มูลค่าเวลาจริงก่อนปัด" value={money(result.rawBillableValue, currency)} /><BreakdownRow label="ส่วนเพิ่มจากการปัด" value={money(result.roundingAdjustmentRevenue, currency)} /><BreakdownRow label="รายรับของรอบหลังปัด" value={money(result.invoiceRevenue, currency)} /><BreakdownRow label={`มูลค่าเวลาจริง × ${input.periodsPerYear} รอบ`} value={money(result.projectedAnnualRawRevenue, currency)} /><BreakdownRow label={`รายรับหลังปัด × ${input.periodsPerYear} รอบ`} value={money(result.projectedAnnualInvoiceRevenue, currency)} /><BreakdownRow label="รายรับที่เป้าหมายต่อปี" value={money(result.targetAnnualRevenue, currency)} /><BreakdownRow label="ช่องว่างจากเวลาจริงถึงเป้าต่อปี" value={money(result.annualRevenueGap, currency)} strong /></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">ช่องว่างถึงเป้าใช้เวลาจริงก่อนปัด เพื่อไม่ให้การปัดบิลทำให้ utilization ดูสูงขึ้น ตัวเลขรายปีสมมติว่ารอบนี้เกิดซ้ำ {input.periodsPerYear} ครั้ง ไม่ใช่การรับประกันรายได้</p>
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="billable-entry-breakdown-title">
        <h2 id="billable-entry-breakdown-title" className="flex items-center gap-2 font-semibold"><Table2 className="size-4 text-primary" />ผลแยกตามรายการ</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[46rem] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 font-medium">รายการ</th><th className="pb-3 pr-4 font-medium">ประเภท</th><th className="pb-3 pr-4 text-right font-medium">เวลาจริง</th><th className="pb-3 pr-4 text-right font-medium">เวลาออกบิล</th><th className="pb-3 text-right font-medium">มูลค่า</th></tr></thead><tbody>{result.entries.map((entry, index) => <tr key={`${index}-${entry.label}-${entry.kind}`} className="border-t"><td className="py-3 pr-4 font-medium">{entry.label}</td><td className="py-3 pr-4 text-muted-foreground">{entry.kind === "billable" ? "Billable" : "Non-billable"}</td><td className="py-3 pr-4 text-right tabular-nums">{formatDuration(entry.minutes)}</td><td className="py-3 pr-4 text-right tabular-nums">{formatDuration(entry.invoiceMinutes)}</td><td className="py-3 text-right tabular-nums">{money(entry.invoiceValue, currency)}</td></tr>)}</tbody></table></div>
      </section>

      <BillingIncrementChart increment={input.billingIncrementMinutes} />
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(billableHoursCsv(input, result, currency), "meaw-billable-hours.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function BillableHoursCalculatorTool() {
  const nextEntryId = useRef(5);
  const [currency, setCurrency] = useState<CurrencyCode>("THB");
  const [billingIncrement, setBillingIncrement] = useState<BillingIncrementMinutes>(6);
  const [entries, setEntries] = useState<TimeEntryDraft[]>(INITIAL_ENTRIES);
  const [hourlyRate, setHourlyRate] = useState("1500");
  const [availableHours, setAvailableHours] = useState("40");
  const [targetUtilization, setTargetUtilization] = useState("75");
  const [periodsPerYear, setPeriodsPerYear] = useState("48");
  const [calculation, setCalculation] = useState<{ input: BillableHoursInput; result: BillableHoursResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateValue = (setter: (value: string) => void) => (value: string) => { setter(value); invalidate(); };
  const updateEntry = (id: string, patch: Partial<TimeEntryDraft>) => { setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry)); invalidate(); };
  const removeEntry = (id: string) => { setEntries((current) => current.length > 1 ? current.filter((entry) => entry.id !== id) : current); invalidate(); };
  const addEntry = () => {
    if (entries.length >= BILLABLE_HOURS_MAX_ENTRIES) { setError(`เพิ่มได้สูงสุด ${BILLABLE_HOURS_MAX_ENTRIES} รายการ`); return; }
    const id = `time-entry-${nextEntryId.current++}`;
    setEntries((current) => [...current, { id, label: `รายการ ${current.length + 1}`, kind: "billable", hours: "", minutes: "" }]);
    invalidate();
  };
  const calculate = () => {
    try {
      const input: BillableHoursInput = {
        entries: entries.map((entry, index) => {
          const hours = parseWholeNumber(entry.hours, `ชั่วโมงรายการที่ ${index + 1}`);
          const minutes = parseWholeNumber(entry.minutes, `นาทีรายการที่ ${index + 1}`);
          if (minutes < 0 || minutes > 59) throw new Error(`นาทีรายการที่ ${index + 1} ต้องอยู่ระหว่าง 0 ถึง 59`);
          return { label: entry.label, kind: entry.kind, minutes: hours * 60 + minutes };
        }),
        hourlyRate: parseNumber(hourlyRate, "เรทที่เรียกเก็บต่อชั่วโมง", true),
        availableHours: parseNumber(availableHours, "ชั่วโมงทำงานที่ใช้เป็นฐาน", true),
        targetUtilizationPercent: parseNumber(targetUtilization, "เป้าหมาย utilization", true),
        periodsPerYear: parseWholeNumber(periodsPerYear, "จำนวนรอบต่อปี"),
        billingIncrementMinutes: billingIncrement,
      };
      setCalculation({ input, result: calculateBillableHours(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณได้");
    }
  };
  const loadExample = () => {
    setCurrency("THB"); setBillingIncrement(6); setEntries(EXAMPLE_ENTRIES); setHourlyRate("1500"); setAvailableHours("8"); setTargetUtilization("75"); setPeriodsPerYear("48"); setCalculation(null); setError(""); nextEntryId.current = 5;
  };
  const clear = () => {
    setCurrency("THB"); setBillingIncrement(6); setEntries(INITIAL_ENTRIES); setHourlyRate(""); setAvailableHours("40"); setTargetUtilization("75"); setPeriodsPerYear("48"); setCalculation(null); setError(""); nextEntryId.current = 2;
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5"><ShieldCheck className="text-sky-700 dark:text-sky-300" /><AlertTitle>Time log ส่วนตัว คำนวณใน Browser</AlertTitle><AlertDescription className="leading-6">รายการงาน เวลา เรท และผลคำนวณไม่ถูกส่งไป Server เมื่อรีเฟรชหน้าข้อมูลจะหาย ควรใช้คำอธิบายงานทั่วไปแทนข้อมูลลูกค้าที่เป็นความลับ</AlertDescription></Alert>

      <section aria-labelledby="billable-settings-title">
        <div><h2 id="billable-settings-title" className="font-semibold">การคิดค่าบริการและฐานวัด</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">กำหนดสกุลเงิน รอบปัดต่อรายการ และชั่วโมงฐานให้ตรงกับรอบที่กำลังบันทึก เช่น 8 ชั่วโมงต่อวันหรือ 40 ชั่วโมงต่อสัปดาห์</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3"><Label htmlFor="billable-currency">สกุลเงินที่ใช้แสดงผล</Label><Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}><SelectTrigger id="billable-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">เปลี่ยนเฉพาะหน่วย ไม่มีการแปลงอัตราแลกเปลี่ยน</p></div>
          <NumberField id="billable-hourly-rate" label={`เรทที่เรียกเก็บต่อชั่วโมง (${currency})`} value={hourlyRate} onChange={updateValue(setHourlyRate)} min={0.01} step={0.01} placeholder="1500" />
          <div className="grid gap-3"><Label htmlFor="billable-increment">รอบปัดเวลาออกบิลต่อรายการ</Label><Select value={String(billingIncrement)} onValueChange={(value) => { setBillingIncrement(Number(value) as BillingIncrementMinutes); invalidate(); }}><SelectTrigger id="billable-increment" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{BILLING_INCREMENTS.map((item) => <SelectItem key={item.value} value={String(item.value)}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">ปัดขึ้นแยกแต่ละรายการ โปรดตรวจเงื่อนไขสัญญาก่อนใช้</p></div>
          <NumberField id="billable-available-hours" label="ชั่วโมงทำงานที่ใช้เป็นฐานของรอบ" value={availableHours} onChange={updateValue(setAvailableHours)} min={0.01} max={168} step={0.25} placeholder="40" hint="ตัวหารของ utilization ไม่ใช่เวลาที่ลงจริง" />
          <NumberField id="billable-target-utilization" label="เป้าหมาย Billable utilization (%)" value={targetUtilization} onChange={updateValue(setTargetUtilization)} min={0} max={100} step={0.1} placeholder="75" hint="เป็นเป้าที่คุณกำหนด ไม่ใช่ benchmark บังคับ" />
          <NumberField id="billable-periods-year" label="จำนวนรอบลักษณะเดียวกันต่อปี" value={periodsPerYear} onChange={updateValue(setPeriodsPerYear)} min={1} max={366} step={1} placeholder="48" hint="เช่น 48 สัปดาห์ที่รับงาน ใช้ประมาณการรายปี" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="billable-time-entries-title">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="billable-time-entries-title" className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />รายการเวลาในรอบนี้</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Billable คือเวลาที่ออกบิลลูกค้าได้ ส่วน Non-billable ใช้วัดงานภายใน โดยระบบจะไม่ปัดหรือคิดรายรับให้รายการ Non-billable</p></div><Button type="button" variant="outline" onClick={addEntry} disabled={entries.length >= BILLABLE_HOURS_MAX_ENTRIES}><Plus className="size-4" />เพิ่มรายการ</Button></div>
        <div className="mt-5 space-y-4">{entries.map((entry, index) => <div key={entry.id} className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border bg-muted/5 p-4 xl:grid-cols-[1.4fr_0.85fr_0.55fr_0.55fr_auto] xl:items-end"><div className="col-span-2 grid gap-3 xl:col-span-1"><Label htmlFor={`${entry.id}-label`}>ชื่องาน / รายการ</Label><Input id={`${entry.id}-label`} value={entry.label} maxLength={80} placeholder={`รายการ ${index + 1}`} onChange={(event) => updateEntry(entry.id, { label: event.target.value })} /></div><div className="col-span-2 grid gap-3 sm:col-span-1 xl:col-span-1"><Label htmlFor={`${entry.id}-kind`}>ประเภทเวลา</Label><Select value={entry.kind} onValueChange={(value) => updateEntry(entry.id, { kind: value as BillableTimeKind })}><SelectTrigger id={`${entry.id}-kind`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="billable">Billable</SelectItem><SelectItem value="non-billable">Non-billable</SelectItem></SelectContent></Select></div><NumberField id={`${entry.id}-hours`} label="ชั่วโมง" value={entry.hours} onChange={(value) => updateEntry(entry.id, { hours: value })} min={0} max={168} step={1} placeholder="0" /><NumberField id={`${entry.id}-minutes`} label="นาที" value={entry.minutes} onChange={(value) => updateEntry(entry.id, { minutes: value })} min={0} max={59} step={1} placeholder="0" /><Button type="button" variant="outline" size="icon" className="justify-self-start text-destructive" aria-label={`ลบ${entry.label || `รายการ ${index + 1}`}`} disabled={entries.length === 1} onClick={() => removeEntry(entry.id)}><Trash2 className="size-4" /></Button></div>)}</div>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-sky-900 text-white hover:bg-sky-950 dark:bg-sky-800 dark:hover:bg-sky-700" onClick={calculate}><Calculator className="size-4" />คำนวณ Billable Hours</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">{calculation ? <BillableResultPanel input={calculation.input} result={calculation.result} currency={currency} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><Target className="mx-auto mb-3 size-9 text-primary/70" /><p>เพิ่มรายการเวลา กำหนดเรทและชั่วโมงฐาน แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแยกเวลาจริง เวลาออกบิล utilization เป้าหมาย และประมาณการรายปี</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>การปัดเวลาและการออกบิลต้องเป็นไปตามสัญญา กฎวิชาชีพ และกฎหมายที่เกี่ยวข้อง เครื่องมือนี้ไม่สร้างใบแจ้งหนี้ ไม่จับเวลาอัตโนมัติ และไม่ใช่คำแนะนำด้านกฎหมายหรือบัญชี หากต้องหาเรทจากรายได้และต้นทุนก่อน ให้ใช้ <Link href="/hourly-rate-calculator" className="font-medium text-primary hover:underline">Hourly Rate Calculator</Link> หรือหาชั่วโมงจากเวลาเข้า–ออกด้วย <Link href="/working-hours-calculator" className="font-medium text-primary hover:underline">Working Hours Calculator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
