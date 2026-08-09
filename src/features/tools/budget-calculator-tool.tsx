"use client";

import {
  BadgeDollarSign,
  Calculator,
  Cat,
  ClipboardList,
  Download,
  Info,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  WalletCards,
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
  BUDGET_MAX_EXPENSE_ITEMS,
  BUDGET_MAX_INCOME_ITEMS,
  budgetCategoryLabels,
  budgetCsv,
  budgetFrequencyLabels,
  calculateBudget,
  type BudgetCategory,
  type BudgetCurrency,
  type BudgetFrequency,
  type BudgetInput,
  type BudgetResult,
} from "@/lib/tools/budget";

type IncomeForm = { id: number; name: string; amount: string; frequency: BudgetFrequency };
type ExpenseForm = IncomeForm & { category: BudgetCategory };
type BudgetForm = {
  currency: BudgetCurrency;
  householdName: string;
  income: IncomeForm[];
  expenses: ExpenseForm[];
  targets: { needs: string; wants: string; savingsDebt: string };
};

const currencyLabels: Record<BudgetCurrency, string> = {
  THB: "บาท (THB)",
  USD: "ดอลลาร์ (USD)",
  EUR: "ยูโร (EUR)",
  JPY: "เยน (JPY)",
  GBP: "ปอนด์ (GBP)",
};

const categoryHints: Record<BudgetCategory, string> = {
  needs: "ที่อยู่อาศัย อาหารพื้นฐาน เดินทาง ค่าน้ำไฟ",
  wants: "กินนอกบ้าน บันเทิง ท่องเที่ยว งานอดิเรก",
  "savings-debt": "เงินฉุกเฉิน ลงทุน และยอดจ่ายหนี้เกินขั้นต่ำ",
};

const categoryTone: Record<BudgetCategory, string> = {
  needs: "border-sky-500/25 bg-sky-500/6",
  wants: "border-pink-400/30 bg-pink-400/7",
  "savings-debt": "border-emerald-500/25 bg-emerald-500/7",
};

function initialForm(): BudgetForm {
  return {
    currency: "THB",
    householdName: "",
    income: [{ id: 1, name: "", amount: "", frequency: "monthly" }],
    expenses: [{ id: 1, name: "", amount: "", frequency: "monthly", category: "needs" }],
    targets: { needs: "50", wants: "30", savingsDebt: "20" },
  };
}

function exampleForm(): BudgetForm {
  return {
    currency: "THB",
    householdName: "บ้านแมวมีสุข",
    income: [
      { id: 1, name: "เงินเดือน", amount: "60000", frequency: "monthly" },
      { id: 2, name: "งานเสริม", amount: "3000", frequency: "weekly" },
    ],
    expenses: [
      { id: 1, name: "ค่าเช่า", amount: "18000", frequency: "monthly", category: "needs" },
      { id: 2, name: "อาหาร", amount: "2500", frequency: "weekly", category: "needs" },
      { id: 3, name: "ค่าน้ำไฟและอินเทอร์เน็ต", amount: "3000", frequency: "monthly", category: "needs" },
      { id: 4, name: "เดินทาง", amount: "1200", frequency: "weekly", category: "needs" },
      { id: 5, name: "กินข้าวนอกบ้าน", amount: "3000", frequency: "monthly", category: "wants" },
      { id: 6, name: "Streaming", amount: "700", frequency: "monthly", category: "wants" },
      { id: 7, name: "ท่องเที่ยว", amount: "24000", frequency: "yearly", category: "wants" },
      { id: 8, name: "เงินสำรองฉุกเฉิน", amount: "6000", frequency: "monthly", category: "savings-debt" },
      { id: 9, name: "จ่ายหนี้เพิ่ม", amount: "1500", frequency: "biweekly", category: "savings-debt" },
    ],
    targets: { needs: "50", wants: "30", savingsDebt: "20" },
  };
}

function parsePositive(value: string, label: string) {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label}ต้องมากกว่า 0`);
  return parsed;
}

function parsePercent(value: string, label: string) {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function buildInput(form: BudgetForm): BudgetInput {
  return {
    currency: form.currency,
    householdName: form.householdName,
    income: form.income.map((item, index) => ({
      name: item.name || `รายรับ ${index + 1}`,
      amount: parsePositive(item.amount, `ยอดรายรับ ${index + 1}`),
      frequency: item.frequency,
    })),
    expenses: form.expenses.map((item, index) => ({
      name: item.name || `รายจ่าย ${index + 1}`,
      amount: parsePositive(item.amount, `ยอดรายจ่าย ${index + 1}`),
      frequency: item.frequency,
      category: item.category,
    })),
    targets: {
      needs: parsePercent(form.targets.needs, "เป้าค่าใช้จ่ายจำเป็น"),
      wants: parsePercent(form.targets.wants, "เป้าค่าใช้จ่ายตามใจ"),
      savingsDebt: parsePercent(form.targets.savingsDebt, "เป้าออมเงินและจ่ายหนี้"),
    },
  };
}

function money(value: number, currency: BudgetCurrency) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function NumberField({ id, label, value, onChange, min = 0, max, step = 0.01, hint }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FrequencyField({ id, value, onChange }: { id: string; value: BudgetFrequency; onChange: (value: BudgetFrequency) => void }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">รอบของยอดนี้</Label>
      <Select value={value} onValueChange={(next) => onChange(next as BudgetFrequency)}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(budgetFrequencyLabels).map(([frequency, label]) => <SelectItem key={frequency} value={frequency}>{label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "default", testId }: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "negative";
  testId?: string;
}) {
  const toneClass = tone === "positive"
    ? "border-emerald-500/30 bg-emerald-500/7"
    : tone === "negative"
      ? "border-rose-500/30 bg-rose-500/7"
      : "border-white/55 bg-white/55 dark:border-white/10 dark:bg-white/4";
  return (
    <article className={`rounded-2xl border p-4 shadow-sm backdrop-blur-xl ${toneClass}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 break-words text-xl font-black tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function BudgetResults({ input, result }: { input: BudgetInput; result: BudgetResult }) {
  const balanceTone = result.monthlyBalance >= 0 ? "positive" : "negative";
  const summary = [
    `สรุปงบประมาณ: ${input.householdName.trim() || "งบส่วนบุคคล"}`,
    `รายรับเฉลี่ยต่อเดือน ${money(result.monthlyIncome, input.currency)}`,
    `รายจ่ายและเงินออมที่วางแผน ${money(result.monthlyExpenses, input.currency)} (${result.plannedPercent.toFixed(2)}% ของรายรับ)`,
    `${result.monthlyBalance >= 0 ? "เงินคงเหลือ" : "ขาดดุล"}ต่อเดือน ${money(Math.abs(result.monthlyBalance), input.currency)}`,
    ...(["needs", "wants", "savings-debt"] as BudgetCategory[]).map((category) => {
      const bucket = result.buckets[category];
      return `${budgetCategoryLabels[category]} ${money(bucket.monthly, input.currency)} (${bucket.shareOfIncome.toFixed(2)}%) · เป้า ${bucket.targetPercent.toFixed(2)}%`;
    }),
  ].join("\n");

  return (
    <section className="mt-8 space-y-6" aria-live="polite" aria-labelledby="budget-results-title" data-testid="budget-results">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="budget-results-title" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-pink-500" />4. ภาพรวมงบประมาณ</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">ระบบแปลงทุกรอบเป็นค่าเฉลี่ยรายสัปดาห์ รายเดือน และรายปีด้วยจำนวนครั้งต่อปี ไม่ใช้การคูณ 4 สัปดาห์แทนหนึ่งเดือน</p>
        </div>
        <span className="w-fit rounded-full border border-emerald-300/40 bg-emerald-100/60 px-3 py-1 text-xs text-emerald-800 shadow-sm backdrop-blur dark:bg-emerald-400/10 dark:text-emerald-200">家計簿 · household budget</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="รายรับเฉลี่ยต่อเดือน" value={money(result.monthlyIncome, input.currency)} detail={`${money(result.weeklyIncome, input.currency)}/สัปดาห์ · ${money(result.annualIncome, input.currency)}/ปี`} testId="budget-monthly-income" />
        <MetricCard label="ยอดวางแผนต่อเดือน" value={money(result.monthlyExpenses, input.currency)} detail={`${result.plannedPercent.toFixed(2)}% ของรายรับ รวมรายจ่าย ออม และจ่ายหนี้เพิ่ม`} testId="budget-monthly-expenses" />
        <MetricCard label={result.monthlyBalance >= 0 ? "เงินคงเหลือต่อเดือน" : "ขาดดุลต่อเดือน"} value={money(Math.abs(result.monthlyBalance), input.currency)} detail={`${result.annualBalance >= 0 ? "คงเหลือ" : "ขาด"} ${money(Math.abs(result.annualBalance), input.currency)} ต่อปี`} tone={balanceTone} testId="budget-monthly-balance" />
        <MetricCard label="สมดุลรายสัปดาห์" value={money(result.weeklyBalance, input.currency)} detail={`รายรับ ${money(result.weeklyIncome, input.currency)} − แผน ${money(result.weeklyExpenses, input.currency)}`} tone={balanceTone} />
      </div>

      {result.monthlyBalance < 0 ? (
        <Alert className="border-rose-500/30 bg-rose-500/5">
          <TriangleAlert className="text-rose-600 dark:text-rose-300" />
          <AlertTitle>งบนี้ขาดดุล</AlertTitle>
          <AlertDescription>ยอดที่วางแผนสูงกว่ารายรับเฉลี่ย {money(Math.abs(result.monthlyBalance), input.currency)} ต่อเดือน ตรวจรอบความถี่และรายการก่อน แล้วพิจารณาปรับตามความจำเป็นของคุณ</AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <PiggyBank className="text-emerald-700 dark:text-emerald-300" />
          <AlertTitle>ยังมีเงินคงเหลือที่ไม่ได้จัดสรร</AlertTitle>
          <AlertDescription>{money(result.monthlyBalance, input.currency)} ต่อเดือนยังไม่ถูกนับเป็นเงินออมหรือจ่ายหนี้ จนกว่าคุณจะเพิ่มเป็นรายการในหมวดนั้น จึงไม่ทำให้ผลเทียบเป้าดูดีเกินจริง</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {(["needs", "wants", "savings-debt"] as BudgetCategory[]).map((category) => {
          const bucket = result.buckets[category];
          const isSavings = category === "savings-debt";
          const overTarget = bucket.targetGap < 0;
          const favorableGap = isSavings ? overTarget : !overTarget;
          const gapLabel = isSavings
            ? overTarget ? "สูงกว่าเป้า" : "ยังขาดจากเป้า"
            : overTarget ? "สูงกว่าแนวเป้า" : "ต่ำกว่าแนวเป้า";
          return (
            <article key={category} className={`rounded-2xl border p-4 shadow-sm backdrop-blur-xl sm:p-5 ${categoryTone[category]}`} data-testid={`budget-bucket-${category}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-semibold">{budgetCategoryLabels[category]}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{categoryHints[category]}</p></div>
                <span className="rounded-full border bg-background/65 px-2.5 py-1 text-xs">เป้า {bucket.targetPercent.toFixed(0)}%</span>
              </div>
              <p className="mt-5 text-2xl font-black tabular-nums">{money(bucket.monthly, input.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{bucket.shareOfIncome.toFixed(2)}% ของรายรับ · {money(bucket.annual, input.currency)}/ปี</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(0, bucket.shareOfIncome))}%` }} /></div>
              <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t pt-4 text-sm">
                <dt className="text-muted-foreground">ยอดตามเป้า</dt><dd className="text-right tabular-nums">{money(bucket.targetMonthly, input.currency)}</dd>
                <dt className="font-medium">{gapLabel}</dt><dd className={`text-right font-semibold tabular-nums ${favorableGap ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{money(Math.abs(bucket.targetGap), input.currency)}</dd>
              </dl>
            </article>
          );
        })}
      </div>

      <details className="group rounded-2xl border bg-muted/10 p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold marker:content-none"><span className="flex items-center gap-2"><WalletCards className="size-4 text-primary" />รายละเอียดรายการหลังแปลงรอบ</span><span className="text-xs font-normal text-primary group-open:hidden">เปิดดู</span><span className="hidden text-xs font-normal text-muted-foreground group-open:inline">ซ่อน</span></summary>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section aria-labelledby="budget-income-detail"><h3 id="budget-income-detail" className="font-medium">รายรับ</h3><div className="mt-3 space-y-2">{result.income.map((item, index) => <div key={`${item.name}-${index}`} className="flex flex-col gap-1 rounded-xl border bg-card/55 p-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{item.name} <small className="font-normal text-muted-foreground">· {budgetFrequencyLabels[item.frequency]}</small></span><span className="tabular-nums">{money(item.monthly, input.currency)}/เดือน</span></div>)}</div></section>
          <section aria-labelledby="budget-expense-detail"><h3 id="budget-expense-detail" className="font-medium">รายจ่าย ออม และจ่ายหนี้</h3><div className="mt-3 space-y-2">{result.expenses.map((item, index) => <div key={`${item.name}-${index}`} className="flex flex-col gap-1 rounded-xl border bg-card/55 p-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{item.name} <small className="font-normal text-muted-foreground">· {budgetCategoryLabels[item.category]}</small></span><span className="tabular-nums">{money(item.monthly, input.currency)}/เดือน</span></div>)}</div></section>
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="budget-formula-title">
          <h3 id="budget-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />วิธีแปลงรอบและคำนวณ</h3>
          <ol className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> รายสัปดาห์ × 52, ทุก 2 สัปดาห์ × 26, เดือนละ 2 ครั้ง × 24</li>
            <li><strong className="text-foreground">2.</strong> รายเดือน × 12, รายไตรมาส × 4 และรายปี × 1</li>
            <li><strong className="text-foreground">3.</strong> รวมยอดรายปีก่อนหาร 12 หรือ 52 เพื่อให้ค่าเฉลี่ยแต่ละช่วงสอดคล้องกัน</li>
          </ol>
        </section>
        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="budget-boundary-title">
          <h3 id="budget-boundary-title" className="flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />50/30/20 เป็นแนวเปรียบเทียบ ไม่ใช่คำสั่ง</h3>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">สัดส่วนที่เหมาะสมขึ้นกับรายได้ ค่าครองชีพ หนี้ ครอบครัว และเป้าหมายของคุณ ปรับเปอร์เซ็นต์ได้ แต่ต้องรวม 100% และอย่านับเงินคงเหลือเป็นเงินออมจนกว่าจะจัดสรรจริง</p>
        </section>
      </div>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปงบประมาณแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="budget-csv" onClick={() => downloadText(budgetCsv(input, result), "meaw-budget-plan.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </section>
  );
}

export function BudgetCalculatorTool() {
  const [form, setForm] = useState<BudgetForm>(initialForm);
  const [calculation, setCalculation] = useState<{ input: BudgetInput; result: BudgetResult } | null>(null);
  const [error, setError] = useState("");

  function commit(next: BudgetForm) {
    setForm(next);
    setCalculation(null);
    setError("");
  }

  function updateIncome(id: number, patch: Partial<IncomeForm>) {
    commit({ ...form, income: form.income.map((item) => item.id === id ? { ...item, ...patch } : item) });
  }

  function updateExpense(id: number, patch: Partial<ExpenseForm>) {
    commit({ ...form, expenses: form.expenses.map((item) => item.id === id ? { ...item, ...patch } : item) });
  }

  function addIncome() {
    if (form.income.length >= BUDGET_MAX_INCOME_ITEMS) return;
    const id = Math.max(0, ...form.income.map((item) => item.id)) + 1;
    commit({ ...form, income: [...form.income, { id, name: "", amount: "", frequency: "monthly" }] });
  }

  function addExpense() {
    if (form.expenses.length >= BUDGET_MAX_EXPENSE_ITEMS) return;
    const id = Math.max(0, ...form.expenses.map((item) => item.id)) + 1;
    commit({ ...form, expenses: [...form.expenses, { id, name: "", amount: "", frequency: "monthly", category: "needs" }] });
  }

  function calculate() {
    try {
      const input = buildInput(form);
      setCalculation({ input, result: calculateBudget(input) });
      setError("");
    } catch (reason) {
      setCalculation(null);
      setError(reason instanceof Error ? reason.message : "คำนวณไม่สำเร็จ กรุณาตรวจข้อมูล");
    }
  }

  return (
    <WorkspaceFrame>
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-100/55 px-3 py-1 text-xs text-pink-800 dark:bg-pink-400/10 dark:text-pink-200"><Cat className="size-3.5" />เงินทุกก้อนมีที่ของมัน</span>
          <h2 className="mt-3 flex items-center gap-2 text-lg font-bold"><PiggyBank className="size-5 text-primary" />Budget Planner Workspace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">รวมรายรับและรายจ่ายที่มาคนละรอบให้เทียบกันได้ เห็นเงินเหลือ/ขาด และเทียบหมวดจำเป็น ตามใจ ออม–จ่ายหนี้กับเป้าที่คุณกำหนด</p>
        </div>
        <ActionBar><ExampleButton onExample={() => commit(exampleForm())} /><ClearButton onClear={() => commit(initialForm())} /></ActionBar>
      </div>

      <form className="mt-6 space-y-8" onSubmit={(event) => { event.preventDefault(); calculate(); }} noValidate>
        <section aria-labelledby="budget-setup-title">
          <h3 id="budget-setup-title" className="flex items-center gap-2 font-semibold"><BadgeDollarSign className="size-4 text-primary" />1. ตั้งงบและเป้าสัดส่วน</h3>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.6fr)]">
            <div className="grid gap-3"><Label htmlFor="budget-household-name" className="leading-5">ชื่องบหรือครอบครัว <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></Label><Input id="budget-household-name" maxLength={80} placeholder="เช่น งบครอบครัวเดือนนี้" value={form.householdName} onChange={(event) => commit({ ...form, householdName: event.target.value })} /></div>
            <div className="grid gap-3"><Label htmlFor="budget-currency" className="leading-5">สกุลเงิน</Label><Select value={form.currency} onValueChange={(value) => commit({ ...form, currency: value as BudgetCurrency })}><SelectTrigger id="budget-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(currencyLabels).map(([currency, label]) => <SelectItem key={currency} value={currency}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="mt-5 rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h4 className="font-medium">เป้าสัดส่วนของรายรับ</h4><p className="text-xs text-muted-foreground">ค่าเริ่มต้น 50/30/20 · รวมต้องเท่ากับ 100%</p></div>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <NumberField id="budget-target-needs" label="ค่าใช้จ่ายจำเป็น (%)" value={form.targets.needs} min={0} max={100} step={0.1} onChange={(value) => commit({ ...form, targets: { ...form.targets, needs: value } })} />
              <NumberField id="budget-target-wants" label="ค่าใช้จ่ายตามใจ (%)" value={form.targets.wants} min={0} max={100} step={0.1} onChange={(value) => commit({ ...form, targets: { ...form.targets, wants: value } })} />
              <NumberField id="budget-target-savings" label="ออมเงินและจ่ายหนี้ (%)" value={form.targets.savingsDebt} min={0} max={100} step={0.1} onChange={(value) => commit({ ...form, targets: { ...form.targets, savingsDebt: value } })} />
            </div>
          </div>
        </section>

        <section aria-labelledby="budget-income-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 id="budget-income-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />2. รายรับ</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">กรอกยอดหลังหักภาษีที่ใช้จัดงบได้จริง และเลือกรอบที่ได้รับ</p></div><Button type="button" variant="outline" onClick={addIncome} disabled={form.income.length >= BUDGET_MAX_INCOME_ITEMS}><Plus className="size-4" />เพิ่มรายรับ</Button></div>
          <div className="mt-5 space-y-4">
            {form.income.map((item, index) => (
              <article key={item.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5" data-testid="budget-income-item">
                <div className="flex items-center justify-between gap-3"><h4 className="font-medium">รายรับ {index + 1}</h4><Button type="button" size="icon" variant="ghost" aria-label={`ลบรายรับ ${index + 1}`} disabled={form.income.length === 1} onClick={() => commit({ ...form, income: form.income.filter((candidate) => candidate.id !== item.id) })}><Trash2 className="size-4" /></Button></div>
                <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(10rem,0.7fr)_minmax(12rem,0.8fr)]">
                  <div className="grid gap-3"><Label htmlFor={`budget-income-name-${item.id}`} className="leading-5">ชื่อรายรับ</Label><Input id={`budget-income-name-${item.id}`} maxLength={80} placeholder="เช่น เงินเดือน" value={item.name} onChange={(event) => updateIncome(item.id, { name: event.target.value })} /></div>
                  <NumberField id={`budget-income-amount-${item.id}`} label="ยอดต่อรอบ" value={item.amount} onChange={(value) => updateIncome(item.id, { amount: value })} />
                  <FrequencyField id={`budget-income-frequency-${item.id}`} value={item.frequency} onChange={(value) => updateIncome(item.id, { frequency: value })} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="budget-expense-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 id="budget-expense-title" className="flex items-center gap-2 font-semibold"><ClipboardList className="size-4 text-primary" />3. รายจ่าย เงินออม และจ่ายหนี้เพิ่ม</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">แยกตามหมวดจากการใช้งานจริง ค่าใช้จ่ายขั้นต่ำของหนี้อยู่หมวดจำเป็น ส่วนยอดจ่ายเพิ่มอยู่หมวดออม–จ่ายหนี้</p></div><Button type="button" variant="outline" onClick={addExpense} disabled={form.expenses.length >= BUDGET_MAX_EXPENSE_ITEMS}><Plus className="size-4" />เพิ่มรายการ</Button></div>
          <div className="mt-5 space-y-4">
            {form.expenses.map((item, index) => (
              <article key={item.id} className={`rounded-2xl border p-4 sm:p-5 ${categoryTone[item.category]}`} data-testid="budget-expense-item">
                <div className="flex items-center justify-between gap-3"><h4 className="font-medium">รายการ {index + 1}</h4><Button type="button" size="icon" variant="ghost" aria-label={`ลบรายจ่าย ${index + 1}`} disabled={form.expenses.length === 1} onClick={() => commit({ ...form, expenses: form.expenses.filter((candidate) => candidate.id !== item.id) })}><Trash2 className="size-4" /></Button></div>
                <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(10rem,0.55fr)_minmax(12rem,0.7fr)_minmax(14rem,0.8fr)]">
                  <div className="grid gap-3"><Label htmlFor={`budget-expense-name-${item.id}`} className="leading-5">ชื่อรายการ</Label><Input id={`budget-expense-name-${item.id}`} maxLength={80} placeholder="เช่น ค่าเช่า" value={item.name} onChange={(event) => updateExpense(item.id, { name: event.target.value })} /></div>
                  <NumberField id={`budget-expense-amount-${item.id}`} label="ยอดต่อรอบ" value={item.amount} onChange={(value) => updateExpense(item.id, { amount: value })} />
                  <FrequencyField id={`budget-expense-frequency-${item.id}`} value={item.frequency} onChange={(value) => updateExpense(item.id, { frequency: value })} />
                  <div className="grid gap-3"><Label htmlFor={`budget-expense-category-${item.id}`} className="leading-5">หมวด</Label><Select value={item.category} onValueChange={(value) => updateExpense(item.id, { category: value as BudgetCategory })}><SelectTrigger id={`budget-expense-category-${item.id}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(budgetCategoryLabels).map(([category, label]) => <SelectItem key={category} value={category}>{label}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {error ? <Alert variant="destructive"><TriangleAlert /><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button type="submit" className="w-full sm:w-auto"><Calculator className="size-4" />คำนวณงบประมาณ</Button>
      </form>

      {calculation ? <BudgetResults input={calculation.input} result={calculation.result} /> : (
        <div className="mt-8 rounded-2xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">โหลดตัวอย่างหรือกรอกรายรับ–รายจ่าย แล้วกด “คำนวณงบประมาณ” เพื่อดูภาพรวมและดาวน์โหลด CSV</div>
      )}

      <div className="mt-8 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>เครื่องมือนี้เป็นแบบจำลองการจัดงบจากข้อมูลที่คุณกรอก ไม่ใช่คำแนะนำการเงิน ภาษี สินเชื่อ หรือการลงทุน และไม่บันทึกข้อมูลบน Server หากต้องวางแผนชำระหนี้หลายก้อนใช้ <Link href="/debt-payoff-calculator" className="font-medium text-primary hover:underline">Debt Payoff Calculator</Link> วางเป้าเงินออมระยะยาวใช้ <Link href="/compound-interest-calculator" className="font-medium text-primary hover:underline">Savings Goal Calculator</Link> หรือคำนวณเงินเดือนสุทธิใช้ <Link href="/salary-calculator" className="font-medium text-primary hover:underline">Salary Calculator</Link></span></p>
      </div>
    </WorkspaceFrame>
  );
}
