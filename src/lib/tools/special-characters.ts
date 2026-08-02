export type FancyStyleId =
  | "bold"
  | "italic"
  | "bold-italic"
  | "sans-bold"
  | "sans-italic"
  | "sans-bold-italic"
  | "monospace"
  | "fullwidth"
  | "circled";

export type FancyTextResult = {
  id: FancyStyleId;
  label: string;
  description: string;
  value: string;
};

export type SymbolCategoryId =
  | "popular"
  | "faces"
  | "hearts"
  | "stars"
  | "arrows"
  | "gaming"
  | "brackets"
  | "numbers"
  | "math"
  | "music";

export type SymbolGroup = {
  id: SymbolCategoryId;
  label: string;
  keywords: string[];
  symbols: string[];
};

const MAX_FANCY_TEXT_LENGTH = 200;
const graphemeSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("th", { granularity: "grapheme" })
  : null;

const styleMetadata: Array<Omit<FancyTextResult, "value">> = [
  { id: "bold", label: "ตัวหนา", description: "Mathematical Bold" },
  { id: "italic", label: "ตัวเอียง", description: "Mathematical Italic" },
  { id: "bold-italic", label: "หนาเอียง", description: "Bold Italic" },
  { id: "sans-bold", label: "Sans ตัวหนา", description: "Sans-serif Bold" },
  { id: "sans-italic", label: "Sans ตัวเอียง", description: "Sans-serif Italic" },
  { id: "sans-bold-italic", label: "Sans หนาเอียง", description: "Sans Bold Italic" },
  { id: "monospace", label: "โมโนสเปซ", description: "Monospace" },
  { id: "fullwidth", label: "ตัวกว้าง", description: "Fullwidth" },
  { id: "circled", label: "ตัววงกลม", description: "Circled" },
];

function mapMathematicalRange(
  text: string,
  uppercaseStart: number,
  lowercaseStart: number,
  digitStart?: number,
  overrides: Readonly<Record<string, string>> = {},
) {
  return Array.from(text, (character) => {
    if (overrides[character]) return overrides[character];
    const code = character.codePointAt(0)!;
    if (code >= 65 && code <= 90) return String.fromCodePoint(uppercaseStart + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(lowercaseStart + code - 97);
    if (digitStart !== undefined && code >= 48 && code <= 57) return String.fromCodePoint(digitStart + code - 48);
    return character;
  }).join("");
}

function toFullwidth(text: string) {
  return Array.from(text, (character) => {
    const code = character.codePointAt(0)!;
    return code >= 33 && code <= 126 ? String.fromCodePoint(code + 0xfee0) : character;
  }).join("");
}

function toCircled(text: string) {
  return Array.from(text, (character) => {
    const code = character.codePointAt(0)!;
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x24b6 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x24d0 + code - 97);
    if (code === 48) return "⓪";
    if (code >= 49 && code <= 57) return String.fromCodePoint(0x2460 + code - 49);
    return character;
  }).join("");
}

function splitGraphemes(text: string) {
  const normalized = text.normalize("NFC");
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(normalized), ({ segment }) => segment)
    : Array.from(normalized);
}

export function truncateFancyText(text: string) {
  return splitGraphemes(text).slice(0, MAX_FANCY_TEXT_LENGTH).join("");
}

export function countFancyTextCharacters(text: string) {
  return splitGraphemes(text).length;
}

export function applyFancyStyle(text: string, style: FancyStyleId): string {
  const safeText = truncateFancyText(text);
  switch (style) {
    case "bold":
      return mapMathematicalRange(safeText, 0x1d400, 0x1d41a, 0x1d7ce);
    case "italic":
      return mapMathematicalRange(safeText, 0x1d434, 0x1d44e, undefined, { h: "ℎ" });
    case "bold-italic":
      return mapMathematicalRange(safeText, 0x1d468, 0x1d482);
    case "sans-bold":
      return mapMathematicalRange(safeText, 0x1d5d4, 0x1d5ee, 0x1d7ec);
    case "sans-italic":
      return mapMathematicalRange(safeText, 0x1d608, 0x1d622);
    case "sans-bold-italic":
      return mapMathematicalRange(safeText, 0x1d63c, 0x1d656);
    case "monospace":
      return mapMathematicalRange(safeText, 0x1d670, 0x1d68a, 0x1d7f6);
    case "fullwidth":
      return toFullwidth(safeText);
    case "circled":
      return toCircled(safeText);
  }
}

export function createFancyTextStyles(text: string): FancyTextResult[] {
  return styleMetadata.map((style) => ({ ...style, value: applyFancyStyle(text, style.id) }));
}

export function createDecoratedText(text: string) {
  const safeText = truncateFancyText(text);
  return [
    { id: "sparkle", label: "ประกาย", value: `✦ ${safeText} ✦` },
    { id: "heart", label: "หัวใจ", value: `♡ ${safeText} ♡` },
    { id: "ribbon", label: "ริบบิ้น", value: `୨୧ ${safeText} ୨୧` },
    { id: "soft", label: "วงเล็บน่ารัก", value: `꒰ ${safeText} ꒱` },
    { id: "japanese", label: "กรอบญี่ปุ่น", value: `『${safeText}』` },
    { id: "fantasy", label: "แฟนตาซี", value: `༺ ${safeText} ༻` },
    { id: "wings", label: "ปีก", value: `𓆩 ${safeText} 𓆪` },
    { id: "moon", label: "พระจันทร์", value: `☾ ${safeText} ☽` },
  ];
}

export const symbolGroups: SymbolGroup[] = [
  {
    id: "popular",
    label: "ยอดนิยม",
    keywords: ["ยอดนิยม", "popular", "ทั่วไป", "คัดลอก"],
    symbols: ["★", "☆", "♡", "♥", "✓", "✔", "✦", "✧", "〆", "々", "ッ", "ツ", "メ", "シ", "฿", "©", "®", "™", "∞", "※", "•", "—", "→", "♪"],
  },
  {
    id: "faces",
    label: "หน้ายิ้มและอารมณ์",
    keywords: ["หน้า", "ยิ้ม", "อารมณ์", "smile", "face", "kaomoji", "คาโอโมจิ"],
    symbols: ["☺", "☻", "㋡", "ッ", "ツ", "シ", "メ", "ʕ•ᴥ•ʔ", "(◕‿◕)", "(｡♥‿♥｡)", "(づ｡◕‿‿◕｡)づ", "¯\\_(ツ)_/¯", "(ง •̀_•́)ง", "(╥﹏╥)", "(¬‿¬)", "(•‿•)", "(ᵔᴥᵔ)", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧"],
  },
  {
    id: "hearts",
    label: "หัวใจและความรัก",
    keywords: ["หัวใจ", "รัก", "วาเลนไทน์", "heart", "love", "valentine"],
    symbols: ["♡", "♥", "❤", "❥", "❣", "ღ", "۵", "ෆ", "ᰔ", "დ", "💗", "💖", "💕", "💞", "💓", "💘", "💝", "💟", "♥‿♥", "♡〜٩( ˃́▿˂̀ )۶〜♡"],
  },
  {
    id: "stars",
    label: "ดาวและประกาย",
    keywords: ["ดาว", "ประกาย", "วิบวับ", "star", "sparkle"],
    symbols: ["★", "☆", "✦", "✧", "✩", "✪", "✫", "✬", "✭", "✮", "✯", "✰", "⋆", "⭒", "※", "⁂", "⁎", "❂", "✵", "✶", "✷", "✸", "✹", "✺"],
  },
  {
    id: "arrows",
    label: "ลูกศร",
    keywords: ["ลูกศร", "ทิศทาง", "arrow", "direction"],
    symbols: ["←", "↑", "→", "↓", "↔", "↕", "↖", "↗", "↘", "↙", "⇐", "⇑", "⇒", "⇓", "➜", "➤", "➥", "➦", "➳", "➵", "➸", "➼", "➽", "⟶"],
  },
  {
    id: "gaming",
    label: "เกมและแฟนตาซี",
    keywords: ["เกม", "ชื่อเกม", "ปีก", "นางฟ้า", "คิตตี้", "กางเขน", "gaming", "fantasy", "wing", "angel", "kitty", "cross"],
    symbols: ["〆", "々", "亗", "乂", "メ", "ツ", "么", "彡", "『", "』", "【", "】", "꧁", "꧂", "༺", "༻", "𓆩", "𓆪", "♛", "♚", "♕", "♔", "⚔", "☠", "☯", "†", "‡", "♰"],
  },
  {
    id: "brackets",
    label: "วงเล็บและกรอบ",
    keywords: ["วงเล็บ", "กรอบ", "ขอบ", "bracket", "border", "frame"],
    symbols: ["( )", "[ ]", "{ }", "⟨ ⟩", "〈 〉", "《 》", "「 」", "『 』", "【 】", "〔 〕", "〖 〗", "〘 〙", "〚 〛", "⦅ ⦆", "⦃ ⦄", "꒰ ꒱", "༺ ༻", "꧁ ꧂", "╔ ╗", "╚ ╝", "╭ ╮", "╰ ╯", "┏ ┓", "┗ ┛"],
  },
  {
    id: "numbers",
    label: "เลขโรมันและตัวเลข",
    keywords: ["เลข", "เลขโรมัน", "ตัวเลข", "number", "roman", "digit"],
    symbols: ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ", "Ⅸ", "Ⅹ", "Ⅺ", "Ⅻ", "ⅰ", "ⅱ", "ⅲ", "ⅳ", "ⅴ", "ⅵ", "ⅶ", "ⅷ", "ⅸ", "ⅹ", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"],
  },
  {
    id: "math",
    label: "คณิตศาสตร์และสกุลเงิน",
    keywords: ["คณิตศาสตร์", "เงิน", "สกุลเงิน", "math", "currency", "money"],
    symbols: ["+", "−", "×", "÷", "=", "≠", "≈", "≡", "<", ">", "≤", "≥", "±", "∞", "√", "∑", "∏", "∫", "∆", "∇", "∂", "π", "°", "%", "฿", "$", "€", "£", "¥", "₩", "₹", "₽"],
  },
  {
    id: "music",
    label: "ดนตรีและธรรมชาติ",
    keywords: ["ดนตรี", "เพลง", "อากาศ", "ธรรมชาติ", "music", "weather", "nature"],
    symbols: ["♪", "♫", "♬", "♩", "♭", "♮", "♯", "☀", "☁", "☂", "☃", "☄", "☾", "☽", "❄", "⚡", "☘", "❀", "✿", "❁", "❃", "❋", "☕", "♨"],
  },
];

export function searchSymbolGroups(query: string, category: SymbolCategoryId | "all" = "all"): SymbolGroup[] {
  const normalizedQuery = query.normalize("NFKC").trim().toLocaleLowerCase("th");
  return symbolGroups.flatMap((group) => {
    if (category !== "all" && group.id !== category) return [];
    if (!normalizedQuery) return [{ ...group, symbols: [...group.symbols] }];
    const groupText = `${group.label} ${group.keywords.join(" ")}`.normalize("NFKC").toLocaleLowerCase("th");
    if (groupText.includes(normalizedQuery)) return [{ ...group, symbols: [...group.symbols] }];
    const symbols = group.symbols.filter((symbol) => symbol.normalize("NFKC").toLocaleLowerCase("th").includes(normalizedQuery));
    return symbols.length ? [{ ...group, symbols }] : [];
  });
}
