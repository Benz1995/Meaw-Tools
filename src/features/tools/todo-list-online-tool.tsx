"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  Download,
  Flag,
  FolderPlus,
  Inbox,
  ListTodo,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ActionBar, WorkspaceFrame, downloadText } from "@/components/tools/tool-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TODO_COLOR_LABELS,
  TODO_LIST_MAX_IMPORT_LENGTH,
  TODO_LIST_MAX_LISTS,
  TODO_LIST_MAX_TASKS,
  TODO_LIST_STORAGE_KEY,
  TODO_PRIORITY_LABELS,
  buildTodoListCsv,
  calculateTodoStats,
  createEmptyTodoListState,
  normalizeTodoList,
  normalizeTodoTask,
  parseTodoListState,
  serializeTodoListState,
  sortTodoTasks,
  todoTaskStatus,
  todoToday,
  type TodoColor,
  type TodoListState,
  type TodoPriority,
  type TodoSortMode,
  type TodoTask,
  type TodoTaskStatus,
} from "@/lib/tools/todo-list";

type TodoView = "all" | "today" | "upcoming" | "overdue" | "completed" | "list";
type PriorityFilter = "all" | Exclude<TodoPriority, "none">;
type TaskDraft = {
  title: string;
  notes: string;
  priority: TodoPriority;
  dueDate: string;
  dueTime: string;
  listId: string;
};

const COLOR_STYLES: Record<TodoColor, { dot: string; surface: string }> = {
  mint: { dot: "bg-emerald-500", surface: "border-emerald-500/25 bg-emerald-500/[0.055]" },
  sky: { dot: "bg-sky-500", surface: "border-sky-500/25 bg-sky-500/[0.055]" },
  amber: { dot: "bg-amber-500", surface: "border-amber-500/25 bg-amber-500/[0.055]" },
  rose: { dot: "bg-rose-500", surface: "border-rose-500/25 bg-rose-500/[0.055]" },
  violet: { dot: "bg-violet-500", surface: "border-violet-500/25 bg-violet-500/[0.055]" },
  orange: { dot: "bg-orange-500", surface: "border-orange-500/25 bg-orange-500/[0.055]" },
};

const PRIORITY_STYLES: Record<TodoPriority, string> = {
  none: "border-muted-foreground/20 text-muted-foreground",
  low: "border-sky-500/30 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300",
  medium: "border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300",
  high: "border-rose-500/30 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300",
};

const STATUS_LABELS: Record<TodoTaskStatus, string> = {
  completed: "เสร็จแล้ว",
  overdue: "เกินกำหนด",
  today: "วันนี้",
  upcoming: "กำลังจะถึง",
  "no-date": "ไม่มีกำหนด",
};

function emptyTaskDraft(listId: string): TaskDraft {
  return { title: "", notes: "", priority: "none", dueDate: "", dueTime: "", listId };
}

function formatDueDate(dateKey: string, time: string | null): string {
  const parts = dateKey.split("-").map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
  return time ? `${date} • ${time} น.` : date;
}

function viewTitle(view: TodoView, selectedListName: string): string {
  if (view === "today") return "งานวันนี้และงานค้าง";
  if (view === "upcoming") return "งานที่กำลังจะถึง";
  if (view === "overdue") return "งานเกินกำหนด";
  if (view === "completed") return "งานที่เสร็จแล้ว";
  if (view === "list") return selectedListName;
  return "งานทั้งหมด";
}

export function TodoListOnlineTool() {
  const today = useMemo(() => todoToday(), []);
  const [state, setState] = useState<TodoListState>(() => {
    try { return parseTodoListState(window.localStorage.getItem(TODO_LIST_STORAGE_KEY)); }
    catch { return createEmptyTodoListState(); }
  });
  const initialListId = state.lists[0]?.id ?? "inbox";
  const [activeView, setActiveView] = useState<TodoView>("all");
  const [selectedListId, setSelectedListId] = useState(initialListId);
  const [draft, setDraft] = useState<TaskDraft>(() => emptyTaskDraft(initialListId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = useState<TodoSortMode>("smart");
  const [visibleLimit, setVisibleLimit] = useState(100);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState<TodoColor>("sky");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  const stats = useMemo(() => calculateTodoStats(state.tasks, today), [state.tasks, today]);
  const listsById = useMemo(() => new Map(state.lists.map((list) => [list.id, list])), [state.lists]);
  const selectedList = listsById.get(selectedListId) ?? state.lists[0];
  const filteredTasks = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("th-TH");
    const candidates = state.tasks.filter((task) => {
      const status = todoTaskStatus(task, today);
      if (activeView === "today" && !(!task.completed && (status === "today" || status === "overdue"))) return false;
      if (activeView === "upcoming" && status !== "upcoming") return false;
      if (activeView === "overdue" && status !== "overdue") return false;
      if (activeView === "completed" && status !== "completed") return false;
      if (activeView === "list" && task.listId !== selectedListId) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (normalizedQuery && !`${task.title} ${task.notes} ${listsById.get(task.listId)?.name ?? ""}`.toLocaleLowerCase("th-TH").includes(normalizedQuery)) return false;
      return true;
    });
    return sortTodoTasks(candidates, sortMode, today);
  }, [activeView, deferredQuery, listsById, priorityFilter, selectedListId, sortMode, state.tasks, today]);
  const visibleTasks = filteredTasks.slice(0, visibleLimit);

  function persist(next: TodoListState) {
    const normalized = parseTodoListState(serializeTodoListState(next));
    setState(normalized);
    try {
      window.localStorage.setItem(TODO_LIST_STORAGE_KEY, JSON.stringify(normalized));
      setError("");
    } catch {
      setError("Browser บันทึก To-Do List ไม่ได้ พื้นที่อาจเต็มหรือโหมดนี้ปิดการเก็บข้อมูล กรุณาสำรอง JSON ก่อนปิดหน้า");
    }
  }

  function resetDraft(preferredListId = draft.listId) {
    const nextListId = listsById.has(preferredListId) ? preferredListId : state.lists[0]?.id ?? "inbox";
    setDraft(emptyTaskDraft(nextListId));
    setEditingId(null);
    setError("");
  }

  function saveTask() {
    const current = editingId ? state.tasks.find((task) => task.id === editingId) : undefined;
    if (!current && state.tasks.length >= TODO_LIST_MAX_TASKS) {
      setError(`เพิ่มได้สูงสุด ${TODO_LIST_MAX_TASKS.toLocaleString("th-TH")} งาน กรุณาสำรองและลบงานเก่าก่อน`);
      return;
    }
    if (draft.dueTime && !draft.dueDate) {
      setError("กรุณาเลือกวันที่ก่อนระบุเวลา");
      return;
    }
    const now = Date.now();
    const task = normalizeTodoTask({
      id: current?.id ?? crypto.randomUUID(),
      listId: draft.listId,
      title: draft.title,
      notes: draft.notes,
      priority: draft.priority,
      dueDate: draft.dueDate || null,
      dueTime: draft.dueTime || null,
      completed: current?.completed ?? false,
      completedAt: current?.completedAt ?? null,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }, new Set(state.lists.map((list) => list.id)), state.lists[0]?.id ?? "inbox", state.tasks.length, now);
    if (!task) {
      setError("กรุณากรอกชื่องานก่อนบันทึก");
      return;
    }
    persist({
      ...state,
      tasks: current ? state.tasks.map((item) => item.id === current.id ? task : item) : [task, ...state.tasks],
    });
    resetDraft(task.listId);
    toast.success(current ? "แก้ไขงานแล้ว" : "เพิ่มงานแล้ว");
  }

  function editTask(task: TodoTask) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      dueTime: task.dueTime ?? "",
      listId: task.listId,
    });
    setError("");
    document.getElementById("todo-composer-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleTask(task: TodoTask, now: number) {
    persist({
      ...state,
      tasks: state.tasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed, completedAt: item.completed ? null : now, updatedAt: now } : item),
    });
    toast.success(task.completed ? "นำงานกลับมาแล้ว" : "ทำงานเสร็จแล้ว");
  }

  function deleteTask(task: TodoTask) {
    if (!window.confirm(`ลบ “${task.title}” หรือไม่?`)) return;
    persist({ ...state, tasks: state.tasks.filter((item) => item.id !== task.id) });
    if (editingId === task.id) resetDraft();
    toast.info("ลบงานแล้ว");
  }

  function createList() {
    if (state.lists.length >= TODO_LIST_MAX_LISTS) {
      setError(`สร้างได้สูงสุด ${TODO_LIST_MAX_LISTS} รายการ`);
      return;
    }
    if (state.lists.some((list) => list.name.toLocaleLowerCase("th-TH") === newListName.trim().toLocaleLowerCase("th-TH"))) {
      setError("มีรายการชื่อนี้อยู่แล้ว");
      return;
    }
    const list = normalizeTodoList({ id: crypto.randomUUID(), name: newListName, color: newListColor, createdAt: Date.now() }, state.lists.length);
    if (!list) {
      setError("กรุณาตั้งชื่อรายการก่อนเพิ่ม");
      return;
    }
    persist({ ...state, lists: [...state.lists, list] });
    setNewListName("");
    setSelectedListId(list.id);
    setActiveView("list");
    setDraft((current) => ({ ...current, listId: list.id }));
    toast.success(`สร้าง “${list.name}” แล้ว`);
  }

  function deleteList(listId: string) {
    const list = listsById.get(listId);
    if (!list || state.lists.length <= 1) return;
    const fallback = state.lists.find((item) => item.id !== listId);
    if (!fallback || !window.confirm(`ลบรายการ “${list.name}” และย้ายงานทั้งหมดไป “${fallback.name}” หรือไม่?`)) return;
    persist({
      lists: state.lists.filter((item) => item.id !== listId),
      tasks: state.tasks.map((task) => task.listId === listId ? { ...task, listId: fallback.id, updatedAt: Date.now() } : task),
    });
    setSelectedListId(fallback.id);
    setActiveView("list");
    if (draft.listId === listId) setDraft((current) => ({ ...current, listId: fallback.id }));
    toast.info("ลบรายการและย้ายงานแล้ว");
  }

  function clearCompleted() {
    if (!stats.completed || !window.confirm(`ลบงานที่เสร็จแล้ว ${stats.completed.toLocaleString("th-TH")} งานหรือไม่? ควรสำรอง JSON ก่อน`)) return;
    persist({ ...state, tasks: state.tasks.filter((task) => !task.completed) });
    toast.info("ล้างงานที่เสร็จแล้ว");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (file.size > TODO_LIST_MAX_IMPORT_LENGTH) {
      setError("ไฟล์สำรองต้องมีขนาดไม่เกิน 2 MB");
      return;
    }
    try {
      const raw = await file.text();
      const candidate = JSON.parse(raw) as unknown;
      if (!candidate || typeof candidate !== "object" || !("lists" in candidate) || !("tasks" in candidate)) throw new Error("invalid");
      const imported = parseTodoListState(raw);
      if (!window.confirm(`นำเข้า ${imported.tasks.length.toLocaleString("th-TH")} งานและแทนที่ To-Do ปัจจุบันหรือไม่?`)) return;
      persist(imported);
      const firstListId = imported.lists[0]?.id ?? "inbox";
      setSelectedListId(firstListId);
      setActiveView("all");
      setDraft(emptyTaskDraft(firstListId));
      setEditingId(null);
      toast.success(`นำเข้า ${imported.tasks.length.toLocaleString("th-TH")} งานแล้ว`);
    } catch {
      setError("ไฟล์ JSON ไม่ใช่ข้อมูลสำรองของ To-Do List หรือรูปแบบไม่ถูกต้อง");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  const selectedListName = selectedList?.name ?? "งานทั่วไป";
  const viewCounts = {
    all: state.tasks.length,
    today: state.tasks.filter((task) => !task.completed && Boolean(task.dueDate && task.dueDate <= today)).length,
    upcoming: state.tasks.filter((task) => todoTaskStatus(task, today) === "upcoming").length,
    overdue: stats.overdue,
    completed: stats.completed,
  };

  return (
    <WorkspaceFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,#8b5cf6_14%,transparent),transparent_44%),linear-gradient(135deg,color-mix(in_oklch,var(--background)_94%,#ede9fe),var(--background))] p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><Badge variant="secondary" className="gap-1.5"><ListTodo className="size-3.5" />เปิดแล้วเพิ่มงานได้เลย ไม่ต้องสมัคร</Badge><h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">To-Do List สำหรับงานที่ต้องทำให้เสร็จ</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">แยกงานเป็นหลายรายการ กำหนดความสำคัญและวันครบกำหนด แล้วค้นหา กรอง เช็กเสร็จ หรือสำรองข้อมูลได้ในหน้าเดียว โดยงานไม่ถูกส่งไป Server</p></div>
            <div className="grid grid-cols-3 gap-2 text-center" data-testid="todo-summary-mini"><div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{stats.active}</p><p className="mt-1 text-[11px] text-muted-foreground">กำลังทำ</p></div><div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{stats.dueToday}</p><p className="mt-1 text-[11px] text-muted-foreground">ครบวันนี้</p></div><div className="min-w-20 rounded-2xl border bg-background/75 p-3"><p className="text-xl font-black tabular-nums">{stats.completed}</p><p className="mt-1 text-[11px] text-muted-foreground">เสร็จแล้ว</p></div></div>
          </div>
        </section>

        {error ? <Alert variant="destructive" data-testid="todo-error"><AlertTitle>ตรวจข้อมูลอีกครั้ง</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <section className="rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="todo-composer-title">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 id="todo-composer-title" className="font-semibold">{editingId ? "แก้ไขงาน" : "เพิ่มงานใหม่"}</h3><p className="mt-1 text-xs text-muted-foreground">กรอกเฉพาะชื่องานก็เพิ่มได้ทันที รายละเอียดอื่นไม่บังคับ</p></div>{editingId ? <Badge variant="outline">กำลังแก้ไข</Badge> : <Sparkles className="size-5 text-violet-500" />}</div>
          <div className="mt-5 space-y-2"><Label htmlFor="todo-title">ชื่องาน</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id="todo-title" value={draft.title} maxLength={120} placeholder="เช่น ส่งรายงานให้ลูกค้า" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); saveTask(); } }} data-testid="todo-title" /><Button type="button" onClick={saveTask} className="shrink-0" data-testid="todo-save"><Plus />{editingId ? "บันทึกการแก้ไข" : "เพิ่มงาน"}</Button></div></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2"><Label htmlFor="todo-list-select">รายการ</Label><Select value={draft.listId} onValueChange={(value) => setDraft((current) => ({ ...current, listId: value }))}><SelectTrigger id="todo-list-select" data-testid="todo-list-select"><SelectValue /></SelectTrigger><SelectContent>{state.lists.map((list) => <SelectItem key={list.id} value={list.id}><span className={`size-2 rounded-full ${COLOR_STYLES[list.color].dot}`} />{list.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="todo-priority">ความสำคัญ</Label><Select value={draft.priority} onValueChange={(value) => setDraft((current) => ({ ...current, priority: value as TodoPriority }))}><SelectTrigger id="todo-priority" data-testid="todo-priority"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TODO_PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="todo-due-date">วันครบกำหนด</Label><Input id="todo-due-date" type="date" min="2000-01-01" max="2100-12-31" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value, dueTime: event.target.value ? current.dueTime : "" }))} data-testid="todo-due-date" /></div>
            <div className="space-y-2"><Label htmlFor="todo-due-time">เวลา <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></Label><Input id="todo-due-time" type="time" disabled={!draft.dueDate} value={draft.dueTime} onChange={(event) => setDraft((current) => ({ ...current, dueTime: event.target.value }))} data-testid="todo-due-time" /></div>
          </div>
          <div className="mt-4 space-y-2"><Label htmlFor="todo-notes">รายละเอียด <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></Label><Textarea id="todo-notes" rows={2} maxLength={400} value={draft.notes} placeholder="ข้อมูลที่ต้องใช้ ลิงก์ หรือเงื่อนไขของงาน" onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} data-testid="todo-notes" /></div>
          {editingId ? <div className="mt-4"><Button type="button" variant="outline" onClick={() => resetDraft()}>ยกเลิกการแก้ไข</Button></div> : null}
        </section>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start" aria-label="มุมมองและรายการ To-Do">
            <section className="rounded-2xl border bg-background/60 p-3 sm:p-4">
              <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">มุมมอง</h3>
              <nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                {([
                  ["all", "งานทั้งหมด", Inbox, viewCounts.all],
                  ["today", "วันนี้และงานค้าง", CalendarDays, viewCounts.today],
                  ["upcoming", "กำลังจะถึง", Clock3, viewCounts.upcoming],
                  ["overdue", "เกินกำหนด", Flag, viewCounts.overdue],
                  ["completed", "เสร็จแล้ว", CheckCircle2, viewCounts.completed],
                ] as const).map(([view, label, Icon, count]) => <button key={view} type="button" onClick={() => { setActiveView(view); setVisibleLimit(100); }} className={`flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors ${activeView === view ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`} aria-pressed={activeView === view} data-testid={`todo-view-${view}`}><Icon className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{label}</span><span className="text-xs tabular-nums opacity-75">{count}</span></button>)}
              </nav>
            </section>

            <section className="rounded-2xl border bg-background/60 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 px-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">รายการของฉัน</h3><span className="text-[10px] text-muted-foreground">{state.lists.length}/{TODO_LIST_MAX_LISTS}</span></div>
              <div className="mt-3 space-y-1" data-testid="todo-lists">{state.lists.map((list) => {
                const count = state.tasks.filter((task) => task.listId === list.id && !task.completed).length;
                return <div key={list.id} className="group flex items-center gap-1"><button type="button" className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors ${activeView === "list" && selectedListId === list.id ? "bg-muted font-semibold" : "hover:bg-muted/60"}`} onClick={() => { setSelectedListId(list.id); setActiveView("list"); setDraft((current) => editingId ? current : { ...current, listId: list.id }); setVisibleLimit(100); }} data-testid={`todo-list-${list.id}`}><span className={`size-2.5 shrink-0 rounded-full ${COLOR_STYLES[list.color].dot}`} /><span className="min-w-0 flex-1 truncate">{list.name}</span><span className="text-xs tabular-nums text-muted-foreground">{count}</span><ChevronRight className="size-3.5 text-muted-foreground" /></button>{state.lists.length > 1 ? <Button type="button" size="icon-xs" variant="ghost" className="text-destructive opacity-100 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100" aria-label={`ลบรายการ ${list.name}`} onClick={() => deleteList(list.id)}><Trash2 /></Button> : null}</div>;
              })}</div>
              <div className="mt-4 border-t pt-4"><div className="space-y-2"><Label htmlFor="todo-new-list" className="text-xs">สร้างรายการใหม่</Label><Input id="todo-new-list" maxLength={40} placeholder="เช่น งานบริษัท" value={newListName} onChange={(event) => setNewListName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); createList(); } }} data-testid="todo-new-list" /></div><div className="mt-2 flex gap-2"><Select value={newListColor} onValueChange={(value) => setNewListColor(value as TodoColor)}><SelectTrigger className="min-w-0 flex-1" aria-label="สีรายการใหม่"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TODO_COLOR_LABELS).map(([value, label]) => <SelectItem key={value} value={value}><span className={`size-2 rounded-full ${COLOR_STYLES[value as TodoColor].dot}`} />{label}</SelectItem>)}</SelectContent></Select><Button type="button" size="icon" onClick={createList} aria-label="เพิ่มรายการ" data-testid="todo-create-list"><FolderPlus /></Button></div></div>
            </section>
          </aside>

          <section className="min-w-0 rounded-2xl border bg-background/60 p-4 sm:p-5" aria-labelledby="todo-task-list-title">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs text-muted-foreground">กำลังแสดง</p><h3 id="todo-task-list-title" className="mt-1 text-xl font-bold">{viewTitle(activeView, selectedListName)}</h3><p className="mt-1 text-xs text-muted-foreground">{filteredTasks.length.toLocaleString("th-TH")} งานตรงกับมุมมองและตัวกรอง</p></div><div className="grid gap-2 sm:grid-cols-3 xl:w-[650px]"><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Label htmlFor="todo-search" className="sr-only">ค้นหางาน</Label><Input id="todo-search" className="pl-9" placeholder="ค้นหางานหรือรายละเอียด" value={query} onChange={(event) => setQuery(event.target.value)} data-testid="todo-search" /></div><Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}><SelectTrigger aria-label="กรองความสำคัญ" data-testid="todo-priority-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทุกความสำคัญ</SelectItem><SelectItem value="high">สำคัญสูง</SelectItem><SelectItem value="medium">ปานกลาง</SelectItem><SelectItem value="low">ต่ำ</SelectItem></SelectContent></Select><Select value={sortMode} onValueChange={(value) => setSortMode(value as TodoSortMode)}><SelectTrigger aria-label="เรียงงาน" data-testid="todo-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="smart">เรียงอัจฉริยะ</SelectItem><SelectItem value="due-date">วันครบกำหนด</SelectItem><SelectItem value="priority">ความสำคัญ</SelectItem><SelectItem value="newest">เพิ่มล่าสุด</SelectItem></SelectContent></Select></div></div>

            <div className="mt-5 rounded-xl border bg-muted/10 p-3" data-testid="todo-progress"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">ความคืบหน้าทั้งหมด</span><span className="tabular-nums text-muted-foreground">{stats.completed}/{stats.total} • {stats.completionPercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-[width]" style={{ width: `${stats.completionPercent}%` }} /></div></div>

            <div className="mt-5 space-y-2" data-testid="todo-task-list">
              {visibleTasks.map((task) => {
                const list = listsById.get(task.listId);
                const status = todoTaskStatus(task, today);
                return <article key={task.id} className={`group rounded-xl border p-3 transition-colors sm:p-4 ${task.completed ? "bg-muted/15 opacity-75" : list ? COLOR_STYLES[list.color].surface : "bg-background/70"}`} data-testid={`todo-task-${task.id}`}>
                  <div className="flex items-start gap-3"><button type="button" onClick={() => toggleTask(task, Date.now())} className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border transition-colors ${task.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30 bg-background hover:border-primary hover:text-primary"}`} aria-label={`${task.completed ? "นำกลับมา" : "ทำเสร็จ"} ${task.title}`} aria-pressed={task.completed} data-testid={`todo-toggle-${task.id}`}>{task.completed ? <Check className="size-4" /> : <Circle className="size-4" />}</button><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h4 className={`break-words font-semibold ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>{task.notes ? <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{task.notes}</p> : null}</div><div className="flex shrink-0 items-center gap-1 self-end sm:self-auto"><Button type="button" size="icon-sm" variant="ghost" aria-label={`แก้ไข ${task.title}`} onClick={() => editTask(task)}><Pencil /></Button><Button type="button" size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`ลบ ${task.title}`} onClick={() => deleteTask(task)}><Trash2 /></Button></div></div><div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="outline" className="gap-1.5"><span className={`size-2 rounded-full ${list ? COLOR_STYLES[list.color].dot : "bg-muted-foreground"}`} />{list?.name ?? "งานทั่วไป"}</Badge>{task.priority !== "none" ? <Badge variant="outline" className={`gap-1 ${PRIORITY_STYLES[task.priority]}`}><Flag className="size-3" />{TODO_PRIORITY_LABELS[task.priority]}</Badge> : null}{task.dueDate ? <Badge variant="outline" className={`gap-1 ${status === "overdue" ? "border-destructive/40 bg-destructive/5 text-destructive" : status === "today" ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300" : ""}`}><CalendarDays className="size-3" />{formatDueDate(task.dueDate, task.dueTime)}</Badge> : null}<span className="text-[11px] text-muted-foreground">{STATUS_LABELS[status]}</span></div></div></div>
                </article>;
              })}
              {!visibleTasks.length ? <div className="rounded-xl border border-dashed p-10 text-center"><ClipboardList className="mx-auto size-9 text-muted-foreground/45" /><p className="mt-3 font-medium">ยังไม่มีงานในมุมมองนี้</p><p className="mt-1 text-xs text-muted-foreground">เพิ่มงานด้านบน หรือเปลี่ยนมุมมองและตัวกรอง</p></div> : null}
            </div>
            {visibleTasks.length < filteredTasks.length ? <div className="mt-4 flex justify-center"><Button type="button" variant="outline" onClick={() => setVisibleLimit((current) => Math.min(filteredTasks.length, current + 100))}>แสดงเพิ่มอีก {Math.min(100, filteredTasks.length - visibleTasks.length).toLocaleString("th-TH")} งาน</Button></div> : null}
            <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-muted-foreground">สูงสุด {TODO_LIST_MAX_TASKS.toLocaleString("th-TH")} งานใน Browser นี้</p><Button type="button" variant="outline" disabled={!stats.completed} onClick={clearCompleted}><Archive />ล้างงานที่เสร็จแล้ว</Button></div>
          </section>
        </div>

        <section className="rounded-2xl border bg-muted/10 p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-violet-600" /><div><h3 className="font-semibold">สำรอง To-Do ก่อนล้าง Browser หรือย้ายเครื่อง</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">CSV เหมาะกับ Excel/Google Sheets ส่วน JSON เก็บทั้งรายการและงานสำหรับนำกลับเข้าหน้านี้ การนำเข้า JSON จะแทนที่ข้อมูลปัจจุบันหลังยืนยัน</p></div></div><div className="mt-4"><ActionBar><Button type="button" variant="outline" disabled={!state.tasks.length} data-testid="todo-export-csv" onClick={() => downloadText(buildTodoListCsv(state), `meaw-todo-list-${today}.csv`, "text/csv;charset=utf-8")}><Download />ส่งออก CSV</Button><Button type="button" variant="outline" data-testid="todo-export-json" onClick={() => downloadText(JSON.stringify(state, null, 2), `meaw-todo-list-backup-${today}.json`, "application/json;charset=utf-8")}><Download />สำรอง JSON</Button><input ref={importRef} type="file" accept="application/json,.json" className="sr-only" aria-label="นำเข้าไฟล์สำรอง To-Do List" onChange={(event) => void importBackup(event.target.files?.[0])} /><Button type="button" variant="outline" data-testid="todo-import-json" onClick={() => importRef.current?.click()}><Upload />นำเข้า JSON</Button></ActionBar></div></section>

        <Alert className="border-violet-500/30 bg-violet-500/5"><ShieldCheck className="text-violet-600" /><AlertTitle>งานเก็บเฉพาะ Browser ของอุปกรณ์นี้</AlertTitle><AlertDescription>หน้าเครื่องมือไม่ส่งชื่องานหรือรายละเอียดไป Server และไม่ซิงก์ข้ามอุปกรณ์ ข้อมูลอาจหายเมื่อล้าง Site data ใช้ Private mode หรือเปลี่ยน Browser/เครื่อง จึงควรสำรอง JSON เป็นระยะ งานที่ต้องแจ้งเตือนตามเวลาเหมาะกับ Calendar หรือระบบ Reminder โดยหน้านี้ไม่ส่งการแจ้งเตือนเมื่อปิด Browser</AlertDescription></Alert>
      </div>
    </WorkspaceFrame>
  );
}
