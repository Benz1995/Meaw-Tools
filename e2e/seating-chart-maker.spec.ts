import { readFile, stat } from "node:fs/promises";
import { expect, test } from "@playwright/test";

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    if (requestUrl.startsWith("blob:")) return false;
    try {
      return new URL(requestUrl).origin !== pageOrigin;
    } catch {
      return true;
    }
  });
}

test("seating chart creates, edits, locks, exports, imports, persists, and exposes SEO", async ({
  context,
  page,
}) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("seating-e2e-initialized")) {
      window.localStorage.removeItem("meaw-seating-chart-maker-v1");
      window.sessionStorage.setItem("seating-e2e-initialized", "1");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/seating-chart-maker");
  await expect(page).toHaveTitle(/Seating Chart Maker/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://meaw-tools.vercel.app/seating-chart-maker",
  );
  await expect(page.getByRole("heading", { level: 1, name: /Seating Chart Maker/ })).toBeVisible();
  await expect(page.getByTestId("seating-empty-state")).toBeVisible();

  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => value.includes('"@type":"WebApplication"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"BreadcrumbList"'))).toBe(true);

  await page.getByRole("button", { name: "ตัวอย่าง" }).click();
  await expect(page.getByTestId("seating-person-count")).toContainText("24/200");
  await page.getByTestId("seating-generate").click();
  await expect(page.getByTestId("seating-results")).toBeVisible();
  await expect(page.getByTestId("seating-chart-grid").getByRole("button")).toHaveCount(24);
  await expect(page.getByTestId("seating-occupied-count")).toHaveText("24/24");
  await expect(page.getByTestId("seating-unseated-count")).toHaveText("0");

  const firstPerson = page.getByTestId("seating-person-person-1");
  const firstSeatId = (await firstPerson.textContent())?.match(/R\d+-C\d+/)?.[0];
  expect(firstSeatId).toBeTruthy();
  await firstPerson.click();
  await page.getByRole("button", { name: "ล็อกที่นั่ง" }).click();
  await page.getByTestId("seating-reshuffle").click();
  await expect(page.getByTestId(`seating-seat-${firstSeatId}`)).toContainText("มะลิ");

  await firstPerson.click();
  await page.getByRole("button", { name: "ปลดล็อก" }).click();
  await page.getByRole("button", { name: "นำชื่อออก", exact: true }).click();
  await expect(page.getByTestId("seating-unseated-count")).toHaveText("1");
  await page.getByTestId("seating-fill-unseated").click();
  await expect(page.getByTestId("seating-unseated-count")).toHaveText("0");
  await page.getByTestId("seating-undo").click();
  await expect(page.getByTestId("seating-unseated-count")).toHaveText("1");
  await page.getByTestId("seating-redo").click();
  await expect(page.getByTestId("seating-unseated-count")).toHaveText("0");

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("seating-png").click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("meaw-seating-chart.png");
  const pngPath = await pngDownload.path();
  expect(pngPath).toBeTruthy();
  expect((await stat(pngPath!)).size).toBeGreaterThan(5_000);

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("seating-csv").click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-seating-chart.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Seat","Section","Row","Position","Person","Group","Locked","Unavailable"');

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("seating-json").click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe("meaw-seating-chart.json");
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).toBeTruthy();

  const layoutState = await page.evaluate(() => {
    const fields = [
      "seating-title",
      "seating-people",
      "seating-rows",
      "seating-columns",
      "seating-seed",
    ];
    const labelGaps = fields.map((id) => {
      const field = document.querySelector<HTMLElement>(`#${id}`);
      const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      return field && label
        ? Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom)
        : 0;
    });
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGaps,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layoutState.labelGaps.every((gap) => gap >= 8)).toBe(true);
  expect(layoutState.duplicateIds).toEqual([]);
  expect(layoutState.overflow).toBe(false);

  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  const printState = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[data-testid="seating-results"]')?.closest<HTMLElement>(".seating-print-surface");
    const form = document.querySelector<HTMLElement>('[aria-labelledby="seating-form-heading"]');
    const header = document.querySelector<HTMLElement>(".seating-print-header");
    const grid = document.querySelector<HTMLElement>(".seating-chart-grid");
    return {
      surfaceVisibility: surface ? getComputedStyle(surface).visibility : "missing",
      surfacePosition: surface ? getComputedStyle(surface).position : "missing",
      formDisplay: form ? getComputedStyle(form).display : "missing",
      headerDisplay: header ? getComputedStyle(header).display : "missing",
      gridMinWidth: grid ? getComputedStyle(grid).minWidth : "missing",
    };
  });
  expect(printState).toEqual({
    surfaceVisibility: "visible",
    surfacePosition: "absolute",
    formDisplay: "none",
    headerDisplay: "block",
    gridMinWidth: "0px",
  });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("seating-results")).toBeVisible();
  await expect(page.getByTestId("seating-occupied-count")).toHaveText("24/24");
  await page.getByRole("button", { name: "ล้างทั้งหมด" }).click();
  await expect(page.getByTestId("seating-empty-state")).toBeVisible();
  await page.getByTestId("seating-import-file").setInputFiles(jsonPath!);
  await expect(page.getByTestId("seating-results")).toBeVisible();
  await expect(page.getByTestId("seating-occupied-count")).toHaveText("24/24");

  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("seating chart supports round tables and remains balanced in dark mobile directories", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-seating-chart-maker-v1");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  for (const profession of [
    "digital-marketing",
    "business-owner",
    "human-resources",
    "project-operations",
    "education",
    "office-admin",
  ]) {
    await page.goto(`/professions/${profession}`);
    await expect(page.locator('a[href="/seating-chart-maker"]')).toBeVisible();
  }
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/seating-chart-maker"]')).toBeVisible();

  await page.goto("/seating-chart-maker");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "ตัวอย่าง" }).click();
  await page.getByTestId("seating-layout-tables").click();
  await page.getByTestId("seating-table-count").fill("3");
  await page.getByTestId("seating-seats-per-table").fill("8");
  await page.getByTestId("seating-strategy-together").click();
  await page.getByTestId("seating-generate").click();
  await expect(page.getByTestId("seating-results")).toBeVisible();
  await expect(page.getByTestId("seating-chart-grid").getByRole("button")).toHaveCount(24);
  await expect(page.getByRole("region", { name: "โต๊ะ 1" })).toBeVisible();
  await expect(page.getByRole("region", { name: "โต๊ะ 3" })).toBeVisible();

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    const form = document.querySelector<HTMLElement>('[aria-labelledby="seating-form-heading"]');
    const result = document.querySelector<HTMLElement>('[data-testid="seating-results"]');
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      formFits: Boolean(form && form.getBoundingClientRect().right <= window.innerWidth),
      resultFits: Boolean(result && result.getBoundingClientRect().right <= window.innerWidth),
    };
  });
  expect(browserState).toEqual({ overflow: false, duplicateIds: [], formFits: true, resultFits: true });
  expect(consoleErrors).toEqual([]);
});
