"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  Calculator,
  ClipboardList,
  Download,
  Info,
  Landmark,
  PiggyBank,
  Sparkles,
  TableProperties,
  TriangleAlert,
} from "lucide-react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateCompoundSavings,
  compoundSavingsCsv,
  type CompoundFrequency,
  type CompoundSavingsInput,
  type CompoundSavingsResult,
  type ContributionFrequency,
  type ContributionTiming,
  type GoalBasis,
  type SavingsCurrency,
  type SavingsMode,
} from "@/lib/tools/compound-savings";

type SavingsForm = {
  currency: SavingsCurrency;
  scenarioName: string;
  mode: SavingsMode;
  initialAmount: string;
  recurringContribution: string;
  targetAmount: string;
  years: string;
  annualNominalRatePercent: string;
  compoundFrequency: CompoundFrequency;
  contributionFrequency: ContributionFrequency;
  contributionTiming: ContributionTiming;
  annualInflationRatePercent: string;
  goalBasis: GoalBasis;
};

const currencyLabels: Record<SavingsCurrency, string> = {
  THB: "บาท (THB)",
  USD: "ดอลลาร์สหรัฐ (USD)",
  EUR: "ยูโร (EUR)",
  GBP: "ปอนด์ (GBP)",
  JPY: "เยน (JPY)",
  OTHER: "หน่วยเงินอื่น",
};

const contributionLabels: Record<ContributionFrequency, string> = {
  weekly: "ทุกสัปดาห์ · 52 ครั้ง/ปี",
  biweekly: "ทุก 2 สัปดาห์ · 26 ครั้ง/ปี",
  monthly: "ทุกเดือน · 12 ครั้ง/ปี",
  quarterly: "ทุกไตรมาส · 4 ครั้ง/ปี",
  yearly: "ทุกปี · 1 ครั้ง/ปี",
};

const contributionShortLabels: Record<ContributionFrequency, string> = {
  weekly: "สัปดาห์",
  biweekly: "2 สัปดาห์",
  monthly: "เดือน",
  quarterly: "ไตรมาส",
  yearly: "ปี",
};

const compoundLabels: Record<CompoundFrequency, string> = {
  daily: "รายวัน · 365 ครั้ง/ปี",
  weekly: "รายสัปดาห์ · 52 ครั้ง/ปี",
  monthly: "รายเดือน · 12 ครั้ง/ปี",
  quarterly: "รายไตรมาส · 4 ครั้ง/ปี",
  semiannual: "ทุก 6 เดือน · 2 ครั้ง/ปี",
  yearly: "รายปี · 1 ครั้ง/ปี",
};

function createInitialForm(): SavingsForm {
  return {
    currency: "THB",
    scenarioName: "แผนเงินออมของฉัน",
    mode: "projection",
    initialAmount: "",
    recurringContribution: "",
    targetAmount: "",
    years: "10",
    annualNominalRatePercent: "3",
    compoundFrequency: "monthly",
    contributionFrequency: "monthly",
    contributionTiming: "end",
    annualInflationRatePercent: "2",
    goalBasis: "future",
  };
}

function createExampleForm(): SavingsForm {
  return {
    currency: "THB",
    scenarioName: "ตัวอย่าง Microsoft FV",
    mode: "projection",
    initialAmount: "1000",
    recurringContribution: "100",
    targetAmount: "",
    years: "1",
    annualNominalRatePercent: "6",
    compoundFrequency: "monthly",
    contributionFrequency: "monthly",
    contributionTiming: "beginning",
    annualInflationRatePercent: "0",
    goalBasis: "future",
  };
}

function parseNumber(value: string, label: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function money(value: number, currency: SavingsCurrency, signed = false) {
  const sign = signed && value > 0 ? "+" : "";
  if (currency === "OTHER") {
    return `${sign}${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} หน่วย`;
  }
  return `${sign}${new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value)}`;
}

function percent(value: number) {
  return `${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

function ResultCard({ label, value, detail, testId }: { label: string; value: string; detail: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-card/70 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/55" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tabular-nums text-primary">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function SavingsResultPanel({ input, result }: { input: CompoundSavingsInput; result: CompoundSavingsResult }) {
  const interval = contributionShortLabels[input.contributionFrequency];
  const primaryLabel = input.mode === "goal" ? `เงินออมที่ต้องฝากต่อ${interval}` : "เงินรวมเมื่อครบกำหนด";
  const primaryValue = input.mode === "goal" ? money(result.requiredContribution ?? 0, input.currency) : money(result.futureValue, input.currency);
  const maxBalance = Math.max(...result.timeline.map((row) => row.endingBalance), 1);
  const summary = [
    `แผนเงินออม · ${input.scenarioName}`,
    input.mode === "goal"
      ? `ต้องออมต่อ${interval}: ${money(result.requiredContribution ?? 0, input.currency)}`
      : `เงินรวมปลายทาง: ${money(result.futureValue, input.currency)}`,
    `เงินต้นรวม: ${money(result.totalPrincipal, input.currency)}`,
    `ดอกเบี้ยสุทธิ: ${money(result.interestEarned, input.currency, true)}`,
    `อัตราผลตอบแทนแท้จริงต่อปี (APY): ${percent(result.effectiveAnnualYieldPercent)}`,
    `มูลค่าเทียบกำลังซื้อวันนี้: ${money(result.realFutureValue, input.currency)}`,
  ].join("\n");

  return (
    <div className="space-y-6" data-testid="savings-result">
      {input.mode === "goal" ? (
        <Alert className={result.goalAchievedByInitial ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/25 bg-primary/5"}>
          {result.goalAchievedByInitial ? <BadgeCheck className="text-emerald-700 dark:text-emerald-300" /> : <PiggyBank className="text-primary" />}
          <AlertTitle>{result.goalAchievedByInitial ? "เงินตั้งต้นถึงเป้าหมายแล้ว" : "แผนฝากเงินเพื่อไปถึงเป้าหมาย"}</AlertTitle>
          <AlertDescription className="leading-6">
            {result.goalAchievedByInitial
              ? `จากสมมติฐานนี้ เงินตั้งต้นเพียงพอและมีส่วนเกินประมาณ ${money(result.goalSurplusFromInitial, input.currency)} ณ ปลายแผน`
              : `ฝากประมาณ ${money(result.requiredContribution ?? 0, input.currency)} ต่อ${interval} จึงจะถึง ${money(result.goalAtHorizon ?? 0, input.currency)} ตามแบบจำลอง`}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="scroll-mt-24" aria-labelledby="savings-summary-title">
        <h2 id="savings-summary-title" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />ผลลัพธ์แผนเงินออม</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResultCard label={primaryLabel} value={primaryValue} detail={`${input.years} ปี · ฝาก${input.contributionTiming === "beginning" ? "ต้น" : "ปลาย"}งวด`} testId="savings-primary" />
          <ResultCard label="เงินรวมปลายทาง" value={money(result.futureValue, input.currency)} detail={`เงินตั้งต้นโตเป็น ${money(result.initialFutureValue, input.currency)}`} testId="savings-future-value" />
          <ResultCard label="ดอกเบี้ยสุทธิ" value={money(result.interestEarned, input.currency, true)} detail={`จากเงินต้นรวม ${money(result.totalPrincipal, input.currency)}`} testId="savings-interest" />
          <ResultCard label="APY จากอัตราที่กรอก" value={percent(result.effectiveAnnualYieldPercent)} detail={`เทียบเท่า ${percent(result.periodicRatePercent)} ต่อรอบฝาก`} testId="savings-apy" />
        </div>
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4" data-testid="savings-real-value">
          <p className="text-xs font-medium text-muted-foreground">มูลค่าเทียบกำลังซื้อวันนี้ เมื่อสมมติเงินเฟ้อ {percent(input.annualInflationRatePercent)}</p>
          <p className="mt-2 text-xl font-bold tabular-nums">{money(result.realFutureValue, input.currency)}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">เป็นการหารมูลค่าปลายทางด้วยเงินเฟ้อสะสม ไม่ใช่ยอดเงินจริงอีกบัญชีหนึ่ง</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="savings-chart-title">
        <div>
          <h2 id="savings-chart-title" className="flex items-center gap-2 font-semibold"><BarChart3 className="size-4 text-primary" />เส้นทางเงินออมรายปี</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ความยาวแถบเทียบยอดคงเหลือสูงสุดในแผนเดียวกัน</p>
        </div>
        <div className="mt-5 space-y-3" role="img" aria-label={`กราฟยอดเงินออม ${input.years} ปี`}>
          {result.timeline.map((row) => (
            <div key={row.year} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">ปี {row.year}</span>
              <div className="min-w-0">
                <div className="h-8 overflow-hidden rounded-full border bg-background/65 p-1">
                  <div
                    className="flex h-full min-w-8 items-center justify-end rounded-full bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200 px-2 text-[10px] font-semibold tabular-nums text-rose-950 shadow-sm transition-[width] duration-500 dark:from-pink-500/80 dark:via-rose-500/80 dark:to-amber-400/80"
                    style={{ width: `${Math.max(4, (row.endingBalance / maxBalance) * 100)}%` }}
                  >
                    <span className="truncate">{money(row.endingBalance, input.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="savings-timeline-title" data-testid="savings-timeline">
        <h2 id="savings-timeline-title" className="flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />ตารางสรุปรายปี</h2>
        <div className="mt-4 grid gap-3 sm:hidden">
          {result.timeline.map((row) => (
            <div key={row.year} className="rounded-xl border bg-card/70 p-3">
              <p className="font-semibold">ปี {row.year} · {money(row.endingBalance, input.currency)}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <p><span className="block text-muted-foreground">ฝากเพิ่ม</span><strong className="mt-1 block tabular-nums">{money(row.contributions, input.currency)}</strong></p>
                <p><span className="block text-muted-foreground">ดอกเบี้ย</span><strong className="mt-1 block tabular-nums">{money(row.interest, input.currency, true)}</strong></p>
                <p className="col-span-2"><span className="block text-muted-foreground">กำลังซื้อวันนี้</span><strong className="mt-1 block tabular-nums">{money(row.realEndingBalance, input.currency)}</strong></p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="ตารางเงินออมรายปีที่เลื่อนได้">
          <table className="w-full min-w-[48rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">ปี</th><th className="px-3 pb-3 font-medium">ยอดต้นปี</th><th className="px-3 pb-3 font-medium">ฝากเพิ่ม</th><th className="px-3 pb-3 font-medium">ดอกเบี้ย</th><th className="px-3 pb-3 font-medium">ยอดปลายปี</th><th className="pl-3 pb-3 font-medium">กำลังซื้อวันนี้</th></tr></thead>
            <tbody className="divide-y">{result.timeline.map((row) => (
              <tr key={row.year}>
                <th className="py-3 pr-4 text-left font-medium">ปี {row.year}</th>
                <td className="px-3 tabular-nums">{money(row.openingBalance, input.currency)}</td>
                <td className="px-3 tabular-nums">{money(row.contributions, input.currency)}</td>
                <td className="px-3 tabular-nums">{money(row.interest, input.currency, true)}</td>
                <td className="px-3 font-medium tabular-nums">{money(row.endingBalance, input.currency)}</td>
                <td className="pl-3 tabular-nums">{money(row.realEndingBalance, input.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5" aria-labelledby="savings-method-title">
        <h2 id="savings-method-title" className="flex items-center gap-2 font-semibold"><Landmark className="size-4 text-amber-700 dark:text-amber-300" />สูตรและขอบเขตการตีความ</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-xl border bg-card/70 p-3"><strong>ดอกเบี้ยทบต้น</strong><p className="mt-1 text-muted-foreground">แปลงอัตรารายปีแบบ Nominal ตามความถี่ทบต้นเป็น APY ก่อน แล้วหาอัตราเทียบเท่าต่อรอบฝาก</p></div>
          <div className="rounded-xl border bg-card/70 p-3"><strong>ฝากต้นงวด / ปลายงวด</strong><p className="mt-1 text-muted-foreground">ฝากต้นงวดมีเวลาเติบโตเพิ่มอีกหนึ่งรอบ จึงมักได้ยอดปลายทางสูงกว่าเมื่อสมมติฐานอื่นเท่ากัน</p></div>
          <div className="rounded-xl border bg-card/70 p-3"><strong>ไม่ใช่ยอดรับรอง</strong><p className="mt-1 text-muted-foreground">แบบจำลองใช้อัตราคงที่ ไม่รวมภาษี ค่าธรรมเนียม อัตราผันแปร หรือเงื่อนไขผลิตภัณฑ์ เว้นแต่ผู้ใช้ปรับสมมติฐานเอง</p></div>
        </div>
      </section>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแผนเงินออมแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="savings-csv" onClick={() => downloadText(compoundSavingsCsv(input, result), "meaw-compound-savings.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </div>
  );
}

export function CompoundSavingsCalculatorTool() {
  const [form, setForm] = useState<SavingsForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: CompoundSavingsInput; result: CompoundSavingsResult } | null>(null);
  const [error, setError] = useState("");

  const updateForm = <Key extends keyof SavingsForm>(key: Key, value: SavingsForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setCalculation(null);
    setError("");
  };

  const calculate = () => {
    try {
      const input: CompoundSavingsInput = {
        currency: form.currency,
        scenarioName: form.scenarioName,
        mode: form.mode,
        initialAmount: parseNumber(form.initialAmount || "0", "เงินตั้งต้น"),
        recurringContribution: form.mode === "projection" ? parseNumber(form.recurringContribution, "เงินออมต่องวด") : 0,
        targetAmount: form.mode === "goal" ? parseNumber(form.targetAmount, "เป้าหมายเงินออม") : 0,
        years: parseNumber(form.years, "ระยะเวลา"),
        annualNominalRatePercent: parseNumber(form.annualNominalRatePercent, "อัตราดอกเบี้ยต่อปี"),
        compoundFrequency: form.compoundFrequency,
        contributionFrequency: form.contributionFrequency,
        contributionTiming: form.contributionTiming,
        annualInflationRatePercent: parseNumber(form.annualInflationRatePercent, "อัตราเงินเฟ้อต่อปี"),
        goalBasis: form.goalBasis,
      };
      setCalculation({ input, result: calculateCompoundSavings(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "คำนวณแผนเงินออมไม่สำเร็จ");
    }
  };

  const loadExample = () => { setForm(createExampleForm()); setCalculation(null); setError(""); };
  const clear = () => { setForm(createInitialForm()); setCalculation(null); setError(""); };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-amber-400/10">
        <PiggyBank className="text-pink-600 dark:text-pink-300" />
        <AlertTitle>วางแผนเงินออมแบบเห็นทั้งยอดจริงและกำลังซื้อ</AlertTitle>
        <AlertDescription className="leading-6">คำนวณใน Browser จากอัตราคงที่ที่คุณกรอก ข้อมูลไม่ถูกส่งไป Server และไม่มีการดึงอัตราฝากหรือผลตอบแทนปัจจุบันมาแนะนำอัตโนมัติ</AlertDescription>
      </Alert>

      <section aria-labelledby="savings-mode-title">
        <h2 id="savings-mode-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />1. เลือกสิ่งที่อยากคำนวณ</h2>
        <Tabs value={form.mode} onValueChange={(value) => updateForm("mode", value as SavingsMode)} className="mt-4">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[38rem]">
            <TabsTrigger value="projection" className="min-h-11 px-2 sm:px-3"><BarChart3 className="size-4" />ดูเงินปลายทาง</TabsTrigger>
            <TabsTrigger value="goal" aria-label="หาเงินออมให้ถึงเป้าหมาย" className="min-h-11 px-2 sm:px-3"><PiggyBank className="size-4" /><span className="sm:hidden">หาเงินให้ถึงเป้า</span><span className="hidden sm:inline">หาเงินออมให้ถึงเป้าหมาย</span></TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <section className="mt-8" aria-labelledby="savings-plan-title">
        <h2 id="savings-plan-title" className="flex items-center gap-2 font-semibold"><PiggyBank className="size-4 text-primary" />2. เงินตั้งต้นและเป้าหมาย</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">จำนวนเงินทุกช่องใช้หน่วยเดียวกัน และใส่ 0 ได้ในช่องเงินตั้งต้น</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="savings-scenario-name">ชื่อแผนเงินออม</Label>
            <Input id="savings-scenario-name" value={form.scenarioName} maxLength={120} placeholder="เช่น เงินสำรองฉุกเฉิน" onChange={(event) => updateForm("scenarioName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้เป็นหัวข้อในสรุปและไฟล์ CSV</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as SavingsCurrency)}>
              <SelectTrigger id="savings-currency"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(currencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ไม่มีการแปลงอัตราแลกเปลี่ยน</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-initial">เงินตั้งต้น</Label>
            <Input id="savings-initial" inputMode="decimal" value={form.initialAmount} placeholder="0" onChange={(event) => updateForm("initialAmount", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ยอดที่มีอยู่ก่อนเริ่มฝากเป็นงวด</p>
          </div>
          {form.mode === "projection" ? (
            <div className="grid gap-3">
              <Label htmlFor="savings-contribution">เงินออมต่องวด</Label>
              <Input id="savings-contribution" inputMode="decimal" value={form.recurringContribution} placeholder="เช่น 3000" onChange={(event) => updateForm("recurringContribution", event.target.value)} />
              <p className="text-xs leading-5 text-muted-foreground">ฝากเท่ากันทุกงวดตามความถี่ด้านล่าง</p>
            </div>
          ) : (
            <div className="grid gap-3">
              <Label htmlFor="savings-target">เป้าหมายเงินออม</Label>
              <Input id="savings-target" inputMode="decimal" value={form.targetAmount} placeholder="เช่น 120000" onChange={(event) => updateForm("targetAmount", event.target.value)} />
              <p className="text-xs leading-5 text-muted-foreground">ระบบจะหาเงินฝากต่องวดที่ต้องใช้</p>
            </div>
          )}
          {form.mode === "goal" ? (
            <div className="grid gap-3">
              <Label htmlFor="savings-goal-basis">เป้าหมายเป็นมูลค่าแบบใด</Label>
              <Select value={form.goalBasis} onValueChange={(value) => updateForm("goalBasis", value as GoalBasis)}>
                <SelectTrigger id="savings-goal-basis"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="future">จำนวนเงิน ณ วันครบกำหนด</SelectItem><SelectItem value="today">กำลังซื้อเทียบวันนี้</SelectItem></SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">แบบกำลังซื้อวันนี้จะเพิ่มเป้าหมายตามเงินเฟ้อสะสม</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="savings-assumptions-title">
        <h2 id="savings-assumptions-title" className="flex items-center gap-2 font-semibold"><Landmark className="size-4 text-primary" />3. ระยะเวลา อัตรา และจังหวะฝาก</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">อัตราดอกเบี้ยเป็น Nominal annual rate; APY ที่แท้จริงจะแสดงในผลลัพธ์ตามความถี่ทบต้น</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="savings-years">ระยะเวลา (ปีเต็ม)</Label>
            <Input id="savings-years" inputMode="numeric" value={form.years} placeholder="10" onChange={(event) => updateForm("years", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">รองรับ 1–60 ปี</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-rate">อัตราดอกเบี้ยต่อปี (%)</Label>
            <Input id="savings-rate" inputMode="decimal" value={form.annualNominalRatePercent} placeholder="3" onChange={(event) => updateForm("annualNominalRatePercent", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">รองรับ -99% ถึง 100%; ใช้อัตราคงที่ตลอดแผน</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-compound-frequency">ทบดอกเบี้ย</Label>
            <Select value={form.compoundFrequency} onValueChange={(value) => updateForm("compoundFrequency", value as CompoundFrequency)}>
              <SelectTrigger id="savings-compound-frequency"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(compoundLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ควรเลือกให้ตรงกับเงื่อนไขบัญชีหรือผลิตภัณฑ์</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-contribution-frequency">ความถี่การฝากเงิน</Label>
            <Select value={form.contributionFrequency} onValueChange={(value) => updateForm("contributionFrequency", value as ContributionFrequency)}>
              <SelectTrigger id="savings-contribution-frequency"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(contributionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ยอดฝากต่องวดจะผูกกับความถี่นี้</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-contribution-timing">ฝากช่วงใดของงวด</Label>
            <Select value={form.contributionTiming} onValueChange={(value) => updateForm("contributionTiming", value as ContributionTiming)}>
              <SelectTrigger id="savings-contribution-timing"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="end">ปลายงวด · Ordinary annuity</SelectItem><SelectItem value="beginning">ต้นงวด · Annuity due</SelectItem></SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ฝากต้นงวดจะได้ผลตอบแทนเพิ่มอีกหนึ่งรอบ</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="savings-inflation">สมมติเงินเฟ้อต่อปี (%)</Label>
            <Input id="savings-inflation" inputMode="decimal" value={form.annualInflationRatePercent} placeholder="2" onChange={(event) => updateForm("annualInflationRatePercent", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้แสดงกำลังซื้อเทียบวันนี้ ไม่หักออกจากยอดเงินจริง</p>
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive" className="mt-6"><TriangleAlert /><AlertTitle>ตรวจข้อมูลก่อนคำนวณ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={calculate}><Calculator className="size-4" />คำนวณดอกเบี้ยทบต้นและเงินออม</Button>
        <ExampleButton onExample={loadExample} />
        <ClearButton onClear={clear} />
      </div>

      {calculation ? <div className="mt-8"><SavingsResultPanel input={calculation.input} result={calculation.result} /></div> : null}

      <Alert className="mt-8 border-sky-500/25 bg-sky-500/5">
        <Info className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>แหล่งอ้างอิงสูตรและหลักการ</AlertTitle>
        <AlertDescription className="leading-6">
          โครงสร้างเป้าหมายเงินออมอ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.investor.gov/financial-tools-calculators/calculators/savings-goal-calculator" target="_blank" rel="noreferrer">Investor.gov Savings Goal Calculator</a>, สูตร FV และต้น/ปลายงวดเทียบกับ <a className="font-medium text-primary hover:underline" href="https://support.microsoft.com/en-us/office/fv-function-2eef9f44-a084-4c61-bdd8-4fe4bb1b71b3" target="_blank" rel="noreferrer">Microsoft FV</a> และคำอธิบายดอกเบี้ยเงินฝากจาก <a className="font-medium text-primary hover:underline" href="https://www.bot.or.th/th/satang-story/rights-responsibility/deposit-interest.html" target="_blank" rel="noreferrer">ธนาคารแห่งประเทศไทย</a>
        </AlertDescription>
      </Alert>
    </WorkspaceFrame>
  );
}
