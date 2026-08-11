import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3100"}`;

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    if (requestUrl.startsWith("blob:")) return false;
    try { return new URL(requestUrl).origin !== pageOrigin; }
    catch { return true; }
  });
}

test("meeting planner compares global work hours, shares the plan, and exports UTC calendar data", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/time-zone-meeting-planner");
  await expect(page).toHaveTitle(/Time Zone Meeting Planner/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/time-zone-meeting-planner");
  await page.getByRole("button", { name: /ตัวอย่าง/ }).click();
  await expect(page.getByTestId("meeting-participant-2").locator("input").first()).toHaveValue("New York");
  await page.getByTestId("meeting-calculate").click();
  await expect(page.getByTestId("meeting-results")).toContainText("Weekly product sync");
  await expect(page.getByTestId("meeting-suggestion-0")).toContainText("3/3");
  await expect(page.getByTestId("meeting-selected-detail")).toContainText("UTC+07:00");
  await expect(page.getByTestId("meeting-selected-detail")).toContainText(/UTC−0[45]:00/);

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>('input[list="meeting-time-zones"]');
    const label = field ? document.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`) : null;
    if (!field || !label) throw new Error("Meeting time zone field layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);

  await page.getByTestId("meeting-copy-link").click();
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  const shared = new URL(sharedUrl);
  expect(shared.pathname).toBe("/time-zone-meeting-planner");
  expect(shared.searchParams.get("v")).toBe("1");
  expect(shared.searchParams.get("t")).toBe("Weekly product sync");
  expect(JSON.parse(shared.searchParams.get("p") ?? "[]")).toHaveLength(3);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("meeting-calendar").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Weekly-product-sync.ics");
  const calendar = await readFile((await download.path())!, "utf8");
  expect(calendar).toContain("BEGIN:VCALENDAR");
  expect(calendar).toContain("SUMMARY:Weekly product sync");
  expect(calendar).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  expect(calendar).toMatch(/DTEND:\d{8}T\d{6}Z/);

  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto(sharedUrl);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("meeting-results")).toContainText("Weekly product sync");
  await expect(page.getByTestId("meeting-selected-detail")).toContainText("New York");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("meeting planner exposes the new tool from a profession page", async ({ page }) => {
  await page.goto("/professions/project-operations");
  await expect(page.locator('a[href="/time-zone-meeting-planner"]')).toBeVisible();
});
