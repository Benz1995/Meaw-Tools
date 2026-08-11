"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  Eraser,
  FileJson,
  FileUp,
  FlaskConical,
  Lock,
  Plus,
  Printer,
  Redo2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Undo2,
  Unlock,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  EMPLOYEE_SCHEDULE_MAX_DAYS,
  EMPLOYEE_SCHEDULE_MAX_EMPLOYEES,
  EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH,
  EMPLOYEE_SCHEDULE_MAX_SHIFTS,
  assignEmployeeScheduleSlot,
  clearEmployeeScheduleAssignments,
  createEmployeeSchedule,
  employeeScheduleCsv,
  employeeScheduleDates,
  employeeScheduleIcs,
  employeeScheduleToText,
  fillOpenEmployeeScheduleSlots,
  generateEmployeeScheduleSeed,
  getEmployeeScheduleEligibility,
  parseEmployeeScheduleEmployees,
  parseEmployeeScheduleUnavailability,
  regenerateEmployeeSchedule,
  restoreEmployeeSchedule,
  serializeEmployeeSchedule,
  summarizeEmployeeSchedule,
  toggleEmployeeScheduleLock,
  type EmployeeScheduleShift,
  type EmployeeScheduleState,
} from "@/lib/tools/employee-schedule";

const STORAGE_KEY = "meaw-employee-schedule-maker-v1";
const STORAGE_VERSION = 1 as const;
const HISTORY_LIMIT = 30;
const WEEKDAYS = [
  { value: 1, label: "จ" },
  { value: 2, label: "อ" },
  { value: 3, label: "พ" },
  { value: 4, label: "พฤ" },
  { value: 5, label: "ศ" },
  { value: 6, label: "ส" },
  { value: 0, label: "อา" },
] as const;

const EXAMPLE_PEOPLE = [
  "มะลิ | หัวหน้ากะ | 40",
  "นนท์ | หัวหน้ากะ | 40",
  "สมชาย | พนักงาน | 40",
  "น้ำฝน | พนักงาน | 40",
  "ต้นกล้า | พนักงาน | 40",
  "ฟ้าใส | พนักงาน | 40",
  "ภูผา | พนักงาน | 40",
  "ใบหม่อน | พนักงาน | 40",
].join("\n");

const DEFAULT_SHIFTS: EmployeeScheduleShift[] = [
  { id: "draft-open", name: "เปิดร้าน", startTime: "07:00", endTime: "15:00", breakMinutes: 60, requiredPeople: 1, requiredRole: "หัวหน้ากะ", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { id: "draft-morning", name: "กะเช้า", startTime: "08:00", endTime: "16:00", breakMinutes: 60, requiredPeople: 2, requiredRole: "พนักงาน", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { id: "draft-evening", name: "กะบ่าย", startTime: "14:00", endTime: "22:00", breakMinutes: 60, requiredPeople: 2, requiredRole: "พนักงาน", weekdays: [0, 1, 2, 3, 4, 5, 6] },
];

const SHIFT_STYLES = [
  "border-emerald-500/30 bg-emerald-500/[0.055]",
  "border-amber-500/30 bg-amber-500/[0.055]",
  "border-violet-500/30 bg-violet-500/[0.055]",
  "border-sky-500/30 bg-sky-500/[0.055]",
  "border-rose-500/30 bg-rose-500/[0.055]",
  "border-cyan-500/30 bg-cyan-500/[0.055]",
] as const;

type InitialModel = {
  title: string;
  peopleText: string;
  unavailabilityText: string;
  startDate: string;
  endDate: string;
  shifts: EmployeeScheduleShift[];
  minRestHours: string;
  maxConsecutiveDays: string;
  seed: string;
  schedule: EmployeeScheduleState | null;
};

type StoredDraft = Omit<InitialModel, "schedule"> & {
  version: typeof STORAGE_VERSION;
  schedule: EmployeeScheduleState | null;
};

function inputDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function addLocalDays(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setDate(date.getDate() + amount);
  return inputDate(date);
}

function currentMonday() {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - offset);
  return inputDate(today);
}

function cloneShifts(shifts: readonly EmployeeScheduleShift[]) {
  return shifts.map((shift) => ({ ...shift, weekdays: [...shift.weekdays] }));
}

function isDraftShift(value: unknown): value is EmployeeScheduleShift {
  if (!value || typeof value !== "object") return false;
  const shift = value as Record<string, unknown>;
  return (
    typeof shift.id === "string" && shift.id.length <= 100 &&
    typeof shift.name === "string" && shift.name.length <= 100 &&
    typeof shift.startTime === "string" && /^\d{2}:\d{2}$/.test(shift.startTime) &&
    typeof shift.endTime === "string" && /^\d{2}:\d{2}$/.test(shift.endTime) &&
    typeof shift.breakMinutes === "number" && Number.isFinite(shift.breakMinutes) &&
    typeof shift.requiredPeople === "number" && Number.isFinite(shift.requiredPeople) &&
    typeof shift.requiredRole === "string" && shift.requiredRole.length <= 100 &&
    Array.isArray(shift.weekdays) && shift.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

function defaultInitialModel(): InitialModel {
  const startDate = currentMonday();
  return {
    title: "ตารางเวรประจำสัปดาห์",
    peopleText: "",
    unavailabilityText: "",
    startDate,
    endDate: addLocalDays(startDate, 6),
    shifts: cloneShifts(DEFAULT_SHIFTS),
    minRestHours: "8",
    maxConsecutiveDays: "5",
    seed: "meaw-roster-a",
    schedule: null,
  };
}

function peopleToText(schedule: EmployeeScheduleState) {
  return schedule.employees.map((employee) => `${employee.name} | ${employee.role} | ${employee.maxWeeklyHours}`).join("\n");
}

function unavailabilityToText(schedule: EmployeeScheduleState) {
  const employees = new Map(schedule.employees.map((employee) => [employee.id, employee.name]));
  return schedule.unavailability.map((entry) => `${employees.get(entry.employeeId)} | ${entry.date}`).join("\n");
}

function modelFromSchedule(schedule: EmployeeScheduleState): InitialModel {
  return {
    title: schedule.title,
    peopleText: peopleToText(schedule),
    unavailabilityText: unavailabilityToText(schedule),
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    shifts: cloneShifts(schedule.shifts),
    minRestHours: String(schedule.minRestHours),
    maxConsecutiveDays: String(schedule.maxConsecutiveDays),
    seed: schedule.seed,
    schedule,
  };
}

function readInitialModel(): InitialModel {
  const fallback = defaultInitialModel();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH * 2) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.version !== STORAGE_VERSION) return fallback;
    if (parsed.schedule) return modelFromSchedule(restoreEmployeeSchedule(JSON.stringify(parsed.schedule)));
    if (typeof parsed.title !== "string" || typeof parsed.peopleText !== "string" || typeof parsed.unavailabilityText !== "string" || typeof parsed.startDate !== "string" || typeof parsed.endDate !== "string" || !Array.isArray(parsed.shifts) || typeof parsed.minRestHours !== "string" || typeof parsed.maxConsecutiveDays !== "string" || typeof parsed.seed !== "string") return fallback;
    if (parsed.title.length > 100 || parsed.peopleText.length > 50_000 || parsed.unavailabilityText.length > 50_000 || parsed.shifts.length > EMPLOYEE_SCHEDULE_MAX_SHIFTS || parsed.minRestHours.length > 20 || parsed.maxConsecutiveDays.length > 20 || parsed.seed.length > 200) return fallback;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.endDate) || !parsed.shifts.every(isDraftShift)) return fallback;
    return { title: parsed.title, peopleText: parsed.peopleText, unavailabilityText: parsed.unavailabilityText, startDate: parsed.startDate, endDate: parsed.endDate, shifts: cloneShifts(parsed.shifts), minRestHours: parsed.minRestHours, maxConsecutiveDays: parsed.maxConsecutiveDays, seed: parsed.seed, schedule: null };
  } catch {
    return fallback;
  }
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} ชม. ${remainder} นาที` : `${hours} ชม.`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function draftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function EmployeeScheduleMakerTool() {
  const [initial] = useState(readInitialModel);
  const [title, setTitle] = useState(initial.title);
  const [peopleText, setPeopleText] = useState(initial.peopleText);
  const [unavailabilityText, setUnavailabilityText] = useState(initial.unavailabilityText);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [shifts, setShifts] = useState(initial.shifts);
  const [minRestHours, setMinRestHours] = useState(initial.minRestHours);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState(initial.maxConsecutiveDays);
  const [seed, setSeed] = useState(initial.seed);
  const [schedule, setSchedule] = useState<EmployeeScheduleState | null>(initial.schedule);
  const [past, setPast] = useState<EmployeeScheduleState[]>([]);
  const [future, setFuture] = useState<EmployeeScheduleState[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const peoplePreview = useMemo(() => {
    try {
      const parsed = parseEmployeeScheduleEmployees(peopleText);
      return { count: parsed.employees.length, duplicates: parsed.duplicates.length, error: "" };
    } catch (caught) {
      return { count: 0, duplicates: 0, error: caught instanceof Error ? caught.message : "อ่านรายชื่อไม่ได้" };
    }
  }, [peopleText]);

  useEffect(() => {
    const payload: StoredDraft = { version: STORAGE_VERSION, title, peopleText, unavailabilityText, startDate, endDate, shifts, minRestHours, maxConsecutiveDays, seed, schedule };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing and storage quotas must not break the tool.
    }
  }, [endDate, maxConsecutiveDays, minRestHours, peopleText, schedule, seed, shifts, startDate, title, unavailabilityText]);

  const invalidate = () => {
    setSchedule(null);
    setPast([]);
    setFuture([]);
    setSelectedAssignmentId("");
    setError("");
  };

  const updateShift = (id: string, patch: Partial<EmployeeScheduleShift>) => {
    setShifts((current) => current.map((shift) => shift.id === id ? { ...shift, ...patch } : shift));
    invalidate();
  };

  const toggleWeekday = (shift: EmployeeScheduleShift, weekday: number) => {
    const weekdays = shift.weekdays.includes(weekday) ? shift.weekdays.filter((value) => value !== weekday) : [...shift.weekdays, weekday];
    updateShift(shift.id, { weekdays });
  };

  const addShift = () => {
    if (shifts.length >= EMPLOYEE_SCHEDULE_MAX_SHIFTS) {
      toast.error(`เพิ่มกะได้ไม่เกิน ${EMPLOYEE_SCHEDULE_MAX_SHIFTS} กะ`);
      return;
    }
    setShifts((current) => [...current, { id: draftId(), name: `กะ ${current.length + 1}`, startTime: "09:00", endTime: "17:00", breakMinutes: 60, requiredPeople: 1, requiredRole: "", weekdays: [1, 2, 3, 4, 5] }]);
    invalidate();
  };

  const removeShift = (id: string) => {
    if (shifts.length <= 1) {
      toast.error("ต้องมีกะอย่างน้อย 1 กะ");
      return;
    }
    setShifts((current) => current.filter((shift) => shift.id !== id));
    invalidate();
  };

  const loadExample = () => {
    const nextStart = startDate || currentMonday();
    setTitle("ตารางเวรร้าน Meaw Café");
    setPeopleText(EXAMPLE_PEOPLE);
    setStartDate(nextStart);
    setEndDate(addLocalDays(nextStart, 6));
    setUnavailabilityText(`น้ำฝน | ${addLocalDays(nextStart, 2)}\nมะลิ | ${addLocalDays(nextStart, 4)}`);
    setShifts(cloneShifts(DEFAULT_SHIFTS));
    setMinRestHours("8");
    setMaxConsecutiveDays("5");
    setSeed("meaw-cafe-a");
    setSchedule(null);
    setPast([]);
    setFuture([]);
    setSelectedAssignmentId("");
    setError("");
  };

  const generate = () => {
    try {
      const employees = parseEmployeeScheduleEmployees(peopleText).employees;
      const unavailability = parseEmployeeScheduleUnavailability(unavailabilityText, employees, startDate, endDate);
      const next = createEmployeeSchedule({ title, startDate, endDate, employees, shifts, unavailability, minRestHours: Number(minRestHours), maxConsecutiveDays: Number(maxConsecutiveDays), seed });
      setSchedule(next);
      setPast([]);
      setFuture([]);
      setSelectedAssignmentId("");
      setError("");
      const summary = summarizeEmployeeSchedule(next);
      if (summary.openSlots) toast.warning(`จัดแล้ว ${summary.filledSlots}/${summary.totalSlots} ช่อง · ยังขาด ${summary.openSlots} ช่อง`);
      else toast.success(`จัดครบ ${summary.filledSlots} ช่องเวรแล้ว`);
    } catch (caught) {
      setSchedule(null);
      setError(caught instanceof Error ? caught.message : "สร้างตารางเวรไม่สำเร็จ");
    }
  };

  const commitSchedule = (next: EmployeeScheduleState) => {
    if (!schedule) return;
    setPast((current) => [...current.slice(-(HISTORY_LIMIT - 1)), schedule]);
    setSchedule(next);
    setFuture([]);
    setSelectedAssignmentId((current) => next.assignments.some((assignment) => assignment.id === current) ? current : "");
  };

  const runScheduleAction = (action: () => EmployeeScheduleState) => {
    try {
      commitSchedule(action());
      setError("");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "แก้ตารางเวรไม่สำเร็จ");
    }
  };

  const undo = () => {
    if (!schedule || !past.length) return;
    const previous = past[past.length - 1]!;
    setPast((current) => current.slice(0, -1));
    setFuture((current) => [schedule, ...current].slice(0, HISTORY_LIMIT));
    setSchedule(previous);
    setSelectedAssignmentId("");
  };

  const redo = () => {
    if (!schedule || !future.length) return;
    const next = future[0]!;
    setFuture((current) => current.slice(1));
    setPast((current) => [...current.slice(-(HISTORY_LIMIT - 1)), schedule]);
    setSchedule(next);
    setSelectedAssignmentId("");
  };

  const clearAll = () => {
    const fallback = defaultInitialModel();
    setTitle(fallback.title);
    setPeopleText("");
    setUnavailabilityText("");
    setStartDate(fallback.startDate);
    setEndDate(fallback.endDate);
    setShifts(fallback.shifts);
    setMinRestHours(fallback.minRestHours);
    setMaxConsecutiveDays(fallback.maxConsecutiveDays);
    setSeed(fallback.seed);
    setSchedule(null);
    setPast([]);
    setFuture([]);
    setSelectedAssignmentId("");
    setError("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
    toast.info("ล้างข้อมูลตารางเวรแล้ว");
  };

  const applyImportedSchedule = (restored: EmployeeScheduleState) => {
    const model = modelFromSchedule(restored);
    setTitle(model.title);
    setPeopleText(model.peopleText);
    setUnavailabilityText(model.unavailabilityText);
    setStartDate(model.startDate);
    setEndDate(model.endDate);
    setShifts(model.shifts);
    setMinRestHours(model.minRestHours);
    setMaxConsecutiveDays(model.maxConsecutiveDays);
    setSeed(model.seed);
    setSchedule(restored);
    setPast([]);
    setFuture([]);
    setSelectedAssignmentId("");
    setError("");
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > EMPLOYEE_SCHEDULE_MAX_JSON_LENGTH) throw new Error("ไฟล์ JSON ใหญ่เกิน 1.5 MB");
      applyImportedSchedule(restoreEmployeeSchedule(await file.text()));
      toast.success("นำเข้าตารางเวรแล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "นำเข้า JSON ไม่สำเร็จ");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const summary = useMemo(() => schedule ? summarizeEmployeeSchedule(schedule) : null, [schedule]);
  const employeeById = useMemo(() => new Map(schedule?.employees.map((employee) => [employee.id, employee]) ?? []), [schedule]);
  const shiftById = useMemo(() => new Map(schedule?.shifts.map((shift) => [shift.id, shift]) ?? []), [schedule]);
  const selectedAssignment = schedule?.assignments.find((assignment) => assignment.id === selectedAssignmentId);
  const selectedShift = selectedAssignment ? shiftById.get(selectedAssignment.shiftId) : undefined;
  const query = search.trim().toLocaleLowerCase("th");
  const filteredEmployees = schedule?.employees.filter((employee) => !query || `${employee.name} ${employee.role}`.toLocaleLowerCase("th").includes(query)) ?? [];

  return (
    <WorkspaceFrame>
      <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" aria-label="เลือกไฟล์ JSON ตารางเวร" data-testid="employee-schedule-import-file" onChange={(event) => void importJson(event.target.files?.[0])} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,.72fr)_minmax(0,1.28fr)]">
        <form className="employee-schedule-no-print space-y-5" aria-labelledby="employee-schedule-form-heading" onSubmit={(event) => { event.preventDefault(); generate(); }}>
          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 id="employee-schedule-form-heading" className="font-heading text-lg font-bold">ทีมและข้อจำกัด</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">หนึ่งคนต่อบรรทัด · ชื่อ | บทบาท | ชั่วโมงสูงสุด/สัปดาห์</p></div><Badge variant="secondary" data-testid="employee-schedule-person-count"><UsersRound />{peoplePreview.count}/{EMPLOYEE_SCHEDULE_MAX_EMPLOYEES}</Badge></div>
            <div className="mt-4 space-y-2.5"><Label htmlFor="employee-schedule-title">ชื่อตารางเวร</Label><Input id="employee-schedule-title" value={title} maxLength={100} onChange={(event) => { setTitle(event.target.value); invalidate(); }} placeholder="เช่น ตารางเวรร้านสาขา A" /></div>
            <div className="mt-4 space-y-2.5"><Label htmlFor="employee-schedule-people">รายชื่อ บทบาท และชั่วโมงสูงสุด</Label><Textarea id="employee-schedule-people" value={peopleText} onChange={(event) => { setPeopleText(event.target.value); invalidate(); }} className="min-h-64 resize-y leading-7" placeholder="มะลิ | หัวหน้ากะ | 40\nสมชาย | พนักงาน | 32" aria-describedby="employee-schedule-people-hint" data-testid="employee-schedule-people" /><p id="employee-schedule-people-hint" className="text-xs leading-5 text-muted-foreground">หากไม่ใส่ชั่วโมง ระบบใช้ 40 ชม./สัปดาห์ · ตัดชื่อซ้ำโดยไม่สนตัวพิมพ์{peoplePreview.duplicates ? ` · พบชื่อซ้ำ ${peoplePreview.duplicates}` : ""}</p></div>
            {peoplePreview.error ? <Alert variant="destructive" className="mt-4"><AlertTitle>อ่านรายชื่อไม่ได้</AlertTitle><AlertDescription>{peoplePreview.error}</AlertDescription></Alert> : null}
            <div className="mt-4 space-y-2.5"><Label htmlFor="employee-schedule-unavailability">วันลา / วันที่ไม่สะดวก</Label><Textarea id="employee-schedule-unavailability" value={unavailabilityText} onChange={(event) => { setUnavailabilityText(event.target.value); invalidate(); }} className="min-h-28 resize-y leading-7" placeholder={`น้ำฝน | ${addLocalDays(startDate || currentMonday(), 2)}\nมะลิ | ${addLocalDays(startDate || currentMonday(), 4)}..${addLocalDays(startDate || currentMonday(), 5)}`} aria-describedby="employee-schedule-unavailability-hint" /><p id="employee-schedule-unavailability-hint" className="text-xs leading-5 text-muted-foreground">ใส่หลายวันด้วย comma หรือช่วงวันที่ด้วย .. · กะข้ามวันจะตรวจทั้งวันเริ่มและวันถัดไป</p></div>
            <div className="mt-4"><ActionBar><Button type="button" size="sm" variant="outline" onClick={loadExample}><FlaskConical />ตัวอย่าง</Button><Button type="button" size="sm" variant="outline" onClick={() => importRef.current?.click()}><FileUp />นำเข้า JSON</Button><Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={clearAll} disabled={!peopleText && !schedule}><Eraser />ล้างทั้งหมด</Button></ActionBar></div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">ช่วงเวลาและกติกาความเป็นธรรม</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2.5"><Label htmlFor="employee-schedule-start">วันที่เริ่ม</Label><Input id="employee-schedule-start" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); invalidate(); }} data-testid="employee-schedule-start" /></div><div className="space-y-2.5"><Label htmlFor="employee-schedule-end">วันที่สิ้นสุด</Label><Input id="employee-schedule-end" type="date" value={endDate} min={startDate} onChange={(event) => { setEndDate(event.target.value); invalidate(); }} data-testid="employee-schedule-end" /></div></div>
            <p className="mt-2 text-xs text-muted-foreground">สร้างได้สูงสุด {EMPLOYEE_SCHEDULE_MAX_DAYS} วัน · ชั่วโมงนับเข้าสตางค์สัปดาห์ของวันที่เริ่มกะ</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2.5"><Label htmlFor="employee-schedule-rest">พักระหว่างกะขั้นต่ำ (ชั่วโมง)</Label><Input id="employee-schedule-rest" type="number" min="0" max="24" step="1" value={minRestHours} onChange={(event) => { setMinRestHours(event.target.value); invalidate(); }} /></div><div className="space-y-2.5"><Label htmlFor="employee-schedule-consecutive">ทำงานติดกันสูงสุด (วัน)</Label><Input id="employee-schedule-consecutive" type="number" min="1" max="14" step="1" value={maxConsecutiveDays} onChange={(event) => { setMaxConsecutiveDays(event.target.value); invalidate(); }} /></div></div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-heading text-lg font-bold">กะและจำนวนคนขั้นต่ำ</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">กำหนดเวลา บทบาท จำนวนคน และวันที่เปิดกะ</p></div><Badge variant="outline">{shifts.length}/{EMPLOYEE_SCHEDULE_MAX_SHIFTS} กะ</Badge></div>
            <div className="mt-4 space-y-4">
              {shifts.map((shift, index) => (
                <fieldset key={shift.id} className={cn("rounded-2xl border p-4", SHIFT_STYLES[index % SHIFT_STYLES.length])}>
                  <legend className="px-2 text-sm font-bold">กะที่ {index + 1}</legend>
                  <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2.5"><Label htmlFor={`employee-shift-name-${shift.id}`}>ชื่อกะ</Label><Input id={`employee-shift-name-${shift.id}`} value={shift.name} maxLength={60} onChange={(event) => updateShift(shift.id, { name: event.target.value })} /></div><div className="space-y-2.5"><Label htmlFor={`employee-shift-role-${shift.id}`}>บทบาทที่ต้องการ</Label><Input id={`employee-shift-role-${shift.id}`} value={shift.requiredRole} maxLength={40} onChange={(event) => updateShift(shift.id, { requiredRole: event.target.value })} placeholder="เว้นว่าง = ทุกบทบาท" /></div></div>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"><div className="space-y-2.5"><Label htmlFor={`employee-shift-start-${shift.id}`}>เริ่ม</Label><Input id={`employee-shift-start-${shift.id}`} type="time" value={shift.startTime} onChange={(event) => updateShift(shift.id, { startTime: event.target.value })} /></div><div className="space-y-2.5"><Label htmlFor={`employee-shift-end-${shift.id}`}>สิ้นสุด</Label><Input id={`employee-shift-end-${shift.id}`} type="time" value={shift.endTime} onChange={(event) => updateShift(shift.id, { endTime: event.target.value })} /></div><div className="space-y-2.5"><Label htmlFor={`employee-shift-break-${shift.id}`}>พัก (นาที)</Label><Input id={`employee-shift-break-${shift.id}`} type="number" min="0" max="720" step="5" value={shift.breakMinutes} onChange={(event) => updateShift(shift.id, { breakMinutes: Number(event.target.value) })} /></div><div className="space-y-2.5"><Label htmlFor={`employee-shift-people-${shift.id}`}>จำนวนคน</Label><Input id={`employee-shift-people-${shift.id}`} type="number" min="1" max="6" step="1" value={shift.requiredPeople} onChange={(event) => updateShift(shift.id, { requiredPeople: Number(event.target.value) })} /></div></div>
                  <div className="mt-4 space-y-2.5"><Label>วันที่เปิดกะ</Label><div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`วันที่เปิด ${shift.name}`}>{WEEKDAYS.map((day) => <Button key={day.value} type="button" size="sm" variant={shift.weekdays.includes(day.value) ? "secondary" : "outline"} className="min-w-0 px-1" aria-pressed={shift.weekdays.includes(day.value)} onClick={() => toggleWeekday(shift, day.value)}>{day.label}</Button>)}</div></div>
                  <div className="mt-3 flex justify-end"><Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeShift(shift.id)} disabled={shifts.length <= 1}><X />ลบกะ</Button></div>
                </fieldset>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={addShift} disabled={shifts.length >= EMPLOYEE_SCHEDULE_MAX_SHIFTS}><Plus />เพิ่มกะ</Button>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">สร้างร่างตารางเวร</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="space-y-2.5"><Label htmlFor="employee-schedule-seed">Seed สำหรับสร้างชุดเดิมซ้ำ</Label><Input id="employee-schedule-seed" value={seed} maxLength={100} onChange={(event) => { setSeed(event.target.value); invalidate(); }} data-testid="employee-schedule-seed" /></div><Button type="button" variant="outline" className="self-end" onClick={() => { setSeed(generateEmployeeScheduleSeed()); invalidate(); }}><RefreshCw />สุ่ม Seed</Button></div>
            {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>ยังสร้างตารางไม่ได้</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" size="lg" className="mt-5 h-12 w-full" data-testid="employee-schedule-generate"><Sparkles />สร้าง Employee Schedule</Button>
          </section>

          <Alert className="border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>รายชื่อและวันลาอยู่ใน Browser เครื่องนี้</AlertTitle><AlertDescription>ระบบจัดเวร ส่งออกไฟล์ และบันทึกร่างใน localStorage โดยไม่ส่งข้อมูลพนักงานไป API หรือ Server ลบได้ด้วยปุ่มล้างทั้งหมด</AlertDescription></Alert>
        </form>

        <section className="employee-schedule-print-surface min-w-0 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5" aria-label="ผลลัพธ์ Employee Schedule Maker">
          {schedule && summary ? (
            <div data-testid="employee-schedule-results">
              <div className="employee-schedule-no-print flex flex-wrap items-start justify-between gap-4"><div><Badge variant={summary.openSlots ? "outline" : "secondary"}>{summary.openSlots ? <AlertTriangle /> : <CheckCircle2 />}{summary.openSlots ? `ยังขาด ${summary.openSlots} ช่อง` : "ครอบคลุมครบ"}</Badge><h2 className="mt-2 font-heading text-xl font-bold">{schedule.title}</h2><p className="mt-1 text-sm text-muted-foreground">{schedule.startDate} ถึง {schedule.endDate} · {schedule.employees.length} คน · {schedule.shifts.length} กะ</p></div><ActionBar><Button type="button" variant="outline" onClick={() => void copyText(employeeScheduleToText(schedule), "คัดลอกตารางเวรแล้ว")} data-testid="employee-schedule-copy"><Clipboard />คัดลอก</Button><Button type="button" variant="outline" onClick={() => downloadText(employeeScheduleCsv(schedule), "meaw-employee-schedule.csv", "text/csv;charset=utf-8")} data-testid="employee-schedule-csv"><Download />CSV</Button><Button type="button" variant="outline" onClick={() => downloadText(employeeScheduleIcs(schedule), "meaw-employee-schedule.ics", "text/calendar;charset=utf-8")} data-testid="employee-schedule-ics"><CalendarCheck2 />ICS</Button><Button type="button" variant="outline" onClick={() => downloadText(serializeEmployeeSchedule(schedule), "meaw-employee-schedule.json", "application/json;charset=utf-8")} data-testid="employee-schedule-json"><FileJson />JSON</Button><Button type="button" variant="outline" onClick={() => window.print()} data-testid="employee-schedule-print"><Printer />พิมพ์/PDF</Button></ActionBar></div>
              <header className="employee-schedule-print-header hidden border-b pb-4"><h1 className="font-heading text-2xl font-black">{schedule.title}</h1><p className="mt-1 text-sm">{schedule.startDate} ถึง {schedule.endDate} · Seed {schedule.seed}</p></header>

              <div className="employee-schedule-no-print mt-5 grid gap-2 sm:grid-cols-4"><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ครอบคลุม</p><p className="mt-1 font-mono text-lg font-bold" data-testid="employee-schedule-filled-count">{summary.filledSlots}/{summary.totalSlots}</p></div><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ช่องที่ยังขาด</p><p className="mt-1 font-mono text-lg font-bold" data-testid="employee-schedule-open-count">{summary.openSlots}</p></div><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">เวรที่ล็อก</p><p className="mt-1 font-mono text-lg font-bold">{summary.lockedSlots}</p></div><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ชั่วโมงสุทธิรวม</p><p className="mt-1 font-mono text-lg font-bold">{formatMinutes(summary.totalNetMinutes)}</p></div></div>

              <div className="employee-schedule-no-print mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/55 p-3"><ActionBar><Button type="button" variant="outline" disabled={!past.length} onClick={undo} data-testid="employee-schedule-undo"><Undo2 />ย้อนกลับ</Button><Button type="button" variant="outline" disabled={!future.length} onClick={redo} data-testid="employee-schedule-redo"><Redo2 />ทำซ้ำ</Button><Button type="button" variant="outline" onClick={() => { const nextSeed = generateEmployeeScheduleSeed(); runScheduleAction(() => regenerateEmployeeSchedule(schedule, nextSeed)); setSeed(nextSeed); setSelectedAssignmentId(""); }} data-testid="employee-schedule-regenerate"><RefreshCw />จัดใหม่</Button><Button type="button" variant="outline" disabled={!summary.openSlots} onClick={() => runScheduleAction(() => fillOpenEmployeeScheduleSlots(schedule))} data-testid="employee-schedule-fill-open"><UserCheck />เติมช่องว่าง</Button><Button type="button" variant="ghost" onClick={() => { runScheduleAction(() => clearEmployeeScheduleAssignments(schedule)); setSelectedAssignmentId(""); }}><Eraser />ล้างเวรไม่ล็อก</Button></ActionBar><Badge variant="outline">Seed {schedule.seed}</Badge></div>

              {summary.openSlots ? <Alert className="employee-schedule-no-print mt-4 border-amber-500/35 bg-amber-500/[0.06]"><AlertTriangle className="text-amber-700 dark:text-amber-300" /><AlertTitle>มีช่องเวรที่เงื่อนไขยังจัดไม่ได้</AlertTitle><AlertDescription>ตรวจบทบาท วันลา ชั่วโมงสูงสุด เวลาพัก และวันทำงานติดกัน แล้วเลือกช่องว่างเพื่อจัดคนเอง ระบบจะไม่ฝืนข้อจำกัดเพื่อทำให้ตัวเลขดูครบ</AlertDescription></Alert> : null}

              <div className="mt-5 grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0">
                  <div className="employee-schedule-no-print mb-4 rounded-xl border bg-card/60 p-3 text-sm"><p className="font-semibold">{selectedAssignment ? `เลือก ${selectedShift?.name} · ${selectedAssignment.date} · ช่อง ${selectedAssignment.slot}` : "แตะช่องเวรเพื่อเปลี่ยนพนักงาน ล็อก หรือนำชื่อออก"}</p>{selectedAssignment ? <div className="mt-3"><ActionBar><Button type="button" size="sm" variant="outline" disabled={!selectedAssignment.employeeId} onClick={() => runScheduleAction(() => toggleEmployeeScheduleLock(schedule, selectedAssignment.id))}>{selectedAssignment.locked ? <Unlock /> : <Lock />}{selectedAssignment.locked ? "ปลดล็อก" : "ล็อกเวร"}</Button><Button type="button" size="sm" variant="ghost" disabled={!selectedAssignment.employeeId || selectedAssignment.locked} onClick={() => runScheduleAction(() => assignEmployeeScheduleSlot(schedule, selectedAssignment.id, ""))}><X />นำชื่อออก</Button></ActionBar></div> : null}</div>
                  <div className="employee-schedule-days space-y-4" data-testid="employee-schedule-days">
                    {employeeScheduleDates(schedule).map((date) => {
                      const dateAssignments = schedule.assignments.filter((assignment) => assignment.date === date);
                      const filled = dateAssignments.filter((assignment) => assignment.employeeId).length;
                      return (
                        <section key={date} className="employee-schedule-day break-inside-avoid rounded-2xl border bg-card/55 p-4" aria-labelledby={`employee-schedule-date-${date}`}>
                          <div className="flex items-center justify-between gap-3"><h3 id={`employee-schedule-date-${date}`} className="font-heading font-bold">{formatDate(date)}</h3><Badge variant={filled === dateAssignments.length ? "secondary" : "outline"}>{filled}/{dateAssignments.length}</Badge></div>
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            {schedule.shifts.map((shift, shiftIndex) => {
                              const assignments = dateAssignments.filter((assignment) => assignment.shiftId === shift.id);
                              if (!assignments.length) return null;
                              return <div key={shift.id} className={cn("rounded-xl border p-3", SHIFT_STYLES[shiftIndex % SHIFT_STYLES.length])}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{shift.name}</p><p className="mt-0.5 text-xs text-muted-foreground"><Clock3 className="mr-1 inline size-3.5" />{shift.startTime}–{shift.endTime} · พัก {shift.breakMinutes} นาที</p></div>{shift.requiredRole ? <Badge variant="outline">{shift.requiredRole}</Badge> : null}</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{assignments.map((assignment) => { const employee = employeeById.get(assignment.employeeId); return <button key={assignment.id} type="button" onClick={() => setSelectedAssignmentId(assignment.id)} className={cn("min-w-0 rounded-xl border bg-background/70 p-3 text-left transition hover:border-primary/45", selectedAssignmentId === assignment.id && "ring-2 ring-primary", !employee && "border-dashed")} aria-pressed={selectedAssignmentId === assignment.id} data-testid={`employee-schedule-slot-${assignment.id}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{employee?.name ?? "ยังไม่มีคน"}</span>{assignment.locked ? <Lock className="size-3.5 shrink-0 text-primary" /> : null}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">ช่อง {assignment.slot} · {employee?.role ?? "แตะเพื่อจัดคน"}</span></button>; })}</div></div>;
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>

                <aside className="employee-schedule-no-print rounded-2xl border bg-card/60 p-4 2xl:sticky 2xl:top-24" aria-label="พนักงานสำหรับเลือกลงเวร">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-heading font-bold">สรุปทีม</h3><Badge variant="outline">{filteredEmployees.length}</Badge></div>
                  <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="ค้นหาชื่อหรือบทบาท" aria-label="ค้นหาพนักงาน" /></div>
                  {!selectedAssignment ? <p className="mt-3 rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground">แตะช่องเวรด้านซ้ายก่อน แล้วรายชื่อนี้จะใช้เลือกคนลงเวรพร้อมตรวจข้อจำกัด</p> : null}
                  <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pr-1" data-testid="employee-schedule-team-list">
                    {filteredEmployees.map((employee) => {
                      const employeeSummary = summary.employees.find((item) => item.employeeId === employee.id)!;
                      const eligibility = selectedAssignment ? getEmployeeScheduleEligibility(schedule, selectedAssignment.id, employee.id) : { eligible: false, reason: "เลือกช่องเวรก่อน" };
                      const current = selectedAssignment?.employeeId === employee.id;
                      return <button key={employee.id} type="button" disabled={!selectedAssignment || (!eligibility.eligible && !current)} onClick={() => selectedAssignment && runScheduleAction(() => assignEmployeeScheduleSlot(schedule, selectedAssignment.id, employee.id))} className={cn("[content-visibility:auto] flex w-full min-w-0 items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50", current && "border-primary bg-primary/8 ring-1 ring-primary")} aria-pressed={current} data-testid={`employee-schedule-person-${employee.id}`}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{employee.name}</span><span className="block truncate text-[10px] text-muted-foreground">{employee.role} · {employeeSummary.shifts} เวร · {formatMinutes(employeeSummary.netMinutes)}</span><span className={cn("mt-1 block truncate text-[10px]", eligibility.eligible || current ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>{current ? "อยู่ในช่องนี้" : eligibility.reason}</span></span><span className="shrink-0 rounded-full border bg-background/70 px-2 py-0.5 font-mono text-[10px]">{Math.round(employeeSummary.highestWeeklyMinutes / 60 * 10) / 10}/{employee.maxWeeklyHours}h</span></button>;
                    })}
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[44rem] place-items-center rounded-2xl border border-dashed bg-card/45 p-6 text-center" data-testid="employee-schedule-empty-state"><div className="max-w-lg"><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary"><CalendarCheck2 className="size-10" /></span><h2 className="mt-5 font-heading text-xl font-bold">จัดตารางเวรที่ตรวจช่องขาดได้จริง</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">ใส่ทีม บทบาท วันลา และกะที่ต้องครอบคลุม ระบบจะจัดร่างแบบเป็นธรรมโดยไม่ฝืนชั่วโมง เวลาพัก หรือวันทำงานติดกัน พร้อมให้แก้และล็อกเวรก่อนเผยแพร่</p><div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3"><div className="rounded-xl border bg-background/65 p-3">☕ ร้านอาหารและคาเฟ่</div><div className="rounded-xl border bg-background/65 p-3">🏥 คลินิกและทีมเวร</div><div className="rounded-xl border bg-background/65 p-3">🏪 ร้านค้าและฝ่ายปฏิบัติการ</div></div></div></div>
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}
