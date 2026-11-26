import { defineConfig } from "@playwright/test";
import { existsSync, rmSync } from "node:fs";

// Tests de la réservation en ligne et de l'espace de gestion (base fichier isolée, e-mails écrits dans un fichier).
const PORT = 3400;
export const STORE = "/tmp/zst-e2e-store.json";
export const OUTBOX = "/tmp/zst-e2e-outbox.json";
for (const f of [STORE, OUTBOX]) if (existsSync(f)) rmSync(f);
const executablePath = existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;

export default defineConfig({
  testDir: "./e2e-booking",
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off", launchOptions: { executablePath, args: ["--no-sandbox"] } },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_BOOKING_INTERNAL: "1", ZST_STORE_FILE: STORE, ZST_OUTBOX_FILE: OUTBOX,
      ADMIN_PASSWORD: "test-mdp", CRON_SECRET: "test-cron", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "bureau-1280", use: { viewport: { width: 1280, height: 800 } } },
  ],
});
