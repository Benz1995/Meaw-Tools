"use client";

import { Calculator, CircleAlert, Info, MinusCircle, PlusCircle, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateNetSalary,
  THAI_SSO_M33_RULESET_2569,
  type SalaryCalculationResult,
  type SocialSecurityMode,
} from "@/lib/tools/salary";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

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
      <Label htmlFor={id} className="leading-5 md:min-h-10 md:items-start">{label}</Label>
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

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}><span className="text-muted-foreground">{label}</span><span className="shrink-0 tabular-nums">{value}</span></div>;
}

function summaryText(result: SalaryCalculationResult) {
  return [
    "สรุปเงินเดือนสุทธิ — Meaw Tools",
    `รายรับรวม: ${moneyFormatter.format(result.grossIncome)}`,
    `ประกันสังคม: ${moneyFormatter.format(result.socialSecurity)}`,
    `กองทุนสำรองเลี้ยงชีพ: ${moneyFormatter.format(result.providentFund)}`,
    `ภาษีหัก ณ ที่จ่าย: ${moneyFormatter.format(result.withholdingTax)}`,
    `รายการหักรวม: ${moneyFormatter.format(result.totalDeductions)}`,
    `เงินเดือนสุทธิ: ${moneyFormatter.format(result.netPay)}`,
    "หมายเหตุ: เป็นเครื่องมือช่วยตรวจยอด ไม่ใช่สลิปเงินเดือนหรือเอกสารรับรองรายได้",
  ].join("\n");
}

export function SalaryCalculatorTool() {
  const [baseSalary, setBaseSalary] = useState("");
  const [overtime, setOvertime] = useState("");
  const [allowances, setAllowances] = useState("");
  const [bonus, setBonus] = useState("");
  const [socialSecurityMode, setSocialSecurityMode] = useState<SocialSecurityMode>("auto");
  const [socialSecurityWage, setSocialSecurityWage] = useState("");
  const [manualSocialSecurity, setManualSocialSecurity] = useState("");
  const [providentFundRate, setProvidentFundRate] = useState("");
  const [withholdingTax, setWithholdingTax] = useState("");
  const [otherDeductions, setOtherDeductions] = useState("");
  const [result, setResult] = useState<SalaryCalculationResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); clearResult(); };

  const calculate = () => {
    try {
      const nextResult = calculateNetSalary({
        baseSalary: parseMoney(baseSalary, "เงินเดือน", true),
        overtime: parseMoney(overtime, "ค่าล่วงเวลา"),
        allowances: parseMoney(allowances, "ค่าตำแหน่งและรายได้อื่น"),
        bonus: parseMoney(bonus, "โบนัสหรือคอมมิชชัน"),
        socialSecurityMode,
        socialSecurityWage: parseMoney(socialSecurityWage, "ค่าจ้างที่ใช้ส่งประกันสังคม"),
        manualSocialSecurity: parseMoney(manualSocialSecurity, "ประกันสังคมที่หักจริง"),
        providentFundRate: parseMoney(providentFundRate, "อัตรากองทุนสำรองเลี้ยงชีพ"),
        withholdingTax: parseMoney(withholdingTax, "ภาษีหัก ณ ที่จ่าย"),
        otherDeductions: parseMoney(otherDeductions, "รายการหักอื่น"),
      });
      setResult(nextResult);
      setError("");
      toast.success("คำนวณเงินเดือนสุทธิแล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณเงินเดือนไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setBaseSalary("30000"); setOvertime("2000"); setAllowances("1500"); setBonus("0");
    setSocialSecurityMode("auto"); setSocialSecurityWage(""); setManualSocialSecurity("");
    setProvidentFundRate("3"); setWithholdingTax("500"); setOtherDeductions("300"); clearResult();
  };

  const clearAll = () => {
    setBaseSalary(""); setOvertime(""); setAllowances(""); setBonus(""); setSocialSecurityMode("auto");
    setSocialSecurityWage(""); setManualSocialSecurity(""); setProvidentFundRate("");
    setWithholdingTax(""); setOtherDeductions(""); clearResult();
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-5 border-sky-500/30 bg-sky-500/5">
        <Info className="text-sky-600" />
        <AlertTitle>ใช้ตรวจยอดรับสุทธิ ไม่ได้สร้างสลิปเงินเดือน</AlertTitle>
        <AlertDescription>กรอกรายรับและรายการหักของเดือนเดียวกันเพื่อเทียบกับสลิปจริง ข้อมูลทั้งหมดคำนวณใน Browser และผลลัพธ์ไม่ใช่เอกสารรับรองรายได้</AlertDescription>
      </Alert>

      <section aria-labelledby="salary-income-title">
        <h2 id="salary-income-title" className="mb-4 flex items-center gap-2 font-semibold"><PlusCircle className="size-4 text-emerald-600" />รายรับของเดือนนี้</h2>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          <MoneyField id="salary-base" label="เงินเดือน (บาท)" value={baseSalary} onChange={update(setBaseSalary)} placeholder="30000" />
          <MoneyField id="salary-overtime" label="ค่าล่วงเวลา OT (บาท)" value={overtime} onChange={update(setOvertime)} placeholder="2000" />
          <MoneyField id="salary-allowances" label="ค่าตำแหน่ง / เบี้ยเลี้ยง / รายได้อื่น (บาท)" value={allowances} onChange={update(setAllowances)} placeholder="1500" />
          <MoneyField id="salary-bonus" label="โบนัส / คอมมิชชันที่จ่ายเดือนนี้ (บาท)" value={bonus} onChange={update(setBonus)} />
        </div>
      </section>

      <section className="mt-6 border-t pt-6" aria-labelledby="salary-deduction-title">
        <h2 id="salary-deduction-title" className="mb-4 flex items-center gap-2 font-semibold"><MinusCircle className="size-4 text-rose-600" />รายการหักของเดือนนี้</h2>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="salary-sso-mode" className="leading-5 md:min-h-10 md:items-start">วิธีใส่ประกันสังคม</Label>
            <Select value={socialSecurityMode} onValueChange={(value) => { setSocialSecurityMode(value as SocialSecurityMode); clearResult(); }}>
              <SelectTrigger id="salary-sso-mode" className="w-full" aria-label="วิธีใส่ประกันสังคม"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">คำนวณมาตรา 33 ปี 2569 อัตโนมัติ</SelectItem>
                <SelectItem value="manual">กรอกยอดที่หักจริงจากสลิป</SelectItem>
                <SelectItem value="none">ไม่มีรายการหักประกันสังคม</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ถ้าสลิปจริงต่างจากสูตร ให้เลือกกรอกยอดจริง</p>
          </div>

          {socialSecurityMode === "auto" ? <MoneyField id="salary-sso-wage" label="ค่าจ้างที่ใช้ส่งประกันสังคม (บาท)" value={socialSecurityWage} onChange={update(setSocialSecurityWage)} placeholder={baseSalary || "30000"} hint="เว้นว่างเพื่อใช้เงินเดือนเป็นฐาน สูงสุด 17,500 บาท" /> : null}
          {socialSecurityMode === "manual" ? <MoneyField id="salary-sso-manual" label="ประกันสังคมที่หักจริง (บาท)" value={manualSocialSecurity} onChange={update(setManualSocialSecurity)} placeholder="875" /> : null}

          <div className="space-y-2">
            <Label htmlFor="salary-provident-rate" className="leading-5 md:min-h-10 md:items-start">กองทุนสำรองเลี้ยงชีพ (% ของเงินเดือน)</Label>
            <Input id="salary-provident-rate" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={providentFundRate} onChange={(event) => update(setProvidentFundRate)(event.target.value)} placeholder="3" />
            <p className="text-xs leading-5 text-muted-foreground">กรอก 0 หรือเว้นว่าง หากไม่มีรายการนี้</p>
          </div>
          <MoneyField id="salary-withholding-tax" label="ภาษีหัก ณ ที่จ่ายในสลิป (บาท)" value={withholdingTax} onChange={update(setWithholdingTax)} placeholder="500" hint="ใช้ยอดในเดือนนี้ ไม่ใช่ภาษีทั้งปี" />
          <MoneyField id="salary-other-deductions" label="รายการหักอื่น เช่น กู้สวัสดิการ (บาท)" value={otherDeductions} onChange={update(setOtherDeductions)} placeholder="300" />
        </div>
      </section>

      <div className="mt-6 border-t pt-5">
        <ActionBar>
          <Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณเงินเดือนสุทธิ</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clearAll} />
          {result ? <CopyButton value={summaryText(result)} label="คัดลอกสรุป" /> : null}
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5">
        {!result ? <EmptyOutput size="compact" text="กรอกรายรับและรายการหัก แล้วกดคำนวณเพื่อดูยอดรับสุทธิ" /> : (
          <div className="space-y-5" aria-live="polite">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResultCard label="เงินเดือนสุทธิ" value={moneyFormatter.format(result.netPay)} emphasized testId="salary-net-pay" />
              <ResultCard label="รายรับรวม" value={moneyFormatter.format(result.grossIncome)} />
              <ResultCard label="รายการหักรวม" value={moneyFormatter.format(result.totalDeductions)} />
              <ResultCard label="สัดส่วนรายการหัก" value={`${percentFormatter.format(result.deductionRate)}%`} />
            </div>

            {result.netPay < 0 ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>รายการหักมากกว่ารายรับ</AlertTitle>
                <AlertDescription>ตรวจตัวเลขและสอบถามฝ่ายบุคคลก่อนสรุปยอด เพราะผลลัพธ์ติดลบอาจเกิดจากรายการค้างชำระหรือกรอกข้อมูลผิด</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3 rounded-xl border bg-muted/15 p-4 sm:p-5" aria-labelledby="salary-income-breakdown-title">
                <h2 id="salary-income-breakdown-title" className="flex items-center gap-2 font-semibold"><PlusCircle className="size-4 text-emerald-600" />รายละเอียดรายรับ</h2>
                <Row label="เงินเดือน" value={moneyFormatter.format(parseMoney(baseSalary, "เงินเดือน"))} />
                <Row label="ค่าล่วงเวลา OT" value={moneyFormatter.format(parseMoney(overtime, "ค่าล่วงเวลา"))} />
                <Row label="ค่าตำแหน่งและรายได้อื่น" value={moneyFormatter.format(parseMoney(allowances, "รายได้อื่น"))} />
                <Row label="โบนัส / คอมมิชชัน" value={moneyFormatter.format(parseMoney(bonus, "โบนัส"))} />
                <Row label="รายรับรวม" value={moneyFormatter.format(result.grossIncome)} strong />
              </section>
              <section className="space-y-3 rounded-xl border bg-muted/15 p-4 sm:p-5" aria-labelledby="salary-deduction-breakdown-title">
                <h2 id="salary-deduction-breakdown-title" className="flex items-center gap-2 font-semibold"><MinusCircle className="size-4 text-rose-600" />รายละเอียดรายการหัก</h2>
                <Row label="ประกันสังคม" value={moneyFormatter.format(result.socialSecurity)} />
                <Row label="กองทุนสำรองเลี้ยงชีพ" value={moneyFormatter.format(result.providentFund)} />
                <Row label="ภาษีหัก ณ ที่จ่าย" value={moneyFormatter.format(result.withholdingTax)} />
                <Row label="รายการหักอื่น" value={moneyFormatter.format(result.otherDeductions)} />
                <Row label="รายการหักรวม" value={moneyFormatter.format(result.totalDeductions)} strong />
              </section>
            </div>

            <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><WalletCards className="size-4 text-primary" />สูตรตรวจยอด</div>
              <p className="mt-2 text-lg font-semibold tabular-nums">{moneyFormatter.format(result.grossIncome)} − {moneyFormatter.format(result.totalDeductions)} = {moneyFormatter.format(result.netPay)}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">รายรับรวม − รายการหักรวม = เงินเดือนสุทธิ หากต้องการประมาณภาษีทั้งปี ให้ใช้ <Link className="font-medium text-primary hover:underline" href="/thai-income-tax-calculator">เครื่องมือคำนวณภาษีเงินได้บุคคลธรรมดา</Link></p>
            </div>

            {socialSecurityMode === "auto" ? (
              <div className="rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
                <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ประกันสังคมอัตโนมัติใช้ฐานค่าจ้าง {moneyFormatter.format(result.socialSecurityWageBase)} × 5% ตามเพดานมาตรา 33 ปี 2569–2571 สูงสุด {moneyFormatter.format(THAI_SSO_M33_RULESET_2569.maximumEmployeeContribution)} ต่อเดือน อ้างอิง <a className="font-medium text-primary hover:underline" href="https://songkhla.prd.go.th/th/content/category/detail/id/33/iid/477946" target="_blank" rel="noreferrer">กรมประชาสัมพันธ์</a> ตรวจทานล่าสุด 3 สิงหาคม 2569</span></p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </WorkspaceFrame>
  );
}
