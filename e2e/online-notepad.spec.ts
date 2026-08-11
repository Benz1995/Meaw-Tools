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

test("online notepad autosaves multiple notes, searches, pins, and exports local files", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.clock.install({ time: new Date("2026-08-11T05:00:00.000Z") });

  await page.goto("/online-notepad");
  await page.evaluate(() => window.localStorage.removeItem("meaw-online-notepad-v1"));
  await page.reload();
  await expect(page).toHaveTitle(/Online Notepad with Autosave/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/online-notepad");

  await page.getByTestId("notepad-title").fill("แผนประชุมทีม");
  await page.getByTestId("notepad-content").fill("หัวข้อประชุมวันศุกร์\nตรวจงบประมาณและ QA checklist");
  await expect(page.getByTestId("notepad-summary")).toContainText("คำ");
  await page.clock.runFor(400);
  await expect(page.getByTestId("notepad-save-status")).toContainText("บันทึกแล้ว");

  await page.getByTestId("notepad-new").click();
  await page.getByTestId("notepad-title").fill("ไอเดียบทความ");
  await page.getByTestId("notepad-content").fill("Online notepad สำหรับทีมคอนเทนต์");
  await page.getByRole("button", { name: "ปักหมุด", exact: true }).click();
  await expect(page.getByTestId("notepad-summary")).toContainText("2");
  await page.getByTestId("notepad-search").fill("งบประมาณ");
  await expect(page.locator('[data-testid^="notepad-note-"]')).toHaveCount(1);
  await page.getByTestId("notepad-note-first-note").click();
  await expect(page.getByTestId("notepad-title")).toHaveValue("แผนประชุมทีม");

  const txtPromise = page.waitForEvent("download");
  await page.getByTestId("notepad-download-txt").click();
  const txtDownload = await txtPromise;
  expect(txtDownload.suggestedFilename()).toBe("แผนประชุมทีม.txt");
  expect(await readFile((await txtDownload.path())!, "utf8")).toContain("QA checklist");

  const markdownPromise = page.waitForEvent("download");
  await page.getByTestId("notepad-download-md").click();
  const markdownDownload = await markdownPromise;
  expect(markdownDownload.suggestedFilename()).toBe("แผนประชุมทีม.md");
  expect(await readFile((await markdownDownload.path())!, "utf8")).toContain("หัวข้อประชุมวันศุกร์");

  const backupPromise = page.waitForEvent("download");
  await page.getByTestId("notepad-export-json").click();
  const backupDownload = await backupPromise;
  const backup = JSON.parse(await readFile((await backupDownload.path())!, "utf8")) as { notes: Array<{ title: string }> };
  expect(backup.notes).toHaveLength(2);

  const layout = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    const list = document.querySelector<HTMLElement>('[aria-label="รายการโน้ต"]');
    const editor = document.querySelector<HTMLElement>('[aria-labelledby="notepad-editor-title"]');
    return {
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      listWidth: Math.round(list?.getBoundingClientRect().width ?? 0),
      editorWidth: Math.round(editor?.getBoundingClientRect().width ?? 0),
      viewport: document.documentElement.clientWidth,
      stored: window.localStorage.getItem("meaw-online-notepad-v1"),
    };
  });
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.overflow).toBe(false);
  expect(layout.listWidth).toBeGreaterThanOrEqual(270);
  if (layout.viewport >= 1024) expect(layout.editorWidth).toBeGreaterThan(layout.listWidth);
  else expect(layout.editorWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.stored).toContain("แผนประชุมทีม");

  await page.getByTestId("notepad-search").fill("");
  await page.clock.runFor(400);
  await expect(page.getByTestId("notepad-save-status")).toContainText("บันทึกแล้ว");
  await page.reload();
  await expect(page.getByTestId("notepad-summary")).toContainText("2");
  await expect(page.getByTestId("notepad-title")).toHaveValue("แผนประชุมทีม");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("online notepad imports UTF-8 text and stays usable in dark mobile profession flows", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("meaw-online-notepad-v1");
  });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/professions/content-creator");
  await expect(page.locator('a[href="/online-notepad"]')).toBeVisible();
  await page.goto("/categories/productivity");
  await expect(page.locator('a[href="/online-notepad"]')).toBeVisible();
  await page.goto("/online-notepad");
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.locator('input[aria-label="นำเข้า TXT หรือ Markdown"]').setInputFiles({
    name: "บันทึกภาคสนาม.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# สรุปงาน\n\nข้อมูลสำคัญอยู่ใน Browser เท่านั้น"),
  });
  await expect(page.getByTestId("notepad-title")).toHaveValue("บันทึกภาคสนาม");
  await expect(page.getByTestId("notepad-content")).toHaveValue(/สรุปงาน/);
  await expect(page.getByTestId("notepad-summary")).toContainText("2");

  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    editorWidth: Math.round(document.querySelector<HTMLElement>('[aria-labelledby="notepad-editor-title"]')?.getBoundingClientRect().width ?? 0),
    viewport: document.documentElement.clientWidth,
  }));
  expect(mobile.overflow).toBe(false);
  expect(mobile.editorWidth).toBeLessThanOrEqual(mobile.viewport);
  expect(consoleErrors).toEqual([]);
});
