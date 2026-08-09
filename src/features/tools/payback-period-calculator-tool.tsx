"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  Clock3,
  Download,
  Info,
  Landmark,
  Plus,
  TableProperties,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculatePayback,
  PAYBACK_MAX_PERIODS,
  paybackCsv,
  type PaybackCurrency,
  type PaybackInput,
  type PaybackPeriodUnit,
  type PaybackPoint,
  type PaybackResult,
} from "@/lib/tools/payback-period";

type CashFlowForm = { id: string; label: string; amount: string };
type PaybackForm = {
  currency: PaybackCurrency;
  scenarioName: string;
  periodUnit: PaybackPeriodUnit;
  initialInvestment: string;
  annualDiscountRatePercent: string;
  targetPaybackPeriods: string;
  terminalValue: string;
  cashFlows: CashFlowForm[];
};

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const preciseFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const currencyFormatters = new Map<Exclude<PaybackCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: PaybackCurrency, signed = false) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  const prefix = signed && normalized > 0 ? "+" : "";
  if (currency === "OTHER") return `${prefix}${numberFormatter.format(normalized)} หน่วยเงิน`;
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 });
    currencyFormatters.set(currency, formatter);
  }
  return `${prefix}${formatter.format(normalized)}`;
}

function periodLabel(unit: PaybackPeriodUnit, period: number) {
  if (unit === "month") return `เดือน ${period}`;
  if (unit === "quarter") return `ไตรมาส ${period}`;
  return `ปี ${period}`;
}

function unitText(unit: PaybackPeriodUnit) {
  if (unit === "month") return "เดือน";
  if (unit === "quarter") return "ไตรมาส";
  return "ปี";
}

function createCashFlows(unit: PaybackPeriodUnit, amounts: string[]) {
  return amounts.map((amount, index) => ({ id: `cash-${index + 1}`, label: periodLabel(unit, index + 1), amount }));
}

function createInitialForm(): PaybackForm {
  return {
    currency: "THB",
    scenarioName: "",
    periodUnit: "year",
    initialInvestment: "",
    annualDiscountRatePercent: "8",
    targetPaybackPeriods: "",
    terminalValue: "0",
    cashFlows: createCashFlows("year", ["", "", "", "", ""]),
  };
}

function createExampleForm(): PaybackForm {
  return {
    currency: "THB",
    scenarioName: "เครื่องจักรใหม่ · 6 ปี",
    periodUnit: "year",
    initialInvestment: "160000",
    annualDiscountRatePercent: "9",
    targetPaybackPeriods: "5",
    terminalValue: "0",
    cashFlows: createCashFlows("year", ["20000", "40000", "50000", "50000", "50000", "50000"]),
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
  min = 0,
  max = 1_000_000_000_000_000,
  step = 0.01,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail: string; emphasized?: boolean; testId?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${emphasized ? "border-emerald-600/30 bg-emerald-600/5" : "bg-muted/10"}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function paybackText(point: PaybackPoint | null, unit: PaybackPeriodUnit) {
  return point ? `${preciseFormatter.format(point.exactPeriods)} ${unitText(unit)}` : "ยังไม่คืนทุน";
}

function targetDetail(point: PaybackPoint | null, target: number, unit: PaybackPeriodUnit, fallback: string) {
  if (!point) return fallback;
  if (target <= 0) return `คืนทุนในงวดที่ ${point.recoveryPeriodIndex} · สมมติกระแสเงินสดเกิดสม่ำเสมอภายในงวด`;
  const difference = point.exactPeriods - target;
  if (difference <= 0) return `เร็วกว่า/เท่ากับเป้า ${preciseFormatter.format(target)} ${unitText(unit)} อยู่ ${preciseFormatter.format(Math.abs(difference))} ${unitText(unit)}`;
  return `ช้ากว่าเป้า ${preciseFormatter.format(target)} ${unitText(unit)} อยู่ ${preciseFormatter.format(difference)} ${unitText(unit)}`;
}

function PaybackChart({ input, result }: { input: PaybackInput; result: PaybackResult }) {
  const titleId = useId();
  const descId = useId();
  const points = [
    { period: 0, simple: -input.initialInvestment, discounted: -input.initialInvestment },
    ...result.timeline.map((row) => ({ period: row.period, simple: row.cumulativeCashFlow, discounted: row.cumulativeDiscountedCashFlow })),
  ];
  const width = 760;
  const height = 300;
  const left = 66;
  const right = 24;
  const top = 24;
  const bottom = 52;
  const values = points.flatMap((point) => [point.simple, point.discounted, 0]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(1, maxValue - minValue);
  const x = (period: number) => left + period / Math.max(1, points.length - 1) * (width - left - right);
  const y = (value: number) => top + (maxValue - value) / span * (height - top - bottom);
  const simplePoints = points.map((point) => `${x(point.period)},${y(point.simple)}`).join(" ");
  const discountedPoints = points.map((point) => `${x(point.period)},${y(point.discounted)}`).join(" ");
  const tickIndexes = points.length <= 9 ? points.map((point) => point.period) : points.filter((_, index) => index % Math.ceil(points.length / 7) === 0 || index === points.length - 1).map((point) => point.period);

  return (
    <section className="min-w-0 rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby={`${titleId}-heading`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${titleId}-heading`} className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />กระแสเงินสดสะสมเทียบเงินลงทุน</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">จุดตัดเส้น 0 คือการคืนทุนครั้งแรก เส้น Discounted ใช้อัตราคิดลดต่องวด {preciseFormatter.format(result.periodicDiscountRatePercent)}%</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-sky-600" />Simple</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-violet-600" />Discounted</span></div>
      </div>
      <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="กราฟ Payback ที่เลื่อนได้">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full sm:min-w-[42rem]" role="img" aria-labelledby={`${titleId} ${descId}`}>
          <title id={titleId}>กราฟ Simple และ Discounted cumulative cash flow</title>
          <desc id={descId}>เริ่มที่เงินลงทุนติดลบ {money(input.initialInvestment, input.currency)} และติดตามกระแสเงินสดสะสม {result.timeline.length} {unitText(input.periodUnit)}</desc>
          <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="6 5" />
          <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="currentColor" strokeOpacity="0.2" />
          <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="currentColor" strokeOpacity="0.2" />
          <polyline points={simplePoints} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={discountedPoints} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point) => <g key={point.period}><circle cx={x(point.period)} cy={y(point.simple)} r="4" fill="#0284c7" /><circle cx={x(point.period)} cy={y(point.discounted)} r="3" fill="#7c3aed" /></g>)}
          <text x={left - 10} y={y(0) + 4} textAnchor="end" fontSize="12" fill="currentColor">0</text>
          <text x={left - 10} y={top + 5} textAnchor="end" fontSize="11" fill="currentColor">{numberFormatter.format(maxValue)}</text>
          <text x={left - 10} y={height - bottom} textAnchor="end" fontSize="11" fill="currentColor">{numberFormatter.format(minValue)}</text>
          {tickIndexes.map((period) => <text key={period} x={x(period)} y={height - bottom + 24} textAnchor="middle" fontSize="11" fill="currentColor">{period}</text>)}
          <text x={(left + width - right) / 2} y={height - 9} textAnchor="middle" fontSize="12" fill="currentColor">{unitText(input.periodUnit)}</text>
        </svg>
      </div>
    </section>
  );
}

function PaybackResultPanel({ input, result }: { input: PaybackInput; result: PaybackResult }) {
  const target = input.targetPaybackPeriods;
  const summary = [
    `Payback Period — ${input.scenarioName} — Meaw Tools`,
    `เงินลงทุนเริ่มต้น: ${money(input.initialInvestment, input.currency)}`,
    `Simple payback: ${paybackText(result.simplePayback, input.periodUnit)}`,
    `Discounted payback: ${paybackText(result.discountedPayback, input.periodUnit)}`,
    `อัตราคิดลด: ${preciseFormatter.format(input.annualDiscountRatePercent)}% ต่อปี effective (${preciseFormatter.format(result.periodicDiscountRatePercent)}% ต่องวด)`,
    `PV ของกระแสเงินสดอนาคต: ${money(result.presentValueOfFutureCashFlows, input.currency)}`,
    `NPV: ${money(result.netPresentValue, input.currency, true)}`,
    "หมายเหตุ: Payback เป็น screening metric ไม่ใช่คำแนะนำลงทุน และการหารเศษงวดสมมติกระแสเงินสดเกิดสม่ำเสมอในงวดที่คืนทุน",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="payback-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="Simple payback" value={paybackText(result.simplePayback, input.periodUnit)} detail={targetDetail(result.simplePayback, target, input.periodUnit, `ยังขาด ${money(result.simpleRemainingAtHorizon, input.currency)} เมื่อจบ Horizon`)} emphasized testId="payback-simple" />
        <ResultCard label="Discounted payback" value={paybackText(result.discountedPayback, input.periodUnit)} detail={targetDetail(result.discountedPayback, target, input.periodUnit, `ยังขาดแบบคิดลด ${money(result.discountedRemainingAtHorizon, input.currency)}`)} testId="payback-discounted" />
        <ResultCard label="Net present value (NPV)" value={money(result.netPresentValue, input.currency, true)} detail={`PV เงินสดอนาคต ${money(result.presentValueOfFutureCashFlows, input.currency)}`} testId="payback-npv" />
        <ResultCard label="Undiscounted net value" value={money(result.undiscountedNetValue, input.currency, true)} detail={`กระแสเงินสดอนาคตรวม ${money(result.totalFutureCashFlows, input.currency)}`} />
      </div>

      {(result.hasNegativeFutureCashFlow || (result.simplePayback && !result.simpleRecoveryIsSustained) || (result.discountedPayback && !result.discountedRecoveryIsSustained)) ? (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <TriangleAlert className="text-amber-700 dark:text-amber-300" />
          <AlertTitle>กระแสเงินสดมีรูปแบบที่ต้องตรวจเพิ่ม</AlertTitle>
          <AlertDescription className="leading-6">พบกระแสเงินสดติดลบหรือยอดสะสมอาจกลับมาติดลบหลังคืนทุน ตัวเลขจึงแสดง “การคืนทุนครั้งแรก” ไม่ได้รับรองว่าเงินลงทุนฟื้นตัวอย่างถาวร ควรตรวจ Timeline, NPV และ Scenario ความเสี่ยงก่อนตัดสินใจ</AlertDescription>
        </Alert>
      ) : null}

      <PaybackChart input={input} result={result} />

      <section className="min-w-0 rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="payback-timeline-title">
        <h2 id="payback-timeline-title" className="flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />Timeline กระแสเงินสด</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Terminal value ถ้ามีจะรวมเฉพาะงวดสุดท้าย ส่วน Discount factor ใช้อัตรา effective ต่องวด</p>
        <div className="mt-4 grid gap-3 sm:hidden">
          <div className="rounded-lg border bg-card p-3">
            <p className="font-medium">0 · เงินลงทุนเริ่มต้น</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <p><span className="block text-muted-foreground">สะสม Simple</span><strong className="mt-1 block tabular-nums">−{money(input.initialInvestment, input.currency)}</strong></p>
              <p><span className="block text-muted-foreground">สะสม Discounted</span><strong className="mt-1 block tabular-nums">−{money(input.initialInvestment, input.currency)}</strong></p>
            </div>
          </div>
          {result.timeline.map((row) => (
            <div key={row.period} className="rounded-lg border bg-card p-3">
              <p className="font-medium">{row.period} · {row.label}</p>
              {row.terminalValue > 0 ? <p className="mt-1 text-xs text-muted-foreground">รวม Terminal {money(row.terminalValue, input.currency)}</p> : null}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <p><span className="block text-muted-foreground">Cash flow</span><strong className="mt-1 block tabular-nums">{money(row.totalCashFlow, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">Discounted</span><strong className="mt-1 block tabular-nums">{money(row.discountedCashFlow, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">สะสม Simple</span><strong className={`mt-1 block tabular-nums ${row.cumulativeCashFlow >= 0 ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{money(row.cumulativeCashFlow, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">สะสม Discounted</span><strong className={`mt-1 block tabular-nums ${row.cumulativeDiscountedCashFlow >= 0 ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{money(row.cumulativeDiscountedCashFlow, input.currency, true)}</strong></p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="ตาราง Payback ที่เลื่อนได้">
          <table className="w-full min-w-[58rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">งวด</th><th className="px-3 pb-3 font-medium">Cash flow</th><th className="px-3 pb-3 font-medium">Discounted</th><th className="px-3 pb-3 font-medium">สะสม Simple</th><th className="pl-3 pb-3 font-medium">สะสม Discounted</th></tr></thead>
            <tbody className="divide-y">
              <tr><th className="py-3 pr-4 text-left font-medium">0 · เงินลงทุนเริ่มต้น</th><td className="px-3 tabular-nums">−{money(input.initialInvestment, input.currency)}</td><td className="px-3 tabular-nums">−{money(input.initialInvestment, input.currency)}</td><td className="px-3 tabular-nums">−{money(input.initialInvestment, input.currency)}</td><td className="pl-3 tabular-nums">−{money(input.initialInvestment, input.currency)}</td></tr>
              {result.timeline.map((row) => (
                <tr key={row.period}>
                  <th className="py-3 pr-4 text-left font-medium"><span className="block">{row.period} · {row.label}</span>{row.terminalValue > 0 ? <span className="text-xs font-normal text-muted-foreground">รวม Terminal {money(row.terminalValue, input.currency)}</span> : null}</th>
                  <td className="px-3 tabular-nums">{money(row.totalCashFlow, input.currency, true)}</td>
                  <td className="px-3 tabular-nums">{money(row.discountedCashFlow, input.currency, true)}</td>
                  <td className={`px-3 font-medium tabular-nums ${row.cumulativeCashFlow >= 0 ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{money(row.cumulativeCashFlow, input.currency, true)}</td>
                  <td className={`pl-3 font-medium tabular-nums ${row.cumulativeDiscountedCashFlow >= 0 ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{money(row.cumulativeDiscountedCashFlow, input.currency, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="payback-formula-title">
        <h2 id="payback-formula-title" className="flex items-center gap-2 font-semibold"><Landmark className="size-4 text-primary" />สูตรและวิธีอ่านผล</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><strong>Simple payback</strong><p className="mt-1 text-muted-foreground">สะสม Net cash flow จากเงินลงทุนติดลบจนถึง 0 โดยไม่คิด Time value of money</p></div>
          <div className="rounded-lg border bg-card p-3"><strong>Discounted payback</strong><p className="mt-1 text-muted-foreground">Discounted CF<sub>t</sub> = CF<sub>t</sub> ÷ (1 + r)<sup>t</sup> แล้วสะสมจนคืนทุน</p></div>
          <div className="rounded-lg border bg-card p-3"><strong>NPV</strong><p className="mt-1 text-muted-foreground">PV ของกระแสเงินสดอนาคต − เงินลงทุนเริ่มต้น ครอบคลุมทุกงวดใน Horizon</p></div>
        </div>
      </section>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุป Payback แล้ว")}><Clock3 className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="payback-csv" onClick={() => downloadText(paybackCsv(input, result), "meaw-payback-period.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </div>
  );
}

export function PaybackPeriodCalculatorTool() {
  const [form, setForm] = useState<PaybackForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: PaybackInput; result: PaybackResult } | null>(null);
  const [error, setError] = useState("");

  const updateForm = <Key extends keyof Omit<PaybackForm, "cashFlows">>(key: Key, value: PaybackForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateCashFlow = (id: string, key: "label" | "amount", value: string) => {
    setForm((current) => ({ ...current, cashFlows: current.cashFlows.map((row) => row.id === id ? { ...row, [key]: value } : row) }));
  };

  const changePeriodUnit = (periodUnit: PaybackPeriodUnit) => {
    setForm((current) => ({
      ...current,
      periodUnit,
      cashFlows: current.cashFlows.map((row, index) => ({ ...row, label: periodLabel(periodUnit, index + 1) })),
    }));
  };

  const addCashFlow = () => {
    setForm((current) => current.cashFlows.length >= PAYBACK_MAX_PERIODS ? current : ({
      ...current,
      cashFlows: [...current.cashFlows, { id: `cash-${Date.now()}-${current.cashFlows.length}`, label: periodLabel(current.periodUnit, current.cashFlows.length + 1), amount: "" }],
    }));
  };

  const removeCashFlow = (id: string) => {
    setForm((current) => current.cashFlows.length <= 1 ? current : ({ ...current, cashFlows: current.cashFlows.filter((row) => row.id !== id) }));
  };

  const calculate = () => {
    try {
      const input: PaybackInput = {
        currency: form.currency,
        scenarioName: form.scenarioName,
        periodUnit: form.periodUnit,
        initialInvestment: parseNumber(form.initialInvestment, "เงินลงทุนเริ่มต้น", true),
        annualDiscountRatePercent: parseNumber(form.annualDiscountRatePercent, "อัตราคิดลดต่อปี", true),
        targetPaybackPeriods: parseNumber(form.targetPaybackPeriods, "เป้าคืนทุน"),
        terminalValue: parseNumber(form.terminalValue, "มูลค่าคงเหลือปลายโครงการ"),
        cashFlows: form.cashFlows.map((row, index) => ({ label: row.label, amount: parseNumber(row.amount, `กระแสเงินสดงวดที่ ${index + 1}`, true) })),
      };
      setCalculation({ input, result: calculatePayback(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "คำนวณ Payback ไม่สำเร็จ");
    }
  };

  const loadExample = () => { setForm(createExampleForm()); setCalculation(null); setError(""); };
  const clear = () => { setForm(createInitialForm()); setCalculation(null); setError(""); };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>คำนวณจาก Net cash flow ไม่ใช่กำไรทางบัญชี</AlertTitle>
        <AlertDescription className="leading-6">ใส่เงินสดรับลบเงินสดจ่ายเพิ่มของโครงการในแต่ละงวด ระบบเทียบ Simple payback กับ Discounted payback และ NPV โดยอัตรารายปีถือเป็น effective annual rate แล้วแปลงเป็นอัตราต่องวด</AlertDescription>
      </Alert>

      <section aria-labelledby="payback-scenario-title">
        <h2 id="payback-scenario-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />1. Scenario และเงินลงทุน</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ช่วงเวลาชนิดเดียวกันตลอดทั้งตาราง และกรอกมูลค่าคงเหลือแยกเพื่อให้เห็นว่าไปรวมในงวดสุดท้าย</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3 sm:col-span-2">
            <Label htmlFor="payback-scenario-name">ชื่อ Scenario</Label>
            <Input id="payback-scenario-name" value={form.scenarioName} maxLength={120} placeholder="เช่น เครื่องจักรใหม่ · แผน 6 ปี" onChange={(event) => updateForm("scenarioName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้แยกสมมติฐานเมื่อดาวน์โหลด CSV</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="payback-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as PaybackCurrency)}><SelectTrigger id="payback-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="THB">THB · บาท</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent></Select>
            <p className="text-xs leading-5 text-muted-foreground">ไม่มีการแปลง FX</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="payback-period-unit">หน่วยงวด</Label>
            <Select value={form.periodUnit} onValueChange={(value) => changePeriodUnit(value as PaybackPeriodUnit)}><SelectTrigger id="payback-period-unit" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">เดือน</SelectItem><SelectItem value="quarter">ไตรมาส</SelectItem><SelectItem value="year">ปี</SelectItem></SelectContent></Select>
            <p className="text-xs leading-5 text-muted-foreground">เปลี่ยนหน่วยแล้วชื่อแถวจะปรับตาม</p>
          </div>
          <NumberField id="payback-initial-investment" label="เงินลงทุนเริ่มต้น" value={form.initialInvestment} onChange={(value) => updateForm("initialInvestment", value)} hint="เงินสดจ่าย ณ งวด 0 · ใส่เป็นจำนวนบวก" required />
          <NumberField id="payback-discount-rate" label="อัตราคิดลดต่อปี (%)" value={form.annualDiscountRatePercent} onChange={(value) => updateForm("annualDiscountRatePercent", value)} hint="Effective annual rate · ไม่ใช่ผลตอบแทนที่รับรอง" max={1_000} required />
          <NumberField id="payback-target" label={`เป้าคืนทุน (${unitText(form.periodUnit)}) · ไม่บังคับ`} value={form.targetPaybackPeriods} onChange={(value) => updateForm("targetPaybackPeriods", value)} hint="ใช้เทียบผลเท่านั้น ไม่ใช่เกณฑ์ทางการเงินสากล" max={PAYBACK_MAX_PERIODS} />
          <NumberField id="payback-terminal-value" label="มูลค่าคงเหลือปลายโครงการ" value={form.terminalValue} onChange={(value) => updateForm("terminalValue", value)} hint="รวมในงวดสุดท้าย อย่ากรอกซ้ำใน Cash flow" />
        </div>
      </section>

      <section className="mt-7 border-t pt-6" aria-labelledby="payback-cash-flow-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="payback-cash-flow-title" className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />2. Net cash flow รายงวด</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">รับสุทธิเป็นบวก จ่ายสุทธิเป็นลบ สูงสุด {PAYBACK_MAX_PERIODS} งวด</p></div>
          <Button type="button" variant="outline" onClick={addCashFlow} disabled={form.cashFlows.length >= PAYBACK_MAX_PERIODS}><Plus className="size-4" />เพิ่มงวด</Button>
        </div>
        <div className="mt-5 grid gap-3">
          {form.cashFlows.map((row, index) => (
            <div key={row.id} className="grid gap-4 rounded-xl border bg-muted/5 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-3"><Label htmlFor={`payback-label-${row.id}`}>ชื่องวด {index + 1}</Label><Input id={`payback-label-${row.id}`} value={row.label} maxLength={80} onChange={(event) => updateCashFlow(row.id, "label", event.target.value)} /></div>
              <div className="grid gap-3"><Label htmlFor={`payback-amount-${row.id}`}>Net cash flow</Label><Input id={`payback-amount-${row.id}`} type="number" inputMode="decimal" step="0.01" value={row.amount} placeholder="0.00" onChange={(event) => updateCashFlow(row.id, "amount", event.target.value)} /></div>
              <Button type="button" variant="outline" size="icon" disabled={form.cashFlows.length <= 1} onClick={() => removeCashFlow(row.id)} aria-label={`ลบงวด ${index + 1}`}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar><Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณ Payback</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-6 min-w-0">
        {calculation ? <PaybackResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกเงินลงทุน อัตราคิดลด และ Net cash flow รายงวด</p><p className="mt-1 text-xs">ระบบจะแสดง Simple payback, Discounted payback, NPV, กราฟ และ Timeline</p></div></div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>เป็นเครื่องมือคัดกรอง Scenario ไม่ใช่คำแนะนำลงทุน</AlertTitle>
        <AlertDescription className="leading-6">Payback แบบ Simple ไม่คิดมูลค่าเงินตามเวลา และทั้ง Simple/Discounted payback ไม่ให้คุณค่ากับกระแสเงินสดหลังคืนทุนครบ ค่าประมาณยังขึ้นกับ Cash-flow timing, ภาษี, เงินทุนหมุนเวียน, เงินเฟ้อ, ความเสี่ยง, Cost of capital และ Terminal value ที่ผู้ใช้กำหนด</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและขอบเขต:</strong> <a className="font-medium text-primary hover:underline" href="https://openstax.org/books/principles-of-finance-2e/pages/16-1-payback-period-method" target="_blank" rel="noreferrer">OpenStax — Payback Period</a> อธิบายการสะสม Cash flow และข้อจำกัดเรื่อง Time value of money; <a className="font-medium text-primary hover:underline" href="https://openstax.org/books/principles-of-finance-2e/pages/16-4-alternative-methods" target="_blank" rel="noreferrer">OpenStax — Discounted Payback</a> อธิบายการ Discount กระแสเงินสดด้วย Cost of funds และการหาเศษงวด หากต้องการวิเคราะห์ต้นทุนกับยอดขายใช้ <Link href="/break-even-calculator" className="font-medium text-primary hover:underline">Break-even Calculator</Link> หรือวิเคราะห์กำไรโครงการใช้ <Link href="/project-cost-calculator" className="font-medium text-primary hover:underline">Project Cost Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
