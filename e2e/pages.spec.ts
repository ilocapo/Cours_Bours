import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", h1: /commence/i },
  { path: "/coiffure", h1: /Coiffure/ },
  { path: "/spa", h1: /Spa/ },
  { path: "/ongles", h1: /Ongles/ },
  { path: "/carte", h1: /carte/i },
  { path: "/galerie", h1: /Galerie/ },
  { path: "/a-propos", h1: /commence/i },
  { path: "/faq", h1: /savoir/i },
  { path: "/reserver", h1: /réservation/i },
  { path: "/mentions-legales", h1: /Mentions/ },
  { path: "/confidentialite", h1: /confidentialité/i },
];

for (const p of pages) {
  test(`${p.path} : s'affiche, un seul h1, aucune erreur`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText(p.h1);
    expect(errors).toEqual([]);
  });

  test(`${p.path} : pas de défilement horizontal`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("404 propre", async ({ page }) => {
  const res = await page.goto("/cette-page-n-existe-pas");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("n'existe pas");
});

test("/admin est introuvable en production", async ({ page }) => {
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});

test("robots.txt et sitemap.xml", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/galerie");
});
