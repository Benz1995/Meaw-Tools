"use client";

import { Calculator, CircleAlert, Info, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calculateThaiPersonalIncomeTax,
  estimateSalaryIncomeTax,
  THAI_INCOME_TAX_RULESET,
  type SalaryTaxResult,
  type TaxCalculationResult,
} from "@/lib/tools/thai-income-tax";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

type Mode = "salary" | "taxable";
type DisplayResult = TaxCalculationResult & {
  mode: Mode;
  grossIncome?: number;
  employmentExpense?: number;
  personalAllowance?: number;
  totalDeductions?: number;
  withheldTax: number;
  balance: number;
};

function parseMoney(value: string, label: string, required = false): number {
  if (!value.trim()) {
    if (required) throw new Error(`กรุณากรอก${label}`);
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label}ต้องเป็นตัวเลขตั้งแต่ 0 บาทขึ้นไป`);
  return parsed;
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ResultCard({ label, value, emphasized = false, testId }: { label: string; value: string; emphasized?: boolean; testId?: string }) {
  return (
    <div className={emphasized ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : "rounded-xl border bg-muted/20 p-4"}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-primary tabular-nums" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p>
    </div>
  );
}

function summaryText(result: DisplayResult) {
  const balanceLabel = result.balance > 0 ? "ประมาณการต้องชำระเพิ่ม" : result.balance < 0 ? "ประมาณการชำระไว้เกิน" : "ประมาณการยอดคงเหลือ";
  return [
    "ผลประมาณการภาษีเงินได้บุคคลธรรมดา — Meaw Tools",
    `เงินได้สุทธิ: ${moneyFormatter.format(result.taxableIncome)}`,
    `ภาษีทั้งปี: ${moneyFormatter.format(result.tax)}`,
    `ภาษีหัก ณ ที่จ่าย: ${moneyFormatter.format(result.withheldTax)}`,
    `${balanceLabel}: ${moneyFormatter.format(Math.abs(result.balance))}`,
    "หมายเหตุ: เป็นการประมาณการเบื้องต้น ไม่ใช่คำแนะนำทางภาษีหรือผลยื่นแบบจริง",
  ].join("\n");
}

export function ThaiIncomeTaxTool() {
  const [mode, setMode] = useState<Mode>("salary");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [annualBonus, setAnnualBonus] = useState("");
  const [otherEmploymentIncome, setOtherEmploymentIncome] = useState("");
  const [socialSecurity, setSocialSecurity] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");
  const [taxableIncome, setTaxableIncome] = useState("");
  const [withheldTax, setWithheldTax] = useState("");
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); clearResult(); };

  const calculate = () => {
    try {
      const paidTax = parseMoney(withheldTax, "ภาษีหัก ณ ที่จ่าย");
      if (mode === "salary") {
        const salaryResult: SalaryTaxResult = estimateSalaryIncomeTax({
          monthlySalary: parseMoney(monthlySalary, "เงินเดือนต่อเดือน", true),
          annualBonus: parseMoney(annualBonus, "โบนัสทั้งปี"),
          otherEmploymentIncome: parseMoney(otherEmploymentIncome, "รายได้จากงานประจำอื่น ๆ"),
          socialSecurity: parseMoney(socialSecurity, "เงินสมทบประกันสังคม"),
          otherDeductions: parseMoney(otherDeductions, "ค่าลดหย่อนอื่น"),
          withheldTax: paidTax,
        });
        setResult({ ...salaryResult, mode: "salary" });
      } else {
        const taxResult = calculateThaiPersonalIncomeTax(parseMoney(taxableIncome, "เงินได้สุทธิ", true));
        setResult({ ...taxResult, mode: "taxable", withheldTax: paidTax, balance: taxResult.tax - paidTax });
      }
      setError("");
      toast.success("คำนวณภาษีโดยประมาณแล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณภาษีไม่สำเร็จ");
    }
  };

  const clearAll = () => {
    setMonthlySalary(""); setAnnualBonus(""); setOtherEmploymentIncome(""); setSocialSecurity("");
    setOtherDeductions(""); setTaxableIncome(""); setWithheldTax(""); clearResult();
  };

  const loadExample = () => {
    if (mode === "salary") {
      setMonthlySalary("50000"); setAnnualBonus("100000"); setOtherEmploymentIncome("0");
      setSocialSecurity("9000"); setOtherDeductions("50000"); setWithheldTax("25000");
    } else {
      setTaxableIncome("900000"); setWithheldTax("80000");
    }
    clearResult();
  };

  const activeBands = useMemo(() => result?.bands.filter((band) => band.taxableAmount > 0) ?? [], [result]);

  return (
    <WorkspaceFrame>
      <Alert className="mb-5 border-amber-500/30 bg-amber-500/5">
        <CircleAlert className="text-amber-600" />
        <AlertTitle>เครื่องมือประมาณการ ไม่ใช่ผลยื่นภาษี</AlertTitle>
        <AlertDescription>รองรับการคำนวณแบบขั้นบันไดและกรณีเงินเดือนพื้นฐาน ผู้ใช้ต้องตรวจสิทธิค่าลดหย่อน หลักฐาน ภาษีหัก ณ ที่จ่าย และกฎหมายของปีภาษีจริงกับกรมสรรพากร</AlertDescription>
      </Alert>

      <Tabs value={mode} onValueChange={(value) => { setMode(value as Mode); clearResult(); }}>
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 p-1 sm:w-fit sm:min-w-[26rem]">
          <TabsTrigger value="salary" className="min-h-10 px-3">คำนวณจากเงินเดือน</TabsTrigger>
          <TabsTrigger value="taxable" className="min-h-10 px-3">กรอกเงินได้สุทธิ</TabsTrigger>
        </TabsList>

        <TabsContent value="salary">
          <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            <MoneyField id="tax-monthly-salary" label="เงินเดือนต่อเดือน (บาท)" value={monthlySalary} onChange={update(setMonthlySalary)} placeholder="50000" />
            <MoneyField id="tax-annual-bonus" label="โบนัสทั้งปี (บาท)" value={annualBonus} onChange={update(setAnnualBonus)} placeholder="100000" />
            <MoneyField id="tax-other-income" label="รายได้จากงานประจำอื่น ๆ (บาท)" value={otherEmploymentIncome} onChange={update(setOtherEmploymentIncome)} hint="เฉพาะเงินได้ประเภทเงินเดือน/ค่าจ้างตามมาตรา 40(1)" />
            <MoneyField id="tax-social-security" label="ประกันสังคมที่จ่ายจริงทั้งปี (บาท)" value={socialSecurity} onChange={update(setSocialSecurity)} hint="กรอกตามหลักฐานจริง เครื่องมือไม่เดาเพดานให้" />
            <MoneyField id="tax-other-deductions" label="ค่าลดหย่อนอื่นที่ใช้สิทธิได้ (บาท)" value={otherDeductions} onChange={update(setOtherDeductions)} hint="รวมรายการอื่นด้วยตนเอง เช่น กองทุน ประกัน หรือครอบครัว" />
            <MoneyField id="tax-withheld" label="ภาษีหัก ณ ที่จ่ายทั้งปี (บาท)" value={withheldTax} onChange={update(setWithheldTax)} hint="ใช้ประมาณยอดชำระเพิ่มหรือยอดที่ชำระไว้เกิน" />
          </div>
        </TabsContent>

        <TabsContent value="taxable">
          <div className="grid max-w-3xl gap-x-4 gap-y-5 md:grid-cols-2">
            <MoneyField id="tax-taxable-income" label="เงินได้สุทธิหลังหักค่าใช้จ่ายและค่าลดหย่อน (บาท)" value={taxableIncome} onChange={update(setTaxableIncome)} placeholder="900000" hint="ใช้โหมดนี้เมื่อคำนวณเงินได้สุทธิมาแล้ว" />
            <MoneyField id="tax-withheld-direct" label="ภาษีหัก ณ ที่จ่ายทั้งปี (บาท)" value={withheldTax} onChange={update(setWithheldTax)} hint="ไม่บังคับกรอก" />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-5 border-t pt-5">
        <ActionBar>
          <Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณภาษี</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clearAll} />
          {result ? <CopyButton value={summaryText(result)} label="คัดลอกสรุป" /> : null}
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5">
        {!result ? <EmptyOutput size="compact" text="กรอกข้อมูลแล้วกดคำนวณ เพื่อดูภาษีแต่ละขั้นและยอดสุทธิโดยประมาณ" /> : (
          <div className="space-y-5" aria-live="polite">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResultCard label="เงินได้สุทธิที่ใช้คำนวณ" value={moneyFormatter.format(result.taxableIncome)} />
              <ResultCard label="ภาษีประมาณการทั้งปี" value={moneyFormatter.format(result.tax)} emphasized testId="income-tax-total" />
              <ResultCard label="เฉลี่ยต่อเดือน" value={moneyFormatter.format(result.monthlyTaxAverage)} />
              <ResultCard label="อัตราสูงสุดที่เข้าเกณฑ์" value={`${numberFormatter.format(result.marginalRate * 100)}%`} />
            </div>

            {result.mode === "salary" ? (
              <section className="rounded-xl border bg-muted/15 p-4 sm:p-5" aria-labelledby="salary-breakdown-title">
                <h2 id="salary-breakdown-title" className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" />ที่มาของเงินได้สุทธิ</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-muted-foreground">รายได้จากงานประจำรวม</dt><dd className="mt-1 font-semibold tabular-nums">{moneyFormatter.format(result.grossIncome ?? 0)}</dd></div>
                  <div><dt className="text-muted-foreground">หักค่าใช้จ่าย 50%</dt><dd className="mt-1 font-semibold tabular-nums">− {moneyFormatter.format(result.employmentExpense ?? 0)}</dd></div>
                  <div><dt className="text-muted-foreground">ค่าลดหย่อนส่วนตัว</dt><dd className="mt-1 font-semibold tabular-nums">− {moneyFormatter.format(result.personalAllowance ?? 0)}</dd></div>
                  <div><dt className="text-muted-foreground">หักทั้งหมด</dt><dd className="mt-1 font-semibold tabular-nums">− {moneyFormatter.format(result.totalDeductions ?? 0)}</dd></div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">ค่าใช้จ่ายเงินเดือนคิด 50% ของรายได้ แต่ไม่เกิน {moneyFormatter.format(THAI_INCOME_TAX_RULESET.employmentExpenseCap)} ส่วนประกันสังคมและค่าลดหย่อนอื่นใช้ค่าที่ผู้ใช้กรอก</p>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-xl border" aria-labelledby="tax-band-title">
              <div className="border-b bg-muted/25 px-4 py-3">
                <h2 id="tax-band-title" className="font-semibold">ภาษีแบบขั้นบันได</h2>
                <p className="mt-1 text-xs text-muted-foreground">คิดเฉพาะเงินได้สุทธิที่อยู่ในแต่ละช่วง ไม่ได้นำรายได้ทั้งหมดคูณอัตราสูงสุด</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-sm">
                  <thead className="bg-muted/15 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2">ช่วงเงินได้สุทธิ</th><th className="px-4 py-2 text-right">อัตรา</th><th className="px-4 py-2 text-right">เงินได้ในขั้น</th><th className="px-4 py-2 text-right">ภาษีขั้นนี้</th></tr></thead>
                  <tbody className="divide-y">
                    {activeBands.map((band) => <tr key={band.lowerBound}><td className="px-4 py-2.5">{band.upperBound === null ? `เกิน ${numberFormatter.format(band.lowerBound)}` : `${numberFormatter.format(band.lowerBound)} – ${numberFormatter.format(band.upperBound)}`} บาท</td><td className="px-4 py-2.5 text-right tabular-nums">{band.rate === 0 ? "ยกเว้น" : `${band.rate * 100}%`}</td><td className="px-4 py-2.5 text-right tabular-nums">{moneyFormatter.format(band.taxableAmount)}</td><td className="px-4 py-2.5 text-right font-medium tabular-nums">{moneyFormatter.format(band.tax)}</td></tr>)}
                  </tbody>
                  <tfoot className="border-t-2 bg-muted/20 font-semibold"><tr><td className="px-4 py-3" colSpan={3}>ภาษีประมาณการรวม</td><td className="px-4 py-3 text-right tabular-nums">{moneyFormatter.format(result.tax)}</td></tr></tfoot>
                </table>
              </div>
            </section>

            <div className={result.balance > 0 ? "rounded-xl border border-amber-500/30 bg-amber-500/5 p-5" : "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5"}>
              <p className="text-sm text-muted-foreground">{result.balance > 0 ? "ประมาณการต้องชำระเพิ่ม" : result.balance < 0 ? "ประมาณการชำระไว้เกิน" : "ประมาณการยอดคงเหลือ"}</p>
              <p data-testid="income-tax-balance" className="mt-1 text-2xl font-bold tabular-nums">{moneyFormatter.format(Math.abs(result.balance))}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">ภาษีประมาณการ {moneyFormatter.format(result.tax)} − ภาษีหัก ณ ที่จ่าย {moneyFormatter.format(result.withheldTax)} ผลยื่นจริงอาจต่างจากนี้และยอดชำระเกินไม่ได้หมายความว่าจะได้รับคืนโดยอัตโนมัติ</p>
            </div>

            <div className="rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
              <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>อ้างอิงข้อมูลกรมสรรพากร: <a className="font-medium text-primary hover:underline" href="https://www.rd.go.th/59670.html" target="_blank" rel="noreferrer">อัตราภาษีเงินได้บุคคลธรรมดา</a>, <a className="font-medium text-primary hover:underline" href="https://www.rd.go.th/556.html" target="_blank" rel="noreferrer">การหักค่าใช้จ่าย</a> และ <a className="font-medium text-primary hover:underline" href="https://www.rd.go.th/62777.html" target="_blank" rel="noreferrer">ค่าลดหย่อนผู้มีเงินได้</a> ตรวจทานล่าสุด 3 สิงหาคม 2569</span></p>
            </div>
          </div>
        )}
      </div>
    </WorkspaceFrame>
  );
}
