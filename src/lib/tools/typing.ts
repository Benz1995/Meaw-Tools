export type TypingLanguage = "th" | "en";

export type TypingPassage = {
  id: string;
  title: string;
  text: string;
};

export type TypingComparison = {
  targetGraphemes: string[];
  typedGraphemes: string[];
  correctCharacters: number;
  incorrectCharacters: number;
  pendingCharacters: number;
  targetCharacters: number;
  typedCharacters: number;
  completed: boolean;
};

export type TypingMetrics = TypingComparison & {
  wpm: number;
  cpm: number;
  accuracy: number;
  progress: number;
  elapsedSeconds: number;
};

const THAI_PASSAGES: readonly TypingPassage[] = [
  {
    id: "thai-workday",
    title: "วันทำงานที่เป็นระบบ",
    text: "เช้าวันนี้ทีมเริ่มงานด้วยการทบทวนเป้าหมายที่สำคัญ แบ่งงานให้ชัดเจน และกำหนดเวลาส่งที่ทุกคนเข้าใจตรงกัน ก่อนเริ่มลงมือแต่ละคนตรวจข้อมูลที่จำเป็น ปิดการแจ้งเตือนที่รบกวนสมาธิ และเลือกทำงานยากที่สุดก่อน เมื่อพบปัญหาก็บันทึกสิ่งที่ลองไปแล้ว พร้อมอธิบายผลลัพธ์ให้เพื่อนร่วมทีมอ่านได้ง่าย การสื่อสารที่สั้นแต่ครบถ้วนช่วยลดงานซ้ำและทำให้ตัดสินใจได้เร็วขึ้น ช่วงบ่ายทีมตรวจคุณภาพอีกครั้ง แก้รายละเอียดเล็กน้อย และสรุปสิ่งที่เรียนรู้ไว้ใช้กับงานรอบถัดไป",
  },
  {
    id: "thai-cafe",
    title: "คาเฟ่เล็กในวันฝนตก",
    text: "ฝนตกเบา ๆ ตั้งแต่เช้า คาเฟ่เล็กตรงหัวมุมจึงอบอวลด้วยกลิ่นกาแฟและเสียงเพลงสบาย ๆ ลูกค้าบางคนนั่งอ่านหนังสือ บางคนเปิดคอมพิวเตอร์ทำงาน และบางคนแวะมาคุยกับเพื่อน เจ้าของร้านวางดอกไม้สีขาวไว้ข้างหน้าต่าง พร้อมเขียนเมนูพิเศษของวันลงบนกระดาน เมื่อแดดเริ่มออก แมวสีส้มก็เดินมานอนตรงระเบียง ทุกคนยิ้มให้มันโดยไม่ได้นัดหมาย บรรยากาศเรียบง่ายเช่นนี้ทำให้ช่วงเวลาธรรมดากลายเป็นความทรงจำที่น่ารัก และช่วยให้เราได้พักก่อนกลับไปจัดการเรื่องสำคัญต่อ",
  },
  {
    id: "thai-digital",
    title: "ใช้เทคโนโลยีอย่างเข้าใจ",
    text: "เครื่องมือดิจิทัลช่วยให้เราทำงานได้เร็วขึ้น แต่ผลลัพธ์ที่ดีเริ่มจากการตั้งคำถามให้ชัดเจน เราควรตรวจแหล่งข้อมูล เปรียบเทียบข้อเท็จจริง และระวังการเปิดเผยข้อมูลส่วนตัวโดยไม่จำเป็น ก่อนกดส่งไฟล์ควรอ่านชื่อผู้รับ ตรวจเอกสารแนบ และลบข้อมูลที่ไม่เกี่ยวข้องออกเสมอ หากระบบเสนอคำตอบอัตโนมัติ ผู้ใช้ยังต้องพิจารณาว่าคำตอบนั้นเหมาะกับสถานการณ์จริงหรือไม่ เทคโนโลยีที่ดีไม่ควรทำให้เราหยุดคิด แต่ควรช่วยลดงานซ้ำ เปิดเวลาให้เรียนรู้ และทำให้การตัดสินใจมีหลักฐานรองรับมากขึ้น",
  },
];

const ENGLISH_PASSAGES: readonly TypingPassage[] = [
  {
    id: "english-focus",
    title: "A focused workday",
    text: "A productive day begins with a clear goal and a realistic plan. Before opening every message, choose the task that creates the most useful result and give it your full attention. Keep notes about decisions, questions, and evidence so another person can understand the work without guessing. When a problem appears, test one idea at a time and record what changed. Short breaks help the mind recover, while a final review catches small mistakes before they become expensive. Consistent habits are usually more valuable than a single burst of effort.",
  },
  {
    id: "english-cafe",
    title: "The corner cafe",
    text: "Rain tapped softly against the window of the corner cafe. A student highlighted notes near the bookshelf, two friends shared a warm pastry, and a designer sketched ideas beside a cup of tea. The owner adjusted a small vase of flowers and wrote the daily menu on a chalkboard. When the clouds finally moved away, an orange cat stepped onto the porch and stretched in the sunlight. Everyone looked up for a moment, smiled, and then returned to their own quiet projects with a little more energy.",
  },
  {
    id: "english-digital",
    title: "Thoughtful technology",
    text: "Digital tools can save time, but speed is not the same as accuracy. Start by defining the question, checking the source, and deciding what evidence would support a reliable answer. Protect private information, review recipients before sending a file, and remove details that are not needed. Automated suggestions can be useful, yet people remain responsible for the final decision. The best technology reduces repetitive work, explains its limits, and leaves enough room for careful judgment when the situation is unusual.",
  },
];

const segmenters = new Map<string, Intl.Segmenter>();

export function splitGraphemes(text: string, language: TypingLanguage = "th"): string[] {
  const normalized = text.normalize("NFC");
  if (typeof Intl.Segmenter !== "function") return Array.from(normalized);
  let segmenter = segmenters.get(language);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(language, { granularity: "grapheme" });
    segmenters.set(language, segmenter);
  }
  return Array.from(segmenter.segment(normalized), ({ segment }) => segment);
}

export function truncateToGraphemes(text: string, limit: number, language: TypingLanguage): string {
  if (!Number.isFinite(limit) || limit <= 0) return "";
  return splitGraphemes(text, language).slice(0, Math.floor(limit)).join("");
}

export function compareTyping(target: string, typed: string, language: TypingLanguage = "th"): TypingComparison {
  const targetGraphemes = splitGraphemes(target, language);
  const typedGraphemes = splitGraphemes(typed, language);
  let correctCharacters = 0;
  let incorrectCharacters = 0;

  for (let index = 0; index < typedGraphemes.length; index += 1) {
    if (typedGraphemes[index] === targetGraphemes[index]) correctCharacters += 1;
    else incorrectCharacters += 1;
  }

  return {
    targetGraphemes,
    typedGraphemes,
    correctCharacters,
    incorrectCharacters,
    pendingCharacters: Math.max(0, targetGraphemes.length - typedGraphemes.length),
    targetCharacters: targetGraphemes.length,
    typedCharacters: typedGraphemes.length,
    completed: targetGraphemes.length > 0 && typedGraphemes.length >= targetGraphemes.length,
  };
}

export function calculateTypingMetrics(
  target: string,
  typed: string,
  elapsedMs: number,
  language: TypingLanguage = "th",
): TypingMetrics {
  const comparison = compareTyping(target, typed, language);
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const measuredMinutes = Math.max(1_000, safeElapsedMs) / 60_000;
  const accuracy = comparison.typedCharacters
    ? (comparison.correctCharacters / comparison.typedCharacters) * 100
    : 100;

  return {
    ...comparison,
    wpm: Math.round((comparison.correctCharacters / 5) / measuredMinutes),
    cpm: Math.round(comparison.correctCharacters / measuredMinutes),
    accuracy: Math.round(accuracy * 10) / 10,
    progress: comparison.targetCharacters
      ? Math.min(100, Math.round((comparison.typedCharacters / comparison.targetCharacters) * 1_000) / 10)
      : 0,
    elapsedSeconds: Math.round((safeElapsedMs / 1_000) * 10) / 10,
  };
}

export function getTypingPassages(language: TypingLanguage): readonly TypingPassage[] {
  return language === "th" ? THAI_PASSAGES : ENGLISH_PASSAGES;
}
