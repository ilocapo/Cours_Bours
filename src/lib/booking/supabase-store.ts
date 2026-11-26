import type { OpeningHours } from "@/data/hours";
import type { Service } from "@/data/services";
import type { Staff } from "@/data/staff";
import { DEFAULT_SETTINGS, type Booking, type Client, type Invoice, type Notification, type NotificationStatus, type Settings, type User } from "./types";
import type { Store } from "./store";

// Accès à Supabase par l'API REST (PostgREST), côté serveur, avec la clé service_role.
// Aucune librairie ajoutée. Non testé contre un vrai projet : à valider au branchement.
type Row = Record<string, unknown>;

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  constructor(private url: string, private key: string) {}

  private async req<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
    const res = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: this.key,
        // Clés « sb_secret_… » (nouveau format) : pas de JWT, donc pas d'en-tête Authorization. Ancienne clé service_role : JWT.
        ...(this.key.startsWith("sb_") ? {} : { Authorization: `Bearer ${this.key}` }),
        "Content-Type": "application/json", Prefer: init.prefer ?? "return=representation", ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status} sur ${path.split("?")[0]} : ${(await res.text()).slice(0, 200)}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : []) as T;
  }
  private get<T>(path: string) { return this.req<T[]>(path); }
  private upsert(table: string, row: Row, onConflict = "id") {
    return this.req(`${table}?on_conflict=${onConflict}`, { method: "POST", body: JSON.stringify(row), prefer: "resolution=merge-duplicates,return=minimal" });
  }

  // --- catalogue
  async listServices(): Promise<Service[]> {
    const rows = await this.get<Row>("services?select=*&order=id");
    return rows.map((r) => ({ id: r.id as string, categoryId: r.category_id as string, name: r.name as string, description: (r.description as string) ?? undefined, durationMin: r.duration_min as number, price: (r.price_xof as number) ?? null, active: r.active as boolean }));
  }
  async saveService(s: Service) {
    await this.upsert("services", { id: s.id, category_id: s.categoryId, name: s.name, description: s.description ?? null, duration_min: s.durationMin, price_xof: s.price, active: s.active });
  }
  async listStaff(): Promise<Staff[]> {
    const rows = await this.get<Row>("staff?select=*&order=name");
    return rows.map((r) => ({ id: r.id as string, name: r.name as string, categoryIds: (r.category_ids as string[]) ?? [], serviceIds: (r.service_ids as string[]) ?? [], schedule: (r.schedule as Staff["schedule"]) ?? null, color: (r.color as string) ?? "#1C1013", active: r.active as boolean }));
  }
  async saveStaff(s: Staff) { await this.upsert("staff", { id: s.id, name: s.name, category_ids: s.categoryIds, service_ids: s.serviceIds, schedule: s.schedule, color: s.color, active: s.active }); }
  async getHours(): Promise<OpeningHours[]> {
    const rows = await this.get<Row>("opening_hours?select=*&order=weekday");
    return rows.map((r) => ({ weekday: r.weekday as OpeningHours["weekday"], label: r.label as string, opens: (r.opens as string) ?? null, closes: (r.closes as string) ?? null }));
  }
  async saveHours(h: OpeningHours[]) { for (const x of h) await this.upsert("opening_hours", { weekday: x.weekday, label: x.label, opens: x.opens, closes: x.closes }, "weekday"); }
  async getSettings(): Promise<Settings> {
    const rows = await this.get<Row>("settings?select=data&id=eq.1");
    return { ...DEFAULT_SETTINGS, ...((rows[0]?.data as Partial<Settings>) ?? {}) };
  }
  async saveSettings(s: Settings) { await this.upsert("settings", { id: 1, data: s }); }

  // --- clients
  private toClient = (r: Row): Client => ({ id: r.id as string, name: r.name as string, phone: r.phone as string, email: (r.email as string) ?? null, notes: (r.notes as string) ?? "", consentReminders: r.consent_reminders as boolean, createdAt: r.created_at as string });
  async listClients() { return (await this.get<Row>("clients?select=*&order=created_at.desc")).map(this.toClient); }
  async getClient(id: string) { return (await this.get<Row>(`clients?select=*&id=eq.${encodeURIComponent(id)}`)).map(this.toClient)[0] ?? null; }
  async findClient(phone: string, email: string | null) {
    const digits = phone.replace(/\D/g, "");
    const all = await this.listClients();
    return all.find((c) => (digits && c.phone.replace(/\D/g, "") === digits) || (email && c.email?.toLowerCase() === email.toLowerCase())) ?? null;
  }
  async saveClient(c: Client) { await this.upsert("clients", { id: c.id, name: c.name, phone: c.phone, email: c.email, notes: c.notes, consent_reminders: c.consentReminders, created_at: c.createdAt }); }

  // --- réservations
  private toBooking = (r: Row): Booking => ({ id: r.id as string, token: r.token as string, serviceId: r.service_id as string, staffId: (r.staff_id as string) ?? null, clientId: r.client_id as string, startsAt: new Date(r.starts_at as string).toISOString(), endsAt: new Date(r.ends_at as string).toISOString(), status: r.status as Booking["status"], source: r.source as Booking["source"], note: (r.note as string) ?? "", createdAt: r.created_at as string });
  async listBookings(fromIso?: string, toIso?: string) {
    const q = ["select=*", "order=starts_at"];
    if (fromIso) q.push(`ends_at=gt.${encodeURIComponent(fromIso)}`);
    if (toIso) q.push(`starts_at=lt.${encodeURIComponent(toIso)}`);
    return (await this.get<Row>(`bookings?${q.join("&")}`)).map(this.toBooking);
  }
  async getBooking(id: string) { return (await this.get<Row>(`bookings?select=*&id=eq.${encodeURIComponent(id)}`)).map(this.toBooking)[0] ?? null; }
  async getBookingByToken(token: string) { return (await this.get<Row>(`bookings?select=*&token=eq.${encodeURIComponent(token)}`)).map(this.toBooking)[0] ?? null; }
  async saveBooking(b: Booking) { await this.upsert("bookings", { id: b.id, token: b.token, service_id: b.serviceId, staff_id: b.staffId, client_id: b.clientId, starts_at: b.startsAt, ends_at: b.endsAt, status: b.status, source: b.source, note: b.note, created_at: b.createdAt }); }

  // --- utilisateurs de la gestion
  private toUser = (r: Row): User => ({ id: r.id as string, email: r.email as string, name: r.name as string, role: r.role as User["role"], passwordHash: r.password_hash as string, staffId: (r.staff_id as string) ?? null, active: r.active as boolean, createdAt: r.created_at as string });
  async listUsers() { return (await this.get<Row>("users?select=*&order=created_at")).map(this.toUser); }
  async getUser(id: string) { return (await this.get<Row>(`users?select=*&id=eq.${encodeURIComponent(id)}`)).map(this.toUser)[0] ?? null; }
  async getUserByEmail(email: string) { return (await this.get<Row>(`users?select=*&email=eq.${encodeURIComponent(email.trim().toLowerCase())}`)).map(this.toUser)[0] ?? null; }
  async saveUser(u: User) { await this.upsert("users", { id: u.id, email: u.email.toLowerCase(), name: u.name, role: u.role, password_hash: u.passwordHash, staff_id: u.staffId, active: u.active, created_at: u.createdAt }); }

  // --- factures
  private toInvoice = (r: Row): Invoice => ({ id: r.id as string, number: r.number as string, token: r.token as string, bookingId: (r.booking_id as string) ?? null, clientId: r.client_id as string, staffId: (r.staff_id as string) ?? null, issuedAt: new Date(r.issued_at as string).toISOString(), lines: (r.lines as Invoice["lines"]) ?? [], discountXof: (r.discount_xof as number) ?? 0, totalXof: r.total_xof as number, paidXof: (r.paid_xof as number) ?? 0, method: (r.method as Invoice["method"]) ?? null, paidAt: r.paid_at ? new Date(r.paid_at as string).toISOString() : null, status: r.status as Invoice["status"], note: (r.note as string) ?? "", sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null, createdBy: (r.created_by as string) ?? null });
  async listInvoices() { return (await this.get<Row>("invoices?select=*&order=issued_at.desc")).map(this.toInvoice); }
  async getInvoice(id: string) { return (await this.get<Row>(`invoices?select=*&id=eq.${encodeURIComponent(id)}`)).map(this.toInvoice)[0] ?? null; }
  async getInvoiceByToken(token: string) { return (await this.get<Row>(`invoices?select=*&token=eq.${encodeURIComponent(token)}`)).map(this.toInvoice)[0] ?? null; }
  async saveInvoice(i: Invoice) { await this.upsert("invoices", { id: i.id, number: i.number, token: i.token, booking_id: i.bookingId, client_id: i.clientId, staff_id: i.staffId, issued_at: i.issuedAt, lines: i.lines, discount_xof: i.discountXof, total_xof: i.totalXof, paid_xof: i.paidXof, method: i.method, paid_at: i.paidAt, status: i.status, note: i.note, sent_at: i.sentAt, created_by: i.createdBy }); }

  // --- notifications
  private toNotif = (r: Row): Notification => ({ id: r.id as string, bookingId: r.booking_id as string, type: r.type as Notification["type"], channel: r.channel as Notification["channel"], sendAt: new Date(r.send_at as string).toISOString(), status: r.status as NotificationStatus, sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null, error: (r.error as string) ?? null });
  async listNotifications(f: { bookingId?: string; status?: NotificationStatus; dueBefore?: string; limit?: number } = {}) {
    const q = ["select=*", "order=send_at"];
    if (f.bookingId) q.push(`booking_id=eq.${encodeURIComponent(f.bookingId)}`);
    if (f.status) q.push(`status=eq.${f.status}`);
    if (f.dueBefore) q.push(`send_at=lte.${encodeURIComponent(f.dueBefore)}`);
    if (f.limit) q.push(`limit=${f.limit}`);
    return (await this.get<Row>(`notifications?${q.join("&")}`)).map(this.toNotif);
  }
  async saveNotification(n: Notification) { await this.upsert("notifications", { id: n.id, booking_id: n.bookingId, type: n.type, channel: n.channel, send_at: n.sendAt, status: n.status, sent_at: n.sentAt, error: n.error }); }
}
