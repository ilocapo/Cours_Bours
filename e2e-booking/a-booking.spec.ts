import { test, expect } from "@playwright/test";
import { dayInDays, outbox, readStore, writeStore } from "./helpers";

const SVC = "manucure"; // 45 min

test.describe.configure({ mode: "serial" });

test("créneaux : horaires, fermeture et délai minimal respectés", async ({ request }) => {
  const d = dayInDays(5);
  const r = await request.get(`/api/slots?serviceId=${SVC}&date=${d}`);
  const { slots } = await r.json();
  expect(slots.length).toBeGreaterThan(8);
  expect(slots[0].minutes).toBeGreaterThanOrEqual(9 * 60);
  expect(slots.at(-1).minutes + 45).toBeLessThanOrEqual(20 * 60); // finit avant la fermeture
  const past = await (await request.get(`/api/slots?serviceId=${SVC}&date=2020-01-01`)).json();
  expect(past.slots).toEqual([]);
  const bad = await request.get(`/api/slots?serviceId=${SVC}&date=pas-une-date`);
  expect(bad.status()).toBe(400);
});

test("parcours complet : choisir, réserver, confirmation par e-mail avec .ics", async ({ page }) => {
  await page.goto("/reserver");
  await expect(page.locator("h1")).toContainText("Réserver");
  await page.getByRole("tab", { name: "Ongles" }).click();
  await page.getByRole("button", { name: /Manucure/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.locator(".day:enabled").nth(3).click();
  const slot = page.locator(".slot").first();
  await expect(slot).toBeVisible();
  await slot.click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Nom et prénom").fill("Awa Test");
  await page.getByLabel("Téléphone").fill("97 00 00 01");
  await page.getByLabel(/E-mail/).fill("awa.test@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByTestId("booking-done")).toBeVisible();
  const mails = outbox();
  const conf = mails.find((m) => m.to === "awa.test@example.com");
  expect(conf, "e-mail de confirmation").toBeTruthy();
  expect(conf!.subject).toContain("rendez-vous");
  expect(conf!.attachments?.[0].filename).toBe("rendez-vous-zst.ics");
  expect(conf!.html).toContain("#1C1013"); // aux couleurs ZST
  expect(conf!.html).toContain("/reservation/");
  expect(mails.some((m) => m.to === "contact@zstbeautycenter.com" && m.subject.includes("Nouvelle réservation"))).toBe(true);
  // rappels programmés : veille + avant le rendez-vous
  const s = readStore();
  const types = s.notifications.filter((n: { type: string }) => n.type.startsWith("reminder")).map((n: { type: string }) => n.type).sort();
  expect(types).toEqual(["reminder_d1", "reminder_h2"]);
});

test("capacité : un créneau complet n'est plus proposé, et la réservation est refusée", async ({ request }) => {
  const d = dayInDays(6);
  const first = (await (await request.get(`/api/slots?serviceId=${SVC}&date=${d}`)).json()).slots[0];
  const book = (n: number) => request.post("/api/bookings", { data: { serviceId: SVC, date: d, minutes: first.minutes, name: `Cliente ${n}`, phone: `+229 97 00 10 0${n}`, email: `c${n}@example.com`, consentReminders: false } });
  expect((await book(1)).status()).toBe(200);
  expect((await book(2)).status()).toBe(200); // 2 postes en parallèle
  const third = await book(3);
  expect(third.status()).toBe(409);
  expect((await third.json()).error).toContain("pris");
  const after = (await (await request.get(`/api/slots?serviceId=${SVC}&date=${d}`)).json()).slots.map((s: { minutes: number }) => s.minutes);
  expect(after).not.toContain(first.minutes);
});

test("validation : nom, téléphone avec indicatif et e-mail contrôlés, robots écartés", async ({ request }) => {
  const d = dayInDays(7);
  const all = (await (await request.get(`/api/slots?serviceId=${SVC}&date=${d}`)).json()).slots;
  const m = all[0].minutes;
  const base = { serviceId: SVC, date: d, minutes: m, name: "Test Valide", phone: "+229 97 00 00 99", consentReminders: false };
  const post = (over: Record<string, unknown>) => request.post("/api/bookings", { data: { ...base, ...over } });
  const msg = async (over: Record<string, unknown>) => (await (await post(over)).json()).error as string;
  // refusés (422), avec un message clair
  for (const [over, mot] of [
    [{ name: "" }, "nom"], [{ name: "1234" }, "nom"],
    [{ phone: "" }, "téléphone"], [{ phone: "12" }, "indicatif"], [{ phone: "0597000001" }, "indicatif"],
    [{ phone: "+229 1234" }, "invalide"], [{ phone: "+229 9700 abcd" }, "chiffres"], [{ phone: "+33 6 12 34" }, "invalide"],
    [{ email: "pas-un-mail" }, "e-mail"], [{ email: "a@b" }, "e-mail"], [{ email: "jean..dupont@gmail.com" }, "e-mail"], [{ email: "marie@gmial.com" }, "orthographe"], [{ email: "avec espace@gmail.com" }, "e-mail"],
  ] as [Record<string, unknown>, string][]) {
    const r = await post(over);
    expect(r.status(), JSON.stringify(over)).toBe(422);
    expect((await r.json()).error.toLowerCase(), JSON.stringify(over)).toContain(mot);
  }
  void msg;
  // acceptés, et enregistrés au format international
  const okCases: [string, string][] = [["+229 97 00 00 41", "+22997000041"], ["+229 01 97 00 00 42", "+2290197000042"], ["00229 97 00 00 43", "+22997000043"], ["+33 06 12 34 56 78", "+33612345678"], ["+33 6 12 34 56 79", "+33612345679"]];
  for (const [i, [input]] of okCases.entries()) {
    const r = await post({ minutes: all[i * 2].minutes, phone: input, email: `ok${input.replace(/\D/g, "")}@example.com` });
    expect(r.status(), input).toBe(200);
  }
  const phones = readStore().clients.map((c: { phone: string }) => c.phone);
  for (const [, e164] of okCases) expect(phones).toContain(e164);
  // robots
  const before = readStore().bookings.length;
  const bot = await post({ website: "http://spam", phone: "+229 97 00 00 98" });
  expect(bot.status()).toBe(200);
  expect(readStore().bookings.length).toBe(before);
});

test("formulaire : messages d'erreur, bouton bloqué tant que invalide, puis un autre rituel", async ({ page }) => {
  await page.goto("/reserver");
  await page.getByRole("tab", { name: "Ongles" }).click();
  await page.getByRole("button", { name: /Manucure/ }).click();
  await expect(page.getByText(/Un rituel par rendez-vous/)).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.locator(".day:enabled").nth(8).click();
  await page.locator(".slot").first().click();
  await page.getByRole("button", { name: "Continuer" }).click();
  const confirm = page.getByRole("button", { name: "Confirmer" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Nom et prénom").fill("1");
  await page.getByLabel("Nom et prénom").blur();
  await expect(page.getByText("Indiquez votre nom et prénom.")).toBeVisible();
  await page.getByLabel("Nom et prénom").fill("Awa Formulaire");
  await page.getByLabel("Téléphone").fill("123");
  await page.getByLabel("Téléphone").blur();
  await expect(page.getByText(/Numéro Bénin invalide/)).toBeVisible();
  await page.getByLabel("Indicatif du pays").selectOption("33");
  await page.getByLabel("Téléphone").fill("06 12 34 56 80");
  await expect(page.getByText(/invalide/)).toHaveCount(0);
  await page.getByLabel(/E-mail/).fill("awa@gmial.com");
  await page.getByLabel(/E-mail/).blur();
  await expect(page.getByText("Vérifiez l'orthographe de votre adresse e-mail.")).toBeVisible();
  await expect(confirm).toBeDisabled();
  await page.getByLabel(/E-mail/).fill("awa.formulaire@example.com");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByTestId("booking-done")).toBeVisible();
  expect(readStore().clients.map((c: { phone: string }) => c.phone)).toContain("+33612345680");
  await page.getByRole("button", { name: "Réserver un autre rituel" }).click();
  await expect(page.getByRole("tab", { name: "Coiffure" })).toBeVisible();
  await expect(page.getByText("Un rituel par rendez-vous")).toBeVisible();
});

test("page de rendez-vous : lien dans l'e-mail, .ics, annulation, alerte salon", async ({ page, request }) => {
  const s = readStore();
  const b = s.bookings.find((x: { source: string }) => x.source === "site");
  await page.goto(`/reservation/${b.token}`);
  await expect(page.locator("h1")).toBeVisible();
  const ics = await request.get(`/api/ics/${b.token}`);
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  page.on("dialog", (dlg) => dlg.accept());
  await page.getByRole("button", { name: "Annuler le rendez-vous" }).click();
  await expect(page.getByTestId("cancelled")).toBeVisible();
  expect(outbox().some((m) => m.subject.includes("Réservation annulée"))).toBe(true);
  const after = readStore();
  expect(after.bookings.find((x: { id: string }) => x.id === b.id).status).toBe("cancelled");
  expect(after.notifications.filter((n: { bookingId: string; status: string; type: string }) => n.bookingId === b.id && n.type.startsWith("reminder")).every((n: { status: string }) => n.status === "skipped")).toBe(true);
  expect((await request.get("/reservation/token-inconnu")).status()).toBe(404);
});

test("rappels : la tâche planifiée envoie ce qui est dû, refuse sans secret", async ({ request }) => {
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  expect((await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer faux" } })).status()).toBe(401);
  // On rend un rappel échu (date dans le passé) pour une réservation confirmée.
  const d = dayInDays(3);
  const m = (await (await request.get(`/api/slots?serviceId=${SVC}&date=${d}`)).json()).slots[1].minutes;
  await request.post("/api/bookings", { data: { serviceId: SVC, date: d, minutes: m, name: "Rappel Test", phone: "+229 97 00 20 01", email: "rappel@example.com", consentReminders: true } });
  const s = readStore();
  const b = s.bookings.find((x: { clientId: string }) => s.clients.find((c: { id: string; email: string }) => c.id === x.clientId)?.email === "rappel@example.com");
  const n = s.notifications.find((x: { bookingId: string; type: string }) => x.bookingId === b.id && x.type === "reminder_d1");
  expect(n.status).toBe("pending");
  n.sendAt = new Date(Date.now() - 60_000).toISOString();
  writeStore(s);
  const r = await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer test-cron" } });
  expect(r.status()).toBe(200);
  expect((await r.json()).sent).toBeGreaterThanOrEqual(1);
  const mail = outbox().find((x) => x.to === "rappel@example.com" && x.subject.startsWith("Rappel"));
  expect(mail, "rappel envoyé").toBeTruthy();
  expect(mail!.html).toContain("Ne plus recevoir de rappels");
  expect(readStore().notifications.find((x: { id: string }) => x.id === n.id).status).toBe("sent");
  // idempotent : un second passage n'envoie pas deux fois
  const again = await (await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer test-cron" } })).json();
  expect(again.sent).toBe(0);
});

test("désinscription des rappels", async ({ page }) => {
  const s = readStore();
  const c = s.clients.find((x: { email: string }) => x.email === "rappel@example.com");
  const b = s.bookings.find((x: { clientId: string }) => x.clientId === c.id);
  await page.goto(`/reservation/${b.token}`);
  await page.getByRole("button", { name: "Ne plus recevoir de rappels" }).click();
  await expect(page.getByText("Rappels désactivés.")).toBeVisible();
  expect(readStore().clients.find((x: { id: string }) => x.id === c.id).consentReminders).toBe(false);
});
