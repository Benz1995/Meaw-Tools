"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  BellOff,
  BellRing,
  Clock3,
  Expand,
  MoonStar,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ALARM_REPEAT_OPTIONS,
  ALARM_SOUND_OPTIONS,
  DEFAULT_ALARM_SETTINGS,
  ONLINE_ALARM_MAX_ALARMS,
  ONLINE_ALARM_STORAGE_KEY,
  alarmRepeatLabel,
  createOnlineAlarm,
  defaultAlarmTime,
  disableOnlineAlarm,
  dismissAlarmOccurrence,
  enableOnlineAlarm,
  formatAlarmCountdown,
  getDueAlarmOccurrence,
  getNextAlarmOccurrence,
  normalizeAlarmClockSettings,
  parseAlarmClockStore,
  serializeAlarmClockStore,
  snoozeAlarmOccurrence,
  type AlarmClockSettings,
  type AlarmOccurrence,
  type AlarmRepeat,
  type AlarmSound,
  type OnlineAlarm,
} from "@/lib/tools/online-alarm-clock";

type AlarmDraft = {
  label: string;
  time: string;
  repeat: AlarmRepeat;
  days: number[];
  sound: AlarmSound;
  snoozeMinutes: number;
};

type BrowserNotificationPermission = NotificationPermission | "unsupported";

const DAY_OPTIONS = [
  { value: 1, label: "จ." },
  { value: 2, label: "อ." },
  { value: 3, label: "พ." },
  { value: 4, label: "พฤ." },
  { value: 5, label: "ศ." },
  { value: 6, label: "ส." },
  { value: 0, label: "อา." },
] as const;

function createDraft(nowMs = Date.now()): AlarmDraft {
  return { label: "ปลุกฉัน", time: defaultAlarmTime(nowMs), repeat: "once", days: [1, 2, 3, 4, 5], sound: "chime", snoozeMinutes: 5 };
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName));
}

function playAlarmPattern(context: AudioContext | null, sound: AlarmSound, volume: number) {
  if (!context || context.state !== "running") return;
  const patterns: Record<AlarmSound, Array<{ frequency: number; delay: number; duration: number; type: OscillatorType }>> = {
    chime: [
      { frequency: 523.25, delay: 0, duration: 0.5, type: "sine" },
      { frequency: 659.25, delay: 0.16, duration: 0.5, type: "sine" },
      { frequency: 783.99, delay: 0.32, duration: 0.65, type: "sine" },
    ],
    digital: [
      { frequency: 880, delay: 0, duration: 0.16, type: "square" },
      { frequency: 880, delay: 0.28, duration: 0.16, type: "square" },
      { frequency: 1_100, delay: 0.56, duration: 0.2, type: "square" },
    ],
    gentle: [
      { frequency: 392, delay: 0, duration: 0.75, type: "sine" },
      { frequency: 523.25, delay: 0.2, duration: 0.8, type: "sine" },
    ],
    bell: [
      { frequency: 659.25, delay: 0, duration: 0.75, type: "triangle" },
      { frequency: 987.77, delay: 0.08, duration: 0.7, type: "triangle" },
    ],
  };
  for (const note of patterns[sound]) {
    const gain = context.createGain();
    const start = context.currentTime + note.delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, volume * 0.2), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
    gain.connect(context.destination);
    const oscillator = context.createOscillator();
    oscillator.type = note.type;
    oscillator.frequency.value = note.frequency;
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + note.duration);
  }
}

export function OnlineAlarmClockTool() {
  const [alarms, setAlarms] = useState<OnlineAlarm[]>([]);
  const [settings, setSettings] = useState<AlarmClockSettings>(DEFAULT_ALARM_SETTINGS);
  const [draft, setDraft] = useState<AlarmDraft>(() => createDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ringing, setRinging] = useState<AlarmOccurrence | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [audioReady, setAudioReady] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<BrowserNotificationPermission>("unsupported");
  const [error, setError] = useState("");
  const clockPanelRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmLoopRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const ringingRef = useRef<AlarmOccurrence | null>(null);
  const hydratedRef = useRef(false);
  const baseTitleRef = useRef("");

  const timeFormatter = useMemo(() => new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: !settings.use24Hour }), [settings.use24Hour]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), []);
  const alarmTimeFormatter = useMemo(() => new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: !settings.use24Hour }), [settings.use24Hour]);
  const nextOccurrence = useMemo(() => getNextAlarmOccurrence(alarms), [alarms]);
  const enabledCount = alarms.filter((alarm) => alarm.enabled).length;
  const displayAlarms = useMemo(() => alarms.toSorted((left, right) => {
    if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
    return (getNextAlarmOccurrence([left])?.atMs ?? Number.MAX_SAFE_INTEGER) - (getNextAlarmOccurrence([right])?.atMs ?? Number.MAX_SAFE_INTEGER);
  }), [alarms]);

  const stopAlarmAudio = useCallback(() => {
    if (alarmLoopRef.current !== null) window.clearInterval(alarmLoopRef.current);
    alarmLoopRef.current = null;
    navigator.vibrate?.(0);
  }, []);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock) void lock.release().catch(() => undefined);
  }, []);

  const requestWakeLock = useCallback(async (force = false) => {
    if ((!settings.keepAwake && !force) || !navigator.wakeLock || document.visibilityState !== "visible" || enabledCount === 0) return;
    try {
      releaseWakeLock();
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      setError("Browser ไม่อนุญาตให้ป้องกันหน้าจอดับ โปรดตั้งค่าอุปกรณ์ไม่ให้ Sleep และใช้ Alarm สำรอง");
    }
  }, [enabledCount, releaseWakeLock, settings.keepAwake]);

  const armAudio = useCallback(async (previewSound?: AlarmSound) => {
    try {
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      await context.resume();
      const ready = context.state === "running";
      setAudioReady(ready);
      setError("");
      if (ready && previewSound) playAlarmPattern(context, previewSound, settings.volume);
      return ready ? context : null;
    } catch {
      setAudioReady(false);
      setError("Browser ไม่อนุญาตเสียง โปรดตรวจโหมดปิดเสียง ระดับเสียง และสิทธิ์ของเว็บไซต์");
      return null;
    }
  }, [settings.volume]);

  const startRinging = useCallback((occurrence: AlarmOccurrence) => {
    ringingRef.current = occurrence;
    setRinging(occurrence);
    stopAlarmAudio();
    playAlarmPattern(audioContextRef.current, occurrence.alarm.sound, settings.volume);
    alarmLoopRef.current = window.setInterval(() => playAlarmPattern(audioContextRef.current, occurrence.alarm.sound, settings.volume), 1_400);
    navigator.vibrate?.([300, 150, 300, 150, 600]);
    if (settings.notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(`⏰ ${occurrence.alarm.label}`, { body: `ถึงเวลาปลุก ${occurrence.alarm.time} แล้ว`, tag: `meaw-alarm-${occurrence.alarm.id}` });
    }
  }, [settings.notificationsEnabled, settings.volume, stopAlarmAudio]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const stored = parseAlarmClockStore(window.localStorage.getItem(ONLINE_ALARM_STORAGE_KEY));
      setAlarms(stored.alarms);
      setSettings(stored.settings);
      setDraft(createDraft());
      setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
      hydratedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try { window.localStorage.setItem(ONLINE_ALARM_STORAGE_KEY, serializeAlarmClockStore({ alarms, settings })); }
    catch { toast.error("บันทึก Alarm ใน Browser ไม่สำเร็จ พื้นที่จัดเก็บอาจเต็มหรือถูกปิดไว้"); }
  }, [alarms, settings]);

  useEffect(() => {
    const update = () => {
      const current = Date.now();
      setNowMs(current);
      if (!ringingRef.current) {
        const due = getDueAlarmOccurrence(alarms, current);
        if (due) startRinging(due);
      }
    };
    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [alarms, startRinging]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (enabledCount > 0 && settings.keepAwake) void requestWakeLock();
      else releaseWakeLock();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [enabledCount, releaseWakeLock, requestWakeLock, settings.keepAwake]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && enabledCount > 0 && settings.keepAwake) void requestWakeLock();
      else releaseWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabledCount, releaseWakeLock, requestWakeLock, settings.keepAwake]);

  useEffect(() => {
    baseTitleRef.current = document.title;
    return () => { document.title = baseTitleRef.current; };
  }, []);

  useEffect(() => {
    if (!baseTitleRef.current) return;
    document.title = ringing
      ? `⏰ ${ringing.alarm.label} | Meaw Tools`
      : nextOccurrence ? `${formatAlarmCountdown(nextOccurrence.atMs - nowMs)} ถึง Alarm | Meaw Tools` : baseTitleRef.current;
  }, [nextOccurrence, nowMs, ringing]);

  useEffect(() => () => {
    stopAlarmAudio();
    releaseWakeLock();
    void audioContextRef.current?.close();
  }, [releaseWakeLock, stopAlarmAudio]);

  const updateSettings = (patch: Partial<AlarmClockSettings>) => setSettings((current) => normalizeAlarmClockSettings({ ...current, ...patch }));

  const resetDraft = () => {
    setDraft(createDraft());
    setEditingId(null);
    setError("");
  };

  const saveAlarm = () => {
    const current = editingId ? alarms.find((alarm) => alarm.id === editingId) : null;
    if (!current && alarms.length >= ONLINE_ALARM_MAX_ALARMS) {
      setError(`เพิ่มได้สูงสุด ${ONLINE_ALARM_MAX_ALARMS} Alarm กรุณาลบรายการเดิมก่อน`);
      return;
    }
    const now = Date.now();
    const id = current?.id ?? crypto.randomUUID();
    const next = createOnlineAlarm({ ...draft, enabled: current?.enabled ?? true }, id, now);
    const saved = current ? { ...next, createdAtMs: current.createdAtMs } : next;
    setAlarms((items) => current ? items.map((alarm) => alarm.id === current.id ? saved : alarm) : [...items, saved]);
    setNowMs(now);
    resetDraft();
    void armAudio(saved.sound);
    toast.success(current ? "อัปเดต Alarm แล้ว" : "ตั้ง Alarm แล้ว อย่าปิดแท็บนี้");
  };

  const editAlarm = (alarm: OnlineAlarm) => {
    setDraft({ label: alarm.label, time: alarm.time, repeat: alarm.repeat, days: alarm.days, sound: alarm.sound, snoozeMinutes: alarm.snoozeMinutes });
    setEditingId(alarm.id);
    setError("");
    document.getElementById("alarm-form-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteAlarm = (id: string) => {
    if (ringingRef.current?.alarm.id === id) {
      stopAlarmAudio();
      ringingRef.current = null;
      setRinging(null);
    }
    setAlarms((items) => items.filter((alarm) => alarm.id !== id));
    if (editingId === id) resetDraft();
    toast.info("ลบ Alarm แล้ว");
  };

  const handleToggleAlarm = (alarm: OnlineAlarm, enabled: boolean) => {
    const now = nowMs;
    const next = enabled ? enableOnlineAlarm(alarm, now) : disableOnlineAlarm(alarm, now);
    setAlarms((items) => items.map((item) => item.id === alarm.id ? next : item));
    if (enabled) {
      void armAudio();
      toast.success("เปิด Alarm แล้ว อย่าปิดแท็บนี้");
    }
  };

  const finishRinging = useCallback((action: "dismiss" | "snooze") => {
    const occurrence = ringingRef.current;
    if (!occurrence) return;
    const now = Date.now();
    const next = action === "snooze"
      ? snoozeAlarmOccurrence(occurrence.alarm, occurrence.source, now)
      : dismissAlarmOccurrence(occurrence.alarm, occurrence.source, now);
    setAlarms((items) => items.map((alarm) => alarm.id === occurrence.alarm.id ? next : alarm));
    setNowMs(now);
    stopAlarmAudio();
    ringingRef.current = null;
    setRinging(null);
    toast.success(action === "snooze" ? `เลื่อนปลุก ${occurrence.alarm.snoozeMinutes} นาที` : "ปิดเสียงปลุกแล้ว");
  }, [stopAlarmAudio]);

  const requestNotifications = async (enabled: boolean) => {
    if (!enabled) { updateSettings({ notificationsEnabled: false }); return; }
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      setError("Browser นี้ไม่รองรับ Notification แต่เสียงและหน้าจอปลุกยังทำงานเมื่อเปิดหน้าไว้");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    updateSettings({ notificationsEnabled: permission === "granted" });
    if (permission !== "granted") setError("ยังไม่ได้รับสิทธิ์ Notification คุณยังใช้เสียงและหน้าจอปลุกได้ตามปกติ");
  };

  const setQuickTime = (minutesAhead: number | null, fixed?: string) => {
    setDraft((current) => ({ ...current, time: fixed ?? defaultAlarmTime(Date.now(), minutesAhead ?? 5) }));
  };

  const toggleDraftDay = (day: number) => {
    if (draft.days.includes(day) && draft.days.length === 1) {
      setError("เลือกอย่างน้อย 1 วันสำหรับ Alarm แบบเลือกวันเอง");
      return;
    }
    setDraft((current) => ({ ...current, days: current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day] }));
    setError("");
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await clockPanelRef.current?.requestFullscreen();
    } catch { setError("Browser นี้ไม่อนุญาตโหมดเต็มจอ"); }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLocaleLowerCase("en-US");
      if (ringingRef.current && (key === "s" || event.key === "Escape")) {
        event.preventDefault();
        finishRinging(key === "s" ? "snooze" : "dismiss");
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (key === "f") void toggleFullscreen();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [finishRinging, toggleFullscreen]);

  return (
    <WorkspaceFrame>
      {ringing ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/90 p-4 text-white backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="ringing-alarm-title" data-testid="alarm-ringing-overlay">
          <div className="w-full max-w-xl text-center">
            <span className="mx-auto grid size-20 animate-pulse place-items-center rounded-full bg-rose-500/20 ring-1 ring-rose-300/30"><BellRing className="size-10 text-rose-300" /></span>
            <p className="mt-7 font-mono text-6xl font-black tabular-nums sm:text-8xl">{timeFormatter.format(nowMs)}</p>
            <h2 id="ringing-alarm-title" className="mt-5 font-heading text-3xl font-bold sm:text-4xl">{ringing.alarm.label}</h2>
            <p className="mt-2 text-sm text-slate-300">ตั้งไว้ {ringing.alarm.time} • {ringing.source === "snooze" ? "ปลุกซ้ำหลัง Snooze" : alarmRepeatLabel(ringing.alarm)}</p>
            {!audioReady ? <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">เสียงอาจไม่ดัง เพราะหน้านี้ยังไม่ได้รับการกดเพื่อเตรียมเสียง</p> : null}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="h-16 rounded-2xl text-lg" onClick={() => finishRinging("snooze")} data-testid="alarm-snooze"><MoonStar />เลื่อน {ringing.alarm.snoozeMinutes} นาที <kbd className="rounded border px-1 text-[10px]">S</kbd></Button>
              <Button type="button" className="h-16 rounded-2xl bg-rose-500 text-lg text-white hover:bg-rose-600" onClick={() => finishRinging("dismiss")} data-testid="alarm-dismiss"><BellOff />ปิดเสียง <kbd className="rounded border border-white/30 px-1 text-[10px]">Esc</kbd></Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <section className="min-w-0 space-y-5" aria-labelledby="alarm-clock-workspace-heading">
          <div
            ref={clockPanelRef}
            className="relative isolate overflow-hidden rounded-[1.75rem] border bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.20),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,.15),transparent_38%)] p-5 shadow-sm sm:p-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,.10),transparent_38%)] [&:fullscreen]:grid [&:fullscreen]:min-h-screen [&:fullscreen]:place-items-center [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-8"
            data-testid="alarm-clock-panel"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Badge variant="secondary"><AlarmClock />เวลาท้องถิ่น</Badge><h2 id="alarm-clock-workspace-heading" className="sr-only">พื้นที่นาฬิกาปลุกออนไลน์</h2></div>
              <Button type="button" variant="outline" className="h-10" onClick={() => void toggleFullscreen()} data-testid="alarm-fullscreen"><Expand />เต็มจอ <kbd className="hidden rounded border bg-muted px-1 text-[10px] sm:inline">F</kbd></Button>
            </div>
            <div className="py-9 text-center sm:py-12">
              <p className="font-mono text-6xl font-black tracking-tight tabular-nums sm:text-8xl" data-testid="alarm-current-time">{timeFormatter.format(nowMs)}</p>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">{dateFormatter.format(nowMs)}</p>
            </div>
            <div className="rounded-2xl border bg-background/60 p-4 backdrop-blur-sm" data-testid="alarm-next-card">
              {nextOccurrence ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0"><p className="text-xs font-medium text-primary">Alarm ถัดไป</p><p className="mt-1 truncate font-heading text-lg font-semibold">{nextOccurrence.alarm.label}</p><p className="mt-1 text-xs text-muted-foreground">{alarmTimeFormatter.format(nextOccurrence.atMs)} • {nextOccurrence.source === "snooze" ? "Snooze" : alarmRepeatLabel(nextOccurrence.alarm)}</p></div>
                  <div className="text-right"><p className="font-mono text-2xl font-bold tabular-nums" data-testid="alarm-next-countdown">{formatAlarmCountdown(nextOccurrence.atMs - nowMs)}</p><p className="mt-1 text-xs text-muted-foreground">เหลือก่อนปลุก</p></div>
                </div>
              ) : (
                <div className="py-2 text-center"><BellOff className="mx-auto size-6 text-muted-foreground" /><p className="mt-2 text-sm font-medium">ยังไม่มี Alarm ที่เปิดอยู่</p><p className="mt-1 text-xs text-muted-foreground">ตั้งเวลาในแบบฟอร์มด้านขวา</p></div>
              )}
            </div>
          </div>

          <section className="rounded-2xl border bg-card/60 p-4 sm:p-5" data-testid="alarm-list">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-heading font-semibold">Alarm ของฉัน</h3><p className="mt-1 text-xs text-muted-foreground">เปิดอยู่ {enabledCount} • ทั้งหมด {alarms.length}/{ONLINE_ALARM_MAX_ALARMS}</p></div>{enabledCount > 0 ? <Badge variant="secondary"><BellRing />กำลังเฝ้าเวลา</Badge> : <Badge variant="outline">ยังไม่เปิด</Badge>}</div>
            {alarms.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">ยังไม่มี Alarm เพิ่มรายการแรกจากแบบฟอร์ม แล้วกดทดสอบเสียงก่อนใช้งานจริง</div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {displayAlarms.map((alarm) => {
                  const occurrence = getNextAlarmOccurrence([alarm]);
                  return (
                    <article key={alarm.id} className="rounded-2xl border bg-background/55 p-3.5" data-testid={`alarm-item-${alarm.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="font-mono text-2xl font-bold tabular-nums">{alarm.time}</p><p className="mt-1 truncate text-sm font-medium">{alarm.label}</p></div>
                        <Switch checked={alarm.enabled} onCheckedChange={(checked) => handleToggleAlarm(alarm, checked)} aria-label={`${alarm.enabled ? "ปิด" : "เปิด"} ${alarm.label}`} data-testid={`alarm-toggle-${alarm.id}`} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{alarmRepeatLabel(alarm)} • Snooze {alarm.snoozeMinutes} นาที</p>
                      <p className="mt-1 min-h-4 text-xs text-muted-foreground">{occurrence ? alarmTimeFormatter.format(occurrence.atMs) : "ปิดอยู่"}</p>
                      <div className="mt-3 flex gap-2 border-t pt-3"><Button type="button" size="sm" variant="ghost" className="flex-1" onClick={() => editAlarm(alarm)}><Pencil />แก้ไข</Button><Button type="button" size="sm" variant="ghost" className="text-destructive" aria-label={`ลบ ${alarm.label}`} onClick={() => deleteAlarm(alarm.id)}><Trash2 /></Button></div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <Alert className="border-rose-500/30 bg-rose-500/5">
            <ShieldAlert className="text-rose-600" /><AlertTitle>อย่าปิดแท็บ และอย่าให้อุปกรณ์ Sleep</AlertTitle><AlertDescription>Alarm เว็บไม่สามารถปลุกหลังปิดแท็บ ปิด Browser ปิดเครื่อง หรือเมื่ออุปกรณ์หยุดทำงานเบื้องหลัง สำหรับการตื่นนอน ยา นัดหมาย หรือเรื่องสำคัญ ควรตั้ง Alarm สำรองบนโทรศัพท์หรืออุปกรณ์จริงและทดสอบเสียงก่อน</AlertDescription>
          </Alert>
          <Alert className="border-sky-500/30 bg-sky-500/5">
            <ShieldCheck className="text-sky-600" /><AlertTitle>Alarm เก็บเฉพาะ Browser เครื่องนี้</AlertTitle><AlertDescription>ไม่มีบัญชีและไม่ส่งชื่อหรือเวลาไป API รายการอาจหายเมื่อใช้ Private mode ล้าง Site data เปลี่ยน Browser หรือเปลี่ยนอุปกรณ์ ส่วน Alarm ที่เลยเวลาไประหว่างปิด Browser จะไม่ดังย้อนหลังเมื่อกลับมาเปิดหน้า</AlertDescription>
          </Alert>
        </section>

        <aside className="min-w-0 space-y-5" aria-label="ตั้งค่านาฬิกาปลุก">
          <section className="rounded-2xl border bg-card/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><h3 id="alarm-form-heading" className="font-heading font-semibold">{editingId ? "แก้ไข Alarm" : "ตั้ง Alarm ใหม่"}</h3><p className="mt-1 text-xs text-muted-foreground">อ้างอิงเวลาท้องถิ่นของอุปกรณ์นี้</p></div>{editingId ? <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>ยกเลิก</Button> : <Badge variant="outline"><Plus />ใหม่</Badge>}</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2.5 sm:col-span-2"><Label htmlFor="alarm-time">เวลาปลุก</Label><Input id="alarm-time" type="time" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} data-testid="alarm-time" className="h-11 text-lg" /></div>
              <div className="sm:col-span-2 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setQuickTime(1)}>+1 นาที</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickTime(5)}>+5 นาที</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickTime(null, "07:00")}>07:00</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuickTime(null, "08:00")}>08:00</Button></div>
              <div className="space-y-2.5 sm:col-span-2"><Label htmlFor="alarm-label">ชื่อ Alarm</Label><Input id="alarm-label" maxLength={60} value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="เช่น ประชุมทีม" data-testid="alarm-label" /></div>
              <div className="space-y-2.5"><Label htmlFor="alarm-repeat">ทำซ้ำ</Label><Select value={draft.repeat} onValueChange={(value) => setDraft((current) => ({ ...current, repeat: value as AlarmRepeat }))}><SelectTrigger id="alarm-repeat" data-testid="alarm-repeat"><SelectValue /></SelectTrigger><SelectContent>{ALARM_REPEAT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2.5"><Label htmlFor="alarm-snooze-minutes">Snooze</Label><Select value={String(draft.snoozeMinutes)} onValueChange={(value) => setDraft((current) => ({ ...current, snoozeMinutes: Number(value) }))}><SelectTrigger id="alarm-snooze-minutes" data-testid="alarm-snooze-minutes"><SelectValue /></SelectTrigger><SelectContent>{[1, 5, 10, 15, 30].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} นาที</SelectItem>)}</SelectContent></Select></div>
              {draft.repeat === "custom" ? (
                <div className="space-y-2.5 sm:col-span-2"><Label>วันที่ปลุก</Label><div className="grid grid-cols-7 gap-1.5">{DAY_OPTIONS.map((day) => { const selected = draft.days.includes(day.value); return <Button key={day.value} type="button" size="sm" variant={selected ? "default" : "outline"} className="px-1" aria-pressed={selected} onClick={() => toggleDraftDay(day.value)}>{day.label}</Button>; })}</div></div>
              ) : null}
              <div className="space-y-2.5 sm:col-span-2"><Label htmlFor="alarm-sound">เสียงปลุก</Label><Select value={draft.sound} onValueChange={(value) => setDraft((current) => ({ ...current, sound: value as AlarmSound }))}><SelectTrigger id="alarm-sound" data-testid="alarm-sound"><SelectValue /></SelectTrigger><SelectContent>{ALARM_SOUND_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>ตรวจสอบอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" className="h-11" onClick={() => void armAudio(draft.sound)} data-testid="alarm-test-sound"><Volume2 />ทดสอบเสียง</Button><Button type="button" className="h-11" onClick={saveAlarm} data-testid="alarm-save"><Save />{editingId ? "บันทึกการแก้ไข" : "ตั้ง Alarm"}</Button></div>
          </section>

          <section className="rounded-2xl border bg-card/60 p-4 sm:p-5">
            <div><h3 className="font-heading font-semibold">ความพร้อมของ Browser</h3><p className="mt-1 text-xs text-muted-foreground">ตรวจทุกครั้งหลัง reload หรือเปลี่ยนอุปกรณ์</p></div>
            <div className="mt-4 space-y-3">
              <div className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${audioReady ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><span className="inline-flex items-center gap-2 text-sm"><Volume2 className="size-4" /><span><span className="block font-medium">เสียงปลุก</span><span className="mt-1 block text-xs text-muted-foreground">{audioReady ? "พร้อมในแท็บนี้" : "ยังไม่พร้อมหลังเปิดหน้า"}</span></span></span><Button type="button" size="sm" variant="outline" onClick={() => void armAudio(draft.sound)}>{audioReady ? "ทดสอบ" : "เตรียมเสียง"}</Button></div>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span className="inline-flex items-center gap-2"><Smartphone className="size-4 text-primary" /><span><span className="block font-medium">ป้องกันหน้าจอดับ</span><span className="mt-1 block text-xs text-muted-foreground">ใช้ Wake Lock เมื่อรองรับ</span></span></span><Switch checked={settings.keepAwake} onCheckedChange={(checked) => { updateSettings({ keepAwake: checked }); if (!checked) releaseWakeLock(); else void requestWakeLock(true); }} aria-label="ป้องกันหน้าจอดับขณะเปิด Alarm" data-testid="alarm-keep-awake" /></label>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span className="inline-flex items-center gap-2"><BellRing className="size-4 text-primary" /><span><span className="block font-medium">Browser Notification</span><span className="mt-1 block text-xs text-muted-foreground">{notificationPermission === "granted" ? "ได้รับสิทธิ์แล้ว" : notificationPermission === "denied" ? "ถูกปฏิเสธ" : notificationPermission === "unsupported" ? "ไม่รองรับ" : "ยังไม่ขอสิทธิ์"}</span></span></span><Switch checked={settings.notificationsEnabled && notificationPermission === "granted"} onCheckedChange={(checked) => void requestNotifications(checked)} aria-label="Browser Notification เมื่อ Alarm ดัง" data-testid="alarm-notifications" /></label>
              <div className="grid grid-cols-[1fr_120px] items-end gap-3"><div><p className="text-sm font-medium">ความดัง</p><p className="mt-1 text-xs text-muted-foreground">ขึ้นกับระดับเสียงอุปกรณ์ด้วย</p></div><Select value={String(settings.volume)} onValueChange={(value) => updateSettings({ volume: Number(value) })}><SelectTrigger aria-label="ระดับความดังเสียงปลุก" data-testid="alarm-volume"><SelectValue /></SelectTrigger><SelectContent>{[[0.3, "30%"], [0.5, "50%"], [0.7, "70%"], [1, "100%"]].map(([value, label]) => <SelectItem key={String(value)} value={String(value)}>{label}</SelectItem>)}</SelectContent></Select></div>
              <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-background/50 px-3 py-2.5 text-sm"><span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-primary" /><span><span className="block font-medium">รูปแบบ 24 ชั่วโมง</span><span className="mt-1 block text-xs text-muted-foreground">ปิดเพื่อใช้ AM/PM</span></span></span><Switch checked={settings.use24Hour} onCheckedChange={(checked) => updateSettings({ use24Hour: checked })} aria-label="ใช้เวลาแบบ 24 ชั่วโมง" data-testid="alarm-24-hour" /></label>
            </div>
          </section>

          <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground"><p className="font-medium text-foreground">คีย์ลัดขณะใช้งาน</p><p className="mt-1.5">F เต็มจอ • S เลื่อนปลุก • Esc ปิดเสียงเมื่อ Alarm ดัง</p></div>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}
