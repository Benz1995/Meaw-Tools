import {
  beginText,
  endText,
  moveText,
  setFillingColor,
  setFontAndSize,
  showText,
  type PDFDocument,
  type PDFFont,
  type PDFName,
  type PDFPage,
  type RGB,
} from "pdf-lib";

const SARABUN_REGULAR_URL = "/fonts/sarabun/Sarabun-Regular.ttf";
const SARABUN_SEMIBOLD_URL = "/fonts/sarabun/Sarabun-SemiBold.ttf";

type FontkitGlyph = { codePoints: number[] };
type FontkitPosition = { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number };
type FontkitFont = {
  unitsPerEm: number;
  layout: (text: string) => { glyphs: FontkitGlyph[]; positions: FontkitPosition[] };
};

export type ShapedFont = { pdf: PDFFont; engine: FontkitFont };

const pageFontKeys = new WeakMap<PDFPage, WeakMap<PDFFont, PDFName>>();

function fontKeyFor(page: PDFPage, font: PDFFont): PDFName {
  let pageKeys = pageFontKeys.get(page);
  if (!pageKeys) {
    pageKeys = new WeakMap<PDFFont, PDFName>();
    pageFontKeys.set(page, pageKeys);
  }
  const existing = pageKeys.get(font);
  if (existing) return existing;
  const key = page.node.newFontDictionary(font.name, font.ref);
  pageKeys.set(font, key);
  return key;
}

export function safePdfText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/[\u{10000}-\u{10ffff}]/gu, "").trim();
}

export function shapedTextWidth(font: ShapedFont, value: string, size: number): number {
  const run = font.engine.layout(value);
  const scale = size / font.engine.unitsPerEm;
  return run.positions.reduce((total, position) => total + position.xAdvance * scale, 0);
}

export function drawShapedText(page: PDFPage, value: string, x: number, y: number, font: ShapedFont, size: number, color: RGB): void {
  const text = safePdfText(value);
  if (!text) return;
  const run = font.engine.layout(text);
  const scale = size / font.engine.unitsPerEm;
  const fontKey = fontKeyFor(page, font.pdf);
  let cursorX = x;
  let cursorY = y;

  for (let index = 0; index < run.glyphs.length; index += 1) {
    const glyph = run.glyphs[index]!;
    const position = run.positions[index]!;
    const glyphText = String.fromCodePoint(...glyph.codePoints);
    if (!glyphText) continue;
    page.pushOperators(
      beginText(),
      setFillingColor(color),
      setFontAndSize(fontKey, size),
      moveText(cursorX + position.xOffset * scale, cursorY + position.yOffset * scale),
      showText(font.pdf.encodeText(glyphText)),
      endText(),
    );
    cursorX += position.xAdvance * scale;
    cursorY += position.yAdvance * scale;
  }
}

export function wrapShapedText(font: ShapedFont, value: string, size: number, maxWidth: number, maxLines = 4): string[] {
  const text = safePdfText(value) || "-";
  const lines: string[] = [];
  let truncated = false;
  const pushLine = (line: string) => {
    if (lines.length >= maxLines) {
      truncated = true;
      return false;
    }
    lines.push(line.trimEnd());
    return true;
  };

  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";
    const segments = Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(paragraph || " "), (part) => part.segment);
    for (const segment of segments) {
      let remainder = segment;
      const candidate = current + remainder;
      if (current && shapedTextWidth(font, candidate, size) > maxWidth) {
        if (!pushLine(current)) break;
        current = "";
        remainder = remainder.trimStart();
      }

      while (remainder && shapedTextWidth(font, remainder, size) > maxWidth) {
        let fitting = "";
        for (const character of Array.from(remainder)) {
          if (fitting && shapedTextWidth(font, fitting + character, size) > maxWidth) break;
          fitting += character;
        }
        if (!fitting || !pushLine(fitting)) break;
        remainder = remainder.slice(fitting.length).trimStart();
      }
      if (lines.length >= maxLines) {
        if (remainder || segments.at(-1) !== segment) truncated = true;
        break;
      }
      current += remainder;
    }
    if (current && !pushLine(current)) truncated = true;
    if (lines.length >= maxLines) {
      if (paragraph !== text.split(/\r?\n/).at(-1)) truncated = true;
      break;
    }
  }
  if (!lines.length) return ["-"];
  if (truncated) {
    let last = lines[maxLines - 1]!;
    while (last && shapedTextWidth(font, `${last}...`, size) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}...`;
  }
  return lines;
}

export function drawShapedLines(page: PDFPage, lines: string[], x: number, y: number, font: ShapedFont, size: number, color: RGB, lineHeight = size + 3): void {
  lines.forEach((line, index) => drawShapedText(page, line, x, y - index * lineHeight, font, size, color));
}

export function drawShapedRight(page: PDFPage, value: string, right: number, y: number, font: ShapedFont, size: number, color: RGB): void {
  const text = safePdfText(value);
  drawShapedText(page, text, right - shapedTextWidth(font, text, size), y, font, size, color);
}

async function fetchFont(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("โหลดฟอนต์ภาษาไทยสำหรับ PDF ไม่สำเร็จ");
  return new Uint8Array(await response.arrayBuffer());
}

export async function loadSarabunFonts(pdf: PDFDocument): Promise<{ regular: ShapedFont; semibold: ShapedFont }> {
  const [fontkitModule, regularBytes, semiboldBytes] = await Promise.all([
    import("@pdf-lib/fontkit"),
    fetchFont(SARABUN_REGULAR_URL),
    fetchFont(SARABUN_SEMIBOLD_URL),
  ]);
  pdf.registerFontkit(fontkitModule.default);
  const [regularPdf, semiboldPdf, regularEngine, semiboldEngine] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: false }),
    pdf.embedFont(semiboldBytes, { subset: false }),
    fontkitModule.default.create(regularBytes),
    fontkitModule.default.create(semiboldBytes),
  ]);
  return {
    regular: { pdf: regularPdf, engine: regularEngine },
    semibold: { pdf: semiboldPdf, engine: semiboldEngine },
  };
}
