export const SPEECH_TEXT_LIMIT = 20_000;
export const SPEECH_CHUNK_LIMIT = 220;

export type SpeechLanguage = "auto" | "th-TH" | "en-US";

export type SpeechVoiceDescriptor = {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
};

export function normalizeSpeechText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countSpeechCharacters(text: string) {
  const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
  return Array.from(segmenter.segment(text)).length;
}

export function validateSpeechText(text: string) {
  const normalized = normalizeSpeechText(text);
  if (!normalized) throw new Error("กรุณาใส่ข้อความที่ต้องการให้อ่าน");
  if (countSpeechCharacters(normalized) > SPEECH_TEXT_LIMIT) {
    throw new Error(`ข้อความต้องไม่เกิน ${SPEECH_TEXT_LIMIT.toLocaleString("th-TH")} ตัวอักษร`);
  }
  return normalized;
}

export function detectSpeechLanguage(text: string): Exclude<SpeechLanguage, "auto"> {
  return /[\u0E00-\u0E7F]/u.test(text) ? "th-TH" : "en-US";
}

function splitLongSpeechSegment(text: string, maxLength: number) {
  const chunks: string[] = [];
  const wordSegmenter = new Intl.Segmenter("th", { granularity: "word" });
  const graphemeSegmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
  let current = "";

  const pushCurrent = () => {
    const value = current.trim();
    if (value) chunks.push(value);
    current = "";
  };

  for (const part of wordSegmenter.segment(text)) {
    if (part.segment.length > maxLength) {
      pushCurrent();
      let longPart = "";
      for (const grapheme of graphemeSegmenter.segment(part.segment)) {
        if (longPart.length + grapheme.segment.length > maxLength) {
          const value = longPart.trim();
          if (value) chunks.push(value);
          longPart = "";
        }
        longPart += grapheme.segment;
      }
      current = longPart;
      continue;
    }

    if (current.length + part.segment.length > maxLength) pushCurrent();
    current += part.segment;
  }

  pushCurrent();
  return chunks;
}

export function splitSpeechText(text: string, maxLength = SPEECH_CHUNK_LIMIT) {
  if (!Number.isInteger(maxLength) || maxLength < 40) throw new Error("ความยาวแต่ละช่วงต้องไม่น้อยกว่า 40 ตัวอักษร");
  const normalized = normalizeSpeechText(text);
  if (!normalized) return [];

  const sentenceSegmenter = new Intl.Segmenter("th", { granularity: "sentence" });
  return Array.from(sentenceSegmenter.segment(normalized)).flatMap((part) => {
    const sentence = part.segment.trim();
    if (!sentence) return [];
    return sentence.length <= maxLength ? [sentence] : splitLongSpeechSegment(sentence, maxLength);
  });
}

export function estimateSpeechSeconds(text: string, rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("ความเร็วเสียงต้องมากกว่า 0");
  return Math.max(1, Math.round(countSpeechCharacters(normalizeSpeechText(text)) / (13 * rate)));
}

export function formatSpeechDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getSpeechVoiceId(voice: SpeechVoiceDescriptor) {
  return `${voice.voiceURI || voice.name}::${voice.lang}`;
}

export function filterSpeechVoices(voices: SpeechVoiceDescriptor[], language: SpeechLanguage) {
  const sorted = [...voices].sort((left, right) => {
    if (left.default !== right.default) return left.default ? -1 : 1;
    if (left.localService !== right.localService) return left.localService ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
  if (language === "auto") return sorted;
  const prefix = language.slice(0, 2).toLowerCase();
  const matches = sorted.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  return matches.length > 0 ? matches : sorted;
}
