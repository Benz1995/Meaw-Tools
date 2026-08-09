"use client";

import { useState } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Calculator,
  ClipboardList,
  Download,
  Info,
  ListOrdered,
  Plus,
  Sparkles,
  TableProperties,
  Trash2,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateDebtPayoff,
  debtPayoffCsv,
  DEBT_MAX_COUNT,
  type DebtCurrency,
  type DebtPayoffInput,
  type DebtPayoffResult,
  type DebtStrategy,
} from "@/lib/tools/debt-payoff";

type DebtFormRow = {
  id: number;
  name: string;
  balance: string;
  rate: string;
  minimum: string;
};

type DebtPayoffForm = {
  currency: DebtCurrency;
  planName: string;
  startMonth: string;
  extraMonthlyPayment: string;
  debts: DebtFormRow[];
};

const currencyLabels: Record<DebtCurrency, string> = {
  THB: "บาท (THB)",
  USD: "ดอลลาร์สหรัฐ (USD)",
  EUR: "ยูโร (EUR)",
  GBP: "ปอนด์ (GBP)",
  JPY: "เยน (JPY)",
  OTHER: "หน่วยเงินอื่น",
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createInitialForm(): DebtPayoffForm {
  return {
    currency: "THB",
    planName: "แผนปลดหนี้ของฉัน",
    startMonth: currentMonth(),
    extraMonthlyPayment: "",
    debts: [
      { id: 1, name: "", balance: "", rate: "", minimum: "" },
      { id: 2, name: "", balance: "", rate: "", minimum: "" },
    ],
  };
}

function createExampleForm(): DebtPayoffForm {
  return {
    currency: "THB",
    planName: "ตัวอย่างแผนปลดหนี้ 3 ก้อน",
    startMonth: currentMonth(),
    extraMonthlyPayment: "3000",
    debts: [
      { id: 1, name: "บัตรเครดิต A", balance: "45000", rate: "18", minimum: "2000" },
      { id: 2, name: "สินเชื่อส่วนบุคคล", balance: "120000", rate: "12", minimum: "3500" },
      { id: 3, name: "ผ่อนโทรศัพท์", balance: "18000", rate: "0", minimum: "1500" },
    ],
  };
}

function parseNumber(value: string, label: string, allowZero = false) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized && allowZero) return 0;
  if (!normalized) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function money(value: number, currency: DebtCurrency, signed = false) {
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

function monthLabel(value: string | null) {
  if (!value) return "เกิน 50 ปี";
  const date = new Date(`${value}-01T00:00:00Z`);
  return new Intl.DateTimeFormat("th-TH", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function durationLabel(months: number) {
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${remaining} เดือน`;
  if (remaining === 0) return `${months} เดือน (${years} ปี)`;
  return `${months} เดือน (${years} ปี ${remaining} เดือน)`;
}

function ResultCard({ label, value, detail, testId }: { label: string; value: string; detail: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-card/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-card/55" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tabular-nums text-primary">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function StrategyResultPanel({
  input,
  result,
  selectedStrategy,
  onStrategyChange,
}: {
  input: DebtPayoffInput;
  result: DebtPayoffResult;
  selectedStrategy: DebtStrategy;
  onStrategyChange: (strategy: DebtStrategy) => void;
}) {
  const selected = result[selectedStrategy];
  const other = result[selectedStrategy === "avalanche" ? "snowball" : "avalanche"];
  const selectedLabel = selectedStrategy === "avalanche" ? "Avalanche · ดอกสูงก่อน" : "Snowball · ยอดเล็กก่อน";
  const maxAnnualBalance = Math.max(result.initialBalance, ...selected.annualTimeline.map((row) => row.openingBalance), 1);
  const summary = [
    `แผนปลดหนี้ · ${input.planName}`,
    `กลยุทธ์: ${selectedLabel}`,
    `งบชำระคงที่ต่อเดือน: ${money(result.totalMonthlyBudget, input.currency)}`,
    selected.completed ? `ปลดหนี้ประมาณ: ${monthLabel(selected.payoffMonthLabel)} · ${durationLabel(selected.months)}` : `ยังไม่หมดภายใน ${durationLabel(selected.months)}`,
    `ดอกเบี้ยรวม: ${money(selected.totalInterest, input.currency)}`,
    `จ่ายรวม: ${money(selected.totalPaid, input.currency)}`,
  ].join("\n");

  return (
    <div className="space-y-6" data-testid="debt-result">
      {result.minimumInterestWarnings.length > 0 ? (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <TriangleAlert className="text-amber-700 dark:text-amber-300" />
          <AlertTitle>บางก้อนอาจมียอดไม่ลดจากขั้นต่ำเดิม</AlertTitle>
          <AlertDescription className="leading-6">
            ขั้นต่ำของ {result.minimumInterestWarnings.join(", ")} ไม่สูงกว่าดอกเบี้ยเดือนแรก ระบบยังนำเงินโปะและค่างวดที่ว่างไปช่วยตามกลยุทธ์ แต่ควรตรวจเงื่อนไขจริงกับเจ้าหนี้
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="debt-comparison-title" data-testid="debt-comparison">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="debt-comparison-title" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />เทียบสองทางเลือกด้วยงบเท่ากัน</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Avalanche เน้นลดดอกเบี้ย ส่วน Snowball เน้นเห็นก้อนเล็กหายเร็วเพื่อสร้างแรงต่อเนื่อง</p>
          </div>
          <Tabs value={selectedStrategy} onValueChange={(value) => onStrategyChange(value as DebtStrategy)}>
            <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[30rem]">
              <TabsTrigger value="avalanche" className="min-h-11 px-2"><span className="sm:hidden">Avalanche</span><span className="hidden sm:inline">Avalanche · ดอกสูงก่อน</span></TabsTrigger>
              <TabsTrigger value="snowball" className="min-h-11 px-2"><span className="sm:hidden">Snowball</span><span className="hidden sm:inline">Snowball · ยอดเล็กก่อน</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["avalanche", "snowball"] as const).map((strategy) => {
            const plan = result[strategy];
            const active = strategy === selectedStrategy;
            return (
              <button
                key={strategy}
                type="button"
                onClick={() => onStrategyChange(strategy)}
                className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-primary/40 bg-primary/8 shadow-sm" : "border-white/50 bg-card/60 hover:bg-muted/40 dark:border-white/10"}`}
                aria-pressed={active}
              >
                <span className="text-sm font-semibold">{strategy === "avalanche" ? "Avalanche · ดอกเบี้ยสูงก่อน" : "Snowball · ยอดคงเหลือน้อยก่อน"}</span>
                <span className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <span><span className="block text-muted-foreground">ปลดหนี้</span><strong className="mt-1 block tabular-nums">{plan.completed ? durationLabel(plan.months) : "เกิน 50 ปี"}</strong></span>
                  <span><span className="block text-muted-foreground">ดอกเบี้ยรวม</span><strong className="mt-1 block tabular-nums">{money(plan.totalInterest, input.currency)}</strong></span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/8 via-rose-500/5 to-amber-400/8 p-4 text-sm leading-6">
          {result.avalanche.completed && result.snowball.completed ? (
            result.interestDifference > 0.005
              ? <>ตามสมมติฐานนี้ Avalanche ลดดอกเบี้ยได้ประมาณ <strong>{money(result.interestDifference, input.currency)}</strong> เมื่อเทียบกับ Snowball{result.monthDifference !== 0 ? ` และต่างกัน ${Math.abs(result.monthDifference)} เดือน` : " โดยใช้เวลารวมเท่ากัน"}</>
              : <>สองกลยุทธ์ให้ดอกเบี้ยและเวลาใกล้เคียงกัน เลือกแบบที่ทำตามได้ต่อเนื่องกว่า</>
          ) : <>อย่างน้อยหนึ่งกลยุทธ์ยังไม่ปิดหนี้ภายใน 600 เดือน ควรเพิ่มงบรายเดือนหรือติดต่อเจ้าหนี้เพื่อขอทางเลือกที่เหมาะสม</>}
        </div>
      </section>

      {!selected.completed ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>แผนนี้ยังไม่ปลดหนี้ภายใน 50 ปี</AlertTitle>
          <AlertDescription>หลังจำลอง 600 เดือนยังเหลือ {money(selected.remainingBalance, input.currency)} อย่าใช้วันปลดหนี้จากแผนนี้ตัดสินใจ ให้เพิ่มยอดชำระหรือติดต่อผู้ให้คำปรึกษาที่น่าเชื่อถือ</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="debt-summary-title">
        <h2 id="debt-summary-title" className="flex items-center gap-2 font-semibold"><BadgeDollarSign className="size-4 text-primary" />ผลลัพธ์ {selectedLabel}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResultCard label="เดือนที่คาดว่าจะปลดหนี้" value={monthLabel(selected.payoffMonthLabel)} detail={selected.completed ? durationLabel(selected.months) : "ยังคำนวณวันปลดหนี้ไม่ได้"} testId="debt-primary" />
          <ResultCard label="ดอกเบี้ยรวม" value={money(selected.totalInterest, input.currency)} detail={`เทียบอีกกลยุทธ์ ${money(other.totalInterest, input.currency)}`} testId="debt-interest" />
          <ResultCard label="ยอดจ่ายรวม" value={money(selected.totalPaid, input.currency)} detail={`ยอดตั้งต้น ${money(result.initialBalance, input.currency)}`} testId="debt-total-paid" />
          <ResultCard label="งบชำระคงที่ต่อเดือน" value={money(result.totalMonthlyBudget, input.currency)} detail={`ขั้นต่ำรวม ${money(result.baseMinimumBudget, input.currency)} + เงินโปะ ${money(input.extraMonthlyPayment, input.currency)}`} testId="debt-budget" />
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="debt-order-title">
        <h2 id="debt-order-title" className="flex items-center gap-2 font-semibold"><ListOrdered className="size-4 text-primary" />ลำดับก้อนที่ปิด</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {selected.payoffOrder.map((debt, index) => (
            <div key={`${debt.debtIndex}-${debt.payoffMonth}`} className="rounded-xl border border-white/50 bg-card/70 p-3 dark:border-white/10">
              <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><div className="min-w-0"><p className="truncate font-semibold">{debt.name}</p><p className="mt-1 text-xs text-muted-foreground">{monthLabel(debt.payoffMonthLabel)} · เดือนที่ {debt.payoffMonth}</p></div></div>
              <p className="mt-3 text-xs text-muted-foreground">ดอกเบี้ยก้อนนี้ <strong className="text-foreground tabular-nums">{money(debt.totalInterest, input.currency)}</strong></p>
            </div>
          ))}
          {selected.payoffOrder.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีก้อนใดปิดภายในช่วงจำลอง</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="debt-chart-title">
        <h2 id="debt-chart-title" className="flex items-center gap-2 font-semibold"><BarChart3 className="size-4 text-primary" />ยอดหนี้คงเหลือรายปี</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">แถบสั้นลงเมื่อยอดหนี้ลดลง โดยปีสุดท้ายอาจมีไม่ครบ 12 เดือน</p>
        <div className="mt-5 space-y-3" role="img" aria-label={`กราฟยอดหนี้คงเหลือ ${selected.annualTimeline.length} ปี`}>
          {selected.annualTimeline.map((row) => (
            <div key={row.year} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">ปี {row.year}</span>
              <div className="h-8 overflow-hidden rounded-full border bg-background/65 p-1">
                <div
                  className="flex h-full min-w-8 items-center justify-end rounded-full bg-gradient-to-r from-sky-300 via-violet-300 to-pink-300 px-2 text-[10px] font-semibold tabular-nums text-violet-950 shadow-sm transition-[width] duration-500 dark:from-sky-500/80 dark:via-violet-500/80 dark:to-pink-500/80"
                  style={{ width: `${Math.max(4, (row.endingBalance / maxAnnualBalance) * 100)}%` }}
                >
                  <span className="truncate">{money(row.endingBalance, input.currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="debt-timeline-title" data-testid="debt-timeline">
        <h2 id="debt-timeline-title" className="flex items-center gap-2 font-semibold"><TableProperties className="size-4 text-primary" />ตารางสรุปรายปี</h2>
        <div className="mt-4 grid gap-3 sm:hidden">
          {selected.annualTimeline.map((row) => (
            <div key={row.year} className="rounded-xl border bg-card/70 p-3">
              <p className="font-semibold">ปี {row.year} · เหลือ {money(row.endingBalance, input.currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{monthLabel(row.startMonthLabel)} – {monthLabel(row.endMonthLabel)}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <p><span className="block text-muted-foreground">จ่าย</span><strong className="mt-1 block tabular-nums">{money(row.payment, input.currency)}</strong></p>
                <p><span className="block text-muted-foreground">ดอกเบี้ย</span><strong className="mt-1 block tabular-nums">{money(row.interest, input.currency)}</strong></p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="ตารางแผนปลดหนี้รายปีที่เลื่อนได้">
          <table className="w-full min-w-[44rem] text-right text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">ปี / ช่วงเดือน</th><th className="px-3 pb-3 font-medium">ยอดต้นปี</th><th className="px-3 pb-3 font-medium">จ่าย</th><th className="px-3 pb-3 font-medium">ดอกเบี้ย</th><th className="px-3 pb-3 font-medium">เงินต้นที่ลด</th><th className="pl-3 pb-3 font-medium">ยอดปลายปี</th></tr></thead>
            <tbody className="divide-y">{selected.annualTimeline.map((row) => (
              <tr key={row.year}>
                <th className="py-3 pr-4 text-left font-medium">ปี {row.year}<span className="mt-1 block text-xs font-normal text-muted-foreground">{row.startMonthLabel} – {row.endMonthLabel}</span></th>
                <td className="px-3 tabular-nums">{money(row.openingBalance, input.currency)}</td>
                <td className="px-3 tabular-nums">{money(row.payment, input.currency)}</td>
                <td className="px-3 tabular-nums">{money(row.interest, input.currency)}</td>
                <td className="px-3 tabular-nums">{money(row.principal, input.currency)}</td>
                <td className="pl-3 font-medium tabular-nums">{money(row.endingBalance, input.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5" aria-labelledby="debt-method-title">
        <h2 id="debt-method-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-amber-700 dark:text-amber-300" />สมมติฐานที่ใช้</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
          <div className="rounded-xl border bg-card/70 p-3"><strong>ดอกเบี้ยรายเดือน</strong><p className="mt-1 text-muted-foreground">คิดยอดต้นเดือน × APR ÷ 12 แล้วจึงชำระปลายเดือน ใช้เลขเต็มระหว่างคำนวณ</p></div>
          <div className="rounded-xl border bg-card/70 p-3"><strong>โยกค่างวดอัตโนมัติ</strong><p className="mt-1 text-muted-foreground">คงงบขั้นต่ำรวมเดิมและเงินโปะไว้ เมื่อก้อนหนึ่งปิด เงินส่วนที่ว่างจะไหลไปก้อนถัดไปในเดือนเดียวกัน</p></div>
          <div className="rounded-xl border bg-card/70 p-3"><strong>ไม่ใช่ตารางจากเจ้าหนี้</strong><p className="mt-1 text-muted-foreground">ไม่รวมค่าธรรมเนียม ดอกเบี้ยรายวัน อัตราผันแปร โปรโมชั่น การผิดนัด หรือกฎการปัดเศษของสัญญาจริง</p></div>
        </div>
      </section>

      <ActionBar>
        <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแผนปลดหนี้แล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
        <Button type="button" variant="outline" data-testid="debt-csv" onClick={() => downloadText(debtPayoffCsv(input, result, selectedStrategy), `meaw-debt-${selectedStrategy}.csv`, "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
      </ActionBar>
    </div>
  );
}

export function DebtPayoffCalculatorTool() {
  const [form, setForm] = useState<DebtPayoffForm>(() => createInitialForm());
  const [calculation, setCalculation] = useState<{ input: DebtPayoffInput; result: DebtPayoffResult } | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<DebtStrategy>("avalanche");
  const [error, setError] = useState("");
  const [nextDebtId, setNextDebtId] = useState(3);

  const resetOutput = () => { setCalculation(null); setError(""); };

  const updateForm = <Key extends Exclude<keyof DebtPayoffForm, "debts">>(key: Key, value: DebtPayoffForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    resetOutput();
  };

  const updateDebt = (id: number, key: Exclude<keyof DebtFormRow, "id">, value: string) => {
    setForm((current) => ({ ...current, debts: current.debts.map((debt) => debt.id === id ? { ...debt, [key]: value } : debt) }));
    resetOutput();
  };

  const addDebt = () => {
    if (form.debts.length >= DEBT_MAX_COUNT) return;
    setForm((current) => ({ ...current, debts: [...current.debts, { id: nextDebtId, name: "", balance: "", rate: "", minimum: "" }] }));
    setNextDebtId((current) => current + 1);
    resetOutput();
  };

  const removeDebt = (id: number) => {
    if (form.debts.length <= 1) return;
    setForm((current) => ({ ...current, debts: current.debts.filter((debt) => debt.id !== id) }));
    resetOutput();
  };

  const calculate = () => {
    try {
      const input: DebtPayoffInput = {
        currency: form.currency,
        planName: form.planName,
        startMonth: form.startMonth,
        extraMonthlyPayment: parseNumber(form.extraMonthlyPayment, "เงินโปะเพิ่มต่อเดือน", true),
        debts: form.debts.map((debt, index) => ({
          name: debt.name,
          balance: parseNumber(debt.balance, `ยอดหนี้รายการที่ ${index + 1}`),
          annualInterestRatePercent: parseNumber(debt.rate, `อัตราดอกเบี้ยรายการที่ ${index + 1}`),
          minimumPayment: parseNumber(debt.minimum, `ยอดขั้นต่ำรายการที่ ${index + 1}`),
        })),
      };
      setCalculation({ input, result: calculateDebtPayoff(input) });
      setSelectedStrategy("avalanche");
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "คำนวณแผนปลดหนี้ไม่สำเร็จ");
    }
  };

  const loadExample = () => { setForm(createExampleForm()); setNextDebtId(4); setCalculation(null); setSelectedStrategy("avalanche"); setError(""); };
  const clear = () => { setForm(createInitialForm()); setNextDebtId(3); setCalculation(null); setSelectedStrategy("avalanche"); setError(""); };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 overflow-hidden border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-sky-400/10">
        <BadgeDollarSign className="text-pink-600 dark:text-pink-300" />
        <AlertTitle className="flex flex-wrap items-center gap-2">วางแผนปลดหนี้ให้เห็นเส้นชัย <span aria-hidden="true" className="rounded-full border border-pink-300/40 bg-white/50 px-2 py-0.5 text-xs font-normal text-pink-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-pink-200">ฅ^•ﻌ•^ฅ</span></AlertTitle>
        <AlertDescription className="leading-6">เทียบ Avalanche กับ Snowball ด้วยงบเดียวกัน ข้อมูลคำนวณใน Browser และไม่ถูกส่งไป Server</AlertDescription>
      </Alert>

      <section aria-labelledby="debt-plan-title">
        <h2 id="debt-plan-title" className="flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />1. ตั้งชื่อแผนและงบเพิ่ม</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">จำนวนเงินทุกช่องต้องเป็นหน่วยเดียวกัน ระบบไม่แปลงสกุลเงิน</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-3 md:col-span-2">
            <Label htmlFor="debt-plan-name">ชื่อแผนปลดหนี้</Label>
            <Input id="debt-plan-name" value={form.planName} maxLength={120} placeholder="เช่น แผนปลดหนี้ก่อนสิ้นปี" onChange={(event) => updateForm("planName", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใช้เป็นหัวข้อในสรุปและ CSV</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="debt-start-month">เดือนเริ่มชำระ</Label>
            <Input id="debt-start-month" type="month" value={form.startMonth} min="1900-01" max="9949-12" onChange={(event) => updateForm("startMonth", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">งวดแรกเริ่มในเดือนนี้</p>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="debt-currency">หน่วยเงิน</Label>
            <Select value={form.currency} onValueChange={(value) => updateForm("currency", value as DebtCurrency)}>
              <SelectTrigger id="debt-currency"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(currencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ใช้เพื่อจัดรูปแบบตัวเลขเท่านั้น</p>
          </div>
          <div className="grid gap-3 md:col-span-2 xl:col-span-1">
            <Label htmlFor="debt-extra">เงินโปะเพิ่มต่อเดือน</Label>
            <Input id="debt-extra" inputMode="decimal" value={form.extraMonthlyPayment} placeholder="0" onChange={(event) => updateForm("extraMonthlyPayment", event.target.value)} />
            <p className="text-xs leading-5 text-muted-foreground">ใส่ 0 หรือเว้นว่างได้</p>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="debt-list-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="debt-list-title" className="flex items-center gap-2 font-semibold"><ListOrdered className="size-4 text-primary" />2. เพิ่มหนี้แต่ละก้อน</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ยอดคงเหลือและ APR ปัจจุบันจากใบแจ้งยอด พร้อมยอดขั้นต่ำที่ตั้งใจจ่ายทุกเดือน</p>
          </div>
          <Button type="button" variant="outline" onClick={addDebt} disabled={form.debts.length >= DEBT_MAX_COUNT}><Plus className="size-4" />เพิ่มหนี้ ({form.debts.length}/{DEBT_MAX_COUNT})</Button>
        </div>
        <div className="mt-5 space-y-4">
          {form.debts.map((debt, index) => (
            <article key={debt.id} className="rounded-2xl border border-white/50 bg-card/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/45">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">หนี้ก้อนที่ {index + 1}</h3>
                <Button type="button" size="icon" variant="ghost" disabled={form.debts.length <= 1} onClick={() => removeDebt(debt.id)} aria-label={`ลบหนี้ก้อนที่ ${index + 1}`}><Trash2 className="size-4" /></Button>
              </div>
              <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-3">
                  <Label htmlFor={`debt-name-${debt.id}`}>ชื่อหนี้</Label>
                  <Input id={`debt-name-${debt.id}`} value={debt.name} maxLength={80} placeholder="เช่น บัตรเครดิต A" onChange={(event) => updateDebt(debt.id, "name", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">ไม่ต้องใส่เลขบัญชีหรือข้อมูลลับ</p>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor={`debt-balance-${debt.id}`}>ยอดคงเหลือ</Label>
                  <Input id={`debt-balance-${debt.id}`} inputMode="decimal" value={debt.balance} placeholder="เช่น 45000" onChange={(event) => updateDebt(debt.id, "balance", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">ยอดก่อนเริ่มงวดแรก</p>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor={`debt-rate-${debt.id}`}>ดอกเบี้ยต่อปี APR (%)</Label>
                  <Input id={`debt-rate-${debt.id}`} inputMode="decimal" value={debt.rate} placeholder="เช่น 18" onChange={(event) => updateDebt(debt.id, "rate", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">รองรับ 0–100% แบบคงที่</p>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor={`debt-minimum-${debt.id}`}>ยอดขั้นต่ำต่อเดือน</Label>
                  <Input id={`debt-minimum-${debt.id}`} inputMode="decimal" value={debt.minimum} placeholder="เช่น 2000" onChange={(event) => updateDebt(debt.id, "minimum", event.target.value)} />
                  <p className="text-xs leading-5 text-muted-foreground">ยอดที่กันไว้ให้ก้อนนี้ทุกเดือน</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {error ? (
        <Alert variant="destructive" className="mt-6"><TriangleAlert /><AlertTitle>ตรวจข้อมูลก่อนคำนวณ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={calculate}><Calculator className="size-4" />คำนวณ Snowball และ Avalanche</Button>
        <ExampleButton onExample={loadExample} />
        <ClearButton onClear={clear} />
      </div>

      {calculation ? <div className="mt-8"><StrategyResultPanel input={calculation.input} result={calculation.result} selectedStrategy={selectedStrategy} onStrategyChange={setSelectedStrategy} /></div> : null}

      <Alert className="mt-8 border-sky-500/25 bg-sky-500/5">
        <Info className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>หลักการและความปลอดภัยทางการเงิน</AlertTitle>
        <AlertDescription className="leading-6">
          วิธีดอกเบี้ยสูงก่อนและ Snowball อ้างอิง <a className="font-medium text-primary hover:underline" href="https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/" target="_blank" rel="noreferrer">CFPB: How to reduce your debt</a> และ <a className="font-medium text-primary hover:underline" href="https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_debt-action-plan_tool_2018-11.pdf" target="_blank" rel="noreferrer">Debt action plan</a> ควรเริ่มจากงบประมาณและติดต่อเจ้าหนี้เมื่อชำระไม่ไหวตาม <a className="font-medium text-primary hover:underline" href="https://consumer.gov/debt/debt-explained" target="_blank" rel="noreferrer">Consumer.gov</a> ระวังบริการที่เก็บค่าธรรมเนียมล่วงหน้าหรือรับประกันว่าจะล้างหนี้ได้ตามคำเตือนของ <a className="font-medium text-primary hover:underline" href="https://consumer.ftc.gov/consumer-alerts/2026/03/looking-debt-relief-heres-how-avoid-scam" target="_blank" rel="noreferrer">FTC</a>
        </AlertDescription>
      </Alert>
    </WorkspaceFrame>
  );
}
