import { describe, expect, it } from "vitest";
import {
  TODO_LIST_MAX_LISTS,
  TODO_LIST_MAX_TASKS,
  buildTodoListCsv,
  calculateTodoStats,
  createEmptyTodoListState,
  isTodoDateKey,
  isTodoTimeKey,
  normalizeTodoTask,
  parseTodoListState,
  serializeTodoListState,
  sortTodoTasks,
  todoTaskStatus,
  type TodoTask,
} from "./todo-list";

const active: TodoTask = {
  id: "task-1",
  listId: "inbox",
  title: "ส่งรายงาน",
  notes: "ตรวจตัวเลขก่อนส่ง",
  priority: "high",
  dueDate: "2026-08-11",
  dueTime: "16:30",
  completed: false,
  createdAt: 1_754_800_000_000,
  updatedAt: 1_754_800_000_000,
  completedAt: null,
};

describe("todo list engine", () => {
  it("validates strict dates and 24-hour times", () => {
    expect(isTodoDateKey("2026-08-11")).toBe(true);
    expect(isTodoDateKey("2026-02-30")).toBe(false);
    expect(isTodoTimeKey("00:00")).toBe(true);
    expect(isTodoTimeKey("23:59")).toBe(true);
    expect(isTodoTimeKey("24:00")).toBe(false);
  });

  it("creates one usable default list", () => {
    const state = createEmptyTodoListState(1_754_800_000_000);
    expect(state.lists).toEqual([{ id: "inbox", name: "งานทั่วไป", color: "mint", createdAt: 1_754_800_000_000 }]);
    expect(state.tasks).toEqual([]);
  });

  it("normalizes text, list references, priority and due fields", () => {
    const task = normalizeTodoTask({ ...active, listId: "missing", title: " ส่ง\nรายงาน ", dueDate: "bad", dueTime: "99:00", priority: "urgent" as never }, new Set(["inbox"]), "inbox", 0, 1_754_800_000_000);
    expect(task).toMatchObject({ listId: "inbox", title: "ส่ง รายงาน", dueDate: null, dueTime: null, priority: "none" });
    expect(normalizeTodoTask({ ...active, title: "" }, new Set(["inbox"]), "inbox")).toBeNull();
  });

  it("drops a time when no valid due date exists", () => {
    const task = normalizeTodoTask({ ...active, dueDate: null, dueTime: "12:30" }, new Set(["inbox"]), "inbox");
    expect(task?.dueTime).toBeNull();
  });

  it("classifies completed, overdue, today, upcoming and undated tasks", () => {
    expect(todoTaskStatus(active, "2026-08-11")).toBe("today");
    expect(todoTaskStatus({ ...active, dueDate: "2026-08-10" }, "2026-08-11")).toBe("overdue");
    expect(todoTaskStatus({ ...active, dueDate: "2026-08-12" }, "2026-08-11")).toBe("upcoming");
    expect(todoTaskStatus({ ...active, dueDate: null }, "2026-08-11")).toBe("no-date");
    expect(todoTaskStatus({ ...active, completed: true }, "2026-08-11")).toBe("completed");
  });

  it("calculates progress without treating overdue tasks as completed", () => {
    const tasks = [active, { ...active, id: "overdue", dueDate: "2026-08-10" }, { ...active, id: "done", completed: true, completedAt: 1_754_800_100_000 }];
    expect(calculateTodoStats(tasks, "2026-08-11")).toEqual({ total: 3, active: 2, dueToday: 1, overdue: 1, completed: 1, completionPercent: 33 });
  });

  it("sorts smart views by timing then priority while keeping completed last", () => {
    const tasks = [
      { ...active, id: "future", dueDate: "2026-08-12" },
      { ...active, id: "done", completed: true, completedAt: 1_754_800_100_000 },
      { ...active, id: "overdue", dueDate: "2026-08-10", priority: "low" as const },
      { ...active, id: "today-low", priority: "low" as const },
    ];
    expect(sortTodoTasks(tasks, "smart", "2026-08-11").map((task) => task.id)).toEqual(["overdue", "today-low", "future", "done"]);
  });

  it("supports explicit priority, due-date and newest sorts", () => {
    const low = { ...active, id: "low", priority: "low" as const, dueDate: null, createdAt: active.createdAt + 10 };
    expect(sortTodoTasks([low, active], "priority")[0]?.id).toBe("task-1");
    expect(sortTodoTasks([low, active], "due-date")[0]?.id).toBe("task-1");
    expect(sortTodoTasks([low, active], "newest")[0]?.id).toBe("low");
  });

  it("sanitizes duplicate, unknown and over-limit imported data", () => {
    const lists = Array.from({ length: TODO_LIST_MAX_LISTS + 3 }, (_, index) => ({ id: `list-${index}`, name: `List ${index}`, color: "sky", createdAt: active.createdAt }));
    lists[1] = { ...lists[0]! };
    const tasks = Array.from({ length: TODO_LIST_MAX_TASKS + 3 }, (_, index) => ({ ...active, id: `task-${index}`, listId: "missing" }));
    tasks[1] = { ...active, id: "task-0", listId: "missing" };
    const parsed = parseTodoListState(JSON.stringify({ lists, tasks }), active.createdAt);
    expect(parsed.lists.length).toBeLessThanOrEqual(TODO_LIST_MAX_LISTS);
    expect(parsed.tasks.length).toBeLessThanOrEqual(TODO_LIST_MAX_TASKS);
    expect(new Set(parsed.lists.map((list) => list.id)).size).toBe(parsed.lists.length);
    expect(new Set(parsed.tasks.map((task) => task.id)).size).toBe(parsed.tasks.length);
    expect(parsed.tasks.every((task) => task.listId === parsed.lists[0]?.id)).toBe(true);
  });

  it("recovers malformed storage with a default list", () => {
    expect(parseTodoListState("bad-json", active.createdAt)).toEqual(createEmptyTodoListState(active.createdAt));
    expect(parseTodoListState(JSON.stringify({ lists: [], tasks: [] }), active.createdAt).lists[0]?.id).toBe("inbox");
  });

  it("round-trips normalized state", () => {
    const state = { lists: createEmptyTodoListState(active.createdAt).lists, tasks: [active] };
    expect(parseTodoListState(serializeTodoListState(state), active.createdAt)).toEqual(state);
  });

  it("creates formula-safe UTF-8 CSV", () => {
    const unsafe = { ...active, title: "=HYPERLINK(\"bad\")", notes: "+cmd" };
    const csv = buildTodoListCsv({ lists: createEmptyTodoListState(active.createdAt).lists, tasks: [unsafe] });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain('"Completed At"');
  });
});
