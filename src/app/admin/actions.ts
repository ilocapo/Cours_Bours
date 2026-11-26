"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { COOKIE, ENV_ADMIN_ID, checkPassword, makeSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/roles";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/admin/password";
import { ensureTestUsers, requireUser, type Current } from "@/lib/admin/session";
import { getStore } from "@/lib/booking/store";
import { cancelBooking, createBooking, processDue } from "@/lib/booking/service";
import { addPayment, createInvoice, sendInvoice, statusFor } from "@/lib/booking/invoices";
import { sendMail, testMail } from "@/lib/booking/mail";
import { toXof } from "@/lib/booking/money";
import { addDays, isoToLocal, localToIso, parseHHMM } from "@/lib/booking/time";
import type { BookingSource, BookingStatus, PayMethod, Role } from "@/lib/booking/types";
import type { OpeningHours } from "@/data/hours";
import type { Shift } from "@/data/staff";
import { parsePhone } from "@/lib/phone";
import { checkEmail } from "@/lib/validate";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const back = (fd: FormData, d = "/admin/agenda") => { const b = str(fd, "back"); return b.startsWith("/admin") ? b : d; };

// Au comptoir, un numéro saisi sans indicatif est un numéro béninois.
function withDefaultDial(p: string): string {
  const t = p.trim();
  return t.startsWith("+") || t.startsWith("00") ? t : `+229 ${t}`;
}

/** Une employée ne touche qu'à ses propres rendez-vous ; la gérante et le super admin à tous. */
async function bookingAccess(me: Current, bookingId: string) {
  const store = await getStore();
  const b = await store.getBooking(bookingId);
  if (!b) redirect("/admin/agenda");
  const ok = can(me.role, "bookings.manage") || (can(me.role, "bookings.own") && b.staffId && b.staffId === me.staffId);
  if (!ok) redirect("/admin?refus=1");
  return { store, b };
}

// ---------------------------------------------------------------- connexion
export async function login(_: unknown, fd: FormData): Promise<{ error: string } | undefined> {
  const id = str(fd, "identifiant").trim().toLowerCase();
  const pw = str(fd, "password");
  const bad = { error: "Identifiant ou mot de passe incorrect." };
  const next = str(fd, "next");
  const to = next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
  const jar = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 12 * 3600 };
  if (!id || !pw) return { error: "Renseignez votre identifiant et votre mot de passe." };

  if (id === "admin") {
    if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") return { error: "Compte de secours non configuré (ADMIN_PASSWORD)." };
    if (!checkPassword(pw)) return bad;
    jar.set(COOKIE, await makeSession(ENV_ADMIN_ID, "super_admin"), opts);
    redirect(to);
  }
  await ensureTestUsers();
  let user;
  try { user = await (await getStore()).getUserByEmail(id); } catch { return { error: "Les comptes ne sont pas encore disponibles : exécutez la migration 0002 dans Supabase, ou connectez-vous avec l'identifiant « admin »." }; }
  if (!user || !user.active || !verifyPassword(pw, user.passwordHash)) return bad;
  jar.set(COOKIE, await makeSession(user.id, user.role), opts);
  redirect(to);
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export async function changeOwnPassword(fd: FormData) {
  const me = await requireUser();
  if (me.id === ENV_ADMIN_ID) redirect("/admin/profil?erreur=" + encodeURIComponent("Le compte de secours se change dans les variables d'environnement (ADMIN_PASSWORD)."));
  const store = await getStore();
  const u = await store.getUser(me.id);
  const err = (m: string) => redirect("/admin/profil?erreur=" + encodeURIComponent(m));
  if (!u || !verifyPassword(str(fd, "current"), u.passwordHash)) err("Mot de passe actuel incorrect.");
  const weak = checkPasswordStrength(str(fd, "next"));
  if (weak) err(weak);
  if (str(fd, "next") !== str(fd, "again")) err("Les deux nouveaux mots de passe ne correspondent pas.");
  await store.saveUser({ ...u!, passwordHash: hashPassword(str(fd, "next")) });
  redirect("/admin/profil?ok=1");
}

// ---------------------------------------------------------------- rendez-vous
export async function setStatus(fd: FormData) {
  const me = await requireUser(["bookings.manage", "bookings.own"]);
  const id = str(fd, "id"); const status = str(fd, "status") as BookingStatus;
  const { store, b } = await bookingAccess(me, id);
  if (status === "cancelled") await cancelBooking(id, "salon");
  else {
    await store.saveBooking({ ...b, status });
    if (status === "done") {
      const c = await store.getClient(b.clientId);
      if (c?.email && c.consentReminders) await store.saveNotification({ id: randomUUID(), bookingId: id, type: "thanks", channel: "email", sendAt: new Date(Date.now() + 2 * 3_600_000).toISOString(), status: "pending", sentAt: null, error: null });
    }
  }
  redirect(back(fd));
}

export async function saveBookingNote(fd: FormData) {
  const me = await requireUser(["bookings.manage", "bookings.own"]);
  const { store, b } = await bookingAccess(me, str(fd, "id"));
  await store.saveBooking({ ...b, note: str(fd, "note").slice(0, 1000) });
  redirect(back(fd));
}

export async function assignStaff(fd: FormData) {
  const me = await requireUser("bookings.manage");
  const { store, b } = await bookingAccess(me, str(fd, "id"));
  await store.saveBooking({ ...b, staffId: str(fd, "staffId") || null });
  redirect(back(fd));
}

export async function moveBooking(fd: FormData) {
  const me = await requireUser("bookings.manage");
  const { store, b } = await bookingAccess(me, str(fd, "id"));
  const date = str(fd, "date"); const time = str(fd, "time");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
    const dur = (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 60000;
    const start = localToIso(date, parseHHMM(time));
    await store.saveBooking({ ...b, startsAt: start, endsAt: new Date(new Date(start).getTime() + dur * 60000).toISOString() });
    const settings = await store.getSettings();
    for (const n of await store.listNotifications({ bookingId: b.id, status: "pending" })) await store.saveNotification({ ...n, status: "skipped", error: "Rendez-vous déplacé" });
    const c = await store.getClient(b.clientId);
    if (c?.email && c.consentReminders) {
      const l = isoToLocal(start);
      const d1 = localToIso(addDays(l.date, -1), settings.reminderD1Hour * 60);
      const h2 = new Date(new Date(start).getTime() - settings.reminderH2Hours * 3_600_000).toISOString();
      const now = new Date().toISOString();
      const add = (type: "reminder_d1" | "reminder_h2", at: string) => store.saveNotification({ id: randomUUID(), bookingId: b.id, type, channel: "email", sendAt: at, status: "pending", sentAt: null, error: null });
      if (d1 > now) await add("reminder_d1", d1);
      if (h2 > now) await add("reminder_h2", h2);
    }
  }
  redirect(back(fd));
}

export async function resendConfirmation(fd: FormData) {
  const me = await requireUser(["bookings.manage", "bookings.own"]);
  const { store, b } = await bookingAccess(me, str(fd, "id"));
  await store.saveNotification({ id: randomUUID(), bookingId: b.id, type: "confirmation", channel: "email", sendAt: new Date().toISOString(), status: "pending", sentAt: null, error: null });
  await processDue();
  redirect(back(fd));
}

export async function createManual(fd: FormData) {
  await requireUser("bookings.manage");
  const r = await createBooking({
    serviceId: str(fd, "serviceId"), date: str(fd, "date"), minutes: parseHHMM(str(fd, "time") || "09:00"),
    staffId: str(fd, "staffId") || null, name: str(fd, "name"), phone: withDefaultDial(str(fd, "phone")),
    email: str(fd, "email") || null, consentReminders: fd.get("consent") === "on", note: str(fd, "note"),
    source: (str(fd, "canal") || "comptoir") as BookingSource, skipSlotCheck: true,
  });
  if (!r.ok) redirect(`/admin/reservations/nouvelle?error=${encodeURIComponent(r.error)}`);
  redirect(`/admin/agenda?d=${isoToLocal(r.booking.startsAt).date}&b=${r.booking.id}`);
}

// ---------------------------------------------------------------- factures
export async function createInvoiceAction(fd: FormData) {
  const me = await requireUser("invoices.write");
  const { store, b } = await bookingAccess(me, str(fd, "bookingId"));
  const target = back(fd);
  const fail = (m: string) => redirect(`${target}${target.includes("?") ? "&" : "?"}erreur=${encodeURIComponent(m)}`);
  const amount = toXof(str(fd, "amount"));
  if (amount === null || amount <= 0) fail("Indiquez le montant négocié, en francs CFA.");
  const svc = (await store.listServices()).find((s) => s.id === b.serviceId);
  const label = str(fd, "label").trim() || svc?.name || "Prestation";
  const method = (str(fd, "method") || "especes") as PayMethod;
  const inv = await createInvoice(store, { bookingId: b.id, clientId: b.clientId, staffId: b.staffId, lines: [{ label, qty: 1, unitXof: amount! }], paidXof: fd.get("paid") === "on" ? amount! : 0, method, note: str(fd, "note"), createdBy: me.name });
  await store.saveBooking({ ...b, status: "done" });
  if (str(fd, "intent") === "send") {
    const r = await sendInvoice(store, inv.id);
    if (!r.ok) fail(`Facture ${inv.number} enregistrée, mais l'e-mail n'est pas parti : ${r.error}`);
  }
  redirect(`${target}${target.includes("?") ? "&" : "?"}ok=${encodeURIComponent(`Facture ${inv.number} enregistrée.`)}`);
}

export async function addPaymentAction(fd: FormData) {
  await requireUser("invoices.write");
  const store = await getStore();
  const amount = toXof(str(fd, "amount"));
  const id = str(fd, "id");
  if (amount === null || amount <= 0) redirect(`/admin/factures/${id}?erreur=${encodeURIComponent("Montant invalide.")}`);
  await addPayment(store, id, amount!, (str(fd, "method") || "especes") as PayMethod);
  redirect(`/admin/factures/${id}?ok=${encodeURIComponent("Paiement enregistré.")}`);
}

export async function sendInvoiceAction(fd: FormData) {
  await requireUser("invoices.write");
  const id = str(fd, "id");
  const r = await sendInvoice(await getStore(), id);
  redirect(`/admin/factures/${id}?${r.ok ? "ok=" + encodeURIComponent("Facture envoyée par e-mail.") : "erreur=" + encodeURIComponent(r.error ?? "Échec de l'envoi.")}`);
}

export async function voidInvoiceAction(fd: FormData) {
  await requireUser("bookings.manage");
  const store = await getStore();
  const inv = await store.getInvoice(str(fd, "id"));
  if (inv) await store.saveInvoice({ ...inv, status: inv.status === "void" ? statusFor(inv.totalXof, inv.paidXof) : "void" });
  redirect(`/admin/factures/${str(fd, "id")}`);
}

// ---------------------------------------------------------------- clientes, prestations, équipe, réglages
export async function saveClientNotes(fd: FormData) {
  await requireUser("clients");
  const store = await getStore();
  const id = str(fd, "id");
  const c = await store.getClient(id);
  const ph = parsePhone(withDefaultDial(str(fd, "phone") || c?.phone || ""));
  const em = str(fd, "email").trim();
  if (c && (!ph.ok || (em && !checkEmail(em).ok))) redirect(`/admin/clients/${c.id}?error=${encodeURIComponent(!ph.ok ? ph.error : "Adresse e-mail invalide.")}`);
  if (c && ph.ok) await store.saveClient({ ...c, name: str(fd, "name") || c.name, phone: ph.e164, email: em ? em.toLowerCase() : null, notes: str(fd, "notes").slice(0, 4000) });
  redirect(`/admin/clients/${id}`);
}

export async function saveServiceAction(fd: FormData) {
  await requireUser("catalog");
  const store = await getStore();
  const id = str(fd, "id") || `svc-${randomUUID().slice(0, 8)}`;
  const priceRaw = str(fd, "price").replace(/\s/g, "");
  await store.saveService({
    id, categoryId: str(fd, "categoryId"), name: str(fd, "name").trim() || "Sans nom",
    durationMin: Math.max(5, Number(fd.get("durationMin")) || 60), price: priceRaw === "" ? null : Math.max(0, Number(priceRaw) || 0), active: fd.get("active") === "on",
  });
  redirect("/admin/prestations");
}

export async function saveStaffAction(fd: FormData) {
  await requireUser("team");
  const store = await getStore();
  const id = str(fd, "id") || `staff-${randomUUID().slice(0, 8)}`;
  let schedule: Record<number, Shift | null> | null = null;
  if (fd.get("custom") === "on") {
    schedule = {};
    for (let wd = 1; wd <= 7; wd++) {
      const on = fd.get(`on-${wd}`) === "on"; const s = str(fd, `start-${wd}`); const e = str(fd, `end-${wd}`);
      schedule[wd] = on && s && e && parseHHMM(e) > parseHHMM(s) ? { start: s, end: e } : null;
    }
  }
  await store.saveStaff({ id, name: str(fd, "name").trim() || "Sans nom", categoryIds: fd.getAll("categoryIds").map(String), serviceIds: fd.getAll("serviceIds").map(String), schedule, color: str(fd, "color") || "#1C1013", active: fd.get("active") === "on" });
  redirect("/admin/equipe?ok=1");
}

export async function saveSettingsAction(fd: FormData) {
  await requireUser("settings");
  const store = await getStore();
  const cur = await store.getSettings();
  await store.saveSettings({
    ...cur,
    reminderD1Hour: Math.min(23, Math.max(0, Number(fd.get("reminderD1Hour")) || 18)),
    reminderH2Hours: Math.min(48, Math.max(1, Number(fd.get("reminderH2Hours")) || 2)),
    slotStepMin: [15, 30, 60].includes(Number(fd.get("slotStepMin"))) ? Number(fd.get("slotStepMin")) : 30,
    leadTimeMin: Math.max(0, Number(fd.get("leadTimeMin")) || 0),
    maxDaysAhead: Math.min(365, Math.max(1, Number(fd.get("maxDaysAhead")) || 60)),
    capacity: Math.max(1, Number(fd.get("capacity")) || 1),
    salonEmail: str(fd, "salonEmail") || cur.salonEmail,
  });
  const hours = await store.getHours();
  const next: OpeningHours[] = hours.map((h) => {
    const closed = fd.get(`closed-${h.weekday}`) === "on";
    const o = str(fd, `opens-${h.weekday}`); const c = str(fd, `closes-${h.weekday}`);
    return { ...h, opens: closed || !o ? null : o, closes: closed || !c ? null : c };
  });
  await store.saveHours(next);
  redirect("/admin/reglages?ok=1");
}

// ---------------------------------------------------------------- e-mails
export async function runReminders() {
  await requireUser("notifications");
  await processDue();
  redirect("/admin/notifications");
}

export async function sendTestMailAction(fd: FormData) {
  await requireUser("notifications");
  const to = str(fd, "to").trim();
  const e = checkEmail(to);
  if (!e.ok) redirect(`/admin/notifications?erreur=${encodeURIComponent(e.error)}`);
  const r = await sendMail(testMail((e as { email: string }).email));
  redirect(`/admin/notifications?${r.ok ? "ok=" + encodeURIComponent("E-mail de test envoyé à " + to + ".") : "erreur=" + encodeURIComponent("Échec : " + (r.error ?? "inconnu"))}`);
}

// ---------------------------------------------------------------- comptes (super admin)
const ROLES: Role[] = ["super_admin", "gerant", "employe", "comptable"];

export async function createUserAction(fd: FormData) {
  await requireUser("users");
  const store = await getStore();
  const email = str(fd, "email").trim().toLowerCase();
  const pw = str(fd, "password");
  const err = (m: string) => redirect(`/admin/utilisateurs?erreur=${encodeURIComponent(m)}`);
  if (!/^[^\s@]+(@[^\s@]+)?$/.test(email) || email === "admin") err("Identifiant invalide (ou réservé).");
  const weak = checkPasswordStrength(pw);
  if (weak) err(weak);
  if (await store.getUserByEmail(email)) err("Cet identifiant existe déjà.");
  const role = str(fd, "role") as Role;
  if (!ROLES.includes(role)) err("Rôle invalide.");
  await store.saveUser({ id: randomUUID(), email, name: str(fd, "name").trim() || email, role, passwordHash: hashPassword(pw), staffId: str(fd, "staffId") || null, active: true, createdAt: new Date().toISOString() });
  redirect(`/admin/utilisateurs?ok=${encodeURIComponent("Compte créé.")}`);
}

export async function updateUserAction(fd: FormData) {
  await requireUser("users");
  const store = await getStore();
  const u = await store.getUser(str(fd, "id"));
  if (!u) redirect("/admin/utilisateurs");
  const role = str(fd, "role") as Role;
  const active = fd.get("active") === "on";
  const users = await store.listUsers();
  const otherSupers = users.filter((x) => x.id !== u!.id && x.role === "super_admin" && x.active).length;
  if (u!.role === "super_admin" && (role !== "super_admin" || !active) && otherSupers === 0) redirect(`/admin/utilisateurs?erreur=${encodeURIComponent("Il doit rester au moins un super admin actif.")}`);
  await store.saveUser({ ...u!, name: str(fd, "name").trim() || u!.name, role: ROLES.includes(role) ? role : u!.role, active, staffId: str(fd, "staffId") || null });
  const pw = str(fd, "password");
  if (pw) {
    const weak = checkPasswordStrength(pw);
    if (weak) redirect(`/admin/utilisateurs?erreur=${encodeURIComponent(weak)}`);
    await store.saveUser({ ...(await store.getUser(u!.id))!, passwordHash: hashPassword(pw) });
  }
  redirect(`/admin/utilisateurs?ok=${encodeURIComponent("Compte mis à jour.")}`);
}

