import { describe, expect, it } from "vitest";
import {
  buildMeetingIcs,
  buildMeetingPlannerShareUrl,
  getZonedDateTimeParts,
  parseMeetingPlannerShareParams,
  planTimeZoneMeeting,
  type MeetingPlannerInput,
} from "./time-zone-meeting";

const globalTeam: MeetingPlannerInput = {
  title: "Weekly product sync",
  date: "2026-08-12",
  durationMinutes: 60,
  participants: [
    { label: "Bangkok", timeZone: "Asia/Bangkok", workStart: "09:00", workEnd: "22:00" },
    { label: "London", timeZone: "Europe/London", workStart: "09:00", workEnd: "18:00" },
    { label: "New York", timeZone: "America/New_York", workStart: "07:00", workEnd: "18:00" },
  ],
};

describe("time zone meeting planner", () => {
  it("formats one instant correctly across Bangkok and New York", () => {
    const instant = Date.UTC(2026, 7, 12, 14, 30);
    const bangkok = getZonedDateTimeParts(instant, "Asia/Bangkok");
    const newYork = getZonedDateTimeParts(instant, "America/New_York");
    expect([bangkok.dateKey, bangkok.hour, bangkok.minute, bangkok.offsetLabel]).toEqual(["2026-08-12", 21, 30, "UTC+07:00"]);
    expect([newYork.dateKey, newYork.hour, newYork.minute, newYork.offsetLabel]).toEqual(["2026-08-12", 10, 30, "UTC−04:00"]);
  });

  it("uses 23-hour and 25-hour organizer days across DST changes", () => {
    const participants = [
      { label: "New York", timeZone: "America/New_York", workStart: "00:00", workEnd: "23:59" },
      { label: "Bangkok", timeZone: "Asia/Bangkok", workStart: "00:00", workEnd: "23:59" },
    ];
    const spring = planTimeZoneMeeting({ title: "Spring", date: "2026-03-08", durationMinutes: 60, participants });
    const fall = planTimeZoneMeeting({ title: "Fall", date: "2026-11-01", durationMinutes: 60, participants });
    expect(spring.dayLengthHours).toBe(23);
    expect(spring.slotsEvaluated).toBe(45);
    expect(fall.dayLengthHours).toBe(25);
    expect(fall.slotsEvaluated).toBe(49);
    expect(spring.offsetChanges).toContain("New York");
    expect(fall.offsetChanges).toContain("New York");
  });

  it("ranks a full work-hour overlap for a global team", () => {
    const result = planTimeZoneMeeting(globalTeam);
    expect(result.hasFullOverlap).toBe(true);
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions[0]!.allAvailable).toBe(true);
    expect(result.suggestions[0]!.participantSlots.every((slot) => slot.withinWorkHours)).toBe(true);
  });

  it("returns an explicit best compromise when work hours never overlap", () => {
    const result = planTimeZoneMeeting({
      ...globalTeam,
      participants: [
        { label: "Bangkok", timeZone: "Asia/Bangkok", workStart: "09:00", workEnd: "10:00" },
        { label: "New York", timeZone: "America/New_York", workStart: "09:00", workEnd: "10:00" },
      ],
    });
    expect(result.hasFullOverlap).toBe(false);
    expect(result.suggestions[0]!.allAvailable).toBe(false);
    expect(result.suggestions[0]!.availableCount).toBeLessThan(2);
  });

  it("round-trips bounded share URLs and rejects invalid input", () => {
    const url = buildMeetingPlannerShareUrl("https://meaw-tools.vercel.app", globalTeam, Date.UTC(2026, 7, 12, 14));
    const parsed = parseMeetingPlannerShareParams(new URL(url).search);
    expect(parsed).toMatchObject(globalTeam);
    expect(parsed?.selectedStartMs).toBe(Date.UTC(2026, 7, 12, 14));
    const tampered = new URL(url);
    tampered.searchParams.set("p", JSON.stringify([...globalTeam.participants, ...globalTeam.participants, ...globalTeam.participants]));
    expect(parseMeetingPlannerShareParams(tampered.search)).toBeNull();
  });

  it("exports a UTC calendar event with escaped content", () => {
    const start = Date.UTC(2026, 7, 12, 14);
    const ics = buildMeetingIcs({ ...globalTeam, title: "Weekly, product; sync" }, start, Date.UTC(2026, 7, 1));
    expect(ics).toContain("DTSTART:20260812T140000Z");
    expect(ics).toContain("DTEND:20260812T150000Z");
    expect(ics).toContain("SUMMARY:Weekly\\, product\\; sync");
    expect(ics).toContain("UID:");
    expect(ics.endsWith("\r\n")).toBe(true);
  });
});
