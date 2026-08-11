import { describe, expect, it } from "vitest";
import {
  RANDOM_TEAM_DEFAULT_SKILL,
  RANDOM_TEAM_MAX_PARTICIPANTS,
  generateRandomTeams,
  parseTeamParticipants,
  randomTeamsCsv,
  randomTeamsSummary,
  resolveTeamCount,
  type RandomSource,
} from "./random-team-generator";

function sequenceRandom(values: number[]): RandomSource {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe("random team generator", () => {
  it("normalizes names, parses skill scores, and removes case-insensitive duplicates", () => {
    const parsed = parseTeamParticipants(" มะลิ,5\nSomchai, 2\n somchai,4\n\n น้ำฝน ", true);
    expect(parsed.participants).toEqual([
      { name: "มะลิ", skill: 5 },
      { name: "Somchai", skill: 2 },
      { name: "น้ำฝน", skill: null },
    ]);
    expect(parsed.duplicateNames).toEqual(["somchai"]);
    expect(parsed.assumedSkillCount).toBe(1);
  });

  it("rejects a numeric skill outside the documented 1–5 range", () => {
    expect(() => parseTeamParticipants("มะลิ,6\nสมชาย,3", true)).toThrow("คะแนนบรรทัดที่ 1");
  });

  it("keeps commas in names when random mode does not parse skills", () => {
    expect(parseTeamParticipants("Doe, Jane\nSmith, John").participants).toEqual([
      { name: "Doe, Jane", skill: null },
      { name: "Smith, John", skill: null },
    ]);
  });

  it("creates random teams whose member counts differ by at most one", () => {
    const result = generateRandomTeams({
      names: "A\nB\nC\nD\nE\nF\nG",
      mode: "random",
      splitMethod: "team-count",
      splitValue: 3,
      teamNamePrefix: "กลุ่ม",
    }, sequenceRandom([0.1, 0.8, 0.3, 0.6]));
    expect(result.teams.map((team) => team.members.length)).toEqual([3, 2, 2]);
    expect(result.teams.map((team) => team.name)).toEqual(["กลุ่ม 1", "กลุ่ม 2", "กลุ่ม 3"]);
    expect(new Set(result.teams.flatMap((team) => team.members.map((member) => member.name))).size).toBe(7);
  });

  it("supports splitting by members per team", () => {
    const result = generateRandomTeams({ names: "A\nB\nC\nD\nE\nF\nG", mode: "random", splitMethod: "members-per-team", splitValue: 3 });
    expect(result.teams).toHaveLength(3);
    expect(result.memberCountMin).toBe(2);
    expect(result.memberCountMax).toBe(3);
  });

  it("uses a snake draft to balance ranked participants", () => {
    const result = generateRandomTeams({
      names: "A,5\nB,5\nC,5\nD,5\nE,1\nF,1\nG,1\nH,1",
      mode: "balanced",
      splitMethod: "team-count",
      splitValue: 2,
    }, sequenceRandom([0.1, 0.2, 0.3, 0.4]));
    expect(result.teams.map((team) => team.skillTotal)).toEqual([12, 12]);
    expect(result.skillAverageDifference).toBe(0);
  });

  it("uses the documented default skill when a score is omitted", () => {
    const result = generateRandomTeams({ names: "A,5\nB\nC,1\nD", mode: "balanced", splitMethod: "team-count", splitValue: 2 });
    expect(result.assumedSkillCount).toBe(2);
    expect(result.teams.flatMap((team) => team.members).filter((member) => member.skill === null)).toHaveLength(2);
    expect(randomTeamsSummary(result)).toContain(`คะแนนเริ่มต้น ${RANDOM_TEAM_DEFAULT_SKILL}`);
    expect(randomTeamsCsv(result)).toMatch(/,3,Yes,/);
  });

  it("validates team count and derived team limits", () => {
    expect(() => resolveTeamCount(10, "team-count", 1)).toThrow("จำนวนทีม");
    expect(() => resolveTeamCount(10, "team-count", 11)).toThrow("จำนวนทีม");
    expect(() => resolveTeamCount(10, "members-per-team", 10)).toThrow("อย่างน้อย 2 ทีม");
    expect(() => resolveTeamCount(500, "members-per-team", 1)).toThrow("ไม่เกิน 50 ทีม");
  });

  it("enforces the participant limit", () => {
    const names = Array.from({ length: RANDOM_TEAM_MAX_PARTICIPANTS + 1 }, (_, index) => `Person ${index + 1}`).join("\n");
    expect(() => parseTeamParticipants(names)).toThrow(`สูงสุด ${RANDOM_TEAM_MAX_PARTICIPANTS}`);
  });

  it("exports a UTF-8 CSV and neutralizes spreadsheet formulas", () => {
    const result = generateRandomTeams({ names: "=2+2\nNormal\n+SUM(A1:A2)\nAnother", mode: "random", splitMethod: "team-count", splitValue: 2 }, () => 0.5);
    const csv = randomTeamsCsv(result);
    expect(csv.startsWith("\uFEFFTeam,")).toBe(true);
    expect(csv).toContain("Used default skill");
    expect(csv).toContain("'=2+2");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).not.toContain("\n=2+2,");
  });
});
