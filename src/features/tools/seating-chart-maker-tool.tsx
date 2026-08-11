"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  Ban,
  CheckCircle2,
  CircleDot,
  Clipboard,
  Dices,
  Download,
  Eraser,
  FileJson,
  FileUp,
  FlaskConical,
  ImageDown,
  Lock,
  Printer,
  Redo2,
  RefreshCw,
  Rows3,
  Search,
  ShieldCheck,
  Sparkles,
  Undo2,
  Unlock,
  UserCheck,
  UserRoundX,
  UsersRound,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  SEATING_MAX_COLUMNS,
  SEATING_MAX_JSON_LENGTH,
  SEATING_MAX_PEOPLE,
  SEATING_MAX_ROWS,
  SEATING_MAX_SEATS_PER_TABLE,
  SEATING_MAX_TABLES,
  assignPersonToSeat,
  assignUnseatedPeople,
  clearSeatingAssignments,
  createSeatingChart,
  generateSeatingSeed,
  getUnseatedPeople,
  parseSeatingPeople,
  reshuffleSeating,
  restoreSeatingChart,
  seatingChartToCsv,
  seatingChartToText,
  serializeSeatingChart,
  toggleSeatLock,
  toggleSeatUnavailable,
  unassignSeat,
  type SeatingChartState,
  type SeatingLayout,
  type SeatingPerson,
  type SeatingSeat,
  type SeatingStrategy,
} from "@/lib/tools/seating-chart";

const STORAGE_KEY = "meaw-seating-chart-maker-v1";
const STORAGE_VERSION = 1 as const;
const HISTORY_LIMIT = 30;

const EXAMPLE_PEOPLE = [
  "มะลิ | ทีมแดง",
  "สมชาย | ทีมน้ำเงิน",
  "น้ำฝน | ทีมแดง",
  "ต้นกล้า | ทีมเขียว",
  "ฟ้าใส | ทีมเหลือง",
  "ภูผา | ทีมเขียว",
  "ใบหม่อน | ทีมน้ำเงิน",
  "นนท์ | ทีมเหลือง",
  "พิม | ทีมแดง",
  "อาร์ม | ทีมเขียว",
  "ข้าวหอม | ทีมน้ำเงิน",
  "เจ | ทีมเหลือง",
  "มีนา | ทีมแดง",
  "ต้นน้ำ | ทีมน้ำเงิน",
  "พลอย | ทีมเขียว",
  "อิงฟ้า | ทีมเหลือง",
  "วิน | ทีมแดง",
  "นานา | ทีมน้ำเงิน",
  "ภีม | ทีมเขียว",
  "เบล | ทีมเหลือง",
  "คิม | ทีมแดง",
  "แพรว | ทีมน้ำเงิน",
  "ปุณ | ทีมเขียว",
  "ขิม | ทีมเหลือง",
].join("\n");

const GROUP_STYLES = [
  "border-rose-500/35 bg-rose-500/[0.08] text-rose-800 dark:text-rose-200",
  "border-sky-500/35 bg-sky-500/[0.08] text-sky-800 dark:text-sky-200",
  "border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-200",
  "border-amber-500/35 bg-amber-500/[0.08] text-amber-900 dark:text-amber-200",
  "border-violet-500/35 bg-violet-500/[0.08] text-violet-800 dark:text-violet-200",
  "border-cyan-500/35 bg-cyan-500/[0.08] text-cyan-800 dark:text-cyan-200",
] as const;

const GROUP_CANVAS = ["#e11d48", "#0284c7", "#059669", "#d97706", "#7c3aed", "#0891b2"] as const;

type InitialModel = {
  title: string;
  peopleText: string;
  layout: SeatingLayout;
  strategy: SeatingStrategy;
  rows: string;
  columns: string;
  tableCount: string;
  seatsPerTable: string;
  seed: string;
  chart: SeatingChartState | null;
};

type StoredDraft = Omit<InitialModel, "chart"> & {
  version: typeof STORAGE_VERSION;
  chart: SeatingChartState | null;
};

function defaultInitialModel(): InitialModel {
  return {
    title: "ผังที่นั่งของฉัน",
    peopleText: "",
    layout: "classroom",
    strategy: "spread",
    rows: "5",
    columns: "6",
    tableCount: "4",
    seatsPerTable: "8",
    seed: "meaw-seat-a",
    chart: null,
  };
}

function peopleToText(people: readonly SeatingPerson[]): string {
  return people.map((person) => `${person.name}${person.group ? ` | ${person.group}` : ""}`).join("\n");
}

function modelFromChart(chart: SeatingChartState): InitialModel {
  return {
    title: chart.title,
    peopleText: peopleToText(chart.people),
    layout: chart.layout,
    strategy: chart.strategy,
    rows: String(chart.rows),
    columns: String(chart.columns),
    tableCount: String(chart.tableCount),
    seatsPerTable: String(chart.seatsPerTable),
    seed: chart.seed,
    chart,
  };
}

function loadInitialModel(): InitialModel {
  const fallback = defaultInitialModel();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > SEATING_MAX_JSON_LENGTH) return fallback;
    const source = JSON.parse(raw) as Partial<StoredDraft>;
    if (source.version !== STORAGE_VERSION) throw new Error("version");
    if (source.chart) return modelFromChart(restoreSeatingChart(JSON.stringify(source.chart)));
    if (
      typeof source.title !== "string" ||
      typeof source.peopleText !== "string" ||
      (source.layout !== "classroom" && source.layout !== "round-tables") ||
      !["random", "spread", "together"].includes(String(source.strategy)) ||
      typeof source.rows !== "string" ||
      typeof source.columns !== "string" ||
      typeof source.tableCount !== "string" ||
      typeof source.seatsPerTable !== "string" ||
      typeof source.seed !== "string"
    ) throw new Error("draft");
    return {
      title: source.title,
      peopleText: source.peopleText,
      layout: source.layout,
      strategy: source.strategy as SeatingStrategy,
      rows: source.rows,
      columns: source.columns,
      tableCount: source.tableCount,
      seatsPerTable: source.seatsPerTable,
      seed: source.seed,
      chart: null,
    };
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is optional; the editor remains usable without persistence.
    }
    return fallback;
  }
}

function groupIndex(group: string): number {
  if (!group) return -1;
  let hash = 0;
  for (let index = 0; index < group.length; index += 1) hash = (hash * 31 + group.charCodeAt(index)) >>> 0;
  return hash % GROUP_STYLES.length;
}

function groupStyle(group: string): string {
  const index = groupIndex(group);
  return index < 0 ? "border-border bg-card text-foreground" : GROUP_STYLES[index] ?? GROUP_STYLES[0];
}

function canvasGroupColor(group: string): string {
  const index = groupIndex(group);
  return index < 0 ? "#64748b" : GROUP_CANVAS[index] ?? GROUP_CANVAS[0];
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  maxFontSize: number,
): void {
  let fontSize = maxFontSize;
  while (fontSize > 16) {
    context.font = `700 ${fontSize}px "Noto Sans Thai", sans-serif`;
    if (context.measureText(text).width <= width) break;
    fontSize -= 2;
  }
  context.fillText(text, x, y, width);
}

async function renderSeatingChartPng(state: SeatingChartState): Promise<Blob> {
  await document.fonts.ready;
  const people = new Map(state.people.map((person) => [person.id, person]));
  const width = 1_800;
  const margin = 90;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser นี้ไม่รองรับ Canvas");

  if (state.layout === "classroom") {
    const gap = 18;
    const availableWidth = width - margin * 2;
    const seatWidth = (availableWidth - gap * (state.columns - 1)) / state.columns;
    const seatHeight = Math.max(105, Math.min(160, seatWidth * 0.72));
    canvas.height = Math.ceil(390 + state.rows * (seatHeight + gap));
    context.fillStyle = "#f8faf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#17231b";
    context.font = '900 72px "Noto Sans Thai", sans-serif';
    context.fillText(state.title, width / 2, 85, width - 240);
    context.fillStyle = "#39734c";
    context.fillRect(420, 150, 960, 78);
    context.fillStyle = "#ffffff";
    context.font = '800 34px "Noto Sans Thai", sans-serif';
    context.fillText("หน้าห้อง / เวที", width / 2, 189);
    for (const seat of state.seats) {
      const x = margin + seat.column * (seatWidth + gap);
      const y = 285 + seat.row * (seatHeight + gap);
      const person = seat.personId ? people.get(seat.personId) : undefined;
      context.fillStyle = seat.unavailable ? "#e5e7eb" : person ? "#ffffff" : "#f1f5f9";
      context.strokeStyle = person ? canvasGroupColor(person.group) : "#94a3b8";
      context.lineWidth = seat.locked ? 8 : 3;
      context.beginPath();
      context.roundRect(x, y, seatWidth, seatHeight, 18);
      context.fill();
      context.stroke();
      context.fillStyle = seat.unavailable ? "#64748b" : "#17231b";
      drawFittedText(context, seat.unavailable ? "ปิดที่นั่ง" : person?.name ?? "ว่าง", x + seatWidth / 2, y + seatHeight * 0.43, seatWidth - 24, 30);
      context.fillStyle = person?.group ? canvasGroupColor(person.group) : "#64748b";
      context.font = '600 18px "Noto Sans Thai", sans-serif';
      context.fillText(person?.group || seat.id, x + seatWidth / 2, y + seatHeight * 0.76, seatWidth - 20);
    }
  } else {
    const columns = 3;
    const cardWidth = 520;
    const cardHeight = 420;
    const gap = 28;
    const rows = Math.ceil(state.tableCount / columns);
    canvas.height = 250 + rows * (cardHeight + gap) + 90;
    context.fillStyle = "#f8faf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#17231b";
    context.font = '900 72px "Noto Sans Thai", sans-serif';
    context.fillText(state.title, width / 2, 85, width - 240);
    for (let table = 0; table < state.tableCount; table += 1) {
      const cardX = margin + (table % columns) * (cardWidth + gap);
      const cardY = 170 + Math.floor(table / columns) * (cardHeight + gap);
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#a7c7ad";
      context.lineWidth = 3;
      context.beginPath();
      context.roundRect(cardX, cardY, cardWidth, cardHeight, 32);
      context.fill();
      context.stroke();
      context.fillStyle = "#39734c";
      context.beginPath();
      context.arc(cardX + cardWidth / 2, cardY + 78, 58, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = '800 27px "Noto Sans Thai", sans-serif';
      context.fillText(`โต๊ะ ${table + 1}`, cardX + cardWidth / 2, cardY + 78);
      const tableSeats = state.seats.filter((seat) => seat.row === table);
      tableSeats.forEach((seat, index) => {
        const person = seat.personId ? people.get(seat.personId) : undefined;
        const itemWidth = 225;
        const itemHeight = 62;
        const x = cardX + 25 + (index % 2) * 245;
        const y = cardY + 155 + Math.floor(index / 2) * 72;
        context.fillStyle = seat.unavailable ? "#e5e7eb" : "#f8fafc";
        context.strokeStyle = person ? canvasGroupColor(person.group) : "#cbd5e1";
        context.lineWidth = seat.locked ? 6 : 2;
        context.beginPath();
        context.roundRect(x, y, itemWidth, itemHeight, 14);
        context.fill();
        context.stroke();
        context.fillStyle = "#17231b";
        drawFittedText(context, seat.unavailable ? "ปิดที่นั่ง" : person?.name ?? "ว่าง", x + itemWidth / 2, y + itemHeight / 2, itemWidth - 18, 23);
      });
    }
  }
  context.fillStyle = "#475569";
  context.font = '500 22px "Noto Sans Thai", sans-serif';
  context.fillText(`สร้างด้วย Meaw Tools · Seed ${state.seed}`, width / 2, canvas.height - 42, width - 180);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("สร้าง PNG ไม่สำเร็จ")), "image/png");
  });
}

function SeatButton({
  seat,
  person,
  selected,
  onClick,
}: {
  seat: SeatingSeat;
  person?: SeatingPerson;
  selected: boolean;
  onClick: () => void;
}) {
  const status = seat.unavailable ? "ปิดที่นั่ง" : person ? person.name : "ว่าง";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative grid min-h-20 min-w-0 place-items-center overflow-hidden rounded-xl border p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        seat.unavailable ? "border-dashed bg-muted text-muted-foreground" : person ? groupStyle(person.group) : "bg-card/75 text-muted-foreground",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      aria-pressed={selected}
      aria-label={`${seat.label}: ${status}${seat.locked ? " ล็อกแล้ว" : ""}`}
      data-testid={`seating-seat-${seat.id}`}
    >
      {seat.locked ? <Lock className="absolute right-1.5 top-1.5 size-3.5" aria-hidden="true" /> : null}
      {seat.unavailable ? <Ban className="size-5" aria-hidden="true" /> : person ? (
        <span className="min-w-0">
          <span className="line-clamp-2 block break-words text-xs font-bold sm:text-sm">{person.name}</span>
          <span className="mt-1 block truncate text-[10px] opacity-70">{person.group || seat.id}</span>
        </span>
      ) : (
        <span className="text-xs">{seat.id}<span className="mt-1 block opacity-65">ว่าง</span></span>
      )}
    </button>
  );
}

function SeatingBoard({
  state,
  selectedSeatId,
  onSeatClick,
}: {
  state: SeatingChartState;
  selectedSeatId: string;
  onSeatClick: (seat: SeatingSeat) => void;
}) {
  const people = new Map(state.people.map((person) => [person.id, person]));
  if (state.layout === "classroom") {
    return (
      <div className="seating-chart-viewport overflow-x-auto pb-2" role="region" aria-label="ผังห้องเรียนที่เลื่อนได้" tabIndex={0}>
        <div className="seating-chart-grid" style={{ minWidth: `${Math.max(100, state.columns * 5.8)}rem` }} data-testid="seating-chart-grid">
          <div className="mx-auto mb-5 grid min-h-12 max-w-3xl place-items-center rounded-xl border border-primary/30 bg-primary/10 font-heading font-bold text-primary">หน้าห้อง / เวที</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${state.columns}, minmax(5rem, 1fr))` }} role="grid" aria-label={state.title}>
            {state.seats.map((seat) => (
              <SeatButton key={seat.id} seat={seat} person={seat.personId ? people.get(seat.personId) : undefined} selected={selectedSeatId === seat.id} onClick={() => onSeatClick(seat)} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="seating-table-grid grid gap-4 md:grid-cols-2" data-testid="seating-chart-grid">
      {Array.from({ length: state.tableCount }, (_, tableIndex) => {
        const seats = state.seats.filter((seat) => seat.row === tableIndex);
        return (
          <section key={tableIndex} className="rounded-[2rem] border bg-card/70 p-4 shadow-sm [content-visibility:auto]" aria-labelledby={`seating-table-${tableIndex}`}>
            <div className="mx-auto grid size-24 place-items-center rounded-full border-4 border-primary/25 bg-primary/10 text-center text-primary shadow-inner">
              <span id={`seating-table-${tableIndex}`} className="font-heading text-sm font-black">โต๊ะ<br />{tableIndex + 1}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2" role="grid" aria-label={`โต๊ะ ${tableIndex + 1}`}>
              {seats.map((seat) => (
                <SeatButton key={seat.id} seat={seat} person={seat.personId ? people.get(seat.personId) : undefined} selected={selectedSeatId === seat.id} onClick={() => onSeatClick(seat)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SeatingChartMakerTool() {
  const [initial] = useState(() => loadInitialModel());
  const [title, setTitle] = useState(initial.title);
  const [peopleText, setPeopleText] = useState(initial.peopleText);
  const [layout, setLayout] = useState<SeatingLayout>(initial.layout);
  const [strategy, setStrategy] = useState<SeatingStrategy>(initial.strategy);
  const [rows, setRows] = useState(initial.rows);
  const [columns, setColumns] = useState(initial.columns);
  const [tableCount, setTableCount] = useState(initial.tableCount);
  const [seatsPerTable, setSeatsPerTable] = useState(initial.seatsPerTable);
  const [seed, setSeed] = useState(initial.seed);
  const [chart, setChart] = useState<SeatingChartState | null>(initial.chart);
  const [past, setPast] = useState<SeatingChartState[]>([]);
  const [future, setFuture] = useState<SeatingChartState[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedSeatId, setSelectedSeatId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    try {
      const parsed = parseSeatingPeople(peopleText);
      return { count: parsed.people.length, duplicates: parsed.duplicateNames.length, error: "" };
    } catch (caught) {
      return { count: 0, duplicates: 0, error: peopleText.trim() ? caught instanceof Error ? caught.message : "อ่านรายชื่อไม่ได้" : "" };
    }
  }, [peopleText]);

  const selectedSeat = chart?.seats.find((seat) => seat.id === selectedSeatId) ?? null;
  const selectedPerson = chart?.people.find((person) => person.id === selectedPersonId) ?? null;
  const unseated = chart ? getUnseatedPeople(chart) : [];
  const filteredPeople = chart?.people.filter((person) => {
    const query = search.trim().toLocaleLowerCase("th-TH");
    return !query || `${person.name} ${person.group}`.toLocaleLowerCase("th-TH").includes(query);
  }) ?? [];
  const seatByPerson = useMemo(() => new Map(chart?.seats.flatMap((seat) => seat.personId ? [[seat.personId, seat] as const] : []) ?? []), [chart]);

  useEffect(() => {
    const draft: StoredDraft = { version: STORAGE_VERSION, title, peopleText, layout, strategy, rows, columns, tableCount, seatsPerTable, seed, chart };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Local persistence is optional; all editing and exports continue to work.
    }
  }, [chart, columns, layout, peopleText, rows, seatsPerTable, seed, strategy, tableCount, title]);

  const invalidate = () => {
    setChart(null);
    setPast([]);
    setFuture([]);
    setSelectedPersonId("");
    setSelectedSeatId("");
    setError("");
  };

  const commitChart = (next: SeatingChartState) => {
    if (!chart || next === chart) return;
    setPast((current) => [...current.slice(-(HISTORY_LIMIT - 1)), chart]);
    setFuture([]);
    setChart(next);
    setSeed(next.seed);
  };

  const runChartAction = (action: () => SeatingChartState) => {
    try {
      commitChart(action());
      setError("");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "แก้ผังที่นั่งไม่สำเร็จ");
    }
  };

  const generate = () => {
    try {
      const nextSeed = seed.trim() || generateSeatingSeed();
      const next = createSeatingChart({
        title,
        peopleText,
        layout,
        strategy,
        rows: Number(rows),
        columns: Number(columns),
        tableCount: Number(tableCount),
        seatsPerTable: Number(seatsPerTable),
        seed: nextSeed,
      });
      setChart(next);
      setSeed(nextSeed);
      setPast([]);
      setFuture([]);
      setSelectedPersonId("");
      setSelectedSeatId("");
      setError("");
      if (next.duplicateNames.length) toast.info(`ตัดชื่อซ้ำ ${next.duplicateNames.length} รายการ`);
      toast.success(`จัด ${next.people.length} คนลง ${next.seats.length} ที่นั่งแล้ว`);
    } catch (caught) {
      setChart(null);
      setError(caught instanceof Error ? caught.message : "สร้างผังที่นั่งไม่สำเร็จ");
    }
  };

  const undo = () => {
    const previous = past.at(-1);
    if (!previous || !chart) return;
    setPast((current) => current.slice(0, -1));
    setFuture((current) => [chart, ...current].slice(0, HISTORY_LIMIT));
    setChart(previous);
    setSeed(previous.seed);
    setSelectedPersonId("");
    setSelectedSeatId("");
  };

  const redo = () => {
    const next = future[0];
    if (!next || !chart) return;
    setFuture((current) => current.slice(1));
    setPast((current) => [...current.slice(-(HISTORY_LIMIT - 1)), chart]);
    setChart(next);
    setSeed(next.seed);
    setSelectedPersonId("");
    setSelectedSeatId("");
  };

  const handleSeatClick = (seat: SeatingSeat) => {
    setSelectedSeatId(seat.id);
    if (selectedPersonId && chart) {
      runChartAction(() => assignPersonToSeat(chart, selectedPersonId, seat.id));
      setSelectedPersonId("");
      return;
    }
    setSelectedPersonId(seat.personId ?? "");
  };

  const selectPerson = (person: SeatingPerson) => {
    setSelectedPersonId(person.id);
    setSelectedSeatId(seatByPerson.get(person.id)?.id ?? "");
  };

  const loadExample = () => {
    setTitle("ห้องเรียน Meaw Class");
    setPeopleText(EXAMPLE_PEOPLE);
    setLayout("classroom");
    setStrategy("spread");
    setRows("4");
    setColumns("6");
    setTableCount("4");
    setSeatsPerTable("8");
    setSeed("meaw-class-a");
    invalidate();
  };

  const clearAll = () => {
    const fallback = defaultInitialModel();
    setTitle(fallback.title);
    setPeopleText("");
    setLayout(fallback.layout);
    setStrategy(fallback.strategy);
    setRows(fallback.rows);
    setColumns(fallback.columns);
    setTableCount(fallback.tableCount);
    setSeatsPerTable(fallback.seatsPerTable);
    setSeed(fallback.seed);
    invalidate();
    setSearch("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing the visible editor should not depend on storage permission.
    }
    toast.info("ล้างรายชื่อและผังที่นั่งแล้ว");
  };

  const applyImportedChart = (restored: SeatingChartState) => {
    const model = modelFromChart(restored);
    setTitle(model.title);
    setPeopleText(model.peopleText);
    setLayout(model.layout);
    setStrategy(model.strategy);
    setRows(model.rows);
    setColumns(model.columns);
    setTableCount(model.tableCount);
    setSeatsPerTable(model.seatsPerTable);
    setSeed(model.seed);
    setChart(restored);
    setPast([]);
    setFuture([]);
    setSelectedPersonId("");
    setSelectedSeatId("");
    setError("");
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > SEATING_MAX_JSON_LENGTH) throw new Error("ไฟล์ JSON ใหญ่เกิน 1 MB");
      applyImportedChart(restoreSeatingChart(await file.text()));
      toast.success("นำเข้าผังที่นั่งแล้ว");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "นำเข้า JSON ไม่สำเร็จ");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const occupancy = chart?.seats.filter((seat) => seat.personId).length ?? 0;
  const unavailableCount = chart?.seats.filter((seat) => seat.unavailable).length ?? 0;
  const lockedCount = chart?.seats.filter((seat) => seat.locked).length ?? 0;

  return (
    <WorkspaceFrame>
      <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void importJson(event.target.files?.[0])} aria-label="เลือกไฟล์ JSON ผังที่นั่ง" data-testid="seating-import-file" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(20rem,.72fr)_minmax(0,1.28fr)]">
        <form className="seating-no-print space-y-5" onSubmit={(event) => { event.preventDefault(); generate(); }} aria-labelledby="seating-form-heading">
          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 id="seating-form-heading" className="font-heading text-lg font-bold">รายชื่อผู้เข้าร่วม</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">หนึ่งคนต่อหนึ่งบรรทัด · ใส่กลุ่มได้ด้วย ชื่อ | กลุ่ม</p></div>
              <Badge variant="secondary" data-testid="seating-person-count"><UsersRound />{preview.count}/{SEATING_MAX_PEOPLE}</Badge>
            </div>
            <div className="mt-4 space-y-2.5"><Label htmlFor="seating-title">ชื่อผังที่นั่ง</Label><Input id="seating-title" value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); invalidate(); }} placeholder="เช่น ห้องเรียน ม.1/1 หรืองานเลี้ยงบริษัท" /></div>
            <div className="mt-4 space-y-2.5"><Label htmlFor="seating-people">รายชื่อและกลุ่ม</Label><Textarea id="seating-people" value={peopleText} onChange={(event) => { setPeopleText(event.target.value); invalidate(); }} className="min-h-72 resize-y leading-7" placeholder="มะลิ | ทีมแดง\nสมชาย | ทีมน้ำเงิน\nน้ำฝน | ทีมแดง" aria-describedby="seating-people-hint" data-testid="seating-people" /><p id="seating-people-hint" className="text-xs leading-5 text-muted-foreground">ตัดชื่อซ้ำโดยไม่สนตัวพิมพ์ใหญ่–เล็ก{preview.duplicates ? ` · พบชื่อซ้ำ ${preview.duplicates}` : ""}</p></div>
            {preview.error ? <Alert variant="destructive" className="mt-4"><AlertTitle>อ่านรายชื่อไม่ได้</AlertTitle><AlertDescription>{preview.error}</AlertDescription></Alert> : null}
            <div className="mt-4"><ActionBar><Button type="button" size="sm" variant="outline" onClick={loadExample}><FlaskConical />ตัวอย่าง</Button><Button type="button" size="sm" variant="outline" onClick={() => importRef.current?.click()}><FileUp />นำเข้า JSON</Button><Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={clearAll} disabled={!peopleText && !chart}><Eraser />ล้างทั้งหมด</Button></ActionBar></div>
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">รูปแบบพื้นที่</h2>
            <div className="mt-4 space-y-2.5"><Label>ประเภทผัง</Label><div className="grid grid-cols-2 gap-2" role="group" aria-label="ประเภทผังที่นั่ง"><Button type="button" className="h-auto min-h-16 flex-col gap-1 py-2" variant={layout === "classroom" ? "default" : "outline"} aria-pressed={layout === "classroom"} onClick={() => { setLayout("classroom"); invalidate(); }} data-testid="seating-layout-classroom"><Rows3 />แถวและเก้าอี้<span className="text-[10px] font-normal opacity-75">ห้องเรียน · สอบ · ประชุม</span></Button><Button type="button" className="h-auto min-h-16 flex-col gap-1 py-2" variant={layout === "round-tables" ? "default" : "outline"} aria-pressed={layout === "round-tables"} onClick={() => { setLayout("round-tables"); invalidate(); }} data-testid="seating-layout-tables"><CircleDot />โต๊ะกลม<span className="text-[10px] font-normal opacity-75">งานแต่ง · งานเลี้ยง · อีเวนต์</span></Button></div></div>
            {layout === "classroom" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2.5"><Label htmlFor="seating-rows">จำนวนแถว</Label><Input id="seating-rows" type="number" min="1" max={SEATING_MAX_ROWS} value={rows} onChange={(event) => { setRows(event.target.value); invalidate(); }} data-testid="seating-rows" /></div><div className="space-y-2.5"><Label htmlFor="seating-columns">ที่นั่งต่อแถว</Label><Input id="seating-columns" type="number" min="1" max={SEATING_MAX_COLUMNS} value={columns} onChange={(event) => { setColumns(event.target.value); invalidate(); }} data-testid="seating-columns" /></div></div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2.5"><Label htmlFor="seating-table-count">จำนวนโต๊ะ</Label><Input id="seating-table-count" type="number" min="1" max={SEATING_MAX_TABLES} value={tableCount} onChange={(event) => { setTableCount(event.target.value); invalidate(); }} data-testid="seating-table-count" /></div><div className="space-y-2.5"><Label htmlFor="seating-seats-per-table">ที่นั่งต่อโต๊ะ</Label><Input id="seating-seats-per-table" type="number" min="2" max={SEATING_MAX_SEATS_PER_TABLE} value={seatsPerTable} onChange={(event) => { setSeatsPerTable(event.target.value); invalidate(); }} data-testid="seating-seats-per-table" /></div></div>
            )}
          </section>

          <section className="rounded-2xl border bg-card/65 p-4 sm:p-5">
            <h2 className="font-heading text-lg font-bold">วิธีจัดรายชื่อ</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-label="วิธีจัดรายชื่อ">
              {([
                ["random", "สุ่มทั่วไป", "ไม่ใช้ข้อมูลกลุ่ม"],
                ["spread", "กระจายกลุ่ม", "ลดกลุ่มติดกัน"],
                ["together", "ให้อยู่ด้วยกัน", "เรียงกลุ่มต่อเนื่อง"],
              ] as const).map(([value, label, hint]) => <Button key={value} type="button" variant={strategy === value ? "secondary" : "outline"} className="h-auto min-h-16 flex-col gap-1 py-2" aria-pressed={strategy === value} onClick={() => { setStrategy(value); invalidate(); }} data-testid={`seating-strategy-${value}`}><span>{label}</span><span className="text-[10px] font-normal opacity-70">{hint}</span></Button>)}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="space-y-2.5"><Label htmlFor="seating-seed">Seed สำหรับสร้างชุดเดิมซ้ำ</Label><Input id="seating-seed" value={seed} maxLength={80} onChange={(event) => { setSeed(event.target.value); invalidate(); }} data-testid="seating-seed" /></div><Button type="button" variant="outline" className="self-end" onClick={() => { setSeed(generateSeatingSeed()); invalidate(); }}><RefreshCw />สุ่ม Seed</Button></div>
            {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>ยังสร้างผังไม่ได้</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" size="lg" className="mt-5 h-12 w-full" data-testid="seating-generate"><Sparkles />สร้างและจัดผังที่นั่ง</Button>
          </section>

          <Alert className="border-emerald-500/30 bg-emerald-500/5"><ShieldCheck className="text-emerald-700 dark:text-emerald-300" /><AlertTitle>รายชื่ออยู่ใน Browser เครื่องนี้</AlertTitle><AlertDescription>รายชื่อ ผัง การล็อก และประวัติแก้ไขไม่ถูกส่งไป API หรือ Server ฉบับร่างบันทึกใน localStorage ของอุปกรณ์นี้และลบได้ด้วยปุ่มล้างทั้งหมด</AlertDescription></Alert>
        </form>

        <section className="seating-print-surface min-w-0 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5" aria-label="ผลลัพธ์ Seating Chart Maker">
          {chart ? (
            <div data-testid="seating-results">
              <div className="seating-no-print flex flex-wrap items-start justify-between gap-4"><div><Badge variant="secondary"><CheckCircle2 />จัดที่นั่งสำเร็จ</Badge><h2 className="mt-2 font-heading text-xl font-bold">{chart.title}</h2><p className="mt-1 text-sm text-muted-foreground">{chart.people.length} คน · {chart.seats.length} ที่นั่ง · {chart.layout === "classroom" ? `${chart.rows} แถว × ${chart.columns}` : `${chart.tableCount} โต๊ะ × ${chart.seatsPerTable} ที่`}</p></div><ActionBar><Button type="button" variant="outline" onClick={() => void copyText(seatingChartToText(chart), "คัดลอกผังที่นั่งแล้ว")} data-testid="seating-copy"><Clipboard />คัดลอก</Button><Button type="button" variant="outline" onClick={() => downloadText(seatingChartToCsv(chart), "meaw-seating-chart.csv", "text/csv;charset=utf-8")} data-testid="seating-csv"><Download />CSV</Button><Button type="button" variant="outline" onClick={() => void renderSeatingChartPng(chart).then((blob) => { downloadBlob(blob, "meaw-seating-chart.png"); toast.success("ดาวน์โหลด PNG แล้ว"); }).catch((caught: unknown) => toast.error(caught instanceof Error ? caught.message : "สร้าง PNG ไม่สำเร็จ"))} data-testid="seating-png"><ImageDown />PNG</Button><Button type="button" variant="outline" onClick={() => downloadText(serializeSeatingChart(chart), "meaw-seating-chart.json", "application/json;charset=utf-8")} data-testid="seating-json"><FileJson />JSON</Button><Button type="button" variant="outline" onClick={() => window.print()} data-testid="seating-print"><Printer />พิมพ์/PDF</Button></ActionBar></div>
              <header className="seating-print-header hidden border-b pb-4"><h1 className="font-heading text-2xl font-black">{chart.title}</h1><p className="mt-1 text-sm">{chart.people.length} คน · {chart.seats.length} ที่นั่ง · Seed {chart.seed}</p></header>

              <div className="seating-no-print mt-5 grid gap-2 sm:grid-cols-4"><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">จัดแล้ว</p><p className="mt-1 font-mono text-lg font-bold" data-testid="seating-occupied-count">{occupancy}/{chart.people.length}</p></div><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ยังไม่ได้นั่ง</p><p className="mt-1 font-mono text-lg font-bold" data-testid="seating-unseated-count">{unseated.length}</p></div><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ล็อกไว้</p><p className="mt-1 font-mono text-lg font-bold">{lockedCount}</p></div><div className="rounded-xl border bg-card/70 p-3"><p className="text-xs text-muted-foreground">ปิดที่นั่ง</p><p className="mt-1 font-mono text-lg font-bold">{unavailableCount}</p></div></div>

              <div className="seating-no-print mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/55 p-3"><ActionBar><Button type="button" variant="outline" disabled={!past.length} onClick={undo} data-testid="seating-undo"><Undo2 />ย้อนกลับ</Button><Button type="button" variant="outline" disabled={!future.length} onClick={redo} data-testid="seating-redo"><Redo2 />ทำซ้ำ</Button><Button type="button" variant="outline" onClick={() => { const nextSeed = generateSeatingSeed(); runChartAction(() => reshuffleSeating(chart, nextSeed)); setSelectedPersonId(""); setSelectedSeatId(""); }} data-testid="seating-reshuffle"><Dices />สุ่มใหม่</Button><Button type="button" variant="outline" disabled={!unseated.length} onClick={() => runChartAction(() => assignUnseatedPeople(chart, chart.seed))} data-testid="seating-fill-unseated"><UserCheck />จัดคนที่เหลือ</Button><Button type="button" variant="ghost" onClick={() => { runChartAction(() => clearSeatingAssignments(chart)); setSelectedPersonId(""); setSelectedSeatId(""); }}><UserRoundX />นำชื่อออกทั้งหมด</Button></ActionBar><Badge variant="outline">Seed {chart.seed}</Badge></div>

              <div className="mt-5 grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0">
                  <div className="seating-no-print mb-4 rounded-xl border bg-card/60 p-3 text-sm"><p className="font-semibold">{selectedPerson ? `เลือก ${selectedPerson.name} แล้ว — แตะที่นั่งเพื่อย้ายหรือสลับ` : selectedSeat ? `เลือก ${selectedSeat.label}` : "เลือกชื่อจากรายชื่อ แล้วแตะที่นั่งปลายทาง"}</p>{selectedSeat ? <div className="mt-3"><ActionBar><Button type="button" size="sm" variant="outline" disabled={!selectedSeat.personId || selectedSeat.unavailable} onClick={() => runChartAction(() => toggleSeatLock(chart, selectedSeat.id))}>{selectedSeat.locked ? <Unlock /> : <Lock />}{selectedSeat.locked ? "ปลดล็อก" : "ล็อกที่นั่ง"}</Button><Button type="button" size="sm" variant="outline" disabled={Boolean(selectedSeat.personId || selectedSeat.locked)} onClick={() => runChartAction(() => toggleSeatUnavailable(chart, selectedSeat.id))}><Ban />{selectedSeat.unavailable ? "เปิดที่นั่ง" : "ปิดที่นั่ง"}</Button><Button type="button" size="sm" variant="ghost" disabled={!selectedSeat.personId || selectedSeat.locked} onClick={() => { runChartAction(() => unassignSeat(chart, selectedSeat.id)); setSelectedPersonId(""); }}><UserRoundX />นำชื่อออก</Button></ActionBar></div> : null}</div>
                  <SeatingBoard state={chart} selectedSeatId={selectedSeatId} onSeatClick={handleSeatClick} />
                </div>

                <aside className="seating-no-print rounded-2xl border bg-card/60 p-4 2xl:sticky 2xl:top-24" aria-label="รายชื่อสำหรับเลือกที่นั่ง">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-heading font-bold">รายชื่อทั้งหมด</h3><Badge variant="outline">{filteredPeople.length}</Badge></div>
                  <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="ค้นหาชื่อหรือกลุ่ม" aria-label="ค้นหารายชื่อ" /></div>
                  <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto pr-1" data-testid="seating-people-list">
                    {filteredPeople.map((person) => {
                      const seat = seatByPerson.get(person.id);
                      return <button key={person.id} type="button" onClick={() => selectPerson(person)} className={cn("flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition hover:border-primary/40", groupStyle(person.group), selectedPersonId === person.id && "ring-2 ring-primary")} aria-pressed={selectedPersonId === person.id} data-testid={`seating-person-${person.id}`}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{person.name}</span><span className="block truncate text-[10px] opacity-70">{person.group || "ไม่ระบุกลุ่ม"}</span></span><span className="shrink-0 rounded-full border bg-background/70 px-2 py-0.5 font-mono text-[10px]">{seat?.id ?? "ยังไม่ได้นั่ง"}</span></button>;
                    })}
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[42rem] place-items-center rounded-2xl border border-dashed bg-card/45 p-6 text-center" data-testid="seating-empty-state"><div className="max-w-lg"><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary"><Armchair className="size-10" /></span><h2 className="mt-5 font-heading text-xl font-bold">สร้างผังที่นั่งที่แก้และพิมพ์ได้จริง</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">วางรายชื่อ เลือกแถวห้องเรียนหรือโต๊ะงานอีเวนต์ แล้วสุ่ม จัดกลุ่ม ย้าย สลับ ล็อก หรือปิดที่นั่งได้ในหน้าเดียว พร้อมส่งออกสำหรับใช้งานหน้างาน</p><div className="mt-5 grid gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3"><div className="rounded-xl border bg-background/65 p-3">🏫 ห้องเรียนและห้องสอบ</div><div className="rounded-xl border bg-background/65 p-3">💍 งานแต่งและงานเลี้ยง</div><div className="rounded-xl border bg-background/65 p-3">🏢 ประชุมและ Workshop</div></div></div></div>
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}
