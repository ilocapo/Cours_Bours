"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { COOKIE, checkPassword, makeSession, verifySession } from "@/lib/admin/auth";
import { getStore } from "@/lib/booking/store";
import { cancelBooking, createBooking, processDue } from "@/lib/booking/service";
import { addDays, isoToLocal, localToIso, parseHHMM } from "@/lib/booking/time";
import type { BookingStatus } from "@/lib/booking/types";
import type { OpeningHours } from "@/data/hours";
import { parsePhone } from "@/lib/phone";
import { checkEmail } from "@/lib/validate";

// Au comptoir, un numéro saisi sans indicatif est un numéro béninois.
function withDefaultDial(p: string): string {
  const t = p.trim();
  return t.startsWith("+") || t.startsWith("00") ? t : `+229 ${t}`;
}

async function guard() {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!(await verifySession(c))) redirect("/admin/login");
}

export async function login(_: unknown, fd: FormData): Promise<{ error: string } | undefined> {
  const pw = String(fd.get("password") ?? "");
  if (!checkPassword(pw)) return { error: process.env.ADMIN_PASSWORD || process.env.NODE_ENV !== "production" ? "Mot de passe incorrect." : "L'accès n'est pas encore configuré (ADMIN_PASSWORD)." };
  (await cookies()).set(COOKIE, await makeSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 3600 });
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export async function setStatus(fd: FormData) {
  await guard();
  const id = String(fd.get("id")); const status = String(fd.get("status")) as BookingStatus; const back = String(fd.get("back") || "/admin/agenda");
  const store = await getStore();
  if (status === "cancelled") await cancelBooking(id, "salon");
  else {
    const b = await store.getBooking(id);
    if (b) {
      await store.saveBooking({ ...b, status });
      if (status === "done") {
        const c = await store.getClient(b.clientId);
        if (c?.email && c.consentReminders) {
          await store.saveNotification({ id: randomUUID(), bookingId: id, type: "thanks", channel: "email", sendAt: new Date(Date.now() + 2 * 3_600_000).toISOString(), status: "pending", sentAt: null, error: null });
        }
      }
    }
  }
  redirect(back);
}

export async function saveBookingNote(fd: FormData) {
  await guard();
  const store = await getStore();
  const b = await store.getBooking(String(fd.get("id")));
  if (b) await store.saveBooking({ ...b, note: String(fd.get("note") ?? "").slice(0, 1000) });
  redirect(String(fd.get("back") || "/admin/agenda"));
}

export async function moveBooking(fd: FormData) {
  await guard();
  const store = await getStore();
  const b = await store.getBooking(String(fd.get("id")));
  const date = String(fd.get("date")); const time = String(fd.get("time"));
  if (b && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)) {
    const dur = (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 60000;
    const start = localToIso(date, parseHHMM(time));
    await store.saveBooking({ ...b, startsAt: start, endsAt: new Date(new Date(start).getTime() + dur * 60000).toISOString() });
    // Rappels recalculés : les anciens sont annulés, de nouveaux sont programmés.
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
  redirect(String(fd.get("back") || "/admin/agenda"));
}

export async function createManual(fd: FormData) {
  await guard();
  const r = await createBooking({
    serviceId: String(fd.get("serviceId")), date: String(fd.get("date")), minutes: parseHHMM(String(fd.get("time") || "09:00")),
    staffId: String(fd.get("staffId") || "") || null, name: String(fd.get("name")), phone: withDefaultDial(String(fd.get("phone") ?? "")),
    email: String(fd.get("email") || "") || null, consentReminders: fd.get("consent") === "on", note: String(fd.get("note") ?? ""),
    source: "admin", skipSlotCheck: true,
  });
  if (!r.ok) redirect(`/admin/reservations/nouvelle?error=${encodeURIComponent(r.error)}`);
  redirect(`/admin/agenda?d=${isoToLocal(r.booking.startsAt).date}&b=${r.booking.id}`);
}

export async function saveClientNotes(fd: FormData) {
  await guard();
  const store = await getStore();
  const c = await store.getClient(String(fd.get("id")));
  const ph = parsePhone(withDefaultDial(String(fd.get("phone") || c?.phone || "")));
  const em = String(fd.get("email") || "").trim();
  if (c && (!ph.ok || (em && !checkEmail(em).ok))) redirect(`/admin/clients/${c.id}?error=${encodeURIComponent(!ph.ok ? ph.error : "Adresse e-mail invalide.")}`);
  if (c && ph.ok) await store.saveClient({ ...c, name: String(fd.get("name") || c.name), phone: ph.e164, email: em ? em.toLowerCase() : null, notes: String(fd.get("notes") ?? "").slice(0, 4000) });
  redirect(`/admin/clients/${String(fd.get("id"))}`);
}

export async function saveServiceAction(fd: FormData) {
  await guard();
  const store = await getStore();
  const id = String(fd.get("id") || "") || `svc-${randomUUID().slice(0, 8)}`;
  const priceRaw = String(fd.get("price") ?? "").replace(/\s/g, "");
  await store.saveService({
    id, categoryId: String(fd.get("categoryId")), name: String(fd.get("name")).trim() || "Sans nom",
    durationMin: Math.max(5, Number(fd.get("durationMin")) || 60), price: priceRaw === "" ? null : Math.max(0, Number(priceRaw) || 0), active: fd.get("active") === "on",
  });
  redirect("/admin/prestations");
}

export async function saveStaffAction(fd: FormData) {
  await guard();
  const store = await getStore();
  const id = String(fd.get("id") || "") || `staff-${randomUUID().slice(0, 8)}`;
  await store.saveStaff({ id, name: String(fd.get("name")).trim() || "Sans nom", categoryIds: fd.getAll("categoryIds").map(String), active: fd.get("active") === "on" });
  redirect("/admin/equipe");
}

export async function saveSettingsAction(fd: FormData) {
  await guard();
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
    salonEmail: String(fd.get("salonEmail") || cur.salonEmail),
  });
  const hours = await store.getHours();
  const next: OpeningHours[] = hours.map((h) => {
    const closed = fd.get(`closed-${h.weekday}`) === "on";
    const o = String(fd.get(`opens-${h.weekday}`) || ""); const c = String(fd.get(`closes-${h.weekday}`) || "");
    return { ...h, opens: closed || !o ? null : o, closes: closed || !c ? null : c };
  });
  await store.saveHours(next);
  redirect("/admin/reglages?ok=1");
}

export async function runReminders() {
  await guard();
  await processDue();
  redirect("/admin/notifications");
}
