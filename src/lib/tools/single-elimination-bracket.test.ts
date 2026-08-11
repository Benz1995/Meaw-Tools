import { describe, expect, it } from "vitest";
import {
  BRACKET_MAX_PARTICIPANTS,
  bracketSeedOrder,
  clearBracketMatchOutcome,
  createSingleEliminationBracket,
  parseBracketParticipants,
  resolveSingleEliminationBracket,
  restoreSingleEliminationBracket,
  serializeSingleEliminationBracket,
  setBracketMatchWinner,
  singleEliminationBracketCsv,
  singleEliminationBracketSummary,
  type BracketRandomSource,
  type SingleEliminationBracketState,
} from "./single-elimination-bracket";

function sequenceRandom(values: number[]): BracketRandomSource {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

function createFour(thirdPlaceEnabled = false): SingleEliminationBracketState {
  return createSingleEliminationBracket({
    title: "ทัวร์นาเมนต์",
    names: "A\nB\nC\nD",
    seedingMode: "seeded",
    thirdPlaceEnabled,
  }).state;
}

describe("single elimination bracket", () => {
  it("cleans names and removes case-insensitive duplicates", () => {
    const parsed = parseBracketParticipants(" Alpha \nBravo\nalpha\nทีม   แมว");
    expect(parsed.names).toEqual(["Alpha", "Bravo", "ทีม แมว"]);
    expect(parsed.duplicateNames).toEqual(["alpha"]);
  });

  it("requires 2–32 unique participants", () => {
    expect(() => parseBracketParticipants("A")).toThrow("อย่างน้อย 2");
    const tooMany = Array.from(
      { length: BRACKET_MAX_PARTICIPANTS + 1 },
      (_, index) => `P${index + 1}`,
    ).join("\n");
    expect(() => parseBracketParticipants(tooMany)).toThrow("สูงสุด 32");
  });

  it("creates standard seeded positions", () => {
    expect(bracketSeedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(bracketSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(() => bracketSeedOrder(6)).toThrow("เลขยกกำลัง");
  });

  it("assigns byes to the highest seeds for a non-power-of-two field", () => {
    const state = createSingleEliminationBracket({
      title: "6 ทีม",
      names: "A\nB\nC\nD\nE\nF",
      seedingMode: "seeded",
      thirdPlaceEnabled: false,
    }).state;
    const resolved = resolveSingleEliminationBracket(state);
    const autoWinners = resolved.rounds[0]!.matches.filter(
      (match) => match.autoAdvanced,
    ).map((match) => match.winner?.seed);
    expect(resolved.bracketSize).toBe(8);
    expect(resolved.byeCount).toBe(2);
    expect(autoWinners).toEqual([1, 2]);
  });

  it("randomizes seed assignment with an injected source", () => {
    const state = createSingleEliminationBracket(
      {
        title: "สุ่ม",
        names: "A\nB\nC\nD",
        seedingMode: "random",
        thirdPlaceEnabled: false,
      },
      sequenceRandom([0, 0, 0]),
    ).state;
    expect(state.participants.map((participant) => participant.name)).toEqual([
      "B",
      "C",
      "D",
      "A",
    ]);
  });

  it("advances winners round by round and identifies the champion", () => {
    let state = createFour();
    let resolved = resolveSingleEliminationBracket(state);
    const semifinal1 = resolved.rounds[0]!.matches[0]!;
    const semifinal2 = resolved.rounds[0]!.matches[1]!;
    state = setBracketMatchWinner(
      state,
      semifinal1.id,
      semifinal1.slot1.participant!.id,
      2,
      0,
    );
    state = setBracketMatchWinner(
      state,
      semifinal2.id,
      semifinal2.slot2.participant!.id,
      1,
      3,
    );
    resolved = resolveSingleEliminationBracket(state);
    const final = resolved.rounds[1]!.matches[0]!;
    state = setBracketMatchWinner(
      state,
      final.id,
      final.slot1.participant!.id,
      5,
      4,
    );
    resolved = resolveSingleEliminationBracket(state);
    expect(resolved.champion?.name).toBe("A");
    expect(resolved.runnerUp?.name).toBe("C");
    expect(resolved.completedMatches).toBe(3);
    expect(resolved.totalMatches).toBe(3);
  });

  it("clears dependent downstream outcomes after an earlier result changes", () => {
    let state = createFour();
    let resolved = resolveSingleEliminationBracket(state);
    const semifinal1 = resolved.rounds[0]!.matches[0]!;
    const semifinal2 = resolved.rounds[0]!.matches[1]!;
    state = setBracketMatchWinner(
      state,
      semifinal1.id,
      semifinal1.slot1.participant!.id,
    );
    state = setBracketMatchWinner(
      state,
      semifinal2.id,
      semifinal2.slot1.participant!.id,
    );
    resolved = resolveSingleEliminationBracket(state);
    const final = resolved.rounds[1]!.matches[0]!;
    state = setBracketMatchWinner(state, final.id, final.slot1.participant!.id);
    state = setBracketMatchWinner(
      state,
      semifinal1.id,
      semifinal1.slot2.participant!.id,
    );
    resolved = resolveSingleEliminationBracket(state);
    expect(resolved.rounds[1]!.matches[0]!.outcome).toBeNull();
    expect(resolved.champion).toBeNull();
    expect(Object.keys(state.outcomes)).toHaveLength(2);
  });

  it("validates complete, non-tied scores and their selected winner", () => {
    const state = createFour();
    const match = resolveSingleEliminationBracket(state).rounds[0]!.matches[0]!;
    expect(() =>
      setBracketMatchWinner(
        state,
        match.id,
        match.slot1.participant!.id,
        1,
        null,
      ),
    ).toThrow("ทั้งสองฝ่าย");
    expect(() =>
      setBracketMatchWinner(state, match.id, match.slot1.participant!.id, 2, 2),
    ).toThrow("ผลเสมอ");
    expect(() =>
      setBracketMatchWinner(state, match.id, match.slot1.participant!.id, 1, 2),
    ).toThrow("คะแนนสูงกว่า");
  });

  it("resolves a third-place match from the semifinal losers", () => {
    let state = createFour(true);
    let resolved = resolveSingleEliminationBracket(state);
    for (const semifinal of resolved.rounds[0]!.matches)
      state = setBracketMatchWinner(
        state,
        semifinal.id,
        semifinal.slot1.participant!.id,
      );
    resolved = resolveSingleEliminationBracket(state);
    expect(resolved.thirdPlaceMatch?.slot1.participant?.name).toBe("D");
    expect(resolved.thirdPlaceMatch?.slot2.participant?.name).toBe("C");
    state = setBracketMatchWinner(
      state,
      "third-place",
      resolved.thirdPlaceMatch!.slot2.participant!.id,
      0,
      1,
    );
    expect(resolveSingleEliminationBracket(state).thirdPlace?.name).toBe("C");
  });

  it("removes a result and every result that depends on it", () => {
    let state = createFour();
    let resolved = resolveSingleEliminationBracket(state);
    const [match1, match2] = resolved.rounds[0]!.matches;
    state = setBracketMatchWinner(
      state,
      match1!.id,
      match1!.slot1.participant!.id,
    );
    state = setBracketMatchWinner(
      state,
      match2!.id,
      match2!.slot1.participant!.id,
    );
    resolved = resolveSingleEliminationBracket(state);
    state = setBracketMatchWinner(
      state,
      resolved.rounds[1]!.matches[0]!.id,
      resolved.rounds[1]!.matches[0]!.slot1.participant!.id,
    );
    state = clearBracketMatchOutcome(state, match1!.id);
    expect(Object.keys(state.outcomes)).toEqual([match2!.id]);
  });

  it("round-trips a versioned JSON backup and drops unknown fields", () => {
    let state = createFour();
    const match = resolveSingleEliminationBracket(state).rounds[0]!.matches[0]!;
    state = setBracketMatchWinner(
      state,
      match.id,
      match.slot1.participant!.id,
      3,
      1,
    );
    const json = serializeSingleEliminationBracket(state).replace(
      '"outcomes": {',
      '"ignored": "value", "outcomes": {',
    );
    const restored = restoreSingleEliminationBracket(json);
    expect(restored).toEqual(state);
    expect(
      (restored as unknown as Record<string, unknown>).ignored,
    ).toBeUndefined();
  });

  it("rejects malformed or duplicate backup data", () => {
    expect(() => restoreSingleEliminationBracket("not-json")).toThrow("JSON");
    const state = createFour();
    const duplicate = JSON.stringify({
      ...state,
      participants: state.participants.map((participant) => ({
        ...participant,
        name: "same",
      })),
    });
    expect(() => restoreSingleEliminationBracket(duplicate)).toThrow(
      "ชื่อผู้เข้าแข่งขันซ้ำ",
    );
  });

  it("exports every match to formula-safe UTF-8 CSV", () => {
    const state = createSingleEliminationBracket({
      title: "CSV",
      names: "=Bad\nNormal\n+Risk\nSafe",
      seedingMode: "seeded",
      thirdPlaceEnabled: false,
    }).state;
    const csv = singleEliminationBracketCsv(
      resolveSingleEliminationBracket(state),
    );
    expect(csv.startsWith("\uFEFFRound,Match,")).toBe(true);
    expect(csv).toContain("'=Bad");
    expect(csv).toContain("'+Risk");
    expect(csv).not.toContain(",=Bad,");
  });

  it("builds a readable bracket summary", () => {
    const resolved = resolveSingleEliminationBracket(createFour());
    const summary = singleEliminationBracketSummary(resolved);
    expect(summary).toContain("ทัวร์นาเมนต์");
    expect(summary).toContain("รอบรองชนะเลิศ");
    expect(summary).toContain("M1: A vs D");
  });
});
