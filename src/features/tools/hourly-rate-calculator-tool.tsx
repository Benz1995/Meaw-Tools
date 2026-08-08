"use client";

import { BriefcaseBusiness, Calculator, ClipboardList, Download, Info, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HOURLY_RATE_MAX_BUFFER_PERCENT,
  HOURLY_RATE_MAX_PLATFORM_FEE_PERCENT,
  calculateFreelanceRate,
  calculateSalaryRate,
  freelanceRateCsv,
  salaryRateCsv,
  type FreelanceRateInput,
  type FreelanceRateResult,
  type PayPeriod,
  type RateRoundingStep,
  type SalaryRateInput,
  type SalaryRateResult,
} from "@/lib/tools/hourly-rate";

type CalculatorMode = "salary" | "freelance";
type CurrencyCode = "THB" | "USD" | "EUR" | "GBP" | "JPY";

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: "THB", label: "THB — บาทไทย" },
  { code: "USD", label: "USD — ดอลลาร์สหรัฐ" },
  { code: "EUR", label: "EUR — ยูโร" },
  { code: "GBP", label: "GBP — ปอนด์อังกฤษ" },
  { code: "JPY", label: "JPY — เยนญี่ปุ่น" },
];
const PAY_PERIODS: Array<{ value: PayPeriod; label: string; suffix: string }> = [
  { value: "hourly", label: "รายชั่วโมง", suffix: "/ชั่วโมง" },
  { value: "daily", label: "รายวัน", suffix: "/วัน" },
  { value: "weekly", label: "รายสัปดาห์", suffix: "/สัปดาห์" },
  { value: "monthly", label: "รายเดือน", suffix: "/เดือน" },
  { value: "annual", label: "รายปี", suffix: "/ปี" },
];
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function money(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
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

function NumberField({ id, label, value, onChange, placeholder = "0", hint, min = 0, max = 1_000_000_000_000, step = 0.01 }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: React.ReactNode; min?: number; max?: number; step?: number }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; testId?: string }) {
  return <div className={emphasized ? "rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-4" : "rounded-xl border bg-muted/10 p-4"}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-emerald-900 tabular-nums dark:text-emerald-100" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}</div>;
}

function BreakdownRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}><span className="text-muted-foreground">{label}</span><span className="shrink-0 text-right tabular-nums">{value}</span></div>;
}

function SalaryResultPanel({ input, result, currency }: { input: SalaryRateInput; result: SalaryRateResult; currency: CurrencyCode }) {
  const summary = [
    "สรุปแปลงค่าจ้าง — Meaw Tools",
    `รายชั่วโมง: ${money(result.hourlyRate, currency)}`,
    `รายวัน: ${money(result.dailyRate, currency)}`,
    `รายสัปดาห์: ${money(result.weeklyRate, currency)}`,
    `รายเดือน: ${money(result.monthlyRate, currency)}`,
    `รายปี: ${money(result.annualIncome, currency)}`,
    `สมมติฐาน: ${numberFormatter.format(input.hoursPerWeek)} ชม./สัปดาห์ · ${numberFormatter.format(input.workDaysPerWeek)} วัน/สัปดาห์ · ${numberFormatter.format(input.workWeeksPerYear)} สัปดาห์/ปี`,
    "หมายเหตุ: เป็นรายได้รวมก่อนภาษีและรายการหัก ไม่ใช่อัตราค่าจ้างขั้นต่ำตามกฎหมาย",
  ].join("\n");
  return (
    <div className="space-y-5" data-testid="salary-rate-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ResultCard label="เทียบรายชั่วโมง" value={`${money(result.hourlyRate, currency)}/ชม.`} emphasized testId="salary-hourly-rate" />
        <ResultCard label="เทียบรายวัน" value={money(result.dailyRate, currency)} detail={`${numberFormatter.format(result.hoursPerDay)} ชม./วัน`} />
        <ResultCard label="เทียบรายสัปดาห์" value={money(result.weeklyRate, currency)} />
        <ResultCard label="เทียบรายเดือน" value={money(result.monthlyRate, currency)} />
        <ResultCard label="เทียบรายปี" value={money(result.annualIncome, currency)} />
      </div>
      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="salary-rate-breakdown-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1"><h2 id="salary-rate-breakdown-title" className="font-semibold">สูตรและสมมติฐานที่ใช้</h2><div className="mt-4 max-w-2xl space-y-3"><BreakdownRow label="รายได้ปกติต่อปี" value={money(result.regularAnnualIncome, currency)} /><BreakdownRow label="โบนัส / รายได้เพิ่มต่อปี" value={money(result.annualAdditionalPay, currency)} /><BreakdownRow label="ชั่วโมงทำงานต่อปี" value={`${numberFormatter.format(result.annualHours)} ชั่วโมง`} /><BreakdownRow label="วันทำงานต่อปี" value={`${numberFormatter.format(result.annualWorkDays)} วัน`} /><BreakdownRow label="รายได้รวมต่อปี ÷ ชั่วโมงต่อปี" value={`${money(result.annualIncome, currency)} ÷ ${numberFormatter.format(result.annualHours)}`} strong /></div></div>
          <ActionBar><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(salaryRateCsv(input, result, currency), "meaw-hourly-rate.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></ActionBar>
        </div>
      </section>
    </div>
  );
}

function FreelanceResultPanel({ input, result, currency }: { input: FreelanceRateInput; result: FreelanceRateResult; currency: CurrencyCode }) {
  const summary = [
    "สรุปเรทฟรีแลนซ์ — Meaw Tools",
    `เรทขั้นต่ำก่อนปัด: ${money(result.exactHourlyRate, currency)}/ชม.`,
    `เรทหลังปัดขึ้น: ${money(result.roundedHourlyRate, currency)}/ชม.`,
    `เรทรายวัน: ${money(result.dayRate, currency)}`,
    `รายรับธุรกิจเป้าหมาย: ${money(result.requiredAnnualRevenue, currency)}/ปี`,
    `ชั่วโมงที่ขายได้: ${numberFormatter.format(result.annualBillableHours)} ชม./ปี`,
    input.projectHours || input.projectDirectCosts ? `ราคาโปรเจกต์ขั้นต่ำ: ${money(result.projectQuote, currency)}` : "",
    "หมายเหตุ: เป็นจุดตั้งต้นจากตัวเลขที่กรอก ไม่ใช่ราคาตลาด คำแนะนำภาษี หรือการรับประกันรายได้",
  ].filter(Boolean).join("\n");
  return (
    <div className="space-y-5" data-testid="freelance-rate-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="เรทหลังปัดขึ้น" value={`${money(result.roundedHourlyRate, currency)}/ชม.`} detail={`ขั้นต่ำก่อนปัด ${money(result.exactHourlyRate, currency)}`} emphasized testId="freelance-hourly-rate" />
        <ResultCard label="เรทรายวัน" value={money(result.dayRate, currency)} detail={`${numberFormatter.format(input.billableHoursPerDay)} ชั่วโมงคิดค่าบริการ`} />
        <ResultCard label="เป้ารายรับต่อเดือน" value={money(result.monthlyRevenueTarget, currency)} detail="ค่าเฉลี่ยจากเป้ารายปี" />
        <ResultCard label="เป้ารายรับธุรกิจต่อปี" value={money(result.requiredAnnualRevenue, currency)} detail={`${numberFormatter.format(result.annualBillableHours)} ชั่วโมงที่ขายได้`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="freelance-breakdown-title">
          <h2 id="freelance-breakdown-title" className="font-semibold">ที่มาของเรทขั้นต่ำ</h2><div className="mt-4 space-y-3"><BreakdownRow label="รายได้ + ต้นทุน + เงินสำรอง" value={money(result.baseAnnualNeed, currency)} /><BreakdownRow label={`ส่วนเผื่อ ${numberFormatter.format(input.bufferPercent)}%`} value={money(result.bufferAmount, currency)} /><BreakdownRow label="เป้าก่อนค่าธรรมเนียม" value={money(result.revenueBeforePlatformFee, currency)} /><BreakdownRow label={`ชดเชยค่าธรรมเนียม ${numberFormatter.format(input.platformFeePercent)}%`} value={money(result.platformFeeAmount, currency)} /><BreakdownRow label="ชั่วโมงที่เรียกเก็บได้ต่อปี" value={`${numberFormatter.format(result.annualBillableHours)} ชม.`} /><BreakdownRow label="เรทขั้นต่ำก่อนปัด" value={`${money(result.exactHourlyRate, currency)}/ชม.`} strong />{result.roundingDelta > 0 ? <p className="text-xs leading-5 text-muted-foreground">การปัดขึ้นเพิ่ม {money(result.roundingDelta, currency)}/ชม. เพื่อไม่ให้เรทต่ำกว่าผลคำนวณ แต่ไม่ได้หมายความว่าเป็นราคาตลาดที่ลูกค้าจะยอมรับ</p> : null}</div>
        </section>
        <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 sm:p-5" aria-labelledby="project-quote-title">
          <h2 id="project-quote-title" className="font-semibold">ประมาณราคาโปรเจกต์</h2>{input.projectHours || input.projectDirectCosts ? <div className="mt-4 space-y-3"><BreakdownRow label={`${numberFormatter.format(input.projectHours)} ชั่วโมง × เรทหลังปัด`} value={money(result.projectLabor, currency)} /><BreakdownRow label="ค่าใช้จ่ายตรงหลังเผื่อค่าธรรมเนียม" value={money(result.projectDirectCostsWithFee, currency)} /><BreakdownRow label="ราคาโปรเจกต์ขั้นต่ำก่อน VAT" value={money(result.projectQuote, currency)} strong /><p className="text-xs leading-5 text-muted-foreground">ยังไม่รวม scope change, revision เพิ่ม, ภาษีมูลค่าเพิ่ม หรือเงื่อนไขชำระเงิน ใช้หน้า Quotation Generator เพื่อทำเอกสารหลังตกลงขอบเขตแล้ว</p></div> : <p className="mt-3 text-sm leading-6 text-muted-foreground">กรอกชั่วโมงโปรเจกต์หรือค่าใช้จ่ายตรงเพื่อดูราคาเริ่มต้น โดยใช้เรทหลังปัดเป็นฐาน</p>}<Link href="/quotation-generator" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">เปิด Quotation Generator →</Link>
        </section>
      </div>

      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(freelanceRateCsv(input, result, currency), "meaw-freelance-rate.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function HourlyRateCalculatorTool() {
  const [mode, setMode] = useState<CalculatorMode>("salary");
  const [currency, setCurrency] = useState<CurrencyCode>("THB");
  const [payPeriod, setPayPeriod] = useState<PayPeriod>("monthly");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [annualAdditionalPay, setAnnualAdditionalPay] = useState("0");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState("5");
  const [workWeeksPerYear, setWorkWeeksPerYear] = useState("52");
  const [salaryResult, setSalaryResult] = useState<{ input: SalaryRateInput; result: SalaryRateResult } | null>(null);
  const [desiredIncome, setDesiredIncome] = useState("");
  const [annualOverhead, setAnnualOverhead] = useState("");
  const [annualReserve, setAnnualReserve] = useState("");
  const [bufferPercent, setBufferPercent] = useState("10");
  const [platformFeePercent, setPlatformFeePercent] = useState("0");
  const [billableHoursPerWeek, setBillableHoursPerWeek] = useState("25");
  const [billableWeeksPerYear, setBillableWeeksPerYear] = useState("48");
  const [billableHoursPerDay, setBillableHoursPerDay] = useState("8");
  const [roundingStep, setRoundingStep] = useState<RateRoundingStep>(50);
  const [projectHours, setProjectHours] = useState("");
  const [projectDirectCosts, setProjectDirectCosts] = useState("");
  const [freelanceResult, setFreelanceResult] = useState<{ input: FreelanceRateInput; result: FreelanceRateResult } | null>(null);
  const [error, setError] = useState("");
  const invalidateSalary = () => { setSalaryResult(null); setError(""); };
  const invalidateFreelance = () => { setFreelanceResult(null); setError(""); };
  const updateSalary = (setter: (value: string) => void) => (value: string) => { setter(value); invalidateSalary(); };
  const updateFreelance = (setter: (value: string) => void) => (value: string) => { setter(value); invalidateFreelance(); };

  const calculateSalary = () => {
    try {
      const input: SalaryRateInput = { amount: parseNumber(salaryAmount, "ค่าจ้างหรือเงินเดือน", true), payPeriod, hoursPerWeek: parseNumber(hoursPerWeek, "ชั่วโมงทำงานต่อสัปดาห์", true), workDaysPerWeek: parseNumber(workDaysPerWeek, "วันทำงานต่อสัปดาห์", true), workWeeksPerYear: parseNumber(workWeeksPerYear, "สัปดาห์ทำงานต่อปี", true), annualAdditionalPay: parseNumber(annualAdditionalPay, "โบนัสและรายได้เพิ่มต่อปี") };
      setSalaryResult({ input, result: calculateSalaryRate(input) }); setError("");
    } catch (caught) { setSalaryResult(null); setError(caught instanceof Error ? caught.message : "แปลงค่าจ้างไม่สำเร็จ"); }
  };
  const calculateFreelance = () => {
    try {
      const input: FreelanceRateInput = { desiredAnnualIncome: parseNumber(desiredIncome, "รายได้ส่วนตัวเป้าหมายต่อปี", true), annualOverhead: parseNumber(annualOverhead, "ต้นทุนธุรกิจต่อปี"), annualReserve: parseNumber(annualReserve, "เงินสำรองและสวัสดิการต่อปี"), bufferPercent: parseNumber(bufferPercent, "ส่วนเผื่อความเสี่ยงหรือกำไร"), platformFeePercent: parseNumber(platformFeePercent, "ค่าธรรมเนียมแพลตฟอร์ม"), billableHoursPerWeek: parseNumber(billableHoursPerWeek, "ชั่วโมงที่เรียกเก็บเงินได้ต่อสัปดาห์", true), billableWeeksPerYear: parseNumber(billableWeeksPerYear, "สัปดาห์ที่รับงานต่อปี", true), billableHoursPerDay: parseNumber(billableHoursPerDay, "ชั่วโมงคิดค่าบริการต่อวัน", true), roundingStep, projectHours: parseNumber(projectHours, "ชั่วโมงของโปรเจกต์"), projectDirectCosts: parseNumber(projectDirectCosts, "ค่าใช้จ่ายตรงของโปรเจกต์") };
      setFreelanceResult({ input, result: calculateFreelanceRate(input) }); setError("");
    } catch (caught) { setFreelanceResult(null); setError(caught instanceof Error ? caught.message : "คำนวณเรทฟรีแลนซ์ไม่สำเร็จ"); }
  };
  const salaryExample = () => { setCurrency("THB"); setPayPeriod("monthly"); setSalaryAmount("30000"); setAnnualAdditionalPay("30000"); setHoursPerWeek("40"); setWorkDaysPerWeek("5"); setWorkWeeksPerYear("52"); invalidateSalary(); };
  const freelanceExample = () => { setCurrency("THB"); setDesiredIncome("600000"); setAnnualOverhead("120000"); setAnnualReserve("60000"); setBufferPercent("10"); setPlatformFeePercent("10"); setBillableHoursPerWeek("25"); setBillableWeeksPerYear("48"); setBillableHoursPerDay("8"); setRoundingStep(50); setProjectHours("20"); setProjectDirectCosts("10000"); invalidateFreelance(); };
  const clearSalary = () => { setPayPeriod("monthly"); setSalaryAmount(""); setAnnualAdditionalPay("0"); setHoursPerWeek("40"); setWorkDaysPerWeek("5"); setWorkWeeksPerYear("52"); invalidateSalary(); };
  const clearFreelance = () => { setDesiredIncome(""); setAnnualOverhead(""); setAnnualReserve(""); setBufferPercent("10"); setPlatformFeePercent("0"); setBillableHoursPerWeek("25"); setBillableWeeksPerYear("48"); setBillableHoursPerDay("8"); setRoundingStep(50); setProjectHours(""); setProjectDirectCosts(""); invalidateFreelance(); };
  const selectedPeriod = PAY_PERIODS.find((period) => period.value === payPeriod)!;

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>คำนวณจากสมมติฐานที่คุณควบคุมได้</AlertTitle><AlertDescription className="leading-6">เลือกแปลงค่าจ้างประจำ หรือย้อนหาราคาเริ่มต้นของฟรีแลนซ์ ข้อมูลอยู่ใน Browser ผลเป็นยอดก่อนภาษี/รายการหัก และไม่ใช่อัตราค่าจ้างขั้นต่ำ คำแนะนำภาษี หรือการรับประกันราคาตลาด</AlertDescription></Alert>

      <div className="mb-6 grid gap-3 sm:max-w-xs"><Label htmlFor="hourly-currency">สกุลเงินที่ใช้แสดงผล</Label><Select value={currency} onValueChange={(value) => { setCurrency(value as CurrencyCode); setSalaryResult(null); setFreelanceResult(null); setError(""); }}><SelectTrigger id="hourly-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">ไม่มีการแปลงอัตราแลกเปลี่ยน ตัวเลขทุกช่องต้องเป็นสกุลเดียวกัน</p></div>

      <Tabs value={mode} onValueChange={(value) => { setMode(value as CalculatorMode); setError(""); }}>
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[36rem]"><TabsTrigger value="salary" className="min-h-11 px-3"><WalletCards className="size-4" />แปลงเงินเดือน / ค่าจ้าง</TabsTrigger><TabsTrigger value="freelance" className="min-h-11 px-3"><BriefcaseBusiness className="size-4" />คำนวณเรทฟรีแลนซ์</TabsTrigger></TabsList>

        <TabsContent value="salary" className="mt-7">
          <section aria-labelledby="salary-rate-input-title"><div className="mb-5"><h2 id="salary-rate-input-title" className="font-semibold">ค่าจ้างและงวดที่ได้รับ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ผลลัพธ์รวมโบนัสหรือรายได้เพิ่มที่กรอก แล้วกระจายตามชั่วโมงและวันทำงานต่อปี</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3"><div className="grid gap-3"><Label htmlFor="salary-pay-period">งวดค่าจ้าง</Label><Select value={payPeriod} onValueChange={(value) => { setPayPeriod(value as PayPeriod); invalidateSalary(); }}><SelectTrigger id="salary-pay-period" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAY_PERIODS.map((period) => <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>)}</SelectContent></Select></div><NumberField id="salary-rate-amount" label={`ค่าจ้างหรือเงินเดือน (${currency}${selectedPeriod.suffix})`} value={salaryAmount} onChange={updateSalary(setSalaryAmount)} placeholder="30000" min={0.01} hint="ใช้ยอดรวมก่อนภาษีและรายการหัก" /><NumberField id="salary-additional-pay" label={`โบนัส / คอมมิชชันเพิ่มต่อปี (${currency})`} value={annualAdditionalPay} onChange={updateSalary(setAnnualAdditionalPay)} placeholder="30000" hint="เว้นว่างหรือใส่ 0 หากไม่มี" /></div></section>
          <section className="mt-7 border-t pt-7" aria-labelledby="salary-capacity-title"><div className="mb-5"><h2 id="salary-capacity-title" className="font-semibold">สมมติฐานเวลาทำงาน</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">52 สัปดาห์เหมาะกับการเทียบแบบมาตรฐาน หากมีช่วงไม่รับค่าจ้างหรืออยากวัดเฉพาะเวลาที่ทำงานจริง ให้ปรับจำนวนสัปดาห์เอง</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="salary-hours-week" label="ชั่วโมงทำงานต่อสัปดาห์" value={hoursPerWeek} onChange={updateSalary(setHoursPerWeek)} min={0.01} max={168} step={0.25} placeholder="40" /><NumberField id="salary-days-week" label="วันทำงานต่อสัปดาห์" value={workDaysPerWeek} onChange={updateSalary(setWorkDaysPerWeek)} min={0.01} max={7} step={0.5} placeholder="5" /><NumberField id="salary-weeks-year" label="สัปดาห์ทำงานต่อปี" value={workWeeksPerYear} onChange={updateSalary(setWorkWeeksPerYear)} min={0.01} max={53} step={0.25} placeholder="52" /></div></section>
          <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculateSalary}><Calculator className="size-4" />แปลงเป็นรายชั่วโมง</Button><ExampleButton onExample={salaryExample} /><ClearButton onClear={clearSalary} /></ActionBar></div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
          <div className="mt-5" aria-live="polite">{salaryResult ? <SalaryResultPanel input={salaryResult.input} result={salaryResult.result} currency={currency} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><WalletCards className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกค่าจ้างและเวลาทำงาน แล้วกดแปลงเป็นรายชั่วโมง</p><p className="mt-1 text-xs">ระบบจะแสดงยอดเทียบรายชั่วโมง วัน สัปดาห์ เดือน และปีพร้อมสูตร</p></div></div>}</div>
        </TabsContent>

        <TabsContent value="freelance" className="mt-7">
          <section aria-labelledby="freelance-target-title"><div className="mb-5"><h2 id="freelance-target-title" className="font-semibold">รายได้และต้นทุนที่ต้องครอบคลุม</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">รายได้เป้าหมายเป็นยอดส่วนตัวก่อนภาษี ไม่ใช่รายรับธุรกิจทั้งหมด ใส่เงินสำรองภาษี/สวัสดิการเป็นจำนวนเงินที่ประเมินเองแทนการให้ระบบเดากฎหมาย</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="freelance-income" label={`รายได้ส่วนตัวเป้าหมายต่อปี (${currency})`} value={desiredIncome} onChange={updateFreelance(setDesiredIncome)} placeholder="600000" min={0.01} hint="ยอดที่ต้องการเหลือสำหรับตนเองก่อนภาษีส่วนบุคคล" /><NumberField id="freelance-overhead" label={`ต้นทุนธุรกิจต่อปี (${currency})`} value={annualOverhead} onChange={updateFreelance(setAnnualOverhead)} placeholder="120000" hint="เช่น ซอฟต์แวร์ อุปกรณ์ บัญชี พื้นที่ทำงาน" /><NumberField id="freelance-reserve" label={`เงินสำรอง / สวัสดิการต่อปี (${currency})`} value={annualReserve} onChange={updateFreelance(setAnnualReserve)} placeholder="60000" hint="เช่น ภาษีที่ประเมินเอง ประกัน วันลาป่วย หรือการเรียนรู้" /></div></section>
          <section className="mt-7 border-t pt-7" aria-labelledby="freelance-capacity-title"><div className="mb-5"><h2 id="freelance-capacity-title" className="font-semibold">เวลาที่ขายให้ลูกค้าได้จริง</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">อย่าใช้ชั่วโมงทำงานทั้งหมด หากยังมีเวลาเสนอราคา ประชุม ทำบัญชี แก้งานที่ไม่คิดเงิน และหาลูกค้า</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="freelance-hours-week" label="ชั่วโมงที่เรียกเก็บเงินได้ต่อสัปดาห์" value={billableHoursPerWeek} onChange={updateFreelance(setBillableHoursPerWeek)} min={0.01} max={168} step={0.25} placeholder="25" /><NumberField id="freelance-weeks-year" label="สัปดาห์ที่รับงานต่อปี" value={billableWeeksPerYear} onChange={updateFreelance(setBillableWeeksPerYear)} min={0.01} max={53} step={0.25} placeholder="48" /><NumberField id="freelance-hours-day" label="ชั่วโมงคิดค่าบริการต่อวัน" value={billableHoursPerDay} onChange={updateFreelance(setBillableHoursPerDay)} min={0.01} max={24} step={0.25} placeholder="8" hint="ใช้คำนวณ Day rate เท่านั้น" /></div></section>
          <section className="mt-7 border-t pt-7" aria-labelledby="freelance-adjustment-title"><div className="mb-5"><h2 id="freelance-adjustment-title" className="font-semibold">ส่วนเผื่อ ค่าธรรมเนียม และการปัดเรท</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ค่าธรรมเนียมถูก gross-up เพื่อให้ยอดหลังหักยังเหลือตามเป้า ส่วนการปัดใช้ปัดขึ้นเท่านั้นและแสดงเรทก่อนปัดเสมอ</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="freelance-buffer" label="ส่วนเผื่อความเสี่ยง / กำไร (%)" value={bufferPercent} onChange={updateFreelance(setBufferPercent)} min={0} max={HOURLY_RATE_MAX_BUFFER_PERCENT} step={0.1} placeholder="10" /><NumberField id="freelance-platform-fee" label="ค่าธรรมเนียมแพลตฟอร์ม / รับเงิน (%)" value={platformFeePercent} onChange={updateFreelance(setPlatformFeePercent)} min={0} max={HOURLY_RATE_MAX_PLATFORM_FEE_PERCENT} step={0.1} placeholder="0" /><div className="grid gap-3"><Label htmlFor="freelance-rounding">ปัดเรทขึ้นทีละ</Label><Select value={String(roundingStep)} onValueChange={(value) => { setRoundingStep(Number(value) as RateRoundingStep); invalidateFreelance(); }}><SelectTrigger id="freelance-rounding" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">ไม่ปัด</SelectItem><SelectItem value="1">1 {currency}</SelectItem><SelectItem value="5">5 {currency}</SelectItem><SelectItem value="10">10 {currency}</SelectItem><SelectItem value="50">50 {currency}</SelectItem><SelectItem value="100">100 {currency}</SelectItem></SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">เลือกหน่วยให้เหมาะกับสกุลเงินและระดับราคาของงาน</p></div></div></section>
          <section className="mt-7 border-t pt-7" aria-labelledby="freelance-project-title"><div className="mb-5"><h2 id="freelance-project-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ประมาณราคาโปรเจกต์ (ไม่บังคับ)</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ราคาใช้เรทหลังปัด × ชั่วโมง แล้วบวกค่าใช้จ่ายตรงที่ gross-up ตามค่าธรรมเนียม ไม่รวม VAT หรือ scope change</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-2"><NumberField id="freelance-project-hours" label="ชั่วโมงที่คาดว่าจะใช้" value={projectHours} onChange={updateFreelance(setProjectHours)} placeholder="20" step={0.25} /><NumberField id="freelance-project-costs" label={`ค่าใช้จ่ายตรงของโปรเจกต์ (${currency})`} value={projectDirectCosts} onChange={updateFreelance(setProjectDirectCosts)} placeholder="10000" hint="เช่น จ้างช่วง ซื้อ asset หรือเดินทางเฉพาะงาน" /></div></section>
          <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculateFreelance}><Calculator className="size-4" />คำนวณเรทฟรีแลนซ์</Button><ExampleButton onExample={freelanceExample} /><ClearButton onClear={clearFreelance} /></ActionBar></div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
          <div className="mt-5" aria-live="polite">{freelanceResult ? <FreelanceResultPanel input={freelanceResult.input} result={freelanceResult.result} currency={currency} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><BriefcaseBusiness className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกเป้ารายได้ ต้นทุน และชั่วโมงที่ขายได้ แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดงเรทขั้นต่ำ Day rate เป้ารายรับ และราคาโปรเจกต์พร้อมสูตร</p></div></div>}</div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ผลลัพธ์เป็นการแปลงและวางแผนจากตัวเลขที่คุณกรอก ไม่รวมอัตราค่าจ้างขั้นต่ำตามพื้นที่ สิทธิแรงงาน ภาษีมูลค่าเพิ่ม ภาษีเงินได้ ประกันสังคม สวัสดิการ หรือราคาตลาด ควรตรวจสัญญา กฎหมาย และความต้องการของลูกค้าก่อนตัดสินใจ</span></p></div>
    </WorkspaceFrame>
  );
}
