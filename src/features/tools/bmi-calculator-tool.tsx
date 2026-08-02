"use client";

import { Activity, Calculator } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateBmi, type BmiResult } from "@/lib/tools/calculators";

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 });

function parseRequiredNumber(value: string, label: string): number {
  if (!value.trim()) throw new Error(`กรุณากรอก${label}`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ไม่ถูกต้อง`);
  return parsed;
}

export function BmiCalculatorTool() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState<BmiResult | null>(null);
  const [error, setError] = useState("");
  const clearResult = () => { setResult(null); setError(""); };

  const calculate = () => {
    try {
      setResult(calculateBmi(parseRequiredNumber(weight, "น้ำหนัก"), parseRequiredNumber(height, "ส่วนสูง")));
      setError("");
      toast.success("คำนวณ BMI แล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณ BMI ไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="bmi-weight">น้ำหนัก (กิโลกรัม)</Label><Input id="bmi-weight" type="number" min="1" max="500" step="0.1" value={weight} onChange={(event) => { setWeight(event.target.value); clearResult(); }} placeholder="70" /></div>
        <div><Label htmlFor="bmi-height">ส่วนสูง (เซนติเมตร)</Label><Input id="bmi-height" type="number" min="50" max="250" step="0.1" value={height} onChange={(event) => { setHeight(event.target.value); clearResult(); }} placeholder="175" /></div>
      </div>
      <div className="mt-4"><ActionBar><Button onClick={calculate}><Calculator className="size-4" />คำนวณ BMI</Button><ExampleButton onExample={() => { setWeight("70"); setHeight("175"); clearResult(); }} /><ClearButton onClear={() => { setWeight(""); setHeight(""); clearResult(); }} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        {result ? <div className="space-y-4" aria-live="polite"><div className="rounded-xl border border-primary/25 bg-primary/5 p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="size-4 text-primary" />ดัชนีมวลกายสำหรับผู้ใหญ่</div><p className="mt-2 text-4xl font-bold text-primary tabular-nums" data-testid="bmi-result">{numberFormatter.format(result.bmi)}</p><p className="mt-1 font-semibold">{result.category}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">ช่วงน้ำหนักที่ BMI 18.5–24.9</p><p className="mt-1 text-lg font-semibold tabular-nums">{numberFormatter.format(result.healthyWeightMin)}–{numberFormatter.format(result.healthyWeightMax)} กก.</p></div><div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">สูตรที่ใช้</p><p className="mt-1 text-sm font-medium">น้ำหนัก (กก.) ÷ ส่วนสูง² (เมตร)</p></div></div><p className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-5 text-muted-foreground">ใช้เกณฑ์ WHO สำหรับผู้ใหญ่อายุมากกว่า 20 ปี BMI เป็นเพียงตัวชี้วัดคัดกรองและไม่ใช่การวินิจฉัย เด็ก วัยรุ่น ผู้ตั้งครรภ์ นักกีฬา หรือผู้ที่มีมวลกล้ามเนื้อสูงควรใช้การประเมินที่เหมาะกับแต่ละบุคคล · <a className="font-medium text-primary hover:underline" href="https://www.who.int/europe/news-room/fact-sheets/item/nutrition---maintaining-a-healthy-lifestyle" target="_blank" rel="noreferrer">อ่านเกณฑ์จาก WHO</a></p></div> : <EmptyOutput size="compact" text="กรอกน้ำหนักและส่วนสูงเพื่อคำนวณ BMI" />}
      </div>
    </WorkspaceFrame>
  );
}
