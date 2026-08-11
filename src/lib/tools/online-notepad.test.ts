import { describe, expect, it } from "vitest";
import {
  ONLINE_NOTEPAD_MAX_CONTENT_LENGTH,
  ONLINE_NOTEPAD_MAX_NOTES,
  createEmptyOnlineNotepadState,
  createNotepadNote,
  parseOnlineNotepadStoredState,
  safeNotepadFilename,
  searchNotepadNotes,
  serializeOnlineNotepadStoredState,
  sortNotepadNotes,
  titleFromNotepadContent,
  updateNotepadNote,
} from "./online-notepad";

describe("online notepad engine", () => {
  it("creates a safe first note and derives titles from imported content", () => {
    expect(createEmptyOnlineNotepadState(100)).toMatchObject({ activeId: "first-note", settings: { fontSize: 16, wordWrap: true } });
    expect(titleFromNotepadContent("\n  ประชุมทีมวันศุกร์  \nรายละเอียด")).toBe("ประชุมทีมวันศุกร์");
  });

  it("normalizes line endings, control characters, title length, and content size", () => {
    const note = createNotepadNote("note\n1", 100, "  หัวข้อ\nทดสอบ  ", `A\r\nB\u0000${"x".repeat(ONLINE_NOTEPAD_MAX_CONTENT_LENGTH)}`);
    expect(note.id).toBe("note 1");
    expect(note.title).toBe("หัวข้อ ทดสอบ");
    expect(note.content.startsWith("A\nB")).toBe(true);
    expect(note.content.length).toBe(ONLINE_NOTEPAD_MAX_CONTENT_LENGTH);
  });

  it("updates only the selected note and advances its timestamp", () => {
    const first = createNotepadNote("first", 100, "หนึ่ง");
    const second = createNotepadNote("second", 100, "สอง");
    const updated = updateNotepadNote([first, second], "second", { content: "เนื้อหา", pinned: true }, 200);
    expect(updated[0]).toEqual(first);
    expect(updated[1]).toMatchObject({ content: "เนื้อหา", pinned: true, updatedAt: 200 });
  });

  it("sorts pinned notes first and then by most recent update", () => {
    const older = createNotepadNote("older", 100, "เก่า");
    const newer = createNotepadNote("newer", 200, "ใหม่");
    const pinned = { ...older, id: "pinned", title: "ปักหมุด", pinned: true };
    expect(sortNotepadNotes([older, pinned, newer]).map((note) => note.id)).toEqual(["pinned", "newer", "older"]);
  });

  it("searches Thai and English across titles and content", () => {
    const thai = createNotepadNote("thai", 100, "แผนประชุม", "คุยงบประมาณ");
    const english = createNotepadNote("en", 200, "Release", "QA checklist");
    expect(searchNotepadNotes([thai, english], "งบ").map((note) => note.id)).toEqual(["thai"]);
    expect(searchNotepadNotes([thai, english], "qa").map((note) => note.id)).toEqual(["en"]);
  });

  it("sanitizes duplicate ids, invalid timestamps, settings, and over-limit note arrays", () => {
    const notes = Array.from({ length: ONLINE_NOTEPAD_MAX_NOTES + 3 }, (_, index) => ({ id: `note-${index}`, title: `Note ${index}`, content: "ok", createdAt: 10, updatedAt: 20 }));
    notes[1] = { ...notes[0]!, title: "duplicate" };
    notes[2] = { ...notes[2]!, createdAt: 999_999, updatedAt: -1 };
    const parsed = parseOnlineNotepadStoredState(JSON.stringify({ notes, activeId: "missing", settings: { fontSize: 99, wordWrap: false } }), 100);
    expect(parsed.notes.length).toBeLessThanOrEqual(ONLINE_NOTEPAD_MAX_NOTES);
    expect(new Set(parsed.notes.map((note) => note.id)).size).toBe(parsed.notes.length);
    expect(parsed.activeId).toBe("note-0");
    expect(parsed.settings).toEqual({ fontSize: 16, wordWrap: false });
    expect(parsed.notes.find((note) => note.id === "note-2")).toMatchObject({ createdAt: 100, updatedAt: 100 });
  });

  it("falls back safely for invalid or empty backups and round-trips valid state", () => {
    expect(parseOnlineNotepadStoredState("not-json", 100)).toEqual(createEmptyOnlineNotepadState(100));
    expect(parseOnlineNotepadStoredState(JSON.stringify({ notes: [] }), 100)).toEqual(createEmptyOnlineNotepadState(100));
    const state = createEmptyOnlineNotepadState(100);
    state.notes[0]!.content = "บันทึกสำคัญ";
    expect(parseOnlineNotepadStoredState(serializeOnlineNotepadStoredState(state, 100), 100)).toEqual(state);
  });

  it("builds download filenames without reserved path characters", () => {
    expect(safeNotepadFilename('แผน:งาน/ไตรมาส*', "md")).toBe("แผน-งาน-ไตรมาส-.md");
    expect(safeNotepadFilename("  ", "txt")).toBe("meaw-note.txt");
  });
});
