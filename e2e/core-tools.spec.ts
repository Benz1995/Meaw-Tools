import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { HEIC_SAMPLE_BASE64 } from "@/lib/tools/heic-sample";

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
  ["regex-tester", "Regex Tester"],
  ["diff-checker", "Text Diff Checker"],
  ["cron-generator", "Cron Generator"],
  ["hash-generator", "Hash Generator"],
  ["word-counter", "Word Counter"],
  ["text-cleaner", "Text Cleaner"],
  ["percentage-calculator", "Percentage Calculator"],
  ["unit-converter", "Unit Converter"],
  ["date-calculator", "Date Calculator"],
  ["jpg-to-pdf", "JPG to PDF Converter"],
  ["qr-code-generator", "QR Code Generator"],
  ["age-calculator", "Age Calculator"],
  ["loan-calculator", "Loan Calculator"],
  ["thai-income-tax-calculator", "Thai Income Tax Calculator"],
  ["salary-calculator", "Salary & Payslip Calculator"],
  ["social-security-pension-calculator", "Social Security Pension Calculator"],
  ["thai-id-validator", "Thai ID Checksum Validator"],
  ["bmi-calculator", "BMI Calculator"],
  ["profit-margin-calculator", "Profit & Margin Calculator"],
  ["quotation-generator", "Quotation Generator"],
  ["heic-to-jpg", "HEIC to JPG"],
  ["png-to-jpg", "PNG to JPG Converter"],
  ["image-compressor", "Image Compressor & Resizer"],
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

test("category tags navigate to a category page", async ({ page }) => {
  await page.goto("/categories");
  await expect(page.getByRole("heading", { level: 1, name: "หมวดหมู่เครื่องมือ" })).toBeVisible();
  await page.getByRole("link", { name: "ดูหมวดรูปภาพและ PDF" }).click();
  await expect(page).toHaveURL(/\/categories\/media$/);
  await expect(page.getByRole("heading", { level: 1, name: "รูปภาพและ PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: /เปิดเครื่องมือ/ })).toHaveCount(11);
});

test("cat walker can be disabled and remembers the preference", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.locator(".cat-walker-image")).toBeVisible();
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
