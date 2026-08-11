import { expect, test } from "@playwright/test";

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    if (requestUrl.startsWith("blob:")) return false;
    try { return new URL(requestUrl).origin !== pageOrigin; }
    catch { return true; }
  });
}

test("pomodoro completes a focus session, tracks a local task, and preserves paused time", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/pomodoro-timer");
  await page.evaluate(() => window.localStorage.removeItem("meaw-pomodoro-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Pomodoro Focus Timer Online/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/pomodoro-timer");
  await page.getByTestId("pomodoro-task-input").fill("เขียนหน้า Landing page");
  await page.getByTestId("pomodoro-add-task").click();
  await expect(page.getByTestId("pomodoro-active-task")).toContainText("เขียนหน้า Landing page");

  await page.getByLabel("Focus (นาที)").fill("1");
  await expect(page.getByTestId("pomodoro-clock")).toHaveText("01:00");
  await page.getByTestId("pomodoro-start").click();
  await page.clock.runFor(61_000);
  await expect(page.getByTestId("pomodoro-mode-short-break")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pomodoro-clock")).toHaveText("05:00");
  await expect(page.getByTestId("pomodoro-stat-sessions")).toContainText("1/8");
  await expect(page.getByTestId("pomodoro-stat-minutes")).toContainText("1");
  await expect(page.getByTestId("pomodoro-task-list")).toContainText("1/2 รอบ");

  await page.getByTestId("pomodoro-start").click();
  await page.clock.runFor(1_200);
  await expect(page.getByTestId("pomodoro-clock")).toHaveText("04:59");
  await page.getByTestId("pomodoro-pause").click();
  const pausedClock = await page.getByTestId("pomodoro-clock").textContent();
  await page.clock.runFor(5_000);
  await expect(page.getByTestId("pomodoro-clock")).toHaveText(pausedClock ?? "");
  await page.getByTestId("pomodoro-start").click();
  await page.getByTestId("pomodoro-skip").click();
  await expect(page.getByTestId("pomodoro-mode-focus")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pomodoro-stat-sessions")).toContainText("1/8");

  await page.getByRole("button", { name: "Quick Focus 15/5" }).click();
  await expect(page.getByTestId("pomodoro-clock")).toHaveText("15:00");
  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#pomodoro-task-title");
    const label = document.querySelector<HTMLLabelElement>('label[for="pomodoro-task-title"]');
    if (!field || !label) throw new Error("Pomodoro task field layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-pomodoro-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("เขียนหน้า Landing page");

  await page.reload();
  await expect(page.getByTestId("pomodoro-task-list")).toContainText("เขียนหน้า Landing page");
  await expect(page.getByLabel("Focus (นาที)")).toHaveValue("15");
  await expect(page.getByTestId("pomodoro-stat-sessions")).toContainText("1/8");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("pomodoro is linked from education and keeps dark mode responsive", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("/professions/education");
  await expect(page.locator('a[href="/pomodoro-timer"]')).toBeVisible();
  await page.goto("/pomodoro-timer");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("pomodoro-ring")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(consoleErrors).toEqual([]);
});
