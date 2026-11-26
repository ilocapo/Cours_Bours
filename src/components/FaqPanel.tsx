"use client";
import { useState } from "react";
import Faq from "./Faq";

// Questions fréquentes : s'ouvrent sur la page (glissent de la gauche), se referment avec le même bouton.
export default function FaqPanel() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  return (
    <div className={`slidein ${open ? "is-open" : ""}`}>
      <button type="button" className="lb link-line slidein__btn" aria-expanded={open} aria-controls="faq-panel" onClick={() => { setSeen(true); setOpen((o) => !o); }}>
        {open ? "Fermer les questions" : "Questions fréquentes"}
      </button>
      <div className="slidein__panel" id="faq-panel" inert={!open}>
        <div className="slidein__in">
          <div className="slidein__slide">{seen && <Faq />}</div>
        </div>
      </div>
    </div>
  );
}
