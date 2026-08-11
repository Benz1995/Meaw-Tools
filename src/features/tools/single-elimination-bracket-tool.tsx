"use client";

import {
  CheckCircle2,
  CircleDashed,
  Copy,
  Crown,
  Download,
  Eraser,
  FileJson,
  ListOrdered,
  Medal,
  Printer,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trophy,
  Upload,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import {
  ActionBar,
  copyText,
  downloadText,
  WorkspaceFrame,
} from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  BRACKET_MAX_JSON_LENGTH,
  BRACKET_MAX_PARTICIPANTS,
  BRACKET_MAX_TITLE_LENGTH,
  clearBracketMatchOutcome,
  createSingleEliminationBracket,
  parseBracketParticipants,
  resolveSingleEliminationBracket,
  restoreSingleEliminationBracket,
  serializeSingleEliminationBracket,
  setBracketMatchWinner,
  singleEliminationBracketCsv,
  singleEliminationBracketSummary,
} from "@/lib/tools/single-elimination-bracket";
import type {
  BracketSeedingMode,
  BracketSlot,
  ResolvedBracketMatch,
  ResolvedSingleEliminationBracket,
  SingleEliminationBracketState,
} from "@/lib/tools/single-elimination-bracket";

const STORAGE_KEY = "meaw-single-elimination-bracket-v1";
const EXAMPLE_NAMES = [
  "ทีม Matcha",
  "ทีม Sakura",
  "ทีม Mikan",
  "ทีม Sora",
  "ทีม Yuzu",
  "ทีม Momo",
  "ทีม Neko",
  "ทีม Fuji",
].join("\n");

type ScoreDrafts = Record<string, { score1: string; score2: string }>;

type InitialBracketDraft = {
  state: SingleEliminationBracketState | null;
  title: string;
  names: string;
  seedingMode: BracketSeedingMode;
  thirdPlaceEnabled: boolean;
  invalidSavedDraft: boolean;
};

function readInitialBracketDraft(): InitialBracketDraft {
  const emptyDraft: InitialBracketDraft = {
    state: null,
    title: "การแข่งขัน Meaw Cup",
    names: "",
    seedingMode: "seeded",
    thirdPlaceEnabled: true,
    invalidSavedDraft: false,
  };
  if (typeof window === "undefined") return emptyDraft;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyDraft;
    const restored = restoreSingleEliminationBracket(saved);
    return {
      state: restored,
      title: restored.title,
      names: restored.participants
        .map((participant) => participant.name)
        .join("\n"),
      seedingMode: restored.seedingMode,
      thirdPlaceEnabled: restored.thirdPlaceEnabled,
      invalidSavedDraft: false,
    };
  } catch {
    return { ...emptyDraft, invalidSavedDraft: true };
  }
}

function slotLabel(slot: BracketSlot): string {
  if (slot.participant) return slot.participant.name;
  if (slot.status === "bye") return "BYE";
  return slot.sourceLabel;
}

function scoreValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function BracketSlotRow({
  match,
  slot,
  side,
  draft,
  onDraftChange,
  onWinner,
}: {
  match: ResolvedBracketMatch;
  slot: BracketSlot;
  side: 1 | 2;
  draft: { score1: string; score2: string };
  onDraftChange: (side: 1 | 2, value: string) => void;
  onWinner: (participantId: string) => void;
}) {
  const participant = slot.participant;
  const isReady =
    match.slot1.status === "ready" && match.slot2.status === "ready";
  const isWinner = participant?.id === match.winner?.id;
  const score = side === 1 ? draft.score1 : draft.score2;
  return (
    <div
      className={`grid min-h-12 grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors ${isWinner ? "border-primary/50 bg-primary/10" : "bg-background/60"}`}
    >
      {participant ? (
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left disabled:cursor-default disabled:opacity-80"
          disabled={!isReady}
          aria-pressed={Boolean(match.outcome && isWinner)}
          aria-label={`เลือก ${participant.name} เป็นผู้ชนะ M${match.displayNumber}`}
          data-testid={`winner-${match.id}-${participant.id}`}
          onClick={() => onWinner(participant.id)}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[0.6875rem] font-bold text-muted-foreground">
            {participant.seed}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {participant.name}
          </span>
          {isWinner ? (
            <CheckCircle2
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : null}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2 px-1 py-1 text-muted-foreground">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-[0.625rem] font-bold">
            {slot.status === "bye" ? "BYE" : "…"}
          </span>
          <span className="truncate text-xs">{slotLabel(slot)}</span>
        </div>
      )}
      {participant && isReady ? (
        <div>
          <Label className="sr-only" htmlFor={`score-${match.id}-${side}`}>
            คะแนน {participant.name}
          </Label>
          <Input
            id={`score-${match.id}-${side}`}
            type="number"
            inputMode="numeric"
            min="0"
            max="999"
            step="1"
            value={score}
            onChange={(event) => onDraftChange(side, event.target.value)}
            className="h-8 px-2 text-center font-mono text-xs"
            data-testid={`score-${match.id}-${side}`}
          />
        </div>
      ) : (
        <span className="text-center text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

function BracketMatchCard({
  match,
  draft,
  onDraftChange,
  onWinner,
  onClear,
}: {
  match: ResolvedBracketMatch;
  draft: { score1: string; score2: string };
  onDraftChange: (side: 1 | 2, value: string) => void;
  onWinner: (participantId: string) => void;
  onClear: () => void;
}) {
  return (
    <article
      className="rounded-2xl border bg-card/85 p-3 shadow-sm"
      data-testid={`bracket-match-${match.id}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6875rem] font-bold text-muted-foreground">
          M{match.displayNumber}
        </span>
        {match.autoAdvanced ? (
          <Badge variant="outline">ผ่าน BYE</Badge>
        ) : match.outcome ? (
          <Badge variant="secondary">บันทึกผลแล้ว</Badge>
        ) : (
          <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
            <CircleDashed className="size-3" />
            รอผล
          </span>
        )}
      </div>
      <div className="space-y-2">
        <BracketSlotRow
          match={match}
          slot={match.slot1}
          side={1}
          draft={draft}
          onDraftChange={onDraftChange}
          onWinner={onWinner}
        />
        <BracketSlotRow
          match={match}
          slot={match.slot2}
          side={2}
          draft={draft}
          onDraftChange={onDraftChange}
          onWinner={onWinner}
        />
      </div>
      {match.outcome ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
          onClick={onClear}
          aria-label={`ล้างผล M${match.displayNumber}`}
        >
          ล้างผลคู่นี้
        </button>
      ) : null}
    </article>
  );
}

function BracketBoard({
  resolved,
  scoreDrafts,
  onDraftChange,
  onWinner,
  onClearMatch,
}: {
  resolved: ResolvedSingleEliminationBracket;
  scoreDrafts: ScoreDrafts;
  onDraftChange: (matchId: string, side: 1 | 2, value: string) => void;
  onWinner: (match: ResolvedBracketMatch, participantId: string) => void;
  onClearMatch: (matchId: string) => void;
}) {
  const firstRoundMatchCount = resolved.rounds[0]?.matches.length ?? 1;
  const draftFor = (match: ResolvedBracketMatch) =>
    scoreDrafts[match.id] ?? {
      score1:
        match.outcome?.score1 === null || match.outcome?.score1 === undefined
          ? ""
          : String(match.outcome.score1),
      score2:
        match.outcome?.score2 === null || match.outcome?.score2 === undefined
          ? ""
          : String(match.outcome.score2),
    };
  return (
    <div
      className="max-w-full overflow-x-auto overscroll-x-contain pb-3"
      data-testid="bracket-board"
    >
      <div
        className="grid items-stretch gap-5"
        style={{
          gridTemplateColumns: `repeat(${resolved.rounds.length}, minmax(12.5rem, 1fr))`,
          minHeight: `${Math.max(34, firstRoundMatchCount * 9)}rem`,
          minWidth: `${Math.max(1, resolved.rounds.length) * 12.5 + Math.max(0, resolved.rounds.length - 1) * 1.25}rem`,
        }}
      >
        {resolved.rounds.map((round) => (
          <section
            key={round.index}
            className="flex min-w-0 flex-col"
            aria-labelledby={`bracket-round-${round.index}`}
          >
            <div className="mb-3 flex items-center justify-between gap-2 border-b pb-2">
              <h3
                id={`bracket-round-${round.index}`}
                className="font-heading text-sm font-bold"
              >
                {round.label}
              </h3>
              <Badge variant="outline">{round.matches.length} คู่</Badge>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-4">
              {round.matches.map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  draft={draftFor(match)}
                  onDraftChange={(side, value) =>
                    onDraftChange(match.id, side, value)
                  }
                  onWinner={(participantId) => onWinner(match, participantId)}
                  onClear={() => onClearMatch(match.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {resolved.thirdPlaceMatch ? (
        <section
          className="mt-5 max-w-sm rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3"
          aria-labelledby="third-place-heading"
          data-testid="third-place-section"
        >
          <div className="mb-3 flex items-center gap-2">
            <Medal className="size-4 text-amber-700 dark:text-amber-300" />
            <h3
              id="third-place-heading"
              className="font-heading text-sm font-bold"
            >
              ชิงอันดับ 3
            </h3>
          </div>
          <BracketMatchCard
            match={resolved.thirdPlaceMatch}
            draft={draftFor(resolved.thirdPlaceMatch)}
            onDraftChange={(side, value) =>
              onDraftChange(
                resolved.thirdPlaceMatch?.id ?? "third-place",
                side,
                value,
              )
            }
            onWinner={(participantId) =>
              resolved.thirdPlaceMatch &&
              onWinner(resolved.thirdPlaceMatch, participantId)
            }
            onClear={() => onClearMatch("third-place")}
          />
        </section>
      ) : null}
    </div>
  );
}

export function SingleEliminationBracketTool() {
  const [initialDraft] = useState(readInitialBracketDraft);
  const [title, setTitle] = useState(initialDraft.title);
  const [names, setNames] = useState(initialDraft.names);
  const [seedingMode, setSeedingMode] = useState<BracketSeedingMode>(
    initialDraft.seedingMode,
  );
  const [thirdPlaceEnabled, setThirdPlaceEnabled] = useState(
    initialDraft.thirdPlaceEnabled,
  );
  const [state, setState] = useState<SingleEliminationBracketState | null>(
    initialDraft.state,
  );
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDrafts>({});
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    try {
      return parseBracketParticipants(names);
    } catch {
      return { names: [], duplicateNames: [] };
    }
  }, [names]);
  const resolved = useMemo(
    () => (state ? resolveSingleEliminationBracket(state) : null),
    [state],
  );

  useEffect(() => {
    if (initialDraft.invalidSavedDraft) {
      window.localStorage.removeItem(STORAGE_KEY);
      toast.error("ฉบับร่างเดิมเสียหาย จึงล้างออกเพื่อเริ่มใหม่");
    }
  }, [initialDraft.invalidSavedDraft]);

  useEffect(() => {
    if (!state) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        serializeSingleEliminationBracket(state),
      );
    } catch {
      toast.error(
        "บันทึกฉบับร่างใน Browser ไม่สำเร็จ โปรดดาวน์โหลด JSON สำรอง",
      );
    }
  }, [state]);

  const invalidateBracket = () => {
    setState(null);
    setScoreDrafts({});
    setDuplicateCount(0);
    setError("");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const generate = () => {
    try {
      const created = createSingleEliminationBracket({
        title,
        names,
        seedingMode,
        thirdPlaceEnabled,
      });
      setState(created.state);
      setDuplicateCount(created.duplicateNames.length);
      setScoreDrafts({});
      setError("");
      toast.success(
        `สร้างสายแข่ง ${created.state.participants.length} คน/ทีมแล้ว`,
      );
    } catch (caught) {
      setState(null);
      setError(
        caught instanceof Error ? caught.message : "สร้างสายแข่งขันไม่สำเร็จ",
      );
    }
  };

  const updateDraft = (matchId: string, side: 1 | 2, value: string) => {
    setScoreDrafts((current) => {
      const previous = current[matchId] ?? { score1: "", score2: "" };
      return {
        ...current,
        [matchId]: { ...previous, [side === 1 ? "score1" : "score2"]: value },
      };
    });
  };

  const selectWinner = (match: ResolvedBracketMatch, participantId: string) => {
    if (!state) return;
    const draft = scoreDrafts[match.id] ?? {
      score1:
        match.outcome?.score1 === null || match.outcome?.score1 === undefined
          ? ""
          : String(match.outcome.score1),
      score2:
        match.outcome?.score2 === null || match.outcome?.score2 === undefined
          ? ""
          : String(match.outcome.score2),
    };
    try {
      const next = setBracketMatchWinner(
        state,
        match.id,
        participantId,
        scoreValue(draft.score1),
        scoreValue(draft.score2),
      );
      setState(next);
      setScoreDrafts({});
      setError("");
      toast.success(`บันทึกผู้ชนะ M${match.displayNumber} แล้ว`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกผลไม่สำเร็จ");
    }
  };

  const clearMatch = (matchId: string) => {
    if (!state) return;
    setState(clearBracketMatchOutcome(state, matchId));
    setScoreDrafts({});
    setError("");
    toast.info("ล้างผลคู่นี้และผลรอบถัดไปที่เกี่ยวข้องแล้ว");
  };

  const clearAll = () => {
    setTitle("การแข่งขัน Meaw Cup");
    setNames("");
    setSeedingMode("seeded");
    setThirdPlaceEnabled(true);
    setState(null);
    setDuplicateCount(0);
    setScoreDrafts({});
    setError("");
    window.localStorage.removeItem(STORAGE_KEY);
    toast.info("ล้างรายชื่อ ผลการแข่งขัน และฉบับร่างแล้ว");
  };

  const loadExample = () => {
    setTitle("Meaw Cafe Championship");
    setNames(EXAMPLE_NAMES);
    setSeedingMode("seeded");
    setThirdPlaceEnabled(true);
    invalidateBracket();
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > BRACKET_MAX_JSON_LENGTH)
        throw new Error("ไฟล์ JSON ใหญ่เกิน 200 KB");
      const restored = restoreSingleEliminationBracket(await file.text());
      setState(restored);
      setTitle(restored.title);
      setNames(
        restored.participants.map((participant) => participant.name).join("\n"),
      );
      setSeedingMode(restored.seedingMode);
      setThirdPlaceEnabled(restored.thirdPlaceEnabled);
      setDuplicateCount(0);
      setScoreDrafts({});
      setError("");
      toast.success("นำเข้าสายแข่งขันจาก JSON แล้ว");
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
          className="single-elimination-no-print space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
          aria-labelledby="bracket-form-heading"
        >
          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="bracket-form-heading"
                  className="font-heading text-lg font-bold"
                >
                  ตั้งค่าสายแข่งขัน
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Single Elimination • แพ้ครั้งเดียวตกรอบ
                </p>
              </div>
              <Badge
                variant="secondary"
                data-testid="bracket-participant-count"
              >
                <UsersRound />
                {preview.names.length}/{BRACKET_MAX_PARTICIPANTS}
              </Badge>
            </div>
            <div className="mt-5 space-y-2.5">
              <Label htmlFor="bracket-title">ชื่อการแข่งขัน</Label>
              <Input
                id="bracket-title"
                value={title}
                maxLength={BRACKET_MAX_TITLE_LENGTH}
                onChange={(event) => {
                  setTitle(event.target.value);
                  invalidateBracket();
                }}
                placeholder="เช่น Meaw Cup 2026"
                data-testid="bracket-title"
              />
            </div>
            <div className="mt-4 space-y-2.5">
              <Label htmlFor="bracket-participants">
                ผู้เข้าแข่งขันหรือทีม
              </Label>
              <Textarea
                id="bracket-participants"
                value={names}
                onChange={(event) => {
                  setNames(event.target.value);
                  invalidateBracket();
                }}
                className="min-h-64 resize-y leading-7"
                placeholder="ทีม Matcha\nทีม Sakura\nทีม Mikan\nทีม Sora"
                aria-describedby="bracket-participants-hint"
                data-testid="bracket-names"
              />
              <p
                id="bracket-participants-hint"
                className="text-xs leading-5 text-muted-foreground"
              >
                หนึ่งชื่อต่อหนึ่งบรรทัด 2–32 รายการ •
                ตัดชื่อซ้ำโดยไม่สนตัวพิมพ์เล็ก–ใหญ่
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
            <h2 className="font-heading text-lg font-bold">ลำดับ Seed</h2>
            <div
              className="mt-4 grid grid-cols-2 gap-2"
              role="group"
              aria-label="วิธีจัดลำดับ Seed"
            >
              <Button
                type="button"
                variant={seedingMode === "seeded" ? "default" : "outline"}
                className="h-auto min-h-16 flex-col gap-1 py-2"
                aria-pressed={seedingMode === "seeded"}
                data-testid="bracket-seeded"
                onClick={() => {
                  setSeedingMode("seeded");
                  invalidateBracket();
                }}
              >
                <ListOrdered />
                ตามลำดับชื่อ
                <span className="text-[10px] font-normal opacity-75">
                  บรรทัดแรกคือ Seed 1
                </span>
              </Button>
              <Button
                type="button"
                variant={seedingMode === "random" ? "default" : "outline"}
                className="h-auto min-h-16 flex-col gap-1 py-2"
                aria-pressed={seedingMode === "random"}
                data-testid="bracket-random"
                onClick={() => {
                  setSeedingMode("random");
                  invalidateBracket();
                }}
              >
                <Shuffle />
                สุ่ม Seed
                <span className="text-[10px] font-normal opacity-75">
                  ใช้ Web Crypto
                </span>
              </Button>
            </div>
            <label className="mt-4 flex min-h-16 items-center justify-between gap-4 rounded-xl border bg-muted/10 px-4 py-3 text-sm">
              <span>
                <span className="block font-medium">เพิ่มรอบชิงอันดับ 3</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  ใช้ผู้แพ้จากรอบรองชนะเลิศ • ต้องมีอย่างน้อย 4 รายการ
                </span>
              </span>
              <Switch
                checked={thirdPlaceEnabled}
                onCheckedChange={(checked) => {
                  setThirdPlaceEnabled(checked);
                  invalidateBracket();
                }}
                aria-label="เพิ่มรอบชิงอันดับ 3"
                data-testid="bracket-third-place-toggle"
              />
            </label>
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
              data-testid="bracket-generate"
            >
              <Trophy />
              สร้างสายแข่งขัน
            </Button>
          </section>

          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="text-emerald-700 dark:text-emerald-300" />
            <AlertTitle>ฉบับร่างอยู่ใน Browser เครื่องนี้</AlertTitle>
            <AlertDescription>
              รายชื่อและผลไม่ถูกส่งไป API หรือ Server
              ระบบบันทึกฉบับร่างอัตโนมัติในอุปกรณ์นี้เท่านั้น ใช้ JSON
              เมื่อต้องสำรองหรือย้ายเครื่อง และกด “ล้างทั้งหมด” เพื่อลบข้อมูล
            </AlertDescription>
          </Alert>
        </form>

        <section
          className="min-w-0 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5"
          aria-label="สายการแข่งขัน"
        >
          {resolved ? (
            <div
              className="single-elimination-print-surface"
              data-testid="bracket-results"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="secondary">
                    <Trophy />
                    Single Elimination
                  </Badge>
                  <h2 className="mt-2 truncate font-heading text-xl font-bold sm:text-2xl">
                    {resolved.state.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {resolved.state.participants.length} คน/ทีม • สาย{" "}
                    {resolved.bracketSize} ช่อง • {resolved.rounds.length} รอบ •
                    BYE {resolved.byeCount}
                  </p>
                </div>
                <div className="single-elimination-no-print">
                  <ActionBar>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void copyText(
                          singleEliminationBracketSummary(resolved),
                          "คัดลอกสายแข่งขันแล้ว",
                        )
                      }
                      data-testid="bracket-copy"
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
                          singleEliminationBracketCsv(resolved),
                          "meaw-single-elimination-bracket.csv",
                          "text/csv;charset=utf-8",
                        )
                      }
                      data-testid="bracket-csv"
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
                          serializeSingleEliminationBracket(resolved.state),
                          "meaw-single-elimination-bracket.json",
                          "application/json;charset=utf-8",
                        )
                      }
                      data-testid="bracket-json"
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
                      data-testid="bracket-import-input"
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
                      data-testid="bracket-print"
                    >
                      <Printer />
                      พิมพ์/PDF
                    </Button>
                    <Button type="button" size="sm" onClick={generate}>
                      <RotateCcw />
                      จัดสายใหม่
                    </Button>
                  </ActionBar>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-card/70 p-3">
                  <p className="text-xs text-muted-foreground">ความคืบหน้า</p>
                  <p
                    className="mt-1 font-mono text-lg font-bold"
                    data-testid="bracket-progress-count"
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
                  <p className="text-xs text-muted-foreground">รูปแบบ Seed</p>
                  <p className="mt-1 font-semibold">
                    {resolved.state.seedingMode === "seeded"
                      ? "ตามลำดับรายชื่อ"
                      : "สุ่มด้วย Web Crypto"}
                  </p>
                </div>
                <div className="rounded-xl border bg-card/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    รายการที่ตัดออก
                  </p>
                  <p
                    className="mt-1 font-mono text-lg font-bold"
                    data-testid="bracket-duplicate-count"
                  >
                    ชื่อซ้ำ {duplicateCount}
                  </p>
                </div>
              </div>

              {resolved.champion ? (
                <div
                  className="mt-5 grid gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  data-testid="bracket-champion"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      <Crown className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                        Champion
                      </p>
                      <p className="truncate font-heading text-xl font-bold">
                        {resolved.champion.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    รองชนะเลิศ{" "}
                    <strong className="text-foreground">
                      {resolved.runnerUp?.name}
                    </strong>
                    {resolved.thirdPlace ? (
                      <>
                        {" "}
                        • อันดับ 3{" "}
                        <strong className="text-foreground">
                          {resolved.thirdPlace.name}
                        </strong>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <BracketBoard
                  resolved={resolved}
                  scoreDrafts={scoreDrafts}
                  onDraftChange={updateDraft}
                  onWinner={selectWinner}
                  onClearMatch={clearMatch}
                />
              </div>
            </div>
          ) : (
            <div
              className="grid min-h-[38rem] place-items-center rounded-2xl border border-dashed bg-card/45 p-6 text-center"
              data-testid="bracket-empty-state"
            >
              <div className="max-w-md">
                <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
                  <Trophy className="size-10" />
                </span>
                <h2 className="mt-5 font-heading text-xl font-bold">
                  พร้อมจัดสายแข่งแบบมืออาชีพ
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  วางรายชื่อ เลือกลำดับ Seed แล้วสร้างสาย ระบบเติม BYE
                  ให้พอดีกับ 4, 8, 16 หรือ 32 ช่องโดยอัตโนมัติ
                </p>
                <div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-xl border bg-background/65 p-3">
                    🏆 กีฬาและอีสปอร์ต
                  </div>
                  <div className="rounded-xl border bg-background/65 p-3">
                    🎓 แข่งขันในชั้นเรียน
                  </div>
                  <div className="rounded-xl border bg-background/65 p-3">
                    🎉 กิจกรรมองค์กร
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
