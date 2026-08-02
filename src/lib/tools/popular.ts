export type AgeResult = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthday: string;
  daysUntilBirthday: number;
};

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error("กรุณาเลือกวันที่ให้ครบ");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error("วันที่ไม่ถูกต้อง");
  }
  return date;
}

function formatIsoDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86_400_000);
}

function dateAtClampedDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0, 12).getDate();
  return new Date(year, month, Math.min(day, lastDay), 12);
}

function addYearsClamped(date: Date, years: number): Date {
  return dateAtClampedDay(date.getFullYear() + years, date.getMonth(), date.getDate());
}

function addMonthsClamped(date: Date, months: number): Date {
  const absoluteMonth = date.getFullYear() * 12 + date.getMonth() + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = ((absoluteMonth % 12) + 12) % 12;
  return dateAtClampedDay(year, month, date.getDate());
}

export function calculateAge(birthDateValue: string, asOfDateValue: string): AgeResult {
  const birthDate = parseIsoDate(birthDateValue);
  const asOfDate = parseIsoDate(asOfDateValue);
  if (birthDate > asOfDate) throw new Error("วันเกิดต้องไม่อยู่หลังวันที่คำนวณ");

  let years = asOfDate.getFullYear() - birthDate.getFullYear();
  let cursor = addYearsClamped(birthDate, years);
  if (cursor > asOfDate) {
    years -= 1;
    cursor = addYearsClamped(birthDate, years);
  }

  let months = (asOfDate.getFullYear() - cursor.getFullYear()) * 12 + asOfDate.getMonth() - cursor.getMonth();
  let monthCursor = addMonthsClamped(cursor, months);
  if (monthCursor > asOfDate) {
    months -= 1;
    monthCursor = addMonthsClamped(cursor, months);
  }

  let nextBirthday = dateAtClampedDay(asOfDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < asOfDate) {
    nextBirthday = dateAtClampedDay(asOfDate.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }

  return {
    years,
    months,
    days: daysBetween(monthCursor, asOfDate),
    totalDays: daysBetween(birthDate, asOfDate),
    nextBirthday: formatIsoDate(nextBirthday),
    daysUntilBirthday: daysBetween(asOfDate, nextBirthday),
  };
}

export type FittedRectangle = { width: number; height: number; x: number; y: number };

export function fitRectangle(
  sourceWidth: number,
  sourceHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): FittedRectangle {
  if ([sourceWidth, sourceHeight, pageWidth, pageHeight].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("ขนาดรูปหรือหน้ากระดาษไม่ถูกต้อง");
  }
  if (!Number.isFinite(margin) || margin < 0 || margin * 2 >= pageWidth || margin * 2 >= pageHeight) {
    throw new Error("ระยะขอบไม่ถูกต้อง");
  }
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { width, height, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2 };
}
