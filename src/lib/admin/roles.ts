import type { Role } from "@/lib/booking/types";

// Ce que chaque rôle peut faire. Utilisé pour le menu, les pages et les actions.
export type Perm =
  | "agenda.all"      // voir le planning de tout le monde
  | "agenda.own"      // voir son propre planning
  | "bookings.manage" // créer, déplacer, annuler, assigner
  | "bookings.own"    // clôturer et annoter ses rendez-vous
  | "clients"         // fiches et liste des clientes
  | "catalog"         // prestations
  | "team"            // équipe et planning
  | "invoices.read"   // lire et exporter les factures
  | "invoices.write"  // créer, envoyer et encaisser une facture
  | "stats"           // indicateurs et graphiques
  | "exports"         // exports CSV et Excel
  | "settings"        // horaires, délais, e-mail du salon
  | "notifications"   // journal des e-mails
  | "users";          // gérer les comptes

const ALL: Perm[] = ["agenda.all", "agenda.own", "bookings.manage", "bookings.own", "clients", "catalog", "team", "invoices.read", "invoices.write", "stats", "exports", "settings", "notifications", "users"];

export const PERMS: Record<Role, Perm[]> = {
  super_admin: ALL,
  gerant: ALL.filter((p) => p !== "users"),
  employe: ["agenda.own", "bookings.own", "invoices.write"],
  comptable: ["invoices.read", "stats", "exports"],
};

export const can = (role: Role, perm: Perm) => PERMS[role].includes(perm);

export const ROLE_DESC: Record<Role, string> = {
  super_admin: "Accès complet, gestion des comptes.",
  gerant: "Tout, sauf la gestion des comptes.",
  employe: "Son planning, ses rendez-vous, la facturation de ses prestations.",
  comptable: "Factures, paiements, indicateurs et exports. Lecture seule.",
};

export type NavItem = { href: string; label: string; perm: Perm | null; any?: Perm[] };
export const NAV: NavItem[] = [
  { href: "/admin", label: "Aujourd'hui", perm: null },
  { href: "/admin/agenda", label: "Agenda", perm: null, any: ["agenda.all", "agenda.own"] },
  { href: "/admin/reservations", label: "Réservations", perm: "bookings.manage" },
  { href: "/admin/clients", label: "Clients", perm: "clients" },
  { href: "/admin/factures", label: "Factures", perm: "invoices.read" },
  { href: "/admin/statistiques", label: "Statistiques", perm: "stats" },
  { href: "/admin/exports", label: "Exports", perm: "exports" },
  { href: "/admin/equipe", label: "Équipe", perm: "team" },
  { href: "/admin/prestations", label: "Prestations", perm: "catalog" },
  { href: "/admin/notifications", label: "E-mails", perm: "notifications" },
  { href: "/admin/reglages", label: "Réglages", perm: "settings" },
  { href: "/admin/utilisateurs", label: "Comptes", perm: "users" },
];
