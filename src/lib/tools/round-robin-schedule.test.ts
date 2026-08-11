import { describe, expect, it } from "vitest";
import {
  ROUND_ROBIN_MAX_JSON_LENGTH,
  ROUND_ROBIN_MAX_PARTICIPANTS,
  clearRoundRobinMatchScore,
  createRoundRobinSchedule,
  parseRoundRobinCourts,
  parseRoundRobinParticipants,
  resolveRoundRobinSchedule,
  restoreRoundRobinSchedule,
  roundRobinScheduleCsv,
  roundRobinScheduleIcs,
  roundRobinScheduleSummary,
  serializeRoundRobinSchedule,
  setRoundRobinMatchScore,
  type CreateRoundRobinScheduleInput,
  type RoundRobinRandomSource,
  type RoundRobinScheduleState,
} from "./round-robin-schedule";

const BASE_INPUT: CreateRoundRobinScheduleInput = {
  title: "Meaw League",
  names: "A\nB\nC\nD",
  courts: "สนาม 1\nสนาม 2",
  format: "single",
  orderingMode: "ordered",
  startDate: "2026-08-11",
  startTime: "09:00",
  matchDurationMinutes: 30,
  breakMinutes: 10,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
};

function createState(
  overrides: Partial<CreateRoundRobinScheduleInput> = {},
  random?: RoundRobinRandomSource,
): RoundRobinScheduleState {
  return createRoundRobinSchedule({ ...BASE_INPUT, ...overrides }, random)
    .state;
}

describe("round robin schedule", () => {
  it("cleans names and courts while reporting case-insensitive duplicates", () => {
    expect(parseRoundRobinParticipants("  Alpha  \nalpha\nBeta\n\n")).toEqual({
      names: ["Alpha", "Beta"],
      duplicateNames: ["alpha"],
    });
    expect(parseRoundRobinCourts(" Court 1 \ncourt 1\nCourt 2")).toEqual({
      courts: ["Court 1", "Court 2"],
      duplicateCourts: ["court 1"],
    });
  });

  it("enforces participant and court limits", () => {
    expect(() => parseRoundRobinParticipants("A")).toThrow("อย่างน้อย 2");
    expect(() =>
      parseRoundRobinParticipants(
        Array.from(
          { length: ROUND_ROBIN_MAX_PARTICIPANTS + 1 },
          (_, index) => `T${index}`,
        ).join("\n"),
      ),
    ).toThrow(`สูงสุด ${ROUND_ROBIN_MAX_PARTICIPANTS}`);
    expect(() => parseRoundRobinCourts("\n")).toThrow("อย่างน้อย 1");
  });

  it("generates every pairing exactly once for an even single round robin", () => {
    const resolved = resolveRoundRobinSchedule(createState());
    expect(resolved.totalRounds).toBe(3);
    expect(resolved.totalMatches).toBe(6);
    const pairs = resolved.matches.map((match) =>
      [match.home.name, match.away.name].sort().join("-"),
    );
    expect(new Set(pairs).size).toBe(6);
    expect(new Set(resolved.matches.map((match) => match.id)).size).toBe(6);
    for (const round of resolved.rounds) {
      const players = round.matches.flatMap((match) => [
        match.home.id,
        match.away.id,
      ]);
      expect(new Set(players).size).toBe(players.length);
    }
  });

  it("gives each participant one bye when the count is odd", () => {
    const resolved = resolveRoundRobinSchedule(
      createState({ names: "A\nB\nC\nD\nE" }),
    );
    expect(resolved.totalRounds).toBe(5);
    expect(resolved.totalMatches).toBe(10);
    const byes = resolved.rounds.map((round) => round.bye?.name);
    expect(byes.filter(Boolean)).toHaveLength(5);
    expect(new Set(byes).size).toBe(5);
  });

  it("creates a reversed second leg for double round robin", () => {
    const resolved = resolveRoundRobinSchedule(
      createState({ format: "double" }),
    );
    expect(resolved.totalRounds).toBe(6);
    expect(resolved.totalMatches).toBe(12);
    const firstLeg = resolved.matches.filter((match) => match.leg === 1);
    const secondLeg = resolved.matches.filter((match) => match.leg === 2);
    for (const first of firstLeg) {
      expect(
        secondLeg.some(
          (second) =>
            second.home.id === first.away.id &&
            second.away.id === first.home.id,
        ),
      ).toBe(true);
    }
  });

  it("scales to the maximum double round robin without participant overlaps", () => {
    const names = Array.from(
      { length: ROUND_ROBIN_MAX_PARTICIPANTS },
      (_, index) => `Team ${index + 1}`,
    ).join("\n");
    const resolved = resolveRoundRobinSchedule(
      createState({ names, format: "double", courts: "A\nB" }),
    );
    expect(resolved.totalMatches).toBe(
      ROUND_ROBIN_MAX_PARTICIPANTS * (ROUND_ROBIN_MAX_PARTICIPANTS - 1),
    );
    expect(resolved.totalRounds).toBe((ROUND_ROBIN_MAX_PARTICIPANTS - 1) * 2);
    for (const participant of resolved.state.participants) {
      const fixtures = resolved.matches
        .filter(
          (match) =>
            match.home.id === participant.id ||
            match.away.id === participant.id,
        )
        .sort((first, second) => first.start.localeCompare(second.start));
      expect(fixtures).toHaveLength((ROUND_ROBIN_MAX_PARTICIPANTS - 1) * 2);
      for (let index = 1; index < fixtures.length; index += 1) {
        expect(
          fixtures[index]?.start.localeCompare(fixtures[index - 1]?.end ?? ""),
        ).not.toBe(-1);
      }
    }
  });

  it("keeps single-leg home and away counts within one game", () => {
    for (let count = 2; count <= ROUND_ROBIN_MAX_PARTICIPANTS; count += 1) {
      const names = Array.from(
        { length: count },
        (_, index) => `T${index + 1}`,
      ).join("\n");
      const resolved = resolveRoundRobinSchedule(createState({ names }));
      for (const participant of resolved.state.participants) {
        const home = resolved.matches.filter(
          (match) => match.home.id === participant.id,
        ).length;
        const away = resolved.matches.filter(
          (match) => match.away.id === participant.id,
        ).length;
        expect(Math.abs(home - away)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses the supplied random source for random ordering", () => {
    const values = [0, 0, 0];
    let index = 0;
    const state = createState(
      { orderingMode: "random" },
      () => values[index++] ?? 0,
    );
    expect(state.participants.map((participant) => participant.name)).toEqual([
      "B",
      "C",
      "D",
      "A",
    ]);
  });

  it("assigns courts and non-overlapping waves with duration and breaks", () => {
    const resolved = resolveRoundRobinSchedule(
      createState({
        names: "A\nB\nC\nD\nE\nF",
        courts: "Court A\nCourt B",
      }),
    );
    expect(resolved.rounds[0]?.matches.map((match) => match.start)).toEqual([
      "2026-08-11T09:00",
      "2026-08-11T09:00",
      "2026-08-11T09:40",
    ]);
    expect(resolved.rounds[1]?.start).toBe("2026-08-11T10:20");
    expect(resolved.rounds[0]?.matches.map((match) => match.court)).toEqual([
      "Court A",
      "Court B",
      "Court A",
    ]);
  });

  it("records wins, draws and losses with deterministic standings", () => {
    let state = createState();
    const initial = resolveRoundRobinSchedule(state);
    const [first, second] = initial.matches;
    state = setRoundRobinMatchScore(state, first?.id ?? "", 2, 1);
    state = setRoundRobinMatchScore(state, second?.id ?? "", 1, 1);
    const resolved = resolveRoundRobinSchedule(state);
    expect(resolved.completedMatches).toBe(2);
    const winner = resolved.standings.find(
      (row) => row.participant.id === first?.home.id,
    );
    expect(winner).toMatchObject({
      played: 1,
      wins: 1,
      points: 3,
      difference: 1,
    });
    const drawn = resolved.standings.find(
      (row) => row.participant.id === second?.home.id,
    );
    expect(drawn).toMatchObject({ played: 1, draws: 1, points: 1 });
  });

  it("uses shared positions for fully tied rows", () => {
    const standings = resolveRoundRobinSchedule(createState()).standings;
    expect(standings.map((row) => row.position)).toEqual([1, 1, 1, 1]);
  });

  it("clears scores and rejects invalid score input", () => {
    const state = createState();
    const matchId = resolveRoundRobinSchedule(state).matches[0]?.id ?? "";
    const scored = setRoundRobinMatchScore(state, matchId, 4, 2);
    expect(clearRoundRobinMatchScore(scored, matchId).scores).toEqual({});
    expect(() => setRoundRobinMatchScore(state, matchId, -1, 0)).toThrow(
      "0–999",
    );
    expect(() => setRoundRobinMatchScore(state, "missing", 1, 0)).toThrow(
      "ไม่พบคู่แข่งขัน",
    );
  });

  it("round-trips versioned JSON and ignores unknown match ids", () => {
    let state = createState();
    const matchId = resolveRoundRobinSchedule(state).matches[0]?.id ?? "";
    state = setRoundRobinMatchScore(state, matchId, 1, 0);
    const raw = JSON.parse(serializeRoundRobinSchedule(state)) as Record<
      string,
      unknown
    >;
    raw.scores = {
      ...(raw.scores as object),
      unknown: { homeScore: 99, awayScore: 0 },
    };
    const restored = restoreRoundRobinSchedule(JSON.stringify(raw));
    expect(restored).toEqual(state);
  });

  it("rejects malformed, oversized and duplicate JSON state", () => {
    expect(() => restoreRoundRobinSchedule("not-json")).toThrow(
      "JSON ไม่ถูกต้อง",
    );
    expect(() =>
      restoreRoundRobinSchedule("x".repeat(ROUND_ROBIN_MAX_JSON_LENGTH + 1)),
    ).toThrow("500 KB");
    const raw = JSON.parse(serializeRoundRobinSchedule(createState())) as {
      participants: Array<{ name: string }>;
    };
    raw.participants[1]!.name = raw.participants[0]!.name;
    expect(() => restoreRoundRobinSchedule(JSON.stringify(raw))).toThrow(
      "ชื่อผู้เข้าแข่งขันซ้ำ",
    );

    const invalidSettings = JSON.parse(
      serializeRoundRobinSchedule(createState()),
    ) as { settings: { courts: unknown[] } };
    invalidSettings.settings.courts = [{ unsafe: true }];
    expect(() =>
      restoreRoundRobinSchedule(JSON.stringify(invalidSettings)),
    ).toThrow("การตั้งค่าตาราง");
  });

  it("exports formula-safe BOM CSV", () => {
    const resolved = resolveRoundRobinSchedule(
      createState({ names: "=Risk\nSafe\nThird" }),
    );
    const csv = roundRobinScheduleCsv(resolved);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=Risk"');
    expect(csv).not.toContain(',"=Risk",');
  });

  it("exports RFC-style iCalendar events with CRLF and folded UTF-8 lines", () => {
    const resolved = resolveRoundRobinSchedule(
      createState({ title: "ลีกแมวญี่ปุ่นน่ารักสำหรับทดสอบข้อความยาวมาก" }),
    );
    const ics = roundRobinScheduleIcs(
      resolved,
      new Date("2026-08-11T00:00:00.000Z"),
    );
    expect(ics).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(resolved.totalMatches);
    expect(ics).toContain("DTSTART:20260811T090000");
    expect(ics).toContain("DTSTAMP:20260811T000000Z");
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("builds a readable schedule summary", () => {
    const summary = roundRobinScheduleSummary(
      resolveRoundRobinSchedule(createState()),
    );
    expect(summary).toContain("Meaw League");
    expect(summary).toContain("Single Round Robin");
    expect(summary).toContain("รอบ 1");
    expect(summary).toContain("สนาม 1");
  });
});
