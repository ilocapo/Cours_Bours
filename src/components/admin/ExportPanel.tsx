"use client";
import { useState } from "react";

type Set = { type: string; title: string; desc: string };

// Période choisie, puis un lien par format : le fichier est généré par /api/admin/export.
export default function ExportPanel({ sets, today, monthStart }: { sets: Set[]; today: string; monthStart: string }) {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const href = (type: string, format: string) => `/api/admin/export?${new URLSearchParams({ type, format, from, to })}`;
  return (
    <>
      <div className="adm__form adm__form--inline adm__range">
        <label className="field"><span className="lb lb--s">Du</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span className="lb lb--s">au</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="adm__cards">
        {sets.map((s) => (
          <section key={s.type} className="adm__card">
            <h2 className="bod adm__h2">{s.title}</h2><p className="dim">{s.desc}</p>
            <div className="adm__actions">
              <a className="btn btn--prune btn--sm lb" href={href(s.type, "csv")}>CSV</a>
              <a className="btn btn--outline-prune btn--sm lb" href={href(s.type, "xls")}>Excel</a>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
