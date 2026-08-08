import { defineConfig, devices } from "@playwright/test";

const playwrightPort = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
if (!Number.isInteger(playwrightPort) || playwrightPort < 1024 || playwrightPort > 65_535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1024 and 65535");
}
const baseURL = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${playwrightPort}`, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
