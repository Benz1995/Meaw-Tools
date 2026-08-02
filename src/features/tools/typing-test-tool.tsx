"use client";

import { CheckCircle2, Gauge, Keyboard, Languages, RefreshCw, ShieldCheck, Timer, Trophy, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateTypingMetrics,
  getTypingPassages,
  truncateToGraphemes,
  type TypingLanguage,
} from "@/lib/tools/typing";

type TestStatus = "idle" | "running" | "finished";

const DURATION_OPTIONS = [
  { value: "15", label: "15 วินาที — วอร์มอัป" },
  { value: "30", label: "30 วินาที — ทดสอบสั้น" },
  { value: "60", label: "60 วินาที — มาตรฐาน" },
  { value: "120", label: "120 วินาที — ฝึกต่อเนื่อง" },
] as const;

function MetricCard({
  label,
  value,
  unit,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "success" | "danger";
  className?: string;
}) {
  const toneClass = tone === "success"
    ? "text-emerald-700 dark:text-emerald-300"
    : tone === "danger"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className={`rounded-xl border bg-background/70 p-3.5 ${className}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}{unit ? <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span> : null}</p>
    </div>
  );
}

export function TypingTestTool() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef(0);
  const [language, setLanguage] = useState<TypingLanguage>("th");
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [passageIndex, setPassageIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState<TestStatus>("idle");

  const passages = getTypingPassages(language);
  const passage = passages[passageIndex % passages.length]!;
  const durationMs = durationSeconds * 1_000;
  const metrics = calculateTypingMetrics(passage.text, typed, elapsedMs, language);
  const remainingSeconds = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1_000));

  useEffect(() => {
    if (status !== "running") return;
    const interval = window.setInterval(() => {
      const nextElapsed = Math.max(0, performance.now() - startTimeRef.current);
      if (nextElapsed >= durationMs) {
        setElapsedMs(durationMs);
        setStatus("finished");
        return;
      }
      setElapsedMs(nextElapsed);
    }, 250);
    return () => window.clearInterval(interval);
  }, [durationMs, status]);

  const resetTest = () => {
    setTyped("");
    setElapsedMs(0);
    setStatus("idle");
    startTimeRef.current = 0;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const changeLanguage = (value: string) => {
    setLanguage(value as TypingLanguage);
    setPassageIndex(0);
    resetTest();
  };

  const changeDuration = (value: string) => {
    setDurationSeconds(Number(value));
    resetTest();
  };

  const loadNextPassage = () => {
    setPassageIndex((current) => (current + 1) % passages.length);
    resetTest();
    toast.success("เปลี่ยนข้อความทดสอบแล้ว");
  };

  const finishTest = (event: MouseEvent<HTMLButtonElement>) => {
    if (status !== "running") return;
    setElapsedMs(Math.min(durationMs, Math.max(0, event.timeStamp - startTimeRef.current)));
    setStatus("finished");
  };

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (status === "finished") return;
    const value = event.target.value;
    const eventTime = event.timeStamp;
    const nextValue = truncateToGraphemes(value.normalize("NFC"), metrics.targetCharacters, language);
    if (status === "idle" && nextValue.length > 0) {
      startTimeRef.current = eventTime;
      setStatus("running");
    }
    setTyped(nextValue);

    const nextMetrics = calculateTypingMetrics(passage.text, nextValue, Math.max(0, eventTime - startTimeRef.current), language);
    if (nextMetrics.completed) {
      setElapsedMs(Math.min(durationMs, Math.max(0, eventTime - startTimeRef.current)));
      setStatus("finished");
    }
  };

  return (
    <WorkspaceFrame>
      <section aria-labelledby="typing-settings-title">
        <div className="flex items-center gap-2">
          <Keyboard className="size-4 text-primary" />
          <h2 id="typing-settings-title" className="text-base font-semibold">ตั้งค่าการทดสอบ</h2>
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <div className="space-y-2.5">
            <Label htmlFor="typing-language">ภาษา</Label>
            <Select value={language} disabled={status === "running"} onValueChange={changeLanguage}>
              <SelectTrigger id="typing-language" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="th">ภาษาไทย</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="typing-duration">ระยะเวลา</Label>
            <Select value={String(durationSeconds)} disabled={status === "running"} onValueChange={changeDuration}>
              <SelectTrigger id="typing-duration" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{DURATION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="typing-passage">ข้อความ</Label>
            <Select
              value={passage.id}
              disabled={status === "running"}
              onValueChange={(value) => {
                setPassageIndex(Math.max(0, passages.findIndex((item) => item.id === value)));
                resetTest();
              }}
            >
              <SelectTrigger id="typing-passage" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{passages.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="mt-6 border-t pt-6" aria-labelledby="typing-target-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">{language === "th" ? "แบบฝึกภาษาไทย" : "English practice"}</p>
            <h2 id="typing-target-title" className="mt-1 font-semibold">{passage.title}</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/20 px-3 py-1.5 text-sm font-semibold tabular-nums" aria-live="polite">
            <Timer className="size-4 text-primary" />
            {remainingSeconds} วินาที
          </div>
        </div>

        <p className="sr-only">ข้อความทดสอบ: {passage.text}</p>
        <div
          className="mt-4 rounded-xl border bg-muted/15 p-4 font-mono text-base leading-8 tracking-wide sm:p-5 sm:text-lg"
          aria-hidden="true"
          data-testid="typing-target"
        >
          {metrics.targetGraphemes.map((character, index) => {
            const typedCharacter = metrics.typedGraphemes[index];
            const state = index < metrics.typedCharacters
              ? typedCharacter === character ? "correct" : "incorrect"
              : index === metrics.typedCharacters ? "current" : "pending";
            const stateClass = state === "correct"
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
              : state === "incorrect"
                ? "bg-destructive/15 text-destructive underline decoration-wavy underline-offset-4"
                : state === "current"
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/50"
                  : "text-muted-foreground";
            return <span key={index} data-state={state} className={`inline-block min-w-[0.35em] rounded-sm ${stateClass}`}>{character === " " ? "\u00a0" : character}</span>;
          })}
        </div>
      </section>

      <section className="mt-5 space-y-2.5" aria-labelledby="typing-input-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label id="typing-input-title" htmlFor="typing-input">พิมพ์ข้อความตามด้านบน</Label>
          <p id="typing-input-help" className="text-xs text-muted-foreground">เริ่มจับเวลาเมื่อพิมพ์ตัวแรก · ปิดการวางข้อความ</p>
        </div>
        <Textarea
          ref={inputRef}
          id="typing-input"
          value={typed}
          disabled={status === "finished"}
          aria-describedby="typing-input-help"
          placeholder={status === "finished" ? "กดเริ่มใหม่เพื่อทดสอบอีกครั้ง" : "เริ่มพิมพ์ที่นี่..."}
          className="min-h-32 resize-y font-mono text-base leading-7"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={handleInput}
          onPaste={(event) => { event.preventDefault(); toast.error("ปิดการวางข้อความเพื่อให้ผลทดสอบสะท้อนการพิมพ์จริง"); }}
          onDrop={(event) => event.preventDefault()}
        />
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="typing-live-metrics">
        <MetricCard label="ความเร็วสุทธิ" value={metrics.wpm} unit="WPM" tone="success" />
        <MetricCard label="ตัวอักษรต่อนาที" value={metrics.cpm} unit="CPM" />
        <MetricCard label="ความแม่นยำ" value={metrics.accuracy.toFixed(1)} unit="%" tone={metrics.accuracy < 90 ? "danger" : "success"} />
        <MetricCard label="ถูกต้อง" value={metrics.correctCharacters} unit="ตัว" tone="success" />
        <MetricCard className="col-span-2 lg:col-span-1" label="ผิดตำแหน่ง" value={metrics.incorrectCharacters} unit="ตัว" tone={metrics.incorrectCharacters ? "danger" : "default"} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>ความคืบหน้า</span><span className="tabular-nums">{metrics.progress.toFixed(1)}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="ความคืบหน้าการพิมพ์" aria-valuemin={0} aria-valuemax={100} aria-valuenow={metrics.progress}>
          <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${metrics.progress}%` }} />
        </div>
      </div>

      <div className="mt-5">
        <ActionBar>
          <Button type="button" onClick={resetTest}><RefreshCw className="size-4" />เริ่มใหม่</Button>
          <Button type="button" variant="outline" onClick={loadNextPassage} disabled={status === "running"}><Languages className="size-4" />เปลี่ยนข้อความ</Button>
          {status === "running" ? <Button type="button" variant="destructive" onClick={finishTest}><XCircle className="size-4" />จบการทดสอบ</Button> : null}
        </ActionBar>
      </div>

      {status === "finished" ? (
        <section className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:p-5" aria-labelledby="typing-result-title" data-testid="typing-result" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><Trophy className="size-5" /></span>
            <div>
              <h2 id="typing-result-title" className="font-semibold text-emerald-800 dark:text-emerald-200">ผลทดสอบ: {metrics.wpm} WPM</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">พิมพ์ถูก {metrics.correctCharacters} ตัว ผิดตำแหน่ง {metrics.incorrectCharacters} ตัว ใน {metrics.elapsedSeconds.toFixed(1)} วินาที · ความแม่นยำ {metrics.accuracy.toFixed(1)}%</p>
            </div>
          </div>
        </section>
      ) : (
        <Alert className="mt-5">
          <Gauge />
          <AlertTitle>{status === "running" ? "กำลังทดสอบ" : "พร้อมเริ่มเมื่อคุณพิมพ์"}</AlertTitle>
          <AlertDescription>{status === "running" ? "พิมพ์ต่อเนื่องจนหมดเวลา หรือกดจบการทดสอบเพื่อดูผลทันที" : "วางนิ้วให้สบาย มองข้อความตัวอย่าง และพยายามรักษาความแม่นยำก่อนเพิ่มความเร็ว"}</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 grid gap-3 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
        <p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />WPM คำนวณจากอักขระที่ถูกต้อง ÷ 5 ÷ นาที ส่วนภาษาไทยเป็นค่าประมาณเพื่อให้เปรียบเทียบรอบฝึกได้</p>
        <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />ข้อความที่พิมพ์ประมวลผลใน Browser ไม่ถูกอัปโหลดหรือบันทึก และผลจะหายเมื่อรีเฟรชหน้า</p>
      </div>
    </WorkspaceFrame>
  );
}
