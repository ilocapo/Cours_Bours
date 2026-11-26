"use client";
export default function PrintButton() {
  return <button type="button" className="btn btn--prune btn--md lb invoice__print" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>;
}
