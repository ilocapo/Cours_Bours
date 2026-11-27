import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { services as seedServices, type Service } from "@/data/services";
import { staff as seedStaff, type Staff } from "@/data/staff";
import { openingHours as seedHours, type OpeningHours } from "@/data/hours";
import { DEFAULT_SETTINGS, type Absence, type Booking, type Client, type Invoice, type Notification, type NotificationStatus, type Settings, type TimeEntry, type User } from "./types";
import type { Store } from "./store";

type Data = {
  services: Service[]; staff: Staff[]; hours: OpeningHours[]; settings: Settings;
  clients: Client[]; bookings: Booking[]; notifications: Notification[]; users: User[]; invoices: Invoice[]; timeEntries: TimeEntry[]; absences: Absence[];
};

// Stockage dans .data/store.json : pour le développement et les tests. Pas pour la production.
const FILE = process.env.ZST_STORE_FILE || join(process.cwd(), ".data", "store.json");

function load(): Data {
  if (existsSync(FILE)) {
    try {
      const d = JSON.parse(readFileSync(FILE, "utf8"));
      return { users: [], invoices: [], timeEntries: [], absences: [], ...d, staff: (d.staff ?? []).map((s: Staff) => ({ ...s, serviceIds: s.serviceIds ?? [], schedule: s.schedule ?? null, color: s.color ?? "#1C1013" })) };
    } catch { /* repart du modèle */ }
  }
  return {
    services: structuredClone(seedServices), staff: structuredClone(seedStaff),
    hours: structuredClone(seedHours).map((h) => ({ ...h, opens: h.opens ?? "09:00", closes: h.closes ?? "20:00" })),
    settings: { ...DEFAULT_SETTINGS }, clients: [], bookings: [], notifications: [], users: [], invoices: [], timeEntries: [], absences: [],
  };
}

export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private d: Data = load();
  private persist() {
    mkdirSync(dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`; // écriture atomique : jamais de fichier à moitié écrit
    writeFileSync(tmp, JSON.stringify(this.d, null, 2));
    renameSync(tmp, FILE);
  }
  private upsert<T extends { id: string }>(list: T[], item: T) {
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
    this.persist();
  }
  // Relit le fichier : plusieurs processus (tests, serveur) peuvent écrire.
  private fresh() { this.d = load(); return this.d; }

  async listServices() { return this.fresh().services; }
  async saveService(s: Service) { this.fresh(); this.upsert(this.d.services, s); }
  async listStaff() { return this.fresh().staff; }
  async saveStaff(s: Staff) { this.fresh(); this.upsert(this.d.staff, s); }
  async getHours() { return this.fresh().hours; }
  async saveHours(h: OpeningHours[]) { this.fresh(); this.d.hours = h; this.persist(); }
  async getSettings() { return { ...DEFAULT_SETTINGS, ...this.fresh().settings }; }
  async saveSettings(s: Settings) { this.fresh(); this.d.settings = s; this.persist(); }

  async listClients() { return this.fresh().clients; }
  async getClient(id: string) { return this.fresh().clients.find((c) => c.id === id) ?? null; }
  async findClient(phone: string, email: string | null) {
    const digits = phone.replace(/\D/g, "");
    return this.fresh().clients.find((c) => (digits && c.phone.replace(/\D/g, "") === digits) || (email && c.email?.toLowerCase() === email.toLowerCase())) ?? null;
  }
  async saveClient(c: Client) { this.fresh(); this.upsert(this.d.clients, c); }

  async listBookings(fromIso?: string, toIso?: string) {
    return this.fresh().bookings.filter((b) => (!fromIso || b.endsAt > fromIso) && (!toIso || b.startsAt < toIso)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  async getBooking(id: string) { return this.fresh().bookings.find((b) => b.id === id) ?? null; }
  async getBookingByToken(token: string) { return this.fresh().bookings.find((b) => b.token === token) ?? null; }
  async saveBooking(b: Booking) { this.fresh(); this.upsert(this.d.bookings, b); }

  async listUsers() { return this.fresh().users; }
  async getUser(id: string) { return this.fresh().users.find((u) => u.id === id) ?? null; }
  async getUserByEmail(email: string) { return this.fresh().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? null; }
  async saveUser(u: User) { this.fresh(); this.upsert(this.d.users, u); }

  async listInvoices() { return this.fresh().invoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)); }
  async getInvoice(id: string) { return this.fresh().invoices.find((i) => i.id === id) ?? null; }
  async getInvoiceByToken(token: string) { return this.fresh().invoices.find((i) => i.token === token) ?? null; }
  async saveInvoice(i: Invoice) { this.fresh(); this.upsert(this.d.invoices, i); }

  async listTimeEntries(fromIso?: string, toIso?: string) { return this.fresh().timeEntries.filter((t) => (!fromIso || t.inAt >= fromIso) && (!toIso || t.inAt < toIso)).sort((a, b) => a.inAt.localeCompare(b.inAt)); }
  async saveTimeEntry(t: TimeEntry) { this.fresh(); this.upsert(this.d.timeEntries, t); }
  async deleteTimeEntry(id: string) { this.fresh(); this.d.timeEntries = this.d.timeEntries.filter((t) => t.id !== id); this.persist(); }
  async listAbsences() { return this.fresh().absences; }
  async saveAbsence(a: Absence) { this.fresh(); this.upsert(this.d.absences, a); }
  async deleteAbsence(id: string) { this.fresh(); this.d.absences = this.d.absences.filter((a) => a.id !== id); this.persist(); }

  async listNotifications(f: { bookingId?: string; status?: NotificationStatus; dueBefore?: string; limit?: number } = {}) {
    let l = this.fresh().notifications.filter((n) => (!f.bookingId || n.bookingId === f.bookingId) && (!f.status || n.status === f.status) && (!f.dueBefore || n.sendAt <= f.dueBefore));
    l = l.sort((a, b) => a.sendAt.localeCompare(b.sendAt));
    return f.limit ? l.slice(-f.limit) : l;
  }
  async saveNotification(n: Notification) { this.fresh(); this.upsert(this.d.notifications, n); }
}
