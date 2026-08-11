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

test("countdown timer shares an event, exports calendar, and keeps professional spacing", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/countdown-timer");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/countdown-timer");
  await expect(page).toHaveTitle(/Countdown Timer Online/);
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("countdown-preview")).toContainText("วันเปิดตัวโปรเจกต์ Meaw");
  await expect(page.getByTestId("countdown-days")).not.toHaveText("00");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#countdown-target");
    const label = document.querySelector<HTMLLabelElement>('label[for="countdown-target"]');
    if (!field || !label) throw new Error("Countdown target layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);

  await page.getByTestId("countdown-copy-link").click();
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  const shared = new URL(sharedUrl);
  expect(shared.pathname).toBe("/countdown-timer");
  expect(shared.searchParams.get("mode")).toBe("event");
  expect(shared.searchParams.get("title")).toBe("วันเปิดตัวโปรเจกต์ Meaw");
  expect(shared.searchParams.get("theme")).toBe("sakura");
  expect(Number(shared.searchParams.get("target"))).toBeGreaterThan(Date.now());

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("countdown-calendar").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("วันเปิดตัวโปรเจกต์-meaw.ics");
  const calendar = await readFile((await download.path())!, "utf8");
  expect(calendar).toContain("BEGIN:VCALENDAR");
  expect(calendar).toContain("SUMMARY:วันเปิดตัวโปรเจกต์ Meaw");
  expect(calendar).toMatch(/DTSTART:\d{8}T\d{6}Z/);

  await page.goto(sharedUrl);
  await expect(page.getByTestId("countdown-preview")).toContainText("วันเปิดตัวโปรเจกต์ Meaw");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("duration countdown pauses, resumes, and reaches its completion state", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("/countdown-timer");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("countdown-duration-tab").click();
  await page.getByRole("spinbutton", { name: "ชั่วโมง", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "นาที", exact: true }).fill("0");
  await page.getByRole("spinbutton", { name: "วินาที", exact: true }).fill("4");
  await page.getByTestId("countdown-start").click();
  await expect(page.getByTestId("countdown-seconds-value")).toHaveText(/[34]/);

  await page.waitForTimeout(700);
  await page.getByTestId("countdown-pause").click();
  await expect(page.getByTestId("countdown-status")).toContainText("พักเวลาอยู่");
  const pausedValue = await page.getByTestId("countdown-seconds-value").textContent();
  await page.waitForTimeout(1_100);
  await expect(page.getByTestId("countdown-seconds-value")).toHaveText(pausedValue ?? "");

  await page.getByTestId("countdown-start").click();
  await expect(page.getByTestId("countdown-status")).toContainText("ถึงเวลาแล้ว", { timeout: 6_000 });
  await expect(page.getByTestId("countdown-seconds-value")).toHaveText("00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  expect(consoleErrors).toEqual([]);
});
