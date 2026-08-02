import { assertWithinLimit } from "@/lib/tools/limits";

export type JsonStats = { objects: number; arrays: number; keys: number };
export type JsonValidation =
  | { valid: true; value: unknown; stats: JsonStats }
  | { valid: false; message: string; line?: number; column?: number };

function countStats(value: unknown, stats: JsonStats): void {
  if (Array.isArray(value)) {
    stats.arrays += 1;
    value.forEach((item) => countStats(item, stats));
    return;
  }
  if (value !== null && typeof value === "object") {
    stats.objects += 1;
    const entries = Object.entries(value);
    stats.keys += entries.length;
    entries.forEach(([, child]) => countStats(child, stats));
  }
}

function positionFromMessage(input: string, message: string) {
  const positionMatch = message.match(/position\s+(\d+)/i);
  if (!positionMatch?.[1]) return {};
  const position = Number(positionMatch[1]);
  const before = input.slice(0, position);
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

export function validateJson(input: string): JsonValidation {
  try {
    assertWithinLimit(input);
    const value: unknown = JSON.parse(input);
    const stats: JsonStats = { objects: 0, arrays: 0, keys: 0 };
    countStats(value, stats);
    return { valid: true, value, stats };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON ไม่ถูกต้อง";
    return { valid: false, message, ...positionFromMessage(input, message) };
  }
}

export function formatJson(input: string, indent: 2 | 4): string {
  const result = validateJson(input);
  if (!result.valid) throw new Error(result.message);
  return JSON.stringify(result.value, null, indent);
}

export function minifyJson(input: string): string {
  const result = validateJson(input);
  if (!result.valid) throw new Error(result.message);
  return JSON.stringify(result.value);
}
