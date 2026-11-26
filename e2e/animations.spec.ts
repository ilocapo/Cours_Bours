import { test, expect } from "@playwright/test";

test("ouverture : le titre apparaît ligne par ligne, le rideau se lève", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("intro")), { timeout: 8000 }).toBe(false);
  const first = page.locator(".hero .line-in").first();
  await expect(first).toHaveCSS("opacity", "1", { timeout: 6000 });
});

test("l'intro ne se rejoue pas dans la même visite", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("zst-intro"))).toBe("1");
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains("intro"))).toBe(false);
});

test("le salon : une seule bande, pas de zoom ni de titre en double", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#salon .band")).toHaveCount(1);
  await expect(page.locator("main").getByText("Là où commence la beauté.", { exact: true })).toHaveCount(0);
  const h = await page.locator("#salon").evaluate((e) => e.getBoundingClientRect().height);
  const vh = page.viewportSize()!.height;
  expect(h).toBeLessThan(vh * 2.1);
});

test("les arches se remplissent quand elles entrent à l'écran", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2800);
  const grid = page.locator(".work__grid");
  await grid.scrollIntoViewIfNeeded();
  const arch = grid.locator("[data-arch]").first();
  await expect.poll(() => arch.evaluate((e) => getComputedStyle(e).clipPath), { timeout: 6000 }).toMatch(/^(inset\(0(px|%)?( 0(px|%)?){0,3}\)|none)$/);
});

test("mouvement réduit : aucune animation, tout est visible", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(baseURL + "/");
  const cls = await page.evaluate(() => document.documentElement.className);
  expect(cls).not.toContain("motion");
  expect(cls).not.toContain("intro");
  await expect(page.locator(".hero .line-in").first()).toHaveCSS("opacity", "1");
    const arch = page.locator("[data-arch]").first();
  expect(await arch.evaluate((e) => getComputedStyle(e).clipPath)).toBe("none");
  await ctx.close();
});

test("sans JavaScript, le contenu reste lisible", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(baseURL + "/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("#contact")).toContainText("Cotonou");
  await ctx.close();
});
