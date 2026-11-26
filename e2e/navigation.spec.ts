import { test, expect } from "@playwright/test";

test("navigation entre pages avec le panneau de transition", async ({ page }) => {
  await page.goto("/");
  const mobile = (page.viewportSize()?.width ?? 0) < 1100;
  if (mobile) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("#menu-overlay").getByRole("link", { name: "Spa" }).click();
  } else {
    await page.locator("header nav").getByRole("link", { name: "Spa" }).click();
  }
  await expect(page).toHaveURL(/\/spa$/);
  await expect(page.locator("h1")).toContainText("Spa");
  // le rideau est retiré après la transition
  await expect.poll(async () => page.evaluate(() => {
    const c = document.querySelector(".curtain")!.getBoundingClientRect();
    return c.top >= window.innerHeight || c.bottom <= 0;
  }), { timeout: 8000 }).toBe(true);
});

test("menu replié (< 1100 px) : s'ouvre, se ferme avec Échap", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 1100, "menu en ligne sur grand écran");
  await page.goto("/");
  const btn = page.getByRole("button", { name: "Menu" });
  await btn.click();
  await expect(page.locator("#menu-overlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu-overlay")).toBeHidden();
});

test("menu desktop (≥ 1100 px) : liens en ligne, pas de bouton Menu", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1100, "menu replié sous 1100 px");
  await page.goto("/");
  await expect(page.locator("header nav")).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
});

test("barre fixe « Réserver un rituel » : mobile seulement", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("a.bar");
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("href", /wa\.me/);
  } else {
    await expect(bar).toBeHidden();
  }
});

test("navigation au clavier : lien d'évitement et focus visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator("a.skip")).toBeFocused();
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});

test("clic modifié (nouvel onglet) : pas d'interception", async ({ page, context }) => {
  await page.goto("/");
  const link = page.locator("#rituels a[href='/coiffure']");
  await link.scrollIntoViewIfNeeded();
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    link.click({ modifiers: ["ControlOrMeta"] }),
  ]);
  await popup.waitForLoadState();
  expect(popup.url()).toMatch(/\/coiffure$/);
});
