import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { HEIC_SAMPLE_BASE64 } from "@/lib/tools/heic-sample";

const testOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3100"}`;

function hasExternalRequest(requests: string[], pageUrl: string, allowedSchemes: readonly string[] = ["blob:"]) {
  const pageOrigin = new URL(pageUrl).origin;
  return requests.some((requestUrl) => {
    if (allowedSchemes.some((scheme) => requestUrl.startsWith(scheme))) return false;
    try {
      return new URL(requestUrl).origin !== pageOrigin;
    } catch {
      return true;
    }
  });
}

const toolRoutes = [
  ["json-formatter", "JSON Formatter"],
  ["json-validator", "JSON Validator"],
  ["sql-formatter", "SQL Formatter"],
  ["jwt-decoder", "JWT Decoder"],
  ["uuid-generator", "UUID Generator"],
  ["timestamp-converter", "Timestamp Converter"],
  ["buddhist-year-converter", "Buddhist Year Converter"],
  ["base64", "Base64 Encoder / Decoder"],
  ["url-encoder", "URL Encoder / Decoder"],
  ["utm-builder", "UTM Link Builder"],
  ["regex-tester", "Regex Tester"],
  ["diff-checker", "Text Diff Checker"],
  ["cron-generator", "Cron Generator"],
  ["markdown-table-generator", "Markdown Table Generator"],
  ["html-table-generator", "HTML Table Generator"],
  ["hash-generator", "Hash Generator"],
  ["word-counter", "Word Counter"],
  ["word-cloud-generator", "Word Cloud Generator"],
  ["text-cleaner", "Text Cleaner"],
  ["csv-to-excel", "CSV to Excel Converter"],
  ["excel-to-csv", "Excel to CSV Converter"],
  ["csv-cleaner", "CSV Cleaner & Duplicate Finder"],
  ["resume-builder", "Resume Builder ไทย/English"],
  ["email-signature-generator", "Email Signature Generator for Gmail & Outlook"],
  ["typing-test", "Typing Test"],
  ["special-characters", "Special Characters & Fancy Text"],
  ["text-to-speech", "Text to Speech Reader"],
  ["grade-calculator", "Grade Calculator"],
  ["percentage-calculator", "Percentage Calculator"],
  ["vat-calculator", "VAT Calculator Thailand"],
  ["bill-split-calculator", "Bill Split & Shared Expense Calculator"],
  ["budget-calculator", "Budget Calculator & 50/30/20 Planner"],
  ["roas-calculator", "ROAS & Break-even ROAS Calculator"],
  ["fuel-cost-calculator", "Fuel Cost Calculator"],
  ["unit-converter", "Unit Converter"],
  ["unit-price-comparison-calculator", "Unit Price Comparison Calculator"],
  ["date-calculator", "Date Calculator"],
  ["business-days-calculator", "Business Days Calculator"],
  ["working-hours-calculator", "Working Hours Calculator"],
  ["shift-pattern-calculator", "Shift Pattern Calculator"],
  ["hourly-rate-calculator", "Hourly Rate Calculator"],
  ["meeting-cost-calculator", "Meeting Cost Calculator"],
  ["billable-hours-calculator", "Billable Hours Calculator"],
  ["project-cost-calculator", "Project Cost & Profit Calculator"],
  ["team-capacity-calculator", "Team Capacity & Workload Calculator"],
  ["labor-cost-calculator", "Labor Cost & Employee Cost Calculator"],
  ["sales-commission-calculator", "Sales Commission Calculator"],
  ["safety-stock-calculator", "Safety Stock & Reorder Point Calculator"],
  ["eoq-calculator", "EOQ & Quantity Discount Calculator"],
  ["wholesale-price-calculator", "Wholesale & Retail Price Calculator"],
  ["inventory-turnover-calculator", "Inventory Turnover & Inventory Days Calculator"],
  ["cost-of-goods-sold-calculator", "Cost of Goods Sold (COGS) Calculator"],
  ["food-cost-calculator", "Food Cost & Recipe Cost Calculator"],
  ["drink-cost-calculator", "Drink, Cocktail & Liquor Cost Calculator"],
  ["coffee-cost-calculator", "Coffee Cost Calculator"],
  ["coffee-roasting-calculator", "Coffee Roasting Calculator"],
  ["break-even-calculator", "Break-even Calculator"],
  ["payback-period-calculator", "Payback Period Calculator"],
  ["irr-calculator", "IRR & MIRR Calculator"],
  ["xirr-calculator", "XIRR & XNPV Calculator"],
  ["compound-interest-calculator", "Compound Interest & Savings Goal Calculator"],
  ["debt-payoff-calculator", "Debt Snowball & Avalanche Calculator"],
  ["jpg-to-pdf", "JPG to PDF Converter"],
  ["qr-code-generator", "QR Code Generator"],
  ["barcode-generator", "Barcode Generator"],
  ["qr-code-scanner", "QR Code Scanner"],
  ["image-to-text", "Image to Text OCR"],
  ["age-calculator", "Age Calculator"],
  ["loan-calculator", "Loan Calculator"],
  ["thai-income-tax-calculator", "Thai Income Tax Calculator"],
  ["salary-calculator", "Salary & Payslip Calculator"],
  ["overtime-calculator-thailand", "Overtime Calculator Thailand"],
  ["social-security-pension-calculator", "Social Security Pension Calculator"],
  ["thai-id-validator", "Thai ID Checksum Validator"],
  ["bmi-calculator", "BMI Calculator"],
  ["profit-margin-calculator", "Profit & Margin Calculator"],
  ["quotation-generator", "Quotation Generator"],
  ["invoice-generator", "Invoice Generator & Payment Tracker"],
  ["heic-to-jpg", "HEIC to JPG"],
  ["jpg-to-png", "JPG to PNG Batch Converter"],
  ["png-to-jpg", "PNG to JPG Converter"],
  ["image-compressor", "Image Compressor & Resizer"],
  ["image-cropper", "Image Cropper Online"],
  ["favicon-generator", "Favicon & PWA Icon Generator"],
  ["background-remover", "AI Background Remover"],
  ["color-picker", "Color Picker & Contrast Checker"],
  ["password-generator", "Password Generator"],
  ["random-number-generator", "Random Number Generator"],
  ["random-wheel", "Random Wheel"],
  ["pdf-to-jpg", "PDF to JPG Converter"],
  ["merge-pdf", "Merge PDF"],
  ["split-pdf", "Split PDF"],
  ["pdf-organizer", "PDF Organizer"],
  ["sign-pdf", "Sign PDF"],
] as const;

test("formats and clears JSON", async ({ page }) => {
  await page.goto("/json-formatter");
  const input = page.getByLabel("JSON input").getByRole("textbox");
  await input.fill('{"name":"DevThai"}');
  await page.getByRole("button", { name: "จัดรูป JSON" }).click();
  await expect(page.getByRole("group", { name: "JSON output" })).toContainText('"name": "DevThai"');
  await page.getByRole("button", { name: "ล้างข้อมูล" }).click();
  await expect(page.getByText("ผลลัพธ์จะแสดงที่นี่หลังจากประมวลผล")).toBeVisible();
});

test("filters tools and toggles theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/tools");
  await page.getByRole("searchbox", { name: "ค้นหาเครื่องมือแบบทันที" }).fill("JWT");
  await expect(page.getByText("พบ 1 เครื่องมือ")).toBeVisible();
  await page.getByRole("button", { name: "สลับโหมดสี" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("desktop tool sidebar stays active while navigating", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop sidebar is replaced by a mobile drawer");
  await page.goto("/json-formatter");

  const sidebar = page.getByLabel("เมนูเครื่องมือด้านข้าง");
  await expect(sidebar.getByRole("link", { name: "JSON Formatter" })).toHaveAttribute("aria-current", "page");
  const shellAlignment = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("header.cafe-header");
    const sidebarElement = document.querySelector<HTMLElement>('[aria-label="เมนูเครื่องมือด้านข้าง"]');
    const headerBox = header?.getBoundingClientRect();
    const sidebarBox = sidebarElement?.getBoundingClientRect();
    return headerBox && sidebarBox ? { headerBottom: Math.round(headerBox.bottom), sidebarTop: Math.round(sidebarBox.top) } : null;
  });
  expect(shellAlignment).not.toBeNull();
  expect(shellAlignment?.headerBottom).toBe(shellAlignment?.sidebarTop);
  await page.getByRole("button", { name: "ย่อเมนูเครื่องมือ" }).click();
  await expect(page.getByRole("button", { name: "ขยายเมนูเครื่องมือ" })).toBeVisible();

  await sidebar.getByRole("link", { name: "JWT Decoder — อ่าน JWT ออนไลน์" }).click();
  await expect(page).toHaveURL(/\/jwt-decoder$/);
  await expect(page.getByRole("heading", { level: 1, name: "JWT Decoder" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ขยายเมนูเครื่องมือ" })).toBeVisible();
});

test("mobile tool drawer opens and navigates", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation coverage");
  await page.goto("/json-formatter");
  await page.getByRole("button", { name: "เปิดเมนูเครื่องมือ" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toHaveCount(1);
  const jwtLink = drawer.locator('a[href="/jwt-decoder"]');
  await expect(jwtLink).toHaveCount(1);
  await jwtLink.click();
  await expect(page).toHaveURL(/\/jwt-decoder$/);
  await expect(page.getByRole("heading", { level: 1, name: "JWT Decoder" })).toBeVisible();
});

test("restores dark theme without hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => window.localStorage.setItem("theme", "dark"));
  await page.goto("/json-formatter");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByLabel("JSON input").getByRole("textbox")).toBeVisible();
  const themeSurfaces = await page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    const shell = document.querySelector<HTMLElement>(".meaw-shell-glass");
    const workspace = document.querySelector<HTMLElement>(".meaw-workspace-panel");
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const workspaceStyle = workspace ? getComputedStyle(workspace) : null;
    const colorToRgb = (color: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) return [];
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
    };
    return {
      bodyBackground: bodyStyle.backgroundColor,
      bodyRgb: colorToRgb(bodyStyle.backgroundColor),
      shellBackground: shellStyle?.backgroundColor ?? "",
      shellBackdrop: shellStyle?.backdropFilter ?? "",
      workspaceBackground: workspaceStyle?.backgroundColor ?? "",
      workspaceBackdrop: workspaceStyle?.backdropFilter ?? "",
    };
  });
  expect(Math.max(...themeSurfaces.bodyRgb)).toBeLessThanOrEqual(20);
  expect(themeSurfaces.bodyBackground).not.toBe(themeSurfaces.shellBackground);
  expect(themeSurfaces.workspaceBackground).not.toBe(themeSurfaces.bodyBackground);
  expect(themeSurfaces.shellBackdrop).toContain("blur(18px)");
  expect(themeSurfaces.workspaceBackdrop).toContain("blur(18px)");
  expect(errors).toEqual([]);
});

test("word counter and percentage calculator produce useful results", async ({ page }) => {
  await page.goto("/word-counter");
  await page.getByLabel("ข้อความสำหรับนับคำ").fill("hello world");
  await expect(page.getByTestId("word-count")).toHaveText("2");

  await page.goto("/percentage-calculator");
  await page.getByLabel("เปอร์เซ็นต์").fill("15");
  await page.getByLabel("จำนวนทั้งหมด").fill("200");
  await page.getByRole("button", { name: "คำนวณเปอร์เซ็นต์" }).click();
  await expect(page.getByTestId("percentage-result")).toHaveText("30");
});

test("word cloud generator segments Thai, preserves weighted phrases, and exports PNG/SVG locally", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/word-cloud-generator");
  await expect(page.getByRole("heading", { level: 1, name: "Word Cloud Generator" })).toBeVisible();
  await expect(page.locator("main header").getByText("สร้าง Word Cloud ภาษาไทย", { exact: true })).toBeVisible();
  await expect(page.locator("#word-cloud-text")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="word-cloud-text"]');
    const input = document.querySelector<HTMLTextAreaElement>("#word-cloud-text");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "สร้าง Word Cloud" }).click();
  const preview = page.getByTestId("word-cloud-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("แมว");
  await expect(page.getByTestId("word-cloud-visible-count")).not.toHaveText("0");
  expect(await preview.locator("text").count()).toBeGreaterThan(10);

  const overlaps = await preview.locator("text").evaluateAll((elements) => {
    const boxes = elements.map((element) => ({ text: element.textContent ?? "", box: element.getBoundingClientRect() }));
    const collisions: string[] = [];
    for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
        const left = boxes[leftIndex]!;
        const right = boxes[rightIndex]!;
        const overlapWidth = Math.min(left.box.right, right.box.right) - Math.max(left.box.left, right.box.left);
        const overlapHeight = Math.min(left.box.bottom, right.box.bottom) - Math.max(left.box.top, right.box.top);
        if (overlapWidth > 1 && overlapHeight > 1) collisions.push(`${left.text}/${right.text}`);
      }
    }
    return collisions;
  });
  expect(overlaps).toEqual([]);

  const beforeShuffle = await preview.locator("text").evaluateAll((elements) => elements.map((element) => `${element.getAttribute("x")}:${element.getAttribute("y")}`).join("|"));
  await page.getByRole("button", { name: "สลับตำแหน่ง" }).click();
  const afterShuffle = await preview.locator("text").evaluateAll((elements) => elements.map((element) => `${element.getAttribute("x")}:${element.getAttribute("y")}`).join("|"));
  expect(afterShuffle).not.toBe(beforeShuffle);

  const svgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด SVG" }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toBe("meaw-word-cloud.svg");
  const svgPath = await svgDownload.path();
  expect(svgPath).toBeTruthy();
  const svg = await readFile(svgPath!, "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain("word-cloud-title");
  expect(svg).toContain("แมว");

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด PNG 2×" }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("meaw-word-cloud-2x.png");
  const pngPath = await pngDownload.path();
  expect(pngPath).toBeTruthy();
  const png = await readFile(pngPath!);
  expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.byteLength).toBeGreaterThan(10_000);

  await page.getByRole("tab", { name: "คำ / วลี + น้ำหนัก" }).click();
  await page.locator("#word-cloud-list").fill("Meaw Tools,12\nภาษาไทย,8\nคนรักแมว,6\nคาเฟ่ญี่ปุ่น,4");
  await page.getByRole("button", { name: "สร้าง Word Cloud" }).click();
  await expect(preview).toContainText("Meaw Tools");
  const meawRow = page.getByRole("row").filter({ hasText: "Meaw Tools" });
  await expect(meawRow).toContainText("12");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("CSV to Excel previews columns and downloads a safe XLSX locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/csv-to-excel");
  await expect(page.getByRole("heading", { level: 1, name: "CSV to Excel Converter" })).toBeVisible();
  await expect(page.getByText("Web Worker · ไม่อัปโหลดไฟล์", { exact: true })).toBeVisible();
  await page.locator("#csv-source-file").setInputFiles({
    name: "orders.csv",
    mimeType: "text/csv",
    buffer: Buffer.from('รหัส,สินค้า,หมวดหมู่,ราคา,คงเหลือ,หมายเหตุ\n00123,"ชาเขียว, สูตรพิเศษ",เครื่องดื่ม,55,18,"เก็บรหัสนำหน้าด้วย 0"\n00124,ชาไทย,เครื่องดื่ม,45,24,พร้อมส่ง\nSKU-009,แก้วแมว,ของใช้,129,7,"บรรทัดแรก\nบรรทัดที่สอง"\nSAFE-01,ข้อมูลตัวอย่าง,ทดสอบ,0,1,"=SUM(1,1)"', "utf8"),
  });
  await expect(page.getByText("orders.csv", { exact: true })).toBeVisible();

  const labelGap = await page.evaluate(() => {
    const input = document.getElementById("csv-sheet-name");
    const label = document.querySelector<HTMLLabelElement>('label[for="csv-sheet-name"]');
    const inputBox = input?.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "ตรวจและดูตัวอย่าง" }).click();
  const result = page.getByTestId("csv-inspection-result");
  await expect(result).toBeVisible();
  await expect(page.getByTestId("csv-row-count")).toHaveText("5");
  await expect(page.getByTestId("csv-column-count")).toHaveText("6");
  await expect(page.getByTestId("csv-detected-delimiter")).toContainText("Comma");
  await expect(page.getByTestId("csv-preview-table")).toContainText("00123");
  await expect(page.getByTestId("csv-preview-table")).toContainText("ชาเขียว, สูตรพิเศษ");
  await expect(page.getByTestId("csv-preview-table")).toContainText("=SUM(1,1)");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด Excel" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("orders.xlsx");
  const path = await download.path();
  expect(path).toBeTruthy();
  const workbook = unzipSync(new Uint8Array(await readFile(path!)));
  const sheet = strFromU8(workbook["xl/worksheets/sheet1.xml"]!);
  expect(sheet).toContain('state="frozen"');
  expect(sheet).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">00123</t>');
  expect(sheet).toContain('<c r="D2"><v>55</v></c>');
  expect(sheet).toContain("=SUM(1,1)");
  expect(sheet).not.toContain("<f>");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("Excel to CSV previews a workbook and downloads UTF-8 CSV locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/excel-to-csv");
  await expect(page.getByRole("heading", { level: 1, name: "Excel to CSV Converter" })).toBeVisible();
  await expect(page.getByText("XLSX · Web Worker", { exact: true })).toBeVisible();

  const fileInput = page.locator("#excel-to-csv-file");
  const labelGap = await fileInput.evaluate((input) => {
    const label = document.querySelector<HTMLLabelElement>('label[for="excel-to-csv-file"]');
    const inputBox = input.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByRole("status").filter({ hasText: "อ่าน Workbook สำเร็จ" })).toBeVisible();
  await expect(page.locator("#excel-csv-sheet")).toHaveValue("ยอดขาย สิงหาคม");
  await expect(page.getByTestId("excel-csv-preview")).toContainText("00123");
  await expect(page.getByTestId("excel-csv-preview")).toContainText("ครัวซองต์, เนยสด");
  await page.locator("#excel-csv-delimiter").selectOption("semicolon");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-sales-sample.csv");
  const path = await download.path();
  expect(path).toBeTruthy();
  const csv = await readFile(path!, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain("รหัส;สินค้า;ยอดขาย");
  expect(csv).toContain("00123;ชาไทย;1250.5");
  expect(csv).toContain("\t=HYPERLINK(");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("CSV cleaner removes selected duplicates and protects spreadsheet formulas locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/csv-cleaner");
  await expect(page.getByRole("heading", { level: 1, name: "CSV Cleaner & Duplicate Finder" })).toBeVisible();
  await page.locator("#csv-cleaner-source-file").setInputFiles({
    name: "customers.csv",
    mimeType: "text/csv",
    buffer: Buffer.from('id,email,name,note\n001,mali@example.com," Mali ",ok\n002,SOMCHAI@example.com," Somchai ","=HYPERLINK(""https://example.com"",""open"")"\n003,somchai@example.com,Somchai,"=HYPERLINK(""https://example.com"",""open"")"\n,,,\n004,,Namfon,keep\n005,,Por,keep', "utf8"),
  });

  const labelGap = await page.evaluate(() => {
    const input = document.getElementById("csv-cleaner-delimiter");
    const label = document.querySelector<HTMLLabelElement>('label[for="csv-cleaner-delimiter"]');
    const inputBox = input?.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "วิเคราะห์และดู Preview" }).click();
  await expect(page.getByTestId("csv-cleaner-source-rows")).toHaveText("7");
  await page.getByRole("button", { name: "1. id", exact: true }).click();
  await page.getByRole("button", { name: "3. name", exact: true }).click();
  await page.getByRole("button", { name: "4. note", exact: true }).click();
  await page.getByRole("button", { name: "ทำความสะอาดและสร้างไฟล์" }).click();

  await expect(page.getByTestId("csv-cleaner-summary")).toBeVisible();
  await expect(page.getByTestId("csv-cleaner-output-rows")).toHaveText("4");
  await expect(page.getByTestId("csv-cleaner-duplicates")).toHaveText("1");
  await expect(page.getByTestId("csv-cleaner-protected")).toHaveText("1 เซลล์");
  await expect(page.getByTestId("csv-cleaner-preview-table")).toContainText("SOMCHAI@example.com");
  await expect(page.getByTestId("csv-cleaner-preview-table")).toContainText("Namfon");
  await expect(page.getByTestId("csv-cleaner-preview-table")).toContainText("Por");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("customers-cleaned.csv");
  const path = await download.path();
  expect(path).toBeTruthy();
  const csv = await readFile(path!, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain("\t=HYPERLINK(");
  expect(csv.match(/somchai@example\.com/gi)).toHaveLength(1);
  expect(csv).toContain('"004","","Namfon"');
  expect(csv).toContain('"005","","Por"');

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("Markdown table generator imports spreadsheet data and produces safe GFM", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/markdown-table-generator");
  await expect(page.getByRole("heading", { level: 1, name: "Markdown Table Generator" })).toBeVisible();
  const importInput = page.getByLabel("ข้อมูลจาก Excel / Sheets / CSV / TSV");
  await expect(importInput).toBeVisible();
  const labelGap = await importInput.evaluate((input) => {
    const label = document.querySelector<HTMLLabelElement>('label[for="markdown-import-text"]');
    const inputBox = input.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await importInput.fill("สินค้า\tราคา\tสถานะ\nชาไทย\t65\tพร้อมขาย\nครัวซองต์ | เนยสด\t95\tพร้อมขาย");
  await page.getByRole("button", { name: "นำเข้าตาราง" }).click();
  await expect(page.getByRole("status")).toContainText("2 แถว × 3 คอลัมน์");
  await page.getByLabel("การจัดแนวคอลัมน์ 2").selectOption("right");

  const output = page.getByTestId("markdown-table-output");
  await expect(output).toContainText("ครัวซองต์ \\| เนยสด");
  await expect(output).toContainText(/\| -+: \|/);
  await expect(page.getByRole("table", { name: "ตัวอย่างผลลัพธ์ตาราง Markdown" })).toContainText("ชาไทย");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด meaw-markdown-table.md" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-markdown-table.md");
  const path = await download.path();
  expect(path).toBeTruthy();
  const markdown = await readFile(path!, "utf8");
  expect(markdown).toContain("ครัวซองต์ \\| เนยสด");
  expect(markdown).toContain("---:");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("HTML table generator imports data, merges headers, escapes HTML, and downloads a page", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/html-table-generator");
  await expect(page.getByRole("heading", { level: 1, name: "HTML Table Generator" })).toBeVisible();
  const importInput = page.getByLabel("ข้อมูลจาก Excel / Sheets / CSV / TSV");
  await expect(importInput).toBeVisible();
  const labelGap = await importInput.evaluate((input) => {
    const label = document.querySelector<HTMLLabelElement>('label[for="html-table-import"]');
    const inputBox = input.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await importInput.fill("สินค้า\tราคา\tสถานะ\nชาไทย\t65\tพร้อมขาย\n<script>alert(1)</script>\t80\tหมด");
  await page.getByRole("button", { name: "นำเข้า", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("3 แถว × 3 คอลัมน์");

  await page.getByLabel("แถว 1 คอลัมน์ 1").click();
  await page.locator("#html-colspan").fill("2");
  await page.getByTestId("html-merge-cell").click();
  await expect(page.getByTestId("html-preview-cell-0-0")).toHaveAttribute("colspan", "2");

  const output = page.getByTestId("html-table-output");
  await expect(output).toContainText('<th scope="colgroup" colspan="2">สินค้า</th>');
  await expect(output).toContainText("&lt;script&gt;alert(1)&lt;/script&gt;");
  await expect(output).not.toContainText("<script>alert(1)</script>");
  await expect(page.getByRole("table", { name: "ตารางสินค้า Meaw Cafe" })).toContainText("ชาไทย");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด meaw-html-table.html" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-html-table.html");
  const path = await download.path();
  expect(path).toBeTruthy();
  const html = await readFile(path!, "utf8");
  expect(html).toContain("<!doctype html>");
  expect(html).toContain('<meta charset="utf-8">');
  expect(html).toContain('<th scope="colgroup" colspan="2">สินค้า</th>');
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).not.toContain("<script>alert(1)</script>");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("UTM builder preserves existing URL data and produces a consistent GA4 campaign link", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/utm-builder");
  await expect(page.getByRole("heading", { level: 1, name: "UTM Link Builder" })).toBeVisible();
  await page.getByRole("textbox", { name: "Website URL", exact: true }).fill("https://example.com/shop?sku=123&utm_source=old#details");
  await page.getByRole("button", { name: "Facebook Ads" }).click();
  await page.getByRole("textbox", { name: "Campaign Name", exact: true }).fill("August Cat Sale");

  const labelGap = await page.evaluate(() => {
    const input = document.getElementById("utm-campaign");
    const label = document.querySelector<HTMLLabelElement>('label[for="utm-campaign"]');
    const inputBox = input?.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "สร้างลิงก์ UTM" }).click();
  const result = page.getByTestId("utm-result");
  await expect(result).toBeVisible();
  const output = await page.getByTestId("utm-result-url").inputValue();
  const url = new URL(output);
  expect(url.searchParams.get("sku")).toBe("123");
  expect(url.searchParams.getAll("utm_source")).toEqual(["facebook"]);
  expect(url.searchParams.get("utm_medium")).toBe("paid_social");
  expect(url.searchParams.get("utm_campaign")).toBe("august_cat_sale");
  expect(url.hash).toBe("#details");
  await expect(page.getByText("แทนค่า UTM เดิมแล้ว")).toBeVisible();

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("grade calculator weights course GPA and multi-term GPAX transparently", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/grade-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Grade Calculator" })).toBeVisible();
  await expect(page.getByText("สูตรโปร่งใส: หน่วยกิต × แต้มระดับคะแนน", { exact: true })).toBeVisible();

  const initialLayout = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-testid="grade-course-row"]');
    const label = row?.querySelector<HTMLLabelElement>('label[for$="-credits"]');
    const input = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("grade-course-row")).toHaveCount(7);
  await page.getByRole("button", { name: "คำนวณ GPA" }).click();
  const courseResult = page.getByTestId("course-gpa-result");
  await expect(page.getByTestId("course-gpa-rounded")).toHaveText("2.37");
  await expect(courseResult).toContainText("2.36");
  await expect(courseResult).toContainText("45.00 ÷ 19 = 2.3684");
  await expect(courseResult).toContainText("นับ 7 วิชา");

  await page.getByRole("tab", { name: "หลายเทอม · GPAX" }).click();
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("gpax-term-row")).toHaveCount(4);
  await page.getByRole("button", { name: "คำนวณ GPAX" }).click();
  const gpaxResult = page.getByTestId("gpax-result");
  await expect(page.getByTestId("gpax-rounded")).toHaveText("3.48");
  await expect(gpaxResult).toContainText("271.25 ÷ 78 = 3.4776");
  await expect(gpaxResult).toContainText("ผลหลายเทอมเป็นค่าประมาณ");

  const finalLayout = await page.evaluate(() => ({
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(finalLayout.hasHorizontalOverflow).toBe(false);
  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("typing test measures Thai graphemes and switches to English", async ({ page }) => {
  await page.goto("/typing-test");
  await expect(page.getByRole("heading", { level: 1, name: "Typing Test" })).toBeVisible();
  await expect(page.getByText("60 วินาที", { exact: true })).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="typing-input"]');
    const input = document.querySelector<HTMLTextAreaElement>("#typing-input");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("textbox", { name: "พิมพ์ข้อความตามด้านบน" }).fill("เช้าวันนี้ทีม");
  await expect(page.getByText("กำลังทดสอบ", { exact: true })).toBeVisible();
  await page.waitForTimeout(1_100);
  await page.getByRole("button", { name: "จบการทดสอบ" }).click();
  await expect(page.getByTestId("typing-result")).toContainText("ผลทดสอบ:");
  await expect(page.getByRole("heading", { name: /ผลทดสอบ: [1-9]\d* WPM/ })).toBeVisible();
  await expect(page.getByTestId("typing-result")).toContainText("ความแม่นยำ 100.0%");
  await expect(page.getByTestId("typing-live-metrics")).toContainText("ผิดตำแหน่ง");

  await page.getByRole("combobox", { name: "ภาษา" }).click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByTestId("typing-target")).toContainText("A productive day begins");
  await expect(page.getByRole("textbox", { name: "พิมพ์ข้อความตามด้านบน" })).toBeEnabled();
});

test("special characters styles text and finds symbols by Thai intent", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  await page.goto("/special-characters");
  await expect(page.getByRole("heading", { level: 1, name: "Special Characters & Fancy Text" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "ข้อความสำหรับแต่งชื่อ" })).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="special-text-input"]');
    const input = document.querySelector<HTMLInputElement>("#special-text-input");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("textbox", { name: "ข้อความสำหรับแต่งชื่อ" }).fill("Meaw");
  await expect(page.getByTestId("fancy-results")).toContainText("𝐌𝐞𝐚𝐰");
  await expect(page.getByTestId("fancy-results")).toContainText("Ⓜⓔⓐⓦ");
  await page.getByRole("button", { name: "คัดลอก ตัวหนา" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "คัดลอก ตัวหนา แล้ว" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("𝐌𝐞𝐚𝐰");

  await page.getByRole("searchbox", { name: "ค้นหาสัญลักษณ์" }).fill("หัวใจ");
  await expect(page.getByRole("heading", { level: 3, name: "หัวใจและความรัก" })).toBeVisible();
  await page.getByRole("button", { name: "คัดลอก ♡", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("♡");
  await expect(page.getByTestId("recent-symbols")).toContainText("♡");

  await page.getByRole("button", { name: "ลูกศร", exact: true }).click();
  await expect(page.getByRole("heading", { level: 3, name: "ลูกศร" })).toBeVisible();
  await expect(page.getByRole("button", { name: "คัดลอก →", exact: true })).toBeVisible();
});

test("text to speech reads Thai-English text with browser voices", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const spoken: string[] = [];
    const spokenLanguages: string[] = [];
    const voices = [
      { voiceURI: "mock-th", name: "Thai Mock", lang: "th-TH", default: true, localService: true },
      { voiceURI: "mock-en", name: "English Mock", lang: "en-US", default: false, localService: false },
    ];
    let paused = false;
    let timer = 0;
    const target = new EventTarget();

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: typeof voices[number] | null = null;
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event & { error: string }) => void) | null = null;

      constructor(text: string) { this.text = text; }
    }

    const synthesis = {
      get paused() { return paused; },
      pending: false,
      speaking: false,
      getVoices: () => voices,
      speak(utterance: MockSpeechSynthesisUtterance) {
        spoken.push(utterance.text);
        spokenLanguages.push(utterance.lang);
        this.speaking = true;
        queueMicrotask(() => utterance.onstart?.(new Event("start")));
        const finish = () => {
          if (paused) { timer = window.setTimeout(finish, 20); return; }
          this.speaking = false;
          utterance.onend?.(new Event("end"));
        };
        timer = window.setTimeout(finish, 120);
      },
      pause() { paused = true; },
      resume() { paused = false; },
      cancel() { window.clearTimeout(timer); this.speaking = false; paused = false; },
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    };

    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockSpeechSynthesisUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
    Object.defineProperty(window, "__ttsSpoken", { configurable: true, value: spoken });
    Object.defineProperty(window, "__ttsSpokenLanguages", { configurable: true, value: spokenLanguages });
  });

  await page.goto("/text-to-speech");
  await expect(page.getByRole("heading", { level: 1, name: "Text to Speech Reader" })).toBeVisible();
  const input = page.getByLabel("ข้อความที่ต้องการให้อ่าน");
  await expect(input).toBeVisible();
  await expect(page.getByText("พบ 2 เสียงบนอุปกรณ์นี้")).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="tts-text"]');
    const textarea = document.querySelector<HTMLTextAreaElement>("#tts-text");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = textarea?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(input).toHaveValue(/Meaw Tools/);
  await page.getByRole("button", { name: "เริ่มอ่าน" }).click();
  await expect(page.getByText("อ่านจบแล้ว", { exact: true })).toBeVisible({ timeout: 5_000 });
  const autoLanguages = await page.evaluate(() => (window as unknown as { __ttsSpokenLanguages: string[] }).__ttsSpokenLanguages);
  expect(autoLanguages).toContain("th-TH");
  expect(autoLanguages).toContain("en-US");

  await page.getByRole("combobox", { name: "ภาษา", exact: true }).click();
  await page.getByRole("option", { name: "ภาษาไทย" }).click();
  await page.getByRole("combobox", { name: "เสียงจาก Browser / ระบบ" }).click();
  await page.getByRole("option", { name: /Thai Mock/ }).click();
  await page.getByRole("button", { name: "อ่านอีกครั้ง" }).click();
  await expect(page.getByText("กำลังอ่านข้อความ", { exact: true })).toBeVisible();
  const player = page.getByTestId("tts-player");
  await player.getByRole("button", { name: "พัก", exact: true }).click();
  await expect(page.getByText("พักการอ่านอยู่", { exact: true })).toBeVisible();
  await player.getByRole("button", { name: "อ่านต่อ", exact: true }).click();
  await expect(page.getByText("อ่านจบแล้ว", { exact: true })).toBeVisible({ timeout: 5_000 });
  const spoken = await page.evaluate(() => (window as unknown as { __ttsSpoken: string[] }).__ttsSpoken.join(" "));
  expect(spoken).toContain("Meaw Tools");
  expect(spoken).toContain("Hello!");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);

  await page.getByRole("button", { name: "ล้างข้อมูล" }).click();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("progressbar", { name: "ความคืบหน้าการอ่านข้อความ" })).toHaveAttribute("aria-valuenow", "0");
});

test("category tags navigate to a category page", async ({ page }) => {
  await page.goto("/categories");
  await expect(page.getByRole("heading", { level: 1, name: "หมวดหมู่เครื่องมือ" })).toBeVisible();
  await page.getByRole("link", { name: "ดูหมวดรูปภาพและ PDF" }).click();
  await expect(page).toHaveURL(/\/categories\/media$/);
  await expect(page.getByRole("heading", { level: 1, name: "รูปภาพและ PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: /เปิดเครื่องมือ/ })).toHaveCount(15);
});

test("cat walker can be disabled and remembers the preference", async ({ page }) => {
  await page.goto("/tools");
  const catCharacter = page.locator(".cat-walker-character");
  const walkingCat = page.locator(".cat-walker-sprite");
  await expect(catCharacter).toBeVisible();
  const walkingStyles = await walkingCat.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationName: styles.animationName,
      animationTimingFunction: styles.animationTimingFunction,
      backgroundImage: styles.backgroundImage,
    };
  });
  expect(walkingStyles.animationName).toContain("meaw-walk-sprite");
  expect(walkingStyles.animationTimingFunction).toContain("steps(1)");
  expect(walkingStyles.backgroundImage).toContain("meaw-cat-walk-sprite.png");
  const trackTiming = await page.locator(".cat-walker-track").evaluate((element) => getComputedStyle(element).animationTimingFunction);
  expect(trackTiming).toBe("linear");
  await expect(page.locator(".cat-walker-rest")).toHaveCount(1);
  const catLayout = await page.evaluate(() => {
    const content = document.querySelector(".meaw-app-content")!;
    const playground = document.querySelector(".meaw-playground")!;
    const track = document.querySelector(".cat-walker-track")!;
    const toggle = document.querySelector('[aria-label="พัก Meaw"]')!;
    const playgroundRect = playground.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    return {
      contentLayer: Number.parseInt(getComputedStyle(content).zIndex, 10),
      catLayer: Number.parseInt(getComputedStyle(playground).zIndex, 10),
      toggleLayer: Number.parseInt(getComputedStyle(toggle).zIndex, 10),
      playgroundTop: playgroundRect.top,
      trackTop: trackRect.top,
      trackBottom: trackRect.bottom,
      viewportBottom: window.innerHeight,
    };
  });
  expect(catLayout.catLayer).toBeGreaterThan(catLayout.contentLayer);
  expect(catLayout.toggleLayer).toBeGreaterThan(catLayout.catLayer);
  expect(catLayout.trackTop).toBeGreaterThanOrEqual(catLayout.playgroundTop);
  expect(catLayout.trackBottom).toBeLessThanOrEqual(catLayout.viewportBottom);
  await page.getByRole("button", { name: "พัก Meaw" }).click();
  await expect(page.locator(".cat-walker-image")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "เรียก Meaw มาเดินเล่น" })).toBeVisible();
  await expect(page.locator(".cat-walker-image")).toHaveCount(0);
});

test("age calculator and QR generator produce results", async ({ page }) => {
  await page.goto("/age-calculator");
  await page.getByLabel("วันเดือนปีเกิด").fill("2000-01-15");
  await page.getByLabel("คำนวณอายุ ณ วันที่").fill("2026-08-02");
  await page.getByRole("button", { name: "คำนวณอายุ" }).click();
  await expect(page.getByTestId("age-result")).toContainText("26 ปี 6 เดือน 18 วัน");

  await page.goto("/qr-code-generator");
  await page.getByLabel("ข้อความหรือลิงก์").fill("https://devthai.tools");
  await page.getByRole("button", { name: "สร้าง QR Code" }).click();
  await expect(page.getByAltText("QR Code ที่สร้างแล้ว")).toBeVisible();
  await expect(page.getByRole("link", { name: "PNG", exact: true })).toBeVisible();
});

test("barcode generator validates, renders, and exports batch files locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/barcode-generator");
  await expect(page.getByRole("heading", { level: 1, name: "Barcode Generator" })).toBeVisible();
  await expect(page.getByText("ไม่ส่งรหัสขึ้น Server", { exact: true })).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="barcode-format"]');
    const input = document.querySelector<HTMLElement>("#barcode-format");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByLabel("รหัสที่ต้องการสร้าง · หนึ่งรายการต่อบรรทัด")).toHaveValue(/SKU-TH-0001/);
  await page.getByRole("button", { name: "สร้างบาร์โค้ด" }).click();
  const results = page.getByTestId("barcode-results");
  await expect(results).toContainText("พร้อมดาวน์โหลด 3 รายการ");
  await expect(page.getByTestId("barcode-result-row")).toHaveCount(3);
  await expect(page.getByAltText("บาร์โค้ด SKU-TH-0001")).toBeVisible();

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG เป็น ZIP" }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("meaw-barcodes-png.zip");
  const { unzipSync } = await import("fflate");
  const pngEntries = unzipSync(new Uint8Array(await readFile((await pngDownload.path())!)));
  expect(Object.keys(pngEntries)).toHaveLength(3);
  for (const bytes of Object.values(pngEntries)) expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const svgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG เป็น ZIP" }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toBe("meaw-barcodes-svg.zip");
  const svgEntries = unzipSync(new Uint8Array(await readFile((await svgDownload.path())!)));
  expect(Object.keys(svgEntries)).toHaveLength(3);
  for (const bytes of Object.values(svgEntries)) {
    const svg = new TextDecoder().decode(bytes);
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toContain("<script");
  }

  await page.getByRole("combobox", { name: "รูปแบบบาร์โค้ด" }).click();
  await page.getByRole("option", { name: /^EAN-13/ }).click();
  await page.getByLabel("รหัสที่ต้องการสร้าง · หนึ่งรายการต่อบรรทัด").fill("885012345678");
  await page.getByRole("button", { name: "สร้างบาร์โค้ด" }).click();
  await expect(page.getByTestId("barcode-results")).toContainText("8850123456787");

  const formatChecks = [
    { option: /^EAN-8/, input: "1234567", output: "12345670" },
    { option: /^UPC-A/, input: "12345678901", output: "123456789012" },
    { option: /^ITF-14/, input: "1234567890123", output: "12345678901231" },
    { option: /^Code 39/, input: "box-42", output: "BOX-42" },
  ];
  for (const check of formatChecks) {
    await page.getByRole("combobox", { name: "รูปแบบบาร์โค้ด" }).click();
    await page.getByRole("option", { name: check.option }).click();
    await page.getByLabel("รหัสที่ต้องการสร้าง · หนึ่งรายการต่อบรรทัด").fill(check.input);
    await page.getByRole("button", { name: "สร้างบาร์โค้ด" }).click();
    await expect(page.getByTestId("barcode-results")).toContainText(check.output);
  }

  const finalLayout = await page.evaluate(() => ({
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(finalLayout.hasHorizontalOverflow).toBe(false);

  expect(hasExternalRequest(requests, page.url(), ["blob:", "data:"])).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("QR scanner reads a local sample without opening the result automatically", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  await page.goto("/qr-code-scanner");
  await expect(page.getByRole("heading", { level: 1, name: "QR Code Scanner" })).toBeVisible();
  await expect(page.locator("#qr-image-file")).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="qr-image-file"]');
    const input = document.querySelector<HTMLInputElement>("#qr-image-file");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  const result = page.getByTestId("qr-scan-result");
  await expect(result).toContainText("https://meaw-tools.vercel.app");
  await expect(result).toContainText("ลิงก์เว็บไซต์");
  await expect(result.getByRole("link", { name: "เปิด meaw-tools.vercel.app" })).toBeVisible();
  await expect(page).toHaveURL(/\/qr-code-scanner$/);

  await result.getByRole("button", { name: "คัดลอกผลลัพธ์" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://meaw-tools.vercel.app");

  await page.getByRole("button", { name: "ใช้กล้อง" }).click();
  await expect(page.getByRole("button", { name: "เปิดกล้องเพื่อสแกน" })).toBeVisible();
});

test("image to text OCR reads and edits a local Thai-English sample", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: testOrigin });
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/image-to-text");
  await expect(page.getByRole("heading", { level: 1, name: "Image to Text OCR" })).toBeVisible();
  await expect(page.locator("#ocr-image-file")).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="ocr-image-file"]');
    const input = document.querySelector<HTMLInputElement>("#ocr-image-file");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByAltText("รูปต้นฉบับสำหรับ OCR")).toBeVisible();
  expect(requests.filter((url) => url.includes("/ocr-runtime/"))).toEqual([]);

  await page.getByRole("button", { name: "อ่านข้อความจากรูป" }).click();
  await expect(page.getByRole("progressbar", { name: "ความคืบหน้า OCR" })).toBeVisible();
  const result = page.getByTestId("ocr-result");
  await expect(result).toBeVisible({ timeout: 45_000 });
  const output = page.getByLabel("ตรวจและแก้ข้อความก่อนนำไปใช้");
  await expect(output).toHaveValue(/MEAW TOOLS/);
  await expect(output).toHaveValue(/Image to Text OCR/);
  expect(requests.some((url) => url.includes("/ocr-runtime/v7/core/"))).toBe(true);
  expect(requests.some((url) => url.includes("/ocr-runtime/v7/languages/eng.traineddata.gz"))).toBe(true);
  expect(requests.some((url) => /jsdelivr|projectnaptha|tessdata/i.test(url))).toBe(false);
  expect(consoleErrors).toEqual([]);

  const edited = `${await output.inputValue()}\nตรวจแก้แล้ว`;
  await output.fill(edited);
  await result.getByRole("button", { name: "คัดลอกข้อความ" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("ตรวจแก้แล้ว");

  const downloadPromise = page.waitForEvent("download");
  await result.getByRole("button", { name: /ดาวน์โหลด .*\.txt/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("meaw-image-to-text-example-ocr.txt");
});

test("JPG to PDF creates a downloadable PDF", async ({ page }) => {
  await page.goto("/jpg-to-pdf");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  await page.getByLabel("เลือกรูป JPG หรือ PNG").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: png });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "สร้างและดาวน์โหลด PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-images.pdf");
  await expect(page.getByText("ดาวน์โหลด PDF สำเร็จ")).toBeVisible();
});

test("image tools convert and resize locally", async ({ page }) => {
  await page.goto("/png-to-jpg");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByAltText("ตัวอย่างรูปต้นฉบับ")).toBeVisible();
  await page.getByRole("button", { name: "แปลงเป็น JPG" }).click();
  await expect(page.getByTestId("image-output")).toContainText("JPG");
  const jpgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /ดาวน์โหลด meaw-sample-converted\.jpg/ }).click();
  expect((await jpgDownloadPromise).suggestedFilename()).toBe("meaw-sample-converted.jpg");

  await page.goto("/image-compressor");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByAltText("ตัวอย่างรูปต้นฉบับ")).toBeVisible();
  await page.getByLabel("ความกว้างสูงสุด (px)").fill("640");
  await page.getByRole("button", { name: "บีบอัดและย่อรูป" }).click();
  await expect(page.getByTestId("image-output")).toContainText("640 × 360");
});

test("image cropper creates an exact circular PNG locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/image-cropper");
  await expect(page.getByRole("heading", { level: 1, name: "Image Cropper Online" })).toBeVisible();
  await expect(page.getByText(/รูปไม่ถูกอัปโหลด/)).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="crop-image-file"]');
    const input = document.querySelector<HTMLInputElement>("#crop-image-file");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("crop-stage")).toBeVisible();
  await expect(page.getByText("meaw-cafe.webp")).toBeVisible();

  const xInput = page.getByLabel("X (px)");
  const beforeX = Number(await xInput.inputValue());
  await page.getByTestId("crop-selection").focus();
  await page.keyboard.press("ArrowRight");
  expect(Number(await xInput.inputValue())).toBeGreaterThan(beforeX);

  await page.getByRole("button", { name: "หมุน" }).click();
  await page.getByRole("button", { name: "แนวนอน" }).click();
  await expect(page.getByRole("button", { name: "แนวนอน" })).toHaveAttribute("aria-pressed", "true");
  await page.getByText("ครอปเป็นวงกลม", { exact: true }).click();
  await page.getByLabel("ความละเอียด").click();
  await page.getByRole("option", { name: "กำหนดพิกเซลเอง" }).click();
  await page.getByLabel("กว้าง (px)").fill("480");
  await expect(page.getByLabel("สูง (px)")).toHaveValue("480");

  await page.getByRole("button", { name: "ครอปและสร้างไฟล์" }).click();
  const output = page.getByTestId("crop-output");
  await expect(output).toContainText("480 × 480");
  await expect(output).toContainText("PNG · วงกลม");
  await expect(page.getByAltText("ตัวอย่างรูปที่ครอปแล้ว")).toBeVisible();
  const alpha = await page.getByAltText("ตัวอย่างรูปที่ครอปแล้ว").evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    return {
      corner: context.getImageData(0, 0, 1, 1).data[3],
      center: context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3],
    };
  });
  expect(alpha.corner).toBe(0);
  expect(alpha.center).toBe(255);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด meaw-cafe-circle.png" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("meaw-cafe-circle.png");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("favicon generator creates a complete ICO and PWA package locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/favicon-generator");
  await expect(page.getByRole("heading", { level: 1, name: "Favicon & PWA Icon Generator" })).toBeVisible();
  await expect(page.getByText(/ไม่อัปโหลดโลโก้/)).toBeVisible();
  await expect(page.locator("#favicon-source")).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="favicon-source"]');
    const input = document.querySelector<HTMLInputElement>("#favicon-source");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("meaw-cat.png", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "ตัวอย่างไอคอนและพื้นที่ปลอดภัย Maskable" })).toBeVisible();
  await page.getByLabel("ชื่อ Web App").fill("Meaw Workspace");
  await page.getByLabel("ชื่อย่อ").fill("Meaw");
  await page.getByLabel("Start URL").fill("/tools/");
  await page.getByRole("button", { name: "สร้างแพ็ก Favicon + PWA" }).click();

  const output = page.getByTestId("favicon-output");
  await expect(output).toContainText("พร้อมใช้งาน 11 ไฟล์");
  await expect(page.getByRole("progressbar", { name: "ความคืบหน้าการสร้างไอคอน" })).toHaveAttribute("aria-valuenow", "100");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  const manifestText = await page.getByLabel("site.webmanifest").inputValue();
  const manifest = JSON.parse(manifestText);
  expect(manifest).toMatchObject({ name: "Meaw Workspace", short_name: "Meaw", start_url: "/tools/", id: "/tools/", display: "standalone" });
  expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose)).toEqual(["any", "any", "maskable"]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /ดาวน์โหลด ZIP/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-favicon-pwa-package.zip");
  const entries = unzipSync(new Uint8Array(await readFile((await download.path())!)));
  expect(Object.keys(entries).sort()).toEqual([
    "README.txt",
    "apple-touch-icon.png",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon-48x48.png",
    "favicon-head.html",
    "favicon.ico",
    "pwa-192x192.png",
    "pwa-512x512.png",
    "pwa-maskable-512x512.png",
    "site.webmanifest",
  ].sort());
  expect([...entries["favicon.ico"]!.slice(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
  expect([entries["favicon.ico"]![6], entries["favicon.ico"]![22], entries["favicon.ico"]![38]]).toEqual([16, 32, 48]);
  expect([...entries["pwa-maskable-512x512.png"]!.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(JSON.parse(strFromU8(entries["site.webmanifest"]!)).icons[2].purpose).toBe("maskable");
  expect(strFromU8(entries["favicon-head.html"]!)).toContain('rel="apple-touch-icon" sizes="180x180"');
  expect(strFromU8(entries["README.txt"]!)).toContain("ไม่คัดลอก EXIF, GPS");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("JPG to PNG batch converter creates real images and ZIP locally", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/jpg-to-png");
  await expect(page.getByRole("heading", { level: 1, name: "JPG to PNG Batch Converter" })).toBeVisible();
  await expect(page.getByText("ไม่อัปโหลดรูป", { exact: true })).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="batch-output-format"]');
    const input = document.querySelector<HTMLElement>("#batch-output-format");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("batch-file-row")).toHaveCount(2);
  await expect(page.getByTestId("batch-file-list")).toContainText("meaw-cafe.jpg");
  await expect(page.getByTestId("batch-file-list")).toContainText("1,200 × 800 px");
  await page.getByRole("button", { name: "แปลงทั้งหมดเป็น PNG" }).click();

  const output = page.getByTestId("batch-output");
  await expect(output).toContainText("ไฟล์พร้อมดาวน์โหลด");
  await expect(output).toContainText("meaw-cafe-converted.png");
  await expect(output).toContainText("meaw-sticker-converted.png");
  await expect(page.getByRole("progressbar", { name: "ความคืบหน้าการแปลงรูป" })).toHaveAttribute("aria-valuenow", "100");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด ZIP 2 รูป" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-images-png.zip");
  const zip = await readFile((await download.path())!);
  const { unzipSync } = await import("fflate");
  const entries = unzipSync(new Uint8Array(zip));
  expect(Object.keys(entries).sort()).toEqual(["meaw-cafe-converted.png", "meaw-sticker-converted.png"]);
  for (const bytes of Object.values(entries)) expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
  await page.getByRole("button", { name: "ล้างข้อมูล" }).click();
  await expect(page.getByTestId("batch-file-row")).toHaveCount(0);
});

test("HEIC to JPG decodes a real HEIC sample in a worker", async ({ page }) => {
  await page.goto("/heic-to-jpg");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("meaw-sample.heic")).toBeVisible();

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="heic-files"]');
    const input = document.querySelector<HTMLInputElement>("#heic-files");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "แปลงเป็น JPG" }).click();
  await expect(page.getByTestId("heic-output")).toContainText("แปลง JPG สำเร็จ 1 รูป");
  await expect(page.getByAltText("ตัวอย่าง meaw-sample.jpg")).toBeVisible();
  await expect(page.getByTestId("heic-output")).toContainText("96 × 64 px");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด JPG", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-sample.jpg");
  const jpeg = await readFile((await download.path())!);
  expect([...jpeg.subarray(0, 2)]).toEqual([0xff, 0xd8]);

  await page.getByRole("button", { name: "ล้างข้อมูล" }).click();
  const heicSample = Buffer.from(HEIC_SAMPLE_BASE64, "base64");
  await page.locator("#heic-files").setInputFiles([
    { name: "photo.heic", mimeType: "image/heic", buffer: heicSample },
    { name: "PHOTO.HEIC", mimeType: "image/heic", buffer: heicSample },
  ]);
  await expect(page.getByTestId("heic-file-row")).toHaveCount(2);

  await page.getByRole("button", { name: "แปลงเป็น JPG" }).click();
  await expect(page.getByTestId("heic-output")).toContainText("แปลง JPG สำเร็จ 2 รูป");
  await expect(page.getByAltText("ตัวอย่าง photo.jpg")).toBeVisible();
  await expect(page.getByAltText("ตัวอย่าง PHOTO-2.jpg")).toBeVisible();

  const zipDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลดทั้งหมดเป็น ZIP" }).click();
  const zipDownload = await zipDownloadPromise;
  expect(zipDownload.suggestedFilename()).toBe("meaw-heic-to-jpg.zip");
  const zip = await readFile((await zipDownload.path())!);
  expect([...zip.subarray(0, 2)]).toEqual([0x50, 0x4b]);
});

test("background remover validates a local image before lazy model loading", async ({ page }) => {
  await page.goto("/background-remover");
  await expect(page.getByText("ประมวลผลในอุปกรณ์")).toBeVisible();
  await expect(page.getByText(/ประมาณ 15–20 MB/)).toBeVisible();

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByAltText("ตัวอย่างรูปต้นฉบับสำหรับลบพื้นหลัง")).toBeVisible();
  await expect(page.getByText("720 × 720 px")).toBeVisible();
  await expect(page.getByRole("button", { name: "ลบพื้นหลังด้วย AI" })).toBeEnabled();
});

test("popular generators and color checker produce useful results", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/color-picker");
  await page.getByLabel("สีข้อความหรือวัตถุ", { exact: true }).fill("#000000");
  await page.getByLabel("สีพื้นหลัง", { exact: true }).fill("#FFFFFF");
  await expect(page.getByTestId("contrast-ratio")).toHaveText("21:1");

  await page.goto("/password-generator");
  await page.getByLabel("จำนวนรหัสผ่าน").fill("3");
  await page.getByRole("button", { name: "สร้างรหัสผ่าน" }).click();
  await expect(page.getByTestId("password-output").getByRole("listitem")).toHaveCount(3);

  await page.goto("/random-number-generator");
  await page.getByLabel("ค่าต่ำสุด").fill("10");
  await page.getByLabel("ค่าสูงสุด").fill("20");
  await page.getByLabel("จำนวนผลลัพธ์").fill("5");
  await page.getByRole("button", { name: "สุ่มตัวเลข" }).click();
  await expect(page.getByTestId("random-value")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("random wheel and Buddhist year converter complete common Thai tasks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/random-wheel");
  await page.getByLabel("ชื่อ ตัวเลือก หรือของรางวัล").fill("มะลิ\nสมชาย\nน้ำฝน");
  await page.getByRole("button", { name: "หมุนวงล้อสุ่ม" }).click();
  await expect(page.getByTestId("wheel-result")).toContainText(/มะลิ|สมชาย|น้ำฝน/);

  await page.goto("/buddhist-year-converter");
  await page.getByLabel("ปีที่ต้องการแปลง").fill("2569\n2568");
  await page.getByRole("button", { name: "แปลงปี" }).click();
  await expect(page.getByTestId("era-results")).toContainText("2026");
  await expect(page.getByTestId("era-results")).toContainText("2025");
});

test("random wheel has visible spin, pointer, and easing animation", async ({ page }) => {
  await page.goto("/random-wheel");
  await page.getByLabel("ชื่อ ตัวเลือก หรือของรางวัล").fill("มะลิ\nสมชาย\nน้ำฝน\nต้นกล้า");

  const wheel = page.getByTestId("wheel-disc");
  const stage = page.locator(".wheel-stage");
  await page.getByRole("button", { name: "หมุนวงล้อสุ่ม" }).click();
  await expect(stage).toHaveAttribute("data-spinning", "true");

  const firstTransform = await wheel.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(
    () => wheel.evaluate((element) => getComputedStyle(element).transform),
    { timeout: 1_500 },
  ).not.toBe(firstTransform);
  const motionStyles = await wheel.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { duration: styles.transitionDuration, timing: styles.transitionTimingFunction };
  });
  const pointerAnimation = await page.locator(".wheel-pointer").evaluate((element) => getComputedStyle(element).animationName);

  expect(motionStyles.duration).toBe("4.6s");
  expect(motionStyles.timing).toContain("cubic-bezier");
  expect(pointerAnimation).toContain("wheel-pointer-tick");
  await expect(page.getByTestId("wheel-result")).toContainText(/มะลิ|สมชาย|น้ำฝน|ต้นกล้า/, { timeout: 6_000 });
});

test("random wheel offers an explicit animation override for reduced-motion users", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/random-wheel");
  await page.getByLabel("ชื่อ ตัวเลือก หรือของรางวัล").fill("มะลิ\nสมชาย\nน้ำฝน\nต้นกล้า");

  const wheel = page.getByTestId("wheel-disc");
  const stage = page.locator(".wheel-stage");
  await expect(stage).toHaveClass(/motion-reduced/);
  await expect(page.getByTestId("wheel-motion-control")).toContainText("ระบบกำลังลดการเคลื่อนไหว");
  expect(await wheel.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  await page.getByRole("button", { name: "เปิดแอนิเมชัน" }).click();
  await expect(stage).toHaveClass(/motion-allowed/);
  await expect(page.locator(".meaw-playground")).toHaveClass(/motion-enabled/);

  await page.getByRole("button", { name: "หมุนวงล้อสุ่ม" }).click();
  const firstTransform = await wheel.evaluate((element) => getComputedStyle(element).transform);
  await expect.poll(
    () => wheel.evaluate((element) => getComputedStyle(element).transform),
    { timeout: 1_500 },
  ).not.toBe(firstTransform);
  expect(await wheel.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("4.6s");
  await expect(page.getByTestId("wheel-result")).toContainText(/มะลิ|สมชาย|น้ำฝน|ต้นกล้า/, { timeout: 6_000 });
});

test("loan, BMI, and profit calculators produce transparent results", async ({ page }) => {
  await page.goto("/loan-calculator");
  await page.getByLabel("วงเงินกู้ (บาท)").fill("1000000");
  await page.getByLabel("ดอกเบี้ยต่อปี (%)").fill("6");
  await page.getByRole("spinbutton", { name: "ระยะเวลาผ่อน", exact: true }).fill("20");
  await page.getByRole("button", { name: "คำนวณค่างวด" }).click();
  await expect(page.getByTestId("loan-payment")).toContainText("7,164.31");

  await page.goto("/bmi-calculator");
  await page.getByLabel("น้ำหนัก (กิโลกรัม)").fill("70");
  await page.getByLabel("ส่วนสูง (เซนติเมตร)").fill("175");
  await page.getByRole("button", { name: "คำนวณ BMI" }).click();
  await expect(page.getByTestId("bmi-result")).toHaveText("22.9");
  await expect(page.getByText("น้ำหนักปกติ", { exact: true })).toBeVisible();

  await page.goto("/profit-margin-calculator");
  await page.getByLabel("ต้นทุนต่อชิ้น (บาท)").fill("60");
  await page.getByLabel("ราคาขายต่อชิ้น (บาท)").fill("100");
  await page.getByLabel("จำนวน").fill("10");
  await page.getByRole("button", { name: "คำนวณกำไร" }).click();
  await expect(page.getByTestId("profit-result")).toContainText("400.00");
  await expect(page.getByText("40%", { exact: true })).toBeVisible();
});

test("VAT calculator adds and extracts VAT while keeping withholding separate", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/vat-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "VAT Calculator Thailand" })).toBeVisible();

  const amountInput = page.locator("#vat-amount");
  await expect(amountInput).toBeVisible();
  const labelGap = await amountInput.evaluate((input) => {
    const label = document.querySelector<HTMLLabelElement>('label[for="vat-amount"]');
    const inputBox = input.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByLabel("ราคาก่อน Service Charge และ VAT (บาท)").fill("1000");
  await page.getByLabel("Service Charge ก่อน VAT (%)").fill("10");
  await page.getByRole("switch", { name: "ประมาณภาษีหัก ณ ที่จ่าย" }).click();
  await page.getByRole("button", { name: "คำนวณ VAT", exact: true }).click();
  await expect(page.getByTestId("vat-base")).toContainText("1,100.00");
  await expect(page.getByTestId("vat-tax")).toContainText("77.00");
  await expect(page.getByTestId("vat-gross-total")).toContainText("1,177.00");
  await expect(page.getByTestId("vat-withholding")).toContainText("33.00");
  await expect(page.getByTestId("vat-net-total")).toContainText("1,144.00");

  await page.getByRole("button", { name: /ถอด VAT ราคารวม VAT แล้ว/ }).click();
  await page.getByLabel("ราคารวม VAT แล้ว (บาท)").fill("1070");
  await page.getByRole("switch", { name: "ประมาณภาษีหัก ณ ที่จ่าย" }).click();
  await page.getByRole("button", { name: "ถอด VAT", exact: true }).click();
  await expect(page.getByTestId("vat-base")).toContainText("1,000.00");
  await expect(page.getByTestId("vat-tax")).toContainText("70.00");
  await expect(page.getByTestId("vat-net-total")).toContainText("1,070.00");
  await expect(page.getByText(/VAT = ราคารวม × 7 ÷ 107/)).toBeVisible();

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("bill split calculator reconciles weighted items, receipt adjustments, and settlements without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/bill-split-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Bill Split & Shared Expense Calculator" })).toBeVisible();
  await expect(page.getByText("กินด้วยกัน หารอย่างแฟร์", { exact: false })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="bill-group-name"]');
    const input = document.querySelector<HTMLInputElement>("#bill-group-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#bill-group-name")).toHaveValue("มื้อเย็นวันเกิด");
  await page.getByRole("button", { name: "คำนวณและสรุปยอดโอน" }).click();
  await expect(page.getByTestId("bill-grand-total")).toContainText("1,883.20");
  await expect(page.getByTestId("bill-person-p1")).toContainText("รับคืน ฿691.32");
  await expect(page.getByTestId("bill-person-p2")).toContainText("จ่ายเพิ่ม ฿425.46");
  await expect(page.getByTestId("bill-person-p3")).toContainText("จ่ายเพิ่ม ฿265.86");
  await expect(page.getByTestId("bill-settlements")).toContainText("Nana");
  await expect(page.getByTestId("bill-settlements")).toContainText("425.46");
  await expect(page.getByTestId("bill-settlements")).toContainText("Taro");
  await expect(page.getByTestId("bill-settlements")).toContainText("265.86");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("bill-split-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-bill-split.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Group","มื้อเย็นวันเกิด"');
  expect(csv).toContain('"Grand total","1883.20","THB"');
  expect(csv).toContain('"Nana","Mew","425.46"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("budget calculator normalizes mixed pay cycles and exports a private household plan without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/budget-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Budget Calculator & 50/30/20 Planner" })).toBeVisible();
  await expect(page.getByText("เงินทุกก้อนมีที่ของมัน", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="budget-household-name"]');
    const input = document.querySelector<HTMLInputElement>("#budget-household-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#budget-household-name")).toHaveValue("บ้านแมวมีสุข");
  await expect(page.getByTestId("budget-income-item")).toHaveCount(2);
  await expect(page.getByTestId("budget-expense-item")).toHaveCount(9);
  await page.getByRole("button", { name: "คำนวณงบประมาณ" }).click();
  await expect(page.getByTestId("budget-monthly-income")).toContainText("73,000.00");
  await expect(page.getByTestId("budget-monthly-expenses")).toContainText("51,983.33");
  await expect(page.getByTestId("budget-monthly-balance")).toContainText("21,016.67");
  await expect(page.getByTestId("budget-bucket-needs")).toContainText("37,033.33");
  await expect(page.getByTestId("budget-bucket-wants")).toContainText("5,700.00");
  await expect(page.getByTestId("budget-bucket-savings-debt")).toContainText("9,250.00");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("budget-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-budget-plan.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Household","บ้านแมวมีสุข"');
  expect(csv).toContain('"Monthly income","73000.00","THB"');
  expect(csv).toContain('"ค่าใช้จ่ายจำเป็น","37033.33"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("profession pages group existing tools by audience with unique SEO and responsive layouts", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/professions");
  await expect(page.getByRole("heading", { level: 1, name: "เครื่องมือแบ่งตามสายอาชีพ" })).toBeVisible();
  await expect(page.getByTestId("profession-card")).toHaveCount(12);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/professions");
  await expect(page.getByRole("link", { name: "ดูตามหมวดหมู่" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/professions/digital-marketing");
  await expect(page.getByRole("heading", { level: 1, name: "เครื่องมือสำหรับการตลาดดิจิทัล" })).toBeVisible();
  await expect(page.getByText("ROAS & Break-even ROAS Calculator", { exact: true })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://meaw-tools.vercel.app/professions/digital-marketing");
  const schema = await page.locator('script[type="application/ld+json"]').textContent();
  expect(schema).toContain("CollectionPage");
  expect(schema).toContain("ItemList");
  expect(schema).toContain("https://meaw-tools.vercel.app/roas-calculator");

  const layout = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return { width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index) };
  });
  expect(layout.scrollWidth).toBe(layout.width);
  expect(layout.duplicateIds).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("ROAS calculator separates revenue ROAS from profit and exports threshold analysis", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/roas-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "ROAS & Break-even ROAS Calculator" })).toBeVisible();
  await expect(page.getByText("ยอดขายสูง ไม่ได้แปลว่ากำไรเสมอ", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="roas-campaign"]');
    const input = document.querySelector<HTMLInputElement>("#roas-campaign");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return { labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0, duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#roas-campaign")).toHaveValue("Summer Cat Campaign");
  await page.getByRole("button", { name: "คำนวณ ROAS และกำไร" }).click();
  await expect(page.getByTestId("roas-gross")).toContainText("4.00x");
  await expect(page.getByTestId("roas-net")).toContainText("3.80x");
  await expect(page.getByTestId("roas-net")).toContainText("380.00%");
  await expect(page.getByTestId("roas-profit")).toContainText("44,300.00");
  await expect(page.getByTestId("roas-break-even")).toContainText("2.01x");
  await expect(page.getByTestId("roas-target")).toContainText("2.89x");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("roas-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-roas-analysis.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Net ROAS","3.8000","x"');
  expect(csv).toContain('"Profit after ads","44300.00","THB"');

  const finalLayout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("fuel cost calculator covers round trips, expense sharing, and both economy units", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/fuel-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Fuel Cost Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณค่าน้ำมันและค่าเดินทาง", { exact: true })).toBeVisible();
  await expect(page.locator("#fuel-distance")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="fuel-distance"]');
    const input = document.querySelector<HTMLInputElement>("#fuel-distance");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณค่าน้ำมัน" }).click();
  await expect(page.getByTestId("fuel-liters")).toContainText("50.00 ลิตร");
  await expect(page.getByTestId("fuel-only-cost")).toContainText("1,825.00");
  await expect(page.getByTestId("fuel-total-cost")).toContainText("2,125.00");
  await expect(page.getByTestId("fuel-per-person")).toContainText("708.33");

  await page.getByLabel("รูปแบบการเดินทาง").click();
  await page.getByRole("option", { name: "เที่ยวเดียว", exact: true }).click();
  await page.getByLabel("หน่วยอัตราสิ้นเปลือง").click();
  await page.getByRole("option", { name: "ลิตรต่อ 100 กิโลเมตร (L/100 km)" }).click();
  await page.locator("#fuel-distance").fill("250");
  await page.locator("#fuel-efficiency").fill("8");
  await page.locator("#fuel-price").fill("40");
  await page.locator("#fuel-passengers").fill("1");
  await page.locator("#fuel-tolls").fill("0");
  await page.locator("#fuel-parking").fill("0");
  await page.getByRole("button", { name: "คำนวณค่าน้ำมัน" }).click();
  await expect(page.getByTestId("fuel-liters")).toContainText("20.00 ลิตร");
  await expect(page.getByTestId("fuel-total-cost")).toContainText("800.00");
  await expect(page.getByText("12.50 กม./ลิตร", { exact: true })).toBeVisible();

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("business days calculator handles Thai bank holidays, endpoint policy, custom workweeks, and CSV", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/business-days-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Business Days Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณวันทำงานและวันทำการ", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /ประกาศ ธปท. ล่าสุด/ })).toHaveAttribute("href", "https://www.bot.or.th/th/financial-institutions-holiday.html");
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="business-start-date"]');
    const input = document.querySelector<HTMLInputElement>("#business-start-date");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณวันทำงาน" }).click();
  await expect(page.getByTestId("business-days-working-count")).toHaveText("20");
  await expect(page.getByTestId("business-days-result")).toContainText("31 วันปฏิทิน");
  await expect(page.getByTestId("business-days-result")).toContainText("วันขึ้นปีใหม่");
  await expect(page.getByRole("row", { name: /มกราคม 2569 31 20 9 2/ })).toBeVisible();

  await page.getByRole("tab", { name: "เพิ่ม / ลบวันทำการ" }).click();
  await page.locator("#business-shift-start").fill("2026-04-10");
  await page.locator("#business-shift-days").fill("10");
  await page.getByRole("button", { name: "เพิ่มวันทำการ" }).click();
  await expect(page.getByTestId("business-days-target")).toContainText("29 เมษายน 2569");
  await expect(page.getByTestId("business-days-result")).toContainText("วันสงกรานต์");

  await page.getByRole("button", { name: "เสาร์ เป็นวันหยุด" }).click();
  await page.getByRole("button", { name: "เพิ่มวันทำการ" }).click();
  await expect(page.getByTestId("business-days-target")).toContainText("25 เมษายน 2569");

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-business-days.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain("2026-04-13");
  expect(csv).toContain("วันสงกรานต์");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("working hours calculator handles breaks, overnight shifts, transparent rounding, and CSV", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/working-hours-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Working Hours Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณชั่วโมงทำงานและ Timesheet", { exact: true })).toBeVisible();
  await expect(page.locator("#working-entry-entry-1-date")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="working-entry-entry-1-date"]');
    const input = document.querySelector<HTMLInputElement>("#working-entry-entry-1-date");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณชั่วโมงทำงาน" }).click();
  await expect(page.getByTestId("working-hours-total")).toContainText("38 ชม.");
  await expect(page.getByTestId("working-hours-result")).toContainText("38.00 ชั่วโมงทศนิยม");
  await expect(page.getByTestId("working-hours-target")).toContainText("ขาดจากเป้าหมาย 2 ชม.");
  await expect(page.getByTestId("working-hours-result")).toContainText("กะข้ามวัน");
  await expect(page.getByRole("row", { name: /2026-08-05 กะกลางคืน 22:00–06:30 ข้ามวัน/ })).toBeVisible();

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-working-hours.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain("2026-08-05");
  expect(csv).toContain("38.00");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("shift pattern calculator builds an overnight roster calendar and exports CSV and ICS", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/shift-pattern-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Shift Pattern Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("สร้างตารางกะและปฏิทินเวร", { exact: true })).toBeVisible();
  await expect(page.locator("#shift-start-date")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="shift-start-date"]');
    const input = document.querySelector<HTMLInputElement>("#shift-start-date");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "สร้างตารางกะ" }).click();
  await expect(page.getByTestId("shift-working-days")).toContainText("16 วัน");
  await expect(page.getByTestId("shift-net-hours")).toContainText("176 ชม.");
  await expect(page.getByTestId("shift-pattern-result")).toContainText("176.00 ชั่วโมงทศนิยม");
  await expect(page.getByTestId("shift-pattern-result")).toContainText("กะข้ามวัน");
  await expect(page.getByRole("heading", { name: /สิงหาคม 2569/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /2026-08-03.*N.*20:00–08:00.*ข้ามวัน/ })).toBeVisible();

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-shift-pattern.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain("2026-08-03");
  expect(csv).toContain("176.00");

  const icsDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด ICS" }).click();
  const icsDownload = await icsDownloadPromise;
  expect(icsDownload.suggestedFilename()).toBe("meaw-shift-calendar.ics");
  const icsPath = await icsDownload.path();
  expect(icsPath).toBeTruthy();
  const ics = await readFile(icsPath!, "utf8");
  expect(ics).toContain("DTSTART:20260803T200000");
  expect(ics).toContain("DTEND:20260804T080000");
  expect(ics).toContain("DTSTART;VALUE=DATE:20260805");

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("hourly rate calculator converts salary and builds a transparent freelance rate", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/hourly-rate-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Hourly Rate Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณค่าแรงรายชั่วโมงและเรทฟรีแลนซ์", { exact: true })).toBeVisible();
  await expect(page.locator("#salary-rate-amount")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="salary-rate-amount"]');
    const input = document.querySelector<HTMLInputElement>("#salary-rate-amount");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "แปลงเป็นรายชั่วโมง" }).click();
  await expect(page.getByTestId("salary-hourly-rate")).toContainText("฿187.50/ชม.");
  await expect(page.getByTestId("salary-rate-result")).toContainText("฿390,000.00");
  await expect(page.getByTestId("salary-rate-result")).toContainText("2,080 ชั่วโมง");

  const salaryCsvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const salaryCsvDownload = await salaryCsvPromise;
  expect(salaryCsvDownload.suggestedFilename()).toBe("meaw-hourly-rate.csv");
  const salaryCsvPath = await salaryCsvDownload.path();
  expect(salaryCsvPath).toBeTruthy();
  expect(await readFile(salaryCsvPath!, "utf8")).toContain('"เทียบรายชั่วโมง","187.50","THB"');

  await page.getByRole("tab", { name: "คำนวณเรทฟรีแลนซ์" }).click();
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณเรทฟรีแลนซ์" }).click();
  await expect(page.getByTestId("freelance-hourly-rate")).toContainText("฿800.00/ชม.");
  await expect(page.getByTestId("freelance-rate-result")).toContainText("ขั้นต่ำก่อนปัด ฿794.44");
  await expect(page.getByTestId("freelance-rate-result")).toContainText("฿6,400.00");
  await expect(page.getByTestId("freelance-rate-result")).toContainText("฿27,111.11");
  await expect(page.getByTestId("freelance-rate-result")).toContainText("1,200 ชม.");

  const freelanceCsvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const freelanceCsvDownload = await freelanceCsvPromise;
  expect(freelanceCsvDownload.suggestedFilename()).toBe("meaw-freelance-rate.csv");
  const freelanceCsvPath = await freelanceCsvDownload.path();
  expect(freelanceCsvPath).toBeTruthy();
  expect(await readFile(freelanceCsvPath!, "utf8")).toContain('"เรทหลังปัดขึ้น","800.00","THB/ชั่วโมง"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("meeting cost calculator estimates recurring cost and runs a private live timer", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/meeting-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Meeting Cost Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณต้นทุนประชุมและจับเวลาแบบสด", { exact: true })).toBeVisible();
  await expect(page.locator("#group-1-rate")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="group-1-rate"]');
    const input = document.querySelector<HTMLInputElement>("#group-1-rate");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณต้นทุนประชุม" }).click();
  await expect(page.getByTestId("meeting-total-cost")).toHaveText("฿4,250.00");
  await expect(page.getByTestId("meeting-cost-result")).toContainText("฿70.83");
  await expect(page.getByTestId("meeting-cost-result")).toContainText("8 ชม.");
  await expect(page.getByTestId("meeting-cost-result")).toContainText("฿408,000.00");
  await expect(page.getByTestId("meeting-cost-result")).toContainText("฿90,000.00");
  await expect(page.getByTestId("meeting-live-cost")).toHaveText("฿500.00");

  await page.getByRole("button", { name: "เริ่มจับเวลา" }).click();
  await expect(page.getByText("กำลังจับเวลา ·", { exact: false })).toBeVisible();
  await page.waitForTimeout(1_200);
  await page.getByRole("button", { name: "พักเวลา" }).click();
  await expect(page.getByTestId("meeting-live-time")).not.toHaveText("00:00:00");
  const liveCost = Number((await page.getByTestId("meeting-live-cost").textContent())?.replace(/[^0-9.]/g, ""));
  expect(liveCost).toBeGreaterThan(500);
  await expect(page.getByText("หยุดอยู่ ·", { exact: false })).toBeVisible();

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-meeting-cost.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"ต้นทุนรวมต่อครั้ง","4250.00","THB"');
  expect(csv).toContain('"ผู้บริหาร","2","1200000.00","ต่อปี"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("billable hours calculator rounds each entry and explains utilization and revenue gap", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/billable-hours-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Billable Hours Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณชั่วโมงคิดเงินและ Billable Utilization", { exact: true })).toBeVisible();
  await expect(page.locator("#billable-hourly-rate")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="billable-hourly-rate"]');
    const input = document.querySelector<HTMLInputElement>("#billable-hourly-rate");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณ Billable Hours" }).click();
  await expect(page.getByTestId("billable-invoice-hours")).toHaveText("4 ชม. 30 นาที");
  await expect(page.getByTestId("billable-invoice-revenue")).toHaveText("฿6,750.00");
  await expect(page.getByTestId("billable-utilization")).toHaveText("55.21%");
  await expect(page.getByTestId("billable-hours-result")).toContainText("฿324,000.00");
  await expect(page.getByTestId("billable-hours-result")).toContainText("฿114,000.00");
  await expect(page.getByTestId("billable-hours-result")).toContainText("1–6 นาที");
  await expect(page.getByRole("row", { name: /ประชุมเริ่มงาน.*Billable.*52 นาที.*54 นาที.*฿1,350.00/ })).toBeVisible();

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-billable-hours.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"เวลาที่ออกบิลหลังปัด","270.00","นาที"');
  expect(csv).toContain('"ประชุมเริ่มงาน","Billable","52.00","54.00","2.00","1350.00"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("project cost calculator compares budget with actual plus remaining on mobile", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/project-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Project Cost & Profit Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณต้นทุนและกำไรโครงการ", { exact: true })).toBeVisible();
  await expect(page.locator("#project-base-revenue")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="project-base-revenue"]');
    const input = document.querySelector<HTMLInputElement>("#project-base-revenue");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("project-labor-item")).toHaveCount(3);
  await expect(page.getByTestId("project-direct-cost-item")).toHaveCount(2);
  await page.getByRole("button", { name: "คำนวณต้นทุนและกำไรโครงการ" }).click();
  await expect(page.getByTestId("project-current-revenue")).toHaveText("฿640,000.00");
  await expect(page.getByTestId("project-forecast-cost")).toHaveText("฿468,500.00");
  await expect(page.getByTestId("project-forecast-profit")).toHaveText("฿171,500.00");
  await expect(page.getByTestId("project-forecast-margin")).toHaveText("26.8%");
  await expect(page.getByTestId("project-additional-revenue")).toHaveText("฿29,285.71");
  await expect(page.getByTestId("project-cost-result")).toContainText("+฿45,000.00");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-project-cost-profit.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"ต้นทุนรวม","423500.00","355000.00","113500.00","468500.00","45000.00","THB"');
  expect(csv).toContain('"พัฒนา","850.00","250.00","220.00","50.00","270.00","212500.00","229500.00","17000.00","THB"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("team capacity calculator exposes role bottlenecks without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/team-capacity-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Team Capacity & Workload Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณ Capacity ทีม ภาระงาน และ FTE", { exact: true })).toBeVisible();
  await expect(page.locator("#team-working-days")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="team-working-days"]');
    const input = document.querySelector<HTMLInputElement>("#team-working-days");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("team-capacity-group")).toHaveCount(4);
  await page.getByRole("button", { name: "คำนวณ Capacity และ Workload" }).click();
  await expect(page.getByTestId("team-planned-capacity")).toHaveText("417.42 ชม.");
  await expect(page.getByTestId("team-demand-hours")).toHaveText("450 ชม.");
  await expect(page.getByTestId("team-capacity-gap")).toHaveText("−32.58 ชม.");
  await expect(page.getByTestId("team-load-percent")).toHaveText("107.81%");
  await expect(page.getByTestId("team-additional-fte")).toHaveText("0.94 FTE");
  await expect(page.getByTestId("team-capacity-result")).toContainText("Development");
  await expect(page.getByTestId("team-capacity-result")).toContainText("เกินกำลัง");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-team-capacity.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"Planned capacity หลัง buffer","417.42","ชั่วโมง"');
  expect(csv).toContain('"Development","4.00","1.00","75.00","320.00","32.00","72.00","216.00","21.60","194.40","240.00","-45.60","123.46","4.94","0.94"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("labor cost calculator explains loaded cost without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/labor-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Labor Cost & Employee Cost Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณต้นทุนพนักงานและค่าแรงจริง", { exact: true })).toBeVisible();
  await expect(page.locator("#labor-pay-amount")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="labor-pay-amount"]');
    const input = document.querySelector<HTMLInputElement>("#labor-pay-amount");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณต้นทุนพนักงาน" }).click();
  await expect(page.getByTestId("labor-annual-cost")).toContainText("861,700.00");
  await expect(page.getByTestId("labor-monthly-cost")).toContainText("71,808.33");
  await expect(page.getByTestId("labor-productive-rate")).toContainText("468.32");
  await expect(page.getByTestId("labor-team-cost")).toContainText("2,585,100.00");
  await expect(page.getByTestId("labor-burden-rate")).toHaveText("43.62%");
  await expect(page.getByTestId("labor-cost-multiplier")).toHaveText("1.44×");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-labor-cost.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"ต้นทุนรวมต่อปี","861700.00","THB"');
  expect(csv).toContain('"ต้นทุนทีมต่อปี","2585100.00","THB"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("sales commission calculator explains tier payouts without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/sales-commission-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Sales Commission Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณค่าคอมมิชชันและ Commission แบบขั้นบันได", { exact: true })).toBeVisible();
  await expect(page.locator("#commission-gross-sales")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="commission-gross-sales"]');
    const input = document.querySelector<HTMLInputElement>("#commission-gross-sales");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("commission-tier-input")).toHaveCount(3);
  await page.getByRole("button", { name: "คำนวณค่าคอมมิชชัน" }).click();
  await expect(page.getByTestId("commission-payout")).toHaveText("฿8,000.00");
  await expect(page.getByTestId("commission-before-adjustment")).toHaveText("฿7,800.00");
  await expect(page.getByTestId("commission-total-earnings")).toHaveText("฿33,000.00");
  await expect(page.getByTestId("commission-quota-attainment")).toHaveText("115%");
  await expect(page.getByTestId("commission-annualized")).toHaveText("฿96,000.00");
  await expect(page.getByTestId("commission-effective-rate")).toHaveText("6.96%");
  await expect(page.getByTestId("sales-commission-result")).toContainText("Marginal ฿7,800.00");
  await expect(page.getByTestId("sales-commission-result")).toContainText("Retroactive ฿13,800.00");
  await expect(page.getByTestId("commission-tier-row")).toHaveCount(3);

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-sales-commission.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"Commission payout สุทธิ","8000.00","THB"');
  expect(csv).toContain('"ขั้น 3","100000.00","ไม่จำกัด","15000.00","12.00","1800.00","THB"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("safety stock calculator separates inventory policies without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/safety-stock-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Safety Stock & Reorder Point Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณ Safety Stock และจุดสั่งซื้อสินค้า", { exact: true })).toBeVisible();
  await expect(page.locator("#safety-average-demand")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="safety-average-demand"]');
    const input = document.querySelector<HTMLInputElement>("#safety-average-demand");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.locator("#safety-method").click();
  await page.getByRole("option", { name: "Days of cover" }).click();
  await expect(page.locator("#safety-cover-periods")).toBeVisible();
  await expect(page.locator("#safety-demand-stddev")).toHaveCount(0);
  await page.locator("#safety-method").click();
  await page.getByRole("option", { name: "Service level + ความผันผวน" }).click();
  await expect(page.locator("#safety-demand-stddev")).toBeVisible();

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณ Safety Stock" }).click();
  await expect(page.getByTestId("safety-stock-recommended")).toHaveText("187 หน่วย");
  await expect(page.getByTestId("reorder-point-recommended")).toHaveText("887 หน่วย");
  await expect(page.getByTestId("lead-time-demand")).toHaveText("700 หน่วย");
  await expect(page.getByTestId("inventory-position")).toHaveText("725 หน่วย");
  await expect(page.getByTestId("reorder-status")).toHaveText("ถึงจุดสั่งซื้อแล้ว");
  await expect(page.getByTestId("safety-buffer")).toHaveText("1.86 วัน");
  await expect(page.getByTestId("safety-stock-result")).toContainText("ต่ำกว่าหรือเท่าจุดสั่งซื้อ 162 หน่วย");
  await expect(page.getByTestId("safety-stock-result")).toContainText("z-score");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-safety-stock.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"Safety Stock แนะนำ","187.00","หน่วย"');
  expect(csv).toContain('"Reorder Point แนะนำ","887.00","หน่วย"');
  expect(csv).toContain('"สถานะสั่งซื้อ","ถึงจุดสั่งซื้อ",""');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("inventory turnover calculator separates COGS, average inventory, and days without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/inventory-turnover-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Inventory Turnover & Inventory Days Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณ Inventory Turnover และ Inventory Days", { exact: true })).toBeVisible();
  await expect(page.locator("#inventory-cogs")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="inventory-cogs"]');
    const input = document.querySelector<HTMLInputElement>("#inventory-cogs");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.locator("#inventory-average-method").click();
  await page.getByRole("option", { name: "เฉลี่ยจากหลาย Snapshot" }).click();
  await expect(page.locator("#inventory-snapshots")).toBeVisible();
  await expect(page.locator("#inventory-opening")).toHaveCount(0);
  await page.locator("#inventory-average-method").click();
  await page.getByRole("option", { name: "Inventory ต้นรอบ + ปลายรอบ" }).click();
  await expect(page.locator("#inventory-opening")).toBeVisible();

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณ Inventory Turnover" }).click();
  await expect(page.getByTestId("inventory-turnover-period")).toHaveText("4.8 รอบ");
  await expect(page.getByTestId("inventory-turnover-annualized")).toHaveText("4.8 รอบ/ปี");
  await expect(page.getByTestId("inventory-days")).toHaveText("76.04 วัน");
  await expect(page.getByTestId("inventory-average")).toHaveText("฿250,000.00");
  await expect(page.getByTestId("inventory-weeks")).toHaveText("10.86 สัปดาห์");
  await expect(page.getByTestId("inventory-cogs-per-day")).toHaveText("฿3,287.67");
  await expect(page.getByTestId("inventory-target-average")).toHaveText("฿200,000.00");
  await expect(page.getByTestId("inventory-target-status")).toHaveText("Average inventory สูงกว่าระดับตามเป้าหมาย");
  await expect(page.getByTestId("inventory-turnover-result")).toContainText("Inventory ปลายรอบเทียบ COGS เฉลี่ยปัจจุบันครอบคลุมประมาณ 60.83 วัน");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-inventory-turnover.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"Average inventory","250000.00","THB"');
  expect(csv).toContain('"Inventory turnover ในรอบ","4.80","รอบ"');
  expect(csv).toContain('"Inventory days / DIO","76.04","วัน"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("COGS calculator keeps the accounting waterfall auditable without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/cost-of-goods-sold-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Cost of Goods Sold (COGS) Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณต้นทุนขาย COGS", { exact: true })).toBeVisible();
  await expect(page.locator("#cogs-beginning-inventory")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="cogs-beginning-inventory"]');
    const input = document.querySelector<HTMLInputElement>("#cogs-beginning-inventory");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await expect(page.locator("#cogs-purchase-returns")).toHaveCount(0);
  await page.locator("#cogs-mode").click();
  await page.getByRole("option", { name: "สูตรละเอียด" }).click();
  await expect(page.locator("#cogs-purchase-returns")).toBeVisible();
  await page.locator("#cogs-mode").click();
  await page.getByRole("option", { name: "สูตรพื้นฐาน" }).click();
  await expect(page.locator("#cogs-purchase-returns")).toHaveCount(0);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#cogs-purchase-returns")).toBeVisible();
  await page.getByRole("button", { name: "คำนวณต้นทุนขาย COGS" }).click();
  await expect(page.getByTestId("cogs-total")).toHaveText("฿750,000.00");
  await expect(page.getByTestId("cogs-goods-available")).toHaveText("฿1,000,000.00");
  await expect(page.getByTestId("cogs-net-purchases")).toHaveText("฿700,000.00");
  await expect(page.getByTestId("cogs-production-costs")).toHaveText("฿100,000.00");
  await expect(page.getByTestId("cogs-gross-profit")).toHaveText("฿450,000.00");
  await expect(page.getByTestId("cogs-gross-margin")).toHaveText("37.5%");
  await expect(page.getByTestId("cogs-per-unit")).toHaveText("฿150.00");
  await expect(page.getByTestId("cogs-sales-status")).toHaveText("มีกำไรขั้นต้น");
  await expect(page.getByTestId("cogs-result")).toContainText("ต้นทุนสินค้าที่มีไว้ขาย");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-cogs-calculator.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"ยอดซื้อสุทธิ","700000.00","THB"');
  expect(csv).toContain('"ต้นทุนสินค้าที่มีไว้ขาย","1000000.00","THB"');
  expect(csv).toContain('"ต้นทุนขาย COGS","750000.00","THB"');

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("food cost calculator handles yield, portions, pricing, and local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/food-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Food Cost & Recipe Cost Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณ Food Cost ต้นทุนสูตรอาหาร", { exact: true })).toBeVisible();
  await expect(page.locator("#food-cost-servings")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="food-cost-servings"]');
    const input = document.querySelector<HTMLInputElement>("#food-cost-servings");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#food-cost-ingredient-4-name")).toHaveValue("ซอส");
  await page.getByRole("button", { name: "คำนวณ Food Cost" }).click();
  await expect(page.getByTestId("food-cost-batch")).toHaveText("฿166.80");
  await expect(page.getByTestId("food-cost-serving")).toHaveText("฿20.85");
  await expect(page.getByTestId("food-cost-direct-serving")).toHaveText("฿45.85");
  await expect(page.getByTestId("food-cost-target-price")).toHaveText("฿74.46");
  await expect(page.getByTestId("food-cost-direct-batch")).toHaveText("฿366.80");
  await expect(page.getByTestId("food-cost-percent")).toHaveText("23.43%");
  await expect(page.getByTestId("food-cost-direct-percent")).toHaveText("51.52%");
  await expect(page.getByTestId("food-cost-contribution")).toHaveText("฿43.15");
  await expect(page.getByTestId("food-cost-status")).toContainText("อยู่ในหรือต่ำกว่าเป้า");
  await expect(page.getByTestId("food-cost-result")).toContainText("ต้นทุนแยกตามวัตถุดิบ");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-food-recipe-cost.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"ต้นทุนวัตถุดิบต่อสูตร","166.80","THB"');
  expect(csv).toContain('"ต้นทุนตรงรวมต่อเสิร์ฟ","45.85","THB/เสิร์ฟ"');
  expect(csv).toContain('"ราคาขายแนะนำจากเป้าหมาย Food cost","74.46","THB/เสิร์ฟ"');

  const finalLayout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("drink cost calculator handles pour yield, pricing, ABV, and local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/drink-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Drink, Cocktail & Liquor Cost Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณต้นทุนเครื่องดื่มและ Pour Cost", { exact: true })).toBeVisible();
  await expect(page.locator("#drink-cost-selling-price")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="drink-cost-selling-price"]');
    const input = document.querySelector<HTMLInputElement>("#drink-cost-selling-price");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#drink-cost-ingredient-4-name")).toHaveValue("ไซรัป");
  await page.getByRole("button", { name: "คำนวณ Drink Cost" }).click();
  await expect(page.getByTestId("drink-cost-liquid")).toHaveText("฿62.64");
  await expect(page.getByTestId("drink-cost-beverage")).toHaveText("฿66.64");
  await expect(page.getByTestId("drink-cost-direct")).toHaveText("฿84.64");
  await expect(page.getByTestId("drink-cost-target-price")).toHaveText("฿302.90");
  await expect(page.getByTestId("drink-cost-percent")).toHaveText("20.82%");
  await expect(page.getByTestId("drink-cost-direct-percent")).toHaveText("26.45%");
  await expect(page.getByTestId("drink-cost-contribution")).toHaveText("฿235.36");
  await expect(page.getByTestId("drink-cost-abv")).toHaveText("16.92%");
  await expect(page.getByTestId("drink-cost-standard-drink")).toHaveText("1.24");
  await expect(page.getByTestId("drink-cost-status")).toContainText("อยู่ในหรือต่ำกว่าเป้า");
  await expect(page.getByTestId("drink-cost-result")).toContainText("ต้นทุนแยกตามของเหลว");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-drink-cocktail-cost.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"ต้นทุนของเหลวต่อแก้ว","62.64","THB/แก้ว"');
  expect(csv).toContain('"ต้นทุนวัตถุดิบเครื่องดื่มต่อแก้ว","66.64","THB/แก้ว"');
  expect(csv).toContain('"ABV หลัง Dilution โดยประมาณ","16.9231","%"');

  const finalLayout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("coffee cost calculator handles dose, yield, fees, monthly purchasing, and local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/coffee-cost-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Coffee Cost Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณต้นทุนกาแฟต่อแก้ว", { exact: true })).toBeVisible();
  await expect(page.locator("#coffee-cost-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="coffee-cost-name"]');
    const input = document.querySelector<HTMLInputElement>("#coffee-cost-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#coffee-cost-extra-1-name")).toHaveValue("ไซรัป");
  await page.getByRole("button", { name: "คำนวณ Coffee Cost" }).click();
  await expect(page.getByTestId("coffee-cost-bean")).toHaveText("฿14.33");
  await expect(page.getByTestId("coffee-cost-milk")).toHaveText("฿8.25");
  await expect(page.getByTestId("coffee-cost-ingredient")).toHaveText("฿26.25");
  await expect(page.getByTestId("coffee-cost-direct")).toHaveText("฿50.10");
  await expect(page.getByTestId("coffee-cost-target-price")).toHaveText("฿93.76");
  await expect(page.getByTestId("coffee-cost-percent")).toHaveText("27.63%");
  await expect(page.getByTestId("coffee-cost-direct-percent")).toHaveText("52.74%");
  await expect(page.getByTestId("coffee-cost-contribution")).toHaveText("฿44.90");
  await expect(page.getByTestId("coffee-cost-monthly-cups")).toHaveText("2,400 แก้ว");
  await expect(page.getByTestId("coffee-cost-monthly-beans")).toHaveText("44.0816 ถุง");
  await expect(page.getByTestId("coffee-cost-monthly-direct")).toHaveText("฿120,246.32");
  await expect(page.getByTestId("coffee-cost-monthly-contribution")).toHaveText("฿107,753.68");
  await expect(page.getByTestId("coffee-cost-status")).toContainText("อยู่ในหรือต่ำกว่าเป้า");
  await expect(page.getByTestId("coffee-cost-result")).toContainText("Recipe cost และจำนวนแก้วต่อแพ็ก");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-coffee-cost-per-cup.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"ต้นทุนวัตถุดิบรวมต่อแก้ว","26.25","THB/แก้ว"');
  expect(csv).toContain('"จำนวนแก้วต่อเดือน","2400.0000","แก้ว"');
  expect(csv).toContain('"ถุงเมล็ดต่อเดือน","44.0816","ถุง"');

  const finalLayout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("coffee roasting calculator handles roast loss, batch cost, bag pricing, monthly planning, and local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/coffee-roasting-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Coffee Roasting Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("ต้นทุนคั่วกาแฟ", { exact: true })).toBeVisible();
  await expect(page.locator("#coffee-roasting-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="coffee-roasting-name"]');
    const input = document.querySelector<HTMLInputElement>("#coffee-roasting-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#coffee-roasting-name")).toHaveValue("House Blend · Medium Roast");
  await page.getByRole("button", { name: "คำนวณ Coffee Roasting" }).click();
  await expect(page.getByTestId("coffee-roasting-loss")).toHaveText("15%");
  await expect(page.getByTestId("coffee-roasting-yield")).toHaveText("85%");
  await expect(page.getByTestId("coffee-roasting-cost-kg")).toHaveText("฿155.29/kg");
  await expect(page.getByTestId("coffee-roasting-cost-bag")).toHaveText("฿46.82");
  await expect(page.getByTestId("coffee-roasting-target-price")).toHaveText("฿69.89");
  await expect(page.getByTestId("coffee-roasting-loss-variance")).toHaveText("+0.5 pp");
  await expect(page.getByTestId("coffee-roasting-bags")).toHaveText("17 ถุง");
  await expect(page.getByTestId("coffee-roasting-monthly-bags")).toHaveText("340 ถุง");
  await expect(page.getByTestId("coffee-roasting-monthly-contribution")).toHaveText("฿36,848.00");
  await expect(page.getByTestId("coffee-roasting-result")).toContainText("ต้นทุนกระบวนการต่อ Batch");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-coffee-roasting-cost.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Roast loss","15.0000","%"');
  expect(csv).toContain('"ต้นทุนกระบวนการรวม","660.00","THB"');
  expect(csv).toContain('"จำนวนถุงเต็ม","340","ถุง"');

  const finalLayout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("break-even calculator handles product mix, CVP graph, target profit, capacity, and local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/break-even-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Break-even Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณจุดคุ้มทุน", { exact: true })).toBeVisible();
  await expect(page.locator("#break-even-scenario-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="break-even-scenario-name"]');
    const input = document.querySelector<HTMLInputElement>("#break-even-scenario-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#break-even-scenario-name")).toHaveValue("Coffee shop · แผนรายเดือน");
  await expect(page.getByText("Mix 100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "คำนวณจุดคุ้มทุน" }).click();

  await expect(page.getByTestId("break-even-units")).toContainText("2,104");
  await expect(page.getByTestId("break-even-units")).toContainText("2,103.2505");
  await expect(page.getByTestId("break-even-revenue")).toContainText("฿171,414.91");
  await expect(page.getByTestId("break-even-contribution")).toContainText("฿52.30");
  await expect(page.getByTestId("break-even-target-units")).toContainText("2,869");
  await expect(page.getByTestId("break-even-operating-profit")).toContainText("+฿46,900.00");
  await expect(page.getByTestId("break-even-margin-safety")).toContainText("29.89%");
  await expect(page.getByRole("img", { name: /กราฟรายได้ ต้นทุนรวม จุดคุ้มทุน/ })).toBeVisible();
  await expect(page.getByText("Capacity รองรับเป้าหมายที่กรอก", { exact: true })).toBeVisible();
  await expect(page.getByTestId("break-even-result")).toContainText("Product mix ที่ใช้คำนวณ");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-business-break-even.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Break-even revenue","171414.91","THB"');
  expect(csv).toContain('"Operating profit","46900.00","THB"');
  expect(csv).toContain('"Americano","70.00","20.00","40.0000"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("payback calculator compares simple and discounted recovery, NPV, timeline, and local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/payback-period-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Payback Period Calculator" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณระยะเวลาคืนทุน", { exact: true })).toBeVisible();
  await expect(page.locator("#payback-scenario-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="payback-scenario-name"]');
    const input = document.querySelector<HTMLInputElement>("#payback-scenario-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#payback-scenario-name")).toHaveValue("เครื่องจักรใหม่ · 6 ปี");
  await page.getByRole("button", { name: "คำนวณ Payback" }).click();

  await expect(page.getByTestId("payback-simple")).toContainText("4.00 ปี");
  await expect(page.getByTestId("payback-discounted")).toContainText("5.0489 ปี");
  await expect(page.getByTestId("payback-npv")).toContainText("+฿28,356.19");
  await expect(page.getByRole("img", { name: "กราฟ Simple และ Discounted cumulative cash flow" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline กระแสเงินสด" })).toBeVisible();
  await expect(page.getByTestId("payback-result")).toContainText("PV เงินสดอนาคต ฿188,356.19");

  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-payback-period.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Simple payback","4.000000","period"');
  expect(csv).toContain('"Discounted payback","5.048876","period"');
  expect(csv).toContain('"Net present value (NPV)","28356.19","THB"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("IRR calculator explains its assumptions, renders the NPV profile, and exports a local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/irr-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "IRR & MIRR Calculator" })).toBeVisible();
  await expect(page.getByText("ใช้กับกระแสเงินสดที่เกิดเป็นงวดสม่ำเสมอ", { exact: true })).toBeVisible();
  await expect(page.locator("#irr-scenario-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="irr-scenario-name"]');
    const input = document.querySelector<HTMLInputElement>("#irr-scenario-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#irr-scenario-name")).toHaveValue("เครื่องจักรใหม่ · แผน 5 ปี");
  await page.getByRole("button", { name: "คำนวณ IRR และ MIRR" }).click();

  await expect(page.getByTestId("irr-primary")).toContainText("13.073554%");
  await expect(page.getByTestId("mirr-primary")).toContainText("12.609413%");
  await expect(page.getByTestId("irr-npv")).toContainText("+฿9,859.42");
  await expect(page.getByTestId("irr-pattern")).toContainText("1 Sign change");
  await expect(page.getByRole("img", { name: /กราฟ NPV profile/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline ที่ Hurdle rate" })).toBeVisible();
  await expect(page.getByTestId("irr-result")).toContainText("Finance rate");
  await expect(page.getByTestId("irr-result")).toContainText("Reinvestment");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("irr-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-irr-mirr.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"IRR & MIRR Calculator","เครื่องจักรใหม่ · แผน 5 ปี"');
  expect(csv).toContain('"MIRR"');
  expect(csv).toContain('"งวด","ชื่อ","Cash flow","Discount factor","Present value","Cumulative present value"');

  await page.getByRole("button", { name: "ล้างข้อมูล" }).click();
  await page.locator("#irr-scenario-name").fill("ตัวอย่างหลายราก");
  for (const period of [5, 4, 3]) await page.getByRole("button", { name: `ลบงวด ${period}` }).click();
  const cashFlowInputs = page.getByRole("spinbutton", { name: "Cash flow" });
  await cashFlowInputs.nth(0).fill("-100");
  await cashFlowInputs.nth(1).fill("230");
  await cashFlowInputs.nth(2).fill("-132");
  await page.getByRole("button", { name: "คำนวณ IRR และ MIRR" }).click();
  await expect(page.getByText(/พบ IRR หลายค่า/)).toBeVisible();
  await expect(page.getByTestId("irr-primary")).toContainText("2 ค่า");
  await expect(page.getByTestId("irr-root")).toHaveCount(2);
  await expect(page.getByTestId("irr-root").nth(0)).toContainText("10.00%");
  await expect(page.getByTestId("irr-root").nth(1)).toContainText("20.00%");

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("XIRR calculator uses actual dates, exposes multiple roots, and exports a local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/xirr-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "XIRR & XNPV Calculator" })).toBeVisible();
  await expect(page.getByText("ใช้กับกระแสเงินสดที่เกิดคนละวันหรือช่วงเวลาไม่เท่ากัน", { exact: true })).toBeVisible();
  await expect(page.locator("#xirr-scenario-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="xirr-scenario-name"]');
    const input = document.querySelector<HTMLInputElement>("#xirr-scenario-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#xirr-scenario-name")).toHaveValue("Microsoft XIRR example");
  await page.getByRole("button", { name: "คำนวณ XIRR และ XNPV" }).click();

  await expect(page.getByTestId("xirr-primary")).toContainText("37.336253%");
  await expect(page.getByTestId("xirr-xnpv")).toContainText("+฿2,086.65");
  await expect(page.getByTestId("xirr-duration")).toContainText("456 วัน");
  await expect(page.getByTestId("xirr-pattern")).toContainText("1 Sign change");
  await expect(page.getByRole("img", { name: /กราฟ XNPV profile/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline ที่ Hurdle rate" })).toBeVisible();
  await expect(page.getByTestId("xirr-result")).toContainText("Relative residual");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("xirr-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-xirr-xnpv.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"XIRR & XNPV Date Calculator","Microsoft XIRR example"');
  expect(csv).toContain('"XNPV at hurdle rate","2086.65","THB"');
  expect(csv).toContain('"วันที่","ชื่อรายการ","Cash flow","จำนวนวันจากวันแรก"');

  await page.getByRole("button", { name: "ล้างข้อมูล" }).click();
  await page.locator("#xirr-scenario-name").fill("ตัวอย่างหลายราก");
  await page.getByRole("button", { name: "ลบรายการที่ 4" }).click();
  const dates = page.locator('input[id^="xirr-date-"]');
  const labels = page.locator('input[id^="xirr-label-"]');
  const amounts = page.locator('input[id^="xirr-amount-"]');
  for (const [index, date] of ["2025-01-01", "2026-01-01", "2027-01-01"].entries()) {
    await dates.nth(index).fill(date);
    await labels.nth(index).fill(index ? `รับ/จ่าย ${index}` : "ลงทุน");
  }
  await amounts.nth(0).fill("-100");
  await amounts.nth(1).fill("230");
  await amounts.nth(2).fill("-132");
  await page.getByRole("button", { name: "คำนวณ XIRR และ XNPV" }).click();
  await expect(page.getByText(/พบ XIRR หลายค่า/)).toBeVisible();
  await expect(page.getByTestId("xirr-primary")).toContainText("2 ค่า");
  await expect(page.getByTestId("xirr-root")).toHaveCount(2);
  await expect(page.getByTestId("xirr-root").nth(0)).toContainText("10.00%");
  await expect(page.getByTestId("xirr-root").nth(1)).toContainText("20.00%");

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("compound savings calculator matches FV, solves a savings goal, and exports local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/compound-interest-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Compound Interest & Savings Goal Calculator" })).toBeVisible();
  await expect(page.getByText("วางแผนเงินออมแบบเห็นทั้งยอดจริงและกำลังซื้อ", { exact: true })).toBeVisible();
  await expect(page.locator("#savings-scenario-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="savings-scenario-name"]');
    const input = document.querySelector<HTMLInputElement>("#savings-scenario-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#savings-scenario-name")).toHaveValue("ตัวอย่าง Microsoft FV");
  await page.getByRole("button", { name: "คำนวณดอกเบี้ยทบต้นและเงินออม" }).click();
  await expect(page.getByTestId("savings-primary")).toContainText("฿2,301.40");
  await expect(page.getByTestId("savings-interest")).toContainText("+฿101.40");
  await expect(page.getByTestId("savings-apy")).toContainText("6.1678%");
  await expect(page.getByRole("img", { name: "กราฟยอดเงินออม 1 ปี" })).toBeVisible();
  await expect(page.getByTestId("savings-timeline")).toContainText("ปี 1");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("savings-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-compound-savings.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Scenario","ตัวอย่าง Microsoft FV"');
  expect(csv).toContain('"Future value","2301.');
  expect(csv).toContain('"Year","Opening balance","Contributions","Interest"');

  await page.getByRole("tab", { name: "หาเงินออมให้ถึงเป้าหมาย" }).click();
  await page.locator("#savings-initial").fill("0");
  await page.locator("#savings-target").fill("120000");
  await page.locator("#savings-years").fill("10");
  await page.locator("#savings-rate").fill("0");
  await page.locator("#savings-inflation").fill("0");
  await page.getByRole("button", { name: "คำนวณดอกเบี้ยทบต้นและเงินออม" }).click();
  await expect(page.getByTestId("savings-primary")).toContainText("฿1,000.00");
  await expect(page.getByText("แผนฝากเงินเพื่อไปถึงเป้าหมาย", { exact: true })).toBeVisible();

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("debt payoff calculator compares avalanche and snowball, rolls payments, and exports local CSV without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/debt-payoff-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Debt Snowball & Avalanche Calculator" })).toBeVisible();
  await expect(page.getByText("วางแผนปลดหนี้ให้เห็นเส้นชัย", { exact: false })).toBeVisible();
  await expect(page.locator("#debt-plan-name")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="debt-plan-name"]');
    const input = document.querySelector<HTMLInputElement>("#debt-plan-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#debt-plan-name")).toHaveValue("ตัวอย่างแผนปลดหนี้ 3 ก้อน");
  await page.getByRole("button", { name: "คำนวณ Snowball และ Avalanche" }).click();
  await expect(page.getByTestId("debt-primary")).toContainText("เดือน");
  await expect(page.getByTestId("debt-interest")).toContainText("฿");
  await expect(page.getByTestId("debt-budget")).toContainText("฿10,000.00");
  await expect(page.getByTestId("debt-comparison")).toContainText("Avalanche");
  await expect(page.getByTestId("debt-timeline")).toContainText("ปี 1");

  await page.getByRole("tab", { name: "Snowball" }).click();
  await expect(page.getByRole("heading", { name: "ผลลัพธ์ Snowball · ยอดเล็กก่อน" })).toBeVisible();

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("debt-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-debt-snowball.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Plan","ตัวอย่างแผนปลดหนี้ 3 ก้อน"');
  expect(csv).toContain('"Strategy","snowball"');
  expect(csv).toContain('"Month number","Month","Opening balance"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("unit price comparison normalizes mixed package units, discounts, and shipping without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/unit-price-comparison-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Unit Price Comparison Calculator" })).toBeVisible();
  await expect(page.getByText("แพ็กใหญ่ไม่ได้คุ้มกว่าเสมอ", { exact: false })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="unit-price-comparison-name"]');
    const input = document.querySelector<HTMLInputElement>("#unit-price-comparison-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#unit-price-comparison-name")).toHaveValue("เปรียบเทียบกาแฟ 3 แพ็ก");
  await page.getByRole("button", { name: "เปรียบเทียบราคาต่อหน่วย" }).click();
  await expect(page.getByTestId("unit-price-best")).toContainText("แพ็ก 3 ถุง 400 กรัม");
  await expect(page.getByTestId("unit-price-best")).toContainText("10.5417");
  await expect(page.getByTestId("unit-price-ranking")).toContainText("฿135.00 → ฿126.50");
  await expect(page.getByTestId("unit-price-ranking")).toContainText("แพงกว่าคุ้มสุด 23.32%");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("unit-price-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-unit-price-comparison.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Comparison","เปรียบเทียบกาแฟ 3 แพ็ก"');
  expect(csv).toContain('"Comparison basis","100 g"');
  expect(csv).toContain('"1","แพ็ก 3 ถุง 400 กรัม"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("EOQ calculator compares price breaks and operational constraints without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/eoq-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "EOQ & Quantity Discount Calculator" })).toBeVisible();
  await expect(page.getByText("สั่งให้พอดี", { exact: false })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="eoq-annual-demand"]');
    const input = document.querySelector<HTMLInputElement>("#eoq-annual-demand");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#eoq-annual-demand")).toHaveValue("10000");
  await page.getByRole("button", { name: "คำนวณ EOQ และต้นทุน" }).click();
  await expect(page.getByTestId("eoq-recommended")).toContainText("1,000");
  await expect(page.getByTestId("eoq-total-cost")).toContainText("915,800.00");
  await expect(page.getByTestId("eoq-unit-price")).toContainText("90.00");
  await expect(page.getByTestId("eoq-savings")).toContainText("101,200.00");
  await expect(page.getByTestId("eoq-candidates")).not.toContainText("2,500 หน่วย/ครั้ง");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("eoq-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-eoq-calculator.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Order quantity","1000","units/order"');
  expect(csv).toContain('"Annual total cost","915800.0000","THB"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("wholesale price calculator solves multi-channel fees and downstream retail margin without mobile overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const requestUrls: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => requestUrls.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/wholesale-price-calculator");
  await expect(page.getByRole("heading", { level: 1, name: "Wholesale & Retail Price Calculator" })).toBeVisible();
  await expect(page.getByText("ตั้งราคาแบบร้านเล็กที่คิดครบ", { exact: false })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="wholesale-product-name"]');
    const input = document.querySelector<HTMLInputElement>("#wholesale-product-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.duplicateIds).toEqual([]);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.locator("#wholesale-product-name")).toHaveValue("กระเป๋าผ้าแมว");
  await page.getByRole("button", { name: "คำนวณราคาทุกช่องทาง" }).click();
  await expect(page.getByTestId("wholesale-unit-cost")).toContainText("180.00");
  await expect(page.getByTestId("wholesale-price-1")).toContainText("249.32");
  await expect(page.getByTestId("wholesale-price-2")).toContainText("333.33");
  await expect(page.getByTestId("wholesale-price-3")).toContainText("363.64");
  await expect(page.getByTestId("wholesale-suggested-retail")).toContainText("415.53");
  await expect(page.getByTestId("wholesale-channel-results")).toContainText("12,465.75");

  const csvPromise = page.waitForEvent("download");
  await page.getByTestId("wholesale-pricing-csv").click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("meaw-wholesale-retail-pricing.csv");
  const csvPath = await csvDownload.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Product","กระเป๋าผ้าแมว"');
  expect(csv).toContain('"Total unit cost","180.0000","THB/unit"');
  expect(csv).toContain('"ขายส่งร้านคู่ค้า","50","2.0000","100.0000"');

  const finalLayout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(finalLayout.scrollWidth).toBe(finalLayout.width);
  expect(hasExternalRequest(requestUrls, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("Thai income tax calculator explains progressive tax and withholding", async ({ page }) => {
  await page.goto("/thai-income-tax-calculator");
  await page.getByLabel("เงินเดือนต่อเดือน (บาท)").fill("50000");
  await page.getByLabel("ประกันสังคมที่จ่ายจริงทั้งปี (บาท)").fill("9000");
  await page.getByLabel("ภาษีหัก ณ ที่จ่ายทั้งปี (บาท)").fill("10000");
  await page.getByRole("button", { name: "คำนวณภาษี" }).click();
  await expect(page.getByTestId("income-tax-total")).toContainText("20,600");
  await expect(page.getByTestId("income-tax-balance")).toContainText("10,600");
  await expect(page.getByRole("heading", { name: "ภาษีแบบขั้นบันได", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "กรอกเงินได้สุทธิ" }).click();
  await page.getByLabel("เงินได้สุทธิหลังหักค่าใช้จ่ายและค่าลดหย่อน (บาท)").fill("500000");
  await page.getByRole("button", { name: "คำนวณภาษี" }).click();
  await expect(page.getByTestId("income-tax-total")).toContainText("27,500");
});

test("salary calculator checks monthly income and payslip deductions", async ({ page }) => {
  await page.goto("/salary-calculator");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณเงินเดือนสุทธิ" }).click();
  await expect(page.getByTestId("salary-net-pay")).toContainText("30,925");
  await expect(page.getByRole("heading", { name: "รายละเอียดรายรับ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "รายละเอียดรายการหัก" })).toBeVisible();
  await expect(page.getByText("฿33,500 − ฿2,575 = ฿30,925", { exact: true })).toBeVisible();
});

test("overtime calculator separates workday and holiday rates without layout overflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/overtime-calculator-thailand");
  await expect(page.getByRole("heading", { level: 1, name: "Overtime Calculator Thailand" })).toBeVisible();
  await expect(page.locator("main header").getByText("คำนวณโอที 1.5–3 เท่า", { exact: true })).toBeVisible();
  await expect(page.locator("#overtime-wage-amount")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const labelGap = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="overtime-wage-amount"]');
    const input = document.querySelector<HTMLInputElement>("#overtime-wage-amount");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0;
  });
  expect(labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณโอที" }).click();
  await expect(page.getByTestId("overtime-hourly-wage")).toContainText("125.00");
  await expect(page.getByTestId("overtime-total")).toContainText("4,375.00");
  await expect(page.getByTestId("overtime-monthly-gross")).toContainText("34,375.00");
  await expect(page.getByRole("heading", { name: "รายละเอียดสูตร" })).toBeVisible();
  await expect(page.getByText(/ข้อมูลทั้งหมดคำนวณใน Browser/)).toBeVisible();

  const layout = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.width);
  expect(consoleErrors).toEqual([]);
});

test("resume builder exports local Thai PDF and ordered plain text", async ({ page }) => {
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/resume-builder");
  await expect(page.getByRole("heading", { level: 1, name: "Resume Builder ไทย/English" })).toBeVisible();
  await expect(page.getByText(/ไม่ส่งชื่อ อีเมล ประวัติการทำงาน/)).toBeVisible();
  await expect(page.locator("#resume-full-name")).toBeVisible();
  const initialLayout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="resume-full-name"]');
    const input = document.querySelector<HTMLInputElement>("#resume-full-name");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      labelGap: labelBox && inputBox ? Math.round(inputBox.top - labelBox.bottom) : 0,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(initialLayout.labelGap).toBeGreaterThanOrEqual(10);
  expect(initialLayout.overflow).toBe(false);

  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("resume-experience")).toHaveCount(2);
  await expect(page.getByTestId("resume-education")).toHaveCount(1);
  await expect(page.getByRole("article", { name: "ตัวอย่างเรซูเม่" })).toContainText("กานต์ แมวดี");
  await expect(page.getByTestId("resume-keyword-coverage")).toContainText("Keyword coverage");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  const textDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ดาวน์โหลด Plain text" }).click();
  const textDownload = await textDownloadPromise;
  expect(textDownload.suggestedFilename()).toBe("กานต์-แมวดี-resume.txt");
  const plainText = await readFile((await textDownload.path())!, "utf8");
  expect(plainText).toContain("Frontend Developer");
  expect(plainText).toContain("ประสบการณ์ทำงาน");
  expect(plainText).toContain("• ลด Largest Contentful Paint");
  expect(plainText.indexOf("ประสบการณ์ทำงาน")).toBeLessThan(plainText.indexOf("การศึกษา"));

  const pdfDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "สร้างและดาวน์โหลด PDF" }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toBe("กานต์-แมวดี-resume.pdf");
  await expect(page.getByTestId("resume-output")).toContainText("สร้าง กานต์-แมวดี-resume.pdf สำเร็จ");
  const pdfBytes = await readFile((await pdfDownload.path())!);
  const outputDocument = await PDFDocument.load(pdfBytes);
  expect(outputDocument.getPageCount()).toBeGreaterThanOrEqual(1);
  expect(outputDocument.getPageCount()).toBeLessThanOrEqual(3);
  expect(outputDocument.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
  const parsedPdf = await loadingTask.promise;
  let extractedText = "";
  for (let pageNumber = 1; pageNumber <= parsedPdf.numPages; pageNumber += 1) {
    const textContent = await (await parsedPdf.getPage(pageNumber)).getTextContent();
    extractedText += textContent.items.map((item) => "str" in item ? item.str : "").join("");
  }
  expect(extractedText.replace(/\s+/g, "")).toContain("FrontendDeveloper");
  expect(extractedText.replace(/\s+/g, "")).toContain("TypeScript");
  await loadingTask.destroy();
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("email signature generator previews safe HTML and exports without tracking", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.goto("/email-signature-generator");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  const preview = page.frameLocator('iframe[title="ตัวอย่างลายเซ็นอีเมล"]');
  await expect(preview.locator("body")).toContainText("กานต์ แมวดี");
  await expect(preview.locator("body")).toContainText("Product Designer");
  await expect(preview.getByRole("link", { name: "kant@meaw.example" })).toHaveAttribute("href", "mailto:kant@meaw.example");

  await page.getByRole("radio", { name: /Classic/ }).click();
  await expect(page.getByRole("radio", { name: /Classic/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Mobile" }).click();
  await expect(page.getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#signature-full-name");
    const label = document.querySelector<HTMLLabelElement>('label[for="signature-full-name"]');
    if (!field || !label) throw new Error("Email signature name field layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByTestId("signature-copy-html").click();
  const rawHtml = await page.evaluate(() => navigator.clipboard.readText());
  expect(rawHtml).toContain('role="presentation"');
  expect(rawHtml).toContain('href="mailto:kant@meaw.example"');
  expect(rawHtml).not.toContain("<script");
  expect(rawHtml).not.toContain("tracking");

  await page.getByTestId("signature-copy-rich").click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("กานต์ แมวดี");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("signature-download-html").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("email-signature-กานต์-แมวดี.html");
  const downloadedHtml = await readFile((await download.path())!, "utf8");
  expect(downloadedHtml).toContain("<!doctype html>");
  expect(downloadedHtml).toContain("Meaw Digital Studio");
  expect(downloadedHtml).not.toContain("<script");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("quotation generator previews totals and exports a valid Thai PDF", async ({ page }) => {
  await page.goto("/quotation-generator");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("quotation-line-item")).toHaveCount(3);
  await expect(page.getByTestId("quotation-total")).toContainText("41,195.00");
  await expect(page.getByRole("article", { name: "ตัวอย่างใบเสนอราคา" })).toContainText("ร้านกาแฟฮานะ");
  await expect(page.getByRole("article", { name: "ตัวอย่างใบเสนอราคา" })).toContainText("สี่หมื่นหนึ่งพันหนึ่งร้อยเก้าสิบห้าบาทถ้วน");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#seller-name");
    const label = document.querySelector<HTMLLabelElement>('label[for="seller-name"]');
    if (!field || !label) throw new Error("Quotation seller field layout is missing");
    const fieldRect = field.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      labelGap: Math.round(fieldRect.top - labelRect.bottom),
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);

  const quoteNumber = await page.getByLabel("เลขที่ใบเสนอราคา").inputValue();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "สร้างและดาวน์โหลด PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`quotation-${quoteNumber}.pdf`);
  await expect(page.getByTestId("quotation-output")).toContainText("สร้างใบเสนอราคา PDF สำเร็จ");

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const outputDocument = await PDFDocument.load(await readFile(downloadPath!));
  expect(outputDocument.getPageCount()).toBe(1);
  expect(outputDocument.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
});

test("invoice generator tracks the balance and exports private PDF and CSV files", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.goto("/invoice-generator");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByTestId("invoice-line-item")).toHaveCount(3);
  await expect(page.getByTestId("invoice-total")).toContainText("41,195.00");
  await expect(page.getByTestId("invoice-balance")).toContainText("31,195.00");
  const preview = page.getByRole("article", { name: "ตัวอย่างใบแจ้งหนี้" });
  await expect(preview).toContainText("ร้านกาแฟฮานะ");
  await expect(preview).toContainText("PO-HANA-2026-081");
  await expect(preview).toContainText("ชำระบางส่วน");

  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#seller-name");
    const label = document.querySelector<HTMLLabelElement>('label[for="seller-name"]');
    if (!field || !label) throw new Error("Invoice seller field layout is missing");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[id]")).map((element) => element.id);
    return {
      labelGap: Math.round(field.getBoundingClientRect().top - label.getBoundingClientRect().bottom),
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.duplicateIds).toEqual([]);
  expect(layout.hasHorizontalOverflow).toBe(false);

  const invoiceNumber = await page.getByLabel("เลขที่ใบแจ้งหนี้").inputValue();
  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByTestId("invoice-csv").click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe(`invoice-${invoiceNumber}.csv`);
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xFEFF);
  expect(csv).toContain('"Reference / PO","PO-HANA-2026-081"');
  expect(csv).toContain('"Balance due","31195.00","THB"');

  const pdfDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "สร้างและดาวน์โหลด PDF" }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toBe(`invoice-${invoiceNumber}.pdf`);
  await expect(page.getByTestId("invoice-output")).toContainText("สร้างใบแจ้งหนี้ PDF สำเร็จ");
  const outputDocument = await PDFDocument.load(await readFile((await pdfDownload.path())!));
  expect(outputDocument.getPageCount()).toBe(1);
  expect(outputDocument.getTitle()).toContain(invoiceNumber);
  expect(outputDocument.getAuthor()).toContain("บริษัท มีอาว์");
  expect(hasExternalRequest(requests, page.url())).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("social security pension calculator explains the current FAE estimate and eligibility", async ({ page }) => {
  await page.goto("/social-security-pension-calculator");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await page.getByRole("button", { name: "คำนวณบำนาญประกันสังคม" }).click();
  await expect(page.getByTestId("sso-pension-monthly")).toContainText("4,125");
  await expect(page.getByTestId("sso-pension-eligibility")).toContainText("ครบเงื่อนไขหลัก");
  await expect(page.getByText("20% พื้นฐาน + (5 ปีเต็ม × 1.5%)", { exact: false })).toBeVisible();
  await expect(page.getByText(/ยังไม่ใช้ CARE/)).toBeVisible();
});

test("Thai ID validator checks only local structure without exposing the value", async ({ page }) => {
  await page.goto("/thai-id-validator");
  const input = page.getByLabel("เลขประจำตัวประชาชน 13 หลัก");
  await expect(input).toBeVisible();
  const layout = await page.evaluate(() => {
    const field = document.querySelector<HTMLInputElement>("#thai-id-number");
    const label = document.querySelector<HTMLLabelElement>('label[for="thai-id-number"]');
    if (!field || !label) throw new Error("Thai ID field layout is missing");
    const fieldRect = field.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      labelGap: Math.round(fieldRect.top - labelRect.bottom),
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);
  expect(layout.hasHorizontalOverflow).toBe(false);
  await expect(input).toHaveAttribute("type", "password");
  await expect(input).toHaveAttribute("autocomplete", "off");
  await input.fill("1234567890121");
  await page.getByRole("button", { name: "ตรวจ checksum" }).click();
  const result = page.getByTestId("thai-id-validation-result");
  await expect(result).toContainText("checksum สอดคล้องตามสูตร");
  await expect(result).toContainText("ไม่ได้ยืนยันบุคคล");
  await expect(result).not.toContainText("1234567890121");

  await page.getByRole("button", { name: "แสดงเลขประจำตัวประชาชน" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "ซ่อนเลขประจำตัวประชาชน" }).click();
  await expect(input).toHaveAttribute("type", "password");

  await input.fill("1234567890120");
  await page.getByRole("button", { name: "ตรวจ checksum" }).click();
  await expect(page.getByTestId("thai-id-validation-result")).toContainText("เลขตรวจสอบไม่สอดคล้อง");
});

test("PDF tools convert, merge, and split files locally", async ({ page }) => {
  await page.goto("/pdf-to-jpg");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("meaw-sample.pdf")).toBeVisible();
  const jpgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "แปลงและดาวน์โหลด JPG" }).click();
  expect((await jpgDownloadPromise).suggestedFilename()).toBe("meaw-sample-jpg-pages.zip");
  await expect(page.getByTestId("pdf-jpg-output")).toContainText("3 หน้า");

  await page.goto("/merge-pdf");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("cafe-menu.pdf")).toBeVisible();
  const mergeDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "รวมและดาวน์โหลด PDF" }).click();
  expect((await mergeDownloadPromise).suggestedFilename()).toBe("meaw-merged.pdf");
  await expect(page.getByTestId("merge-pdf-output")).toContainText("5 หน้า");

  await page.goto("/split-pdf");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("six-pages.pdf")).toBeVisible();
  await page.getByLabel("แต่ละช่วงจะเป็น 1 ไฟล์").fill("1-2,3-4");
  const splitDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "แยกและดาวน์โหลด PDF" }).click();
  expect((await splitDownloadPromise).suggestedFilename()).toBe("six-pages-split.zip");
  await expect(page.getByTestId("split-pdf-output")).toContainText("2 ไฟล์");
});

test("PDF organizer deletes, rotates, reorders, and exports a valid PDF", async ({ page }) => {
  await page.goto("/pdf-organizer");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("meaw-organizer-sample.pdf")).toBeVisible();
  const pageCards = page.getByTestId("pdf-organizer-page");
  await expect(pageCards).toHaveCount(5);

  const layout = await page.evaluate(() => ({
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(layout.hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "หมุนหน้าต้นฉบับ 1 ตามเข็ม" }).click();
  await page.getByRole("button", { name: "เลื่อนหน้าต้นฉบับ 5 ขึ้น" }).click();
  await page.getByRole("button", { name: "ลบหน้าต้นฉบับ 2" }).click();
  await expect(pageCards).toHaveCount(4);
  await expect(page.getByTestId("pdf-organizer-workspace")).toContainText("ลบ 1 · หมุน 1");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "จัดหน้าและดาวน์โหลด PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-organizer-sample-organized.pdf");
  await expect(page.getByTestId("pdf-organizer-output")).toContainText("4 หน้า");

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const outputDocument = await PDFDocument.load(await readFile(downloadPath!));
  expect(outputDocument.getPageCount()).toBe(4);
  expect(outputDocument.getPage(0).getRotation().angle).toBe(90);
  expect(outputDocument.getPages().map((pdfPage) => pdfPage.getWidth())).toEqual([595, 615, 635, 625]);
});

test("Sign PDF places a signature on normal and rotated pages and exports a valid PDF", async ({ page }) => {
  await page.goto("/sign-pdf");
  await page.getByRole("button", { name: "โหลดตัวอย่าง" }).click();
  await expect(page.getByText("meaw-sign-pdf-sample.pdf")).toBeVisible();
  await expect(page.getByTestId("signature-placement")).toHaveCount(1);
  await expect(page.getByTestId("sign-pdf-placement-pages")).toContainText("หน้า 1 (1)");

  const layout = await page.evaluate(() => {
    const label = document.querySelector<HTMLLabelElement>('label[for="sign-pdf-file"]');
    const input = document.querySelector<HTMLInputElement>("#sign-pdf-file");
    const labelBox = label?.getBoundingClientRect();
    const inputBox = input?.getBoundingClientRect();
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      labelGap: labelBox && inputBox ? inputBox.top - labelBox.bottom : 0,
    };
  });
  expect(layout.hasHorizontalOverflow).toBe(false);
  expect(layout.labelGap).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: "หน้าถัดไป" }).click();
  await expect(page.getByAltText("ตัวอย่าง PDF หน้า 2")).toBeVisible();
  await page.getByRole("button", { name: "วางลายเซ็นในหน้านี้" }).click();
  await expect(page.getByTestId("signature-placement")).toHaveCount(1);
  await expect(page.getByTestId("sign-pdf-placement-pages")).toContainText("หน้า 2 (1)");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "เซ็นและดาวน์โหลด PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meaw-sign-pdf-sample-signed.pdf");
  await expect(page.getByTestId("sign-pdf-output")).toContainText("2 หน้า · 2 ตำแหน่ง");

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const outputDocument = await PDFDocument.load(await readFile(downloadPath!));
  expect(outputDocument.getPageCount()).toBe(2);
  expect(outputDocument.getPages().map((pdfPage) => pdfPage.getRotation().angle)).toEqual([0, 90]);
});

test("all tool routes render without browser errors", async ({ page }) => {
  test.slow();

  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const [slug, title] of toolRoutes) {
    await page.goto(`/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("region", { name: `พื้นที่ทำงาน ${title}` })).toBeVisible();
  }

  expect(errors).toEqual([]);
});
