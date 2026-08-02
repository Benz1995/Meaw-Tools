const FIELD_RANGES = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
] as const;

function matchesField(value: number, expression: string, min: number, max: number): boolean {
  return expression.split(",").some((part) => {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) return false;
    let start = min;
    let end = max;
    if (rangePart !== "*") {
      const [from, to] = rangePart?.split("-") ?? [];
      start = Number(from);
      end = to === undefined ? start : Number(to);
    }
    return start >= min && end <= max && value >= start && value <= end && (value - start) % step === 0;
  });
}

export function validateCron(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  return fields.every((field, index) => {
    const range = FIELD_RANGES[index];
    if (!range) return false;
    return field.split(",").every((part) => {
      if (!/^\*$|^\*\/\d+$|^\d+$|^\d+-\d+$|^\d+-\d+\/\d+$/.test(part)) return false;
      const [rangePart, stepPart] = part.split("/");
      const step = stepPart === undefined ? 1 : Number(stepPart);
      if (!Number.isInteger(step) || step < 1) return false;
      if (rangePart === "*") return true;
      const [fromText, toText] = rangePart?.split("-") ?? [];
      const from = Number(fromText);
      const to = toText === undefined ? from : Number(toText);
      return Number.isInteger(from) && Number.isInteger(to) && from >= range[0] && to <= range[1] && from <= to;
    });
  });
}

export function nextCronRuns(expression: string, from = new Date(), count = 5): Date[] {
  if (!validateCron(expression)) throw new Error("Cron Expression ไม่ถูกต้อง");
  const [minute, hour, day, month, weekday] = expression.trim().split(/\s+/) as [string, string, string, string, string];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const results: Date[] = [];
  const maxIterations = 60 * 24 * 366 * 2;
  for (let iteration = 0; iteration < maxIterations && results.length < count; iteration += 1) {
    if (
      matchesField(cursor.getMinutes(), minute, 0, 59) &&
      matchesField(cursor.getHours(), hour, 0, 23) &&
      matchesField(cursor.getDate(), day, 1, 31) &&
      matchesField(cursor.getMonth() + 1, month, 1, 12) &&
      matchesField(cursor.getDay(), weekday, 0, 6)
    ) {
      results.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

export function describeCronThai(expression: string): string {
  if (expression === "0 8 * * 1-5") return "ทำงานเวลา 08:00 น. ทุกวันจันทร์ถึงศุกร์";
  const [minute, hour, day, month, weekday] = expression.trim().split(/\s+/);
  if (minute && hour && day === "*" && month === "*" && weekday === "*") {
    return `ทำงานเวลา ${hour.padStart(2, "0")}:${minute.padStart(2, "0")} น. ทุกวัน`;
  }
  return `ทำงานตาม Cron: ${expression} (timezone ขึ้นกับ platform)`;
}
