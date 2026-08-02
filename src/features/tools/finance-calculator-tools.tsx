"use client";

import { BadgeDollarSign, Calculator, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateLoan, calculateProfitMargin, type LoanResult, type ProfitMarginResult } from "@/lib/tools/calculators";

const moneyFormatter = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ไม่ถูกต้อง`);
  return parsed;
}

function ResultStat({ label, value, emphasized = false, testId }: { label: string; value: string; emphasized?: boolean; testId?: string }) {
  return <div data-testid={testId} className={emphasized ? "rounded-xl border border-primary/25 bg-primary/5 p-4" : "rounded-xl border bg-muted/20 p-4"}><p className="text-xs text-muted-foreground">{label}</p><p className={emphasized ? "mt-1 text-xl font-bold text-primary tabular-nums" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p></div>;
}

export function LoanCalculatorTool() {
  const [principal, setPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [term, setTerm] = useState("");
  const [termUnit, setTermUnit] = useState<"years" | "months">("years");
  const [result, setResult] = useState<LoanResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const calculate = () => {
    try {
      const termValue = parseRequiredNumber(term, "ระยะเวลาผ่อน");
      const months = termUnit === "years" ? termValue * 12 : termValue;
      const nextResult = calculateLoan(parseRequiredNumber(principal, "วงเงินกู้"), parseRequiredNumber(annualRate, "อัตราดอกเบี้ย"), months);
      setResult(nextResult);
      setError("");
      toast.success("คำนวณค่างวดแล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณเงินกู้ไม่สำเร็จ");
    }
  };

  const schedulePreview = result ? [...result.schedule.slice(0, 12), ...(result.schedule.length > 12 ? [result.schedule.at(-1)!] : [])] : [];

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
        <div><Label htmlFor="loan-principal">วงเงินกู้ (บาท)</Label><Input id="loan-principal" type="number" min="1" value={principal} onChange={(event) => { setPrincipal(event.target.value); clearResult(); }} placeholder="1000000" /></div>
        <div><Label htmlFor="loan-rate">ดอกเบี้ยต่อปี (%)</Label><Input id="loan-rate" type="number" min="0" max="100" step="0.01" value={annualRate} onChange={(event) => { setAnnualRate(event.target.value); clearResult(); }} placeholder="6" /></div>
        <div><Label htmlFor="loan-term">ระยะเวลาผ่อน</Label><div className="grid grid-cols-[1fr_8rem] gap-2"><Input id="loan-term" type="number" min="1" step="1" value={term} onChange={(event) => { setTerm(event.target.value); clearResult(); }} placeholder="20" /><Select value={termUnit} onValueChange={(value) => { setTermUnit(value as "years" | "months"); clearResult(); }}><SelectTrigger aria-label="หน่วยระยะเวลาผ่อน" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="years">ปี</SelectItem><SelectItem value="months">เดือน</SelectItem></SelectContent></Select></div></div>
      </div>
      <div className="mt-4"><ActionBar><Button onClick={calculate}><Calculator className="size-4" />คำนวณค่างวด</Button><ExampleButton onExample={() => { setPrincipal("1000000"); setAnnualRate("6"); setTerm("20"); setTermUnit("years"); clearResult(); }} /><ClearButton onClear={() => { setPrincipal(""); setAnnualRate(""); setTerm(""); setTermUnit("years"); clearResult(); }} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        {result ? <div className="space-y-4" aria-live="polite">
          <div className="grid gap-3 sm:grid-cols-3"><ResultStat label="ค่างวดต่อเดือนโดยประมาณ" value={moneyFormatter.format(result.monthlyPayment)} emphasized testId="loan-payment" /><ResultStat label="ดอกเบี้ยรวม" value={moneyFormatter.format(result.totalInterest)} /><ResultStat label="ยอดชำระรวม" value={moneyFormatter.format(result.totalPayment)} /></div>
          <div className="overflow-hidden rounded-xl border"><div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3"><p className="text-sm font-semibold">ตารางลดต้นลดดอก</p><p className="text-xs text-muted-foreground">12 งวดแรก{result.schedule.length > 12 ? " และงวดสุดท้าย" : ""}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[42rem] text-right text-sm"><thead className="bg-muted/20 text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left">งวด</th><th className="px-4 py-2">ยอดชำระ</th><th className="px-4 py-2">เงินต้น</th><th className="px-4 py-2">ดอกเบี้ย</th><th className="px-4 py-2">คงเหลือ</th></tr></thead><tbody className="divide-y">{schedulePreview.map((row, index) => <tr key={row.month} className={index === 12 ? "border-t-2" : undefined}><td className="px-4 py-2 text-left tabular-nums">{row.month}</td><td className="px-4 py-2 tabular-nums">{moneyFormatter.format(row.payment)}</td><td className="px-4 py-2 tabular-nums">{moneyFormatter.format(row.principal)}</td><td className="px-4 py-2 tabular-nums">{moneyFormatter.format(row.interest)}</td><td className="px-4 py-2 tabular-nums">{moneyFormatter.format(row.balance)}</td></tr>)}</tbody></table></div></div>
          <p className="text-xs leading-5 text-muted-foreground">ประมาณการแบบลดต้นลดดอก อัตราคงที่ และชำระเท่ากันทุกเดือน ไม่รวมค่าธรรมเนียม ประกัน ภาษี หรือการเปลี่ยนอัตราระหว่างสัญญา · <a className="font-medium text-primary hover:underline" href="https://www.bot.or.th/th/satang-story/rights-responsibility/effectiverate.html" target="_blank" rel="noreferrer">อ่านหลักการจากธนาคารแห่งประเทศไทย</a></p>
        </div> : <EmptyOutput size="compact" text="กรอกวงเงิน ดอกเบี้ย และระยะเวลาเพื่อประมาณค่างวด" />}
      </div>
    </WorkspaceFrame>
  );
}

export function ProfitMarginCalculatorTool() {
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [result, setResult] = useState<ProfitMarginResult | null>(null);
  const [error, setError] = useState("");
  const clearResult = () => { setResult(null); setError(""); };

  const calculate = () => {
    try {
      setResult(calculateProfitMargin(parseRequiredNumber(cost, "ต้นทุนต่อชิ้น"), parseRequiredNumber(price, "ราคาขายต่อชิ้น"), parseRequiredNumber(quantity, "จำนวน")));
      setError("");
      toast.success("คำนวณกำไรแล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณกำไรไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><Label htmlFor="profit-cost">ต้นทุนต่อชิ้น (บาท)</Label><Input id="profit-cost" type="number" min="0" step="0.01" value={cost} onChange={(event) => { setCost(event.target.value); clearResult(); }} placeholder="60" /></div>
        <div><Label htmlFor="profit-price">ราคาขายต่อชิ้น (บาท)</Label><Input id="profit-price" type="number" min="0.01" step="0.01" value={price} onChange={(event) => { setPrice(event.target.value); clearResult(); }} placeholder="100" /></div>
        <div><Label htmlFor="profit-quantity">จำนวน</Label><Input id="profit-quantity" type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => { setQuantity(event.target.value); clearResult(); }} /></div>
      </div>
      <div className="mt-4"><ActionBar><Button onClick={calculate}><BadgeDollarSign className="size-4" />คำนวณกำไร</Button><ExampleButton onExample={() => { setCost("60"); setPrice("100"); setQuantity("10"); clearResult(); }} /><ClearButton onClear={() => { setCost(""); setPrice(""); setQuantity("1"); clearResult(); }} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        {result ? <div className="space-y-4" aria-live="polite"><div className={result.profit >= 0 ? "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5" : "rounded-xl border border-destructive/30 bg-destructive/5 p-5"}><div className="flex items-center gap-2 text-sm text-muted-foreground">{result.profit >= 0 ? <TrendingUp className="size-4 text-emerald-600" /> : <TrendingDown className="size-4 text-destructive" />}{result.profit >= 0 ? "กำไร" : "ขาดทุน"}</div><p className={result.profit >= 0 ? "mt-2 text-3xl font-bold text-emerald-700 tabular-nums dark:text-emerald-300" : "mt-2 text-3xl font-bold text-destructive tabular-nums"} data-testid="profit-result">{moneyFormatter.format(Math.abs(result.profit))}</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ResultStat label="ยอดขายรวม" value={moneyFormatter.format(result.revenue)} /><ResultStat label="ต้นทุนรวม" value={moneyFormatter.format(result.totalCost)} /><ResultStat label="Margin" value={`${percentFormatter.format(result.marginPercent)}%`} emphasized /><ResultStat label="Markup" value={result.markupPercent === null ? "คำนวณไม่ได้เมื่อต้นทุนเป็น 0" : `${percentFormatter.format(result.markupPercent)}%`} /></div><div className="rounded-xl border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground"><p><strong className="text-foreground">Margin</strong> = กำไร ÷ ราคาขาย × 100</p><p><strong className="text-foreground">Markup</strong> = กำไร ÷ ต้นทุน × 100</p></div></div> : <EmptyOutput size="compact" text="กรอกต้นทุน ราคาขาย และจำนวนเพื่อดูผลกำไร" />}
      </div>
    </WorkspaceFrame>
  );
}
