import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Navigateur préinstallé dans certains environnements ; sinon Playwright utilise le sien.
const preinstalled = "/opt/pw-browsers/chromium";
const executablePath = existsSync(preinstalled) ? preinstalled : undefined;
const PORT = 3200;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    launchOptions: { executablePath, args: ["--no-sandbox"] },
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "tablette-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "bureau-1280", use: { viewport: { width: 1280, height: 800 } } },
    { name: "large-1600", use: { viewport: { width: 1600, height: 900 } } },
  ],
});
