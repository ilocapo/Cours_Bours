#!/usr/bin/env python3
"""
dividend_tracker.py
───────────────────
Suit les dividendes CORE à recevoir/reçus.

Fonctions :
  1. Lit dividends_calendar.csv
  2. Alerte si ex_date dans ≤7 jours
  3. Calcule total dividendes REÇUS → ajout au CASH
  4. Écrit dividends_status.json (lu par patch_dashboard_json.py)

Comment enregistrer un dividende reçu :
  → Ouvrir dividends_calendar.csv
  → Mettre statut=RECU, montant_par_action_fcfa=<montant réel>
  → Le montant_total_fcfa sera recalculé automatiquement
"""

import csv
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

ROOT           = Path(__file__).resolve().parent
CALENDAR_FILE  = ROOT / "dividends_calendar.csv"
STATUS_FILE    = ROOT / "dividends_status.json"

ALERT_DAYS_BEFORE_EX   = 7   # Alerte J-7 avant ex_date
ALERT_DAYS_BEFORE_PAY  = 3   # Rappel J-3 avant paiement


def safe_float(v, default=0.0):
    try:
        return float(str(v).replace(",",".").replace(" ",""))
    except Exception:
        return default


def safe_date(s):
    """Parse YYYY-MM-DD → date, ou None."""
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except Exception:
        return None


def load_calendar():
    if not CALENDAR_FILE.exists():
        print(f"  [WARN] {CALENDAR_FILE} introuvable — créer le fichier calendrier")
        return []

    rows = []
    with open(CALENDAR_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Recalculer montant_total si montant_par_action > 0
            nb     = safe_float(row.get("nb_actions", 0))
            mpa    = safe_float(row.get("montant_par_action_fcfa", 0))
            total  = nb * mpa if mpa > 0 else 0.0

            rows.append({
                "ticker":                row.get("ticker","").strip(),
                "nom":                   row.get("nom","").strip(),
                "nb_actions":            int(nb),
                "annee_fiscale":         row.get("annee_fiscale","").strip(),
                "ex_date":               row.get("ex_date","").strip(),
                "paiement_date":         row.get("paiement_date","").strip(),
                "montant_par_action":    mpa,
                "montant_total":         total,
                "statut":                row.get("statut","ATTENDU").strip().upper(),
                "notes":                 row.get("notes","").strip(),
            })
    return rows


def check_alerts(rows, today=None):
    """Retourne une liste d'alertes pour les événements proches."""
    if today is None:
        today = datetime.now().date()

    alerts = []
    for row in rows:
        if row["statut"] == "RECU":
            continue  # Déjà encaissé

        ex   = safe_date(row["ex_date"])
        pay  = safe_date(row["paiement_date"])
        ticker = row["ticker"]

        if ex:
            days_to_ex = (ex - today).days
            if days_to_ex < 0:
                # Ex-date passée mais statut pas RECU
                if row["statut"] == "ATTENDU":
                    alerts.append({
                        "type":    "PAIEMENT_ATTENDU",
                        "ticker":  ticker,
                        "message": f"⏳ {ticker} — ex-date {ex} passée, paiement prévu {row['paiement_date']}",
                        "urgence": "ORANGE",
                        "date":    row["paiement_date"],
                    })
            elif days_to_ex <= ALERT_DAYS_BEFORE_EX:
                alerts.append({
                    "type":    "EX_DATE_PROCHE",
                    "ticker":  ticker,
                    "message": f"📅 {ticker} — ex-date dans {days_to_ex} jour(s) ({ex}) — être DÉTENTEUR avant cette date !",
                    "urgence": "ROUGE" if days_to_ex <= 2 else "ORANGE",
                    "date":    row["ex_date"],
                })

        if pay:
            days_to_pay = (pay - today).days
            if 0 <= days_to_pay <= ALERT_DAYS_BEFORE_PAY and row["statut"] not in ("RECU",):
                alerts.append({
                    "type":    "PAIEMENT_IMMINENT",
                    "ticker":  ticker,
                    "message": f"💰 {ticker} — paiement dividende dans {days_to_pay} jour(s) ({pay})",
                    "urgence": "VERT",
                    "date":    row["paiement_date"],
                })

    return alerts


def compute_totals(rows):
    """Calcule les totaux reçus et attendus."""
    total_recu    = 0.0
    total_attendu = 0.0

    for row in rows:
        if row["statut"] == "RECU":
            total_recu += row["montant_total"]
        elif row["statut"] in ("ATTENDU", "ESTIMÉ", "ESTIME"):
            total_attendu += row["montant_total"]

    return {
        "total_recu_fcfa":    round(total_recu, 0),
        "total_attendu_fcfa": round(total_attendu, 0),
    }


def save_status(rows, alerts, totals):
    """Écrit dividends_status.json pour patch_dashboard_json.py."""
    status = {
        "lastUpdate":          datetime.now().isoformat(),
        "totalRecuFcfa":       totals["total_recu_fcfa"],
        "totalAttenduFcfa":    totals["total_attendu_fcfa"],
        "alerts":              alerts,
        "positions": [
            {
                "ticker":           r["ticker"],
                "nom":              r["nom"],
                "nbActions":        r["nb_actions"],
                "annee":            r["annee_fiscale"],
                "exDate":           r["ex_date"],
                "paiementDate":     r["paiement_date"],
                "montantParAction": r["montant_par_action"],
                "montantTotal":     r["montant_total"],
                "statut":           r["statut"],
                "notes":            r["notes"],
            }
            for r in rows
        ],
    }
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2, default=str)
    return status


def main():
    print("\n" + "="*60)
    print("  DIVIDEND TRACKER — CORE BRVM")
    print("="*60)

    today = datetime.now().date()
    rows  = load_calendar()

    if not rows:
        print("  [WARN] Aucune donnée dans dividends_calendar.csv")
        return

    # Alertes
    alerts = check_alerts(rows, today)
    totals = compute_totals(rows)
    status = save_status(rows, alerts, totals)

    # Affichage console
    print(f"\n  📅 Calendrier dividendes ({len(rows)} positions CORE)")
    print()

    for r in rows:
        icon = "✅" if r["statut"] == "RECU" else "⏳" if r["statut"] == "ATTENDU" else "📝"
        mpa  = f"{r['montant_par_action']:.0f} FCFA/action" if r["montant_par_action"] > 0 else "$ à définir"
        total = f"{r['montant_total']:,.0f} FCFA" if r["montant_total"] > 0 else "—"
        print(f"  {icon} {r['ticker']:8s} | ex: {r['ex_date']} | paiement: {r['paiement_date']} | {mpa} | Total: {total} | {r['statut']}")

    print()
    print(f"  💵 Dividendes REÇUS   : {totals['total_recu_fcfa']:>12,.0f} FCFA  ← ajouté au CASH")
    print(f"  🔮 Dividendes ATTENDUS: {totals['total_attendu_fcfa']:>12,.0f} FCFA")

    if alerts:
        print()
        print(f"  ⚠️  {len(alerts)} ALERTE(S) :")
        for a in alerts:
            print(f"     {a['message']}")

    print()
    print(f"  ✓ Statut sauvegardé → {STATUS_FILE.name}")
    print("="*60 + "\n")

    # Instruction si des lignes ont montant=0 mais ex_date passée
    need_update = [r for r in rows if r["montant_par_action"] == 0
                   and safe_date(r["ex_date"]) and safe_date(r["ex_date"]) < today]
    if need_update:
        print("  ℹ️  ACTION REQUISE : Les tickers suivants ont une ex-date passée")
        print("      mais le montant du dividende n'est pas saisi :")
        for r in need_update:
            print(f"      → {r['ticker']} ({r['nom']}) — ex-date: {r['ex_date']}")
        print()
        print("  📝 Quand tu as reçu le dividende:")
        print("     1. Ouvrir dividends_calendar.csv")
        print("     2. Mettre montant_par_action_fcfa = <montant réel>")
        print("     3. Mettre statut = RECU")
        print("     4. Relancer run_daily_automation.py")
        print()


if __name__ == "__main__":
    main()
