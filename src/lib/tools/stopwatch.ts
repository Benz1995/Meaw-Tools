export const STOPWATCH_STORAGE_KEY = "meaw-stopwatch-v1";
export const STOPWATCH_MAX_LAPS = 500;
export const STOPWATCH_MAX_HOURS = 999;
export const STOPWATCH_MAX_MS = STOPWATCH_MAX_HOURS * 60 * 60 * 1_000 + 59 * 60 * 1_000 + 59_999;
export const STOPWATCH_MAX_STORAGE_BYTES = 1_000_000;
export const STOPWATCH_MAX_SESSION_NAME_LENGTH = 80;

export type StopwatchStatus = "idle" | "running" | "paused";

export type StopwatchLap = {
  id: string;
  totalMs: number;
  splitMs: number;
  recordedAtMs: number;
};

export type StopwatchState = {
  status: StopwatchStatus;
  accumulatedMs: number;
  startedAtMs: number | null;
  laps: StopwatchLap[];
  sessionName: string;
  updatedAtMs: number;
};

export type StopwatchStats = {
  count: number;
  fastestMs: number | null;
  slowestMs: number | null;
  averageMs: number | null;
  latestMs: number | null;
};

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function safeTime(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(0, Math.floor(numeric))) : fallback;
}

function safeId(value: unknown, fallback: string): string {
  const id = cleanText(value, 100);
  return id || fallback;
}

function csvCell(value: string): string {
  const formulaSafe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function createStopwatchState(nowMs = Date.now()): StopwatchState {
  return {
    status: "idle",
    accumulatedMs: 0,
    startedAtMs: null,
    laps: [],
    sessionName: "",
    updatedAtMs: nowMs,
  };
}

export function getStopwatchElapsedMs(state: StopwatchState, nowMs = Date.now()): number {
  const runningMs = state.status === "running" && state.startedAtMs !== null
    ? Math.max(0, nowMs - state.startedAtMs)
    : 0;
  return Math.min(STOPWATCH_MAX_MS, Math.max(0, state.accumulatedMs + runningMs));
}

export function startStopwatch(state: StopwatchState, nowMs = Date.now()): StopwatchState {
  if (state.status === "running") return state;
  const accumulatedMs = state.accumulatedMs >= STOPWATCH_MAX_MS ? 0 : state.accumulatedMs;
  return { ...state, status: "running", accumulatedMs, startedAtMs: nowMs, updatedAtMs: nowMs };
}

export function pauseStopwatch(state: StopwatchState, nowMs = Date.now()): StopwatchState {
  if (state.status !== "running") return state;
  return {
    ...state,
    status: "paused",
    accumulatedMs: getStopwatchElapsedMs(state, nowMs),
    startedAtMs: null,
    updatedAtMs: nowMs,
  };
}

export function resetStopwatch(state: StopwatchState, nowMs = Date.now()): StopwatchState {
  return { ...createStopwatchState(nowMs), sessionName: state.sessionName };
}

export function recordStopwatchLap(state: StopwatchState, id: string, nowMs = Date.now()): StopwatchState {
  if (state.status !== "running" || state.laps.length >= STOPWATCH_MAX_LAPS) return state;
  const totalMs = getStopwatchElapsedMs(state, nowMs);
  const previousTotal = state.laps.at(-1)?.totalMs ?? 0;
  if (totalMs <= previousTotal) return state;
  const lap: StopwatchLap = {
    id: safeId(id, `lap-${state.laps.length + 1}-${nowMs}`),
    totalMs,
    splitMs: totalMs - previousTotal,
    recordedAtMs: nowMs,
  };
  return { ...state, laps: [...state.laps, lap], updatedAtMs: nowMs };
}

export function calculateStopwatchStats(laps: StopwatchLap[]): StopwatchStats {
  if (laps.length === 0) return { count: 0, fastestMs: null, slowestMs: null, averageMs: null, latestMs: null };
  let fastestMs = Number.POSITIVE_INFINITY;
  let slowestMs = 0;
  let total = 0;
  for (const lap of laps) {
    fastestMs = Math.min(fastestMs, lap.splitMs);
    slowestMs = Math.max(slowestMs, lap.splitMs);
    total += lap.splitMs;
  }
  return {
    count: laps.length,
    fastestMs,
    slowestMs,
    averageMs: total / laps.length,
    latestMs: laps.at(-1)?.splitMs ?? null,
  };
}

export function formatStopwatchTime(valueMs: number, milliseconds = false): string {
  const bounded = Math.min(STOPWATCH_MAX_MS, Math.max(0, Math.floor(valueMs)));
  const hours = Math.floor(bounded / 3_600_000);
  const minutes = Math.floor((bounded % 3_600_000) / 60_000);
  const seconds = Math.floor((bounded % 60_000) / 1_000);
  const fraction = milliseconds
    ? String(bounded % 1_000).padStart(3, "0")
    : String(Math.floor((bounded % 1_000) / 10)).padStart(2, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${fraction}`;
}

export function normalizeStopwatchState(input: unknown, nowMs = Date.now()): StopwatchState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return createStopwatchState(nowMs);
  const source = input as Record<string, unknown>;
  const rawStatus = source.status;
  let status: StopwatchStatus = rawStatus === "running" || rawStatus === "paused" ? rawStatus : "idle";
  const accumulatedMs = safeTime(source.accumulatedMs, 0, STOPWATCH_MAX_MS);
  let startedAtMs = status === "running" ? safeTime(source.startedAtMs, nowMs, nowMs) : null;
  if (status === "running" && startedAtMs !== null && startedAtMs > nowMs) startedAtMs = nowMs;
  if (status !== "running") startedAtMs = null;

  const base: StopwatchState = {
    status,
    accumulatedMs,
    startedAtMs,
    laps: [],
    sessionName: cleanText(source.sessionName, STOPWATCH_MAX_SESSION_NAME_LENGTH),
    updatedAtMs: safeTime(source.updatedAtMs, nowMs, nowMs),
  };
  const elapsedMs = getStopwatchElapsedMs(base, nowMs);
  const ids = new Set<string>();
  let previousTotal = 0;
  const laps: StopwatchLap[] = [];
  if (Array.isArray(source.laps)) {
    for (const [index, rawLap] of source.laps.slice(0, STOPWATCH_MAX_LAPS).entries()) {
      if (!rawLap || typeof rawLap !== "object" || Array.isArray(rawLap)) continue;
      const lapSource = rawLap as Record<string, unknown>;
      const id = safeId(lapSource.id, `lap-${index + 1}`);
      if (ids.has(id)) continue;
      const totalMs = safeTime(lapSource.totalMs, -1, STOPWATCH_MAX_MS);
      if (totalMs <= previousTotal || totalMs > elapsedMs) continue;
      ids.add(id);
      laps.push({
        id,
        totalMs,
        splitMs: totalMs - previousTotal,
        recordedAtMs: safeTime(lapSource.recordedAtMs, base.updatedAtMs, nowMs),
      });
      previousTotal = totalMs;
    }
  }
  if (elapsedMs >= STOPWATCH_MAX_MS) {
    status = "paused";
    return { ...base, status, accumulatedMs: STOPWATCH_MAX_MS, startedAtMs: null, laps };
  }
  return { ...base, laps };
}

export function parseStopwatchState(raw: string | null, nowMs = Date.now()): StopwatchState {
  if (!raw || new Blob([raw]).size > STOPWATCH_MAX_STORAGE_BYTES) return createStopwatchState(nowMs);
  try { return normalizeStopwatchState(JSON.parse(raw), nowMs); }
  catch { return createStopwatchState(nowMs); }
}

export function serializeStopwatchState(state: StopwatchState): string {
  return JSON.stringify(normalizeStopwatchState(state, state.updatedAtMs));
}

export function buildStopwatchCsv(state: StopwatchState): string {
  const rows = [
    ["Session", "Lap", "Split", "Total", "Recorded at"],
    ...state.laps.map((lap, index) => [
      state.sessionName || "Stopwatch",
      String(index + 1),
      formatStopwatchTime(lap.splitMs, true),
      formatStopwatchTime(lap.totalMs, true),
      new Date(lap.recordedAtMs).toISOString(),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function buildStopwatchSummary(state: StopwatchState, nowMs = Date.now()): string {
  const stats = calculateStopwatchStats(state.laps);
  const lines = [
    state.sessionName || "Online Stopwatch",
    `เวลารวม: ${formatStopwatchTime(getStopwatchElapsedMs(state, nowMs), true)}`,
    `จำนวนรอบ: ${stats.count}`,
  ];
  if (stats.fastestMs !== null && stats.slowestMs !== null && stats.averageMs !== null) {
    lines.push(`เร็วที่สุด: ${formatStopwatchTime(stats.fastestMs, true)}`);
    lines.push(`ช้าที่สุด: ${formatStopwatchTime(stats.slowestMs, true)}`);
    lines.push(`เฉลี่ย: ${formatStopwatchTime(stats.averageMs, true)}`);
  }
  return lines.join("\n");
}
