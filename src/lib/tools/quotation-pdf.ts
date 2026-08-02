import {
  PDFDocument,
  PageSizes,
  beginText,
  endText,
  moveText,
  rgb,
  setFillingColor,
  setFontAndSize,
  showText,
  type PDFFont,
  type PDFName,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  calculateQuotation,
  formatThaiBahtText,
  formatThaiDocumentDate,
  type QuotationDocument,
  type QuotationVatMode,
} from "@/lib/tools/quotation";

const SARABUN_REGULAR_URL = "/fonts/sarabun/Sarabun-Regular.ttf";
const SARABUN_SEMIBOLD_URL = "/fonts/sarabun/Sarabun-SemiBold.ttf";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;

type PdfColors = {
  ink: RGB;
  muted: RGB;
  line: RGB;
  accent: RGB;
  accentSoft: RGB;
  white: RGB;
};

type FontkitGlyph = { codePoints: number[] };
type FontkitPosition = { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number };
type FontkitFont = {
  unitsPerEm: number;
  layout: (text: string) => { glyphs: FontkitGlyph[]; positions: FontkitPosition[] };
};
type ShapedFont = { pdf: PDFFont; engine: FontkitFont };

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

function shapedWidth(font: ShapedFont, value: string, size: number): number {
  const run = font.engine.layout(value);
  const scale = size / font.engine.unitsPerEm;
  return run.positions.reduce((total, position) => total + position.xAdvance * scale, 0);
}

function drawShapedText(page: PDFPage, value: string, x: number, y: number, font: ShapedFont, size: number, color: RGB): void {
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

function safePdfText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/[\u{10000}-\u{10ffff}]/gu, "").trim();
}

function money(value: number): string {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function wrapText(font: ShapedFont, value: string, size: number, maxWidth: number, maxLines = 4): string[] {
  const text = safePdfText(value) || "-";
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";
    for (const character of Array.from(paragraph || " ")) {
      const candidate = current + character;
      if (current && shapedWidth(font, candidate, size) > maxWidth) {
        lines.push(current.trimEnd());
        current = character.trimStart();
      } else {
        current = candidate;
      }
      if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && current) lines.push(current.trimEnd());
    if (lines.length === maxLines) break;
  }
  if (!lines.length) return ["-"];
  if (lines.length === maxLines && shapedWidth(font, lines[maxLines - 1]!, size) > maxWidth - 8) {
    let last = lines[maxLines - 1]!;
    while (last && shapedWidth(font, `${last}...`, size) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}...`;
  }
  return lines;
}

function drawLines(page: PDFPage, lines: string[], x: number, y: number, font: ShapedFont, size: number, color: RGB, lineHeight = size + 3): void {
  lines.forEach((line, index) => drawShapedText(page, line, x, y - index * lineHeight, font, size, color));
}

function drawRight(page: PDFPage, value: string, right: number, y: number, font: ShapedFont, size: number, color: RGB): void {
  const text = safePdfText(value);
  drawShapedText(page, text, right - shapedWidth(font, text, size), y, font, size, color);
}

function drawLabelValue(page: PDFPage, label: string, value: string, x: number, y: number, width: number, regular: ShapedFont, semibold: ShapedFont, colors: PdfColors): number {
  drawShapedText(page, label, x, y, semibold, 9, colors.muted);
  const lines = wrapText(regular, value, 10, width, 3);
  drawLines(page, lines, x, y - 15, regular, 10, colors.ink, 13);
  return y - 15 - lines.length * 13;
}

function vatLabel(mode: QuotationVatMode, rate: number): string {
  if (mode === "none") return "VAT";
  return mode === "included" ? `VAT ${rate}% (รวมแล้ว)` : `VAT ${rate}%`;
}

async function fetchFont(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("โหลดฟอนต์ภาษาไทยสำหรับ PDF ไม่สำเร็จ");
  return new Uint8Array(await response.arrayBuffer());
}

export async function createQuotationPdf(documentData: QuotationDocument): Promise<Uint8Array> {
  const calculation = calculateQuotation(documentData.items, documentData.discount, documentData.vatMode, documentData.vatRate);
  const [fontkitModule, regularBytes, semiboldBytes] = await Promise.all([
    import("@pdf-lib/fontkit"),
    fetchFont(SARABUN_REGULAR_URL),
    fetchFont(SARABUN_SEMIBOLD_URL),
  ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkitModule.default);
  const [regularPdf, semiboldPdf, regularEngine, semiboldEngine] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: false }),
    pdf.embedFont(semiboldBytes, { subset: false }),
    fontkitModule.default.create(regularBytes),
    fontkitModule.default.create(semiboldBytes),
  ]);
  const regular: ShapedFont = { pdf: regularPdf, engine: regularEngine };
  const semibold: ShapedFont = { pdf: semiboldPdf, engine: semiboldEngine };
  pdf.setTitle(`Quotation ${safePdfText(documentData.number)}`);
  pdf.setAuthor(safePdfText(documentData.seller.name));
  pdf.setCreator("Meaw Tools Quotation Generator");
  pdf.setProducer("Meaw Tools");

  const colors: PdfColors = {
    ink: rgb(0.14, 0.19, 0.17),
    muted: rgb(0.38, 0.43, 0.4),
    line: rgb(0.82, 0.86, 0.83),
    accent: rgb(0.16, 0.43, 0.31),
    accentSoft: rgb(0.92, 0.97, 0.94),
    white: rgb(1, 1, 1),
  };

  let page = pdf.addPage(PageSizes.A4);
  let pageNumber = 1;

  const drawDocumentHeader = (target: PDFPage, continued: boolean): number => {
    if (continued) {
      drawShapedText(target, "ใบเสนอราคา (ต่อ)", MARGIN, PAGE_HEIGHT - 58, semibold, 18, colors.accent);
      drawRight(target, `เลขที่ ${documentData.number}`, CONTENT_RIGHT, PAGE_HEIGHT - 55, regular, 10, colors.muted);
      target.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 74 }, end: { x: CONTENT_RIGHT, y: PAGE_HEIGHT - 74 }, thickness: 1, color: colors.line });
      return PAGE_HEIGHT - 96;
    }

    drawShapedText(target, documentData.seller.name, MARGIN, PAGE_HEIGHT - 58, semibold, 18, colors.accent);
    const sellerDetails = [documentData.seller.address, documentData.seller.taxId ? `เลขประจำตัวผู้เสียภาษี ${documentData.seller.taxId}` : "", documentData.seller.contact].filter(Boolean).join(" | ");
    drawLines(target, wrapText(regular, sellerDetails, 9, 315, 3), MARGIN, PAGE_HEIGHT - 78, regular, 9, colors.muted, 12);
    drawRight(target, "ใบเสนอราคา", CONTENT_RIGHT, PAGE_HEIGHT - 58, semibold, 24, colors.accent);
    drawRight(target, "QUOTATION", CONTENT_RIGHT, PAGE_HEIGHT - 78, regular, 9, colors.muted);
    target.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 118 }, end: { x: CONTENT_RIGHT, y: PAGE_HEIGHT - 118 }, thickness: 1.2, color: colors.accent });

    drawShapedText(target, "เสนอราคาให้", MARGIN, PAGE_HEIGHT - 145, semibold, 10, colors.accent);
    let customerY = PAGE_HEIGHT - 165;
    drawShapedText(target, documentData.customer.name, MARGIN, customerY, semibold, 13, colors.ink);
    customerY -= 17;
    if (documentData.customer.address) {
      const addressLines = wrapText(regular, documentData.customer.address, 9, 285, 3);
      drawLines(target, addressLines, MARGIN, customerY, regular, 9, colors.muted, 12);
      customerY -= addressLines.length * 12;
    }
    if (documentData.customer.taxId) drawShapedText(target, `เลขประจำตัวผู้เสียภาษี ${safePdfText(documentData.customer.taxId)}`, MARGIN, customerY, regular, 9, colors.muted);
    if (documentData.customer.contact) drawShapedText(target, documentData.customer.contact, MARGIN, customerY - 13, regular, 9, colors.muted);

    const metaX = 380;
    drawLabelValue(target, "เลขที่ใบเสนอราคา", documentData.number, metaX, PAGE_HEIGHT - 145, 173, regular, semibold, colors);
    drawLabelValue(target, "วันที่ออก", formatThaiDocumentDate(documentData.issueDate), metaX, PAGE_HEIGHT - 190, 173, regular, semibold, colors);
    drawLabelValue(target, "ยืนราคาถึง", documentData.validUntil ? formatThaiDocumentDate(documentData.validUntil) : "ไม่ระบุ", metaX, PAGE_HEIGHT - 235, 173, regular, semibold, colors);
    return PAGE_HEIGHT - 290;
  };

  const drawTableHeader = (target: PDFPage, top: number): number => {
    const height = 28;
    target.drawRectangle({ x: MARGIN, y: top - height, width: CONTENT_RIGHT - MARGIN, height, color: colors.accent });
    drawShapedText(target, "#", MARGIN + 9, top - 19, semibold, 9, colors.white);
    drawShapedText(target, "รายละเอียด", 76, top - 19, semibold, 9, colors.white);
    drawRight(target, "จำนวน", 380, top - 19, semibold, 9, colors.white);
    drawRight(target, "ราคา/หน่วย", 462, top - 19, semibold, 9, colors.white);
    drawRight(target, "รวม", CONTENT_RIGHT - 7, top - 19, semibold, 9, colors.white);
    return top - height;
  };

  let cursorY = drawTableHeader(page, drawDocumentHeader(page, false));

  for (let index = 0; index < documentData.items.length; index += 1) {
    const item = documentData.items[index]!;
    const descriptionLines = wrapText(regular, item.description, 9.5, 245, 3);
    const rowHeight = Math.max(30, descriptionLines.length * 13 + 12);
    if (cursorY - rowHeight < 250) {
      page = pdf.addPage(PageSizes.A4);
      pageNumber += 1;
      cursorY = drawTableHeader(page, drawDocumentHeader(page, true));
    }
    const rowBottom = cursorY - rowHeight;
    if (index % 2 === 1) page.drawRectangle({ x: MARGIN, y: rowBottom, width: CONTENT_RIGHT - MARGIN, height: rowHeight, color: rgb(0.975, 0.982, 0.977) });
    page.drawRectangle({ x: MARGIN, y: rowBottom, width: CONTENT_RIGHT - MARGIN, height: rowHeight, borderColor: colors.line, borderWidth: 0.5 });
    drawShapedText(page, String(index + 1), MARGIN + 10, cursorY - 20, regular, 9, colors.muted);
    drawLines(page, descriptionLines, 76, cursorY - 18, regular, 9.5, colors.ink, 13);
    drawRight(page, money(item.quantity), 380, cursorY - 20, regular, 9, colors.ink);
    drawRight(page, money(item.unitPrice), 462, cursorY - 20, regular, 9, colors.ink);
    drawRight(page, money(calculation.itemTotals[index]!), CONTENT_RIGHT - 7, cursorY - 20, regular, 9, colors.ink);
    cursorY = rowBottom;
  }

  const summaryTop = Math.min(cursorY - 22, 318);
  drawShapedText(page, "เงื่อนไขการชำระเงิน", MARGIN, summaryTop, semibold, 9, colors.accent);
  drawLines(page, wrapText(regular, documentData.paymentTerms || "ไม่ระบุ", 9, 285, 3), MARGIN, summaryTop - 16, regular, 9, colors.ink, 12);
  drawShapedText(page, "หมายเหตุ", MARGIN, summaryTop - 68, semibold, 9, colors.accent);
  drawLines(page, wrapText(regular, documentData.notes || "-", 8.5, 285, 3), MARGIN, summaryTop - 84, regular, 8.5, colors.muted, 11);

  const summaryX = 365;
  const summaryRight = CONTENT_RIGHT;
  const summaryRows = [
    ["รวมสินค้า", calculation.subtotal],
    ["ส่วนลด", -calculation.discount],
    [vatLabel(documentData.vatMode, documentData.vatRate), calculation.vat],
  ] as const;
  summaryRows.forEach(([label, value], index) => {
    const y = summaryTop - index * 24;
    drawShapedText(page, label, summaryX, y, regular, 9, colors.muted);
    drawRight(page, money(value), summaryRight, y, regular, 9, colors.ink);
  });
  const totalY = summaryTop - 83;
  page.drawRectangle({ x: summaryX - 8, y: totalY - 11, width: summaryRight - summaryX + 8, height: 31, color: colors.accentSoft });
  drawShapedText(page, "ยอดสุทธิ", summaryX, totalY, semibold, 11, colors.accent);
  drawRight(page, `${money(calculation.total)} บาท`, summaryRight, totalY, semibold, 12, colors.accent);
  drawShapedText(page, `(${formatThaiBahtText(calculation.total)})`, MARGIN, summaryTop - 128, semibold, 9, colors.ink);

  page.drawLine({ start: { x: 82, y: 79 }, end: { x: 245, y: 79 }, thickness: 0.6, color: colors.line });
  page.drawLine({ start: { x: 351, y: 79 }, end: { x: 514, y: 79 }, thickness: 0.6, color: colors.line });
  drawShapedText(page, "ผู้เสนอราคา", 138, 62, regular, 9, colors.muted);
  drawShapedText(page, "ผู้อนุมัติ", 414, 62, regular, 9, colors.muted);

  const pages = pdf.getPages();
  pages.forEach((target, index) => {
    target.drawLine({ start: { x: MARGIN, y: 37 }, end: { x: CONTENT_RIGHT, y: 37 }, thickness: 0.5, color: colors.line });
    drawShapedText(target, "สร้างด้วย Meaw Tools - ข้อมูลประมวลผลใน Browser", MARGIN, 22, regular, 7.5, colors.muted);
    drawRight(target, `หน้า ${index + 1}/${pageNumber}`, CONTENT_RIGHT, 22, regular, 7.5, colors.muted);
  });

  return pdf.save();
}
