export const INTERVAL_TIMER_STORAGE_KEY = "meaw-interval-timer-v1";
export const INTERVAL_TIMER_MAX_STORAGE_BYTES = 100_000;
export const INTERVAL_TIMER_MAX_SAVED_PROGRAMS = 8;
export const INTERVAL_TIMER_MAX_NAME_LENGTH = 60;

export type IntervalPhaseKind = "prepare" | "work" | "rest" | "cycle-rest" | "cooldown";
export type IntervalTimerStatus = "idle" | "running" | "paused" | "finished";

export type IntervalSettings = {
  name: string;
  prepareSeconds: number;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  cycles: number;
  cycleRestSeconds: number;
  cooldownSeconds: number;
  soundEnabled: boolean;
  keepAwake: boolean;
};

export type IntervalPhase = {
  kind: IntervalPhaseKind;
  durationSeconds: number;
  round: number | null;
  cycle: number | null;
};

export type IntervalRuntime = {
  status: IntervalTimerStatus;
  phaseIndex: number;
  deadlineMs: number | null;
  remainingMs: number;
};

export type SavedIntervalProgram = {
  id: string;
  settings: IntervalSettings;
  savedAtMs: number;
};

export type IntervalTimerStore = {
  settings: IntervalSettings;
  savedPrograms: SavedIntervalProgram[];
};

export const DEFAULT_INTERVAL_SETTINGS: IntervalSettings = {
  name: "Classic Tabata 20/10",
  prepareSeconds: 10,
  workSeconds: 20,
  restSeconds: 10,
  rounds: 8,
  cycles: 1,
  cycleRestSeconds: 60,
  cooldownSeconds: 30,
  soundEnabled: true,
  keepAwake: true,
};

export const INTERVAL_PRESETS: ReadonlyArray<{ id: string; label: string; description: string; settings: IntervalSettings }> = [
  { id: "tabata", label: "Tabata 20/10", description: "20 วินาที / พัก 10 วินาที × 8 รอบ", settings: DEFAULT_INTERVAL_SETTINGS },
  { id: "beginner", label: "Beginner HIIT", description: "30 วินาที / พัก 30 วินาที × 8 รอบ", settings: { ...DEFAULT_INTERVAL_SETTINGS, name: "Beginner HIIT 30/30", workSeconds: 30, restSeconds: 30 } },
  { id: "hiit", label: "HIIT 40/20", description: "40 วินาที / พัก 20 วินาที × 10 รอบ", settings: { ...DEFAULT_INTERVAL_SETTINGS, name: "HIIT 40/20", workSeconds: 40, restSeconds: 20, rounds: 10 } },
  { id: "boxing", label: "Boxing 3/1", description: "ชก 3 นาที / พัก 1 นาที × 3 ยก", settings: { ...DEFAULT_INTERVAL_SETTINGS, name: "Boxing 3/1", prepareSeconds: 15, workSeconds: 180, restSeconds: 60, rounds: 3, cooldownSeconds: 60 } },
  { id: "emom", label: "EMOM 45/15", description: "ทำ 45 วินาที / เปลี่ยนท่า 15 วินาที × 10 รอบ", settings: { ...DEFAULT_INTERVAL_SETTINGS, name: "EMOM 45/15", prepareSeconds: 10, workSeconds: 45, restSeconds: 15, rounds: 10, cooldownSeconds: 30 } },
] as const;

const LIMITS = {
  prepareSeconds: [0, 600],
  workSeconds: [1, 3_600],
  restSeconds: [0, 3_600],
  rounds: [1, 99],
  cycles: [1, 20],
  cycleRestSeconds: [0, 3_600],
  cooldownSeconds: [0, 1_800],
} as const;

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, Math.round(numeric))) : fallback;
}

function cleanText(value: unknown, fallback = DEFAULT_INTERVAL_SETTINGS.name): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, INTERVAL_TIMER_MAX_NAME_LENGTH);
  return cleaned || fallback;
}

export function normalizeIntervalSettings(input: unknown, fallback: IntervalSettings = DEFAULT_INTERVAL_SETTINGS): IntervalSettings {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  return {
    name: cleanText(source.name, fallback.name),
    prepareSeconds: boundedInteger(source.prepareSeconds, fallback.prepareSeconds, ...LIMITS.prepareSeconds),
    workSeconds: boundedInteger(source.workSeconds, fallback.workSeconds, ...LIMITS.workSeconds),
    restSeconds: boundedInteger(source.restSeconds, fallback.restSeconds, ...LIMITS.restSeconds),
    rounds: boundedInteger(source.rounds, fallback.rounds, ...LIMITS.rounds),
    cycles: boundedInteger(source.cycles, fallback.cycles, ...LIMITS.cycles),
    cycleRestSeconds: boundedInteger(source.cycleRestSeconds, fallback.cycleRestSeconds, ...LIMITS.cycleRestSeconds),
    cooldownSeconds: boundedInteger(source.cooldownSeconds, fallback.cooldownSeconds, ...LIMITS.cooldownSeconds),
    soundEnabled: typeof source.soundEnabled === "boolean" ? source.soundEnabled : fallback.soundEnabled,
    keepAwake: typeof source.keepAwake === "boolean" ? source.keepAwake : fallback.keepAwake,
  };
}

export function buildIntervalPlan(input: IntervalSettings): IntervalPhase[] {
  const settings = normalizeIntervalSettings(input);
  const phases: IntervalPhase[] = [];
  if (settings.prepareSeconds > 0) phases.push({ kind: "prepare", durationSeconds: settings.prepareSeconds, round: null, cycle: null });
  for (let cycle = 1; cycle <= settings.cycles; cycle += 1) {
    for (let round = 1; round <= settings.rounds; round += 1) {
      phases.push({ kind: "work", durationSeconds: settings.workSeconds, round, cycle });
      if (round < settings.rounds && settings.restSeconds > 0) {
        phases.push({ kind: "rest", durationSeconds: settings.restSeconds, round, cycle });
      }
    }
    if (cycle < settings.cycles && settings.cycleRestSeconds > 0) {
      phases.push({ kind: "cycle-rest", durationSeconds: settings.cycleRestSeconds, round: null, cycle });
    }
  }
  if (settings.cooldownSeconds > 0) phases.push({ kind: "cooldown", durationSeconds: settings.cooldownSeconds, round: null, cycle: null });
  return phases;
}

export function intervalPlanDurationSeconds(phases: IntervalPhase[]): number {
  return phases.reduce((total, phase) => total + phase.durationSeconds, 0);
}

export function createIntervalRuntime(phases: IntervalPhase[]): IntervalRuntime {
  return {
    status: "idle",
    phaseIndex: 0,
    deadlineMs: null,
    remainingMs: Math.max(0, (phases[0]?.durationSeconds ?? 0) * 1_000),
  };
}

export function startIntervalRuntime(runtime: IntervalRuntime, phases: IntervalPhase[], nowMs: number): IntervalRuntime {
  if (runtime.status === "running" || phases.length === 0) return runtime;
  const phaseIndex = runtime.status === "finished" ? 0 : Math.min(runtime.phaseIndex, phases.length - 1);
  const durationMs = runtime.status === "paused"
    ? Math.max(1, runtime.remainingMs)
    : phases[phaseIndex]!.durationSeconds * 1_000;
  return { status: "running", phaseIndex, deadlineMs: nowMs + durationMs, remainingMs: durationMs };
}

export function advanceIntervalRuntime(runtime: IntervalRuntime, phases: IntervalPhase[], nowMs: number): IntervalRuntime {
  if (runtime.status !== "running" || runtime.deadlineMs === null) return runtime;
  let phaseIndex = runtime.phaseIndex;
  let deadlineMs = runtime.deadlineMs;
  while (nowMs >= deadlineMs) {
    phaseIndex += 1;
    if (phaseIndex >= phases.length) return { status: "finished", phaseIndex: phases.length, deadlineMs: null, remainingMs: 0 };
    deadlineMs += phases[phaseIndex]!.durationSeconds * 1_000;
  }
  return { status: "running", phaseIndex, deadlineMs, remainingMs: Math.max(0, deadlineMs - nowMs) };
}

export function pauseIntervalRuntime(runtime: IntervalRuntime, nowMs: number): IntervalRuntime {
  if (runtime.status !== "running" || runtime.deadlineMs === null) return runtime;
  return { ...runtime, status: "paused", deadlineMs: null, remainingMs: Math.max(0, runtime.deadlineMs - nowMs) };
}

export function skipIntervalPhase(runtime: IntervalRuntime, phases: IntervalPhase[], nowMs: number): IntervalRuntime {
  if (runtime.status === "finished" || phases.length === 0) return runtime;
  const nextIndex = runtime.phaseIndex + 1;
  if (nextIndex >= phases.length) return { status: "finished", phaseIndex: phases.length, deadlineMs: null, remainingMs: 0 };
  const durationMs = phases[nextIndex]!.durationSeconds * 1_000;
  return {
    status: runtime.status === "running" ? "running" : "paused",
    phaseIndex: nextIndex,
    deadlineMs: runtime.status === "running" ? nowMs + durationMs : null,
    remainingMs: durationMs,
  };
}

export function formatIntervalTime(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(valueMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildIntervalShareUrl(settings: IntervalSettings, baseUrl: string): string {
  const safe = normalizeIntervalSettings(settings);
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = "";
  url.searchParams.set("name", safe.name);
  url.searchParams.set("prepare", String(safe.prepareSeconds));
  url.searchParams.set("work", String(safe.workSeconds));
  url.searchParams.set("rest", String(safe.restSeconds));
  url.searchParams.set("rounds", String(safe.rounds));
  url.searchParams.set("cycles", String(safe.cycles));
  url.searchParams.set("cycleRest", String(safe.cycleRestSeconds));
  url.searchParams.set("cooldown", String(safe.cooldownSeconds));
  url.searchParams.set("sound", safe.soundEnabled ? "1" : "0");
  url.searchParams.set("awake", safe.keepAwake ? "1" : "0");
  return url.toString();
}

export function parseIntervalShareParams(search: string): IntervalSettings | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (!params.has("work") || !params.has("rounds")) return null;
  return normalizeIntervalSettings({
    name: params.get("name") ?? DEFAULT_INTERVAL_SETTINGS.name,
    prepareSeconds: params.get("prepare"),
    workSeconds: params.get("work"),
    restSeconds: params.get("rest"),
    rounds: params.get("rounds"),
    cycles: params.get("cycles"),
    cycleRestSeconds: params.get("cycleRest"),
    cooldownSeconds: params.get("cooldown"),
    soundEnabled: params.get("sound") !== "0",
    keepAwake: params.get("awake") !== "0",
  });
}

function normalizeSavedProgram(input: unknown, index: number, nowMs: number): SavedIntervalProgram | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const rawId = typeof source.id === "string" ? source.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "";
  const id = rawId || `saved-${index + 1}`;
  const savedAt = Number(source.savedAtMs);
  return {
    id,
    settings: normalizeIntervalSettings(source.settings),
    savedAtMs: Number.isFinite(savedAt) ? Math.min(nowMs, Math.max(0, Math.floor(savedAt))) : nowMs,
  };
}

export function parseIntervalTimerStore(raw: string | null, nowMs = Date.now()): IntervalTimerStore {
  const fallback = { settings: DEFAULT_INTERVAL_SETTINGS, savedPrograms: [] };
  if (!raw || new Blob([raw]).size > INTERVAL_TIMER_MAX_STORAGE_BYTES) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const source = parsed as Record<string, unknown>;
    const ids = new Set<string>();
    const savedPrograms: SavedIntervalProgram[] = [];
    if (Array.isArray(source.savedPrograms)) {
      for (const [index, item] of source.savedPrograms.slice(0, INTERVAL_TIMER_MAX_SAVED_PROGRAMS).entries()) {
        const program = normalizeSavedProgram(item, index, nowMs);
        if (!program || ids.has(program.id)) continue;
        ids.add(program.id);
        savedPrograms.push(program);
      }
    }
    return { settings: normalizeIntervalSettings(source.settings), savedPrograms };
  } catch {
    return fallback;
  }
}

export function serializeIntervalTimerStore(store: IntervalTimerStore, nowMs = Date.now()): string {
  return JSON.stringify({
    settings: normalizeIntervalSettings(store.settings),
    savedPrograms: store.savedPrograms
      .slice(0, INTERVAL_TIMER_MAX_SAVED_PROGRAMS)
      .map((program, index) => normalizeSavedProgram(program, index, nowMs))
      .filter((program): program is SavedIntervalProgram => program !== null),
  });
}
