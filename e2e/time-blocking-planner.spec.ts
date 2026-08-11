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

test("time blocking planner rejects conflicts, persists a day, and exports safe calendar files", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/time-blocking-planner");
  await page.evaluate(() => window.localStorage.removeItem("meaw-time-blocking-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Time Blocking Planner Online/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/time-blocking-planner");

  await page.getByTestId("time-block-title").fill("เขียนบทความ SEO");
  await page.getByTestId("time-block-start").fill("09:00");
  await page.getByTestId("time-block-end").fill("10:30");
  await page.getByTestId("time-block-save").click();
  await expect(page.getByTestId("time-blocking-item-0")).toContainText("เขียนบทความ SEO");
  await expect(page.getByTestId("time-blocking-metrics")).toContainText("1 ชม. 30 นาที");

  await page.getByTestId("time-block-title").fill("ประชุมทีม");
  await page.getByTestId("time-block-start").fill("10:00");
  await page.getByTestId("time-block-end").fill("11:00");
  await expect(page.getByTestId("time-block-live-conflict")).toContainText("เขียนบทความ SEO");
  await page.getByTestId("time-block-save").click();
  await expect(page.getByTestId("time-block-error")).toContainText("ทับกับบล็อกอื่น");
  await expect(page.locator('[data-testid^="time-blocking-item-"]')).toHaveCount(1);

  await page.getByTestId("time-block-start").fill("10:30");
  await page.getByTestId("time-block-end").fill("11:30");
  await page.getByTestId("time-block-category").click();
  await page.getByRole("option", { name: "ประชุม" }).click();
  await page.getByTestId("time-block-save").click();
  await expect(page.locator('[data-testid^="time-blocking-item-"]')).toHaveCount(2);
  await page.getByTestId("time-blocking-item-1").getByRole("button", { name: /ไปข้างหน้า 15 นาที/ }).click();
  await expect(page.getByTestId("time-blocking-item-1")).toContainText("10:45–11:45");
  await page.getByTestId("time-blocking-item-0").getByRole("button", { name: /ทำเครื่องหมายว่าเสร็จ/ }).click();
  await expect(page.getByTestId("time-blocking-metrics")).toContainText("1/2 บล็อก");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("time-blocking-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toMatch(/^meaw-time-blocking-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv).toContain("เขียนบทความ SEO");
  expect(csv).toContain("10:45");

  const icsPromise = page.waitForEvent("download");
  await page.getByTestId("time-blocking-ics").click();
  const icsDownload = await icsPromise;
  expect(icsDownload.suggestedFilename()).toMatch(/^meaw-time-blocking-\d{4}-\d{2}-\d{2}\.ics$/);
  const calendar = await readFile((await icsDownload.path())!, "utf8");
  expect(calendar).toContain("BEGIN:VCALENDAR");
  expect(calendar).toContain("DTSTART:");
  expect(calendar).toContain("SUMMARY:เขียนบทความ SEO");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#time-block-title");
    const label = document.querySelector<HTMLLabelElement>('label[for="time-block-title"]');
    if (!field || !label) throw new Error("Time block title layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-time-blocking-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("เขียนบทความ SEO");

  await page.reload();
  await expect(page.getByTestId("time-blocking-item-0")).toContainText("เขียนบทความ SEO");
  await expect(page.getByTestId("time-blocking-item-1")).toContainText("10:45–11:45");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("time blocking templates remain usable in dark mobile and print layouts", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-time-blocking-v1");
  });

  await page.goto("/professions/project-operations");
  await expect(page.locator('a[href="/time-blocking-planner"]')).toBeVisible();
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/time-blocking-planner"]')).toBeVisible();
  await page.goto("/time-blocking-planner");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("time-blocking-template-balanced").click();
  await expect(page.locator('[data-testid^="time-blocking-item-"]')).toHaveCount(6);
  await expect(page.getByTestId("time-blocking-timeline-block-0")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.emulateMedia({ media: "print" });
  const printStyles = await page.evaluate(() => ({
    editorDisplay: getComputedStyle(document.querySelector(".time-blocking-no-print")!).display,
    surfaceVisibility: getComputedStyle(document.querySelector(".time-blocking-print-surface")!).visibility,
  }));
  expect(printStyles).toEqual({ editorDisplay: "none", surfaceVisibility: "visible" });
  expect(consoleErrors).toEqual([]);
});
