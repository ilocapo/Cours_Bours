import AdminNav from "@/components/admin/AdminNav";
import { logout } from "../actions";
import { getStore } from "@/lib/booking/store";
import { requireUser } from "@/lib/admin/session";
import { NAV, can } from "@/lib/admin/roles";
import { ROLE_LABEL } from "@/lib/booking/types";

export default async function Panel({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const store = await getStore();
  const items = NAV.filter((n) => (n.any ? n.any.some((p) => can(me.role, p)) : n.perm ? can(me.role, n.perm) : true));
  return (
    <div className="adm__shell">
      <AdminNav
        items={items.map((n) => ({ href: n.href, label: n.label }))}
        name={me.name}
        role={ROLE_LABEL[me.role]}
        base={store.kind === "supabase" ? "Base : Supabase" : "Base : fichier local (test)"}
        logout={logout}
      />
      <main className="adm__main" id="main">{children}</main>
    </div>
  );
}
