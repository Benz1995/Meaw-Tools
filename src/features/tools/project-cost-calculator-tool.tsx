"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Download,
  Gauge,
  Info,
  Plus,
  ShieldCheck,
  Table2,
  Target,
  Trash2,
  UsersRound,
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
  calculateProjectCost,
  PROJECT_COST_MAX_DIRECT_ITEMS,
  PROJECT_COST_MAX_LABOR_ITEMS,
  projectCostCsv,
  type ProjectCostInput,
  type ProjectCostResult,
} from "@/lib/tools/project-cost";

type CurrencyCode = "THB" | "USD" | "EUR" | "GBP" | "JPY";
type LaborDraft = { id: string; label: string; hourlyCost: string; budgetHours: string; actualHours: string; remainingHours: string };
type DirectCostDraft = { id: string; label: string; budgetCost: string; actualCost: string; remainingCost: string };

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: "THB", label: "THB — บาทไทย" },
  { code: "USD", label: "USD — ดอลลาร์สหรัฐ" },
  { code: "EUR", label: "EUR — ยูโร" },
  { code: "GBP", label: "GBP — ปอนด์อังกฤษ" },
  { code: "JPY", label: "JPY — เยนญี่ปุ่น" },
];

const INITIAL_LABOR: LaborDraft[] = [{ id: "project-labor-1", label: "ทีมงาน", hourlyCost: "", budgetHours: "", actualHours: "", remainingHours: "" }];
const INITIAL_DIRECT_COSTS: DirectCostDraft[] = [{ id: "project-direct-1", label: "ค่าใช้จ่ายโครงการ", budgetCost: "", actualCost: "", remainingCost: "" }];
const EXAMPLE_LABOR: LaborDraft[] = [
  { id: "project-labor-1", label: "ออกแบบ UX", hourlyCost: "600", budgetHours: "100", actualHours: "90", remainingHours: "20" },
  { id: "project-labor-2", label: "พัฒนา", hourlyCost: "850", budgetHours: "250", actualHours: "220", remainingHours: "50" },
  { id: "project-labor-3", label: "บริหารโครงการ", hourlyCost: "700", budgetHours: "80", actualHours: "70", remainingHours: "20" },
];
const EXAMPLE_DIRECT_COSTS: DirectCostDraft[] = [
  { id: "project-direct-1", label: "ซอฟต์แวร์และระบบ", budgetCost: "25000", actualCost: "20000", remainingCost: "10000" },
  { id: "project-direct-2", label: "ผู้รับเหมาช่วง", budgetCost: "35000", actualCost: "25000", remainingCost: "15000" },
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

function signedMoney(value: number, currency: CurrencyCode) {
  if (Math.abs(value) < 0.005) return money(0, currency);
  return `${value > 0 ? "+" : "−"}${money(Math.abs(value), currency)}`;
}

function signedNumber(value: number, suffix = "") {
  if (Math.abs(value) < 0.005) return `0${suffix}`;
  return `${value > 0 ? "+" : "−"}${numberFormatter.format(Math.abs(value))}${suffix}`;
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

function NumberField({ id, label, value, onChange, hint, min = 0, max = 1_000_000_000_000, step = 0.01, placeholder = "0" }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: React.ReactNode; min?: number; max?: number; step?: number; placeholder?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, emphasized = false, danger = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; danger?: boolean; testId?: string }) {
  const frame = danger ? "border-rose-500/35 bg-rose-500/5" : emphasized ? "border-teal-500/35 bg-teal-500/5" : "bg-muted/10";
  const text = danger ? "text-rose-800 dark:text-rose-200" : emphasized ? "text-teal-950 dark:text-teal-100" : "";
  return <div className={`rounded-xl border p-4 ${frame}`}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={`mt-1 text-xl font-bold tabular-nums ${text}`}>{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}</div>;
}

function BreakdownRow({ label, value, strong = false, tone = "default" }: { label: string; value: string; strong?: boolean; tone?: "default" | "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-teal-700 dark:text-teal-300" : tone === "bad" ? "text-rose-700 dark:text-rose-300" : "";
  return <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}><span className="text-muted-foreground">{label}</span><span className={`shrink-0 text-right tabular-nums ${toneClass}`}>{value}</span></div>;
}

function ProjectResultPanel({ input, result, currency }: { input: ProjectCostInput; result: ProjectCostResult; currency: CurrencyCode }) {
  const isLoss = result.forecast.profit < 0;
  const targetMet = result.target.costHeadroom >= -0.005;
  const marginWidth = Math.min(100, Math.max(0, result.forecast.marginPercent));
  const targetWidth = Math.min(100, Math.max(0, input.targetMarginPercent));
  const targetStatus = targetMet
    ? `เหลือต้นทุนได้อีก ${money(Math.max(0, result.target.costHeadroom), currency)}`
    : `ต้นทุนเกินกรอบเป้า ${money(Math.abs(result.target.costHeadroom), currency)}`;
  const summary = [
    "สรุป Project Cost & Profit — Meaw Tools",
    `รายรับปัจจุบัน: ${money(result.currentRevenue, currency)}`,
    `ต้นทุนตามงบเดิม: ${money(result.budget.totalCost, currency)}`,
    `ต้นทุนคาดการณ์จบงาน: ${money(result.forecast.totalCost, currency)}`,
    `กำไรคาดการณ์: ${money(result.forecast.profit, currency)}`,
    `Margin คาดการณ์: ${numberFormatter.format(result.forecast.marginPercent)}%`,
    `ส่วนต่างต้นทุนจากงบ: ${signedMoney(result.variance.totalCost, currency)}`,
    `ส่วนต่างกำไรจากแผน: ${signedMoney(result.variance.profit, currency)}`,
    `เป้าหมาย Margin: ${numberFormatter.format(input.targetMarginPercent)}%`,
    `รายรับเพิ่มที่ต้องมีเพื่อถึงเป้า: ${money(result.target.additionalRevenueNeeded, currency)}`,
    "หมายเหตุ: Forecast = ต้นทุนเกิดแล้ว + ต้นทุนที่คาดว่าจะเหลือ และนับเฉพาะรายรับงานเพิ่มที่อนุมัติแล้ว",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="project-cost-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="รายรับปัจจุบัน" value={money(result.currentRevenue, currency)} detail={`สัญญาเดิม + งานเพิ่ม ${money(input.approvedChangeRevenue, currency)}`} testId="project-current-revenue" />
        <ResultCard label="ต้นทุนคาดการณ์จบงาน" value={money(result.forecast.totalCost, currency)} detail={`เกิดแล้ว ${money(result.actual.totalCost, currency)} · เหลือ ${money(result.remaining.totalCost, currency)}`} testId="project-forecast-cost" />
        <ResultCard label="กำไรคาดการณ์" value={money(result.forecast.profit, currency)} detail={`เปลี่ยนจากแผน ${signedMoney(result.variance.profit, currency)}`} emphasized={!isLoss} danger={isLoss} testId="project-forecast-profit" />
        <ResultCard label="Margin คาดการณ์" value={`${numberFormatter.format(result.forecast.marginPercent)}%`} detail={`แผนเดิม ${numberFormatter.format(result.budget.marginPercent)}%`} emphasized={targetMet} danger={!targetMet} testId="project-forecast-margin" />
      </div>

      <section className={`rounded-xl border p-4 sm:p-5 ${targetMet ? "border-teal-500/30 bg-teal-500/5" : "border-rose-500/30 bg-rose-500/5"}`} aria-labelledby="project-target-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="project-target-title" className="flex items-center gap-2 font-semibold"><Target className="size-4" />สถานะเทียบเป้าหมาย Margin</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">เป้า {numberFormatter.format(input.targetMarginPercent)}% อนุญาตให้ต้นทุนรวมไม่เกิน {money(result.target.maximumCost, currency)} จากรายรับที่อนุมัติแล้ว</p></div>
          <span className="rounded-full border bg-background/75 px-3 py-1 text-sm font-medium">{targetStatus}</span>
        </div>
        <div className="relative mt-5 h-3 overflow-visible rounded-full bg-muted" role="progressbar" aria-label="Margin คาดการณ์เทียบเป้าหมาย" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(marginWidth)} aria-valuetext={`${numberFormatter.format(result.forecast.marginPercent)} เปอร์เซ็นต์ เป้าหมาย ${numberFormatter.format(input.targetMarginPercent)} เปอร์เซ็นต์`}>
          <div className={`h-full rounded-full transition-[width] ${targetMet ? "bg-teal-700 dark:bg-teal-400" : "bg-rose-700 dark:bg-rose-400"}`} style={{ width: `${marginWidth}%` }} />
          <div className="absolute -top-1 h-5 w-0.5 bg-foreground" style={{ left: `${targetWidth}%` }} aria-hidden="true" />
        </div>
        <div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground"><span>Forecast {numberFormatter.format(result.forecast.marginPercent)}%</span><span>เป้า {numberFormatter.format(input.targetMarginPercent)}%</span></div>
        {!targetMet ? <p className="mt-4 text-sm leading-6">หากต้นทุนไม่ลดลง ต้องมีรายรับที่อนุมัติเพิ่มอย่างน้อย <strong data-testid="project-additional-revenue">{money(result.target.additionalRevenueNeeded, currency)}</strong> เพื่อให้ถึงเป้า โดยสูตรนี้ไม่ได้ถือว่างานที่ยังไม่อนุมัติเป็นรายรับ</p> : null}
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="project-comparison-title">
        <h2 id="project-comparison-title" className="flex items-center gap-2 font-semibold"><Table2 className="size-4 text-primary" />Budget เทียบ Actual + Remaining</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">ส่วนต่างบวกของต้นทุนหมายถึงใช้เกินงบ ส่วนต่างบวกของกำไรหมายถึงดีขึ้นจากแผนเดิม</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[48rem] text-right text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">รายการ</th><th className="pb-3 px-3 font-medium">ตามงบ</th><th className="pb-3 px-3 font-medium">เกิดแล้ว</th><th className="pb-3 px-3 font-medium">คาดว่าเหลือ</th><th className="pb-3 px-3 font-medium">Forecast</th><th className="pb-3 pl-3 font-medium">ส่วนต่าง</th></tr></thead><tbody className="divide-y">
          <tr><th className="py-3 pr-4 text-left font-medium">ชั่วโมงแรงงาน</th><td className="px-3 tabular-nums">{numberFormatter.format(result.budget.laborHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(result.actual.laborHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(result.remaining.laborHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(result.forecast.laborHours)}</td><td className="pl-3 tabular-nums">{signedNumber(result.variance.laborHours, " ชม.")}</td></tr>
          <tr><th className="py-3 pr-4 text-left font-medium">ต้นทุนแรงงาน</th><td className="px-3 tabular-nums">{money(result.budget.laborCost, currency)}</td><td className="px-3 tabular-nums">{money(result.actual.laborCost, currency)}</td><td className="px-3 tabular-nums">{money(result.remaining.laborCost, currency)}</td><td className="px-3 tabular-nums">{money(result.forecast.laborCost, currency)}</td><td className="pl-3 tabular-nums">{signedMoney(result.variance.laborCost, currency)}</td></tr>
          <tr><th className="py-3 pr-4 text-left font-medium">ต้นทุนตรง</th><td className="px-3 tabular-nums">{money(result.budget.directCost, currency)}</td><td className="px-3 tabular-nums">{money(result.actual.directCost, currency)}</td><td className="px-3 tabular-nums">{money(result.remaining.directCost, currency)}</td><td className="px-3 tabular-nums">{money(result.forecast.directCost, currency)}</td><td className="pl-3 tabular-nums">{signedMoney(result.variance.directCost, currency)}</td></tr>
          <tr><th className="py-3 pr-4 text-left font-medium">Overhead ที่จัดสรร</th><td className="px-3 tabular-nums">{money(result.budget.overhead, currency)}</td><td className="px-3 tabular-nums">{money(result.actual.overhead, currency)}</td><td className="px-3 tabular-nums">{money(result.remaining.overhead, currency)}</td><td className="px-3 tabular-nums">{money(result.forecast.overhead, currency)}</td><td className="pl-3 tabular-nums">{signedMoney(result.variance.overhead, currency)}</td></tr>
          <tr className="font-semibold"><th className="py-3 pr-4 text-left">ต้นทุนรวม</th><td className="px-3 tabular-nums">{money(result.budget.totalCost, currency)}</td><td className="px-3 tabular-nums">{money(result.actual.totalCost, currency)}</td><td className="px-3 tabular-nums">{money(result.remaining.totalCost, currency)}</td><td className="px-3 tabular-nums">{money(result.forecast.totalCost, currency)}</td><td className="pl-3 tabular-nums">{signedMoney(result.variance.totalCost, currency)}</td></tr>
        </tbody></table></div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="project-profit-title">
          <h2 id="project-profit-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />กำไรและรายรับ</h2>
          <div className="mt-4 space-y-3"><BreakdownRow label="รายรับตามสัญญาเดิม" value={money(result.budget.revenue, currency)} /><BreakdownRow label="รายรับงานเพิ่มที่อนุมัติ" value={money(result.variance.revenue, currency)} /><BreakdownRow label="รายรับปัจจุบัน" value={money(result.currentRevenue, currency)} /><BreakdownRow label="Break-even revenue" value={money(result.breakEvenRevenue, currency)} /><BreakdownRow label="กำไรคาดการณ์" value={money(result.forecast.profit, currency)} strong tone={isLoss ? "bad" : "good"} /></div>
        </section>
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="project-rate-title">
          <h2 id="project-rate-title" className="flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />ผลต่อชั่วโมงและแผนเดิม</h2>
          <div className="mt-4 space-y-3"><BreakdownRow label="ต้นทุนเฉลี่ยต่อ Forecast hour" value={result.averageForecastCostPerLaborHour === null ? "ไม่มีชั่วโมง" : `${money(result.averageForecastCostPerLaborHour, currency)}/ชม.`} /><BreakdownRow label="รายรับต่อ Forecast hour" value={result.effectiveRevenuePerLaborHour === null ? "ไม่มีชั่วโมง" : `${money(result.effectiveRevenuePerLaborHour, currency)}/ชม.`} /><BreakdownRow label="กำไรตามแผนเดิม" value={money(result.budget.profit, currency)} /><BreakdownRow label="ส่วนต่างกำไร" value={signedMoney(result.variance.profit, currency)} tone={result.variance.profit >= 0 ? "good" : "bad"} /><BreakdownRow label="ส่วนต่าง Margin" value={signedNumber(result.variance.marginPoints, " จุด")} strong tone={result.variance.marginPoints >= 0 ? "good" : "bad"} /></div>
        </section>
      </div>

      <details className="rounded-xl border bg-muted/5 p-4 sm:p-5">
        <summary className="cursor-pointer font-semibold marker:text-primary">ดูผลแยกตามบทบาทและต้นทุนตรง</summary>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[48rem] text-right text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">บทบาท</th><th className="pb-3 px-3 font-medium">Budget hours</th><th className="pb-3 px-3 font-medium">Forecast hours</th><th className="pb-3 px-3 font-medium">Budget cost</th><th className="pb-3 px-3 font-medium">Forecast cost</th><th className="pb-3 pl-3 font-medium">ส่วนต่าง</th></tr></thead><tbody className="divide-y">{result.laborItems.map((item, index) => <tr key={`${item.label}-${index}`}><th className="py-3 pr-4 text-left font-medium">{item.label}</th><td className="px-3 tabular-nums">{numberFormatter.format(item.budgetHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(item.forecastHours)}</td><td className="px-3 tabular-nums">{money(item.budgetCost, currency)}</td><td className="px-3 tabular-nums">{money(item.forecastCost, currency)}</td><td className="pl-3 tabular-nums">{signedMoney(item.costVariance, currency)}</td></tr>)}</tbody></table></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[40rem] text-right text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">ต้นทุนตรง</th><th className="pb-3 px-3 font-medium">ตามงบ</th><th className="pb-3 px-3 font-medium">เกิดแล้ว</th><th className="pb-3 px-3 font-medium">Forecast</th><th className="pb-3 pl-3 font-medium">ส่วนต่าง</th></tr></thead><tbody className="divide-y">{result.directCostItems.map((item, index) => <tr key={`${item.label}-${index}`}><th className="py-3 pr-4 text-left font-medium">{item.label}</th><td className="px-3 tabular-nums">{money(item.budgetCost, currency)}</td><td className="px-3 tabular-nums">{money(item.actualCost, currency)}</td><td className="px-3 tabular-nums">{money(item.forecastCost, currency)}</td><td className="pl-3 tabular-nums">{signedMoney(item.costVariance, currency)}</td></tr>)}</tbody></table></div>
      </details>

      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(projectCostCsv(input, result, currency), "meaw-project-cost-profit.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function ProjectCostCalculatorTool() {
  const nextLaborId = useRef(4);
  const nextDirectId = useRef(3);
  const [currency, setCurrency] = useState<CurrencyCode>("THB");
  const [baseRevenue, setBaseRevenue] = useState("");
  const [approvedChangeRevenue, setApprovedChangeRevenue] = useState("0");
  const [targetMargin, setTargetMargin] = useState("30");
  const [laborItems, setLaborItems] = useState<LaborDraft[]>(INITIAL_LABOR);
  const [directCostItems, setDirectCostItems] = useState<DirectCostDraft[]>(INITIAL_DIRECT_COSTS);
  const [budgetOverhead, setBudgetOverhead] = useState("0");
  const [actualOverhead, setActualOverhead] = useState("0");
  const [remainingOverhead, setRemainingOverhead] = useState("0");
  const [calculation, setCalculation] = useState<{ input: ProjectCostInput; result: ProjectCostResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateValue = (setter: (value: string) => void) => (value: string) => { setter(value); invalidate(); };
  const updateLabor = (id: string, patch: Partial<LaborDraft>) => { setLaborItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); invalidate(); };
  const updateDirectCost = (id: string, patch: Partial<DirectCostDraft>) => { setDirectCostItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); invalidate(); };
  const addLabor = () => {
    if (laborItems.length >= PROJECT_COST_MAX_LABOR_ITEMS) { setError(`เพิ่มบทบาทได้สูงสุด ${PROJECT_COST_MAX_LABOR_ITEMS} รายการ`); return; }
    const id = `project-labor-${nextLaborId.current++}`;
    setLaborItems((current) => [...current, { id, label: `บทบาท ${current.length + 1}`, hourlyCost: "", budgetHours: "", actualHours: "", remainingHours: "" }]); invalidate();
  };
  const addDirectCost = () => {
    if (directCostItems.length >= PROJECT_COST_MAX_DIRECT_ITEMS) { setError(`เพิ่มต้นทุนตรงได้สูงสุด ${PROJECT_COST_MAX_DIRECT_ITEMS} รายการ`); return; }
    const id = `project-direct-${nextDirectId.current++}`;
    setDirectCostItems((current) => [...current, { id, label: `ต้นทุน ${current.length + 1}`, budgetCost: "", actualCost: "", remainingCost: "" }]); invalidate();
  };
  const removeLabor = (id: string) => { if (laborItems.length > 1) setLaborItems((current) => current.filter((item) => item.id !== id)); invalidate(); };
  const removeDirectCost = (id: string) => { if (directCostItems.length > 1) setDirectCostItems((current) => current.filter((item) => item.id !== id)); invalidate(); };

  const calculate = () => {
    try {
      const input: ProjectCostInput = {
        baseRevenue: parseNumber(baseRevenue, "รายรับตามสัญญาเดิม", true),
        approvedChangeRevenue: parseNumber(approvedChangeRevenue, "รายรับจากงานเพิ่มที่อนุมัติแล้ว"),
        targetMarginPercent: parseNumber(targetMargin, "เป้าหมาย Margin", true),
        laborItems: laborItems.map((item, index) => ({
          label: item.label,
          hourlyCost: parseNumber(item.hourlyCost, `ต้นทุนต่อชั่วโมงบทบาทที่ ${index + 1}`),
          budgetHours: parseNumber(item.budgetHours, `ชั่วโมงตามงบบทบาทที่ ${index + 1}`),
          actualHours: parseNumber(item.actualHours, `ชั่วโมงที่ใช้แล้วบทบาทที่ ${index + 1}`),
          remainingHours: parseNumber(item.remainingHours, `ชั่วโมงที่คาดว่าจะเหลือบทบาทที่ ${index + 1}`),
        })),
        directCostItems: directCostItems.map((item, index) => ({
          label: item.label,
          budgetCost: parseNumber(item.budgetCost, `ต้นทุนตรงตามงบรายการที่ ${index + 1}`),
          actualCost: parseNumber(item.actualCost, `ต้นทุนตรงที่เกิดแล้วรายการที่ ${index + 1}`),
          remainingCost: parseNumber(item.remainingCost, `ต้นทุนตรงที่คาดว่าจะเหลือรายการที่ ${index + 1}`),
        })),
        budgetOverhead: parseNumber(budgetOverhead, "Overhead ตามงบ"),
        actualOverhead: parseNumber(actualOverhead, "Overhead ที่เกิดแล้ว"),
        remainingOverhead: parseNumber(remainingOverhead, "Overhead ที่คาดว่าจะเหลือ"),
      };
      setCalculation({ input, result: calculateProjectCost(input) }); setError("");
    } catch (caught) {
      setCalculation(null); setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณได้");
    }
  };

  const loadExample = () => {
    setCurrency("THB"); setBaseRevenue("600000"); setApprovedChangeRevenue("40000"); setTargetMargin("30"); setLaborItems(EXAMPLE_LABOR); setDirectCostItems(EXAMPLE_DIRECT_COSTS); setBudgetOverhead("35000"); setActualOverhead("20000"); setRemainingOverhead("20000"); setCalculation(null); setError(""); nextLaborId.current = 4; nextDirectId.current = 3;
  };
  const clear = () => {
    setCurrency("THB"); setBaseRevenue(""); setApprovedChangeRevenue("0"); setTargetMargin("30"); setLaborItems(INITIAL_LABOR); setDirectCostItems(INITIAL_DIRECT_COSTS); setBudgetOverhead("0"); setActualOverhead("0"); setRemainingOverhead("0"); setCalculation(null); setError(""); nextLaborId.current = 2; nextDirectId.current = 2;
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-teal-500/30 bg-teal-500/5"><ShieldCheck className="text-teal-700 dark:text-teal-300" /><AlertTitle>ข้อมูลงบและต้นทุนคำนวณใน Browser</AlertTitle><AlertDescription className="leading-6">รายรับ เรท ชั่วโมง และค่าใช้จ่ายไม่ถูกส่งไป Server หรือบันทึกไว้ เมื่อรีเฟรชหน้าข้อมูลจะหาย ควรใช้ชื่อบทบาททั่วไปแทนชื่อลูกค้าหรือพนักงาน</AlertDescription></Alert>

      <section aria-labelledby="project-revenue-settings-title">
        <div><h2 id="project-revenue-settings-title" className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />รายรับและเป้าหมายโครงการ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">รายรับงานเพิ่มจะถูกนับเฉพาะส่วนที่อนุมัติแล้ว เพื่อไม่ทำให้กำไรคาดการณ์สูงเกินจริง</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3"><Label htmlFor="project-currency">สกุลเงินที่ใช้แสดงผล</Label><Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}><SelectTrigger id="project-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">เปลี่ยนเฉพาะหน่วย ไม่มีการแปลงอัตราแลกเปลี่ยน</p></div>
          <NumberField id="project-base-revenue" label={`รายรับตามสัญญาเดิม (${currency})`} value={baseRevenue} onChange={updateValue(setBaseRevenue)} min={0.01} placeholder="600000" hint="มูลค่างานเดิมที่ตกลงแล้ว ไม่ใช่ยอดรับเงินจริง" />
          <NumberField id="project-change-revenue" label={`รายรับงานเพิ่มที่อนุมัติแล้ว (${currency})`} value={approvedChangeRevenue} onChange={updateValue(setApprovedChangeRevenue)} placeholder="40000" hint="ไม่รวม change request ที่ยังรออนุมัติ" />
          <NumberField id="project-target-margin" label="เป้าหมายกำไรต่อรายรับ — Margin (%)" value={targetMargin} onChange={updateValue(setTargetMargin)} min={0} max={99.9} step={0.1} placeholder="30" hint="ใช้หาเพดานต้นทุนและรายรับเพิ่มที่ต้องมี" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="project-labor-title">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="project-labor-title" className="flex items-center gap-2 font-semibold"><UsersRound className="size-4 text-primary" />แรงงานและชั่วโมงตามบทบาท</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ต้นทุนต่อชั่วโมงควรรวมค่าจ้างและภาระที่องค์กรต้องการจัดสรร ใช้อัตราเฉลี่ยเดียวกันกับ Budget และ Forecast ของแต่ละบทบาท</p></div><Button type="button" variant="outline" onClick={addLabor} disabled={laborItems.length >= PROJECT_COST_MAX_LABOR_ITEMS}><Plus className="size-4" />เพิ่มบทบาท</Button></div>
        <div className="mt-5 space-y-4">{laborItems.map((item, index) => <div key={item.id} data-testid="project-labor-item" className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border bg-muted/5 p-4 xl:grid-cols-[1.25fr_0.85fr_0.75fr_0.75fr_0.75fr_auto] xl:items-end"><div className="col-span-2 grid gap-3 xl:col-span-1"><Label htmlFor={`${item.id}-label`}>บทบาท / กลุ่มงาน</Label><Input id={`${item.id}-label`} value={item.label} maxLength={80} placeholder={`บทบาท ${index + 1}`} onChange={(event) => updateLabor(item.id, { label: event.target.value })} /></div><NumberField id={`${item.id}-rate`} label={`ต้นทุน/ชม. (${currency})`} value={item.hourlyCost} onChange={(value) => updateLabor(item.id, { hourlyCost: value })} placeholder="850" /><NumberField id={`${item.id}-budget`} label="ชั่วโมงตามงบ" value={item.budgetHours} onChange={(value) => updateLabor(item.id, { budgetHours: value })} max={1_000_000} step={0.25} placeholder="250" /><NumberField id={`${item.id}-actual`} label="ชั่วโมงที่ใช้แล้ว" value={item.actualHours} onChange={(value) => updateLabor(item.id, { actualHours: value })} max={1_000_000} step={0.25} placeholder="220" /><NumberField id={`${item.id}-remaining`} label="คาดว่าจะเหลือ" value={item.remainingHours} onChange={(value) => updateLabor(item.id, { remainingHours: value })} max={1_000_000} step={0.25} placeholder="50" /><Button type="button" variant="outline" size="icon" className="justify-self-start text-destructive" aria-label={`ลบ${item.label || `บทบาท ${index + 1}`}`} disabled={laborItems.length === 1} onClick={() => removeLabor(item.id)}><Trash2 className="size-4" /></Button></div>)}</div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="project-direct-cost-title">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="project-direct-cost-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />ต้นทุนตรงอื่นของโครงการ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">เช่น วัสดุ ซอฟต์แวร์ การเดินทาง หรือผู้รับเหมาช่วง อย่าใส่ซ้ำกับต้นทุนแรงงานหรือ Overhead</p></div><Button type="button" variant="outline" onClick={addDirectCost} disabled={directCostItems.length >= PROJECT_COST_MAX_DIRECT_ITEMS}><Plus className="size-4" />เพิ่มต้นทุน</Button></div>
        <div className="mt-5 space-y-4">{directCostItems.map((item, index) => <div key={item.id} data-testid="project-direct-cost-item" className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border bg-muted/5 p-4 xl:grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_auto] xl:items-end"><div className="col-span-2 grid gap-3 xl:col-span-1"><Label htmlFor={`${item.id}-label`}>รายการต้นทุนตรง</Label><Input id={`${item.id}-label`} value={item.label} maxLength={80} placeholder={`ต้นทุน ${index + 1}`} onChange={(event) => updateDirectCost(item.id, { label: event.target.value })} /></div><NumberField id={`${item.id}-budget`} label={`ตามงบ (${currency})`} value={item.budgetCost} onChange={(value) => updateDirectCost(item.id, { budgetCost: value })} placeholder="25000" /><NumberField id={`${item.id}-actual`} label={`เกิดแล้ว (${currency})`} value={item.actualCost} onChange={(value) => updateDirectCost(item.id, { actualCost: value })} placeholder="20000" /><NumberField id={`${item.id}-remaining`} label={`คาดว่าเหลือ (${currency})`} value={item.remainingCost} onChange={(value) => updateDirectCost(item.id, { remainingCost: value })} placeholder="10000" /><Button type="button" variant="outline" size="icon" className="justify-self-start text-destructive" aria-label={`ลบ${item.label || `ต้นทุน ${index + 1}`}`} disabled={directCostItems.length === 1} onClick={() => removeDirectCost(item.id)}><Trash2 className="size-4" /></Button></div>)}</div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="project-overhead-title">
        <div><h2 id="project-overhead-title" className="font-semibold">Overhead ที่จัดสรรให้โครงการ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกยอดที่องค์กรเลือกจัดสรร เช่น บริหาร สำนักงาน หรือระบบส่วนกลาง ระบบไม่เดาเปอร์เซ็นต์แทนคุณ</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="project-budget-overhead" label={`Overhead ตามงบ (${currency})`} value={budgetOverhead} onChange={updateValue(setBudgetOverhead)} placeholder="35000" /><NumberField id="project-actual-overhead" label={`Overhead ที่เกิดแล้ว (${currency})`} value={actualOverhead} onChange={updateValue(setActualOverhead)} placeholder="20000" /><NumberField id="project-remaining-overhead" label={`Overhead ที่คาดว่าจะเหลือ (${currency})`} value={remainingOverhead} onChange={updateValue(setRemainingOverhead)} placeholder="20000" /></div>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-teal-900 text-white hover:bg-teal-950 dark:bg-teal-800 dark:hover:bg-teal-700" onClick={calculate}><Calculator className="size-4" />คำนวณต้นทุนและกำไรโครงการ</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">{calculation ? <ProjectResultPanel input={calculation.input} result={calculation.result} currency={currency} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><Target className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกรายรับ ชั่วโมง ต้นทุนจริง และงานที่เหลือ แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะเทียบ Budget กับ Actual + Remaining พร้อมกำไร Margin และส่วนต่าง</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>เครื่องมือนี้เป็นแบบจำลองเพื่อวางแผน ไม่ใช่งบการเงิน มาตรฐานบัญชี หรือการรับรองกำไรจริง Forecast ขึ้นกับต้นทุนที่คาดว่าจะเหลือ และไม่ได้รับรู้รายได้ตามเปอร์เซ็นต์งาน หากต้องตั้งเรทก่อนเสนอราคาให้ใช้ <Link href="/hourly-rate-calculator" className="font-medium text-primary hover:underline">Hourly Rate Calculator</Link> หรือสร้างเอกสารด้วย <Link href="/quotation-generator" className="font-medium text-primary hover:underline">Quotation Generator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
