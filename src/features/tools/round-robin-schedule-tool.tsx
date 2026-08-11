"use client";

import {
  CalendarDays,
  Clock3,
  Copy,
  Download,
  Eraser,
  FileJson,
  ListOrdered,
  MapPin,
  Printer,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Table2,
  Upload,
  UsersRound,
} from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ROUND_ROBIN_MAX_JSON_LENGTH,
  ROUND_ROBIN_MAX_PARTICIPANTS,
  clearRoundRobinMatchScore,
  createRoundRobinSchedule,
  resolveRoundRobinSchedule,
  restoreRoundRobinSchedule,
  roundRobinScheduleCsv,
  roundRobinScheduleIcs,
  roundRobinScheduleSummary,
  serializeRoundRobinSchedule,
  setRoundRobinMatchScore,
  type ResolvedRoundRobinMatch,
  type ResolvedRoundRobinSchedule,
  type RoundRobinFormat,
  type RoundRobinOrderingMode,
  type RoundRobinScheduleState,
} from "@/lib/tools/round-robin-schedule";

const STORAGE_KEY = "meaw-round-robin-schedule-v1";
const EXAMPLE_NAMES = [
  "ทีม Matcha",
  "ทีม Sakura",
  "ทีม Mikan",
  "ทีม Sora",
  "ทีม Yuzu",
  "ทีม Neko",
].join("\n");
const EXAMPLE_COURTS = "สนาม A\nสนาม B";
const THAI_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

type ViewMode = "schedule" | "standings";
type ScoreDraft = { home: string; away: string };

type InitialRoundRobinModel = {
  title: string;
  names: string;
  courts: string;
  format: RoundRobinFormat;
  orderingMode: RoundRobinOrderingMode;
  startDate: string;
  startTime: string;
  matchDuration: string;
  breakMinutes: string;
  winPoints: string;
  drawPoints: string;
  lossPoints: string;
  state: RoundRobinScheduleState | null;
};

function currentLocalDate(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function defaultInitialModel(): InitialRoundRobinModel {
  return {
    title: "Meaw Round Robin League",
    names: "",
    courts: "สนาม 1\nสนาม 2",
    format: "single",
    orderingMode: "ordered",
    startDate: currentLocalDate(),
    startTime: "09:00",
    matchDuration: "30",
    breakMinutes: "10",
    winPoints: "3",
    drawPoints: "1",
    lossPoints: "0",
    state: null,
  };
}

function loadInitialModel(): InitialRoundRobinModel {
  const fallback = defaultInitialModel();
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return fallback;
  try {
    const restored = restoreRoundRobinSchedule(stored);
    return {
      title: restored.title,
      names: restored.participants
        .map((participant) => participant.name)
        .join("\n"),
      courts: restored.settings.courts.join("\n"),
      format: restored.settings.format,
      orderingMode: restored.settings.orderingMode,
      startDate: restored.settings.startDate,
      startTime: restored.settings.startTime,
      matchDuration: String(restored.settings.matchDurationMinutes),
      breakMinutes: String(restored.settings.breakMinutes),
      winPoints: String(restored.settings.winPoints),
      drawPoints: String(restored.settings.drawPoints),
      lossPoints: String(restored.settings.lossPoints),
      state: restored,
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

function cleanPreviewLines(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    const cleaned = line.trim().replace(/\s+/g, " ");
    if (!cleaned) continue;
    const key = cleaned.normalize("NFKC").toLocaleLowerCase("th-TH");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function downloadText(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyText(content: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
    toast.success(message);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("คัดลอกไม่สำเร็จ");
    toast.success(message);
  }
}

function dateParts(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

function displayDate(value: string): string {
  const { date } = dateParts(value);
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return THAI_DATE_FORMATTER.format(new Date(year, month - 1, day));
}

function displayTime(value: string): string {
  return dateParts(value).time;
}

function draftForMatch(
  match: ResolvedRoundRobinMatch,
  scoreDrafts: Record<string, ScoreDraft>,
): ScoreDraft {
  return (
    scoreDrafts[match.id] ?? {
      home: match.score ? String(match.score.homeScore) : "",
      away: match.score ? String(match.score.awayScore) : "",
    }
  );
}

type MatchCardProps = {
  match: ResolvedRoundRobinMatch;
  draft: ScoreDraft;
  onScoreChange: (
    match: ResolvedRoundRobinMatch,
    side: keyof ScoreDraft,
    value: string,
  ) => void;
  onScoreBlur: (match: ResolvedRoundRobinMatch, draft: ScoreDraft) => void;
  onClear: (matchId: string) => void;
};

function MatchCard({
  match,
  draft,
  onScoreChange,
  onScoreBlur,
  onClear,
}: MatchCardProps) {
  return (
    <article
      className="rounded-2xl border bg-card/75 p-3.5 shadow-sm"
      data-testid={`round-robin-match-${match.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">
          M{match.displayNumber}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          {displayTime(match.start)}–{displayTime(match.end)}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{match.court}</span>
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] items-center gap-3 rounded-xl border bg-background/65 px-3 py-2.5">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Home
            </span>
            <span className="block truncate text-sm font-semibold">
              {match.home.name}
            </span>
          </div>
          <div>
            <Label className="sr-only" htmlFor={`${match.id}-home-score`}>
              คะแนน {match.home.name}
            </Label>
            <Input
              id={`${match.id}-home-score`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draft.home}
              onChange={(event) =>
                onScoreChange(match, "home", event.target.value)
              }
              onBlur={() => onScoreBlur(match, draft)}
              className="h-10 text-center font-mono text-base font-bold"
              aria-label={`คะแนน ${match.home.name}`}
              data-testid={`round-robin-score-home-${match.id}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] items-center gap-3 rounded-xl border bg-background/65 px-3 py-2.5">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Away
            </span>
            <span className="block truncate text-sm font-semibold">
              {match.away.name}
            </span>
          </div>
          <div>
            <Label className="sr-only" htmlFor={`${match.id}-away-score`}>
              คะแนน {match.away.name}
            </Label>
            <Input
              id={`${match.id}-away-score`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draft.away}
              onChange={(event) =>
                onScoreChange(match, "away", event.target.value)
              }
              onBlur={() => onScoreBlur(match, draft)}
              className="h-10 text-center font-mono text-base font-bold"
              aria-label={`คะแนน ${match.away.name}`}
              data-testid={`round-robin-score-away-${match.id}`}
            />
          </div>
        </div>
      </div>

      {match.score ? (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            บันทึกผลแล้ว
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onClear(match.id)}
          >
            ล้างคะแนน
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function StandingsTable({
  resolved,
}: {
  resolved: ResolvedRoundRobinSchedule;
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl border bg-card/70"
      role="region"
      tabIndex={0}
      aria-label="ตารางคะแนนที่เลื่อนได้"
      data-testid="round-robin-standings"
    >
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <caption className="sr-only">
          ตารางคะแนนเรียงตามคะแนน ผลต่าง คะแนนได้ และจำนวนชนะ
        </caption>
        <thead className="bg-muted/55 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-3 text-center font-semibold">อันดับ</th>
            <th className="px-3 py-3 text-left font-semibold">ทีม/ผู้เล่น</th>
            <th className="px-3 py-3 text-center font-semibold">แข่ง</th>
            <th className="px-3 py-3 text-center font-semibold">ชนะ</th>
            <th className="px-3 py-3 text-center font-semibold">เสมอ</th>
            <th className="px-3 py-3 text-center font-semibold">แพ้</th>
            <th className="px-3 py-3 text-center font-semibold">ได้</th>
            <th className="px-3 py-3 text-center font-semibold">เสีย</th>
            <th className="px-3 py-3 text-center font-semibold">ผลต่าง</th>
            <th className="px-3 py-3 text-center font-semibold">คะแนน</th>
          </tr>
        </thead>
        <tbody>
          {resolved.standings.map((row) => (
            <tr key={row.participant.id} className="border-t">
              <td className="px-3 py-3 text-center font-mono font-bold">
                {row.position}
              </td>
              <td className="px-3 py-3 font-semibold">
                {row.participant.name}
              </td>
              <td className="px-3 py-3 text-center font-mono">{row.played}</td>
              <td className="px-3 py-3 text-center font-mono">{row.wins}</td>
              <td className="px-3 py-3 text-center font-mono">{row.draws}</td>
              <td className="px-3 py-3 text-center font-mono">{row.losses}</td>
              <td className="px-3 py-3 text-center font-mono">{row.scored}</td>
              <td className="px-3 py-3 text-center font-mono">
                {row.conceded}
              </td>
              <td className="px-3 py-3 text-center font-mono">
                {row.difference > 0 ? `+${row.difference}` : row.difference}
              </td>
              <td className="px-3 py-3 text-center font-mono text-base font-bold text-primary">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoundRobinScheduleTool() {
  const [initial] = useState(loadInitialModel);
  const [title, setTitle] = useState(initial.title);
  const [names, setNames] = useState(initial.names);
  const [courts, setCourts] = useState(initial.courts);
  const [format, setFormat] = useState<RoundRobinFormat>(initial.format);
  const [orderingMode, setOrderingMode] = useState<RoundRobinOrderingMode>(
    initial.orderingMode,
  );
  const [startDate, setStartDate] = useState(initial.startDate);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [matchDuration, setMatchDuration] = useState(initial.matchDuration);
  const [breakMinutes, setBreakMinutes] = useState(initial.breakMinutes);
  const [winPoints, setWinPoints] = useState(initial.winPoints);
  const [drawPoints, setDrawPoints] = useState(initial.drawPoints);
  const [lossPoints, setLossPoints] = useState(initial.lossPoints);
  const [state, setState] = useState<RoundRobinScheduleState | null>(
    initial.state,
  );
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, ScoreDraft>>(
    {},
  );
  const [duplicateCount, setDuplicateCount] = useState({ names: 0, courts: 0 });
  const [view, setView] = useState<ViewMode>("schedule");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewNames = useMemo(() => cleanPreviewLines(names), [names]);
  const previewCourts = useMemo(() => cleanPreviewLines(courts), [courts]);
  const previewMatches =
    previewNames.length < 2
      ? 0
      : ((previewNames.length * (previewNames.length - 1)) / 2) *
        (format === "double" ? 2 : 1);
  const resolved = useMemo(
    () => (state ? resolveRoundRobinSchedule(state) : null),
    [state],
  );

  useEffect(() => {
    if (!state) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      serializeRoundRobinSchedule(state),
    );
  }, [state]);

  const generate = () => {
    try {
      const result = createRoundRobinSchedule({
        title,
        names,
        courts,
        format,
        orderingMode,
        startDate,
        startTime,
        matchDurationMinutes: Number(matchDuration),
        breakMinutes: Number(breakMinutes),
        winPoints: Number(winPoints),
        drawPoints: Number(drawPoints),
        lossPoints: Number(lossPoints),
      });
      setState(result.state);
      setScoreDrafts({});
      setDuplicateCount({
        names: result.duplicateNames.length,
        courts: result.duplicateCourts.length,
      });
      setView("schedule");
      setError("");
      const schedule = resolveRoundRobinSchedule(result.state);
      toast.success(
        `สร้างตาราง ${schedule.totalRounds} รอบ ${schedule.totalMatches} คู่แล้ว`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "สร้างตารางไม่สำเร็จ",
      );
    }
  };

  const updateScore = (
    match: ResolvedRoundRobinMatch,
    side: keyof ScoreDraft,
    value: string,
  ) => {
    if (!/^\d{0,3}$/.test(value)) return;
    const current = draftForMatch(match, scoreDrafts);
    const next = { ...current, [side]: value };
    setScoreDrafts((previous) => ({ ...previous, [match.id]: next }));
    if (!state) return;
    if (!next.home && !next.away) {
      setState((current) =>
        current ? clearRoundRobinMatchScore(current, match.id) : current,
      );
      setError("");
      return;
    }
    if (!next.home || !next.away) {
      if (match.score)
        setState((current) =>
          current ? clearRoundRobinMatchScore(current, match.id) : current,
        );
      return;
    }
    try {
      setState((current) =>
        current
          ? setRoundRobinMatchScore(
              current,
              match.id,
              Number(next.home),
              Number(next.away),
            )
          : current,
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "บันทึกคะแนนไม่สำเร็จ",
      );
    }
  };

  const validateDraft = (match: ResolvedRoundRobinMatch, draft: ScoreDraft) => {
    if ((!draft.home && draft.away) || (draft.home && !draft.away)) {
      setError(
        `M${match.displayNumber}: กรุณากรอกคะแนนทั้งสองฝ่าย หรือเว้นว่างทั้งคู่`,
      );
    }
  };

  const clearScore = (matchId: string) => {
    if (!state) return;
    setState((current) =>
      current ? clearRoundRobinMatchScore(current, matchId) : current,
    );
    setScoreDrafts((previous) => {
      const next = { ...previous };
      delete next[matchId];
      return next;
    });
    setError("");
  };

  const clearAll = () => {
    setTitle("Meaw Round Robin League");
    setNames("");
    setCourts("สนาม 1\nสนาม 2");
    setFormat("single");
    setOrderingMode("ordered");
    setStartDate(currentLocalDate());
    setStartTime("09:00");
    setMatchDuration("30");
    setBreakMinutes("10");
    setWinPoints("3");
    setDrawPoints("1");
    setLossPoints("0");
    setState(null);
    setScoreDrafts({});
    setDuplicateCount({ names: 0, courts: 0 });
    setError("");
    window.localStorage.removeItem(STORAGE_KEY);
    toast.success("ล้างข้อมูลตารางแข่งขันจากอุปกรณ์แล้ว");
  };

  const loadExample = () => {
    setTitle("Meaw Cafe League");
    setNames(EXAMPLE_NAMES);
    setCourts(EXAMPLE_COURTS);
    setFormat("single");
    setOrderingMode("ordered");
    setStartTime("09:00");
    setMatchDuration("25");
    setBreakMinutes("5");
    setWinPoints("3");
    setDrawPoints("1");
    setLossPoints("0");
    setError("");
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > ROUND_ROBIN_MAX_JSON_LENGTH)
        throw new Error("ไฟล์ JSON ใหญ่เกิน 500 KB");
      const restored = restoreRoundRobinSchedule(await file.text());
      setState(restored);
      setTitle(restored.title);
      setNames(
        restored.participants.map((participant) => participant.name).join("\n"),
      );
      setCourts(restored.settings.courts.join("\n"));
      setFormat(restored.settings.format);
      setOrderingMode(restored.settings.orderingMode);
      setStartDate(restored.settings.startDate);
      setStartTime(restored.settings.startTime);
      setMatchDuration(String(restored.settings.matchDurationMinutes));
      setBreakMinutes(String(restored.settings.breakMinutes));
      setWinPoints(String(restored.settings.winPoints));
      setDrawPoints(String(restored.settings.drawPoints));
      setLossPoints(String(restored.settings.lossPoints));
      setScoreDrafts({});
      setDuplicateCount({ names: 0, courts: 0 });
      setError("");
      toast.success("นำเข้าตาราง Round Robin จาก JSON แล้ว");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "นำเข้า JSON ไม่สำเร็จ",
      );
    }
  };

  const progress = resolved
    ? Math.round((resolved.completedMatches / resolved.totalMatches) * 100)
    : 0;

  return (
    <WorkspaceFrame className="overflow-x-hidden">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(21rem,23rem)_minmax(0,1fr)]">
        <form
          className="round-robin-no-print space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
          aria-labelledby="round-robin-form-heading"
        >
          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="round-robin-form-heading"
                  className="font-heading text-lg font-bold"
                >
                  ตั้งค่าลีกและผู้เข้าแข่งขัน
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  ทุกคนพบกันครบ • รองรับผลเสมอและตารางคะแนน
                </p>
              </div>
              <Badge
                variant="secondary"
                data-testid="round-robin-participant-count"
              >
                <UsersRound />
                {previewNames.length}/{ROUND_ROBIN_MAX_PARTICIPANTS}
              </Badge>
            </div>

            <div className="mt-5 space-y-2.5">
              <Label htmlFor="round-robin-title">ชื่อการแข่งขัน</Label>
              <Input
                id="round-robin-title"
                value={title}
                maxLength={80}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="เช่น Meaw Cafe League 2026"
              />
            </div>

            <div className="mt-4 space-y-2.5">
              <Label htmlFor="round-robin-participants">
                ผู้เข้าแข่งขันหรือทีม
              </Label>
              <Textarea
                id="round-robin-participants"
                value={names}
                onChange={(event) => setNames(event.target.value)}
                className="min-h-52 resize-y leading-7"
                placeholder="ทีม Matcha\nทีม Sakura\nทีม Mikan\nทีม Sora"
                aria-describedby="round-robin-participants-hint"
                data-testid="round-robin-names"
              />
              <p
                id="round-robin-participants-hint"
                className="text-xs leading-5 text-muted-foreground"
              >
                หนึ่งชื่อต่อบรรทัด 2–24 รายการ • ตัดชื่อซ้ำโดยไม่สนตัวพิมพ์
              </p>
            </div>

            <div className="mt-4">
              <ActionBar>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={loadExample}
                >
                  <Sparkles />
                  ตัวอย่าง
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={clearAll}
                  disabled={!names && !state}
                >
                  <Eraser />
                  ล้างทั้งหมด
                </Button>
              </ActionBar>
            </div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">รูปแบบและลำดับ</h2>
            <div
              className="mt-4 grid grid-cols-2 gap-2"
              role="group"
              aria-label="รูปแบบ Round Robin"
            >
              <Button
                type="button"
                variant={format === "single" ? "default" : "outline"}
                className="h-auto min-h-16 flex-col gap-1 py-2"
                aria-pressed={format === "single"}
                onClick={() => setFormat("single")}
                data-testid="round-robin-single"
              >
                Single
                <span className="text-[10px] font-normal opacity-75">
                  พบกัน 1 ครั้ง
                </span>
              </Button>
              <Button
                type="button"
                variant={format === "double" ? "default" : "outline"}
                className="h-auto min-h-16 flex-col gap-1 py-2"
                aria-pressed={format === "double"}
                onClick={() => setFormat("double")}
                data-testid="round-robin-double"
              >
                Double
                <span className="text-[10px] font-normal opacity-75">
                  สลับเหย้า–เยือน
                </span>
              </Button>
            </div>

            <div
              className="mt-3 grid grid-cols-2 gap-2"
              role="group"
              aria-label="วิธีเรียงผู้เข้าแข่งขัน"
            >
              <Button
                type="button"
                variant={orderingMode === "ordered" ? "secondary" : "outline"}
                className="h-auto min-h-16 flex-col gap-1 py-2"
                aria-pressed={orderingMode === "ordered"}
                onClick={() => setOrderingMode("ordered")}
              >
                <ListOrdered />
                ตามรายชื่อ
              </Button>
              <Button
                type="button"
                variant={orderingMode === "random" ? "secondary" : "outline"}
                className="h-auto min-h-16 flex-col gap-1 py-2"
                aria-pressed={orderingMode === "random"}
                onClick={() => setOrderingMode("random")}
              >
                <Shuffle />
                สุ่ม Web Crypto
              </Button>
            </div>
            <p className="mt-3 rounded-xl bg-muted/35 px-3 py-2 text-xs leading-5 text-muted-foreground">
              ตัวอย่างปัจจุบันจะสร้าง {previewMatches.toLocaleString("th-TH")}{" "}
              คู่
              {previewNames.length % 2 === 1
                ? " และแต่ละทีมพัก 1 รอบต่อเลก"
                : ""}
            </p>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">สนามและเวลา</h2>
            <div className="mt-4 space-y-2.5">
              <Label htmlFor="round-robin-courts">
                สนามหรือพื้นที่พร้อมใช้
              </Label>
              <Textarea
                id="round-robin-courts"
                value={courts}
                onChange={(event) => setCourts(event.target.value)}
                className="min-h-24 resize-y leading-7"
                placeholder="สนาม 1\nสนาม 2"
                aria-describedby="round-robin-courts-hint"
              />
              <p
                id="round-robin-courts-hint"
                className="text-xs leading-5 text-muted-foreground"
              >
                {previewCourts.length}/8 สนาม •
                ระบบแบ่งคู่ในรอบเดียวกันเป็นช่วงเวลาเมื่อสนามไม่พอ
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-date">วันที่เริ่ม</Label>
                <Input
                  id="round-robin-date"
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-time">เวลาเริ่ม</Label>
                <Input
                  id="round-robin-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-duration">นาทีต่อคู่</Label>
                <Input
                  id="round-robin-duration"
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={matchDuration}
                  onChange={(event) => setMatchDuration(event.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-break">พักระหว่างช่วง (นาที)</Label>
                <Input
                  id="round-robin-break"
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  value={breakMinutes}
                  onChange={(event) => setBreakMinutes(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">กติกาคะแนน</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-win-points">ชนะ</Label>
                <Input
                  id="round-robin-win-points"
                  type="number"
                  min={0}
                  max={20}
                  value={winPoints}
                  onChange={(event) => setWinPoints(event.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-draw-points">เสมอ</Label>
                <Input
                  id="round-robin-draw-points"
                  type="number"
                  min={0}
                  max={20}
                  value={drawPoints}
                  onChange={(event) => setDrawPoints(event.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="round-robin-loss-points">แพ้</Label>
                <Input
                  id="round-robin-loss-points"
                  type="number"
                  min={0}
                  max={20}
                  value={lossPoints}
                  onChange={(event) => setLossPoints(event.target.value)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              อันดับเรียงตามคะแนน → ผลต่าง → คะแนนได้ → จำนวนชนะ → ชื่อ
              โดยยังไม่ใช้ Head-to-head
            </p>
            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>ยังดำเนินการไม่ได้</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="mt-5 h-12 w-full"
              data-testid="round-robin-generate"
            >
              <CalendarDays />
              สร้างตารางแข่งขัน
            </Button>
          </section>

          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
            <AlertTitle>ฉบับร่างอยู่ใน Browser เครื่องนี้</AlertTitle>
            <AlertDescription>
              รายชื่อและคะแนนไม่ถูกส่งไป API หรือ Server
              ระบบบันทึกอัตโนมัติในอุปกรณ์นี้เท่านั้น ส่วนไฟล์ ICS ใช้เวลาแบบ
              Local เพื่อให้ Calendar ตีความตามเวลาของผู้เปิดไฟล์
            </AlertDescription>
          </Alert>
        </form>

        <section
          className="min-w-0 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5"
          aria-label="ตารางการแข่งขันแบบพบกันหมด"
        >
          {resolved ? (
            <div
              className="round-robin-print-surface"
              data-testid="round-robin-results"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="secondary">
                    <CalendarDays />
                    {resolved.state.settings.format === "double"
                      ? "Double Round Robin"
                      : "Single Round Robin"}
                  </Badge>
                  <h2 className="mt-2 truncate font-heading text-xl font-bold sm:text-2xl">
                    {resolved.state.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resolved.state.participants.length} คน/ทีม •{" "}
                    {resolved.totalRounds} รอบ • {resolved.totalMatches} คู่ •{" "}
                    {resolved.state.settings.courts.length} สนาม
                  </p>
                </div>
                <div className="round-robin-no-print">
                  <ActionBar>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void copyText(
                          roundRobinScheduleSummary(resolved),
                          "คัดลอกตารางแข่งขันแล้ว",
                        )
                      }
                      data-testid="round-robin-copy"
                    >
                      <Copy />
                      คัดลอก
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadText(
                          roundRobinScheduleCsv(resolved),
                          "meaw-round-robin-schedule.csv",
                          "text/csv;charset=utf-8",
                        )
                      }
                      data-testid="round-robin-csv"
                    >
                      <Download />
                      CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadText(
                          roundRobinScheduleIcs(resolved),
                          "meaw-round-robin-schedule.ics",
                          "text/calendar;charset=utf-8",
                        )
                      }
                      data-testid="round-robin-ics"
                    >
                      <CalendarDays />
                      ICS
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadText(
                          serializeRoundRobinSchedule(resolved.state),
                          "meaw-round-robin-schedule.json",
                          "application/json;charset=utf-8",
                        )
                      }
                      data-testid="round-robin-json"
                    >
                      <FileJson />
                      JSON
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="sr-only"
                      onChange={(event) => void importJson(event)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload />
                      นำเข้า
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                      data-testid="round-robin-print"
                    >
                      <Printer />
                      พิมพ์/PDF
                    </Button>
                    <Button type="button" size="sm" onClick={generate}>
                      <RefreshCw />
                      สร้างใหม่
                    </Button>
                  </ActionBar>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-card/70 p-3">
                  <p className="text-xs text-muted-foreground">ความคืบหน้า</p>
                  <p
                    className="mt-1 font-mono text-lg font-bold"
                    data-testid="round-robin-progress"
                  >
                    {resolved.completedMatches}/{resolved.totalMatches} คู่
                  </p>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="ความคืบหน้าการแข่งขัน"
                    aria-valuemin={0}
                    aria-valuemax={resolved.totalMatches}
                    aria-valuenow={resolved.completedMatches}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border bg-card/70 p-3">
                  <p className="text-xs text-muted-foreground">เริ่มแข่งขัน</p>
                  <p className="mt-1 text-sm font-semibold">
                    {displayDate(resolved.rounds[0]?.start ?? "")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayTime(resolved.rounds[0]?.start ?? "")} น.
                  </p>
                </div>
                <div className="rounded-xl border bg-card/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    สิ้นสุดโดยประมาณ
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {displayDate(resolved.estimatedEnd)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayTime(resolved.estimatedEnd)} น.
                  </p>
                </div>
                <div className="rounded-xl border bg-card/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    รายการที่ตัดออก
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold">
                    ชื่อ {duplicateCount.names} • สนาม {duplicateCount.courts}
                  </p>
                </div>
              </div>

              <div
                className="round-robin-no-print mt-5 grid grid-cols-2 gap-2 rounded-xl border bg-card/55 p-1.5"
                role="group"
                aria-label="เลือกมุมมองผลการแข่งขัน"
              >
                <Button
                  type="button"
                  variant={view === "schedule" ? "default" : "ghost"}
                  aria-pressed={view === "schedule"}
                  onClick={() => setView("schedule")}
                  data-testid="round-robin-view-schedule"
                >
                  <CalendarDays />
                  ตารางแข่งขัน
                </Button>
                <Button
                  type="button"
                  variant={view === "standings" ? "default" : "ghost"}
                  aria-pressed={view === "standings"}
                  onClick={() => setView("standings")}
                  data-testid="round-robin-view-standings"
                >
                  <Table2 />
                  ตารางคะแนน
                </Button>
              </div>

              <div className="mt-5">
                {view === "standings" ? (
                  <>
                    <StandingsTable resolved={resolved} />
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      เมื่อคะแนนและสถิติเท่ากัน ระบบให้ตำแหน่งร่วมกัน
                      แม้ชื่อจะแสดงตามลำดับอักษร ควรกำหนดกติกา Head-to-head หรือ
                      Playoff แยกก่อนประกาศผลทางการ
                    </p>
                  </>
                ) : (
                  <div className="space-y-5" data-testid="round-robin-rounds">
                    {resolved.rounds.map((round) => (
                      <section
                        key={round.number}
                        className="rounded-2xl border bg-background/35 p-3.5 sm:p-4"
                        style={{
                          contentVisibility: "auto",
                          containIntrinsicSize: "360px",
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-heading text-base font-bold">
                              รอบ {round.number}
                              {round.leg === 2 ? " • เลก 2" : ""}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {displayDate(round.start)} •{" "}
                              {displayTime(round.start)}–
                              {displayTime(round.end)} น.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {round.matches.length} คู่
                            </Badge>
                            {round.bye ? (
                              <Badge variant="secondary">
                                พัก: {round.bye.name}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                          {round.matches.map((match) => {
                            const draft = draftForMatch(match, scoreDrafts);
                            return (
                              <MatchCard
                                key={match.id}
                                match={match}
                                draft={draft}
                                onScoreChange={updateScore}
                                onScoreBlur={validateDraft}
                                onClear={clearScore}
                              />
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="grid min-h-[42rem] place-items-center rounded-2xl border border-dashed bg-card/45 p-6 text-center"
              data-testid="round-robin-empty-state"
            >
              <div className="max-w-md">
                <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
                  <CalendarDays className="size-10" />
                </span>
                <h2 className="mt-5 font-heading text-xl font-bold">
                  พร้อมสร้างตารางพบกันหมด
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  ใส่รายชื่อ สนาม และเวลา
                  ระบบจะจัดทุกคู่โดยไม่ให้คนหรือทีมเดียวกันแข่งพร้อมกัน
                  พร้อมบันทึกผลและคำนวณอันดับ
                </p>
                <div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-xl border bg-background/65 p-3">
                    ⚽ ลีกกีฬา
                  </div>
                  <div className="rounded-xl border bg-background/65 p-3">
                    🎮 อีสปอร์ต
                  </div>
                  <div className="rounded-xl border bg-background/65 p-3">
                    🎓 ห้องเรียน
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}
