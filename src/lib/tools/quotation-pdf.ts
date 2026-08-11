import {
  PDFDocument,
  PageSizes,
  rgb,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  drawShapedLines as drawLines,
  drawShapedRight as drawRight,
  drawShapedText,
  loadSarabunFonts,
  safePdfText,
  type ShapedFont,
  wrapShapedText as wrapText,
} from "@/lib/tools/pdf-thai";
import {
  calculateQuotation,
  formatThaiBahtText,
  formatThaiDocumentDate,
  type QuotationDocument,
  type QuotationVatMode,
} from "@/lib/tools/quotation";
import { calculateInvoice, type InvoiceDocument } from "@/lib/tools/invoice";

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

function money(value: number): string {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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

type BusinessDocumentKind = "quotation" | "invoice";

async function createBusinessDocumentPdf(documentData: QuotationDocument | InvoiceDocument, kind: BusinessDocumentKind): Promise<Uint8Array> {
  const invoiceData = kind === "invoice" ? documentData as InvoiceDocument : null;
  const quotationData = kind === "quotation" ? documentData as QuotationDocument : null;
  const invoiceCalculation = invoiceData ? calculateInvoice(invoiceData) : null;
  const calculation = invoiceCalculation
    ? invoiceCalculation
    : calculateQuotation(documentData.items, documentData.discount, documentData.vatMode, documentData.vatRate);
  const titleThai = invoiceData ? "ใบแจ้งหนี้" : "ใบเสนอราคา";
  const titleEnglish = invoiceData ? "INVOICE" : "QUOTATION";
  const recipientLabel = invoiceData ? "เรียกเก็บจาก" : "เสนอราคาให้";
  const numberLabel = invoiceData ? "เลขที่ใบแจ้งหนี้" : "เลขที่ใบเสนอราคา";
  const secondaryDateLabel = invoiceData ? "ครบกำหนดชำระ" : "ยืนราคาถึง";
  const secondaryDate = invoiceData?.dueDate ?? quotationData?.validUntil ?? "";
  const paymentText = invoiceData?.paymentDetails ?? quotationData?.paymentTerms ?? "";
  const pdf = await PDFDocument.create();
  const { regular, semibold } = await loadSarabunFonts(pdf);
  pdf.setTitle(`${titleEnglish} ${safePdfText(documentData.number)}`);
  pdf.setAuthor(safePdfText(documentData.seller.name));
  pdf.setCreator(`Meaw Tools ${invoiceData ? "Invoice" : "Quotation"} Generator`);
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
      drawShapedText(target, `${titleThai} (ต่อ)`, MARGIN, PAGE_HEIGHT - 58, semibold, 18, colors.accent);
      drawRight(target, `เลขที่ ${documentData.number}`, CONTENT_RIGHT, PAGE_HEIGHT - 55, regular, 10, colors.muted);
      target.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 74 }, end: { x: CONTENT_RIGHT, y: PAGE_HEIGHT - 74 }, thickness: 1, color: colors.line });
      return PAGE_HEIGHT - 96;
    }

    drawShapedText(target, documentData.seller.name, MARGIN, PAGE_HEIGHT - 58, semibold, 18, colors.accent);
    const sellerDetails = [documentData.seller.address, documentData.seller.taxId ? `เลขประจำตัวผู้เสียภาษี ${documentData.seller.taxId}` : "", documentData.seller.contact].filter(Boolean).join(" | ");
    drawLines(target, wrapText(regular, sellerDetails, 9, 315, 3), MARGIN, PAGE_HEIGHT - 78, regular, 9, colors.muted, 12);
    drawRight(target, titleThai, CONTENT_RIGHT, PAGE_HEIGHT - 58, semibold, 24, colors.accent);
    drawRight(target, titleEnglish, CONTENT_RIGHT, PAGE_HEIGHT - 78, regular, 9, colors.muted);
    target.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 118 }, end: { x: CONTENT_RIGHT, y: PAGE_HEIGHT - 118 }, thickness: 1.2, color: colors.accent });

    drawShapedText(target, recipientLabel, MARGIN, PAGE_HEIGHT - 145, semibold, 10, colors.accent);
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
    drawLabelValue(target, numberLabel, documentData.number, metaX, PAGE_HEIGHT - 145, 173, regular, semibold, colors);
    drawLabelValue(target, "วันที่ออก", formatThaiDocumentDate(documentData.issueDate), metaX, PAGE_HEIGHT - 190, 173, regular, semibold, colors);
    drawLabelValue(target, secondaryDateLabel, secondaryDate ? formatThaiDocumentDate(secondaryDate) : "ไม่ระบุ", metaX, PAGE_HEIGHT - 235, 173, regular, semibold, colors);
    if (invoiceData?.reference) drawLabelValue(target, "เลขอ้างอิง / PO", invoiceData.reference, metaX, PAGE_HEIGHT - 272, 173, regular, semibold, colors);
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
  drawShapedText(page, invoiceData ? "ช่องทางและเงื่อนไขการชำระเงิน" : "เงื่อนไขการชำระเงิน", MARGIN, summaryTop, semibold, 9, colors.accent);
  drawLines(page, wrapText(regular, paymentText || "ไม่ระบุ", 9, 285, 3), MARGIN, summaryTop - 16, regular, 9, colors.ink, 12);
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
  drawShapedText(page, invoiceData ? "ยอดใบแจ้งหนี้" : "ยอดสุทธิ", summaryX, totalY, semibold, 11, colors.accent);
  drawRight(page, `${money(calculation.total)} บาท`, summaryRight, totalY, semibold, 12, colors.accent);
  if (invoiceCalculation) {
    drawShapedText(page, "ยอดชำระแล้ว", summaryX, totalY - 34, regular, 9, colors.muted);
    drawRight(page, `${money(invoiceCalculation.amountPaid)} บาท`, summaryRight, totalY - 34, regular, 9, colors.ink);
    page.drawRectangle({ x: summaryX - 8, y: totalY - 78, width: summaryRight - summaryX + 8, height: 31, color: colors.accentSoft });
    drawShapedText(page, "ยอดคงเหลือ", summaryX, totalY - 67, semibold, 11, colors.accent);
    drawRight(page, `${money(invoiceCalculation.balanceDue)} บาท`, summaryRight, totalY - 67, semibold, 12, colors.accent);
  }
  drawShapedText(page, `(${formatThaiBahtText(calculation.total)})`, MARGIN, summaryTop - (invoiceData ? 155 : 128), semibold, 9, colors.ink);

  page.drawLine({ start: { x: 82, y: 79 }, end: { x: 245, y: 79 }, thickness: 0.6, color: colors.line });
  page.drawLine({ start: { x: 351, y: 79 }, end: { x: 514, y: 79 }, thickness: 0.6, color: colors.line });
  drawShapedText(page, invoiceData ? "ผู้ออกเอกสาร" : "ผู้เสนอราคา", 138, 62, regular, 9, colors.muted);
  drawShapedText(page, invoiceData ? "ผู้รับเอกสาร" : "ผู้อนุมัติ", 414, 62, regular, 9, colors.muted);

  const pages = pdf.getPages();
  pages.forEach((target, index) => {
    target.drawLine({ start: { x: MARGIN, y: 37 }, end: { x: CONTENT_RIGHT, y: 37 }, thickness: 0.5, color: colors.line });
    drawShapedText(target, "สร้างด้วย Meaw Tools - ข้อมูลประมวลผลใน Browser", MARGIN, 22, regular, 7.5, colors.muted);
    drawRight(target, `หน้า ${index + 1}/${pageNumber}`, CONTENT_RIGHT, 22, regular, 7.5, colors.muted);
  });

  return pdf.save();
}

export function createQuotationPdf(documentData: QuotationDocument): Promise<Uint8Array> {
  return createBusinessDocumentPdf(documentData, "quotation");
}

export function createInvoicePdf(documentData: InvoiceDocument): Promise<Uint8Array> {
  return createBusinessDocumentPdf(documentData, "invoice");
}
