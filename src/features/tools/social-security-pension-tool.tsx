"use client";

import { Calculator, CalendarCheck, CircleAlert, Info, Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calculateSocialSecurityPension,
  THAI_SSO_PENSION_RULESET_CURRENT,
  type SocialSecurityPensionResult,
} from "@/lib/tools/social-security-pension";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label}ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`);
  return parsed;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  step = "1",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="leading-5 md:min-h-10 md:items-start">{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step={step}
        inputMode={step === "1" ? "numeric" : "decimal"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
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

function ConditionRow({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-6">
      {met ? <ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-1 size-4 shrink-0 text-amber-600" />}
      <span>{children}</span>
    </li>
  );
}

function summaryText(result: SocialSecurityPensionResult) {
  const pension = result.monthlyPension === null ? "ยังไม่ครบ 180 เดือน" : moneyFormatter.format(result.monthlyPension);
  return [
    "สรุปประมาณบำนาญประกันสังคม — Meaw Tools",
    `ค่าจ้างเฉลี่ย 60 เดือน: ${moneyFormatter.format(result.averageWageBase)}`,
    `ส่งเงินสมทบ: ${numberFormatter.format(result.contributionMonths)} เดือน`,
    `อัตราบำนาญ: ${numberFormatter.format(result.pensionRate * 100)}%`,
    `บำนาญต่อเดือน: ${pension}`,
    `พร้อมเกิดสิทธิตามข้อมูลที่กรอก: ${result.eligibleNow ? "ใช่" : "ยังไม่ครบทุกเงื่อนไข"}`,
    "หมายเหตุ: เป็นประมาณการสูตร FAE ปัจจุบันสำหรับ ม.33/ม.39 ไม่ใช่ผลรับรองสิทธิและไม่ใช่สูตร CARE",
  ].join("\n");
}

export function SocialSecurityPensionTool() {
  const [averageWageBase, setAverageWageBase] = useState("");
  const [contributionMonths, setContributionMonths] = useState("");
  const [age, setAge] = useState("");
  const [insuredStatus, setInsuredStatus] = useState<"active" | "ended">("active");
  const [result, setResult] = useState<SocialSecurityPensionResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); clearResult(); };

  const calculate = () => {
    try {
      const nextResult = calculateSocialSecurityPension({
        averageWageBase: parseRequiredNumber(averageWageBase, "ค่าจ้างเฉลี่ย 60 เดือน"),
        contributionMonths: parseRequiredNumber(contributionMonths, "จำนวนเดือนที่ส่งเงินสมทบ"),
        age: parseRequiredNumber(age, "อายุ"),
        insuredStatusEnded: insuredStatus === "ended",
      });
      setResult(nextResult);
      setError("");
      toast.success("คำนวณประมาณบำนาญแล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณบำนาญไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setAverageWageBase("15000");
    setContributionMonths("250");
    setAge("60");
    setInsuredStatus("ended");
    clearResult();
  };

  const clearAll = () => {
    setAverageWageBase("");
    setContributionMonths("");
    setAge("");
    setInsuredStatus("active");
    clearResult();
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-5 border-amber-500/30 bg-amber-500/5">
        <Info className="text-amber-600" />
        <AlertTitle>คำนวณด้วยสูตร FAE ที่ยังใช้ปัจจุบัน</AlertTitle>
        <AlertDescription className="leading-6">
          สูตร CARE ผ่านความเห็นชอบในระดับร่างเมื่อ 14 กรกฎาคม 2569 แต่จะมีผลหลังประกาศราชกิจจานุเบกษาแล้ว 180 วัน เครื่องมือนี้จึงยังไม่ใช้ CARE และตรวจทานสถานะล่าสุด 3 สิงหาคม 2569
        </AlertDescription>
      </Alert>

      <section aria-labelledby="sso-pension-input-title">
        <h2 id="sso-pension-input-title" className="mb-4 flex items-center gap-2 font-semibold"><Landmark className="size-4 text-primary" />ข้อมูลสำหรับประมาณบำนาญ</h2>
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          <Field
            id="pension-average-wage"
            label={`ค่าจ้างเฉลี่ย ${THAI_SSO_PENSION_RULESET_CURRENT.wageAveragingMonths} เดือนสุดท้ายที่ใช้ส่งเงินสมทบ (บาท)`}
            value={averageWageBase}
            onChange={update(setAverageWageBase)}
            placeholder="15000"
            step="0.01"
            hint="ไม่ใช่เงินเดือนล่าสุด หากเคยอยู่ทั้ง ม.33 และ ม.39 ให้ใช้ฐานที่ส่งจริง"
          />
          <Field
            id="pension-contribution-months"
            label="จำนวนเดือนที่ส่งเงินสมทบทั้งหมด"
            value={contributionMonths}
            onChange={update(setContributionMonths)}
            placeholder="250"
            hint="ตรวจจากประวัติการส่งเงินสมทบ ไม่ควรเดาจากอายุงาน"
          />
          <Field
            id="pension-age"
            label="อายุปัจจุบัน (ปีเต็ม)"
            value={age}
            onChange={update(setAge)}
            placeholder="60"
            hint={`สิทธิบำนาญชราภาพปกติต้องอายุครบ ${THAI_SSO_PENSION_RULESET_CURRENT.eligibilityAge} ปี`}
          />
          <div className="space-y-2">
            <Label htmlFor="pension-insured-status" className="leading-5 md:min-h-10 md:items-start">สถานะความเป็นผู้ประกันตน</Label>
            <div className="pt-2">
              <Select value={insuredStatus} onValueChange={(value) => { setInsuredStatus(value as "active" | "ended"); clearResult(); }}>
                <SelectTrigger id="pension-insured-status" className="w-full" aria-label="สถานะความเป็นผู้ประกันตน"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ยังเป็นผู้ประกันตนอยู่</SelectItem>
                  <SelectItem value="ended">สิ้นสุดความเป็นผู้ประกันตนแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">ต้องสิ้นสุดความเป็นผู้ประกันตนก่อนจึงเกิดสิทธิรับบำนาญ</p>
          </div>
        </div>
      </section>

      <div className="mt-6 border-t pt-5">
        <ActionBar>
          <Button type="button" onClick={calculate}><Calculator className="size-4" />คำนวณบำนาญประกันสังคม</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clearAll} />
          {result ? <CopyButton value={summaryText(result)} label="คัดลอกสรุป" /> : null}
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5">
        {!result ? <EmptyOutput size="compact" text="กรอกฐานค่าจ้าง จำนวนเดือน อายุ และสถานะ แล้วกดคำนวณ" /> : (
          <div className="space-y-5" aria-live="polite">
            {result.monthlyPension === null ? (
              <Alert>
                <CalendarCheck />
                <AlertTitle>ยังไม่ครบเกณฑ์บำนาญ {THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths} เดือน</AlertTitle>
                <AlertDescription>ขาดอีก {numberFormatter.format(result.monthsToPensionThreshold)} เดือน จึงยังไม่แสดงบำนาญรายเดือน กรณีส่งไม่ครบ {THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths} เดือนอาจเป็นสิทธิบำเหน็จซึ่งเครื่องมือนี้ไม่คำนวณ</AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ResultCard label="ประมาณบำนาญต่อเดือน" value={moneyFormatter.format(result.monthlyPension)} emphasized testId="sso-pension-monthly" />
                <ResultCard label="ประมาณต่อปี" value={moneyFormatter.format(result.annualPension ?? 0)} />
                <ResultCard label="อัตราบำนาญ" value={`${numberFormatter.format(result.pensionRate * 100)}%`} />
                <ResultCard label="ปีเต็มที่เกิน 180 เดือน" value={`${numberFormatter.format(result.completeExtraYears)} ปี`} />
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border bg-muted/15 p-4 sm:p-5" aria-labelledby="pension-eligibility-title">
                <h2 id="pension-eligibility-title" className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" />ตรวจเงื่อนไขเกิดสิทธิ</h2>
                <ul className="mt-3 space-y-2">
                  <ConditionRow met={result.contributionThresholdMet}>ส่งเงินสมทบครบอย่างน้อย {THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths} เดือน {result.contributionThresholdMet ? "แล้ว" : `(ยังขาด ${numberFormatter.format(result.monthsToPensionThreshold)} เดือน)`}</ConditionRow>
                  <ConditionRow met={result.ageThresholdMet}>อายุครบ {THAI_SSO_PENSION_RULESET_CURRENT.eligibilityAge} ปี {result.ageThresholdMet ? "แล้ว" : "(ยังไม่ครบ)"}</ConditionRow>
                  <ConditionRow met={result.insuredStatusEnded}>สิ้นสุดความเป็นผู้ประกันตน {result.insuredStatusEnded ? "แล้ว" : "(ยังเป็นผู้ประกันตนอยู่)"}</ConditionRow>
                </ul>
                <p data-testid="sso-pension-eligibility" className={result.eligibleNow ? "mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-400" : "mt-4 rounded-lg bg-amber-500/10 p-3 text-sm font-medium text-amber-700 dark:text-amber-400"}>
                  {result.eligibleNow ? "ครบเงื่อนไขหลักตามข้อมูลที่กรอก แต่ยอดจริงต้องให้สำนักงานประกันสังคมวินิจฉัย" : "ยังไม่ครบเงื่อนไขหลักทุกข้อ แม้ระบบจะแสดงยอดประมาณการเมื่อส่งครบ 180 เดือน"}
                </p>
              </section>

              <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5" aria-labelledby="pension-formula-title">
                <h2 id="pension-formula-title" className="flex items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" />สูตรที่ใช้</h2>
                {result.monthlyPension === null ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">ต้องส่งเงินสมทบครบ {THAI_SSO_PENSION_RULESET_CURRENT.minimumContributionMonths} เดือนก่อน สูตรบำนาญรายเดือนจึงเริ่มที่ {numberFormatter.format(THAI_SSO_PENSION_RULESET_CURRENT.basePensionRate * 100)}% ของค่าจ้างเฉลี่ย {THAI_SSO_PENSION_RULESET_CURRENT.wageAveragingMonths} เดือนสุดท้าย</p>
                ) : (
                  <>
                    <p className="mt-3 text-lg font-semibold tabular-nums">{moneyFormatter.format(result.averageWageBase)} × {numberFormatter.format(result.pensionRate * 100)}% = {moneyFormatter.format(result.monthlyPension)}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{numberFormatter.format(THAI_SSO_PENSION_RULESET_CURRENT.basePensionRate * 100)}% พื้นฐาน + ({numberFormatter.format(result.completeExtraYears)} ปีเต็ม × {numberFormatter.format(THAI_SSO_PENSION_RULESET_CURRENT.extraRatePerCompleteYear * 100)}%){result.unusedExtraMonths > 0 ? ` เศษ ${numberFormatter.format(result.unusedExtraMonths)} เดือนไม่เพิ่มอัตราจนกว่าจะครบ 12 เดือน` : ""}</p>
                  </>
                )}
              </section>
            </div>

            <div className="rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
              <p><strong className="text-foreground">แหล่งอ้างอิง:</strong> สูตร 20% และเพิ่ม 1.5% ทุก 12 เดือนเต็มจาก <a className="font-medium text-primary hover:underline" href="https://www.mol.go.th/wp-content/uploads/sites/2/2021/02/15-%E0%B8%81%E0%B8%8E%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%97%E0%B8%A3%E0%B8%A7%E0%B8%87-%E0%B8%81%E0%B8%B3%E0%B8%AB%E0%B8%99%E0%B8%94%E0%B8%AB%E0%B8%A5%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%81%E0%B8%93%E0%B8%91%E0%B9%8C-%E0%B8%A7%E0%B8%B4%E0%B8%98%E0%B8%B5%E0%B8%81%E0%B8%B2%E0%B8%A3-%E0%B8%A3%E0%B8%B0%E0%B8%A2%E0%B8%B0%E0%B9%80%E0%B8%A7%E0%B8%A5%E0%B8%B2-%E0%B8%AD%E0%B8%B1%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%88%E0%B9%88%E0%B8%B2%E0%B8%A2%E0%B8%9B%E0%B8%A2.%E0%B8%97%E0%B8%94%E0%B9%81%E0%B8%97%E0%B8%99%E0%B9%83%E0%B8%99%E0%B8%81%E0%B8%A3%E0%B8%93%E0%B8%B5%E0%B8%8A%E0%B8%A3%E0%B8%B2%E0%B8%A0%E0%B8%B2%E0%B8%9E-%E0%B8%9E.%E0%B8%A8.-2550.pdf" target="_blank" rel="noreferrer">กฎกระทรวง พ.ศ. 2550</a> และสถานะร่าง CARE จาก <a className="font-medium text-primary hover:underline" href="https://www.thaigov.go.th/th/news/166391" target="_blank" rel="noreferrer">รัฐบาลไทย 14 กรกฎาคม 2569</a> ผลจริงขึ้นกับประวัติเงินสมทบและคำวินิจฉัยของสำนักงานประกันสังคม โทร 1506</p>
            </div>
          </div>
        )}
      </div>
    </WorkspaceFrame>
  );
}
