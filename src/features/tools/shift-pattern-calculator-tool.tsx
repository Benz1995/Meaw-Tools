"use client";

import { CalendarClock, ClipboardList, Download, Info, MoonStar, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SHIFT_PATTERN_MAX_BREAK_MINUTES,
  SHIFT_PATTERN_MAX_DEFINITIONS,
  SHIFT_PATTERN_PRESETS,
  calculateShiftPattern,
  parseShiftPattern,
  shiftPatternCsv,
  shiftPatternIcs,
  type ShiftDefinition,
  type ShiftPatternPreset,
  type ShiftPatternPresetId,
  type ShiftPatternResult,
} from "@/lib/tools/shift-pattern";
import { formatDecimalHours, formatDuration } from "@/lib/tools/working-hours";

type EditableShift = Omit<ShiftDefinition, "breakMinutes"> & { id: string; breakMinutes: string };

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const SHIFT_TONES = [
  "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100",
  "border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100",
  "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
  "border-rose-500/35 bg-rose-500/10 text-rose-950 dark:text-rose-100",
  "border-cyan-500/35 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100",
];
const OFF_TONE = "border-border/70 bg-muted/40 text-muted-foreground";
const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });

function toEditable(preset: ShiftPatternPreset): EditableShift[] {
  return preset.definitions.map((definition, index) => ({ ...definition, id: `${preset.id}-${index}`, breakMinutes: String(definition.breakMinutes) }));
}

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label>{children}{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function StatCard({ label, value, detail, tone = "default", testId }: { label: string; value: string; detail?: string; tone?: "default" | "success" | "warning"; testId?: string }) {
  const toneClass = tone === "success" ? "border-emerald-500/30 bg-emerald-500/5" : tone === "warning" ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/10";
  return <div className={`rounded-xl border p-4 ${toneClass}`}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}</div>;
}

function ShiftDefinitionCard({ shift, index, canRemove, onChange, onRemove }: { shift: EditableShift; index: number; canRemove: boolean; onChange: (patch: Partial<EditableShift>) => void; onRemove: () => void }) {
  const prefix = `shift-definition-${shift.id}`;
  return (
    <fieldset className="rounded-xl border bg-muted/5 p-4 sm:p-5">
      <legend className="sr-only">ประเภทกะที่ {index + 1}</legend>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">ประเภทกะที่ {index + 1}</p><p className="mt-1 text-xs text-muted-foreground">รหัสต้องตรงกับข้อความในรอบกะ เช่น D หรือ N</p></div>
        <Button type="button" size="icon" variant="ghost" disabled={!canRemove} aria-label={`ลบประเภทกะที่ ${index + 1}`} onClick={onRemove}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-2"><Field id={`${prefix}-code`} label="รหัสกะ"><Input id={`${prefix}-code`} value={shift.code} maxLength={8} placeholder="D" onChange={(event) => onChange({ code: event.target.value.toUpperCase() })} /></Field></div>
        <div className="xl:col-span-4"><Field id={`${prefix}-label`} label="ชื่อกะ"><Input id={`${prefix}-label`} value={shift.label} maxLength={60} placeholder="กะกลางวัน" onChange={(event) => onChange({ label: event.target.value })} /></Field></div>
        <div className="xl:col-span-2"><Field id={`${prefix}-start`} label="เวลาเริ่ม"><Input id={`${prefix}-start`} type="time" step={60} value={shift.startTime} onChange={(event) => onChange({ startTime: event.target.value })} /></Field></div>
        <div className="xl:col-span-2"><Field id={`${prefix}-end`} label="เวลาสิ้นสุด"><Input id={`${prefix}-end`} type="time" step={60} value={shift.endTime} onChange={(event) => onChange({ endTime: event.target.value })} /></Field></div>
        <div className="xl:col-span-2"><Field id={`${prefix}-break`} label="พัก (นาที)"><Input id={`${prefix}-break`} type="number" inputMode="numeric" min={0} max={SHIFT_PATTERN_MAX_BREAK_MINUTES} step={1} value={shift.breakMinutes} onChange={(event) => onChange({ breakMinutes: event.target.value })} /></Field></div>
      </div>
    </fieldset>
  );
}

function monthDate(month: string) {
  return new Date(`${month}-01T00:00:00Z`);
}

function displayDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function ShiftCalendar({ result }: { result: ShiftPatternResult }) {
  const toneByCode = new Map(result.shifts.map((shift, index) => [shift.code, SHIFT_TONES[index % SHIFT_TONES.length]!]));
  return (
    <section className="rounded-xl border p-4 sm:p-5" aria-labelledby="shift-calendar-title">
      <div className="mb-4"><h2 id="shift-calendar-title" className="font-semibold">ปฏิทินกะรายเดือน</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">เลื่อนแนวนอนเฉพาะปฏิทินได้บนจอเล็ก สีแยกตามรหัสกะและวันหยุด</p></div>
      <div className="space-y-5">
        {result.months.map((month) => {
          const days = result.days.filter((day) => day.date.startsWith(month.month));
          const firstOffset = days[0]?.weekday ?? 0;
          return (
            <div key={month.month} className="overflow-x-auto rounded-xl border bg-muted/5 p-3 sm:p-4" tabIndex={0} role="region" aria-label={`ปฏิทิน ${monthFormatter.format(monthDate(month.month))}`}>
              <div className="min-w-[38rem]">
                <div className="mb-4 flex items-start justify-between gap-4"><div><h3 className="font-semibold">{monthFormatter.format(monthDate(month.month))}</h3><p className="mt-1 text-xs text-muted-foreground">ทำงาน {integerFormatter.format(month.workingDays)} วัน · หยุด {integerFormatter.format(month.offDays)} วัน · {formatDuration(month.netMinutes)}</p></div></div>
                <div className="grid grid-cols-7 gap-1.5">{WEEKDAYS.map((weekday) => <div key={weekday} className="pb-1 text-center text-xs font-semibold text-muted-foreground">{weekday}</div>)}</div>
                <div className="mt-1 grid grid-cols-7 gap-1.5">
                  {Array.from({ length: firstOffset }, (_, index) => <div key={`blank-${index}`} aria-hidden="true" className="min-h-20" />)}
                  {days.map((day) => <div key={day.date} className={`min-h-20 rounded-lg border p-2 ${day.isOff ? OFF_TONE : toneByCode.get(day.code)}`} aria-label={`${displayDate(day.date)} ${day.label}${day.isOff ? "" : ` เวลา ${day.startTime} ถึง ${day.endTime}`}`}><p className="text-sm font-bold tabular-nums">{Number(day.date.slice(8))}</p><p className="mt-1 truncate text-xs font-semibold">{day.code}</p><p className="mt-1 truncate text-[11px] opacity-80">{day.isOff ? "วันหยุด" : `${day.startTime}–${day.endTime}`}</p></div>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResultPanel({ result, includeOffDays }: { result: ShiftPatternResult; includeOffDays: boolean }) {
  const summary = `${displayDate(result.startDate)}–${displayDate(result.endDate)} · รอบ ${result.cycleLength} วัน · ทำงาน ${result.workingDays} วัน · หยุด ${result.offDays} วัน · สุทธิ ${formatDuration(result.netMinutes)} (${formatDecimalHours(result.netMinutes)} ชั่วโมงทศนิยม)`;
  return (
    <div className="space-y-5" data-testid="shift-pattern-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="วันทำงาน" value={`${integerFormatter.format(result.workingDays)} วัน`} detail={`จาก ${integerFormatter.format(result.calendarDays)} วันปฏิทิน`} tone="success" testId="shift-working-days" />
        <StatCard label="วันหยุดในรอบ" value={`${integerFormatter.format(result.offDays)} วัน`} detail={`รอบซ้ำทุก ${result.cycleLength} วัน`} />
        <StatCard label="ชั่วโมงสุทธิ" value={formatDuration(result.netMinutes)} detail={`${formatDecimalHours(result.netMinutes)} ชั่วโมงทศนิยม · พัก ${formatDuration(result.breakMinutes)}`} testId="shift-net-hours" />
        <StatCard label="กะข้ามวัน" value={`${integerFormatter.format(result.overnightShifts)} กะ`} detail={`ก่อนหักพัก ${formatDuration(result.grossMinutes)}`} tone={result.overnightShifts ? "warning" : "default"} />
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="shift-summary-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><h2 id="shift-summary-title" className="font-semibold">สรุปรอบกะ</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{summary}</p><div className="mt-3 flex flex-wrap gap-2">{result.shifts.map((shift, index) => <span key={shift.code} className={`rounded-full border px-3 py-1 text-xs ${SHIFT_TONES[index % SHIFT_TONES.length]}`}><strong>{shift.code}</strong> {shift.label}: {shift.count} กะ · {formatDuration(shift.netMinutes)}</span>)}</div></div>
          <ActionBar><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(shiftPatternCsv(result), "meaw-shift-pattern.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button><Button type="button" variant="outline" onClick={() => downloadText(shiftPatternIcs(result, includeOffDays), "meaw-shift-calendar.ics", "text/calendar;charset=utf-8")}><CalendarClock className="size-4" />ดาวน์โหลด ICS</Button></ActionBar>
        </div>
      </section>

      <ShiftCalendar result={result} />

      <section className="rounded-xl border p-4 sm:p-5" aria-labelledby="shift-detail-title">
        <div className="mb-4"><h2 id="shift-detail-title" className="font-semibold">รายละเอียดแต่ละวัน</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">ใช้ตรวจการวางรอบกะก่อนนำ CSV หรือปฏิทินไปใช้ต่อ</p></div>
        <div className="max-h-[32rem] overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="ตารางรายละเอียดกะแบบเลื่อนได้">
          <table className="w-full min-w-[46rem] text-sm"><thead className="sticky top-0 bg-card"><tr className="border-b"><th scope="col" className="px-4 py-3 text-left font-semibold">วันที่</th><th scope="col" className="px-4 py-3 text-left font-semibold">วันในรอบ</th><th scope="col" className="px-4 py-3 text-left font-semibold">กะ</th><th scope="col" className="px-4 py-3 text-left font-semibold">เวลา</th><th scope="col" className="px-4 py-3 text-right font-semibold">พัก</th><th scope="col" className="px-4 py-3 text-right font-semibold">สุทธิ</th></tr></thead>
            <tbody>{result.days.map((day) => <tr key={day.date} className="border-b last:border-0"><td className="px-4 py-3"><p className="font-mono">{day.date}</p><p className="mt-1 text-xs text-muted-foreground">{displayDate(day.date)}</p></td><td className="px-4 py-3 tabular-nums">{day.cycleDay}/{result.cycleLength}</td><td className="px-4 py-3"><span className="font-semibold">{day.code}</span><span className="ml-2 text-xs text-muted-foreground">{day.label}</span></td><td className="px-4 py-3 tabular-nums">{day.isOff ? "—" : <>{day.startTime}–{day.endTime}{day.isOvernight ? <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">ข้ามวัน</span> : null}</>}</td><td className="px-4 py-3 text-right tabular-nums">{day.isOff ? "—" : formatDuration(day.breakMinutes)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{day.isOff ? "—" : formatDuration(day.netMinutes)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const DEFAULT_PRESET = SHIFT_PATTERN_PRESETS[0]!;

export function ShiftPatternCalculatorTool() {
  const [presetId, setPresetId] = useState<ShiftPatternPresetId>(DEFAULT_PRESET.id);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startCycleDay, setStartCycleDay] = useState("1");
  const [patternText, setPatternText] = useState(DEFAULT_PRESET.pattern.join(" "));
  const [definitions, setDefinitions] = useState<EditableShift[]>(toEditable(DEFAULT_PRESET));
  const [includeOffDays, setIncludeOffDays] = useState(false);
  const [result, setResult] = useState<ShiftPatternResult | null>(null);
  const [error, setError] = useState("");
  const invalidate = () => { setResult(null); setError(""); };

  const applyPreset = (id: ShiftPatternPresetId) => {
    const preset = SHIFT_PATTERN_PRESETS.find((item) => item.id === id)!;
    setPresetId(id);
    setPatternText(preset.pattern.join(" "));
    setDefinitions(toEditable(preset));
    setStartCycleDay("1");
    invalidate();
  };
  const updateDefinition = (id: string, patch: Partial<EditableShift>) => {
    setDefinitions((current) => current.map((shift) => shift.id === id ? { ...shift, ...patch } : shift));
    setPresetId("custom");
    invalidate();
  };
  const removeDefinition = (id: string) => {
    setDefinitions((current) => current.filter((shift) => shift.id !== id));
    setPresetId("custom");
    invalidate();
  };
  const addDefinition = () => {
    setDefinitions((current) => [...current, { id: crypto.randomUUID(), code: `S${current.length + 1}`, label: "กะใหม่", startTime: "09:00", endTime: "17:00", breakMinutes: "60" }]);
    setPresetId("custom");
    invalidate();
  };
  const calculate = () => {
    try {
      const nextResult = calculateShiftPattern({
        startDate,
        endDate,
        startCycleDay: Number(startCycleDay),
        pattern: parseShiftPattern(patternText),
        definitions: definitions.map((definition) => ({ code: definition.code, label: definition.label, startTime: definition.startTime, endTime: definition.endTime, breakMinutes: Number(definition.breakMinutes) })),
      });
      setResult(nextResult);
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "สร้างตารางกะไม่สำเร็จ");
    }
  };
  const loadExample = () => {
    const preset = SHIFT_PATTERN_PRESETS.find((item) => item.id === "two-day-two-night-four-off")!;
    setPresetId(preset.id);
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setStartCycleDay("1");
    setPatternText(preset.pattern.join(" "));
    setDefinitions(toEditable(preset));
    setIncludeOffDays(true);
    setResult(null);
    setError("");
  };
  const clear = () => {
    setPresetId(DEFAULT_PRESET.id);
    setStartDate("");
    setEndDate("");
    setStartCycleDay("1");
    setPatternText(DEFAULT_PRESET.pattern.join(" "));
    setDefinitions(toEditable(DEFAULT_PRESET));
    setIncludeOffDays(false);
    invalidate();
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
        <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
        <AlertTitle>สร้างตารางกะใน Browser ของคุณ</AlertTitle>
        <AlertDescription className="leading-6">วันที่ เวลา และไฟล์ส่งออกไม่ถูกอัปโหลด เครื่องมือนี้วาง “รอบกะที่ซ้ำ” สำหรับคน ทีม หรือบทบาทหนึ่งชุด ไม่ได้จัดพนักงานอัตโนมัติ ตรวจจำนวนคน ความยุติธรรม หรือข้อกำหนดแรงงาน</AlertDescription>
      </Alert>

      <section aria-labelledby="shift-cycle-title">
        <div className="mb-5"><h2 id="shift-cycle-title" className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-primary" />ช่วงวันที่และรอบกะ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Preset เป็นเพียงตัวอย่างทั่วไป กรุณาเทียบกับตารางจริงขององค์กรก่อนใช้งาน</p></div>
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          <Field id="shift-preset" label="รูปแบบรอบกะ"><Select value={presetId} onValueChange={(value) => applyPreset(value as ShiftPatternPresetId)}><SelectTrigger id="shift-preset" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{SHIFT_PATTERN_PRESETS.map((preset) => <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field id="shift-start-date" label="วันที่เริ่มต้น"><Input id="shift-start-date" type="date" min="1900-01-01" max="2100-12-31" value={startDate} onChange={(event) => { setStartDate(event.target.value); invalidate(); }} /></Field>
          <Field id="shift-end-date" label="วันที่สิ้นสุด"><Input id="shift-end-date" type="date" min="1900-01-01" max="2100-12-31" value={endDate} onChange={(event) => { setEndDate(event.target.value); invalidate(); }} /></Field>
          <Field id="shift-cycle-start" label="วันที่เริ่มตรงกับวันลำดับที่" hint="เช่น เริ่มกลางรอบที่วัน 5 ให้กรอก 5"><Input id="shift-cycle-start" type="number" inputMode="numeric" min={1} max={56} step={1} value={startCycleDay} onChange={(event) => { setStartCycleDay(event.target.value); invalidate(); }} /></Field>
        </div>
        <div className="mt-6"><Field id="shift-pattern" label="รอบกะ เรียงทีละวัน" hint="คั่นด้วยช่องว่าง จุลภาค หรือขึ้นบรรทัดใหม่ · OFF / O / REST / หยุด หมายถึงวันหยุด"><Textarea id="shift-pattern" className="min-h-24 font-mono" value={patternText} placeholder="D D N N OFF OFF OFF OFF" onChange={(event) => { setPatternText(event.target.value); setPresetId("custom"); invalidate(); }} /></Field></div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="shift-definitions-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 id="shift-definitions-title" className="font-semibold">กำหนดเวลาแต่ละประเภทกะ</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">รองรับสูงสุด {SHIFT_PATTERN_MAX_DEFINITIONS} ประเภท ถ้าเวลาสิ้นสุดน้อยกว่าเวลาเริ่ม ระบบจะถือว่าเป็นกะข้ามวัน</p></div><Button type="button" variant="outline" disabled={definitions.length >= SHIFT_PATTERN_MAX_DEFINITIONS} onClick={addDefinition}><Plus className="size-4" />เพิ่มประเภทกะ</Button></div>
        <div className="space-y-4">{definitions.map((shift, index) => <ShiftDefinitionCard key={shift.id} shift={shift} index={index} canRemove={definitions.length > 1} onChange={(patch) => updateDefinition(shift.id, patch)} onRemove={() => removeDefinition(shift.id)} />)}</div>
      </section>

      <section className="mt-7 rounded-xl border bg-muted/10 p-4" aria-labelledby="shift-export-title">
        <label className="flex cursor-pointer items-start gap-3" htmlFor="shift-include-off"><input id="shift-include-off" type="checkbox" className="mt-1 size-4 accent-primary" checked={includeOffDays} onChange={(event) => setIncludeOffDays(event.target.checked)} /><span><span id="shift-export-title" className="block text-sm font-medium">ใส่วันหยุดลงในไฟล์ปฏิทิน ICS</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">หากปิด ไฟล์ ICS จะมีเฉพาะกะทำงาน เวลาใช้แบบ local/floating เพื่อให้แอปปฏิทินตีความตามเขตเวลาของคุณ</span></span></label>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-900 dark:hover:bg-emerald-800" onClick={calculate}><CalendarClock className="size-4" />สร้างตารางกะ</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      <div className="mt-5" aria-live="polite">{result ? <ResultPanel result={result} includeOffDays={includeOffDays} /> : <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><CalendarClock className="mx-auto mb-3 size-9 text-primary/70" /><p>เลือกช่วงวันที่ ตรวจรอบกะ แล้วกดสร้างตารางกะ</p><p className="mt-1 text-xs">ผลลัพธ์จะแสดงปฏิทิน ชั่วโมงสุทธิ กะข้ามวัน พร้อมดาวน์โหลด CSV และ ICS</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><MoonStar className="mt-1 size-4 shrink-0 text-primary" /><span>กะ 20:00–08:00 จะสิ้นสุดในวันถัดไปอัตโนมัติ ทั้งในผลคำนวณและไฟล์ ICS ส่วนเวลาเริ่มและสิ้นสุดที่เท่ากันจะถูกแจ้งให้แก้แทนการเดาว่าเป็น 24 ชั่วโมง</span></p>
        <p className="mt-2 flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ตารางนี้ไม่แทนระบบจัดเวรพนักงาน ไม่ตรวจวันลาพัก ความพร้อม จำนวนคนขั้นต่ำ การพักระหว่างกะ ความเป็นธรรม หรือกฎหมายแรงงาน ควรให้ผู้รับผิดชอบตรวจและอนุมัติก่อนเผยแพร่</span></p>
      </div>
    </WorkspaceFrame>
  );
}
