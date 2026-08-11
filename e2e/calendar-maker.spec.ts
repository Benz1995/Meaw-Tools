import { readFile } from "node:fs/promises";
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

test("calendar maker creates, edits, exports, imports, persists, and exposes SEO", async ({ context, page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("calendar-maker-e2e-initialized")) {
      window.localStorage.removeItem("meaw-calendar-maker-v1");
      window.sessionStorage.setItem("calendar-maker-e2e-initialized", "1");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/calendar-maker");
  await expect(page).toHaveTitle(/Calendar Maker & Printable Calendar/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/calendar-maker");
  await expect(page.getByRole("heading", { level: 1, name: /Calendar Maker/ })).toBeVisible();
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => value.includes('"@type":"WebApplication"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"BreadcrumbList"'))).toBe(true);

  await page.getByTestId("calendar-sample").click();
  await expect(page.getByTestId("calendar-result")).toBeVisible();
  await expect(page.getByTestId("calendar-active-month")).toContainText("2569 (2026)");
  await expect(page.getByTestId("calendar-result")).toContainText("6 กิจกรรม");

  await page.getByTestId("calendar-day-2026-08-20").click();
  await page.locator("#calendar-quick-title").fill("=SUM(1,1)");
  await page.getByRole("button", { name: "สุมิเระ", exact: true }).click();
  await page.getByTestId("calendar-add-event").click();
  await expect(page.getByTestId("calendar-result")).toContainText("7 กิจกรรม");
  await expect(page.getByTestId("calendar-result").getByTestId("calendar-event-chip").filter({ hasText: "=SUM(1,1)" })).toBeVisible();

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("calendar-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-calendar.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"\'=SUM(1,1)"');

  const icsPromise = page.waitForEvent("download");
  await page.getByTestId("calendar-ics").click();
  const icsDownload = await icsPromise;
  expect(icsDownload.suggestedFilename()).toBe("meaw-calendar.ics");
  const icsPath = await icsDownload.path();
  expect(await readFile(icsPath!, "utf8")).toContain("DTSTART;VALUE=DATE:20260820");

  const jsonPromise = page.waitForEvent("download");
  await page.getByTestId("calendar-json").click();
  const jsonDownload = await jsonPromise;
  const jsonPath = await jsonDownload.path();
  expect(jsonDownload.suggestedFilename()).toBe("meaw-calendar.json");
  expect(jsonPath).toBeTruthy();

  const svgPromise = page.waitForEvent("download");
  await page.getByTestId("calendar-svg").click();
  const svgDownload = await svgPromise;
  expect(svgDownload.suggestedFilename()).toBe("meaw-calendar-2026-08.svg");
  const svgPath = await svgDownload.path();
  expect(await readFile(svgPath!, "utf8")).toContain('<svg xmlns="http://www.w3.org/2000/svg"');

  const pngPromise = page.waitForEvent("download");
  await page.getByTestId("calendar-png").click();
  const pngDownload = await pngPromise;
  expect(pngDownload.suggestedFilename()).toBe("meaw-calendar-2026-08.png");
  const pngPath = await pngDownload.path();
  expect((await readFile(pngPath!)).length).toBeGreaterThan(10_000);

  const layout = await page.evaluate(() => {
    const fields = ["calendar-title", "calendar-start-month", "calendar-month-count", "calendar-language", "calendar-year-system", "calendar-week-start", "calendar-events", "calendar-notes", "calendar-quick-date", "calendar-quick-title"];
    const labelGaps = fields.map((id) => {
      const field = document.querySelector<HTMLElement>(`#${id}`);
      const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      return field && label ? Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom) : 0;
    });
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGaps,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGaps.every((gap) => gap >= 8)).toBe(true);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);

  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  const printState = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>(".calendar-maker-print-surface");
    const form = document.querySelector<HTMLElement>(".calendar-maker-no-print");
    const month = document.querySelector<HTMLElement>(".calendar-maker-print-month");
    return {
      surfaceDisplay: surface ? getComputedStyle(surface).display : "missing",
      surfaceVisibility: surface ? getComputedStyle(surface).visibility : "missing",
      surfacePosition: surface ? getComputedStyle(surface).position : "missing",
      formDisplay: form ? getComputedStyle(form).display : "missing",
      monthBreak: month ? getComputedStyle(month).breakInside : "missing",
    };
  });
  expect(printState).toEqual({ surfaceDisplay: "block", surfaceVisibility: "visible", surfacePosition: "absolute", formDisplay: "none", monthBreak: "avoid" });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("calendar-result")).toContainText("7 กิจกรรม");
  await page.getByTestId("calendar-clear").click();
  await expect(page.getByTestId("calendar-result")).toHaveCount(0);
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(jsonPath!);
  await expect(page.getByTestId("calendar-result")).toContainText("7 กิจกรรม");

  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("calendar maker supports 12 months and stays balanced in dark mobile profession directories", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => window.localStorage.removeItem("meaw-calendar-maker-v1"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/calendar-maker");
  await page.getByRole("button", { name: "สลับโหมดสี" }).click();
  await page.getByTestId("calendar-sample").click();
  await page.locator("#calendar-month-count").fill("12");
  await page.locator("#calendar-week-start").selectOption("0");
  await expect(page.getByRole("switch", { name: "แสดงเลขสัปดาห์ ISO" })).toBeDisabled();
  await page.getByTestId("calendar-generate").click();
  await expect(page.getByTestId("calendar-overview-month")).toHaveCount(12);

  const mobileState = await page.evaluate(() => ({
    dark: document.documentElement.classList.contains("dark"),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    resultWidth: Math.round(document.querySelector<HTMLElement>('[data-testid="calendar-result"]')?.getBoundingClientRect().width ?? 0),
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(mobileState.dark).toBe(true);
  expect(mobileState.overflow).toBe(false);
  expect(mobileState.resultWidth).toBeLessThanOrEqual(mobileState.viewportWidth);

  for (const path of [
    "/categories/date-time",
    "/professions/business-owner",
    "/professions/project-operations",
    "/professions/content-creator",
    "/professions/education",
    "/professions/office-admin",
    "/professions/freelancer-consultant",
    "/date-calculator",
  ]) {
    await page.goto(path);
    await expect(page.locator('a[href="/calendar-maker"]').last()).toBeVisible();
  }
  expect(consoleErrors).toEqual([]);
});
