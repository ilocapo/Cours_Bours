import { faq } from "@/data/faq";
import { fr } from "@/lib/fr";

export default function Faq({ animate = true }: { animate?: boolean }) {
  return (
    <div className="faq">
      {faq.map((f) => (
        <details key={f.q} className="faq__item" {...(animate ? { "data-fade": true } : {})}>
          <summary className="bod faq__q">{fr(f.q)}</summary>
          <p className="faq__a">{fr(f.a)}</p>
        </details>
      ))}
    </div>
  );
}
