#!/usr/bin/env python3
"""
BRVM Portfolio — Générateur de données pour le dashboard GitHub Pages.
Lit les données du projet (CSV, backtests, signaux) et produit un fichier
JSON dans docs/data/dashboard.json consommé par le front-end statique.

Usage :
    python generate_dashboard_data.py
"""

import json
import os
import sys
import glob
from datetime import datetime, timedelta
from pathlib import Path

# ── Chemins ──────────────────────────────────
ROOT       = Path(__file__).resolve().parent
DOCS_DATA  = ROOT / "docs" / "data"
CSV_FILE   = ROOT / "cours_boursiers_fusion.csv"
SUIVI_FILE = ROOT / "SUIVI_TRADING.csv"

# Fichiers générés par run_daily_automation.py
SIGNALS_DIR   = ROOT / "output" / "signals"
BACKTEST_DIR  = ROOT / "output" / "backtest_reports"
YTD_FILE      = ROOT / "YTD_2026.csv"
POSITIONS_FILE= ROOT / "open_positions.csv"
BOND_FILES    = sorted(ROOT.glob("bond_opportunities_*.csv"))

# ── Import projet (optionnel) ────────────────
sys.path.insert(0, str(ROOT))
try:
    from config import (
        CAPITAL_TOTAL, CORE_RATIO, SATELLITE_RATIO,
        CORE_TICKERS, STOP_LOSS_PCT, TAKE_PROFIT_PCT
    )
except ImportError:
    CAPITAL_TOTAL   = 1_000_000
    CORE_RATIO      = 0.70
    SATELLITE_RATIO = 0.30
    CORE_TICKERS    = ["SNTS", "ORGT", "ONTBF", "SAFC", "ABJC"]
    STOP_LOSS_PCT   = 0.05
    TAKE_PROFIT_PCT = 0.08

# ── Helpers ──────────────────────────────────

def read_csv_lines(path, sep=";", max_rows=None):
    """Lit un CSV simple (pas de pandas nécessaire)."""
    rows = []
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            header = f.readline().strip().split(sep)
            for i, line in enumerate(f):
                if max_rows and i >= max_rows:
                    break
                vals = line.strip().split(sep)
                if len(vals) == len(header):
                    rows.append(dict(zip(header, vals)))
    except Exception as e:
        print(f"[WARN] Impossible de lire {path}: {e}")
    return rows


def safe_float(val, default=0.0):
    try:
        return float(str(val).replace(",", ".").replace(" ", "").replace("\xa0", ""))
    except (ValueError, TypeError):
        return default


def get_latest_file(pattern):
    """Retourne le fichier le plus récent correspondant au glob."""
    files = sorted(glob.glob(str(pattern)))
    return files[-1] if files else None


# ── Construction des données ─────────────────

def build_overview():
    """Construit les KPIs de la vue d'ensemble."""
    data = {
        "totalValue": CAPITAL_TOTAL,
        "initialCapital": CAPITAL_TOTAL,
        "ytdReturn": 0.0,
        "dailyPnl": 0,
        "dailyPnlPct": 0.0,
        "coreValue": int(CAPITAL_TOTAL * CORE_RATIO),
        "satelliteValue": int(CAPITAL_TOTAL * SATELLITE_RATIO),
        "cashAvailable": 0,
        "openPositions": len(CORE_TICKERS),
        "corePositions": len(CORE_TICKERS),
        "satellitePositions": 0,
        "sharpeRatio": None,
        "maxDrawdown": None,
        "winRate": None,
    }

    # Enrichir avec YTD si disponible
    if YTD_FILE.exists():
        rows = read_csv_lines(YTD_FILE)
        if rows:
            last = rows[-1]
            total = safe_float(last.get("Valeur_Totale", last.get("valeur_totale", 0)))
            if total > 0:
                data["totalValue"] = int(total)
                data["ytdReturn"] = round((total / CAPITAL_TOTAL - 1) * 100, 2)

    return data


def build_portfolio_history():
    """Historique YTD pour le graphique."""
    history = []
    if YTD_FILE.exists():
        rows = read_csv_lines(YTD_FILE)
        for r in rows[-90:]:  # 90 derniers jours
            date_val = r.get("Date", r.get("date", ""))
            value = safe_float(r.get("Valeur_Totale", r.get("valeur_totale", 0)))
            if date_val and value > 0:
                history.append({"date": date_val, "value": int(value)})
    return history


def build_core_holdings():
    """Positions CORE à partir du CSV principal."""
    holdings = []
    if not CSV_FILE.exists():
        return holdings

    # Lire les derniers cours des CORE tickers
    rows = read_csv_lines(CSV_FILE, max_rows=500000)
    latest_prices = {}
    for r in rows:
        symbol = r.get("Code symbole", "").strip()
        if symbol in CORE_TICKERS:
            price = safe_float(r.get("Fermeture", r.get("Cours moyen", 0)))
            if price > 0:
                latest_prices[symbol] = {
                    "price": price,
                    "name": r.get("Libellé", symbol),
                }

    per_stock = int(CAPITAL_TOTAL * CORE_RATIO / len(CORE_TICKERS))
    for ticker in CORE_TICKERS:
        info = latest_prices.get(ticker, {})
        price = info.get("price", 0)
        name = info.get("name", ticker)
        shares = int(per_stock / price) if price > 0 else 0
        holdings.append({
            "symbol": ticker,
            "name": name,
            "sector": "—",
            "shares": shares,
            "avgPrice": price,
            "currentPrice": price,
            "weight": round(100 / len(CORE_TICKERS), 1),
            "pnl": 0,
            "pnlPct": 0.0,
            "dividendYield": 0.0,
        })

    return holdings


def build_signals():
    """Signaux du jour à partir des fichiers output/signals/."""
    summary = {"strongBuy": 0, "buy": 0, "hold": 0, "sell": 0, "strongSell": 0}
    current = []

    latest = get_latest_file(SIGNALS_DIR / "signals_*.csv")
    if latest:
        rows = read_csv_lines(latest, sep=",")
        if not rows:
            rows = read_csv_lines(latest, sep=";")
        for r in rows:
            signal = r.get("Signal_Filtre", r.get("Signal", "Hold"))
            z = safe_float(r.get("Z_Score", r.get("zscore", 0)))
            price = safe_float(r.get("Prix", r.get("Fermeture", r.get("price", 0))))
            volume = safe_float(r.get("Volume", 0))
            vol = safe_float(r.get("Volatilite", r.get("volatility", 0)))

            sig_map = {
                "Strong Buy": "strongBuy", "Buy": "buy", "Hold": "hold",
                "Sell": "sell", "Strong Sell": "strongSell"
            }
            key = sig_map.get(signal, "hold")
            summary[key] = summary.get(key, 0) + 1

            current.append({
                "symbol": r.get("Code symbole", r.get("symbol", "?")),
                "name": r.get("Libellé", r.get("name", "")),
                "price": price,
                "zScore": z,
                "signal": signal,
                "volume": int(volume),
                "volatility": round(vol, 1),
            })

    return {"summary": summary, "current": current}


def build_bonds():
    """Opportunités obligataires."""
    opportunities = []
    if BOND_FILES:
        latest = str(BOND_FILES[-1])
        rows = read_csv_lines(latest, sep=",")
        if not rows:
            rows = read_csv_lines(latest, sep=";")
        for r in rows:
            opportunities.append({
                "name": r.get("Libellé", r.get("name", "?")),
                "coupon": safe_float(r.get("Coupon", r.get("TAUX", 0))),
                "maturity": r.get("Maturité", r.get("maturity", "—")),
                "price": safe_float(r.get("Prix", r.get("price", 100))),
                "yieldEff": safe_float(r.get("Rendement_Effectif", r.get("yield", 0))),
                "discount": safe_float(r.get("Décote", r.get("discount", 0))),
                "rating": r.get("Rating", "—"),
            })
    return {"opportunities": opportunities}


def build_backtests():
    """Résultats de backtest."""
    data = {
        "strategy": {
            "totalReturn": 0, "annualReturn": 0, "sharpe": 0,
            "maxDrawdown": 0, "winRate": 0, "profitFactor": 0,
            "totalTrades": 0, "avgDuration": 0
        },
        "buyHold": {"totalReturn": 0, "annualReturn": 0},
        "riskFree": {"annualReturn": 6.5},
        "equityCurve": [],
        "monthlyReturns": [],
        "recentTrades": []
    }

    # Chercher le dernier rapport de backtest
    latest = get_latest_file(BACKTEST_DIR / "*.csv")
    if latest:
        rows = read_csv_lines(latest, sep=",")
        if not rows:
            rows = read_csv_lines(latest, sep=";")
        # Extraire les trades récents
        for r in rows[-20:]:
            data["recentTrades"].append({
                "date": r.get("Date", r.get("date", "")),
                "action": r.get("Action", r.get("action", "")),
                "symbol": r.get("Symbole", r.get("symbol", "")),
                "qty": int(safe_float(r.get("Quantite", r.get("qty", 0)))),
                "entry": safe_float(r.get("PrixEntree", r.get("entry", 0))),
                "exit": safe_float(r.get("PrixSortie", r.get("exit", 0))) or None,
                "pnl": safe_float(r.get("P&L_FCFA", r.get("pnl", 0))) or None,
                "pnlPct": safe_float(r.get("P&L_%", r.get("pnl_pct", 0))) or None,
                "reason": r.get("Raison_Sortie", r.get("reason", "")),
            })

    # Lire le suivi trading
    if SUIVI_FILE.exists():
        rows = read_csv_lines(SUIVI_FILE)
        wins = sum(1 for r in rows if safe_float(r.get("P&L_FCFA", 0)) > 0)
        total = len([r for r in rows if r.get("DateSortie", "").strip()])
        if total > 0:
            data["strategy"]["winRate"] = round(wins / total * 100, 1)
            data["strategy"]["totalTrades"] = total

    return data


# ── Main ─────────────────────────────────────

def main():
    print("=" * 50)
    print("BRVM Portfolio — Génération données dashboard")
    print("=" * 50)
    print()

    DOCS_DATA.mkdir(parents=True, exist_ok=True)

    dashboard = {
        "meta": {
            "lastUpdate": datetime.now().isoformat(),
            "currency": "FCFA",
            "marketStatus": "Données mises à jour",
            "generatedBy": "generate_dashboard_data.py",
        },
        "overview": build_overview(),
        "portfolioHistory": build_portfolio_history(),
        "core": build_core_holdings(),
        "satellite": [],
        "backtests": build_backtests(),
        "signals": build_signals(),
        "bonds": build_bonds(),
    }

    output_path = DOCS_DATA / "dashboard.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)

    print(f"[OK] Dashboard JSON généré : {output_path}")
    print(f"     Taille : {output_path.stat().st_size / 1024:.1f} KB")
    print(f"     Timestamp : {dashboard['meta']['lastUpdate']}")

    # Résumé
    print()
    print("Données incluses :")
    print(f"  • CORE holdings    : {len(dashboard['core'])} positions")
    print(f"  • Signaux          : {len(dashboard['signals']['current'])} titres")
    print(f"  • Obligations      : {len(dashboard['bonds']['opportunities'])} opportunités")
    print(f"  • Historique portf. : {len(dashboard['portfolioHistory'])} jours")
    print(f"  • Trades backtest  : {len(dashboard['backtests']['recentTrades'])} trades")
    print()


if __name__ == "__main__":
    main()
