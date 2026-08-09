"use client";

import {
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  Download,
  Info,
  Landmark,
  Plus,
  Sigma,
  TableProperties,
  Trash2,
  TriangleAlert,
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
  calculateIrrMirr,
  IRR_MAX_PERIODS,
  IRR_MAX_MONEY,
  IRR_MAX_PERIODIC_RATE_PERCENT,
  IRR_MIN_PERIODIC_RATE_PERCENT,
  irrMirrCsv,
  type IrrCashFlowPattern,
  type IrrCurrency,
  type IrrMirrInput,
  type IrrMirrResult,
  type IrrPeriodUnit,
  type IrrRootStatus,
} from "@/lib/tools/irr-mirr";

type CashFlowForm = { id: string; label: string; amount: string };
type IrrForm = {
  currency: IrrCurrency;
  scenarioName: string;
  periodUnit: IrrPeriodUnit;
  annualHurdleRatePercent: string;
  annualFinanceRatePercent: string;
  annualReinvestmentRatePercent: string;
  cashFlows: CashFlowForm[];
};

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const currencyFormatters = new Map<Exclude<IrrCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: IrrCurrency, signed = false) {
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

function percent(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${value.toExponential(4)}%`;
  return `${percentFormatter.format(Math.abs(value) < 0.0000005 ? 0 : value)}%`;
}

function unitText(unit: IrrPeriodUnit) {
  if (unit === "month") return "เดือน";
  if (unit === "quarter") return "ไตรมาส";
  return "ปี";
}

function periodLabel(unit: IrrPeriodUnit, period: number) {
  if (period === 0) return "เงินลงทุน/กระแสเงินสดเริ่มต้น";
  if (unit === "month") return `เดือน ${period}`;
  if (unit === "quarter") return `ไตรมาส ${period}`;
  return `ปี ${period}`;
}

function createCashFlows(unit: IrrPeriodUnit, amounts: string[]) {
  return amounts.map((amount, period) => ({ id: `irr-cash-${period}`, label: periodLabel(unit, period), amount }));
}

function createInitialForm(): IrrForm {
  return {
    currency: "THB",
    scenarioName: "",
    periodUnit: "year",
    annualHurdleRatePercent: "10",
    annualFinanceRatePercent: "10",
    annualReinvestmentRatePercent: "10",
    cashFlows: createCashFlows("year", ["", "", "", "", "", ""]),
  };
}

function createExampleForm(): IrrForm {
  return {
    currency: "THB",
    scenarioName: "เครื่องจักรใหม่ · แผน 5 ปี",
    periodUnit: "year",
    annualHurdleRatePercent: "10",
    annualFinanceRatePercent: "10",
    annualReinvestmentRatePercent: "12",
    cashFlows: createCashFlows("year", ["-120000", "39000", "30000", "21000", "37000", "46000"]),
  };
}

function parseNumber(value: string, label: string) {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function NumberField({ id, label, value, onChange, hint, min, max }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" step="0.01" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />
      <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function patternText(pattern: IrrCashFlowPattern) {
  if (pattern === "conventional-investment") return "ลงทุนปกติ · จ่ายก่อน รับภายหลัง";
  if (pattern === "conventional-financing") return "Financing · รับก่อน จ่ายภายหลัง";
  return "Non-conventional · เครื่องหมายเปลี่ยนหลายครั้ง";
}

function rootStatusCopy(status: IrrRootStatus, count: number, signChanges: number) {
  if (status === "unique") return { title: "พบ IRR เดียวตามโครงสร้างกระแสเงินสด", detail: "กระแสเงินสดเปลี่ยนเครื่องหมายครั้งเดียว จึงมีราก IRR จริงที่มากกว่า -100% ได้เพียงหนึ่งค่า แต่ยังต้องเทียบ NPV, MIRR, Scale และความเสี่ยง" };
  if (status === "multiple") return { title: `พบ IRR หลายค่า (${count} ราก)`, detail: "NPV ตัดแกนมากกว่าหนึ่งครั้ง การเลือก IRR ค่าเดียวอาจทำให้ข้อสรุปกลับด้าน ให้ใช้ NPV ที่ Hurdle rate และ MIRR ประกอบ" };
  if (status === "ambiguous") return { title: "พบรากหนึ่งค่า แต่ IRR ยังไม่ชัดเจน", detail: `กระแสเงินสดเปลี่ยนเครื่องหมาย ${signChanges} ครั้ง จึงอาจมีรากซ้ำหรือรากอื่นนอกช่วงที่รองรับ ไม่ควรใช้ IRR ค่าเดียวตัดสินโครงการ` };
  if (status === "outside-range") return { title: "IRR อยู่นอกช่วงค้นหาที่รองรับ", detail: `โครงสร้างมีรากหนึ่งค่า แต่ไม่อยู่ในช่วง ${IRR_MIN_PERIODIC_RATE_PERCENT.toLocaleString("th-TH")}% ถึง ${IRR_MAX_PERIODIC_RATE_PERCENT.toLocaleString("th-TH")}% ต่องวด` };
  return { title: "ไม่พบ IRR จริงในช่วงที่รองรับ", detail: "NPV ไม่ตัดหรือสัมผัสแกนศูนย์ในช่วงค้นหา ผลนี้ไม่ใช่ข้อผิดพลาดของข้อมูลเสมอไป ให้ดู NPV และ MIRR แทน" };
}

function symmetricLog(value: number, scale: number) {
  return Math.sign(value) * Math.log1p(Math.abs(value) / scale);
}

function NpvProfileChart({ input, result }: { input: IrrMirrInput; result: IrrMirrResult }) {
  const width = 720;
  const height = 300;
  const padding = { top: 24, right: 24, bottom: 48, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rates = result.profile.map((point) => point.periodicRatePercent / 100);
  const npvs = result.profile.map((point) => point.netPresentValue);
  const xScale = 0.1;
  const yScale = Math.max(1, (result.totalCashInflow + result.totalCashOutflow) / 20);
  const transformedRates = rates.map((rate) => symmetricLog(rate, xScale));
  const transformedNpvs = npvs.map((value) => symmetricLog(value, yScale));
  const minimumX = Math.min(...transformedRates);
  const maximumX = Math.max(...transformedRates);
  const minimumY = Math.min(...transformedNpvs, 0);
  const maximumY = Math.max(...transformedNpvs, 0);
  const x = (rate: number) => padding.left + ((symmetricLog(rate, xScale) - minimumX) / Math.max(maximumX - minimumX, 1e-12)) * plotWidth;
  const y = (value: number) => padding.top + ((maximumY - symmetricLog(value, yScale)) / Math.max(maximumY - minimumY, 1e-12)) * plotHeight;
  const path = result.profile.map((point, index) => `${index ? "L" : "M"} ${x(point.periodicRatePercent / 100).toFixed(2)} ${y(point.netPresentValue).toFixed(2)}`).join(" ");
  const zeroY = y(0);
  const zeroX = x(0);
  const minimumRate = Math.min(...rates);
  const maximumRate = Math.max(...rates);
  const visibleRoots = result.roots.filter((root) => root.periodicRatePercent / 100 >= minimumRate && root.periodicRatePercent / 100 <= maximumRate);
  const hiddenRootCount = result.roots.length - visibleRoots.length;
  const hurdleRate = result.periodicHurdleRatePercent / 100;
  const hurdleX = x(hurdleRate);
  const hurdleY = y(result.netPresentValueAtHurdleRate);
  const aria = `กราฟ NPV profile ของ ${input.scenarioName} พบ IRR ${result.roots.length} ค่า และ NPV ที่ Hurdle rate เท่ากับ ${money(result.netPresentValueAtHurdleRate, input.currency, true)}`;

  return (
    <figure className="rounded-xl border bg-card p-3 sm:p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={aria}>
        <title>{aria}</title>
        <desc>แกนนอนเป็นอัตราผลตอบแทนต่องวดแบบ symmetric log แกนตั้งเป็น NPV แบบ symmetric log จุดสีเขียวคือ Hurdle rate และจุดสีส้มคือราก IRR</desc>
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} className="stroke-border" strokeWidth="1.5" />
        <line x1={zeroX} y1={padding.top} x2={zeroX} y2={height - padding.bottom} className="stroke-border" strokeDasharray="5 5" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {visibleRoots.map((root, index) => <circle key={`${root.periodicRatePercent}-${index}`} cx={x(root.periodicRatePercent / 100)} cy={zeroY} r="5" className="fill-amber-500 stroke-card" strokeWidth="2"><title>IRR {index + 1}: {percent(root.periodicRatePercent)} ต่องวด</title></circle>)}
        <circle cx={hurdleX} cy={hurdleY} r="5" className="fill-emerald-600 stroke-card" strokeWidth="2"><title>Hurdle rate: {percent(result.periodicHurdleRatePercent)} ต่องวด</title></circle>
        <text x={padding.left} y={height - 14} className="fill-muted-foreground text-[12px]">{percent(minimumRate * 100)}</text>
        <text x={width - padding.right} y={height - 14} textAnchor="end" className="fill-muted-foreground text-[12px]">{percent(maximumRate * 100)}</text>
        <text x={width / 2} y={height - 14} textAnchor="middle" className="fill-muted-foreground text-[12px]">อัตราต่องวด · symmetric log</text>
        <text x="18" y={height / 2} transform={`rotate(-90 18 ${height / 2})`} textAnchor="middle" className="fill-muted-foreground text-[12px]">NPV · symmetric log</text>
        <text x={width - padding.right} y={zeroY - 8} textAnchor="end" className="fill-muted-foreground text-[11px]">NPV = 0</text>
      </svg>
      <figcaption className="mt-2 text-xs leading-5 text-muted-foreground">เส้นโค้งใช้สเกล Symmetric log เพื่อให้เห็นรากติดลบ ศูนย์ และรากบวกบนกราฟเดียวกัน · จุดส้ม = IRR · จุดเขียว = Hurdle rate{hiddenRootCount ? ` · มี IRR ${hiddenRootCount} ค่านอกช่วงกราฟ ดูค่าครบในรายการราก` : ""}</figcaption>
    </figure>
  );
}

function ResultCard({ label, value, detail, testId }: { label: string; value: string; detail: string; testId?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tabular-nums text-primary">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function IrrResultPanel({ input, result }: { input: IrrMirrInput; result: IrrMirrResult }) {
  const status = rootStatusCopy(result.rootStatus, result.roots.length, result.signChanges);
  const unit = unitText(input.periodUnit);
  const mainIrr = result.rootStatus === "unique" && result.roots[0]
    ? percent(result.roots[0].annualEffectiveRatePercent)
    : result.roots.length ? `${result.roots.length} ค่า` : "ไม่พบ";
  const summary = [
    `IRR & MIRR · ${input.scenarioName}`,
    `รูปแบบ: ${patternText(result.cashFlowPattern)} · Sign changes ${result.signChanges}`,
    `IRR: ${result.roots.length ? result.roots.map((root) => `${percent(root.periodicRatePercent)} ต่องวด / ${percent(root.annualEffectiveRatePercent)} ต่อปี`).join(" | ") : "ไม่พบในช่วงที่รองรับ"}`,
    `MIRR: ${percent(result.mirrPeriodicRatePercent)} ต่องวด / ${percent(result.mirrAnnualEffectiveRatePercent)} ต่อปี`,
    `NPV @ ${percent(input.annualHurdleRatePercent)} ต่อปี: ${money(result.netPresentValueAtHurdleRate, input.currency, true)}`,
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="irr-result">
      <Alert className={result.rootStatus === "unique" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}>
        {result.rootStatus === "unique" ? <Landmark className="text-emerald-700 dark:text-emerald-300" /> : <TriangleAlert className="text-amber-700 dark:text-amber-300" />}
        <AlertTitle>{status.title}</AlertTitle>
        <AlertDescription className="leading-6">{status.detail}</AlertDescription>
      </Alert>

      <section aria-labelledby="irr-summary-title">
        <h2 id="irr-summary-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />ผลลัพธ์หลัก</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResultCard label="IRR ต่อปี (Effective)" value={mainIrr} detail={result.rootStatus === "unique" ? `${percent(result.roots[0]!.periodicRatePercent)} ต่อ${unit}` : "ดูรากทุกค่าและ NPV profile ด้านล่าง"} testId="irr-primary" />
          <ResultCard label="MIRR ต่อปี (Effective)" value={percent(result.mirrAnnualEffectiveRatePercent)} detail={`${percent(result.mirrPeriodicRatePercent)} ต่อ${unit} · ใช้ Finance/Reinvestment rate ที่กำหนด`} testId="mirr-primary" />
          <ResultCard label={`NPV @ Hurdle ${percent(input.annualHurdleRatePercent)}`} value={money(result.netPresentValueAtHurdleRate, input.currency, true)} detail={`อัตราต่อ${unit} ${percent(result.periodicHurdleRatePercent)}`} testId="irr-npv" />
          <ResultCard label="รูปแบบ Cash flow" value={`${result.signChanges} Sign change${result.signChanges === 1 ? "" : "s"}`} detail={patternText(result.cashFlowPattern)} testId="irr-pattern" />
        </div>
      </section>

      {result.roots.length ? (
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="irr-roots-title">
          <h2 id="irr-roots-title" className="flex items-center gap-2 font-semibold"><Sigma className="size-4 text-primary" />ราก IRR ที่ตรวจพบ</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.roots.map((root, index) => (
              <div key={`${root.periodicRatePercent}-${index}`} className="rounded-lg border bg-card p-4" data-testid="irr-root">
                <div className="flex flex-wrap items-start justify-between gap-2"><strong>IRR {index + 1}</strong><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">NPV ≈ {money(root.npvResidual, input.currency, true)}</span></div>
                <p className="mt-3 text-xl font-bold tabular-nums text-primary">{percent(root.annualEffectiveRatePercent)} ต่อปี</p>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">{percent(root.periodicRatePercent)} ต่อ{unit}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="irr-profile-title">
        <div className="mb-4"><h2 id="irr-profile-title" className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />NPV profile</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">IRR คือจุดที่เส้น NPV ตัดหรือสัมผัสแกนศูนย์ กราฟช่วยเห็นกรณีหลายรากที่ตัวเลขเดียวซ่อนไว้</p></div>
        <NpvProfileChart input={input} result={result} />
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="irr-assumption-title">
        <h2 id="irr-assumption-title" className="flex items-center gap-2 font-semibold"><Landmark className="size-4 text-primary" />อัตราที่ใช้และองค์ประกอบ MIRR</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Hurdle rate ต่อ{unit}</span><strong className="mt-1 block tabular-nums">{percent(result.periodicHurdleRatePercent)}</strong></div>
          <div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Finance rate ต่อ{unit}</span><strong className="mt-1 block tabular-nums">{percent(result.periodicFinanceRatePercent)}</strong></div>
          <div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Reinvestment ต่อ{unit}</span><strong className="mt-1 block tabular-nums">{percent(result.periodicReinvestmentRatePercent)}</strong></div>
          <div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">PV เงินจ่าย → FV เงินรับ</span><strong className="mt-1 block tabular-nums">{money(-result.presentValueOfNegativeCashFlows, input.currency)} → {money(result.futureValueOfPositiveCashFlows, input.currency)}</strong></div>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="irr-timeline-title">
        <h2 id="irr-timeline-title" className="flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />Timeline ที่ Hurdle rate</h2>
        <div className="mt-4 grid gap-3 sm:hidden">
          {result.timeline.map((row) => (
            <div key={row.period} className="rounded-lg border bg-card p-3">
              <p className="font-medium">{row.period} · {row.label}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <p><span className="block text-muted-foreground">Cash flow</span><strong className="mt-1 block tabular-nums">{money(row.amount, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">Present value</span><strong className="mt-1 block tabular-nums">{money(row.presentValue, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">Discount factor</span><strong className="mt-1 block tabular-nums">{row.discountFactor.toLocaleString("th-TH", { maximumFractionDigits: 8 })}</strong></p>
                <p><span className="block text-muted-foreground">NPV สะสม</span><strong className="mt-1 block tabular-nums">{money(row.cumulativePresentValue, input.currency, true)}</strong></p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="ตาราง IRR และ MIRR ที่เลื่อนได้">
          <table className="w-full min-w-[48rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">งวด</th><th className="px-3 pb-3 font-medium">Cash flow</th><th className="px-3 pb-3 font-medium">Discount factor</th><th className="px-3 pb-3 font-medium">Present value</th><th className="pl-3 pb-3 font-medium">NPV สะสม</th></tr></thead>
            <tbody className="divide-y">{result.timeline.map((row) => <tr key={row.period}><th className="py-3 pr-4 text-left font-medium">{row.period} · {row.label}</th><td className="px-3 tabular-nums">{money(row.amount, input.currency, true)}</td><td className="px-3 tabular-nums">{row.discountFactor.toLocaleString("th-TH", { maximumFractionDigits: 8 })}</td><td className="px-3 tabular-nums">{money(row.presentValue, input.currency, true)}</td><td className="pl-3 font-medium tabular-nums">{money(row.cumulativePresentValue, input.currency, true)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="irr-formula-title">
        <h2 id="irr-formula-title" className="flex items-center gap-2 font-semibold"><Sigma className="size-4 text-primary" />สูตรและวิธีอ่านผล</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><strong>IRR</strong><p className="mt-1 text-muted-foreground">หาราก r ที่ทำให้ Σ CF<sub>t</sub> ÷ (1 + r)<sup>t</sup> = 0 และตรวจทุก q = 1 ÷ (1 + r) ที่มากกว่า 0 ในช่วง จึงรวม IRR ติดลบที่มากกว่า -100% ด้วย</p></div>
          <div className="rounded-lg border bg-card p-3"><strong>MIRR</strong><p className="mt-1 text-muted-foreground">นำเงินจ่ายกลับมาที่งวด 0 ด้วย Finance rate และทบเงินรับไปปลาย Horizon ด้วย Reinvestment rate</p></div>
          <div className="rounded-lg border bg-card p-3"><strong>Annualization</strong><p className="mt-1 text-muted-foreground">อัตราต่อปี = (1 + อัตราต่องวด)<sup>จำนวนงวดต่อปี</sup> − 1 ไม่ใช้การคูณ 12 หรือ 4 แบบเส้นตรง</p></div>
        </div>
      </section>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุป IRR และ MIRR แล้ว")}><CircleDollarSign className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="irr-csv" onClick={() => downloadText(irrMirrCsv(input, result), "meaw-irr-mirr.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </div>
  );
}

export function IrrMirrCalculatorTool() {
  const [form, setForm] = useState<IrrForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: IrrMirrInput; result: IrrMirrResult } | null>(null);
  const [error, setError] = useState("");

  const updateForm = <Key extends keyof Omit<IrrForm, "cashFlows">>(key: Key, value: IrrForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateCashFlow = (id: string, key: "label" | "amount", value: string) => {
    setForm((current) => ({ ...current, cashFlows: current.cashFlows.map((row) => row.id === id ? { ...row, [key]: value } : row) }));
  };

  const changePeriodUnit = (periodUnit: IrrPeriodUnit) => {
    setForm((current) => ({ ...current, periodUnit, cashFlows: current.cashFlows.map((row, period) => ({ ...row, label: periodLabel(periodUnit, period) })) }));
  };

  const addCashFlow = () => {
    setForm((current) => current.cashFlows.length >= IRR_MAX_PERIODS + 1 ? current : ({
      ...current,
      cashFlows: [...current.cashFlows, {
        id: `irr-cash-${Date.now()}-${current.cashFlows.length}`,
        label: periodLabel(current.periodUnit, current.cashFlows.length),
        amount: "",
      }],
    }));
  };

  const removeCashFlow = (id: string) => {
    setForm((current) => current.cashFlows.length <= 2 ? current : ({ ...current, cashFlows: current.cashFlows.filter((row, period) => period === 0 || row.id !== id) }));
  };

  const calculate = () => {
    try {
      const input: IrrMirrInput = {
        currency: form.currency,
        scenarioName: form.scenarioName,
        periodUnit: form.periodUnit,
        annualHurdleRatePercent: parseNumber(form.annualHurdleRatePercent, "Hurdle rate ต่อปี"),
        annualFinanceRatePercent: parseNumber(form.annualFinanceRatePercent, "Finance rate ต่อปี"),
        annualReinvestmentRatePercent: parseNumber(form.annualReinvestmentRatePercent, "Reinvestment rate ต่อปี"),
        cashFlows: form.cashFlows.map((row, period) => ({ label: row.label, amount: parseNumber(row.amount, `กระแสเงินสดงวดที่ ${period}`) })),
      };
      setCalculation({ input, result: calculateIrrMirr(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "คำนวณ IRR และ MIRR ไม่สำเร็จ");
    }
  };

  const loadExample = () => { setForm(createExampleForm()); setCalculation(null); setError(""); };
  const clear = () => { setForm(createInitialForm()); setCalculation(null); setError(""); };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>ใช้กับกระแสเงินสดที่เกิดเป็นงวดสม่ำเสมอ</AlertTitle>
        <AlertDescription className="leading-6">เดือน ไตรมาส หรือปีต้องห่างเท่ากันทุกแถว หากใช้วันที่จริงหรือช่วงเวลาไม่เท่ากันต้องใช้ XIRR/XNPV คนละวิธี ระบบนี้ตรวจหลายรากและรากซ้ำ ไม่อาศัย Guess เดียว</AlertDescription>
      </Alert>

      <section aria-labelledby="irr-scenario-title">
        <h2 id="irr-scenario-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />1. Scenario และสมมติฐานอัตรา</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">อัตราทั้งสามเป็น Effective annual rate ระบบจะแปลงเป็นอัตราต่องวดแบบทบต้นตามหน่วยที่เลือก</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3 sm:col-span-2">
            <Label htmlFor="irr-scenario-name">ชื่อ Scenario</Label>
            <Input id="irr-scenario-name" value={form.scenarioName} maxLength={120} placeholder="เช่น เครื่องจักรใหม่ · แผน 5 ปี" onChange={(event) => updateForm("scenarioName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้แยกสมมติฐานเมื่อคัดลอกหรือดาวน์โหลด CSV</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="irr-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as IrrCurrency)}><SelectTrigger id="irr-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="THB">THB · บาท</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent></Select>
            <p className="text-xs leading-5 text-muted-foreground">ไม่มีการแปลง FX</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="irr-period-unit">หน่วยงวด</Label>
            <Select value={form.periodUnit} onValueChange={(value) => changePeriodUnit(value as IrrPeriodUnit)}><SelectTrigger id="irr-period-unit" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">เดือน</SelectItem><SelectItem value="quarter">ไตรมาส</SelectItem><SelectItem value="year">ปี</SelectItem></SelectContent></Select>
            <p className="text-xs leading-5 text-muted-foreground">ทุกแถวต้องห่างเท่ากัน</p>
          </div>
          <NumberField id="irr-hurdle-rate" label="Hurdle rate ต่อปี (%)" value={form.annualHurdleRatePercent} onChange={(value) => updateForm("annualHurdleRatePercent", value)} hint="ใช้คำนวณ NPV และเป็นเกณฑ์ของผู้ใช้ ไม่ใช่อัตราแนะนำ" min={-99.99} max={1_000} />
          <NumberField id="irr-finance-rate" label="Finance rate ต่อปี (%)" value={form.annualFinanceRatePercent} onChange={(value) => updateForm("annualFinanceRatePercent", value)} hint="ต้นทุนเงินที่ใช้กับ Cash flow ติดลบใน MIRR" min={-99.99} max={1_000} />
          <NumberField id="irr-reinvestment-rate" label="Reinvestment rate ต่อปี (%)" value={form.annualReinvestmentRatePercent} onChange={(value) => updateForm("annualReinvestmentRatePercent", value)} hint="อัตราที่ใช้ทบ Cash flow บวกไปปลาย Horizon ใน MIRR" min={-99.99} max={1_000} />
        </div>
      </section>

      <section className="mt-7 border-t pt-6" aria-labelledby="irr-cash-flow-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="irr-cash-flow-title" className="flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />2. Cash flow ตั้งแต่งวด 0</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">เงินรับเป็นบวก เงินจ่ายเป็นลบ รองรับงวด 0 ถึง {IRR_MAX_PERIODS} · จำนวนเงินไม่เกิน {IRR_MAX_MONEY.toLocaleString("th-TH")}</p></div>
          <Button type="button" variant="outline" onClick={addCashFlow} disabled={form.cashFlows.length >= IRR_MAX_PERIODS + 1}><Plus className="size-4" />เพิ่มงวด</Button>
        </div>
        <div className="mt-5 grid gap-3">
          {form.cashFlows.map((row, period) => (
            <div key={row.id} className="grid gap-4 rounded-xl border bg-muted/5 p-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <span className="grid size-9 place-items-center self-start rounded-full bg-primary/10 text-sm font-semibold text-primary sm:self-end">{period}</span>
              <div className="grid gap-3"><Label htmlFor={`irr-label-${row.id}`}>ชื่องวด {period}</Label><Input id={`irr-label-${row.id}`} value={row.label} maxLength={80} onChange={(event) => updateCashFlow(row.id, "label", event.target.value)} /></div>
              <div className="grid gap-3"><Label htmlFor={`irr-amount-${row.id}`}>Cash flow</Label><Input id={`irr-amount-${row.id}`} type="number" inputMode="decimal" step="0.01" value={row.amount} placeholder={period === 0 ? "เช่น -120000" : "0.00"} onChange={(event) => updateCashFlow(row.id, "amount", event.target.value)} /></div>
              <Button type="button" variant="outline" size="icon" disabled={period === 0 || form.cashFlows.length <= 2} onClick={() => removeCashFlow(row.id)} aria-label={`ลบงวด ${period}`}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar><Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณ IRR และ MIRR</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-6 min-w-0">
        {calculation ? <IrrResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอก Cash flow ที่มีอย่างน้อยหนึ่งค่าบวกและหนึ่งค่าลบ</p><p className="mt-1 text-xs">ระบบจะแสดงทุก IRR ที่ตรวจพบ, MIRR, NPV profile และ Timeline</p></div></div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>ไม่ใช่คำแนะนำลงทุนหรืออัตราผลตอบแทนที่รับรอง</AlertTitle>
        <AlertDescription className="leading-6">IRR อาจมีหลายค่า ไม่มีค่า หรือให้ Ranking ที่ต่างจาก NPV เมื่อขนาดและเวลาของโครงการต่างกัน MIRR ยังขึ้นกับ Finance/Reinvestment rate ที่ผู้ใช้กำหนด ควรตรวจภาษี เงินทุนหมุนเวียน เงินเฟ้อ Terminal value ความเสี่ยง Funding และ Scenario อื่นร่วมด้วย</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและขอบเขต:</strong> <a className="font-medium text-primary hover:underline" href="https://openstax.org/books/principles-of-finance-2e/pages/16-3-internal-rate-of-return-irr-method" target="_blank" rel="noreferrer">OpenStax — IRR Method</a> อธิบาย NPV = 0, NPV profile, หลาย IRR และ Reinvestment assumption; <a className="font-medium text-primary hover:underline" href="https://openstax.org/books/principles-of-finance-2e/pages/16-4-alternative-methods" target="_blank" rel="noreferrer">OpenStax — MIRR</a> อธิบายการแก้ Reinvestment assumption และรากเดียวของ MIRR; <a className="font-medium text-primary hover:underline" href="https://support.microsoft.com/en-us/excel/functions/irr-function" target="_blank" rel="noreferrer">Microsoft — IRR</a> และ <a className="font-medium text-primary hover:underline" href="https://support.microsoft.com/en-us/excel/functions/mirr-function" target="_blank" rel="noreferrer">Microsoft — MIRR</a> ยืนยันว่า Cash flow ต้องเป็นงวดสม่ำเสมอและมีทั้งค่าบวก/ลบ หากต้องการวิเคราะห์เวลาคืนทุนใช้ <Link href="/payback-period-calculator" className="font-medium text-primary hover:underline">Payback Period Calculator</Link> หรือวิเคราะห์กำไรโครงการใช้ <Link href="/project-cost-calculator" className="font-medium text-primary hover:underline">Project Cost Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
