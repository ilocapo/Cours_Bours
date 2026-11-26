import LoginForm from "./LoginForm";
import Image from "next/image";
import Link from "next/link";
import { ensureTestUsers } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  await ensureTestUsers();
  return (
    <main className="adm__login">
      <section className="adm__login-card">
        <Link href="/" className="logo" aria-label="Retour au site"><Image src="/logo/logo-zst.png" alt="ZST" width={46} height={46} priority /></Link>
        <h1 className="bod adm__h1">Gestion</h1>
        <p className="lb dim">ZST Beauty Center · espace réservé à l&apos;équipe</p>
        <LoginForm next={sp.next ?? ""} />
      </section>
    </main>
  );
}
