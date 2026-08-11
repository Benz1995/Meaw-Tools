export const ONLINE_NOTEPAD_STORAGE_KEY = "meaw-online-notepad-v1";
export const ONLINE_NOTEPAD_MAX_NOTES = 20;
export const ONLINE_NOTEPAD_MAX_TITLE_LENGTH = 80;
export const ONLINE_NOTEPAD_MAX_CONTENT_LENGTH = 200_000;
export const ONLINE_NOTEPAD_MAX_STORAGE_LENGTH = 2_000_000;

export type NotepadFontSize = 14 | 16 | 18 | 20;

export type NotepadNote = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};

export type OnlineNotepadSettings = {
  fontSize: NotepadFontSize;
  wordWrap: boolean;
};

export type OnlineNotepadStoredState = {
  notes: NotepadNote[];
  activeId: string;
  settings: OnlineNotepadSettings;
};

export const DEFAULT_NOTEPAD_SETTINGS: OnlineNotepadSettings = { fontSize: 16, wordWrap: true };

function cleanSingleLine(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

function cleanContent(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").slice(0, ONLINE_NOTEPAD_MAX_CONTENT_LENGTH)
    : "";
}

function safeTimestamp(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? Math.floor(parsed) : fallback;
}

export function titleFromNotepadContent(content: string): string {
  const firstLine = content.split(/\r?\n/u).find((line) => line.trim());
  return cleanSingleLine(firstLine, ONLINE_NOTEPAD_MAX_TITLE_LENGTH) || "โน้ตไม่มีชื่อ";
}

export function createNotepadNote(id: string, now = Date.now(), title = "โน้ตไม่มีชื่อ", content = ""): NotepadNote {
  return {
    id: cleanSingleLine(id, 80) || `note-${now}`,
    title: cleanSingleLine(title, ONLINE_NOTEPAD_MAX_TITLE_LENGTH) || titleFromNotepadContent(content),
    content: cleanContent(content),
    pinned: false,
    createdAt: Math.max(0, Math.floor(now)),
    updatedAt: Math.max(0, Math.floor(now)),
  };
}

export function createEmptyOnlineNotepadState(now = Date.now()): OnlineNotepadStoredState {
  const note = createNotepadNote("first-note", now);
  return { notes: [note], activeId: note.id, settings: { ...DEFAULT_NOTEPAD_SETTINGS } };
}

function normalizeSettings(value: Partial<OnlineNotepadSettings> | null | undefined): OnlineNotepadSettings {
  const fontSize = value?.fontSize === 14 || value?.fontSize === 18 || value?.fontSize === 20 ? value.fontSize : 16;
  return { fontSize, wordWrap: value?.wordWrap !== false };
}

export function parseOnlineNotepadStoredState(raw: string | null, now = Date.now()): OnlineNotepadStoredState {
  const empty = createEmptyOnlineNotepadState(now);
  if (!raw || raw.length > ONLINE_NOTEPAD_MAX_STORAGE_LENGTH) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<OnlineNotepadStoredState>;
    const notes: NotepadNote[] = [];
    const ids = new Set<string>();
    if (Array.isArray(parsed.notes)) {
      for (const [index, candidate] of parsed.notes.slice(0, ONLINE_NOTEPAD_MAX_NOTES).entries()) {
        if (!candidate || typeof candidate !== "object") continue;
        const value = candidate as Partial<NotepadNote>;
        const id = cleanSingleLine(value.id, 80) || `restored-${index}`;
        if (ids.has(id)) continue;
        ids.add(id);
        const content = cleanContent(value.content);
        const createdAt = safeTimestamp(value.createdAt, now, now);
        notes.push({
          id,
          title: cleanSingleLine(value.title, ONLINE_NOTEPAD_MAX_TITLE_LENGTH) || titleFromNotepadContent(content),
          content,
          pinned: value.pinned === true,
          createdAt,
          updatedAt: Math.max(createdAt, safeTimestamp(value.updatedAt, createdAt, now)),
        });
      }
    }
    if (!notes.length) return empty;
    const requestedActiveId = cleanSingleLine(parsed.activeId, 80);
    return {
      notes,
      activeId: ids.has(requestedActiveId) ? requestedActiveId : notes[0]!.id,
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    return empty;
  }
}

export function serializeOnlineNotepadStoredState(state: OnlineNotepadStoredState, now = Date.now()): string {
  return JSON.stringify(parseOnlineNotepadStoredState(JSON.stringify(state), now));
}

export function sortNotepadNotes(notes: NotepadNote[]): NotepadNote[] {
  return [...notes].sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt - left.updatedAt || left.title.localeCompare(right.title, "th"));
}

export function searchNotepadNotes(notes: NotepadNote[], query: string): NotepadNote[] {
  const normalized = query.trim().toLocaleLowerCase("th");
  const sorted = sortNotepadNotes(notes);
  if (!normalized) return sorted;
  return sorted.filter((note) => `${note.title}\n${note.content}`.toLocaleLowerCase("th").includes(normalized));
}

export function updateNotepadNote(notes: NotepadNote[], id: string, patch: Partial<Pick<NotepadNote, "title" | "content" | "pinned">>, now = Date.now()): NotepadNote[] {
  if (!notes.some((note) => note.id === id)) throw new Error("ไม่พบโน้ตที่ต้องการแก้ไข");
  return notes.map((note) => note.id === id ? {
    ...note,
    title: patch.title === undefined ? note.title : cleanSingleLine(patch.title, ONLINE_NOTEPAD_MAX_TITLE_LENGTH),
    content: patch.content === undefined ? note.content : cleanContent(patch.content),
    pinned: patch.pinned === undefined ? note.pinned : patch.pinned,
    updatedAt: Math.max(note.updatedAt, Math.floor(now)),
  } : note);
}

export function safeNotepadFilename(title: string, extension: "txt" | "md" | "json"): string {
  const base = cleanSingleLine(title, 60)
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim() || "meaw-note";
  return `${base}.${extension}`;
}
