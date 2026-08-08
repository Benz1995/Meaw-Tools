export const WORD_CLOUD_TEXT_LIMIT = 100_000;
export const WORD_CLOUD_LIST_LIMIT = 20_000;

export const WORD_CLOUD_PALETTES = {
  cafe: ["#166534", "#047857", "#0f766e", "#b45309", "#9a3412", "#7c2d12"],
  sakura: ["#9d174d", "#be185d", "#db2777", "#e11d48", "#c2410c", "#7e22ce"],
  ocean: ["#075985", "#0369a1", "#0e7490", "#0f766e", "#1d4ed8", "#4338ca"],
  night: ["#e2e8f0", "#c4b5fd", "#93c5fd", "#67e8f9", "#86efac", "#fcd34d"],
} as const;

export type WordCloudPalette = keyof typeof WORD_CLOUD_PALETTES;
export type WordCloudRotation = "horizontal" | "mixed";

export type WordCloudWord = {
  text: string;
  count: number;
};

export type WordCloudAnalysis = {
  words: WordCloudWord[];
  totalTokens: number;
  uniqueWords: number;
  filteredWords: number;
};

export type WordCloudAnalysisOptions = {
  excludeCommonWords: boolean;
  excludeNumbers: boolean;
  customStopWords: string;
  minimumWordLength: number;
  minimumFrequency: number;
  maximumWords: number;
};

export type WordCloudLayoutWord = WordCloudWord & {
  x: number;
  y: number;
  fontSize: number;
  rotation: 0 | 90;
  color: string;
  width: number;
  height: number;
};

export type WordCloudLayout = {
  width: number;
  height: number;
  words: WordCloudLayoutWord[];
  omittedWords: number;
};

export type WordCloudLayoutOptions = {
  width?: number;
  height?: number;
  minimumFontSize?: number;
  maximumFontSize?: number;
  rotation: WordCloudRotation;
  palette: WordCloudPalette;
  seed: number;
};

const THAI_STOP_WORDS = [
  "ที่", "และ", "ของ", "เป็น", "ใน", "ได้", "ให้", "มี", "ไป", "มา", "กับ", "ว่า", "นี้", "ก็", "จะ", "ไม่", "จาก", "โดย", "หรือ", "แต่", "ซึ่ง", "ยัง", "เรา", "คุณ", "เขา", "การ", "ความ", "เพื่อ", "เมื่อ", "เพราะ", "มาก", "อย่าง", "กัน", "แล้ว", "คือ", "ถ้า", "ถึง", "นั้น", "อีก", "จึง", "ต้อง", "สามารถ", "ไว้", "อยู่",
];

const ENGLISH_STOP_WORDS = [
  "the", "and", "a", "an", "of", "to", "in", "is", "it", "that", "for", "on", "with", "as", "at", "by", "from", "or", "be", "are", "was", "were", "this", "these", "those", "you", "your", "we", "our", "they", "their", "but", "not", "can", "will", "has", "have", "had", "do", "does", "did", "its", "into", "about", "than", "then", "also",
];

const COMMON_STOP_WORDS = new Set([...THAI_STOP_WORDS, ...ENGLISH_STOP_WORDS]);
const NUMBER_ONLY_PATTERN = /^\p{N}+(?:[.,]\p{N}+)*$/u;
const HAS_LETTER_OR_NUMBER_PATTERN = /[\p{L}\p{N}]/u;
const TRIM_TOKEN_PATTERN = /^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function assertIntegerRange(value: number, label: string, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}ต้องเป็นจำนวนเต็มระหว่าง ${minimum.toLocaleString("th-TH")} ถึง ${maximum.toLocaleString("th-TH")}`);
  }
}

function normalizeWord(value: string) {
  return value.normalize("NFKC").trim().replace(TRIM_TOKEN_PATTERN, "").toLocaleLowerCase("en-US");
}

function segmentWords(text: string) {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });
    return Array.from(segmenter.segment(text))
      .filter((item) => item.isWordLike)
      .map((item) => item.segment);
  }
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’_-]*/gu) ?? [];
}

function parseCustomStopWords(value: string) {
  return new Set(
    value
      .split(/[\n,;]+/u)
      .map(normalizeWord)
      .filter(Boolean),
  );
}

function sortWords(words: WordCloudWord[]) {
  return words.sort((left, right) => right.count - left.count || left.text.localeCompare(right.text, "th"));
}

export function analyzeWordCloudText(text: string, options: WordCloudAnalysisOptions): WordCloudAnalysis {
  if (!text.trim()) throw new Error("กรุณาวางข้อความที่ต้องการสร้าง Word Cloud");
  if (text.length > WORD_CLOUD_TEXT_LIMIT) throw new Error(`ข้อความต้องไม่เกิน ${WORD_CLOUD_TEXT_LIMIT.toLocaleString("th-TH")} ตัวอักษร`);
  assertIntegerRange(options.minimumWordLength, "ความยาวคำขั้นต่ำ", 1, 30);
  assertIntegerRange(options.minimumFrequency, "ความถี่ขั้นต่ำ", 1, 1_000_000);
  assertIntegerRange(options.maximumWords, "จำนวนคำสูงสุด", 10, 100);

  const customStopWords = parseCustomStopWords(options.customStopWords);
  const counts = new Map<string, number>();
  let totalTokens = 0;

  for (const rawToken of segmentWords(text)) {
    const token = normalizeWord(rawToken);
    if (!token || !HAS_LETTER_OR_NUMBER_PATTERN.test(token)) continue;
    if (options.excludeNumbers && NUMBER_ONLY_PATTERN.test(token)) continue;
    if (Array.from(token).length < options.minimumWordLength) continue;
    if (options.excludeCommonWords && COMMON_STOP_WORDS.has(token)) continue;
    if (customStopWords.has(token)) continue;
    totalTokens += 1;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  if (!counts.size) throw new Error("ไม่พบคำที่ใช้ได้ ลองลดตัวกรองหรือเปลี่ยนข้อความ");
  const allWords = sortWords(Array.from(counts, ([textValue, count]) => ({ text: textValue, count })));
  const words = allWords.filter((word) => word.count >= options.minimumFrequency).slice(0, options.maximumWords);
  if (!words.length) throw new Error("ไม่มีคำที่ผ่านความถี่ขั้นต่ำ ลองลดค่าความถี่แล้วสร้างใหม่");

  return {
    words,
    totalTokens,
    uniqueWords: allWords.length,
    filteredWords: allWords.length - words.length,
  };
}

export function parseWeightedWordList(input: string, maximumWords: number): WordCloudAnalysis {
  if (!input.trim()) throw new Error("กรุณากรอกรายการคำหรือวลีอย่างน้อยหนึ่งบรรทัด");
  if (input.length > WORD_CLOUD_LIST_LIMIT) throw new Error(`รายการต้องไม่เกิน ${WORD_CLOUD_LIST_LIMIT.toLocaleString("th-TH")} ตัวอักษร`);
  assertIntegerRange(maximumWords, "จำนวนคำสูงสุด", 10, 100);

  const counts = new Map<string, WordCloudWord>();
  for (const rawLine of input.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const weighted = line.match(/^(.*?)\s*(?:\t|,|=)\s*(\d+(?:\.\d+)?)\s*$/u);
    const text = (weighted?.[1] ?? line).normalize("NFKC").trim().replace(/\s+/gu, " ");
    const count = weighted ? Number(weighted[2]) : 1;
    if (!text) throw new Error("พบรายการที่ไม่มีคำหรือวลี กรุณาตรวจแต่ละบรรทัด");
    if (Array.from(text).length > 80) throw new Error(`คำหรือวลี “${text.slice(0, 30)}…” ยาวเกิน 80 ตัวอักษร`);
    if (!Number.isFinite(count) || count <= 0 || count > 1_000_000) throw new Error(`น้ำหนักของ “${text}” ต้องมากกว่า 0 และไม่เกิน 1,000,000`);
    const normalized = text.toLocaleLowerCase("en-US");
    const existing = counts.get(normalized);
    counts.set(normalized, { text: existing?.text ?? text, count: (existing?.count ?? 0) + count });
  }

  if (!counts.size) throw new Error("กรุณากรอกรายการคำหรือวลีอย่างน้อยหนึ่งบรรทัด");
  const allWords = sortWords(Array.from(counts.values()));
  const words = allWords.slice(0, maximumWords);
  return {
    words,
    totalTokens: allWords.reduce((sum, word) => sum + word.count, 0),
    uniqueWords: allWords.length,
    filteredWords: allWords.length - words.length,
  };
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function estimateTextWidth(text: string, fontSize: number) {
  let units = 0;
  for (const character of Array.from(text)) {
    if (/\p{M}/u.test(character)) continue;
    if (/\s/u.test(character)) units += 0.4;
    else if (/[A-Z]/u.test(character)) units += 0.8;
    else if (/[a-z0-9]/u.test(character)) units += 0.68;
    else if (/\p{Script=Thai}/u.test(character)) units += 0.82;
    else units += 0.86;
  }
  return Math.max(fontSize, units * fontSize);
}

type Bounds = { left: number; top: number; right: number; bottom: number };

function collides(bounds: Bounds, placed: Bounds[]) {
  return placed.some((other) => !(
    bounds.right < other.left
    || bounds.left > other.right
    || bounds.bottom < other.top
    || bounds.top > other.bottom
  ));
}

export function layoutWordCloud(words: WordCloudWord[], options: WordCloudLayoutOptions): WordCloudLayout {
  if (!words.length) throw new Error("ไม่มีคำสำหรับจัดวาง Word Cloud");
  if (words.some((word) => !word.text.trim() || !Number.isFinite(word.count) || word.count <= 0)) {
    throw new Error("คำและความถี่สำหรับจัดวางต้องเป็นค่าที่ถูกต้อง");
  }
  const width = options.width ?? 1_000;
  const height = options.height ?? 600;
  const minimumFontSize = options.minimumFontSize ?? 20;
  const maximumFontSize = options.maximumFontSize ?? 96;
  assertIntegerRange(width, "ความกว้าง", 320, 4_000);
  assertIntegerRange(height, "ความสูง", 240, 4_000);
  assertIntegerRange(minimumFontSize, "ขนาดตัวอักษรขั้นต่ำ", 10, 120);
  assertIntegerRange(maximumFontSize, "ขนาดตัวอักษรสูงสุด", minimumFontSize, 240);
  if (!Number.isInteger(options.seed)) throw new Error("ค่า layout seed ต้องเป็นจำนวนเต็ม");

  const sorted = sortWords(words.map((word) => ({ ...word })));
  const maximumCount = sorted[0]!.count;
  const minimumCount = sorted.at(-1)?.count ?? maximumCount;
  const logMinimum = Math.log(Math.max(minimumCount, Number.EPSILON));
  const logRange = Math.log(Math.max(maximumCount, Number.EPSILON)) - logMinimum;
  const densityScale = Math.max(0.5, Math.min(1, Math.sqrt(35 / sorted.length)));
  const effectiveMinimumFontSize = Math.max(12, minimumFontSize * densityScale);
  const effectiveMaximumFontSize = effectiveMinimumFontSize + (maximumFontSize - minimumFontSize) * densityScale;
  const random = createRandom(options.seed);
  const colors = WORD_CLOUD_PALETTES[options.palette];
  const occupied: Bounds[] = [];
  const placedWords: WordCloudLayoutWord[] = [];
  const edgePadding = 16;
  const collisionPadding = 7;

  sorted.forEach((word, wordIndex) => {
    const frequencyRatio = logRange === 0 ? 0 : (Math.log(word.count) - logMinimum) / logRange;
    const rankCap = Math.exp(-wordIndex / Math.max(8, sorted.length * 0.1));
    const ratio = Math.min(frequencyRatio, rankCap);
    const baseFontSize = effectiveMinimumFontSize + (effectiveMaximumFontSize - effectiveMinimumFontSize) * Math.pow(ratio, 0.72);
    const rotation: 0 | 90 = options.rotation === "mixed" && wordIndex > 1 && random() < 0.2 ? 90 : 0;
    const startingAngle = random() * Math.PI * 2;
    let placement: WordCloudLayoutWord | null = null;

    for (const scale of [1, 0.9, 0.8, 0.7]) {
      const fontSize = Math.round(Math.max(effectiveMinimumFontSize, baseFontSize * scale) * 10) / 10;
      const naturalWidth = estimateTextWidth(word.text, fontSize);
      const naturalHeight = fontSize * 1.45;
      const boxWidth = rotation === 90 ? naturalHeight : naturalWidth;
      const boxHeight = rotation === 90 ? naturalWidth : naturalHeight;

      for (let attempt = 0; attempt < 1_700; attempt += 1) {
        const spiralAttempt = Math.min(attempt, 899);
        const radius = wordIndex === 0 ? 0 : 11.2 * Math.sqrt(spiralAttempt);
        const angle = startingAngle + spiralAttempt * 0.46;
        const randomFallback = attempt >= 900;
        const availableWidth = Math.max(0, width - edgePadding * 2 - boxWidth);
        const availableHeight = Math.max(0, height - edgePadding * 2 - boxHeight);
        const x = randomFallback
          ? edgePadding + boxWidth / 2 + random() * availableWidth
          : width / 2 + Math.cos(angle) * radius;
        const y = randomFallback
          ? edgePadding + boxHeight / 2 + random() * availableHeight
          : height / 2 + Math.sin(angle) * radius * 0.62;
        const bounds = {
          left: x - boxWidth / 2 - collisionPadding,
          top: y - boxHeight / 2 - collisionPadding,
          right: x + boxWidth / 2 + collisionPadding,
          bottom: y + boxHeight / 2 + collisionPadding,
        };
        const withinCanvas = bounds.left >= edgePadding
          && bounds.top >= edgePadding
          && bounds.right <= width - edgePadding
          && bounds.bottom <= height - edgePadding;
        if (!withinCanvas || collides(bounds, occupied)) continue;

        occupied.push(bounds);
        placement = {
          ...word,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          fontSize,
          rotation,
          color: colors[(wordIndex + Math.floor(random() * colors.length)) % colors.length]!,
          width: Math.round(boxWidth * 10) / 10,
          height: Math.round(boxHeight * 10) / 10,
        };
        break;
      }
      if (placement) break;
    }

    if (placement) placedWords.push(placement);
  });

  if (!placedWords.length) throw new Error("พื้นที่ไม่พอสำหรับจัดวางคำ ลองลดจำนวนคำหรือขนาดตัวอักษร");
  return { width, height, words: placedWords, omittedWords: sorted.length - placedWords.length };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildWordCloudSvg(layout: WordCloudLayout, background: string) {
  const backgroundRect = background === "transparent"
    ? ""
    : `<rect width="${layout.width}" height="${layout.height}" fill="${HEX_COLOR_PATTERN.test(background) ? background : "#fffaf2"}"/>`;
  const texts = layout.words.map((word) => {
    const color = HEX_COLOR_PATTERN.test(word.color) ? word.color : "#166534";
    const transform = word.rotation ? ` transform="rotate(${word.rotation} ${word.x} ${word.y})"` : "";
    return `<text x="${word.x}" y="${word.y}" text-anchor="middle" dominant-baseline="central" font-family="Noto Sans Thai, Tahoma, Arial, sans-serif" font-size="${word.fontSize}" font-weight="700" fill="${color}"${transform}><title>${escapeXml(word.text)}: ${word.count}</title>${escapeXml(word.text)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="word-cloud-title word-cloud-desc"><title id="word-cloud-title">Word Cloud created with Meaw Tools</title><desc id="word-cloud-desc">Word frequency visualization with ${layout.words.length} words</desc>${backgroundRect}${texts}</svg>`;
}

export function wordCloudFrequencyCsv(words: WordCloudWord[]) {
  const rows = words.map((word) => {
    const safeText = /^[=+@-]/u.test(word.text) ? `'${word.text}` : word.text;
    return `"${safeText.replaceAll('"', '""')}",${word.count}`;
  });
  return `\uFEFFword,frequency\r\n${rows.join("\r\n")}`;
}
