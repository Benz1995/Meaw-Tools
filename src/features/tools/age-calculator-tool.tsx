"use client";

import { CakeSlice, Calculator } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionBar, ClearButton, EmptyOutput, ExampleButton, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAge, type AgeResult } from "@/lib/tools/popular";

const integerFormatter = new Intl.NumberFormat("th-TH");

function localToday(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function AgeStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>;
}

export function AgeCalculatorTool() {
  const [birthDate, setBirthDate] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [result, setResult] = useState<AgeResult | null>(null);
  const [error, setError] = useState("");

  const clearResult = () => { setResult(null); setError(""); };
  const calculate = () => {
    try {
      setResult(calculateAge(birthDate, asOfDate));
      setError("");
      toast.success("คำนวณอายุแล้ว");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณอายุไม่สำเร็จ");
    }
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="age-birth-date">วันเดือนปีเกิด</Label>
          <Input id="age-birth-date" type="date" value={birthDate} onChange={(event) => { setBirthDate(event.target.value); clearResult(); }} />
        </div>
        <div>
          <Label htmlFor="age-as-of-date">คำนวณอายุ ณ วันที่</Label>
          <div className="flex gap-2">
            <Input id="age-as-of-date" type="date" value={asOfDate} onChange={(event) => { setAsOfDate(event.target.value); clearResult(); }} />
            <Button type="button" variant="outline" onClick={() => { setAsOfDate(localToday()); clearResult(); }}>วันนี้</Button>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <ActionBar>
          <Button onClick={calculate}><Calculator className="size-4" />คำนวณอายุ</Button>
          <ExampleButton onExample={() => { setBirthDate("2000-01-15"); setAsOfDate("2026-08-02"); clearResult(); }} />
          <ClearButton onClear={() => { setBirthDate(""); setAsOfDate(""); clearResult(); }} />
        </ActionBar>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        {result ? (
          <div className="space-y-4" aria-live="polite">
            <div className="rounded-xl border bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><CakeSlice className="size-4 text-primary" />อายุปัจจุบัน</div>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl" data-testid="age-result">{integerFormatter.format(result.years)} ปี {integerFormatter.format(result.months)} เดือน {integerFormatter.format(result.days)} วัน</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <AgeStat label="รวมจำนวนวัน" value={`${integerFormatter.format(result.totalDays)} วัน`} />
              <AgeStat label="วันเกิดครั้งถัดไป" value={result.nextBirthday} />
              <AgeStat label="เหลืออีก" value={result.daysUntilBirthday ? `${integerFormatter.format(result.daysUntilBirthday)} วัน` : "วันนี้"} />
            </div>
          </div>
        ) : <EmptyOutput size="compact" text="เลือกวันเกิดและวันที่ต้องการคำนวณ" />}
      </div>
    </WorkspaceFrame>
  );
}
