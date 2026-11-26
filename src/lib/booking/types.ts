// Même forme que les tables Supabase (voir supabase/migrations/0001_init.sql).
export type BookingStatus = "confirmed" | "cancelled" | "done" | "noshow";
export type NotificationType = "confirmation" | "reminder_d1" | "reminder_h2" | "salon_new" | "salon_cancel" | "thanks";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string;
  consentReminders: boolean;
  createdAt: string;
};

export type Booking = {
  id: string;
  token: string; // lien d'annulation / de consultation, jamais deviné
  serviceId: string;
  staffId: string | null;
  clientId: string;
  startsAt: string; // ISO UTC
  endsAt: string;
  status: BookingStatus;
  source: "site" | "admin";
  note: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  bookingId: string;
  type: NotificationType;
  channel: "email" | "sms";
  sendAt: string;
  status: NotificationStatus;
  sentAt: string | null;
  error: string | null;
};

export type Settings = {
  reminderD1Hour: number; // heure locale d'envoi du rappel de la veille
  reminderH2Hours: number; // délai du rappel avant le rendez-vous
  slotStepMin: number;
  leadTimeMin: number; // délai minimal avant un rendez-vous réservable
  maxDaysAhead: number;
  capacity: number; // postes en parallèle quand aucune personne n'est choisie
  salonEmail: string;
};

export const DEFAULT_SETTINGS: Settings = {
  reminderD1Hour: 18,
  reminderH2Hours: 2,
  slotStepMin: 30,
  leadTimeMin: 120,
  maxDaysAhead: 60,
  capacity: 2,
  salonEmail: "contact@zstbeautycenter.com",
};

export type BookingView = Booking & {
  serviceName: string;
  durationMin: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  staffName: string | null;
};
