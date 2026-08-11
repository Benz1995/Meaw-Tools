"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Eraser,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileUp,
  FlaskConical,
  Plus,
  Printer,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, copyText, downloadBlob, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CALENDAR_MAKER_MAX_JSON_LENGTH,
  addCalendarMakerEvent,
  calendarMakerCsv,
  calendarMakerEventsText,
  calendarMakerIcs,
  calendarMakerSvg,
  calendarMakerToText,
  createCalendarMaker,
  getCalendarMakerMonth,
  getCalendarMakerMonths,
  removeCalendarMakerEvent,
  restoreCalendarMaker,
  serializeCalendarMaker,
  type CalendarMakerEventColor,
  type CalendarMakerLanguage,
  type CalendarMakerMonth,
  type CalendarMakerState,
  type CalendarMakerTheme,
  type CalendarMakerWeekStart,
  type CalendarMakerYearSystem,
} from "@/lib/tools/calendar-maker";

const STORAGE_KEY = "meaw-calendar-maker-v1";
const STORAGE_VERSION = 1 as const;

const EVENT_COLORS: { value: CalendarMakerEventColor; label: string; className: string }[] = [
  { value: "matcha", label: "มัทฉะ", className: "bg-[#6f8f65]" },
  { value: "sakura", label: "ซากุระ", className: "bg-[#d77f96]" },
  { value: "mikan", label: "มิกัง", className: "bg-[#e6923f]" },
  { value: "sora", label: "ท้องฟ้า", className: "bg-[#589ac2]" },
  { value: "sumire", label: "สุมิเระ", className: "bg-[#8a75ba]" },
];

const THEMES: { value: CalendarMakerTheme; label: string; description: string; className: string }[] = [
  { value: "matcha", label: "Matcha", description: "เขียวคาเฟ่", className: "from-[#dcebd3] to-[#f4f8ef]" },
  { value: "sakura", label: "Sakura", description: "ชมพูอ่อน", className: "from-[#ffdce5] to-[#fff5f7]" },
  { value: "mikan", label: "Mikan", description: "ส้มอบอุ่น", className: "from-[#ffe0b2] to-[#fff7ea]" },
  { value: "sora", label: "Sora", description: "ฟ้าใส", className: "from-[#cfeeff] to-[#f0f9ff]" },
];

const EVENT_DOT: Record<CalendarMakerEventColor, string> = {
  matcha: "bg-[#6f8f65]",
  sakura: "bg-[#d77f96]",
  mikan: "bg-[#e6923f]",
  sora: "bg-[#589ac2]",
  sumire: "bg-[#8a75ba]",
};

type DraftModel = {
  title: string;
  startMonth: string;
  monthCount: string;
  language: CalendarMakerLanguage;
  yearSystem: CalendarMakerYearSystem;
  weekStartsOn: CalendarMakerWeekStart;
  showAdjacentDays: boolean;
  showWeekNumbers: boolean;
  showNotes: boolean;
  theme: CalendarMakerTheme;
  notes: string;
  eventsText: string;
  calendar: CalendarMakerState | null;
};

type StoredDraft = DraftModel & { version: typeof STORAGE_VERSION };

function localMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultDraft(): DraftModel {
  return {
    title: "ปฏิทินของฉัน",
    startMonth: localMonth(),
    monthCount: "1",
    language: "th",
    yearSystem: "both",
    weekStartsOn: 1,
    showAdjacentDays: true,
    showWeekNumbers: false,
    showNotes: true,
    theme: "matcha",
    notes: "",
    eventsText: "",
    calendar: null,
  };
}

function modelFromCalendar(calendar: CalendarMakerState): DraftModel {
  return {
    title: calendar.title,
    startMonth: calendar.startMonth,
    monthCount: String(calendar.monthCount),
    language: calendar.language,
    yearSystem: calendar.yearSystem,
    weekStartsOn: calendar.weekStartsOn,
    showAdjacentDays: calendar.showAdjacentDays,
    showWeekNumbers: calendar.showWeekNumbers,
    showNotes: calendar.showNotes,
    theme: calendar.theme,
    notes: calendar.notes,
    eventsText: calendarMakerEventsText(calendar),
    calendar,
  };
}

function readInitialDraft(): DraftModel {
  const fallback = defaultDraft();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > CALENDAR_MAKER_MAX_JSON_LENGTH * 2) return fallback;
    const value = JSON.parse(raw) as Partial<StoredDraft>;
    if (value.version !== STORAGE_VERSION) return fallback;
    if (value.calendar) return modelFromCalendar(restoreCalendarMaker(JSON.stringify(value.calendar)));
    if (
      typeof value.title !== "string" || typeof value.startMonth !== "string" || typeof value.monthCount !== "string" ||
      (value.language !== "th" && value.language !== "en") ||
      (value.yearSystem !== "buddhist" && value.yearSystem !== "gregorian" && value.yearSystem !== "both") ||
      (value.weekStartsOn !== 0 && value.weekStartsOn !== 1) ||
      typeof value.showAdjacentDays !== "boolean" || typeof value.showWeekNumbers !== "boolean" || typeof value.showNotes !== "boolean" ||
      (value.theme !== "matcha" && value.theme !== "sakura" && value.theme !== "mikan" && value.theme !== "sora") ||
      typeof value.notes !== "string" || typeof value.eventsText !== "string"
    ) return fallback;
    if (value.title.length > 100 || value.eventsText.length > 100_000 || value.notes.length > 500) return fallback;
    return { ...fallback, ...value, calendar: null };
  } catch {
    return fallback;
  }
}

function sampleCalendar(): CalendarMakerState {
  return createCalendarMaker({
    title: "ปฏิทินคอนเทนต์ร้าน Meaw Cafe",
    startMonth: "2026-08",
    monthCount: 2,
    language: "th",
    yearSystem: "both",
    weekStartsOn: 1,
    showAdjacentDays: true,
    showWeekNumbers: true,
    showNotes: true,
    theme: "sakura",
    notes: "โทนเดือนนี้: คาเฟ่ญี่ปุ่น อบอุ่น อ่านง่าย และลงงานสม่ำเสมอ",
    eventsText: [
      "2026-08-03 | ถ่ายภาพเมนูมัทฉะ | matcha",
      "2026-08-08 | โพสต์เบื้องหลังร้าน | sora",
      "2026-08-12 | แคมเปญวันแมวโลก | sakura",
      "2026-08-20 | เปิดตัวเมนูใหม่ | mikan",
      "2026-09-01 | สรุปผลแคมเปญ | sumire",
      "2026-09-12 | วางแผนคอนเทนต์รอบใหม่ | matcha",
    ].join("\n"),
  });
}

function CalendarGrid({ month, state, onDate }: { month: CalendarMakerMonth; state: CalendarMakerState; onDate?: (date: string) => void }) {
  const columns = state.showWeekNumbers ? "grid-cols-[2.5rem_repeat(7,minmax(4.5rem,1fr))]" : "grid-cols-[repeat(7,minmax(4.5rem,1fr))]";
  return (
    <div className="overflow-x-auto pb-1">
      <div className={cn("grid min-w-[36rem] gap-1.5", columns)} data-testid="calendar-month-grid">
        {state.showWeekNumbers ? <div className="grid h-9 place-items-center text-xs font-bold text-muted-foreground">W</div> : null}
        {month.weekdays.map((weekday) => <div key={weekday} className="grid h-9 place-items-center text-xs font-bold text-muted-foreground">{weekday}</div>)}
        {month.weeks.map((week, rowIndex) => (
          <div key={`${month.key}-week-${rowIndex}`} className="contents">
            {state.showWeekNumbers ? <div className="grid min-h-24 place-items-center rounded-xl bg-muted/35 text-xs font-semibold text-muted-foreground">{week.weekNumber}</div> : null}
            {week.days.map((day) => {
              const visible = day.inMonth || state.showAdjacentDays;
              const content = (
                <>
                  <span className={cn("text-sm font-bold", !day.inMonth && "text-muted-foreground/55")}>{visible ? day.day : ""}</span>
                  {visible ? <span className="mt-2 flex min-w-0 flex-col gap-1">
                    {day.events.slice(0, 3).map((event) => (
                      <span key={event.id} className="flex min-w-0 items-center gap-1.5 rounded-md bg-background/75 px-1.5 py-1 text-[10px] font-medium shadow-sm" data-testid="calendar-event-chip">
                        <span className={cn("size-2 shrink-0 rounded-full", EVENT_DOT[event.color])} />
                        <span className="truncate">{event.title}</span>
                      </span>
                    ))}
                    {day.events.length > 3 ? <span className="text-[10px] text-muted-foreground">+{day.events.length - 3} รายการ</span> : null}
                  </span> : null}
                </>
              );
              const className = cn(
                "min-h-24 min-w-0 rounded-xl border p-2 text-left transition",
                day.inMonth ? "border-border/70 bg-background/72" : "border-transparent bg-muted/20",
                day.inMonth && day.isWeekend && "bg-primary/[0.045]",
                onDate && day.inMonth && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              );
              return onDate && day.inMonth ? (
                <button key={day.date} type="button" className={className} onClick={() => onDate(day.date)} aria-label={`เพิ่มกิจกรรมวันที่ ${day.date}`} data-testid={`calendar-day-${day.date}`}>
                  {content}
                </button>
              ) : <div key={day.date} className={className}>{content}</div>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarMakerTool() {
  const [initial] = useState(readInitialDraft);
  const [title, setTitle] = useState(initial.title);
  const [startMonth, setStartMonth] = useState(initial.startMonth);
  const [monthCount, setMonthCount] = useState(initial.monthCount);
  const [language, setLanguage] = useState(initial.language);
  const [yearSystem, setYearSystem] = useState(initial.yearSystem);
  const [weekStartsOn, setWeekStartsOn] = useState(initial.weekStartsOn);
  const [showAdjacentDays, setShowAdjacentDays] = useState(initial.showAdjacentDays);
  const [showWeekNumbers, setShowWeekNumbers] = useState(initial.showWeekNumbers);
  const [showNotes, setShowNotes] = useState(initial.showNotes);
  const [theme, setTheme] = useState(initial.theme);
  const [notes, setNotes] = useState(initial.notes);
  const [eventsText, setEventsText] = useState(initial.eventsText);
  const [calendar, setCalendar] = useState<CalendarMakerState | null>(initial.calendar);
  const [selectedMonth, setSelectedMonth] = useState(initial.calendar?.startMonth ?? initial.startMonth);
  const [quickDate, setQuickDate] = useState(`${initial.startMonth}-01`);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickColor, setQuickColor] = useState<CalendarMakerEventColor>("matcha");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const months = useMemo(() => calendar ? getCalendarMakerMonths(calendar) : [], [calendar]);
  const activeMonth = useMemo(() => calendar ? getCalendarMakerMonth(calendar, selectedMonth) : null, [calendar, selectedMonth]);
  const activeIndex = months.findIndex((month) => month.key === selectedMonth);
  const activeDateEvents = calendar?.events.filter((event) => event.date === quickDate) ?? [];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const payload: StoredDraft = {
        version: STORAGE_VERSION,
        title,
        startMonth,
        monthCount,
        language,
        yearSystem,
        weekStartsOn,
        showAdjacentDays,
        showWeekNumbers,
        showNotes,
        theme,
        notes,
        eventsText,
        calendar,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Storage may be blocked; the tool remains fully usable in memory.
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [calendar, eventsText, language, monthCount, notes, showAdjacentDays, showNotes, showWeekNumbers, startMonth, theme, title, weekStartsOn, yearSystem]);

  function applyCalendar(next: CalendarMakerState) {
    const model = modelFromCalendar(next);
    setTitle(model.title);
    setStartMonth(model.startMonth);
    setMonthCount(model.monthCount);
    setLanguage(model.language);
    setYearSystem(model.yearSystem);
    setWeekStartsOn(model.weekStartsOn);
    setShowAdjacentDays(model.showAdjacentDays);
    setShowWeekNumbers(model.showWeekNumbers);
    setShowNotes(model.showNotes);
    setTheme(model.theme);
    setNotes(model.notes);
    setEventsText(model.eventsText);
    setCalendar(next);
    setSelectedMonth(next.startMonth);
    setQuickDate(`${next.startMonth}-01`);
    setError("");
  }

  function generate() {
    try {
      const next = createCalendarMaker({
        title,
        startMonth,
        monthCount: Number(monthCount),
        language,
        yearSystem,
        weekStartsOn,
        showAdjacentDays,
        showWeekNumbers,
        showNotes,
        theme,
        notes,
        eventsText,
      });
      setCalendar(next);
      setSelectedMonth(next.startMonth);
      setQuickDate(`${next.startMonth}-01`);
      setError("");
      toast.success(`สร้างปฏิทิน ${next.monthCount} เดือนแล้ว`);
      if (next.duplicateEventsRemoved) toast.info(`ตัดกิจกรรมซ้ำ ${next.duplicateEventsRemoved} รายการ`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "สร้างปฏิทินไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  function loadSample() {
    applyCalendar(sampleCalendar());
    toast.success("โหลดตัวอย่าง 6 กิจกรรมแล้ว");
  }

  function clearAll() {
    const next = defaultDraft();
    setTitle(next.title);
    setStartMonth(next.startMonth);
    setMonthCount(next.monthCount);
    setLanguage(next.language);
    setYearSystem(next.yearSystem);
    setWeekStartsOn(next.weekStartsOn);
    setShowAdjacentDays(next.showAdjacentDays);
    setShowWeekNumbers(next.showWeekNumbers);
    setShowNotes(next.showNotes);
    setTheme(next.theme);
    setNotes(next.notes);
    setEventsText(next.eventsText);
    setCalendar(null);
    setSelectedMonth(next.startMonth);
    setQuickDate(`${next.startMonth}-01`);
    setQuickTitle("");
    setError("");
    localStorage.removeItem(STORAGE_KEY);
    toast.info("ล้างปฏิทินแล้ว");
  }

  function addQuickEvent() {
    if (!calendar) return;
    try {
      const next = addCalendarMakerEvent(calendar, { date: quickDate, title: quickTitle, color: quickColor });
      setCalendar(next);
      setEventsText(calendarMakerEventsText(next));
      setQuickTitle("");
      setError("");
      toast.success("เพิ่มกิจกรรมแล้ว");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "เพิ่มกิจกรรมไม่สำเร็จ";
      setError(message);
      toast.error(message);
    }
  }

  function removeEvent(id: string) {
    if (!calendar) return;
    const next = removeCalendarMakerEvent(calendar, id);
    setCalendar(next);
    setEventsText(calendarMakerEventsText(next));
    toast.info("ลบกิจกรรมแล้ว");
  }

  async function importJson(file: File) {
    try {
      if (file.size > CALENDAR_MAKER_MAX_JSON_LENGTH) throw new Error("ไฟล์ใหญ่เกิน 1 MB");
      applyCalendar(restoreCalendarMaker(await file.text()));
      toast.success("นำเข้าปฏิทินแล้ว");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "นำเข้าไฟล์ไม่สำเร็จ";
      setError(message);
      toast.error(message);
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function exportPng() {
    if (!calendar) return;
    let svgUrl = "";
    try {
      await document.fonts.ready;
      const svg = calendarMakerSvg(calendar, selectedMonth);
      svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("สร้างภาพไม่สำเร็จ"));
        image.src = svgUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = calendar.showNotes ? 1120 : 1040;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("เบราว์เซอร์ไม่รองรับ Canvas");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("สร้างภาพไม่สำเร็จ")), "image/png"));
      downloadBlob(blob, `meaw-calendar-${selectedMonth}.png`);
      toast.success("ดาวน์โหลด PNG แล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "สร้าง PNG ไม่สำเร็จ");
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
    }
  }

  return (
    <WorkspaceFrame className="overflow-x-hidden">
      <div className="calendar-maker-no-print space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/65 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary"><CalendarDays />Local-first</Badge>
            <h2 className="mt-2 font-heading text-xl font-bold">สร้างปฏิทินสวย พร้อมพิมพ์และนำไปใช้ต่อ</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">จัดได้ 1–12 เดือน รองรับภาษาไทย/อังกฤษ พ.ศ./ค.ศ. ใส่กิจกรรมแล้วส่งออก CSV, ICS, JSON, SVG, PNG หรือ Print/PDF โดยไม่อัปโหลดข้อมูล</p>
          </div>
          <ActionBar>
            <Button type="button" variant="outline" onClick={loadSample} data-testid="calendar-sample"><FlaskConical />ตัวอย่าง</Button>
            <Button type="button" variant="outline" onClick={() => importRef.current?.click()} data-testid="calendar-import"><FileUp />นำเข้า JSON</Button>
            <Button type="button" variant="outline" onClick={clearAll} data-testid="calendar-clear"><Eraser />ล้าง</Button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file); }} />
          </ActionBar>
        </div>

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <section className="space-y-5 rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5" aria-labelledby="calendar-settings-heading">
            <div>
              <h3 id="calendar-settings-heading" className="font-heading text-lg font-bold">ตั้งค่าปฏิทิน</h3>
              <p className="mt-1 text-sm text-muted-foreground">กำหนดช่วงเดือน รูปแบบปี สี และกิจกรรมก่อนสร้าง</p>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="calendar-title">ชื่อปฏิทิน</Label>
              <Input id="calendar-title" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น ปฏิทินคอนเทนต์ร้าน" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label htmlFor="calendar-start-month">เดือนเริ่มต้น</Label>
                <Input id="calendar-start-month" type="month" min="1900-01" max="2100-12" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="calendar-month-count">จำนวนเดือน</Label>
                <Input id="calendar-month-count" type="number" min={1} max={12} inputMode="numeric" value={monthCount} onChange={(event) => setMonthCount(event.target.value)} />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="calendar-language">ภาษา</Label>
                <select id="calendar-language" className="meaw-field h-9 w-full rounded-lg border border-input px-3 text-sm" value={language} onChange={(event) => setLanguage(event.target.value as CalendarMakerLanguage)}>
                  <option value="th">ไทย</option><option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="calendar-year-system">รูปแบบปี</Label>
                <select id="calendar-year-system" className="meaw-field h-9 w-full rounded-lg border border-input px-3 text-sm" value={yearSystem} onChange={(event) => setYearSystem(event.target.value as CalendarMakerYearSystem)}>
                  <option value="both">พ.ศ. + ค.ศ.</option><option value="buddhist">พ.ศ.</option><option value="gregorian">ค.ศ.</option>
                </select>
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="calendar-week-start">วันเริ่มสัปดาห์</Label>
                <select id="calendar-week-start" className="meaw-field h-9 w-full rounded-lg border border-input px-3 text-sm" value={weekStartsOn} onChange={(event) => { const next = Number(event.target.value) as CalendarMakerWeekStart; setWeekStartsOn(next); if (next === 0) setShowWeekNumbers(false); }}>
                  <option value={1}>วันจันทร์</option><option value={0}>วันอาทิตย์</option>
                </select>
              </div>
              <div className="space-y-2.5">
                <Label>ตัวเลือกการแสดงผล</Label>
                <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                  <label className="flex items-center gap-2 text-xs"><Switch checked={showAdjacentDays} onCheckedChange={setShowAdjacentDays} aria-label="แสดงวันเดือนข้างเคียง" />วันข้างเคียง</label>
                  <label className="flex items-center gap-2 text-xs"><Switch checked={showWeekNumbers} disabled={weekStartsOn !== 1} onCheckedChange={setShowWeekNumbers} aria-label="แสดงเลขสัปดาห์ ISO" />ISO week</label>
                  <label className="flex items-center gap-2 text-xs"><Switch checked={showNotes} onCheckedChange={setShowNotes} aria-label="แสดงหมายเหตุ" />หมายเหตุ</label>
                </div>
              </div>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium">ธีมสี</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THEMES.map((item) => <button key={item.value} type="button" className={cn("rounded-xl border bg-gradient-to-br p-2.5 text-left text-slate-800 transition hover:-translate-y-0.5", item.className, theme === item.value ? "border-slate-700 ring-2 ring-slate-500/25" : "border-white/80")} onClick={() => setTheme(item.value)} aria-pressed={theme === item.value}>
                  <span className="block text-xs font-bold">{item.label}</span><span className="block text-[10px] opacity-70">{item.description}</span>
                </button>)}
              </div>
            </fieldset>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3"><Label htmlFor="calendar-events">กิจกรรม</Label><span className="text-xs text-muted-foreground">{eventsText.split(/\r?\n/).filter(Boolean).length} บรรทัด</span></div>
              <Textarea id="calendar-events" className="min-h-36 font-mono text-xs leading-6" value={eventsText} maxLength={100_000} onChange={(event) => setEventsText(event.target.value)} placeholder="2026-08-20 | เปิดตัวสินค้า | sakura" />
              <p className="text-xs leading-5 text-muted-foreground">หนึ่งบรรทัดต่อกิจกรรม: <code>YYYY-MM-DD | ชื่อ | สี</code> สีที่ใช้ได้: matcha, sakura, mikan, sora, sumire</p>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="calendar-notes">หมายเหตุท้ายปฏิทิน</Label>
              <Textarea id="calendar-notes" className="min-h-24" value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="เป้าหมายหรือสิ่งที่ต้องจำในรอบนี้" />
            </div>

            {error ? <Alert variant="destructive"><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="button" size="lg" className="w-full" onClick={generate} data-testid="calendar-generate"><Sparkles />สร้างปฏิทิน</Button>
          </section>

          <section className="min-w-0 space-y-5" aria-live="polite">
            {!calendar || !activeMonth ? (
              <div className="grid min-h-[36rem] place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-8 text-center">
                <div className="max-w-sm"><CalendarDays className="mx-auto size-12 text-primary/55" /><h3 className="mt-4 font-heading text-lg font-bold">ปฏิทินจะปรากฏที่นี่</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">กด “ตัวอย่าง” เพื่อดูทันที หรือกรอกข้อมูลของคุณแล้วกดสร้างปฏิทิน</p></div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5" data-testid="calendar-result">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><Badge variant="secondary">{calendar.monthCount} เดือน · {calendar.events.length} กิจกรรม</Badge><h3 className="mt-2 font-heading text-xl font-bold">{calendar.title}</h3><p className="mt-1 text-sm text-muted-foreground">{months[0]?.label} — {months.at(-1)?.label}</p></div>
                    <ActionBar>
                      <Button type="button" variant="outline" size="sm" onClick={() => void copyText(calendarMakerToText(calendar), "คัดลอกปฏิทินแล้ว")} data-testid="calendar-copy"><Clipboard />คัดลอก</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(calendarMakerCsv(calendar), "meaw-calendar.csv", "text/csv;charset=utf-8")} data-testid="calendar-csv"><FileSpreadsheet />CSV</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(calendarMakerIcs(calendar), "meaw-calendar.ics", "text/calendar;charset=utf-8")} data-testid="calendar-ics"><CalendarDays />ICS</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(serializeCalendarMaker(calendar), "meaw-calendar.json", "application/json;charset=utf-8")} data-testid="calendar-json"><FileJson />JSON</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(calendarMakerSvg(calendar, selectedMonth), `meaw-calendar-${selectedMonth}.svg`, "image/svg+xml;charset=utf-8")} data-testid="calendar-svg"><FileImage />SVG</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void exportPng()} data-testid="calendar-png"><Download />PNG</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => window.print()} data-testid="calendar-print"><Printer />Print/PDF</Button>
                    </ActionBar>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-y border-border/60 py-3">
                    <Button type="button" variant="outline" size="icon-sm" disabled={activeIndex <= 0} onClick={() => setSelectedMonth(months[activeIndex - 1]!.key)} aria-label="เดือนก่อนหน้า"><ChevronLeft /></Button>
                    <div className="text-center"><p className="font-heading text-lg font-bold" data-testid="calendar-active-month">{activeMonth.label}</p><p className="text-xs text-muted-foreground">คลิกวันที่เพื่อเพิ่มกิจกรรม</p></div>
                    <Button type="button" variant="outline" size="icon-sm" disabled={activeIndex >= months.length - 1} onClick={() => setSelectedMonth(months[activeIndex + 1]!.key)} aria-label="เดือนถัดไป"><ChevronRight /></Button>
                  </div>

                  <div className="mt-4"><CalendarGrid month={activeMonth} state={calendar} onDate={(date) => { setQuickDate(date); document.getElementById("calendar-quick-title")?.focus(); }} /></div>
                  {calendar.showNotes && calendar.notes ? <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm leading-6"><span className="font-semibold">หมายเหตุ:</span> {calendar.notes}</div> : null}
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-heading text-lg font-bold">เพิ่มกิจกรรมแบบเร็ว</h3><p className="text-sm text-muted-foreground">เลือกวันที่ในปฏิทิน หรือกรอกเองได้</p></div><Badge variant="outline">{quickDate}</Badge></div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <div className="space-y-2.5"><Label htmlFor="calendar-quick-date">วันที่</Label><Input id="calendar-quick-date" type="date" value={quickDate} onChange={(event) => setQuickDate(event.target.value)} /></div>
                    <div className="space-y-2.5"><Label htmlFor="calendar-quick-title">ชื่อกิจกรรม</Label><Input id="calendar-quick-title" value={quickTitle} maxLength={120} onChange={(event) => setQuickTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) addQuickEvent(); }} placeholder="เช่น เปิดตัวสินค้า" /></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {EVENT_COLORS.map((item) => <button key={item.value} type="button" className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition", quickColor === item.value ? "border-foreground/50 bg-muted" : "border-border hover:bg-muted/60")} onClick={() => setQuickColor(item.value)} aria-pressed={quickColor === item.value}><span className={cn("size-2.5 rounded-full", item.className)} />{item.label}</button>)}
                    <Button type="button" className="ml-auto" onClick={addQuickEvent} data-testid="calendar-add-event"><Plus />เพิ่มกิจกรรม</Button>
                  </div>
                  {activeDateEvents.length ? <div className="mt-4 space-y-2 border-t border-border/60 pt-4">{activeDateEvents.map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2"><span className={cn("size-2.5 shrink-0 rounded-full", EVENT_DOT[event.color])} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{event.title}</span><Button type="button" variant="ghost" size="icon-sm" onClick={() => removeEvent(event.id)} aria-label={`ลบ ${event.title}`}><Trash2 /></Button></div>)}</div> : null}
                </div>

                {months.length > 1 ? <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5"><h3 className="font-heading text-lg font-bold">ภาพรวมทุกเดือน</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{months.map((month) => {
                  const eventCount = month.weeks.flatMap((week) => week.days).filter((day) => day.inMonth).reduce((sum, day) => sum + day.events.length, 0);
                  return <button key={month.key} type="button" className={cn("rounded-xl border p-3 text-left transition hover:border-primary/45 hover:bg-muted/35", selectedMonth === month.key ? "border-primary/50 bg-primary/[0.045]" : "border-border/65")} onClick={() => setSelectedMonth(month.key)} data-testid="calendar-overview-month"><span className="block text-sm font-bold">{month.label}</span><span className="mt-1 block text-xs text-muted-foreground">{eventCount} กิจกรรม</span></button>;
                })}</div></div> : null}
              </>
            )}
          </section>
        </div>
      </div>

      {calendar ? <div className="calendar-maker-print-surface" aria-hidden="true">
        <div className="calendar-maker-print-header"><h1>{calendar.title}</h1><p>{months[0]?.label} — {months.at(-1)?.label}</p></div>
        {months.map((month) => <section key={month.key} className="calendar-maker-print-month"><h2>{month.label}</h2><CalendarGrid month={month} state={calendar} />{calendar.showNotes && calendar.notes ? <p className="calendar-maker-print-notes">หมายเหตุ: {calendar.notes}</p> : null}</section>)}
      </div> : null}
    </WorkspaceFrame>
  );
}
