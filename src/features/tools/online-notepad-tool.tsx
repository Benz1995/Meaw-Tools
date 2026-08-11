"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  FilePlus2,
  FileText,
  Pin,
  PinOff,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ActionBar, WorkspaceFrame, copyText, downloadText } from "@/components/tools/tool-controls";
import { analyzeText } from "@/lib/tools/general";
import {
  ONLINE_NOTEPAD_MAX_CONTENT_LENGTH,
  ONLINE_NOTEPAD_MAX_NOTES,
  ONLINE_NOTEPAD_MAX_STORAGE_LENGTH,
  ONLINE_NOTEPAD_STORAGE_KEY,
  createEmptyOnlineNotepadState,
  createNotepadNote,
  parseOnlineNotepadStoredState,
  safeNotepadFilename,
  searchNotepadNotes,
  serializeOnlineNotepadStoredState,
  titleFromNotepadContent,
  updateNotepadNote,
  type NotepadFontSize,
  type NotepadNote,
  type OnlineNotepadStoredState,
} from "@/lib/tools/online-notepad";

type SaveStatus = "saved" | "saving" | "error";

function notePreview(note: NotepadNote): string {
  return note.content.replace(/\s+/g, " ").trim().slice(0, 72) || "ยังไม่มีข้อความ";
}

function formatUpdatedAt(value: number): string {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function OnlineNotepadTool() {
  const [state, setState] = useState<OnlineNotepadStoredState>(() => {
    const now = Date.now();
    try { return parseOnlineNotepadStoredState(window.localStorage.getItem(ONLINE_NOTEPAD_STORAGE_KEY), now); }
    catch { return createEmptyOnlineNotepadState(now); }
  });
  const [query, setQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const stateRef = useRef(state);
  const textImportRef = useRef<HTMLInputElement>(null);
  const backupImportRef = useRef<HTMLInputElement>(null);

  const activeNote = state.notes.find((note) => note.id === state.activeId) ?? state.notes[0]!;
  const visibleNotes = useMemo(() => searchNotepadNotes(state.notes, query), [query, state.notes]);
  const stats = useMemo(() => analyzeText(activeNote.content), [activeNote.content]);

  useEffect(() => {
    stateRef.current = state;
    const markSaving = window.setTimeout(() => setSaveStatus("saving"), 0);
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(ONLINE_NOTEPAD_STORAGE_KEY, serializeOnlineNotepadStoredState(state));
        setSaveStatus("saved");
        setSavedAt(Date.now());
        setError("");
      } catch {
        setSaveStatus("error");
        setError("Browser บันทึกโน้ตไม่ได้ พื้นที่อาจเต็มหรือโหมดนี้ปิดการเก็บข้อมูล กรุณาดาวน์โหลดโน้ตหรือสำรอง JSON ก่อนปิดหน้า");
      }
    }, 350);
    return () => {
      window.clearTimeout(markSaving);
      window.clearTimeout(timeout);
    };
  }, [state]);

  useEffect(() => {
    const flush = () => {
      try { window.localStorage.setItem(ONLINE_NOTEPAD_STORAGE_KEY, serializeOnlineNotepadStoredState(stateRef.current)); }
      catch { /* The visible save status already reports storage failures. */ }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  function setActiveNote(id: string) {
    setState((current) => ({ ...current, activeId: id }));
    setError("");
  }

  function updateActive(patch: Partial<Pick<NotepadNote, "title" | "content" | "pinned">>) {
    const now = Date.now();
    setState((current) => ({ ...current, notes: updateNotepadNote(current.notes, current.activeId, patch, now) }));
  }

  function newNote(title = "โน้ตไม่มีชื่อ", content = "") {
    if (state.notes.length >= ONLINE_NOTEPAD_MAX_NOTES) {
      setError(`สร้างได้สูงสุด ${ONLINE_NOTEPAD_MAX_NOTES} โน้ต กรุณาส่งออกและลบโน้ตที่ไม่ใช้ก่อน`);
      return;
    }
    const now = Date.now();
    const note = createNotepadNote(crypto.randomUUID(), now, title, content);
    setState((current) => ({ ...current, notes: [...current.notes, note], activeId: note.id }));
    setQuery("");
    setError("");
    window.setTimeout(() => document.getElementById("online-notepad-title")?.focus(), 0);
    toast.success("สร้างโน้ตใหม่แล้ว");
  }

  function deleteNote(note: NotepadNote) {
    if (!window.confirm(`ลบ “${note.title || "โน้ตไม่มีชื่อ"}” หรือไม่? การลบย้อนกลับไม่ได้หากไม่มีไฟล์สำรอง`)) return;
    const remaining = state.notes.filter((item) => item.id !== note.id);
    if (!remaining.length) {
      setState(createEmptyOnlineNotepadState(Date.now()));
    } else {
      setState((current) => ({ ...current, notes: remaining, activeId: current.activeId === note.id ? remaining[0]!.id : current.activeId }));
    }
    toast.info("ลบโน้ตแล้ว");
  }

  function togglePin(note: NotepadNote) {
    setState((current) => ({ ...current, notes: updateNotepadNote(current.notes, note.id, { pinned: !note.pinned }, Date.now()) }));
  }

  async function importTextFile(file: File | undefined) {
    if (!file) return;
    if (file.size > ONLINE_NOTEPAD_MAX_CONTENT_LENGTH) {
      setError(`ไฟล์ข้อความต้องไม่เกิน ${Math.round(ONLINE_NOTEPAD_MAX_CONTENT_LENGTH / 1000)} KB`);
      return;
    }
    try {
      const content = await file.text();
      const fileTitle = file.name.replace(/\.(txt|md|markdown)$/i, "").trim();
      newNote(fileTitle || titleFromNotepadContent(content), content);
    } catch {
      setError("อ่านไฟล์ข้อความไม่ได้ กรุณาเลือกไฟล์ UTF-8 .txt หรือ .md");
    } finally {
      if (textImportRef.current) textImportRef.current.value = "";
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (file.size > ONLINE_NOTEPAD_MAX_STORAGE_LENGTH) {
      setError("ไฟล์สำรองต้องมีขนาดไม่เกิน 2 MB");
      return;
    }
    try {
      const raw = await file.text();
      const candidate = JSON.parse(raw) as unknown;
      if (!candidate || typeof candidate !== "object" || !("notes" in candidate)) throw new Error("invalid");
      const imported = parseOnlineNotepadStoredState(raw, Date.now());
      setState(imported);
      setQuery("");
      setError("");
      toast.success(`นำเข้า ${imported.notes.length} โน้ตแล้ว`);
    } catch {
      setError("ไฟล์ JSON ไม่ใช่ข้อมูลสำรองของ Online Notepad หรือรูปแบบไม่ถูกต้อง");
    } finally {
      if (backupImportRef.current) backupImportRef.current.value = "";
    }
  }

  const saveLabel = saveStatus === "saving" ? "กำลังบันทึก…" : saveStatus === "error" ? "บันทึกไม่ได้" : `บันทึกแล้ว ${new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(savedAt))}`;

  return (
    <WorkspaceFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-sky-500/20 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,#38bdf8_16%,transparent),transparent_42%),linear-gradient(135deg,color-mix(in_oklch,var(--background)_94%,#e0f2fe),var(--background))] p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><Badge variant="secondary" className="gap-1.5"><FileText className="size-3.5" />เปิดแล้วพิมพ์ได้เลย</Badge><h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">Online Notepad ที่บันทึกอัตโนมัติใน Browser</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">จดหลายโน้ต ค้นหา ปักหมุด และนำไฟล์ข้อความกลับไปใช้ได้ทันที ไม่มีบัญชีและไม่ส่งเนื้อหาไป Server</p></div>
            <div className="grid grid-cols-3 gap-2 text-center" data-testid="notepad-summary"><div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{state.notes.length}</p><p className="mt-1 text-[11px] text-muted-foreground">โน้ต</p></div><div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{stats.words}</p><p className="mt-1 text-[11px] text-muted-foreground">คำ</p></div><div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{stats.characters}</p><p className="mt-1 text-[11px] text-muted-foreground">ตัวอักษร</p></div></div>
          </div>
        </section>

        {error ? <Alert variant="destructive" data-testid="notepad-error"><AlertTitle>ตรวจข้อมูลหรือพื้นที่จัดเก็บ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border bg-background/60 p-3 sm:p-4" aria-label="รายการโน้ต">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">โน้ตของฉัน</h3><p className="mt-1 text-[11px] text-muted-foreground">{state.notes.length}/{ONLINE_NOTEPAD_MAX_NOTES} โน้ตในเครื่องนี้</p></div><Button type="button" size="icon-sm" onClick={() => newNote()} aria-label="สร้างโน้ตใหม่" data-testid="notepad-new"><FilePlus2 /></Button></div>
            <div className="relative mt-4"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="ค้นหาโน้ต…" aria-label="ค้นหาโน้ต" data-testid="notepad-search" /></div>
            <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1" data-testid="notepad-list">
              {visibleNotes.map((note) => <article key={note.id} className={`group rounded-xl border p-2.5 transition-colors ${note.id === activeNote.id ? "border-primary bg-primary/5" : "bg-background/60 hover:bg-muted/40"}`}>
                <button type="button" className="w-full text-left" onClick={() => setActiveNote(note.id)} data-testid={`notepad-note-${note.id}`}><span className="flex items-center gap-2"><strong className="min-w-0 flex-1 truncate text-sm">{note.title || "โน้ตไม่มีชื่อ"}</strong>{note.pinned ? <Pin className="size-3.5 shrink-0 fill-current text-primary" /> : null}</span><span className="mt-1.5 block truncate text-xs text-muted-foreground">{notePreview(note)}</span><span className="mt-2 block text-[10px] text-muted-foreground">{formatUpdatedAt(note.updatedAt)}</span></button>
                <div className="mt-2 flex justify-end gap-1 border-t pt-2"><Button type="button" size="icon-xs" variant="ghost" aria-label={`${note.pinned ? "เลิกปักหมุด" : "ปักหมุด"} ${note.title || "โน้ตไม่มีชื่อ"}`} onClick={() => togglePin(note)}>{note.pinned ? <PinOff /> : <Pin />}</Button><Button type="button" size="icon-xs" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`ลบ ${note.title || "โน้ตไม่มีชื่อ"}`} onClick={() => deleteNote(note)}><Trash2 /></Button></div>
              </article>)}
              {!visibleNotes.length ? <div className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">ไม่พบโน้ตที่ตรงกับ “{query}”</div> : null}
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="notepad-editor-title">
            <h3 id="notepad-editor-title" className="sr-only">ตัวแก้ไขโน้ต</h3>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0 flex-1"><Label htmlFor="online-notepad-title" className="sr-only">ชื่อโน้ต</Label><Input id="online-notepad-title" data-testid="notepad-title" value={activeNote.title} maxLength={80} onChange={(event) => updateActive({ title: event.target.value })} className="h-auto border-0 bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0 sm:text-xl" placeholder="ชื่อโน้ต" /></div><div className="flex flex-wrap items-center gap-2"><Badge variant={saveStatus === "error" ? "destructive" : "outline"} className="gap-1.5" data-testid="notepad-save-status">{saveStatus === "saved" ? <Check className="size-3.5" /> : <Save className="size-3.5" />}{saveLabel}</Badge><Button type="button" size="sm" variant="outline" onClick={() => togglePin(activeNote)}>{activeNote.pinned ? <PinOff /> : <Pin />}{activeNote.pinned ? "เลิกปักหมุด" : "ปักหมุด"}</Button></div></div>
            <div className="mt-3 flex flex-col gap-3 border-y py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-live="polite"><span><strong className="text-foreground tabular-nums">{stats.words}</strong> คำ</span><span><strong className="text-foreground tabular-nums">{stats.characters}</strong> ตัวอักษร</span><span><strong className="text-foreground tabular-nums">{stats.lines}</strong> บรรทัด</span><span>อ่านประมาณ <strong className="text-foreground tabular-nums">{stats.readingMinutes || 0}</strong> นาที</span></div><div className="flex items-center gap-3"><div className="flex items-center gap-2"><Label htmlFor="notepad-font-size" className="text-xs">ขนาด</Label><Select value={String(state.settings.fontSize)} onValueChange={(value) => setState((current) => ({ ...current, settings: { ...current.settings, fontSize: Number(value) as NotepadFontSize } }))}><SelectTrigger id="notepad-font-size" className="h-8 w-20"><SelectValue /></SelectTrigger><SelectContent>{[14, 16, 18, 20].map((size) => <SelectItem key={size} value={String(size)}>{size}px</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><Switch id="notepad-wrap" checked={state.settings.wordWrap} onCheckedChange={(checked) => setState((current) => ({ ...current, settings: { ...current.settings, wordWrap: checked } }))} /><Label htmlFor="notepad-wrap" className="text-xs">ตัดบรรทัด</Label></div></div></div>
            <Label htmlFor="online-notepad-content" className="sr-only">เนื้อหาโน้ต</Label>
            <Textarea id="online-notepad-content" data-testid="notepad-content" value={activeNote.content} maxLength={ONLINE_NOTEPAD_MAX_CONTENT_LENGTH} wrap={state.settings.wordWrap ? "soft" : "off"} onChange={(event) => updateActive({ content: event.target.value })} className={`mt-4 min-h-[520px] resize-y border-0 bg-transparent px-1 leading-7 shadow-none focus-visible:ring-0 ${state.settings.wordWrap ? "whitespace-pre-wrap" : "overflow-x-auto whitespace-pre"}`} style={{ fontSize: `${state.settings.fontSize}px` }} placeholder="พิมพ์บันทึก ไอเดีย รายการงาน หรือวางข้อความที่นี่…" spellCheck />
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 xl:flex-row xl:items-center xl:justify-between"><ActionBar><Button type="button" variant="outline" disabled={!activeNote.content} onClick={() => void copyText(activeNote.content, "คัดลอกโน้ตแล้ว")}><Clipboard />คัดลอก</Button><Button type="button" variant="outline" disabled={!activeNote.content} data-testid="notepad-download-txt" onClick={() => downloadText(activeNote.content, safeNotepadFilename(activeNote.title, "txt"))}><Download />TXT</Button><Button type="button" variant="outline" disabled={!activeNote.content} data-testid="notepad-download-md" onClick={() => downloadText(activeNote.content, safeNotepadFilename(activeNote.title, "md"), "text/markdown;charset=utf-8")}><Download />Markdown</Button></ActionBar><span className="text-[11px] text-muted-foreground">สูงสุด {ONLINE_NOTEPAD_MAX_CONTENT_LENGTH.toLocaleString("th-TH")} ตัวอักษรต่อโน้ต</span></div>
          </section>
        </div>

        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
          <div className="flex items-start gap-3"><Upload className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold">นำเข้าและสำรองโน้ต</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">นำเข้า TXT/Markdown เป็นโน้ตใหม่ หรือใช้ JSON สำรองโน้ตทั้งหมด การนำเข้า JSON จะแทนที่ชุดโน้ตปัจจุบันหลังตรวจและกรองข้อมูล</p></div></div>
          <div className="mt-4"><ActionBar><input ref={textImportRef} type="file" className="sr-only" accept="text/plain,text/markdown,.txt,.md,.markdown" aria-label="นำเข้า TXT หรือ Markdown" onChange={(event) => void importTextFile(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => textImportRef.current?.click()} data-testid="notepad-import-text"><Upload />นำเข้า TXT/MD</Button><Button type="button" variant="outline" onClick={() => downloadText(JSON.stringify(state, null, 2), `meaw-online-notepad-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json;charset=utf-8")} data-testid="notepad-export-json"><Download />สำรอง JSON</Button><input ref={backupImportRef} type="file" className="sr-only" accept="application/json,.json" aria-label="นำเข้าไฟล์สำรอง Online Notepad" onChange={(event) => void importBackup(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => backupImportRef.current?.click()} data-testid="notepad-import-json"><Upload />นำเข้า JSON</Button></ActionBar></div>
        </section>

        <Alert className="border-sky-500/30 bg-sky-500/5">
          <ShieldCheck className="text-sky-600" />
          <AlertTitle>โน้ตอยู่ใน Browser ของอุปกรณ์นี้</AlertTitle>
          <AlertDescription>เนื้อหาไม่ถูกส่งไป Server และไม่ซิงก์ข้ามอุปกรณ์ อาจหายเมื่อล้าง Site data ใช้ Private mode หรือเปลี่ยน Browser/เครื่อง จึงควรดาวน์โหลด TXT, Markdown หรือสำรอง JSON สำหรับข้อมูลสำคัญ และไม่ควรใช้เป็นที่เก็บรหัสผ่านหรือ Secret</AlertDescription>
        </Alert>
      </div>
    </WorkspaceFrame>
  );
}
