#!/usr/bin/env python3
"""
patch_dashboard_json.py
Mise à jour rapide de docs/data/dashboard.json après chaque automation.
Lit YTD_2026.csv + dernier fichier de signaux → patche overview + signals.
Ne relance PAS les backtests (très rapide, ~1 sec).
"""

import json
import glob
import os
from datetime import datetime
from pathlib import Path

ROOT       = Path(__file__).resolve().parent
JSON_FILE  = ROOT / "docs" / "data" / "dashboard.json"
YTD_FILE   = ROOT / "YTD_2026.csv"
SIG_GLOB   = str(ROOT / "output" / "signals" / "*.csv")
CORE_FILE  = ROOT / "core_allocation.csv"

INITIAL_CAPITAL     = 1_000_000
CORE_PCT            = 0.70
SATELLITE_PCT       = 0.20
CASH_PCT            = 0.10

try:
    from config import (
        REAL_PORTFOLIO_CAPITAL, CORE_ALLOCATION_PCT,
        SATELLITE_ALLOCATION_PCT, CASH_ALLOCATION_PCT
    )
    INITIAL_CAPITAL  = REAL_PORTFOLIO_CAPITAL
    CORE_PCT         = CORE_ALLOCATION_PCT
    SATELLITE_PCT    = SATELLITE_ALLOCATION_PCT
    CASH_PCT         = CASH_ALLOCATION_PCT
except Exception:
    pass


def safe_float(v, default=0.0):
    try:
        return float(str(v).replace(",", ".").replace(" ", ""))
    except Exception:
        return default


def read_ytd():
    """Retourne la dernière ligne valide de YTD_2026.csv (2026 only)."""
    if not YTD_FILE.exists():
        print(f"  [WARN] {YTD_FILE} introuvable")
        return None
    rows = []
    with open(YTD_FILE, encoding="utf-8") as f:
        lines = f.readlines()
    for line in lines[1:]:           # skip header
        parts = line.strip().split(",")
        if len(parts) >= 5:
            date_str = parts[0].strip()
            # Exclure la ligne 2025 (initialisation)
            if "2026" in date_str or (date_str and date_str[-4:] == "2026"):
                rows.append(parts)
    if not rows:
        return None
    last = rows[-1]
    return {
        "date":      last[0],
        "core":      safe_float(last[1]),
        "satellite": safe_float(last[2]),
        "total":     safe_float(last[3]),
        "ytd_pct":   safe_float(last[4]),
        "trades":    int(safe_float(last[5], 0)) if len(last) > 5 else 0,
        "status":    last[6].strip() if len(last) > 6 else "",
    }


def read_signals():
    """Lit le dernier fichier signals CSV et retourne un résumé."""
    files = sorted(glob.glob(SIG_GLOB))
    if not files:
        return None, []
    latest = files[-1]
    summary = {"strongBuy": 0, "buy": 0, "hold": 0, "sell": 0, "strongSell": 0}
    current = []
    with open(latest, encoding="utf-8") as f:
        lines = f.readlines()
    headers = [h.strip() for h in lines[0].split(",")]
    def col(row, name):
        try:
            return row[headers.index(name)].strip()
        except (ValueError, IndexError):
            return ""
    for line in lines[1:]:
        if not line.strip():
            continue
        row = [x.strip() for x in line.split(",")]
        sig  = col(row, "Signal")
        tick = col(row, "Ticker")
        price= safe_float(col(row, "Price"))
        z    = safe_float(col(row, "Z_Score"))
        if   sig == "Strong Buy":  summary["strongBuy"]  += 1
        elif sig == "Buy":         summary["buy"]         += 1
        elif sig == "Strong Sell": summary["strongSell"]  += 1
        elif sig == "Sell":        summary["sell"]        += 1
        else:                      summary["hold"]        += 1
        current.append({"symbol": tick, "price": price, "zScore": round(z, 2),
                         "signal": sig, "volume": 0, "volatility": 0})
    # Trier par Z-Score croissant (plus sous-évalué en premier)
    current.sort(key=lambda x: x["zScore"])
    return summary, current


def read_core_positions():
    """Lit core_allocation.csv si disponible."""
    if not CORE_FILE.exists():
        return []
    positions = []
    with open(CORE_FILE, encoding="utf-8") as f:
        lines = f.readlines()
    if len(lines) < 2:
        return []
    headers = [h.strip() for h in lines[0].split(",")]
    def col(row, name):
        try:
            return row[headers.index(name)].strip()
        except (ValueError, IndexError):
            return ""
    for line in lines[1:]:
        if not line.strip():
            continue
        row = [x.strip() for x in line.split(",")]
        positions.append({
            "ticker":    col(row, "Ticker"),
            "quantity":  safe_float(col(row, "Quantity")),
            "buyPrice":  safe_float(col(row, "Buy_Price")),
            "lastPrice": safe_float(col(row, "Current_Price") or col(row, "Last_Price")),
            "value":     safe_float(col(row, "Current_Value") or col(row, "Value")),
            "pnlPct":    safe_float(col(row, "PnL_%") or col(row, "Return_%")),
        })
    return positions


def main():
    print(f"\n[PATCH] Mise à jour dashboard.json — {datetime.now().strftime('%H:%M:%S')}")

    # 1. Charger le JSON existant (ou créer un squelette minimal)
    if JSON_FILE.exists():
        with open(JSON_FILE, encoding="utf-8") as f:
            data = json.load(f)
        print(f"  Chargé: {JSON_FILE}")
    else:
        print(f"  [WARN] {JSON_FILE} absent — création d'un fichier minimal")
        data = {}

    # 2. Lire les données fraîches
    ytd  = read_ytd()
    sig_summary, sig_current = read_signals()
    core_pos = read_core_positions()

    now = datetime.now()

    # 3. Patcher meta
    data.setdefault("meta", {})
    data["meta"]["lastUpdate"]  = now.isoformat()
    data["meta"]["dataDate"]    = now.strftime("%Y-%m-%d")
    data["meta"]["currency"]    = "FCFA"
    data["meta"]["marketStatus"]= "Données mises à jour"
    data["meta"]["generatedBy"] = "patch_dashboard_json.py"

    # 4. Patcher overview
    data.setdefault("overview", {})
    if ytd:
        total_val = ytd["total"]
        core_val  = ytd["core"]
        sat_val   = ytd["satellite"]
        ytd_ret   = ytd["ytd_pct"]

        # Gain journalier : différence avec l'avant-dernière ligne
        daily_pnl = 0
        daily_pct = 0.0
        rows_all = []
        with open(YTD_FILE, encoding="utf-8") as f:
            lines_all = f.readlines()
        for ln in lines_all[1:]:
            p = ln.strip().split(",")
            if len(p) >= 5 and "2026" in p[0]:
                rows_all.append(p)
        if len(rows_all) >= 2:
            prev_total = safe_float(rows_all[-2][3])
            if prev_total:
                daily_pnl = total_val - prev_total
                daily_pct = round(daily_pnl / prev_total * 100, 2)

        data["overview"].update({
            "totalValue":        int(total_val),
            "initialCapital":    INITIAL_CAPITAL,
            "ytdReturn":         round(ytd_ret, 2),
            "dailyPnl":          int(daily_pnl),
            "dailyPnlPct":       daily_pct,
            "coreValue":         int(core_val),
            "satelliteValue":    int(sat_val),
            "cashAvailable":     int(INITIAL_CAPITAL * CASH_PCT),
            "openPositions":     len(core_pos) if core_pos else data["overview"].get("openPositions", 5),
            "corePositions":     len(core_pos) if core_pos else data["overview"].get("corePositions", 5),
            "satellitePositions":0,
        })
        print(f"  ✓ Overview: {int(total_val):,} FCFA | YTD {ytd_ret:+.2f}% | Jour {daily_pct:+.2f}%")
    else:
        print("  [SKIP] Pas de données YTD disponibles")

    # 5. Patcher signaux
    if sig_summary is not None:
        data.setdefault("signals", {})
        data["signals"]["summary"] = sig_summary
        if sig_current:
            data["signals"]["current"] = sig_current
        print(f"  ✓ Signaux: {sig_summary.get('strongBuy',0)} StrongBuy | "
              f"{sig_summary.get('buy',0)} Buy | {sig_summary.get('sell',0)+sig_summary.get('strongSell',0)} Sell")

    # 6. Patcher positions CORE
    if core_pos:
        data["core"] = core_pos
        print(f"  ✓ Core positions: {len(core_pos)} titres")

    # 7. Ajouter un point à portfolioHistory (si pas déjà là)
    if ytd and "portfolioHistory" in data:
        today_str = now.strftime("%Y-%m-%d")
        already   = any(pt.get("date","").startswith(today_str) for pt in data["portfolioHistory"])
        if not already:
            data["portfolioHistory"].append({
                "date":     today_str,
                "strategy": int(ytd["total"]),
                "buyHold":  data["portfolioHistory"][-1].get("buyHold", INITIAL_CAPITAL)
            })
            print(f"  ✓ portfolioHistory: point {today_str} ajouté")

    # 8. Sauvegarder
    os.makedirs(JSON_FILE.parent, exist_ok=True)
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"), default=str)
    print(f"  ✓ Sauvegardé → {JSON_FILE}")
    print(f"[PATCH] Terminé.\n")


if __name__ == "__main__":
    main()
