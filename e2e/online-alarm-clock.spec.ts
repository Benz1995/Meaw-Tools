import { expect, test } from "@playwright/test";

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    try { return new URL(requestUrl).origin !== pageOrigin; }
    catch { return !requestUrl.startsWith("blob:"); }
  });
}

test("online alarm rings, snoozes, persists multiple alarms, and exposes complete SEO", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/online-alarm-clock");
  await page.evaluate(() => window.localStorage.removeItem("meaw-online-alarm-clock-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Online Alarm Clock with Multiple Alarms/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/online-alarm-clock");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");
  await expect(page.getByRole("heading", { level: 1, name: /Online Alarm Clock with Multiple Alarms/ })).toBeVisible();

  const structuredTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredTypes.some((value) => value.includes('"@type":"WebApplication"'))).toBe(true);
  expect(structuredTypes.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true);

  await page.getByTestId("alarm-fullscreen").click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-testid") ?? "")).toBe("alarm-clock-panel");
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);

  await page.getByRole("button", { name: "+1 นาที" }).click();
  await page.getByTestId("alarm-label").fill("ประชุมทีมเช้า");
  await page.getByTestId("alarm-test-sound").click();
  await page.getByTestId("alarm-save").click();
  await expect(page.getByTestId("alarm-list")).toContainText("ประชุมทีมเช้า");
  await expect(page.getByTestId("alarm-next-countdown")).toContainText("00:01:00");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("meaw-online-alarm-clock-v1") ?? "")).toContain("ประชุมทีมเช้า");

  await page.clock.runFor(60_300);
  await expect(page.getByTestId("alarm-ringing-overlay")).toBeVisible();
  await expect(page.getByTestId("alarm-ringing-overlay")).toContainText("ประชุมทีมเช้า");
  await page.getByTestId("alarm-snooze").click();
  await expect(page.getByTestId("alarm-ringing-overlay")).toBeHidden();
  await expect(page.getByTestId("alarm-next-countdown")).toContainText("00:05:00");

  await page.clock.runFor(300_300);
  await expect(page.getByTestId("alarm-ringing-overlay")).toBeVisible();
  await page.getByTestId("alarm-dismiss").click();
  await expect(page.getByTestId("alarm-ringing-overlay")).toBeHidden();
  await expect(page.getByTestId("alarm-next-card")).toContainText("ยังไม่มี Alarm ที่เปิดอยู่");

  await page.getByTestId("alarm-label").fill("เตือนรายวัน");
  await page.getByTestId("alarm-repeat").click();
  await page.getByRole("option", { name: "ทุกวัน" }).click();
  await page.getByTestId("alarm-save").click();
  await expect(page.getByTestId("alarm-list")).toContainText("เตือนรายวัน");
  await expect(page.getByTestId("alarm-list")).toContainText("ทั้งหมด 2/12");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#alarm-time");
    const label = document.querySelector<HTMLLabelElement>('label[for="alarm-time"]');
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: field && label ? Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-online-alarm-clock-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("เตือนรายวัน");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("online alarm remains balanced on dark mobile and appears in relevant profession pages", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.setViewportSize({ width: 390, height: 844 });

  for (const profession of ["project-operations", "education", "fitness-wellness", "office-admin", "freelancer-consultant"]) {
    await page.goto(`/professions/${profession}`);
    await expect(page.locator('a[href="/online-alarm-clock"]')).toBeVisible();
  }
  await page.goto("/categories/date-time");
  await expect(page.locator('a[href="/online-alarm-clock"]')).toBeVisible();
  await page.goto("/online-alarm-clock");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("alarm-current-time")).toBeVisible();
  await expect(page.getByTestId("alarm-save")).toBeVisible();

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    const panel = document.querySelector<HTMLElement>('[data-testid="alarm-clock-panel"]');
    const form = document.querySelector<HTMLElement>("#alarm-form-heading")?.closest("section");
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      panelFits: Boolean(panel && panel.getBoundingClientRect().right <= window.innerWidth),
      formFits: Boolean(form && form.getBoundingClientRect().right <= window.innerWidth),
    };
  });
  expect(browserState.overflow).toBe(false);
  expect(browserState.duplicateIds).toEqual([]);
  expect(browserState.panelFits).toBe(true);
  expect(browserState.formFits).toBe(true);
  expect(consoleErrors).toEqual([]);
});
