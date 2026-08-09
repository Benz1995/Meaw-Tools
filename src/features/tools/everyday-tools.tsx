"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  Copy,
  History,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ActionBar,
  ClearButton,
  ExampleButton,
  WorkspaceFrame,
  copyText,
} from "@/components/tools/tool-controls";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { setMotionOverride, useMotionPreference } from "@/hooks/use-motion-preference";
import {
  convertEraYears,
  getNextWheelRotation,
  parseWheelEntries,
  pickWheelWinner,
  type EraDirection,
} from "@/lib/tools/everyday";

const WHEEL_COLORS = [
  "#2f7d4a",
  "#b64e38",
  "#2b6488",
  "#876313",
  "#6f4e9c",
  "#a94869",
  "#277777",
  "#95532a",
  "#557535",
  "#59579a",
  "#a43f3f",
  "#26745f",
] as const;

const WHEEL_SPIN_DURATION_MS = 4_600;
const WHEEL_MINIMUM_TURNS = 7;

const WHEEL_EXAMPLE = ["มะลิ", "สมชาย", "น้ำฝน", "ต้นกล้า", "พิมพ์", "น้อง Meaw"].join("\n");

function pointOnCircle(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) };
}

function wheelSegmentPath(index: number, count: number) {
  const segmentAngle = 360 / count;
  const start = pointOnCircle(-90 + index * segmentAngle, 47);
  const end = pointOnCircle(-90 + (index + 1) * segmentAngle, 47);
  const largeArc = segmentAngle > 180 ? 1 : 0;
  return `M 50 50 L ${start.x} ${start.y} A 47 47 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function WheelGraphic({
  entries,
  rotation,
  isSpinning,
  motionEnabled,
}: {
  entries: string[];
  rotation: number;
  isSpinning: boolean;
  motionEnabled: boolean;
}) {
  const showLabels = entries.length <= 20;

  return (
    <div
      className={`wheel-stage relative mx-auto aspect-square w-full max-w-[31rem] p-5 sm:p-7 ${isSpinning ? "is-spinning" : ""} ${motionEnabled ? "motion-allowed" : "motion-reduced"}`}
      data-spinning={isSpinning}
    >
      <div className="wheel-glow absolute inset-5 rounded-full sm:inset-7" aria-hidden="true" />
      <div className="wheel-pointer absolute left-1/2 top-0 z-20 -translate-x-1/2 text-3xl leading-none text-primary drop-shadow" aria-hidden="true">▼</div>
      <div
        data-testid="wheel-disc"
        className="wheel-disc relative z-10 size-full rounded-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: motionEnabled ? `${WHEEL_SPIN_DURATION_MS}ms` : "0ms",
        }}
      >
        <svg viewBox="0 0 100 100" className="size-full overflow-visible drop-shadow-lg" role="img" aria-label={`วงล้อสุ่ม ${entries.length} รายการ`}>
          <circle cx="50" cy="50" r="49" className="fill-card stroke-border" strokeWidth="1.5" />
          {entries.map((entry, index) => {
            const middleAngle = -90 + (index + 0.5) * (360 / entries.length);
            const labelPoint = pointOnCircle(middleAngle, 31);
            return (
              <g key={`${entry}-${index}`}>
                <path d={wheelSegmentPath(index, entries.length)} fill={WHEEL_COLORS[index % WHEEL_COLORS.length]} stroke="rgba(255,255,255,0.55)" strokeWidth="0.35">
                  <title>{entry}</title>
                </path>
                {showLabels ? (
                  <text
                    x={labelPoint.x}
                    y={labelPoint.y}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="white"
                    fontSize={entries.length > 12 ? 3.2 : entries.length > 8 ? 4 : 5}
                    fontWeight="700"
                    stroke="rgba(0,0,0,0.34)"
                    strokeWidth="0.65"
                    style={{ paintOrder: "stroke", transformOrigin: `${labelPoint.x}px ${labelPoint.y}px` }}
                  >
                    {entry.length > 13 ? `${entry.slice(0, 12)}…` : entry}
                  </text>
                ) : null}
              </g>
            );
          })}
          <circle cx="50" cy="50" r="9" className="fill-card stroke-primary" strokeWidth="1.5" />
          <text x="50" y="51" dominantBaseline="middle" textAnchor="middle" fontSize="9" aria-hidden="true">🐾</text>
        </svg>
      </div>
    </div>
  );
}

export function RandomWheelTool() {
  const { motionEnabled, motionOverride, prefersReducedMotion } = useMotionPreference();
  const [input, setInput] = useState("");
  const [deduplicate, setDeduplicate] = useState(true);
  const [removeWinner, setRemoveWinner] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const winnerTimer = useRef<number | null>(null);
  const spinFrame = useRef<number | null>(null);

  const entries = useMemo(() => {
    try {
      return parseWheelEntries(input, deduplicate);
    } catch {
      return [];
    }
  }, [deduplicate, input]);

  useEffect(() => () => {
    if (winnerTimer.current !== null) window.clearTimeout(winnerTimer.current);
    if (spinFrame.current !== null) window.cancelAnimationFrame(spinFrame.current);
  }, []);

  const cancelPendingSpin = () => {
    if (winnerTimer.current !== null) window.clearTimeout(winnerTimer.current);
    if (spinFrame.current !== null) window.cancelAnimationFrame(spinFrame.current);
    winnerTimer.current = null;
    spinFrame.current = null;
  };

  const resetResult = () => {
    setWinner("");
    setError("");
  };

  const updateInput = (value: string) => {
    setInput(value);
    resetResult();
  };

  const spin = () => {
    try {
      const activeEntries = parseWheelEntries(input, deduplicate);
      const selected = pickWheelWinner(activeEntries);
      const nextRotation = getNextWheelRotation(
        rotation,
        selected.index,
        activeEntries.length,
        WHEEL_MINIMUM_TURNS,
      );
      cancelPendingSpin();
      setWinner("");
      setError("");
      setIsSpinning(true);

      const finishSpin = () => {
        setWinner(selected.value);
        setHistory((current) => [selected.value, ...current].slice(0, 10));
        if (removeWinner) {
          const remaining = activeEntries.filter((_, index) => index !== selected.index);
          setInput(remaining.join("\n"));
        }
        setIsSpinning(false);
        winnerTimer.current = null;
        toast.success(`ผลการสุ่ม: ${selected.value}`);
      };

      if (!motionEnabled) {
        setRotation(nextRotation);
        winnerTimer.current = window.setTimeout(finishSpin, 80);
        return;
      }

      // Wait for the spinning state to paint before changing the transform.
      // This guarantees a transition even after the wheel has just mounted.
      spinFrame.current = window.requestAnimationFrame(() => {
        spinFrame.current = window.requestAnimationFrame(() => {
          setRotation(nextRotation);
          spinFrame.current = null;
          winnerTimer.current = window.setTimeout(finishSpin, WHEEL_SPIN_DURATION_MS + 120);
        });
      });
    } catch (caught) {
      setWinner("");
      setError(caught instanceof Error ? caught.message : "หมุนวงล้อไม่สำเร็จ");
    }
  };

  const clear = () => {
    cancelPendingSpin();
    setInput("");
    setWinner("");
    setHistory([]);
    setError("");
    setIsSpinning(false);
    setRotation(0);
  };

  return (
    <WorkspaceFrame>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(19rem,0.85fr)_minmax(24rem,1.15fr)]">
        <section aria-labelledby="wheel-entry-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="wheel-entry-heading" className="text-sm font-semibold">รายการบนวงล้อ</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">หนึ่งรายการต่อหนึ่งบรรทัด รองรับ 2–100 รายการ</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{entries.length || 0} รายการ</span>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="wheel-entries">ชื่อ ตัวเลือก หรือของรางวัล</Label>
            <Textarea
              id="wheel-entries"
              value={input}
              onChange={(event) => updateInput(event.target.value)}
              disabled={isSpinning}
              className="min-h-64 resize-y leading-7"
              placeholder={"มะลิ\nสมชาย\nน้ำฝน\nต้นกล้า"}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3">
              <div><Label htmlFor="wheel-deduplicate" className="cursor-pointer">ตัดรายการซ้ำ</Label><p className="mt-1 text-xs text-muted-foreground">ไม่เพิ่มน้ำหนักจากชื่อเดิม</p></div>
              <Switch id="wheel-deduplicate" checked={deduplicate} onCheckedChange={(checked) => { setDeduplicate(checked); resetResult(); }} disabled={isSpinning} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3">
              <div><Label htmlFor="wheel-remove-winner" className="cursor-pointer">นำผู้ชนะออก</Label><p className="mt-1 text-xs text-muted-foreground">เหมาะกับการสุ่มหลายรอบ</p></div>
              <Switch id="wheel-remove-winner" checked={removeWinner} onCheckedChange={setRemoveWinner} disabled={isSpinning} />
            </div>
          </div>

          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

          <div className="mt-4">
            <ActionBar>
              <Button type="button" size="lg" onClick={spin} disabled={isSpinning} aria-label="หมุนวงล้อสุ่ม">
                <RefreshCw className={`size-4 ${isSpinning ? "animate-spin" : ""}`} />
                {isSpinning ? "กำลังหมุน…" : "หมุนวงล้อ"}
              </Button>
              <ExampleButton onExample={() => updateInput(WHEEL_EXAMPLE)} />
              <ClearButton onClear={clear} />
            </ActionBar>
          </div>

          {history.length ? (
            <div className="mt-5 rounded-xl border bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><History className="size-4 text-primary" /><h2 className="text-sm font-semibold">ประวัติการสุ่ม</h2></div>
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => setHistory([])} aria-label="ล้างประวัติการสุ่ม"><Trash2 /></Button>
              </div>
              <ol className="mt-3 flex flex-wrap gap-2">{history.map((item, index) => <li key={`${item}-${index}`} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium">{index + 1}. {item}</li>)}</ol>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-2xl border bg-primary/[0.03] p-3 sm:p-5" aria-labelledby="wheel-result-heading">
          {entries.length >= 2 ? <WheelGraphic entries={entries} rotation={rotation} isSpinning={isSpinning} motionEnabled={motionEnabled} /> : (
            <div className="mx-auto grid aspect-square w-full max-w-[31rem] place-items-center rounded-full border-2 border-dashed bg-muted/10 p-8 text-center">
              <div><Sparkles className="mx-auto size-9 text-primary/60" /><p className="mt-3 text-sm font-medium">เพิ่มอย่างน้อย 2 รายการเพื่อสร้างวงล้อ</p><p className="mt-1 text-xs text-muted-foreground">วงล้อจะอัปเดตตามรายชื่อโดยอัตโนมัติ</p></div>
            </div>
          )}

          {prefersReducedMotion ? (
            <div className="mx-auto mt-3 flex max-w-[31rem] flex-col gap-3 rounded-xl border border-primary/15 bg-card/80 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" data-testid="wheel-motion-control">
              <div className="flex min-w-0 items-start gap-2">
                {motionOverride ? <Play className="mt-0.5 size-4 shrink-0 text-primary" /> : <Pause className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <div>
                  <p className="font-medium">{motionOverride ? "เปิดแอนิเมชันสำหรับ Meaw Tools แล้ว" : "ระบบกำลังลดการเคลื่อนไหว"}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{motionOverride ? "วงล้อและ Meaw จะเคลื่อนไหว แม้ระบบตั้งค่า Reduce motion" : "กดเปิดได้หากต้องการเห็นวงล้อหมุนและ Meaw เดิน"}</p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setMotionOverride(!motionOverride)} disabled={isSpinning}>
                {motionOverride ? <Pause className="size-4" /> : <Play className="size-4" />}
                {motionOverride ? "ลดการเคลื่อนไหว" : "เปิดแอนิเมชัน"}
              </Button>
            </div>
          ) : null}

          <div data-testid="wheel-result" className={`mt-3 min-h-28 rounded-2xl border bg-card/90 p-5 text-center shadow-sm ${winner ? `wheel-result-reveal ${motionEnabled ? "motion-allowed" : "motion-reduced"}` : ""}`} aria-live="polite" aria-atomic="true">
            <p id="wheel-result-heading" className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">ผลการสุ่ม</p>
            {winner ? <p className="mt-2 break-words text-2xl font-black text-primary sm:text-3xl">🎉 {winner}</p> : <p className="mt-3 text-sm text-muted-foreground">{isSpinning ? "วงล้อกำลังเร่งและค่อย ๆ ชะลอ…" : "กดหมุนแล้วผลจะปรากฏตรงนี้"}</p>}
          </div>
        </section>
      </div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">ใช้ Web Crypto เพื่อลดความเอนเอียง เหมาะกับห้องเรียน เกม และกิจกรรมทั่วไป แต่ไม่ใช่ระบบรับรองผลสำหรับการพนันหรือรางวัลมูลค่าสูง</p>
    </WorkspaceFrame>
  );
}

export function BuddhistYearConverterTool() {
  const currentCe = useMemo(() => new Date().getFullYear(), []);
  const [direction, setDirection] = useState<EraDirection>("be-to-ce");
  const [input, setInput] = useState(() => String(new Date().getFullYear() + 543));
  const [results, setResults] = useState<Array<{ source: number; converted: number }>>([]);
  const [error, setError] = useState("");

  const sourceLabel = direction === "be-to-ce" ? "พ.ศ." : "ค.ศ.";
  const targetLabel = direction === "be-to-ce" ? "ค.ศ." : "พ.ศ.";
  const excelFormula = direction === "be-to-ce" ? "=A1-543" : "=A1+543";
  const output = results.map((item) => `${sourceLabel} ${item.source} = ${targetLabel} ${item.converted}`).join("\n");

  const clearResults = () => {
    setResults([]);
    setError("");
  };

  const convert = (nextInput = input, nextDirection = direction) => {
    try {
      const converted = convertEraYears(nextInput, nextDirection);
      setResults(converted);
      setError("");
      toast.success(`แปลงปี ${converted.length} รายการแล้ว`);
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : "แปลงปีไม่สำเร็จ");
    }
  };

  const changeDirection = (value: EraDirection) => {
    setDirection(value);
    clearResults();
  };

  const swap = () => {
    const nextDirection: EraDirection = direction === "be-to-ce" ? "ce-to-be" : "be-to-ce";
    const nextInput = results.length ? results.map((item) => item.converted).join("\n") : input;
    setDirection(nextDirection);
    setInput(nextInput);
    setResults([]);
    setError("");
  };

  const loadExample = () => {
    const example = direction === "be-to-ce" ? "2569\n2568\n2567" : "2026\n2025\n2024";
    setInput(example);
    convert(example, direction);
  };

  return (
    <WorkspaceFrame>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)]">
        <section aria-labelledby="era-settings-heading">
          <h2 id="era-settings-heading" className="mb-4 text-sm font-semibold">ตั้งค่าการแปลงปี</h2>
          <div className="space-y-2">
            <Label htmlFor="era-direction">รูปแบบการแปลง</Label>
            <Select value={direction} onValueChange={(value) => changeDirection(value as EraDirection)}>
              <SelectTrigger id="era-direction" className="h-10 w-full" aria-label="รูปแบบการแปลงปี"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="be-to-ce">พ.ศ. → ค.ศ.</SelectItem>
                <SelectItem value="ce-to-be">ค.ศ. → พ.ศ.</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="era-years">ปีที่ต้องการแปลง</Label>
              <span className="text-xs text-muted-foreground">คั่นด้วยบรรทัด เว้นวรรค หรือ comma</span>
            </div>
            <Textarea
              id="era-years"
              value={input}
              onChange={(event) => { setInput(event.target.value); clearResults(); }}
              className="min-h-48 font-mono text-base leading-7"
              inputMode="numeric"
              placeholder={direction === "be-to-ce" ? "2569\n2568" : "2026\n2025"}
            />
          </div>

          {error ? <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

          <div className="mt-4">
            <ActionBar>
              <Button type="button" onClick={() => convert()}><CalendarDays className="size-4" />แปลงปี</Button>
              <Button type="button" variant="secondary" onClick={swap}><ArrowLeftRight className="size-4" />สลับทิศทาง</Button>
              <ExampleButton onExample={loadExample} />
              <ClearButton onClear={() => { setInput(""); clearResults(); }} />
            </ActionBar>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-primary/[0.04] p-4"><p className="text-xs text-muted-foreground">ปีปัจจุบัน</p><p className="mt-1 text-lg font-bold">พ.ศ. {currentCe + 543}</p><p className="text-sm text-muted-foreground">ตรงกับ ค.ศ. {currentCe}</p></div>
            <div className="rounded-xl border bg-muted/10 p-4"><p className="text-xs text-muted-foreground">สูตร Excel / Sheets</p><div className="mt-1 flex items-center justify-between gap-3"><code className="font-mono text-lg font-bold">{excelFormula}</code><Button type="button" size="icon-sm" variant="ghost" onClick={() => void copyText(excelFormula, "คัดลอกสูตรแล้ว")} aria-label="คัดลอกสูตร Excel"><Copy /></Button></div><p className="mt-1 text-xs text-muted-foreground">เมื่อปีต้นทางอยู่ในเซลล์ A1</p></div>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border bg-muted/10 p-4 sm:p-5" aria-labelledby="era-result-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="era-result-heading" className="text-sm font-semibold">ผลลัพธ์</h2><p className="mt-1 text-xs text-muted-foreground">{sourceLabel} → {targetLabel}</p></div>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyText(output, "คัดลอกผลการแปลงปีแล้ว")} disabled={!results.length}><Copy className="size-4" />คัดลอกทั้งหมด</Button>
          </div>

          {results.length ? (
            <ol data-testid="era-results" className="mt-4 max-h-[31rem] space-y-2 overflow-y-auto pr-1" aria-live="polite">
              {results.map((item, index) => (
                <li key={`${item.source}-${index}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border bg-card p-3 sm:p-4">
                  <div><p className="text-xs text-muted-foreground">{sourceLabel}</p><p className="font-mono text-lg font-bold sm:text-xl">{item.source.toLocaleString("en-US", { useGrouping: false })}</p></div>
                  <ArrowLeftRight className="size-4 text-primary" aria-hidden="true" />
                  <div className="text-right"><p className="text-xs text-muted-foreground">{targetLabel}</p><p className="font-mono text-lg font-black text-primary sm:text-xl">{item.converted.toLocaleString("en-US", { useGrouping: false })}</p></div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-4 grid min-h-72 place-items-center rounded-xl border border-dashed bg-card/50 p-6 text-center">
              <div><CalendarDays className="mx-auto size-8 text-primary/60" /><p className="mt-3 text-sm font-medium">กรอกปีแล้วกด “แปลงปี”</p><p className="mt-1 text-xs text-muted-foreground">รองรับสูงสุด 100 รายการต่อครั้ง</p></div>
            </div>
          )}
        </section>
      </div>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">ใช้หลักการบวกหรือลบ 543 สำหรับเลขปีพุทธศักราชไทยและคริสต์ศักราชทั่วไป วันที่ทางประวัติศาสตร์ก่อนการเปลี่ยนวันขึ้นปีใหม่ของไทย พ.ศ. 2484 ควรตรวจจากแหล่งประวัติศาสตร์เพิ่มเติม</p>
    </WorkspaceFrame>
  );
}
