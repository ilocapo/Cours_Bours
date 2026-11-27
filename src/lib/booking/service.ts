import { randomBytes, randomUUID } from "node:crypto";
import { getStore, type Store } from "./store";
import { pickStaff, slotsFor } from "./availability";
import { buildIcs } from "./ics";
import { salonMail, scenarioMail, sendMail } from "./mail";
import { scenario } from "./templates";
import { addDays, isoToLocal, localToIso, longWhen } from "./time";
import type { Booking, BookingSource, BookingView, Notification, NotificationType, TemplateKey } from "./types";
import { parsePhone } from "@/lib/phone";
import { checkEmail, checkName } from "@/lib/validate";

export const newToken = () => randomBytes(18).toString("base64url");

export async function toView(store: Store, b: Booking): Promise<BookingView> {
  const [svcs, staff, client] = await Promise.all([store.listServices(), store.listStaff(), store.getClient(b.clientId)]);
  const s = svcs.find((x) => x.id === b.serviceId);
  return {
    ...b,
    serviceName: s?.name ?? "Rituel", durationMin: s?.durationMin ?? 60,
    clientName: client?.name ?? "Cliente", clientPhone: client?.phone ?? "", clientEmail: client?.email ?? null,
    staffName: staff.find((x) => x.id === b.staffId)?.name ?? null,
  };
}

export type CreateInput = {
  serviceId: string; date: string; minutes: number; staffId?: string | null;
  name: string; phone: string; email?: string | null; consentReminders: boolean; note?: string;
  source: BookingSource; skipSlotCheck?: boolean;
};

export type CreateResult = { ok: true; booking: Booking } | { ok: false; error: string; code: "invalid" | "taken" };

export async function createBooking(input: CreateInput, now = new Date()): Promise<CreateResult> {
  const store = await getStore();
  const n = checkName(input.name);
  if (!n.ok) return { ok: false, error: n.error, code: "invalid" };
  const p = parsePhone(input.phone);
  if (!p.ok) return { ok: false, error: p.error, code: "invalid" };
  let email: string | null = null;
  if (input.email && input.email.trim()) {
    const e = checkEmail(input.email);
    if (!e.ok) return { ok: false, error: e.error, code: "invalid" };
    email = e.email;
  }
  const name = n.name;
  const phone = p.e164;

  const svcs = await store.listServices();
  const svc = svcs.find((s) => s.id === input.serviceId && s.active);
  if (!svc) return { ok: false, error: "Ce rituel n'est plus proposé.", code: "invalid" };

  if (!input.skipSlotCheck) {
    const free = await slotsFor(store, { serviceId: svc.id, date: input.date, staffId: input.staffId }, now);
    if (!free.includes(input.minutes)) return { ok: false, error: "Ce créneau vient d'être pris. Choisissez-en un autre.", code: "taken" };
  }

  let client = await store.findClient(phone, email);
  if (!client) client = { id: randomUUID(), name, phone, email, notes: "", consentReminders: input.consentReminders, createdAt: now.toISOString() };
  else client = { ...client, name: client.name || name, email: client.email ?? email, consentReminders: input.consentReminders };
  await store.saveClient(client);

  const booking: Booking = {
    id: randomUUID(), token: newToken(), serviceId: svc.id,
    // Sans choix de la cliente, on assigne la première personne libre et compétente : le planning de l'équipe reste à jour.
    staffId: input.staffId || (await pickStaff(store, svc.id, input.date, input.minutes)), clientId: client.id,
    startsAt: localToIso(input.date, input.minutes), endsAt: localToIso(input.date, input.minutes + svc.durationMin),
    status: "confirmed", source: input.source, note: input.note?.trim() ?? "", createdAt: now.toISOString(),
  };
  await store.saveBooking(booking);
  await scheduleNotifications(store, booking, client.email, client.consentReminders, now);
  await processDue(now); // confirmation et alerte du salon partent tout de suite
  return { ok: true, booking };
}

async function scheduleNotifications(store: Store, b: Booking, email: string | null, consent: boolean, now: Date) {
  const settings = await store.getSettings();
  const mk = (type: NotificationType, sendAt: string, status: Notification["status"] = "pending", error: string | null = null): Notification =>
    ({ id: randomUUID(), bookingId: b.id, type, channel: "email", sendAt, status, sentAt: null, error });
  const list: Notification[] = [];
  list.push(email ? mk("confirmation", now.toISOString()) : mk("confirmation", now.toISOString(), "skipped", "Pas d'adresse e-mail"));
  list.push(mk("salon_new", now.toISOString()));
  if (email && consent) {
    const local = isoToLocal(b.startsAt);
    const d1 = localToIso(addDays(local.date, -1), settings.reminderD1Hour * 60);
    const h2 = new Date(new Date(b.startsAt).getTime() - settings.reminderH2Hours * 3_600_000).toISOString();
    if (d1 > now.toISOString()) list.push(mk("reminder_d1", d1));
    if (h2 > now.toISOString() && h2 !== d1) list.push(mk("reminder_h2", h2));
  }
  for (const n of list) await store.saveNotification(n);
}

export async function cancelBooking(id: string, by: "client" | "salon", now = new Date()): Promise<boolean> {
  const store = await getStore();
  const b = await store.getBooking(id);
  if (!b || b.status === "cancelled") return false;
  await store.saveBooking({ ...b, status: "cancelled" });
  for (const n of await store.listNotifications({ bookingId: id, status: "pending" })) {
    await store.saveNotification({ ...n, status: "skipped", error: "Rendez-vous annulé" });
  }
  for (const type of ["salon_cancel", "client_cancel"] as const) await store.saveNotification({ id: randomUUID(), bookingId: id, type, channel: "email", sendAt: now.toISOString(), status: "pending", sentAt: null, error: null });
  void by;
  await processDue(now);
  return true;
}

/** Envoie ce qui est dû. Appelé par la tâche planifiée (toutes les 15 min) et après chaque réservation. */
export async function processDue(now = new Date()): Promise<{ sent: number; failed: number; skipped: number }> {
  const store = await getStore();
  const settings = await store.getSettings();
  const due = await store.listNotifications({ status: "pending", dueBefore: now.toISOString() });
  let sent = 0, failed = 0, skipped = 0;
  for (const n of due) {
    const b = await store.getBooking(n.bookingId);
    const finish = async (status: Notification["status"], error: string | null = null) => {
      await store.saveNotification({ ...n, status, error, sentAt: status === "sent" ? new Date().toISOString() : null });
      if (status === "sent") sent++; else if (status === "failed") failed++; else skipped++;
    };
    if (!b) { await finish("skipped", "Rendez-vous introuvable"); continue; }
    if (b.status === "cancelled" && n.type !== "salon_cancel" && n.type !== "client_cancel") { await finish("skipped", "Rendez-vous annulé"); continue; }
    const v = await toView(store, b);
    const client = await store.getClient(b.clientId);
    if ((n.type === "reminder_d1" || n.type === "reminder_h2" || (n.type === "thanks" && scenario("thanks").transactional === false)) && !client?.consentReminders) { await finish("skipped", "Rappels refusés"); continue; }
    if (n.type === "reminder_h2" && new Date(b.startsAt).getTime() < now.getTime()) { await finish("skipped", "Rendez-vous passé"); continue; }

    let mail;
    if (n.type === "salon_new" || n.type === "salon_cancel") {
      mail = salonMail(v, n.type); mail.to = settings.salonEmail;
    } else if (!v.clientEmail) { await finish("skipped", "Pas d'adresse e-mail"); continue; }
    else {
      const ics = n.type === "confirmation" ? buildIcs({ id: b.id, startsAt: b.startsAt, endsAt: b.endsAt, title: `${v.serviceName} · ZST Beauty Center`, description: longWhen(b.startsAt) }) : undefined;
      mail = scenarioMail(n.type as TemplateKey, v, { settings, ics });
      if (!mail) { await finish("skipped", "Scénario désactivé"); continue; }
    }
    const r = await sendMail(mail);
    await finish(r.ok ? "sent" : "failed", r.ok ? null : r.error ?? "Erreur");
  }
  return { sent, failed, skipped };
}

/** Passe un rendez-vous en « terminé » et programme (une seule fois) l'e-mail de remerciement. */
export async function markDone(store: Store, b: Booking): Promise<void> {
  await store.saveBooking({ ...b, status: "done" });
  const c = await store.getClient(b.clientId);
  if (!c?.email || !c.consentReminders) return;
  const already = (await store.listNotifications({ bookingId: b.id })).some((n) => n.type === "thanks");
  if (already) return;
  await store.saveNotification({ id: randomUUID(), bookingId: b.id, type: "thanks", channel: "email", sendAt: new Date(Date.now() + 2 * 3_600_000).toISOString(), status: "pending", sentAt: null, error: null });
}
