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

function stopwatchTextToMs(value: string | null): number {
  const match = value?.match(/(\d+):(\d{2}):(\d{2})\.(\d{2,3})/);
  if (!match) throw new Error(`Invalid stopwatch time: ${value ?? "null"}`);
  const fraction = match[4]!.length === 2 ? Number(match[4]) * 10 : Number(match[4]);
  return Number(match[1]) * 3_600_000 + Number(match[2]) * 60_000 + Number(match[3]) * 1_000 + fraction;
}

test("online stopwatch records accurate laps, resumes, persists, and exports safe CSV", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/online-stopwatch");
  await page.evaluate(() => window.localStorage.removeItem("meaw-stopwatch-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Online Stopwatch with Lap Timer/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/online-stopwatch");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");

  await page.getByTestId("stopwatch-session-name").fill("ซ้อมวิ่ง 3 รอบ");
  await page.getByTestId("stopwatch-start").click();
  await expect(page.getByTestId("stopwatch-status")).toHaveText("กำลังจับเวลา");
  await page.clock.runFor(1_250);
  await page.getByTestId("stopwatch-lap").click();
  const firstSplitMs = stopwatchTextToMs(await page.getByTestId("stopwatch-lap-1").locator("td").nth(1).textContent());
  expect(firstSplitMs).toBeGreaterThanOrEqual(1_200);
  expect(firstSplitMs).toBeLessThan(1_450);

  await page.clock.runFor(750);
  await page.getByTestId("stopwatch-lap").click();
  const secondSplitMs = stopwatchTextToMs(await page.getByTestId("stopwatch-lap-2").locator("td").nth(1).textContent());
  expect(secondSplitMs).toBeGreaterThanOrEqual(700);
  expect(secondSplitMs).toBeLessThan(950);
  await expect(page.getByTestId("stopwatch-stats")).toContainText("จำนวนรอบ2");
  await expect(page.getByTestId("stopwatch-stats")).toContainText("เร็วที่สุด");
  await expect(page.getByTestId("stopwatch-stats")).toContainText("ช้าที่สุด");
  await expect(page.getByTestId("stopwatch-stats")).toContainText("เวลาเฉลี่ยต่อรอบ");

  await page.getByTestId("stopwatch-pause").click();
  const firstPausedText = await page.getByTestId("stopwatch-display").textContent();
  const firstPausedMs = stopwatchTextToMs(firstPausedText);
  expect(firstPausedMs).toBeGreaterThanOrEqual(1_950);
  expect(firstPausedMs).toBeLessThan(2_350);
  await page.clock.runFor(5_000);
  await expect(page.getByTestId("stopwatch-display")).toHaveText(firstPausedText ?? "");

  await page.keyboard.press("Space");
  await page.clock.runFor(500);
  await page.keyboard.press("l");
  await page.keyboard.press("Space");
  const finalDisplayText = await page.getByTestId("stopwatch-display").textContent();
  const finalElapsedMs = stopwatchTextToMs(finalDisplayText);
  expect(finalElapsedMs - firstPausedMs).toBeGreaterThanOrEqual(450);
  expect(finalElapsedMs - firstPausedMs).toBeLessThan(750);
  const thirdSplitMs = stopwatchTextToMs(await page.getByTestId("stopwatch-lap-3").locator("td").nth(1).textContent());
  expect(thirdSplitMs).toBeGreaterThanOrEqual(450);
  expect(thirdSplitMs).toBeLessThan(750);

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("stopwatch-export-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-stopwatch-laps.csv");
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv).toContain("ซ้อมวิ่ง 3 รอบ");
  expect(csv.split(/\r?\n/).filter(Boolean)).toHaveLength(4);
  expect(csv).toMatch(/00:00:0[12]\.\d{3}/);

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#stopwatch-session-name");
    const label = document.querySelector<HTMLLabelElement>('label[for="stopwatch-session-name"]');
    if (!field || !label) throw new Error("Stopwatch session field layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-stopwatch-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("ซ้อมวิ่ง 3 รอบ");

  await page.reload();
  await expect(page.getByTestId("stopwatch-display")).toHaveText(finalDisplayText ?? "");
  await expect(page.locator('tr[data-testid^="stopwatch-lap-"]')).toHaveCount(3);
  await expect(page.getByTestId("stopwatch-session-heading")).toHaveText("ซ้อมวิ่ง 3 รอบ");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("online stopwatch sanitizes restored laps and stays balanced in dark mobile profession flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem("meaw-stopwatch-v1", JSON.stringify({
      status: "paused",
      accumulatedMs: 3_000,
      startedAtMs: null,
      sessionName: "=HYPERLINK(\"bad\")",
      updatedAtMs: Date.now(),
      laps: [
        { id: "safe", totalMs: 1_000, splitMs: 999_999, recordedAtMs: Date.now() },
        { id: "safe", totalMs: 1_500, splitMs: 500, recordedAtMs: Date.now() },
        { id: "back", totalMs: 900, splitMs: -100, recordedAtMs: Date.now() },
        { id: "second", totalMs: 2_500, splitMs: 10, recordedAtMs: Date.now() },
        { id: "future", totalMs: 9_000, splitMs: 6_500, recordedAtMs: Date.now() },
      ],
    }));
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/professions/education");
  await expect(page.locator('a[href="/online-stopwatch"]')).toBeVisible();
  await page.goto("/professions/project-operations");
  await expect(page.locator('a[href="/online-stopwatch"]')).toBeVisible();
  await page.goto("/categories/date-time");
  await expect(page.locator('a[href="/online-stopwatch"]')).toBeVisible();
  await page.goto("/online-stopwatch");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("stopwatch-display")).toHaveText("00:00:03.00");
  await expect(page.locator('tr[data-testid^="stopwatch-lap-"]')).toHaveCount(2);
  await expect(page.getByTestId("stopwatch-lap-2")).toContainText("00:00:01.500");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("stopwatch-export-csv").click();
  const csv = await readFile((await (await csvPromise).path())!, "utf8");
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).not.toContain("999999");
  expect(csv).not.toContain("00:00:09.000");
  await page.getByTestId("stopwatch-session-name").fill("ทดสอบมือถือ");

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    const lapPanel = document.querySelector<HTMLElement>('[data-testid="stopwatch-lap-panel"]');
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      lapPanelFits: Boolean(lapPanel && lapPanel.getBoundingClientRect().right <= window.innerWidth),
      stored: window.localStorage.getItem("meaw-stopwatch-v1"),
    };
  });
  expect(browserState.overflow).toBe(false);
  expect(browserState.duplicateIds).toEqual([]);
  expect(browserState.lapPanelFits).toBe(true);
  expect(browserState.stored).not.toContain('"id":"future"');
  expect(consoleErrors).toEqual([]);
});
