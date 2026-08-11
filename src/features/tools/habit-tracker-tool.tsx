"use client";

import { useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionBar, WorkspaceFrame, downloadText } from "@/components/tools/tool-controls";
import {
  HABIT_FREQUENCY_LABELS,
  HABIT_TEMPLATES,
  HABIT_TRACKER_MAX_HABITS,
  HABIT_TRACKER_STORAGE_KEY,
  HABIT_WEEKDAY_LABELS,
  buildHabitTrackerCsv,
  calculateHabitStats,
  createEmptyHabitTrackerState,
  habitDateRange,
  habitToday,
  isHabitChecked,
  isHabitScheduledOn,
  normalizeHabit,
  parseHabitTrackerStoredState,
  serializeHabitTrackerStoredState,
  shiftHabitDate,
  toggleHabitCheckin,
  type Habit,
  type HabitColor,
  type HabitFrequency,
  type HabitTrackerStoredState,
} from "@/lib/tools/habit-tracker";

const COLOR_OPTIONS: Array<{ value: HabitColor; label: string; dot: string }> = [
  { value: "mint", label: "เขียวมิ้นต์", dot: "bg-emerald-500" },
  { value: "sky", label: "ฟ้า", dot: "bg-sky-500" },
  { value: "amber", label: "เหลือง", dot: "bg-amber-500" },
  { value: "rose", label: "ชมพู", dot: "bg-rose-500" },
  { value: "violet", label: "ม่วง", dot: "bg-violet-500" },
  { value: "orange", label: "ส้ม", dot: "bg-orange-500" },
];

const HABIT_STYLES: Record<HabitColor, { surface: string; active: string; dot: string; bar: string }> = {
  mint: { surface: "border-emerald-500/25 bg-emerald-500/[0.045]", active: "border-emerald-600 bg-emerald-500 text-white", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  sky: { surface: "border-sky-500/25 bg-sky-500/[0.045]", active: "border-sky-600 bg-sky-500 text-white", dot: "bg-sky-500", bar: "bg-sky-500" },
  amber: { surface: "border-amber-500/25 bg-amber-500/[0.045]", active: "border-amber-600 bg-amber-500 text-white", dot: "bg-amber-500", bar: "bg-amber-500" },
  rose: { surface: "border-rose-500/25 bg-rose-500/[0.045]", active: "border-rose-600 bg-rose-500 text-white", dot: "bg-rose-500", bar: "bg-rose-500" },
  violet: { surface: "border-violet-500/25 bg-violet-500/[0.045]", active: "border-violet-600 bg-violet-500 text-white", dot: "bg-violet-500", bar: "bg-violet-500" },
  orange: { surface: "border-orange-500/25 bg-orange-500/[0.045]", active: "border-orange-600 bg-orange-500 text-white", dot: "bg-orange-500", bar: "bg-orange-500" },
};

type HabitDraft = { title: string; color: HabitColor; frequency: HabitFrequency; weekdays: number[] };

const EMPTY_DRAFT: HabitDraft = { title: "", color: "mint", frequency: "daily", weekdays: [0, 1, 2, 3, 4, 5, 6] };

function dateLabel(dateKey: string, weekday = true): string {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Intl.DateTimeFormat("th-TH", { weekday: weekday ? "long" : undefined, day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shortDateLabel(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function scheduleLabel(habit: Habit): string {
  if (habit.frequency !== "custom") return HABIT_FREQUENCY_LABELS[habit.frequency];
  return habit.weekdays.map((day) => HABIT_WEEKDAY_LABELS[day]).join(" ");
}

export function HabitTrackerTool() {
  const today = useMemo(() => habitToday(), []);
  const [state, setState] = useState<HabitTrackerStoredState>(() => {
    try { return parseHabitTrackerStoredState(window.localStorage.getItem(HABIT_TRACKER_STORAGE_KEY), today); }
    catch { return createEmptyHabitTrackerState(); }
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState<HabitDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const historyDates = useMemo(() => habitDateRange(today, 30), [today]);
  const scheduledHabits = useMemo(() => state.habits.filter((habit) => isHabitScheduledOn(habit, selectedDate)), [selectedDate, state.habits]);
  const selectedDone = scheduledHabits.filter((habit) => isHabitChecked(state.checkins, habit.id, selectedDate)).length;
  const selectedPercent = scheduledHabits.length ? Math.round((selectedDone / scheduledHabits.length) * 100) : 0;
  const averageThirtyDayRate = state.habits.length
    ? Math.round(state.habits.reduce((total, habit) => total + calculateHabitStats(habit, state.checkins, today).completionPercent, 0) / state.habits.length)
    : 0;

  function persist(next: HabitTrackerStoredState) {
    const normalized = parseHabitTrackerStoredState(serializeHabitTrackerStoredState(next), today);
    setState(normalized);
    try {
      window.localStorage.setItem(HABIT_TRACKER_STORAGE_KEY, JSON.stringify(normalized));
      setError("");
    } catch {
      setError("Browser บันทึกข้อมูลไม่ได้ พื้นที่อาจเต็มหรือโหมดนี้ปิดการเก็บข้อมูล กรุณาส่งออก JSON ก่อนปิดหน้า");
    }
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setError("");
  }

  function applyFrequency(frequency: HabitFrequency) {
    const weekdays = frequency === "daily" ? [0, 1, 2, 3, 4, 5, 6]
      : frequency === "weekdays" ? [1, 2, 3, 4, 5]
        : frequency === "weekends" ? [0, 6]
          : draft.frequency === "custom" ? draft.weekdays : [1];
    setDraft((current) => ({ ...current, frequency, weekdays }));
  }

  function saveHabit() {
    const current = editingId ? state.habits.find((habit) => habit.id === editingId) : undefined;
    if (!current && state.habits.length >= HABIT_TRACKER_MAX_HABITS) {
      setError(`เพิ่มได้สูงสุด ${HABIT_TRACKER_MAX_HABITS} กิจวัตร เพื่อให้หน้าเช็กอินอ่านง่าย`);
      return;
    }
    if (draft.frequency === "custom" && !draft.weekdays.length) {
      setError("กรุณาเลือกอย่างน้อย 1 วันสำหรับกิจวัตรแบบเลือกวันเอง");
      return;
    }
    const habit = normalizeHabit({
      ...draft,
      id: current?.id ?? crypto.randomUUID(),
      createdDate: current?.createdDate ?? today,
    }, state.habits.length, today);
    if (!habit) {
      setError("กรุณาตั้งชื่อกิจวัตรก่อนบันทึก");
      return;
    }
    persist({
      ...state,
      habits: current ? state.habits.map((item) => item.id === current.id ? habit : item) : [...state.habits, habit],
    });
    resetDraft();
    toast.success(current ? "แก้ไขกิจวัตรแล้ว" : "เพิ่มกิจวัตรแล้ว");
  }

  function addTemplate(template: (typeof HABIT_TEMPLATES)[number]) {
    if (state.habits.length >= HABIT_TRACKER_MAX_HABITS) {
      setError(`เพิ่มได้สูงสุด ${HABIT_TRACKER_MAX_HABITS} กิจวัตร`);
      return;
    }
    if (state.habits.some((habit) => habit.title === template.title)) {
      toast.info("มีกิจวัตรนี้อยู่แล้ว");
      return;
    }
    const habit = normalizeHabit({ ...template, id: crypto.randomUUID(), createdDate: today }, state.habits.length, today);
    if (!habit) return;
    persist({ ...state, habits: [...state.habits, habit] });
    toast.success(`เพิ่ม “${habit.title}” แล้ว`);
  }

  function editHabit(habit: Habit) {
    setEditingId(habit.id);
    setDraft({ title: habit.title, color: habit.color, frequency: habit.frequency, weekdays: [...habit.weekdays] });
    setError("");
    document.getElementById("habit-form-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteHabit(habit: Habit) {
    if (!window.confirm(`ลบ “${habit.title}” และประวัติทั้งหมดของกิจวัตรนี้หรือไม่?`)) return;
    const checkins: Record<string, string[]> = {};
    for (const [date, ids] of Object.entries(state.checkins)) {
      const remaining = ids.filter((id) => id !== habit.id);
      if (remaining.length) checkins[date] = remaining;
    }
    persist({ habits: state.habits.filter((item) => item.id !== habit.id), checkins });
    if (editingId === habit.id) resetDraft();
    toast.info("ลบกิจวัตรแล้ว");
  }

  function toggleCheckin(habit: Habit, dateKey: string) {
    if (dateKey > today) return;
    try {
      persist(toggleHabitCheckin(state, habit.id, dateKey));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เช็กอินไม่ได้");
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("ไฟล์สำรองต้องมีขนาดไม่เกิน 1 MB");
      return;
    }
    try {
      const raw = await file.text();
      const candidate = JSON.parse(raw) as unknown;
      if (!candidate || typeof candidate !== "object" || !("habits" in candidate)) throw new Error("invalid");
      const imported = parseHabitTrackerStoredState(raw, today);
      persist(imported);
      resetDraft();
      toast.success(`นำเข้า ${imported.habits.length} กิจวัตรแล้ว`);
    } catch {
      setError("ไฟล์ JSON ไม่ใช่ข้อมูลสำรองของ Habit Tracker หรือรูปแบบไม่ถูกต้อง");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  function clearAll() {
    if (!state.habits.length || !window.confirm("ลบกิจวัตรและประวัติทั้งหมดในอุปกรณ์นี้หรือไม่? การทำรายการนี้ย้อนกลับไม่ได้หากไม่มีไฟล์สำรอง")) return;
    persist(createEmptyHabitTrackerState());
    resetDraft();
    toast.info("ล้าง Habit Tracker แล้ว");
  }

  return (
    <WorkspaceFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_45%),linear-gradient(135deg,color-mix(in_oklch,var(--background)_94%,#dcfce7),var(--background))] p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="gap-1.5"><Activity className="size-3.5" />เช็กอินเบา ๆ ไม่กดดันตัวเอง</Badge>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">Habit Tracker สำหรับกิจวัตรที่อยากทำต่อเนื่อง</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">ตั้งวันของแต่ละกิจวัตร เช็กอินย้อนหลัง และดูความสม่ำเสมอ 30 วัน วันที่พลาดเป็นเพียงข้อมูล ไม่ใช่คะแนนตัดสินตัวเอง</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center" data-testid="habit-summary">
              <div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{state.habits.length}</p><p className="mt-1 text-[11px] text-muted-foreground">กิจวัตร</p></div>
              <div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{selectedPercent}%</p><p className="mt-1 text-[11px] text-muted-foreground">วันที่เลือก</p></div>
              <div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{averageThirtyDayRate}%</p><p className="mt-1 text-[11px] text-muted-foreground">เฉลี่ย 30 วัน</p></div>
            </div>
          </div>
        </section>

        {error ? <Alert variant="destructive" data-testid="habit-error"><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <aside className="space-y-5">
            <section className="rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="habit-form-title">
              <div className="flex items-start justify-between gap-3">
                <div><h3 id="habit-form-title" className="font-semibold">{editingId ? "แก้ไขกิจวัตร" : "เพิ่มกิจวัตรใหม่"}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">เริ่ม 1–3 เรื่องก่อน แล้วค่อยเพิ่มเมื่อทำได้สม่ำเสมอ</p></div>
                <Badge variant="outline">{state.habits.length}/{HABIT_TRACKER_MAX_HABITS}</Badge>
              </div>
              <div className="mt-5 space-y-4">
                <div className="space-y-2"><Label htmlFor="habit-title">ชื่อกิจวัตร</Label><Input id="habit-title" data-testid="habit-title" maxLength={60} placeholder="เช่น อ่านหนังสือ 20 นาที" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") saveHabit(); }} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="habit-frequency">ทำวันไหน</Label><Select value={draft.frequency} onValueChange={(value) => applyFrequency(value as HabitFrequency)}><SelectTrigger id="habit-frequency" data-testid="habit-frequency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(HABIT_FREQUENCY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="habit-color">สีประจำกิจวัตร</Label><Select value={draft.color} onValueChange={(value) => setDraft((current) => ({ ...current, color: value as HabitColor }))}><SelectTrigger id="habit-color" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{COLOR_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}><span className={`size-2.5 rounded-full ${option.dot}`} />{option.label}</SelectItem>)}</SelectContent></Select></div>
                </div>
                {draft.frequency === "custom" ? <fieldset><legend className="text-sm font-medium">เลือกวันในสัปดาห์</legend><div className="mt-2 grid grid-cols-7 gap-1.5" data-testid="habit-weekdays">{HABIT_WEEKDAY_LABELS.map((label, day) => <button key={label} type="button" className={`min-h-10 rounded-xl border text-xs font-semibold transition-colors ${draft.weekdays.includes(day) ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`} aria-pressed={draft.weekdays.includes(day)} onClick={() => setDraft((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day].sort() }))}>{label}</button>)}</div></fieldset> : null}
                <div className="flex flex-wrap gap-2 pt-1"><Button type="button" onClick={saveHabit} data-testid="habit-save"><Plus />{editingId ? "บันทึกการแก้ไข" : "เพิ่มกิจวัตร"}</Button>{editingId ? <Button type="button" variant="outline" onClick={resetDraft}><RotateCcw />ยกเลิก</Button> : null}</div>
              </div>
            </section>

          </aside>

          <section className="space-y-5" aria-labelledby="habit-checkin-title">
            <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 id="habit-checkin-title" className="font-semibold">เช็กอินประจำวัน</h3><p className="mt-1 text-xs text-muted-foreground">{dateLabel(selectedDate)}</p></div>
                <div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" aria-label="วันก่อนหน้า" disabled={selectedDate <= "2000-01-01"} onClick={() => setSelectedDate((date) => shiftHabitDate(date, -1))}><ChevronLeft /></Button><Input type="date" min="2000-01-01" max={today} value={selectedDate} className="w-[150px]" aria-label="เลือกวันที่เช็กอิน" onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value); }} /><Button type="button" size="icon" variant="outline" aria-label="วันถัดไป" disabled={selectedDate >= today} onClick={() => setSelectedDate((date) => shiftHabitDate(date, 1))}><ChevronRight /></Button></div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-label={`ทำแล้ว ${selectedPercent}%`}><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${selectedPercent}%` }} /></div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{scheduledHabits.length ? `ทำแล้ว ${selectedDone} จาก ${scheduledHabits.length}` : "ไม่มีกิจวัตรที่กำหนดวันนี้"}</span>{selectedDate !== today ? <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setSelectedDate(today)}>กลับวันนี้</Button> : <span>วันนี้</span>}</div>
              <div className="mt-4 space-y-2" data-testid="habit-daily-list">
                {scheduledHabits.map((habit) => {
                  const checked = isHabitChecked(state.checkins, habit.id, selectedDate);
                  const style = HABIT_STYLES[habit.color];
                  return <button key={habit.id} type="button" className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transition-none ${style.surface}`} aria-pressed={checked} onClick={() => toggleCheckin(habit, selectedDate)} data-testid={`habit-daily-${habit.id}`}><span className={`grid size-10 shrink-0 place-items-center rounded-full border-2 ${checked ? style.active : "bg-background text-muted-foreground"}`}>{checked ? <Check className="size-5" /> : <span className={`size-2.5 rounded-full ${style.dot}`} />}</span><span className="min-w-0 flex-1"><strong className={checked ? "text-muted-foreground line-through" : ""}>{habit.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{scheduleLabel(habit)}</span></span><span className="shrink-0 text-xs font-semibold text-muted-foreground">{checked ? "ทำแล้ว" : "แตะเช็กอิน"}</span></button>;
                })}
                {!scheduledHabits.length ? <div className="rounded-2xl border border-dashed p-6 text-center"><CalendarDays className="mx-auto size-8 text-primary/50" /><p className="mt-3 font-semibold">วันนี้เว้นว่างได้</p><p className="mt-1 text-xs leading-5 text-muted-foreground">เพิ่มกิจวัตรใหม่หรือเลือกวันที่อื่น ประวัติเดิมจะยังอยู่ในอุปกรณ์นี้</p></div> : null}
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
          <div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-amber-500" /><div><h3 className="font-semibold">เริ่มจากแบบง่าย</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">กดเพื่อเพิ่ม แล้วแก้ชื่อหรือวันให้เข้ากับชีวิตจริงได้</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{HABIT_TEMPLATES.map((template, index) => <Button key={template.title} type="button" variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => addTemplate(template)} data-testid={index === 0 ? "habit-template-first" : undefined}><span className={`size-2.5 shrink-0 rounded-full ${HABIT_STYLES[template.color].dot}`} /><span><span className="block font-semibold">{template.title}</span><span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{HABIT_FREQUENCY_LABELS[template.frequency]}</span></span></Button>)}</div>
        </section>

        <section className="rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="habit-history-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 id="habit-history-title" className="font-semibold">ความสม่ำเสมอ 30 วัน</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">ช่องสีคือวันที่เช็กอิน ช่องขอบคือวันที่กำหนดแต่ยังไม่ได้ทำ วันว่างไม่ถูกนับเป็นพลาด</p></div><Badge variant="outline"><Target className="size-3.5" />ถึง {shortDateLabel(today)}</Badge></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2" data-testid="habit-history-list">
            {state.habits.map((habit, index) => {
              const stats = calculateHabitStats(habit, state.checkins, today);
              const style = HABIT_STYLES[habit.color];
              return <article key={habit.id} className={`rounded-2xl border p-4 ${style.surface}`} data-testid={`habit-card-${index}`}>
                <div className="flex items-start gap-3"><span className={`mt-1 size-3 shrink-0 rounded-full ${style.dot}`} /><div className="min-w-0 flex-1"><h4 className="font-semibold">{habit.title}</h4><p className="mt-1 text-xs text-muted-foreground">{scheduleLabel(habit)}</p></div><div className="flex shrink-0 gap-1"><Button type="button" size="icon-sm" variant="ghost" aria-label={`แก้ไข ${habit.title}`} onClick={() => editHabit(habit)}><Pencil /></Button><Button type="button" size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`ลบ ${habit.title}`} onClick={() => deleteHabit(habit)}><Trash2 /></Button></div></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border bg-background/65 p-2"><p className="flex items-center justify-center gap-1 font-bold tabular-nums"><Flame className="size-3.5 text-orange-500" />{stats.currentStreak}</p><p className="mt-1 text-[10px] text-muted-foreground">ต่อเนื่อง</p></div><div className="rounded-xl border bg-background/65 p-2"><p className="font-bold tabular-nums">{stats.bestStreak}</p><p className="mt-1 text-[10px] text-muted-foreground">ดีที่สุด</p></div><div className="rounded-xl border bg-background/65 p-2"><p className="font-bold tabular-nums">{stats.completionPercent}%</p><p className="mt-1 text-[10px] text-muted-foreground">30 วัน</p></div></div>
                <div className="mt-4 grid grid-cols-10 gap-1.5" aria-label={`ประวัติ 30 วันของ ${habit.title}`}>{historyDates.map((date) => {
                  const scheduled = isHabitScheduledOn(habit, date);
                  const checked = scheduled && isHabitChecked(state.checkins, habit.id, date);
                  if (!scheduled) return <span key={date} className="aspect-square rounded-[5px] bg-muted/35" title={`${date}: ไม่ได้กำหนด`} />;
                  return <button key={date} type="button" className={`aspect-square rounded-[5px] border transition-transform hover:scale-110 motion-reduce:transition-none ${checked ? `${style.active} shadow-sm` : "bg-background/75 hover:border-primary"}`} aria-label={`${checked ? "ยกเลิกเช็กอิน" : "เช็กอิน"} ${habit.title} วันที่ ${date}`} aria-pressed={checked} onClick={() => toggleCheckin(habit, date)}>{checked ? <Check className="mx-auto size-2.5 sm:size-3" /> : null}</button>;
                })}</div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>{shortDateLabel(historyDates[0] ?? today)}</span><span>{stats.completedDays}/{stats.scheduledDays} วันที่กำหนด</span><span>วันนี้</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${style.bar}`} style={{ width: `${stats.completionPercent}%` }} /></div>
              </article>;
            })}
            {!state.habits.length ? <div className="lg:col-span-2 rounded-2xl border border-dashed p-8 text-center"><Activity className="mx-auto size-9 text-primary/45" /><p className="mt-3 font-semibold">เพิ่มกิจวัตรแรกเพื่อเริ่มดูความต่อเนื่อง</p><p className="mt-1 text-xs text-muted-foreground">เลือกแบบง่ายด้านบนหรือสร้างตารางวันของตัวเอง</p></div> : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
          <div className="flex items-start gap-3"><Download className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">สำรองและนำข้อมูลไปใช้</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">CSV สรุปวันที่กำหนดใน 30 วันล่าสุด ส่วน JSON ใช้สำรองและย้ายข้อมูลระหว่าง Browser ด้วยตนเอง</p></div></div>
          <div className="mt-4"><ActionBar><Button type="button" variant="outline" disabled={!state.habits.length} data-testid="habit-export-csv" onClick={() => downloadText(buildHabitTrackerCsv(state, today), `meaw-habit-tracker-${today}.csv`, "text/csv;charset=utf-8")}><Download />CSV 30 วัน</Button><Button type="button" variant="outline" disabled={!state.habits.length} data-testid="habit-export-json" onClick={() => downloadText(JSON.stringify(state, null, 2), `meaw-habit-tracker-backup-${today}.json`, "application/json;charset=utf-8")}><Download />สำรอง JSON</Button><input ref={importRef} type="file" className="sr-only" accept="application/json,.json" aria-label="นำเข้าไฟล์สำรอง Habit Tracker" onChange={(event) => void importBackup(event.target.files?.[0])} /><Button type="button" variant="outline" data-testid="habit-import-json" onClick={() => importRef.current?.click()}><Upload />นำเข้า JSON</Button><Button type="button" variant="ghost" disabled={!state.habits.length} className="text-destructive hover:text-destructive" onClick={clearAll}><Trash2 />ล้างทั้งหมด</Button></ActionBar></div>
        </section>

        <Alert className="border-sky-500/30 bg-sky-500/5">
          <ShieldCheck className="text-sky-600" />
          <AlertTitle>ข้อมูลอยู่ใน Browser ของอุปกรณ์นี้</AlertTitle>
          <AlertDescription>ชื่อกิจวัตรและประวัติไม่ถูกส่งไป Server และไม่ซิงก์ข้ามอุปกรณ์ อาจหายเมื่อล้าง Site data ใช้ Private mode หรือเปลี่ยนเครื่อง จึงควรสำรอง JSON เป็นระยะ เครื่องมือนี้ไม่ส่ง Notification และไม่ใช้แทนคำแนะนำทางการแพทย์หรือสุขภาพ</AlertDescription>
        </Alert>
      </div>
    </WorkspaceFrame>
  );
}
