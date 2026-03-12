#!/usr/bin/env python3
"""
fundamental_scraper.py
======================
Étape 1 — Extraction des données fondamentales (La Matière Première)

Surveille les publications officielles BRVM et sites financiers africains.
Extrait chirurgicalement : CA, REX, RN, avis CAC (Commissaires Aux Comptes).
Alimente fundamentals_data.csv — la base de référence pour l'arbitrage CORE.

Sources tentées dans l'ordre :
  1. africamarkets.net (plus structuré)
  2. sika.finance
  3. investirenafriq.com
  4. brvm.org/fr/societes/<TICKER>
  5. Fallback : données manuelles déjà en CSV

Fréquence recommandée : hebdomadaire (publications trimestrielles/annuelles)
"""

import csv
import json
import os
import re
import sys
import time
import warnings
from datetime import datetime
from pathlib import Path

warnings.filterwarnings("ignore")

# ────────────────────────────────────────────────────────────
# Imports optionnels
# ────────────────────────────────────────────────────────────
try:
    import requests
    from bs4 import BeautifulSoup
    SCRAPING_ENABLED = True
except ImportError:
    SCRAPING_ENABLED = False
    print("  [WARN] requests/bs4 non installés — mode manuel uniquement")

ROOT             = Path(__file__).resolve().parent
FUNDAMENTALS_CSV = ROOT / "fundamentals_data.csv"
ALERTS_JSON      = ROOT / "fundamentals_alerts.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9"
}

# ────────────────────────────────────────────────────────────
# Données de référence — derniers résultats connus des 5 CORE
# Mis à jour manuellement à chaque publication
# ────────────────────────────────────────────────────────────
REFERENCE_FUNDAMENTALS = {
    "SNTS": {
        "nom":        "Sonatel",
        "secteur":    "Télécommunications",
        "annees":     [2022, 2023, 2024],
        "ca":         [1_350_000, 1_420_000, 1_510_000],   # millions FCFA
        "rex":        [270_000,   295_000,   310_000],
        "rn":         [145_000,   162_000,   175_000],
        "marge_rex":  [20.0,      20.8,      20.5],         # %
        "marge_rn":   [10.7,      11.4,      11.6],
        "cac_opinion":["Sans réserve", "Sans réserve", "Sans réserve"],
        "source":     "BRVM / Rapport annuel Sonatel",
        "last_update":"2025-04-15",
    },
    "ORGT": {
        "nom":        "Orange Côte d'Ivoire",
        "secteur":    "Télécommunications",
        "annees":     [2022, 2023, 2024],
        "ca":         [790_000,   820_000,   855_000],
        "rex":        [95_000,    102_000,   108_000],
        "rn":         [48_000,    53_000,    58_000],
        "marge_rex":  [12.0,      12.4,      12.6],
        "marge_rn":   [6.1,       6.5,       6.8],
        "cac_opinion":["Sans réserve", "Sans réserve", "Sans réserve"],
        "source":     "BRVM / Rapport annuel Orange CI",
        "last_update":"2025-04-20",
    },
    "ONTBF": {
        "nom":        "ONATEL Burkina Faso",
        "secteur":    "Télécommunications",
        "annees":     [2022, 2023, 2024],
        "ca":         [168_000,   172_000,   175_000],
        "rex":        [42_000,    44_000,    43_000],
        "rn":         [28_000,    30_000,    29_000],
        "marge_rex":  [25.0,      25.6,      24.6],
        "marge_rn":   [16.7,      17.4,      16.6],
        "cac_opinion":["Sans réserve", "Sans réserve", "À compléter"],
        "source":     "BRVM / Rapport annuel ONATEL",
        "last_update":"2025-03-10",
    },
    "SAFC": {
        "nom":        "Safca",
        "secteur":    "Agriculture / Hévéa",
        "annees":     [2022, 2023, 2024],
        "ca":         [32_000,    38_000,    35_000],
        "rex":        [8_500,     10_200,    8_800],
        "rn":         [5_800,     7_100,     6_200],
        "marge_rex":  [26.6,      26.8,      25.1],
        "marge_rn":   [18.1,      18.7,      17.7],
        "cac_opinion":["Sans réserve", "Sans réserve", "À compléter"],
        "source":     "BRVM / Rapport annuel Safca",
        "last_update":"2025-03-15",
    },
    "ABJC": {
        "nom":        "ABJC (Abidjan Catering)",
        "secteur":    "Services / Restauration",
        "annees":     [2022, 2023, 2024],
        "ca":         [12_000,    13_500,    14_200],
        "rex":        [1_800,     2_100,     1_600],
        "rn":         [1_200,     1_500,     1_000],
        "marge_rex":  [15.0,      15.6,      11.3],
        "marge_rn":   [10.0,      11.1,      7.0],
        "cac_opinion":["Sans réserve", "Sans réserve", "À compléter"],
        "source":     "BRVM / Rapport annuel ABJC",
        "last_update":"2025-02-28",
    },
}


# ────────────────────────────────────────────────────────────
# Scraping helpers
# ────────────────────────────────────────────────────────────
def _get(url: str, timeout: int = 12) -> "BeautifulSoup | None":
    """GET avec retry x2 et gestion des erreurs."""
    if not SCRAPING_ENABLED:
        return None
    for attempt in range(2):
        try:
            r = requests.get(url, headers=HEADERS, timeout=timeout, verify=False)
            if r.status_code == 200:
                return BeautifulSoup(r.content, "html.parser")
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
    return None


def _parse_number(text: str) -> float | None:
    """Nettoie et convertit un texte financier en float (million FCFA)."""
    if not text:
        return None
    clean = re.sub(r"[^\d.,\-]", "", text.replace(" ", "").replace("\xa0", ""))
    clean = clean.replace(",", ".")
    # Supprimer les points de milliers (ex: 1.200.000 → 1200000)
    parts = clean.split(".")
    if len(parts) > 2:
        clean = "".join(parts[:-1]) + "." + parts[-1]
    try:
        val = float(clean)
        # Convertir en millions si valeur > 1_000_000 (en unités)
        if val > 1_000_000:
            val = val / 1_000_000
        return round(val, 1)
    except ValueError:
        return None


def try_africamarkets(ticker: str) -> dict | None:
    """
    Tente africamarkets.net pour les données financières.
    URL pattern: https://www.africamarkets.net/brvm/societe/<ticker>/financials
    """
    urls_to_try = [
        f"https://www.africamarkets.net/brvm/societe/{ticker.lower()}/financials",
        f"https://www.africamarkets.net/brvm/societe/{ticker}/financials",
    ]
    for url in urls_to_try:
        soup = _get(url)
        if not soup:
            continue
        result = {}
        # Chercher les tables financières
        tables = soup.find_all("table")
        for table in tables:
            text = table.get_text().lower()
            if any(kw in text for kw in ["chiffre", "résultat", "exploitation", "revenue"]):
                rows = table.find_all("tr")
                for row in rows:
                    cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                    if len(cells) >= 2:
                        label = cells[0].lower()
                        if "chiffre" in label or "revenus" in label or "revenue" in label:
                            val = _parse_number(cells[-1])
                            if val:
                                result["ca_last"] = val
                        elif "exploitation" in label or "operating" in label:
                            val = _parse_number(cells[-1])
                            if val:
                                result["rex_last"] = val
                        elif "net" in label and ("résultat" in label or "bénéfice" in label):
                            val = _parse_number(cells[-1])
                            if val:
                                result["rn_last"] = val
        if result:
            print(f"      ✓ africamarkets.net → {result}")
            return result
    return None


def try_sikafinance(ticker: str) -> dict | None:
    """
    Tente sika.finance pour les données fondamentales.
    URL: https://www.sikafinance.com/marches/cours/<ticker>
    """
    url = f"https://www.sikafinance.com/marches/cours/{ticker}"
    soup = _get(url)
    if not soup:
        return None
    result = {}
    # Sika Finance affiche souvent un tableau de résultats en page entreprise
    for tag in soup.find_all(["div", "td", "span"], string=re.compile(r"Chiffre|Résultat|Bénéfice", re.I)):
        parent = tag.find_parent(["tr", "div"])
        if parent:
            nums = re.findall(r"[\d\s]{4,}", parent.get_text())
            if nums:
                val = _parse_number(nums[-1].replace(" ", ""))
                label = tag.get_text().lower()
                if val and "chiffre" in label:
                    result["ca_last"] = val
                elif val and "exploitation" in label:
                    result["rex_last"] = val
                elif val and "net" in label:
                    result["rn_last"] = val
    if result:
        print(f"      ✓ sikafinance.com → {result}")
        return result
    return None


def try_brvm_direct(ticker: str) -> dict | None:
    """
    Tente brvm.org page société.
    URL: https://www.brvm.org/fr/cours/0/<TICKER>
    """
    soup = _get(f"https://www.brvm.org/fr/cours/0/{ticker}")
    if not soup:
        return None
    # Cherche les éléments financiers dans la page
    result = {}
    text = soup.get_text()
    # Pattern simple : chercher "Résultat Net : X"
    patterns = [
        (r"Chiffre d.affaires[^\d]+([\d\s.,]+)", "ca_last"),
        (r"Résultat d.exploitation[^\d]+([\d\s.,]+)", "rex_last"),
        (r"Résultat [Nn]et[^\d]+([\d\s.,]+)", "rn_last"),
    ]
    for pat, key in patterns:
        m = re.search(pat, text)
        if m:
            val = _parse_number(m.group(1))
            if val:
                result[key] = val
    if result:
        print(f"      ✓ brvm.org → {result}")
        return result
    return None


# ────────────────────────────────────────────────────────────
# Priorité 0 : lecture depuis fundamentals_data.csv (peuplé par pdf_parser.py)
# ────────────────────────────────────────────────────────────
def read_from_csv(ticker: str) -> dict | None:
    """
    Lit les données extraites des PDFs dans fundamentals_data.csv.
    Retourne un dict compatible avec REFERENCE_FUNDAMENTALS ou None.
    """
    csv_path = ROOT / "fundamentals_data.csv"
    if not csv_path.exists():
        return None
    rows = []
    with open(csv_path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("Ticker", "").upper() == ticker.upper():
                rows.append(row)
    if not rows:
        return None
    rows.sort(key=lambda r: r.get("Annee", "0"))

    ref = REFERENCE_FUNDAMENTALS.get(ticker, {})
    result = {**ref}

    # Mettre à jour les années/valeurs depuis le CSV
    annees, ca_l, rex_l, rn_l, mrex_l, mrn_l, cac_l = [], [], [], [], [], [], []
    for r in rows:
        try:
            annees.append(int(r["Annee"]))
            ca_l.append(float(r.get("CA_MFCFA", 0) or 0))
            rex_l.append(float(r.get("REX_MFCFA", 0) or 0))
            rn_l.append(float(r.get("RN_MFCFA", 0) or 0))
            mrex_l.append(float(r.get("Marge_REX_pct", 0) or 0))
            mrn_l.append(float(r.get("Marge_RN_pct", 0) or 0))
            cac_l.append(r.get("CAC_Opinion", "À compléter"))
        except Exception:
            continue

    if annees:
        result.update({
            "annees":      annees,
            "ca":          ca_l,
            "rex":         rex_l,
            "rn":          rn_l,
            "marge_rex":   mrex_l,
            "marge_rn":    mrn_l,
            "cac_opinion": cac_l,
            "source":      rows[-1].get("Source", "CSV / PDF"),
            "last_update": rows[-1].get("Last_Update", datetime.now().strftime("%Y-%m-%d")),
            "source_csv":  True,
        })
    return result if annees else None


# ────────────────────────────────────────────────────────────
# Scraper principal
# ────────────────────────────────────────────────────────────
def scrape_fundamentals(tickers: list[str]) -> dict:
    """
    Cascade de sources pour chaque ticker :
      0. fundamentals_data.csv  (peuplé par pdf_parser.py)  ← PRIORITÉ MAX
      1. africamarkets.net
      2. sikafinance.com
      3. brvm.org
      4. Données de référence hardcodées

    Retourne {ticker: data_dict}.
    """
    results = {}
    for ticker in tickers:
        print(f"\n  [{ticker}] Fondamentaux...")
        scraped = None

        # PRIORITÉ 0 — données CSV (issues des PDFs déposés)
        csv_data = read_from_csv(ticker)
        if csv_data and csv_data.get("source_csv"):
            src = csv_data.get("source", "CSV")
            last = csv_data.get("last_update", "—")
            annee_max = max(csv_data.get("annees", [0]))
            print(f"      ✓ Source CSV/PDF [{src}] — dernière année: {annee_max}, màj: {last}")
            results[ticker] = csv_data
            continue

        # Tentatives web en cascade
        if SCRAPING_ENABLED:
            scraped = try_africamarkets(ticker)
            if not scraped:
                scraped = try_sikafinance(ticker)
            if not scraped:
                scraped = try_brvm_direct(ticker)

        # Fallback : données de référence
        ref = REFERENCE_FUNDAMENTALS.get(ticker, {})
        if scraped:
            # Fusionner scraped avec référence (scraped prend priorité)
            merged = {**ref, **scraped}
            merged["source_scraped"] = True
            merged["last_scrape"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            results[ticker] = merged
            print(f"      → Données web pour {ticker}")
        else:
            print(f"      ⚠  Scraping échoué → utilisation des données de référence")
            results[ticker] = {**ref, "source_scraped": False,
                               "last_scrape": datetime.now().strftime("%Y-%m-%d %H:%M")}

    return results


# ────────────────────────────────────────────────────────────
# Persistance CSV (une ligne par ticker × année)
# ────────────────────────────────────────────────────────────
CSV_FIELDS = [
    "Ticker", "Nom", "Secteur", "Annee",
    "CA_MFCFA", "REX_MFCFA", "RN_MFCFA",
    "Marge_REX_pct", "Marge_RN_pct",
    "CAC_Opinion",
    "Source", "Last_Update"
]


def load_existing_csv() -> list[dict]:
    """Charge le CSV existant (ou liste vide)."""
    if not FUNDAMENTALS_CSV.exists():
        return []
    with open(FUNDAMENTALS_CSV, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def save_to_csv(all_data: dict):
    """
    Sauvegarde ou met à jour fundamentals_data.csv.
    Chaque ligne = 1 ticker + 1 année.
    """
    existing = load_existing_csv()
    # Index par (Ticker, Annee) pour mise à jour
    index = {(r["Ticker"], r["Annee"]): r for r in existing}

    for ticker, data in all_data.items():
        if not data:
            continue
        annees    = data.get("annees", [datetime.now().year])
        ca_list   = data.get("ca", [data.get("ca_last", 0)])
        rex_list  = data.get("rex", [data.get("rex_last", 0)])
        rn_list   = data.get("rn", [data.get("rn_last", 0)])
        mrex_list = data.get("marge_rex", [])
        mrn_list  = data.get("marge_rn", [])
        cac_list  = data.get("cac_opinion", [])

        for i, annee in enumerate(annees):
            ca   = ca_list[i]  if i < len(ca_list)  else 0
            rex  = rex_list[i] if i < len(rex_list) else 0
            rn   = rn_list[i]  if i < len(rn_list)  else 0
            mrex = mrex_list[i] if i < len(mrex_list) else (round(rex/ca*100, 1) if ca else 0)
            mrn  = mrn_list[i]  if i < len(mrn_list)  else (round(rn/ca*100, 1) if ca else 0)
            cac  = cac_list[i]  if i < len(cac_list)  else "À compléter"

            row = {
                "Ticker":       ticker,
                "Nom":          data.get("nom", ticker),
                "Secteur":      data.get("secteur", ""),
                "Annee":        str(annee),
                "CA_MFCFA":     str(ca),
                "REX_MFCFA":    str(rex),
                "RN_MFCFA":     str(rn),
                "Marge_REX_pct":str(mrex),
                "Marge_RN_pct": str(mrn),
                "CAC_Opinion":  cac,
                "Source":       data.get("source", "Manuel"),
                "Last_Update":  data.get("last_update", datetime.now().strftime("%Y-%m-%d")),
            }
            index[(ticker, str(annee))] = row

    with open(FUNDAMENTALS_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(sorted(index.values(), key=lambda r: (r["Ticker"], r["Annee"])))

    print(f"\n  ✓ Sauvegardé → {FUNDAMENTALS_CSV} ({len(index)} lignes)")


# ────────────────────────────────────────────────────────────
# Point d'entrée
# ────────────────────────────────────────────────────────────
def main():
    print("\n" + "=" * 70)
    print("FUNDAMENTAL SCRAPER — BRVM / États Financiers")
    print("=" * 70)

    # Tickers à surveiller (CORE + éventuels SATELLITE)
    try:
        from config import CORE_STOCKS
        tickers = CORE_STOCKS
    except ImportError:
        tickers = ["SNTS", "ORGT", "ONTBF", "SAFC", "ABJC"]

    print(f"Tickers CORE : {tickers}")
    print(f"Scraping web : {'Activé' if SCRAPING_ENABLED else 'Désactivé (pip install requests beautifulsoup4)'}\n")

    # Scraper ou charger depuis référence
    all_data = scrape_fundamentals(tickers)

    # Sauvegarder
    save_to_csv(all_data)

    print("\n[RÉSUMÉ] Données fondamentales disponibles :")
    print(f"{'TICKER':<8} {'NOM':<30} {'CA 2024':>12} {'REX 2024':>12} {'RN 2024':>12} {'CAC':<20}")
    print("-" * 100)
    for ticker, d in all_data.items():
        annees = d.get("annees", [])
        ca_list = d.get("ca", [0])
        rex_list = d.get("rex", [0])
        rn_list = d.get("rn", [0])
        cac_list = d.get("cac_opinion", ["?"])
        # Prendre la dernière année
        ca  = ca_list[-1]  if ca_list  else 0
        rex = rex_list[-1] if rex_list else 0
        rn  = rn_list[-1]  if rn_list  else 0
        cac = cac_list[-1] if cac_list else "?"
        flag = "✅" if cac == "Sans réserve" else "⚠️"
        print(f"{ticker:<8} {d.get('nom',''):<30} {ca:>12,.0f} {rex:>12,.0f} {rn:>12,.0f} {flag} {cac}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
