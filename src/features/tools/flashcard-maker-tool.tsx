"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Eraser,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileUp,
  FlaskConical,
  GraduationCap,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, copyText, downloadBlob, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FLASHCARD_MAKER_MAX_JSON_LENGTH,
  FLASHCARD_MAKER_MAX_TEXT_LENGTH,
  addFlashcard,
  buildFlashcardPrintSheets,
  createFlashcardDeck,
  flashcardDeckToText,
  flashcardMakerCsv,
  flashcardMakerSvg,
  flashcardMakerTsv,
  parseFlashcardCsv,
  parseFlashcardText,
  removeFlashcard,
  restoreFlashcardDeck,
  serializeFlashcardDeck,
  shuffleFlashcards,
  updateFlashcard,
  type Flashcard,
  type FlashcardDeck,
  type FlashcardTheme,
} from "@/lib/tools/flashcard-maker";

const STORAGE_KEY = "meaw-flashcard-maker-v1";
const STORAGE_VERSION = 1 as const;

const THEMES: Array<{ value: FlashcardTheme; label: string; description: string; card: string; dot: string }> = [
  { value: "matcha", label: "Matcha", description: "เขียวสงบ", card: "from-[#dbead4] via-[#f7fbf4] to-white dark:from-[#29372b] dark:via-[#18221a] dark:to-[#121914]", dot: "bg-[#78936f]" },
  { value: "sakura", label: "Sakura", description: "ชมพูอ่อน", card: "from-[#ffdce6] via-[#fff6f8] to-white dark:from-[#442932] dark:via-[#281920] dark:to-[#1d1418]", dot: "bg-[#d77f99]" },
  { value: "mikan", label: "Mikan", description: "ส้มอบอุ่น", card: "from-[#ffe1b8] via-[#fff8ec] to-white dark:from-[#49321f] dark:via-[#2b2118] dark:to-[#1d1813]", dot: "bg-[#e59446]" },
  { value: "sora", label: "Sora", description: "ฟ้าโปร่ง", card: "from-[#d2edff] via-[#f4fbff] to-white dark:from-[#263a47] dark:via-[#17242c] dark:to-[#111a20]", dot: "bg-[#5d9bc1]" },
];

const SAMPLE_TEXT = [
  "猫\tแมว (neko)",
  "犬\tสุนัข (inu)",
  "水\tน้ำ (mizu)",
  "本\tหนังสือ (hon)",
  "先生\tครู / อาจารย์ (sensei)",
  "ありがとう\tขอบคุณ (arigatou)",
  "おはよう\tสวัสดีตอนเช้า (ohayou)",
  "またね\tแล้วเจอกัน (mata ne)",
].join("\n");

type DraftModel = {
  title: string;
  theme: FlashcardTheme;
  sourceText: string;
  deck: FlashcardDeck | null;
};

type StoredDraft = DraftModel & { version: typeof STORAGE_VERSION };
type PrintMode = "single" | "duplex";

function defaultDraft(): DraftModel {
  return { title: "ชุดบัตรคำของฉัน", theme: "matcha", sourceText: "", deck: null };
}

function readInitialDraft(): DraftModel {
  const fallback = defaultDraft();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > FLASHCARD_MAKER_MAX_JSON_LENGTH * 2) return fallback;
    const value = JSON.parse(raw) as Partial<StoredDraft>;
    if (value.version !== STORAGE_VERSION || typeof value.title !== "string" || typeof value.sourceText !== "string") return fallback;
    if (value.theme !== "matcha" && value.theme !== "sakura" && value.theme !== "mikan" && value.theme !== "sora") return fallback;
    const deck = value.deck ? restoreFlashcardDeck(JSON.stringify(value.deck)) : null;
    return { title: value.title, theme: value.theme, sourceText: value.sourceText, deck };
  } catch {
    return fallback;
  }
}

function themeCard(theme: FlashcardTheme): string {
  return THEMES.find((item) => item.value === theme)?.card ?? THEMES[0]!.card;
}

function StudyCard({ card, flipped, theme, onFlip, onPrevious, onNext }: {
  card: Flashcard;
  flipped: boolean;
  theme: FlashcardTheme;
  onFlip: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <button
      type="button"
      className="group block w-full rounded-[1.75rem] text-left outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onFlip}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
        if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
      }}
      aria-label={flipped ? "ด้านหลังบัตรคำ กดเพื่อดูด้านหน้า" : "ด้านหน้าบัตรคำ กดเพื่อดูคำตอบ"}
      aria-pressed={flipped}
      data-testid="flashcard-study-card"
    >
      <span className={cn("relative block min-h-[23rem] transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none", flipped && "[transform:rotateY(180deg)]")}>
        <span aria-hidden={flipped} className={cn("absolute inset-0 flex flex-col rounded-[1.75rem] border border-white/80 bg-gradient-to-br p-6 shadow-[0_24px_70px_-36px_rgba(71,52,43,.45)] [backface-visibility:hidden] sm:p-9 dark:border-white/10", themeCard(theme))}>
          <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><span>Front</span><span>แตะเพื่อพลิก</span></span>
          <span className="flex flex-1 items-center justify-center whitespace-pre-wrap break-words text-center font-heading text-2xl font-bold leading-relaxed text-foreground sm:text-3xl">{card.front}</span>
          <span className="text-center text-xs text-muted-foreground">Space / Enter เพื่อพลิก · ← → เปลี่ยนใบ</span>
        </span>
        <span aria-hidden={!flipped} className={cn("absolute inset-0 flex flex-col rounded-[1.75rem] border border-white/80 bg-gradient-to-br p-6 shadow-[0_24px_70px_-36px_rgba(71,52,43,.45)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-9 dark:border-white/10", themeCard(theme))}>
          <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><span>Back</span><span>คำตอบ</span></span>
          <span className="flex flex-1 items-center justify-center whitespace-pre-wrap break-words text-center text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">{card.back}</span>
          <span className="text-center text-xs text-muted-foreground">ประเมินด้านล่าง หรือแตะเพื่อกลับด้านหน้า</span>
        </span>
      </span>
    </button>
  );
}

function PrintCard({ card, side, showBoth }: { card: Flashcard | null; side: "front" | "back"; showBoth?: boolean }) {
  if (!card) return <div className="flashcard-print-card flashcard-print-card-empty" />;
  return (
    <article className="flashcard-print-card">
      {showBoth ? (
        <><p className="flashcard-print-label">FRONT</p><div className="flashcard-print-text">{card.front}</div><div className="flashcard-print-divider" /><p className="flashcard-print-label">BACK</p><div className="flashcard-print-answer">{card.back}</div></>
      ) : (
        <><p className="flashcard-print-label">{side.toUpperCase()}</p><div className={side === "front" ? "flashcard-print-text" : "flashcard-print-answer"}>{side === "front" ? card.front : card.back}</div></>
      )}
    </article>
  );
}

export function FlashcardMakerTool() {
  const [initial] = useState(readInitialDraft);
  const [title, setTitle] = useState(initial.title);
  const [theme, setTheme] = useState<FlashcardTheme>(initial.theme);
  const [sourceText, setSourceText] = useState(initial.sourceText);
  const [deck, setDeck] = useState<FlashcardDeck | null>(initial.deck);
  const [error, setError] = useState("");
  const [studyIds, setStudyIds] = useState<string[]>(() => initial.deck?.cards.map((card) => card.id) ?? []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(() => new Set());
  const [retryIds, setRetryIds] = useState<Set<string>>(() => new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [search, setSearch] = useState("");
  const [printMode, setPrintMode] = useState<PrintMode>("single");
  const [perPage, setPerPage] = useState<4 | 8>(4);
  const importRef = useRef<HTMLInputElement>(null);
  const storageWarningShown = useRef(false);

  const activeCard = useMemo(() => {
    if (!deck) return null;
    const id = studyIds[activeIndex];
    return deck.cards.find((card) => card.id === id) ?? deck.cards[0] ?? null;
  }, [activeIndex, deck, studyIds]);
  const visibleCards = useMemo(() => {
    if (!deck) return [];
    const query = search.trim().normalize("NFKC").toLocaleLowerCase();
    return query ? deck.cards.filter((card) => `${card.front}\n${card.back}`.normalize("NFKC").toLocaleLowerCase().includes(query)) : deck.cards;
  }, [deck, search]);
  const printSheets = useMemo(() => deck ? buildFlashcardPrintSheets(deck.cards, perPage) : [], [deck, perPage]);
  const classifiedCount = useMemo(() => new Set([...knownIds, ...retryIds]).size, [knownIds, retryIds]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored: StoredDraft = { version: STORAGE_VERSION, title, theme, sourceText, deck };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        if (!storageWarningShown.current) {
          storageWarningShown.current = true;
          toast.warning("บันทึกร่างใน Browser ไม่สำเร็จ กรุณาดาวน์โหลด JSON สำรอง");
        }
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [deck, sourceText, theme, title]);

  function resetStudy(nextDeck: FlashcardDeck, shuffle = false) {
    const ids = nextDeck.cards.map((card) => card.id);
    setStudyIds(shuffle ? shuffleFlashcards(ids) : ids);
    setActiveIndex(0);
    setFlipped(false);
    setKnownIds(new Set());
    setRetryIds(new Set());
  }

  function applyDeck(nextDeck: FlashcardDeck, syncSource = true) {
    setDeck(nextDeck);
    setTitle(nextDeck.title);
    setTheme(nextDeck.theme);
    if (syncSource) setSourceText(flashcardMakerTsv(nextDeck));
    resetStudy(nextDeck);
    setEditId(null);
    setFront("");
    setBack("");
    setError("");
  }

  function generate() {
    try {
      const parsed = parseFlashcardText(sourceText);
      const nextDeck = createFlashcardDeck({ title, theme, cards: parsed.cards });
      applyDeck(nextDeck, false);
      toast.success(parsed.duplicateCount ? `สร้าง ${nextDeck.cards.length} ใบ และตัดรายการซ้ำ ${parsed.duplicateCount} รายการ` : `สร้างบัตรคำ ${nextDeck.cards.length} ใบแล้ว`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "สร้างบัตรคำไม่สำเร็จ");
    }
  }

  function loadSample() {
    const parsed = parseFlashcardText(SAMPLE_TEXT);
    const nextDeck = createFlashcardDeck({ title: "คำศัพท์ญี่ปุ่นพื้นฐาน", theme: "sakura", cards: parsed.cards });
    setSourceText(SAMPLE_TEXT);
    applyDeck(nextDeck, false);
    toast.success("โหลดตัวอย่าง 8 ใบแล้ว");
  }

  function clearAll() {
    const fallback = defaultDraft();
    localStorage.removeItem(STORAGE_KEY);
    setTitle(fallback.title);
    setTheme(fallback.theme);
    setSourceText("");
    setDeck(null);
    setStudyIds([]);
    setActiveIndex(0);
    setFlipped(false);
    setKnownIds(new Set());
    setRetryIds(new Set());
    setEditId(null);
    setFront("");
    setBack("");
    setError("");
    toast.info("ล้างชุดบัตรคำแล้ว");
  }

  function previousCard() {
    if (!studyIds.length) return;
    setActiveIndex((current) => Math.max(0, current - 1));
    setFlipped(false);
  }

  function nextCard() {
    if (!studyIds.length) return;
    setActiveIndex((current) => Math.min(studyIds.length - 1, current + 1));
    setFlipped(false);
  }

  function classify(known: boolean) {
    if (!activeCard) return;
    if (known) {
      setKnownIds((current) => new Set([...current, activeCard.id]));
      setRetryIds((current) => { const next = new Set(current); next.delete(activeCard.id); return next; });
    } else {
      setRetryIds((current) => new Set([...current, activeCard.id]));
      setKnownIds((current) => { const next = new Set(current); next.delete(activeCard.id); return next; });
    }
    nextCard();
  }

  function shuffleStudy() {
    if (!deck) return;
    resetStudy(deck, true);
    toast.success("สลับลำดับบัตรแล้ว");
  }

  function startEdit(card?: Flashcard) {
    setEditId(card?.id ?? null);
    setFront(card?.front ?? "");
    setBack(card?.back ?? "");
    window.setTimeout(() => document.getElementById("flashcard-front")?.focus(), 0);
  }

  function saveCard() {
    if (!deck) return;
    try {
      const nextDeck = editId ? updateFlashcard(deck, editId, { front, back }) : addFlashcard(deck, { front, back });
      setDeck(nextDeck);
      setSourceText(flashcardMakerTsv(nextDeck));
      setStudyIds((current) => editId ? current : [...current, nextDeck.cards.at(-1)!.id]);
      setEditId(null);
      setFront("");
      setBack("");
      setError("");
      toast.success(editId ? "แก้ไขบัตรคำแล้ว" : "เพิ่มบัตรคำแล้ว");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกบัตรคำไม่สำเร็จ");
    }
  }

  function deleteCard(card: Flashcard) {
    if (!deck) return;
    if (deck.cards.length <= 1) { toast.error("ชุดบัตรคำต้องเหลืออย่างน้อย 1 ใบ"); return; }
    const nextDeck = removeFlashcard(deck, card.id);
    setDeck(nextDeck);
    setSourceText(flashcardMakerTsv(nextDeck));
    setStudyIds((current) => current.filter((id) => id !== card.id));
    setActiveIndex((current) => Math.min(current, nextDeck.cards.length - 1));
    setKnownIds((current) => { const next = new Set(current); next.delete(card.id); return next; });
    setRetryIds((current) => { const next = new Set(current); next.delete(card.id); return next; });
    if (editId === card.id) startEdit();
    toast.info("ลบบัตรคำแล้ว");
  }

  async function importFile(file: File) {
    try {
      const maximum = file.name.toLocaleLowerCase().endsWith(".json") ? FLASHCARD_MAKER_MAX_JSON_LENGTH : FLASHCARD_MAKER_MAX_TEXT_LENGTH;
      if (file.size > maximum) throw new Error("ไฟล์มีขนาดใหญ่เกินไป");
      const text = await file.text();
      if (file.name.toLocaleLowerCase().endsWith(".json")) {
        applyDeck(restoreFlashcardDeck(text));
      } else {
        const parsed = file.name.toLocaleLowerCase().endsWith(".csv") ? parseFlashcardCsv(text) : parseFlashcardText(text);
        const fileTitle = file.name.replace(/\.[^.]+$/, "").trim() || title;
        applyDeck(createFlashcardDeck({ title: fileTitle, theme, cards: parsed.cards }));
        if (parsed.duplicateCount) toast.info(`ตัดรายการซ้ำ ${parsed.duplicateCount} รายการ`);
      }
      toast.success("นำเข้าชุดบัตรคำแล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "นำเข้าไฟล์ไม่สำเร็จ");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function exportPng() {
    if (!deck || !activeCard) return;
    let svgUrl = "";
    try {
      await document.fonts.ready;
      const svg = flashcardMakerSvg(deck, activeCard.id);
      svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("สร้างภาพไม่สำเร็จ")); image.src = svgUrl; });
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 800;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser ไม่รองรับ Canvas");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("สร้างภาพไม่สำเร็จ")), "image/png"));
      downloadBlob(blob, `meaw-flashcard-${activeIndex + 1}.png`);
      toast.success("ดาวน์โหลด PNG แล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "สร้าง PNG ไม่สำเร็จ");
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
    }
  }

  return (
    <WorkspaceFrame className="overflow-x-hidden">
      <div className="flashcard-maker-no-print space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/65 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary"><GraduationCap />Local-first study deck</Badge>
            <h2 className="mt-2 font-heading text-xl font-bold">สร้างบัตรคำ แล้วฝึกจำด้วยการพลิกการ์ด</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">วางคำถาม–คำตอบสูงสุด 200 ใบ เรียนแบบ Shuffle และประเมิน “จำได้/ทบทวนอีก” พร้อมนำเข้า CSV และพิมพ์ด้านหน้า–หลังโดยไม่ต้องสมัครสมาชิก</p>
          </div>
          <ActionBar>
            <Button type="button" variant="outline" onClick={loadSample} data-testid="flashcard-sample"><FlaskConical />ตัวอย่าง</Button>
            <Button type="button" variant="outline" onClick={() => importRef.current?.click()} data-testid="flashcard-import"><FileUp />นำเข้า</Button>
            <Button type="button" variant="outline" onClick={clearAll} data-testid="flashcard-clear"><Eraser />ล้าง</Button>
            <input ref={importRef} type="file" accept=".json,.csv,.tsv,.txt,application/json,text/csv,text/tab-separated-values,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
          </ActionBar>
        </div>

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <section className="space-y-5 rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5" aria-labelledby="flashcard-settings-heading">
            <div><h3 id="flashcard-settings-heading" className="font-heading text-lg font-bold">สร้างชุดบัตรคำ</h3><p className="mt-1 text-sm text-muted-foreground">กรอกชื่อ เลือกสี และวางคู่คำถาม–คำตอบ</p></div>
            <div className="space-y-2.5"><Label htmlFor="flashcard-title">ชื่อชุดบัตรคำ</Label><Input id="flashcard-title" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="เช่น ศัพท์สอบ JLPT N5" /></div>
            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium">ธีมสี</legend>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((item) => <button key={item.value} type="button" className={cn("rounded-xl border bg-gradient-to-br p-3 text-left transition hover:-translate-y-0.5", item.card, theme === item.value ? "border-foreground/55 ring-2 ring-primary/20" : "border-border/70")} aria-pressed={theme === item.value} onClick={() => { setTheme(item.value); if (deck) setDeck({ ...deck, theme: item.value }); }}><span className="flex items-center gap-2 text-xs font-bold"><span className={cn("size-2.5 rounded-full", item.dot)} />{item.label}</span><span className="mt-1 block text-[11px] text-muted-foreground">{item.description}</span></button>)}
              </div>
            </fieldset>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3"><Label htmlFor="flashcard-source">คำถามและคำตอบ</Label><span className="text-xs text-muted-foreground">{sourceText.split(/\r?\n/).filter(Boolean).length} บรรทัด</span></div>
              <Textarea id="flashcard-source" className="min-h-72 font-mono text-xs leading-6" value={sourceText} maxLength={FLASHCARD_MAKER_MAX_TEXT_LENGTH} onChange={(event) => setSourceText(event.target.value)} placeholder={"คำถาม[TAB]คำตอบ\nหรือ คำศัพท์ | ความหมาย"} />
              <p className="text-xs leading-5 text-muted-foreground">หนึ่งใบต่อบรรทัด คั่นด้านหน้ากับด้านหลังด้วย <code>Tab</code> หรือ <code> | </code> รองรับข้อความหลายภาษา</p>
            </div>
            {error ? <Alert variant="destructive"><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="button" size="lg" className="w-full" onClick={generate} data-testid="flashcard-generate"><Sparkles />สร้างชุดบัตรคำ</Button>
          </section>

          <section className="min-w-0 space-y-5" aria-live="polite">
            {!deck || !activeCard ? (
              <div className="grid min-h-[36rem] place-items-center rounded-2xl border border-dashed border-border bg-muted/15 p-8 text-center">
                <div className="max-w-sm"><BookOpen className="mx-auto size-12 text-primary/55" /><h3 className="mt-4 font-heading text-lg font-bold">บัตรคำจะปรากฏที่นี่</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">กด “ตัวอย่าง” เพื่อทดลองเรียนทันที หรือวางคำถาม–คำตอบแล้วสร้างชุดของคุณ</p></div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5" data-testid="flashcard-result">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><Badge variant="secondary">{deck.cards.length} ใบ · ประเมินแล้ว {classifiedCount}</Badge><h3 className="mt-2 font-heading text-xl font-bold">{deck.title}</h3><p className="mt-1 text-sm text-muted-foreground">เรียนใบที่ {activeIndex + 1} จาก {studyIds.length}</p></div>
                    <ActionBar>
                      <Button type="button" variant="outline" size="sm" onClick={() => void copyText(flashcardDeckToText(deck), "คัดลอกชุดบัตรคำแล้ว")} data-testid="flashcard-copy"><Clipboard />คัดลอก</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(flashcardMakerCsv(deck), "meaw-flashcards.csv", "text/csv;charset=utf-8")} data-testid="flashcard-csv"><FileSpreadsheet />CSV</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(flashcardMakerTsv(deck), "meaw-flashcards.tsv", "text/tab-separated-values;charset=utf-8")} data-testid="flashcard-tsv"><FileText />TSV</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(serializeFlashcardDeck(deck), "meaw-flashcards.json", "application/json;charset=utf-8")} data-testid="flashcard-json"><FileJson />JSON</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadText(flashcardMakerSvg(deck, activeCard.id), `meaw-flashcard-${activeIndex + 1}.svg`, "image/svg+xml;charset=utf-8")} data-testid="flashcard-svg"><FileImage />SVG</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void exportPng()} data-testid="flashcard-png"><Download />PNG</Button>
                    </ActionBar>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((activeIndex + 1) / studyIds.length) * 100}%` }} /></div>
                  <div className="mt-5"><StudyCard card={activeCard} flipped={flipped} theme={deck.theme} onFlip={() => setFlipped((value) => !value)} onPrevious={previousCard} onNext={nextCard} /></div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" onClick={previousCard} disabled={activeIndex === 0} aria-label="บัตรก่อนหน้า"><ChevronLeft /></Button>
                      <Button type="button" variant="outline" onClick={() => setFlipped((value) => !value)}>{flipped ? "ดูด้านหน้า" : "พลิกดูคำตอบ"}</Button>
                      <Button type="button" variant="outline" size="icon" onClick={nextCard} disabled={activeIndex >= studyIds.length - 1} aria-label="บัตรถัดไป"><ChevronRight /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => classify(false)} data-testid="flashcard-retry"><ThumbsDown />ทบทวนอีก</Button>
                      <Button type="button" onClick={() => classify(true)} data-testid="flashcard-known"><ThumbsUp />จำได้</Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap gap-3"><span className="text-emerald-700 dark:text-emerald-300"><Check className="mr-1 inline size-4" />จำได้ {knownIds.size}</span><span className="text-amber-700 dark:text-amber-300"><RotateCcw className="mr-1 inline size-4" />ทบทวน {retryIds.size}</span></div>
                    <div className="flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => resetStudy(deck)}><RotateCcw />เริ่มใหม่</Button><Button type="button" size="sm" variant="ghost" onClick={shuffleStudy} data-testid="flashcard-shuffle"><Shuffle />สลับลำดับ</Button></div>
                  </div>
                  {classifiedCount === deck.cards.length ? <Alert className="mt-4"><AlertTitle>เรียนครบชุดแล้ว 🎉</AlertTitle><AlertDescription>จำได้ {knownIds.size} ใบ และมี {retryIds.size} ใบที่ควรทบทวนอีกครั้ง กดสลับลำดับหรือเริ่มใหม่ได้ทันที</AlertDescription></Alert> : null}
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-heading text-lg font-bold">แก้ไขและเพิ่มบัตรคำ</h3><p className="mt-1 text-sm text-muted-foreground">แก้รายใบโดยไม่ต้องสร้างชุดใหม่ทั้งหมด</p></div>{editId ? <Badge variant="outline">กำลังแก้ไข</Badge> : <Badge variant="outline">เพิ่มใบใหม่</Badge>}</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2.5"><Label htmlFor="flashcard-front">ด้านหน้า</Label><Textarea id="flashcard-front" className="min-h-28" value={front} maxLength={1_000} onChange={(event) => setFront(event.target.value)} placeholder="คำถาม คำศัพท์ หรือหัวข้อ" /></div>
                    <div className="space-y-2.5"><Label htmlFor="flashcard-back">ด้านหลัง</Label><Textarea id="flashcard-back" className="min-h-28" value={back} maxLength={1_000} onChange={(event) => setBack(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && event.ctrlKey && !event.nativeEvent.isComposing) saveCard(); }} placeholder="คำตอบ ความหมาย หรือคำอธิบาย" /></div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">{editId ? <Button type="button" variant="outline" onClick={() => startEdit()}>ยกเลิก</Button> : null}<Button type="button" onClick={saveCard} data-testid="flashcard-save-card"><Plus />{editId ? "บันทึกการแก้ไข" : "เพิ่มบัตรคำ"}</Button></div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-heading text-lg font-bold">รายการทั้งหมด</h3><p className="mt-1 text-sm text-muted-foreground">{visibleCards.length} จาก {deck.cards.length} ใบ</p></div><div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="flashcard-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ค้นหาบัตรคำ" placeholder="ค้นหาด้านหน้าหรือหลัง" /></div></div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2" data-testid="flashcard-list">
                    {visibleCards.map((card, index) => <article key={card.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-border/65 bg-muted/15 p-3 [content-visibility:auto]" data-testid="flashcard-list-item"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{deck.cards.indexOf(card) + 1}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 whitespace-pre-wrap break-words text-sm font-semibold">{card.front}</p><p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{card.back}</p></div><div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon-sm" onClick={() => startEdit(card)} aria-label={`แก้ไขบัตร ${index + 1}`}><Pencil /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteCard(card)} aria-label={`ลบบัตร ${index + 1}`}><Trash2 /></Button></div></article>)}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/45 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-heading text-lg font-bold">พิมพ์บัตรคำ / บันทึก PDF</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">เลือกแบบหน้า–หลังในใบเดียว หรือ Duplex ที่สลับคอลัมน์ด้านหลังเพื่อช่วยจัดแนว</p></div><Button type="button" variant="outline" onClick={() => window.print()} data-testid="flashcard-print"><Printer />Print/PDF</Button></div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2.5"><Label htmlFor="flashcard-print-mode">รูปแบบพิมพ์</Label><select id="flashcard-print-mode" className="meaw-field h-9 w-full rounded-lg border border-input px-3 text-sm" value={printMode} onChange={(event) => setPrintMode(event.target.value as PrintMode)}><option value="single">หน้า–หลังอยู่ในใบเดียว</option><option value="duplex">พิมพ์สองหน้า (Duplex)</option></select></div>
                    <div className="space-y-2.5"><Label htmlFor="flashcard-per-page">จำนวนช่องต่อหน้า</Label><select id="flashcard-per-page" className="meaw-field h-9 w-full rounded-lg border border-input px-3 text-sm" value={perPage} onChange={(event) => setPerPage(Number(event.target.value) as 4 | 8)}><option value={4}>4 ใบ / หน้า</option><option value={8}>8 ใบ / หน้า</option></select></div>
                  </div>
                  <Alert className="mt-4"><AlertTitle>{printMode === "duplex" ? "ตรวจทิศทางพลิกกระดาษก่อนพิมพ์จริง" : "เหมาะกับการตัดแล้วพับหรืออ่านสองส่วน"}</AlertTitle><AlertDescription>{printMode === "duplex" ? "เลือกพิมพ์สองหน้าแบบพลิกขอบยาว (long-edge) และทดลอง 1 แผ่นก่อน เพราะเครื่องพิมพ์แต่ละรุ่นอาจกลับด้านต่างกัน" : "ด้านหน้าและคำตอบอยู่ในช่องเดียวกัน ไม่ต้องจัดแนวเครื่องพิมพ์สองหน้า"}</AlertDescription></Alert>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {deck ? <div className="flashcard-print-surface" aria-hidden="true">
        <header className="flashcard-print-header"><h1>{deck.title}</h1><p>{deck.cards.length} flashcards · {printMode === "duplex" ? "Duplex long-edge" : "Front and back together"} · {perPage} cards per page</p></header>
        {printSheets.map((sheet, sheetIndex) => printMode === "single" ? (
          <section key={`single-${sheetIndex}`} className="flashcard-print-page" data-cards-per-page={perPage}>{sheet.fronts.map((card, index) => <PrintCard key={card?.id ?? `empty-${index}`} card={card} side="front" showBoth />)}</section>
        ) : (
          <div key={`duplex-${sheetIndex}`}>
            <section className="flashcard-print-page" data-cards-per-page={perPage}>{sheet.fronts.map((card, index) => <PrintCard key={card?.id ?? `front-empty-${index}`} card={card} side="front" />)}</section>
            <section className="flashcard-print-page" data-cards-per-page={perPage}>{sheet.backs.map((card, index) => <PrintCard key={card?.id ?? `back-empty-${index}`} card={card} side="back" />)}</section>
          </div>
        ))}
      </div> : null}
    </WorkspaceFrame>
  );
}
