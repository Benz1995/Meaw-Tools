"use client";

import {
  Calculator,
  CalendarDays,
  ClipboardList,
  Download,
  Gauge,
  Info,
  Plus,
  ShieldCheck,
  Table2,
  Target,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateTeamCapacity,
  TEAM_CAPACITY_MAX_GROUPS,
  teamCapacityCsv,
  type CapacityStatus,
  type TeamCapacityInput,
  type TeamCapacityResult,
} from "@/lib/tools/team-capacity";

type CapacityGroupDraft = {
  id: string;
  label: string;
  scheduledFte: string;
  leaveDaysPerFte: string;
  focusPercent: string;
  demandHours: string;
};

const INITIAL_GROUPS: CapacityGroupDraft[] = [
  { id: "capacity-group-1", label: "ทีมงาน", scheduledFte: "", leaveDaysPerFte: "0", focusPercent: "75", demandHours: "" },
];

const EXAMPLE_GROUPS: CapacityGroupDraft[] = [
  { id: "capacity-group-1", label: "Development", scheduledFte: "4", leaveDaysPerFte: "1", focusPercent: "75", demandHours: "240" },
  { id: "capacity-group-2", label: "Design", scheduledFte: "1.5", leaveDaysPerFte: "0.5", focusPercent: "70", demandHours: "70" },
  { id: "capacity-group-3", label: "QA", scheduledFte: "2", leaveDaysPerFte: "0", focusPercent: "75", demandHours: "100" },
  { id: "capacity-group-4", label: "Project Management", scheduledFte: "1", leaveDaysPerFte: "0", focusPercent: "60", demandHours: "40" },
];

const numberFormatter = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function parseNumber(value: string, label: string, required = false) {
  if (!value.trim()) {
    if (required) throw new Error(`กรุณากรอก${label}`);
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  return parsed;
}

function hours(value: number) {
  return `${numberFormatter.format(value)} ชม.`;
}

function fte(value: number) {
  return `${numberFormatter.format(value)} FTE`;
}

function signedHours(value: number) {
  if (Math.abs(value) < 0.005) return "0 ชม.";
  return `${value > 0 ? "+" : "−"}${hours(Math.abs(value))}`;
}

function statusLabel(status: CapacityStatus) {
  if (status === "over-capacity") return "เกินกำลัง";
  if (status === "near-capacity") return "ใกล้เต็ม";
  if (status === "no-capacity") return "ไม่มี capacity";
  return "ยังมีพื้นที่";
}

function statusClasses(status: CapacityStatus) {
  if (status === "over-capacity") return "border-rose-500/35 bg-rose-500/5 text-rose-800 dark:text-rose-200";
  if (status === "near-capacity") return "border-amber-500/35 bg-amber-500/5 text-amber-800 dark:text-amber-200";
  if (status === "no-capacity") return "border-slate-500/35 bg-slate-500/5 text-slate-700 dark:text-slate-200";
  return "border-emerald-500/35 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200";
}

function barClasses(status: CapacityStatus) {
  if (status === "over-capacity") return "bg-rose-500";
  if (status === "near-capacity") return "bg-amber-500";
  if (status === "no-capacity") return "bg-slate-400";
  return "bg-emerald-500";
}

function NumberField({ id, label, value, onChange, hint, min = 0, max = 1_000_000_000, step = 0.01, placeholder = "0" }: { id: string; label: string; value: string; onChange: (value: string) => void; hint?: React.ReactNode; min?: number; max?: number; step?: number; placeholder?: string }) {
  return <div className="grid gap-3"><Label htmlFor={id} className="leading-5">{label}</Label><Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function ResultCard({ label, value, detail, emphasized = false, testId }: { label: string; value: string; detail: string; emphasized?: boolean; testId?: string }) {
  return <div className={emphasized ? "rounded-xl border border-violet-500/35 bg-violet-500/5 p-4" : "rounded-xl border bg-muted/10 p-4"}><p className="text-xs leading-5 text-muted-foreground">{label}</p><p data-testid={testId} className={emphasized ? "mt-1 text-xl font-bold text-violet-950 tabular-nums dark:text-violet-100" : "mt-1 text-lg font-semibold tabular-nums"}>{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>;
}

function BreakdownRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex items-center justify-between gap-4 border-t pt-3 font-semibold" : "flex items-center justify-between gap-4 text-sm"}><span className="text-muted-foreground">{label}</span><span className="shrink-0 text-right tabular-nums">{value}</span></div>;
}

function TeamCapacityResultPanel({ input, result }: { input: TeamCapacityInput; result: TeamCapacityResult }) {
  const loadText = result.loadPercent === null ? "คำนวณไม่ได้" : `${numberFormatter.format(result.loadPercent)}%`;
  const additionalFteText = result.additionalScheduledFte === null
    ? "ประเมินไม่ได้"
    : result.additionalScheduledFte < 0.005 ? "ไม่ต้องเพิ่ม" : fte(result.additionalScheduledFte);
  const summary = [
    "สรุป Team Capacity",
    `รอบ: ${input.workingDays} วัน × ${numberFormatter.format(input.hoursPerDay)} ชม.`,
    `กำลังคนตามตาราง: ${fte(result.scheduledFte)}`,
    `Planned capacity หลัง buffer: ${hours(result.plannedCapacityHours)}`,
    `Demand: ${hours(result.demandHours)}`,
    `Capacity gap: ${signedHours(result.capacityGapHours)}`,
    `Workload: ${loadText}`,
    `Scheduled FTE ที่ต้องเพิ่มตามคอขวด: ${additionalFteText}`,
  ].join("\n");

  return (
    <div data-testid="team-capacity-result" className="space-y-5" aria-live="polite">
      <div className={`rounded-xl border p-4 ${statusClasses(result.status)}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">สถานะรวม: {statusLabel(result.status)}</p><span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium">Workload {loadText}</span></div>
        <p className="mt-2 text-sm leading-6">{result.capacityGapHours < -0.005 ? `Demand เกิน Planned capacity ${hours(-result.capacityGapHours)} ต้องลดงาน เลื่อนงาน หรือเพิ่ม capacity ในกลุ่มที่ขาด` : `หลังหักข้อจำกัดและ buffer แล้วยังเหลือ ${hours(Math.max(0, result.capacityGapHours))}`}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard label="Planned capacity" value={hours(result.plannedCapacityHours)} detail={`หลังกัน buffer ${numberFormatter.format(input.reservePercent)}%`} emphasized testId="team-planned-capacity" />
        <ResultCard label="Demand ที่ต้องส่งมอบ" value={hours(result.demandHours)} detail={`เทียบเท่า ${fte(result.demandFte)} ก่อนหักข้อจำกัด`} testId="team-demand-hours" />
        <ResultCard label="Capacity gap" value={signedHours(result.capacityGapHours)} detail="ค่าบวกคือเหลือ ค่าลบคือขาด" testId="team-capacity-gap" />
        <ResultCard label="Workload ต่อ Planned capacity" value={loadText} detail="เกิน 100% คือ over-capacity" testId="team-load-percent" />
        <ResultCard label="กำลังคนตามตาราง" value={fte(result.scheduledFte)} detail={`Effective planned ${fte(result.effectivePlannedFte)}`} />
        <ResultCard label="Scheduled FTE ที่ต้องเพิ่ม" value={additionalFteText} detail="รวมส่วนขาดรายกลุ่ม ไม่หักล้างข้ามทักษะ" testId="team-additional-fte" />
      </div>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="capacity-waterfall-title">
        <h2 id="capacity-waterfall-title" className="flex items-center gap-2 font-semibold"><Gauge className="size-4 text-primary" />จากเวลาตามตารางถึง Capacity ที่วางแผนได้</h2>
        <div className="mt-4 space-y-3"><BreakdownRow label="ชั่วโมงตามตารางก่อนหัก" value={hours(result.grossHours)} /><BreakdownRow label="หักวันลา/เวลาที่ไม่พร้อม" value={`−${hours(result.absenceHours)}`} /><BreakdownRow label="ชั่วโมงตามตารางสุทธิ" value={hours(result.netScheduledHours)} strong /><BreakdownRow label="หักประชุม แอดมิน Support และงานอื่นผ่าน Focus factor" value={`−${hours(result.nonDeliveryHours)}`} /><BreakdownRow label="Delivery capacity ก่อน buffer" value={hours(result.deliveryCapacityHours)} strong /><BreakdownRow label={`หัก Capacity buffer ${numberFormatter.format(input.reservePercent)}%`} value={`−${hours(result.reserveHours)}`} /><BreakdownRow label="Planned capacity" value={hours(result.plannedCapacityHours)} strong /></div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Focus factor และ buffer เป็นคนละชั้น: Focus factor หักงานที่รู้อยู่แล้วว่าไม่ใช่ delivery ส่วน buffer กันพื้นที่สำหรับความไม่แน่นอน หลีกเลี่ยงการหักเหตุผลเดียวกันซ้ำสองครั้ง</p>
      </section>

      <section className="rounded-xl border bg-muted/5 p-4 sm:p-5" aria-labelledby="capacity-role-title">
        <h2 id="capacity-role-title" className="flex items-center gap-2 font-semibold"><UsersRound className="size-4 text-primary" />คอขวดตามกลุ่มงาน</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">ระบบไม่ถือว่าชั่วโมงว่างของอีกบทบาททดแทนกลุ่มที่ขาดได้อัตโนมัติ เพราะทักษะและความรับผิดชอบอาจต่างกัน</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {result.groups.map((group, index) => {
            const width = group.loadPercent === null ? 0 : Math.min(100, Math.max(0, group.loadPercent));
            const groupLoad = group.loadPercent === null ? "—" : `${numberFormatter.format(group.loadPercent)}%`;
            return <article key={`${group.label}-${index}`} className="rounded-xl border bg-background/70 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{group.label}</h3><p className="mt-1 text-xs text-muted-foreground">{fte(group.scheduledFte)} · Focus {numberFormatter.format(group.focusPercent)}%</p></div><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses(group.status)}`}>{statusLabel(group.status)}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${barClasses(group.status)}`} style={{ width: `${width}%` }} /></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Planned capacity</p><p className="mt-1 font-medium tabular-nums">{hours(group.plannedCapacityHours)}</p></div><div><p className="text-xs text-muted-foreground">Demand / Load</p><p className="mt-1 font-medium tabular-nums">{hours(group.demandHours)} · {groupLoad}</p></div><div><p className="text-xs text-muted-foreground">Gap</p><p className="mt-1 font-medium tabular-nums">{signedHours(group.capacityGapHours)}</p></div><div><p className="text-xs text-muted-foreground">FTE ที่ต้องเพิ่ม</p><p className="mt-1 font-medium tabular-nums">{group.additionalScheduledFte === null ? "ประเมินไม่ได้" : fte(group.additionalScheduledFte)}</p></div></div></article>;
          })}
        </div>
      </section>

      <details className="rounded-xl border bg-muted/5 p-4 sm:p-5">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold marker:text-primary"><Table2 className="size-4 text-primary" />ตารางคำนวณรายกลุ่มแบบละเอียด</summary>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[68rem] text-right text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3 pr-4 text-left font-medium">กลุ่มงาน</th><th className="px-3 pb-3 font-medium">Scheduled FTE</th><th className="px-3 pb-3 font-medium">Gross</th><th className="px-3 pb-3 font-medium">ลา/ไม่พร้อม</th><th className="px-3 pb-3 font-medium">Non-delivery</th><th className="px-3 pb-3 font-medium">Delivery</th><th className="px-3 pb-3 font-medium">Buffer</th><th className="px-3 pb-3 font-medium">Planned</th><th className="px-3 pb-3 font-medium">Demand</th><th className="pl-3 pb-3 font-medium">Gap</th></tr></thead><tbody className="divide-y">{result.groups.map((group, index) => <tr key={`${group.label}-${index}`}><th className="py-3 pr-4 text-left font-medium">{group.label}</th><td className="px-3 tabular-nums">{numberFormatter.format(group.scheduledFte)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.grossHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.absenceHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.nonDeliveryHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.deliveryCapacityHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.reserveHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.plannedCapacityHours)}</td><td className="px-3 tabular-nums">{numberFormatter.format(group.demandHours)}</td><td className="pl-3 tabular-nums">{signedHours(group.capacityGapHours)}</td></tr>)}</tbody></table></div>
      </details>

      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void copyText(summary, "คัดลอกสรุปแล้ว")}><ClipboardList className="size-4" />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={() => downloadText(teamCapacityCsv(input, result), "meaw-team-capacity.csv", "text/csv;charset=utf-8")}><Download className="size-4" />ดาวน์โหลด CSV</Button></div>
    </div>
  );
}

export function TeamCapacityCalculatorTool() {
  const nextGroupId = useRef(5);
  const [workingDays, setWorkingDays] = useState("10");
  const [hoursPerDay, setHoursPerDay] = useState("8");
  const [reservePercent, setReservePercent] = useState("10");
  const [groups, setGroups] = useState<CapacityGroupDraft[]>(INITIAL_GROUPS);
  const [calculation, setCalculation] = useState<{ input: TeamCapacityInput; result: TeamCapacityResult } | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => { setCalculation(null); setError(""); };
  const updateValue = (setter: (value: string) => void) => (value: string) => { setter(value); invalidate(); };
  const updateGroup = (id: string, patch: Partial<CapacityGroupDraft>) => { setGroups((current) => current.map((group) => group.id === id ? { ...group, ...patch } : group)); invalidate(); };
  const addGroup = () => {
    if (groups.length >= TEAM_CAPACITY_MAX_GROUPS) { setError(`เพิ่มได้สูงสุด ${TEAM_CAPACITY_MAX_GROUPS} กลุ่ม`); return; }
    const id = `capacity-group-${nextGroupId.current++}`;
    setGroups((current) => [...current, { id, label: `กลุ่มงาน ${current.length + 1}`, scheduledFte: "", leaveDaysPerFte: "0", focusPercent: "75", demandHours: "" }]);
    invalidate();
  };
  const removeGroup = (id: string) => { setGroups((current) => current.length > 1 ? current.filter((group) => group.id !== id) : current); invalidate(); };
  const calculate = () => {
    try {
      const input: TeamCapacityInput = {
        workingDays: parseNumber(workingDays, "จำนวนวันทำงานในรอบ", true),
        hoursPerDay: parseNumber(hoursPerDay, "ชั่วโมงมาตรฐานต่อวัน", true),
        reservePercent: parseNumber(reservePercent, "Capacity buffer", true),
        groups: groups.map((group, index) => ({
          label: group.label,
          scheduledFte: parseNumber(group.scheduledFte, `กำลังคน FTE กลุ่มที่ ${index + 1}`, true),
          leaveDaysPerFte: parseNumber(group.leaveDaysPerFte, `วันลาเฉลี่ยกลุ่มที่ ${index + 1}`),
          focusPercent: parseNumber(group.focusPercent, `Focus factor กลุ่มที่ ${index + 1}`, true),
          demandHours: parseNumber(group.demandHours, `ชั่วโมง Demand กลุ่มที่ ${index + 1}`),
        })),
      };
      setCalculation({ input, result: calculateTeamCapacity(input) });
      setError("");
    } catch (caught) {
      setCalculation(null);
      setError(caught instanceof Error ? caught.message : "ไม่สามารถคำนวณได้");
    }
  };
  const loadExample = () => {
    setWorkingDays("10"); setHoursPerDay("8"); setReservePercent("10"); setGroups(EXAMPLE_GROUPS); setCalculation(null); setError(""); nextGroupId.current = 5;
  };
  const clear = () => {
    setWorkingDays("10"); setHoursPerDay("8"); setReservePercent("10"); setGroups(INITIAL_GROUPS); setCalculation(null); setError(""); nextGroupId.current = 2;
  };

  return (
    <WorkspaceFrame>
      <Alert className="mb-6 border-violet-500/30 bg-violet-500/5"><ShieldCheck className="text-violet-700 dark:text-violet-300" /><AlertTitle>แผนกำลังทีมคำนวณใน Browser</AlertTitle><AlertDescription className="leading-6">จำนวน FTE วันลา Focus factor และ Demand ไม่ถูกส่งไป Server หรือบันทึกไว้ เมื่อรีเฟรชหน้าข้อมูลจะหาย ควรใช้ชื่อบทบาทหรือทีมแทนชื่อบุคคล</AlertDescription></Alert>

      <section aria-labelledby="team-capacity-settings-title">
        <div><h2 id="team-capacity-settings-title" className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-primary" />รอบวางแผนและ Buffer</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">ใช้รอบเดียวกันทั้งทีม เช่น Sprint 10 วัน สัปดาห์ 5 วัน หรือเดือนที่นับวันทำงานแล้ว วันหยุดส่วนกลางควรถูกตัดออกจากจำนวนวันทำงานก่อน</p></div>
        <div className="mt-5 grid gap-x-5 gap-y-6 md:grid-cols-3">
          <NumberField id="team-working-days" label="จำนวนวันทำงานในรอบ" value={workingDays} onChange={updateValue(setWorkingDays)} min={1} max={366} step={1} placeholder="10" hint={<>หากต้องนับวันตามปฏิทิน ใช้ <Link href="/business-days-calculator" className="font-medium text-primary hover:underline">Business Days Calculator</Link></>} />
          <NumberField id="team-hours-per-day" label="ชั่วโมงมาตรฐานต่อวัน" value={hoursPerDay} onChange={updateValue(setHoursPerDay)} min={0.25} max={24} step={0.25} placeholder="8" hint="ฐานสำหรับแปลง FTE เป็นชั่วโมง ไม่ใช่เวลาทำงานล่วงเวลา" />
          <NumberField id="team-reserve-percent" label="Capacity buffer สำหรับงานไม่คาดคิด (%)" value={reservePercent} onChange={updateValue(setReservePercent)} min={0} max={95} step={0.1} placeholder="10" hint="กันหลัง Focus factor เช่น incident, bug หรือ scope ที่ยังไม่แน่นอน" />
        </div>
      </section>

      <section className="mt-7 border-t pt-7" aria-labelledby="team-capacity-groups-title">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="team-capacity-groups-title" className="flex items-center gap-2 font-semibold"><UsersRound className="size-4 text-primary" />Capacity และ Demand ตามกลุ่มงาน</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Scheduled FTE รองรับทศนิยม เช่น พนักงานครึ่งเวลา 0.5 FTE; Focus factor คือสัดส่วนเวลาสุทธิที่ใช้ส่งมอบงาน หลังประชุม แอดมิน Support และงานภายในที่ทราบอยู่แล้ว</p></div><Button type="button" variant="outline" onClick={addGroup} disabled={groups.length >= TEAM_CAPACITY_MAX_GROUPS}><Plus className="size-4" />เพิ่มกลุ่มงาน</Button></div>
        <div className="mt-5 space-y-4">
          {groups.map((group, index) => <div key={group.id} data-testid="team-capacity-group" className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border bg-muted/5 p-4 xl:grid-cols-[1.35fr_0.75fr_0.8fr_0.8fr_0.85fr_auto] xl:items-end"><div className="col-span-2 grid gap-3 xl:col-span-1"><Label htmlFor={`${group.id}-label`}>บทบาท / กลุ่มงาน</Label><Input id={`${group.id}-label`} value={group.label} maxLength={80} placeholder={`กลุ่มงาน ${index + 1}`} onChange={(event) => updateGroup(group.id, { label: event.target.value })} /></div><NumberField id={`${group.id}-fte`} label="กำลังคนตามตาราง (FTE)" value={group.scheduledFte} onChange={(value) => updateGroup(group.id, { scheduledFte: value })} min={0} max={1000} step={0.01} placeholder="4" /><NumberField id={`${group.id}-leave`} label="วันลาเฉลี่ย / FTE" value={group.leaveDaysPerFte} onChange={(value) => updateGroup(group.id, { leaveDaysPerFte: value })} min={0} max={366} step={0.25} placeholder="1" /><NumberField id={`${group.id}-focus`} label="Focus factor (%)" value={group.focusPercent} onChange={(value) => updateGroup(group.id, { focusPercent: value })} min={0.1} max={100} step={0.1} placeholder="75" /><NumberField id={`${group.id}-demand`} label="Demand ในรอบ (ชั่วโมง)" value={group.demandHours} onChange={(value) => updateGroup(group.id, { demandHours: value })} min={0} max={1_000_000_000} step={0.25} placeholder="240" /><Button type="button" variant="outline" size="icon" className="justify-self-start text-destructive" aria-label={`ลบ${group.label || `กลุ่มงาน ${index + 1}`}`} disabled={groups.length === 1} onClick={() => removeGroup(group.id)}><Trash2 className="size-4" /></Button></div>)}
        </div>
      </section>

      <div className="mt-7 border-t pt-5"><ActionBar><Button type="button" className="bg-violet-900 text-white hover:bg-violet-950 dark:bg-violet-800 dark:hover:bg-violet-700" onClick={calculate}><Calculator className="size-4" />คำนวณ Capacity และ Workload</Button><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p> : null}
      <div className="mt-5">{calculation ? <TeamCapacityResultPanel input={calculation.input} result={calculation.result} /> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm leading-6 text-muted-foreground"><div><Target className="mx-auto mb-3 size-9 text-primary/70" /><p>กำหนดรอบ เพิ่มกลุ่มงาน แล้วกรอก FTE วันลา Focus factor และ Demand</p><p className="mt-1 text-xs">ระบบจะคำนวณ Planned capacity, workload, gap และ FTE ที่ต้องเพิ่มตามคอขวด</p></div></div>}</div>

      <div className="mt-6 rounded-xl border bg-muted/15 p-4 text-xs leading-6 text-muted-foreground"><p className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0 text-primary" /><span>เครื่องมือนี้ใช้ชั่วโมงเป็นหน่วยเดียวกันทั้ง Capacity และ Demand ไม่ควรแปลง Story point เป็นชั่วโมงโดยไม่มีข้อมูลย้อนหลังที่เสถียร และไม่ใช่ระบบจัดตารางรายบุคคล การรับรองกำลังคน หรือ benchmark บังคับ หากต้องวัดเวลาที่เกิดแล้วให้ใช้ <Link href="/working-hours-calculator" className="font-medium text-primary hover:underline">Working Hours Calculator</Link> หรือประเมินต้นทุนของ capacity ด้วย <Link href="/project-cost-calculator" className="font-medium text-primary hover:underline">Project Cost Calculator</Link></span></p></div>
    </WorkspaceFrame>
  );
}
