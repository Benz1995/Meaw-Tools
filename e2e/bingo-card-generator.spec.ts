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

test("bingo generator creates, plays, calls, exports, imports, persists, and exposes SEO", async ({
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
    if (!window.sessionStorage.getItem("bingo-e2e-initialized")) {
      window.localStorage.removeItem("meaw-bingo-card-generator-v1");
      window.sessionStorage.setItem("bingo-e2e-initialized", "1");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/bingo-card-generator");
  await expect(page).toHaveTitle(/Bingo Card Generator/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://meaw-tools.vercel.app/bingo-card-generator",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: /Bingo Card Generator/ }),
  ).toBeVisible();
  await expect(page.getByTestId("bingo-empty-state")).toBeVisible();

  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(
    structuredData.some((value) => value.includes('"@type":"WebApplication"')),
  ).toBe(true);
  expect(
    structuredData.some((value) => value.includes('"@type":"FAQPage"')),
  ).toBe(true);
  expect(
    structuredData.some((value) => value.includes('"@type":"BreadcrumbList"')),
  ).toBe(true);

  await page.getByRole("button", { name: "ตัวอย่าง" }).click();
  await expect(page.getByTestId("bingo-item-count")).toContainText("32/500");
  await page.getByTestId("bingo-generate").click();
  await expect(page.getByTestId("bingo-results")).toBeVisible();
  await expect(page.getByText(/12 การ์ด • 5×5 • 32 รายการ/)).toBeVisible();
  await expect(
    page.getByTestId("bingo-card-1").getByRole("gridcell"),
  ).toHaveCount(25);

  for (let index = 0; index < 5; index += 1) {
    await page.getByTestId(`bingo-cell-1-${index}`).click();
  }
  await expect(page.getByText("BINGO!", { exact: true })).toBeVisible();

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("bingo-png").click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("meaw-bingo-card-1.png");
  expect(await pngDownload.path()).toBeTruthy();

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("bingo-csv").click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-bingo-cards.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Card","Row","Column","Column Label","Value","Free"');

  await page.getByTestId("bingo-view-caller").click();
  await page.getByTestId("bingo-draw-call").click();
  const firstCall = await page.getByTestId("bingo-current-call").textContent();
  expect(firstCall?.trim()).toBeTruthy();
  await page.getByTestId("bingo-draw-call").click();
  await expect(page.getByTestId("bingo-view-caller")).toContainText("2/32");

  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("bingo-json").click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe("meaw-bingo-game.json");
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).toBeTruthy();

  const layout = await page.evaluate(() => {
    const fields = [
      "bingo-title",
      "bingo-items",
      "bingo-free-label",
      "bingo-card-count",
      "bingo-cards-per-page",
      "bingo-seed",
    ];
    const labelGaps = fields.map((id) => {
      const field = document.querySelector<HTMLElement>(`#${id}`);
      const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
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

  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  const printState = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>(
      '[data-testid="bingo-results"]',
    )?.closest<HTMLElement>(".bingo-print-surface");
    const form = document.querySelector<HTMLElement>(
      '[aria-labelledby="bingo-form-heading"]',
    );
    const deck = document.querySelector<HTMLElement>(
      '[data-testid="bingo-print-deck"]',
    );
    const card = deck?.querySelector<HTMLElement>(".bingo-print-card");
    return {
      surfaceVisibility: surface ? getComputedStyle(surface).visibility : "missing",
      surfacePosition: surface ? getComputedStyle(surface).position : "missing",
      formDisplay: form ? getComputedStyle(form).display : "missing",
      deckDisplay: deck ? getComputedStyle(deck).display : "missing",
      cardBreak: card ? getComputedStyle(card).breakInside : "missing",
    };
  });
  expect(printState).toEqual({
    surfaceVisibility: "visible",
    surfacePosition: "absolute",
    formDisplay: "none",
    deckDisplay: "grid",
    cardBreak: "avoid",
  });
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("bingo-results")).toBeVisible();
  await expect(page.getByTestId("bingo-view-caller")).toContainText("2/32");

  await page.getByRole("button", { name: "ล้างทั้งหมด" }).click();
  await expect(page.getByTestId("bingo-empty-state")).toBeVisible();
  await page.getByTestId("bingo-import-file").setInputFiles(jsonPath!);
  await expect(page.getByTestId("bingo-results")).toBeVisible();
  await page.getByTestId("bingo-view-caller").click();
  await expect(page.getByTestId("bingo-view-caller")).toContainText("2/32");

  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("bingo generator fits dark mobile, handles 75-ball, and appears in directories", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-bingo-card-generator-v1");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  for (const profession of [
    "digital-marketing",
    "business-owner",
    "human-resources",
    "project-operations",
    "content-creator",
    "education",
    "office-admin",
  ]) {
    await page.goto(`/professions/${profession}`);
    await expect(page.locator('a[href="/bingo-card-generator"]')).toBeVisible();
  }
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/bingo-card-generator"]')).toBeVisible();

  await page.goto("/bingo-card-generator");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByTestId("bingo-mode-classic").click();
  await page.getByTestId("bingo-card-count").fill("3");
  await page.getByTestId("bingo-generate").click();
  await expect(page.getByText(/3 การ์ด • 5×5 • 75-ball/)).toBeVisible();
  await expect(
    page.getByTestId("bingo-card-1").getByRole("gridcell"),
  ).toHaveCount(25);
  await page.getByTestId("bingo-view-caller").click();
  await page.getByTestId("bingo-draw-call").click();
  await expect(page.getByTestId("bingo-view-caller")).toContainText("1/75");

  const browserState = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map(
      (element) => element.id,
    );
    const form = document.querySelector<HTMLElement>(
      '[aria-labelledby="bingo-form-heading"]',
    );
    const result = document.querySelector<HTMLElement>(
      '[data-testid="bingo-results"]',
    );
    return {
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      formFits: Boolean(
        form && form.getBoundingClientRect().right <= window.innerWidth,
      ),
      resultFits: Boolean(
        result && result.getBoundingClientRect().right <= window.innerWidth,
      ),
    };
  });
  expect(browserState).toEqual({
    overflow: false,
    duplicateIds: [],
    formFits: true,
    resultFits: true,
  });
  expect(consoleErrors).toEqual([]);
});
