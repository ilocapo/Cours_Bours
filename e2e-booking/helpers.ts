import { existsSync, readFileSync, writeFileSync } from "node:fs";
export const STORE = "/tmp/zst-e2e-store.json";
export const OUTBOX = "/tmp/zst-e2e-outbox.json";
export const readStore = () => { for (let i = 0; ; i++) { try { return JSON.parse(readFileSync(STORE, "utf8")); } catch (e) { if (i > 5) throw e; } } };
export const writeStore = (d: unknown) => writeFileSync(STORE, JSON.stringify(d, null, 2));
export const outbox = (): { to: string; subject: string; html: string; text: string; attachments?: { filename: string }[] }[] => (existsSync(OUTBOX) ? JSON.parse(readFileSync(OUTBOX, "utf8")) : []);

// Prochain jour ouvré (lundi à samedi) dans N jours, au format YYYY-MM-DD (heure du salon, UTC+1).
export function dayInDays(n: number): string {
  const d = new Date(Date.now() + 3_600_000 + n * 86_400_000);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
