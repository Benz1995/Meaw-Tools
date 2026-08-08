"use client";

import {
  Calculator,
  ClipboardList,
  Download,
  Info,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MEETING_COST_MAX_DURATION_MINUTES,
  MEETING_COST_MAX_GROUPS,
  MEETING_COST_MAX_OVERHEAD_PERCENT,
  calculateLiveMeetingCost,
  calculateMeetingCost,
  meetingCostCsv,
  type MeetingCostInput,
  type MeetingCostResult,
  type MeetingRatePeriod,
} from "@/lib/tools/meeting-cost";

type CurrencyCode = "THB" | "USD" | "EUR" | "GBP" | "JPY";
type GroupDraft = { id: string; label: string; count: string; rateAmount: string; ratePeriod: MeetingRatePeriod };

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: "THB", label: "THB — บาทไทย" },
  { code: "USD", label: "USD — ดอลลาร์สหรัฐ" },
  { code: "EUR", label: "EUR — ยูโร" },
  { code: "GBP", label: "GBP — ปอนด์อังกฤษ" },
  { code: "JPY", label: "JPY — เยนญี่ปุ่น" },
];
const RATE_PERIODS: Array<{ value: MeetingRatePeriod; label: string }> = [
  { value: "hourly", label: "ต่อชั่วโมง" },
  { value: "monthly", label: "ต่อเดือน" },
  { value: "annual", label: "ต่อปี" },
];
const INITIAL_GROUPS: GroupDraft[] = [
  { id: "group-1", label: "ผู้เข้าร่วม", count: "1", rateAmount: "", ratePeriod: "monthly" },
];
const EXAMPLE_GROUPS: GroupDraft[] = [
  { id: "group-1", label: "ผู้บริหาร", count: "2", rateAmount: "1200000", ratePeriod: "annual" },
  { id: "group-2", label: "ทีมงาน", count: "6", rateAmount: "50000", ratePeriod: "monthly" },
];
const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function money(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function parseNumber(value: string, label: string, required = false) {
  if (!value.trim()) {
    if (required) throw new Error(`กรุณากรอก${label}`);
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function NumberField({ id, label, value, onChange, hint, min = 0, max = 1_000_000_000_000, step = 0.01, placeholder = "0" }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: React.ReactNode; min?: number; max?: number; step?: number; placeholder?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail?: string; emphasized?: boolean; testId?: string }) {
  return <div className={emphasized ? "rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-4" : "rounded-xl border bg-muted/10 p-4"}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-emerald-900 tabular-nums dark:text-emerald-100" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p>{detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p> : null}</div>;
}

function BreakdownRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}><span className="text-muted-foreground">{label}</span><span className="shrink-0 text-right tabular-nums">{value}</span></div>;
}

function MeetingResultPanel({ input, result, currency, elapsedMs, timerRunning, onStart, onPause, onReset }: { input: MeetingCostInput; result: MeetingCostResult; currency: CurrencyCode; elapsedMs: number; timerRunning: boolean; onStart: () => void; onPause: () => void; onReset: () => void }) {
  const liveCost = calculateLiveMeetingCost(result.teamLoadedHourlyCost, result.directCostPerMeeting, elapsedMs / 1_000);
  const plannedMs = input.durationMinutes * 60_000;
  const progress = plannedMs > 0 ? Math.min(100, elapsedMs / plannedMs * 100) : 0;
  const timeDifferenceMs = Math.abs(plannedMs - elapsedMs);
  const timerNote = elapsedMs <= plannedMs ? `เหลือจากแผน ${formatElapsed(timeDifferenceMs)}` : `เกินแผน ${formatElapsed(timeDifferenceMs)}`;
  const summary = [
    "สรุปต้นทุนประชุม — Meaw Tools",
    `ผู้เข้าร่วม: ${numberFormatter.format(result.participantCount)} คน`,
    `ระยะเวลา: ${numberFormatter.format(input.durationMinutes)} นาที`,
    `ต้นทุนรวมต่อครั้ง: ${money(result.totalMeetingCost, currency)}`,
    `ต้นทุนต่อนาที: ${money(result.costPerMinute, currency)}`,
    `ต้นทุนประชุมต่อปี: ${money(result.annualRecurringCost, currency)}`,
    `หากลด ${numberFormatter.format(input.shorterByMinutes)} นาที: ประหยัดแรงงาน ${money(result.annualSavings, currency)}/ปี`,
    "หมายเหตุ: เป็นค่าประมาณจากสมมติฐานที่กรอก ไม่ใช่ต้นทุนบัญชีหรือการประเมินผลงานรายบุคคล",
  ].join("\n");

  return (
    <div className="space-y-5" data-testid="meeting-cost-result">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard label="ต้นทุนรวมต่อครั้ง" value={money(result.totalMeetingCost, currency)} detail={`${numberFormatter.format(result.participantCount)} คน · ${numberFormatter.format(input.durationMinutes)} นาที`} emphasized testId="meeting-total-cost" />
        <ResultCard label="ต้นทุนต่อนาที" value={money(result.costPerMinute, currency)} detail={`${money(result.teamLoadedHourlyCost, currency)}/ชั่วโมงของทีม`} />
        <ResultCard label="People-hours" value={`${numberFormatter.format(result.peopleHours)} ชม.`} detail="จำนวนคน × ระยะเวลาประชุม" />
        <ResultCard label="ต้นทุนประชุมต่อปี" value={money(result.annualRecurringCost, currency)} detail={`${numberFormatter.format(result.annualMeetingCount)} ครั้ง/ปี`} />
      </div>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5" aria-labelledby="live-meeting-timer-title">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h2 id="live-meeting-timer-title" className="flex items-center gap-2 font-semibold"><Play className="size-4 text-amber-700 dark:text-amber-300" />จับเวลาต้นทุนประชุมแบบสด</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">ตัวจับเวลาใช้เรทและต้นทุนแฝงจากผลล่าสุด ค่าใช้จ่ายตรงเป็นยอดคงที่ที่นับหนึ่งครั้ง</p>
          </div>
          <ActionBar>
            {timerRunning ? <Button type="button" variant="outline" onClick={onPause}><Pause className="size-4" />พักเวลา</Button> : <Button type="button" className="bg-amber-800 text-white hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600" onClick={onStart}><Play className="size-4" />{elapsedMs > 0 ? "จับเวลาต่อ" : "เริ่มจับเวลา"}</Button>}
            <Button type="button" variant="outline" onClick={onReset}><RotateCcw className="size-4" />รีเซ็ตเวลา</Button>
          </ActionBar>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs text-muted-foreground">เวลาที่ผ่านไป</p>
            <p role="timer" aria-live="off" data-testid="meeting-live-time" className="mt-1 font-mono text-3xl font-bold tabular-nums">{formatElapsed(elapsedMs)}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="สัดส่วนเวลาประชุมเทียบแผน" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div className="h-full rounded-full bg-amber-600 transition-[width]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{timerRunning ? "กำลังจับเวลา · " : "หยุดอยู่ · "}{timerNote}</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4" aria-live="off">
            <p className="text-xs text-muted-foreground">ต้นทุนสดโดยประมาณ</p>
            <p data-testid="meeting-live-cost" className="mt-1 text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-100">{money(liveCost.totalCost, currency)}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">แรงงาน {money(liveCost.laborCost, currency)} + ค่าใช้จ่ายตรง {money(result.directCostPerMeeting, currency)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="meeting-cost-breakdown-title">
          <h2 id="meeting-cost-breakdown-title" className="font-semibold">ที่มาของต้นทุนต่อครั้ง</h2>
          <div className="mt-4 space-y-3"><BreakdownRow label="ต้นทุนแรงงานตามเวลา" value={money(result.baseLaborCost, currency)} /><BreakdownRow label={`ต้นทุนแฝง ${numberFormatter.format(input.overheadPercent)}%`} value={money(result.overheadCost, currency)} /><BreakdownRow label="ค่าใช้จ่ายตรงต่อครั้ง" value={money(result.directCostPerMeeting, currency)} /><BreakdownRow label="ต้นทุนรวมต่อครั้ง" value={money(result.totalMeetingCost, currency)} strong /></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">เงินเดือนรายเดือนหรือรายปีถูกแปลงด้วย {numberFormatter.format(input.hoursPerWeek)} ชม./สัปดาห์ × {numberFormatter.format(input.workWeeksPerYear)} สัปดาห์ = {numberFormatter.format(result.annualWorkHours)} ชม./ปี</p>
        </section>
        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:p-5" aria-labelledby="meeting-savings-title">
          <h2 id="meeting-savings-title" className="font-semibold">ผลหากประชุมสั้นลง</h2>
          <div className="mt-4 space-y-3"><BreakdownRow label="ระยะเวลาใหม่" value={`${numberFormatter.format(result.shortenedDurationMinutes)} นาที`} /><BreakdownRow label="ประหยัดแรงงานต่อครั้ง" value={money(result.savingsPerMeeting, currency)} /><BreakdownRow label="ประหยัดแรงงานต่อปี" value={money(result.annualSavings, currency)} strong /></div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">ไม่นำค่าใช้จ่ายตรงมาหัก เพราะระบบไม่เดาว่าค่าห้อง อาหาร หรือค่าเดินทางจะลดลงตามเวลา</p>
        </section>
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="meeting-group-breakdown-title">
        <h2 id="meeting-group-breakdown-title" className="font-semibold">ต้นทุนแยกตามกลุ่ม</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 font-medium">กลุ่ม</th><th className="pb-3 pr-4 text-right font-medium">คน</th><th className="pb-3 pr-4 text-right font-medium">ต่อชั่วโมง/คน</th><th className="pb-3 text-right font-medium">แรงงานต่อครั้ง</th></tr></thead><tbody>{result.groupCosts.map((group, index) => <tr key={`${index}-${group.label}-${group.ratePeriod}`} className="border-t"><td className="py-3 pr-4 font-medium">{group.label}</td><td className="py-3 pr-4 text-right tabular-nums">{numberFormatter.format(group.count)}</td><td className="py-3 pr-4 text-right tabular-nums">{money(group.hourlyRate, currency)}</td><td className="py-3 text-right tabular-nums">{money(group.meetingLaborCost, currency)}</td></tr>)}</tbody></table></div>
      </section>

      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(meetingCostCsv(input, result, currency), "meaw-meeting-cost.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function MeetingCostCalculatorTool() {
  const nextGroupId = useRef(3);
  const [currency, setCurrency] = useState<CurrencyCode>("THB");
  const [groups, setGroups] = useState<GroupDraft[]>(INITIAL_GROUPS);
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [workWeeksPerYear, setWorkWeeksPerYear] = useState("52");
  const [overheadPercent, setOverheadPercent] = useState("0");
  const [directCost, setDirectCost] = useState("0");
  const [meetingsPerWeek, setMeetingsPerWeek] = useState("1");
  const [recurringWeeksPerYear, setRecurringWeeksPerYear] = useState("48");
  const [shorterByMinutes, setShorterByMinutes] = useState("0");
  const [calculation, setCalculation] = useState<{ input: MeetingCostInput; result: MeetingCostResult } | null>(null);
  const [error, setError] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerElapsedMs, setTimerElapsedMs] = useState(0);

  useEffect(() => {
    if (!timerRunning || timerStartedAt === null) return;
    const tick = () => {
      const nextElapsed = Math.min(Date.now() - timerStartedAt, MEETING_COST_MAX_DURATION_MINUTES * 60_000);
      setTimerElapsedMs(nextElapsed);
      if (nextElapsed >= MEETING_COST_MAX_DURATION_MINUTES * 60_000) {
        setTimerRunning(false);
        setTimerStartedAt(null);
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [timerRunning, timerStartedAt]);

  const resetTimer = () => { setTimerRunning(false); setTimerStartedAt(null); setTimerElapsedMs(0); };
  const invalidate = () => { setCalculation(null); setError(""); resetTimer(); };
  const updateValue = (setter: (value: string) => void) => (value: string) => { setter(value); invalidate(); };
  const updateGroup = (id: string, patch: Partial<GroupDraft>) => { setGroups((current) => current.map((group) => group.id === id ? { ...group, ...patch } : group)); invalidate(); };
  const removeGroup = (id: string) => { setGroups((current) => current.length > 1 ? current.filter((group) => group.id !== id) : current); invalidate(); };
  const addGroup = () => {
    if (groups.length >= MEETING_COST_MAX_GROUPS) { setError(`เพิ่มได้สูงสุด ${MEETING_COST_MAX_GROUPS} กลุ่ม`); return; }
    const id = `group-${nextGroupId.current++}`;
    setGroups((current) => [...current, { id, label: `กลุ่ม ${current.length + 1}`, count: "1", rateAmount: "", ratePeriod: "monthly" }]);
    invalidate();
  };
  const buildInput = (): MeetingCostInput => ({
    groups: groups.map((group, index) => ({ label: group.label, count: parseNumber(group.count, `จำนวนคนในกลุ่ม ${index + 1}`, true), rateAmount: parseNumber(group.rateAmount, `ค่าจ้างของกลุ่ม ${index + 1}`, true), ratePeriod: group.ratePeriod })),
    durationMinutes: parseNumber(durationMinutes, "ระยะเวลาประชุม", true),
    hoursPerWeek: parseNumber(hoursPerWeek, "ชั่วโมงทำงานต่อสัปดาห์", true),
    workWeeksPerYear: parseNumber(workWeeksPerYear, "สัปดาห์ทำงานต่อปี", true),
    overheadPercent: parseNumber(overheadPercent, "ต้นทุนแฝง"),
    directCostPerMeeting: parseNumber(directCost, "ค่าใช้จ่ายตรงต่อครั้ง"),
    meetingsPerWeek: parseNumber(meetingsPerWeek, "จำนวนประชุมต่อสัปดาห์"),
    recurringWeeksPerYear: parseNumber(recurringWeeksPerYear, "สัปดาห์ที่ประชุมต่อปี"),
    shorterByMinutes: parseNumber(shorterByMinutes, "เวลาที่ต้องการลด"),
  });
  const calculate = () => {
    try { const input = buildInput(); setCalculation({ input, result: calculateMeetingCost(input) }); setError(""); }
    catch (caught) { setCalculation(null); setError(caught instanceof Error ? caught.message : "คำนวณต้นทุนประชุมไม่สำเร็จ"); resetTimer(); }
  };
  const loadExample = () => {
    setCurrency("THB"); setGroups(EXAMPLE_GROUPS); setDurationMinutes("60"); setHoursPerWeek("40"); setWorkWeeksPerYear("52"); setOverheadPercent("30"); setDirectCost("500"); setMeetingsPerWeek("2"); setRecurringWeeksPerYear("48"); setShorterByMinutes("15"); setCalculation(null); setError(""); resetTimer();
  };
  const clear = () => {
    setGroups(INITIAL_GROUPS); setDurationMinutes("60"); setHoursPerWeek("40"); setWorkWeeksPerYear("52"); setOverheadPercent("0"); setDirectCost("0"); setMeetingsPerWeek("1"); setRecurringWeeksPerYear("48"); setShorterByMinutes("0"); setCalculation(null); setError(""); resetTimer();
  };
  const startTimer = () => {
    try {
      const input = buildInput(); const result = calculateMeetingCost(input); setCalculation({ input, result }); setError("");
      const elapsed = timerElapsedMs >= MEETING_COST_MAX_DURATION_MINUTES * 60_000 ? 0 : timerElapsedMs;
      setTimerElapsedMs(elapsed); setTimerStartedAt(Date.now() - elapsed); setTimerRunning(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "เริ่มจับเวลาไม่สำเร็จ"); resetTimer(); }
  };
  const pauseTimer = () => {
    if (timerStartedAt !== null) setTimerElapsedMs(Math.min(Date.now() - timerStartedAt, MEETING_COST_MAX_DURATION_MINUTES * 60_000));
    setTimerRunning(false); setTimerStartedAt(null);
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>วัดต้นทุนโดยไม่ระบุชื่อหรือเงินเดือนรายบุคคล</AlertTitle><AlertDescription className="leading-6">กรอกเป็นกลุ่มบทบาทและจำนวนคน ข้อมูลทั้งหมดคำนวณใน Browser ตัวเลขเป็นต้นทุนตามสมมติฐาน ไม่ใช่งบการเงินหรือคะแนนประสิทธิภาพของพนักงาน</AlertDescription></Alert>

      <div className="mb-7 grid gap-3 sm:max-w-xs"><Label htmlFor="meeting-currency">สกุลเงินที่ใช้แสดงผล</Label><Select value={currency} onValueChange={(value) => { setCurrency(value as CurrencyCode); invalidate(); }}><SelectTrigger id="meeting-currency" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">เปลี่ยนเฉพาะหน่วยแสดงผล ไม่มีการแปลงอัตราแลกเปลี่ยน</p></div>

      <section aria-labelledby="meeting-groups-title">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="meeting-groups-title" className="flex items-center gap-2 font-semibold"><UsersRound className="size-4 text-primary" />กลุ่มผู้เข้าร่วมประชุม</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ชื่อบทบาทแบบรวม เช่น ผู้บริหาร ทีมงาน ลูกค้า ไม่ต้องกรอกชื่อบุคคล</p></div><Button type="button" variant="outline" onClick={addGroup} disabled={groups.length >= MEETING_COST_MAX_GROUPS}><Plus className="size-4" />เพิ่มกลุ่ม</Button></div>
        <div className="mt-5 space-y-4">{groups.map((group, index) => <div key={group.id} className="grid gap-x-4 gap-y-5 rounded-xl border bg-muted/5 p-4 md:grid-cols-2 xl:grid-cols-[1.3fr_0.55fr_1fr_0.8fr_auto] xl:items-end"><div className="grid gap-3"><Label htmlFor={`${group.id}-label`}>ชื่อกลุ่ม / บทบาท</Label><Input id={`${group.id}-label`} value={group.label} maxLength={80} placeholder={`กลุ่ม ${index + 1}`} onChange={(event) => updateGroup(group.id, { label: event.target.value })} /></div><NumberField id={`${group.id}-count`} label="จำนวนคน" value={group.count} onChange={(value) => updateGroup(group.id, { count: value })} min={1} max={10_000} step={1} placeholder="1" /><NumberField id={`${group.id}-rate`} label={`ค่าจ้าง/ต้นทุน (${currency})`} value={group.rateAmount} onChange={(value) => updateGroup(group.id, { rateAmount: value })} min={0.01} placeholder="50000" /><div className="grid gap-3"><Label htmlFor={`${group.id}-period`}>งวดของตัวเลข</Label><Select value={group.ratePeriod} onValueChange={(value) => updateGroup(group.id, { ratePeriod: value as MeetingRatePeriod })}><SelectTrigger id={`${group.id}-period`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{RATE_PERIODS.map((period) => <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>)}</SelectContent></Select></div><Button type="button" variant="outline" size="icon" className="justify-self-start text-destructive xl:mb-0" aria-label={`ลบ${group.label || `กลุ่ม ${index + 1}`}`} disabled={groups.length === 1} onClick={() => removeGroup(group.id)}><Trash2 className="size-4" /></Button></div>)}</div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="meeting-assumptions-title"><div className="mb-5"><h2 id="meeting-assumptions-title" className="font-semibold">เวลาและสมมติฐานต้นทุน</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ชั่วโมงและสัปดาห์ทำงานใช้แปลงเงินเดือน/รายปีเป็นรายชั่วโมง ต้นทุนแฝงเป็นเปอร์เซ็นต์ที่คุณกำหนดเอง</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-5"><NumberField id="meeting-duration" label="ระยะเวลาประชุม (นาที)" value={durationMinutes} onChange={updateValue(setDurationMinutes)} min={1} max={MEETING_COST_MAX_DURATION_MINUTES} step={1} placeholder="60" /><NumberField id="meeting-hours-week" label="ชั่วโมงทำงานต่อสัปดาห์" value={hoursPerWeek} onChange={updateValue(setHoursPerWeek)} min={0.01} max={168} step={0.25} placeholder="40" /><NumberField id="meeting-weeks-year" label="สัปดาห์ทำงานต่อปี" value={workWeeksPerYear} onChange={updateValue(setWorkWeeksPerYear)} min={0.01} max={53} step={0.25} placeholder="52" /><NumberField id="meeting-overhead" label="ต้นทุนแฝง (%)" value={overheadPercent} onChange={updateValue(setOverheadPercent)} min={0} max={MEETING_COST_MAX_OVERHEAD_PERCENT} step={0.1} placeholder="30" hint="เช่น สวัสดิการ อุปกรณ์ พื้นที่และระบบ" /><NumberField id="meeting-direct-cost" label={`ค่าใช้จ่ายตรงต่อครั้ง (${currency})`} value={directCost} onChange={updateValue(setDirectCost)} min={0} placeholder="500" hint="เช่น ห้อง อาหาร เดินทาง หรือวิทยากร" /></div></section>

      <section className="mt-7 border-t pt-7" aria-labelledby="meeting-recurring-title"><div className="mb-5"><h2 id="meeting-recurring-title" className="font-semibold">การประชุมซ้ำและทางเลือกที่สั้นลง</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้ดูผลรายปีและเงินที่อาจประหยัดจากการลดเวลา โดยไม่สมมติว่าค่าใช้จ่ายตรงจะลดตาม</p></div><div className="grid gap-x-5 gap-y-6 md:grid-cols-3"><NumberField id="meeting-frequency" label="จำนวนประชุมต่อสัปดาห์" value={meetingsPerWeek} onChange={updateValue(setMeetingsPerWeek)} min={0} max={168} step={0.25} placeholder="2" /><NumberField id="meeting-recurring-weeks" label="สัปดาห์ที่ประชุมต่อปี" value={recurringWeeksPerYear} onChange={updateValue(setRecurringWeeksPerYear)} min={0} max={53} step={0.25} placeholder="48" /><NumberField id="meeting-shorter-by" label="อยากลดเวลาต่อครั้ง (นาที)" value={shorterByMinutes} onChange={updateValue(setShorterByMinutes)} min={0} max={Number(durationMinutes) || MEETING_COST_MAX_DURATION_MINUTES} step={1} placeholder="15" /></div></section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-emerald-900 text-white hover:bg-emerald-950 dark:bg-emerald-800 dark:hover:bg-emerald-700" onClick={calculate}><Calculator className="size-4" />คำนวณต้นทุนประชุม</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">{calculation ? <MeetingResultPanel input={calculation.input} result={calculation.result} currency={currency} elapsedMs={timerElapsedMs} timerRunning={timerRunning} onStart={startTimer} onPause={pauseTimer} onReset={resetTimer} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><UsersRound className="mx-auto mb-3 size-9 text-primary/70" /><p>กรอกกลุ่มผู้เข้าร่วม ระยะเวลา และต้นทุน แล้วกดคำนวณ</p><p className="mt-1 text-xs">ระบบจะแสดงต้นทุนต่อครั้ง รายปี ทางเลือกที่สั้นลง และตัวจับเวลาต้นทุนสด</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>ต้นทุนที่แสดงเป็นค่าประมาณจากค่าจ้าง/ต้นทุน เวลา overhead และค่าใช้จ่ายที่กรอก ไม่รวมผลลัพธ์ของการประชุม คุณค่าของการตัดสินใจ ภาษี หรือหลักบัญชี และไม่ควรใช้ตัดสินผลงานรายบุคคล หากต้องหาเรทจากรายได้ก่อน ให้ใช้ <Link href="/hourly-rate-calculator" className="font-medium text-primary hover:underline">Hourly Rate Calculator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
