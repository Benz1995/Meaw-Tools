import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

function hasExternalRequest(requests: string[], pageUrl: string) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    try { return new URL(requestUrl).origin !== pageOrigin; }
    catch { return !requestUrl.startsWith("blob:"); }
  });
}

test("random team generator balances names, exports results, and exposes complete SEO", async ({ context, page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/random-team-generator");
  await expect(page).toHaveTitle(/Random Team Generator & Group Maker/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/random-team-generator");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://meaw-tools.vercel.app/brand/meaw-cafe-hero.webp");
  await expect(page.getByRole("heading", { level: 1, name: /Random Team Generator & Group Maker/ })).toBeVisible();
  await expect(page.getByTestId("team-empty-state")).toBeVisible();

  const structuredTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredTypes.some((value) => value.includes('"@type":"WebApplication"'))).toBe(true);
  expect(structuredTypes.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true);

  await page.getByTestId("team-mode-balanced").click();
  await page.getByTestId("team-names").fill("Alpha,5\nBravo,5\nCharlie\nDelta\nEcho,1\nFoxtrot,1\nalpha,4");
  await expect(page.getByTestId("team-participant-count")).toContainText("6/500");
  await page.getByTestId("team-split-value").fill("2");
  await page.getByTestId("team-prefix").fill("กลุ่ม");
  await page.getByTestId("team-generate").click();

  await expect(page.getByTestId("team-results")).toBeVisible();
  await expect(page.getByTestId("generated-team")).toHaveCount(2);
  await expect(page.getByTestId("team-balance-summary")).toContainText("3 คน/ทีม");
  await expect(page.getByTestId("team-skill-difference")).toHaveText("0.00");
  await expect(page.getByTestId("team-results")).toContainText("ตัดชื่อซ้ำ 1 รายการ");
  await expect(page.getByTestId("team-results")).toContainText("ใช้คะแนนเริ่มต้น 3 จำนวน 2 คน");

  const generatedNames = await page.getByTestId("team-grid").locator("li > span:nth-child(2)").allTextContents();
  expect(generatedNames.sort()).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"].sort());

  await page.getByTestId("team-copy").click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("กลุ่ม 1");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("team-csv").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-random-teams.csv");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const csv = await readFile(downloadPath!, "utf8");
  expect(csv).toContain("Team,Member number,Member,Skill,Used default skill,Team members,Team average skill");
  expect(csv).toMatch(/,(Charlie|Delta),3,Yes,/);
  expect(csv).toContain("Alpha");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLTextAreaElement>("#team-participants");
    const label = document.querySelector<HTMLLabelElement>('label[for="team-participants"]');
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: field && label ? Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);

  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  const printState = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>('[data-testid="team-results"]');
    const actions = document.querySelector<HTMLElement>('[data-testid="team-copy"]')?.parentElement?.parentElement;
    const card = document.querySelector<HTMLElement>('[data-testid="generated-team"]');
    return {
      surfaceVisibility: surface ? getComputedStyle(surface).visibility : "missing",
      surfacePosition: surface ? getComputedStyle(surface).position : "missing",
      actionsDisplay: actions ? getComputedStyle(actions).display : "missing",
      cardBreak: card ? getComputedStyle(card).breakInside : "missing",
    };
  });
  expect(printState).toEqual({ surfaceVisibility: "visible", surfacePosition: "absolute", actionsDisplay: "none", cardBreak: "avoid" });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("team-names")).toHaveValue("");
  await expect(page.getByTestId("team-empty-state")).toBeVisible();
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("random team generator stays balanced on dark mobile and appears in relevant directories", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  for (const profession of ["business-owner", "human-resources", "project-operations", "education", "fitness-wellness", "office-admin"]) {
    await page.goto(`/professions/${profession}`);
    await expect(page.locator('a[href="/random-team-generator"]')).toBeVisible();
  }
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/random-team-generator"]')).toBeVisible();

  await page.goto("/random-team-generator");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("team-split-size").click();
  await page.getByTestId("team-names").fill("หนึ่ง\nสอง\nสาม\nสี่\nห้า\nหก\nเจ็ด");
  await page.getByTestId("team-split-value").fill("3");
  await page.getByTestId("team-generate").click();
  await expect(page.getByTestId("generated-team")).toHaveCount(3);
  await expect(page.getByTestId("team-balance-summary")).toContainText("2–3 คน");

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="generated-team"]'));
    const form = document.querySelector<HTMLElement>("#team-generator-form-heading")?.closest("form");
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      cardsFit: cards.every((card) => card.getBoundingClientRect().right <= window.innerWidth),
      formFits: Boolean(form && form.getBoundingClientRect().right <= window.innerWidth),
      memberCounts: cards.map((card) => card.querySelectorAll("li").length).sort(),
    };
  });
  expect(browserState.overflow).toBe(false);
  expect(browserState.duplicateIds).toEqual([]);
  expect(browserState.cardsFit).toBe(true);
  expect(browserState.formFits).toBe(true);
  expect(browserState.memberCounts).toEqual([2, 2, 3]);
  expect(consoleErrors).toEqual([]);
});
