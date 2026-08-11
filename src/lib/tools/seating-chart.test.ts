import { describe, expect, it } from "vitest";
import {
  SEATING_MAX_JSON_LENGTH,
  SEATING_MAX_PEOPLE,
  assignPersonToSeat,
  assignUnseatedPeople,
  clearSeatingAssignments,
  createSeatingChart,
  getUnseatedPeople,
  parseSeatingPeople,
  reshuffleSeating,
  restoreSeatingChart,
  seatingChartToCsv,
  seatingChartToText,
  serializeSeatingChart,
  toggleSeatLock,
  toggleSeatUnavailable,
  unassignSeat,
  type CreateSeatingChartInput,
} from "./seating-chart";

const PEOPLE = [
  "มะลิ | ทีมแดง",
  "สมชาย | ทีมน้ำเงิน",
  "น้ำฝน | ทีมแดง",
  "ต้นกล้า | ทีมเขียว",
  "ฟ้าใส | ทีมเหลือง",
  "ภูผา | ทีมเขียว",
  "ใบหม่อน | ทีมน้ำเงิน",
  "นนท์ | ทีมเหลือง",
].join("\n");

function input(overrides: Partial<CreateSeatingChartInput> = {}): CreateSeatingChartInput {
  return {
    title: "ห้องเรียน ม.1/1",
    peopleText: PEOPLE,
    layout: "classroom",
    strategy: "spread",
    rows: 3,
    columns: 3,
    tableCount: 2,
    seatsPerTable: 4,
    seed: "meaw-room-a",
    ...overrides,
  };
}

describe("seating chart engine", () => {
  it("parses names and optional groups while removing normalized duplicates", () => {
    const parsed = parseSeatingPeople("Mali | A\nสมชาย\n mali | B\nＭＡＬＩ | C");
    expect(parsed.people.map((person) => [person.name, person.group])).toEqual([
      ["Mali", "A"],
      ["สมชาย", ""],
    ]);
    expect(parsed.duplicateNames).toEqual(["mali", "MALI"]);
  });

  it("creates a deterministic classroom chart", () => {
    const first = createSeatingChart(input());
    const second = createSeatingChart(input());
    expect(first).toEqual(second);
    expect(first.seats).toHaveLength(9);
    expect(first.seats.filter((seat) => seat.personId)).toHaveLength(8);
    expect(first.seats[0]?.id).toBe("R1-C1");
    expect(first.seats[8]?.label).toBe("แถว 3 · ที่ 3");
  });

  it("creates round-table seats with a clear table and position identity", () => {
    const state = createSeatingChart(input({ layout: "round-tables", tableCount: 2, seatsPerTable: 4 }));
    expect(state.seats).toHaveLength(8);
    expect(state.seats[0]?.id).toBe("T1-S1");
    expect(state.seats[7]?.label).toBe("โต๊ะ 2 · ที่ 4");
  });

  it("rejects a chart with fewer seats than people", () => {
    expect(() => createSeatingChart(input({ rows: 2, columns: 3 }))).toThrow("ที่นั่งไม่พอ");
  });

  it("keeps group members contiguous with the together strategy", () => {
    const state = createSeatingChart(input({ strategy: "together" }));
    const people = new Map(state.people.map((person) => [person.id, person]));
    const groups = state.seats
      .flatMap((seat) => seat.personId ? [people.get(seat.personId)?.group ?? ""] : []);
    const transitions = groups.slice(1).filter((group, index) => group !== groups[index]).length;
    expect(transitions).toBeLessThanOrEqual(3);
  });

  it("preserves locked seats while reshuffling all other people", () => {
    const initial = createSeatingChart(input());
    const lockedSeat = initial.seats[0]!;
    const locked = toggleSeatLock(initial, lockedSeat.id);
    const reshuffled = reshuffleSeating(locked, "different-seed");
    expect(reshuffled.seats[0]?.personId).toBe(lockedSeat.personId);
    expect(reshuffled.seats[0]?.locked).toBe(true);
    expect(reshuffled.seed).toBe("different-seed");
  });

  it("moves an unseated person into an occupied seat and unseats its occupant", () => {
    let state = createSeatingChart(input());
    const source = state.seats[0]!;
    const target = state.seats[1]!;
    const personId = source.personId!;
    state = unassignSeat(state, source.id);
    const displaced = target.personId;
    state = assignPersonToSeat(state, personId, target.id);
    expect(state.seats.find((seat) => seat.id === target.id)?.personId).toBe(personId);
    expect(getUnseatedPeople(state).map((person) => person.id)).toContain(displaced);
  });

  it("swaps two seated people", () => {
    const state = createSeatingChart(input());
    const first = state.seats[0]!;
    const second = state.seats[1]!;
    const swapped = assignPersonToSeat(state, first.personId!, second.id);
    expect(swapped.seats[0]?.personId).toBe(second.personId);
    expect(swapped.seats[1]?.personId).toBe(first.personId);
  });

  it("locks only occupied seats and prevents moving a locked person", () => {
    const state = createSeatingChart(input());
    const locked = toggleSeatLock(state, state.seats[0]!.id);
    expect(() => assignPersonToSeat(locked, locked.seats[0]!.personId!, locked.seats[1]!.id)).toThrow("ปลดล็อก");
    expect(() => toggleSeatLock(clearSeatingAssignments(state), state.seats[0]!.id)).toThrow("มีรายชื่อ");
  });

  it("marks empty seats unavailable and preserves that state when assigning remaining people", () => {
    let state = createSeatingChart(input());
    const empty = state.seats.find((seat) => !seat.personId)!;
    state = toggleSeatUnavailable(state, empty.id);
    expect(state.seats.find((seat) => seat.id === empty.id)?.unavailable).toBe(true);
    expect(() => assignPersonToSeat(state, state.people[0]!.id, empty.id)).toThrow("ปิดใช้งาน");
  });

  it("assigns unseated people into remaining open seats", () => {
    let state = createSeatingChart(input());
    state = unassignSeat(state, state.seats[0]!.id);
    expect(getUnseatedPeople(state)).toHaveLength(1);
    state = assignUnseatedPeople(state, "fill-again");
    expect(getUnseatedPeople(state)).toHaveLength(0);
    expect(state.seed).toBe("fill-again");
  });

  it("clears assignments without reopening unavailable seats", () => {
    let state = createSeatingChart(input());
    const empty = state.seats.find((seat) => !seat.personId)!;
    state = toggleSeatUnavailable(state, empty.id);
    state = toggleSeatLock(state, state.seats.find((seat) => seat.personId)!.id);
    state = clearSeatingAssignments(state);
    expect(state.seats.every((seat) => !seat.personId && !seat.locked)).toBe(true);
    expect(state.seats.find((seat) => seat.id === empty.id)?.unavailable).toBe(true);
  });

  it("exports formula-safe UTF-8 CSV and readable text", () => {
    const state = createSeatingChart(input({
      peopleText: ["=2+2 | @group", ...PEOPLE.split("\n")].join("\n"),
      rows: 3,
      columns: 3,
    }));
    const csv = seatingChartToCsv(state);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"'=2+2\"");
    expect(csv).toContain("\"'@group\"");
    expect(seatingChartToText(state)).toContain("ห้องเรียน ม.1/1");
    expect(seatingChartToText(state)).toContain("แถว 1");
  });

  it("restores assignments, locks, and unavailable seats from versioned JSON", () => {
    let state = createSeatingChart(input());
    const empty = state.seats.find((seat) => !seat.personId)!;
    state = toggleSeatUnavailable(state, empty.id);
    state = toggleSeatLock(state, state.seats.find((seat) => seat.personId)!.id);
    expect(restoreSeatingChart(serializeSeatingChart(state))).toEqual({
      ...state,
      duplicateNames: [],
    });
  });

  it("rejects unknown versions, duplicate assignments, and invalid unavailable seats", () => {
    const state = createSeatingChart(input());
    expect(() => restoreSeatingChart(JSON.stringify({ ...state, version: 2 }))).toThrow("คนละเวอร์ชัน");
    const duplicate = structuredClone(state);
    duplicate.seats[1]!.personId = duplicate.seats[0]!.personId;
    expect(() => restoreSeatingChart(JSON.stringify(duplicate))).toThrow("นั่งซ้ำ");
    const unavailable = structuredClone(state);
    unavailable.seats[0]!.unavailable = true;
    expect(() => restoreSeatingChart(JSON.stringify(unavailable))).toThrow("ต้องไม่มีรายชื่อ");
  });

  it("keeps a maximum-size chart within the JSON import limit", () => {
    const peopleText = Array.from(
      { length: SEATING_MAX_PEOPLE },
      (_, index) => `person-${String(index).padStart(3, "0")}-${"x".repeat(60)} | group-${index % 12}`,
    ).join("\n");
    const state = createSeatingChart(input({
      peopleText,
      layout: "round-tables",
      tableCount: 20,
      seatsPerTable: 10,
    }));
    const json = serializeSeatingChart(state);
    expect(json.length).toBeLessThanOrEqual(SEATING_MAX_JSON_LENGTH);
    expect(restoreSeatingChart(json).seats).toHaveLength(SEATING_MAX_PEOPLE);
  });
});
