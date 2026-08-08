"use client";

import { BadgeDollarSign, Calculator, Landmark, Percent, ReceiptText, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, CopyButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  calculateVat,
  THAILAND_VAT_RATE,
  THAILAND_VAT_RATE_VALID_THROUGH,
  THAILAND_VAT_RATE_VERIFIED_AT,
  THAILAND_VAT_SOURCE_URL,
  THAILAND_WITHHOLDING_SOURCE_URL,
  type VatAmountMode,
  type VatCalculationResult,
} from "@/lib/tools/vat-calculator";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });

function parseAmount(value: string): number {
  if (!value.trim()) throw new Error("กรุณากรอกยอดเงิน");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("ยอดเงินไม่ถูกต้อง");
  return parsed;
}

function parseRate(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ไม่ถูกต้อง`);
  return parsed;
}

function MoneyStat({ label, value, emphasized = false, testId }: { label: string; value: number; emphasized?: boolean; testId?: string }) {
  return (
    <div className={emphasized ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : "rounded-xl border bg-muted/15 p-4"}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-primary tabular-nums" : "mt-1 text-lg font-semibold tabular-nums"}>{moneyFormatter.format(value)}</p>
    </div>
  );
}

function summaryText(result: VatCalculationResult): string {
  const lines = [
    `รูปแบบ: ${result.amountMode === "exclusive" ? "ราคายังไม่รวม VAT" : "ราคารวม VAT แล้ว"}`,
    `ฐานก่อน VAT: ${moneyFormatter.format(result.vatBase)}`,
  ];
  if (result.serviceCharge > 0) lines.push(`Service Charge ${numberFormatter.format(result.serviceChargeRate)}%: ${moneyFormatter.format(result.serviceCharge)}`);
  lines.push(`VAT ${numberFormatter.format(result.vatRate)}%: ${moneyFormatter.format(result.vat)}`);
  lines.push(`ยอดรวม VAT: ${moneyFormatter.format(result.grossTotal)}`);
  if (result.withholdingRate > 0) {
    lines.push(`หัก ณ ที่จ่าย ${numberFormatter.format(result.withholdingRate)}%: ${moneyFormatter.format(result.withholdingTax)}`);
    lines.push(`ยอดจ่ายสุทธิ: ${moneyFormatter.format(result.netPayment)}`);
  }
  lines.push("ผลประมาณการจาก Meaw Tools — โปรดตรวจเอกสารจริงกับผู้ทำบัญชี");
  return lines.join("\n");
}

export function VatCalculatorTool() {
  const [amountMode, setAmountMode] = useState<VatAmountMode>("exclusive");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState(String(THAILAND_VAT_RATE));
  const [serviceChargeRate, setServiceChargeRate] = useState("0");
  const [withholdingEnabled, setWithholdingEnabled] = useState(false);
  const [withholdingRate, setWithholdingRate] = useState("3");
  const [result, setResult] = useState<VatCalculationResult | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setResult(null); setError(""); };
  const changeMode = (mode: VatAmountMode) => {
    setAmountMode(mode);
    if (mode === "inclusive") setServiceChargeRate("0");
    invalidate();
  };
  const calculate = () => {
    try {
      const nextResult = calculateVat({
        amount: parseAmount(amount),
        amountMode,
        vatRate: parseRate(vatRate, "อัตรา VAT"),
        serviceChargeRate: amountMode === "exclusive" ? parseRate(serviceChargeRate, "อัตรา Service Charge") : 0,
        withholdingRate: withholdingEnabled ? parseRate(withholdingRate, "อัตราภาษีหัก ณ ที่จ่าย") : 0,
      });
      setResult(nextResult);
      setError("");
      toast.success(amountMode === "exclusive" ? "คำนวณ VAT แล้ว" : "ถอด VAT แล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณ VAT ไม่สำเร็จ");
    }
  };
  const loadExample = () => {
    setAmountMode("exclusive");
    setAmount("1000");
    setVatRate("7");
    setServiceChargeRate("10");
    setWithholdingEnabled(true);
    setWithholdingRate("3");
    invalidate();
  };
  const clear = () => {
    setAmountMode("exclusive");
    setAmount("");
    setVatRate("7");
    setServiceChargeRate("0");
    setWithholdingEnabled(false);
    setWithholdingRate("3");
    invalidate();
  };

  return (
    <WorkspaceFrame>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Percent className="size-5 text-primary" /><h2 className="font-semibold">คำนวณ VAT และถอด VAT จากราคารวม</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">สูตรอ่านได้ อัตราแก้ไขได้ และคำนวณใน Browser โดยไม่ส่งยอดเงินไป Server</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">VAT ไทย 7% · ตรวจล่าสุด 8 ส.ค. 2569</span>
      </div>

      <Alert className="mt-5 border-emerald-500/30 bg-emerald-500/5">
        <Landmark className="text-emerald-700" />
        <AlertTitle>ค่าเริ่มต้น 7% มีแหล่งอ้างอิงและวันหมดช่วงประกาศ</AlertTitle>
        <AlertDescription className="leading-6">กรมสรรพากรยืนยัน VAT สำหรับการขายสินค้าและบริการทั่วไป 7% และขยายถึง 30 กันยายน 2570 แต่สินค้า บริการ หรือกิจการบางประเภทอาจยกเว้นหรือใช้อัตราอื่น คุณจึงแก้ไขอัตราได้ · <a href={THAILAND_VAT_SOURCE_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">อ่านประกาศกรมสรรพากร</a></AlertDescription>
      </Alert>

      <div className="mt-6 grid gap-7 lg:grid-cols-2">
        <section aria-labelledby="vat-input-title">
          <h3 id="vat-input-title" className="font-semibold">1. กรอกยอดและรูปแบบราคา</h3>
          <p className="mt-1 text-xs text-muted-foreground">เลือกให้ตรงว่ายอดที่มีอยู่รวม VAT แล้วหรือยัง</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="รูปแบบยอด VAT">
            <Button type="button" variant={amountMode === "exclusive" ? "default" : "outline"} aria-pressed={amountMode === "exclusive"} className="min-h-14 justify-start" onClick={() => changeMode("exclusive")}><BadgeDollarSign className="size-4" /><span className="text-left"><span className="block">บวก VAT เพิ่ม</span><span className="block text-xs font-normal opacity-80">ราคายังไม่รวม VAT</span></span></Button>
            <Button type="button" variant={amountMode === "inclusive" ? "default" : "outline"} aria-pressed={amountMode === "inclusive"} className="min-h-14 justify-start" onClick={() => changeMode("inclusive")}><ReceiptText className="size-4" /><span className="text-left"><span className="block">ถอด VAT</span><span className="block text-xs font-normal opacity-80">ราคารวม VAT แล้ว</span></span></Button>
          </div>

          <div className="mt-5 space-y-2.5">
            <Label htmlFor="vat-amount">{amountMode === "exclusive" ? "ราคาก่อน Service Charge และ VAT (บาท)" : "ราคารวม VAT แล้ว (บาท)"}</Label>
            <Input id="vat-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); invalidate(); }} placeholder={amountMode === "exclusive" ? "1000.00" : "1070.00"} autoComplete="off" />
          </div>

          <div className="mt-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="vat-rate">อัตรา VAT (%)</Label><span className="text-xs text-muted-foreground">ค่าเริ่มต้นไทย {THAILAND_VAT_RATE}%</span></div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
              <Input id="vat-rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={vatRate} onChange={(event) => { setVatRate(event.target.value); invalidate(); }} autoComplete="off" />
              {[7, 10, 0].map((rate) => <Button key={rate} type="button" size="sm" variant={vatRate === String(rate) ? "secondary" : "outline"} aria-label={`ตั้ง VAT ${rate}%`} onClick={() => { setVatRate(String(rate)); invalidate(); }}>{rate}%</Button>)}
            </div>
          </div>

          {amountMode === "exclusive" ? (
            <div className="mt-5 rounded-xl border bg-muted/10 p-4">
              <div className="space-y-2.5"><Label htmlFor="vat-service-rate">Service Charge ก่อน VAT (%)</Label><Input id="vat-service-rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={serviceChargeRate} onChange={(event) => { setServiceChargeRate(event.target.value); invalidate(); }} autoComplete="off" /></div>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="อัตรา Service Charge แนะนำ">{[0, 5, 10].map((rate) => <Button key={rate} type="button" size="sm" variant={serviceChargeRate === String(rate) ? "secondary" : "outline"} aria-pressed={serviceChargeRate === String(rate)} onClick={() => { setServiceChargeRate(String(rate)); invalidate(); }}>{rate}%</Button>)}</div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">เครื่องมือนี้คิด Service Charge จากราคาตั้งต้น แล้วใช้ยอดรวมก่อน VAT เป็นฐาน VAT ตรวจลำดับกับบิลหรือข้อตกลงจริงเสมอ</p>
            </div>
          ) : <div className="mt-5 rounded-xl border border-dashed bg-muted/10 p-4 text-xs leading-5 text-muted-foreground">โหมดถอด VAT ถือว่ายอดที่กรอกเป็นยอดรวมสุดท้าย จึงไม่แยก Service Charge ซึ่งไม่สามารถอนุมานจากยอดเดียวได้</div>}

          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <label className="flex min-h-12 items-center justify-between gap-4 text-sm"><span><span className="block font-medium">ประมาณภาษีหัก ณ ที่จ่ายด้วย</span><span className="mt-0.5 block text-xs text-muted-foreground">ปิดเป็นค่าเริ่มต้น เพราะ VAT และหัก ณ ที่จ่ายเป็นคนละภาษี</span></span><Switch checked={withholdingEnabled} onCheckedChange={(checked) => { setWithholdingEnabled(checked); invalidate(); }} aria-label="ประมาณภาษีหัก ณ ที่จ่าย" /></label>
            {withholdingEnabled ? <div className="mt-4 border-t border-amber-500/20 pt-4"><div className="space-y-2.5"><Label htmlFor="vat-withholding-rate">อัตราภาษีหัก ณ ที่จ่าย (%)</Label><Input id="vat-withholding-rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={withholdingRate} onChange={(event) => { setWithholdingRate(event.target.value); invalidate(); }} autoComplete="off" /></div><div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3, 5].map((rate) => <Button key={rate} type="button" size="sm" variant={withholdingRate === String(rate) ? "secondary" : "outline"} aria-label={`ตั้งภาษีหัก ณ ที่จ่าย ${rate}%`} onClick={() => { setWithholdingRate(String(rate)); invalidate(); }}>{rate}%</Button>)}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">คำนวณจากฐานก่อน VAT รวม Service Charge หากมี อัตราจริงขึ้นกับประเภทเงินได้ ผู้จ่าย และผู้รับ เครื่องมือไม่เลือกอัตราแทนคุณ</p></div> : null}
          </div>

          <div className="mt-5"><ActionBar><Button type="button" onClick={calculate}><Calculator className="size-4" />{amountMode === "exclusive" ? "คำนวณ VAT" : "ถอด VAT"}</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
          {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
        </section>

        <section className="min-w-0" aria-labelledby="vat-result-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 id="vat-result-title" className="font-semibold">ผลลัพธ์และสูตรที่ใช้</h3><p className="mt-1 text-xs text-muted-foreground">ปัดแต่ละองค์ประกอบเป็น 2 ตำแหน่งเพื่อแสดงหน่วยสตางค์</p></div>{result ? <CopyButton value={summaryText(result)} label="คัดลอกสรุป" /> : null}</div>

          {!result ? <div className="mt-4"><EmptyOutput text="กรอกยอด เลือกรูปแบบ แล้วกดคำนวณเพื่อดู VAT และยอดสุทธิ" /></div> : (
            <div className="mt-4 space-y-4" aria-live="polite" data-testid="vat-result">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <p className="text-sm text-muted-foreground">{result.withholdingRate > 0 ? "ยอดจ่ายสุทธิหลังหัก ณ ที่จ่าย" : "ยอดรวม VAT"}</p>
                <p data-testid="vat-net-total" className="mt-2 text-3xl font-bold text-primary tabular-nums">{moneyFormatter.format(result.netPayment)}</p>
                {result.withholdingRate > 0 ? <p className="mt-2 text-xs text-muted-foreground">ยอดรวม VAT {moneyFormatter.format(result.grossTotal)} − หัก ณ ที่จ่าย {moneyFormatter.format(result.withholdingTax)}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MoneyStat label="ฐานก่อน VAT" value={result.vatBase} testId="vat-base" />
                <MoneyStat label={`VAT ${numberFormatter.format(result.vatRate)}%`} value={result.vat} emphasized testId="vat-tax" />
                {result.serviceChargeRate > 0 ? <MoneyStat label={`Service Charge ${numberFormatter.format(result.serviceChargeRate)}%`} value={result.serviceCharge} testId="vat-service-charge" /> : null}
                <MoneyStat label="ยอดรวม VAT" value={result.grossTotal} testId="vat-gross-total" />
                {result.withholdingRate > 0 ? <MoneyStat label={`หัก ณ ที่จ่าย ${numberFormatter.format(result.withholdingRate)}%`} value={result.withholdingTax} testId="vat-withholding" /> : null}
              </div>

              <div className="rounded-xl border bg-muted/15 p-4 text-sm leading-7">
                <p className="font-semibold">สูตรคำนวณ</p>
                {result.amountMode === "inclusive" ? <p className="mt-2 text-muted-foreground"><strong className="text-foreground">VAT</strong> = ราคารวม × {numberFormatter.format(result.vatRate)} ÷ {numberFormatter.format(100 + result.vatRate)} = {moneyFormatter.format(result.vat)}</p> : <><p className="mt-2 text-muted-foreground"><strong className="text-foreground">Service Charge</strong> = ราคาตั้งต้น × {numberFormatter.format(result.serviceChargeRate)}% = {moneyFormatter.format(result.serviceCharge)}</p><p className="text-muted-foreground"><strong className="text-foreground">VAT</strong> = ฐานก่อน VAT × {numberFormatter.format(result.vatRate)}% = {moneyFormatter.format(result.vat)}</p></>}
                <p className="text-muted-foreground"><strong className="text-foreground">ยอดรวม VAT</strong> = {moneyFormatter.format(result.vatBase)} + {moneyFormatter.format(result.vat)} = {moneyFormatter.format(result.grossTotal)}</p>
                {result.withholdingRate > 0 ? <p className="text-muted-foreground"><strong className="text-foreground">หัก ณ ที่จ่าย</strong> = ฐานก่อน VAT × {numberFormatter.format(result.withholdingRate)}% = {moneyFormatter.format(result.withholdingTax)}</p> : null}
              </div>

              <Alert className="border-sky-500/30 bg-sky-500/5"><ShieldCheck className="text-sky-700" /><AlertTitle>ผลลัพธ์เป็นตัวช่วยตรวจ ไม่ใช่ใบกำกับภาษี</AlertTitle><AlertDescription className="leading-6">การปัดเศษรายบรรทัด ส่วนลด รายการยกเว้น และฐานภาษีในเอกสารจริงอาจทำให้ยอดต่างกัน ควรยึดเอกสารและคำแนะนำจากผู้ทำบัญชีหรือกรมสรรพากร</AlertDescription></Alert>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-3 border-t pt-5 md:grid-cols-2">
        <div className="flex gap-3 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>ยอดเงินทั้งหมดคำนวณใน Browser ไม่มี API ของ Meaw Tools รับหรือบันทึกข้อมูล</p></div>
        <div className="flex gap-3 text-xs leading-5 text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>ภาษีหัก ณ ที่จ่ายไม่ใช่ VAT และ 3% ไม่ได้ใช้กับทุกกรณี · <a href={THAILAND_WITHHOLDING_SOURCE_URL} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">คู่มือกรมสรรพากร</a></p></div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">ข้อมูลอัตรา VAT preset ตรวจเมื่อ {THAILAND_VAT_RATE_VERIFIED_AT} และประกาศปัจจุบันระบุถึง {THAILAND_VAT_RATE_VALID_THROUGH}; อัตราในอนาคตอาจเปลี่ยน จึงควรตรวจแหล่งทางการก่อนใช้กับเอกสารจริง</p>
    </WorkspaceFrame>
  );
}
