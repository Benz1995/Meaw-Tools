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

test("employee schedule generates, edits, locks, exports, imports, persists, and exposes SEO", async ({ context, page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("employee-schedule-e2e-initialized")) {
      window.localStorage.removeItem("meaw-employee-schedule-maker-v1");
      window.sessionStorage.setItem("employee-schedule-e2e-initialized", "1");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/employee-schedule-maker");
  await expect(page).toHaveTitle(/Employee Schedule Maker/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/employee-schedule-maker");
  await expect(page.getByRole("heading", { level: 1, name: /Employee Schedule Maker/ })).toBeVisible();
  await expect(page.getByTestId("employee-schedule-empty-state")).toBeVisible();
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => value.includes('"@type":"WebApplication"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"BreadcrumbList"'))).toBe(true);

  await page.getByRole("button", { name: "ตัวอย่าง", exact: true }).click();
  await expect(page.getByTestId("employee-schedule-person-count")).toContainText("8/80");
  await page.getByTestId("employee-schedule-generate").click();
  await expect(page.getByTestId("employee-schedule-results")).toBeVisible();
  await expect(page.getByTestId("employee-schedule-filled-count")).toHaveText("35/35");
  await expect(page.getByTestId("employee-schedule-open-count")).toHaveText("0");

  const firstSlot = page.locator('[data-testid^="employee-schedule-slot-"]').first();
  const firstSlotTestId = await firstSlot.getAttribute("data-testid");
  const firstEmployee = (await firstSlot.locator("span").first().textContent())?.trim();
  expect(firstSlotTestId).toBeTruthy();
  expect(firstEmployee).toBeTruthy();
  await firstSlot.click();
  await page.getByRole("button", { name: "ล็อกเวร" }).click();
  await page.getByTestId("employee-schedule-regenerate").click();
  await expect(page.locator(`[data-testid="${firstSlotTestId}"]`)).toContainText(firstEmployee!);

  await page.locator(`[data-testid="${firstSlotTestId}"]`).click();
  await page.getByRole("button", { name: "ปลดล็อก" }).click();
  await page.getByRole("button", { name: "นำชื่อออก", exact: true }).click();
  await expect(page.getByTestId("employee-schedule-open-count")).toHaveText("1");
  await page.getByTestId("employee-schedule-fill-open").click();
  await expect(page.getByTestId("employee-schedule-open-count")).toHaveText("0");
  await page.getByTestId("employee-schedule-undo").click();
  await expect(page.getByTestId("employee-schedule-open-count")).toHaveText("1");
  await page.getByTestId("employee-schedule-redo").click();
  await expect(page.getByTestId("employee-schedule-open-count")).toHaveText("0");

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("employee-schedule-csv").click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-employee-schedule.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Date","Day","Shift","Start","End"');

  const icsDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("employee-schedule-ics").click();
  const icsDownload = await icsDownloadPromise;
  expect(icsDownload.suggestedFilename()).toBe("meaw-employee-schedule.ics");
  const icsPath = await icsDownload.path();
  expect(icsPath).toBeTruthy();
  const ics = await readFile(icsPath!, "utf8");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics).toContain("END:VCALENDAR");

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("employee-schedule-json").click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe("meaw-employee-schedule.json");
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).toBeTruthy();

  const layoutState = await page.evaluate(() => {
    const fields = ["employee-schedule-title", "employee-schedule-people", "employee-schedule-unavailability", "employee-schedule-start", "employee-schedule-end", "employee-schedule-rest", "employee-schedule-consecutive", "employee-schedule-seed"];
    const labelGaps = fields.map((id) => {
      const field = document.querySelector<HTMLElement>(`#${id}`);
      const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      return field && label ? Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom) : 0;
    });
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return { labelGaps, duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  expect(layoutState.labelGaps.every((gap) => gap >= 8)).toBe(true);
  expect(layoutState.duplicateIds).toEqual([]);
  expect(layoutState.overflow).toBe(false);

  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  const printState = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>(".employee-schedule-print-surface");
    const form = document.querySelector<HTMLElement>('[aria-labelledby="employee-schedule-form-heading"]');
    const header = document.querySelector<HTMLElement>(".employee-schedule-print-header");
    const days = document.querySelector<HTMLElement>(".employee-schedule-days");
    return { surfaceVisibility: surface ? getComputedStyle(surface).visibility : "missing", surfacePosition: surface ? getComputedStyle(surface).position : "missing", formDisplay: form ? getComputedStyle(form).display : "missing", headerDisplay: header ? getComputedStyle(header).display : "missing", daysDisplay: days ? getComputedStyle(days).display : "missing" };
  });
  expect(printState).toEqual({ surfaceVisibility: "visible", surfacePosition: "absolute", formDisplay: "none", headerDisplay: "block", daysDisplay: "grid" });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("employee-schedule-results")).toBeVisible();
  await expect(page.getByTestId("employee-schedule-filled-count")).toHaveText("35/35");
  await page.getByRole("button", { name: "ล้างทั้งหมด" }).click();
  await expect(page.getByTestId("employee-schedule-empty-state")).toBeVisible();
  await page.getByTestId("employee-schedule-import-file").setInputFiles(jsonPath!);
  await expect(page.getByTestId("employee-schedule-results")).toBeVisible();
  await expect(page.getByTestId("employee-schedule-filled-count")).toHaveText("35/35");

  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("employee schedule reports hard-constraint gaps and remains balanced in dark mobile directories", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => window.localStorage.removeItem("meaw-employee-schedule-maker-v1"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/employee-schedule-maker");
  await page.getByRole("button", { name: "สลับโหมดสี" }).click();
  await page.getByRole("button", { name: "ตัวอย่าง", exact: true }).click();

  const startDate = await page.getByTestId("employee-schedule-start").inputValue();
  await page.locator("#employee-schedule-unavailability").fill(`มะลิ | ${startDate}\nนนท์ | ${startDate}`);
  await page.getByTestId("employee-schedule-generate").click();
  await expect(page.getByTestId("employee-schedule-open-count")).not.toHaveText("0");
  await expect(page.getByText("มีช่องเวรที่เงื่อนไขยังจัดไม่ได้")).toBeVisible();
  const openSlot = page.locator('[data-testid^="employee-schedule-slot-"]').filter({ hasText: "ยังไม่มีคน" }).first();
  await openSlot.click();
  await expect(page.getByTestId("employee-schedule-team-list")).toContainText("ลา/ไม่สะดวก");

  const mobileState = await page.evaluate(() => ({
    dark: document.documentElement.classList.contains("dark"),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    resultWidth: Math.round(document.querySelector<HTMLElement>('[data-testid="employee-schedule-results"]')?.getBoundingClientRect().width ?? 0),
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(mobileState.dark).toBe(true);
  expect(mobileState.overflow).toBe(false);
  expect(mobileState.resultWidth).toBeLessThanOrEqual(mobileState.viewportWidth);

  for (const path of ["/categories/business", "/professions/business-owner", "/professions/human-resources", "/professions/project-operations", "/professions/office-admin", "/professions/food-beverage", "/shift-pattern-calculator"]) {
    await page.goto(path);
    await expect(page.locator('a[href="/employee-schedule-maker"]').last()).toBeVisible();
  }
  expect(consoleErrors).toEqual([]);
});
