export const PDF_FILE_LIMIT_BYTES = 30 * 1024 * 1024;
export const PDF_TOTAL_LIMIT_BYTES = 60 * 1024 * 1024;
export const PDF_FILE_COUNT_LIMIT = 10;
export const PDF_RENDER_PAGE_LIMIT = 20;
export const PDF_SPLIT_GROUP_LIMIT = 20;

export type PdfFileLike = {
  name: string;
  size: number;
  type?: string;
};

export type PdfPageRange = {
  label: string;
  pages: number[];
};

export function formatPdfBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function pdfFileStem(filename: string): string {
  const withoutExtension = filename.trim().replace(/\.pdf$/i, "").trim();
  const safe = withoutExtension.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ");
  return safe || "document";
}

export function validatePdfFile(file: PdfFileLike): void {
  const hasPdfExtension = /\.pdf$/i.test(file.name);
  const hasPdfMime = file.type === "application/pdf";
  if (!hasPdfExtension && !hasPdfMime) throw new Error("รองรับเฉพาะไฟล์ PDF");
  if (file.size <= 0) throw new Error("ไฟล์ PDF ว่างเปล่าหรืออ่านไม่ได้");
  if (file.size > PDF_FILE_LIMIT_BYTES) throw new Error("ไฟล์ PDF ต้องมีขนาดไม่เกิน 30 MB");
}

function parseToken(token: string, pageCount: number): PdfPageRange {
  const normalized = token.trim();
  const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(normalized);
  if (!match) throw new Error(`ช่วงหน้า “${normalized || token}” ไม่ถูกต้อง`);

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
    throw new Error("หมายเลขหน้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
  }
  if (start > end) throw new Error(`ช่วงหน้า ${start}-${end} ต้องเรียงจากน้อยไปมาก`);
  if (end > pageCount) throw new Error(`ไฟล์นี้มี ${pageCount} หน้า แต่ระบุถึงหน้า ${end}`);

  return {
    label: start === end ? String(start) : `${start}-${end}`,
    pages: Array.from({ length: end - start + 1 }, (_, index) => start + index - 1),
  };
}

export function parsePdfPageSelection(input: string, pageCount: number, limit = PDF_RENDER_PAGE_LIMIT): number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("จำนวนหน้า PDF ไม่ถูกต้อง");
  const value = input.trim();
  if (!value) throw new Error("กรุณาระบุหน้าที่ต้องการ เช่น 1,3-5");

  const ranges = value.toLocaleLowerCase("en") === "all"
    ? [{ label: `1-${pageCount}`, pages: Array.from({ length: pageCount }, (_, index) => index) }]
    : value.split(",").map((token) => parseToken(token, pageCount));

  const uniquePages: number[] = [];
  const seen = new Set<number>();
  for (const range of ranges) {
    for (const page of range.pages) {
      if (!seen.has(page)) {
        seen.add(page);
        uniquePages.push(page);
      }
    }
  }

  if (uniquePages.length > limit) throw new Error(`ประมวลผลได้สูงสุด ${limit} หน้าต่อครั้ง`);
  return uniquePages;
}

export function parsePdfSplitRanges(input: string, pageCount: number): PdfPageRange[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("จำนวนหน้า PDF ไม่ถูกต้อง");
  const tokens = input.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) throw new Error("กรุณาระบุช่วงหน้า เช่น 1-3,4-6,8");
  if (tokens.length > PDF_SPLIT_GROUP_LIMIT) throw new Error(`แยกได้สูงสุด ${PDF_SPLIT_GROUP_LIMIT} ไฟล์ต่อครั้ง`);
  return tokens.map((token) => parseToken(token, pageCount));
}
