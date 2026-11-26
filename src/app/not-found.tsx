import Link from "next/link";
import Title from "@/components/Title";
export default function NotFound() {
  return (
    <section className="sec sec--prune center-page">
      <div className="wrap stack">
        <Title as="h1" initial lines={["Cette page", "n'existe pas."]} />
        <div><Link className="btn btn--ivoire lb" href="/">Retour à l&apos;accueil</Link></div>
      </div>
    </section>
  );
}
