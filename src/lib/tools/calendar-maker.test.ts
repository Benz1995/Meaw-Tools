import { describe, expect, it } from "vitest";
import {
  CALENDAR_MAKER_MAX_EVENTS,
  addCalendarMakerEvent,
  calendarMakerCsv,
  calendarMakerIcs,
  calendarMakerSvg,
  calendarMakerWeekdays,
  createCalendarMaker,
  getCalendarMakerMonth,
  getCalendarMakerMonths,
  parseCalendarMakerEvents,
  removeCalendarMakerEvent,
  restoreCalendarMaker,
  serializeCalendarMaker,
  type CreateCalendarMakerInput,
} from "./calendar-maker";

function calendarInput(overrides: Partial<CreateCalendarMakerInput> = {}): CreateCalendarMakerInput {
  return {
    title: "Marketing calendar",
    startMonth: "2026-08",
    monthCount: 2,
    language: "th",
    yearSystem: "both",
    weekStartsOn: 1,
    showAdjacentDays: true,
    showWeekNumbers: true,
    showNotes: true,
    theme: "matcha",
    notes: "Launch plan",
    eventsText: [
      "2026-08-12 | Campaign kickoff | sakura",
      "2026-09-01\tPublish report\tsora",
    ].join("\n"),
    ...overrides,
  };
}

describe("calendar maker engine", () => {
  it("parses pipe and tab events, colors, and duplicate rows", () => {
    const result = parseCalendarMakerEvents([
      "2026-08-12 | Campaign kickoff | sakura",
      "2026-08-12\tcampaign kickoff\tsora",
      "2026-08-13 | Review",
    ].join("\n"));
    expect(result.events).toEqual([
      { id: "event-1", date: "2026-08-12", title: "Campaign kickoff", color: "sakura" },
      { id: "event-2", date: "2026-08-13", title: "Review", color: "matcha" },
    ]);
    expect(result.duplicateCount).toBe(1);
  });

  it("rejects impossible event dates and an excessive event list", () => {
    expect(() => parseCalendarMakerEvents("2026-02-30 | Invalid")).toThrow("invalid");
    const tooMany = Array.from({ length: CALENDAR_MAKER_MAX_EVENTS + 1 }, (_, index) => {
      const day = String((index % 28) + 1).padStart(2, "0");
      return `2026-08-${day} | Event ${index}`;
    }).join("\n");
    expect(() => parseCalendarMakerEvents(tooMany)).toThrow(`at most ${CALENDAR_MAKER_MAX_EVENTS}`);
  });

  it("validates month count, range, and ISO week settings", () => {
    expect(() => createCalendarMaker(calendarInput({ monthCount: 13 }))).toThrow("1 to 12");
    expect(() => createCalendarMaker(calendarInput({ startMonth: "2100-12", monthCount: 2, eventsText: "" }))).toThrow("2100-12");
    expect(() => createCalendarMaker(calendarInput({ weekStartsOn: 0, showWeekNumbers: true }))).toThrow("require Monday");
    expect(() => createCalendarMaker(calendarInput({ eventsText: "2026-10-01 | Outside" }))).toThrow("outside");
  });

  it("creates Thai labels with Buddhist and Gregorian years", () => {
    const state = createCalendarMaker(calendarInput());
    const months = getCalendarMakerMonths(state);
    expect(months).toHaveLength(2);
    expect(months[0]?.label).toContain("2569 (2026)");
    expect(months[1]?.label).toContain("2569 (2026)");
  });

  it("orders weekdays from Monday or Sunday", () => {
    expect(calendarMakerWeekdays({ language: "en", weekStartsOn: 1 })).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(calendarMakerWeekdays({ language: "en", weekStartsOn: 0 })).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("always creates a six-by-seven grid and supports leap day", () => {
    const state = createCalendarMaker(calendarInput({ startMonth: "2028-02", monthCount: 1, eventsText: "" }));
    const month = getCalendarMakerMonth(state, "2028-02");
    expect(month.weeks).toHaveLength(6);
    expect(month.weeks.flatMap((week) => week.days)).toHaveLength(42);
    expect(month.weeks.flatMap((week) => week.days).find((day) => day.date === "2028-02-29")?.inMonth).toBe(true);
  });

  it("maps events into date cells and calculates ISO weeks", () => {
    const state = createCalendarMaker(calendarInput({ startMonth: "2026-01", monthCount: 1, eventsText: "2026-01-01 | New year" }));
    const month = getCalendarMakerMonth(state, "2026-01");
    expect(month.weeks[0]?.weekNumber).toBe(1);
    expect(month.weeks.flatMap((week) => week.days).find((day) => day.date === "2026-01-01")?.events[0]?.title).toBe("New year");
  });

  it("adds and removes a valid event while rejecting duplicates", () => {
    const initial = createCalendarMaker(calendarInput({ eventsText: "" }));
    const added = addCalendarMakerEvent(initial, { date: "2026-08-20", title: "Product launch", color: "sumire" });
    expect(added.events).toHaveLength(1);
    expect(() => addCalendarMakerEvent(added, { date: "2026-08-20", title: "product launch", color: "matcha" })).toThrow("already exists");
    expect(removeCalendarMakerEvent(added, added.events[0]!.id).events).toEqual([]);
  });

  it("neutralizes spreadsheet formulas in a BOM CSV", () => {
    const state = createCalendarMaker(calendarInput({ eventsText: "2026-08-20 | =SUM(1,1) | mikan" }));
    const csv = calendarMakerCsv(state);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=SUM(1,1)"');
    expect(csv).toContain('"date","title","color","calendar"');
  });

  it("exports all-day ICS events with exclusive next-day endings", () => {
    const state = createCalendarMaker(calendarInput({ eventsText: "2026-08-31 | Month end, review | sora" }));
    const ics = calendarMakerIcs(state);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260831");
    expect(ics).toContain("DTEND;VALUE=DATE:20260901");
    expect(ics).toContain("SUMMARY:Month end\\, review");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("round-trips a versioned JSON calendar", () => {
    const state = createCalendarMaker(calendarInput());
    expect(restoreCalendarMaker(serializeCalendarMaker(state))).toEqual(state);
  });

  it("rejects invalid JSON, versions, settings, and event colors", () => {
    const state = createCalendarMaker(calendarInput());
    expect(() => restoreCalendarMaker("{" )).toThrow("valid JSON");
    expect(() => restoreCalendarMaker(JSON.stringify({ ...state, version: 2 }))).toThrow("not supported");
    expect(() => restoreCalendarMaker(JSON.stringify({ ...state, monthCount: 99 }))).toThrow("1 to 12");
    expect(() => restoreCalendarMaker(JSON.stringify({ ...state, events: [{ date: "2026-08-12", title: "x", color: "red" }] }))).toThrow("invalid");
  });

  it("escapes user text in SVG and includes event colors", () => {
    const state = createCalendarMaker(calendarInput({ title: "Plan <Q3>", eventsText: "2026-08-12 | Review & publish | sumire" }));
    const svg = calendarMakerSvg(state, "2026-08");
    expect(svg).toContain("Plan &lt;Q3&gt;");
    expect(svg).toContain("Review &amp; publish");
    expect(svg).toContain("#8a75ba");
    expect(svg).toContain('width="1400"');
  });
});
