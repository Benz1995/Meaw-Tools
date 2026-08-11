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

test("flashcard maker creates, studies, edits, exports, imports, persists, prints, and exposes SEO", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("flashcard-maker-e2e-initialized")) {
      window.localStorage.removeItem("meaw-flashcard-maker-v1");
      window.sessionStorage.setItem("flashcard-maker-e2e-initialized", "1");
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/flashcard-maker");
  await expect(page).toHaveTitle(/Flashcard Maker & Printable Flashcards/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/flashcard-maker");
  await expect(page.getByRole("heading", { level: 1, name: /Flashcard Maker/ })).toBeVisible();
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((value) => value.includes('"@type":"WebApplication"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true);
  expect(structuredData.some((value) => value.includes('"@type":"BreadcrumbList"'))).toBe(true);

  await page.getByTestId("flashcard-sample").click();
  await expect(page.getByTestId("flashcard-result")).toContainText("8 ใบ");
  await expect(page.getByTestId("flashcard-study-card")).toContainText("猫");
  await page.getByTestId("flashcard-study-card").click();
  await expect(page.getByTestId("flashcard-study-card")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("flashcard-study-card")).toContainText("แมว");
  await page.getByTestId("flashcard-known").click();
  await expect(page.getByTestId("flashcard-result")).toContainText("จำได้ 1");
  await page.getByTestId("flashcard-retry").click();
  await expect(page.getByTestId("flashcard-result")).toContainText("ทบทวน 1");

  await page.locator("#flashcard-front").fill("=SUM(1,1)");
  await page.locator("#flashcard-back").fill("@answer");
  await page.getByTestId("flashcard-save-card").click();
  await expect(page.getByTestId("flashcard-list-item")).toHaveCount(9);

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("flashcard-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-flashcards.csv");
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"\'=SUM(1,1)"');
  expect(csv).toContain('"\'@answer"');

  const tsvPromise = page.waitForEvent("download");
  await page.getByTestId("flashcard-tsv").click();
  expect((await tsvPromise).suggestedFilename()).toBe("meaw-flashcards.tsv");

  const jsonPromise = page.waitForEvent("download");
  await page.getByTestId("flashcard-json").click();
  const jsonDownload = await jsonPromise;
  const jsonPath = await jsonDownload.path();
  expect(jsonDownload.suggestedFilename()).toBe("meaw-flashcards.json");
  expect(jsonPath).toBeTruthy();

  const svgPromise = page.waitForEvent("download");
  await page.getByTestId("flashcard-svg").click();
  const svgDownload = await svgPromise;
  expect(svgDownload.suggestedFilename()).toMatch(/^meaw-flashcard-\d+\.svg$/);
  expect(await readFile((await svgDownload.path())!, "utf8")).toContain('<svg xmlns="http://www.w3.org/2000/svg"');

  const pngPromise = page.waitForEvent("download");
  await page.getByTestId("flashcard-png").click();
  const pngDownload = await pngPromise;
  expect(pngDownload.suggestedFilename()).toMatch(/^meaw-flashcard-\d+\.png$/);
  expect((await readFile((await pngDownload.path())!)).length).toBeGreaterThan(10_000);

  const layout = await page.evaluate(() => {
    const fields = ["flashcard-title", "flashcard-source", "flashcard-front", "flashcard-back", "flashcard-print-mode", "flashcard-per-page"];
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
  const singlePrint = await page.evaluate(() => ({
    surface: getComputedStyle(document.querySelector<HTMLElement>(".flashcard-print-surface")!).display,
    form: getComputedStyle(document.querySelector<HTMLElement>(".flashcard-maker-no-print")!).display,
    pages: document.querySelectorAll(".flashcard-print-page").length,
    firstPageColumns: getComputedStyle(document.querySelector<HTMLElement>(".flashcard-print-page")!).gridTemplateColumns,
  }));
  expect(singlePrint.surface).toBe("block");
  expect(singlePrint.form).toBe("none");
  expect(singlePrint.pages).toBe(3);
  expect(singlePrint.firstPageColumns.split(" ")).toHaveLength(2);
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.locator("#flashcard-print-mode").selectOption("duplex");
  await page.emulateMedia({ media: "print", reducedMotion: "reduce" });
  await expect(page.locator(".flashcard-print-page")).toHaveCount(6);
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });

  await page.reload();
  await expect(page.getByTestId("flashcard-list-item")).toHaveCount(9);
  await page.getByTestId("flashcard-clear").click();
  await expect(page.getByTestId("flashcard-result")).toHaveCount(0);
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "meaw-flashcards.json",
    mimeType: "application/json",
    buffer: await readFile(jsonPath!),
  });
  await expect(page.getByTestId("flashcard-list-item")).toHaveCount(9);

  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("flashcard maker stays balanced in dark mobile and appears in relevant profession directories", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => window.localStorage.removeItem("meaw-flashcard-maker-v1"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/flashcard-maker");
  await page.getByRole("button", { name: "สลับโหมดสี" }).click();
  await page.getByTestId("flashcard-sample").click();

  const mobileState = await page.evaluate(() => ({
    dark: document.documentElement.classList.contains("dark"),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    resultWidth: Math.round(document.querySelector<HTMLElement>('[data-testid="flashcard-result"]')?.getBoundingClientRect().width ?? 0),
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(mobileState.dark).toBe(true);
  expect(mobileState.overflow).toBe(false);
  expect(mobileState.resultWidth).toBeLessThanOrEqual(mobileState.viewportWidth);
  await page.getByLabel("ค้นหาบัตรคำ").fill("ありがとう");
  await expect(page.getByTestId("flashcard-list-item")).toHaveCount(1);

  for (const path of [
    "/categories/productivity",
    "/professions/education",
    "/professions/developer-it",
    "/professions/human-resources",
    "/professions/content-creator",
    "/professions/fitness-wellness",
    "/online-notepad",
  ]) {
    await page.goto(path);
    await expect(page.locator('a[href="/flashcard-maker"]').last()).toBeVisible();
  }
  expect(consoleErrors).toEqual([]);
});
