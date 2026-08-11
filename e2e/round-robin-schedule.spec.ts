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

test("round robin generator schedules, scores, exports, persists, and exposes complete SEO", async ({
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
    if (!window.sessionStorage.getItem("round-robin-e2e-initialized")) {
      window.localStorage.removeItem("meaw-round-robin-schedule-v1");
      window.sessionStorage.setItem("round-robin-e2e-initialized", "1");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/round-robin-schedule-generator");
  await expect(page).toHaveTitle(/Round Robin Schedule Generator/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://meaw-tools.vercel.app/round-robin-schedule-generator",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Round Robin Schedule Generator/,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("round-robin-empty-state")).toBeVisible();

  const structuredTypes = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(
    structuredTypes.some((value) => value.includes('"@type":"WebApplication"')),
  ).toBe(true);
  expect(
    structuredTypes.some((value) => value.includes('"@type":"FAQPage"')),
  ).toBe(true);
  expect(
    structuredTypes.some((value) => value.includes('"@type":"BreadcrumbList"')),
  ).toBe(true);

  await page.getByRole("button", { name: "ตัวอย่าง" }).click();
  await expect(page.getByTestId("round-robin-participant-count")).toContainText(
    "6/24",
  );
  await page.getByTestId("round-robin-generate").click();

  await expect(page.getByTestId("round-robin-results")).toBeVisible();
  await expect(page.getByTestId("round-robin-progress")).toContainText("0/15");
  await expect(
    page.getByTestId("round-robin-rounds").locator(":scope > section"),
  ).toHaveCount(5);
  await expect(page.locator('[data-testid^="round-robin-match-"]')).toHaveCount(
    15,
  );

  await page.getByTestId("round-robin-score-home-leg1-r1-m1").fill("2");
  await page.getByTestId("round-robin-score-away-leg1-r1-m1").fill("1");
  await expect(page.getByTestId("round-robin-progress")).toContainText("1/15");
  await page.getByTestId("round-robin-view-standings").click();
  await expect(
    page.getByTestId("round-robin-standings").locator("tbody tr").first(),
  ).toContainText("3");

  await page.getByTestId("round-robin-copy").click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Meaw Cafe League");

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("round-robin-csv").click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-round-robin-schedule.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"Round","Leg","Date","Start","End","Court"');
  expect(csv).toContain('"2","1","completed"');

  const icsDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("round-robin-ics").click();
  const icsDownload = await icsDownloadPromise;
  expect(icsDownload.suggestedFilename()).toBe("meaw-round-robin-schedule.ics");
  const icsPath = await icsDownload.path();
  expect(icsPath).toBeTruthy();
  const ics = await readFile(icsPath!, "utf8");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(15);

  const layout = await page.evaluate(() => {
    const fields = ["round-robin-participants", "round-robin-courts"];
    const labelGaps = fields.map((id) => {
      const field = document.querySelector<HTMLElement>(`#${id}`);
      const label = document.querySelector<HTMLLabelElement>(
        `label[for="${id}"]`,
      );
      return field && label
        ? Math.round(
            field.getBoundingClientRect().top -
              label.getBoundingClientRect().bottom,
          )
        : 0;
    });
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map(
      (element) => element.id,
    );
    return {
      labelGaps,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGaps.every((gap) => gap >= 8)).toBe(true);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);

  await page.getByTestId("round-robin-view-schedule").click();
  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  const printState = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>(
      '[data-testid="round-robin-results"]',
    );
    const form = document.querySelector<HTMLElement>(
      '[aria-labelledby="round-robin-form-heading"]',
    );
    const card = document.querySelector<HTMLElement>(
      '[data-testid^="round-robin-match-"]',
    );
    return {
      surfaceVisibility: surface
        ? getComputedStyle(surface).visibility
        : "missing",
      surfacePosition: surface ? getComputedStyle(surface).position : "missing",
      formDisplay: form ? getComputedStyle(form).display : "missing",
      cardBreak: card ? getComputedStyle(card).breakInside : "missing",
    };
  });
  expect(printState).toEqual({
    surfaceVisibility: "visible",
    surfacePosition: "absolute",
    formDisplay: "none",
    cardBreak: "avoid",
  });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("round-robin-results")).toBeVisible();
  await expect(page.getByTestId("round-robin-progress")).toContainText("1/15");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("round robin generator fits dark mobile and appears in relevant directories", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-round-robin-schedule-v1");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  for (const profession of [
    "business-owner",
    "human-resources",
    "project-operations",
    "education",
    "fitness-wellness",
    "office-admin",
  ]) {
    await page.goto(`/professions/${profession}`);
    await expect(
      page.locator('a[href="/round-robin-schedule-generator"]'),
    ).toBeVisible();
  }
  await page.goto("/categories/productivity");
  await expect(
    page.locator('a[href="/round-robin-schedule-generator"]'),
  ).toBeVisible();

  await page.goto("/round-robin-schedule-generator");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("round-robin-names").fill("หนึ่ง\nสอง\nสาม\nสี่\nห้า");
  await page.getByTestId("round-robin-generate").click();
  await expect(page.getByTestId("round-robin-progress")).toContainText("0/10");
  await expect(page.getByText(/^พัก:/)).toHaveCount(5);

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map(
      (element) => element.id,
    );
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid^="round-robin-match-"]',
      ),
    );
    const form = document
      .querySelector<HTMLElement>("#round-robin-form-heading")
      ?.closest("form");
    return {
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      cardsFit: cards.every(
        (card) => card.getBoundingClientRect().right <= window.innerWidth,
      ),
      formFits: Boolean(
        form && form.getBoundingClientRect().right <= window.innerWidth,
      ),
    };
  });
  expect(browserState).toEqual({
    overflow: false,
    duplicateIds: [],
    cardsFit: true,
    formFits: true,
  });
  expect(consoleErrors).toEqual([]);
});
