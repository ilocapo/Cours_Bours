import type { Booking, Client, Notification, NotificationStatus, Settings } from "./types";
import type { OpeningHours } from "@/data/hours";
import type { Service } from "@/data/services";
import type { Staff } from "@/data/staff";

// Une seule interface, deux implémentations : mémoire/fichier (développement, tests) et Supabase (production).
export interface Store {
  readonly kind: "memory" | "supabase";
  listServices(): Promise<Service[]>;
  saveService(s: Service): Promise<void>;
  listStaff(): Promise<Staff[]>;
  saveStaff(s: Staff): Promise<void>;
  getHours(): Promise<OpeningHours[]>;
  saveHours(h: OpeningHours[]): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;

  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  findClient(phone: string, email: string | null): Promise<Client | null>;
  saveClient(c: Client): Promise<void>;

  listBookings(fromIso?: string, toIso?: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingByToken(token: string): Promise<Booking | null>;
  saveBooking(b: Booking): Promise<void>;

  listNotifications(filter?: { bookingId?: string; status?: NotificationStatus; dueBefore?: string; limit?: number }): Promise<Notification[]>;
  saveNotification(n: Notification): Promise<void>;
}

let cached: Store | null = null;
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { SupabaseStore } = await import("./supabase-store");
    cached = new SupabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  } else {
    const { MemoryStore } = await import("./memory-store");
    cached = new MemoryStore();
  }
  return cached;
}

/** La réservation interne est active si une vraie base est branchée (ou en développement / tests). */
export function bookingEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_BOOKING_INTERNAL === "1") return true;
  return false;
}
