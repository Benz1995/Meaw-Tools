"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BellRing,
  ChevronRight,
  Expand,
  FastForward,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Volume2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, copyText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_INTERVAL_SETTINGS,
  INTERVAL_PRESETS,
  INTERVAL_TIMER_MAX_SAVED_PROGRAMS,
  INTERVAL_TIMER_STORAGE_KEY,
  advanceIntervalRuntime,
  buildIntervalPlan,
  buildIntervalShareUrl,
  createIntervalRuntime,
  formatIntervalTime,
  intervalPlanDurationSeconds,
  normalizeIntervalSettings,
  parseIntervalShareParams,
  parseIntervalTimerStore,
  pauseIntervalRuntime,
  serializeIntervalTimerStore,
  skipIntervalPhase,
  startIntervalRuntime,
  type IntervalPhase,
  type IntervalPhaseKind,
  type IntervalRuntime,
  type IntervalSettings,
  type SavedIntervalProgram,
} from "@/lib/tools/interval-timer";

const PHASE_COPY: Record<IntervalPhaseKind, { label: string; short: string; className: string; dot: string }> = {
  prepare: { label: "เตรียมตัว", short: "เตรียม", className: "from-amber-400/25 via-orange-300/10 to-transparent", dot: "bg-amber-500" },
  work: { label: "ลุย!", short: "ทำ", className: "from-rose-500/25 via-pink-400/10 to-transparent", dot: "bg-rose-500" },
  rest: { label: "พัก", short: "พัก", className: "from-emerald-400/25 via-teal-300/10 to-transparent", dot: "bg-emerald-500" },
  "cycle-rest": { label: "พักระหว่างเซต", short: "พักเซต", className: "from-sky-400/25 via-cyan-300/10 to-transparent", dot: "bg-sky-500" },
  cooldown: { label: "คูลดาวน์", short: "คูลดาวน์", className: "from-violet-400/25 via-fuchsia-300/10 to-transparent", dot: "bg-violet-500" },
};

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName));
}

function playIntervalCue(context: AudioContext | null, cue: "countdown" | "phase" | "finish") {
  if (!context || context.state !== "running") return;
  const frequencies = cue === "finish" ? [523.25, 659.25, 783.99] : cue === "phase" ? [659.25, 880] : [440];
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(cue === "countdown" ? 0.1 : 0.16, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (cue === "finish" ? 0.85 : 0.35));
  gain.connect(context.destination);
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = cue === "countdown" ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.14);
    oscillator.stop(context.currentTime + (cue === "finish" ? 0.85 : 0.35));
  });
}

function phasePosition(phase: IntervalPhase | undefined, settings: IntervalSettings): string {
  if (!phase) return "ครบทุกช่วงแล้ว";
  if (phase.kind === "work" || phase.kind === "rest") return `รอบ ${phase.round}/${settings.rounds} • เซต ${phase.cycle}/${settings.cycles}`;
  if (phase.kind === "cycle-rest") return `จบเซต ${phase.cycle}/${settings.cycles}`;
  return settings.cycles > 1 ? `${settings.cycles} เซต • ${settings.rounds} รอบต่อเซต` : `${settings.rounds} รอบ`;
}

function SettingField({ id, label, value, min, max, onChange, testId }: { id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void; testId?: string }) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} data-testid={testId} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

export function IntervalTimerTool() {
  const [settings, setSettings] = useState<IntervalSettings>(DEFAULT_INTERVAL_SETTINGS);
  const [savedPrograms, setSavedPrograms] = useState<SavedIntervalProgram[]>([]);
  const initialPlan = useMemo(() => buildIntervalPlan(DEFAULT_INTERVAL_SETTINGS), []);
  const [runtime, setRuntime] = useState<IntervalRuntime>(() => createIntervalRuntime(initialPlan));
  const [error, setError] = useState("");
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const hydratedRef = useRef(false);
  const previousPhaseRef = useRef({ index: 0, status: runtime.status });
  const countdownCueRef = useRef("");
  const baseTitleRef = useRef("");

  const phases = useMemo(() => buildIntervalPlan(settings), [settings]);
  const totalSeconds = useMemo(() => intervalPlanDurationSeconds(phases), [phases]);
  const elapsedBeforePhaseMs = useMemo(() => {
    const offsets = [0];
    for (const phase of phases) offsets.push(offsets[offsets.length - 1]! + phase.durationSeconds * 1_000);
    return offsets;
  }, [phases]);
  const timelineSegments = useMemo(() => {
    const groupSize = Math.max(1, Math.ceil(phases.length / 120));
    const segments: Array<{ start: number; end: number; kind: IntervalPhaseKind; seconds: number }> = [];
    for (let start = 0; start < phases.length; start += groupSize) {
      const group = phases.slice(start, start + groupSize);
      segments.push({ start, end: start + group.length - 1, kind: group[0]!.kind, seconds: intervalPlanDurationSeconds(group) });
    }
    return segments;
  }, [phases]);
  const currentPhase = phases[runtime.phaseIndex];
  const nextPhase = phases[runtime.phaseIndex + 1];
  const currentCopy = currentPhase ? PHASE_COPY[currentPhase.kind] : null;
  const locked = runtime.status === "running" || runtime.status === "paused";
  const currentDurationMs = (currentPhase?.durationSeconds ?? 0) * 1_000;
  const phaseProgress = currentDurationMs > 0 ? Math.max(0, Math.min(100, ((currentDurationMs - runtime.remainingMs) / currentDurationMs) * 100)) : 100;
  const elapsedBeforeCurrentMs = elapsedBeforePhaseMs[Math.min(runtime.phaseIndex, phases.length)] ?? 0;
  const elapsedCurrentMs = currentDurationMs > 0 ? Math.max(0, currentDurationMs - runtime.remainingMs) : 0;
  const totalProgress = totalSeconds > 0 ? Math.max(0, Math.min(100, ((elapsedBeforeCurrentMs + elapsedCurrentMs) / (totalSeconds * 1_000)) * 100)) : 0;

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!settings.keepAwake || !navigator.wakeLock || document.visibilityState !== "visible") return;
    try {
      releaseWakeLock();
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      setError("Browser ไม่อนุญาตให้ป้องกันหน้าจอดับ แต่ Timer ยังเดินตามปกติ");
    }
  }, [releaseWakeLock, settings.keepAwake]);

  const armAudio = useCallback(async (force = false) => {
    if (!settings.soundEnabled && !force) return null;
    try {
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      await context.resume();
      setError("");
      return context;
    } catch {
      setError("Browser นี้ไม่อนุญาตเสียง โปรดตรวจโหมดปิดเสียงและสิทธิ์ของเว็บไซต์");
      return null;
    }
  }, [settings.soundEnabled]);

  const applySettings = useCallback((input: IntervalSettings) => {
    const next = normalizeIntervalSettings(input);
    setSettings(next);
    setRuntime(createIntervalRuntime(buildIntervalPlan(next)));
    setError("");
    countdownCueRef.current = "";
    releaseWakeLock();
  }, [releaseWakeLock]);

  const updateSettings = (patch: Partial<IntervalSettings>) => applySettings({ ...settings, ...patch });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = parseIntervalTimerStore(window.localStorage.getItem(INTERVAL_TIMER_STORAGE_KEY));
      const shared = parseIntervalShareParams(window.location.search);
      const nextSettings = shared ?? stored.settings;
      setSettings(nextSettings);
      setSavedPrograms(stored.savedPrograms);
      setRuntime(createIntervalRuntime(buildIntervalPlan(nextSettings)));
      hydratedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(INTERVAL_TIMER_STORAGE_KEY, serializeIntervalTimerStore({ settings, savedPrograms }));
    } catch {
      toast.error("บันทึกโปรแกรมใน Browser ไม่สำเร็จ พื้นที่จัดเก็บอาจเต็มหรือถูกปิดไว้");
    }
  }, [savedPrograms, settings]);

  useEffect(() => {
    if (runtime.status !== "running") return;
    const update = () => {
      const current = Date.now();
      setRuntime((previous) => advanceIntervalRuntime(previous, phases, current));
    };
    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 100);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [phases, runtime.status]);

  useEffect(() => {
    const previous = previousPhaseRef.current;
    if (settings.soundEnabled && runtime.status === "finished" && previous.status !== "finished") {
      playIntervalCue(audioContextRef.current, "finish");
      toast.success("ครบทุกช่วงแล้ว เก่งมาก! 🎉");
      releaseWakeLock();
    } else if (settings.soundEnabled && runtime.status === "running" && previous.status === "running" && runtime.phaseIndex !== previous.index) {
      playIntervalCue(audioContextRef.current, "phase");
    }
    previousPhaseRef.current = { index: runtime.phaseIndex, status: runtime.status };
  }, [releaseWakeLock, runtime.phaseIndex, runtime.status, settings.soundEnabled]);

  useEffect(() => {
    if (runtime.status !== "running" || !settings.soundEnabled) return;
    const seconds = Math.ceil(runtime.remainingMs / 1_000);
    const key = `${runtime.phaseIndex}-${seconds}`;
    if (seconds >= 1 && seconds <= 3 && countdownCueRef.current !== key) {
      countdownCueRef.current = key;
      playIntervalCue(audioContextRef.current, "countdown");
    }
  }, [runtime.phaseIndex, runtime.remainingMs, runtime.status, settings.soundEnabled]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && runtime.status === "running") void requestWakeLock();
      else releaseWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [releaseWakeLock, requestWakeLock, runtime.status]);

  useEffect(() => {
    baseTitleRef.current = document.title;
    return () => { document.title = baseTitleRef.current; };
  }, []);

  useEffect(() => {
    if (!baseTitleRef.current) return;
    document.title = runtime.status === "running"
      ? `${formatIntervalTime(runtime.remainingMs)} ${currentCopy?.label ?? "Interval"} | Meaw Tools`
      : baseTitleRef.current;
  }, [currentCopy?.label, runtime.remainingMs, runtime.status]);

  useEffect(() => () => {
    releaseWakeLock();
    void audioContextRef.current?.close();
  }, [releaseWakeLock]);

  const startTimer = useCallback(() => {
    const current = Date.now();
    setRuntime((previous) => startIntervalRuntime(previous, phases, current));
    countdownCueRef.current = "";
    setError("");
    void armAudio().then((context) => { if (context) playIntervalCue(context, "phase"); });
    void requestWakeLock();
  }, [armAudio, phases, requestWakeLock]);

  const pauseTimer = useCallback(() => {
    const current = Date.now();
    setRuntime((previous) => pauseIntervalRuntime(previous, current));
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resetTimer = useCallback(() => {
    setRuntime(createIntervalRuntime(phases));
    countdownCueRef.current = "";
    releaseWakeLock();
  }, [phases, releaseWakeLock]);

  const skipPhase = useCallback(() => {
    const current = Date.now();
    setRuntime((previous) => skipIntervalPhase(previous, phases, current));
    countdownCueRef.current = "";
  }, [phases]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await timerPanelRef.current?.requestFullscreen();
    } catch {
      setError("Browser นี้ไม่อนุญาตโหมดเต็มจอ");
    }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (runtime.status === "running") pauseTimer(); else startTimer();
      } else if (event.key.toLocaleLowerCase("en-US") === "r") resetTimer();
      else if (event.key.toLocaleLowerCase("en-US") === "s") skipPhase();
      else if (event.key.toLocaleLowerCase("en-US") === "f") void toggleFullscreen();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [pauseTimer, resetTimer, runtime.status, skipPhase, startTimer, toggleFullscreen]);

  const saveProgram = () => {
    const existing = savedPrograms.find((program) => program.settings.name.toLocaleLowerCase() === settings.name.toLocaleLowerCase());
    if (!existing && savedPrograms.length >= INTERVAL_TIMER_MAX_SAVED_PROGRAMS) {
      setError(`บันทึกได้สูงสุด ${INTERVAL_TIMER_MAX_SAVED_PROGRAMS} โปรแกรม กรุณาลบรายการเดิมก่อน`);
      return;
    }
    const saved: SavedIntervalProgram = { id: existing?.id ?? crypto.randomUUID(), settings, savedAtMs: Date.now() };
    setSavedPrograms((current) => existing ? current.map((program) => program.id === existing.id ? saved : program) : [saved, ...current]);
    setError("");
    toast.success(existing ? "อัปเดตโปรแกรมแล้ว" : "บันทึกโปรแกรมแล้ว");
  };

  const deleteProgram = (id: string) => {
    setSavedPrograms((current) => current.filter((program) => program.id !== id));
    toast.info("ลบโปรแกรมที่บันทึกแล้ว");
  };

  const shareProgram = async () => {
    const url = buildIntervalShareUrl(settings, window.location.href);
    await copyText(url, "คัดลอกลิงก์โปรแกรมแล้ว");
  };

  const statusLabel = runtime.status === "running" ? "กำลังจับเวลา" : runtime.status === "paused" ? "พัก Timer" : runtime.status === "finished" ? "เสร็จแล้ว" : "พร้อมเริ่ม";

  return (
    <WorkspaceFrame>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,.8fr)]">
        <section className="min-w-0 space-y-5" aria-labelledby="interval-timer-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary"><Zap />Workout Timer</Badge>
                <Badge variant="outline" data-testid="interval-status">{statusLabel}</Badge>
              </div>
              <h2 id="interval-timer-heading" className="mt-3 font-heading text-xl font-semibold sm:text-2xl">{settings.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">จับ Work/Rest ซ้ำเป็นรอบด้วย Deadline จริง ไม่สะสมความคลาดเคลื่อนจาก Timer tick</p>
            </div>
            <Button type="button" variant="outline" className="h-10" onClick={() => void toggleFullscreen()} data-testid="interval-fullscreen"><Expand />เต็มจอ <kbd className="hidden rounded border bg-muted px-1 text-[10px] sm:inline">F</kbd></Button>
          </div>

          <div
            ref={timerPanelRef}
            data-testid="interval-timer-panel"
            className={`relative isolate overflow-hidden rounded-[1.75rem] border bg-card px-4 py-8 shadow-sm sm:px-8 sm:py-10 [&:fullscreen]:grid [&:fullscreen]:min-h-screen [&:fullscreen]:place-items-center [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-6 ${currentCopy?.className ?? "from-primary/20 via-primary/5 to-transparent"}`}
          >
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-90" />
            <div className="mx-auto max-w-2xl text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                <span className={`size-2.5 rounded-full ${currentCopy?.dot ?? "bg-primary"}`} />
                <span aria-live="polite" data-testid="interval-phase">{runtime.status === "finished" ? "เสร็จแล้ว" : currentCopy?.label ?? "พร้อมเริ่ม"}</span>
              </div>
              <p className="mt-5 font-mono text-6xl font-black leading-none tracking-tight tabular-nums sm:text-8xl" role="timer" aria-label={`เหลือ ${formatIntervalTime(runtime.remainingMs)}`} data-testid="interval-display">{formatIntervalTime(runtime.remainingMs)}</p>
              <p className="mt-4 text-sm font-medium text-muted-foreground" data-testid="interval-position">{phasePosition(currentPhase, settings)}</p>

              <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-foreground/10" aria-label={`ความคืบหน้าช่วงปัจจุบัน ${Math.round(phaseProgress)} เปอร์เซ็นต์`}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${phaseProgress}%` }} data-testid="interval-phase-progress" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>รวม {Math.round(totalProgress)}%</span>
                <span>{nextPhase ? <>ถัดไป <ChevronRight className="inline size-3" /> {PHASE_COPY[nextPhase.kind].short} {formatIntervalTime(nextPhase.durationSeconds * 1_000)}</> : "ช่วงสุดท้าย"}</span>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {runtime.status === "running" ? (
                  <Button type="button" className="h-12 min-w-36 rounded-xl text-base" onClick={pauseTimer} data-testid="interval-pause"><Pause />พัก <kbd className="rounded border border-white/30 px-1 text-[10px]">Space</kbd></Button>
                ) : (
                  <Button type="button" className="h-12 min-w-36 rounded-xl text-base" onClick={startTimer} data-testid="interval-start"><Play />{runtime.status === "paused" ? "ทำต่อ" : runtime.status === "finished" ? "เริ่มใหม่" : "เริ่ม"} <kbd className="rounded border border-white/30 px-1 text-[10px]">Space</kbd></Button>
                )}
                <Button type="button" variant="outline" className="h-12 rounded-xl" disabled={runtime.status === "finished"} onClick={skipPhase} data-testid="interval-skip"><FastForward />ข้าม <span className="sr-only">คีย์ลัด S</span></Button>
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={resetTimer} data-testid="interval-reset"><RotateCcw />รีเซ็ต <span className="sr-only">คีย์ลัด R</span></Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4" data-testid="interval-timeline">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading font-semibold">ลำดับโปรแกรม</h3>
              <span className="text-xs text-muted-foreground">{phases.length} ช่วง • รวม {formatIntervalTime(totalSeconds * 1_000)}</span>
            </div>
            <div className="mt-3 flex gap-1 overflow-hidden rounded-full" aria-label="ภาพรวมลำดับโปรแกรม">
              {timelineSegments.map((segment) => (
                <span key={`${segment.kind}-${segment.start}`} className={`h-2 min-w-1 flex-1 ${PHASE_COPY[segment.kind].dot} ${segment.end < runtime.phaseIndex ? "opacity-30" : runtime.phaseIndex >= segment.start && runtime.phaseIndex <= segment.end ? "ring-2 ring-foreground/30 ring-offset-1" : "opacity-70"}`} title={`${PHASE_COPY[segment.kind].label} ${segment.seconds} วินาที`} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {(["prepare", "work", "rest", "cycle-rest", "cooldown"] as IntervalPhaseKind[]).filter((kind) => phases.some((phase) => phase.kind === kind)).map((kind) => <span key={kind} className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${PHASE_COPY[kind].dot}`} />{PHASE_COPY[kind].label}</span>)}
            </div>
          </div>

          <Alert className="border-sky-500/30 bg-sky-500/5">
            <ShieldCheck className="text-sky-600" />
            <AlertTitle>เวลาและโปรแกรมอยู่ใน Browser เครื่องนี้</AlertTitle>
            <AlertDescription>หน้าต้องเปิดอยู่เพื่อให้เสียงทำงาน โปรแกรมที่บันทึกไม่ซิงก์ข้ามอุปกรณ์และอาจหายเมื่อล้าง Site data ส่วนลิงก์แชร์ใส่ค่าการจับเวลาไว้ใน URL จึงไม่ควรใช้ชื่อที่เป็นข้อมูลลับ</AlertDescription>
          </Alert>
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <Activity className="text-amber-600" />
            <AlertTitle>ปรับความหนักให้เหมาะกับร่างกาย</AlertTitle>
            <AlertDescription>Preset เป็นเพียงตัวตั้งเวลา ไม่ใช่คำแนะนำทางการแพทย์ หยุดทันทีเมื่อเจ็บ เวียนศีรษะ หรือผิดปกติ และปรึกษาผู้เชี่ยวชาญเมื่อมีข้อจำกัดด้านสุขภาพ</AlertDescription>
          </Alert>
        </section>

        <aside className="min-w-0 space-y-5" aria-label="ตั้งค่า Interval Timer">
          <section className="rounded-2xl border bg-card/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="font-heading font-semibold">โปรแกรมสำเร็จรูป</h3><p className="mt-1 text-xs text-muted-foreground">เลือกแล้วเริ่มได้ทันที หรือปรับเองด้านล่าง</p></div>
              <Badge variant="outline">5 แบบ</Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {INTERVAL_PRESETS.map((preset) => (
                <Button key={preset.id} type="button" variant="outline" disabled={locked} className="h-auto min-h-16 justify-start whitespace-normal px-3 py-2.5 text-left" onClick={() => applySettings(preset.settings)} data-testid={`interval-preset-${preset.id}`}>
                  <span><span className="block font-semibold">{preset.label}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{preset.description}</span></span>
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card/60 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="font-heading font-semibold">กำหนดโปรแกรม</h3><p className="mt-1 text-xs text-muted-foreground">หน่วยเวลาเป็นวินาที</p></div>
              {locked ? <Badge variant="secondary">รีเซ็ตเพื่อแก้ไข</Badge> : null}
            </div>
            <fieldset disabled={locked} className="mt-4 disabled:opacity-60">
              <div className="space-y-2.5">
                <Label htmlFor="interval-program-name">ชื่อโปรแกรม</Label>
                <Input id="interval-program-name" maxLength={60} value={settings.name} onChange={(event) => updateSettings({ name: event.target.value })} data-testid="interval-program-name" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                <SettingField id="interval-prepare" label="เตรียมตัว" value={settings.prepareSeconds} min={0} max={600} onChange={(value) => updateSettings({ prepareSeconds: value })} testId="interval-prepare" />
                <SettingField id="interval-work" label="ทำ / Work" value={settings.workSeconds} min={1} max={3600} onChange={(value) => updateSettings({ workSeconds: value })} testId="interval-work" />
                <SettingField id="interval-rest" label="พัก / Rest" value={settings.restSeconds} min={0} max={3600} onChange={(value) => updateSettings({ restSeconds: value })} testId="interval-rest" />
                <SettingField id="interval-rounds" label="จำนวนรอบ" value={settings.rounds} min={1} max={99} onChange={(value) => updateSettings({ rounds: value })} testId="interval-rounds" />
                <SettingField id="interval-cycles" label="จำนวนเซต" value={settings.cycles} min={1} max={20} onChange={(value) => updateSettings({ cycles: value })} testId="interval-cycles" />
                <SettingField id="interval-cycle-rest" label="พักระหว่างเซต" value={settings.cycleRestSeconds} min={0} max={3600} onChange={(value) => updateSettings({ cycleRestSeconds: value })} testId="interval-cycle-rest" />
                <div className="col-span-2"><SettingField id="interval-cooldown" label="คูลดาวน์" value={settings.cooldownSeconds} min={0} max={1800} onChange={(value) => updateSettings({ cooldownSeconds: value })} testId="interval-cooldown" /></div>
              </div>
            </fieldset>

            <div className="mt-5 space-y-3 border-t pt-4">
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2"><Volume2 className="size-4 text-primary" /><span><span className="block font-medium">เสียงนับถอยหลังและเปลี่ยนช่วง</span><span className="mt-1 block text-xs text-muted-foreground">ดังใน 3 วินาทีสุดท้าย</span></span></span>
                <Switch checked={settings.soundEnabled} disabled={locked} onCheckedChange={(checked) => { updateSettings({ soundEnabled: checked }); if (checked) void armAudio(true).then((context) => playIntervalCue(context, "phase")); }} aria-label="เสียง Interval Timer" data-testid="interval-sound" />
              </label>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm">
                <span className="inline-flex items-center gap-2"><Smartphone className="size-4 text-primary" /><span><span className="block font-medium">ไม่ให้หน้าจอดับ</span><span className="mt-1 block text-xs text-muted-foreground">เมื่อ Browser รองรับ Wake Lock</span></span></span>
                <Switch checked={settings.keepAwake} disabled={locked} onCheckedChange={(checked) => { updateSettings({ keepAwake: checked }); if (!checked) releaseWakeLock(); }} aria-label="ไม่ให้หน้าจอดับระหว่างจับเวลา" data-testid="interval-awake" />
              </label>
              <Button type="button" variant="outline" className="w-full" onClick={() => void armAudio(true).then((context) => { playIntervalCue(context, "finish"); if (context) toast.success("ทดสอบเสียงแล้ว"); })}><BellRing />ทดสอบเสียง</Button>
            </div>

            {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>ตรวจสอบอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

            <ActionBar>
              <Button type="button" variant="outline" className="mt-4 flex-1" disabled={locked} onClick={saveProgram} data-testid="interval-save"><Save />บันทึกโปรแกรม</Button>
              <Button type="button" variant="outline" className="mt-4 flex-1" onClick={() => void shareProgram()} data-testid="interval-share"><Link2 />คัดลอกลิงก์</Button>
            </ActionBar>
          </section>

          <section className="rounded-2xl border bg-card/60 p-4 sm:p-5" data-testid="interval-saved-programs">
            <div className="flex items-center justify-between gap-3"><h3 className="font-heading font-semibold">โปรแกรมที่บันทึก</h3><Badge variant="outline">{savedPrograms.length}/{INTERVAL_TIMER_MAX_SAVED_PROGRAMS}</Badge></div>
            {savedPrograms.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">ยังไม่มีโปรแกรมที่บันทึก ค่าปัจจุบันจะจำอัตโนมัติใน Browser นี้</div>
            ) : (
              <div className="mt-3 space-y-2">
                {savedPrograms.map((program) => (
                  <div key={program.id} className="flex items-center gap-2 rounded-xl border bg-background/50 p-2">
                    <button type="button" disabled={locked} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50" onClick={() => applySettings(program.settings)} data-testid={`interval-saved-${program.id}`}>
                      <span className="block truncate text-sm font-medium">{program.settings.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{program.settings.workSeconds}/{program.settings.restSeconds} • {program.settings.rounds} รอบ • {program.settings.cycles} เซต</span>
                    </button>
                    <Button type="button" variant="ghost" size="icon" disabled={locked} aria-label={`ลบ ${program.settings.name}`} onClick={() => deleteProgram(program.id)}><Trash2 /></Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">คีย์ลัด</p>
            <p className="mt-1.5">Space เริ่ม/พัก • S ข้ามช่วง • R รีเซ็ต • F เต็มจอ</p>
          </div>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}
