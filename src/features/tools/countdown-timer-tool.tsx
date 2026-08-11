"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  CalendarPlus,
  CheckCircle2,
  Clipboard,
  Expand,
  Hourglass,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Timer,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, ClearButton, ExampleButton, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildCountdownEventIcs,
  buildCountdownShareUrl,
  countdownFilename,
  durationToSeconds,
  getCountdownParts,
  parseCountdownShareParams,
  type CountdownMode,
  type CountdownTheme,
} from "@/lib/tools/countdown";

type DurationStatus = "idle" | "running" | "paused" | "finished";

const THEME_CLASSES: Record<CountdownTheme, string> = {
  mint: "border-emerald-200/80 bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,.6),transparent_44%),linear-gradient(135deg,#f0fdf9,#ecfeff)] text-slate-900 dark:border-emerald-300/20",
  sakura: "border-pink-200/80 bg-[radial-gradient(circle_at_top_right,rgba(251,207,232,.75),transparent_45%),linear-gradient(135deg,#fff7ed,#fdf2f8)] text-slate-900 dark:border-pink-300/20",
  night: "border-indigo-300/20 bg-[radial-gradient(circle_at_top,rgba(129,140,248,.28),transparent_48%),linear-gradient(145deg,#090e1d,#161b35)] text-slate-50",
};

function futureInputValue(daysAhead = 7): string {
  const date = new Date(Date.now() + daysAhead * 86_400_000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function localInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function splitDuration(totalSeconds: number): { hours: string; minutes: string; seconds: string } {
  return {
    hours: String(Math.floor(totalSeconds / 3_600)),
    minutes: String(Math.floor((totalSeconds % 3_600) / 60)),
    seconds: String(totalSeconds % 60),
  };
}

function NumberTile({ value, label, testId }: { value: number; label: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/55 px-3 py-4 text-center shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
      <p className="font-mono text-3xl font-bold tabular-nums sm:text-4xl" data-testid={testId}>{String(value).padStart(2, "0")}</p>
      <p className="mt-1 text-xs font-medium opacity-70">{label}</p>
    </div>
  );
}

function playCountdownBell(context: AudioContext | null) {
  if (!context || context.state !== "running") return;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7);
  gain.connect(context.destination);
  [659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.12);
    oscillator.stop(context.currentTime + 0.7);
  });
}

export function CountdownTimerTool() {
  const [mode, setMode] = useState<CountdownMode>("event");
  const [title, setTitle] = useState("วันสำคัญของฉัน");
  const [targetInput, setTargetInput] = useState(() => futureInputValue());
  const [completionMessage, setCompletionMessage] = useState("ถึงเวลาแล้ว! 🎉");
  const [theme, setTheme] = useState<CountdownTheme>("mint");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [durationStatus, setDurationStatus] = useState<DurationStatus>("idle");
  const [durationDeadline, setDurationDeadline] = useState<number | null>(null);
  const [durationRemainingMs, setDurationRemainingMs] = useState(300_000);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [soundReady, setSoundReady] = useState(false);
  const [error, setError] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const notifiedTargetRef = useRef<number | null>(null);

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "เวลาท้องถิ่น", []);
  const targetMs = useMemo(() => new Date(targetInput).getTime(), [targetInput]);
  const configuredDurationSeconds = useMemo(() => {
    try { return durationToSeconds(Number(hours), Number(minutes), Number(seconds)); }
    catch { return 0; }
  }, [hours, minutes, seconds]);
  const eventParts = getCountdownParts(Number.isFinite(targetMs) ? targetMs : 0, nowMs);
  const liveDurationMs = durationStatus === "running" && durationDeadline !== null
    ? Math.max(0, durationDeadline - nowMs)
    : durationStatus === "idle" ? configuredDurationSeconds * 1_000 : durationRemainingMs;
  const durationParts = getCountdownParts(liveDurationMs, 0);
  const parts = mode === "event" ? eventParts : durationParts;
  const isFinished = mode === "event" ? Number.isFinite(targetMs) && eventParts.finished : durationStatus === "finished";
  const durationProgress = configuredDurationSeconds > 0
    ? Math.max(0, Math.min(100, (liveDurationMs / (configuredDurationSeconds * 1_000)) * 100))
    : 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const shared = parseCountdownShareParams(window.location.search);
      if (!shared) return;
      setMode(shared.mode);
      if (shared.title) setTitle(shared.title);
      setTheme(shared.theme);
      if (shared.completionMessage) setCompletionMessage(shared.completionMessage);
      if (shared.mode === "event" && shared.targetMs) setTargetInput(localInputValue(shared.targetMs));
      if (shared.mode === "duration" && shared.durationSeconds) {
        const values = splitDuration(shared.durationSeconds);
        setHours(values.hours); setMinutes(values.minutes); setSeconds(values.seconds);
        setDurationRemainingMs(shared.durationSeconds * 1_000);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (mode !== "event" && durationStatus !== "running") return;
    const update = () => {
      const current = Date.now();
      setNowMs(current);
      if (durationStatus === "running" && durationDeadline !== null && current >= durationDeadline) {
        setDurationStatus("finished"); setDurationRemainingMs(0); setDurationDeadline(null);
        playCountdownBell(audioContextRef.current);
      }
      if (mode === "event" && Number.isFinite(targetMs) && current >= targetMs && notifiedTargetRef.current !== targetMs) {
        notifiedTargetRef.current = targetMs;
        playCountdownBell(audioContextRef.current);
      }
    };
    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearTimeout(timeout); window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [mode, durationStatus, durationDeadline, targetMs]);

  useEffect(() => () => { void audioContextRef.current?.close(); }, []);

  const armSound = async () => {
    try {
      const AudioContextConstructor = window.AudioContext;
      const context = audioContextRef.current ?? new AudioContextConstructor();
      audioContextRef.current = context;
      await context.resume();
      setSoundReady(context.state === "running");
      if (context.state === "running") { playCountdownBell(context); toast.success("เปิดเสียงแจ้งเตือนแล้ว"); }
    } catch { setError("Browser นี้ไม่อนุญาตให้เปิดเสียงแจ้งเตือน"); }
  };

  const resetDurationFromInputs = () => {
    const total = durationToSeconds(Number(hours), Number(minutes), Number(seconds));
    setDurationStatus("idle"); setDurationDeadline(null); setDurationRemainingMs(total * 1_000); setNowMs(Date.now()); setError("");
  };

  const startDuration = () => {
    try {
      const configuredMs = durationToSeconds(Number(hours), Number(minutes), Number(seconds)) * 1_000;
      const remaining = durationStatus === "paused" ? durationRemainingMs : configuredMs;
      setDurationRemainingMs(remaining); setDurationDeadline(Date.now() + remaining); setDurationStatus("running"); setNowMs(Date.now()); setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "เริ่มนับถอยหลังไม่สำเร็จ"); }
  };

  const pauseDuration = () => {
    if (durationDeadline === null) return;
    setDurationRemainingMs(Math.max(0, durationDeadline - Date.now())); setDurationDeadline(null); setDurationStatus("paused"); setNowMs(Date.now());
  };

  const shareState = () => {
    if (mode === "event" && (!Number.isFinite(targetMs) || targetMs <= 0)) throw new Error("กรุณาเลือกวันและเวลาเป้าหมาย");
    if (mode === "duration" && configuredDurationSeconds < 1) throw new Error("กรุณากำหนดระยะเวลามากกว่า 0 วินาที");
    return buildCountdownShareUrl(window.location.origin, {
      mode, title, theme, completionMessage,
      targetMs: mode === "event" ? targetMs : undefined,
      durationSeconds: mode === "duration" ? configuredDurationSeconds : undefined,
    });
  };

  const copyShareLink = async () => {
    try { await copyText(shareState(), "คัดลอกลิงก์ Countdown แล้ว"); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "สร้างลิงก์ไม่สำเร็จ"); }
  };

  const shareNative = async () => {
    try {
      const url = shareState();
      if (!navigator.share) { await copyText(url, "Browser ไม่รองรับ Share จึงคัดลอกลิงก์ให้แล้ว"); return; }
      await navigator.share({ title: title || "Countdown Timer", text: completionMessage, url });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "แชร์ Countdown ไม่สำเร็จ");
    }
  };

  const openFullscreen = async () => {
    try {
      const preview = previewRef.current;
      if (!preview?.requestFullscreen) throw new Error("Browser นี้ไม่รองรับโหมดเต็มจอ");
      await preview.requestFullscreen();
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "เปิดโหมดเต็มจอไม่สำเร็จ"); }
  };

  const downloadCalendar = () => {
    try {
      if (!Number.isFinite(targetMs) || targetMs <= 0) throw new Error("กรุณาเลือกวันและเวลาเป้าหมาย");
      downloadText(buildCountdownEventIcs({ title, targetMs, completionMessage }), countdownFilename(title), "text/calendar;charset=utf-8");
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "สร้างไฟล์ปฏิทินไม่สำเร็จ"); }
  };

  const loadExample = () => {
    setMode("event"); setTitle("วันเปิดตัวโปรเจกต์ Meaw"); setTargetInput(futureInputValue(14)); setCompletionMessage("เปิดตัวแล้ว—ขอบคุณที่รอไปด้วยกัน! 🐾"); setTheme("sakura"); setError(""); notifiedTargetRef.current = null;
  };

  const clear = () => {
    setTitle(""); setTargetInput(futureInputValue()); setCompletionMessage(""); setTheme("mint"); setHours("0"); setMinutes("5"); setSeconds("0"); setDurationStatus("idle"); setDurationDeadline(null); setDurationRemainingMs(300_000); setError(""); notifiedTargetRef.current = null;
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section aria-labelledby="countdown-settings-title">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Timer className="size-5" /></span>
            <div><h2 id="countdown-settings-title" className="font-semibold">ตั้งค่า Countdown</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">นับจากเวลาจริงของอุปกรณ์ จึงกลับมาตรงเวลาแม้สลับแท็บหรือพักหน้าจอ</p></div>
          </div>

          <Tabs value={mode} onValueChange={(value) => { setMode(value as CountdownMode); setError(""); }} className="mt-5">
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="event" className="min-h-9" data-testid="countdown-event-tab"><CalendarPlus />ถึงวันและเวลา</TabsTrigger>
              <TabsTrigger value="duration" className="min-h-9" data-testid="countdown-duration-tab"><Hourglass />ตั้งระยะเวลา</TabsTrigger>
            </TabsList>
            <TabsContent value="event" className="mt-5">
              <Label htmlFor="countdown-target">วันและเวลาเป้าหมาย</Label>
              <Input id="countdown-target" type="datetime-local" value={targetInput} onChange={(event) => { setTargetInput(event.target.value); notifiedTargetRef.current = null; setError(""); }} data-testid="countdown-target" />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">ตีความด้วยเขตเวลาของอุปกรณ์: <span className="font-medium text-foreground">{timeZone}</span> ผู้รับลิงก์จะเห็นเวลาเดียวกันในเขตเวลาของตน</p>
            </TabsContent>
            <TabsContent value="duration" className="mt-5">
              <div className="grid grid-cols-3 gap-3">
                <div><Label htmlFor="countdown-hours">ชั่วโมง</Label><Input id="countdown-hours" type="number" min="0" max="999" inputMode="numeric" value={hours} onChange={(event) => { setHours(event.target.value); setDurationStatus("idle"); setError(""); }} /></div>
                <div><Label htmlFor="countdown-minutes">นาที</Label><Input id="countdown-minutes" type="number" min="0" max="59" inputMode="numeric" value={minutes} onChange={(event) => { setMinutes(event.target.value); setDurationStatus("idle"); setError(""); }} /></div>
                <div><Label htmlFor="countdown-seconds-input">วินาที</Label><Input id="countdown-seconds-input" type="number" min="0" max="59" inputMode="numeric" value={seconds} onChange={(event) => { setSeconds(event.target.value); setDurationStatus("idle"); setError(""); }} /></div>
              </div>
              <ActionBar>
                {durationStatus === "running"
                  ? <Button type="button" className="mt-4" onClick={pauseDuration} data-testid="countdown-pause"><Pause />พักเวลา</Button>
                  : <Button type="button" className="mt-4" onClick={startDuration} data-testid="countdown-start"><Play />{durationStatus === "paused" ? "นับต่อ" : "เริ่มนับถอยหลัง"}</Button>}
                <Button type="button" variant="outline" className="mt-4" onClick={() => { try { resetDurationFromInputs(); } catch (caught) { setError(caught instanceof Error ? caught.message : "รีเซ็ตไม่สำเร็จ"); } }}><RotateCcw />รีเซ็ต</Button>
              </ActionBar>
            </TabsContent>
          </Tabs>

          <div className="mt-5">
            <Label htmlFor="countdown-title">ชื่อกิจกรรมหรือช่วงเวลา</Label>
            <Input id="countdown-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น วันเปิดตัวสินค้า หรือ พักเบรก" data-testid="countdown-title" />
          </div>
          <div className="mt-5">
            <Label htmlFor="countdown-completion">ข้อความเมื่อถึงเวลา</Label>
            <Input id="countdown-completion" value={completionMessage} maxLength={160} onChange={(event) => setCompletionMessage(event.target.value)} placeholder="ถึงเวลาแล้ว!" />
          </div>
          <div className="mt-5">
            <Label htmlFor="countdown-theme">ธีมหน้าปัด</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as CountdownTheme)}>
              <SelectTrigger id="countdown-theme" className="w-full" data-testid="countdown-theme"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="mint">Mint Café</SelectItem><SelectItem value="sakura">Sakura</SelectItem><SelectItem value="night">Night Sky</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border bg-muted/15 p-4">
            <div><Label htmlFor="countdown-sound">เสียงแจ้งเตือน</Label><p className="mt-1.5 text-xs text-muted-foreground">ต้องกดอนุญาตเสียงหนึ่งครั้งตามกฎของ Browser</p></div>
            <div className="flex items-center gap-2"><Switch id="countdown-sound" checked={soundReady} onCheckedChange={(checked) => { if (checked) void armSound(); else { setSoundReady(false); void audioContextRef.current?.suspend(); } }} /><Volume2 className="size-4 text-muted-foreground" /></div>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-6 border-t pt-5"><ActionBar><ExampleButton onExample={loadExample} /><ClearButton onClear={clear} /></ActionBar></div>
        </section>

        <section className="xl:sticky xl:top-24" aria-labelledby="countdown-preview-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 id="countdown-preview-title" className="font-semibold">หน้าปัดนับถอยหลัง</h2><p className="mt-1 text-xs text-muted-foreground">เปิดเต็มจอได้ เหมาะกับห้องเรียน งานอีเวนต์ หรือจอ Presentation</p></div><Badge variant="outline">{mode === "event" ? timeZone : "Duration timer"}</Badge></div>
          <div ref={previewRef} className={`rounded-3xl border p-4 shadow-sm sm:p-6 [&:fullscreen]:grid [&:fullscreen]:place-items-center [&:fullscreen]:rounded-none [&:fullscreen]:p-6 ${THEME_CLASSES[theme]}`} data-testid="countdown-preview">
            <div className="w-full">
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">Meaw Countdown</p><h3 className="mt-2 break-words text-xl font-bold sm:text-2xl">{title.trim() || "Countdown Timer"}</h3></div><Sparkles className="size-6 shrink-0 opacity-60 motion-safe:animate-pulse" /></div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" role="timer" aria-live="off" aria-label={`${parts.days} วัน ${parts.hours} ชั่วโมง ${parts.minutes} นาที ${parts.seconds} วินาที`}>
                <NumberTile value={parts.days} label="วัน" testId="countdown-days" />
                <NumberTile value={parts.hours} label="ชั่วโมง" testId="countdown-hours-value" />
                <NumberTile value={parts.minutes} label="นาที" testId="countdown-minutes-value" />
                <NumberTile value={parts.seconds} label="วินาที" testId="countdown-seconds-value" />
              </div>
              {mode === "duration" ? <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"><div className="h-full rounded-full bg-current opacity-70 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${durationProgress}%` }} /></div> : null}
              <div className="mt-5 min-h-11 rounded-xl border border-white/50 bg-white/40 px-4 py-3 text-center text-sm font-medium backdrop-blur-sm dark:border-white/10 dark:bg-white/5" aria-live="polite" data-testid="countdown-status">
                {isFinished ? <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4" />{completionMessage.trim() || "ถึงเวลาแล้ว!"}</span> : mode === "duration" && durationStatus === "paused" ? "พักเวลาอยู่—กดนับต่อเมื่อพร้อม" : "กำลังนับถอยหลังอย่างแม่นยำจากเวลาปัจจุบัน"}
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" className="border-black/10 bg-white/60 text-slate-900 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" onClick={() => void openFullscreen()}><Expand />เต็มจอ</Button>
                <Button type="button" variant="outline" className="border-black/10 bg-white/60 text-slate-900 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" onClick={() => void copyShareLink()} data-testid="countdown-copy-link"><Link2 />คัดลอกลิงก์</Button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border bg-muted/10 p-4 sm:p-5">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Share2 className="size-4" /></span><div><h3 className="font-semibold">แชร์และเพิ่มลงปฏิทิน</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">ลิงก์มีค่าที่เห็นใน URL และอาจอยู่ในประวัติ Browser หรือ log จึงไม่ควรใส่ข้อมูลลับ</p></div></div>
            <div className="mt-4"><ActionBar><Button type="button" onClick={() => void shareNative()}><Share2 />แชร์</Button><Button type="button" variant="outline" onClick={() => void copyShareLink()}><Clipboard />คัดลอกลิงก์</Button>{mode === "event" ? <Button type="button" variant="outline" onClick={downloadCalendar} data-testid="countdown-calendar"><CalendarPlus />เพิ่มลงปฏิทิน (.ics)</Button> : null}</ActionBar></div>
          </div>

          <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
            <BellRing className="text-sky-600" /><AlertTitle>Timer ทำงานใน Browser</AlertTitle><AlertDescription>เสียงจะแจ้งเตือนได้เมื่อหน้านี้ยังเปิดอยู่และคุณเปิดเสียงไว้ ระบบไม่ขอ Notification permission และไม่ทำงานเป็น Alarm หลังปิด Browser ควรมีนาฬิกาสำรองสำหรับกำหนดเวลาสำคัญ</AlertDescription>
          </Alert>
        </section>
      </div>
    </WorkspaceFrame>
  );
}
