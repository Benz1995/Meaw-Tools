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

test("habit tracker checks in, calculates streaks, persists, and exports backups", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/habit-tracker");
  await page.evaluate(() => window.localStorage.removeItem("meaw-habit-tracker-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Habit Tracker Online Free/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/habit-tracker");

  await page.getByTestId("habit-title").fill("อ่านหนังสือ 20 นาที");
  await page.getByTestId("habit-save").click();
  await expect(page.getByTestId("habit-card-0")).toContainText("อ่านหนังสือ 20 นาที");
  await expect(page.locator('button[data-testid^="habit-daily-"]')).toHaveCount(1);
  await page.locator('button[data-testid^="habit-daily-"]').click();
  await expect(page.getByTestId("habit-summary")).toContainText("100%");
  await expect(page.getByTestId("habit-card-0")).toContainText("1");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("habit-export-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-habit-tracker-2026-08-11.csv");
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv).toContain("อ่านหนังสือ 20 นาที");
  expect(csv).toContain('"Yes"');

  const jsonPromise = page.waitForEvent("download");
  await page.getByTestId("habit-export-json").click();
  const jsonDownload = await jsonPromise;
  expect(jsonDownload.suggestedFilename()).toBe("meaw-habit-tracker-backup-2026-08-11.json");
  const backup = JSON.parse(await readFile((await jsonDownload.path())!, "utf8")) as { habits: Array<{ title: string }>; checkins: Record<string, string[]> };
  expect(backup.habits[0]?.title).toBe("อ่านหนังสือ 20 นาที");
  expect(backup.checkins["2026-08-11"]).toHaveLength(1);

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#habit-title");
    const label = document.querySelector<HTMLLabelElement>('label[for="habit-title"]');
    if (!field || !label) throw new Error("Habit title layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-habit-tracker-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("อ่านหนังสือ 20 นาที");

  await page.reload();
  await expect(page.getByTestId("habit-card-0")).toContainText("อ่านหนังสือ 20 นาที");
  await expect(page.locator('button[data-testid^="habit-daily-"]')).toHaveAttribute("aria-pressed", "true");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("habit tracker imports sanitized data and stays balanced in dark mobile profession flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-habit-tracker-v1");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/professions/education");
  await expect(page.locator('a[href="/habit-tracker"]')).toBeVisible();
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/habit-tracker"]')).toBeVisible();
  await page.goto("/habit-tracker");
  await expect(page.locator("html")).toHaveClass(/dark/);

  const imported = JSON.stringify({
    habits: [{ id: "routine", title: "ทบทวนบทเรียน", color: "sky", frequency: "custom", weekdays: [2, 2, 99], createdDate: "2026-08-01" }],
    checkins: { "2026-08-11": ["routine", "routine", "unknown"], "2026-02-30": ["routine"] },
  });
  await page.locator('input[aria-label="นำเข้าไฟล์สำรอง Habit Tracker"]').setInputFiles({ name: "habit-backup.json", mimeType: "application/json", buffer: Buffer.from(imported) });
  await expect(page.getByTestId("habit-card-0")).toContainText("ทบทวนบทเรียน");
  await expect(page.getByTestId("habit-card-0")).toContainText("อ.");
  await expect(page.locator('button[data-testid^="habit-daily-"]')).toHaveAttribute("aria-pressed", "true");

  const browserState = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    stored: window.localStorage.getItem("meaw-habit-tracker-v1"),
  }));
  expect(browserState.overflow).toBe(false);
  expect(browserState.stored).not.toContain("unknown");
  expect(browserState.stored).not.toContain("2026-02-30");
  expect(consoleErrors).toEqual([]);
});
