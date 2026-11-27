// Même forme que les tables Supabase (voir supabase/migrations/0001_init.sql).
export type Role = "super_admin" | "gerant" | "employe" | "comptable";
export type BookingSource = "site" | "instagram" | "whatsapp" | "telephone" | "comptoir" | "admin";
export type PayMethod = "especes" | "mtn_momo" | "moov_money" | "carte" | "virement" | "autre";
export type BookingStatus = "confirmed" | "cancelled" | "done" | "noshow";
export type NotificationType = "confirmation" | "reminder_d1" | "reminder_h2" | "salon_new" | "salon_cancel" | "thanks" | "client_cancel" | "noshow";
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
  source: BookingSource;
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
  lastCronAt?: string; // dernière exécution de la tâche planifiée des rappels
  googleReviewUrl?: string; // lien « laisser un avis Google »
  closures?: { date: string; label: string }[]; // fermetures exceptionnelles (jours fériés, travaux…)
  templates?: Partial<Record<TemplateKey, TemplateEdit>>; // textes des e-mails modifiés par la gérante
};
export type TemplateKey = "confirmation" | "reminder_d1" | "reminder_h2" | "thanks" | "client_cancel" | "noshow";
export type TemplateEdit = { enabled: boolean; subject: string; title: string; body: string };

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

export type User = {
  id: string;
  email: string; // identifiant de connexion
  name: string;
  role: Role;
  passwordHash: string;
  staffId: string | null; // pour un employé : sa fiche dans l'équipe
  active: boolean;
  createdAt: string;
};

export type InvoiceLine = { label: string; qty: number; unitXof: number };
export type Invoice = {
  id: string;
  number: string; // FAC-2026-0001
  token: string; // lien public d'impression
  bookingId: string | null;
  clientId: string;
  staffId: string | null;
  issuedAt: string;
  lines: InvoiceLine[];
  discountXof: number;
  totalXof: number;
  paidXof: number;
  method: PayMethod | null;
  paidAt: string | null;
  status: "due" | "partial" | "paid" | "void";
  note: string;
  sentAt: string | null;
  createdBy: string | null;
};

export const SOURCE_LABEL: Record<BookingSource, string> = { site: "Site", instagram: "Instagram", whatsapp: "WhatsApp", telephone: "Téléphone", comptoir: "Au salon", admin: "Salon" };
export const METHOD_LABEL: Record<PayMethod, string> = { especes: "Espèces", mtn_momo: "MTN Mobile Money", moov_money: "Moov Money", carte: "Carte bancaire", virement: "Virement", autre: "Autre" };
export const ROLE_LABEL: Record<Role, string> = { super_admin: "Super admin", gerant: "Gérante", employe: "Employée", comptable: "Comptable" };

export type TimeEntry = {
  id: string;
  staffId: string;
  inAt: string;
  outAt: string | null; // null = encore en poste
  method: "pin" | "manual";
  note: string;
};

export type AbsenceKind = "conge" | "maladie" | "autre";
export type Absence = {
  id: string;
  staffId: string;
  fromDate: string; // YYYY-MM-DD, inclus
  toDate: string;   // inclus
  kind: AbsenceKind;
  status: "demande" | "approuvee" | "refusee";
  note: string;
  createdAt: string;
};
export const ABSENCE_LABEL: Record<AbsenceKind, string> = { conge: "Congé", maladie: "Maladie", autre: "Autre absence" };
