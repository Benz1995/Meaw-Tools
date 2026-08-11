"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Clipboard,
  Globe2,
  Link2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MAX_MEETING_PARTICIPANTS,
  buildMeetingIcs,
  buildMeetingPlannerShareUrl,
  buildMeetingSummary,
  meetingIcsFilename,
  parseMeetingPlannerShareParams,
  planTimeZoneMeeting,
  type MeetingParticipant,
  type MeetingPlannerInput,
  type MeetingPlannerResult,
  type MeetingSuggestion,
  type ParticipantSlotStatus,
} from "@/lib/tools/time-zone-meeting";

type UiParticipant = MeetingParticipant & { id: string };

const POPULAR_TIME_ZONES = [
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const STATUS_LABELS: Record<ParticipantSlotStatus, string> = {
  available: "ในเวลางาน",
  early: "เช้ากว่าเวลางาน",
  late: "หลังเวลางาน",
  weekend: "วันหยุดสุดสัปดาห์",
};

const STATUS_CLASSES: Record<ParticipantSlotStatus, string> = {
  available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  early: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  late: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  weekend: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function localDateInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function createParticipant(participant: MeetingParticipant): UiParticipant {
  return { ...participant, id: crypto.randomUUID() };
}

function initialParticipants(): UiParticipant[] {
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok";
  return [
    createParticipant({ label: "ฉัน (ผู้จัด)", timeZone: browserTimeZone, workStart: "09:00", workEnd: "18:00" }),
    createParticipant({ label: "ทีม London", timeZone: "Europe/London", workStart: "09:00", workEnd: "18:00" }),
  ];
}

function supportedTimeZones(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  try {
    return intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? POPULAR_TIME_ZONES;
  } catch {
    return POPULAR_TIME_ZONES;
  }
}

function timeText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function localDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Intl.DateTimeFormat("th-TH", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(Date.UTC(year, month - 1, day, 12));
}

function suggestionHeading(suggestion: MeetingSuggestion): string {
  const organizer = suggestion.participantSlots[0]!;
  return `${timeText(organizer.localStart.hour, organizer.localStart.minute)}–${timeText(organizer.localEnd.hour, organizer.localEnd.minute)}`;
}

export function TimeZoneMeetingPlannerTool() {
  const [title, setTitle] = useState("ประชุมทีมต่างประเทศ");
  const [date, setDate] = useState(localDateInput);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [participants, setParticipants] = useState<UiParticipant[]>(initialParticipants);
  const [result, setResult] = useState<MeetingPlannerResult | null>(null);
  const [selectedStartMs, setSelectedStartMs] = useState<number | null>(null);
  const [error, setError] = useState("");
  const timeZones = useMemo(() => supportedTimeZones(), []);

  const plannerInput = useMemo<MeetingPlannerInput>(() => ({
    title,
    date,
    durationMinutes,
    participants: participants.map((participant) => ({
      label: participant.label,
      timeZone: participant.timeZone,
      workStart: participant.workStart,
      workEnd: participant.workEnd,
    })),
  }), [date, durationMinutes, participants, title]);
  const selectedSuggestion = result?.suggestions.find((suggestion) => suggestion.startMs === selectedStartMs) ?? result?.suggestions[0] ?? null;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const shared = parseMeetingPlannerShareParams(window.location.search);
      if (!shared) return;
      const sharedParticipants = shared.participants.map(createParticipant);
      const sharedInput: MeetingPlannerInput = { ...shared, participants: shared.participants };
      try {
        const planned = planTimeZoneMeeting(sharedInput);
        setTitle(shared.title);
        setDate(shared.date);
        setDurationMinutes(shared.durationMinutes);
        setParticipants(sharedParticipants);
        setResult(planned);
        const sharedSelection = planned.suggestions.some((suggestion) => suggestion.startMs === shared.selectedStartMs)
          ? shared.selectedStartMs ?? planned.suggestions[0]?.startMs ?? null
          : planned.suggestions[0]?.startMs ?? null;
        setSelectedStartMs(sharedSelection);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "เปิดแผนประชุมจากลิงก์ไม่สำเร็จ");
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const invalidateResult = () => {
    setResult(null);
    setSelectedStartMs(null);
    setError("");
  };

  const updateParticipant = (id: string, field: keyof MeetingParticipant, value: string) => {
    setParticipants((current) => current.map((participant) => participant.id === id ? { ...participant, [field]: value } : participant));
    invalidateResult();
  };

  const addParticipant = () => {
    if (participants.length >= MAX_MEETING_PARTICIPANTS) return;
    setParticipants((current) => [
      ...current,
      createParticipant({ label: `ทีม ${current.length + 1}`, timeZone: "Asia/Singapore", workStart: "09:00", workEnd: "18:00" }),
    ]);
    invalidateResult();
  };

  const calculate = () => {
    try {
      const planned = planTimeZoneMeeting(plannerInput);
      setResult(planned);
      setSelectedStartMs(planned.suggestions[0]?.startMs ?? null);
      setError("");
    } catch (caught) {
      setResult(null);
      setSelectedStartMs(null);
      setError(caught instanceof Error ? caught.message : "หาเวลาประชุมไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setTitle("Weekly product sync");
    setDate(localDateInput());
    setDurationMinutes(60);
    setParticipants([
      createParticipant({ label: "Bangkok (ผู้จัด)", timeZone: "Asia/Bangkok", workStart: "09:00", workEnd: "22:00" }),
      createParticipant({ label: "London", timeZone: "Europe/London", workStart: "09:00", workEnd: "18:00" }),
      createParticipant({ label: "New York", timeZone: "America/New_York", workStart: "07:00", workEnd: "18:00" }),
    ]);
    setResult(null);
    setSelectedStartMs(null);
    setError("");
  };

  const clear = () => {
    setTitle("");
    setDate(localDateInput());
    setDurationMinutes(60);
    setParticipants(initialParticipants());
    setResult(null);
    setSelectedStartMs(null);
    setError("");
  };

  const copyShareLink = async () => {
    try {
      const url = buildMeetingPlannerShareUrl(window.location.origin, plannerInput, selectedSuggestion?.startMs);
      await copyText(url, "คัดลอกลิงก์แผนประชุมแล้ว");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้างลิงก์ไม่สำเร็จ");
    }
  };

  const copySummary = async () => {
    if (!selectedSuggestion) return;
    await copyText(buildMeetingSummary(plannerInput, selectedSuggestion), "คัดลอกสรุปเวลาประชุมแล้ว");
  };

  const downloadCalendar = () => {
    if (!selectedSuggestion) return;
    downloadText(
      buildMeetingIcs(plannerInput, selectedSuggestion.startMs),
      meetingIcsFilename(title),
      "text/calendar;charset=utf-8",
    );
  };

  return (
    <WorkspaceFrame>
      <datalist id="meeting-time-zones">
        {timeZones.map((timeZone) => <option key={timeZone} value={timeZone} />)}
      </datalist>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="meeting-planner-settings-title">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Globe2 className="size-5" /></span>
            <div>
              <h2 id="meeting-planner-settings-title" className="font-semibold">ตั้งค่าทีมและวันประชุม</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">คนแรกคือผู้จัด ระบบจะค้นหาตลอดวันของผู้จัดและแปลงเวลาให้ทุกคนอัตโนมัติ</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">ชื่อการประชุม</Label>
              <Input id="meeting-title" value={title} maxLength={120} onChange={(event) => { setTitle(event.target.value); invalidateResult(); }} placeholder="เช่น Weekly product sync" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meeting-date">วันที่ของผู้จัด</Label>
                <Input id="meeting-date" type="date" min="2000-01-01" max="2100-12-31" value={date} onChange={(event) => { setDate(event.target.value); invalidateResult(); }} data-testid="meeting-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-duration">ระยะเวลาประชุม</Label>
                <Select value={String(durationMinutes)} onValueChange={(value) => { setDurationMinutes(Number(value)); invalidateResult(); }}>
                  <SelectTrigger id="meeting-duration" className="w-full" data-testid="meeting-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[30, 45, 60, 90, 120, 180].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes < 60 ? `${minutes} นาที` : `${Math.floor(minutes / 60)} ชั่วโมง${minutes % 60 ? ` ${minutes % 60} นาที` : ""}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <div>
              <h3 className="font-semibold">ผู้เข้าร่วมและเวลางาน</h3>
              <p className="mt-1 text-xs text-muted-foreground">รองรับ 2–{MAX_MEETING_PARTICIPANTS} คน • เวลางานต้องอยู่ในวันเดียวกัน</p>
            </div>
            <Badge variant="outline"><UsersRound className="size-3.5" />{participants.length}/{MAX_MEETING_PARTICIPANTS} คน</Badge>
          </div>

          <div className="mt-4 space-y-4">
            {participants.map((participant, index) => (
              <article key={participant.id} className="rounded-2xl border bg-muted/10 p-4" data-testid={`meeting-participant-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <p className="text-sm font-semibold">{index === 0 ? "ผู้จัดประชุม" : `ผู้เข้าร่วม ${index + 1}`}</p>
                  </div>
                  {index > 0 ? <Button type="button" size="icon-sm" variant="ghost" disabled={participants.length <= 2} aria-label={`ลบ ${participant.label}`} onClick={() => { setParticipants((current) => current.filter((item) => item.id !== participant.id)); invalidateResult(); }}><Trash2 /></Button> : null}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`participant-label-${participant.id}`}>ชื่อหรือเมือง</Label>
                    <Input id={`participant-label-${participant.id}`} value={participant.label} maxLength={40} onChange={(event) => updateParticipant(participant.id, "label", event.target.value)} placeholder="เช่น ทีม Tokyo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`participant-zone-${participant.id}`}>เขตเวลา IANA</Label>
                    <Input id={`participant-zone-${participant.id}`} list="meeting-time-zones" value={participant.timeZone} maxLength={80} onChange={(event) => updateParticipant(participant.id, "timeZone", event.target.value)} placeholder="Asia/Bangkok" autoCapitalize="none" spellCheck={false} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`participant-start-${participant.id}`}>เริ่มงาน</Label>
                    <Input id={`participant-start-${participant.id}`} type="time" value={participant.workStart} onChange={(event) => updateParticipant(participant.id, "workStart", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`participant-end-${participant.id}`}>เลิกงาน</Label>
                    <Input id={`participant-end-${participant.id}`} type="time" value={participant.workEnd} onChange={(event) => updateParticipant(participant.id, "workEnd", event.target.value)} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4">
            <Button type="button" variant="outline" onClick={addParticipant} disabled={participants.length >= MAX_MEETING_PARTICIPANTS}><Plus />เพิ่มผู้เข้าร่วม</Button>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-6 border-t pt-5">
            <ActionBar>
              <Button type="button" onClick={calculate} data-testid="meeting-calculate"><Sparkles />หาเวลาที่เหมาะสม</Button>
              <ExampleButton onExample={loadExample} />
              <ClearButton onClear={clear} />
            </ActionBar>
          </div>
        </section>

        <section className="xl:sticky xl:top-24 xl:self-start" aria-labelledby="meeting-results-title">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><Clock3 className="size-5" /></span>
            <div>
              <h2 id="meeting-results-title" className="font-semibold">เวลาที่แนะนำ</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">คะแนนให้น้ำหนักกับคนที่ลำบากที่สุด เพื่อไม่ให้ค่าเฉลี่ยกลบสมาชิกคนใดคนหนึ่ง</p>
            </div>
          </div>

          {!result ? (
            <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border border-dashed bg-muted/10 p-6 text-center">
              <div className="max-w-sm"><Globe2 className="mx-auto size-9 text-primary/60" /><p className="mt-3 font-semibold">พร้อมเทียบเวลาทั่วโลก</p><p className="mt-2 text-sm leading-6 text-muted-foreground">กำหนดเวลางานอย่างน้อย 2 เขตเวลา แล้วกด “หาเวลาที่เหมาะสม”</p></div>
            </div>
          ) : (
            <div className="mt-5" data-testid="meeting-results">
              <Alert className={result.hasFullOverlap ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}>
                {result.hasFullOverlap ? <CheckCircle2 className="text-emerald-600" /> : <TriangleAlert className="text-amber-600" />}
                <AlertTitle>{result.hasFullOverlap ? "พบช่วงที่ทุกคนอยู่ในเวลางาน" : "ไม่พบช่วงเวลางานที่ซ้อนกันครบทุกคน"}</AlertTitle>
                <AlertDescription>{result.hasFullOverlap ? `ตรวจ ${result.slotsEvaluated} ช่วงในวันของผู้จัด แล้วเลือก 3 ช่วงที่สมดุลที่สุด` : "ผลลัพธ์ด้านล่างคือทางเลือกที่กระทบน้อยที่สุด ควรคุยกับทีมก่อนยืนยัน"}</AlertDescription>
              </Alert>

              {result.dayLengthHours !== 24 || result.offsetChanges.length > 0 ? (
                <div className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-xs leading-5 text-sky-800 dark:text-sky-200">
                  วันของผู้จัดยาว {result.dayLengthHours} ชั่วโมง{result.offsetChanges.length ? ` และมีการเปลี่ยน DST/UTC offset สำหรับ ${result.offsetChanges.join(", ")}` : ""} ระบบคำนวณจากจุดเวลาจริงแล้ว
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {result.suggestions.map((suggestion, index) => {
                  const organizer = suggestion.participantSlots[0]!;
                  const selected = selectedSuggestion?.startMs === suggestion.startMs;
                  return (
                    <button
                      key={suggestion.startMs}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition-colors motion-reduce:transition-none ${selected ? "border-primary bg-primary/10 ring-2 ring-primary/15" : "bg-background/60 hover:border-primary/40 hover:bg-muted/20"}`}
                      onClick={() => setSelectedStartMs(suggestion.startMs)}
                      aria-pressed={selected}
                      data-testid={`meeting-suggestion-${index}`}
                    >
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-muted-foreground">ตัวเลือก {index + 1}</span><Badge variant="outline">{suggestion.score}/100</Badge></div>
                      <p className="mt-3 text-lg font-bold tabular-nums">{suggestionHeading(suggestion)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{organizer.participant.label}</p>
                      <p className="mt-3 text-xs font-medium">ในเวลางาน {suggestion.availableCount}/{participants.length} คน</p>
                    </button>
                  );
                })}
              </div>

              {selectedSuggestion ? (
                <div className="mt-5 overflow-hidden rounded-2xl border" data-testid="meeting-selected-detail">
                  <div className="border-b bg-muted/15 px-4 py-3 sm:px-5"><h3 className="font-semibold">{title.trim() || "ประชุมทีมต่างประเทศ"}</h3><p className="mt-1 text-xs text-muted-foreground">เวลาท้องถิ่นของแต่ละคน • เทียบจากเวลาเดียวกัน ไม่ใช่การคาดเดาจากผลต่างคงที่</p></div>
                  <div className="divide-y">
                    {selectedSuggestion.participantSlots.map((slot, index) => (
                      <div key={`${slot.participant.label}-${slot.participant.timeZone}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{slot.participant.label}</p>{index === 0 ? <Badge variant="secondary">ผู้จัด</Badge> : null}</div>
                          <p className="mt-1 break-all text-xs text-muted-foreground">{slot.participant.timeZone} • {slot.localStart.offsetLabel}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-mono text-base font-bold tabular-nums">{timeText(slot.localStart.hour, slot.localStart.minute)}–{timeText(slot.localEnd.hour, slot.localEnd.minute)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{localDateLabel(slot.localStart.dateKey)}</p>
                          <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASSES[slot.status]}`}>{STATUS_LABELS[slot.status]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border bg-muted/10 p-4 sm:p-5">
                <div className="flex items-start gap-3"><Link2 className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">แชร์และเพิ่มลงปฏิทิน</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">ลิงก์บันทึกชื่อ เขตเวลา และเวลางานไว้ใน URL จึงไม่ควรใส่ข้อมูลลับหรือข้อมูลส่วนบุคคลอ่อนไหว</p></div></div>
                <div className="mt-4"><ActionBar><Button type="button" onClick={() => void copyShareLink()} data-testid="meeting-copy-link"><Link2 />คัดลอกลิงก์</Button><Button type="button" variant="outline" onClick={() => void copySummary()}><Clipboard />คัดลอกสรุป</Button><Button type="button" variant="outline" onClick={downloadCalendar} data-testid="meeting-calendar"><CalendarPlus />ดาวน์โหลด .ics</Button></ActionBar></div>
              </div>
            </div>
          )}

          <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
            <ShieldCheck className="text-sky-600" />
            <AlertTitle>คำนวณใน Browser ด้วย IANA time zone</AlertTitle>
            <AlertDescription>รองรับ DST และ UTC offset แบบครึ่ง/หนึ่งในสี่ชั่วโมงโดยไม่ส่งรายชื่อหรือเวลางานไป API แต่กฎเขตเวลาขึ้นกับข้อมูลของ Browser และไฟล์ .ics ควรตรวจสอบในแอปปฏิทินอีกครั้งก่อนส่งจริง</AlertDescription>
          </Alert>
        </section>
      </div>
    </WorkspaceFrame>
  );
}
