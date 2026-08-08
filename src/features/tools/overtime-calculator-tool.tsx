"use client";

import { Calculator, Clock3, Info, Landmark, Scale, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateOvertime,
  THAI_OVERTIME_RULESET,
  type HolidayPayEntitlement,
  type OvertimeCalculationResult,
  type WageType,
} from "@/lib/tools/overtime";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

const wageTypeLabels: Record<WageType, string> = {
  monthly: "รายเดือน",
  daily: "รายวัน",
  hourly: "รายชั่วโมง",
};

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function parseOptionalHours(value: string, label: string): number {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled = false,
  min = 0,
  max = 100_000_000,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ResultCard({ label, value, testId, emphasized = false }: { label: string; value: string; testId?: string; emphasized?: boolean }) {
  return (
    <div className={emphasized ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : "rounded-xl border bg-muted/15 p-4"}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-primary tabular-nums" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p>
    </div>
  );
}

function BreakdownRow({ label, formula, amount }: { label: string; formula: string; amount: number }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{formula}</p>
      </div>
      <p className="font-semibold tabular-nums sm:text-right">{moneyFormatter.format(amount)}</p>
    </div>
  );
}

function buildSummary(result: OvertimeCalculationResult, input: { wageType: WageType; wageAmount: string; workdayHours: string; holidayHours: string; holidayOvertimeHours: string; entitlement: HolidayPayEntitlement }) {
  const lines = [
    "สรุปคำนวณโอที — Meaw Tools",
    `ประเภทค่าจ้าง: ${wageTypeLabels[input.wageType]} (${moneyFormatter.format(Number(input.wageAmount))})`,
    `ฐานค่าจ้างต่อชั่วโมง: ${moneyFormatter.format(result.hourlyWage)}`,
    `OT วันทำงาน ${input.workdayHours || "0"} ชม. × 1.5 = ${moneyFormatter.format(result.workdayOvertimePay)}`,
    `ทำงานปกติวันหยุด ${input.holidayHours || "0"} ชม. × ${input.entitlement === "entitled" ? "1" : "2"} = ${moneyFormatter.format(result.holidayRegularPay)}`,
    `OT วันหยุด ${input.holidayOvertimeHours || "0"} ชม. × 3 = ${moneyFormatter.format(result.holidayOvertimePay)}`,
    `ค่าจ้างเพิ่มเติมรวม: ${moneyFormatter.format(result.totalAdditionalPay)}`,
  ];
  if (result.estimatedMonthlyGross !== null) lines.push(`เงินเดือนรวมค่าจ้างเพิ่มเติมโดยประมาณ: ${moneyFormatter.format(result.estimatedMonthlyGross)}`);
  lines.push("เป็นเพียงประมาณการตามอัตราขั้นต่ำทั่วไป ควรตรวจสัญญา สลิป และสิทธิจริงกับนายจ้างหรือกรมสวัสดิการและคุ้มครองแรงงาน");
  return lines.join("\n");
}

export function OvertimeCalculatorTool() {
  const [wageType, setWageType] = useState<WageType>("monthly");
  const [wageAmount, setWageAmount] = useState("");
  const [normalHours, setNormalHours] = useState("8");
  const [workdayHours, setWorkdayHours] = useState("");
  const [holidayHours, setHolidayHours] = useState("");
  const [holidayOvertimeHours, setHolidayOvertimeHours] = useState("");
  const [entitlement, setEntitlement] = useState<HolidayPayEntitlement>("entitled");
  const [result, setResult] = useState<OvertimeCalculationResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); clearResult(); };

  const changeWageType = (value: WageType) => {
    setWageType(value);
    setEntitlement(value === "monthly" ? "entitled" : "not-entitled");
    clearResult();
  };

  const calculate = () => {
    try {
      const nextResult = calculateOvertime({
        wageType,
        wageAmount: parseRequiredNumber(wageAmount, "ค่าจ้าง"),
        normalHoursPerDay: parseRequiredNumber(normalHours, "ชั่วโมงทำงานปกติต่อวัน"),
        workdayOvertimeHours: parseOptionalHours(workdayHours, "ชั่วโมง OT วันทำงาน"),
        holidayRegularHours: parseOptionalHours(holidayHours, "ชั่วโมงทำงานปกติในวันหยุด"),
        holidayOvertimeHours: parseOptionalHours(holidayOvertimeHours, "ชั่วโมง OT ในวันหยุด"),
        holidayPayEntitlement: entitlement,
      });
      setResult(nextResult);
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณค่าล่วงเวลาไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setWageType("monthly");
    setWageAmount("30000");
    setNormalHours("8");
    setWorkdayHours("10");
    setHolidayHours("8");
    setHolidayOvertimeHours("4");
    setEntitlement("entitled");
    clearResult();
  };

  const clearAll = () => {
    setWageType("monthly");
    setWageAmount("");
    setNormalHours("8");
    setWorkdayHours("");
    setHolidayHours("");
    setHolidayOvertimeHours("");
    setEntitlement("entitled");
    clearResult();
  };

  const holidayMultiplier = entitlement === "entitled" ? 1 : 2;
  const summary = result ? buildSummary(result, { wageType, wageAmount, workdayHours, holidayHours, holidayOvertimeHours, entitlement }) : "";

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
        <Scale className="text-amber-600" />
        <AlertTitle>เครื่องมือประมาณการ ไม่ใช่คำวินิจฉัยสิทธิทางกฎหมาย</AlertTitle>
        <AlertDescription className="leading-6">
          ใช้อัตราขั้นต่ำทั่วไป 1.5, 1/2 และ 3 เท่า สิทธิจริงอาจต่างตามประเภทวันหยุด ลักษณะงาน ข้อยกเว้น ข้อตกลง และอัตราที่นายจ้างให้สูงกว่า โปรดตรวจสัญญาและสลิปก่อนใช้อ้างอิง
        </AlertDescription>
      </Alert>

      <section aria-labelledby="overtime-wage-title">
        <h2 id="overtime-wage-title" className="mb-5 flex items-center gap-2 font-semibold"><WalletCards className="size-4 text-primary" />ฐานค่าจ้าง</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="overtime-wage-type" className="leading-5">ประเภทค่าจ้าง</Label>
            <Select value={wageType} onValueChange={(value) => changeWageType(value as WageType)}>
              <SelectTrigger id="overtime-wage-type" className="w-full" aria-label="ประเภทค่าจ้าง"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">รายเดือน</SelectItem>
                <SelectItem value="daily">รายวัน</SelectItem>
                <SelectItem value="hourly">รายชั่วโมง</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">ใช้กำหนดวิธีหาอัตราค่าจ้างต่อชั่วโมง</p>
          </div>
          <NumberField
            id="overtime-wage-amount"
            label={`ค่าจ้าง${wageTypeLabels[wageType]} (บาท)`}
            value={wageAmount}
            onChange={update(setWageAmount)}
            placeholder={wageType === "monthly" ? "30000" : wageType === "daily" ? "800" : "120"}
            min={0.01}
            hint={wageType === "monthly" ? "ใช้ค่าจ้างรายเดือน ÷ 30 ÷ ชั่วโมงทำงานปกติต่อวัน" : wageType === "daily" ? "ใช้ค่าจ้างรายวัน ÷ ชั่วโมงทำงานปกติต่อวัน" : "ใช้จำนวนนี้เป็นฐานต่อชั่วโมงโดยตรง"}
          />
          <NumberField
            id="overtime-normal-hours"
            label="ชั่วโมงทำงานปกติต่อวัน"
            value={normalHours}
            onChange={update(setNormalHours)}
            placeholder="8"
            min={0.01}
            max={24}
            hint={wageType === "hourly" ? "ไม่ถูกนำไปหารซ้ำเมื่อเลือกค่าจ้างรายชั่วโมง" : "กรอกเวลาทำงานปกติตามสัญญา ค่าเริ่มต้น 8 ชั่วโมง"}
          />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="overtime-hours-title">
        <h2 id="overtime-hours-title" className="mb-5 flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />ชั่วโมงที่ต้องการคำนวณ</h2>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="overtime-workday-hours" label="OT หลังเวลางานในวันทำงาน (ชั่วโมง)" value={workdayHours} onChange={update(setWorkdayHours)} placeholder="10" max={744} hint="อัตราขั้นต่ำ 1.5 เท่าของค่าจ้างต่อชั่วโมง" />
          <NumberField id="overtime-holiday-hours" label="ทำงานเวลาปกติในวันหยุด (ชั่วโมง)" value={holidayHours} onChange={update(setHolidayHours)} placeholder="8" max={744} hint={`ใช้ ${holidayMultiplier} เท่า ตามตัวเลือกสิทธิค่าจ้างวันหยุดด้านล่าง`} />
          <NumberField id="overtime-holiday-ot-hours" label="OT นอกเวลาปกติในวันหยุด (ชั่วโมง)" value={holidayOvertimeHours} onChange={update(setHolidayOvertimeHours)} placeholder="4" max={744} hint="อัตราขั้นต่ำ 3 เท่าของค่าจ้างต่อชั่วโมง" />
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border bg-muted/15 p-4 sm:p-5">
          <Label htmlFor="overtime-holiday-entitlement" className="leading-5">ได้รับค่าจ้างของวันหยุดนี้อยู่แล้วหรือไม่?</Label>
          <Select value={entitlement} onValueChange={(value) => { setEntitlement(value as HolidayPayEntitlement); clearResult(); }}>
            <SelectTrigger id="overtime-holiday-entitlement" className="w-full md:max-w-xl" aria-label="สิทธิค่าจ้างวันหยุด"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entitled">ได้รับอยู่แล้ว — คิดเงินเพิ่มอย่างน้อย 1 เท่า</SelectItem>
              <SelectItem value="not-entitled">ไม่ได้รับอยู่แล้ว — คิดอย่างน้อย 2 เท่า</SelectItem>
            </SelectContent>
          </Select>
          <p className="max-w-4xl text-xs leading-5 text-muted-foreground">ระบบตั้งต้น “ได้รับอยู่แล้ว” สำหรับรายเดือน และ “ไม่ได้รับอยู่แล้ว” สำหรับรายวัน/รายชั่วโมง แต่วันหยุดประจำสัปดาห์ วันหยุดตามประเพณี และวันหยุดพักผ่อนอาจมีสิทธิต่างกัน คุณต้องเลือกตามสิทธิจริงของวันนั้น</p>
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600" onClick={calculate}><Calculator className="size-4" />คำนวณโอที</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clearAll} />
          {result ? <CopyButton value={summary} label="คัดลอกสรุป" /> : null}
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5">
        {!result ? <EmptyOutput size="compact" text="กรอกค่าจ้างและชั่วโมง แล้วกดคำนวณเพื่อดูอัตรา สูตร และยอดแยกรายการ" /> : (
          <div className="space-y-5" aria-live="polite">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResultCard label="ค่าจ้างเพิ่มเติมรวม" value={moneyFormatter.format(result.totalAdditionalPay)} testId="overtime-total" emphasized />
              <ResultCard label="ฐานค่าจ้างต่อชั่วโมง" value={moneyFormatter.format(result.hourlyWage)} testId="overtime-hourly-wage" />
              <ResultCard label="OT วันทำงานต่อชั่วโมง (1.5 เท่า)" value={moneyFormatter.format(result.workdayOvertimeRate)} />
              <ResultCard label="OT วันหยุดต่อชั่วโมง (3 เท่า)" value={moneyFormatter.format(result.holidayOvertimeRate)} />
            </div>

            {result.estimatedMonthlyGross !== null ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">เงินเดือนรวมค่าจ้างเพิ่มเติมโดยประมาณ</p>
                <p data-testid="overtime-monthly-gross" className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums dark:text-emerald-400">{moneyFormatter.format(result.estimatedMonthlyGross)}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">ยังไม่รวมโบนัส เบี้ยเลี้ยง ภาษี ประกันสังคม กองทุน หรือรายการหักอื่น</p>
              </div>
            ) : null}

            <section className="rounded-xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="overtime-breakdown-title">
              <h2 id="overtime-breakdown-title" className="font-semibold">รายละเอียดสูตร</h2>
              <div className="mt-2">
                <BreakdownRow label="OT วันทำงาน" formula={`${numberFormatter.format(result.hourlyWage)} × 1.5 × ${workdayHours || "0"} ชั่วโมง`} amount={result.workdayOvertimePay} />
                <BreakdownRow label="ทำงานเวลาปกติในวันหยุด" formula={`${numberFormatter.format(result.hourlyWage)} × ${holidayMultiplier} × ${holidayHours || "0"} ชั่วโมง`} amount={result.holidayRegularPay} />
                <BreakdownRow label="OT ในวันหยุด" formula={`${numberFormatter.format(result.hourlyWage)} × 3 × ${holidayOvertimeHours || "0"} ชั่วโมง`} amount={result.holidayOvertimePay} />
              </div>
            </section>
          </div>
        )}
      </div>

      <section className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground" aria-labelledby="overtime-sources-title">
        <h2 id="overtime-sources-title" className="flex items-center gap-2 text-sm font-semibold text-foreground"><Landmark className="size-4 text-primary" />หลักเกณฑ์และแหล่งอ้างอิง</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>รายเดือน: ฐานต่อชั่วโมง = ค่าจ้างรายเดือน ÷ 30 ÷ ชั่วโมงทำงานปกติเฉลี่ยต่อวัน ตามมาตรา 68</li>
          <li>OT วันทำงานอย่างน้อย 1.5 เท่า และ OT วันหยุดอย่างน้อย 3 เท่า</li>
          <li>ทำงานเวลาปกติในวันหยุด: เพิ่ม 1 เท่าเมื่อมีสิทธิได้รับค่าจ้างวันหยุดอยู่แล้ว หรือ 2 เท่าเมื่อไม่มีสิทธินั้น</li>
        </ul>
        <p className="mt-3 flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ตรวจทานกฎเมื่อ {new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(`${THAI_OVERTIME_RULESET.reviewedAt}T00:00:00+07:00`))} จาก <a className="font-medium text-primary hover:underline" href="https://www.mol.go.th/forums/topic/%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99%E0%B8%84%E0%B9%88%E0%B8%B2%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A5%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2-2" target="_blank" rel="noreferrer">กระทรวงแรงงาน: ค่าล่วงเวลา</a>, <a className="font-medium text-primary hover:underline" href="https://www.mol.go.th/forums/topic/%E0%B8%AA%E0%B8%AD%E0%B8%9A%E0%B8%96%E0%B8%B2%E0%B8%A1-%E0%B9%80%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%97%E0%B8%B3%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B9%83%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%AB%E0%B8%A2%E0%B8%B8%E0%B8%94%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%82%E0%B8%B1%E0%B8%95%E0%B8%A4%E0%B8%81%E0%B8%A9%E0%B9%8C" target="_blank" rel="noreferrer">กระทรวงแรงงาน: ค่าทำงานวันหยุด</a> และ <a className="font-medium text-primary hover:underline" href="https://tdc.mi.th/assets/pdf/regulations/002/%E0%B8%9E.%E0%B8%A3.%E0%B8%9A.%E0%B8%84%E0%B8%B8%E0%B9%89%E0%B8%A1%E0%B8%84%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B9%81%E0%B8%A3%E0%B8%87%E0%B8%87%E0%B8%B2%E0%B8%99%20%E0%B8%9E.%E0%B8%A8.%202541.pdf" target="_blank" rel="noreferrer">พ.ร.บ. คุ้มครองแรงงาน</a> หากกรณีซับซ้อนควรสอบถามกรมสวัสดิการและคุ้มครองแรงงาน สายด่วน 1506 กด 3 หรือ 1546</span></p>
        <p className="mt-2">ข้อมูลทั้งหมดคำนวณใน Browser และ Meaw Tools ไม่ได้รับหรือบันทึกค่าจ้างที่กรอก</p>
      </section>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">คำนวณยอดสุทธิหลังรายการหักต่อได้ที่ <Link className="font-medium text-primary hover:underline" href="/salary-calculator">คำนวณเงินเดือนสุทธิและตรวจสลิป</Link> หรือประมาณภาษีทั้งปีที่ <Link className="font-medium text-primary hover:underline" href="/thai-income-tax-calculator">คำนวณภาษีเงินได้บุคคลธรรมดา</Link></p>
    </WorkspaceFrame>
  );
}
