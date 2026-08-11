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

test("expense tracker records, edits, filters, persists, and exports safe local data", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/expense-tracker");
  await page.evaluate(() => window.localStorage.removeItem("meaw-expense-tracker-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Expense Tracker Online Free/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/expense-tracker");

  await page.getByTestId("expense-date").fill("2026-08-10");
  await page.getByTestId("expense-amount").fill("125.50");
  await page.getByTestId("expense-description").fill("อาหารกลางวัน");
  await page.getByTestId("expense-note").fill("ร้านใกล้ออฟฟิศ");
  await page.getByTestId("expense-save").click();
  await expect(page.getByTestId("expense-expense-total")).toContainText("125.50");

  await page.getByTestId("expense-type-income").click();
  await page.getByTestId("expense-date").fill("2026-08-01");
  await page.getByTestId("expense-amount").fill("30000");
  await page.getByTestId("expense-description").fill("เงินเดือน");
  await page.getByTestId("expense-save").click();
  await expect(page.getByTestId("expense-income-total")).toContainText("30,000.00");
  await expect(page.getByTestId("expense-balance-total")).toContainText("29,874.50");
  await expect(page.locator('article[data-testid^="expense-transaction-"]')).toHaveCount(2);

  await page.getByRole("button", { name: "แก้ไข อาหารกลางวัน" }).click();
  await page.getByTestId("expense-amount").fill("150");
  await page.getByTestId("expense-save").click();
  await expect(page.getByTestId("expense-expense-total")).toContainText("150.00");

  await page.getByTestId("expense-filter").click();
  await page.getByRole("option", { name: "เฉพาะรายจ่าย" }).click();
  await expect(page.locator('article[data-testid^="expense-transaction-"]')).toHaveCount(1);
  await page.getByTestId("expense-search").fill("ออฟฟิศ");
  await expect(page.getByText("อาหารกลางวัน", { exact: true })).toBeVisible();

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("expense-export-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-expenses-2026-08.csv");
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv).toContain("อาหารกลางวัน");
  expect(csv).toContain('"150.00"');

  const jsonPromise = page.waitForEvent("download");
  await page.getByTestId("expense-export-json").click();
  const jsonDownload = await jsonPromise;
  expect(jsonDownload.suggestedFilename()).toBe("meaw-expense-tracker-backup-2026-08-11.json");
  const backup = JSON.parse(await readFile((await jsonDownload.path())!, "utf8")) as { currency: string; transactions: unknown[] };
  expect(backup.currency).toBe("THB");
  expect(backup.transactions).toHaveLength(2);

  const layout = await page.evaluate(() => {
    const amount = document.querySelector<HTMLInputElement>("#expense-amount");
    const label = document.querySelector<HTMLLabelElement>('label[for="expense-amount"]');
    if (!amount || !label) throw new Error("Expense amount layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(amount.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-expense-tracker-v1"),
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(8);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.stored).toContain("อาหารกลางวัน");

  await page.reload();
  await expect(page.getByTestId("expense-expense-total")).toContainText("150.00");
  await expect(page.locator('article[data-testid^="expense-transaction-"]')).toHaveCount(2);
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("expense tracker imports sanitized JSON and stays balanced in dark mobile category and profession flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("dialog", (dialog) => void dialog.accept());
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-expense-tracker-v1");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/professions/finance-accounting");
  await expect(page.locator('a[href="/expense-tracker"]')).toBeVisible();
  await page.goto("/professions/business-owner");
  await expect(page.locator('a[href="/expense-tracker"]')).toBeVisible();
  await page.goto("/categories/business");
  await expect(page.locator('a[href="/expense-tracker"]')).toBeVisible();
  await page.goto("/expense-tracker");
  await expect(page.locator("html")).toHaveClass(/dark/);

  const imported = JSON.stringify({
    currency: "THB",
    transactions: [
      { id: "safe", date: "2026-08-09", type: "expense", amountMinor: 8800, category: "salary", description: "=HYPERLINK(\"bad\")", note: "+cmd", createdAt: 1754800000000, updatedAt: 1754800000000 },
      { id: "safe", date: "2026-08-09", type: "expense", amountMinor: 9900, category: "food", description: "duplicate", note: "", createdAt: 1754800000000, updatedAt: 1754800000000 },
      { id: "future", date: "2099-01-01", type: "income", amountMinor: 50000, category: "salary", description: "รายรับอนาคต", note: "", createdAt: 1754800000000, updatedAt: 1754800000000 },
      { id: "invalid", date: "2026-08-01", type: "expense", amountMinor: -1, category: "food", description: "ยอดผิด", note: "", createdAt: 1754800000000, updatedAt: 1754800000000 },
    ],
  });
  await page.locator('input[aria-label="นำเข้าไฟล์สำรอง Expense Tracker"]').setInputFiles({ name: "expense-backup.json", mimeType: "application/json", buffer: Buffer.from(imported) });
  await expect(page.locator('article[data-testid^="expense-transaction-"]')).toHaveCount(2);
  await expect(page.getByText("รายรับอนาคต", { exact: true })).toBeVisible();
  await expect(page.getByTestId("expense-category-breakdown")).toContainText("อื่น ๆ");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("expense-export-csv").click();
  const csv = await readFile((await (await csvPromise).path())!, "utf8");
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain("'+cmd");

  const browserState = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    stored: window.localStorage.getItem("meaw-expense-tracker-v1"),
  }));
  expect(browserState.overflow).toBe(false);
  expect(browserState.stored).not.toContain("duplicate");
  expect(browserState.stored).not.toContain("ยอดผิด");
  expect(browserState.stored).not.toContain("2099-01-01");
  expect(consoleErrors).toEqual([]);
});
