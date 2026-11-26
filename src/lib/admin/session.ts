import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { COOKIE, ENV_ADMIN_ID, verifySession } from "./auth";
import { can, type Perm } from "./roles";
import { hashPassword } from "./password";
import { getStore } from "@/lib/booking/store";
import type { Role, User } from "@/lib/booking/types";

export type Current = { id: string; name: string; email: string; role: Role; staffId: string | null };

export async function getCurrent(): Promise<Current | null> {
  const s = await verifySession((await cookies()).get(COOKIE)?.value);
  if (!s) return null;
  if (s.uid === ENV_ADMIN_ID) return { id: ENV_ADMIN_ID, name: "Propriétaire", email: "admin", role: "super_admin", staffId: null };
  try {
    const u = await (await getStore()).getUser(s.uid);
    if (!u || !u.active) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role, staffId: u.staffId };
  } catch { return null; }
}

/** Exige une session ; avec `perm` (ou une liste : l'une suffit), exige aussi le droit correspondant. */
export async function requireUser(perm?: Perm | Perm[]): Promise<Current> {
  const me = await getCurrent();
  if (!me) redirect("/admin/login");
  if (perm) {
    const list = Array.isArray(perm) ? perm : [perm];
    if (!list.some((p) => can(me.role, p))) redirect("/admin?refus=1");
  }
  return me;
}

// Comptes de démonstration, créés une seule fois quand la base n'a encore aucun utilisateur.
// À remplacer par de vrais comptes (menu Comptes) : les mots de passe de test sont connus.
export const TEST_USERS: { email: string; name: string; role: Role; password: string; staff?: string }[] = [
  { email: "superadmin@zst.test", name: "Super admin (test)", role: "super_admin", password: "Super-ZST-2026" },
  { email: "gerante@zst.test", name: "Gérante (test)", role: "gerant", password: "Gerante-ZST-2026" },
  { email: "employee@zst.test", name: "Awa, employée (test)", role: "employe", password: "Employee-ZST-2026", staff: "staff-test-awa" },
  { email: "comptable@zst.test", name: "Comptable (test)", role: "comptable", password: "Compta-ZST-2026" },
];

export async function ensureTestUsers(): Promise<void> {
  try {
    const store = await getStore();
    if ((await store.listUsers()).length > 0) return;
    // Deux personnes d'exemple pour que le planning d'équipe soit visible tout de suite.
    const staff = await store.listStaff();
    if (staff.length === 0) {
      const base = { categoryIds: [] as string[], serviceIds: [] as string[], schedule: null, active: true };
      await store.saveStaff({ id: "staff-test-awa", name: "Awa (test)", color: "#1C1013", ...base });
      await store.saveStaff({ id: "staff-test-carine", name: "Carine (test)", color: "#A07A52", ...base });
    }
    for (const t of TEST_USERS) {
      const u: User = { id: randomUUID(), email: t.email, name: t.name, role: t.role, passwordHash: hashPassword(t.password), staffId: t.staff ?? null, active: true, createdAt: new Date().toISOString() };
      await store.saveUser(u);
    }
  } catch { /* table absente : la migration 0002 n'est pas encore passée */ }
}
