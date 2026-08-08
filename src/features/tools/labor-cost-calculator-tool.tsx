"use client";

import {
  BriefcaseBusiness,
  Calculator,
  ClipboardList,
  Clock3,
  Download,
  Gauge,
  Info,
  ShieldCheck,
  Target,
  UsersRound,
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
  calculateLaborCost,
  laborCostCsv,
  type LaborCostInput,
  type LaborCostResult,
  type LaborPayBasis,
} from "@/lib/tools/labor-cost";

type CurrencyCode = "THB" | "USD" | "EUR" | "GBP" | "JPY";

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: "THB", label: "THB — บาทไทย" },
  { code: "USD", label: "USD — ดอลลาร์สหรัฐ" },
  { code: "EUR", label: "EUR — ยูโร" },
  { code: "GBP", label: "GBP — ปอนด์" },
  { code: "JPY", label: "JPY — เยน" },
];

const PAY_BASIS_OPTIONS: Array<{ value: LaborPayBasis; label: string }> = [
  { value: "monthly", label: "เงินเดือน" },
  { value: "annual", label: "เงินเดือน/ค่าจ้างรายปี" },
  { value: "hourly", label: "ค่าจ้างรายชั่วโมง" },
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

function NumberField({ id, label, value, onChange, hint, min = 0, max = 1_000_000_000_000, step = 0.01, placeholder = "0" }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: React.ReactNode; min?: number; max?: number; step?: number; placeholder?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail: string; emphasized?: boolean; testId?: string }) {
  return <div className={emphasized ? "rounded-xl border border-sky-500/35 bg-sky-500/5 p-4" : "rounded-xl border bg-muted/10 p-4"}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-sky-950 tabular-nums dark:text-sky-100" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>;
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.min(100, value / total * 100) : 0;
  return <div><div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="shrink-0 font-medium tabular-nums">{numberFormatter.format(value)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} /></div></div>;
}

function LaborCostResultPanel({ input, result, currency }: { input: LaborCostInput; result: LaborCostResult; currency: CurrencyCode }) {
  const productiveRate = result.loadedCostPerProductiveHour === null ? "คำนวณไม่ได้" : money(result.loadedCostPerProductiveHour, currency);
  const summary = [
    "สรุปต้นทุนพนักงานแบบ Fully Loaded",
    `ต้นทุนต่อคน/ปี: ${money(result.loadedAnnualCostPerEmployee, currency)}`,
    `ต้นทุนต่อคน/เดือน: ${money(result.loadedMonthlyCostPerEmployee, currency)}`,
    `Labor burden rate: ${numberFormatter.format(result.burdenRatePercent)}%`,
    `Cost multiplier: ${numberFormatter.format(result.costMultiplier)} เท่าของค่าจ้างฐาน`,
    `ต้นทุน/ชั่วโมงที่จ่าย: ${money(result.loadedCostPerPaidHour, currency)}`,
    `ต้นทุน/ชั่วโมงที่ส่งมอบได้: ${productiveRate}`,
    `ต้นทุนทีม ${input.headcount} คน/ปี: ${money(result.teamAnnualCost, currency)}`,
  ].join("\n");
  const breakdownRows = [
    { label: "ค่าจ้างฐาน", value: result.breakdown.basePay, color: "bg-sky-500" },
    { label: "โบนัสและค่าตอบแทนผันแปร", value: result.breakdown.variableCashPay, color: "bg-violet-500" },
    { label: "ภาษี/เงินสมทบและภาระตามค่าจ้าง", value: result.breakdown.wageLinkedBurden, color: "bg-amber-500" },
    { label: "สวัสดิการและต้นทุนคงที่ต่อคน", value: result.breakdown.fixedEmployeeCosts, color: "bg-emerald-500" },
    { label: "Overhead ที่จัดสรร", value: result.breakdown.allocatedOverhead, color: "bg-rose-500" },
  ];

  return (
    <div data-testid="labor-cost-result" className="space-y-5" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="ต้นทุนรวมต่อคน / ปี" value={money(result.loadedAnnualCostPerEmployee, currency)} detail={`มากกว่าค่าจ้างฐาน ${money(result.burdenCostPerEmployee, currency)}`} emphasized testId="labor-annual-cost" />
        <ResultCard label="ต้นทุนรวมต่อคน / เดือน" value={money(result.loadedMonthlyCostPerEmployee, currency)} detail="ใช้วาง Run-rate รายเดือน" testId="labor-monthly-cost" />
        <ResultCard label="ต้นทุน / ชั่วโมงที่ส่งมอบได้" value={productiveRate} detail={`${numberFormatter.format(result.productiveHoursPerEmployee)} ชม./คน/ปี`} emphasized testId="labor-productive-rate" />
        <ResultCard label={`ต้นทุนทีม ${numberFormatter.format(input.headcount)} คน / ปี`} value={money(result.teamAnnualCost, currency)} detail={`${money(result.teamMonthlyCost, currency)} ต่อเดือน`} testId="labor-team-cost" />
        <ResultCard label="Labor burden rate" value={`${numberFormatter.format(result.burdenRatePercent)}%`} detail="ภาระเหนือค่าจ้างฐาน ÷ ค่าจ้างฐาน" testId="labor-burden-rate" />
        <ResultCard label="Cost multiplier" value={`${numberFormatter.format(result.costMultiplier)}×`} detail="ต้นทุนรวม ÷ ค่าจ้างฐาน" testId="labor-cost-multiplier" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="labor-cost-stack-title">
          <h3 id="labor-cost-stack-title" className="flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />Cost stack ต่อพนักงาน / ปี</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">แต่ละแถบเทียบกับต้นทุนรวมต่อคน โดยไม่ใช้ benchmark เดาแทนข้อมูลบริษัท</p>
          <div className="mt-5 space-y-4">{breakdownRows.map((item) => <BreakdownRow key={item.label} {...item} total={result.loadedAnnualCostPerEmployee} />)}</div>
          <div className="mt-5 flex items-center justify-between gap-4 border-t pt-4 font-semibold"><span>Fully loaded annual cost</span><span className="shrink-0 tabular-nums">{money(result.loadedAnnualCostPerEmployee, currency)}</span></div>
        </section>

        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="labor-hours-title">
          <h3 id="labor-hours-title" className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />ชั่วโมงที่จ่าย vs ชั่วโมงที่ส่งมอบได้</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ชั่วโมงที่จ่ายต่อคน/ปี</span><span className="tabular-nums">{numberFormatter.format(result.paidHoursPerEmployee)} ชม.</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ลา/หยุด/อบรม-แอดมิน</span><span className="tabular-nums">−{numberFormatter.format(result.nonproductiveHoursPerEmployee)} ชม.</span></div>
            <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><span>ชั่วโมงที่ส่งมอบได้</span><span className="tabular-nums">{numberFormatter.format(result.productiveHoursPerEmployee)} ชม.</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ต้นทุน/ชั่วโมงที่จ่าย</span><span className="tabular-nums">{money(result.loadedCostPerPaidHour, currency)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">ต้นทุน/ชั่วโมงส่งมอบ</span><span className="font-semibold tabular-nums">{productiveRate}</span></div>
          </div>
          <p className="mt-4 rounded-lg bg-sky-500/5 p-3 text-xs leading-5 text-muted-foreground">ค่าจ้างฐานรวมเวลาที่จ่ายแล้ว การหักวันลาในส่วนนี้ลดเฉพาะชั่วโมงที่ใช้หาร ไม่ได้บวกค่าจ้างวันลาซ้ำเป็นต้นทุนใหม่</p>
        </section>
      </div>

      <details className="rounded-xl border bg-muted/5 p-4 sm:p-5">
        <summary className="cursor-pointer font-semibold marker:text-primary">รายละเอียดภาระและต้นทุนคงที่ต่อพนักงาน</summary>
        <div className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Employer contributions</span><span>{money(result.employerContributionCost, currency)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Retirement / pension</span><span>{money(result.retirementCost, currency)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Other wage-linked burden</span><span>{money(result.otherWageLinkedCost, currency)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Fixed employee costs</span><span>{money(result.fixedEmployeeCostsPerEmployee, currency)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Allocated overhead</span><span>{money(result.allocatedOverheadPerEmployee, currency)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Team productive hours</span><span>{numberFormatter.format(result.teamProductiveHours)} ชม.</span></div>
        </div>
      </details>

      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(laborCostCsv(input, result, currency), "meaw-labor-cost.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function LaborCostCalculatorTool() {
  const [currency, setCurrency] = useState<CurrencyCode>("THB");
  const [payBasis, setPayBasis] = useState<LaborPayBasis>("monthly");
  const [payAmount, setPayAmount] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [paidWeeksPerYear, setPaidWeeksPerYear] = useState("52");
  const [workdaysPerWeek, setWorkdaysPerWeek] = useState("5");
  const [annualBonus, setAnnualBonus] = useState("0");
  const [annualAllowances, setAnnualAllowances] = useState("0");
  const [employerContributionPercent, setEmployerContributionPercent] = useState("0");
  const [retirementPercent, setRetirementPercent] = useState("0");
  const [otherWageLinkedPercent, setOtherWageLinkedPercent] = useState("0");
  const [annualBenefits, setAnnualBenefits] = useState("0");
  const [annualTrainingCost, setAnnualTrainingCost] = useState("0");
  const [annualEquipmentSoftware, setAnnualEquipmentSoftware] = useState("0");
  const [annualWorkspaceCost, setAnnualWorkspaceCost] = useState("0");
  const [annualRecruitingCost, setAnnualRecruitingCost] = useState("0");
  const [annualOtherCost, setAnnualOtherCost] = useState("0");
  const [allocatedOverheadPercent, setAllocatedOverheadPercent] = useState("0");
  const [paidLeaveDays, setPaidLeaveDays] = useState("0");
  const [paidHolidayDays, setPaidHolidayDays] = useState("0");
  const [otherNonproductiveDays, setOtherNonproductiveDays] = useState("0");
  const [calculation, setCalculation] = useState<{ input: LaborCostInput; result: LaborCostResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateValue = (setter: (value: string) => void) => (value: string) => { setter(value); invalidate(); };
  const payAmountLabel = payBasis === "monthly" ? `เงินเดือนฐาน (${currency}/เดือน)` : payBasis === "annual" ? `ค่าจ้างฐาน (${currency}/ปี)` : `ค่าจ้างฐาน (${currency}/ชั่วโมง)`;

  const calculate = () => {
    try {
      const input: LaborCostInput = {
        payBasis,
        payAmount: parseNumber(payAmount, "ค่าจ้างฐาน", true),
        headcount: parseNumber(headcount, "จำนวนพนักงาน", true),
        hoursPerWeek: parseNumber(hoursPerWeek, "ชั่วโมงที่จ่ายต่อสัปดาห์", true),
        paidWeeksPerYear: parseNumber(paidWeeksPerYear, "สัปดาห์ที่จ่ายต่อปี", true),
        workdaysPerWeek: parseNumber(workdaysPerWeek, "วันทำงานต่อสัปดาห์", true),
        annualBonus: parseNumber(annualBonus, "โบนัส/คอมมิชชันต่อปี"),
        annualAllowances: parseNumber(annualAllowances, "เบี้ยเลี้ยง/ค่าตอบแทนอื่นต่อปี"),
        employerContributionPercent: parseNumber(employerContributionPercent, "ภาษีและเงินสมทบฝั่งนายจ้าง"),
        retirementPercent: parseNumber(retirementPercent, "เงินสมทบเกษียณ/กองทุน"),
        otherWageLinkedPercent: parseNumber(otherWageLinkedPercent, "ภาระอื่นที่ผูกกับค่าจ้าง"),
        annualBenefits: parseNumber(annualBenefits, "สวัสดิการคงที่ต่อปี"),
        annualTrainingCost: parseNumber(annualTrainingCost, "ค่าอบรมต่อปี"),
        annualEquipmentSoftware: parseNumber(annualEquipmentSoftware, "อุปกรณ์และซอฟต์แวร์ต่อปี"),
        annualWorkspaceCost: parseNumber(annualWorkspaceCost, "พื้นที่ทำงานต่อปี"),
        annualRecruitingCost: parseNumber(annualRecruitingCost, "ค่า Recruiting/Onboarding"),
        annualOtherCost: parseNumber(annualOtherCost, "ต้นทุนอื่นต่อปี"),
        allocatedOverheadPercent: parseNumber(allocatedOverheadPercent, "Overhead ที่จัดสรร"),
        paidLeaveDays: parseNumber(paidLeaveDays, "วันลาที่ได้รับค่าจ้าง"),
        paidHolidayDays: parseNumber(paidHolidayDays, "วันหยุดที่ได้รับค่าจ้าง"),
        otherNonproductiveDays: parseNumber(otherNonproductiveDays, "วันอบรม/แอดมินที่ไม่ส่งมอบ"),
      };
      setCalculation({ input, result: calculateLaborCost(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณต้นทุนพนักงานได้");
    }
  };

  const loadExample = () => {
    setCurrency("THB"); setPayBasis("monthly"); setPayAmount("50000"); setHeadcount("3"); setHoursPerWeek("40"); setPaidWeeksPerYear("52"); setWorkdaysPerWeek("5"); setAnnualBonus("50000"); setAnnualAllowances("24000"); setEmployerContributionPercent("3"); setRetirementPercent("2"); setOtherWageLinkedPercent("1"); setAnnualBenefits("36000"); setAnnualTrainingCost("10000"); setAnnualEquipmentSoftware("30000"); setAnnualWorkspaceCost("24000"); setAnnualRecruitingCost("12000"); setAnnualOtherCost("6000"); setAllocatedOverheadPercent("5"); setPaidLeaveDays("12"); setPaidHolidayDays("13"); setOtherNonproductiveDays("5"); setCalculation(null); setError("");
  };

  const clear = () => {
    setCurrency("THB"); setPayBasis("monthly"); setPayAmount(""); setHeadcount("1"); setHoursPerWeek("40"); setPaidWeeksPerYear("52"); setWorkdaysPerWeek("5"); setAnnualBonus("0"); setAnnualAllowances("0"); setEmployerContributionPercent("0"); setRetirementPercent("0"); setOtherWageLinkedPercent("0"); setAnnualBenefits("0"); setAnnualTrainingCost("0"); setAnnualEquipmentSoftware("0"); setAnnualWorkspaceCost("0"); setAnnualRecruitingCost("0"); setAnnualOtherCost("0"); setAllocatedOverheadPercent("0"); setPaidLeaveDays("0"); setPaidHolidayDays("0"); setOtherNonproductiveDays("0"); setCalculation(null); setError("");
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5"><ShieldCheck className="text-sky-700 dark:text-sky-300" /><AlertTitle>ต้นทุนพนักงานคำนวณใน Browser</AlertTitle><AlertDescription className="leading-6">เงินเดือน ภาระนายจ้าง สวัสดิการ และ Overhead ไม่ถูกส่งไป Server หรือบันทึกไว้ ข้อมูลจะหายเมื่อรีเฟรชหน้า ใช้ตัวเลขรวมของบทบาทแทนชื่อบุคคลและข้อมูลเงินเดือนรายคนเมื่อทำได้</AlertDescription></Alert>

      <section aria-labelledby="labor-pay-title">
        <div><h2 id="labor-pay-title" className="flex items-center gap-2 font-semibold"><BriefcaseBusiness className="size-4 text-primary" />ค่าจ้างฐาน จำนวนคน และตารางเวลา</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">คำนวณหนึ่งกลุ่มพนักงานที่ใช้ค่าจ้างและสมมติฐานเดียวกัน หากหลายบทบาทต่างกันควรคำนวณแยกแล้วรวมงบภายหลัง</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3"><Label htmlFor="labor-currency">สกุลเงินที่ใช้แสดงผล</Label><Select value={currency} onValueChange={(value) => { setCurrency(value as CurrencyCode); invalidate(); }}><SelectTrigger id="labor-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">เปลี่ยนหน่วยเท่านั้น ไม่มีการแปลงอัตราแลกเปลี่ยน</p></div>
          <div className="grid gap-3"><Label htmlFor="labor-pay-basis">รูปแบบค่าจ้างฐาน</Label><Select value={payBasis} onValueChange={(value) => { setPayBasis(value as LaborPayBasis); invalidate(); }}><SelectTrigger id="labor-pay-basis" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAY_BASIS_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">รายชั่วโมงจะคูณชั่วโมง/สัปดาห์และสัปดาห์ที่จ่าย</p></div>
          <NumberField id="labor-pay-amount" label={payAmountLabel} value={payAmount} onChange={updateValue(setPayAmount)} min={0.01} placeholder="50000" />
          <NumberField id="labor-headcount" label="จำนวนพนักงานในกลุ่ม (คน)" value={headcount} onChange={updateValue(setHeadcount)} min={1} max={100_000} step={1} placeholder="3" />
          <NumberField id="labor-hours-week" label="ชั่วโมงที่จ่ายต่อสัปดาห์" value={hoursPerWeek} onChange={updateValue(setHoursPerWeek)} min={0.25} max={168} step={0.25} placeholder="40" />
          <NumberField id="labor-paid-weeks" label="สัปดาห์ที่จ่ายต่อปี" value={paidWeeksPerYear} onChange={updateValue(setPaidWeeksPerYear)} min={0.25} max={53} step={0.25} placeholder="52" />
          <NumberField id="labor-workdays-week" label="วันทำงานต่อสัปดาห์" value={workdaysPerWeek} onChange={updateValue(setWorkdaysPerWeek)} min={1} max={7} step={1} placeholder="5" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="labor-cash-title">
        <div><h2 id="labor-cash-title" className="font-semibold">ค่าตอบแทนเงินสดต่อคน / ปี</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกเฉพาะส่วนที่ยังไม่รวมในค่าจ้างฐาน เพื่อไม่ให้โบนัสหรือเบี้ยเลี้ยงถูกนับซ้ำ</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2"><NumberField id="labor-bonus" label={`โบนัส / คอมมิชชัน (${currency}/ปี)`} value={annualBonus} onChange={updateValue(setAnnualBonus)} placeholder="50000" /><NumberField id="labor-allowances" label={`เบี้ยเลี้ยง / ค่าตอบแทนอื่น (${currency}/ปี)`} value={annualAllowances} onChange={updateValue(setAnnualAllowances)} placeholder="24000" /></div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="labor-linked-title">
        <div><h2 id="labor-linked-title" className="font-semibold">ภาระที่คำนวณจากค่าจ้างฐาน (%)</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">อัตราภาษี ประกันสังคม กองทุน หรือประกันแตกต่างตามประเทศ พื้นที่ ฐานค่าจ้าง และช่วงเวลา ระบบจึงไม่ใส่อัตรากฎหมายอัตโนมัติ</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="labor-employer-contribution" label="ภาษี/เงินสมทบฝั่งนายจ้าง (%)" value={employerContributionPercent} onChange={updateValue(setEmployerContributionPercent)} max={500} step={0.01} placeholder="3" /><NumberField id="labor-retirement" label="เงินสมทบเกษียณ / กองทุน (%)" value={retirementPercent} onChange={updateValue(setRetirementPercent)} max={500} step={0.01} placeholder="2" /><NumberField id="labor-other-linked" label="ภาระอื่นที่ผูกกับค่าจ้าง (%)" value={otherWageLinkedPercent} onChange={updateValue(setOtherWageLinkedPercent)} max={500} step={0.01} placeholder="1" /></div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="labor-fixed-title">
        <div><h2 id="labor-fixed-title" className="font-semibold">สวัสดิการและต้นทุนคงที่ต่อคน / ปี</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Recruiting และ Onboarding ควรเฉลี่ยตามอายุการใช้งานที่องค์กรเลือก เช่น ต้นทุน 60,000 ที่คาดว่าอยู่ 3 ปี = 20,000 ต่อปี</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3"><NumberField id="labor-benefits" label={`สวัสดิการ / ประกันคงที่ (${currency})`} value={annualBenefits} onChange={updateValue(setAnnualBenefits)} placeholder="36000" /><NumberField id="labor-training-cost" label={`ค่าอบรม (${currency})`} value={annualTrainingCost} onChange={updateValue(setAnnualTrainingCost)} placeholder="10000" /><NumberField id="labor-equipment" label={`อุปกรณ์และซอฟต์แวร์ (${currency})`} value={annualEquipmentSoftware} onChange={updateValue(setAnnualEquipmentSoftware)} placeholder="30000" /><NumberField id="labor-workspace" label={`พื้นที่ทำงาน / Facilities (${currency})`} value={annualWorkspaceCost} onChange={updateValue(setAnnualWorkspaceCost)} placeholder="24000" /><NumberField id="labor-recruiting" label={`Recruiting / Onboarding เฉลี่ย (${currency})`} value={annualRecruitingCost} onChange={updateValue(setAnnualRecruitingCost)} placeholder="12000" /><NumberField id="labor-other-cost" label={`ต้นทุนอื่น (${currency})`} value={annualOtherCost} onChange={updateValue(setAnnualOtherCost)} placeholder="6000" /></div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="labor-availability-title">
        <div><h2 id="labor-availability-title" className="flex items-center gap-2 font-semibold"><UsersRound className="size-4 text-primary" />Overhead และชั่วโมงที่ส่งมอบได้</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">วันลาและวันหยุดลดตัวหารชั่วโมงที่ส่งมอบ แต่ไม่บวกค่าจ้างซ้ำ ส่วนค่าอบรมด้านบนคือค่าหลักสูตร ขณะที่วันอบรมด้านล่างคือเวลาที่จ่ายแต่ไม่ได้ส่งมอบ</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4"><NumberField id="labor-overhead" label="Overhead ที่จัดสรรจากเงินสดรวม (%)" value={allocatedOverheadPercent} onChange={updateValue(setAllocatedOverheadPercent)} max={500} step={0.01} placeholder="5" /><NumberField id="labor-paid-leave" label="วันลาที่ได้รับค่าจ้าง / ปี" value={paidLeaveDays} onChange={updateValue(setPaidLeaveDays)} max={366} step={0.25} placeholder="12" /><NumberField id="labor-paid-holidays" label="วันหยุดที่ได้รับค่าจ้าง / ปี" value={paidHolidayDays} onChange={updateValue(setPaidHolidayDays)} max={366} step={0.25} placeholder="13" /><NumberField id="labor-other-nonproductive" label="วันอบรม/แอดมินที่ไม่ส่งมอบ / ปี" value={otherNonproductiveDays} onChange={updateValue(setOtherNonproductiveDays)} max={366} step={0.25} placeholder="5" /></div>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-sky-900 text-white hover:bg-sky-950 dark:bg-sky-800 dark:hover:bg-sky-700" onClick={calculate}><Calculator className="size-4" />คำนวณต้นทุนพนักงาน</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">{calculation ? <LaborCostResultPanel input={calculation.input} result={calculation.result} currency={currency} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><Target className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกค่าจ้าง ภาระนายจ้าง สวัสดิการ และชั่วโมงที่ส่งมอบ แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดงต้นทุนจริงต่อปี ต่อเดือน ต่อชั่วโมง Burden rate และงบรวมทีม</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ผลลัพธ์เป็นแบบจำลองงบประมาณ ไม่ใช่ Payroll, คำแนะนำภาษี กฎหมายแรงงาน หรืออัตราเงินสมทบที่รับรอง ต้องตรวจฐานค่าจ้าง เพดาน และอัตราปัจจุบันกับหน่วยงานหรือผู้เชี่ยวชาญในพื้นที่ หากต้องการคำนวณเงินสุทธิพนักงานไทยให้ใช้ <Link href="/salary-calculator" className="font-medium text-primary hover:underline">Salary Calculator</Link> หากต้องตั้งราคาให้ใช้ <Link href="/hourly-rate-calculator" className="font-medium text-primary hover:underline">Hourly Rate Calculator</Link> หรือเทียบกำลังทีมด้วย <Link href="/team-capacity-calculator" className="font-medium text-primary hover:underline">Team Capacity Calculator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
