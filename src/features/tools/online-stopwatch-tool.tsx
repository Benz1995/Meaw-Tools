"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Clipboard, Download, Flag, Gauge, Maximize2, Pause, Play, RotateCcw, TimerReset, Trophy } from "lucide-react";
import { ActionBar, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STOPWATCH_MAX_LAPS,
  STOPWATCH_MAX_MS,
  STOPWATCH_STORAGE_KEY,
  buildStopwatchCsv,
  buildStopwatchSummary,
  calculateStopwatchStats,
  createStopwatchState,
  formatStopwatchTime,
  getStopwatchElapsedMs,
  parseStopwatchState,
  pauseStopwatch,
  recordStopwatchLap,
  resetStopwatch,
  startStopwatch,
  type StopwatchState,
} from "@/lib/tools/stopwatch";

const STATUS_TEXT = {
  idle: "พร้อมจับเวลา",
  running: "กำลังจับเวลา",
  paused: "พักอยู่",
} as const;

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

export function OnlineStopwatchTool() {
  const [state, setState] = useState<StopwatchState>(() => {
    try { return parseStopwatchState(window.localStorage.getItem(STOPWATCH_STORAGE_KEY)); }
    catch { return createStopwatchState(); }
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState("");
  const clockRef = useRef<HTMLDivElement>(null);

  const elapsedMs = getStopwatchElapsedMs(state, nowMs);
  const stats = useMemo(() => calculateStopwatchStats(state.laps), [state.laps]);
  const reversedLaps = useMemo(() => state.laps.map((lap, index) => ({ lap, number: index + 1 })).reverse(), [state.laps]);

  function persist(next: StopwatchState) {
    try {
      window.localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setError("");
    } catch {
      setError("Browser บันทึกสถานะ Stopwatch ไม่สำเร็จ กรุณาส่งออกผลก่อนรีเฟรชหรือปิดหน้า");
    }
  }

  function startOrResume() {
    const current = Date.now();
    persist(startStopwatch(state, current));
    setNowMs(current);
  }

  function pause() {
    const current = Date.now();
    persist(pauseStopwatch(state, current));
    setNowMs(current);
  }

  function addLap() {
    const current = Date.now();
    const next = recordStopwatchLap(state, crypto.randomUUID(), current);
    if (next === state) return;
    persist(next);
    setNowMs(current);
  }

  function reset() {
    const current = Date.now();
    if ((getStopwatchElapsedMs(state, current) > 0 || state.laps.length > 0) && !window.confirm("รีเซ็ตเวลาและลบรอบทั้งหมดหรือไม่?")) return;
    persist(resetStopwatch(state, current));
    setNowMs(current);
  }

  function clearLaps() {
    if (state.laps.length === 0 || !window.confirm("ลบรอบทั้งหมดโดยให้ Stopwatch เดินต่อหรือไม่?")) return;
    persist({ ...state, laps: [], updatedAtMs: Date.now() });
  }

  async function openFullscreen() {
    try {
      if (!clockRef.current?.requestFullscreen) throw new Error("Browser นี้ไม่รองรับโหมดเต็มจอ");
      await clockRef.current.requestFullscreen();
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เปิดโหมดเต็มจอไม่สำเร็จ");
    }
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target) || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (event.code === "Space") {
      event.preventDefault();
      if (state.status === "running") pause(); else startOrResume();
    } else if (key === "l" && state.status === "running") {
      event.preventDefault();
      addLap();
    } else if (key === "r") {
      event.preventDefault();
      reset();
    }
  });

  useEffect(() => {
    if (state.status !== "running") return;
    const update = () => {
      const current = Date.now();
      setNowMs(current);
      if (getStopwatchElapsedMs(state, current) >= STOPWATCH_MAX_MS) {
        const paused = pauseStopwatch(state, current);
        try { window.localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(paused)); } catch { /* handled by the visible limit state */ }
        setState(paused);
        setError("Stopwatch ถึงขีดจำกัด 999:59:59.99 และหยุดอัตโนมัติ");
      }
    };
    update();
    const interval = window.setInterval(update, 31);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [state]);

  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <WorkspaceFrame>
      <section aria-labelledby="stopwatch-title" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><TimerReset className="size-5" /></span>
            <div>
              <Badge variant="secondary" className="mb-2">จับจากเวลาจริง ไม่สะสม Timer tick</Badge>
              <h2 id="stopwatch-title" className="text-xl font-bold tracking-tight sm:text-2xl">นาฬิกาจับเวลาออนไลน์พร้อม Lap</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">เริ่ม พัก จับรอบ และกลับมาได้แม้สลับแท็บ พร้อมสรุปรอบเร็วที่สุด ช้าที่สุด ค่าเฉลี่ย และ CSV ที่เปิดใน Spreadsheet ได้</p>
            </div>
          </div>
          <Badge variant={state.status === "running" ? "default" : "outline"} className="w-fit" data-testid="stopwatch-status">{STATUS_TEXT[state.status]}</Badge>
        </div>

        <div ref={clockRef} className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--muted)/0.28))] p-4 shadow-sm sm:p-8" data-testid="stopwatch-clock">
          <div className="absolute right-4 top-4 size-20 rounded-full bg-primary/8 blur-2xl" aria-hidden="true" />
          <div className="relative text-center">
            <p className="min-h-6 truncate text-sm font-medium text-muted-foreground" data-testid="stopwatch-session-heading">{state.sessionName || "รอบจับเวลาใหม่"}</p>
            <output aria-live="off" aria-label={`เวลาที่จับได้ ${formatStopwatchTime(elapsedMs, true)}`} className="mt-3 block whitespace-nowrap font-mono text-[clamp(2.35rem,10vw,6.6rem)] font-bold leading-none tracking-[-0.07em] text-foreground tabular-nums" data-testid="stopwatch-display">{formatStopwatchTime(elapsedMs)}</output>
            <p className="mt-3 text-[11px] tracking-[0.14em] text-muted-foreground sm:text-xs">ชั่วโมง : นาที : วินาที . เศษวินาที</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8">
              {state.status === "running" ? (
                <Button type="button" size="lg" onClick={pause} data-testid="stopwatch-pause"><Pause />พัก</Button>
              ) : (
                <Button type="button" size="lg" onClick={startOrResume} data-testid="stopwatch-start"><Play />{elapsedMs > 0 ? "จับเวลาต่อ" : "เริ่มจับเวลา"}</Button>
              )}
              <Button type="button" size="lg" variant="secondary" onClick={addLap} disabled={state.status !== "running" || state.laps.length >= STOPWATCH_MAX_LAPS} data-testid="stopwatch-lap"><Flag />จับรอบ</Button>
              <Button type="button" size="lg" variant="outline" onClick={reset} disabled={elapsedMs === 0 && state.laps.length === 0} data-testid="stopwatch-reset"><RotateCcw />รีเซ็ต</Button>
              <Button type="button" size="icon" variant="outline" onClick={() => void openFullscreen()} aria-label="เปิด Stopwatch เต็มจอ"><Maximize2 /></Button>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="คีย์ลัด">
              <span><kbd className="rounded border bg-background px-1.5 py-0.5">Space</kbd> เริ่ม/พัก</span>
              <span><kbd className="rounded border bg-background px-1.5 py-0.5">L</kbd> จับรอบ</span>
              <span><kbd className="rounded border bg-background px-1.5 py-0.5">R</kbd> รีเซ็ต</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-background/65 p-4">
              <div className="space-y-2">
                <Label htmlFor="stopwatch-session-name">ชื่อการจับเวลา <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></Label>
                <Input id="stopwatch-session-name" value={state.sessionName} maxLength={80} placeholder="เช่น วิ่ง 5 รอบ หรือซ้อมนำเสนอ" onChange={(event) => persist({ ...state, sessionName: event.target.value.slice(0, 80), updatedAtMs: Date.now() })} data-testid="stopwatch-session-name" />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">สถานะถูกเก็บใน Browser นี้ หากกำลังจับเวลา ระบบจะคำนวณต่อจาก timestamp จริงเมื่อ reload หรือกลับมาจากแท็บอื่น</p>
            </div>

            <div className="grid grid-cols-2 gap-3" data-testid="stopwatch-stats">
              <div className="rounded-2xl border bg-primary/5 p-3"><Gauge className="mb-2 size-4 text-primary" /><p className="text-xs text-muted-foreground">จำนวนรอบ</p><p className="mt-1 text-xl font-bold tabular-nums">{stats.count}</p></div>
              <div className="rounded-2xl border bg-primary/5 p-3"><Trophy className="mb-2 size-4 text-primary" /><p className="text-xs text-muted-foreground">รอบล่าสุด</p><p className="mt-1 font-mono text-sm font-bold tabular-nums">{stats.latestMs === null ? "—" : formatStopwatchTime(stats.latestMs)}</p></div>
              <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">เร็วที่สุด</p><p className="mt-1 font-mono text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{stats.fastestMs === null ? "—" : formatStopwatchTime(stats.fastestMs)}</p></div>
              <div className="rounded-2xl border p-3"><p className="text-xs text-muted-foreground">ช้าที่สุด</p><p className="mt-1 font-mono text-sm font-bold tabular-nums text-rose-700 dark:text-rose-300">{stats.slowestMs === null ? "—" : formatStopwatchTime(stats.slowestMs)}</p></div>
              <div className="col-span-2 rounded-2xl border p-3"><p className="text-xs text-muted-foreground">เวลาเฉลี่ยต่อรอบ</p><p className="mt-1 font-mono text-base font-bold tabular-nums">{stats.averageMs === null ? "—" : formatStopwatchTime(stats.averageMs)}</p></div>
            </div>

            <ActionBar>
              <Button type="button" variant="outline" onClick={() => void copyText(buildStopwatchSummary(state, Date.now()), "คัดลอกสรุป Stopwatch แล้ว")}><Clipboard />คัดลอกสรุป</Button>
              <Button type="button" variant="outline" disabled={state.laps.length === 0} onClick={() => downloadText(buildStopwatchCsv(state), "meaw-stopwatch-laps.csv", "text/csv;charset=utf-8")} data-testid="stopwatch-export-csv"><Download />ส่งออก CSV</Button>
            </ActionBar>
          </div>

          <div className="min-w-0 rounded-2xl border bg-background/65 p-4" data-testid="stopwatch-lap-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">Lap และ Split time</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Split คือเวลาของรอบนั้น ส่วน Total คือเวลาสะสมตั้งแต่เริ่ม</p></div>
              <Button type="button" size="sm" variant="ghost" disabled={state.laps.length === 0} onClick={clearLaps}>ล้างรอบ</Button>
            </div>

            {reversedLaps.length === 0 ? (
              <div className="mt-4 grid min-h-56 place-items-center rounded-xl border border-dashed bg-muted/15 p-6 text-center">
                <div><Flag className="mx-auto size-8 text-muted-foreground/55" /><p className="mt-3 font-medium">ยังไม่มีรอบ</p><p className="mt-1 text-sm text-muted-foreground">เริ่ม Stopwatch แล้วกด “จับรอบ” หรือปุ่ม L</p></div>
              </div>
            ) : (
              <div className="mt-4 max-h-[31rem] overflow-auto rounded-xl border" data-testid="stopwatch-lap-list">
                <table className="w-full min-w-[34rem] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground backdrop-blur"><tr><th className="px-3 py-2.5">รอบ</th><th className="px-3 py-2.5 text-right">Split</th><th className="px-3 py-2.5 text-right">Total</th><th className="px-3 py-2.5 text-right">ผล</th></tr></thead>
                  <tbody>{reversedLaps.map(({ lap, number }) => {
                    const fastest = state.laps.length > 1 && lap.splitMs === stats.fastestMs;
                    const slowest = state.laps.length > 1 && lap.splitMs === stats.slowestMs;
                    return <tr key={lap.id} className="border-t" data-testid={`stopwatch-lap-${number}`}><td className="px-3 py-3 font-semibold tabular-nums">#{number}</td><td className="px-3 py-3 text-right font-mono font-semibold tabular-nums">{formatStopwatchTime(lap.splitMs, true)}</td><td className="px-3 py-3 text-right font-mono text-muted-foreground tabular-nums">{formatStopwatchTime(lap.totalMs, true)}</td><td className="px-3 py-3 text-right">{fastest ? <Badge className="bg-emerald-600">เร็วสุด</Badge> : slowest ? <Badge variant="destructive">ช้าสุด</Badge> : "—"}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-right text-xs text-muted-foreground">{state.laps.length}/{STOPWATCH_MAX_LAPS} รอบ</p>
          </div>
        </div>

        {error ? <Alert variant="destructive"><AlertTitle>ตรวจสอบ Stopwatch</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Alert>
          <TimerReset />
          <AlertTitle>ความแม่นยำและการเก็บข้อมูล</AlertTitle>
          <AlertDescription>เวลาคำนวณจาก timestamp จริง จึงกลับมาตรงเมื่อ Browser ลดความถี่ของ Timer ในแท็บเบื้องหลัง แต่ยังอ้างอิงนาฬิกาของอุปกรณ์และไม่ใช่อุปกรณ์จับเวลาที่ผ่านการสอบเทียบ ผลและชื่อ Session เก็บใน localStorage ของ Browser นี้ ไม่ส่งไป Server และอาจหายเมื่อล้าง Site data</AlertDescription>
        </Alert>
      </section>
    </WorkspaceFrame>
  );
}
