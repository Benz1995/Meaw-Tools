import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    if (requestUrl.startsWith("blob:")) return false;
    try { return new URL(requestUrl).origin !== pageOrigin; }
    catch { return true; }
  });
}

test("to-do list creates lists and tasks, completes work, persists, and exports safe backups", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/todo-list-online");
  await page.evaluate(() => window.localStorage.removeItem("meaw-todo-list-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/To-Do List Online Free/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/todo-list-online");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");

  await page.getByTestId("todo-new-list").fill("งานบริษัท");
  await page.getByTestId("todo-create-list").click();
  await expect(page.getByTestId("todo-lists")).toContainText("งานบริษัท");

  await page.getByTestId("todo-title").fill("ส่งรายงานให้ลูกค้า");
  await page.getByTestId("todo-priority").click();
  await page.getByRole("option", { name: "สูง" }).click();
  await page.getByTestId("todo-due-date").fill("2026-08-11");
  await page.getByTestId("todo-due-time").fill("16:30");
  await page.getByTestId("todo-notes").fill("ตรวจตัวเลขก่อนส่ง");
  await page.getByTestId("todo-save").click();
  await expect(page.getByTestId("todo-task-list")).toContainText("ส่งรายงานให้ลูกค้า");
  await expect(page.getByTestId("todo-task-list")).toContainText("16:30 น.");

  await page.getByTestId("todo-title").fill("โทรหาลูกค้า");
  await page.getByTestId("todo-title").press("Enter");
  await expect(page.locator('article[data-testid^="todo-task-"]')).toHaveCount(2);

  await page.getByRole("button", { name: "ทำเสร็จ ส่งรายงานให้ลูกค้า" }).click();
  await expect(page.getByTestId("todo-summary-mini")).toContainText("1");
  await page.getByTestId("todo-view-completed").click();
  await expect(page.locator('article[data-testid^="todo-task-"]')).toHaveCount(1);
  await expect(page.getByText("ส่งรายงานให้ลูกค้า", { exact: true })).toBeVisible();

  await page.getByTestId("todo-view-all").click();
  await page.getByRole("button", { name: "แก้ไข โทรหาลูกค้า" }).click();
  await page.getByTestId("todo-notes").fill("สรุปสิ่งที่ตกลงในอีเมล");
  await page.getByTestId("todo-save").click();
  await expect(page.getByTestId("todo-task-list")).toContainText("สรุปสิ่งที่ตกลงในอีเมล");
  await page.getByTestId("todo-search").fill("อีเมล");
  await expect(page.locator('article[data-testid^="todo-task-"]')).toHaveCount(1);

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("todo-export-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-todo-list-2026-08-11.csv");
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv).toContain("ส่งรายงานให้ลูกค้า");
  expect(csv).toContain("งานบริษัท");

  const jsonPromise = page.waitForEvent("download");
  await page.getByTestId("todo-export-json").click();
  const jsonDownload = await jsonPromise;
  expect(jsonDownload.suggestedFilename()).toBe("meaw-todo-list-backup-2026-08-11.json");
  const backup = JSON.parse(await readFile((await jsonDownload.path())!, "utf8")) as { lists: unknown[]; tasks: unknown[] };
  expect(backup.lists).toHaveLength(2);
  expect(backup.tasks).toHaveLength(2);

  const layout = await page.evaluate(() => {
    const title = document.querySelector<HTMLInputElement>("#todo-title");
    const label = document.querySelector<HTMLLabelElement>('label[for="todo-title"]');
    if (!title || !label) throw new Error("To-Do title layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(title.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-todo-list-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("ส่งรายงานให้ลูกค้า");

  await page.getByTestId("todo-search").fill("");
  await page.reload();
  await expect(page.locator('article[data-testid^="todo-task-"]')).toHaveCount(2);
  await expect(page.getByRole("button", { name: "นำกลับมา ส่งรายงานให้ลูกค้า" })).toHaveAttribute("aria-pressed", "true");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("to-do list sanitizes imported JSON and stays balanced in dark mobile category and profession flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("dialog", (dialog) => void dialog.accept());
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-todo-list-v1");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/professions/project-operations");
  await expect(page.locator('a[href="/todo-list-online"]')).toBeVisible();
  await page.goto("/professions/business-owner");
  await expect(page.locator('a[href="/todo-list-online"]')).toBeVisible();
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/todo-list-online"]')).toBeVisible();
  await page.goto("/todo-list-online");
  await expect(page.locator("html")).toHaveClass(/dark/);

  const imported = JSON.stringify({
    lists: [
      { id: "work", name: "งาน", color: "violet", createdAt: 1754800000000 },
      { id: "work", name: "ซ้ำ", color: "rose", createdAt: 1754800000000 },
      { id: "personal", name: "ส่วนตัว", color: "sky", createdAt: 1754800000000 },
    ],
    tasks: [
      { id: "safe", listId: "work", title: "=HYPERLINK(\"bad\")", notes: "+cmd", priority: "high", dueDate: "2026-02-30", dueTime: "99:00", completed: false, createdAt: 1754800000000, updatedAt: 1754800000000, completedAt: null },
      { id: "safe", listId: "work", title: "duplicate", notes: "", priority: "low", dueDate: null, dueTime: null, completed: false, createdAt: 1754800000000, updatedAt: 1754800000000, completedAt: null },
      { id: "done", listId: "missing", title: "งานที่เสร็จแล้ว", notes: "", priority: "urgent", dueDate: "2026-08-10", dueTime: "09:00", completed: true, createdAt: 1754800000000, updatedAt: 1754800100000, completedAt: 1754800100000 },
      { id: "invalid", listId: "work", title: "", notes: "", priority: "none", dueDate: null, dueTime: null, completed: false, createdAt: 1754800000000, updatedAt: 1754800000000, completedAt: null },
    ],
  });
  await page.locator('input[aria-label="นำเข้าไฟล์สำรอง To-Do List"]').setInputFiles({ name: "todo-backup.json", mimeType: "application/json", buffer: Buffer.from(imported) });
  await expect(page.locator('article[data-testid^="todo-task-"]')).toHaveCount(2);
  await expect(page.getByTestId("todo-task-list")).toContainText("งานที่เสร็จแล้ว");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("todo-export-csv").click();
  const csv = await readFile((await (await csvPromise).path())!, "utf8");
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain("'+cmd");

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      stored: window.localStorage.getItem("meaw-todo-list-v1"),
    };
  });
  expect(browserState.overflow).toBe(false);
  expect(browserState.duplicateIds).toEqual([]);
  expect(browserState.stored).not.toContain("duplicate");
  expect(browserState.stored).not.toContain("2026-02-30");
  expect(browserState.stored).not.toContain('"listId":"missing"');
  expect(browserState.stored).not.toContain('"priority":"urgent"');
  expect(consoleErrors).toEqual([]);
});
