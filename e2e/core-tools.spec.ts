import { expect, test } from "@playwright/test";

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
  ["bmi-calculator", "BMI Calculator"],
  ["profit-margin-calculator", "Profit & Margin Calculator"],
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
  await expect(page.getByRole("link", { name: /เปิดเครื่องมือ/ })).toHaveCount(8);
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
