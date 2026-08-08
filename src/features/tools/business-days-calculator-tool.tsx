"use client";

import { BriefcaseBusiness, CalendarCheck2, CalendarDays, ChevronRight, ClipboardList, Download, ExternalLink, Info, Minus, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BOT_HOLIDAY_RULESET,
  BOT_HOLIDAY_SOURCE_URL,
  BUSINESS_DAYS_MAX_CUSTOM_HOLIDAYS,
  BUSINESS_DAYS_MAX_SHIFT,
  businessDaysCsv,
  calculateBusinessDaysRange,
  shiftBusinessDate,
  type BusinessDayDirection,
  type BusinessDayMode,
  type BusinessDayRecord,
  type BusinessDayResult,
  type HolidayPreset,
} from "@/lib/tools/business-days";

const WEEKDAYS = [
  { value: 1, short: "จ.", label: "จันทร์" },
  { value: 2, short: "อ.", label: "อังคาร" },
  { value: 3, short: "พ.", label: "พุธ" },
  { value: 4, short: "พฤ.", label: "พฤหัสบดี" },
  { value: 5, short: "ศ.", label: "ศุกร์" },
  { value: 6, short: "ส.", label: "เสาร์" },
  { value: 0, short: "อา.", label: "อาทิตย์" },
] as const;

const WEEKDAY_NAMES = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
const longDateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "UTC" });
const integerFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function formatLongDate(value: string) {
  return longDateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function formatMonth(value: string) {
  return monthFormatter.format(new Date(`${value}-01T00:00:00Z`));
}

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-3">
      <Label htmlFor={id} className="leading-5">{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ToggleCard({ id, label, description, checked, onCheckedChange }: { id: string; label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-24 items-start justify-between gap-4 rounded-xl border bg-muted/10 p-4">
      <div><Label htmlFor={id} className="leading-5">{label}</Label><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p></div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function StatCard({ label, value, tone = "default", testId }: { label: string; value: string; tone?: "default" | "success" | "warning"; testId?: string }) {
  const toneClass = tone === "success" ? "border-emerald-500/30 bg-emerald-500/5" : tone === "warning" ? "border-amber-500/30 bg-amber-500/5" : "bg-muted/10";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p data-testid={testId} className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function WorkweekSelector({ selected, onChange }: { selected: number[]; onChange: (days: number[]) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="group" aria-label="เลือกวันทำงานประจำสัปดาห์">
      {WEEKDAYS.map((day) => {
        const active = selected.includes(day.value);
        return (
          <Button
            key={day.value}
            type="button"
            variant="outline"
            aria-pressed={active}
            aria-label={`${day.label}${active ? " เป็นวันทำงาน" : " เป็นวันหยุด"}`}
            disabled={active && selected.length === 1}
            className={active ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 hover:text-white dark:border-emerald-500 dark:bg-emerald-700" : "text-muted-foreground"}
            onClick={() => onChange(active ? selected.filter((value) => value !== day.value) : [...selected, day.value])}
          >
            <span className="sm:hidden">{day.short}</span><span className="hidden sm:inline">{day.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

function recordLabel(record: BusinessDayRecord) {
  if (record.type === "working") return { label: "วันทำงาน", className: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" };
  if (record.type === "holiday") return { label: "วันหยุด", className: "bg-amber-500/10 text-amber-800 dark:text-amber-200" };
  return { label: "หยุดประจำสัปดาห์", className: "bg-muted text-muted-foreground" };
}

function previewRecords(records: BusinessDayRecord[]) {
  if (records.length <= 62) return records;
  return [...records.slice(0, 31), ...records.slice(-31)];
}

function ResultPanel({ result, mode, direction, requestedDays, includeStart, includeEnd, onClear }: { result: BusinessDayResult; mode: BusinessDayMode; direction: BusinessDayDirection; requestedDays: number; includeStart: boolean; includeEnd: boolean; onClear: () => void }) {
  const summary = mode === "range"
    ? `นับจาก ${formatLongDate(result.startDate)} ถึง ${formatLongDate(result.endDate)} (${includeStart ? "รวม" : "ไม่รวม"}วันเริ่มต้น / ${includeEnd ? "รวม" : "ไม่รวม"}วันสิ้นสุด) ได้ ${integerFormatter.format(result.workingDays)} วันทำงาน จาก ${integerFormatter.format(result.calendarDays)} วันปฏิทิน หักวันหยุดประจำสัปดาห์ ${integerFormatter.format(result.weeklyDaysOff)} วัน และวันหยุดที่ตรงกับวันทำงาน ${integerFormatter.format(result.holidaysExcluded)} วัน`
    : `${direction === "add" ? "เพิ่ม" : "ลบ"} ${integerFormatter.format(requestedDays)} วันทำการจาก ${formatLongDate(result.startDate)} ได้วันที่ ${formatLongDate(result.endDate)} โดยข้ามวันหยุดประจำสัปดาห์ ${integerFormatter.format(result.weeklyDaysOff)} วัน และวันหยุด ${integerFormatter.format(result.holidaysExcluded)} วัน`;
  const records = previewRecords(result.records);

  return (
    <div className="space-y-5" data-testid="business-days-result">
      {mode === "shift" ? (
        <section className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6" aria-labelledby="business-target-title">
          <p id="business-target-title" className="text-sm font-medium text-emerald-800 dark:text-emerald-200">วันเป้าหมาย</p>
          <p data-testid="business-days-target" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{formatLongDate(result.endDate)}</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{result.endDate}</p>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={mode === "range" ? "วันทำงานสุทธิ" : "วันทำงานที่เดินผ่าน"} value={integerFormatter.format(result.workingDays)} tone="success" testId="business-days-working-count" />
        <StatCard label="วันปฏิทินที่ตรวจ" value={integerFormatter.format(result.calendarDays)} />
        <StatCard label="หยุดประจำสัปดาห์" value={integerFormatter.format(result.weeklyDaysOff)} />
        <StatCard label="วันหยุดที่หักออก" value={integerFormatter.format(result.holidaysExcluded)} tone="warning" />
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="business-formula-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h2 id="business-formula-title" className="font-semibold">วิธีนับที่ตรวจสอบได้</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{summary}</p></div>
          <ActionBar>
            <Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button>
            <Button type="button" variant="outline" onClick={() => downloadText(businessDaysCsv(result.records), "meaw-business-days.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button>
            <Button type="button" variant="ghost" onClick={onClear}>คำนวณใหม่</Button>
          </ActionBar>
        </div>
        {result.holidaysOnWeeklyDaysOff ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-800 dark:text-amber-200"><Info className="mt-0.5 size-4 shrink-0" />มีวันหยุด {result.holidaysOnWeeklyDaysOff} รายการตรงกับวันหยุดประจำสัปดาห์ จึงไม่ถูกหักซ้ำ</p> : null}
      </section>

      {result.months.length ? (
        <section className="rounded-xl border p-4 sm:p-5" aria-labelledby="business-month-title">
          <div className="mb-4"><h2 id="business-month-title" className="font-semibold">สรุปรายเดือน</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">ใช้ตรวจช่วงยาวและเทียบจำนวนวันที่ถูกตัดออกในแต่ละเดือน</p></div>
          <div className="max-h-72 overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="ตารางสรุปวันทำงานรายเดือนแบบเลื่อนได้">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="sticky top-0 bg-card"><tr className="border-b"><th scope="col" className="px-4 py-3 text-left font-semibold">เดือน</th><th scope="col" className="px-4 py-3 text-right font-semibold">วันปฏิทิน</th><th scope="col" className="px-4 py-3 text-right font-semibold">วันทำงาน</th><th scope="col" className="px-4 py-3 text-right font-semibold">หยุดประจำสัปดาห์</th><th scope="col" className="px-4 py-3 text-right font-semibold">วันหยุด</th></tr></thead>
              <tbody>{result.months.map((month) => <tr key={month.month} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{formatMonth(month.month)}</td><td className="px-4 py-3 text-right tabular-nums">{month.calendarDays}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">{month.workingDays}</td><td className="px-4 py-3 text-right tabular-nums">{month.weeklyDaysOff}</td><td className="px-4 py-3 text-right tabular-nums">{month.holidaysExcluded}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {records.length ? (
        <section className="rounded-xl border p-4 sm:p-5" aria-labelledby="business-record-title">
          <div className="mb-4"><h2 id="business-record-title" className="font-semibold">รายละเอียดวันที่ตรวจ</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">แสดง {integerFormatter.format(records.length)} จาก {integerFormatter.format(result.records.length)} วัน · CSV มีรายละเอียดครบทุกวัน</p></div>
          <div className="max-h-[30rem] overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="ตารางรายละเอียดวันทำงานแบบเลื่อนได้">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="sticky top-0 bg-card"><tr className="border-b"><th scope="col" className="px-4 py-3 text-left font-semibold">วันที่</th><th scope="col" className="px-4 py-3 text-left font-semibold">วัน</th><th scope="col" className="px-4 py-3 text-left font-semibold">สถานะ</th><th scope="col" className="px-4 py-3 text-left font-semibold">เหตุผล</th></tr></thead>
              <tbody>{records.map((record) => { const status = recordLabel(record); return <tr key={record.date} className="border-b last:border-0"><td className="px-4 py-3 font-mono">{record.date}</td><td className="px-4 py-3">{WEEKDAY_NAMES[record.weekday]}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span></td><td className="px-4 py-3 text-muted-foreground">{record.type === "working" ? "อยู่ในวันทำงานที่เลือก" : record.type === "holiday" ? record.holidayName : record.holidayName ? `${record.holidayName} · ไม่นับซ้ำ` : "ไม่ได้เลือกเป็นวันทำงาน"}</td></tr>; })}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function BusinessDaysCalculatorTool() {
  const [mode, setMode] = useState<BusinessDayMode>("range");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeStart, setIncludeStart] = useState(true);
  const [includeEnd, setIncludeEnd] = useState(true);
  const [businessDays, setBusinessDays] = useState("10");
  const [direction, setDirection] = useState<BusinessDayDirection>("add");
  const [workingWeekdays, setWorkingWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [preset, setPreset] = useState<HolidayPreset>("bot-2026-national");
  const [customHolidays, setCustomHolidays] = useState("");
  const [result, setResult] = useState<BusinessDayResult | null>(null);
  const [error, setError] = useState("");
  const invalidate = () => { setResult(null); setError(""); };

  const calculate = () => {
    try {
      const nextResult = mode === "range"
        ? calculateBusinessDaysRange({ startDate, endDate, includeStart, includeEnd, workingWeekdays, preset, customHolidays })
        : shiftBusinessDate({ startDate, businessDays: Number(businessDays), direction, workingWeekdays, preset, customHolidays });
      setResult(nextResult);
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "คำนวณวันทำงานไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setMode("range");
    setStartDate("2026-01-01");
    setEndDate("2026-01-31");
    setIncludeStart(true);
    setIncludeEnd(true);
    setBusinessDays("10");
    setDirection("add");
    setWorkingWeekdays([1, 2, 3, 4, 5]);
    setPreset("bot-2026-national");
    setCustomHolidays("");
    invalidate();
  };

  const clear = () => {
    setMode("range");
    setStartDate("");
    setEndDate("");
    setIncludeStart(true);
    setIncludeEnd(true);
    setBusinessDays("10");
    setDirection("add");
    setWorkingWeekdays([1, 2, 3, 4, 5]);
    setPreset("bot-2026-national");
    setCustomHolidays("");
    invalidate();
  };

  const update = <T,>(setter: (value: T) => void, value: T) => { setter(value); invalidate(); };
  const requestedDays = Number.isFinite(Number(businessDays)) ? Number(businessDays) : 0;

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-sky-500/30 bg-sky-500/5">
        <ShieldCheck className="text-sky-700 dark:text-sky-300" />
        <AlertTitle>คำนวณใน Browser พร้อมปฏิทิน ธปท. แบบระบุปี</AlertTitle>
        <AlertDescription className="leading-6">Preset ปี 2569 อ้างอิงวันหยุดของสถาบันการเงินและสถาบันการเงินเฉพาะกิจ ไม่ใช่วันหยุดของทุกบริษัทหรือหน่วยงาน และอาจมีประกาศเพิ่มเติมภายหลัง ควรตรวจระเบียบขององค์กรและ <a href={BOT_HOLIDAY_SOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">ประกาศ ธปท. ล่าสุด<ExternalLink className="size-3" /></a></AlertDescription>
      </Alert>

      <section aria-labelledby="business-days-mode-title">
        <h2 id="business-days-mode-title" className="mb-5 flex items-center gap-2 font-semibold"><BriefcaseBusiness className="size-4 text-primary" />เลือกวิธีคำนวณ</h2>
        <Tabs value={mode} onValueChange={(value) => update(setMode, value as BusinessDayMode)}>
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[34rem]">
            <TabsTrigger value="range" className="text-foreground">นับระหว่าง 2 วันที่</TabsTrigger>
            <TabsTrigger value="shift" className="text-foreground">เพิ่ม / ลบวันทำการ</TabsTrigger>
          </TabsList>
          <TabsContent value="range" className="mt-6">
            <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
              <Field id="business-start-date" label="วันที่เริ่มต้น"><Input id="business-start-date" type="date" value={startDate} min="1900-01-01" max="2100-12-31" onChange={(event) => update(setStartDate, event.target.value)} /></Field>
              <Field id="business-end-date" label="วันที่สิ้นสุด"><Input id="business-end-date" type="date" value={endDate} min="1900-01-01" max="2100-12-31" onChange={(event) => update(setEndDate, event.target.value)} /></Field>
              <ToggleCard id="business-include-start" label="นับวันที่เริ่มต้น" description="เปิดไว้เพื่อให้เหมือน NETWORKDAYS ซึ่งนับวันต้นทางหากเป็นวันทำงาน" checked={includeStart} onCheckedChange={(checked) => update(setIncludeStart, checked)} />
              <ToggleCard id="business-include-end" label="นับวันที่สิ้นสุด" description="เปิดไว้เมื่อวันที่ปลายทางเป็นส่วนหนึ่งของช่วงงานหรือรอบรายงาน" checked={includeEnd} onCheckedChange={(checked) => update(setIncludeEnd, checked)} />
            </div>
          </TabsContent>
          <TabsContent value="shift" className="mt-6">
            <div className="grid gap-x-5 gap-y-6 md:grid-cols-3">
              <Field id="business-shift-start" label="วันที่ตั้งต้น" hint="ไม่นับวันที่ตั้งต้น เริ่มเดินจากวันถัดไปหรือวันก่อนหน้า"><Input id="business-shift-start" type="date" value={startDate} min="1900-01-01" max="2100-12-31" onChange={(event) => update(setStartDate, event.target.value)} /></Field>
              <Field id="business-direction" label="ทิศทาง"><Select value={direction} onValueChange={(value) => update(setDirection, value as BusinessDayDirection)}><SelectTrigger id="business-direction" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="add"><Plus className="size-4" />เพิ่มไปข้างหน้า</SelectItem><SelectItem value="subtract"><Minus className="size-4" />ลบย้อนหลัง</SelectItem></SelectContent></Select></Field>
              <Field id="business-shift-days" label="จำนวนวันทำการ" hint={`จำนวนเต็ม 0–${BUSINESS_DAYS_MAX_SHIFT.toLocaleString("en-US")}`}><Input id="business-shift-days" type="number" inputMode="numeric" min={0} max={BUSINESS_DAYS_MAX_SHIFT} step={1} value={businessDays} onChange={(event) => update(setBusinessDays, event.target.value)} /></Field>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="business-week-title">
        <div className="mb-5"><h2 id="business-week-title" className="flex items-center gap-2 font-semibold"><CalendarCheck2 className="size-4 text-primary" />กำหนดวันทำงานประจำสัปดาห์</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ปุ่มสีเขียวคือวันทำงาน ค่าเริ่มต้นจันทร์–ศุกร์ ปรับได้สำหรับร้านค้า งานกะ หรือองค์กรที่ทำงานวันเสาร์</p></div>
        <WorkweekSelector selected={workingWeekdays} onChange={(days) => update(setWorkingWeekdays, days)} />
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="business-holiday-title">
        <h2 id="business-holiday-title" className="mb-5 flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-primary" />วันหยุดที่ต้องตัดออก</h2>
        <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2">
          <Field id="business-holiday-preset" label="ชุดวันหยุดสำเร็จรูป" hint={`ข้อมูล ธปท. ปี ${BOT_HOLIDAY_RULESET.buddhistYear} · รายการหลัก 19 วัน · กรุงเทพฯ 20 วัน · อัปเดต ${BOT_HOLIDAY_RULESET.updatedAt}`}>
            <Select value={preset} onValueChange={(value) => update(setPreset, value as HolidayPreset)}><SelectTrigger id="business-holiday-preset" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">ไม่ใช้ preset — กรอกเอง</SelectItem><SelectItem value="bot-2026-national">ธปท. 2569 — รายการหลัก</SelectItem><SelectItem value="bot-2026-bangkok">ธปท. 2569 — กรุงเทพฯ รวม 16 ต.ค.</SelectItem></SelectContent></Select>
          </Field>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2"><Label htmlFor="business-custom-holidays" className="leading-5">วันหยุดบริษัทหรือวันหยุดเพิ่มเติม</Label><span className="text-xs text-muted-foreground">สูงสุด {BUSINESS_DAYS_MAX_CUSTOM_HOLIDAYS} รายการ</span></div>
            <Textarea id="business-custom-holidays" value={customHolidays} onChange={(event) => update(setCustomHolidays, event.target.value)} className="min-h-36 resize-y font-mono leading-6" placeholder={"2026-04-20, ปิดบริษัท\n2026-05-15, Company outing"} />
            <p className="text-xs leading-5 text-muted-foreground">หนึ่งวันต่อบรรทัดในรูปแบบ YYYY-MM-DD หรือ YYYY-MM-DD, ชื่อวันหยุด หากวันซ้ำกับ preset รายการกำหนดเองจะใช้แทน</p>
          </div>
        </div>
      </section>

      <div className="mt-7 border-t pt-5">
        <ActionBar>
          <Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-900 dark:hover:bg-emerald-800" onClick={calculate}>{mode === "range" ? <CalendarCheck2 className="size-4" /> : direction === "add" ? <Plus className="size-4" /> : <Minus className="size-4" />}{mode === "range" ? "คำนวณวันทำงาน" : `${direction === "add" ? "เพิ่ม" : "ลบ"}วันทำการ`}</Button>
          <ExampleButton onExample={loadExample} />
          <ClearButton onClear={clear} />
        </ActionBar>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}

      <div className="mt-5" aria-live="polite">
        {result ? <ResultPanel result={result} mode={mode} direction={direction} requestedDays={requestedDays} includeStart={includeStart} includeEnd={includeEnd} onClear={invalidate} /> : (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground">
            <div><CalendarCheck2 className="mx-auto mb-3 size-9 text-primary/70" /><p>เลือกช่วงวันที่หรือจำนวนวันทำการ แล้วกดคำนวณ</p><p className="mt-1 text-xs">ผลลัพธ์จะแยกวันทำงาน วันหยุดประจำสัปดาห์ และวันหยุดที่กำหนดให้ตรวจได้</p></div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground">
        <p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>คำว่า “วันทำงาน” หรือ “วันทำการ” อาจนิยามต่างกันตามสัญญา กฎหมาย ประเภทกิจการ จังหวัด และระเบียบองค์กร เครื่องมือนี้คำนวณตามวันที่และตัวเลือกที่คุณระบุ ไม่ใช่คำวินิจฉัยกำหนดเวลา สิทธิแรงงาน หรือวันครบกำหนดทางกฎหมาย</span></p>
        <p className="mt-2 flex items-start gap-2"><ChevronRight className="mt-1 size-4 shrink-0" /><span>Preset ธปท. ครอบคลุมเฉพาะปี 2569 และมีวันพิเศษ 16 ตุลาคมเฉพาะกรุงเทพมหานคร ธนาคารอิสลามและสาขาในนราธิวาส ปัตตานี ยะลา สตูล และสงขลาอาจมีวันเพิ่มตามประกาศที่เกี่ยวข้อง จึงต้องตรวจประกาศล่าสุดแล้วกรอกวันที่เพิ่มเอง</span></p>
      </div>
    </WorkspaceFrame>
  );
}
