"use client";

import { ClipboardList, Clock3, Download, Info, MoonStar, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  WORKING_HOURS_MAX_BREAK_MINUTES,
  WORKING_HOURS_MAX_ENTRIES,
  calculateWorkingHours,
  formatDecimalHours,
  formatDuration,
  workingHoursCsv,
  type WorkingHoursEntry,
  type WorkingHoursResult,
  type WorkingHoursRounding,
} from "@/lib/tools/working-hours";

type EditableEntry = Omit<WorkingHoursEntry, "breakMinutes"> & { breakMinutes: string };

const EMPTY_ENTRY: EditableEntry = { id: "entry-1", date: "", label: "", startTime: "09:00", endTime: "17:30", breakMinutes: "60" };
const EXAMPLE_ENTRIES: EditableEntry[] = [
  { id: "example-1", date: "2026-08-03", label: "สำนักงาน", startTime: "09:00", endTime: "17:30", breakMinutes: "60" },
  { id: "example-2", date: "2026-08-04", label: "สำนักงาน", startTime: "08:58", endTime: "18:04", breakMinutes: "60" },
  { id: "example-3", date: "2026-08-05", label: "กะกลางคืน", startTime: "22:00", endTime: "06:30", breakMinutes: "30" },
  { id: "example-4", date: "2026-08-06", label: "สำนักงาน", startTime: "09:00", endTime: "17:30", breakMinutes: "60" },
  { id: "example-5", date: "2026-08-07", label: "วันศุกร์", startTime: "09:00", endTime: "16:45", breakMinutes: "45" },
];
const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label>{children}{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function EntryCard({ entry, index, canRemove, onChange, onRemove }: { entry: EditableEntry; index: number; canRemove: boolean; onChange: (patch: Partial<EditableEntry>) => void; onRemove: () => void }) {
  const prefix = `working-entry-${entry.id}`;
  return (
    <fieldset className="rounded-xl border bg-muted/5 p-4 sm:p-5">
      <legend className="sr-only">เวลาทำงานรายการที่ {index + 1}</legend>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">รายการที่ {index + 1}</p><p className="mt-1 text-xs text-muted-foreground">ถ้าเวลาออกน้อยกว่าเวลาเข้า ระบบจะถือว่าเป็นกะข้ามวัน</p></div>
        <Button type="button" size="icon" variant="ghost" disabled={!canRemove} aria-label={`ลบรายการที่ ${index + 1}`} onClick={onRemove}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-3"><Field id={`${prefix}-date`} label="วันที่"><Input id={`${prefix}-date`} type="date" min="1900-01-01" max="2100-12-31" value={entry.date} onChange={(event) => onChange({ date: event.target.value })} /></Field></div>
        <div className="xl:col-span-2"><Field id={`${prefix}-start`} label="เวลาเข้า"><Input id={`${prefix}-start`} type="time" step={60} value={entry.startTime} onChange={(event) => onChange({ startTime: event.target.value })} /></Field></div>
        <div className="xl:col-span-2"><Field id={`${prefix}-end`} label="เวลาออก"><Input id={`${prefix}-end`} type="time" step={60} value={entry.endTime} onChange={(event) => onChange({ endTime: event.target.value })} /></Field></div>
        <div className="xl:col-span-2"><Field id={`${prefix}-break`} label="เวลาพัก (นาที)"><Input id={`${prefix}-break`} type="number" inputMode="numeric" min={0} max={WORKING_HOURS_MAX_BREAK_MINUTES} step={1} value={entry.breakMinutes} onChange={(event) => onChange({ breakMinutes: event.target.value })} /></Field></div>
        <div className="sm:col-span-2 xl:col-span-3"><Field id={`${prefix}-label`} label="หมายเหตุ (ไม่บังคับ)"><Input id={`${prefix}-label`} value={entry.label} maxLength={80} placeholder="เช่น สำนักงาน / ลูกค้า A" onChange={(event) => onChange({ label: event.target.value })} /></Field></div>
      </div>
    </fieldset>
  );
}

function StatCard({ label, value, detail, tone = "default", testId }: { label: string; value: string; detail?: string; tone?: "default" | "success" | "warning"; testId?: string }) {
  const toneClass = tone === "success" ? "border-emerald-500/30 bg-emerald-500/5" : tone === "warning" ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/10";
  return <div className={`rounded-xl border p-4 ${toneClass}`}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>{detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}</div>;
}

function targetLabel(difference: number) {
  if (difference === 0) return "ตรงกับเป้าหมาย";
  return difference > 0 ? `มากกว่าเป้าหมาย ${formatDuration(difference)}` : `ขาดจากเป้าหมาย ${formatDuration(Math.abs(difference))}`;
}

function roundingDifferenceLabel(difference: number) {
  return difference > 0 ? `เพิ่มขึ้น ${formatDuration(difference)}` : `ลดลง ${formatDuration(Math.abs(difference))}`;
}

function ResultPanel({ result, roundingMinutes }: { result: WorkingHoursResult; roundingMinutes: WorkingHoursRounding }) {
  const effectiveMinutes = result.roundedNetMinutes;
  const summary = `รวม ${result.shiftCount} กะ ใน ${result.dateCount} วัน: เวลาก่อนหักพัก ${formatDuration(result.grossMinutes)}, เวลาพัก ${formatDuration(result.breakMinutes)}, สุทธิจริง ${formatDuration(result.netMinutes)} และสุทธิ${roundingMinutes ? `หลังปัดทีละ ${roundingMinutes} นาที` : "ไม่ปัด"} ${formatDuration(effectiveMinutes)} (${formatDecimalHours(effectiveMinutes)} ชั่วโมงทศนิยม)`;
  return (
    <div className="space-y-5" data-testid="working-hours-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={roundingMinutes ? "ชั่วโมงสุทธิหลังปัด" : "ชั่วโมงสุทธิ"} value={formatDuration(effectiveMinutes)} detail={`${formatDecimalHours(effectiveMinutes)} ชั่วโมงทศนิยม`} tone="success" testId="working-hours-total" />
        <StatCard label="เวลาก่อนหักพัก" value={formatDuration(result.grossMinutes)} detail={`${result.shiftCount} กะ · ${result.dateCount} วัน`} />
        <StatCard label="เวลาพักรวม" value={formatDuration(result.breakMinutes)} />
        <StatCard label="กะข้ามวัน" value={`${integerFormatter.format(result.overnightCount)} กะ`} detail={`เฉลี่ยสุทธิ ${formatDuration(result.averageMinutes)}/กะ`} tone={result.overnightCount ? "warning" : "default"} />
      </div>

      {result.targetDifferenceMinutes !== undefined ? (
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 sm:p-5" aria-labelledby="working-target-title">
          <p id="working-target-title" className="text-sm font-semibold">เทียบชั่วโมงเป้าหมาย</p>
          <p data-testid="working-hours-target" className="mt-2 text-xl font-bold tabular-nums">{targetLabel(result.targetDifferenceMinutes)}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">เป้าหมาย {formatDuration(result.targetMinutes ?? 0)} · เปรียบเทียบกับผลรวมหลังใช้นโยบายปัดเวลาที่เลือก</p>
        </section>
      ) : null}

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="working-summary-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><h2 id="working-summary-title" className="font-semibold">สรุปที่ตรวจสอบได้</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{summary}</p>{result.roundingDeltaMinutes ? <p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">การปัดทำให้ผลรวม{roundingDifferenceLabel(result.roundingDeltaMinutes)}จากเวลาจริง กรุณาตรวจนโยบายองค์กรก่อนใช้ลง Timesheet</p> : null}</div>
          <ActionBar>
            <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
            <Button type="button" variant="outline" onClick={() => downloadText(workingHoursCsv(result), "meaw-working-hours.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
          </ActionBar>
        </div>
      </section>

      <section className="rounded-xl border p-4 sm:p-5" aria-labelledby="working-detail-title">
        <div className="mb-4"><h2 id="working-detail-title" className="font-semibold">รายละเอียดแต่ละกะ</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">แสดงเวลาสุทธิจริงและผลหลังปัดแยกกัน เพื่อไม่ให้ตัวเลขถูกเปลี่ยนโดยมองไม่เห็น</p></div>
        <div className="overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="ตารางรายละเอียดชั่วโมงทำงานแบบเลื่อนได้">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-card"><tr className="border-b"><th scope="col" className="px-4 py-3 text-left font-semibold">วันที่ / งาน</th><th scope="col" className="px-4 py-3 text-left font-semibold">เข้า–ออก</th><th scope="col" className="px-4 py-3 text-right font-semibold">พัก</th><th scope="col" className="px-4 py-3 text-right font-semibold">สุทธิจริง</th><th scope="col" className="px-4 py-3 text-right font-semibold">หลังปัด</th><th scope="col" className="px-4 py-3 text-right font-semibold">ทศนิยม</th></tr></thead>
            <tbody>{result.rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="px-4 py-3"><p className="font-mono">{row.date}</p><p className="mt-1 text-xs text-muted-foreground">{row.label || "—"}</p></td><td className="px-4 py-3 tabular-nums">{row.startTime}–{row.endTime}{row.isOvernight ? <span className="ml-2 inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">ข้ามวัน</span> : null}</td><td className="px-4 py-3 text-right tabular-nums">{formatDuration(row.breakMinutes)}</td><td className="px-4 py-3 text-right tabular-nums">{formatDuration(row.netMinutes)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatDuration(row.roundedNetMinutes)}</td><td className="px-4 py-3 text-right font-mono">{formatDecimalHours(row.roundedNetMinutes)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function WorkingHoursCalculatorTool() {
  const [entries, setEntries] = useState<EditableEntry[]>([EMPTY_ENTRY]);
  const [roundingMinutes, setRoundingMinutes] = useState<WorkingHoursRounding>(0);
  const [targetHours, setTargetHours] = useState("40");
  const [useTarget, setUseTarget] = useState(false);
  const [result, setResult] = useState<WorkingHoursResult | null>(null);
  const [error, setError] = useState("");
  const invalidate = () => { setResult(null); setError(""); };

  const updateEntry = (id: string, patch: Partial<EditableEntry>) => {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
    invalidate();
  };
  const removeEntry = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    invalidate();
  };
  const addEntry = () => {
    setEntries((current) => [...current, { ...EMPTY_ENTRY, id: crypto.randomUUID() }]);
    invalidate();
  };
  const calculate = () => {
    try {
      const target = useTarget ? Number(targetHours) * 60 : undefined;
      const nextResult = calculateWorkingHours({
        entries: entries.map((entry) => ({ ...entry, breakMinutes: Number(entry.breakMinutes) })),
        roundingMinutes,
        targetMinutes: target,
      });
      setResult(nextResult);
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณชั่วโมงทำงานไม่สำเร็จ");
    }
  };
  const loadExample = () => {
    setEntries(EXAMPLE_ENTRIES);
    setRoundingMinutes(15);
    setTargetHours("40");
    setUseTarget(true);
    invalidate();
  };
  const clear = () => {
    setEntries([EMPTY_ENTRY]);
    setRoundingMinutes(0);
    setTargetHours("40");
    setUseTarget(false);
    invalidate();
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>Timesheet ส่วนตัวที่คำนวณใน Browser</AlertTitle>
        <AlertDescription className="leading-6">เวลา วันที่ หมายเหตุ และ CSV อยู่ในอุปกรณ์ของคุณ เครื่องมือนี้รวมชั่วโมงเท่านั้น ไม่ตัดสินสิทธิ OT ค่าแรง เวลาพักที่ต้องได้รับ หรือความถูกต้องตามกฎหมายแรงงาน</AlertDescription>
      </Alert>

      <section aria-labelledby="working-entries-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 id="working-entries-title" className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />เวลาเข้า–ออกแต่ละกะ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">เพิ่มกะซ้ำในวันเดียวกันได้สูงสุด {WORKING_HOURS_MAX_ENTRIES} รายการ เหมาะกับกะแยกหรือรอบรายเดือน</p></div><Button type="button" variant="outline" disabled={entries.length >= WORKING_HOURS_MAX_ENTRIES} onClick={addEntry}><Plus className="size-4" />เพิ่มรายการ</Button></div>
        <div className="space-y-4">{entries.map((entry, index) => <EntryCard key={entry.id} entry={entry} index={index} canRemove={entries.length > 1} onChange={(patch) => updateEntry(entry.id, patch)} onRemove={() => removeEntry(entry.id)} />)}</div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="working-policy-title">
        <div className="mb-5"><h2 id="working-policy-title" className="font-semibold">นโยบายผลรวม</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ระบบหักพักก่อน แล้วปัด “เวลาสุทธิของแต่ละกะ” ตามหน่วยที่เลือก ไม่ปัดเวลาเข้าและออกโดยซ่อนวิธีคิด</p></div>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
          <Field id="working-rounding" label="การปัดเวลาสุทธิแต่ละกะ" hint="6 นาทีเท่ากับ 0.1 ชั่วโมง เหมาะกับ Timesheet ที่ใช้ทศนิยมหนึ่งตำแหน่ง">
            <Select value={String(roundingMinutes)} onValueChange={(value) => { setRoundingMinutes(Number(value) as WorkingHoursRounding); invalidate(); }}><SelectTrigger id="working-rounding" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">ไม่ปัด — ใช้นาทีจริง</SelectItem><SelectItem value="5">ใกล้สุด 5 นาที</SelectItem><SelectItem value="6">ใกล้สุด 6 นาที (0.1 ชั่วโมง)</SelectItem><SelectItem value="10">ใกล้สุด 10 นาที</SelectItem><SelectItem value="15">ใกล้สุด 15 นาที</SelectItem></SelectContent></Select>
          </Field>
          <div className="rounded-xl border bg-muted/10 p-4">
            <label className="flex cursor-pointer items-start gap-3" htmlFor="working-use-target"><input id="working-use-target" type="checkbox" className="mt-1 size-4 accent-primary" checked={useTarget} onChange={(event) => { setUseTarget(event.target.checked); invalidate(); }} /><span><span className="block text-sm font-medium">เทียบชั่วโมงเป้าหมาย</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">ใช้ดูว่ายอดรวมมากหรือน้อยกว่าเป้าหมายเท่าไร ไม่ตีความส่วนเกินเป็น OT</span></span></label>
            {useTarget ? <div className="mt-4 grid gap-3"><Label htmlFor="working-target-hours">เป้าหมาย (ชั่วโมง)</Label><Input id="working-target-hours" type="number" inputMode="decimal" min={0} max={744} step="0.25" value={targetHours} onChange={(event) => { setTargetHours(event.target.value); invalidate(); }} /></div> : null}
          </div>
        </div>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-900 dark:hover:bg-emerald-800" onClick={calculate}><Clock3 className="size-4" />คำนวณชั่วโมงทำงาน</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      <div className="mt-5" aria-live="polite">{result ? <ResultPanel result={result} roundingMinutes={roundingMinutes} /> : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><Clock3 className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกเวลาเข้า–ออก เวลาพัก แล้วกดคำนวณ</p><p className="mt-1 text-xs">ผลลัพธ์จะแสดงทั้งชั่วโมง:นาที ชั่วโมงทศนิยม กะข้ามวัน และผลการปัดแยกกัน</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><MoonStar className="mt-1 size-4 shrink-0 text-primary" /><span>กะ 22:00–06:00 จะนับข้ามเที่ยงคืนอัตโนมัติ แต่เวลาเข้าและออกที่เท่ากันจะไม่ถูกเดาว่าเป็นกะ 24 ชั่วโมง เพราะมีความกำกวม</span></p>
        <p className="mt-2 flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>กฎการปัดเวลา เวลาพักที่จ่ายหรือไม่จ่าย และนิยาม OT แตกต่างตามสัญญา นโยบาย และกฎหมาย ควรเทียบผลกับระบบลงเวลาและฝ่ายบุคคลก่อนใช้กับเงินเดือนจริง</span></p>
      </div>
    </WorkspaceFrame>
  );
}
