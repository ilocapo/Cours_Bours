import { test, expect } from "@playwright/test";

test("accueil : les six sections de la maquette sont présentes", async ({ page }) => {
  await page.goto("/");
  for (const id of ["salon", "rituels", "carte", "travail", "avis", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.getByText("Là où commence la beauté.").first()).toBeAttached();
});

test("coordonnées du salon dans le pied de page", async ({ page }) => {
  await page.goto("/");
  const foot = page.locator("footer");
  await expect(foot).toContainText("Fidjrossè, Cotonou");
  await expect(foot).toContainText("+229 67 70 35 35");
  await expect(foot.locator('a[href^="tel:"]')).toHaveAttribute("href", "tel:+22967703535");
  await expect(foot.locator('a[href^="mailto:"]')).toHaveAttribute("href", "mailto:contact@zstbeautycenter.com");
  await expect(foot.locator('a[href*="wa.me/22967703535"]').first()).toBeAttached();
  await expect(foot.locator('a[href*="facebook.com/zstbc"]')).toBeAttached();
  await expect(foot.locator('a[href*="instagram.com/zst_beauty_center"]')).toBeAttached();
  await expect(foot).toContainText("MTN Mobile Money");
  await expect(foot).toContainText("09:00 – 20:00");
  await expect(foot).toContainText("15:00 – 20:00");
});

test("le bouton Réserver ouvre WhatsApp avec un message prérempli", async ({ page }) => {
  await page.goto("/coiffure");
  const btn = page.locator("main a.btn", { hasText: "Réserver" }).first();
  const href = await btn.getAttribute("href");
  expect(href).toContain("https://wa.me/22967703535?text=");
  expect(decodeURIComponent(href!)).toContain("réserver un rituel");
  await expect(btn).toHaveAttribute("target", "_blank");
  await expect(btn).toHaveAttribute("rel", /noopener/);
});

test("la carte liste les trois univers sans prix", async ({ page }) => {
  await page.goto("/carte");
  for (const name of ["Coiffure", "Spa", "Ongles"]) {
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  }
  await expect(page.getByText("Pédicure")).toBeVisible();
  await expect(page.getByText("Massage relaxant")).toBeVisible();
  await expect(page.locator(".services__meta").first()).not.toContainText("€");
});

test("la FAQ s'ouvre et se ferme", async ({ page }) => {
  await page.goto("/faq");
  const item = page.locator("details").filter({ hasText: "Comment puis-je payer ?" });
  await expect(item).not.toHaveAttribute("open", "");
  await item.locator("summary").click();
  await expect(item).toHaveAttribute("open", "");
  await expect(item).toContainText("MTN Mobile Money");
  await item.locator("summary").click();
  await expect(item).not.toHaveAttribute("open", "");
});

test("avis Google affichés avec la note", async ({ page }) => {
  await page.goto("/");
  const avis = page.locator("#avis");
  await avis.scrollIntoViewIfNeeded();
  await expect(avis).toContainText("30 avis sur Google");
  await expect(avis).toContainText("Annie G.");
  await expect(avis.locator("[data-count]")).toHaveText("4,1", { timeout: 5000 });
});

test("les vidéos sont chargeables et sans son", async ({ page, request }) => {
  await page.goto("/galerie");
  const videos = page.locator("video");
  expect(await videos.count()).toBe(6);
  for (let i = 0; i < 6; i++) {
    expect(await videos.nth(i).evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    const src = await videos.nth(i).getAttribute("src");
    const res = await request.get(src!);
    expect(res.status()).toBe(200);
  }
});

test("toutes les images ont un texte alternatif", async ({ page }) => {
  for (const path of ["/", "/galerie", "/coiffure", "/carte"]) {
    await page.goto(path);
    const missing = await page.evaluate(() => Array.from(document.images).filter((i) => !i.hasAttribute("alt")).length);
    expect(missing, path).toBe(0);
  }
});

test("le logo n'est jamais déformé", async ({ page }) => {
  await page.goto("/");
  const logo = page.locator("header .logo img");
  await expect.poll(() => logo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  const { w, h, nw, nh } = await logo.evaluate((i: HTMLImageElement) => ({ w: i.clientWidth, h: i.clientHeight, nw: i.naturalWidth, nh: i.naturalHeight }));
  expect(Math.abs(w / h - nw / nh)).toBeLessThan(0.03);
});
