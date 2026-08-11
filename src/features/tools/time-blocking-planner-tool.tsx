"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  Pencil,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_TIME_BLOCKING_SETTINGS,
  TIME_BLOCKING_CATEGORY_LABELS,
  TIME_BLOCKING_MAX_BLOCKS_PER_DAY,
  TIME_BLOCKING_MAX_NOTES_LENGTH,
  TIME_BLOCKING_MAX_TITLE_LENGTH,
  TIME_BLOCKING_STORAGE_KEY,
  TIME_BLOCKING_TEMPLATES,
  buildTimeBlockingCsv,
  buildTimeBlockingIcs,
  buildTimeBlockingSummary,
  calculateTimeBlockingMetrics,
  createEmptyTimeBlockingState,
  findTimeBlockConflicts,
  formatTimeBlockingDuration,
  isTimeBlockingDateKey,
  minutesToTime,
  normalizeTimeBlockingSettings,
  parseTimeBlockingStoredState,
  serializeTimeBlockingStoredState,
  shiftTimeBlock,
  suggestTimeBlockRange,
  timeBlockingToday,
  timeToMinutes,
  upsertTimeBlock,
  type TimeBlock,
  type TimeBlockCategory,
  type TimeBlockingSettings,
  type TimeBlockingTemplateKey,
} from "@/lib/tools/time-blocking";

type BlockForm = {
  title: string;
  start: string;
  end: string;
  category: TimeBlockCategory;
  notes: string;
};

const CATEGORY_CLASSES: Record<TimeBlockCategory, string> = {
  focus: "border-emerald-500/35 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100",
  meeting: "border-sky-500/35 bg-sky-500/12 text-sky-950 dark:text-sky-100",
  admin: "border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  break: "border-rose-500/35 bg-rose-500/10 text-rose-950 dark:text-rose-100",
  personal: "border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100",
  study: "border-cyan-500/35 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100",
  creative: "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-950 dark:text-fuchsia-100",
};

const CATEGORY_DOTS: Record<TimeBlockCategory, string> = {
  focus: "bg-emerald-500",
  meeting: "bg-sky-500",
  admin: "bg-amber-500",
  break: "bg-rose-400",
  personal: "bg-violet-500",
  study: "bg-cyan-500",
  creative: "bg-fuchsia-500",
};

function loadInitialState() {
  if (typeof window === "undefined") return createEmptyTimeBlockingState();
  try {
    return parseTimeBlockingStoredState(window.localStorage.getItem(TIME_BLOCKING_STORAGE_KEY));
  } catch {
    return createEmptyTimeBlockingState();
  }
}

function defaultForm(settings: TimeBlockingSettings, blocks: TimeBlock[] = [], anchor?: number): BlockForm {
  const range = suggestTimeBlockRange(blocks, settings, anchor, 60);
  return { title: "", start: minutesToTime(range.startMinutes), end: minutesToTime(range.endMinutes), category: "focus", notes: "" };
}

function dateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(Date.UTC(year!, month! - 1, day!, 12));
}

function changeDate(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function currentMinuteForDate(dateKey: string, nowMs: number): number | null {
  if (dateKey !== timeBlockingToday(nowMs)) return null;
  const date = new Date(nowMs);
  return date.getHours() * 60 + date.getMinutes();
}

function timelineHourMarks(settings: TimeBlockingSettings): number[] {
  const first = Math.ceil(settings.dayStartMinutes / 60) * 60;
  const marks: number[] = [];
  if (settings.dayStartMinutes % 60) marks.push(settings.dayStartMinutes);
  for (let minute = first; minute <= settings.dayEndMinutes; minute += 60) marks.push(minute);
  if (marks.at(-1) !== settings.dayEndMinutes) marks.push(settings.dayEndMinutes);
  return [...new Set(marks)];
}

export function TimeBlockingPlannerTool() {
  const [stored, setStored] = useState(loadInitialState);
  const [date, setDate] = useState(timeBlockingToday);
  const [form, setForm] = useState<BlockForm>(() => defaultForm(DEFAULT_TIME_BLOCKING_SETTINGS));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now);

  const settings = stored.settings;
  const blocks = useMemo(() => stored.schedules[date] ?? [], [date, stored.schedules]);
  const metrics = useMemo(() => calculateTimeBlockingMetrics(blocks, settings), [blocks, settings]);
  const startMinutes = timeToMinutes(form.start);
  const endMinutes = timeToMinutes(form.end);
  const liveConflicts = startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
    ? findTimeBlockConflicts(blocks, { startMinutes, endMinutes }, editingId ?? undefined)
    : [];
  const currentMinutes = currentMinuteForDate(date, nowMs);
  const timelineHeight = Math.max(560, ((settings.dayEndMinutes - settings.dayStartMinutes) / 60) * 80);
  const marks = timelineHourMarks(settings);
  const focusGoalPercent = Math.min(100, Math.round((metrics.focusMinutes / settings.dailyFocusGoalMinutes) * 100));

  useEffect(() => {
    let errorTimeout: number | undefined;
    try {
      window.localStorage.setItem(TIME_BLOCKING_STORAGE_KEY, serializeTimeBlockingStoredState(stored));
    } catch {
      errorTimeout = window.setTimeout(() => setError("Browser ไม่อนุญาตหรือมีพื้นที่ไม่พอสำหรับบันทึกแผน แต่ยังใช้งานในหน้าปัจจุบันได้"), 0);
    }
    return () => { if (errorTimeout !== undefined) window.clearTimeout(errorTimeout); };
  }, [stored]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const setDayBlocks = (nextBlocks: TimeBlock[]) => {
    setStored((current) => {
      const schedules = { ...current.schedules };
      if (nextBlocks.length) schedules[date] = nextBlocks;
      else delete schedules[date];
      return { ...current, schedules };
    });
  };

  const resetEditor = (nextBlocks = blocks, anchor?: number) => {
    setEditingId(null);
    setForm(defaultForm(settings, nextBlocks, anchor));
    setError("");
  };

  const editBlock = (block: TimeBlock) => {
    setEditingId(block.id);
    setForm({ title: block.title, start: minutesToTime(block.startMinutes), end: minutesToTime(block.endMinutes), category: block.category, notes: block.notes });
    setError("");
  };

  const saveBlock = () => {
    try {
      if (blocks.length >= TIME_BLOCKING_MAX_BLOCKS_PER_DAY && !editingId) throw new Error(`หนึ่งวันเพิ่มได้สูงสุด ${TIME_BLOCKING_MAX_BLOCKS_PER_DAY} บล็อก`);
      const start = timeToMinutes(form.start);
      const end = timeToMinutes(form.end);
      if (start === null || end === null) throw new Error("กรุณากรอกเวลาเริ่มและสิ้นสุดให้ครบ");
      const candidate: TimeBlock = {
        id: editingId ?? crypto.randomUUID(),
        title: form.title,
        startMinutes: start,
        endMinutes: end,
        category: form.category,
        notes: form.notes,
        completed: editingId ? blocks.find((block) => block.id === editingId)?.completed ?? false : false,
      };
      const next = upsertTimeBlock(blocks, candidate, settings);
      setDayBlocks(next);
      resetEditor(next, end);
      toast.success(editingId ? "บันทึกการแก้ไขแล้ว" : "เพิ่มบล็อกเวลาแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกบล็อกเวลาไม่สำเร็จ");
    }
  };

  const moveBlock = (block: TimeBlock, delta: number) => {
    try {
      const next = shiftTimeBlock(blocks, block.id, delta, settings);
      setDayBlocks(next);
      const shifted = next.find((candidate) => candidate.id === block.id)!;
      if (editingId === block.id) editBlock(shifted);
      setError("");
      toast.success(`เลื่อน ${delta > 0 ? "ไปข้างหน้า" : "ย้อนกลับ"} ${settings.snapMinutes} นาทีแล้ว`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เลื่อนบล็อกเวลาไม่สำเร็จ");
    }
  };

  const toggleCompleted = (id: string) => {
    setDayBlocks(blocks.map((block) => block.id === id ? { ...block, completed: !block.completed } : block));
  };

  const deleteBlock = (block: TimeBlock) => {
    if (!window.confirm(`ลบ “${block.title}” ออกจากแผนวันนี้หรือไม่?`)) return;
    const next = blocks.filter((candidate) => candidate.id !== block.id);
    setDayBlocks(next);
    if (editingId === block.id) resetEditor(next);
    toast.info("ลบบล็อกเวลาแล้ว");
  };

  const applyTemplate = (key: TimeBlockingTemplateKey) => {
    const template = TIME_BLOCKING_TEMPLATES[key];
    if (blocks.length && !window.confirm(`แทนที่แผนวันที่ ${date} ด้วย “${template.label}” หรือไม่?`)) return;
    const earliest = Math.min(...template.blocks.map((block) => block.startMinutes));
    const latest = Math.max(...template.blocks.map((block) => block.endMinutes));
    const nextSettings = normalizeTimeBlockingSettings({ ...settings, dayStartMinutes: Math.min(settings.dayStartMinutes, earliest), dayEndMinutes: Math.max(settings.dayEndMinutes, latest) });
    const nextBlocks = template.blocks.map((block) => ({ ...block, id: crypto.randomUUID(), completed: false }));
    setStored((current) => ({ ...current, settings: nextSettings, schedules: { ...current.schedules, [date]: nextBlocks } }));
    setEditingId(null);
    setForm(defaultForm(nextSettings, nextBlocks));
    setError("");
    toast.success(`โหลดแบบ “${template.label}” แล้ว`);
  };

  const updateSettings = (patch: Partial<TimeBlockingSettings>) => {
    const next = normalizeTimeBlockingSettings({ ...settings, ...patch });
    if (blocks.some((block) => block.startMinutes < next.dayStartMinutes || block.endMinutes > next.dayEndMinutes)) {
      setError("ยังมีบล็อกอยู่นอกช่วงเวลาใหม่ กรุณาเลื่อนหรือลบบล็อกนั้นก่อน");
      return;
    }
    setStored((current) => ({ ...current, settings: next }));
    setError("");
  };

  const clearDay = () => {
    if (!blocks.length || !window.confirm(`ล้างบล็อกทั้งหมดของวันที่ ${date} หรือไม่?`)) return;
    setDayBlocks([]);
    resetEditor([]);
    toast.info("ล้างแผนวันนี้แล้ว");
  };

  const changeSelectedDate = (nextDate: string) => {
    if (!isTimeBlockingDateKey(nextDate)) return;
    setDate(nextDate);
    const nextBlocks = stored.schedules[nextDate] ?? [];
    setEditingId(null);
    setForm(defaultForm(settings, nextBlocks));
    setError("");
  };

  const exportCsv = () => downloadText(buildTimeBlockingCsv(date, blocks), `meaw-time-blocking-${date}.csv`, "text/csv;charset=utf-8");
  const exportIcs = () => downloadText(buildTimeBlockingIcs(date, blocks), `meaw-time-blocking-${date}.ics`, "text/calendar;charset=utf-8");

  return (
    <WorkspaceFrame>
      <div className="time-blocking-print-surface">
        <section className="rounded-2xl border bg-background/55 p-4 sm:p-5" aria-labelledby="time-blocking-day-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="size-5" /></span>
              <div>
                <h2 id="time-blocking-day-title" className="font-semibold">แผนเวลารายวัน</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">กำหนดเวลาให้แต่ละงานก่อนเริ่มวัน ระบบจะเตือนทันทีเมื่อช่วงเวลาชนกัน</p>
              </div>
            </div>
            <div className="time-blocking-no-print flex flex-wrap items-end gap-2">
              <Button type="button" size="icon" variant="outline" aria-label="วันก่อนหน้า" onClick={() => changeSelectedDate(changeDate(date, -1))}><ChevronLeft /></Button>
              <div className="min-w-48 space-y-2">
                <Label htmlFor="time-blocking-date">วันที่วางแผน</Label>
                <Input id="time-blocking-date" type="date" min="2000-01-01" max="2100-12-31" value={date} onChange={(event) => changeSelectedDate(event.target.value)} data-testid="time-blocking-date" />
              </div>
              <Button type="button" size="icon" variant="outline" aria-label="วันถัดไป" onClick={() => changeSelectedDate(changeDate(date, 1))}><ChevronRight /></Button>
              <Button type="button" variant="outline" onClick={() => changeSelectedDate(timeBlockingToday())}>วันนี้</Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><Badge variant="secondary">{dateLabel(date)}</Badge><Badge variant="outline"><ShieldCheck className="size-3.5" />เก็บใน Browser</Badge><Badge variant="outline">{blocks.length}/{TIME_BLOCKING_MAX_BLOCKS_PER_DAY} บล็อก</Badge></div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปแผนวันนี้" data-testid="time-blocking-metrics">
          <div className="rounded-2xl border bg-primary/5 p-4"><p className="text-xs font-medium text-muted-foreground">เวลาที่วางแผน</p><p className="mt-2 text-2xl font-bold tabular-nums">{formatTimeBlockingDuration(metrics.plannedMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">จากช่วง {minutesToTime(settings.dayStartMinutes)}–{minutesToTime(settings.dayEndMinutes)}</p></div>
          <div className="rounded-2xl border bg-emerald-500/5 p-4"><p className="text-xs font-medium text-muted-foreground">งานโฟกัส</p><p className="mt-2 text-2xl font-bold tabular-nums">{formatTimeBlockingDuration(metrics.focusMinutes)}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${focusGoalPercent}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">เป้า {formatTimeBlockingDuration(settings.dailyFocusGoalMinutes)}</p></div>
          <div className="rounded-2xl border bg-sky-500/5 p-4"><p className="text-xs font-medium text-muted-foreground">เวลาว่างในกรอบวัน</p><p className="mt-2 text-2xl font-bold tabular-nums">{formatTimeBlockingDuration(metrics.freeMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">ช่วงว่างยาวสุด {formatTimeBlockingDuration(metrics.longestFreeMinutes)}</p></div>
          <div className="rounded-2xl border bg-amber-500/5 p-4"><p className="text-xs font-medium text-muted-foreground">ทำเสร็จแล้ว</p><p className="mt-2 text-2xl font-bold tabular-nums">{metrics.completedBlocks}/{blocks.length || 0} บล็อก</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-500" style={{ width: `${metrics.completionPercent}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{metrics.completionPercent}% ของเวลาที่วางแผน</p></div>
        </section>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(300px,0.76fr)_minmax(0,1.24fr)]">
          <aside className="time-blocking-no-print space-y-5 xl:sticky xl:top-24 xl:self-start" aria-label="เพิ่มและแก้ไขบล็อกเวลา">
            <section className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{editingId ? "แก้ไขบล็อกเวลา" : "เพิ่มบล็อกเวลา"}</h3><p className="mt-1 text-xs text-muted-foreground">ระยะขั้นต่ำ 15 นาที • ห้ามทับบล็อกอื่น</p></div>{editingId ? <Button type="button" size="icon-sm" variant="ghost" aria-label="ยกเลิกแก้ไข" onClick={() => resetEditor()}><X /></Button> : <Plus className="size-5 text-primary" />}</div>
              <div className="mt-5 space-y-4">
                <div className="space-y-2"><Label htmlFor="time-block-title">ชื่องาน</Label><Input id="time-block-title" value={form.title} maxLength={TIME_BLOCKING_MAX_TITLE_LENGTH} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="เช่น เขียนหน้า Landing page" data-testid="time-block-title" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label htmlFor="time-block-start">เริ่ม</Label><Input id="time-block-start" type="time" step={settings.snapMinutes * 60} value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} data-testid="time-block-start" /></div>
                  <div className="space-y-2"><Label htmlFor="time-block-end">สิ้นสุด</Label><Input id="time-block-end" type="time" step={settings.snapMinutes * 60} value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} data-testid="time-block-end" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="time-block-category">ประเภท</Label><Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value as TimeBlockCategory }))}><SelectTrigger id="time-block-category" className="w-full" data-testid="time-block-category"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TIME_BLOCKING_CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}><span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${CATEGORY_DOTS[value as TimeBlockCategory]}`} />{label}</span></SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="time-block-notes">โน้ต <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></Label><Textarea id="time-block-notes" value={form.notes} maxLength={TIME_BLOCKING_MAX_NOTES_LENGTH} rows={3} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="ผลลัพธ์ที่ต้องได้ หรือสิ่งที่ต้องเตรียม" /></div>
              </div>
              {liveConflicts.length ? <p role="alert" className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200" data-testid="time-block-live-conflict">เวลานี้ชนกับ “{liveConflicts.map((block) => block.title).join(", ")}”</p> : null}
              {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" data-testid="time-block-error">{error}</p> : null}
              <Button type="button" className="mt-5 w-full" onClick={saveBlock} data-testid="time-block-save">{editingId ? <Save /> : <Plus />}{editingId ? "บันทึกการแก้ไข" : "เพิ่มลงแผน"}</Button>
            </section>

            <section className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">เริ่มจากแบบสำเร็จ</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">แบบจะใช้แทนแผนของวันที่เลือก แต่ไม่กระทบวันอื่น</p></div></div>
              <div className="mt-4 grid gap-2">{Object.entries(TIME_BLOCKING_TEMPLATES).map(([key, template]) => <Button key={key} type="button" variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => applyTemplate(key as TimeBlockingTemplateKey)} data-testid={`time-blocking-template-${key}`}><span><span className="block font-semibold">{template.label}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{template.description}</span></span></Button>)}</div>
            </section>

            <details className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <summary className="cursor-pointer font-semibold">กรอบวันและการตั้งค่า</summary>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="time-blocking-day-start">เริ่มวัน</Label><Input id="time-blocking-day-start" type="time" step={900} value={minutesToTime(settings.dayStartMinutes)} onChange={(event) => { const value = timeToMinutes(event.target.value); if (value !== null) updateSettings({ dayStartMinutes: value }); }} /></div><div className="space-y-2"><Label htmlFor="time-blocking-day-end">จบวัน</Label><Input id="time-blocking-day-end" type="time" step={900} value={minutesToTime(settings.dayEndMinutes)} onChange={(event) => { const value = timeToMinutes(event.target.value); if (value !== null) updateSettings({ dayEndMinutes: value }); }} /></div></div>
                <div className="space-y-2"><Label htmlFor="time-blocking-snap">ขยับเวลา</Label><Select value={String(settings.snapMinutes)} onValueChange={(value) => updateSettings({ snapMinutes: Number(value) as 15 | 30 | 60 })}><SelectTrigger id="time-blocking-snap" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{[15, 30, 60].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} นาที</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="time-blocking-focus-goal">เป้างานโฟกัส (นาที)</Label><Input id="time-blocking-focus-goal" type="number" min={15} max={720} step={15} value={settings.dailyFocusGoalMinutes} onChange={(event) => updateSettings({ dailyFocusGoalMinutes: Number(event.target.value) })} /></div>
              </div>
            </details>
          </aside>

          <section aria-labelledby="time-blocking-timeline-title">
            <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 id="time-blocking-timeline-title" className="font-semibold">Timeline · {dateLabel(date)}</h3><p className="mt-1 text-xs text-muted-foreground">แตะบล็อกเพื่อแก้ไข หรือใช้รายการด้านล่างสำหรับปุ่มขนาดใหญ่บนมือถือ</p></div><Badge variant={blocks.length ? "secondary" : "outline"}>{blocks.length ? `${formatTimeBlockingDuration(metrics.plannedMinutes)} ถูกจัดเวลา` : "ยังไม่มีแผน"}</Badge></div>
              <div className="mt-5 overflow-hidden rounded-2xl border bg-[linear-gradient(to_bottom,transparent_49%,color-mix(in_oklch,var(--border)_35%,transparent)_50%,transparent_51%)] bg-[length:100%_40px]" data-testid="time-blocking-timeline">
                <div className="relative" style={{ height: `${timelineHeight}px` }}>
                  {marks.map((minute) => {
                    const top = ((minute - settings.dayStartMinutes) / (settings.dayEndMinutes - settings.dayStartMinutes)) * timelineHeight;
                    return <div key={minute} className="pointer-events-none absolute inset-x-0 flex items-center" style={{ top: `${top}px` }}><span className="w-14 shrink-0 -translate-y-1/2 px-2 text-right font-mono text-[10px] text-muted-foreground">{minutesToTime(minute)}</span><span className="h-px flex-1 bg-border/70" /></div>;
                  })}
                  {currentMinutes !== null && currentMinutes >= settings.dayStartMinutes && currentMinutes <= settings.dayEndMinutes ? <div className="pointer-events-none absolute right-2 left-12 z-20 flex items-center" style={{ top: `${((currentMinutes - settings.dayStartMinutes) / (settings.dayEndMinutes - settings.dayStartMinutes)) * timelineHeight}px` }} aria-label={`เวลาปัจจุบัน ${minutesToTime(currentMinutes)}`}><span className="size-2.5 rounded-full bg-rose-500" /><span className="h-0.5 flex-1 bg-rose-500/80" /></div> : null}
                  {blocks.map((block, index) => {
                    const top = ((block.startMinutes - settings.dayStartMinutes) / (settings.dayEndMinutes - settings.dayStartMinutes)) * timelineHeight;
                    const height = Math.max(17, ((block.endMinutes - block.startMinutes) / (settings.dayEndMinutes - settings.dayStartMinutes)) * timelineHeight - 3);
                    const selected = editingId === block.id;
                    return <button key={block.id} type="button" className={`absolute right-2 left-16 z-10 overflow-hidden rounded-xl border px-2.5 py-1 text-left shadow-sm transition-[box-shadow,transform] motion-reduce:transition-none ${CATEGORY_CLASSES[block.category]} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:-translate-y-0.5 hover:shadow-md"} ${block.completed ? "opacity-60" : ""}`} style={{ top: `${top}px`, height: `${height}px` }} onClick={() => editBlock(block)} aria-label={`แก้ไข ${block.title} เวลา ${minutesToTime(block.startMinutes)} ถึง ${minutesToTime(block.endMinutes)}`} data-testid={`time-blocking-timeline-block-${index}`}><span className="flex min-w-0 items-center gap-2 text-[11px] leading-4"><span className="shrink-0 font-mono font-bold tabular-nums">{minutesToTime(block.startMinutes)}</span><strong className={`truncate ${block.completed ? "line-through" : ""}`}>{block.title}</strong>{height >= 42 ? <span className="ml-auto shrink-0 opacity-70">{TIME_BLOCKING_CATEGORY_LABELS[block.category]}</span> : null}</span>{height >= 62 && block.notes ? <span className="mt-1 block truncate text-[10px] opacity-70">{block.notes}</span> : null}</button>;
                  })}
                  {!blocks.length ? <div className="absolute inset-x-14 top-1/3 grid place-items-center rounded-2xl border border-dashed bg-background/80 p-6 text-center" data-testid="time-blocking-day-empty"><div><CalendarDays className="mx-auto size-8 text-primary/55" /><p className="mt-3 font-semibold">วันนี้ยังไม่มีบล็อกเวลา</p><p className="mt-1 text-xs leading-5 text-muted-foreground">เพิ่มงานด้านซ้าย หรือเลือกแบบสำเร็จเพื่อเริ่มวางแผน</p></div></div> : null}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">รายการวันนี้</h3><p className="mt-1 text-xs text-muted-foreground">ทำเสร็จ แก้ไข หรือนัดเวลาใหม่ทีละ {settings.snapMinutes} นาที</p></div><Badge variant="outline">พัก {formatTimeBlockingDuration(metrics.breakMinutes)}</Badge></div>
              <div className="mt-4 space-y-3">
                {blocks.map((block, index) => <article key={block.id} className={`rounded-2xl border p-3 sm:p-4 ${editingId === block.id ? "border-primary bg-primary/5" : "bg-muted/10"}`} data-testid={`time-blocking-item-${index}`}>
                  <div className="flex items-start gap-3"><Button type="button" size="icon-sm" variant={block.completed ? "default" : "outline"} className="mt-0.5 shrink-0 rounded-full" onClick={() => toggleCompleted(block.id)} aria-label={`${block.completed ? "ยกเลิกสถานะเสร็จของ" : "ทำเครื่องหมายว่าเสร็จ"} ${block.title}`}>{block.completed ? <Check /> : <span className="size-2 rounded-full bg-current" />}</Button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={`font-semibold ${block.completed ? "text-muted-foreground line-through" : ""}`}>{block.title}</p><Badge variant="outline" className="text-[10px]"><span className={`size-1.5 rounded-full ${CATEGORY_DOTS[block.category]}`} />{TIME_BLOCKING_CATEGORY_LABELS[block.category]}</Badge></div><p className="mt-1 font-mono text-xs font-semibold tabular-nums">{minutesToTime(block.startMinutes)}–{minutesToTime(block.endMinutes)} · {formatTimeBlockingDuration(block.endMinutes - block.startMinutes)}</p>{block.notes ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{block.notes}</p> : null}</div></div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3"><Button type="button" size="sm" variant="outline" onClick={() => moveBlock(block, -settings.snapMinutes)} aria-label={`เลื่อน ${block.title} ย้อนกลับ ${settings.snapMinutes} นาที`}><ChevronLeft />-{settings.snapMinutes}</Button><Button type="button" size="sm" variant="outline" onClick={() => moveBlock(block, settings.snapMinutes)} data-testid={index === 0 ? "time-block-shift-forward" : undefined} aria-label={`เลื่อน ${block.title} ไปข้างหน้า ${settings.snapMinutes} นาที`}>+{settings.snapMinutes}<ChevronRight /></Button><Button type="button" size="sm" variant="outline" onClick={() => editBlock(block)}><Pencil />แก้ไข</Button><Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => deleteBlock(block)}><Trash2 />ลบ</Button></div>
                </article>)}
                {!blocks.length ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">รายการจะปรากฏหลังเพิ่มบล็อกเวลา</p> : null}
              </div>
            </div>

            <div className="time-blocking-no-print mt-5 rounded-2xl border bg-muted/10 p-4 sm:p-5">
              <div className="flex items-start gap-3"><ClipboardList className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">เก็บและนำแผนไปใช้</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">CSV ป้องกันสูตรจากข้อความที่ขึ้นต้นด้วย = + - @ และ ICS ใช้เวลาท้องถิ่นแบบ floating ควรตรวจเขตเวลาในแอปปฏิทินก่อนบันทึก</p></div></div>
              <div className="mt-4"><ActionBar><Button type="button" variant="outline" disabled={!blocks.length} onClick={() => void copyText(buildTimeBlockingSummary(date, blocks, settings), "คัดลอกแผนแล้ว")}><Copy />คัดลอก</Button><Button type="button" variant="outline" disabled={!blocks.length} onClick={exportCsv} data-testid="time-blocking-csv"><Download />CSV</Button><Button type="button" variant="outline" disabled={!blocks.length} onClick={exportIcs} data-testid="time-blocking-ics"><CalendarPlus />ICS</Button><Button type="button" variant="outline" disabled={!blocks.length} onClick={() => window.print()}><Printer />พิมพ์</Button><Button type="button" variant="ghost" disabled={!blocks.length} className="text-destructive hover:text-destructive" onClick={clearDay}><Trash2 />ล้างวันนี้</Button></ActionBar></div>
            </div>
          </section>
        </div>

        <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
          <ShieldCheck className="text-sky-600" />
          <AlertTitle>แผนอยู่ใน Browser ของอุปกรณ์นี้</AlertTitle>
          <AlertDescription>ไม่มีการเชื่อม Google Calendar หรือส่งชื่องานไป Server ข้อมูลอาจหายเมื่อล้าง Site data ใช้ Private mode หรือเปลี่ยนอุปกรณ์ และแผนนี้ไม่ส่งการแจ้งเตือนเมื่อปิดหน้าเว็บ</AlertDescription>
        </Alert>
      </div>
    </WorkspaceFrame>
  );
}
