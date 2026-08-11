"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Coffee,
  Expand,
  FastForward,
  Focus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import { WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  POMODORO_MAX_TASK_LENGTH,
  POMODORO_MAX_TASKS,
  POMODORO_PRESETS,
  POMODORO_STORAGE_KEY,
  createEmptyPomodoroState,
  getPomodoroTransition,
  normalizePomodoroSettings,
  parsePomodoroStoredState,
  pomodoroClockParts,
  pomodoroDurationSeconds,
  pomodoroRemainingMs,
  pomodoroTaskProgress,
  serializePomodoroStoredState,
  updatePomodoroStats,
  type PomodoroMode,
  type PomodoroSettings,
  type PomodoroStatus,
  type PomodoroStoredState,
  type PomodoroTask,
} from "@/lib/tools/pomodoro";

const MODE_COPY: Record<PomodoroMode, { label: string; shortLabel: string; description: string; accent: string; ring: string }> = {
  focus: {
    label: "Focus",
    shortLabel: "โฟกัส",
    description: "เลือกหนึ่งงาน แล้วทำงานเดียวจนหมดรอบ",
    accent: "text-emerald-700 dark:text-emerald-300",
    ring: "#3c9b70",
  },
  "short-break": {
    label: "Short Break",
    shortLabel: "พักสั้น",
    description: "ลุก เดิน ดื่มน้ำ และพักสายตาจากหน้าจอ",
    accent: "text-rose-700 dark:text-rose-300",
    ring: "#df7695",
  },
  "long-break": {
    label: "Long Break",
    shortLabel: "พักยาว",
    description: "พักให้เต็มที่ก่อนเริ่มวงจรโฟกัสชุดใหม่",
    accent: "text-violet-700 dark:text-violet-300",
    ring: "#8b72cf",
  },
};

function loadInitialState(): PomodoroStoredState {
  if (typeof window === "undefined") return createEmptyPomodoroState();
  return parsePomodoroStoredState(window.localStorage.getItem(POMODORO_STORAGE_KEY));
}

function playPomodoroBell(context: AudioContext | null, mode: PomodoroMode) {
  if (!context || context.state !== "running") return;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.85);
  gain.connect(context.destination);
  const notes = mode === "focus" ? [659.25, 783.99] : [523.25, 659.25];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.14);
    oscillator.stop(context.currentTime + 0.82);
  });
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

export function PomodoroFocusTimerTool() {
  const [stored, setStored] = useState<PomodoroStoredState>(loadInitialState);
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [status, setStatus] = useState<PomodoroStatus>("idle");
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(() => pomodoroDurationSeconds("focus", loadInitialState().settings) * 1_000);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [cycleFocusCount, setCycleFocusCount] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskEstimate, setTaskEstimate] = useState(2);
  const [error, setError] = useState("");
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const completionGuardRef = useRef<number | null>(null);
  const baseTitleRef = useRef("");

  const settings = stored.settings;
  const tasks = stored.tasks;
  const stats = stored.stats;
  const configuredDurationMs = pomodoroDurationSeconds(mode, settings) * 1_000;
  const liveRemainingMs = status === "running"
    ? pomodoroRemainingMs(deadlineMs, remainingMs, nowMs)
    : remainingMs;
  const clock = pomodoroClockParts(liveRemainingMs);
  const elapsedPercent = Math.min(100, Math.max(0, 100 - (liveRemainingMs / Math.max(1, configuredDurationMs)) * 100));
  const activeTask = tasks.find((task) => task.id === activeTaskId && !task.done) ?? null;
  const modeCopy = MODE_COPY[mode];
  const dailyGoalPercent = Math.min(100, Math.round((stats.completedFocusSessions / settings.dailyGoal) * 100));

  useEffect(() => {
    window.localStorage.setItem(POMODORO_STORAGE_KEY, serializePomodoroStoredState(stored));
  }, [stored]);

  useEffect(() => {
    baseTitleRef.current = document.title;
    return () => { document.title = baseTitleRef.current; };
  }, []);

  useEffect(() => {
    if (!baseTitleRef.current) return;
    document.title = status === "running"
      ? `${clock.text} • ${modeCopy.label} | Meaw Tools`
      : baseTitleRef.current;
  }, [clock.text, modeCopy.label, status]);

  const releaseWakeLock = useCallback(() => {
    const current = wakeLockRef.current;
    wakeLockRef.current = null;
    if (current) void current.release().catch(() => undefined);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!settings.keepAwake || !navigator.wakeLock || document.visibilityState !== "visible") return;
    try {
      releaseWakeLock();
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      setError("Browser ไม่อนุญาตให้ป้องกันหน้าจอดับ แต่ Timer ยังทำงานตามปกติ");
    }
  }, [releaseWakeLock, settings.keepAwake]);

  const armAudio = useCallback(async (force = false) => {
    if (!settings.soundEnabled && !force) return null;
    try {
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      await context.resume();
      return context;
    } catch {
      setError("Browser ไม่อนุญาตเสียงแจ้งเตือน แต่ Timer ยังทำงานตามปกติ");
      return null;
    }
  }, [settings.soundEnabled]);

  const advanceSession = useCallback((completedNaturally: boolean, completedAt = Date.now()) => {
    const transition = getPomodoroTransition(mode, cycleFocusCount, settings, completedNaturally);
    if (transition.completedFocus) {
      setStored((current) => ({
        ...current,
        stats: updatePomodoroStats(current.stats, current.settings.focusMinutes, completedAt),
        tasks: current.tasks.map((task) => task.id === activeTaskId
          ? { ...task, completedSessions: task.completedSessions + 1 }
          : task),
      }));
    }
    const nextDurationMs = pomodoroDurationSeconds(transition.nextMode, settings) * 1_000;
    const autoStart = completedNaturally && (transition.nextMode === "focus" ? settings.autoStartFocus : settings.autoStartBreaks);
    setMode(transition.nextMode);
    setCycleFocusCount(transition.nextCycleFocusCount);
    setRemainingMs(nextDurationMs);
    setNowMs(completedAt);
    completionGuardRef.current = null;
    releaseWakeLock();
    if (autoStart) {
      setDeadlineMs(completedAt + nextDurationMs);
      setStatus("running");
      void requestWakeLock();
    } else {
      setDeadlineMs(null);
      setStatus("idle");
    }
    if (completedNaturally && settings.soundEnabled) playPomodoroBell(audioContextRef.current, transition.nextMode);
  }, [activeTaskId, cycleFocusCount, mode, releaseWakeLock, requestWakeLock, settings]);

  useEffect(() => {
    if (status !== "running" || deadlineMs === null) return;
    const update = () => {
      const current = Date.now();
      setNowMs(current);
      if (current >= deadlineMs && completionGuardRef.current !== deadlineMs) {
        completionGuardRef.current = deadlineMs;
        advanceSession(true, current);
      }
    };
    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    return () => { window.clearTimeout(timeout); window.clearInterval(interval); };
  }, [advanceSession, deadlineMs, status]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && status === "running") void requestWakeLock();
      else releaseWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [releaseWakeLock, requestWakeLock, status]);

  useEffect(() => () => {
    releaseWakeLock();
    void audioContextRef.current?.close();
  }, [releaseWakeLock]);

  const startTimer = useCallback(() => {
    const duration = status === "paused" ? remainingMs : configuredDurationMs;
    if (duration <= 0) return;
    const current = Date.now();
    completionGuardRef.current = null;
    setRemainingMs(duration);
    setDeadlineMs(current + duration);
    setNowMs(current);
    setStatus("running");
    setError("");
    void armAudio();
    void requestWakeLock();
  }, [armAudio, configuredDurationMs, remainingMs, requestWakeLock, status]);

  const pauseTimer = useCallback(() => {
    if (deadlineMs === null) return;
    setRemainingMs(pomodoroRemainingMs(deadlineMs, remainingMs));
    setDeadlineMs(null);
    setStatus("paused");
    releaseWakeLock();
  }, [deadlineMs, releaseWakeLock, remainingMs]);

  const resetTimer = useCallback(() => {
    setStatus("idle");
    setDeadlineMs(null);
    setRemainingMs(configuredDurationMs);
    completionGuardRef.current = null;
    releaseWakeLock();
  }, [configuredDurationMs, releaseWakeLock]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (status === "running") pauseTimer(); else startTimer();
      } else if (event.key.toLocaleLowerCase("en-US") === "r") {
        resetTimer();
      } else if (event.key.toLocaleLowerCase("en-US") === "s") {
        advanceSession(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [advanceSession, pauseTimer, resetTimer, startTimer, status]);

  const selectMode = (nextMode: PomodoroMode) => {
    releaseWakeLock();
    setMode(nextMode);
    setStatus("idle");
    setDeadlineMs(null);
    setRemainingMs(pomodoroDurationSeconds(nextMode, settings) * 1_000);
    completionGuardRef.current = null;
  };

  const updateSettings = (patch: Partial<PomodoroSettings>) => {
    const next = normalizePomodoroSettings({ ...settings, ...patch });
    setStored((current) => ({ ...current, settings: next }));
    if (status === "idle") setRemainingMs(pomodoroDurationSeconds(mode, next) * 1_000);
  };

  const applyPreset = (presetKey: keyof typeof POMODORO_PRESETS) => {
    const preset = POMODORO_PRESETS[presetKey];
    const next = normalizePomodoroSettings({ ...settings, ...preset });
    setStored((current) => ({ ...current, settings: next }));
    setMode("focus");
    setStatus("idle");
    setDeadlineMs(null);
    setRemainingMs(next.focusMinutes * 60_000);
    setCycleFocusCount(0);
    releaseWakeLock();
  };

  const addTask = () => {
    const cleanTitle = taskTitle.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, POMODORO_MAX_TASK_LENGTH);
    if (!cleanTitle) { setError("กรุณากรอกชื่องานก่อนเพิ่ม"); return; }
    if (tasks.length >= POMODORO_MAX_TASKS) { setError(`เพิ่มงานได้สูงสุด ${POMODORO_MAX_TASKS} รายการ`); return; }
    const task: PomodoroTask = { id: crypto.randomUUID(), title: cleanTitle, estimate: Math.min(12, Math.max(1, Math.round(taskEstimate))), completedSessions: 0, done: false };
    setStored((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setActiveTaskId(task.id);
    setTaskTitle("");
    setTaskEstimate(2);
    setError("");
  };

  const toggleTask = (taskId: string) => {
    setStored((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, done: !task.done } : task) }));
    if (activeTaskId === taskId) setActiveTaskId(null);
  };

  const deleteTask = (taskId: string) => {
    setStored((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId) }));
    if (activeTaskId === taskId) setActiveTaskId(null);
  };

  const openFullscreen = async () => {
    try {
      if (!timerPanelRef.current?.requestFullscreen) throw new Error("Browser นี้ไม่รองรับโหมดเต็มจอ");
      await timerPanelRef.current.requestFullscreen();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เปิดโหมดเต็มจอไม่สำเร็จ");
    }
  };

  const cycleDots = useMemo(() => Array.from({ length: settings.longBreakAfter }, (_, index) => index < cycleFocusCount), [cycleFocusCount, settings.longBreakAfter]);

  return (
    <WorkspaceFrame>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <section aria-labelledby="pomodoro-timer-title">
          <div ref={timerPanelRef} className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,.28),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(251,207,232,.22),transparent_40%)] p-4 shadow-sm sm:p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,.09),transparent_38%)] [&:fullscreen]:grid [&:fullscreen]:min-h-screen [&:fullscreen]:place-items-center [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-6">
            <div className="relative z-10 w-full">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Focus className="size-5" /></span>
                  <div><h2 id="pomodoro-timer-title" className="font-semibold">Pomodoro Focus Timer</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">โฟกัสหนึ่งงาน พักอย่างมีจังหวะ แล้วค่อยเริ่มรอบถัดไป</p></div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => void openFullscreen()}><Expand />เต็มจอ</Button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border bg-background/55 p-1.5 backdrop-blur-sm">
                {(Object.keys(MODE_COPY) as PomodoroMode[]).map((value) => (
                  <button key={value} type="button" onClick={() => selectMode(value)} aria-pressed={mode === value} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none sm:text-sm ${mode === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`} data-testid={`pomodoro-mode-${value}`}>
                    {MODE_COPY[value].shortLabel}
                  </button>
                ))}
              </div>

              <div className="mx-auto mt-7 grid max-w-md place-items-center text-center">
                <div className={`relative grid aspect-square w-[min(72vw,19rem)] place-items-center rounded-full p-3 ${modeCopy.accent}`} style={{ background: `conic-gradient(${modeCopy.ring} ${elapsedPercent}%, color-mix(in srgb, ${modeCopy.ring} 15%, transparent) ${elapsedPercent}%)` }} data-testid="pomodoro-ring">
                  <div className="grid size-full place-items-center rounded-full border bg-background/95 p-5 shadow-inner backdrop-blur-sm">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{modeCopy.label}</p>
                      <p role="timer" aria-live="off" className="mt-2 font-mono text-6xl font-black tracking-tight tabular-nums sm:text-7xl" data-testid="pomodoro-clock">{clock.text}</p>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground" data-testid="pomodoro-status">{status === "running" ? "กำลังนับเวลา" : status === "paused" ? "พัก Timer ไว้—กดนับต่อเมื่อพร้อม" : modeCopy.description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-center gap-2" aria-label={`จบรอบโฟกัสแล้ว ${cycleFocusCount} จาก ${settings.longBreakAfter}`}>
                  {cycleDots.map((filled, index) => <span key={index} className={`size-2.5 rounded-full border ${filled ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"}`} />)}
                </div>
                <p className="mt-3 min-h-5 text-sm font-medium" data-testid="pomodoro-active-task">{activeTask ? `กำลังทำ: ${activeTask.title}` : mode === "focus" ? "เลือกงานด้านขวา หรือเริ่มโฟกัสโดยไม่ผูกงาน" : "ช่วงพักไม่นับเป็นเวลางาน"}</p>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {status === "running"
                  ? <Button type="button" size="lg" onClick={pauseTimer} data-testid="pomodoro-pause"><Pause />พัก Timer</Button>
                  : <Button type="button" size="lg" onClick={startTimer} data-testid="pomodoro-start"><Play />{status === "paused" ? "นับต่อ" : mode === "focus" ? "เริ่มโฟกัส" : "เริ่มพัก"}</Button>}
                <Button type="button" size="lg" variant="outline" onClick={resetTimer} data-testid="pomodoro-reset"><RotateCcw />รีเซ็ต</Button>
                <Button type="button" size="lg" variant="outline" onClick={() => advanceSession(false)} data-testid="pomodoro-skip"><FastForward />ข้ามช่วง</Button>
              </div>
              <p className="mt-4 text-center text-[11px] text-muted-foreground">คีย์ลัด: Space เริ่ม/พัก • S ข้าม • R รีเซ็ต</p>

              <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3 rounded-2xl border bg-background/60 px-4 py-3 backdrop-blur-sm">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary"><Image src="/brand/devthai-cat.png" alt="Meaw Focus Buddy" width={64} height={48} sizes="48px" className={`h-auto w-14 translate-y-1 object-contain ${status === "running" ? "motion-safe:animate-pulse" : ""}`} /></span>
                <div className="text-left"><p className="text-sm font-semibold">Meaw Focus Buddy</p><p className="mt-1 text-xs text-muted-foreground">{status === "running" ? "เมี้ยวจะนั่งเป็นเพื่อนจนหมดรอบ" : "พร้อมเมื่อคุณพร้อม ไม่เร่ง ไม่กดดัน"}</p></div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-muted/10 p-4"><div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4" /><span className="text-xs font-medium">รอบโฟกัสวันนี้</span></div><p className="mt-2 text-2xl font-bold tabular-nums" data-testid="pomodoro-stat-sessions">{stats.completedFocusSessions}<span className="ml-1 text-sm font-medium text-muted-foreground">/{settings.dailyGoal}</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${dailyGoalPercent}%` }} /></div></div>
            <div className="rounded-2xl border bg-muted/10 p-4"><div className="flex items-center gap-2 text-muted-foreground"><BarChart3 className="size-4" /><span className="text-xs font-medium">เวลาโฟกัสวันนี้</span></div><p className="mt-2 text-2xl font-bold tabular-nums" data-testid="pomodoro-stat-minutes">{stats.focusMinutes}<span className="ml-1 text-sm font-medium text-muted-foreground">นาที</span></p><p className="mt-3 text-xs text-muted-foreground">บันทึกเมื่อจบรอบ Focus เท่านั้น</p></div>
            <div className="rounded-2xl border bg-muted/10 p-4"><div className="flex items-center gap-2 text-muted-foreground"><Coffee className="size-4" /><span className="text-xs font-medium">รอบปัจจุบัน</span></div><p className="mt-2 text-2xl font-bold tabular-nums">{Math.min(settings.longBreakAfter, cycleFocusCount + 1)}<span className="ml-1 text-sm font-medium text-muted-foreground">/{settings.longBreakAfter}</span></p><Button type="button" variant="ghost" size="sm" className="mt-1 -ml-3 h-7 text-xs" onClick={() => setStored((current) => ({ ...current, stats: createEmptyPomodoroState().stats }))}>ล้างสถิติวันนี้</Button></div>
          </div>
        </section>

        <section className="xl:sticky xl:top-24 xl:self-start" aria-labelledby="pomodoro-tasks-title">
          <div className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="pomodoro-tasks-title" className="font-semibold">งานที่ต้องโฟกัส</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">เก็บไว้ใน Browser เครื่องนี้ สูงสุด {POMODORO_MAX_TASKS} งาน</p></div><Badge variant="outline">{tasks.filter((task) => task.done).length}/{tasks.length} เสร็จ</Badge></div>
            <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]" onSubmit={(event) => { event.preventDefault(); addTask(); }}>
              <div className="space-y-2"><Label htmlFor="pomodoro-task-title">ชื่องาน</Label><Input id="pomodoro-task-title" value={taskTitle} maxLength={POMODORO_MAX_TASK_LENGTH} onChange={(event) => setTaskTitle(event.target.value)} placeholder="เช่น เขียนหน้า Landing page" data-testid="pomodoro-task-input" /></div>
              <div className="space-y-2"><Label htmlFor="pomodoro-task-estimate">ประมาณ</Label><Input id="pomodoro-task-estimate" type="number" min="1" max="12" inputMode="numeric" value={taskEstimate} onChange={(event) => setTaskEstimate(Number(event.target.value))} aria-describedby="pomodoro-task-estimate-help" /></div>
              <Button type="submit" className="self-end" data-testid="pomodoro-add-task"><Plus />เพิ่ม</Button>
            </form>
            <p id="pomodoro-task-estimate-help" className="mt-2 text-[11px] text-muted-foreground">ประมาณเป็นจำนวนรอบ Focus ไม่ใช่ชั่วโมง</p>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

            <div className="mt-4 space-y-3" data-testid="pomodoro-task-list">
              {tasks.length ? tasks.map((task) => {
                const selected = activeTaskId === task.id && !task.done;
                const progress = pomodoroTaskProgress(task);
                return (
                  <article key={task.id} className={`rounded-2xl border p-3 transition-colors motion-reduce:transition-none ${selected ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "bg-background/60"}`}>
                    <div className="flex items-start gap-3">
                      <button type="button" className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary" aria-label={task.done ? `เปิดงาน ${task.title} อีกครั้ง` : `ทำเครื่องหมาย ${task.title} ว่าเสร็จ`} onClick={() => toggleTask(task.id)}>{task.done ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5" />}</button>
                      <button type="button" className="min-w-0 flex-1 text-left" disabled={task.done} onClick={() => setActiveTaskId(task.id)} aria-pressed={selected}>
                        <p className={`break-words text-sm font-semibold ${task.done ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span>{task.completedSessions}/{task.estimate} รอบ</span>{selected ? <Badge variant="secondary">กำลังทำ</Badge> : null}</div>
                      </button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={`ลบ ${task.title}`} onClick={() => deleteTask(task.id)}><Trash2 /></Button>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${task.done ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${progress}%` }} /></div>
                  </article>
                );
              }) : <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed p-5 text-center"><div><Sparkles className="mx-auto size-7 text-primary/50" /><p className="mt-2 text-sm font-medium">ยังไม่มีงาน</p><p className="mt-1 text-xs leading-5 text-muted-foreground">เพิ่มงานหนึ่งชิ้นแล้วเลือกเป็นงานที่กำลังทำ</p></div></div>}
            </div>
          </div>

          <details className="mt-5 rounded-2xl border bg-muted/10 p-4 sm:p-5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold"><span className="inline-flex items-center gap-2"><Settings2 className="size-4 text-primary" />รูปแบบและการตั้งค่า</span><Badge variant="outline">ปรับได้</Badge></summary>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(POMODORO_PRESETS) as Array<keyof typeof POMODORO_PRESETS>).map((key) => <Button key={key} type="button" variant="outline" size="sm" className="h-auto min-h-10 whitespace-normal" onClick={() => applyPreset(key)}>{POMODORO_PRESETS[key].label}</Button>)}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="pomodoro-focus-minutes">Focus (นาที)</Label><Input id="pomodoro-focus-minutes" type="number" min="1" max="120" value={settings.focusMinutes} onChange={(event) => updateSettings({ focusMinutes: Number(event.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="pomodoro-short-minutes">พักสั้น (นาที)</Label><Input id="pomodoro-short-minutes" type="number" min="1" max="60" value={settings.shortBreakMinutes} onChange={(event) => updateSettings({ shortBreakMinutes: Number(event.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="pomodoro-long-minutes">พักยาว (นาที)</Label><Input id="pomodoro-long-minutes" type="number" min="1" max="60" value={settings.longBreakMinutes} onChange={(event) => updateSettings({ longBreakMinutes: Number(event.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="pomodoro-long-after">พักยาวหลัง (รอบ)</Label><Input id="pomodoro-long-after" type="number" min="1" max="12" value={settings.longBreakAfter} onChange={(event) => updateSettings({ longBreakAfter: Number(event.target.value) })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="pomodoro-daily-goal">เป้าหมาย Focus ต่อวัน (รอบ)</Label><Input id="pomodoro-daily-goal" type="number" min="1" max="20" value={settings.dailyGoal} onChange={(event) => updateSettings({ dailyGoal: Number(event.target.value) })} /></div>
            </div>
            <div className="mt-5 space-y-3 border-t pt-4">
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span><span className="block font-medium">เริ่มช่วงพักอัตโนมัติ</span><span className="mt-1 block text-xs text-muted-foreground">หลัง Focus จบ</span></span><Switch checked={settings.autoStartBreaks} onCheckedChange={(checked) => updateSettings({ autoStartBreaks: checked })} aria-label="เริ่มช่วงพักอัตโนมัติ" /></label>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span><span className="block font-medium">เริ่ม Focus อัตโนมัติ</span><span className="mt-1 block text-xs text-muted-foreground">หลังช่วงพักจบ</span></span><Switch checked={settings.autoStartFocus} onCheckedChange={(checked) => updateSettings({ autoStartFocus: checked })} aria-label="เริ่ม Focus อัตโนมัติ" /></label>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span className="inline-flex items-center gap-2"><Volume2 className="size-4 text-primary" /><span><span className="block font-medium">เสียงแจ้งเตือน</span><span className="mt-1 block text-xs text-muted-foreground">ทำงานหลังคุณกดเริ่ม</span></span></span><Switch checked={settings.soundEnabled} onCheckedChange={(checked) => { updateSettings({ soundEnabled: checked }); if (checked) void armAudio(true); }} aria-label="เสียงแจ้งเตือน" /></label>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span><span className="block font-medium">ไม่ให้หน้าจอดับ</span><span className="mt-1 block text-xs text-muted-foreground">ใช้ Screen Wake Lock เมื่อ Browser รองรับ</span></span><Switch checked={settings.keepAwake} onCheckedChange={(checked) => { updateSettings({ keepAwake: checked }); if (!checked) releaseWakeLock(); }} aria-label="ไม่ให้หน้าจอดับระหว่างจับเวลา" /></label>
            </div>
          </details>

          <Alert className="mt-5 border-sky-500/30 bg-sky-500/5">
            <ShieldCheck className="text-sky-600" /><AlertTitle>งานและสถิติเก็บใน Browser เครื่องนี้</AlertTitle><AlertDescription>ไม่มีบัญชีและไม่ส่งรายการงานไป Server ข้อมูลอาจหายเมื่อคุณล้าง Site data หรือใช้ Private mode ส่วน Timer ใช้ Deadline จริงจึงกลับมาตรงเวลาเมื่อสลับแท็บ แต่ไม่ใช่ Alarm หลังปิด Browser</AlertDescription>
          </Alert>
        </section>
      </div>
    </WorkspaceFrame>
  );
}
