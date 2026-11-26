import LoginForm from "./LoginForm";
import MonoArch from "@/components/MonoArch";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const missing = process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD;
  return (
    <main className="adm__login">
      <MonoArch variant="pleine" tone="ivoire" size={84} />
      <h1 className="bod adm__h1">Gestion</h1>
      <p className="lb dim">ZST Beauty Center</p>
      {missing ? <p className="adm__warn">L&apos;accès n&apos;est pas configuré : ajoutez ADMIN_PASSWORD dans les variables d&apos;environnement.</p> : <LoginForm next={sp.next ?? ""} />}
    </main>
  );
}
