#!/usr/bin/env python3
"""
fundamentals_core_alert.py
===========================
Étape 2 — Arbitrage du CORE (Le Bouclier)

Lit fundamentals_data.csv et applique le détecteur d'"illusion de croissance".
Produit des alertes classées en 4 niveaux :

  🟢 CONSERVER   — Fondamentaux solides, tout va bien
  🔵 RENFORCER   — Momentum fondamental positif, opportunité de renforcement
  🟡 SURVEILLER  — Signal de dégradation, vigilance requise
  🔴 LIQUIDER    — Alerte rouge critique, envisager la vente avant coupe dividende

Définition "illusion de croissance" :
  → CA croît mais marge REX/CA diminue (revenus gonflés sans bénéfices réels)
  → REX croît mais RN stagne ou baisse (items exceptionnels masquent le problème)
  → CAC émet des réserves (signal d'irrégularité comptable)
  → Marge REX < seuil de sécurité pour le secteur
"""

import csv
import json
from datetime import datetime
from pathlib import Path

ROOT             = Path(__file__).resolve().parent
FUNDAMENTALS_CSV = ROOT / "fundamentals_data.csv"
ALERTS_JSON      = ROOT / "fundamentals_alerts.json"

# ────────────────────────────────────────────────────────────
# Seuils par secteur (marge REX minimum acceptable)
# ────────────────────────────────────────────────────────────
SECTOR_THRESHOLDS = {
    "Télécommunications": {"rex_min": 15.0, "rn_min": 8.0},
    "Agriculture / Hévéa": {"rex_min": 18.0, "rn_min": 12.0},
    "Services / Restauration": {"rex_min": 10.0, "rn_min": 6.0},
    "default":             {"rex_min": 12.0, "rn_min": 5.0},
}

# Règles de l'arbitrage CORE
RULES = {
    "illusion_ca":      {"label": "Illusion de croissance CA",       "weight": 30},
    "illusion_rex_rn":  {"label": "Bénéfice exceptionnel masqué",    "weight": 25},
    "marge_declin":     {"label": "Érosion de marge progressive",    "weight": 20},
    "marge_critique":   {"label": "Marge sous seuil sectoriel",      "weight": 35},
    "cac_reserves":     {"label": "Réserves commissaires aux comptes","weight": 50},
    "rn_negatif":       {"label": "Résultat Net négatif",            "weight": 60},
    "ca_declin_2ans":   {"label": "Déclin CA 2 années consécutives", "weight": 25},
}


def load_fundamentals() -> dict[str, list[dict]]:
    """Charge et groupe fundamentals_data.csv par ticker."""
    if not FUNDAMENTALS_CSV.exists():
        print(f"  [WARN] {FUNDAMENTALS_CSV} introuvable — lancer fundamental_scraper.py d'abord")
        return {}
    rows = {}
    with open(FUNDAMENTALS_CSV, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            t = row["Ticker"]
            rows.setdefault(t, []).append(row)
    # Trier par année croissante
    for t in rows:
        rows[t].sort(key=lambda r: r.get("Annee", "0"))
    return rows


def safe(val, default=0.0) -> float:
    try:
        return float(str(val).replace(",", ".")) if val and val.strip() else default
    except (ValueError, AttributeError):
        return default


def analyze_ticker(ticker: str, history: list[dict]) -> dict:
    """
    Analyse un ticker sur 3 ans de données.
    Retourne un dict d'alerte standardisé pour le dashboard.
    """
    if len(history) < 2:
        return _empty_alert(ticker, history)

    # Extraire les séries
    annees = [r["Annee"] for r in history]
    ca     = [safe(r["CA_MFCFA"])  for r in history]
    rex    = [safe(r["REX_MFCFA"]) for r in history]
    rn     = [safe(r["RN_MFCFA"])  for r in history]
    m_rex  = [safe(r["Marge_REX_pct"]) for r in history]
    m_rn   = [safe(r["Marge_RN_pct"])  for r in history]
    cac    = [r.get("CAC_Opinion", "").strip() for r in history]
    secteur = history[-1].get("Secteur", "default")
    nom     = history[-1].get("Nom", ticker)

    seuils = SECTOR_THRESHOLDS.get(secteur) or SECTOR_THRESHOLDS["default"]
    score_alerte = 0
    flags = []
    details = []

    # ── Règle 1 : Illusion de croissance CA ──────────────────
    # CA croît mais marge REX décline sur 2+ périodes
    if len(ca) >= 2 and ca[-1] > ca[-2]:
        ca_growth = (ca[-1] - ca[-2]) / ca[-2] * 100
        rex_growth = (rex[-1] - rex[-2]) / rex[-2] * 100 if rex[-2] > 0 else 0
        if ca_growth > 5 and rex_growth < ca_growth * 0.5:
            w = RULES["illusion_ca"]["weight"]
            score_alerte += w
            flags.append("illusion_ca")
            details.append(
                f"CA +{ca_growth:.1f}% mais REX +{rex_growth:.1f}% "
                f"→ croissance du chiffre sans rentabilité"
            )

    # ── Règle 2 : Bénéfice exceptionnel masqué ────────────────
    # REX croît mais RN stagne ou baisse (items hors exploitation)
    if len(rex) >= 2 and len(rn) >= 2:
        rex_g = (rex[-1] - rex[-2]) / rex[-2] * 100 if rex[-2] > 0 else 0
        rn_g  = (rn[-1]  - rn[-2])  / rn[-2]  * 100 if rn[-2]  > 0 else 0
        if rex_g > 8 and rn_g < rex_g * 0.4:
            w = RULES["illusion_rex_rn"]["weight"]
            score_alerte += w
            flags.append("illusion_rex_rn")
            details.append(
                f"REX +{rex_g:.1f}% mais RN +{rn_g:.1f}% "
                f"→ items exceptionnels suspects"
            )

    # ── Règle 3 : Érosion de marge progressive ───────────────
    if len(m_rex) >= 3:
        if m_rex[-1] < m_rex[-2] < m_rex[-3]:
            declin = m_rex[-3] - m_rex[-1]
            w = RULES["marge_declin"]["weight"]
            score_alerte += w
            flags.append("marge_declin")
            details.append(
                f"Marge REX en baisse 3 ans consécutifs : "
                f"{m_rex[-3]:.1f}% → {m_rex[-2]:.1f}% → {m_rex[-1]:.1f}% "
                f"(-{declin:.1f} pts)"
            )

    # ── Règle 4 : Marge critique sous seuil sectoriel ────────
    if m_rex and m_rex[-1] < seuils["rex_min"]:
        w = RULES["marge_critique"]["weight"]
        score_alerte += w
        flags.append("marge_critique")
        details.append(
            f"Marge REX = {m_rex[-1]:.1f}% < seuil {secteur} ({seuils['rex_min']}%) "
            f"→ risque dividende"
        )

    # ── Règle 5 : Réserves CAC ────────────────────────────────
    cac_last = cac[-1] if cac else ""
    if cac_last and "réserve" in cac_last.lower() and "sans" not in cac_last.lower():
        w = RULES["cac_reserves"]["weight"]
        score_alerte += w
        flags.append("cac_reserves")
        details.append(f"CAC : «{cac_last}» → vérifier les notes aux comptes")
    elif "À compléter" in cac_last:
        # Pas d'opinion connue = incertitude
        details.append("CAC : opinion non encore publiée — surveiller prochain rapport")

    # ── Règle 6 : Résultat Net négatif ───────────────────────
    if rn and rn[-1] < 0:
        w = RULES["rn_negatif"]["weight"]
        score_alerte += w
        flags.append("rn_negatif")
        details.append(f"RN = {rn[-1]:,.0f} MFCFA → perte, dividende menacé")

    # ── Règle 7 : Déclin CA 2 ans consécutifs ────────────────
    if len(ca) >= 3 and ca[-1] < ca[-2] < ca[-3]:
        w = RULES["ca_declin_2ans"]["weight"]
        score_alerte += w
        flags.append("ca_declin_2ans")
        details.append(
            f"CA en recul 2 ans de suite : "
            f"{ca[-3]:,.0f} → {ca[-2]:,.0f} → {ca[-1]:,.0f} MFCFA"
        )

    # ── Scoring → niveau d'alerte ─────────────────────────────
    if score_alerte == 0:
        niveau  = "CONSERVER"
        couleur = "green"
        icone   = "✅"
        conseil = "Fondamentaux solides. Maintenir la position et percevoir les dividendes."
    elif score_alerte <= 25:
        niveau  = "SURVEILLER"
        couleur = "orange"
        icone   = "⚠️"
        conseil = "Signal faible de dégradation. Surveiller la prochaine publication trimestrielle."
    elif score_alerte <= 50:
        niveau  = "SURVEILLER"
        couleur = "orange"
        icone   = "🟡"
        conseil = "Dégradation confirmée. Envisager de réduire l'exposition de 30-50%. NE PAS RENFORCER."
    else:
        niveau  = "LIQUIDER"
        couleur = "red"
        icone   = "🔴"
        conseil = "Alerte critique. Liquider la position avant la prochaine AG / coupe dividende."

    # Bonus : signal de renforcement (pas de flag + marge excellente)
    if score_alerte == 0 and m_rex and m_rex[-1] > seuils["rex_min"] * 1.4:
        # Marge 40% au-dessus du seuil + RN croissant
        if len(rn) >= 2 and rn[-1] > rn[-2]:
            niveau  = "RENFORCER"
            couleur = "blue"
            icone   = "🔵"
            conseil = (
                "Momentum excellent : marge élevée + RN en hausse. "
                "Opportunité de renforcer la position CORE."
            )

    # Calcul variation YoY pour affichage
    ca_yoy  = round((ca[-1] - ca[-2]) / ca[-2] * 100, 1) if len(ca) >= 2 and ca[-2] else 0
    rex_yoy = round((rex[-1] - rex[-2]) / rex[-2] * 100, 1) if len(rex) >= 2 and rex[-2] else 0
    rn_yoy  = round((rn[-1] - rn[-2]) / rn[-2] * 100, 1) if len(rn) >= 2 and rn[-2] else 0

    return {
        "ticker":       ticker,
        "nom":          nom,
        "secteur":      secteur,
        "niveau":       niveau,
        "couleur":      couleur,
        "icone":        icone,
        "scoreAlerte":  score_alerte,
        "flags":        flags,
        "conseil":      conseil,
        "details":      details,
        "derniereAnnee": annees[-1] if annees else "?",
        "ca":            round(ca[-1], 1)  if ca   else 0,
        "rex":           round(rex[-1], 1) if rex  else 0,
        "rn":            round(rn[-1], 1)  if rn   else 0,
        "margeRex":      round(m_rex[-1], 1) if m_rex else 0,
        "margeRn":       round(m_rn[-1], 1)  if m_rn  else 0,
        "caYoY":         ca_yoy,
        "rexYoY":        rex_yoy,
        "rnYoY":         rn_yoy,
        "cacOpinion":    cac_last or "Non disponible",
        "historique":    [
            {"annee": annees[i], "ca": ca[i], "rex": rex[i], "rn": rn[i],
             "margeRex": m_rex[i] if i < len(m_rex) else 0}
            for i in range(len(annees))
        ],
    }


def _empty_alert(ticker: str, history: list[dict]) -> dict:
    row = history[-1] if history else {}
    return {
        "ticker": ticker, "nom": row.get("Nom", ticker),
        "secteur": row.get("Secteur", ""),
        "niveau": "SURVEILLER", "couleur": "orange", "icone": "⚠️",
        "scoreAlerte": 0, "flags": [], "conseil": "Données insuffisantes (< 2 ans).",
        "details": ["Alimenter fundamentals_data.csv avec au moins 2 années de données."],
        "derniereAnnee": row.get("Annee", "?"),
        "ca": 0, "rex": 0, "rn": 0, "margeRex": 0, "margeRn": 0,
        "caYoY": 0, "rexYoY": 0, "rnYoY": 0,
        "cacOpinion": row.get("CAC_Opinion", "?"), "historique": [],
    }


def run_core_analysis() -> list[dict]:
    """
    Analyse tous les tickers CORE et retourne la liste d'alertes.
    Sauvegarde aussi fundamentals_alerts.json.
    """
    print("\n" + "=" * 70)
    print("ARBITRAGE CORE — Détecteur d'illusions de croissance")
    print("=" * 70)

    data = load_fundamentals()
    if not data:
        print("  Aucune donnée fondamentale. Exécutez fundamental_scraper.py d'abord.")
        return []

    try:
        from config import CORE_STOCKS
        tickers = CORE_STOCKS
    except ImportError:
        tickers = list(data.keys())

    alerts = []
    for ticker in tickers:
        history = data.get(ticker, [])
        alert = analyze_ticker(ticker, history)
        alerts.append(alert)
        _print_alert(alert)

    # Sauvegarder JSON pour le dashboard
    payload = {
        "generatedAt": datetime.now().isoformat(),
        "alerts":      alerts,
        "summary": {
            "conserver":  sum(1 for a in alerts if a["niveau"] == "CONSERVER"),
            "renforcer":  sum(1 for a in alerts if a["niveau"] == "RENFORCER"),
            "surveiller": sum(1 for a in alerts if a["niveau"] == "SURVEILLER"),
            "liquider":   sum(1 for a in alerts if a["niveau"] == "LIQUIDER"),
        }
    }
    with open(ALERTS_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"), default=str)

    print(f"\n  ✓ Alertes sauvegardées → {ALERTS_JSON}")
    print(f"  Résumé : {payload['summary']}")
    print("=" * 70 + "\n")
    return alerts


def _print_alert(a: dict):
    print(f"\n  {a['icone']} {a['ticker']} — {a['nom']} ({a['secteur']})")
    print(f"     Niveau    : {a['niveau']} (score={a['scoreAlerte']})")
    print(f"     CA {a['derniereAnnee']}   : {a['ca']:>10,.0f} MFCFA ({a['caYoY']:+.1f}% YoY)")
    print(f"     REX       : {a['rex']:>10,.0f} MFCFA ({a['rexYoY']:+.1f}%) | Marge {a['margeRex']:.1f}%")
    print(f"     RN        : {a['rn']:>10,.0f} MFCFA ({a['rnYoY']:+.1f}%) | Marge {a['margeRn']:.1f}%")
    print(f"     CAC       : {a['cacOpinion']}")
    print(f"     Conseil   : {a['conseil']}")
    for d in a["details"]:
        print(f"       ⚡ {d}")


if __name__ == "__main__":
    run_core_analysis()
