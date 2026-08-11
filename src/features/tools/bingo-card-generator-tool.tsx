"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Dices,
  Download,
  Eraser,
  FileJson,
  FileUp,
  FlaskConical,
  Grid3X3,
  ImageDown,
  Megaphone,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ActionBar,
  WorkspaceFrame,
  copyText,
  downloadBlob,
  downloadText,
} from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BINGO_MAX_CARDS,
  BINGO_MAX_ITEMS,
  BINGO_MAX_JSON_LENGTH,
  bingoCardToText,
  bingoGameToCsv,
  bingoRequiredItemCount,
  createBingoGame,
  drawNextBingoCall,
  generateBingoSeed,
  hasBingo,
  parseBingoItems,
  resetBingoCalls,
  resetBingoMarks,
  restoreBingoGame,
  serializeBingoGame,
  toggleBingoMark,
  undoLastBingoCall,
  type BingoCard,
  type BingoCardsPerPage,
  type BingoColorTheme,
  type BingoGameState,
  type BingoGridSize,
  type BingoMode,
} from "@/lib/tools/bingo-card";

const STORAGE_KEY = "meaw-bingo-card-generator-v1";
const STORAGE_VERSION = 1 as const;
const BINGO_COLUMNS = ["B", "I", "N", "G", "O"] as const;
const EXAMPLE_WORDS = [
  "แมวส้ม",
  "มัทฉะ",
  "ซากุระ",
  "ราเมง",
  "ภูเขาไฟฟูจิ",
  "รถไฟ",
  "ตู้กดน้ำ",
  "ทาโกะยากิ",
  "ดอกไม้",
  "สายรุ้ง",
  "คาเฟ่",
  "หนังสือ",
  "ร่มใส",
  "จักรยาน",
  "ก้อนเมฆ",
  "ดาวตก",
  "ข้าวปั้น",
  "โคมไฟ",
  "สวนชา",
  "ไอศกรีม",
  "ตุ๊กตา",
  "ขนมปัง",
  "แม่น้ำ",
  "ตลาดเช้า",
  "ดอกทานตะวัน",
  "รถบัส",
  "กล้องถ่ายรูป",
  "กล่องของขวัญ",
  "งานเทศกาล",
  "พระจันทร์",
  "ชิงช้า",
  "โปสการ์ด",
].join("\n");

const THEME_STYLES: Record<
  BingoColorTheme,
  {
    label: string;
    swatch: string;
    header: string;
    cell: string;
    marked: string;
    canvas: { background: string; accent: string; ink: string; soft: string };
  }
> = {
  matcha: {
    label: "Matcha",
    swatch: "bg-emerald-600",
    header: "bg-emerald-700 text-white",
    cell: "border-emerald-700/35 bg-emerald-50/80 dark:bg-emerald-950/25",
    marked: "border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-500",
    canvas: {
      background: "#f7faf4",
      accent: "#39734c",
      ink: "#1f2b22",
      soft: "#e3efdf",
    },
  },
  sakura: {
    label: "Sakura",
    swatch: "bg-rose-500",
    header: "bg-rose-600 text-white",
    cell: "border-rose-600/35 bg-rose-50/80 dark:bg-rose-950/25",
    marked: "border-rose-500 bg-rose-500 text-white",
    canvas: {
      background: "#fff8f8",
      accent: "#d35c79",
      ink: "#352126",
      soft: "#fde5e9",
    },
  },
  mikan: {
    label: "Mikan",
    swatch: "bg-orange-500",
    header: "bg-orange-600 text-white",
    cell: "border-orange-600/35 bg-orange-50/80 dark:bg-orange-950/25",
    marked: "border-orange-500 bg-orange-500 text-white",
    canvas: {
      background: "#fffaf2",
      accent: "#dc741d",
      ink: "#35281c",
      soft: "#ffead0",
    },
  },
  sora: {
    label: "Sora",
    swatch: "bg-sky-500",
    header: "bg-sky-600 text-white",
    cell: "border-sky-600/35 bg-sky-50/80 dark:bg-sky-950/25",
    marked: "border-sky-500 bg-sky-500 text-white",
    canvas: {
      background: "#f5fbff",
      accent: "#2786b7",
      ink: "#1d2b33",
      soft: "#dff2fb",
    },
  },
};

type InitialModel = {
  title: string;
  mode: BingoMode;
  size: BingoGridSize;
  freeCenter: boolean;
  freeLabel: string;
  cardCount: string;
  cardsPerPage: BingoCardsPerPage;
  seed: string;
  theme: BingoColorTheme;
  itemsText: string;
  game: BingoGameState | null;
};

type StoredDraft = Omit<InitialModel, "game"> & {
  version: typeof STORAGE_VERSION;
  game: BingoGameState | null;
};

function defaultInitialModel(): InitialModel {
  return {
    title: "Meaw Cafe Bingo",
    mode: "custom",
    size: 5,
    freeCenter: true,
    freeLabel: "FREE",
    cardCount: "12",
    cardsPerPage: 2,
    seed: "meaw-cafe-a",
    theme: "matcha",
    itemsText: "",
    game: null,
  };
}

function modelFromGame(game: BingoGameState): InitialModel {
  return {
    title: game.title,
    mode: game.mode,
    size: game.size,
    freeCenter: game.freeCenter,
    freeLabel: game.freeLabel,
    cardCount: String(game.cardCount),
    cardsPerPage: game.cardsPerPage,
    seed: game.seed,
    theme: game.theme,
    itemsText: game.items.join("\n"),
    game,
  };
}

function loadInitialModel(): InitialModel {
  const fallback = defaultInitialModel();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > BINGO_MAX_JSON_LENGTH) return fallback;
    const source = JSON.parse(raw) as Partial<StoredDraft>;
    if (source.version !== STORAGE_VERSION) throw new Error("version");
    if (source.game) return modelFromGame(restoreBingoGame(JSON.stringify(source.game)));
    if (
      typeof source.title !== "string" ||
      (source.mode !== "custom" && source.mode !== "classic75") ||
      ![3, 4, 5].includes(Number(source.size)) ||
      typeof source.freeCenter !== "boolean" ||
      typeof source.freeLabel !== "string" ||
      typeof source.cardCount !== "string" ||
      ![1, 2, 4].includes(Number(source.cardsPerPage)) ||
      typeof source.seed !== "string" ||
      !["matcha", "sakura", "mikan", "sora"].includes(String(source.theme)) ||
      typeof source.itemsText !== "string"
    ) {
      throw new Error("draft");
    }
    return {
      title: source.title,
      mode: source.mode,
      size: source.size as BingoGridSize,
      freeCenter: source.freeCenter,
      freeLabel: source.freeLabel,
      cardCount: source.cardCount,
      cardsPerPage: source.cardsPerPage as BingoCardsPerPage,
      seed: source.seed,
      theme: source.theme as BingoColorTheme,
      itemsText: source.itemsText,
      game: null,
    };
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The tool still works when private browsing or browser policy blocks storage.
    }
    return fallback;
  }
}

function writeDownload(blob: Blob, filename: string): void {
  downloadBlob(blob, filename);
  toast.success(`ดาวน์โหลด ${filename} แล้ว`);
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const words = text.split(/\s+/);
  let fontSize = Math.min(52, Math.max(24, width / 5));
  let lines: string[] = [];
  while (fontSize >= 20) {
    context.font = `700 ${fontSize}px "Noto Sans Thai", sans-serif`;
    lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= width - 30 || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length * fontSize * 1.2 <= height - 24 && lines.length <= 4) break;
    fontSize -= 3;
  }
  const lineHeight = fontSize * 1.2;
  const firstLineY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    context.fillText(
      line,
      x + width / 2,
      firstLineY + index * lineHeight,
      width - 24,
    );
  });
}

async function renderBingoCardPng(
  state: BingoGameState,
  card: BingoCard,
): Promise<Blob> {
  await document.fonts.ready;
  const palette = THEME_STYLES[state.theme].canvas;
  const canvas = document.createElement("canvas");
  canvas.width = 1_600;
  canvas.height = state.size === 5 ? 1_940 : 1_780;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser นี้ไม่รองรับ Canvas");
  context.fillStyle = palette.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = palette.ink;
  context.font = '800 84px "Noto Sans Thai", sans-serif';
  context.fillText(state.title, 800, 105, 1_350);
  context.font = '600 34px "Noto Sans Thai", sans-serif';
  context.fillText(`Card #${card.number}  •  Seed: ${state.seed}`, 800, 185, 1_350);

  const left = 100;
  const top = state.size === 5 ? 340 : 270;
  const gridWidth = 1_400;
  const headerHeight = state.size === 5 ? 125 : 0;
  const cellSize = gridWidth / state.size;
  if (state.size === 5) {
    for (let column = 0; column < 5; column += 1) {
      context.fillStyle = palette.accent;
      context.fillRect(left + column * cellSize, top - headerHeight, cellSize, headerHeight);
      context.fillStyle = "#ffffff";
      context.font = '900 78px "Noto Sans Thai", sans-serif';
      context.fillText(BINGO_COLUMNS[column] ?? "", left + column * cellSize + cellSize / 2, top - headerHeight / 2);
    }
  }

  for (const cell of card.cells) {
    const x = left + cell.column * cellSize;
    const y = top + cell.row * cellSize;
    context.fillStyle = cell.isFree ? palette.soft : "#ffffff";
    context.fillRect(x, y, cellSize, cellSize);
    context.strokeStyle = palette.accent;
    context.lineWidth = 5;
    context.strokeRect(x, y, cellSize, cellSize);
    context.fillStyle = cell.isFree ? palette.accent : palette.ink;
    drawFittedText(context, cell.value, x, y, cellSize, cellSize);
  }
  context.fillStyle = palette.ink;
  context.font = '500 28px "Noto Sans Thai", sans-serif';
  context.fillText("สร้างด้วย Meaw Tools • ข้อมูลประมวลผลใน Browser", 800, canvas.height - 55, 1_350);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("สร้าง PNG ไม่สำเร็จ"))), "image/png");
  });
}

function BingoGrid({
  state,
  card,
  interactive,
  onToggle,
}: {
  state: BingoGameState;
  card: BingoCard;
  interactive: boolean;
  onToggle?: (key: string) => void;
}) {
  const theme = THEME_STYLES[state.theme];
  const marks = new Set(state.marks[card.id] ?? []);
  return (
    <div className="w-full" data-testid={`bingo-card-${card.number}`}>
      {state.size === 5 ? (
        <div className="grid grid-cols-5 gap-1" aria-hidden="true">
          {BINGO_COLUMNS.map((letter) => (
            <div key={letter} className={cn("grid min-h-11 place-items-center rounded-t-xl font-heading text-2xl font-black sm:min-h-14 sm:text-3xl", theme.header)}>{letter}</div>
          ))}
        </div>
      ) : null}
      <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }} role="grid" aria-label={`${state.title} การ์ดหมายเลข ${card.number}`}>
        {card.cells.map((cell, index) => {
          const marked = cell.isFree || marks.has(cell.key);
          const className = cn(
            "relative grid aspect-square min-w-0 place-items-center overflow-hidden rounded-lg border p-1.5 text-center text-[clamp(.63rem,2.2vw,.95rem)] font-semibold leading-tight shadow-sm transition sm:p-2 sm:text-sm",
            theme.cell,
            marked && theme.marked,
            interactive && !cell.isFree && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
          );
          const content = <><span className="line-clamp-4 break-words">{cell.value}</span>{marked && !cell.isFree ? <CheckCircle2 className="absolute right-1 top-1 size-3.5" aria-hidden="true" /> : null}</>;
          return interactive ? (
            <button key={`${cell.key}-${index}`} type="button" className={className} role="gridcell" aria-selected={marked} aria-label={`${cell.value}${marked ? " ทำเครื่องหมายแล้ว" : ""}`} disabled={cell.isFree} onClick={() => onToggle?.(cell.key)} data-testid={`bingo-cell-${card.number}-${index}`}>{content}</button>
          ) : (
            <div key={`${cell.key}-${index}`} className={className} role="gridcell">{content}</div>
          );
        })}
      </div>
    </div>
  );
}

function PrintDeck({ state }: { state: BingoGameState }) {
  return (
    <div className="bingo-print-deck" data-cards-per-page={state.cardsPerPage} data-testid="bingo-print-deck">
      {state.cards.map((card) => (
        <article key={card.id} className="bingo-print-card">
          <header className="mb-3 flex items-end justify-between gap-4">
            <div><h2 className="font-heading text-xl font-black">{state.title}</h2><p className="text-xs">Card #{card.number}</p></div>
            <p className="font-mono text-[10px]">Seed: {state.seed}</p>
          </header>
          <BingoGrid state={state} card={card} interactive={false} />
        </article>
      ))}
    </div>
  );
}

function CallerPanel({ state, onChange }: { state: BingoGameState; onChange: (state: BingoGameState) => void }) {
  const called = new Set(state.calledKeys);
  const latestKey = state.calledKeys.at(-1);
  const latest = state.callOrder.find((call) => call.key === latestKey) ?? null;
  const finished = state.calledKeys.length === state.callOrder.length;
  return (
    <div data-testid="bingo-caller">
      <div className="rounded-2xl border bg-card/70 p-4 text-center sm:p-6">
        <Badge variant="secondary"><Megaphone />ตัวสุ่มคำเรียก</Badge>
        <p className="mt-3 text-xs text-muted-foreground">เรียกแล้ว {state.calledKeys.length}/{state.callOrder.length}</p>
        <div className="mx-auto mt-3 grid min-h-32 max-w-xl place-items-center rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
          <p className={cn("font-heading font-black tracking-tight", latest ? "text-4xl sm:text-6xl" : "text-xl text-muted-foreground")} data-testid="bingo-current-call">{latest?.label ?? "กดสุ่มคำแรกเพื่อเริ่มเกม"}</p>
        </div>
        <div className="mx-auto mt-4 h-2 max-w-xl overflow-hidden rounded-full bg-muted" aria-label={`เรียกแล้ว ${state.calledKeys.length} จาก ${state.callOrder.length}`}>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(state.calledKeys.length / state.callOrder.length) * 100}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" size="lg" onClick={() => onChange(drawNextBingoCall(state))} disabled={finished} data-testid="bingo-draw-call"><Dices />{finished ? "เรียกครบแล้ว" : "สุ่มคำถัดไป"}</Button>
          <Button type="button" variant="outline" onClick={() => onChange(undoLastBingoCall(state))} disabled={!state.calledKeys.length}><Undo2 />ย้อนกลับ</Button>
          <Button type="button" variant="outline" onClick={() => onChange(resetBingoCalls(state))} disabled={!state.calledKeys.length}><RotateCcw />เริ่ม Caller ใหม่</Button>
        </div>
      </div>
      <section className="mt-5 rounded-2xl border bg-card/55 p-4 sm:p-5" aria-labelledby="bingo-call-board-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="bingo-call-board-heading" className="font-heading text-lg font-bold">กระดานคำเรียก</h3><p className="mt-1 text-xs text-muted-foreground">รายการที่ถูกเรียกจะเปลี่ยนสีทันที • ลำดับสุ่มคงที่ตาม Seed</p></div>{latest ? <Badge><Sparkles />ล่าสุด: {latest.label}</Badge> : null}</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="bingo-call-board">
          {state.callOrder.map((call, index) => (
            <div key={call.key} className={cn("min-w-0 rounded-xl border px-3 py-2 text-sm [content-visibility:auto]", called.has(call.key) ? "border-primary/35 bg-primary/10 font-semibold text-primary" : "bg-background/60 text-muted-foreground")}>
              <span className="mr-2 font-mono text-[10px] opacity-65">{String(index + 1).padStart(2, "0")}</span><span className="break-words">{call.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function BingoCardGeneratorTool() {
  const [initial] = useState(() => loadInitialModel());
  const [title, setTitle] = useState(initial.title);
  const [mode, setMode] = useState<BingoMode>(initial.mode);
  const [size, setSize] = useState<BingoGridSize>(initial.size);
  const [freeCenter, setFreeCenter] = useState(initial.freeCenter);
  const [freeLabel, setFreeLabel] = useState(initial.freeLabel);
  const [cardCount, setCardCount] = useState(initial.cardCount);
  const [cardsPerPage, setCardsPerPage] = useState<BingoCardsPerPage>(initial.cardsPerPage);
  const [seed, setSeed] = useState(initial.seed);
  const [theme, setTheme] = useState<BingoColorTheme>(initial.theme);
  const [itemsText, setItemsText] = useState(initial.itemsText);
  const [game, setGame] = useState<BingoGameState | null>(initial.game);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [view, setView] = useState<"card" | "caller">("card");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (mode === "classic75") return { count: 75, duplicates: 0, error: "" };
    try {
      const parsed = parseBingoItems(itemsText, 0);
      return { count: parsed.items.length, duplicates: parsed.duplicateItems.length, error: "" };
    } catch (caught) {
      return { count: 0, duplicates: 0, error: caught instanceof Error ? caught.message : "อ่านรายการไม่ได้" };
    }
  }, [itemsText, mode]);
  const requiredCount = mode === "classic75" ? 75 : bingoRequiredItemCount(size, freeCenter);
  const selectedCard = game?.cards[selectedCardIndex] ?? null;
  const selectedMarks = selectedCard && game ? game.marks[selectedCard.id] ?? [] : [];
  const selectedHasBingo = Boolean(selectedCard && game && hasBingo(selectedCard, game.size, selectedMarks));

  useEffect(() => {
    const draft: StoredDraft = { version: STORAGE_VERSION, title, mode, size, freeCenter, freeLabel, cardCount, cardsPerPage, seed, theme, itemsText, game };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Saving the draft is an enhancement; generation and exports remain usable.
    }
  }, [cardCount, cardsPerPage, freeCenter, freeLabel, game, itemsText, mode, seed, size, theme, title]);

  const invalidate = () => {
    setGame(null);
    setSelectedCardIndex(0);
    setError("");
  };

  const generate = () => {
    try {
      const nextSeed = seed.trim() || generateBingoSeed();
      const result = createBingoGame({ title, mode, size, freeCenter, freeLabel, cardCount: Number(cardCount), cardsPerPage, seed: nextSeed, theme, itemsText });
      setSeed(nextSeed);
      setGame(result.state);
      setSelectedCardIndex(0);
      setView("card");
      setError("");
      if (result.duplicateItems.length) toast.info(`ตัดรายการซ้ำ ${result.duplicateItems.length} รายการ`);
      toast.success(`สร้างบิงโก ${result.state.cardCount} การ์ดแล้ว`);
    } catch (caught) {
      setGame(null);
      setError(caught instanceof Error ? caught.message : "สร้างบิงโกไม่สำเร็จ");
    }
  };

  const loadExample = () => {
    setTitle("Meaw Cafe Bingo");
    setMode("custom");
    setSize(5);
    setFreeCenter(true);
    setFreeLabel("FREE");
    setCardCount("12");
    setCardsPerPage(2);
    setSeed("meaw-cafe-a");
    setTheme("matcha");
    setItemsText(EXAMPLE_WORDS);
    setGame(null);
    setSelectedCardIndex(0);
    setError("");
  };

  const clearAll = () => {
    const fallback = defaultInitialModel();
    setTitle(fallback.title);
    setMode(fallback.mode);
    setSize(fallback.size);
    setFreeCenter(fallback.freeCenter);
    setFreeLabel(fallback.freeLabel);
    setCardCount(fallback.cardCount);
    setCardsPerPage(fallback.cardsPerPage);
    setSeed(fallback.seed);
    setTheme(fallback.theme);
    setItemsText("");
    setGame(null);
    setSelectedCardIndex(0);
    setView("card");
    setError("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing UI state must not fail when storage access is unavailable.
    }
    toast.info("ล้างรายการ การ์ด และประวัติ Caller แล้ว");
  };

  const applyImportedGame = (restored: BingoGameState) => {
    const model = modelFromGame(restored);
    setTitle(model.title);
    setMode(model.mode);
    setSize(model.size);
    setFreeCenter(model.freeCenter);
    setFreeLabel(model.freeLabel);
    setCardCount(model.cardCount);
    setCardsPerPage(model.cardsPerPage);
    setSeed(model.seed);
    setTheme(model.theme);
    setItemsText(model.itemsText);
    setGame(restored);
    setSelectedCardIndex(0);
    setView("card");
    setError("");
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > BINGO_MAX_JSON_LENGTH) throw new Error("ไฟล์ JSON ใหญ่เกิน 1 MB");
      applyImportedGame(restoreBingoGame(await file.text()));
      toast.success("นำเข้าชุดบิงโกแล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "นำเข้า JSON ไม่สำเร็จ");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const updateGame = (next: BingoGameState) => setGame(next);

  return (
    <WorkspaceFrame>
      <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void importJson(event.target.files?.[0])} aria-label="เลือกไฟล์ JSON ชุดบิงโก" data-testid="bingo-import-file" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,.82fr)_minmax(0,1.18fr)]">
        <form className="bingo-no-print space-y-5" onSubmit={(event) => { event.preventDefault(); generate(); }} aria-labelledby="bingo-form-heading">
          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 id="bingo-form-heading" className="font-heading text-lg font-bold">รายการสำหรับสร้างบิงโก</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">คำศัพท์ กิจกรรม Icebreaker ปาร์ตี้ หรือเลขบิงโกมาตรฐาน</p></div><Badge variant="secondary" data-testid="bingo-item-count"><Grid3X3 />{preview.count}/{mode === "custom" ? BINGO_MAX_ITEMS : 75}</Badge></div>
            <div className="mt-4 space-y-2.5"><Label htmlFor="bingo-title">ชื่อชุดบิงโก</Label><Input id="bingo-title" value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); invalidate(); }} placeholder="เช่น English Vocabulary Bingo" /></div>
            <div className="mt-4 space-y-2.5"><Label>รูปแบบข้อมูล</Label><div className="grid grid-cols-2 gap-2" role="group" aria-label="รูปแบบข้อมูลบิงโก"><Button type="button" variant={mode === "custom" ? "default" : "outline"} className="h-auto min-h-16 flex-col gap-1 py-2" aria-pressed={mode === "custom"} onClick={() => { setMode("custom"); invalidate(); }} data-testid="bingo-mode-custom"><Grid3X3 />คำหรือข้อความ<span className="text-[10px] font-normal opacity-75">3×3, 4×4 หรือ 5×5</span></Button><Button type="button" variant={mode === "classic75" ? "default" : "outline"} className="h-auto min-h-16 flex-col gap-1 py-2" aria-pressed={mode === "classic75"} onClick={() => { setMode("classic75"); setSize(5); setFreeCenter(true); invalidate(); }} data-testid="bingo-mode-classic"><Dices />เลข 1–75<span className="text-[10px] font-normal opacity-75">ช่วงเลขตาม B-I-N-G-O</span></Button></div></div>
            {mode === "custom" ? <div className="mt-4 space-y-2.5"><Label htmlFor="bingo-items">คำหรือข้อความ</Label><Textarea id="bingo-items" value={itemsText} onChange={(event) => { setItemsText(event.target.value); invalidate(); }} className="min-h-72 resize-y leading-7" placeholder="หนึ่งรายการต่อหนึ่งบรรทัด\nเช่น คำศัพท์ ชื่อเพลง หรือกิจกรรม" aria-describedby="bingo-items-hint" data-testid="bingo-items" /><p id="bingo-items-hint" className="text-xs leading-5 text-muted-foreground">ต้องมีอย่างน้อย {requiredCount} รายการที่ไม่ซ้ำ • ตอนนี้ {preview.count} รายการ{preview.duplicates ? ` • ตัดซ้ำ ${preview.duplicates}` : ""}</p></div> : <Alert className="mt-4 border-sky-500/30 bg-sky-500/5"><Dices className="text-sky-700 dark:text-sky-300" /><AlertTitle>Classic 75-ball Bingo</AlertTitle><AlertDescription>B ใช้เลข 1–15, I ใช้ 16–30, N ใช้ 31–45, G ใช้ 46–60 และ O ใช้ 61–75 พร้อมช่องกลางฟรี</AlertDescription></Alert>}
            {preview.error ? <Alert variant="destructive" className="mt-4"><AlertTitle>อ่านรายการไม่ได้</AlertTitle><AlertDescription>{preview.error}</AlertDescription></Alert> : null}
            <div className="mt-4"><ActionBar><Button type="button" size="sm" variant="outline" onClick={loadExample}><FlaskConical />ตัวอย่าง</Button><Button type="button" size="sm" variant="outline" onClick={() => importRef.current?.click()}><FileUp />นำเข้า JSON</Button><Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={clearAll} disabled={!itemsText && !game}><Eraser />ล้างทั้งหมด</Button></ActionBar></div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">รูปแบบการ์ดและงานพิมพ์</h2>
            {mode === "custom" ? <div className="mt-4 space-y-2.5"><Label>ขนาดตาราง</Label><div className="grid grid-cols-3 gap-2" role="group" aria-label="ขนาดตารางบิงโก">{([3, 4, 5] as const).map((value) => <Button key={value} type="button" variant={size === value ? "secondary" : "outline"} aria-pressed={size === value} onClick={() => { setSize(value); if (value === 4) setFreeCenter(false); invalidate(); }} data-testid={`bingo-size-${value}`}>{value}×{value}</Button>)}</div></div> : null}
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border bg-background/55 p-3"><div><Label htmlFor="bingo-free-center" className="cursor-pointer">ช่องกลางฟรี</Label><p className="mt-1 text-xs text-muted-foreground">ใช้ได้กับตารางเลขคี่ และเปิดเสมอใน 75-ball</p></div><Switch id="bingo-free-center" checked={freeCenter} disabled={mode === "classic75" || size === 4} onCheckedChange={(checked) => { setFreeCenter(checked); invalidate(); }} /></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2.5"><Label htmlFor="bingo-free-label">ข้อความช่องฟรี</Label><Input id="bingo-free-label" value={freeLabel} maxLength={24} onChange={(event) => { setFreeLabel(event.target.value); invalidate(); }} /></div><div className="space-y-2.5"><Label htmlFor="bingo-card-count">จำนวนการ์ด</Label><Input id="bingo-card-count" type="number" inputMode="numeric" min="1" max={BINGO_MAX_CARDS} step="1" value={cardCount} onChange={(event) => { setCardCount(event.target.value); invalidate(); }} data-testid="bingo-card-count" /></div></div>
            <div className="mt-4 space-y-2.5"><Label htmlFor="bingo-cards-per-page">การ์ดต่อหน้าพิมพ์</Label><Select value={String(cardsPerPage)} onValueChange={(value) => { setCardsPerPage(Number(value) as BingoCardsPerPage); invalidate(); }}><SelectTrigger id="bingo-cards-per-page" className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 การ์ด — ตัวใหญ่</SelectItem><SelectItem value="2">2 การ์ด — แนะนำ</SelectItem><SelectItem value="4">4 การ์ด — ประหยัดกระดาษ</SelectItem></SelectContent></Select></div>
            <div className="mt-4 space-y-2.5"><Label>ชุดสี</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="ชุดสีการ์ด">{(Object.keys(THEME_STYLES) as BingoColorTheme[]).map((value) => <Button key={value} type="button" variant={theme === value ? "secondary" : "outline"} className="justify-start" aria-pressed={theme === value} onClick={() => { setTheme(value); invalidate(); }}><span className={cn("size-3 rounded-full", THEME_STYLES[value].swatch)} />{THEME_STYLES[value].label}</Button>)}</div></div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">Seed สำหรับสร้างชุดเดิมซ้ำ</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">ใช้ Seed เดิมกับรายการและการตั้งค่าเดิม จะได้การ์ดกับลำดับ Caller เหมือนเดิม</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="space-y-2.5"><Label htmlFor="bingo-seed">Seed</Label><Input id="bingo-seed" value={seed} maxLength={80} onChange={(event) => { setSeed(event.target.value); invalidate(); }} data-testid="bingo-seed" /></div><Button type="button" variant="outline" className="self-end" onClick={() => { setSeed(generateBingoSeed()); invalidate(); }}><RefreshCw />สุ่ม Seed</Button></div>
            {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>ยังสร้างบิงโกไม่ได้</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" size="lg" className="mt-5 h-12 w-full" data-testid="bingo-generate"><Sparkles />สร้างการ์ดบิงโก</Button>
          </section>

          <Alert className="border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>ฉบับร่างอยู่ใน Browser เครื่องนี้</AlertTitle><AlertDescription>คำ การ์ด เครื่องหมาย และประวัติ Caller ไม่ถูกส่งไป API หรือ Server ระบบบันทึกใน localStorage ของอุปกรณ์นี้เท่านั้น และลบได้ด้วยปุ่มล้างทั้งหมด</AlertDescription></Alert>
        </form>

        <section className="bingo-print-surface min-w-0 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5" aria-label="ผลลัพธ์ Bingo Card Generator">
          {game && selectedCard ? (
            <div data-testid="bingo-results">
              <div className="bingo-no-print flex flex-wrap items-start justify-between gap-4"><div><Badge variant="secondary"><Sparkles />สร้างสำเร็จ</Badge><h2 className="mt-2 font-heading text-xl font-bold">{game.title}</h2><p className="mt-1 text-sm text-muted-foreground">{game.cardCount} การ์ด • {game.size}×{game.size} • {game.mode === "classic75" ? "75-ball" : `${game.items.length} รายการ`} • Seed {game.seed}</p></div><ActionBar><Button type="button" variant="outline" onClick={() => void copyText(bingoCardToText(game, selectedCard), `คัดลอก Card #${selectedCard.number} แล้ว`)} data-testid="bingo-copy"><Clipboard />คัดลอก</Button><Button type="button" variant="outline" onClick={() => downloadText(bingoGameToCsv(game), "meaw-bingo-cards.csv", "text/csv;charset=utf-8")} data-testid="bingo-csv"><Download />CSV</Button><Button type="button" variant="outline" onClick={() => void renderBingoCardPng(game, selectedCard).then((blob) => writeDownload(blob, `meaw-bingo-card-${selectedCard.number}.png`)).catch((caught: unknown) => toast.error(caught instanceof Error ? caught.message : "สร้าง PNG ไม่สำเร็จ"))} data-testid="bingo-png"><ImageDown />PNG</Button><Button type="button" variant="outline" onClick={() => downloadText(serializeBingoGame(game), "meaw-bingo-game.json", "application/json;charset=utf-8")} data-testid="bingo-json"><FileJson />JSON</Button><Button type="button" variant="outline" onClick={() => importRef.current?.click()} data-testid="bingo-import"><FileUp />นำเข้า</Button><Button type="button" variant="outline" onClick={() => window.print()} data-testid="bingo-print"><Printer />พิมพ์/PDF</Button></ActionBar></div>
              <div className="bingo-no-print mt-5 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1" role="tablist" aria-label="มุมมองบิงโก"><Button type="button" variant={view === "card" ? "secondary" : "ghost"} role="tab" aria-selected={view === "card"} onClick={() => setView("card")} data-testid="bingo-view-card"><Grid3X3 />การ์ด</Button><Button type="button" variant={view === "caller" ? "secondary" : "ghost"} role="tab" aria-selected={view === "caller"} onClick={() => setView("caller")} data-testid="bingo-view-caller"><Megaphone />Caller <Badge variant="outline">{game.calledKeys.length}/{game.callOrder.length}</Badge></Button></div>
              <div className="bingo-no-print mt-5">
                {view === "card" ? <div className="bingo-screen-card"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Button type="button" size="icon-sm" variant="outline" aria-label="การ์ดก่อนหน้า" disabled={selectedCardIndex === 0} onClick={() => setSelectedCardIndex((current) => Math.max(0, current - 1))}><ArrowLeft /></Button><Select value={String(selectedCardIndex)} onValueChange={(value) => setSelectedCardIndex(Number(value))}><SelectTrigger className="h-9 min-w-32"><SelectValue /></SelectTrigger><SelectContent>{game.cards.map((card, index) => <SelectItem key={card.id} value={String(index)}>Card #{card.number}</SelectItem>)}</SelectContent></Select><Button type="button" size="icon-sm" variant="outline" aria-label="การ์ดถัดไป" disabled={selectedCardIndex >= game.cards.length - 1} onClick={() => setSelectedCardIndex((current) => Math.min(game.cards.length - 1, current + 1))}><ArrowRight /></Button></div><div className="flex items-center gap-2">{selectedHasBingo ? <Badge className="animate-in zoom-in-75"><CheckCircle2 />BINGO!</Badge> : <Badge variant="outline">แตะช่องเพื่อทำเครื่องหมาย</Badge>}<Button type="button" size="sm" variant="ghost" disabled={!selectedMarks.length} onClick={() => updateGame(resetBingoMarks(game, selectedCard.id))}><RotateCcw />ล้างเครื่องหมาย</Button></div></div><div className={cn("mx-auto max-w-3xl rounded-3xl border bg-card p-3 shadow-sm sm:p-6", selectedHasBingo && "ring-2 ring-primary ring-offset-2 ring-offset-background")}><div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-heading text-xl font-black">{game.title}</p><p className="text-xs text-muted-foreground">Card #{selectedCard.number}</p></div><p className="font-mono text-[10px] text-muted-foreground">{game.seed}</p></div><BingoGrid state={game} card={selectedCard} interactive onToggle={(key) => updateGame(toggleBingoMark(game, selectedCard.id, key))} /></div><Alert className="mt-5 border-sky-500/30 bg-sky-500/5"><CheckCircle2 className="text-sky-700 dark:text-sky-300" /><AlertTitle>โหมดเล่นบนหน้าจอ</AlertTitle><AlertDescription>แตะช่องที่ได้ยิน ช่องกลางฟรีนับให้อัตโนมัติ และระบบจะแจ้งเมื่อครบแนวนอน แนวตั้ง หรือแนวทแยง เครื่องหมายของแต่ละ Card บันทึกแยกกัน</AlertDescription></Alert></div> : <CallerPanel state={game} onChange={updateGame} />}
              </div>
              <PrintDeck state={game} />
            </div>
          ) : (
            <div className="grid min-h-[38rem] place-items-center rounded-2xl border border-dashed bg-card/45 p-6 text-center" data-testid="bingo-empty-state"><div className="max-w-md"><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary"><Grid3X3 className="size-10" /></span><h2 className="mt-5 font-heading text-xl font-bold">พร้อมสร้างบิงโกที่พิมพ์และเล่นได้จริง</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">ใส่คำของคุณหรือเลือกเลข 1–75 แล้วสร้างการ์ดไม่ซ้ำ พร้อม Caller ในหน้าเดียว ใช้ในห้องเรียน Workshop งานบริษัท และปาร์ตี้ได้ทันที</p><div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3"><div className="rounded-xl border bg-background/65 p-3">🎓 คำศัพท์ในห้องเรียน</div><div className="rounded-xl border bg-background/65 p-3">💬 Team Icebreaker</div><div className="rounded-xl border bg-background/65 p-3">🎉 งานเลี้ยงและกิจกรรม</div></div></div></div>
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}
