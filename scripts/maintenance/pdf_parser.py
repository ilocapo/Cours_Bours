#!/usr/bin/env python3
"""
pdf_parser.py
═════════════
Lit les rapports annuels PDF déposés dans rapports_annuels/<TICKER>/
et extrait automatiquement les données fondamentales :
  - Chiffre d'affaires (CA)
  - Résultat d'exploitation (REX)
  - Résultat net (RN)
  - Avis du CAC (Commissaire Aux Comptes)
  - Exercice fiscal (année)

Priorité de source dans fundamental_scraper.py :
  0. PDF déposé ici           ← PRIORITÉ MAXIMALE
  1. africamarkets.net
  2. sikafinance.com
  3. brvm.org
  4. Données de référence hardcodées

Usage :
  py pdf_parser.py                    → traite tous les nouveaux PDFs
  py pdf_parser.py --ticker SNTS      → traite uniquement SNTS
  py pdf_parser.py --dry-run          → simule sans modifier le CSV
"""

import csv
import json
import os
import re
import sys
import shutil
from datetime import datetime
from pathlib import Path

try:
    import pdfplumber
    PDF_OK = True
except ImportError:
    PDF_OK = False
    print("  [ERREUR] pdfplumber non installé — pip install pdfplumber")

ROOT          = Path(__file__).resolve().parents[2]
PDF_DIR       = ROOT / "rapports_annuels"
DONE_DIR      = PDF_DIR / "_traites"
CSV_FILE      = ROOT / "fundamentals_data.csv"
PARSE_LOG     = ROOT / "rapports_annuels" / "parse_log.json"

CSV_FIELDS = [
    "Ticker", "Nom", "Secteur", "Annee",
    "CA_MFCFA", "REX_MFCFA", "RN_MFCFA",
    "Marge_REX_pct", "Marge_RN_pct",
    "CAC_Opinion", "Source", "Last_Update"
]

TICKERS_INFO = {
    "SNTS":  {"nom": "Sonatel",               "secteur": "Télécommunications"},
    "ORGT":  {"nom": "Orange Côte d'Ivoire",  "secteur": "Télécommunications"},
    "ONTBF": {"nom": "ONATEL Burkina Faso",   "secteur": "Télécommunications"},
    "SAFC":  {"nom": "Safca",                 "secteur": "Agriculture / Hévéa"},
    "ABJC":  {"nom": "ABJC",                  "secteur": "Services / Restauration"},
}

# ─────────────────────────────────────────────────────────────────────────────
# Patterns regex pour extraire les données financières
# Couvrent les variantes de mise en forme dans les rapports BRVM
# ─────────────────────────────────────────────────────────────────────────────
PATTERNS_CA = [
    r"chiffre\s+d.affaires\s+(?:net\s+)?(?:consolidé\s+)?[\s:;]*([0-9\s.,]+)",
    r"\bca\b[\s:;]+([0-9\s.,]+)",
    r"produits?\s+(?:nets?\s+)?(?:d.exploitation|des\s+activités\s+ordinaires)[\s:;]*([0-9\s.,]+)",
    r"revenus?\s+(?:totaux\s+)?[\s:;]*([0-9\s.,]+)",
    r"total\s+(?:des\s+)?produits?\s+(?:d.exploitation\s+)?[\s:;]*([0-9\s.,]+)",
    r"chiffre\s+net\s+des\s+ventes[\s:;]*([0-9\s.,]+)",
]

PATTERNS_REX = [
    r"résultat\s+d.exploitation[\s:;]*([0-9\s.,\-]+)",
    r"\brex\b[\s:;]+([0-9\s.,\-]+)",
    r"résultat\s+opérationnel[\s:;]*([0-9\s.,\-]+)",
    r"bénéfice\s+(?:perte\s+)?d.exploitation[\s:;]*([0-9\s.,\-]+)",
    r"résultat\s+des\s+activités\s+ordinaires\s+avant\s+impôts[\s:;]*([0-9\s.,\-]+)",
    r"résultat\s+courant\s+avant\s+impôts[\s:;]*([0-9\s.,\-]+)",
]

PATTERNS_RN = [
    r"résultat\s+net[\s:;]*([0-9\s.,\-]+)",
    r"\brn\b[\s:;]+([0-9\s.,\-]+)",
    r"bénéfice\s+(?:perte\s+)?net(?:te)?[\s:;]*([0-9\s.,\-]+)",
    r"résultat\s+net\s+(?:de\s+l.exercice\s+)?(?:consolidé\s+)?[\s:;]*([0-9\s.,\-]+)",
    r"profit\s+net[\s:;]*([0-9\s.,\-]+)",
    r"résultat\s+(?:de\s+)?l.exercice[\s:;]*([0-9\s.,\-]+)",
]

PATTERNS_CAC_OK = [
    r"certifions?\s+(?:que\s+)?les\s+comptes\s+(?:annuels\s+)?(?:sont|ci-joints?\s+sont)\s+(?:réguliers?\s+et\s+)?sincères?",
    r"(?:sans|aucune)\s+réserve",
    r"approuvons?\s+les\s+comptes\s+(?:sans|aucune)\s+réserve",
    r"opinion\s+(?:sans|non\s+modifiée)",
    r"rapport\s+général\s+des\s+commissaires\s+aux\s+comptes",  # présence sans reserves = OK
]

PATTERNS_CAC_NOK = [
    r"émettons?\s+(?:une\s+)?réserve",
    r"avons?\s+(?:des?\s+)?réserve",
    r"impossibilité\s+d.exprimer",
    r"refus\s+de\s+certifier",
    r"opinion\s+(?:avec\s+réserve|défavorable|modifiée)",
    r"paragraph[e]?\s+(?:d.obs[e]?rvation|d.emphase)",
    r"observation\s+importante",
]

PATTERNS_YEAR = [
    r"exercice\s+(?:clos\s+(?:le\s+)?)?(?:au\s+)?(?:le\s+)?31\s+déc(?:embre)?\s+(20\d{2})",
    r"comptes\s+(?:annuels\s+)?(?:de\s+)?l.exercice\s+(20\d{2})",
    r"rapport\s+annuel\s+(20\d{2})",
    r"résultats\s+(?:annuels\s+)?(20\d{2})",
    r"(?:exercice|année)\s+(?:fiscal[e]?\s+)?(20\d{2})",
    r"\b(20\d{2})\b",  # dernier fallback : première année trouvée
]


# ─────────────────────────────────────────────────────────────────────────────
# Utilitaires
# ─────────────────────────────────────────────────────────────────────────────
def clean_number(text: str) -> float | None:
    """
    Convertit un texte numérique en float (millions FCFA).
    Gère : espaces de milliers, virgule décimale, points de milliers.
    """
    if not text:
        return None
    s = text.strip()
    # Supprimer les espaces insécables et normaux intra-nombre
    s = re.sub(r"[\s\xa0\u202f]+", "", s)
    # Normaliser : si plusieurs points → dernier est décimal
    parts = s.replace(",", ".").split(".")
    if len(parts) > 2:
        s = "".join(parts[:-1]) + "." + parts[-1]
    else:
        s = s.replace(",", ".")
    # Supprimer caractères non numériques (sauf . et -)
    s = re.sub(r"[^\d.\-]", "", s)
    if not s or s in (".", "-"):
        return None
    try:
        val = float(s)
        # Convertir en millions si valeur semble en unités (> 10 milliards)
        if val > 10_000_000_000:
            val /= 1_000_000_000  # milliards → millions (×1000)
        elif val > 10_000_000:
            val /= 1_000_000      # unités → millions
        elif val > 50_000:
            val /= 1_000          # milliers → millions
        # Valeurs déjà en millions : garder telles quelles
        return round(val, 1) if abs(val) > 0 else None
    except ValueError:
        return None


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extrait tout le texte d'un PDF avec pdfplumber."""
    if not PDF_OK:
        return ""
    full_text = []
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            total_pages = len(pdf.pages)
            print(f"    → {total_pages} pages")
            for i, page in enumerate(pdf.pages):
                try:
                    text = page.extract_text(x_tolerance=3, y_tolerance=3)
                    if text:
                        full_text.append(text)
                except Exception:
                    pass
    except Exception as e:
        print(f"    [ERREUR] Impossible de lire {pdf_path.name}: {e}")
        return ""
    return "\n".join(full_text)


def find_first_match(text: str, patterns: list, flags=re.IGNORECASE) -> str | None:
    """Applique une liste de patterns regex, retourne le premier match."""
    for pat in patterns:
        m = re.search(pat, text, flags)
        if m:
            return m.group(1).strip() if m.lastindex else m.group(0)
    return None


def detect_year(text: str, filename: str) -> int | None:
    """Détecte l'exercice fiscal dans le texte ou le nom de fichier."""
    # Chercher dans le nom de fichier d'abord
    year_in_name = re.search(r"(20\d{2})", filename)
    if year_in_name:
        y = int(year_in_name.group(1))
        if 2015 <= y <= datetime.now().year:
            return y

    # Chercher dans le texte (patterns spécifiques)
    for pat in PATTERNS_YEAR[:-1]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            y = int(m.group(1))
            if 2015 <= y <= datetime.now().year:
                return y

    # Fallback : année la plus récente dans le texte
    years_found = re.findall(r"\b(20\d{2})\b", text)
    if years_found:
        valid = [int(y) for y in years_found if 2015 <= int(y) <= datetime.now().year]
        if valid:
            # Prendre l'année la plus fréquente parmi les 3 premières occurrences
            from collections import Counter
            return Counter(valid[:50]).most_common(1)[0][0]
    return None


def detect_cac_opinion(text: str) -> str:
    """Détecte l'avis du CAC dans le texte."""
    text_lower = text.lower()

    # Vérifier d'abord les réserves
    for pat in PATTERNS_CAC_NOK:
        if re.search(pat, text_lower):
            return "Avec réserves"

    # Vérifier la certification sans réserve
    for pat in PATTERNS_CAC_OK:
        if re.search(pat, text_lower):
            return "Sans réserve"

    # Si le rapport contient la section CAC mais sans conclusion claire
    if any(kw in text_lower for kw in ["commissaire aux comptes", "auditeur", "certification"]):
        return "Opinion présente — vérifier manuellement"

    return "À compléter"


def parse_financials_from_text(text: str) -> dict:
    """Extrait CA, REX, RN depuis le texte brut du PDF."""
    text_lower = text.lower()

    ca_str  = find_first_match(text_lower, PATTERNS_CA)
    rex_str = find_first_match(text_lower, PATTERNS_REX)
    rn_str  = find_first_match(text_lower, PATTERNS_RN)

    ca  = clean_number(ca_str)  if ca_str  else None
    rex = clean_number(rex_str) if rex_str else None
    rn  = clean_number(rn_str)  if rn_str  else None

    # Validation de cohérence
    if ca and rex and rex > ca:
        # REX ne peut pas dépasser le CA → probablement une mauvaise extraction
        rex = None
    if ca and rn and abs(rn) > ca:
        rn = None

    return {"ca": ca, "rex": rex, "rn": rn}


def try_table_extraction(pdf_path: Path) -> dict:
    """
    Tentative d'extraction via les tableaux pdfplumber.
    Plus précis pour les rapports avec tableaux bien formés.
    """
    if not PDF_OK:
        return {}
    result = {}
    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row:
                            continue
                        row_text = " ".join(str(c) or "" for c in row).lower()
                        # Chercher la valeur numérique dans la ligne
                        nums = re.findall(r"[\d\s.,]{4,}", row_text)
                        if not nums:
                            continue
                        val = clean_number(nums[-1])
                        if not val:
                            continue
                        if any(kw in row_text for kw in ["chiffre d'affaires", "chiffre d affaires", "ca net", "revenus"]):
                            if "ca" not in result:
                                result["ca"] = val
                        elif any(kw in row_text for kw in ["résultat d exploitation", "résultat d'exploitation", "rex"]):
                            if "rex" not in result:
                                result["rex"] = val
                        elif any(kw in row_text for kw in ["résultat net", "rn ", "bénéfice net"]):
                            if "rn" not in result:
                                result["rn"] = val
    except Exception:
        pass
    return result


# ─────────────────────────────────────────────────────────────────────────────
# CSV
# ─────────────────────────────────────────────────────────────────────────────
def load_csv() -> dict:
    """Charge fundamentals_data.csv. Retourne {(ticker, annee): row}."""
    if not CSV_FILE.exists():
        return {}
    with open(CSV_FILE, encoding="utf-8", newline="") as f:
        return {(r["Ticker"], r["Annee"]): r for r in csv.DictReader(f)}


def save_csv(index: dict):
    """Sauvegarde l'index dans fundamentals_data.csv."""
    rows = sorted(index.values(), key=lambda r: (r["Ticker"], r["Annee"]))
    with open(CSV_FILE, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"\n  ✓ CSV sauvegardé → {CSV_FILE} ({len(rows)} lignes)")


def upsert_row(index: dict, ticker: str, annee: int, ca, rex, rn, cac: str, source: str):
    """Insère ou met à jour une ligne dans l'index CSV."""
    info = TICKERS_INFO.get(ticker, {"nom": ticker, "secteur": "—"})
    ca_v   = ca   or 0
    rex_v  = rex  or 0
    rn_v   = rn   or 0
    mrex   = round(rex_v / ca_v * 100, 1) if ca_v else 0
    mrn    = round(rn_v  / ca_v * 100, 1) if ca_v else 0

    key = (ticker, str(annee))
    existing = index.get(key, {})

    # Ne pas écraser les données existantes si les nouvelles sont incomplètes
    index[key] = {
        "Ticker":        ticker,
        "Nom":           info["nom"],
        "Secteur":       info["secteur"],
        "Annee":         str(annee),
        "CA_MFCFA":      str(ca_v   if ca_v  else existing.get("CA_MFCFA",  "0")),
        "REX_MFCFA":     str(rex_v  if rex_v else existing.get("REX_MFCFA", "0")),
        "RN_MFCFA":      str(rn_v   if rn_v  else existing.get("RN_MFCFA",  "0")),
        "Marge_REX_pct": str(mrex   if ca_v  else existing.get("Marge_REX_pct", "0")),
        "Marge_RN_pct":  str(mrn    if ca_v  else existing.get("Marge_RN_pct",  "0")),
        "CAC_Opinion":   cac if cac != "À compléter" else existing.get("CAC_Opinion", "À compléter"),
        "Source":        source,
        "Last_Update":   datetime.now().strftime("%Y-%m-%d"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Log des traitements
# ─────────────────────────────────────────────────────────────────────────────
def load_log() -> list:
    if PARSE_LOG.exists():
        try:
            with open(PARSE_LOG, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_log(log: list):
    PARSE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(PARSE_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2, default=str)


def already_processed(log: list, pdf_path: Path) -> bool:
    fname = pdf_path.name
    return any(e.get("fichier") == fname and e.get("statut") != "ECHEC" for e in log)


# ─────────────────────────────────────────────────────────────────────────────
# Parseur principal
# ─────────────────────────────────────────────────────────────────────────────
def process_pdf(pdf_path: Path, ticker: str, dry_run: bool = False) -> dict:
    """
    Traite un PDF et retourne un dict résultat.
    """
    print(f"\n  [{ticker}] {pdf_path.name}")

    result = {
        "fichier":   pdf_path.name,
        "ticker":    ticker,
        "statut":    "ECHEC",
        "annee":     None,
        "ca":        None,
        "rex":       None,
        "rn":        None,
        "cac":       "À compléter",
        "timestamp": datetime.now().isoformat(),
        "erreurs":   [],
    }

    if not PDF_OK:
        result["erreurs"].append("pdfplumber non installé")
        return result

    # 1. Extraire le texte
    print(f"    Extraction du texte...", end=" ", flush=True)
    text = extract_text_from_pdf(pdf_path)
    if not text.strip():
        print("❌ Texte vide (PDF scanné ou protégé)")
        result["erreurs"].append("Texte vide — PDF peut-être scanné ou protégé")
        result["statut"] = "SCAN_NON_LU"
        _create_manual_template(pdf_path, ticker)
        return result
    print(f"✓ {len(text):,} caractères")

    # 2. Détecter l'année
    annee = detect_year(text, pdf_path.name)
    if not annee:
        result["erreurs"].append("Année non détectée — vérifier le nom du fichier (ex: SNTS_2025.pdf)")
    else:
        result["annee"] = annee
        print(f"    Exercice détecté : {annee}")

    # 3. Extraire les chiffres — texte brut
    fin = parse_financials_from_text(text)

    # 4. Extraire via tableaux (plus précis)
    tables = try_table_extraction(pdf_path)
    # Fusionner : tableaux ont priorité sur texte brut
    ca  = tables.get("ca")  or fin.get("ca")
    rex = tables.get("rex") or fin.get("rex")
    rn  = tables.get("rn")  or fin.get("rn")

    result.update({"ca": ca, "rex": rex, "rn": rn})

    # 5. Détecter l'avis CAC
    cac = detect_cac_opinion(text)
    result["cac"] = cac

    # 6. Rapport d'extraction
    found = sum(1 for v in [ca, rex, rn] if v is not None)
    print(f"    CA:  {ca:>12,.1f} M FCFA" if ca  else "    CA:  ❌ non trouvé")
    print(f"    REX: {rex:>12,.1f} M FCFA" if rex else "    REX: ❌ non trouvé")
    print(f"    RN:  {rn:>12,.1f} M FCFA"  if rn  else "    RN:  ❌ non trouvé")
    print(f"    CAC: {cac}")
    print(f"    Score extraction: {found}/3 champs")

    if found == 0:
        result["statut"] = "ECHEC"
        result["erreurs"].append("Aucune donnée financière extraite — format non reconnu")
        _create_manual_template(pdf_path, ticker, annee)
        print(f"    → Template manuel créé dans _traites/")
    elif found < 3:
        result["statut"] = "PARTIEL"
        result["erreurs"].append(f"Extraction partielle ({found}/3) — compléter manuellement")
    else:
        result["statut"] = "OK"

    return result


def _create_manual_template(pdf_path: Path, ticker: str, annee: int = None):
    """Crée un fichier JSON template pour saisie manuelle."""
    DONE_DIR.mkdir(parents=True, exist_ok=True)
    annee_str = str(annee) if annee else "20XX"
    template = {
        "_instructions": (
            "Remplir ce fichier avec les données du rapport annuel, "
            "puis lancer: py pdf_parser.py --from-json"
        ),
        "ticker":      ticker,
        "annee":       annee_str,
        "ca_mfcfa":    "0",
        "rex_mfcfa":   "0",
        "rn_mfcfa":    "0",
        "cac_opinion": "Sans réserve",
        "source":      f"Manuel — {pdf_path.name}",
    }
    out = DONE_DIR / f"{ticker}_{annee_str}_manuel.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(template, f, ensure_ascii=False, indent=2)
    print(f"    → Template créé: {out.name}")


def load_manual_jsons() -> list[dict]:
    """Charge tous les fichiers _manuel.json dans _traites/."""
    DONE_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    for f in DONE_DIR.glob("*_manuel.json"):
        try:
            with open(f, encoding="utf-8") as fp:
                data = json.load(fp)
            if data.get("ca_mfcfa", "0") != "0":
                results.append({"path": f, "data": data})
        except Exception:
            pass
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Analyse comparative — détecte les variations importantes
# ─────────────────────────────────────────────────────────────────────────────
def compute_yoy(index: dict, ticker: str, annee: int) -> dict:
    """Calcule les variations YoY vs l'année précédente."""
    curr = index.get((ticker, str(annee)))
    prev = index.get((ticker, str(annee - 1)))
    if not curr or not prev:
        return {}

    def pct(new, old):
        try:
            n, o = float(new), float(old)
            if o == 0:
                return None
            return round((n - o) / abs(o) * 100, 1)
        except Exception:
            return None

    ca_yoy  = pct(curr["CA_MFCFA"],  prev["CA_MFCFA"])
    rex_yoy = pct(curr["REX_MFCFA"], prev["REX_MFCFA"])
    rn_yoy  = pct(curr["RN_MFCFA"],  prev["RN_MFCFA"])

    flags = []
    if ca_yoy is not None and rex_yoy is not None:
        if ca_yoy > 5 and rex_yoy < ca_yoy * 0.5:
            flags.append(f"⚠ Illusion CA : CA+{ca_yoy}% mais REX seulement {rex_yoy:+.1f}%")
    if rex_yoy is not None and rn_yoy is not None:
        if rex_yoy > 5 and rn_yoy < rex_yoy * 0.4:
            flags.append(f"⚠ Compression RN : REX+{rex_yoy}% mais RN seulement {rn_yoy:+.1f}%")

    return {"ca_yoy": ca_yoy, "rex_yoy": rex_yoy, "rn_yoy": rn_yoy, "flags": flags}


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    args     = sys.argv[1:]
    dry_run  = "--dry-run" in args
    from_json = "--from-json" in args
    filter_ticker = None
    if "--ticker" in args:
        idx = args.index("--ticker")
        if idx + 1 < len(args):
            filter_ticker = args[idx + 1].upper()

    print("\n" + "═" * 65)
    print("  PDF PARSER — RAPPORTS ANNUELS BRVM")
    print("═" * 65)

    if not PDF_OK:
        print("  [ERREUR] pdfplumber requis : py -m pip install pdfplumber")
        return

    if dry_run:
        print("  ⚠  MODE DRY-RUN — aucune modification")

    # Charger le CSV et le log existants
    csv_index = load_csv()
    log       = load_log()
    total_new = 0
    results   = []

    # ── Traitement des JSON manuels ──────────────────────────────────────────
    if from_json:
        manuals = load_manual_jsons()
        if not manuals:
            print("\n  Aucun fichier _manuel.json rempli trouvé dans _traites/")
        for m in manuals:
            d = m["data"]
            ticker = d.get("ticker", "").upper()
            try:
                annee = int(d.get("annee", 0))
            except Exception:
                continue
            if annee < 2015 or annee > datetime.now().year:
                print(f"  [WARN] {m['path'].name} : année invalide {annee}")
                continue
            try:
                ca  = float(d.get("ca_mfcfa",  0) or 0)
                rex = float(d.get("rex_mfcfa", 0) or 0)
                rn  = float(d.get("rn_mfcfa",  0) or 0)
                cac = d.get("cac_opinion", "À compléter")
            except Exception:
                continue
            if not dry_run:
                upsert_row(csv_index, ticker, annee, ca, rex, rn, cac,
                           f"Saisie manuelle — {m['path'].name}")
            print(f"  ✓ JSON manuel {ticker} {annee}: CA={ca:,.0f} REX={rex:,.0f} RN={rn:,.0f}")
            total_new += 1
        if total_new and not dry_run:
            save_csv(csv_index)
        print(f"\n  {total_new} ligne(s) JSON manuel traitée(s)")
        return

    # ── Scan des dossiers PDF ────────────────────────────────────────────────
    if not PDF_DIR.exists():
        print(f"  [ERREUR] Dossier introuvable : {PDF_DIR}")
        return

    tickers_to_scan = list(TICKERS_INFO.keys())
    if filter_ticker:
        tickers_to_scan = [filter_ticker]

    for ticker in tickers_to_scan:
        ticker_dir = PDF_DIR / ticker
        if not ticker_dir.exists():
            continue
        pdfs = list(ticker_dir.glob("*.pdf")) + list(ticker_dir.glob("*.PDF"))
        if not pdfs:
            continue

        for pdf_path in pdfs:
            if already_processed(log, pdf_path):
                print(f"  [SKIP] {ticker}/{pdf_path.name} (déjà traité)")
                continue

            res = process_pdf(pdf_path, ticker, dry_run)
            results.append(res)

            if res["statut"] in ("OK", "PARTIEL") and res["annee"] and not dry_run:
                upsert_row(
                    csv_index, ticker, res["annee"],
                    res["ca"], res["rex"], res["rn"], res["cac"],
                    f"PDF — {pdf_path.name}"
                )
                total_new += 1

                # Analyse YoY immédiate
                yoy = compute_yoy(csv_index, ticker, res["annee"])
                if yoy.get("flags"):
                    print(f"    📊 Analyse comparative :")
                    for flag in yoy["flags"]:
                        print(f"       {flag}")

            # Déplacer le PDF dans _traites/
            if not dry_run and res["statut"] != "ECHEC":
                DONE_DIR.mkdir(parents=True, exist_ok=True)
                dest = DONE_DIR / f"{ticker}_{pdf_path.name}"
                try:
                    shutil.move(str(pdf_path), str(dest))
                    print(f"    → Déplacé vers _traites/{dest.name}")
                except Exception as e:
                    print(f"    [WARN] Impossible de déplacer: {e}")

    # Sauvegarder
    if total_new and not dry_run:
        save_csv(csv_index)

    # Mise à jour du log
    if not dry_run:
        log.extend(results)
        save_log(log)

    # ── Résumé ───────────────────────────────────────────────────────────────
    print("\n" + "═" * 65)
    print(f"  RÉSUMÉ : {len(results)} PDF traité(s), {total_new} ligne(s) mise(s) à jour")
    if results:
        ok      = [r for r in results if r["statut"] == "OK"]
        partiel = [r for r in results if r["statut"] == "PARTIEL"]
        echec   = [r for r in results if r["statut"] in ("ECHEC", "SCAN_NON_LU")]
        print(f"  ✅ OK       : {len(ok)}")
        print(f"  🟡 PARTIEL  : {len(partiel)}")
        print(f"  ❌ ÉCHEC    : {len(echec)}")
        if echec:
            print()
            print("  Pour les PDFs en échec, remplir le template JSON dans _traites/")
            print("  puis lancer : py pdf_parser.py --from-json")
    else:
        print()
        scanned = []
        for ticker in tickers_to_scan:
            d = PDF_DIR / ticker
            if d.exists():
                scanned.extend(list(d.glob("*.pdf")))
        if not scanned:
            print("  Aucun PDF trouvé. Déposer des PDFs dans :")
            for t in tickers_to_scan:
                print(f"    rapports_annuels/{t}/")
        else:
            print("  Tous les PDFs ont déjà été traités (voir parse_log.json)")
    print("═" * 65 + "\n")

    # Relancer l'analyse fondamentale si on a de nouvelles données
    if total_new and not dry_run:
        print("  → Relance de fundamentals_core_alert.py...")
        import subprocess
        subprocess.run([sys.executable, str(ROOT / "fundamentals_core_alert.py")], check=False)


if __name__ == "__main__":
    main()
