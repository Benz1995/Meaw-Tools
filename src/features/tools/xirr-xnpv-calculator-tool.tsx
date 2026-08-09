"use client";

import {
  ArrowDownUp,
  Calculator,
  CalendarDays,
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
  calculateXirrXnpv,
  XIRR_MAX_CASH_FLOWS,
  XIRR_MAX_MONEY,
  XIRR_MAX_RATE_PERCENT,
  XIRR_MIN_RATE_PERCENT,
  xirrXnpvCsv,
  type XirrCashFlowPattern,
  type XirrCurrency,
  type XirrRootStatus,
  type XirrXnpvInput,
  type XirrXnpvResult,
} from "@/lib/tools/xirr-xnpv";

type CashFlowForm = { id: string; date: string; label: string; amount: string };
type XirrForm = {
  currency: XirrCurrency;
  scenarioName: string;
  annualHurdleRatePercent: string;
  cashFlows: CashFlowForm[];
};

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" });
const currencyFormatters = new Map<Exclude<XirrCurrency, "OTHER">, Intl.NumberFormat>();

function money(value: number, currency: XirrCurrency, signed = false) {
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

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function createRows(values: Array<[string, string, string]>) {
  return values.map(([date, label, amount], index) => ({ id: `xirr-cash-${index}`, date, label, amount }));
}

function createInitialForm(): XirrForm {
  return {
    currency: "THB",
    scenarioName: "",
    annualHurdleRatePercent: "10",
    cashFlows: createRows([["", "", ""], ["", "", ""], ["", "", ""], ["", "", ""]]),
  };
}

function createExampleForm(): XirrForm {
  return {
    currency: "THB",
    scenarioName: "Microsoft XIRR example",
    annualHurdleRatePercent: "9",
    cashFlows: createRows([
      ["2008-01-01", "เงินลงทุนเริ่มต้น", "-10000"],
      ["2008-03-01", "รับเงินครั้งที่ 1", "2750"],
      ["2008-10-30", "รับเงินครั้งที่ 2", "4250"],
      ["2009-02-15", "รับเงินครั้งที่ 3", "3250"],
      ["2009-04-01", "รับเงินครั้งที่ 4", "2750"],
    ]),
  };
}

function parseNumber(value: string, label: string) {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function patternText(pattern: XirrCashFlowPattern) {
  if (pattern === "conventional-investment") return "ลงทุนปกติ · จ่ายก่อน รับภายหลัง";
  if (pattern === "conventional-financing") return "Financing · รับก่อน จ่ายภายหลัง";
  return "Non-conventional · เครื่องหมายเปลี่ยนหลายครั้ง";
}

function rootStatusCopy(status: XirrRootStatus, count: number, signChanges: number) {
  if (status === "unique") return {
    title: "พบ XIRR เดียวตามโครงสร้างกระแสเงินสด",
    detail: "กระแสเงินสดเปลี่ยนเครื่องหมายครั้งเดียว จึงมีรากจริงที่มากกว่า -100% ได้เพียงหนึ่งค่า แต่ควรเทียบ XNPV, ขนาดเงินลงทุน และความเสี่ยงร่วมด้วย",
  };
  if (status === "multiple") return {
    title: `พบ XIRR หลายค่า (${count} ราก)`,
    detail: "XNPV ตัดแกนศูนย์มากกว่าหนึ่งครั้ง โปรแกรมที่ใช้ Guess ค่าเดียวอาจคืนเพียงบางราก จึงไม่ควรเลือก XIRR ค่าใดค่าหนึ่งมาตัดสินใจ ให้ใช้ XNPV ที่ Hurdle rate เป็นหลัก",
  };
  if (status === "ambiguous") return {
    title: "พบหนึ่งราก แต่ XIRR ยังตีความคลุมเครือ",
    detail: `กระแสเงินสดเปลี่ยนเครื่องหมาย ${signChanges} ครั้ง อาจเป็นรากซ้ำที่เพียงสัมผัสแกนศูนย์ หรือมีรากอื่นนอกช่วงค้นหา ควรอ่าน XNPV profile และตรวจ Scenario เพิ่มเติม`,
  };
  if (status === "outside-range") return {
    title: "XIRR อยู่นอกช่วงค้นหาที่รองรับ",
    detail: `โครงสร้างมีรากเดียว แต่ไม่อยู่ในช่วง ${XIRR_MIN_RATE_PERCENT.toLocaleString("th-TH")}% ถึง ${XIRR_MAX_RATE_PERCENT.toLocaleString("th-TH")}% ต่อปี ตัวเลขสุดโต่งมักบ่งชี้ว่าควรตรวจวันที่และจำนวนเงินอีกครั้ง`,
  };
  return {
    title: "ไม่พบ XIRR จริงในช่วงที่รองรับ",
    detail: "XNPV ไม่ตัดหรือสัมผัสแกนศูนย์ในช่วงค้นหา ผลนี้เกิดขึ้นได้กับกระแสเงินสดแบบ Non-conventional และไม่ใช่ข้อผิดพลาดของข้อมูลเสมอไป ให้ประเมินด้วย XNPV ที่ Hurdle rate แทน",
  };
}

function symmetricLog(value: number, scale: number) {
  return Math.sign(value) * Math.log1p(Math.abs(value) / scale);
}

function XnpvProfileChart({ input, result }: { input: XirrXnpvInput; result: XirrXnpvResult }) {
  const width = 720;
  const height = 300;
  const padding = { top: 24, right: 24, bottom: 48, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rates = result.profile.map((point) => point.annualRatePercent / 100);
  const values = result.profile.map((point) => point.netPresentValue);
  const xScale = 0.1;
  const yScale = Math.max(1, (result.totalCashInflow + result.totalCashOutflow) / 20);
  const transformedRates = rates.map((rate) => symmetricLog(rate, xScale));
  const transformedValues = values.map((value) => symmetricLog(value, yScale));
  const minimumX = Math.min(...transformedRates);
  const maximumX = Math.max(...transformedRates);
  const minimumY = Math.min(...transformedValues, 0);
  const maximumY = Math.max(...transformedValues, 0);
  const x = (rate: number) => padding.left + ((symmetricLog(rate, xScale) - minimumX) / Math.max(maximumX - minimumX, 1e-12)) * plotWidth;
  const y = (value: number) => padding.top + ((maximumY - symmetricLog(value, yScale)) / Math.max(maximumY - minimumY, 1e-12)) * plotHeight;
  const path = result.profile.map((point, index) => `${index ? "L" : "M"} ${x(point.annualRatePercent / 100).toFixed(2)} ${y(point.netPresentValue).toFixed(2)}`).join(" ");
  const zeroY = y(0);
  const zeroX = x(0);
  const minimumRate = Math.min(...rates);
  const maximumRate = Math.max(...rates);
  const visibleRoots = result.roots.filter((root) => root.annualRatePercent / 100 >= minimumRate && root.annualRatePercent / 100 <= maximumRate);
  const hiddenRootCount = result.roots.length - visibleRoots.length;
  const hurdleRate = input.annualHurdleRatePercent / 100;
  const aria = `กราฟ XNPV profile ของ ${input.scenarioName} พบ XIRR ${result.roots.length} ค่า และ XNPV ที่ Hurdle rate เท่ากับ ${money(result.netPresentValueAtHurdleRate, input.currency, true)}`;

  return (
    <figure className="rounded-xl border bg-card p-3 sm:p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={aria}>
        <title>{aria}</title>
        <desc>แกนนอนเป็นอัตรารายปีแบบ symmetric log แกนตั้งเป็น XNPV แบบ symmetric log จุดสีส้มคือราก XIRR และจุดสีเขียวคือ Hurdle rate</desc>
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} className="stroke-border" strokeWidth="1.5" />
        <line x1={zeroX} y1={padding.top} x2={zeroX} y2={height - padding.bottom} className="stroke-border" strokeDasharray="5 5" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {visibleRoots.map((root, index) => (
          <circle key={`${root.annualRatePercent}-${index}`} cx={x(root.annualRatePercent / 100)} cy={zeroY} r="5" className="fill-amber-500 stroke-card" strokeWidth="2">
            <title>XIRR {index + 1}: {percent(root.annualRatePercent)} ต่อปี</title>
          </circle>
        ))}
        <circle cx={x(hurdleRate)} cy={y(result.netPresentValueAtHurdleRate)} r="5" className="fill-emerald-600 stroke-card" strokeWidth="2">
          <title>Hurdle rate: {percent(input.annualHurdleRatePercent)}</title>
        </circle>
        <text x={padding.left} y={height - 14} className="fill-muted-foreground text-[12px]">{percent(minimumRate * 100)}</text>
        <text x={width - padding.right} y={height - 14} textAnchor="end" className="fill-muted-foreground text-[12px]">{percent(maximumRate * 100)}</text>
        <text x={width / 2} y={height - 14} textAnchor="middle" className="fill-muted-foreground text-[12px]">อัตราต่อปี · symmetric log</text>
        <text x="18" y={height / 2} transform={`rotate(-90 18 ${height / 2})`} textAnchor="middle" className="fill-muted-foreground text-[12px]">XNPV · symmetric log</text>
        <text x={width - padding.right} y={zeroY - 8} textAnchor="end" className="fill-muted-foreground text-[11px]">XNPV = 0</text>
      </svg>
      <figcaption className="mt-2 text-xs leading-5 text-muted-foreground">จุดส้ม = XIRR · จุดเขียว = Hurdle rate · สเกลแบบ Symmetric log ช่วยแสดงค่าติดลบ ศูนย์ และค่าบวกในกราฟเดียว{hiddenRootCount ? ` · มี XIRR ${hiddenRootCount} ค่านอกช่วงกราฟ โปรดดูรายการราก` : ""}</figcaption>
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

function XirrResultPanel({ input, result }: { input: XirrXnpvInput; result: XirrXnpvResult }) {
  const status = rootStatusCopy(result.rootStatus, result.roots.length, result.signChanges);
  const mainXirr = result.rootStatus === "unique" && result.roots[0]
    ? percent(result.roots[0].annualRatePercent)
    : result.roots.length ? `${result.roots.length} ค่า` : "ไม่พบ";
  const summary = [
    `XIRR & XNPV · ${input.scenarioName}`,
    `รูปแบบ: ${patternText(result.cashFlowPattern)} · Sign changes ${result.signChanges}`,
    `XIRR: ${result.roots.length ? result.roots.map((root) => percent(root.annualRatePercent)).join(" | ") : "ไม่พบในช่วงที่รองรับ"}`,
    `XNPV @ ${percent(input.annualHurdleRatePercent)}: ${money(result.netPresentValueAtHurdleRate, input.currency, true)}`,
    `ช่วงเวลา: ${numberFormatter.format(result.durationDays)} วัน (${result.durationYears.toLocaleString("th-TH", { maximumFractionDigits: 3 })} ปีบนฐาน 365 วัน)`,
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="xirr-result">
      <Alert className={result.rootStatus === "unique" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}>
        {result.rootStatus === "unique" ? <Landmark className="text-emerald-700 dark:text-emerald-300" /> : <TriangleAlert className="text-amber-700 dark:text-amber-300" />}
        <AlertTitle>{status.title}</AlertTitle>
        <AlertDescription className="leading-6">{status.detail}</AlertDescription>
      </Alert>

      <section aria-labelledby="xirr-summary-title">
        <h2 id="xirr-summary-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />ผลลัพธ์หลัก</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResultCard label="XIRR ต่อปี (Effective)" value={mainXirr} detail={result.rootStatus === "unique" ? "อัตราที่ทำให้ XNPV = 0 โดยใช้วันที่จริง" : "ดูรากทุกค่าและ XNPV profile ด้านล่าง"} testId="xirr-primary" />
          <ResultCard label={`XNPV @ Hurdle ${percent(input.annualHurdleRatePercent)}`} value={money(result.netPresentValueAtHurdleRate, input.currency, true)} detail="Present value สุทธิจากวันที่จริงและฐาน 365 วัน" testId="xirr-xnpv" />
          <ResultCard label="ช่วงเวลากระแสเงินสด" value={`${numberFormatter.format(result.durationDays)} วัน`} detail={`${result.durationYears.toLocaleString("th-TH", { maximumFractionDigits: 3 })} ปีบนฐาน 365 วัน`} testId="xirr-duration" />
          <ResultCard label="รูปแบบ Cash flow" value={`${result.signChanges} Sign change${result.signChanges === 1 ? "" : "s"}`} detail={patternText(result.cashFlowPattern)} testId="xirr-pattern" />
        </div>
      </section>

      {result.roots.length ? (
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="xirr-roots-title">
          <h2 id="xirr-roots-title" className="flex items-center gap-2 font-semibold"><Sigma className="size-4 text-primary" />ราก XIRR ที่ตรวจพบ</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.roots.map((root, index) => (
              <div key={`${root.annualRatePercent}-${index}`} className="rounded-lg border bg-card p-4" data-testid="xirr-root">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong>XIRR {index + 1}</strong>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">XNPV ≈ {root.xnpvResidual === null ? "เกินช่วงตัวเลข" : money(root.xnpvResidual, input.currency, true)}</span>
                </div>
                <p className="mt-3 text-xl font-bold tabular-nums text-primary">{percent(root.annualRatePercent)} ต่อปี</p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">Relative residual {root.relativeResidual.toExponential(2)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="xirr-profile-title">
        <div className="mb-4">
          <h2 id="xirr-profile-title" className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="size-4 text-primary" />XNPV profile</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">XIRR คือจุดที่เส้น XNPV ตัดหรือสัมผัสแกนศูนย์ กราฟนี้เปิดเผยกรณีหลายรากที่ผลลัพธ์ตัวเลขเดียวอาจซ่อนไว้</p>
        </div>
        <XnpvProfileChart input={input} result={result} />
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="xirr-timeline-title">
        <h2 id="xirr-timeline-title" className="flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />Timeline ที่ Hurdle rate</h2>
        <div className="mt-4 grid gap-3 sm:hidden">
          {result.timeline.map((row) => (
            <div key={`${row.date}-${row.label}`} className="rounded-lg border bg-card p-3">
              <p className="font-medium">{formatDate(row.date)} · {row.label}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <p><span className="block text-muted-foreground">Cash flow</span><strong className="mt-1 block tabular-nums">{money(row.amount, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">Present value</span><strong className="mt-1 block tabular-nums">{money(row.presentValue, input.currency, true)}</strong></p>
                <p><span className="block text-muted-foreground">วัน / ปี</span><strong className="mt-1 block tabular-nums">{row.dayOffset} / {row.yearFraction.toLocaleString("th-TH", { maximumFractionDigits: 4 })}</strong></p>
                <p><span className="block text-muted-foreground">XNPV สะสม</span><strong className="mt-1 block tabular-nums">{money(row.cumulativePresentValue, input.currency, true)}</strong></p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="ตาราง XIRR และ XNPV ที่เลื่อนได้">
          <table className="w-full min-w-[64rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">วันที่ · รายการ</th><th className="px-3 pb-3 font-medium">วัน / 365</th><th className="px-3 pb-3 font-medium">Cash flow</th><th className="px-3 pb-3 font-medium">Discount factor</th><th className="px-3 pb-3 font-medium">Present value</th><th className="pl-3 pb-3 font-medium">XNPV สะสม</th></tr></thead>
            <tbody className="divide-y">{result.timeline.map((row) => (
              <tr key={`${row.date}-${row.label}`}>
                <th className="py-3 pr-4 text-left font-medium">{formatDate(row.date)} · {row.label}</th>
                <td className="px-3 tabular-nums">{row.dayOffset} / {row.yearFraction.toLocaleString("th-TH", { maximumFractionDigits: 4 })}</td>
                <td className="px-3 tabular-nums">{money(row.amount, input.currency, true)}</td>
                <td className="px-3 tabular-nums">{row.discountFactor.toLocaleString("th-TH", { maximumFractionDigits: 8 })}</td>
                <td className="px-3 tabular-nums">{money(row.presentValue, input.currency, true)}</td>
                <td className="pl-3 font-medium tabular-nums">{money(row.cumulativePresentValue, input.currency, true)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="xirr-formula-title">
        <h2 id="xirr-formula-title" className="flex items-center gap-2 font-semibold"><Sigma className="size-4 text-primary" />สูตรและวิธีอ่านผล</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3"><strong>XNPV</strong><p className="mt-1 text-muted-foreground">Σ CF<sub>i</sub> ÷ (1 + r)<sup>(d<sub>i</sub> − d<sub>0</sub>) / 365</sup> โดยนับวันปฏิทินจริง รวม Leap day</p></div>
          <div className="rounded-lg border bg-card p-3"><strong>XIRR</strong><p className="mt-1 text-muted-foreground">หาราก r ที่ทำให้ XNPV = 0 ระบบค้นหาหลายรากและรากซ้ำในช่วงที่กำหนด ไม่ใช้ Guess เดียวแบบเงียบ ๆ</p></div>
          <div className="rounded-lg border bg-card p-3"><strong>Hurdle rate</strong><p className="mt-1 text-muted-foreground">อัตราผลตอบแทนขั้นต่ำที่ผู้ใช้กำหนดเพื่อคำนวณ XNPV ไม่ใช่อัตราแนะนำหรือผลตอบแทนที่รับรอง</p></div>
        </div>
      </section>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุป XIRR และ XNPV แล้ว")}><CircleDollarSign className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="xirr-csv" onClick={() => downloadText(xirrXnpvCsv(input, result), "meaw-xirr-xnpv.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </div>
  );
}

export function XirrXnpvCalculatorTool() {
  const [form, setForm] = useState<XirrForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: XirrXnpvInput; result: XirrXnpvResult } | null>(null);
  const [error, setError] = useState("");

  const updateForm = <Key extends keyof Omit<XirrForm, "cashFlows">>(key: Key, value: XirrForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateCashFlow = (id: string, key: "date" | "label" | "amount", value: string) => {
    setForm((current) => ({ ...current, cashFlows: current.cashFlows.map((row) => row.id === id ? { ...row, [key]: value } : row) }));
  };

  const addCashFlow = () => {
    setForm((current) => current.cashFlows.length >= XIRR_MAX_CASH_FLOWS ? current : ({
      ...current,
      cashFlows: [...current.cashFlows, { id: `xirr-cash-${Date.now()}-${current.cashFlows.length}`, date: "", label: "", amount: "" }],
    }));
  };

  const removeCashFlow = (id: string) => {
    setForm((current) => current.cashFlows.length <= 2 ? current : ({ ...current, cashFlows: current.cashFlows.filter((row) => row.id !== id) }));
  };

  const sortCashFlows = () => {
    setForm((current) => ({
      ...current,
      cashFlows: [...current.cashFlows].sort((left, right) => {
        if (!left.date) return 1;
        if (!right.date) return -1;
        return left.date.localeCompare(right.date);
      }),
    }));
    setCalculation(null);
    setError("");
  };

  const calculate = () => {
    try {
      const input: XirrXnpvInput = {
        currency: form.currency,
        scenarioName: form.scenarioName,
        annualHurdleRatePercent: parseNumber(form.annualHurdleRatePercent, "Hurdle rate ต่อปี"),
        cashFlows: form.cashFlows.map((row, index) => ({
          date: row.date,
          label: row.label,
          amount: parseNumber(row.amount, `กระแสเงินสดรายการที่ ${index + 1}`),
        })),
      };
      setCalculation({ input, result: calculateXirrXnpv(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "คำนวณ XIRR และ XNPV ไม่สำเร็จ");
    }
  };

  const loadExample = () => { setForm(createExampleForm()); setCalculation(null); setError(""); };
  const clear = () => { setForm(createInitialForm()); setCalculation(null); setError(""); };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>ใช้กับกระแสเงินสดที่เกิดคนละวันหรือช่วงเวลาไม่เท่ากัน</AlertTitle>
        <AlertDescription className="leading-6">XIRR/XNPV ใช้วันที่ปฏิทินจริงและฐาน 365 วันตามสูตร Spreadsheet หาก Cash flow ห่างเท่ากันทุกงวด ให้ใช้ <Link href="/irr-calculator" className="font-medium text-primary hover:underline">IRR & MIRR Calculator</Link> ซึ่งเป็นคนละแบบจำลอง</AlertDescription>
      </Alert>

      <section aria-labelledby="xirr-scenario-title">
        <h2 id="xirr-scenario-title" className="flex items-center gap-2 font-semibold"><CircleDollarSign className="size-4 text-primary" />1. Scenario และ Hurdle rate</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">ทุกอัตราเป็น Effective annual rate และไม่มีการแปลงค่าเงิน</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3 sm:col-span-2">
            <Label htmlFor="xirr-scenario-name">ชื่อ Scenario</Label>
            <Input id="xirr-scenario-name" value={form.scenarioName} maxLength={120} placeholder="เช่น การลงทุนเครื่องจักร · เงินรับไม่สม่ำเสมอ" onChange={(event) => updateForm("scenarioName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้ระบุ Scenario ในสรุปและไฟล์ CSV</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="xirr-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as XirrCurrency)}><SelectTrigger id="xirr-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="THB">THB · บาท</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="OTHER">หน่วยเงินอื่น</SelectItem></SelectContent></Select>
            <p className="text-xs leading-5 text-muted-foreground">ใช้จัดรูปแบบตัวเลขเท่านั้น ไม่มี FX conversion</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="xirr-hurdle-rate">Hurdle rate ต่อปี (%)</Label>
            <Input id="xirr-hurdle-rate" type="number" inputMode="decimal" step="0.01" min={-99} max={1_000} value={form.annualHurdleRatePercent} onChange={(event) => updateForm("annualHurdleRatePercent", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้คำนวณ XNPV และเป็นเกณฑ์ของผู้ใช้ ไม่ใช่อัตราแนะนำ</p>
          </div>
        </div>
      </section>

      <section className="mt-7 border-t pt-6" aria-labelledby="xirr-cash-flow-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="xirr-cash-flow-title" className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-primary" />2. Cash flow ตามวันที่จริง</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">เงินรับเป็นบวก เงินจ่ายเป็นลบ · วันที่ต้องเรียงจากเก่าไปใหม่และห้ามซ้ำ · สูงสุด {XIRR_MAX_CASH_FLOWS} รายการ · จำนวนเงินไม่เกิน {XIRR_MAX_MONEY.toLocaleString("th-TH")}</p>
          </div>
          <ActionBar>
            <Button type="button" variant="outline" onClick={sortCashFlows}><ArrowDownUp className="size-4" />เรียงวันที่</Button>
            <Button type="button" variant="outline" onClick={addCashFlow} disabled={form.cashFlows.length >= XIRR_MAX_CASH_FLOWS}><Plus className="size-4" />เพิ่มรายการ</Button>
          </ActionBar>
        </div>
        <div className="mt-5 grid gap-3">
          {form.cashFlows.map((row, index) => (
            <div key={row.id} className="grid gap-4 rounded-xl border bg-muted/5 p-4 sm:grid-cols-[auto_minmax(9rem,0.7fr)_minmax(0,1.2fr)_minmax(9rem,0.7fr)_auto] sm:items-end">
              <span className="grid size-9 place-items-center self-start rounded-full bg-primary/10 text-sm font-semibold text-primary sm:self-end">{index + 1}</span>
              <div className="grid gap-3"><Label htmlFor={`xirr-date-${row.id}`}>วันที่</Label><Input id={`xirr-date-${row.id}`} type="date" min="1900-01-01" max="2200-12-31" value={row.date} onChange={(event) => updateCashFlow(row.id, "date", event.target.value)} /></div>
              <div className="grid gap-3"><Label htmlFor={`xirr-label-${row.id}`}>ชื่อรายการ</Label><Input id={`xirr-label-${row.id}`} value={row.label} maxLength={80} placeholder={index ? "เช่น รับเงินครั้งที่ 1" : "เช่น เงินลงทุนเริ่มต้น"} onChange={(event) => updateCashFlow(row.id, "label", event.target.value)} /></div>
              <div className="grid gap-3"><Label htmlFor={`xirr-amount-${row.id}`}>Cash flow</Label><Input id={`xirr-amount-${row.id}`} type="number" inputMode="decimal" step="0.01" value={row.amount} placeholder={index ? "0.00" : "เช่น -100000"} onChange={(event) => updateCashFlow(row.id, "amount", event.target.value)} /></div>
              <Button type="button" variant="outline" size="icon" disabled={form.cashFlows.length <= 2} onClick={() => removeCashFlow(row.id)} aria-label={`ลบรายการที่ ${index + 1}`}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar><Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณ XIRR และ XNPV</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-6 min-w-0">
        {calculation ? <XirrResultPanel input={calculation.input} result={calculation.result} /> : (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><ChartNoAxesCombined className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกวันที่จริง พร้อม Cash flow อย่างน้อยหนึ่งค่าบวกและหนึ่งค่าลบ</p><p className="mt-1 text-xs">ระบบจะแสดงทุก XIRR ที่ตรวจพบ, XNPV profile และ Timeline</p></div>
          </div>
        )}
      </div>

      <Alert className="mt-6 border-amber-500/30 bg-amber-500/5">
        <TriangleAlert className="text-amber-700 dark:text-amber-300" />
        <AlertTitle>ไม่ใช่คำแนะนำลงทุนหรือผลตอบแทนที่รับรอง</AlertTitle>
        <AlertDescription className="leading-6">XIRR อาจมีหลายค่า ไม่มีค่า หรือให้ Ranking ต่างจาก XNPV เมื่อขนาดและเวลาของโครงการต่างกัน ควรตรวจภาษี เงินเฟ้อ สภาพคล่อง ความเสี่ยง Funding และ Scenario อื่นร่วมด้วย</AlertDescription>
      </Alert>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span><strong className="text-foreground">แหล่งสูตรและขอบเขต:</strong> <a className="font-medium text-primary hover:underline" href="https://support.microsoft.com/en-us/excel/functions/xirr-function" target="_blank" rel="noreferrer">Microsoft — XIRR</a> ยืนยันการใช้วันที่จริง ฐาน 365 วัน และความสัมพันธ์ XNPV = 0; <a className="font-medium text-primary hover:underline" href="https://support.microsoft.com/en-us/excel/functions/xnpv-function" target="_blank" rel="noreferrer">Microsoft — XNPV</a> ระบุสูตรและตัวอย่าง; <a className="font-medium text-primary hover:underline" href="https://support.google.com/docs/answer/3093268?hl=en" target="_blank" rel="noreferrer">Google Sheets — XNPV</a> ยืนยันว่าใช้กับช่วงเวลาไม่สม่ำเสมอ ข้อมูลทั้งหมดประมวลผลใน Browser และไม่ถูกอัปโหลด หากต้องการวิเคราะห์งวดเท่ากันใช้ <Link href="/irr-calculator" className="font-medium text-primary hover:underline">IRR & MIRR</Link> หรือวิเคราะห์คืนทุนใช้ <Link href="/payback-period-calculator" className="font-medium text-primary hover:underline">Payback Period</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
