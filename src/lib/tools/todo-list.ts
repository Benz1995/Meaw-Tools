export const TODO_LIST_STORAGE_KEY = "meaw-todo-list-v1";
export const TODO_LIST_MAX_LISTS = 12;
export const TODO_LIST_MAX_TASKS = 500;
export const TODO_LIST_MAX_STORAGE_LENGTH = 2_000_000;
export const TODO_LIST_MAX_IMPORT_LENGTH = 2_000_000;

export type TodoColor = "mint" | "sky" | "amber" | "rose" | "violet" | "orange";
export type TodoPriority = "none" | "low" | "medium" | "high";
export type TodoSortMode = "smart" | "due-date" | "priority" | "newest";
export type TodoTaskStatus = "completed" | "overdue" | "today" | "upcoming" | "no-date";

export type TodoList = {
  id: string;
  name: string;
  color: TodoColor;
  createdAt: number;
};

export type TodoTask = {
  id: string;
  listId: string;
  title: string;
  notes: string;
  priority: TodoPriority;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export type TodoListState = {
  lists: TodoList[];
  tasks: TodoTask[];
};

export type TodoStats = {
  total: number;
  active: number;
  dueToday: number;
  overdue: number;
  completed: number;
  completionPercent: number;
};

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  none: "ไม่ระบุ",
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
};

export const TODO_COLOR_LABELS: Record<TodoColor, string> = {
  mint: "เขียวมิ้นต์",
  sky: "ฟ้า",
  amber: "เหลือง",
  rose: "ชมพู",
  violet: "ม่วง",
  orange: "ส้ม",
};

const COLORS: TodoColor[] = ["mint", "sky", "amber", "rose", "violet", "orange"];
const PRIORITIES: TodoPriority[] = ["none", "low", "medium", "high"];

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

function safeTimestamp(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 946_684_800_000 && parsed <= 4_135_708_800_000 ? parsed : fallback;
}

export function todoToday(nowMs = Date.now()): string {
  const date = new Date(nowMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isTodoDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isTodoTimeKey(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function createDefaultTodoList(nowMs = Date.now()): TodoList {
  return { id: "inbox", name: "งานทั่วไป", color: "mint", createdAt: nowMs };
}

export function createEmptyTodoListState(nowMs = Date.now()): TodoListState {
  return { lists: [createDefaultTodoList(nowMs)], tasks: [] };
}

export function normalizeTodoList(candidate: Partial<TodoList>, index = 0, nowMs = Date.now()): TodoList | null {
  const name = cleanText(candidate.name, 40);
  if (!name) return null;
  return {
    id: cleanText(candidate.id, 80) || `list-${index}`,
    name,
    color: typeof candidate.color === "string" && COLORS.includes(candidate.color as TodoColor) ? candidate.color as TodoColor : "mint",
    createdAt: safeTimestamp(candidate.createdAt, nowMs),
  };
}

export function normalizeTodoTask(
  candidate: Partial<TodoTask>,
  validListIds: ReadonlySet<string>,
  fallbackListId: string,
  index = 0,
  nowMs = Date.now(),
): TodoTask | null {
  const title = cleanText(candidate.title, 120);
  if (!title) return null;
  const createdAt = safeTimestamp(candidate.createdAt, nowMs);
  const updatedAt = Math.max(createdAt, safeTimestamp(candidate.updatedAt, createdAt));
  const completed = candidate.completed === true;
  const completedAt = completed ? Math.max(createdAt, safeTimestamp(candidate.completedAt, updatedAt)) : null;
  const dueDate = typeof candidate.dueDate === "string" && isTodoDateKey(candidate.dueDate) ? candidate.dueDate : null;
  const dueTime = dueDate && typeof candidate.dueTime === "string" && isTodoTimeKey(candidate.dueTime) ? candidate.dueTime : null;
  return {
    id: cleanText(candidate.id, 80) || `task-${index}`,
    listId: typeof candidate.listId === "string" && validListIds.has(candidate.listId) ? candidate.listId : fallbackListId,
    title,
    notes: cleanText(candidate.notes, 400),
    priority: typeof candidate.priority === "string" && PRIORITIES.includes(candidate.priority as TodoPriority) ? candidate.priority as TodoPriority : "none",
    dueDate,
    dueTime,
    completed,
    createdAt,
    updatedAt,
    completedAt,
  };
}

export function parseTodoListState(raw: string | null, nowMs = Date.now()): TodoListState {
  const empty = createEmptyTodoListState(nowMs);
  if (!raw || raw.length > TODO_LIST_MAX_STORAGE_LENGTH) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<TodoListState>;
    const lists: TodoList[] = [];
    const listIds = new Set<string>();
    if (Array.isArray(parsed.lists)) {
      for (const [index, candidate] of parsed.lists.slice(0, TODO_LIST_MAX_LISTS).entries()) {
        if (!candidate || typeof candidate !== "object") continue;
        const list = normalizeTodoList(candidate as Partial<TodoList>, index, nowMs);
        if (!list || listIds.has(list.id)) continue;
        listIds.add(list.id);
        lists.push(list);
      }
    }
    if (!lists.length) {
      const defaultList = createDefaultTodoList(nowMs);
      lists.push(defaultList);
      listIds.add(defaultList.id);
    }

    const tasks: TodoTask[] = [];
    const taskIds = new Set<string>();
    if (Array.isArray(parsed.tasks)) {
      for (const [index, candidate] of parsed.tasks.slice(0, TODO_LIST_MAX_TASKS).entries()) {
        if (!candidate || typeof candidate !== "object") continue;
        const task = normalizeTodoTask(candidate as Partial<TodoTask>, listIds, lists[0]?.id ?? "inbox", index, nowMs);
        if (!task || taskIds.has(task.id)) continue;
        taskIds.add(task.id);
        tasks.push(task);
      }
    }
    return { lists, tasks };
  } catch {
    return empty;
  }
}

export function serializeTodoListState(state: TodoListState): string {
  return JSON.stringify(parseTodoListState(JSON.stringify(state)));
}

export function todoTaskStatus(task: TodoTask, today = todoToday()): TodoTaskStatus {
  if (task.completed) return "completed";
  if (!task.dueDate) return "no-date";
  if (task.dueDate < today) return "overdue";
  if (task.dueDate === today) return "today";
  return "upcoming";
}

export function calculateTodoStats(tasks: readonly TodoTask[], today = todoToday()): TodoStats {
  const completed = tasks.filter((task) => task.completed).length;
  const activeTasks = tasks.filter((task) => !task.completed);
  return {
    total: tasks.length,
    active: activeTasks.length,
    dueToday: activeTasks.filter((task) => task.dueDate === today).length,
    overdue: activeTasks.filter((task) => Boolean(task.dueDate && task.dueDate < today)).length,
    completed,
    completionPercent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

const PRIORITY_WEIGHT: Record<TodoPriority, number> = { none: 0, low: 1, medium: 2, high: 3 };
const STATUS_WEIGHT: Record<TodoTaskStatus, number> = { overdue: 0, today: 1, upcoming: 2, "no-date": 3, completed: 4 };

export function sortTodoTasks(tasks: readonly TodoTask[], mode: TodoSortMode, today = todoToday()): TodoTask[] {
  return [...tasks].sort((left, right) => {
    if (left.completed !== right.completed) return left.completed ? 1 : -1;
    if (mode === "newest") return right.createdAt - left.createdAt || left.title.localeCompare(right.title, "th");
    if (mode === "priority") {
      const priorityDifference = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
      if (priorityDifference) return priorityDifference;
    }
    if (mode === "due-date") {
      const leftDue = left.dueDate ?? "9999-12-31";
      const rightDue = right.dueDate ?? "9999-12-31";
      const dueDifference = leftDue.localeCompare(rightDue) || (left.dueTime ?? "99:99").localeCompare(right.dueTime ?? "99:99");
      if (dueDifference) return dueDifference;
    }
    if (mode === "smart") {
      const statusDifference = STATUS_WEIGHT[todoTaskStatus(left, today)] - STATUS_WEIGHT[todoTaskStatus(right, today)];
      if (statusDifference) return statusDifference;
      const priorityDifference = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
      if (priorityDifference) return priorityDifference;
      const timeDifference = (left.dueTime ?? "99:99").localeCompare(right.dueTime ?? "99:99");
      if (timeDifference) return timeDifference;
    }
    return right.createdAt - left.createdAt || left.title.localeCompare(right.title, "th");
  });
}

function safeSpreadsheetCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const text = safeSpreadsheetCell(String(value));
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildTodoListCsv(state: TodoListState): string {
  const listNames = new Map(state.lists.map((list) => [list.id, list.name]));
  const rows: Array<Array<string | number>> = [
    ["List", "Task", "Notes", "Priority", "Due Date", "Due Time", "Status", "Created At", "Completed At"],
    ...state.tasks.map((task) => [
      listNames.get(task.listId) ?? "งานทั่วไป",
      task.title,
      task.notes,
      TODO_PRIORITY_LABELS[task.priority],
      task.dueDate ?? "",
      task.dueTime ?? "",
      task.completed ? "Completed" : "Active",
      new Date(task.createdAt).toISOString(),
      task.completedAt ? new Date(task.completedAt).toISOString() : "",
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
