import { test, expect } from "@playwright/test";
import { dayInDays, readStore } from "./helpers";

test.describe.configure({ mode: "serial" });

test("accès protégé : redirigé vers la connexion, API refusée", async ({ page, request }) => {
  await page.goto("/admin/agenda");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect((await request.get("/api/admin/x")).status()).toBe(401);
  await page.getByLabel("Mot de passe").fill("mauvais");
  await page.getByRole("button", { name: "Entrer" }).click();
  await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();
  await page.getByLabel("Mot de passe").fill("test-mdp");
  await page.getByRole("button", { name: "Entrer" }).click();
  await expect(page).toHaveURL(/\/admin\/agenda/);
});

test.describe("connectée", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Mot de passe").fill("test-mdp");
    await page.getByRole("button", { name: "Entrer" }).click();
    await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"));
  });

  test("tableau du jour, navigation, pas de menu public", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toContainText("Aujourd'hui");
    await expect(page.locator("header.head")).toHaveCount(0);
    for (const l of ["Agenda", "Réservations", "Clients", "Prestations", "Équipe", "Rappels", "Réglages"]) await expect(page.getByRole("link", { name: l, exact: true }).first()).toBeAttached();
  });

  test("agenda : le rendez-vous apparaît, détail, déplacement, statut, note", async ({ page }) => {
    const s = readStore();
    const b = s.bookings.find((x: { status: string; source: string }) => x.status === "confirmed" && x.source === "site");
    const date = new Date(new Date(b.startsAt).getTime() + 3_600_000).toISOString().slice(0, 10);
    await page.goto(`/admin/agenda?d=${date}`);
    await expect(page.locator("h1")).toContainText("Agenda");
    const panelUrl = `/admin/agenda?d=${date}&b=${b.id}`;
    await page.goto(panelUrl);
    const panel = page.getByRole("complementary", { name: "Détail du rendez-vous" });
    await expect(panel).toBeVisible();
    await panel.getByLabel("Note").fill("Préfère une couleur nude");
    await panel.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect.poll(() => readStore().bookings.find((x: { id: string }) => x.id === b.id).note, { timeout: 10_000 }).toBe("Préfère une couleur nude");
    await page.waitForLoadState("networkidle");
    const newDay = dayInDays(10);
    await panel.getByLabel("Déplacer au").fill(newDay);
    await panel.getByLabel("à", { exact: true }).fill("15:30");
    await panel.getByRole("button", { name: "Déplacer" }).click();
    // 15 h 30 heure du salon = 14 h 30 UTC
    await expect.poll(() => readStore().bookings.find((x: { id: string }) => x.id === b.id).startsAt, { timeout: 10_000 }).toContain("T14:30:00");
    await page.goto(`/admin/agenda?d=${newDay}&b=${b.id}`);
    await page.getByRole("button", { name: "Terminé" }).click();
    await expect.poll(() => readStore().bookings.find((x: { id: string }) => x.id === b.id).status, { timeout: 10_000 }).toBe("done");
  });

  test("réservation manuelle, liste, fiche cliente", async ({ page }) => {
    await page.goto("/admin/reservations/nouvelle");
    await page.getByLabel("Date").fill(dayInDays(12));
    await page.getByLabel("Nom et prénom").fill("Cliente Comptoir");
    await page.getByLabel("Téléphone").fill("+229 97 55 00 11");
    await page.getByLabel("E-mail", { exact: true }).fill("comptoir@example.com");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/admin\/agenda/);
    await page.goto("/admin/reservations");
    await expect(page.getByText("Cliente Comptoir")).toBeVisible();
    await page.goto("/admin/clients?q=comptoir");
    await page.getByRole("link", { name: /Cliente Comptoir/ }).click();
    await page.getByLabel(/Notes/).fill("Allergie au latex");
    await page.getByRole("button", { name: "Enregistrer la fiche" }).click();
    await expect(page.getByLabel(/Notes/)).toHaveValue("Allergie au latex");
    await expect(page.getByText("Historique")).toBeVisible();
  });

  test("prestations : un prix et une durée modifiés se retrouvent dans la réservation", async ({ page, request }) => {
    await page.goto("/admin/prestations");
    const form = page.locator("form").filter({ has: page.locator('input[value="Manucure"]') }).first();
    await form.getByLabel("Durée en minutes").fill("30");
    await form.getByLabel("Prix en francs CFA").fill("8000");
    await form.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => readStore().services.find((x: { id: string }) => x.id === "manucure").price, { timeout: 10_000 }).toBe(8000);
    expect(readStore().services.find((x: { id: string }) => x.id === "manucure").durationMin).toBe(30);
    const slots = (await (await request.get(`/api/slots?serviceId=manucure&date=${dayInDays(9)}`)).json()).slots;
    expect(slots.length).toBeGreaterThan(0);
    await page.goto("/reserver");
    await page.getByRole("tab", { name: "Ongles" }).click();
    await expect(page.getByRole("button", { name: /Manucure/ })).toContainText("8 000 F CFA");
  });

  test("réglages : horaires et rappels modifiables", async ({ page, request }) => {
    await page.goto("/admin/reglages");
    await page.locator('input[name="closed-3"]').check(); // mercredi fermé
    await page.locator('input[name="reminderD1Hour"]').fill("17");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Réglages enregistrés.")).toBeVisible();
    const st = readStore();
    expect(st.settings.reminderD1Hour).toBe(17);
    expect(st.hours.find((h: { weekday: number }) => h.weekday === 3).opens).toBeNull();
    let wed = new Date(Date.now() + 3_600_000 + 5 * 86_400_000);
    while (wed.getUTCDay() !== 3) wed = new Date(wed.getTime() + 86_400_000);
    const r = await (await request.get(`/api/slots?serviceId=manucure&date=${wed.toISOString().slice(0, 10)}`)).json();
    expect(r.slots).toEqual([]);
  });

  test("équipe et journal des e-mails", async ({ page }) => {
    await page.goto("/admin/equipe");
    await page.getByPlaceholder("Prénom").last().fill("Mireille");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.locator('input[value="Mireille"]')).toBeVisible();
    await page.goto("/admin/notifications");
    await expect(page.locator("h1")).toContainText("Rappels");
    await expect(page.getByText("Confirmation").first()).toBeVisible();
    await page.getByRole("button", { name: "Envoyer ce qui est dû maintenant" }).click();
    await expect(page).toHaveURL(/notifications/);
  });

  test("déconnexion", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto("/admin/clients");
    await expect(page).toHaveURL(/login/);
  });
});
