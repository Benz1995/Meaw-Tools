import { expect, test } from "@playwright/test";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3100"}`;

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    try { return new URL(requestUrl).origin !== pageOrigin; }
    catch { return !requestUrl.startsWith("blob:"); }
  });
}

async function fillNumber(page: import("@playwright/test").Page, testId: string, value: string) {
  const field = page.getByTestId(testId);
  await field.selectText();
  await field.fill(value);
}

test("interval timer advances accurately, saves, shares, and exposes complete SEO", async ({ context, page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/interval-timer");
  await page.evaluate(() => window.localStorage.removeItem("meaw-interval-timer-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Interval Timer & Tabata Timer Online/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/interval-timer");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");
  await page.getByTestId("interval-fullscreen").click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-testid") ?? "")).toBe("interval-timer-panel");
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);

  await page.getByTestId("interval-program-name").fill("HIIT ทดสอบ 2 รอบ");
  await fillNumber(page, "interval-prepare", "1");
  await fillNumber(page, "interval-work", "2");
  await fillNumber(page, "interval-rest", "1");
  await fillNumber(page, "interval-rounds", "2");
  await fillNumber(page, "interval-cycles", "1");
  await fillNumber(page, "interval-cycle-rest", "0");
  await fillNumber(page, "interval-cooldown", "1");
  await page.getByTestId("interval-sound").click();

  await page.getByTestId("interval-save").click();
  await expect(page.getByTestId("interval-saved-programs")).toContainText("HIIT ทดสอบ 2 รอบ");
  await page.getByTestId("interval-share").click();
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  const shared = new URL(sharedUrl);
  expect(shared.pathname).toBe("/interval-timer");
  expect(shared.searchParams.get("work")).toBe("2");
  expect(shared.searchParams.get("rounds")).toBe("2");
  expect(shared.searchParams.get("sound")).toBe("0");

  await page.getByTestId("interval-start").click();
  await expect(page.getByTestId("interval-phase")).toHaveText("เตรียมตัว");
  await expect(page.getByTestId("interval-status")).toHaveText("กำลังจับเวลา");
  await page.clock.runFor(1_100);
  await expect(page.getByTestId("interval-phase")).toHaveText("ลุย!");
  await expect(page.getByTestId("interval-position")).toContainText("รอบ 1/2");
  await page.clock.runFor(2_100);
  await expect(page.getByTestId("interval-phase")).toHaveText("พัก");
  await page.clock.runFor(1_100);
  await expect(page.getByTestId("interval-phase")).toHaveText("ลุย!");
  await expect(page.getByTestId("interval-position")).toContainText("รอบ 2/2");
  await page.clock.runFor(2_100);
  await expect(page.getByTestId("interval-phase")).toHaveText("คูลดาวน์");
  await page.clock.runFor(1_100);
  await expect(page.getByTestId("interval-phase")).toHaveText("เสร็จแล้ว");
  await expect(page.getByTestId("interval-status")).toHaveText("เสร็จแล้ว");
  await expect(page.getByTestId("interval-display")).toHaveText("00:00");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#interval-work");
    const label = document.querySelector<HTMLLabelElement>('label[for="interval-work"]');
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: field && label ? Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-interval-timer-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("HIIT ทดสอบ 2 รอบ");

  await page.goto(sharedUrl);
  await expect(page.getByTestId("interval-program-name")).toHaveValue("HIIT ทดสอบ 2 รอบ");
  await expect(page.getByTestId("interval-work")).toHaveValue("2");
  await expect(page.getByTestId("interval-rounds")).toHaveValue("2");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("interval timer pauses, catches up after background time, and stays balanced on dark mobile profession flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem("meaw-interval-timer-v1", JSON.stringify({
      settings: { name: "Mobile HIIT", prepareSeconds: 0, workSeconds: 5, restSeconds: 2, rounds: 3, cycles: 1, cycleRestSeconds: 0, cooldownSeconds: 0, soundEnabled: false, keepAwake: false },
      savedPrograms: [],
    }));
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/professions/fitness-wellness");
  await expect(page.getByRole("heading", { level: 1, name: "เครื่องมือสำหรับฟิตเนส โค้ช และสุขภาพทั่วไป" })).toBeVisible();
  await expect(page.locator('a[href="/interval-timer"]')).toBeVisible();
  await page.goto("/professions/education");
  await expect(page.locator('a[href="/interval-timer"]')).toBeVisible();
  await page.goto("/categories/date-time");
  await expect(page.locator('a[href="/interval-timer"]')).toBeVisible();
  await page.goto("/interval-timer");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("interval-program-name")).toHaveValue("Mobile HIIT");

  await page.getByTestId("interval-start").click();
  await page.clock.runFor(1_200);
  await page.getByTestId("interval-pause").click();
  const paused = await page.getByTestId("interval-display").textContent();
  await page.clock.runFor(6_000);
  await expect(page.getByTestId("interval-display")).toHaveText(paused ?? "");
  await page.keyboard.press("Space");
  await page.clock.runFor(4_000);
  await expect(page.getByTestId("interval-phase")).toHaveText("พัก");
  await page.clock.runFor(8_000);
  await expect(page.getByTestId("interval-position")).toContainText("รอบ 3/3");

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    const panel = document.querySelector<HTMLElement>('[data-testid="interval-timer-panel"]');
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      panelFits: Boolean(panel && panel.getBoundingClientRect().right <= window.innerWidth),
    };
  });
  expect(browserState.overflow).toBe(false);
  expect(browserState.duplicateIds).toEqual([]);
  expect(browserState.panelFits).toBe(true);
  expect(consoleErrors).toEqual([]);
});
