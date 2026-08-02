export const PDF_ORGANIZER_PAGE_LIMIT = 100;

export type PdfPageRotation = 0 | 90 | 180 | 270;

export type PdfPagePlan = {
  id: string;
  sourceIndex: number;
  rotation: PdfPageRotation;
};

function findPageIndex(pages: PdfPagePlan[], id: string): number {
  const index = pages.findIndex((page) => page.id === id);
  if (index < 0) throw new Error("ไม่พบหน้าที่ต้องการจัดการ");
  return index;
}

export function createPdfPagePlan(pageCount: number): PdfPagePlan[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("PDF ต้องมีอย่างน้อย 1 หน้า");
  if (pageCount > PDF_ORGANIZER_PAGE_LIMIT) {
    throw new Error(`จัดหน้าได้สูงสุด ${PDF_ORGANIZER_PAGE_LIMIT} หน้าต่อครั้ง`);
  }
  return Array.from({ length: pageCount }, (_, sourceIndex) => ({
    id: `page-${sourceIndex + 1}`,
    sourceIndex,
    rotation: 0,
  }));
}

export function movePdfPage(pages: PdfPagePlan[], id: string, direction: -1 | 1): PdfPagePlan[] {
  const from = findPageIndex(pages, id);
  const to = from + direction;
  if (to < 0 || to >= pages.length) return pages;
  const next = [...pages];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

export function reorderPdfPage(pages: PdfPagePlan[], activeId: string, targetId: string): PdfPagePlan[] {
  const from = findPageIndex(pages, activeId);
  const to = findPageIndex(pages, targetId);
  if (from === to) return pages;
  const next = [...pages];
  const [active] = next.splice(from, 1);
  next.splice(to, 0, active!);
  return next;
}

export function rotatePdfPage(pages: PdfPagePlan[], id: string, direction: -1 | 1 = 1): PdfPagePlan[] {
  const target = findPageIndex(pages, id);
  return pages.map((page, index) => {
    if (index !== target) return page;
    const rotation = ((page.rotation + direction * 90 + 360) % 360) as PdfPageRotation;
    return { ...page, rotation };
  });
}

export function removePdfPage(pages: PdfPagePlan[], id: string): PdfPagePlan[] {
  if (pages.length <= 1) throw new Error("PDF ต้องเหลืออย่างน้อย 1 หน้า");
  const target = findPageIndex(pages, id);
  return pages.filter((_, index) => index !== target);
}

export function isPdfPagePlanChanged(pages: PdfPagePlan[], originalPageCount: number): boolean {
  if (pages.length !== originalPageCount) return true;
  return pages.some((page, index) => page.sourceIndex !== index || page.rotation !== 0);
}
