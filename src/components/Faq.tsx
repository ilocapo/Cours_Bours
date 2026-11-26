import { faq } from "@/data/faq";

export default function Faq() {
  return (
    <div className="faq">
      {faq.map((f) => (
        <details key={f.q} className="faq__item" data-fade>
          <summary className="bod faq__q">{f.q}</summary>
          <p className="faq__a">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
