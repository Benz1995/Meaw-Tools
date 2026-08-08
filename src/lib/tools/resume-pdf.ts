import { PDFDocument, PageSizes, rgb, type PDFPage, type RGB } from "pdf-lib";
import { drawShapedLines, drawShapedText, loadSarabunFonts, safePdfText, type ShapedFont, wrapShapedText } from "@/lib/tools/pdf-thai";
import { formatResumeDateRange, resumeHighlightLines, resumeLabels, resumeListItems, validateResume, type ResumeDocument } from "@/lib/tools/resume";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 46;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type ResumeColors = {
  ink: RGB;
  muted: RGB;
  line: RGB;
  accent: RGB;
  accentSoft: RGB;
};

function contactLine(documentData: ResumeDocument): string {
  return [documentData.contact.email, documentData.contact.phone, documentData.contact.location, documentData.contact.website]
    .map(safePdfText)
    .filter(Boolean)
    .join("  |  ");
}

export async function createResumePdf(documentData: ResumeDocument): Promise<Uint8Array> {
  const issues = validateResume(documentData);
  if (issues.length) throw new Error(issues[0]);

  const pdf = await PDFDocument.create();
  const { regular, semibold } = await loadSarabunFonts(pdf);
  const modern = documentData.style === "modern";
  const colors: ResumeColors = modern
    ? { ink: rgb(0.10, 0.16, 0.17), muted: rgb(0.35, 0.43, 0.43), line: rgb(0.79, 0.86, 0.84), accent: rgb(0.06, 0.46, 0.41), accentSoft: rgb(0.92, 0.97, 0.96) }
    : { ink: rgb(0.10, 0.15, 0.23), muted: rgb(0.34, 0.40, 0.49), line: rgb(0.78, 0.82, 0.87), accent: rgb(0.12, 0.28, 0.43), accentSoft: rgb(0.93, 0.95, 0.97) };
  const copy = resumeLabels[documentData.locale];
  let page: PDFPage = pdf.addPage(PageSizes.A4);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  const addPage = () => {
    page = pdf.addPage(PageSizes.A4);
    cursorY = PAGE_HEIGHT - MARGIN_TOP;
  };
  const ensureSpace = (height: number) => {
    if (cursorY - height < MARGIN_BOTTOM) addPage();
  };
  const drawWrapped = (value: string, font: ShapedFont, size: number, color: RGB, options?: { x?: number; width?: number; lineHeight?: number; maxLines?: number }) => {
    const x = options?.x ?? MARGIN_X;
    const width = options?.width ?? CONTENT_WIDTH;
    const lineHeight = options?.lineHeight ?? size + 3.5;
    const lines = wrapShapedText(font, value, size, width, options?.maxLines ?? 100);
    ensureSpace(lines.length * lineHeight);
    drawShapedLines(page, lines, x, cursorY, font, size, color, lineHeight);
    cursorY -= lines.length * lineHeight;
    return lines.length;
  };
  const drawSectionTitle = (title: string) => {
    ensureSpace(64);
    cursorY -= 8;
    if (modern) page.drawRectangle({ x: MARGIN_X, y: cursorY - 3, width: 4, height: 15, color: colors.accent });
    drawShapedText(page, title, MARGIN_X + (modern ? 12 : 0), cursorY, semibold, 12, colors.accent);
    cursorY -= 8;
    page.drawLine({ start: { x: MARGIN_X, y: cursorY }, end: { x: PAGE_WIDTH - MARGIN_X, y: cursorY }, thickness: 0.8, color: colors.line });
    cursorY -= 18;
  };

  const nameLines = wrapShapedText(semibold, documentData.contact.fullName, modern ? 25 : 24, CONTENT_WIDTH, 2);
  drawShapedLines(page, nameLines, MARGIN_X, cursorY, semibold, modern ? 25 : 24, colors.ink, 30);
  cursorY -= nameLines.length * 30;
  if (safePdfText(documentData.contact.headline)) {
    drawWrapped(documentData.contact.headline, semibold, 11.5, colors.accent, { lineHeight: 15, maxLines: 2 });
    cursorY -= 2;
  }
  const contacts = contactLine(documentData);
  if (contacts) drawWrapped(contacts, regular, 9, colors.muted, { lineHeight: 12, maxLines: 3 });
  cursorY -= 7;
  page.drawLine({ start: { x: MARGIN_X, y: cursorY }, end: { x: PAGE_WIDTH - MARGIN_X, y: cursorY }, thickness: modern ? 2 : 1.2, color: colors.accent });
  cursorY -= 12;

  if (safePdfText(documentData.summary)) {
    drawSectionTitle(copy.summary);
    drawWrapped(documentData.summary, regular, 10, colors.ink, { lineHeight: 14.5, maxLines: 12 });
  }

  if (documentData.experiences.length) {
    drawSectionTitle(copy.experience);
    documentData.experiences.forEach((item, index) => {
      const highlights = resumeHighlightLines(item.highlights);
      const estimate = 38 + highlights.length * 30;
      ensureSpace(Math.min(estimate, 210));
      drawWrapped(item.role, semibold, 11, colors.ink, { lineHeight: 14.5, maxLines: 2 });
      const organization = [item.employer, item.location].map(safePdfText).filter(Boolean).join("  |  ");
      const dateRange = formatResumeDateRange(item.startDate, item.endDate, item.current, documentData.locale);
      drawWrapped([organization, dateRange].filter(Boolean).join("  |  "), regular, 9, colors.muted, { lineHeight: 12, maxLines: 3 });
      cursorY -= 3;
      highlights.forEach((highlight) => {
        const bulletLines = wrapShapedText(regular, highlight, 9.5, CONTENT_WIDTH - 16, 6);
        ensureSpace(bulletLines.length * 13 + 2);
        drawShapedText(page, "•", MARGIN_X + 2, cursorY, semibold, 10, colors.accent);
        drawShapedLines(page, bulletLines, MARGIN_X + 16, cursorY, regular, 9.5, colors.ink, 13);
        cursorY -= bulletLines.length * 13 + 2;
      });
      if (index < documentData.experiences.length - 1) cursorY -= 8;
    });
  }

  if (documentData.education.length) {
    drawSectionTitle(copy.education);
    documentData.education.forEach((item, index) => {
      ensureSpace(58);
      drawWrapped(item.degree, semibold, 10.5, colors.ink, { lineHeight: 14, maxLines: 2 });
      const institution = [item.institution, item.location].map(safePdfText).filter(Boolean).join("  |  ");
      const dateRange = formatResumeDateRange(item.startDate, item.endDate, false, documentData.locale);
      drawWrapped([institution, dateRange].filter(Boolean).join("  |  "), regular, 9, colors.muted, { lineHeight: 12, maxLines: 3 });
      if (safePdfText(item.details)) drawWrapped(item.details, regular, 9.5, colors.ink, { lineHeight: 13, maxLines: 5 });
      if (index < documentData.education.length - 1) cursorY -= 8;
    });
  }

  const drawCompactListSection = (title: string, values: string[]) => {
    if (!values.length) return;
    drawSectionTitle(title);
    drawWrapped(values.join("  •  "), regular, 9.5, colors.ink, { lineHeight: 14, maxLines: 10 });
  };
  drawCompactListSection(copy.skills, resumeListItems(documentData.skills));
  drawCompactListSection(copy.languages, resumeHighlightLines(documentData.languages).slice(0, 20));
  drawCompactListSection(copy.certifications, resumeHighlightLines(documentData.certifications).slice(0, 20));

  pdf.setTitle(`${safePdfText(documentData.contact.fullName)} Resume`);
  pdf.setAuthor(safePdfText(documentData.contact.fullName));
  pdf.setSubject("Resume generated locally in the browser");
  pdf.setCreator("Meaw Tools Resume Builder");
  pdf.setProducer("Meaw Tools");
  return pdf.save({ useObjectStreams: false });
}
